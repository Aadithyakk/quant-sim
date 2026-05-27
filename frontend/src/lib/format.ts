export const fmtPct = (v: number | null | undefined, digits = 2) =>
  v == null || isNaN(v) ? "—" : `${(v * 100).toFixed(digits)}%`;

export const fmtNum = (v: number | null | undefined, digits = 2) =>
  v == null || isNaN(v) ? "—" : v.toLocaleString(undefined, { maximumFractionDigits: digits });

export const fmtMoney = (v: number | null | undefined) =>
  v == null || isNaN(v) ? "—" : `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export const cls = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");
