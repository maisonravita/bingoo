import { LANGUES, langueActuelle, choisirLangue, chargerTraducteur } from "../lib/langue";
import { CompteModal, MotDePasseManquant, demanderCompte, estInvite } from "../lib/invite";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";
import { LegalLinks } from "../pages/Legal";
import Logo from "./Logo";
import Feedback from "./Feedback";

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
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6 15h4" /></>,
  niche: <path d="M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 11a1 1 0 1 0 1 1M13 11l7-7M17 4h3v3" />,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  flag: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />,
  mega: <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a3 3 0 0 1 0 6" />,
  funnel: <path d="M3 4h18l-7 8v6l-4 2v-8z" />,
  radar: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="M12 12l6-6" /></>,
  town: <><path d="M3 21h18" /><path d="M5 21V10l4-3 4 3v11" /><path d="M13 21V6l3-2 3 2v15" /><path d="M8 13h2M8 17h2M15.5 10h1M15.5 14h1" /></>,
  tiktok: <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.4 2.6 2.2 4.4 5 4.6" />,
  side: <><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><path d="M9.5 4.5v15" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2.5" /><path d="m16 10.5 5-3v9l-5-3" /></>,
  coins: <><ellipse cx="9" cy="7" rx="5.5" ry="2.5" /><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7" /><path d="M9.5 16.4c.9.6 2.4 1.1 4.5 1.1 3 0 5.5-1.1 5.5-2.5v-4c0-1.2-1.6-2.1-3.9-2.4" /></>,
  help: <><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8v.01" /></>,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  logout: <><path d="M10 4H5v16h5" /><path d="m14 8 4 4-4 4M18 12H9" /></>,
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

// ---------------------------------------------------------------- Bingoo! : barre latérale fixe + barre du haut (recherche, compte et crédits)
const FORMULE = { explorer_pro: "Lancer", business: "Business", fondateur: "Fondateur", explorer: "Trouver", essai: "Sans formule" };
const DUREE_F = { mois: "1 mois", trimestre: "3 mois", an: "12 mois" };
function useCredits(ws, invite) {
  const loc = useLocation();
  const [c, setC] = useState(null);
  useEffect(() => { if (!invite) fn("r/credits", { workspace_id: ws.id }).then(setC).catch(() => {}); }, [ws.id, invite, loc.pathname]);
  return c;
}
// L'avatar entouré de l'anneau des crédits restants
function Anneau({ pct, lettre, size = 42 }) {
  const r = 19, L = 2 * Math.PI * r;
  return (
    <span className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" stroke="#E7E5E0" strokeWidth="3" />
        {pct != null && <circle cx="22" cy="22" r={r} fill="none" stroke={pct < 15 ? "#DC2626" : "#E8571C"} strokeWidth="3" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - Math.max(0.02, pct / 100))} className="transition-all duration-700" />}
      </svg>
      <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-ink text-[13px] font-bold text-white">{lettre}</span>
    </span>
  );
}
function MenuCompte({ ws, list, select, credits, invite, onAvis, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const k = (e) => e.key === "Escape" && onClose();
    setTimeout(() => document.addEventListener("pointerdown", h)); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("pointerdown", h); document.removeEventListener("keydown", k); };
  }, [onClose]);
  const L = ({ to, children }) => <NavLink to={to} onClick={onClose} className="block rounded-lg px-3 py-2 text-[14.5px] hover:bg-paper">{children}</NavLink>;
  return (
    <div ref={ref} className="absolute right-0 top-[calc(100%+10px)] z-50 w-[330px] rounded-2xl border border-line bg-white p-2 shadow-[0_24px_60px_-20px_rgba(15,23,42,.35)] rise">
      {!invite && (
        <div className="rounded-xl border border-line p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-semibold"><Icon name="coins" className="w-[18px] h-[18px]" />Solde</p>
            <NavLink to="/abonnement#credits" onClick={onClose} className="rounded-lg bg-ink px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-ink/85">Recharger</NavLink>
          </div>
          <div className="mt-2.5 space-y-1 text-[14px]">
            <p className="flex justify-between text-ink-soft"><span>Total</span><b className="text-ink tnum">{credits ? `${credits.total ?? 0} crédits` : "…"}</b></p>
            <p className="flex justify-between text-ink-soft"><span>Restant</span><b className="text-ink tnum">{credits ? credits.solde : "…"}</b></p>
          </div>
        </div>
      )}
      <div className="mt-2 rounded-xl border border-line p-3.5">
        <p className="text-[12.5px] text-ink-faint">Espace actuel</p>
        {list?.length > 1 ? <WsSwitch ws={ws} list={list} select={select} className="mt-1" /> : <p className="mt-0.5 font-semibold truncate">{ws.profile?.nom || ws.name || "Mon espace"}</p>}
        <p className="text-[13px] text-ink-soft">{invite ? "Sans compte" : `Formule ${FORMULE[ws.plan] ?? ws.plan}${ws.plan === "explorer_pro" && ws.periode ? ` · ${DUREE_F[ws.periode] ?? ""}` : ""}`}</p>
      </div>
      <div className="mt-1.5 py-1">
        {!invite && <><L to="/reglages">Paramètres</L><L to="/abonnement">Abonnement</L><L to="/abonnement#credits">Acheter des crédits</L></>}
        <label className="flex items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-[14.5px] hover:bg-paper">Langue
          <select aria-label="Langue du site" value={langueActuelle()} onChange={(e) => choisirLangue(e.target.value)} className="rounded-md border border-line bg-white px-2 py-1 text-[13px]">{LANGUES.map(([code, nom]) => <option key={code} value={code}>{nom}</option>)}</select>
        </label>
      </div>
      <div className="border-t border-line py-1.5">
        <L to="/aide">Aide</L>
        <button onClick={() => { onClose(); onAvis(); }} className="block w-full rounded-lg px-3 py-2 text-left text-[14.5px] hover:bg-paper">Donner mon avis</button>
        <L to="/conditions">Conditions et confidentialité</L>
      </div>
      <div className="border-t border-line pt-1.5">
        {invite
          ? <button onClick={() => { onClose(); demanderCompte("Garde tes résultats et reviens quand tu veux."); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14.5px] font-semibold text-accent-dark hover:bg-paper">Créer mon compte</button>
          : <button onClick={() => supabase.auth.signOut()} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14.5px] hover:bg-paper"><Icon name="logout" className="w-[18px] h-[18px]" />Se déconnecter</button>}
      </div>
    </div>
  );
}

