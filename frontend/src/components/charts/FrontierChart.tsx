import Plot, { useBaseLayout, usePlotTheme } from "../Plot";

export default function FrontierChart({
  frontier,
  portfolio,
  assets,
}: {
  frontier: { return: number; volatility: number; sharpe: number }[];
  portfolio?: { expected_return: number; volatility: number; sharpe: number };
  assets?: { symbol: string; mean_return: number; volatility: number }[];
}) {
  const base = useBaseLayout();
  const { palette, isLight } = usePlotTheme();
  const traces: any[] = [];
  if (frontier?.length) {
    traces.push({
      type: "scatter", mode: "lines+markers",
      x: frontier.map((f) => f.volatility), y: frontier.map((f) => f.return),
      line: { color: palette.accent, width: 2 },
      marker: { color: frontier.map((f) => f.sharpe), colorscale: isLight ? "YlOrRd" : "Viridis", size: 6, colorbar: { title: "Sharpe" } },
      name: "frontier",
    });
  }
  if (assets?.length) {
    traces.push({
      type: "scatter", mode: "markers+text",
      x: assets.map((a) => a.volatility), y: assets.map((a) => a.mean_return),
      text: assets.map((a) => a.symbol),
      textposition: "top center",
      marker: { color: palette.accent2, size: 10 },
      name: "assets",
    });
  }
  if (portfolio) {
    traces.push({
      type: "scatter", mode: "markers",
      x: [portfolio.volatility], y: [portfolio.expected_return],
      marker: { color: palette.good, size: 14, symbol: "star" },
      name: "portfolio",
    });
  }
  return (
    <Plot
      data={traces}
      layout={{
        ...base, height: 380,
        xaxis: { ...base.xaxis, title: "Volatility (annual)", tickformat: ".1%" },
        yaxis: { ...base.yaxis, title: "Expected return (annual)", tickformat: ".1%" },
      } as any}
      style={{ width: "100%" }}
      config={{ displayModeBar: false }}
      useResizeHandler
    />
  );
}
