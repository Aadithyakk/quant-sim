import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import CandleChart from "../components/charts/CandleChart";
import KPI from "../components/KPI";
import { fmtNum, fmtPct } from "../lib/format";

export default function DataExplorer() {
  const [symbol, setSymbol] = useState("AAPL");
  const [interval, setInterval] = useState("1d");
  const [start, setStart] = useState("2020-01-01");
  const [end, setEnd] = useState("");
  const [activeSymbol, setActiveSymbol] = useState(symbol);

  const q = useQuery({
    queryKey: ["history", activeSymbol, interval, start, end],
    queryFn: () => api.history(activeSymbol, interval, start || undefined, end || undefined),
    enabled: !!activeSymbol,
  });

  const bars = q.data?.bars || [];
  const last = bars[bars.length - 1];
  const first = bars[0];
  const totalReturn = first && last ? last.close / first.close - 1 : null;

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="label">Symbol</span>
            <input className="input w-32" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Interval</span>
            <select className="input w-28" value={interval} onChange={(e) => setInterval(e.target.value)}>
              {["1d", "1h", "30m", "15m", "5m"].map((i) => <option key={i}>{i}</option>)}
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
          <button className="btn-primary" onClick={() => setActiveSymbol(symbol)}>Load</button>
        </div>
      </div>

      <div className="col-span-12 grid grid-cols-4 gap-4">
        <KPI label="Symbol" value={q.data?.symbol || "—"} />
        <KPI label="Bars" value={fmtNum(bars.length, 0)} />
        <KPI label="Last close" value={last ? `$${fmtNum(last.close)}` : "—"} />
        <KPI label="Period return" value={totalReturn != null ? fmtPct(totalReturn) : "—"} tone={totalReturn != null ? (totalReturn >= 0 ? "good" : "bad") : "neutral"} />
      </div>

      <div className="col-span-12 card p-4">
        {q.isLoading && <div className="text-muted text-sm">Loading…</div>}
        {q.isError && <div className="text-bad text-sm">{(q.error as Error).message}</div>}
        {q.data && <CandleChart bars={bars} />}
      </div>
    </div>
  );
}
