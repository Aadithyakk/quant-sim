from __future__ import annotations
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..store.db import get_db
from ..store import models
from ..sandbox import ast_guard
from ..llm import client as llm_client
from ..strategies.builtins import BUILTINS

router = APIRouter(prefix="/strategy", tags=["strategy"])


class GenerateRequest(BaseModel):
    description: str
    model: str | None = None


class RoastRequest(BaseModel):
    code: str
    metrics: dict | None = None
    model: str | None = None


class SaveRequest(BaseModel):
    name: str
    description: str = ""
    code: str | None = None
    params: dict = {}
    builtin_key: str | None = None
    source: str = "user"


@router.post("/generate")
def generate(req: GenerateRequest):
    try:
        result = llm_client.generate_strategy(req.description, req.model)
    except Exception as e:
        raise HTTPException(500, f"LLM error: {e}")
    # Validate the generated code passes the sandbox guard
    guard = ast_guard.check(result["code"])
    result["sandbox_ok"] = guard.ok
    result["sandbox_reason"] = guard.reason
    return result


@router.post("/roast")
def roast(req: RoastRequest):
    try:
        return llm_client.roast_strategy(req.code, req.metrics, req.model)
    except Exception as e:
        raise HTTPException(500, f"LLM roast failed: {e}")


@router.post("")
def save(req: SaveRequest, db: Session = Depends(get_db)):
    if req.builtin_key:
        if req.builtin_key not in BUILTINS:
            raise HTTPException(400, "Unknown builtin_key")
    elif req.code:
        guard = ast_guard.check(req.code)
        if not guard.ok:
            raise HTTPException(400, f"Code failed sandbox check: {guard.reason}")
    else:
        raise HTTPException(400, "Provide code or builtin_key")

    row = models.Strategy(
        name=req.name,
        description=req.description,
        code=req.code or "",
        params=req.params or {},
        builtin_key=req.builtin_key,
        source=req.source if not req.builtin_key else "builtin",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "name": row.name}


@router.get("")
def list_strategies(db: Session = Depends(get_db)):
    rows = db.query(models.Strategy).order_by(models.Strategy.created_at.desc()).all()
    return {
        "strategies": [
            {
                "id": r.id, "name": r.name, "description": r.description,
                "source": r.source, "builtin_key": r.builtin_key,
                "params": r.params, "code": r.code,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
        "builtins": [{"key": k, "name": k} for k in BUILTINS.keys()],
    }


@router.delete("/{strategy_id}")
def delete(strategy_id: int, db: Session = Depends(get_db)):
    row = db.query(models.Strategy).filter(models.Strategy.id == strategy_id).first()
    if not row:
        raise HTTPException(404)
    db.delete(row)
    db.commit()
    return {"ok": True}
