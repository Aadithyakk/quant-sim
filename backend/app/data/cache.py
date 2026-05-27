from __future__ import annotations
from pathlib import Path
import pandas as pd
from ..config import settings


def _path(symbol: str, interval: str) -> Path:
    safe = symbol.upper().replace("/", "_")
    return settings.cache_dir / f"{safe}_{interval}.parquet"


def load(symbol: str, interval: str) -> pd.DataFrame | None:
    p = _path(symbol, interval)
    if not p.exists():
        return None
    try:
        df = pd.read_parquet(p)
        if not isinstance(df.index, pd.DatetimeIndex):
            df.index = pd.to_datetime(df.index, utc=True).tz_convert(None)
        return df
    except Exception:
        return None


def save(symbol: str, interval: str, df: pd.DataFrame) -> None:
    if df is None or df.empty:
        return
    p = _path(symbol, interval)
    df = df.copy()
    if df.index.tz is not None:
        df.index = df.index.tz_convert(None)
    df.to_parquet(p)


def merge_and_save(symbol: str, interval: str, new_df: pd.DataFrame) -> pd.DataFrame:
    existing = load(symbol, interval)
    if existing is None or existing.empty:
        combined = new_df
    else:
        combined = pd.concat([existing, new_df])
        combined = combined[~combined.index.duplicated(keep="last")].sort_index()
    save(symbol, interval, combined)
    return combined
