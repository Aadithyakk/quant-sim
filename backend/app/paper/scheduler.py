from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from ..data import yf_client
from ..store.db import SessionLocal
from ..store import models
from ..strategies.builtins import BUILTINS
from ..sandbox import runner as sandbox_runner
from .broker import simulate_fill

log = logging.getLogger("paper")

scheduler: AsyncIOScheduler | None = None
_subscribers: dict[int, set[asyncio.Queue]] = {}


def start():
    global scheduler
    if scheduler is None:
        scheduler = AsyncIOScheduler()
        scheduler.start()
    return scheduler


def shutdown():
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=False)
        scheduler = None


def _interval_seconds(interval: str) -> int:
    return {"1m": 60, "5m": 300, "15m": 900, "1h": 3600, "1d": 24 * 3600}.get(interval, 300)


async def publish(account_id: int, event: dict):
    for q in list(_subscribers.get(account_id, [])):
        try:
            q.put_nowait(event)
        except Exception:
            pass


def subscribe(account_id: int) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=200)
    _subscribers.setdefault(account_id, set()).add(q)
    return q


def unsubscribe(account_id: int, q: asyncio.Queue):
    subs = _subscribers.get(account_id)
    if subs and q in subs:
        subs.discard(q)


async def _tick(account_id: int):
    sess = SessionLocal()
    try:
        acc: models.PaperAccount | None = sess.query(models.PaperAccount).get(account_id)
        if not acc or not acc.active:
            return
        strat: models.Strategy | None = sess.query(models.Strategy).get(acc.strategy_id)
        if not strat:
            return
        # Pull a recent window (last 200 bars) sufficient for indicators
        df = yf_client.fetch_history(acc.symbol, acc.interval)
        if df.empty:
            return
        df = df.tail(300)
        if strat.builtin_key:
            sig_series = BUILTINS[strat.builtin_key](**(strat.params or {})).generate_signals(df)
        else:
            sig_series = sandbox_runner.run_strategy(strat.code, df, strat.params or {})
        target = float(sig_series.iloc[-1])
        last_price = float(df["close"].iloc[-1])

        new_cash, new_pos, fill = simulate_fill(acc.cash, acc.position, last_price, target)
        acc.last_price = last_price
        acc.cash = new_cash
        acc.position = new_pos
        equity = acc.cash + acc.position * last_price
        now = datetime.now(timezone.utc).isoformat()
        curve = list(acc.equity_curve or [])
        curve.append({"date": now, "value": float(equity)})
        acc.equity_curve = curve[-5000:]
        event = {"type": "tick", "ts": now, "price": last_price, "equity": equity, "position": acc.position, "target": target}
        if fill:
            fills = list(acc.fills or [])
            fill_event = {
                "ts": now, "side": fill.side, "quantity": fill.quantity,
                "price": fill.price, "fee": fill.fee,
            }
            fills.append(fill_event)
            acc.fills = fills[-1000:]
            event["fill"] = fill_event
        sess.commit()
        await publish(account_id, event)
    except Exception as e:
        log.exception("paper tick failed: %s", e)
    finally:
        sess.close()


def schedule_account(account_id: int, interval: str):
    s = start()
    job_id = f"paper-{account_id}"
    if s.get_job(job_id):
        s.remove_job(job_id)
    secs = _interval_seconds(interval)
    s.add_job(_tick, "interval", seconds=secs, args=[account_id], id=job_id, next_run_time=datetime.now(timezone.utc))


def unschedule_account(account_id: int):
    if scheduler:
        job_id = f"paper-{account_id}"
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)
