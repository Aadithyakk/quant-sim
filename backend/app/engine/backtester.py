from __future__ import annotations
from dataclasses import dataclass, field
import numpy as np
import pandas as pd

from .metrics import compute_metrics
from .analytics import monthly_returns_heatmap, monte_carlo_bootstrap, rolling_sharpe


@dataclass
class BacktestConfig:
    initial_capital: float = 100_000.0
    commission_bps: float = 1.0  # 1 bp per trade notional
    slippage_bps: float = 2.0
    allow_short: bool = True


@dataclass
class BacktestResult:
    equity: pd.Series
    returns: pd.Series
    positions: pd.Series
    trades: list[dict] = field(default_factory=list)
    metrics: dict = field(default_factory=dict)

    def to_payload(self) -> dict:
        eq = self.equity.copy()
        eq.index = eq.index.astype(str)
        ret = self.returns.copy()
        ret.index = ret.index.astype(str)
        pos = self.positions.copy()
        pos.index = pos.index.astype(str)
        return {
            "equity": [{"date": d, "value": float(v)} for d, v in eq.items()],
            "returns": [{"date": d, "value": float(v)} for d, v in ret.items()],
            "positions": [{"date": d, "value": float(v)} for d, v in pos.items()],
            "trades": self.trades,
            "metrics": self.metrics,
            "heatmap": monthly_returns_heatmap(self.returns),
            "monte_carlo": monte_carlo_bootstrap(self.returns, n_sims=500),
            "rolling_sharpe": rolling_sharpe(self.returns),
        }


def run_backtest(
    prices: pd.DataFrame,
    signals: pd.Series,
    config: BacktestConfig | None = None,
) -> BacktestResult:
    """Single-symbol vectorized backtest.

    prices: DataFrame indexed by date with at least a 'close' column.
    signals: Series indexed by same dates, values in [-1, 1] representing target position.
    """
    cfg = config or BacktestConfig()
    prices = prices.sort_index()
    close = prices["close"].astype(float)

    sig = signals.reindex(close.index).fillna(0.0).clip(-1.0, 1.0)
    if not cfg.allow_short:
        sig = sig.clip(lower=0.0)

    # Position is the target for the *next* bar (avoid lookahead)
    pos = sig.shift(1).fillna(0.0)

    bar_ret = close.pct_change().fillna(0.0)
    gross = pos * bar_ret

    # Costs proportional to absolute position change
    turnover = pos.diff().abs().fillna(pos.abs())
    cost_rate = (cfg.commission_bps + cfg.slippage_bps) / 10_000.0
    costs = turnover * cost_rate

    net_ret = gross - costs
    equity = cfg.initial_capital * (1 + net_ret).cumprod()

    # Trade list: each contiguous non-zero position run
    trades: list[dict] = []
    cur_dir = 0
    entry_idx = None
    entry_price = None
    for i, (dt, p) in enumerate(pos.items()):
        d = int(np.sign(p)) if not np.isnan(p) else 0
        if d != cur_dir:
            if cur_dir != 0 and entry_idx is not None:
                exit_price = float(close.iloc[i - 1])
                pnl = (exit_price - entry_price) * cur_dir
                trades.append({
                    "entry_date": str(close.index[entry_idx]),
                    "exit_date": str(close.index[i - 1]),
                    "direction": cur_dir,
                    "entry_price": entry_price,
                    "exit_price": exit_price,
                    "pnl": float(pnl),
                    "pnl_pct": float(pnl / entry_price) if entry_price else 0.0,
                })
            cur_dir = d
            if d != 0:
                entry_idx = i
                entry_price = float(close.iloc[i])
            else:
                entry_idx = None
                entry_price = None
    if cur_dir != 0 and entry_idx is not None:
        exit_price = float(close.iloc[-1])
        pnl = (exit_price - entry_price) * cur_dir
        trades.append({
            "entry_date": str(close.index[entry_idx]),
            "exit_date": str(close.index[-1]),
            "direction": cur_dir,
            "entry_price": entry_price,
            "exit_price": exit_price,
            "pnl": float(pnl),
            "pnl_pct": float(pnl / entry_price) if entry_price else 0.0,
        })

    metrics = compute_metrics(equity, net_ret, trades)
    return BacktestResult(equity=equity, returns=net_ret, positions=pos, trades=trades, metrics=metrics)