// L'interface après paiement, dans l'esprit de l'administration Shopify : barre noire en haut, menu gris clair, fond gris doux, cartes blanches.
function AppShell({ ws, list, select, invite, sections, bas, bandeau, extra, menuMobile, onAvis, children }) {
  const loc = useLocation();
  const nav = useNavigate();
  const credits = useCredits(ws, invite);
  const [replie, setReplie] = useState(() => { try { return localStorage.getItem("bingoo-menu") === "1"; } catch { return false; } });
  const [compte, setCompte] = useState(false);
  const [q, setQ] = useState("");
  const [saas, setSaas] = useState(null);
  const recherche = useRef(null);
  useEffect(() => { try { localStorage.setItem("bingoo-menu", replie ? "1" : "0"); } catch { /* sans effet */ } }, [replie]);
  useEffect(() => setCompte(false), [loc.pathname]);
  useEffect(() => {
    const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); recherche.current?.focus(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);
  // Le SaaS du créateur : son nom et sa couleur en haut à droite, comme la boutique sur Shopify
  useEffect(() => { if (!invite) supabase.from("saas_apps").select("spec->nom, spec->couleur").eq("workspace_id", ws.id).neq("statut", "remplace").order("at", { ascending: false }).limit(1).then(({ data }) => setSaas(data?.[0] ?? null)); }, [ws.id, invite]);
  const actif = (n) => (n.to.includes("#") ? loc.pathname === n.to.split("#")[0] && loc.hash.includes(n.to.split("#")[1]) : loc.pathname === n.to && !(n.to === "/abonnement" && loc.hash.includes("credits"))) || (n.also ?? []).includes(loc.pathname);
  const pct = credits?.total ? Math.round((credits.solde / credits.total) * 100) : null;
  const nomSaas = saas?.nom ?? ws.profile?.nom ?? ws.name ?? "Mon espace";
  const couleur = saas?.couleur ?? "#E8571C";
  const lien = (n) => (
    <NavLink key={n.label} to={n.to} end title={replie ? n.label : undefined}
      className={cx("flex h-8 items-center gap-2.5 rounded-lg px-2 text-[13.5px] font-semibold transition", replie && "justify-center px-0", actif(n) ? "bg-white text-[#1A1A1A] shadow-[0_1px_0_rgba(0,0,0,.08),0_0_0_1px_rgba(0,0,0,.04)]" : "text-[#303030] hover:bg-[#E3E3E3]")}>
      <Icon name={n.icon} className={cx("h-[18px] w-[18px]", actif(n) ? "text-[#1A1A1A]" : "text-[#4A4A4A]")} />{!replie && <span className="flex-1 truncate">{n.label}</span>}
    </NavLink>
  );
  return (
    <div className="min-h-screen bg-[#F1F1F1]">
      {extra}
      {/* Barre du haut, noire, comme Shopify */}
      <header className="fixed inset-x-0 top-0 z-40 hidden h-14 items-center gap-3 bg-[#1A1A1A] px-3 text-white md:flex">
        <div className={cx("flex items-center gap-2", replie ? "w-[52px]" : "w-[228px]")}>
          <button onClick={() => setReplie(!replie)} aria-label={replie ? "Déplier le menu" : "Replier le menu"} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"><Icon name="side" className="h-[18px] w-[18px]" /></button>
          {!replie && <NavLink to="/explorer/mon-saas" className="flex items-center"><Logo inverse height={24} /></NavLink>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) { nav(`/explorer/demande?q=${encodeURIComponent(q.trim())}`); setQ(""); recherche.current?.blur(); } }}
          className="mx-auto flex w-full max-w-[560px] items-center gap-2 rounded-lg bg-[#303030] px-3 py-1.5 ring-1 ring-white/10 focus-within:bg-[#3A3A3A] focus-within:ring-white/25">
          <Icon name="search" className="h-4 w-4 text-white/55" />
          <input ref={recherche} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un SaaS, une idée, une question…" className="min-w-0 flex-1 bg-transparent text-[13.5px] text-white outline-none placeholder:text-white/45" />
          <kbd className="rounded border border-white/15 px-1.5 text-[11px] text-white/50">⌘ K</kbd>
        </form>
        <div className="flex items-center gap-2">
          <NavLink to="/explorer/demande" className="hidden lg:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-white/85 hover:bg-white/10"><Icon name="spark" className="h-4 w-4 text-[#F6A06B]" />Demander</NavLink>
          {invite ? <>
            <button onClick={() => supabase.auth.signOut()} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold text-white/85 hover:bg-white/10">Se connecter</button>
            <button onClick={() => demanderCompte("Garde tes résultats et reviens quand tu veux.")} className="whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-[13px] font-semibold text-[#1A1A1A] hover:bg-white/90">Créer mon compte</button>
          </> : (
            <div className="relative">
              <button onClick={() => setCompte(!compte)} aria-label="Mon compte et mes crédits" aria-expanded={compte} className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2.5 hover:bg-white/10">
                <span className="grid h-7 w-7 place-items-center rounded-md text-[12.5px] font-black text-white" style={{ background: couleur }}>{nomSaas.trim().charAt(0).toUpperCase()}</span>
                <span className="hidden max-w-[160px] truncate text-[13px] font-semibold lg:block">{nomSaas}</span>
              </button>
              {compte && <div className="text-ink"><MenuCompte ws={ws} list={list} select={select} credits={credits} invite={invite} onAvis={onAvis} onClose={() => setCompte(false)} /></div>}
            </div>
          )}
        </div>
      </header>

      {/* Menu */}
      <aside className={cx("fixed bottom-0 left-0 top-14 z-30 hidden flex-col bg-[#EBEBEB] px-2 pb-2 pt-3 transition-[width] duration-200 md:flex", replie ? "w-[64px]" : "w-[240px]")}>
        <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto">
          {sections.map((sec, i) => (
            <div key={sec.titre ?? i} className={cx(i > 0 && "mt-4")}>
              {sec.titre && (!replie ? <p className="mb-1 flex items-center px-2 text-[12px] font-semibold text-[#616161]">{sec.titre}</p> : <div className="mx-2 mb-2 border-t border-[#D4D4D4]" />)}
              <div className="flex flex-col gap-px">{sec.items.map(lien)}</div>
            </div>
          ))}
        </nav>
        {invite && !replie && (
          <div className="mb-2 rounded-xl bg-white p-3 shadow-[0_1px_0_rgba(0,0,0,.08)]">
            <p className="text-[13px] font-semibold">Garde tes résultats</p>
            <p className="mt-0.5 text-[12px] text-[#616161]">Ton compte garde tes réponses et tes SaaS.</p>
            <button onClick={() => demanderCompte("Garde tes résultats et reviens quand tu veux.")} className="mt-2 w-full rounded-lg bg-[#1A1A1A] py-1.5 text-[12.5px] font-semibold text-white">Créer mon compte</button>
          </div>
        )}
        {!invite && !replie && (
          <NavLink to="/abonnement#credits" className="mb-2 block rounded-xl bg-white px-3 py-2.5 shadow-[0_1px_0_rgba(0,0,0,.08),0_0_0_1px_rgba(0,0,0,.04)] hover:bg-[#FAFAFA]">
            <div className="flex items-center justify-between text-[12.5px]"><span className="font-semibold">Crédits</span><span className="tnum font-semibold">{credits ? credits.solde : "…"}</span></div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#EBEBEB]"><div className="h-full rounded-full bg-[#1A1A1A] transition-all duration-700" style={{ width: `${pct ?? 0}%` }} /></div>
          </NavLink>
        )}
        <div className="flex flex-col gap-px border-t border-[#D4D4D4] pt-2">{bas.map(lien)}</div>
      </aside>

      <div className={cx("md:pt-14 transition-[padding] duration-200", replie ? "md:pl-[64px]" : "md:pl-[240px]")}>
        {bandeau}
        <div className="md:hidden flex items-center gap-3 px-4 pt-4">{menuMobile}<Logo /></div>
        <main className="shopi mx-auto min-w-0 max-w-[1080px] px-4 pb-28 pt-4 md:px-8 md:pb-16 md:pt-6">{children}</main>
      </div>
    </div>
  );
}

