const BASE = (import.meta as any).env?.VITE_API_BASE || "/api";

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => jsonFetch<{ ok: boolean; model: string; llm_configured: boolean }>(`/health`),

  // Data
  searchSymbols: (q: string) => jsonFetch<{ results: { symbol: string; name?: string; exchange?: string }[] }>(`/data/symbols/search?q=${encodeURIComponent(q)}`),
  history: (symbol: string, interval = "1d", start?: string, end?: string) => {
    const qs = new URLSearchParams({ symbol, interval });
    if (start) qs.set("start", start);
    if (end) qs.set("end", end);
    return jsonFetch<{ symbol: string; interval: string; bars: any[] }>(`/data/history?${qs}`);
  },

  // Strategies
  listStrategies: () => jsonFetch<{ strategies: any[]; builtins: { key: string; name: string }[] }>(`/strategy`),
  generateStrategy: (description: string, model?: string) =>
    jsonFetch<any>(`/strategy/generate`, { method: "POST", body: JSON.stringify({ description, model }) }),
  roastStrategy: (code: string, metrics?: any) =>
    jsonFetch<any>(`/strategy/roast`, { method: "POST", body: JSON.stringify({ code, metrics }) }),
  saveStrategy: (body: any) =>
    jsonFetch<{ id: number; name: string }>(`/strategy`, { method: "POST", body: JSON.stringify(body) }),
  deleteStrategy: (id: number) =>
    jsonFetch<{ ok: boolean }>(`/strategy/${id}`, { method: "DELETE" }),

  // Backtest
  backtest: (body: any) => jsonFetch<any>(`/backtest`, { method: "POST", body: JSON.stringify(body) }),
  getRun: (id: number) => jsonFetch<any>(`/backtest/runs/${id}`),

  // Optimize
  optimize: (body: any) => jsonFetch<any>(`/optimize`, { method: "POST", body: JSON.stringify(body) }),

  // Paper
  listPaper: () => jsonFetch<{ accounts: any[] }>(`/paper`),
  getPaper: (id: number) => jsonFetch<any>(`/paper/${id}`),
  startPaper: (body: any) => jsonFetch<any>(`/paper/start`, { method: "POST", body: JSON.stringify(body) }),
  stopPaper: (id: number) => jsonFetch<{ ok: boolean }>(`/paper/${id}/stop`, { method: "POST" }),

  // Dashboard
  dashboardStats: () => jsonFetch<any>(`/dashboard/stats`),
  dashboardToday: (universe?: string) =>
    jsonFetch<any>(`/dashboard/today${universe ? `?universe=${encodeURIComponent(universe)}` : ""}`),

  // Leaderboard
  leaderboard: (sort: string = "sharpe") => jsonFetch<{ items: any[] }>(`/leaderboard?sort=${sort}`),
  compare: (ids: number[]) => jsonFetch<{ runs: any[] }>(`/leaderboard/compare?ids=${ids.join(",")}`),
};

export function paperSocketUrl(accountId: number): string {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws/paper/ws/${accountId}`;
}
