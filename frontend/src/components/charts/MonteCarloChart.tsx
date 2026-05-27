import Plot, { useBaseLayout, usePlotTheme } from "../Plot";

export default function MonteCarloChart({
  mc,
}: {
  mc: { steps: number; n_sims: number; bands: Record<string, number[]>; final_distribution: any };
}) {
  const base = useBaseLayout();
  const { palette, isLight } = usePlotTheme();
  if (!mc?.bands?.q50) return <div className="text-muted text-sm">No simulation</div>;
  const x = Array.from({ length: mc.steps }, (_, i) => i);
  const c1 = isLight ? "rgba(196,56,48,0.14)" : "rgba(34,211,238,0.12)";
  const c2 = isLight ? "rgba(200,142,32,0.28)" : "rgba(167,139,250,0.25)";
  const traces: any[] = [
    { x, y: mc.bands.q95, type: "scatter", mode: "lines", line: { color: "rgba(0,0,0,0)" }, showlegend: false },
    { x, y: mc.bands.q05, type: "scatter", mode: "lines", line: { color: "rgba(0,0,0,0)" }, fill: "tonexty", fillcolor: c1, name: "5–95% range" },
    { x, y: mc.bands.q75, type: "scatter", mode: "lines", line: { color: "rgba(0,0,0,0)" }, showlegend: false },
    { x, y: mc.bands.q25, type: "scatter", mode: "lines", line: { color: "rgba(0,0,0,0)" }, fill: "tonexty", fillcolor: c2, name: "25–75% range" },
    { x, y: mc.bands.q50, type: "scatter", mode: "lines", line: { color: palette.accent, width: 2 }, name: "median" },
  ];
  return (
    <Plot
      data={traces}
      layout={{
        ...base, height: 280,
        xaxis: { ...base.xaxis, title: "Step" },
        yaxis: { ...base.yaxis, title: "Equity multiple", tickformat: ".2f" },
      } as any}
      style={{ width: "100%" }}
      config={{ displayModeBar: false }}
      useResizeHandler
    />
  );
}
