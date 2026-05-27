from __future__ import annotations
import json
import os
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path
import pandas as pd

from . import ast_guard


SANDBOX_TIMEOUT = 30


_RUNNER_TEMPLATE = r'''
import json
import sys
import pandas as pd
import numpy as np

USER_CODE = {user_code!r}
PARAMS = {params_json}
PRICES_PATH = {prices_path!r}
OUT_PATH = {out_path!r}

# Build a restricted globals dict
ALLOWED_MODULES = {{"pandas", "numpy", "math", "statistics"}}

def _safe_import(name, *args, **kwargs):
    root = name.split(".")[0]
    if root not in ALLOWED_MODULES:
        raise ImportError(f"import not allowed in sandbox: {{name}}")
    return __import__(name, *args, **kwargs)

safe_builtins = {{
    "abs": abs, "min": min, "max": max, "sum": sum, "len": len,
    "range": range, "enumerate": enumerate, "zip": zip, "map": map, "filter": filter,
    "list": list, "dict": dict, "tuple": tuple, "set": set, "float": float, "int": int,
    "str": str, "bool": bool, "round": round, "sorted": sorted, "reversed": reversed,
    "any": any, "all": all, "isinstance": isinstance, "print": print,
    "True": True, "False": False, "None": None,
    "__import__": _safe_import,
}}

g = {{"__builtins__": safe_builtins, "pd": pd, "np": np, "pandas": pd, "numpy": np}}

prices = pd.read_parquet(PRICES_PATH)
exec(compile(USER_CODE, "<strategy>", "exec"), g, g)

if "generate_signals" not in g:
    raise RuntimeError("user code must define generate_signals(prices, params) -> pd.Series")

result = g["generate_signals"](prices, PARAMS)
if not isinstance(result, pd.Series):
    raise RuntimeError("generate_signals must return a pandas Series")

result = result.reindex(prices.index).fillna(0.0).clip(-1.0, 1.0)
out = pd.DataFrame({{"signal": result.values}}, index=result.index)
out.to_parquet(OUT_PATH)
print(json.dumps({{"ok": True, "n": len(out)}}))
'''


def run_strategy(code: str, prices: pd.DataFrame, params: dict | None = None, timeout: int = SANDBOX_TIMEOUT) -> pd.Series:
    """Execute LLM/user strategy code in a subprocess and return signal Series.

    User code must define: `def generate_signals(prices, params)` returning a pd.Series.
    """
    ast_guard.assert_safe(code)
    params = params or {}

    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        prices_path = td_path / "prices.parquet"
        out_path = td_path / "signal.parquet"
        runner_path = td_path / "runner.py"

        # Save prices
        p = prices.copy()
        if p.index.tz is not None:
            p.index = p.index.tz_convert(None)
        p.to_parquet(prices_path)

        runner_src = _RUNNER_TEMPLATE.format(
            user_code=code,
            params_json=json.dumps(params),
            prices_path=str(prices_path),
            out_path=str(out_path),
        )
        runner_path.write_text(runner_src, encoding="utf-8")

        env = {
            "PYTHONIOENCODING": "utf-8",
            "PYTHONDONTWRITEBYTECODE": "1",
            "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
            "PATH": os.environ.get("PATH", ""),
        }
        try:
            # Note: we DO NOT use -I/-S because the user's site-packages contain pandas/numpy
            # which the strategy needs. Safety comes from the AST guard + timeout + minimal env.
            proc = subprocess.run(
                [sys.executable, str(runner_path)],
                capture_output=True,
                text=True,
                timeout=timeout,
                env=env,
            )
        except subprocess.TimeoutExpired:
            raise RuntimeError(f"Strategy timed out after {timeout}s")

        if proc.returncode != 0:
            err = proc.stderr.strip() or proc.stdout.strip()
            raise RuntimeError(f"Strategy execution failed: {err[-800:]}")

        if not out_path.exists():
            raise RuntimeError("Strategy did not produce output")

        result_df = pd.read_parquet(out_path)
        return result_df["signal"].astype(float)