// Les rubriques : son SaaS d'abord, puis découvrir, puis le compte
function rubriques(ws, invite, isAdmin) {
  const decouvrir = [
    { to: "/explorer/trouver", label: "Trouver mon SaaS", icon: "target" },
    { to: "/explorer/copier", label: "À lancer", icon: "flag", also: ["/explorer/chiffres"] },
    { to: "/explorer/demande", label: "Demande à Bingoo!", icon: "spark", also: ["/explorer/connecteur"] },
    { to: "/explorer/vendre", label: "Acheter / vendre", icon: "doc", also: ["/explorer/bourse", "/explorer/racheter"] },
    { to: "/explorer", label: "Explorer les SaaS", icon: "list", also: ["/explorer/niches", "/explorer/classement", "/explorer/marche", "/explorer/carte", "/explorer/idees", "/explorer/pubs", "/explorer/suivis", "/explorer/bouge", "/explorer/createurs"] },
  ];
  if (invite) return { sections: [{ items: decouvrir.slice(0, 1) }], bas: [{ to: "/aide", label: "Aide", icon: "help" }] };
  return {
    sections: [
      { items: [
        { to: "/explorer/mon-saas", label: "Accueil", icon: "today" },
        { to: "/explorer/atelier", label: "Atelier", icon: "chat" },
        { to: "/explorer/clients", label: "Premiers clients", icon: "users" },
        { to: "/explorer/methodes", label: "Ce qui marche", icon: "funnel" },
        { to: "/explorer/tiktok", label: "TikTok", icon: "tiktok" },
        { to: "/explorer/video", label: "Vidéo pub", icon: "video" },
        { to: "/explorer/dossier", label: "Mon dossier", icon: "doc", also: ["/explorer/lancer"] },
      ] },
      { titre: "Découvrir", items: decouvrir },
      { titre: "Compte", items: [
        { to: "/abonnement#credits", label: "Crédits", icon: "coins" },
        { to: "/abonnement", label: "Abonnement", icon: "card" },
        ...(["business", "fondateur"].includes(ws.plan) ? [{ to: "/equipe", label: "Équipe", icon: "users" }] : []),
        ...(isAdmin ? [{ to: "/admin", label: "Administration", icon: "chart" }] : []),
      ] },
    ],
    bas: [{ to: "/explorer/reglages-saas", label: "Réglages du SaaS", icon: "cog" }, { to: "/reglages", label: "Paramètres", icon: "user" }, { to: "/aide", label: "Aide", icon: "help" }],
  };
}

