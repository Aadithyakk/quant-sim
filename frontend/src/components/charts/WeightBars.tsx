import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { usePlotTheme } from "../Plot";

export default function WeightBars({ weights }: { weights: Record<string, number> }) {
  const { palette, isLight } = usePlotTheme();
  const data = Object.entries(weights).map(([symbol, w]) => ({ symbol, weight: w }));
  const colors = isLight
    ? [palette.accent, palette.accent2, palette.good, "#a8763c", palette.bad, "#7a5a36"]
    : ["#22d3ee", "#a78bfa", "#34d399", "#f59e0b", "#f87171", "#60a5fa"];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
        <XAxis dataKey="symbol" stroke={palette.muted} />
        <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} stroke={palette.muted} />
        <Tooltip
          contentStyle={{ background: isLight ? "#fffaf0" : "#111826", border: `1px solid ${isLight ? "#e2cfaf" : "#1f2a3a"}`, borderRadius: 8, color: palette.ink }}
          formatter={(v: any) => `${(v * 100).toFixed(2)}%`}
        />
        <Bar dataKey="weight" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
