import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import KPI from "../components/KPI";
import { fmtNum, fmtPct, cls } from "../lib/format";
import { Flame, Sparkles, Soup, ChefHat, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const [universe, setUniverse] = useState("SPY,QQQ,AAPL,MSFT,NVDA,TSLA");
  const stats = useQuery({ queryKey: ["dash-stats"], queryFn: api.dashboardStats });
  const today = useQuery({ queryKey: ["dash-today", universe], queryFn: () => api.dashboardToday(universe) });

  const rows = today.data?.rows || [];
  const allStrategies = rows[0]?.signals || [];

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 card-bamboo p-6">
        <div className="absolute -top-12 -right-8 opacity-[0.08] text-[260px] leading-none rotate-12 select-none">🥟</div>
        <div className="flex items-center gap-3 relative">
          <Soup className="w-6 h-6 text-accent" />
          <h1 className="text-3xl font-display font-semibold tracking-tight">Welcome to your steamer basket</h1>
        </div>
        <p className="text-muted mt-2 max-w-2xl text-sm relative">
          A few warm dumplings of market data, simmering strategies, and ready-to-plate trade ideas. Pick a strategy from
          the studio, backtest it, or just see what today's market is serving. Eight pleats for luck. 🥢
        </p>
      </div>

      <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Strategies" value={fmtNum(stats.data?.n_strategies, 0)} />
        <KPI label="Backtest runs" value={fmtNum(stats.data?.n_runs, 0)} />
        <KPI label="Paper accounts" value={fmtNum(stats.data?.n_paper_accounts, 0)} />
        <KPI label="Best Sharpe" value={fmtNum(stats.data?.best_sharpe)} tone={(stats.data?.best_sharpe || 0) >= 1 ? "good" : "neutral"} />
      </div>

      {stats.data?.best_run && (
        <div className="col-span-12 card p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ChefHat className="w-5 h-5 text-accent2" />
            <div>
              <div className="label">Top of the menu</div>
              <div className="font-medium">
                {stats.data.best_run.strategy_name} on {stats.data.best_run.symbol} — Sharpe {fmtNum(stats.data.best_run.sharpe)} · CAGR {fmtPct(stats.data.best_run.cagr)}
              </div>
            </div>
          </div>
          <Link to="/leaderboard" className="btn-ghost text-sm">View leaderboard <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
        </div>
      )}

      <div className="col-span-12 card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-bad" />
            <h2 className="font-semibold">Today's setup</h2>
            <span className="text-muted text-xs">Current signal each saved strategy is plating right now</span>
          </div>
          <input
            className="input w-72"
            value={universe}
            onChange={(e) => setUniverse(e.target.value.toUpperCase())}
            placeholder="Comma-separated tickers"
          />
        </div>

        {today.isLoading && <div className="text-muted text-sm">Steaming the basket…</div>}
        {!today.isLoading && rows.length === 0 && <div className="text-muted text-sm">No data.</div>}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted text-xs uppercase">
                <tr>
                  <th className="text-left p-2">Symbol</th>
                  <th className="text-right p-2">Last</th>
                  <th className="text-right p-2">Δ Day</th>
                  {allStrategies.map((s: any) => (
                    <th key={s.strategy_id} className="text-center p-2 truncate max-w-[140px]">{s.strategy_name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.symbol} className="border-t border-border">
                    <td className="p-2 font-medium">{r.symbol}</td>
                    <td className="p-2 text-right font-mono">${fmtNum(r.last_close)}</td>
                    <td className={cls("p-2 text-right font-mono", r.change_pct >= 0 ? "text-good" : "text-bad")}>
                      {fmtPct(r.change_pct)}
                    </td>
                    {r.signals.map((s: any) => (
                      <td key={s.strategy_id} className="p-2 text-center">
                        <span className={cls("badge",
                          s.verdict === "LONG" && "bg-good/10 text-good",
                          s.verdict === "SHORT" && "bg-bad/10 text-bad",
                          s.verdict === "FLAT" && "bg-muted/10 text-muted")}>
                          {s.verdict}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="col-span-12 lg:col-span-6 card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <h2 className="font-semibold">Fold a new dumpling</h2>
        </div>
        <p className="text-sm text-muted mb-3">
          Describe a strategy in English. The kitchen (GPT) will turn it into Python that runs in a sandbox.
        </p>
        <Link to="/studio" className="btn-primary text-sm">Open Strategy Studio <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
      </div>

      <div className="col-span-12 lg:col-span-6 card p-6">
        <h2 className="font-semibold mb-2">Quick taste test</h2>
        <p className="text-sm text-muted mb-3">
          Run a backtest right now on any of the built-in strategies. Or pit two strategies head-to-head in the leaderboard.
        </p>
        <div className="flex gap-2">
          <Link to="/backtest" className="btn-ghost text-sm">Backtest</Link>
          <Link to="/optimize" className="btn-ghost text-sm">Portfolio Optimizer</Link>
          <Link to="/paper" className="btn-ghost text-sm">Paper Trade</Link>
        </div>
      </div>
    </div>
  );
}
