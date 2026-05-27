from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..optimize.portfolio_opt import optimize

router = APIRouter(prefix="/optimize", tags=["optimize"])


class OptimizeRequest(BaseModel):
    symbols: list[str]
    objective: str = "max_sharpe"  # max_sharpe | min_vol | risk_parity
    start: str | None = None
    end: str | None = None
    risk_free: float = 0.02


@router.post("")
def run_optimize(req: OptimizeRequest):
    if len(req.symbols) < 2:
        raise HTTPException(400, "Need at least 2 symbols")
    try:
        return optimize(req.symbols, req.objective, req.start, req.end, req.risk_free)
    except Exception as e:
        raise HTTPException(400, str(e))
