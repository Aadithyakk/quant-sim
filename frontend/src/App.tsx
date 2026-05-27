import { NavLink, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, BarChart3, BrainCircuit, LineChart, Trophy, Database, Soup, Moon, Sun, Wifi, WifiOff } from "lucide-react";
import { cls } from "./lib/format";
import { api } from "./lib/api";
import { useTheme } from "./lib/theme";
import Dashboard from "./pages/Dashboard";
import DataExplorer from "./pages/DataExplorer";
import StrategyStudio from "./pages/StrategyStudio";
import Backtest from "./pages/Backtest";
import PaperTrade from "./pages/PaperTrade";
import Optimize from "./pages/Optimize";
import Leaderboard from "./pages/Leaderboard";

const nav = [
  { to: "/dashboard", label: "Steamer", Icon: Soup },
  { to: "/data",      label: "Market",  Icon: Database },
  { to: "/studio",    label: "Studio",  Icon: BrainCircuit },
  { to: "/backtest",  label: "Backtest",Icon: BarChart3 },
  { to: "/paper",     label: "Paper",   Icon: Activity },
  { to: "/optimize",  label: "Optimize",Icon: LineChart },
  { to: "/leaderboard",label:"Board",   Icon: Trophy },
];

export default function App() {
  const health = useQuery({ queryKey: ["health"], queryFn: api.health, refetchInterval: 30_000 });
  const { theme, toggle } = useTheme();
  const isOnline = health.data?.ok;

  return (
    <div className="min-h-full pb-16 md:pb-0">
      {/* ── Header ── */}
      <header className="border-b border-border bg-panel/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-2xl select-none">🥟</span>
            <span className="font-display font-semibold tracking-tight text-lg">Xiao Long Bao</span>
            <span className="text-xs text-muted hidden md:inline italic">a quant kitchen</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 flex-wrap">
            {nav.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) =>
                cls("nav-link flex items-center gap-2", isActive && "active")}>
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Status + theme */}
          <div className="ml-auto flex items-center gap-2">
            {/* Online dot — compact on mobile */}
            <span className={cls(
              "flex items-center gap-1 text-xs rounded-full px-2 py-0.5",
              isOnline ? "bg-good/15 text-good" : "bg-bad/15 text-bad"
            )}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="hidden sm:inline">{isOnline ? "online" : "offline"}</span>
            </span>

            {/* LLM badge — hidden on smallest screens */}
            <span className={cls(
              "badge hidden sm:inline-flex",
              health.data?.llm_configured ? "bg-accent/15 text-accent" : "bg-muted/15 text-muted"
            )}>
              {health.data?.llm_configured ? `🤖 ${health.data.model}` : "no chef"}
            </span>

            {/* Theme toggle */}
            <button onClick={toggle} className="btn-ghost !px-2 !py-1.5"
              title={theme === "light" ? "Night kitchen" : "Day kitchen"}>
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="pleat" />
      </header>

      {/* ── Main ── */}
      <main className="max-w-[1400px] mx-auto p-3 md:p-6">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"   element={<Dashboard />} />
          <Route path="/data"        element={<DataExplorer />} />
          <Route path="/studio"      element={<StrategyStudio />} />
          <Route path="/backtest"    element={<Backtest />} />
          <Route path="/paper"       element={<PaperTrade />} />
          <Route path="/optimize"    element={<Optimize />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </main>

      {/* ── Footer (desktop only) ── */}
      <footer className="hidden md:flex max-w-[1400px] mx-auto px-6 py-6 text-xs text-muted items-center justify-between">
        <span>🥟 Eight pleats for luck · steamed for {new Date().getFullYear()}</span>
        <span className="font-mono">Not investment advice — taste responsibly.</span>
      </footer>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-panel/95 backdrop-blur border-t border-border flex">
        {nav.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            cls(
              "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition-colors",
              isActive ? "text-accent" : "text-muted hover:text-ink"
            )}>
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
