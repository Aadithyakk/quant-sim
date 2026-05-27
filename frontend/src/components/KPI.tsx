import { cls } from "../lib/format";

export default function KPI({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "good" | "bad" | "neutral";
}) {
  return (
    <div className="kpi">
      <span className="l">{label}</span>
      <span className={cls("v", tone === "good" && "text-good", tone === "bad" && "text-bad")}>{value}</span>
    </div>
  );
}
