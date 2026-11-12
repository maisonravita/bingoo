import { LANGUES, langueActuelle, choisirLangue, chargerTraducteur } from "../lib/langue";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";
import { LegalLinks } from "../pages/Legal";
import Logo from "./Logo";
import Feedback from "./Feedback";
import { estSimple } from "../lib/lieu";
import { accueilVille, LIEUX } from "../lib/lieu";
import { modeExplorer } from "../lib/mode";

const ICONS = {
  today: <path d="M4 12h3l3-7 4 14 3-7h3" />,
  check: <><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></>,
  inbox: <><path d="M3.5 13.5 6 5h12l2.5 8.5V19H3.5z" /><path d="M3.5 13.5H9l1 2h4l1-2h5.5" /></>,
  list: <><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  li: <><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M8 10.5V16M8 7.8v.01M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.4-2.6s2.1 1 2.1 2.6V16" /></>,
  cal: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  doc: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12" /><circle cx="12" cy="12" r="3" /></>,
  cog: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /></>,
  bot: <><rect x="4" y="7" width="16" height="12" rx="3" /><path d="M12 3v4M9 12v1.5M15 12v1.5M2 13h2M20 13h2" /></>,
  share: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
  plug: <><path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0z" /><path d="M12 17v4" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2a5 5 0 0 1 5.5 5" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6 15h4" /></>,
  niche: <path d="M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 11a1 1 0 1 0 1 1M13 11l7-7M17 4h3v3" />,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  flag: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />,
  mega: <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a3 3 0 0 1 0 6" />,
  funnel: <path d="M3 4h18l-7 8v6l-4 2v-8z" />,
  radar: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="M12 12l6-6" /></>,
  town: <><path d="M3 21h18" /><path d="M5 21V10l4-3 4 3v11" /><path d="M13 21V6l3-2 3 2v15" /><path d="M8 13h2M8 17h2M15.5 10h1M15.5 14h1" /></>,
  more: <><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>,
};
export const Icon = ({ name, className = "w-5 h-5" }) => <svg viewBox="0 0 24 24" className={cx(className, "shrink-0")} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONS[name]}</svg>;

function WsSwitch({ ws, list, select, className }) {
  if (!list || list.length < 2) return null;
  return (
    <label className={cx("block", className)}>
      <span className="sr-only">Changer d'espace</span>
      <select value={ws.id} onChange={(e) => { select(e.target.value); window.scrollTo(0, 0); }}
        className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[13px] font-semibold text-ink truncate">
        {list.map((w) => <option key={w.id} value={w.id}>{w.profile?.nom && w.name !== w.profile.nom ? `${w.name} · ${w.profile.nom}` : w.name || w.profile?.nom || "Mon entreprise"}</option>)}
      </select>
    </label>
  );
}

function TrialBar({ ws }) {
  const left = ws.trial_ends ? Math.ceil((new Date(ws.trial_ends) - new Date()) / 864e5) : 7;
  // Avant l'ouverture des abonnements, un essai terminé reste actif : on ne demande pas de payer ce qu'on ne peut pas encore acheter
  const [payments, setPayments] = useState(true);
  useEffect(() => { fn("plans").then((r) => setPayments(r?.payments !== false)).catch(() => {}); }, []);
  if (!payments && left <= 3) return (
    <div className="flex-1 min-w-0 flex items-center gap-3 rounded-full px-5 py-2.5 text-sm border bg-gradient-to-r from-accent-soft/70 to-white border-accent/15">
      <span className="font-semibold">Accès de lancement</span>
      <span className="text-ink-soft border-l border-line pl-3">Bingoo! reste gratuit pour toi jusqu'à l'ouverture des abonnements, annoncée à l'avance.</span>
    </div>
  );
  return (
    <NavLink to="/abonnement" className={cx("flex-1 min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full px-5 py-2.5 text-sm border transition", left > 2 ? "bg-gradient-to-r from-accent-soft/70 to-white border-accent/15 hover:border-accent/40" : "bg-bad-soft border-bad/30 text-bad")}>
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-accent shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 13l-3-3 4-6c3-2 7-2 10-1 1 3 1 7-1 10l-6 4-3-3M14.5 9.5h.01" /></svg>
      <span className="font-semibold">{left > 0 ? `Aperçu gratuit : ${left} jour${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""}` : "Ton aperçu gratuit est terminé"}</span>
      <span className="hidden sm:inline text-ink-soft border-l border-line pl-3">Abonne-toi pour envoyer : premier mois remboursé sans rendez-vous ni réponse →</span>
    </NavLink>
  );
}