export default function Layout({ children }) {
  const { ws, list, select, session } = useWs();
  const invite = estInvite(session);
  const loc = useLocation();
  const [more, setMore] = useState(false);
  const [fb, setFb] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
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
  useEffect(() => { supabase.rpc("is_admin").then(({ data }) => setIsAdmin(!!data)); }, []);
  const { sections, bas } = rubriques(ws, invite, isAdmin);
  const isOn = (n) => loc.pathname === n.to.split("#")[0] || (n.also ?? []).includes(loc.pathname);

  // Téléphone : un bouton « 3 traits » qui ouvre le menu (mêmes rubriques que sur ordinateur)
  const menu = (
    <>
      <button onClick={() => setMore(true)} aria-label="Ouvrir le menu" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white shadow-[0_1px_0_rgba(0,0,0,.08),0_0_0_1px_rgba(0,0,0,.06)]">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      {more && (
        <div className="fixed inset-0 z-50" onClick={() => setMore(false)}>
          <div className="absolute inset-0 bg-ink/35" />
          <aside className="absolute left-0 top-0 h-full w-[290px] max-w-[85vw] overflow-y-auto bg-[#EBEBEB] p-3 shadow-2xl rise" onClick={(e) => e.stopPropagation()} aria-label="Menu">
            <div className="mb-3 flex items-center justify-between px-1"><Logo height={26} /><button onClick={() => setMore(false)} aria-label="Fermer le menu" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white text-[18px]">✕</button></div>
            {[...sections, { titre: " ", items: bas }].map((sec, i) => (
              <div key={i} className={cx(i > 0 && "mt-4")}>
                {sec.titre && sec.titre.trim() && <p className="mb-1 px-2 text-[12px] font-semibold text-[#616161]">{sec.titre}</p>}
                {sec.items.map((n) => (
                  <NavLink key={n.label} to={n.to} onClick={() => setMore(false)} className={cx("flex h-9 items-center gap-2.5 rounded-lg px-2 text-[14px] font-semibold", isOn(n) ? "bg-white text-[#1A1A1A]" : "text-[#303030]")}>
                    <Icon name={n.icon} className="h-[18px] w-[18px]" />{n.label}
                  </NavLink>
                ))}
              </div>
            ))}
            <div className="mt-4 border-t border-[#D4D4D4] px-2 pt-3 text-[13.5px] text-[#303030] flex flex-col gap-2">
              {list?.length > 1 && <WsSwitch ws={ws} list={list} select={select} />}
              <label className="flex items-center gap-2"><select aria-label="Langue du site" value={langueActuelle()} onChange={(e) => choisirLangue(e.target.value)} className="flex-1 min-w-0 rounded-lg border border-line bg-white px-2 py-1 text-[13px]">{LANGUES.map(([code, nom]) => <option key={code} value={code}>{nom}</option>)}</select></label>
              <button className="text-left" onClick={() => { setMore(false); setFb(true); }}>Donner mon avis</button>
              {invite
                ? <button className="text-left font-semibold text-accent-dark" onClick={() => { setMore(false); demanderCompte("Garde tes résultats et reviens quand tu veux."); }}>Créer mon compte</button>
                : <button className="text-left font-semibold" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>}
              <LegalLinks className="mt-1" />
            </div>
          </aside>
        </div>
      )}
    </>
  );

  const extra = <><CompteModal /><MotDePasseManquant /></>;
  // Paiement refusé (Stripe réessaie pendant environ 2 semaines) ou abonnement arrêté : prévenir partout, avec la solution
  const finAcces = ws.period_end ? new Date(new Date(ws.period_end).getTime() + 7 * 864e5).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : null;
  const alertePaiement = !invite && ws.plan !== "fondateur" && (["past_due", "unpaid"].includes(ws.plan_status)
    ? ["Ton dernier paiement n'est pas passé.", "Mets à jour ta carte pour garder ton SaaS en ligne et continuer à l'améliorer.", "Mettre à jour ma carte"]
    : ws.plan_status === "canceled" && ws.stripe_customer
      ? ["Ton abonnement est arrêté.", finAcces ? `Ton SaaS reste en ligne jusqu'au ${finAcces}, puis il est mis en pause (rien n'est effacé).` : "Ton SaaS est en pause, rien n'est effacé.", "Me réabonner"]
      : null);
  const bandeauPaiement = alertePaiement && (
    <div className="bg-[#B42318] text-white text-[13.5px]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center">
        <span><b>{alertePaiement[0]}</b> <span className="text-white/85">{alertePaiement[1]}</span></span>
        <NavLink to="/abonnement" className="rounded-lg bg-white px-3 py-1 font-semibold text-[#B42318] hover:bg-white/90">{alertePaiement[2]}</NavLink>
      </div>
    </div>
  );
  const bandeau = bandeauPaiement || invite && (
    <div className="bg-ink text-white text-[13.5px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <span className="text-white/80">Tu explores Bingoo! sans compte.</span>
        <button onClick={() => demanderCompte("Garde tes résultats et reviens quand tu veux.")} className="font-semibold text-[#F6A06B] hover:underline">Créer mon compte</button>
      </div>
    </div>
  );
  const basMobile = (
    <nav aria-label="Navigation mobile" hidden={invite} className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4">
        {[["/explorer/mon-saas", "Mon SaaS", "today"], ["/explorer/atelier", "Atelier", "chat"], ["/explorer/clients", "Clients", "users"], ["/explorer", "Explorer", "list"]].map(([to, l, ic]) => (
          <NavLink key={to} to={to} end={to === "/explorer"} className={({ isActive }) => cx("relative flex flex-col items-center gap-0.5 py-2.5 text-[11.5px] font-semibold", isActive ? "text-[#E8571C]" : "text-ink-soft")}><Icon name={ic} />{l}</NavLink>
        ))}
      </div>
    </nav>
  );
  // Avant le paiement : le parcours seul (questions, SaaS floutés, paiement), sans le menu de l'application.
  // Après le paiement : la révélation et l'atelier en plein écran, sinon l'interface complète.
  const paye = ws.plan === "fondateur" || (["explorer", "explorer_pro", "business", "solo", "pro"].includes(ws.plan) && ["active", "trialing", "past_due"].includes(ws.plan_status));
  if (loc.pathname.startsWith("/explorer/revelation") || loc.pathname.startsWith("/explorer/atelier")) return <>{extra}{children}{fb && <Feedback onClose={() => setFb(false)} />}</>;
  if (!paye || invite) return (
    <div className="min-h-full">
      {extra}
      {bandeauPaiement}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <NavLink to="/explorer/trouver"><Logo /></NavLink>
          <div className="flex-1" />
          <NavLink to="/aide" className="hidden sm:block rounded-xl px-3 py-2 text-[14px] font-medium text-ink-soft hover:text-ink">Aide</NavLink>
          {invite ? <>
            <button onClick={() => supabase.auth.signOut()} className="whitespace-nowrap rounded-xl border border-line px-3.5 py-2 text-[14px] font-medium hover:bg-paper">Se connecter</button>
            <button onClick={() => demanderCompte("Garde tes résultats et reviens quand tu veux.")} className="hidden sm:block whitespace-nowrap rounded-xl bg-ink px-4 py-2 text-[14px] font-semibold text-white hover:bg-ink/85">Créer mon compte</button>
          </> : <>
            <span className="hidden sm:block max-w-[200px] truncate text-[13.5px] text-ink-soft">{session?.user?.email}</span>
            <button onClick={() => supabase.auth.signOut()} className="whitespace-nowrap rounded-xl border border-line px-3.5 py-2 text-[14px] font-medium hover:bg-paper">Se déconnecter</button>
          </>}
        </div>
      </header>
      <main className="min-w-0 pb-16">{children}</main>
      {fb && <Feedback onClose={() => setFb(false)} />}
    </div>
  );
  return (
    <>
      <AppShell ws={ws} list={list} select={select} invite={invite} sections={sections} bas={bas} bandeau={bandeau} extra={extra} menuMobile={menu} onAvis={() => setFb(true)}>
        {children}
      </AppShell>
      {basMobile}
      {fb && <Feedback onClose={() => setFb(false)} />}
    </>
  );
}
