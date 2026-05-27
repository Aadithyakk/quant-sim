from __future__ import annotations
from abc import ABC, abstractmethod
import pandas as pd


class Strategy(ABC):
    """Strategy contract: produce target positions from OHLCV bars.

    `generate_signals` must return a pd.Series aligned to prices.index
    with values in [-1.0, 1.0] (target position weight).
    """

    name: str = "strategy"
    params: dict = {}

    @abstractmethod
    def generate_signals(self, prices: pd.DataFrame) -> pd.Series:
        ...
