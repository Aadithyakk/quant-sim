from __future__ import annotations
import numpy as np
import pandas as pd


def _periods_per_year(index: pd.DatetimeIndex) -> float:
    if len(index) < 2:
        return 252.0
    dt = (index[-1] - index[0]).total_seconds()
    n = len(index) - 1
    if dt <= 0 or n <= 0:
        return 252.0
    seconds_per_bar = dt / n
    return max(1.0, 365.25 * 24 * 3600 / seconds_per_bar)


def compute_metrics(equity: pd.Series, returns: pd.Series, trades: list[dict] | None = None) -> dict:
    if equity.empty:
        return {}
    ppy = _periods_per_year(equity.index)
    rets = returns.dropna()
    total_return = float(equity.iloc[-1] / equity.iloc[0] - 1) if equity.iloc[0] != 0 else 0.0
    years = max((equity.index[-1] - equity.index[0]).days / 365.25, 1e-9)
    cagr = float((equity.iloc[-1] / equity.iloc[0]) ** (1 / years) - 1) if equity.iloc[0] > 0 else 0.0
    vol = float(rets.std() * np.sqrt(ppy)) if not rets.empty else 0.0
    mean_ret = float(rets.mean() * ppy) if not rets.empty else 0.0
    sharpe = float(mean_ret / vol) if vol > 0 else 0.0
    downside = rets[rets < 0]
    dvol = float(downside.std() * np.sqrt(ppy)) if not downside.empty else 0.0
    sortino = float(mean_ret / dvol) if dvol > 0 else 0.0
    roll_max = equity.cummax()
    dd = equity / roll_max - 1
    max_dd = float(dd.min()) if not dd.empty else 0.0
    calmar = float(cagr / abs(max_dd)) if max_dd < 0 else 0.0

    win_rate = None
    avg_trade = None
    if trades:
        pnls = [t.get("pnl", 0.0) for t in trades if "pnl" in t]
        if pnls:
            wins = [p for p in pnls if p > 0]
            win_rate = len(wins) / len(pnls)
            avg_trade = float(np.mean(pnls))

    exposure = float((rets != 0).mean()) if not rets.empty else 0.0

    return {
        "total_return": total_return,
        "cagr": cagr,
        "vol": vol,
        "sharpe": sharpe,
        "sortino": sortino,
        "max_drawdown": max_dd,
        "calmar": calmar,
        "win_rate": win_rate,
        "avg_trade": avg_trade,
        "exposure": exposure,
        "n_bars": int(len(equity)),
        "n_trades": len(trades) if trades else 0,
    }
