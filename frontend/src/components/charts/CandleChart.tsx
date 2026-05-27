import Plot, { useBaseLayout, usePlotTheme } from "../Plot";

export default function CandleChart({ bars, trades }: { bars: any[]; trades?: any[] }) {
  const base = useBaseLayout();
  const { palette } = usePlotTheme();
  if (!bars?.length) return <div className="text-muted text-sm">No data</div>;
  const x = bars.map((b) => b.date);
  const traces: any[] = [
    {
      type: "candlestick",
      x,
      open: bars.map((b) => b.open),
      high: bars.map((b) => b.high),
      low: bars.map((b) => b.low),
      close: bars.map((b) => b.close),
      increasing: { line: { color: palette.good }, fillcolor: palette.good },
      decreasing: { line: { color: palette.bad }, fillcolor: palette.bad },
      name: "price",
    },
  ];

  if (trades?.length) {
    traces.push(
      { x: trades.map((t) => t.entry_date), y: trades.map((t) => t.entry_price), mode: "markers", type: "scatter",
        marker: { color: palette.accent, symbol: "triangle-up", size: 10 }, name: "entry" },
      { x: trades.map((t) => t.exit_date), y: trades.map((t) => t.exit_price), mode: "markers", type: "scatter",
        marker: { color: palette.accent2, symbol: "triangle-down", size: 10 }, name: "exit" },
    );
  }

  return (
    <Plot
      data={traces}
      layout={{ ...base, height: 380, xaxis: { ...base.xaxis, rangeslider: { visible: false } } } as any}
      style={{ width: "100%" }}
      config={{ displayModeBar: false }}
      useResizeHandler
    />
  );
}
