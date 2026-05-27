from __future__ import annotations
import numpy as np
import pandas as pd


def monthly_returns_heatmap(returns: pd.Series) -> dict:
    """Return rows=year, cols=Jan..Dec heatmap of monthly returns."""
    if returns is None or returns.empty:
        return {"years": [], "months": [], "values": []}
    r = returns.dropna()
    if r.empty:
        return {"years": [], "months": [], "values": []}
    monthly = (1 + r).resample("ME").prod() - 1
    df = pd.DataFrame({"y": monthly.index.year, "m": monthly.index.month, "v": monthly.values})
    pivot = df.pivot_table(index="y", columns="m", values="v", aggfunc="first")
    pivot = pivot.reindex(columns=range(1, 13))
    years = [int(y) for y in pivot.index.tolist()]
    months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    values = [[None if pd.isna(v) else float(v) for v in row] for row in pivot.values.tolist()]
    return {"years": years, "months": months, "values": values}


def monte_carlo_bootstrap(returns: pd.Series, n_sims: int = 500, horizon: int | None = None, seed: int = 42) -> dict:
    """Bootstrap the equity curve: resample returns with replacement n_sims times.

    Returns the empirical quantile bands (5/25/50/75/95) over horizon bars.
    """
    if returns is None or returns.empty:
        return {"steps": 0, "bands": {}}
    rng = np.random.default_rng(seed)
    arr = returns.dropna().to_numpy()
    if arr.size == 0:
        return {"steps": 0, "bands": {}}
    horizon = horizon or arr.size
    horizon = min(horizon, arr.size * 2)
    n_sims = max(50, min(n_sims, 2000))
    sims = rng.choice(arr, size=(n_sims, horizon), replace=True)
    eq = np.cumprod(1 + sims, axis=1)
    q05 = np.quantile(eq, 0.05, axis=0)
    q25 = np.quantile(eq, 0.25, axis=0)
    q50 = np.quantile(eq, 0.50, axis=0)
    q75 = np.quantile(eq, 0.75, axis=0)
    q95 = np.quantile(eq, 0.95, axis=0)
    final = eq[:, -1]
    return {
        "steps": int(horizon),
        "n_sims": int(n_sims),
        "bands": {
            "q05": [float(x) for x in q05],
            "q25": [float(x) for x in q25],
            "q50": [float(x) for x in q50],
            "q75": [float(x) for x in q75],
            "q95": [float(x) for x in q95],
        },
        "final_distribution": {
            "mean": float(final.mean()),
            "median": float(np.median(final)),
            "p05": float(np.quantile(final, 0.05)),
            "p95": float(np.quantile(final, 0.95)),
            "prob_positive": float((final > 1.0).mean()),
        },
    }


def rolling_sharpe(returns: pd.Series, window: int = 63) -> list[dict]:
    if returns is None or returns.empty:
        return []
    r = returns.dropna()
    if len(r) < window:
        return []
    mean = r.rolling(window).mean() * 252
    vol = r.rolling(window).std() * np.sqrt(252)
    sharpe = (mean / vol.replace(0, np.nan)).dropna()
    return [{"date": str(d), "value": float(v)} for d, v in sharpe.items()]
