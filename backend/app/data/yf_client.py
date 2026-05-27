from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Iterable
import pandas as pd
import yfinance as yf

from . import cache


_OHLC = ["Open", "High", "Low", "Close", "Adj Close", "Volume"]


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    if df is None or df.empty:
        return pd.DataFrame()
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    rename = {"Adj Close": "adj_close"}
    df = df.rename(columns={**rename, **{c: c.lower() for c in df.columns if c != "Adj Close"}})
    if df.index.tz is not None:
        df.index = df.index.tz_convert(None)
    df.index.name = "date"
    return df


def fetch_history(
    symbol: str,
    interval: str = "1d",
    start: str | datetime | None = None,
    end: str | datetime | None = None,
    use_cache: bool = True,
) -> pd.DataFrame:
    """Fetch OHLCV history for a single symbol with parquet cache."""
    symbol = symbol.upper()
    if use_cache:
        cached = cache.load(symbol, interval)
        if cached is not None and not cached.empty:
            # Check if cached covers the requested range
            need_start = pd.Timestamp(start) if start else cached.index.min()
            need_end = pd.Timestamp(end) if end else pd.Timestamp.utcnow().tz_localize(None)
            if cached.index.min() <= need_start and cached.index.max() >= need_end - pd.Timedelta(days=2):
                sliced = cached.loc[
                    (cached.index >= need_start) & (cached.index <= need_end)
                ]
                if not sliced.empty:
                    return sliced

    ticker = yf.Ticker(symbol)
    kwargs = {"interval": interval, "auto_adjust": False}
    if start:
        kwargs["start"] = start
    if end:
        kwargs["end"] = end
    if not start and not end:
        kwargs["period"] = "max"

    df = ticker.history(**kwargs)
    df = _normalize(df)
    if df.empty:
        return df
    if use_cache:
        merged = cache.merge_and_save(symbol, interval, df)
        if start:
            merged = merged.loc[merged.index >= pd.Timestamp(start)]
        if end:
            merged = merged.loc[merged.index <= pd.Timestamp(end)]
        return merged
    return df


def fetch_many(
    symbols: Iterable[str],
    interval: str = "1d",
    start: str | datetime | None = None,
    end: str | datetime | None = None,
) -> dict[str, pd.DataFrame]:
    return {s: fetch_history(s, interval, start, end) for s in symbols}


def latest_quote(symbol: str) -> dict:
    t = yf.Ticker(symbol.upper())
    info = {}
    try:
        fi = t.fast_info
        info = {
            "symbol": symbol.upper(),
            "last": float(fi.last_price) if fi.last_price is not None else None,
            "previous_close": float(fi.previous_close) if fi.previous_close is not None else None,
            "currency": fi.currency,
        }
    except Exception:
        hist = t.history(period="2d")
        if hist.empty:
            return {"symbol": symbol.upper(), "last": None}
        info = {
            "symbol": symbol.upper(),
            "last": float(hist["Close"].iloc[-1]),
            "previous_close": float(hist["Close"].iloc[-2]) if len(hist) > 1 else None,
            "currency": None,
        }
    return info


def search(query: str, limit: int = 10) -> list[dict]:
    """yfinance lookup. Best-effort; returns simple list."""
    try:
        # yf.Search is newer; fall back to a fixed list
        res = yf.Search(query, max_results=limit).quotes  # type: ignore[attr-defined]
        return [
            {"symbol": r.get("symbol"), "name": r.get("shortname") or r.get("longname"), "exchange": r.get("exchange")}
            for r in res
            if r.get("symbol")
        ]
    except Exception:
        # Fallback: just echo the query as a symbol
        return [{"symbol": query.upper(), "name": None, "exchange": None}]
