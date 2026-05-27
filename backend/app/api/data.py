from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query
from ..data import yf_client

router = APIRouter(prefix="/data", tags=["data"])


@router.get("/symbols/search")
def symbols_search(q: str, limit: int = 10):
    return {"results": yf_client.search(q, limit=limit)}


@router.get("/history")
def history(
    symbol: str = Query(..., description="Single symbol, e.g. AAPL"),
    interval: str = "1d",
    start: str | None = None,
    end: str | None = None,
):
    df = yf_client.fetch_history(symbol, interval, start, end)
    if df.empty:
        raise HTTPException(404, f"No data for {symbol}")
    out = df.reset_index().rename(columns={"date": "date"})
    out["date"] = out["date"].astype(str)
    cols = [c for c in ["date", "open", "high", "low", "close", "adj_close", "volume"] if c in out.columns]
    return {"symbol": symbol.upper(), "interval": interval, "bars": out[cols].to_dict("records")}


@router.get("/quote")
def quote(symbols: str):
    syms = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    return {"quotes": [yf_client.latest_quote(s) for s in syms]}
