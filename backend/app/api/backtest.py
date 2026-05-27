from __future__ import annotations
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..data import yf_client
from ..engine.backtester import run_backtest, BacktestConfig
from ..strategies.builtins import BUILTINS
from ..store.db import get_db
from ..store import models
from ..sandbox import runner as sandbox_runner

router = APIRouter(prefix="/backtest", tags=["backtest"])


class BacktestRequest(BaseModel):
    symbol: str
    interval: str = "1d"
    start: str | None = None
    end: str | None = None
    strategy_key: str | None = Field(None, description="Built-in strategy key")
    strategy_id: int | None = Field(None, description="Saved strategy id (LLM/user)")
    params: dict = {}
    initial_capital: float = 100_000.0
    commission_bps: float = 1.0
    slippage_bps: float = 2.0
    allow_short: bool = True
    save: bool = True


@router.post("")
def backtest(req: BacktestRequest, db: Session = Depends(get_db)):
    prices = yf_client.fetch_history(req.symbol, req.interval, req.start, req.end)
    if prices.empty:
        raise HTTPException(404, f"No data for {req.symbol}")

    strategy_name = req.strategy_key or "custom"
    saved_strategy: models.Strategy | None = None
    if req.strategy_key and req.strategy_key in BUILTINS:
        strat = BUILTINS[req.strategy_key](**req.params)
        signals = strat.generate_signals(prices)
        strategy_name = req.strategy_key
    elif req.strategy_id is not None:
        saved_strategy = db.query(models.Strategy).filter(models.Strategy.id == req.strategy_id).first()
        if not saved_strategy:
            raise HTTPException(404, "Strategy not found")
        if saved_strategy.builtin_key:
            strat = BUILTINS[saved_strategy.builtin_key](**(req.params or saved_strategy.params or {}))
            signals = strat.generate_signals(prices)
        else:
            # sandboxed code
            params = req.params or saved_strategy.params or {}
            signals = sandbox_runner.run_strategy(saved_strategy.code, prices, params)
        strategy_name = saved_strategy.name
    else:
        raise HTTPException(400, "Provide strategy_key or strategy_id")

    cfg = BacktestConfig(
        initial_capital=req.initial_capital,
        commission_bps=req.commission_bps,
        slippage_bps=req.slippage_bps,
        allow_short=req.allow_short,
    )
    result = run_backtest(prices, signals, cfg)
    payload = result.to_payload()

    run_id = None
    if req.save:
        row = models.BacktestRun(
            strategy_id=saved_strategy.id if saved_strategy else None,
            strategy_name=strategy_name,
            symbol=req.symbol.upper(),
            interval=req.interval,
            start=req.start,
            end=req.end,
            config=cfg.__dict__,
            metrics=payload["metrics"],
            equity=payload["equity"],
            trades=payload["trades"],
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        run_id = row.id

    return {"run_id": run_id, "strategy_name": strategy_name, **payload}


@router.get("/runs/{run_id}")
def get_run(run_id: int, db: Session = Depends(get_db)):
    row = db.query(models.BacktestRun).filter(models.BacktestRun.id == run_id).first()
    if not row:
        raise HTTPException(404)
    return {
        "id": row.id,
        "strategy_name": row.strategy_name,
        "symbol": row.symbol,
        "interval": row.interval,
        "start": row.start,
        "end": row.end,
        "metrics": row.metrics,
        "equity": row.equity,
        "trades": row.trades,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
