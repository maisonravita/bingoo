import { createContext, useCallback, useContext, useState } from "react";
import { cx } from "../lib/utils";
import { useWs } from "../lib/ws";
import { useQuota } from "../lib/quota";
import { useDansLieu } from "../lib/lieu";

/** Compteur « restant / maximum » des actions IA du jour, affiché dans le bouton. */
function QuotaChip({ kind }) {
  const ws = useWs()?.ws;
  const q = useQuota(ws, kind);
  // Affiché seulement quand il en reste peu : le reste du temps, ce n'est qu'un détail technique
  if (!q || q.left > Math.max(2, Math.floor(q.max * 0.2))) return null;
  return <span title={`${q.left} ${q.label} restantes aujourd'hui sur ${q.max} (le compteur repart à zéro chaque nuit)`} className={cx("text-[11px] font-medium tabular-nums rounded-full px-1.5 py-px", q.left === 0 ? "bg-bad-soft text-bad" : "bg-black/10 opacity-80")}>{q.left}/{q.max}</span>;
}

export function Button({ variant = "default", size = "md", className, loading, children, quota, ...p }) {
  const v = {
    default: "bg-white border border-line text-ink hover:border-ink-faint",
    primary: "bg-ink text-white border border-ink hover:bg-black",
    accent: "bg-accent text-white border border-accent hover:bg-accent-dark",
    ghost: "bg-transparent border border-transparent text-ink-soft hover:text-ink hover:bg-white",
    danger: "bg-transparent border border-transparent text-bad hover:bg-bad-soft",
    li: "bg-li text-white border border-li hover:opacity-90",
  }[variant];
  const s = { sm: "px-3 py-1.5 text-[13px]", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-[15px]" }[size];
  return (
    <button type="button" disabled={loading || p.disabled}
      className={cx("inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.97] disabled:active:scale-100 disabled:opacity-50 disabled:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent whitespace-nowrap", v, s, className)}
      {...p}>
      {loading && <Spinner className="w-3.5 h-3.5" />}{children}{quota && <QuotaChip kind={quota} />}
    </button>
  );
}

export function Spinner({ className }) {
  return <span className={cx("inline-block rounded-full border-2 border-current border-r-transparent animate-spin", className ?? "w-4 h-4")} aria-hidden />;
}

export function Card({ className, children, ...p }) {
  return <section className={cx("bg-white border border-line rounded-2xl", className)} {...p}>{children}</section>;
}

export function Badge({ tone = "muted", children, className }) {
  const t = { muted: "bg-paper text-ink-soft", accent: "bg-accent-soft text-accent-dark", good: "bg-good-soft text-good", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad", li: "bg-[#E8F1FB] text-li" }[tone];
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", t, className)}>{children}</span>;
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cx("block", className)}>
      <span className="block text-[13px] font-semibold mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-soft mt-1">{hint}</span>}
    </label>
  );
}

const inputCls = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-ink placeholder:text-ink-faint";
export const Input = ({ className, ...p }) => <input className={cx(inputCls, className)} {...p} />;
export const Textarea = ({ className, ...p }) => <textarea className={cx(inputCls, "resize-y leading-relaxed", className)} {...p} />;

export function PageHead({ title, sub, resume = false, children }) {
  const dans = useDansLieu();
  return (
    <header className={dans ? "flex flex-wrap items-center justify-between gap-3 mb-4" : "flex flex-wrap items-end justify-between gap-3 mb-6"}>
      <div className="min-w-0">
        {!dans && <h1 className="font-black text-[40px] leading-none tracking-tight" style={{ fontFamily: "var(--font-titre)" }}>{title}</h1>}
        {sub && !(dans && resume) && <p className={dans ? "text-ink-soft text-[14px]" : "text-ink-soft mt-2"}>{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="text-center py-16 px-4">
      <p className="font-serif text-2xl">{title}</p>
      {children && <div className="text-ink-soft mt-2 text-sm max-w-md mx-auto">{children}</div>}
    </div>
  );
}

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  // action facultative : { label: "Annuler", run: () => … } (le toast reste alors 6 s)
  const push = useCallback((text, tone = "default", action = null) => {
    const id = Math.random();
    setItems((x) => [...x, { id, text, tone, action }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), tone === "bad" || action ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed z-50 bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center w-[calc(100%-32px)] max-w-md pointer-events-none" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx("rise rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg flex items-center gap-2", t.tone === "bad" ? "bg-bad text-white" : t.tone === "good" ? "bg-good text-white" : "bg-ink text-white")}>{t.tone === "good" && <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path className="check-draw" d="m5 12.5 4.5 4.5L19 7.5" /></svg>}<span>{t.text}</span>{t.action && <button type="button" className="pointer-events-auto ml-2 rounded-lg bg-white/15 px-2.5 py-1 font-semibold hover:bg-white/25" onClick={() => { setItems((x) => x.filter((i) => i.id !== t.id)); t.action.run(); }}>{t.action.label}</button>}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
