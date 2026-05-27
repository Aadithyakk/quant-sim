from __future__ import annotations
import numpy as np
import pandas as pd
from ..base import Strategy


class SMACross(Strategy):
    name = "sma_cross"

    def __init__(self, fast: int = 10, slow: int = 50):
        self.params = {"fast": int(fast), "slow": int(slow)}

    def generate_signals(self, prices: pd.DataFrame) -> pd.Series:
        fast = self.params["fast"]
        slow = self.params["slow"]
        close = prices["close"]
        sma_f = close.rolling(fast).mean()
        sma_s = close.rolling(slow).mean()
        sig = pd.Series(np.where(sma_f > sma_s, 1.0, -1.0), index=close.index)
        sig[sma_f.isna() | sma_s.isna()] = 0.0
        return sig
