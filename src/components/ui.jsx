import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
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

export const Button = forwardRef(function Button({ variant = "default", size = "md", className, loading, children, quota, ...p }, ref) {
  const v = {
    default: "bg-surface border border-line text-ink hover:border-ink-faint",
    primary: "bg-ink text-paper border border-ink hover:opacity-90",
    accent: "bg-accent text-white border border-accent hover:bg-accent-dark",
    ghost: "bg-transparent border border-transparent text-ink-soft hover:text-ink hover:bg-surface",
    danger: "bg-transparent border border-transparent text-bad hover:bg-bad-soft",
    li: "bg-li text-white border border-li hover:opacity-90",
  }[variant];
  const s = { sm: "px-3 py-1.5 text-[13px]", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-[15px]", icone: "h-10 w-10 p-0" }[size];
  return (
    <button ref={ref} type="button" disabled={loading || p.disabled} aria-busy={loading || undefined}
      className={cx("inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.97] disabled:active:scale-100 disabled:opacity-50 disabled:cursor-default whitespace-nowrap", v, s, className)}
      {...p}>
      {loading && <Spinner className="w-3.5 h-3.5" />}{children}{quota && <QuotaChip kind={quota} />}
    </button>
  );
});

export function Spinner({ className }) {
  return <span className={cx("inline-block rounded-full border-2 border-current border-r-transparent animate-spin", className ?? "w-4 h-4")} aria-hidden />;
}

export function Card({ className, children, ...p }) {
  return <section className={cx("bg-surface border border-line rounded-2xl", className)} {...p}>{children}</section>;
}

export function Badge({ tone = "muted", children, className }) {
  const t = { muted: "bg-paper text-ink-soft", info: "bg-info-soft text-info", accent: "bg-accent-soft text-accent-dark", good: "bg-good-soft text-good", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad", li: "bg-[#E8F1FB] text-li" }[tone];
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", t, className)}>{children}</span>;
}

/** Champ de formulaire : libellé, aide et erreur reliés au champ pour les lecteurs d'écran. */
export function Field({ label, hint, error, children, className }) {
  const id = useId();
  const enfant = Array.isArray(children) || !children?.props ? children
    : { ...children, props: { ...children.props, "aria-invalid": error ? true : undefined, "aria-describedby": [hint && `${id}-aide`, error && `${id}-err`].filter(Boolean).join(" ") || undefined } };
  return (
    <label className={cx("block", className)}>
      <span className="block text-[13px] font-semibold mb-1.5">{label}</span>
      {enfant}
      {hint && !error && <span id={`${id}-aide`} className="block text-xs text-ink-soft mt-1">{hint}</span>}
      {error && <span id={`${id}-err`} role="alert" className="mt-1 flex items-center gap-1 text-xs font-medium text-bad"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5h.01" strokeLinecap="round" /></svg>{error}</span>}
    </label>
  );
}

const inputCls = "w-full rounded-champ border border-line bg-surface px-3 py-2.5 text-[15px] text-ink outline-none transition-colors focus:border-ink focus-visible:outline-none placeholder:text-ink-faint aria-[invalid=true]:border-bad disabled:opacity-60";
export const Input = ({ className, ...p }) => <input className={cx(inputCls, className)} {...p} />;
export const Textarea = ({ className, ...p }) => <textarea className={cx(inputCls, "resize-y leading-relaxed", className)} {...p} />;
export const Select = ({ className, children, ...p }) => (
  <span className="relative block">
    <select className={cx(inputCls, "appearance-none pr-9", className)} {...p}>{children}</select>
    <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
  </span>
);

export function Case({ label, className, ...p }) {
  return (
    <label className={cx("inline-flex cursor-pointer items-center gap-2.5 text-sm", className)}>
      <input type="checkbox" className="peer sr-only" {...p} />
      <span className="grid h-5 w-5 place-items-center rounded-md border border-ink-faint bg-surface text-paper transition-colors peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[rgb(var(--focus))] peer-disabled:opacity-50 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100" aria-hidden><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span>
      {label}
    </label>
  );
}

export function Interrupteur({ checked, onChange, label, disabled }) {
  return (
    <label className={cx("inline-flex items-center gap-3 text-sm", disabled ? "opacity-50" : "cursor-pointer")}>
      <button type="button" role="switch" aria-checked={!!checked} disabled={disabled} onClick={() => onChange?.(!checked)}
        className={cx("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-good" : "bg-ink-faint/60")}>
        <span className={cx("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} />
      </button>
      {label}
    </label>
  );
}

/** Fenêtre (modale) : focus piégé à l'intérieur, Échap ferme, le focus revient au bouton d'origine. */
export function Fenetre({ ouverte, onFermer, titre, children, actions, largeur = "max-w-lg" }) {
  const ref = useRef(null);
  const titreId = useId();
  useEffect(() => {
    if (!ouverte) return;
    const avant = document.activeElement;
    const el = ref.current;
    const focusables = () => [...el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')];
    (focusables()[0] ?? el).focus();
    const touche = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onFermer?.(); }
      if (e.key !== "Tab") return;
      const f = focusables(); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    el.addEventListener("keydown", touche);
    const deb = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { el.removeEventListener("keydown", touche); document.body.style.overflow = deb; avant?.focus?.(); };
  }, [ouverte]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ouverte) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onFermer} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titreId} tabIndex={-1}
        className={cx("sheet-in relative w-full rounded-fenetre bg-surface text-ink shadow-fenetre outline-none", largeur)}>
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <h2 id={titreId} className="text-lg font-bold">{titre}</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="-mr-2 -mt-1 grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-paper hover:text-ink"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg></button>
        </div>
        <div className="px-6 pb-5 pt-2 text-[15px] text-ink-soft">{children}</div>
        {actions && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{actions}</div>}
      </div>
    </div>
  );
}

/** Menu déroulant : flèches haut/bas, Entrée, Échap, retour du focus sur le bouton. */
export function Menu({ libelle, items, align = "left" }) {
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const bouton = useRef(null); const liste = useRef(null); const id = useId();
  useEffect(() => {
    if (!ouvert) return;
    liste.current?.querySelectorAll('[role="menuitem"]')[actif]?.focus();
    const dehors = (e) => { if (!liste.current?.contains(e.target) && !bouton.current?.contains(e.target)) setOuvert(false); };
    document.addEventListener("mousedown", dehors); return () => document.removeEventListener("mousedown", dehors);
  }, [ouvert, actif]);
  const fermer = () => { setOuvert(false); bouton.current?.focus(); };
  const touche = (e) => {
    const n = items.length;
    if (e.key === "ArrowDown") { e.preventDefault(); setActif((a) => (a + 1) % n); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActif((a) => (a - 1 + n) % n); }
    else if (e.key === "Home") { e.preventDefault(); setActif(0); }
    else if (e.key === "End") { e.preventDefault(); setActif(n - 1); }
    else if (e.key === "Escape" || e.key === "Tab") fermer();
  };
  return (
    <div className="relative inline-block">
      <Button ref={bouton} aria-haspopup="menu" aria-expanded={ouvert} aria-controls={id} onClick={() => { setActif(0); setOuvert((o) => !o); }}
        onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setActif(0); setOuvert(true); } }}>
        {libelle}<svg viewBox="0 0 24 24" className={cx("h-4 w-4 transition-transform", ouvert && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </Button>
      {ouvert && (
        <div ref={liste} id={id} role="menu" onKeyDown={touche} className={cx("sheet-in absolute z-40 mt-2 min-w-[220px] rounded-champ bg-surface p-1.5 shadow-menu", align === "right" ? "right-0" : "left-0")}>
          {items.map((it, i) => (
            <button key={it.label} type="button" role="menuitem" tabIndex={i === actif ? 0 : -1} onClick={() => { fermer(); it.run?.(); }}
              className={cx("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm outline-none focus:bg-paper", it.danger ? "text-bad" : "text-ink")}>
              {it.label}{it.raccourci && <kbd className="ml-auto font-sans text-xs text-ink-faint">{it.raccourci}</kbd>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Onglets : flèches gauche/droite pour passer d'un onglet à l'autre. */
export function Onglets({ onglets, valeur, onChange, label }) {
  const refs = useRef([]);
  const touche = (e, i) => {
    const n = onglets.length; let j = null;
    if (e.key === "ArrowRight") j = (i + 1) % n; else if (e.key === "ArrowLeft") j = (i - 1 + n) % n;
    else if (e.key === "Home") j = 0; else if (e.key === "End") j = n - 1;
    if (j == null) return; e.preventDefault(); onChange(onglets[j].id); refs.current[j]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="inline-flex gap-1 rounded-full border border-line bg-surface p-1">
      {onglets.map((o, i) => (
        <button key={o.id} ref={(el) => (refs.current[i] = el)} type="button" role="tab" aria-selected={valeur === o.id} tabIndex={valeur === o.id ? 0 : -1}
          onClick={() => onChange(o.id)} onKeyDown={(e) => touche(e, i)}
          className={cx("rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors", valeur === o.id ? "bg-ink text-paper" : "text-ink-soft hover:text-ink")}>{o.label}</button>
      ))}
    </div>
  );
}

/** Tableau : en-têtes réels (th scope), lignes lisibles, défilement horizontal sur mobile. */
export function Tableau({ colonnes, lignes, legende }) {
  return (
    <div className="overflow-x-auto rounded-carte border border-line bg-surface">
      <table className="w-full min-w-[480px] text-left text-sm">
        {legende && <caption className="sr-only">{legende}</caption>}
        <thead><tr className="border-b border-line">{colonnes.map((c) => <th key={c.cle} scope="col" className={cx("px-4 py-2.5 text-xs font-semibold text-ink-soft", c.droite && "text-right")}>{c.titre}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">
          {lignes.map((l, i) => <tr key={l.id ?? i} className="hover:bg-paper/60">{colonnes.map((c) => <td key={c.cle} className={cx("px-4 py-3 text-ink", c.droite && "text-right tnum")}>{c.rendu ? c.rendu(l) : l[c.cle]}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

/** Notification dans la page (info, succès, attention, erreur). */
export function Alerte({ ton = "info", titre, children, action }) {
  const t = { info: "bg-info-soft text-info", good: "bg-good-soft text-good", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad" }[ton];
  const d = { info: "M12 8h.01M11 12h1v5h1", good: "m7.5 12.5 3 3 6-6.5", warn: "M12 8v5M12 16.5h.01", bad: "M9 9l6 6M15 9l-6 6" }[ton];
  return (
    <div role={ton === "bad" ? "alert" : "status"} className={cx("flex items-start gap-3 rounded-champ px-4 py-3", t)}>
      <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9.5" /><path d={d} /></svg>
      <div className="min-w-0 flex-1 text-sm"><p className="font-semibold">{titre}</p>{children && <div className="mt-0.5 opacity-90">{children}</div>}</div>
      {action}
    </div>
  );
}

/** Chargement : blocs gris qui respirent à la place du contenu (annoncé aux lecteurs d'écran). */
export function Squelette({ lignes = 3, className }) {
  return (
    <div role="status" aria-label="Chargement en cours" className={cx("space-y-2.5", className)}>
      {Array.from({ length: lignes }, (_, i) => <div key={i} className="h-3.5 animate-pulse rounded-full bg-line" style={{ width: `${[92, 78, 64, 85, 70][i % 5]}%` }} />)}
    </div>
  );
}

export function Progression({ valeur, label }) {
  return (
    <div>
      {label && <div className="mb-1.5 flex justify-between text-xs font-medium text-ink-soft"><span>{label}</span><span className="tnum">{Math.round(valeur)} %</span></div>}
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(valeur)} aria-label={label} className="h-2 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent transition-[width] duration-lente" style={{ width: `${valeur}%` }} />
      </div>
    </div>
  );
}

/** Erreur : ce qui s'est passé, et un bouton pour réessayer. */
export function Erreur({ titre = "Ça n'a pas marché", children, onReessayer }) {
  return (
    <div role="alert" className="py-12 px-4 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-bad-soft text-bad"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 7.5v6M12 16.8h.01" /><circle cx="12" cy="12" r="9.5" /></svg></span>
      <p className="mt-3 text-lg font-bold text-ink">{titre}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-ink-soft">{children}</div>}
      {onReessayer && <Button className="mt-4" onClick={onReessayer}>Réessayer</Button>}
    </div>
  );
}

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

export function Empty({ title, children, action }) {
  return (
    <div className="text-center py-16 px-4">
      <p className="font-serif text-2xl">{title}</p>
      {children && <div className="text-ink-soft mt-2 text-sm max-w-md mx-auto">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
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
          <div key={t.id} role={t.tone === "bad" ? "alert" : "status"} className={cx("rise rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg flex items-center gap-2", t.tone === "bad" ? "bg-bad text-white" : t.tone === "good" ? "bg-good text-white" : "bg-ink text-white")}>{t.tone === "good" && <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path className="check-draw" d="m5 12.5 4.5 4.5L19 7.5" /></svg>}<span>{t.text}</span>{t.action && <button type="button" className="pointer-events-auto ml-2 rounded-lg bg-white/15 px-2.5 py-1 font-semibold hover:bg-white/25" onClick={() => { setItems((x) => x.filter((i) => i.id !== t.id)); t.action.run(); }}>{t.action.label}</button>}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
