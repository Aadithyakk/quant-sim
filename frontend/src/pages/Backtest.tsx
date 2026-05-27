import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import KPI from "../components/KPI";
import CandleChart from "../components/charts/CandleChart";
import EquityChart from "../components/charts/EquityChart";
import DrawdownChart from "../components/charts/DrawdownChart";
import MonthlyHeatmap from "../components/charts/MonthlyHeatmap";
import MonteCarloChart from "../components/charts/MonteCarloChart";
import { fmtNum, fmtPct } from "../lib/format";
import { Play } from "lucide-react";
import { celebrateSharpe } from "../lib/celebrate";

export default function Backtest() {
  const strategies = useQuery({ queryKey: ["strategies"], queryFn: api.listStrategies });
  const [strategyChoice, setStrategyChoice] = useState<string>("builtin:sma_cross");
  const [symbol, setSymbol] = useState("SPY");
  const [interval, setInterval] = useState("1d");
  const [start, setStart] = useState("2015-01-01");
  const [end, setEnd] = useState("");
  const [initialCapital, setInitialCapital] = useState(100_000);
  const [commissionBps, setCommissionBps] = useState(1);
  const [slippageBps, setSlippageBps] = useState(2);
  const [allowShort, setAllowShort] = useState(true);

  const run = useMutation({
    mutationFn: () => {
      const [kind, id] = strategyChoice.split(":");
      const body: any = {
        symbol, interval, start: start || undefined, end: end || undefined,
        initial_capital: initialCapital,
        commission_bps: commissionBps,
        slippage_bps: slippageBps,
        allow_short: allowShort,
      };
      if (kind === "builtin") body.strategy_key = id;
      else body.strategy_id = Number(id);
      return api.backtest(body);
    },
  });
  const data = run.data;
  const history = useQuery({
    queryKey: ["bt-history", symbol, interval, start, end],
    queryFn: () => api.history(symbol, interval, start || undefined, end || undefined),
    enabled: !!data,
  });

  const m = data?.metrics || {};
  useEffect(() => {
    if (m?.sharpe) celebrateSharpe(Number(m.sharpe));
  }, [m?.sharpe]);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
          <div className="flex flex-col gap-1 col-span-2">
            <span className="label">Strategy</span>
            <select className="input" value={strategyChoice} onChange={(e) => setStrategyChoice(e.target.value)}>
              <optgroup label="Built-in">
                {strategies.data?.builtins.map((b) => (
                  <option key={b.key} value={`builtin:${b.key}`}>{b.name}</option>
                ))}
              </optgroup>
              <optgroup label="Saved">
                {strategies.data?.strategies.filter((s) => !s.builtin_key).map((s) => (
                  <option key={s.id} value={`id:${s.id}`}>{s.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Symbol</span>
            <input className="input" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Interval</span>
            <select className="input" value={interval} onChange={(e) => setInterval(e.target.value)}>
              {["1d", "1h", "30m"].map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Start</span>
            <input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">End</span>
            <input type="date" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Capital ($)</span>
            <input type="number" className="input" value={initialCapital} onChange={(e) => setInitialCapital(+e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Comm (bps)</span>
            <input type="number" className="input" value={commissionBps} onChange={(e) => setCommissionBps(+e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Slip (bps)</span>
            <input type="number" className="input" value={slippageBps} onChange={(e) => setSlippageBps(+e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink col-span-2">
            <input type="checkbox" checked={allowShort} onChange={(e) => setAllowShort(e.target.checked)} />
            Allow short
          </label>
          <button className="btn-primary col-span-2" onClick={() => run.mutate()} disabled={run.isPending}>
            <Play className="w-4 h-4 mr-2" />
            {run.isPending ? "Running…" : "Run backtest"}
          </button>
        </div>
        {run.isError && <div className="text-bad text-sm mt-2">{(run.error as Error).message}</div>}
      </div>

      {data && (
        <>
          <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <KPI label="Total return" value={fmtPct(m.total_return)} tone={m.total_return >= 0 ? "good" : "bad"} />
            <KPI label="CAGR" value={fmtPct(m.cagr)} />
            <KPI label="Sharpe" value={fmtNum(m.sharpe)} tone={m.sharpe >= 1 ? "good" : "neutral"} />
            <KPI label="Sortino" value={fmtNum(m.sortino)} />
            <KPI label="Max DD" value={fmtPct(m.max_drawdown)} tone="bad" />
            <KPI label="Vol" value={fmtPct(m.vol)} />
            <KPI label="Win rate" value={m.win_rate != null ? fmtPct(m.win_rate) : "—"} />
            <KPI label="Trades" value={fmtNum(m.n_trades, 0)} />
          </div>

          <div className="col-span-12 card p-4">
            <div className="label mb-2">Equity curve</div>
            <EquityChart series={[{ name: data.strategy_name, data: data.equity }]} />
          </div>

          <div className="col-span-12 card p-4">
            <div className="label mb-2">Drawdown</div>
            <DrawdownChart equity={data.equity} />
          </div>

          {data.heatmap && data.heatmap.years?.length > 0 && (
            <div className="col-span-12 card p-4">
              <div className="label mb-2">Monthly returns 🥟</div>
              <MonthlyHeatmap data={data.heatmap} />
            </div>
          )}

          {data.monte_carlo && (
            <div className="col-span-12 card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="label">Monte Carlo bootstrap ({data.monte_carlo.n_sims} sims)</span>
                {data.monte_carlo.final_distribution && (
                  <span className="text-xs text-muted">
                    Median final = <span className="text-ink font-mono">{fmtNum(data.monte_carlo.final_distribution.median, 2)}x</span>
                    {" · "}
                    P(profitable) = <span className="text-ink font-mono">{fmtPct(data.monte_carlo.final_distribution.prob_positive)}</span>
                  </span>
                )}
              </div>
              <MonteCarloChart mc={data.monte_carlo} />
            </div>
          )}

          {history.data && (
            <div className="col-span-12 card p-4">
              <div className="label mb-2">Price + trade markers</div>
              <CandleChart bars={history.data.bars} trades={data.trades} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
