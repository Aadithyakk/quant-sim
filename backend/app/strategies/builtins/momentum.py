from __future__ import annotations
import numpy as np
import pandas as pd
from ..base import Strategy


class Momentum(Strategy):
    name = "momentum"

    def __init__(self, lookback: int = 63):
        self.params = {"lookback": int(lookback)}

    def generate_signals(self, prices: pd.DataFrame) -> pd.Series:
        close = prices["close"]
        mom = close.pct_change(self.params["lookback"])
        sig = pd.Series(np.where(mom > 0, 1.0, -1.0), index=close.index)
        sig[mom.isna()] = 0.0
        return sig
