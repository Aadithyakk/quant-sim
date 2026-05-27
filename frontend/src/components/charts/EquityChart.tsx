import Plot, { useBaseLayout, usePlotTheme } from "../Plot";

type Series = { name: string; data: { date: string; value: number }[]; color?: string };

export default function EquityChart({ series, height = 320 }: { series: Series[]; height?: number }) {
  const base = useBaseLayout();
  const { palette } = usePlotTheme();
  if (!series?.length) return <div className="text-muted text-sm">No data</div>;
  const defaults = [palette.accent, palette.accent2, palette.good, palette.bad];
  const traces = series.map((s, i) => ({
    type: "scatter", mode: "lines", name: s.name,
    x: s.data.map((d) => d.date), y: s.data.map((d) => d.value),
    line: { color: s.color || defaults[i % defaults.length], width: 2 },
  }));
  return (
    <Plot
      data={traces as any}
      layout={{ ...base, height } as any}
      style={{ width: "100%" }}
      config={{ displayModeBar: false }}
      useResizeHandler
    />
  );
}
