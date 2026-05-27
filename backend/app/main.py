from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .store.db import init_db
from .api import data as data_api
from .api import backtest as backtest_api
from .api import strategy as strategy_api
from .api import optimize as optimize_api
from .api import paper as paper_api
from .api import leaderboard as leaderboard_api
from .api import dashboard as dashboard_api
from .paper import scheduler as paper_scheduler
from .strategies.builtins import BUILTINS
from .store.db import SessionLocal
from .store import models

logging.basicConfig(level=logging.INFO)


def _seed_builtins() -> None:
    db = SessionLocal()
    try:
        for key in BUILTINS.keys():
            exists = db.query(models.Strategy).filter(models.Strategy.builtin_key == key).first()
            if not exists:
                db.add(models.Strategy(
                    name=key.replace("_", " ").title(),
                    description=f"Built-in {key} strategy",
                    builtin_key=key,
                    source="builtin",
                    params={},
                ))
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    _seed_builtins()
    paper_scheduler.start()
    yield
    paper_scheduler.shutdown()


app = FastAPI(title="Quant Sim", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "ok": True,
        "app": "Xiao Long Bao",
        "model": settings.OPENAI_MODEL,
        "llm_configured": bool(settings.OPENAI_API_KEY),
    }


app.include_router(data_api.router)
app.include_router(strategy_api.router)
app.include_router(backtest_api.router)
app.include_router(optimize_api.router)
app.include_router(paper_api.router)
app.include_router(leaderboard_api.router)
app.include_router(dashboard_api.router)
