from __future__ import annotations
import numpy as np
import pandas as pd

from ..data import yf_client


def _load_returns(symbols: list[str], start: str | None, end: str | None) -> pd.DataFrame:
    frames = {}
    for s in symbols:
        df = yf_client.fetch_history(s, "1d", start, end)
        if df.empty:
            continue
        frames[s] = df["close"]
    if not frames:
        raise ValueError("No data for any of the requested symbols")
    prices = pd.concat(frames, axis=1).dropna()
    return prices.pct_change().dropna()


def optimize(symbols: list[str], objective: str = "max_sharpe", start: str | None = None, end: str | None = None, risk_free: float = 0.02) -> dict:
    """Return weights + efficient frontier points.

    Uses PyPortfolioOpt when available, otherwise a simple numpy fallback.
    """
    rets = _load_returns(symbols, start, end)
    mu = rets.mean() * 252
    cov = rets.cov() * 252

    weights: dict[str, float] = {}
    try:
        from pypfopt.efficient_frontier import EfficientFrontier
        ef = EfficientFrontier(mu, cov, weight_bounds=(0, 1))
        if objective == "min_vol":
            ef.min_volatility()
        elif objective == "risk_parity":
            # PyPortfolioOpt doesn't ship risk-parity directly; fallback below
            raise RuntimeError("use_fallback")
        else:
            ef.max_sharpe(risk_free_rate=risk_free)
        w = ef.clean_weights()
        weights = {k: float(v) for k, v in w.items()}
        perf = ef.portfolio_performance(risk_free_rate=risk_free)
        portfolio = {"expected_return": float(perf[0]), "volatility": float(perf[1]), "sharpe": float(perf[2])}
    except Exception:
        # Numpy fallback: equal-weight or inverse-vol
        if objective == "risk_parity":
            vols = np.sqrt(np.diag(cov))
            inv = 1.0 / vols
            w_arr = inv / inv.sum()
        else:
            w_arr = np.full(len(symbols), 1.0 / len(symbols))
        weights = {s: float(w) for s, w in zip(rets.columns, w_arr)}
        w_vec = np.array(list(weights.values()))
        port_ret = float(w_vec @ mu.values)
        port_vol = float(np.sqrt(w_vec @ cov.values @ w_vec))
        port_sharpe = (port_ret - risk_free) / port_vol if port_vol > 0 else 0.0
        portfolio = {"expected_return": port_ret, "volatility": port_vol, "sharpe": port_sharpe}

    # Frontier: sweep target returns
    frontier = []
    try:
        from pypfopt.efficient_frontier import EfficientFrontier
        lo, hi = float(mu.min()), float(mu.max())
        targets = np.linspace(lo, hi, 25)
        for t in targets:
            try:
                ef2 = EfficientFrontier(mu, cov, weight_bounds=(0, 1))
                ef2.efficient_return(target_return=float(t))
                r, v, s = ef2.portfolio_performance(risk_free_rate=risk_free)
                frontier.append({"return": float(r), "volatility": float(v), "sharpe": float(s)})
            except Exception:
                continue
    except Exception:
        pass

    return {
        "symbols": list(rets.columns),
        "weights": weights,
        "portfolio": portfolio,
        "frontier": frontier,
        "asset_stats": [
            {"symbol": s, "mean_return": float(mu[s]), "volatility": float(np.sqrt(cov.loc[s, s]))}
            for s in rets.columns
        ],
    }
