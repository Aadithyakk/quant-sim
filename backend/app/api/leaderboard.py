from __future__ import annotations
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..store.db import get_db
from ..store import models

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
def leaderboard(
    sort: str = Query("sharpe", description="sharpe|cagr|max_drawdown|total_return"),
    limit: int = 50,
    db: Session = Depends(get_db),
):
    rows = db.query(models.BacktestRun).order_by(models.BacktestRun.created_at.desc()).limit(500).all()
    items = []
    for r in rows:
        m = r.metrics or {}
        items.append({
            "id": r.id,
            "strategy_name": r.strategy_name,
            "symbol": r.symbol,
            "interval": r.interval,
            "start": r.start,
            "end": r.end,
            "sharpe": m.get("sharpe", 0.0),
            "cagr": m.get("cagr", 0.0),
            "max_drawdown": m.get("max_drawdown", 0.0),
            "total_return": m.get("total_return", 0.0),
            "n_trades": m.get("n_trades", 0),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    reverse = sort != "max_drawdown"  # higher is better except DD (closer to 0 is better)
    items.sort(key=lambda x: (x.get(sort) or 0), reverse=reverse)
    return {"items": items[:limit]}


@router.get("/compare")
def compare(ids: str, db: Session = Depends(get_db)):
    id_list = [int(i) for i in ids.split(",") if i.strip()]
    rows = db.query(models.BacktestRun).filter(models.BacktestRun.id.in_(id_list)).all()
    return {"runs": [{
        "id": r.id, "strategy_name": r.strategy_name, "symbol": r.symbol,
        "metrics": r.metrics, "equity": r.equity,
    } for r in rows]}
