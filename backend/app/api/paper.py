from __future__ import annotations
import asyncio
import json
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..store.db import get_db
from ..store import models
from ..paper import scheduler as paper_scheduler

router = APIRouter(prefix="/paper", tags=["paper"])


class StartRequest(BaseModel):
    strategy_id: int
    symbol: str
    interval: str = "5m"
    initial_capital: float = 100_000.0


@router.post("/start")
def start_paper(req: StartRequest, db: Session = Depends(get_db)):
    strat = db.query(models.Strategy).filter(models.Strategy.id == req.strategy_id).first()
    if not strat:
        raise HTTPException(404, "Strategy not found")
    acc = models.PaperAccount(
        strategy_id=req.strategy_id,
        symbol=req.symbol.upper(),
        interval=req.interval,
        initial_capital=req.initial_capital,
        cash=req.initial_capital,
        position=0.0,
        equity_curve=[],
        fills=[],
        active=True,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    paper_scheduler.schedule_account(acc.id, req.interval)
    return {"id": acc.id, "strategy_name": strat.name, "symbol": acc.symbol, "interval": acc.interval}


@router.post("/{account_id}/stop")
def stop_paper(account_id: int, db: Session = Depends(get_db)):
    acc = db.query(models.PaperAccount).get(account_id)
    if not acc:
        raise HTTPException(404)
    acc.active = False
    db.commit()
    paper_scheduler.unschedule_account(account_id)
    return {"ok": True}


@router.get("")
def list_accounts(db: Session = Depends(get_db)):
    rows = db.query(models.PaperAccount).order_by(models.PaperAccount.created_at.desc()).all()
    return {"accounts": [{
        "id": r.id, "strategy_id": r.strategy_id, "symbol": r.symbol, "interval": r.interval,
        "active": r.active, "cash": r.cash, "position": r.position, "last_price": r.last_price,
        "equity": r.cash + r.position * (r.last_price or 0),
        "initial_capital": r.initial_capital,
        "equity_curve_len": len(r.equity_curve or []),
        "n_fills": len(r.fills or []),
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in rows]}


@router.get("/{account_id}")
def get_account(account_id: int, db: Session = Depends(get_db)):
    r = db.query(models.PaperAccount).get(account_id)
    if not r:
        raise HTTPException(404)
    return {
        "id": r.id, "strategy_id": r.strategy_id, "symbol": r.symbol, "interval": r.interval,
        "active": r.active, "cash": r.cash, "position": r.position, "last_price": r.last_price,
        "equity": r.cash + r.position * (r.last_price or 0),
        "initial_capital": r.initial_capital,
        "equity_curve": r.equity_curve or [],
        "fills": r.fills or [],
    }


@router.websocket("/ws/{account_id}")
async def paper_ws(ws: WebSocket, account_id: int):
    await ws.accept()
    q = paper_scheduler.subscribe(account_id)
    try:
        while True:
            event = await q.get()
            await ws.send_text(json.dumps(event, default=str))
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        paper_scheduler.unsubscribe(account_id, q)
