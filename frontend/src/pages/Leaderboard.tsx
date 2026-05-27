import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import EquityChart from "../components/charts/EquityChart";
import { fmtNum, fmtPct } from "../lib/format";

const COLORS = ["#22d3ee", "#a78bfa", "#34d399", "#f59e0b", "#f87171", "#60a5fa"];

export default function Leaderboard() {
  const [sort, setSort] = useState("sharpe");
  const [selected, setSelected] = useState<number[]>([]);
  const lb = useQuery({ queryKey: ["lb", sort], queryFn: () => api.leaderboard(sort) });
  const cmp = useQuery({
    queryKey: ["lb-compare", selected],
    queryFn: () => api.compare(selected),
    enabled: selected.length >= 1,
  });

  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-6)));

  const series = useMemo(() => {
    if (!cmp.data) return [];
    return cmp.data.runs.map((r: any, i: number) => ({
      name: `${r.strategy_name} · ${r.symbol}`,
      data: r.equity,
      color: COLORS[i % COLORS.length],
    }));
  }, [cmp.data]);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 card p-4">
        <div className="flex items-center gap-3">
          <span className="label">Sort by</span>
          <select className="input w-48" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="sharpe">Sharpe</option>
            <option value="cagr">CAGR</option>
            <option value="total_return">Total return</option>
            <option value="max_drawdown">Max drawdown</option>
          </select>
          <span className="text-muted text-sm">Click rows to overlay equity curves (max 6).</span>
        </div>
      </div>

      <div className="col-span-12 card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-panel2 text-muted text-xs uppercase">
            <tr>
              <th className="p-2 text-left">Strategy</th>
              <th className="p-2 text-left">Symbol</th>
              <th className="p-2 text-right">Sharpe</th>
              <th className="p-2 text-right">CAGR</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2 text-right">Max DD</th>
              <th className="p-2 text-right">Trades</th>
              <th className="p-2 text-right">When</th>
            </tr>
          </thead>
          <tbody>
            {(lb.data?.items || []).map((it: any) => (
              <tr key={it.id}
                  className={"border-t border-border cursor-pointer " + (selected.includes(it.id) ? "bg-accent/10" : "hover:bg-panel2")}
                  onClick={() => toggle(it.id)}>
                <td className="p-2">{it.strategy_name}</td>
                <td className="p-2">{it.symbol}</td>
                <td className="p-2 text-right font-mono">{fmtNum(it.sharpe)}</td>
                <td className="p-2 text-right font-mono">{fmtPct(it.cagr)}</td>
                <td className={"p-2 text-right font-mono " + (it.total_return >= 0 ? "text-good" : "text-bad")}>{fmtPct(it.total_return)}</td>
                <td className="p-2 text-right font-mono text-bad">{fmtPct(it.max_drawdown)}</td>
                <td className="p-2 text-right font-mono">{it.n_trades}</td>
                <td className="p-2 text-right text-xs text-muted">{it.created_at?.slice(0, 16).replace("T", " ")}</td>
              </tr>
            ))}
            {(!lb.data?.items || lb.data.items.length === 0) && (
              <tr><td colSpan={8} className="p-6 text-center text-muted">No backtests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {series.length > 0 && (
        <div className="col-span-12 card p-4">
          <div className="label mb-2">Equity overlay</div>
          <EquityChart series={series} height={360} />
        </div>
      )}
    </div>
  );
}
