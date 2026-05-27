from __future__ import annotations
import pandas as pd
from ..base import Strategy


def _rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    up = delta.clip(lower=0).rolling(period).mean()
    down = -delta.clip(upper=0).rolling(period).mean()
    rs = up / down.replace(0, 1e-12)
    return 100 - 100 / (1 + rs)


class RSIMeanRev(Strategy):
    name = "rsi_mean_rev"

    def __init__(self, period: int = 14, low: float = 30, high: float = 70):
        self.params = {"period": int(period), "low": float(low), "high": float(high)}

    def generate_signals(self, prices: pd.DataFrame) -> pd.Series:
        close = prices["close"]
        rsi = _rsi(close, self.params["period"])
        sig = pd.Series(0.0, index=close.index)
        sig[rsi < self.params["low"]] = 1.0
        sig[rsi > self.params["high"]] = -1.0
        # Hold position until opposite signal
        sig = sig.replace(0.0, pd.NA).ffill().fillna(0.0).astype(float)
        return sig
