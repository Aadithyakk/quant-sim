# 🥟 Xiao Long Bao

> A personal quant kitchen: real market data, LLM-cooked strategies, sandboxed backtests, paper trading,
> portfolio optimization, Monte Carlo confidence bands, monthly heatmaps, and an in-house chef who'll
> roast your code.

## Stack

- **Backend:** FastAPI + SQLAlchemy + pandas/numpy, yfinance for data (Parquet cached),
  PyPortfolioOpt for optimization, APScheduler for paper-trade loop, OpenAI SDK for the chef.
- **Frontend:** Vite + React + TypeScript + Tailwind, Plotly.js + Recharts, Monaco editor,
  TanStack Query, canvas-confetti for victory laps.

## Local dev

```pwsh
# Backend (port 8000)
cd backend
copy .env.example .env       # put your OPENAI_API_KEY in
pip install -e .
python -m uvicorn app.main:app --reload --port 8000

# Frontend (port 5174)
cd ../frontend
npm install
npm run dev
# open http://localhost:5174
```

Vite proxies `/api` and `/ws` to the backend at port 8000 automatically.

## Features

- **Steamer (dashboard)** — at-a-glance: today's signal from every saved strategy on a configurable
  universe (SPY, QQQ, AAPL, etc.), top-of-menu best Sharpe, quick links into the kitchen.
- **Data Explorer** — candlestick + indicators, fetch any yfinance ticker, Parquet-cached.
- **Strategy Studio** — describe a strategy in English; GPT generates Python that the **AST guard**
  validates and the **subprocess sandbox** runs. Edit in Monaco. **🔥 Roast my strategy** button asks
  GPT to praise / roast / suggest improvements with a 5-star verdict.
- **Backtest** — vectorized engine with commission + slippage; KPI tiles; equity curve, drawdown,
  trade markers on candles, **monthly returns heatmap**, and **Monte Carlo bootstrap fan chart** with
  5/25/50/75/95% bands plus final-distribution stats. Confetti when Sharpe ≥ 2 🎉
- **Paper Trade** — APScheduler ticks live quotes against a saved strategy; WebSocket pushes
  fills + equity updates; simulated broker with slippage & commission.
- **Optimize** — PyPortfolioOpt max-Sharpe / min-vol / risk parity + efficient frontier scatter.
- **Leaderboard** — every saved backtest sortable by Sharpe / CAGR / MaxDD / Total return; click
  to overlay equity curves (up to 6).

## Safety: how the sandbox works

LLM-generated strategy code is gated by two layers:

1. **AST allowlist** (`backend/app/sandbox/ast_guard.py`): rejects any import outside
   `pandas|numpy|math|statistics`, any `exec/eval/open/getattr/setattr/__import__/compile`,
   any dunder attribute, any disallowed name.
2. **Isolated subprocess** (`backend/app/sandbox/runner.py`): runs the code in a fresh
   Python process with restricted builtins and a 30s timeout. Input/output via temp Parquet files.

The 10 red-team test cases in `backend/tests/test_sandbox.py` cover the common escape attempts.

## Deploy

The architecture is **frontend on Vercel** + **backend on Render** (or Railway/Fly — anywhere
that runs a long-lived Python process; Vercel serverless can't host the WebSocket + APScheduler).

### 1. Backend → Render

1. Push the repo to GitHub.
2. In Render, click **New → Blueprint**, pick your repo. Render will read `render.yaml`.
3. Set the two `sync: false` env vars in the Render dashboard:
   - `OPENAI_API_KEY` = your key
   - `CORS_ORIGINS` = e.g. `https://your-app.vercel.app`
4. Wait for first deploy. Note the URL (e.g. `https://xlb-backend.onrender.com`).

The free tier sleeps after 15 min idle — first request after sleep takes ~30s.

### 2. Frontend → Vercel

1. In Vercel, **Add New → Project**, pick the same repo, **Root Directory** = `frontend`.
2. Vercel auto-detects Vite from `frontend/vercel.json`.
3. Add env var: `VITE_API_BASE` = `https://xlb-backend.onrender.com` (no trailing slash).
4. Deploy.

WebSocket paper-trade ticks will need the API base swapped to a `wss://` URL — see
`frontend/src/lib/api.ts` `paperSocketUrl()` if you wire it up for production.

### 3. Lock down

- Rotate your OpenAI key (https://platform.openai.com/api-keys) and add a usage limit.
- Set CORS_ORIGINS on Render to your exact Vercel URL, not `*`.
- Add Vercel password protection if you want it private.

## Layout

```
backend/
  app/
    api/         data, strategy, backtest, optimize, paper, leaderboard, dashboard routers
    data/        yfinance wrapper + Parquet cache
    engine/      backtester + metrics + analytics (heatmap, Monte Carlo, rolling Sharpe)
    strategies/  Strategy base class + sma_cross / rsi_mean_rev / momentum
    sandbox/     AST allowlist + subprocess runner
    llm/         OpenAI client + prompts (generate + roast)
    optimize/    PyPortfolioOpt wrappers
    paper/       APScheduler tick loop + simulated broker + WebSocket fan-out
    store/       SQLAlchemy models
  tests/test_sandbox.py
frontend/
  src/
    pages/       Dashboard, DataExplorer, StrategyStudio, Backtest, PaperTrade, Optimize, Leaderboard
    components/  Plot, charts (Candle, Equity, Drawdown, MonthlyHeatmap, MonteCarlo, Frontier, WeightBars),
                 CodeEditor, KPI
    lib/         api, format, celebrate (confetti)
```
