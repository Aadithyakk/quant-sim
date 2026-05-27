import Plot, { useBaseLayout, usePlotTheme } from "../Plot";

export default function MonthlyHeatmap({
  data,
}: {
  data: { years: number[]; months: string[]; values: (number | null)[][] };
}) {
  const base = useBaseLayout();
  const { isLight, palette } = usePlotTheme();
  if (!data?.years?.length) return <div className="text-muted text-sm">No data</div>;
  const years = [...data.years].reverse();
  const z = [...data.values].reverse();
  const text = z.map((row) => row.map((v) => (v == null ? "" : `${(v * 100).toFixed(1)}%`)));
  // Chili-red ↔ scallion-green divergent palette in light, custom dark equivalent in dark
  const colorscale = isLight
    ? [[0, "#8a2424"], [0.45, "#f5e8d0"], [0.5, "#fffaf0"], [0.55, "#e6efd9"], [1, "#3b6328"]]
    : [[0, "#7f1d1d"], [0.45, "#1f2a3a"], [0.5, "#0b0f17"], [0.55, "#1f2a3a"], [1, "#14532d"]];
  return (
    <Plot
      data={[
        {
          z, x: data.months, y: years.map(String),
          type: "heatmap",
          colorscale,
          zmid: 0,
          text,
          texttemplate: "%{text}",
          textfont: { size: 10, color: palette.ink, family: "ui-sans-serif" },
          hovertemplate: "%{y} %{x}: %{z:.2%}<extra></extra>",
          showscale: false,
        } as any,
      ]}
      layout={{
        ...base,
        height: Math.max(180, 24 * years.length + 60),
        margin: { l: 50, r: 10, t: 10, b: 30 },
      } as any}
      style={{ width: "100%" }}
      config={{ displayModeBar: false }}
      useResizeHandler
    />
  );
}
