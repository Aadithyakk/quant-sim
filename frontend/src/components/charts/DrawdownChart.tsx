import Plot, { useBaseLayout, usePlotTheme } from "../Plot";

export default function DrawdownChart({ equity }: { equity: { date: string; value: number }[] }) {
  const base = useBaseLayout();
  const { palette, isLight } = usePlotTheme();
  if (!equity?.length) return null;
  let peak = -Infinity;
  const dd = equity.map((p) => {
    peak = Math.max(peak, p.value);
    return { date: p.date, value: peak > 0 ? p.value / peak - 1 : 0 };
  });
  return (
    <Plot
      data={[
        {
          type: "scatter", mode: "lines",
          x: dd.map((d) => d.date), y: dd.map((d) => d.value),
          fill: "tozeroy",
          line: { color: palette.bad, width: 1 },
          fillcolor: isLight ? "rgba(168,50,50,0.18)" : "rgba(248,113,113,0.20)",
          name: "drawdown",
        } as any,
      ]}
      layout={{ ...base, height: 200, yaxis: { ...base.yaxis, tickformat: ".0%" } } as any}
      style={{ width: "100%" }}
      config={{ displayModeBar: false }}
      useResizeHandler
    />
  );
}
