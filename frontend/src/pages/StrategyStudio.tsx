import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import CodeEditor from "../components/CodeEditor";
import { Sparkles, Save, Trash2, FlaskConical, Flame, Star } from "lucide-react";

export default function StrategyStudio() {
  const qc = useQueryClient();
  const [description, setDescription] = useState("Buy when 14-day RSI is below 30, exit when RSI rises above 70.");
  const [code, setCode] = useState("");
  const [explanation, setExplanation] = useState("");
  const [paramsSchema, setParamsSchema] = useState<Record<string, any>>({});
  const [name, setName] = useState("My Strategy");
  const [sandboxStatus, setSandboxStatus] = useState<{ ok: boolean; reason?: string | null } | null>(null);

  const strategies = useQuery({ queryKey: ["strategies"], queryFn: api.listStrategies });

  const gen = useMutation({
    mutationFn: () => api.generateStrategy(description),
    onSuccess: (data) => {
      setCode(data.code);
      setExplanation(data.explanation);
      setParamsSchema(data.parameters_schema || {});
      setSandboxStatus({ ok: data.sandbox_ok, reason: data.sandbox_reason });
    },
  });

  const save = useMutation({
    mutationFn: () => api.saveStrategy({
      name,
      description,
      code,
      params: Object.fromEntries(Object.entries(paramsSchema).map(([k, v]: any) => [k, v?.default])),
      source: "llm",
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["strategies"] }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.deleteStrategy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["strategies"] }),
  });

  const roast = useMutation({ mutationFn: () => api.roastStrategy(code) });

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
        <div className="card p-4 flex flex-col gap-3">
          <span className="label">Describe your strategy</span>
          <textarea
            className="input min-h-32"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='e.g. "Long when 20-day momentum is positive AND price is above 200-day SMA"'
          />
          <button className="btn-primary self-start" onClick={() => gen.mutate()} disabled={gen.isPending}>
            <Sparkles className="w-4 h-4 mr-2" />
            {gen.isPending ? "Generating…" : "Generate strategy"}
          </button>
          {gen.isError && <div className="text-bad text-sm">{(gen.error as Error).message}</div>}
        </div>

        {explanation && (
          <div className="card p-4">
            <div className="label mb-2">Explanation</div>
            <p className="text-sm text-ink">{explanation}</p>
            {Object.keys(paramsSchema).length > 0 && (
              <div className="mt-3">
                <div className="label mb-1">Parameters</div>
                <ul className="text-xs font-mono text-ink grid grid-cols-2 gap-2">
                  {Object.entries(paramsSchema).map(([k, v]: any) => (
                    <li key={k} className="bg-panel2 border border-border rounded px-2 py-1">
                      <span className="text-accent">{k}</span> = {String(v?.default)} <span className="text-muted">({v?.type})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="card p-4">
          <div className="label mb-2">Saved strategies</div>
          <ul className="space-y-1 max-h-64 overflow-auto">
            {strategies.data?.strategies.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm border border-border rounded px-2 py-1.5">
                <div>
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted ml-2 text-xs">{s.source}</span>
                </div>
                <button className="text-bad hover:text-red-300" onClick={() => del.mutate(s.id)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-7 flex flex-col gap-3">
        <div className="card p-3 flex items-center justify-between gap-3">
          <input className="input flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Strategy name" />
          {sandboxStatus && (
            <span className={"badge " + (sandboxStatus.ok ? "bg-good/10 text-good" : "bg-bad/10 text-bad")}>
              {sandboxStatus.ok ? "sandbox ok" : `sandbox: ${sandboxStatus.reason}`}
            </span>
          )}
          <button
            className="btn-ghost"
            onClick={() => save.mutate()}
            disabled={!code || !name || save.isPending || (sandboxStatus !== null && !sandboxStatus.ok)}
          >
            <Save className="w-4 h-4 mr-2" /> Save
          </button>
        </div>
        <CodeEditor value={code} onChange={setCode} height="440px" />
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted flex items-center gap-2">
            <FlaskConical className="w-3.5 h-3.5" />
            Saved strategies appear in the Backtest tab and can be run via the sandbox.
          </div>
          <button
            className="btn-ghost text-sm"
            onClick={() => roast.mutate()}
            disabled={!code || roast.isPending}
            title="Have GPT critique your strategy"
          >
            <Flame className="w-4 h-4 mr-2 text-bad" />
            {roast.isPending ? "Tasting…" : "Roast my strategy"}
          </button>
        </div>

        {roast.data && (
          <div className="card p-4 border-l-4 border-bad/60 mt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-ink">{roast.data.verdict}</div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={"w-4 h-4 " + (i < (roast.data.stars || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted")} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="label mb-1 text-good">Praise</div>
                <ul className="space-y-1 list-disc list-inside text-ink">
                  {(roast.data.praise || []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div>
                <div className="label mb-1 text-bad">Roast</div>
                <ul className="space-y-1 list-disc list-inside text-ink">
                  {(roast.data.roast || []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div>
                <div className="label mb-1 text-accent">Suggestions</div>
                <ul className="space-y-1 list-disc list-inside text-ink">
                  {(roast.data.suggestions || []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}
        {roast.isError && <div className="text-bad text-sm">{(roast.error as Error).message}</div>}
      </div>
    </div>
  );
}
