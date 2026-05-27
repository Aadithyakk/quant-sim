import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";
import { useTheme } from "../lib/theme";

const Plot = createPlotlyComponent(Plotly as any);

export function usePlotTheme() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  return {
    isLight,
    palette: {
      ink: isLight ? "#2a1f17" : "#cbd5e1",
      grid: isLight ? "#e8d9bf" : "#1f2a3a",
      muted: isLight ? "#8a7a66" : "#64748b",
      accent: isLight ? "#c43830" : "#22d3ee",
      accent2: isLight ? "#c88e20" : "#a78bfa",
      good: isLight ? "#54843c" : "#34d399",
      bad: isLight ? "#a83232" : "#f87171",
    },
  };
}

export function useBaseLayout() {
  const { palette } = usePlotTheme();
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: palette.ink, family: '"Fraunces", ui-serif, Georgia, serif' },
    margin: { l: 50, r: 20, t: 20, b: 40 },
    xaxis: { gridcolor: palette.grid, zerolinecolor: palette.grid, linecolor: palette.grid, tickfont: { family: "ui-sans-serif, system-ui" } },
    yaxis: { gridcolor: palette.grid, zerolinecolor: palette.grid, linecolor: palette.grid, tickfont: { family: "ui-sans-serif, system-ui" } },
    legend: { orientation: "h" as const, y: -0.15, font: { color: palette.ink } },
  };
}

// Kept for backwards compat with existing imports — uses dark defaults
export const baseLayout = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { color: "#cbd5e1", family: "ui-sans-serif, system-ui" },
  margin: { l: 50, r: 20, t: 20, b: 40 },
  xaxis: { gridcolor: "#1f2a3a", zerolinecolor: "#1f2a3a" },
  yaxis: { gridcolor: "#1f2a3a", zerolinecolor: "#1f2a3a" },
  legend: { orientation: "h" as const, y: -0.15 },
};

export default Plot;
