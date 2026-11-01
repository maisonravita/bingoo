import { useState } from "react";
import { cx } from "../lib/utils";

export const nf = (n) => Number(n ?? 0).toLocaleString("fr-FR");
export const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
export const pctFr = (v) => `${String(v).replace(".", ",")} %`;

/** Variation par rapport à la période précédente (affichée seulement si la comparaison a un sens). */
export function Delta({ cur, prev, label = "vs préc." }) {
  if (!prev) return cur ? <span className="text-[11px] text-ink-faint">nouveau sur la période</span> : <span className="text-[11px] text-ink-faint">—</span>;
  const d = Math.round(((cur - prev) / prev) * 100);
  return <span className={cx("text-[11px] font-medium", d >= 0 ? "text-good" : "text-bad")}>{d >= 0 ? "↑" : "↓"} {Math.abs(d)} % <span className="font-normal text-ink-faint">{label}</span></span>;
}

export function Kpi({ icon, value, label, cur, prev, sub }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 flex items-start gap-3 min-w-0">
      {icon && <span className="grid place-items-center h-10 w-10 rounded-xl bg-accent-soft text-accent shrink-0">{icon}</span>}
      <div className="min-w-0">
        <p className="text-2xl font-semibold leading-none tabular-nums">{value}</p>
        <p className="text-xs text-ink-soft mt-1.5">{label}</p>
        <div className="mt-1">{sub ?? (cur != null && <Delta cur={cur} prev={prev} />)}</div>
      </div>
    </div>
  );
}

export const SRC = {
  google: ["Google (référencement)", "#F26B2A"], google_ads: ["Google Ads", "#F9A03F"], linkedin: ["LinkedIn", "#0A66C2"], instagram: ["Instagram", "#E1306C"],
  facebook: ["Facebook", "#1877F2"], tiktok: ["TikTok", "#111111"], youtube: ["YouTube", "#FF0000"], x: ["X (Twitter)", "#5B5E66"], email: ["E-mails", "#1F7A4D"],
  direct: ["Accès direct", "#9A9CA3"], sites: ["Autres sites", "#C9B8A6"], autres_moteurs: ["Autres moteurs", "#E8C07A"], ia: ["Assistants IA", "#8B5CF6"],
};
export const srcLabel = (k) => SRC[k]?.[0] ?? k;
export const srcColor = (k, i = 0) => SRC[k]?.[1] ?? ["#D9C7B5", "#B6A08A", "#8F7A66"][i % 3];

export function Donut({ items, total, center, sub }) {
  const R = 42, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="relative h-44 w-44 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#F1EEE7" strokeWidth="13" />
        {items.map((it, i) => {
          const len = total ? (it.value / total) * C : 0;
          const el = <circle key={it.key} cx="50" cy="50" r={R} fill="none" stroke={srcColor(it.key, i)} strokeWidth="13" strokeDasharray={`${Math.max(0, len - 1)} ${C}`} strokeDashoffset={-acc} />;
          acc += len; return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center"><div><p className="text-2xl font-semibold leading-none">{center}</p><p className="text-[11px] text-ink-soft mt-1">{sub}</p></div></div>
    </div>
  );
}

/** Courbe simple (aire dégradée) avec infobulle au survol. */
export function LineChart({ points, fmt = nf, height = 170, unit = "" }) {
  const [hover, setHover] = useState(null);
  if (!points.length) return <div className="grid place-items-center text-sm text-ink-soft" style={{ height }}>Pas encore de données</div>;
  const W = 300, H = 100, max = Math.max(1, ...points.map((p) => p.v)) * 1.15;
  const xy = points.map((p, i) => [points.length === 1 ? W / 2 : (i / (points.length - 1)) * W, H - (p.v / max) * H]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const h = hover ?? points.length - 1;
  const ticks = [0, Math.floor((points.length - 1) / 3), Math.floor(((points.length - 1) * 2) / 3), points.length - 1].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <div className="relative" style={{ height }}>
      <svg viewBox={`0 -8 ${W} ${H + 8}`} preserveAspectRatio="none" className="absolute inset-x-0 top-0 w-full" style={{ height: height - 22 }}
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.round(((e.clientX - r.left) / r.width) * (points.length - 1))); }} onMouseLeave={() => setHover(null)}>
        <defs><linearGradient id="kfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#F26B2A" stopOpacity=".28" /><stop offset="100%" stopColor="#F26B2A" stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="#EEE9E0" strokeWidth=".6" vectorEffect="non-scaling-stroke" />)}
        <path d={`${line} L${xy.at(-1)[0]},${H} L${xy[0][0]},${H} Z`} fill="url(#kfill)" />
        <path d={line} fill="none" stroke="#E0531F" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <line x1={xy[h][0]} x2={xy[h][0]} y1="0" y2={H} stroke="#E0531F" strokeOpacity=".25" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-4 ring-accent/20" style={{ left: `${(xy[h][0] / W) * 100}%`, top: `${((xy[h][1] + 8) / (H + 8)) * (height - 22)}px` }} />
      <div className="absolute -translate-x-1/2 rounded-lg bg-white border border-line shadow-sm px-2 py-1 text-[11px] whitespace-nowrap pointer-events-none" style={{ left: `${Math.min(85, Math.max(15, (xy[h][0] / W) * 100))}%`, top: 0 }}>
        <b>{fmt(points[h].v)}{unit}</b> <span className="text-ink-faint">· {points[h].label}</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-ink-faint">{ticks.map((t) => <span key={t}>{points[t].label}</span>)}</div>
    </div>
  );
}

/** Jours de la période, y compris ceux sans événement (valeur 0). */
export function fillDays(rows, days, key) {
  const map = new Map((rows ?? []).map((r) => [r.d, r]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    out.push({ d, label: new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), v: typeof key === "function" ? key(map.get(d)) : Number(map.get(d)?.[key] ?? 0) });
  }
  return out;
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map(([k, l]) => <button key={k} onClick={() => onChange(k)} className={cx("shrink-0 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px", value === k ? "border-accent text-accent" : "border-transparent text-ink-soft hover:text-ink")}>{l}</button>)}
    </div>
  );
}

export function PeriodSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent">
      <option value={7}>7 derniers jours</option><option value={30}>30 derniers jours</option><option value={90}>90 derniers jours</option>
    </select>
  );
}