/** Haut de page : essai, cloche (réponses + alertes Espion), accès à son compte. */
const SEEN_KEY = (id, k) => `bingoo:alerts-seen:${k}:${id}`;
const getSeen = (id, k) => { try { return localStorage.getItem(SEEN_KEY(id, k)) ?? ""; } catch { return ""; } };
const setSeen = (id, k) => { try { localStorage.setItem(SEEN_KEY(id, k), new Date().toISOString()); } catch { /* navigation privée */ } };
const ALERT = { espion_alerte: ["Espion", "/espion"], radar_alerte: ["Radar", "/radar"], budget_ia: ["Consommation IA", "/abonnement"] };
function Bell({ ws, replies }) {
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [seen, setSeenState] = useState(() => ({ espion_alerte: getSeen(ws.id, "espion_alerte"), radar_alerte: getSeen(ws.id, "radar_alerte"), budget_ia: getSeen(ws.id, "budget_ia") }));
  useEffect(() => {
    let alive = true;
    const load = () => supabase.from("activity").select("id, kind, summary, created_at").eq("workspace_id", ws.id).in("kind", ["espion_alerte", "radar_alerte", "budget_ia"]).gte("created_at", new Date(Date.now() - 14 * 864e5).toISOString()).order("created_at", { ascending: false }).limit(8).then(({ data }) => alive && setAlerts(data ?? []));
    load(); const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [ws.id]);
  useEffect(() => {
    const k = loc.pathname.startsWith("/espion") ? "espion_alerte" : loc.pathname.startsWith("/radar") ? "radar_alerte" : loc.pathname.startsWith("/abonnement") ? "budget_ia" : null;
    if (k) { setSeen(ws.id, k); setSeenState((x) => ({ ...x, [k]: getSeen(ws.id, k) })); }
    setOpen(false);
  }, [loc.pathname, ws.id]);
  const isNew = (a) => !seen[a.kind] || a.created_at > seen[a.kind];
  const fresh = alerts.filter(isNew).length;
  const total = (replies ?? 0) + fresh;
  return (
    <div className="relative">
      <button onClick={() => setOpen((x) => !x)} title={total ? `${total} nouveauté${total > 1 ? "s" : ""}` : "Rien de nouveau"} className="relative w-10 h-10 rounded-full grid place-items-center text-ink-soft hover:text-ink hover:bg-white transition">
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" /></svg>
        {total > 0 && <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10.5px] font-bold grid place-items-center ring-2 ring-paper">{total > 9 ? "9+" : total}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-40 w-[340px] rounded-2xl border border-line bg-white shadow-xl p-2">
            <NavLink to="/reponses" className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-paper">
              <span className="text-[14px] font-semibold">Réponses de prospects</span>
              <span className={cx("text-[12.5px] font-semibold", replies ? "text-accent" : "text-ink-faint")}>{replies ? `${replies} à traiter` : "aucune"}</span>
            </NavLink>
            <div className="border-t border-line my-1" />
            <p className="px-3 pt-1.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink-faint">Alertes Radar et Espion</p>
            {!alerts.length ? <p className="px-3 pb-2.5 text-[13px] text-ink-faint">Rien d'urgent ces 14 derniers jours.</p> : alerts.map((a) => (
              <NavLink key={a.id} to={ALERT[a.kind]?.[1] ?? "/"} className="flex gap-2.5 rounded-xl px-3 py-2 hover:bg-paper">
                <span className={cx("mt-1.5 h-2 w-2 rounded-full shrink-0", isNew(a) ? "bg-accent" : "bg-line")} />
                <span className="min-w-0"><span className="block text-[13px] text-ink leading-snug line-clamp-2">{a.summary}</span><span className="block text-[11.5px] text-ink-faint mt-0.5">{ALERT[a.kind]?.[0]} · {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span></span>
              </NavLink>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Crédits IA, toujours visibles : jauge du mois et accès direct à l'achat. */
function CreditsChip({ ws }) {
  const loc = useLocation();
  const [ai, setAi] = useState(null);
  useEffect(() => { supabase.rpc("ai_month", { p_ws: ws.id }).then(({ data }) => setAi(data ?? null)); }, [ws.id, loc.pathname]);
  const pct = ai ? Math.min(100, Math.round((Number(ai.spent) / Math.max(1, Number(ai.budget))) * 100)) : 0;
  const low = pct >= 80 && Number(ai?.balance ?? 0) <= 0;
  // Tant qu'il reste de la marge, rien à afficher : la jauge n'apparaît qu'à 80 % du mois consommé
  if (!ai || !Number.isFinite(pct) || pct < 80) return null;
  return (
    <NavLink to="/abonnement?credits=1" title="Crédits IA du mois : acheter des crédits" className={cx("hidden lg:flex items-center gap-2.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition hover:border-accent/50", low ? "border-accent bg-accent-soft text-accent-dark" : "border-line bg-white text-ink-soft")}>
      <span className="w-16 h-1.5 rounded-full bg-paper overflow-hidden"><span className={cx("block h-full rounded-full", pct >= 100 ? "bg-bad" : pct >= 80 ? "bg-warn" : "bg-accent")} style={{ width: `${Math.max(4, pct)}%` }} /></span>
      <span>{low ? "Ajouter des crédits" : `Crédits IA · ${pct} %`}</span>
    </NavLink>
  );
}

function TopBar({ ws, replies }) {
  const who = (ws.sender_name || ws.profile?.nom || ws.name || "?").trim();
  return (
    <div className="hidden md:flex items-center gap-4">
      {!modeExplorer(ws) && <CreditsChip ws={ws} />}
      <Bell ws={ws} replies={replies} />
      <NavLink to="/reglages" title="Réglages" className="w-11 h-11 rounded-full bg-ink text-white grid place-items-center font-bold text-[15px] hover:ring-4 hover:ring-accent-soft transition">{who[0].toUpperCase()}</NavLink>
    </div>
  );
}

export default function Layout({ children }) {
  const { ws, list, select } = useWs();
  const loc = useLocation();
  const [more, setMore] = useState(false);
  const [c, setC] = useState({});
  const [fb, setFb] = useState(false);
  // Temps passé : une minute comptée seulement si l'onglet est visible et utilisé
  useEffect(() => {
    let last = Date.now();
    const seen = () => { last = Date.now(); };
    const evs = ["pointerdown", "keydown", "scroll", "pointermove"];
    evs.forEach((e) => window.addEventListener(e, seen, { passive: true }));
    const t = setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - last < 120000) supabase.rpc("track_usage", { ws: ws.id }).then(() => {});
    }, 60000);
    return () => { clearInterval(t); evs.forEach((e) => window.removeEventListener(e, seen)); };
  }, [ws.id]);
  useEffect(() => setMore(false), [loc.pathname]);
  useEffect(() => {
    let alive = true;
    const head = (t) => supabase.from(t).select("id", { count: "exact", head: true }).eq("workspace_id", ws.id);
    const load = async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [d, l, r, m, o, ap] = await Promise.all([
        head("messages").eq("status", "brouillon"),
        head("prospects").eq("linkedin_status", "a_envoyer"),
        head("replies").eq("handled", false),
        head("meetings").eq("status", "confirme").gte("starts_at", today.toISOString()).lt("starts_at", new Date(today.getTime() + 86400000).toISOString()),
        head("radar_opps").eq("status", "nouveau"),
        head("prospects").lte("next_action_at", new Date().toISOString().slice(0, 10)).ilike("next_action", "%appeler%").not("status", "in", "(ignore,refus,client,rdv)"),
      ]);
      if (alive) setC({ drafts: d.count ?? 0, li: l.count ?? 0, replies: r.count ?? 0, today: m.count ?? 0, radar: o.count ?? 0, calls: ap.count ?? 0 });
    };
    load();
    const t = setInterval(load, 20000);
    window.addEventListener("kairo:refresh", load);
    return () => { alive = false; clearInterval(t); window.removeEventListener("kairo:refresh", load); };
  }, [ws.id]);

  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { supabase.rpc("is_admin").then(({ data }) => setIsAdmin(!!data)); }, []);
  // Le menu : l'essentiel en haut, avec des noms simples ; tout le reste derrière « Plus ».
  // Les outils avancés (Concurrents, LinkedIn, Devis, Extension) n'apparaissent que s'ils sont activés dans Réglages.
  const compte = { atelier: c.drafts, poste: c.replies, rdv: c.today, radar: c.radar, linkedin: c.li };
  const also = { annuaire: ["/mission"], mairie: ["/connexions", "/equipe", "/abonnement"] };
  const lieu = (art) => LIEUX.find((l) => l.art === art);
  const item = (l) => ({ to: l.to, label: l.nom, short: l.court, icon: l.icon, count: compte[l.art], hot: l.art === "atelier", also: also[l.art] });
  const avance = !estSimple(ws);
  const veille = modeExplorer(ws);
  // Mêmes 5 rubriques que la barre de l'Explorer ; chaque rubrique s'allume aussi sur ses sous-pages
  const essentiel = veille ? [
    { titre: "Copier et lancer" },
    { to: "/explorer/trouver", label: "Trouver mon SaaS", icon: "spark" },
    { to: "/explorer/copier", label: "À copier", icon: "target" },
    { to: "/explorer/chiffres", label: "Chiffres d'un SaaS", icon: "chart" },
    { to: "/explorer/createurs", label: "Mes SaaS", icon: "bot", also: ["/explorer/bourse", "/explorer/racheter", "/explorer/lancer"] },
    { titre: "Observer le marché" },
    { to: "/explorer", label: "Tous les SaaS", icon: "list" },
    { to: "/explorer/niches", label: "Niches", icon: "niche" },
    { to: "/explorer/classement", label: "Classement", icon: "flag" },
    { to: "/explorer/carte", label: "L'île des SaaS", icon: "town" },
    { to: "/explorer/marche", label: "Tendances", icon: "eye", also: ["/explorer/idees", "/explorer/pubs"] },
    { to: "/explorer/suivis", label: "Mes suivis", icon: "radar", also: ["/explorer/bouge"] },
  ] : [{ to: "/explorer", label: "Explorer", icon: "eye" }, item(lieu("atelier")), item(lieu("poste")), { to: "/appels", label: "Appels", icon: "phone", count: c.calls }, ...["rdv", "radar", "observatoire"].map((a) => item(lieu(a)))];
  const plus = veille ? [
    { to: "/abonnement", label: "Abonnement", icon: "doc" }, { to: "/equipe", label: "Équipe", icon: "phone" }, { to: "/reglages", label: "Réglages", icon: "plug" },
    ...(isAdmin ? [{ to: "/admin", label: "Administration", icon: "chart" }] : []),
  ] : [
    item(lieu("annuaire")),
    { to: "/village", label: "Ma ville", icon: "town" },
    ...(avance ? [item(lieu("espion")), item(lieu("linkedin")), { to: "/devis", label: "Devis", icon: "doc" }, { to: "/extension", label: "Extension LinkedIn", icon: "plug" }] : []),
    item(lieu("mairie")),
    ...(isAdmin ? [{ to: "/admin", label: "Administration", icon: "chart" }] : []),
  ];
  const isOn = (n, isActive) => isActive || (n.also ?? []).some((p) => loc.pathname === p);
  const link = (n) => ({ isActive }) => cx("flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-medium transition", isOn(n, isActive) ? "bg-accent-soft/80 text-accent-dark font-semibold border border-transparent" : "text-ink-soft hover:text-ink hover:bg-white/70 border border-transparent");
  const Count = ({ n, hot }) => n > 0 ? <span className={cx("text-xs font-semibold rounded-full px-2 py-0.5 tnum", hot ? "bg-accent text-white" : "bg-ink/10 text-ink")}>{n}</span> : null;

  // Accueil en ville : plein écran, sans menu. Partout : un seul bouton « 3 traits » qui ouvre le menu.
  const full = loc.pathname === "/village" || (loc.pathname === "/" && accueilVille());
  const menu = (
    <>
      <button onClick={() => setMore(true)} aria-label="Ouvrir le menu" className={cx("relative z-30 grid h-12 w-12 sm:h-14 sm:w-14 shrink-0 place-items-center rounded-2xl bg-white shadow-[0_10px_24px_-12px_rgba(122,74,42,.5)] hover:bg-[#FFF7F0]", full ? "!fixed left-4 top-4 sm:left-6 sm:top-6" : "border border-line")}>
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        {(c.replies + c.drafts) > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">{c.replies + c.drafts}</span>}
      </button>
      {more && (
        <div className="fixed inset-0 z-50" onClick={() => setMore(false)}>
          <div className="absolute inset-0 bg-ink/35" />
          <aside className="absolute left-0 top-0 h-full w-[300px] max-w-[85vw] overflow-y-auto bg-paper p-4 shadow-2xl rise" onClick={(e) => e.stopPropagation()} aria-label="Menu">
            <div className="flex items-center justify-between mb-4"><Logo className="ml-2" /><button onClick={() => setMore(false)} aria-label="Fermer le menu" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white text-[20px]">✕</button></div>
            <div className="flex flex-col gap-0.5">
              {!veille && <NavLink to="/" end onClick={() => setMore(false)} className={link({ to: "/" })}><Icon name="today" /><span className="flex-1">Aujourd'hui</span></NavLink>}
              {essentiel.map((n) => n.titre ? <p key={n.titre} className="mt-3 first:mt-0 px-3 pb-1 text-[11.5px] font-bold uppercase tracking-wider text-ink-faint">{n.titre}</p> : <NavLink key={n.to} to={n.to} end onClick={() => setMore(false)} className={link(n)}><Icon name={n.icon} /><span className="flex-1">{n.label}</span><Count n={n.count} hot={n.hot} /></NavLink>)}
            </div>
            <details className="group mt-3 pt-3 border-t border-line" open={plus.some((n) => loc.pathname === n.to || (n.also ?? []).includes(loc.pathname))}>
              <summary className="cursor-pointer list-none flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-medium text-ink-soft hover:text-ink hover:bg-white/70"><Icon name="more" /><span className="flex-1">Plus</span><span className="transition group-open:rotate-90" aria-hidden>›</span></summary>
              <div className="mt-0.5 flex flex-col gap-0.5">
                {plus.map((n) => <NavLink key={n.to} to={n.to} end onClick={() => setMore(false)} className={link(n)}><Icon name={n.icon} /><span className="flex-1">{n.label}</span><Count n={n.count} hot={n.hot} /></NavLink>)}
              </div>
            </details>
            <div className="mt-4 pt-4 border-t border-line px-3 text-[14px] text-ink-soft flex flex-col gap-1.5">
              {list?.length > 1 ? <WsSwitch ws={ws} list={list} select={select} /> : <p className="font-semibold text-ink truncate">{ws.profile?.nom || ws.name || "Mon entreprise"}</p>}
              <NavLink className="hover:text-ink" to="/aide" onClick={() => setMore(false)}>Aide</NavLink>
              <label className="flex items-center gap-2"><span aria-hidden>🌐</span><select aria-label="Langue du site" value={langueActuelle()} onChange={(e) => choisirLangue(e.target.value)} className="flex-1 min-w-0 rounded-lg border border-line bg-white px-2 py-1 text-[13px]">{LANGUES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></label>
              <button className="text-left hover:text-ink" onClick={() => { setMore(false); setFb(true); }}>Donner mon avis</button>
              <button className="text-left font-semibold text-ink hover:text-accent-dark" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
              <LegalLinks className="mt-2" />
            </div>
          </aside>
        </div>
      )}
    </>
  );

  if (full) return (
    <div className="min-h-full">
      {menu}
      {children}
      {fb && <Feedback onClose={() => setFb(false)} />}
    </div>
  );

  return (
    <div className="min-h-full">
      <main className="min-w-0 px-4 pt-4 pb-28 md:pb-16 md:px-10 md:pt-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          {menu}
          <Logo />
          <div className="flex-1" />
          {ws.autonomy === "auto" && <span className="w-2.5 h-2.5 rounded-full bg-good pulse-dot" title="Pilote automatique actif" />}
          <TopBar ws={ws} replies={c.replies} />
        </div>
        {ws.plan === "essai" && <div className="mb-5 flex"><TrialBar ws={ws} /></div>}
        {children}
      </main>
      {/* Téléphone : les 4 endroits du quotidien, toujours sous le pouce */}
      <nav aria-label="Navigation principale" className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {(veille ? [["/explorer/copier", "À copier", "target", 0], ["/explorer/createurs", "Mes SaaS", "bot", 0], ["/explorer", "SaaS", "list", 0], ["/explorer/niches", "Niches", "niche", 0]]
            : [["/", "Aujourd'hui", "today", 0], ["/valider", "Messages", "send", c.drafts], ["/reponses", "Réponses", "inbox", c.replies], ["/agenda", "RDV", "cal", c.today]]).map(([to, l, ic, n]) => (
            <NavLink key={to} to={to} end={to === "/" || to === "/explorer"} className={({ isActive }) => cx("relative flex flex-col items-center gap-0.5 py-2.5 text-[11.5px] font-semibold", isActive ? "text-[#E8571C]" : "text-ink-soft")}>
              <Icon name={ic} />{l}
              {n > 0 && <span className="absolute right-[22%] top-1.5 min-w-[17px] rounded-full bg-[#F26A21] px-1 text-[10px] font-black leading-[17px] text-white">{n > 9 ? "9+" : n}</span>}
            </NavLink>
          ))}
        </div>
      </nav>
      {fb && <Feedback onClose={() => setFb(false)} />}
    </div>
  );
}
