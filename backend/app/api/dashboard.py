from __future__ import annotations
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..store.db import get_db
from ..store import models
from ..strategies.builtins import BUILTINS
from ..sandbox import runner as sandbox_runner
from ..data import yf_client

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _signal_for(strat: models.Strategy, df) -> float | None:
    try:
        if strat.builtin_key:
            sig = BUILTINS[strat.builtin_key](**(strat.params or {})).generate_signals(df)
        else:
            sig = sandbox_runner.run_strategy(strat.code, df.tail(300), strat.params or {}, timeout=15)
        if sig is None or sig.empty:
            return None
        return float(sig.iloc[-1])
    except Exception:
        return None


@router.get("/today")
def today(
    universe: str = Query("SPY,QQQ,AAPL,MSFT,NVDA,TSLA", description="Comma-separated tickers to check"),
    db: Session = Depends(get_db),
):
    """For every saved strategy + every symbol in the universe, return current signal + last close.

    Like checking which dumplings are ready to plate.
    """
    syms = [s.strip().upper() for s in universe.split(",") if s.strip()][:12]
    strategies = db.query(models.Strategy).all()
    rows = []
    for sym in syms:
        try:
            df = yf_client.fetch_history(sym, "1d")
        except Exception:
            continue
        if df.empty:
            continue
        last = df.iloc[-1]
        prev = df.iloc[-2] if len(df) > 1 else last
        change = float(last["close"] / prev["close"] - 1) if prev["close"] else 0.0
        signals = []
        for s in strategies:
            sig = _signal_for(s, df)
            signals.append({
                "strategy_id": s.id, "strategy_name": s.name,
                "signal": sig,
                "verdict": "LONG" if (sig or 0) > 0.1 else "SHORT" if (sig or 0) < -0.1 else "FLAT",
            })
        rows.append({
            "symbol": sym,
            "last_close": float(last["close"]),
            "change_pct": change,
            "signals": signals,
        })
    return {"as_of": str(rows[0].get("as_of") if rows else ""), "rows": rows}


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    n_strats = db.query(models.Strategy).count()
    n_runs = db.query(models.BacktestRun).count()
    n_paper = db.query(models.PaperAccount).count()
    best = db.query(models.BacktestRun).all()
    best_sharpe = max((r.metrics.get("sharpe", -1e9) for r in best), default=0.0)
    best_run = max(best, key=lambda r: r.metrics.get("sharpe", -1e9), default=None) if best else None
    return {
        "n_strategies": n_strats,
        "n_runs": n_runs,
        "n_paper_accounts": n_paper,
        "best_sharpe": float(best_sharpe) if best_sharpe != -1e9 else 0.0,
        "best_run": {
            "id": best_run.id, "strategy_name": best_run.strategy_name, "symbol": best_run.symbol,
            "sharpe": best_run.metrics.get("sharpe"), "cagr": best_run.metrics.get("cagr"),
        } if best_run else None,
    }
