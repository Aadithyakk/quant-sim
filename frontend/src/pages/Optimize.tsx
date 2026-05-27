import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import WeightBars from "../components/charts/WeightBars";
import FrontierChart from "../components/charts/FrontierChart";
import KPI from "../components/KPI";
import { fmtNum, fmtPct } from "../lib/format";
import { LineChart } from "lucide-react";

export default function Optimize() {
  const [symbolsText, setSymbolsText] = useState("AAPL, MSFT, GOOGL, AMZN, NVDA");
  const [objective, setObjective] = useState("max_sharpe");
  const [start, setStart] = useState("2020-01-01");
  const [end, setEnd] = useState("");

  const run = useMutation({
    mutationFn: () =>
      api.optimize({
        symbols: symbolsText.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
        objective,
        start: start || undefined,
        end: end || undefined,
      }),
  });
  const d = run.data;

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 card p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="col-span-2 flex flex-col gap-1">
            <span className="label">Symbols (comma-separated)</span>
            <input className="input" value={symbolsText} onChange={(e) => setSymbolsText(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Objective</span>
            <select className="input" value={objective} onChange={(e) => setObjective(e.target.value)}>
              <option value="max_sharpe">Max Sharpe</option>
              <option value="min_vol">Min Volatility</option>
              <option value="risk_parity">Risk Parity</option>
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
          <button className="btn-primary col-span-1 md:col-span-5" onClick={() => run.mutate()} disabled={run.isPending}>
            <LineChart className="w-4 h-4 mr-2" />
            {run.isPending ? "Optimizing…" : "Optimize portfolio"}
          </button>
        </div>
        {run.isError && <div className="text-bad text-sm mt-2">{(run.error as Error).message}</div>}
      </div>

      {d && (
        <>
          <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI label="Expected return" value={fmtPct(d.portfolio.expected_return)} />
            <KPI label="Volatility" value={fmtPct(d.portfolio.volatility)} />
            <KPI label="Sharpe" value={fmtNum(d.portfolio.sharpe)} tone={d.portfolio.sharpe >= 1 ? "good" : "neutral"} />
            <KPI label="Symbols" value={fmtNum(d.symbols.length, 0)} />
          </div>

          <div className="col-span-12 lg:col-span-5 card p-4">
            <div className="label mb-2">Weights</div>
            <WeightBars weights={d.weights} />
          </div>

          <div className="col-span-12 lg:col-span-7 card p-4">
            <div className="label mb-2">Efficient frontier</div>
            <FrontierChart frontier={d.frontier} portfolio={d.portfolio} assets={d.asset_stats} />
          </div>
        </>
      )}
    </div>
  );
}
