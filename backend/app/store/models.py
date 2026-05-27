from __future__ import annotations
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .db import Base


class Strategy(Base):
    __tablename__ = "strategies"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    source = Column(String, default="user")  # builtin | llm | user
    code = Column(Text, default="")  # python source for sandboxed strategies
    params = Column(JSON, default=dict)
    builtin_key = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class BacktestRun(Base):
    __tablename__ = "backtest_runs"
    id = Column(Integer, primary_key=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=True)
    strategy_name = Column(String)
    symbol = Column(String)
    interval = Column(String)
    start = Column(String)
    end = Column(String)
    config = Column(JSON, default=dict)
    metrics = Column(JSON, default=dict)
    equity = Column(JSON, default=list)  # list of {date, value}
    trades = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)


class PaperAccount(Base):
    __tablename__ = "paper_accounts"
    id = Column(Integer, primary_key=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"))
    symbol = Column(String)
    interval = Column(String)
    initial_capital = Column(Float, default=100000.0)
    cash = Column(Float, default=100000.0)
    position = Column(Float, default=0.0)
    last_price = Column(Float, default=0.0)
    equity_curve = Column(JSON, default=list)
    fills = Column(JSON, default=list)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
