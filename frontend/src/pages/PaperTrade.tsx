import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paperSocketUrl } from "../lib/api";
import KPI from "../components/KPI";
import EquityChart from "../components/charts/EquityChart";
import { fmtMoney, fmtNum, fmtPct } from "../lib/format";
import { Play, Square } from "lucide-react";

export default function PaperTrade() {
  const qc = useQueryClient();
  const strategies = useQuery({ queryKey: ["strategies"], queryFn: api.listStrategies });
  const accounts = useQuery({ queryKey: ["paper-accts"], queryFn: api.listPaper, refetchInterval: 5_000 });

  const [strategyId, setStrategyId] = useState<number | null>(null);
  const [symbol, setSymbol] = useState("QQQ");
  const [interval, setInterval] = useState("5m");
  const [capital, setCapital] = useState(100_000);
  const [selected, setSelected] = useState<number | null>(null);

  const start = useMutation({
    mutationFn: () => api.startPaper({ strategy_id: strategyId, symbol, interval, initial_capital: capital }),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["paper-accts"] }); setSelected(d.id); },
  });
  const stop = useMutation({
    mutationFn: (id: number) => api.stopPaper(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paper-accts"] }),
  });

  const detail = useQuery({
    queryKey: ["paper-detail", selected],
    queryFn: () => api.getPaper(selected!),
    enabled: selected != null,
  });

  // Live updates via WebSocket
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    if (selected == null) return;
    const ws = new WebSocket(paperSocketUrl(selected));
    wsRef.current = ws;
    setLiveEvents([]);
    ws.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        setLiveEvents((prev) => [...prev.slice(-200), ev]);
      } catch {}
    };
    return () => { ws.close(); };
  }, [selected]);

  const acc = detail.data;
  const recentFills = (acc?.fills || []).slice(-10).reverse();
  const liveCurve = acc?.equity_curve || [];
  const totalReturn = acc ? (acc.equity / acc.initial_capital) - 1 : null;

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 card p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="flex flex-col gap-1 col-span-2">
            <span className="label">Strategy</span>
            <select className="input" value={strategyId ?? ""} onChange={(e) => setStrategyId(+e.target.value)}>
              <option value="">— pick —</option>
              {strategies.data?.strategies.map((s) => (
                <option key={s.id} value={s.id}>{s.name} {s.builtin_key ? "(builtin)" : ""}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Symbol</span>
            <input className="input" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Interval</span>
            <select className="input" value={interval} onChange={(e) => setInterval(e.target.value)}>
              {["1m", "5m", "15m", "1h", "1d"].map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Capital</span>
            <input type="number" className="input" value={capital} onChange={(e) => setCapital(+e.target.value)} />
          </div>
          <button className="btn-primary" onClick={() => start.mutate()} disabled={!strategyId || start.isPending}>
            <Play className="w-4 h-4 mr-2" /> Start
          </button>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 card p-4">
        <div className="label mb-2">Paper accounts</div>
        <ul className="space-y-1 max-h-96 overflow-auto">
          {(accounts.data?.accounts || []).map((a) => (
            <li key={a.id}
                className={"text-sm border border-border rounded px-3 py-2 cursor-pointer " + (selected === a.id ? "bg-panel2" : "")}
                onClick={() => setSelected(a.id)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{a.symbol} <span className="text-muted text-xs">{a.interval}</span></div>
                  <div className="text-xs text-muted">Equity: {fmtMoney(a.equity)} · Pos: {fmtNum(a.position, 2)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={"badge " + (a.active ? "bg-good/10 text-good" : "bg-muted/10 text-muted")}>{a.active ? "live" : "stopped"}</span>
                  {a.active && (
                    <button className="text-bad hover:text-red-300" onClick={(e) => { e.stopPropagation(); stop.mutate(a.id); }}>
                      <Square className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="col-span-12 lg:col-span-8 grid grid-cols-1 gap-4">
        {acc ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI label="Equity" value={fmtMoney(acc.equity)} tone={totalReturn != null && totalReturn >= 0 ? "good" : "bad"} />
              <KPI label="Cash" value={fmtMoney(acc.cash)} />
              <KPI label="Position" value={fmtNum(acc.position, 2)} />
              <KPI label="Return" value={fmtPct(totalReturn)} tone={totalReturn != null && totalReturn >= 0 ? "good" : "bad"} />
            </div>
            <div className="card p-4">
              <div className="label mb-2">Equity curve (live)</div>
              <EquityChart series={[{ name: "equity", data: liveCurve }]} height={260} />
            </div>
            <div className="card p-4">
              <div className="label mb-2">Recent fills</div>
              <ul className="space-y-1 max-h-48 overflow-auto text-sm font-mono">
                {recentFills.length === 0 && <li className="text-muted">No fills yet.</li>}
                {recentFills.map((f: any, i: number) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className={f.side === "buy" ? "text-good" : "text-bad"}>{f.side.toUpperCase()}</span>
                    <span>{fmtNum(f.quantity, 4)} @ {fmtMoney(f.price)}</span>
                    <span className="text-muted text-xs">{f.ts}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-4">
              <div className="label mb-2">Live stream</div>
              <div className="text-xs font-mono max-h-32 overflow-auto text-ink">
                {liveEvents.slice(-10).reverse().map((e, i) => (
                  <div key={i}>{e.ts} · {e.type} · price {fmtNum(e.price, 2)} · eq {fmtMoney(e.equity)}{e.fill ? ` · FILL ${e.fill.side}` : ""}</div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="card p-6 text-muted">Select or start a paper account.</div>
        )}
      </div>
    </div>
  );
}
