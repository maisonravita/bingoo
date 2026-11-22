import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
const AppCadre = lazy(() => import("../components/AppCadre"));
import { useNavigate } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";
import { demanderCompte, estInvite } from "../lib/invite";
import CompanyLogo from "../components/CompanyLogo";

// « Construire mon idée » : l'aperçu gratuit avant de payer.
// Modération et questions si l'idée est floue, puis : les SaaS proches qui gagnent déjà de l'argent (« m'en inspirer »)
// ou l'idée telle quelle, avec son nom, sa cible, ses écrans, une maquette de l'écran principal, ce qui viendra
// ensuite dans l'atelier et ce qui sera fait autrement (annoncé AVANT de payer).
const HF = { fontFamily: "var(--font-titre)" };
const CLE_CHANTIER = "bingoo-chantier";
const DOMAINE_IDEE = "idee.bingoo.fr";
const lire = (k) => { try { return JSON.parse(localStorage.getItem(k) ?? "null"); } catch { return null; } };
const ecrire = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
const actif = (ws) => ["active", "trialing", "past_due"].includes(ws?.plan_status);
// Un SaaS demande Lancer (ou plus) ; un site, la formule Site ou n'importe quelle formule qui construit
const paye = (ws, type) => ws?.plan === "fondateur" || (actif(ws) && (["explorer_pro", "lancer_pro", "business", "solo", "pro"].includes(ws?.plan) || (type === "site" && ws?.plan === "site")));
const COULEUR = "var(--p)";
// Le design tiré pour l'aperçu (palette et polices) : la maquette le montre, la construction le reprend
const PAL0 = { primary: "#E8571C", on_primary: "#FFFFFF", background: "#FFFFFF", foreground: "#1E2030", card: "#FFFFFF", muted: "#F4F2EE", muted_foreground: "#5B6075", border: "#E7E5E0", secondary: "#F6A06B", accent: "#E8571C" };
function useDesign(ap) {
  const d = ap?.design ?? null;
  const c = { ...PAL0, ...(d?.couleurs ?? {}) };
  const titres = d?.polices?.titres ?? "Fraunces", texte = d?.polices?.texte ?? "Inter";
  useEffect(() => {
    const id = "police-apercu"; let l = document.getElementById(id);
    if (!l) { l = document.createElement("link"); l.id = id; l.rel = "stylesheet"; document.head.appendChild(l); }
    l.href = "https://fonts.googleapis.com/css2?" + [...new Set([titres, texte])].map((f) => "family=" + f.replace(/ /g, "+") + ":wght@400;500;600;700;800").join("&") + "&display=swap";
  }, [titres, texte]);
  const vars = { "--p": c.primary, "--op": c.on_primary, "--bg": c.background, "--fg": c.foreground, "--card": c.card, "--mut": c.muted, "--mfg": c.muted_foreground, "--bd": c.border, "--sec": c.secondary, "--acc": c.accent, fontFamily: `'${texte}', system-ui, sans-serif`, color: c.foreground };
  return { vars, T: { fontFamily: `'${titres}', Georgia, serif` }, sombre: d?.mode === "dark" };
}
const dollars = (n) => Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " $";

// Maquette de la page d'accueil d'un site : en-tête, accroche, bouton, services et prix (tirés de l'aperçu)
// L'aperçu d'un site : le VRAI gabarit des sites livrés par Bingoo!, avec les textes, services et le style de l'aperçu.
// Aucune donnée inventée : pas d'avis, pas d'horaires, pas de chiffres ; le membre fait défiler sa future page.
const prixNombre = (p) => { const m = String(p ?? "").replace(/\s/g, "").match(/(\d+(?:[.,]\d+)?)/); return m ? Number(m[1].replace(",", ".")) : null; };
function specSite(nom, ap) {
  return {
    type: "site", nom, slogan: ap.accroche || "", pitch: ap.pitch || "", design: ap.design ?? undefined, couleur: ap.design?.couleurs?.primary ?? "#E8571C",
    site: { gabarit: "editorial", metier: ap.metier || "", cta: ap.cta || "Me contacter", modele: ap.modele || "vitrine", demande: /devis/i.test(ap.cta ?? "") ? "devis" : /r[ée]serv/i.test(ap.cta ?? "") ? "reservation" : /rendez|rdv/i.test(ap.cta ?? "") ? "rdv" : "message", points_forts: ap.points_forts ?? [], etapes: ap.etapes ?? [] },
    demo: { services: (ap.services ?? []).map((x) => { const n = prixNombre(x.prix); return { titre: x.titre, description: x.description || "", prix: n, prix_texte: /partir/i.test(x.prix ?? "") }; }), horaires: [], infos: [{}] },
    ecrans: [],
  };
}
function SiteReel({ nom, ap }) {
  const spec = useMemo(() => specSite(nom, ap), [nom, ap]);
  const slug = (nom || "mon-site").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
  // Rendu en largeur d'ordinateur (1280 px), réduit à la place disponible : on voit le site comme ses clients le verront
  const boite = useRef(null), [k, setK] = useState(0.6);
  useEffect(() => {
    const el = boite.current; if (!el) return;
    const o = new ResizeObserver(() => { const w = el.clientWidth; setK(w < 640 ? 1 : w / 1280); });
    o.observe(el); return () => o.disconnect();
  }, []);
  const H = 600, large = k < 1;
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_70px_-35px_rgba(20,20,40,.5)]">
      <div className="flex items-center gap-1.5 border-b border-black/[.06] bg-[#F6F5F2] px-3 py-2"><span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" /><span className="ml-2 flex-1 truncate rounded-md bg-white px-2.5 py-0.5 text-[11px] text-[#9A9EAE]">{slug}.fr</span><span className="text-[10.5px] text-[#9A9EAE]">fais défiler ↓</span></div>
      <div ref={boite} className="relative w-full overflow-hidden" style={{ height: H }}>
        <div className={large ? "absolute left-0 top-0" : ""} style={large ? { width: 1280, height: H / k, transform: `scale(${k})`, transformOrigin: "0 0" } : { height: H }}>
          <Suspense fallback={<div className="h-full animate-pulse bg-[#F6F5F2]" />}>
            <AppCadre slug={"apercu-" + slug} spec={spec} version={JSON.stringify(spec).length} apercu className="h-full w-full" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function MaquetteSite({ nom, ap }) {
  const { vars, T } = useDesign(ap);
  const sv = (ap.services?.length ? ap.services : [{ titre: "Ton premier service", prix: "" }, { titre: "Ton deuxième service", prix: "" }, { titre: "Ton troisième service", prix: "" }]).slice(0, 3);
  const slug = (nom || "mon-site").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 shadow-[0_30px_70px_-35px_rgba(20,20,40,.5)]" style={{ ...vars, background: "var(--bg)" }}>
      <div className="flex items-center gap-1.5 border-b border-black/[.06] bg-[#F6F5F2] px-3 py-2"><span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" /><span className="ml-2 flex-1 truncate rounded-md bg-white px-2.5 py-0.5 text-[11px] text-[#9A9EAE]">{slug}.fr</span></div>
      <div className="flex items-center justify-between px-6 py-4">
        <p className="flex items-center gap-2 text-[15px] font-semibold" style={T}><span className="grid h-7 w-7 place-items-center rounded-lg text-[12px] font-bold" style={{ background: "var(--p)", color: "var(--op)" }}>{nom.charAt(0)}</span>{nom}</p>
        <div className="hidden items-center gap-4 text-[11.5px] sm:flex" style={{ color: "var(--mfg)" }}><span>Services</span><span>À propos</span><span>Contact</span></div>
        <span className="rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold" style={{ background: "var(--p)", color: "var(--op)" }}>{ap.cta}</span>
      </div>
      <div className="grid items-center gap-5 px-6 pb-7 pt-3 sm:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[.16em]" style={{ color: "var(--p)" }}>{ap.metier}</p>
          <p className="mt-2 text-[27px] font-semibold leading-[1.08] tracking-[-.01em]" style={T}>{ap.accroche || ap.pitch}</p>
          <p className="mt-2.5 text-[12px] leading-relaxed line-clamp-3" style={{ color: "var(--mfg)" }}>{ap.pitch}</p>
          <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full px-4 py-2 text-[11.5px] font-semibold" style={{ background: "var(--p)", color: "var(--op)" }}>{ap.cta}</span><span className="rounded-full border px-4 py-2 text-[11.5px] font-semibold" style={{ borderColor: "var(--bd)" }}>Voir les services</span></div>
        </div>
        <div className="relative h-[170px] overflow-hidden rounded-2xl" style={{ background: "linear-gradient(140deg, color-mix(in srgb, var(--p) 85%, black), color-mix(in srgb, var(--sec) 70%, var(--p)))" }}>
          <span className="absolute -right-8 -top-10 h-36 w-36 rounded-full opacity-30" style={{ background: "var(--sec)" }} />
          <span className="absolute -bottom-12 left-6 h-32 w-32 rounded-full opacity-20" style={{ background: "white" }} />
          <span className="absolute bottom-4 left-4 right-4 rounded-xl bg-white/95 px-3 py-2.5 shadow-lg" style={{ color: "#1E2030" }}><span className="block text-[10px] uppercase tracking-wider text-[#9A9EAE]">{ap.modele === "lancement" ? "Bientôt" : "Le plus demandé"}</span><span className="mt-0.5 flex items-baseline justify-between gap-2"><span className="truncate text-[12.5px] font-semibold">{sv[0].titre}</span>{sv[0].prix && <span className="shrink-0 text-[12px] font-bold" style={{ color: "var(--p)" }}>{sv[0].prix}</span>}</span></span>
        </div>
      </div>
      <div className="px-6 pb-6" style={{ background: "var(--mut)" }}>
        <p className="pt-5 text-[16px] font-semibold" style={T}>{ap.modele === "portfolio" ? "Réalisations" : ap.modele === "lancement" ? "Ce qui arrive" : "Services et tarifs"}</p>
        <div className="mt-3 grid grid-cols-3 gap-2.5">{sv.map((x, i) => (
          <div key={i} className="rounded-xl p-3" style={{ background: "var(--card)", border: "1px solid var(--bd)" }}>
            {ap.modele === "portfolio" ? <div className="mb-2 h-12 rounded-lg" style={{ background: `color-mix(in srgb, var(--p) ${18 + i * 12}%, white)` }} /> : null}
            <p className="truncate text-[11.5px] font-semibold">{x.titre}</p>
            {x.prix ? <p className="mt-1 text-[11px] font-bold" style={{ color: "var(--p)" }}>{x.prix}</p> : <div className="mt-1.5 h-1.5 w-2/3 rounded" style={{ background: "var(--mut)" }} />}
          </div>
        ))}</div>
      </div>
      <div className="flex items-center justify-between gap-3 px-6 py-4" style={{ background: "var(--fg)", color: "var(--bg)" }}>
        <p className="text-[13px] font-semibold" style={T}>{ap.modele === "lancement" ? "Sois prévenu en premier" : "Une question, un rendez-vous ?"}</p>
        <span className="rounded-full px-3.5 py-1.5 text-[11px] font-semibold" style={{ background: "var(--p)", color: "var(--op)" }}>{ap.cta}</span>
      </div>
    </div>
  );
}

// Un bloc de la maquette (liste, chiffres, calendrier…), dessiné en fil de fer
const Bloc = ({ b }) => {
    const el = b.elements?.length ? b.elements : ["…", "…", "…"];
    if (b.type === "kpi") return <div className="grid grid-cols-3 gap-2">{el.slice(0, 3).map((x) => <div key={x} className="rounded-lg border border-line bg-white p-2"><p className="text-[10px] text-ink-faint truncate">{x.replace(/^\d+[,.]?\d*\s*/, "")}</p><p className="text-[15px] font-black">{/\d+/.exec(x)?.[0] ?? (x.length % 9) + 2}</p></div>)}</div>;
    if (b.type === "calendrier") return <div className="grid grid-cols-7 gap-1">{Array.from({ length: 14 }, (_, i) => <div key={i} className={cx("h-7 rounded-md border border-line bg-white p-0.5 text-[8px] text-ink-faint", [2, 5, 9].includes(i) && "bg-[color-mix(in_srgb,var(--p)_14%,white)]")}>{i + 1}{[2, 5, 9].includes(i) && <span className="block truncate text-[var(--p)]">{el[i % el.length]}</span>}</div>)}</div>;
    if (b.type === "colonnes") return <div className="grid grid-cols-3 gap-2">{el.slice(0, 3).map((x, i) => <div key={x} className="rounded-lg bg-[#F1F0EC] p-1.5"><p className="mb-1 text-[10px] font-bold">{x}</p>{Array.from({ length: 2 - (i % 2) }, (_, k) => <div key={k} className="mb-1 h-5 rounded bg-white" />)}</div>)}</div>;
    if (b.type === "galerie") return <div className="grid grid-cols-3 gap-2">{el.slice(0, 3).map((x) => <div key={x} className="overflow-hidden rounded-lg border border-line bg-white"><div className="h-9 bg-[#F1F0EC]" /><p className="truncate px-1.5 py-1 text-[10px]">{x}</p></div>)}</div>;
    if (b.type === "graphique") return <div className="flex h-14 items-end gap-1.5 rounded-lg border border-line bg-white p-2">{[40, 65, 30, 80, 55, 90, 70].map((h, i) => <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 5 ? COULEUR : "color-mix(in srgb, var(--p) 30%, white)" }} />)}</div>;
    if (b.type === "formulaire") return <div className="space-y-1.5">{el.slice(0, 3).map((x) => <div key={x}><p className="text-[10px] text-ink-faint">{x}</p><div className="h-5 rounded-md border border-line bg-white" /></div>)}<div className="h-6 w-24 rounded-md" style={{ background: COULEUR }} /></div>;
    if (b.type === "chat") return <div className="space-y-1.5">{el.slice(0, 3).map((x, i) => <p key={x} className={cx("max-w-[80%] rounded-xl px-2 py-1 text-[10px]", i % 2 ? "ml-auto text-white" : "bg-[#F1F0EC]")} style={i % 2 ? { background: COULEUR } : null}>{x}</p>)}</div>;
    if (b.type === "editeur") return <div className="space-y-1 rounded-lg border border-line bg-white p-2">{el.slice(0, 3).map((x, i) => <p key={x} className={cx("truncate", i ? "text-[10px] text-ink-soft" : "text-[12px] font-bold")}>{x}</p>)}</div>;
    return <div className="divide-y divide-line rounded-lg border border-line bg-white">{el.slice(0, 4).map((x) => <div key={x} className="flex items-center gap-2 px-2 py-1.5"><span className="h-4 w-4 shrink-0 rounded-full bg-[#F1F0EC]" /><span className="min-w-0 flex-1 truncate text-[10.5px]">{x}</span><span className="h-2 w-8 rounded bg-[#F1F0EC]" /></div>)}</div>;
};

// Maquette d'une APP MOBILE : un téléphone, l'écran principal et les onglets en bas
function MaquetteTel({ nom, principal, ecrans, ap }) {
  const { vars, T } = useDesign(ap);
  return (
    <div className="mx-auto w-[270px] rounded-[2.6rem] bg-[#15161A] p-2.5 shadow-[0_30px_60px_-30px_rgba(20,20,40,.6)]" style={vars}>
      <div className="relative overflow-hidden rounded-[2.1rem] bg-[#FAFAF8]">
        <div className="flex items-center justify-between px-5 pt-3 text-[10px] font-semibold"><span>9:41</span><span className="h-4 w-16 rounded-full bg-[#15161A]" /><span>●●●</span></div>
        <div className="space-y-3 px-3.5 pb-3 pt-3" style={{ minHeight: 420 }}>
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-ink-soft"><span className="grid h-5 w-5 place-items-center rounded-md text-[10px] text-white" style={{ background: COULEUR }}>{nom.charAt(0)}</span>{nom}</p>
          <p className="text-[21px] font-semibold leading-tight" style={T}>{principal.titre}</p>
          {principal.blocs.slice(0, 3).map((b, i) => <div key={i}><p className="mb-1 text-[10.5px] font-semibold text-ink-soft">{b.titre}</p><Bloc b={b.type === "tableau" || b.type === "colonnes" ? { ...b, type: "liste" } : b} /></div>)}
        </div>
        <div className="grid border-t border-line bg-white" style={{ gridTemplateColumns: `repeat(${Math.min(5, ecrans.length) || 1},1fr)` }}>{ecrans.slice(0, 5).map((e, i) => <div key={e.titre} className="flex flex-col items-center gap-0.5 py-2"><span className="h-3.5 w-3.5 rounded-md" style={{ background: i === 0 ? COULEUR : "#D9D7D0" }} /><span className={cx("max-w-full truncate px-0.5 text-[8.5px] font-semibold", i === 0 ? "" : "text-ink-faint")} style={i === 0 ? { color: COULEUR } : null}>{e.titre}</span></div>)}</div>
      </div>
    </div>
  );
}

// Maquette fil de fer de l'écran principal, dessinée à partir des blocs de l'aperçu (aucun appel d'IA en plus)
function Maquette({ nom, principal, ecrans, ap }) {
  const { vars, T } = useDesign(ap);
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 shadow-[0_30px_70px_-35px_rgba(20,20,40,.5)]" style={{ ...vars, background: "var(--mut)" }}>
      <div className="flex items-center gap-1.5 border-b border-line bg-white px-3 py-2"><span className="h-2 w-2 rounded-full bg-[#FF5F57]" /><span className="h-2 w-2 rounded-full bg-[#FEBC2E]" /><span className="h-2 w-2 rounded-full bg-[#28C840]" /><span className="ml-2 text-[11px] text-ink-faint">{nom}</span></div>
      <div className="flex min-h-[440px]">
        <div className="hidden w-36 shrink-0 space-y-1 p-2.5 sm:block" style={{ background: "color-mix(in srgb, var(--p) 88%, black)", color: "white" }}><p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold" style={T}><span className="grid h-5 w-5 place-items-center rounded-md bg-white text-[10px] font-bold" style={{ color: "var(--p)" }}>{nom.charAt(0)}</span>{nom}</p>{ecrans.slice(0, 7).map((e, i) => <p key={e.titre} className={cx("truncate rounded-md px-2 py-1.5 text-[10.5px]", i === 0 ? "font-semibold" : "text-white/70")} style={i === 0 ? { background: "rgba(255,255,255,.16)" } : null}>{e.titre}</p>)}</div>
        <div className="min-w-0 flex-1 space-y-4 p-5"><p className="text-[21px] font-semibold" style={T}>{principal.titre}</p>{principal.blocs.map((b, i) => <div key={i}><p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--mfg)" }}>{b.titre}</p><Bloc b={b} /></div>)}</div>
      </div>
    </div>
  );
}

// Le prix, dit AVANT de construire : ce que ça coûte à ce membre-là (compris dans sa formule, crédits, ou la formule à prendre)
const euros = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",")) + " €";
function Prix({ ws, type }) {
  const [t, setT] = useState(null), [deja, setDeja] = useState(null);
  useEffect(() => {
    fn("plans").then(setT).catch(() => setT({}));
    if (ws?.id) supabase.from("saas_apps").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).not("statut", "in", "(remplace,erreur,validation,retire)").then(({ count }) => setDeja((count ?? 0) > 0));
  }, [ws?.id]);
  if (!t) return null;
  const site = type === "site";
  const mois = (k, per = "mois") => (t.plans ?? []).find((p) => p.key === k)?.periodes?.find((x) => x.key === per)?.parMois;
  const fondateur = t.fondateur?.left > 0 ? t.fondateur.price : null;
  const lancer = fondateur ?? mois("explorer_pro") ?? 24.99;
  let txt;
  if (paye(ws, type)) txt = deja ? <>Tu as déjà un {site ? "site ou un SaaS" : "SaaS"} en ligne : celui-ci coûte <b>60 crédits</b>, le premier reste en ligne.</> : <><b>Compris dans ta formule</b> : c'est {site ? "ton site" : "ton SaaS"} de l'abonnement, sans rien payer de plus.</>;
  else if (!site && ws?.plan === "site" && actif(ws)) txt = <>Ta formule Site construit des sites. Pour {type === "app" ? "une app" : "un SaaS"}, passe à la formule Lancer : <b>{euros(lancer)} par mois</b>.</>;
  else if (site) txt = <>Formule Site : <b>{euros(mois("site") ?? 9.99)}/mois, hébergement inclus</b>, sans engagement{mois("site", "an") ? <> (ou {euros(mois("site", "an"))}/mois en payant l'année)</> : null}. Nom de domaine personnalisé en plus : tu l'achètes où tu veux, on le branche gratuitement.</>;
  else txt = <>Formule Lancer : <b>{euros(lancer)} par mois{fondateur ? ", prix fondateur à vie" : ""}</b>, sans engagement. {type === "app" ? "Ton app" : "Ton SaaS"} est compris dans l'abonnement.</>;
  return <p className="w-full rounded-xl bg-[#F7F7F5] px-3 py-2 text-[13.5px]">{txt}</p>;
}

export default function Idee() {
  const { ws, session } = useWs();
  const nav = useNavigate();
  const [idee] = useState(() => lire("bingoo-idee"));
  const [etat, setEtat] = useState("charge"), [r, setR] = useState(null), [err, setErr] = useState(null);
  const [reponses, setReponses] = useState([]), [choix, setChoix] = useState({}), [nom, setNom] = useState(""), [busy, setBusy] = useState(false);
  const charger = async (rep = []) => {
    setEtat("charge"); setErr(null);
    try {
      const x = await fn("r/saas-idee-apercu", { workspace_id: ws.id, texte: idee.texte, type: idee.type, reponses: rep });
      setR(x); setEtat(x.refus ? "refus" : x.questions ? "questions" : "apercu");
      if (x.apercu) { setNom(idee.nom || x.apercu.nom); ecrire("bingoo-idee", { ...idee, reponses: rep, apercu: x.apercu, proches: x.proches }); }
    } catch (e) { setErr(e.message); setEtat("erreur"); }
  };
  useEffect(() => { if (idee?.texte && ws?.id) { if (idee.apercu?.nom) { setR({ apercu: idee.apercu, proches: idee.proches ?? [] }); setNom(idee.nom || idee.apercu.nom); setEtat("apercu"); } else charger(); } }, [ws?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!idee?.texte) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><p className="text-[20px] font-bold">Écris d'abord ton idée.</p><button onClick={() => nav("/explorer/trouver")} className="mt-4 rounded-full bg-ink px-6 py-3 font-bold text-white">Explorer les SaaS qui marchent</button></div>;

  // Lancer : un compte, l'abonnement, puis la construction habituelle (questions, paiement, construction, vérification)
  const lancer = async (quoi, proche) => {
    if (estInvite(session) || !ws) { demanderCompte("Crée ton compte gratuit pour construire ton idée."); return; }
    const ap = r?.apercu;
    if (quoi === "idee") {
      ecrire(`bingoo-reponses-${DOMAINE_IDEE}`, { nom: nom.trim() || ap.nom, clients: ap.cible, mieux: "", angle: null });
      ecrire(CLE_CHANTIER, { idee: true, domaine: DOMAINE_IDEE, nom: nom.trim() || ap.nom, categorie: "", ws: ws.id, ideeTexte: idee.texte, type: idee.type, reponses: idee.reponses ?? [], apercu: { ...ap, nom: nom.trim() || ap.nom }, source: idee.source ?? null });
    } else {
      ecrire(`bingoo-reponses-${proche.domaine}`, { nom: "", clients: ap?.cible ?? "", mieux: idee.texte, angle: `Ce que je veux faire mieux : ${idee.texte}` });
      ecrire(CLE_CHANTIER, { domaine: proche.domaine, nom: proche.nom, categorie: "", ws: ws.id });
    }
    const site = quoi === "idee" && idee.type === "site";
    if (paye(ws, site ? "site" : "saas")) { nav("/explorer/revelation"); return; }
    // Site : sa propre formule, moins chère (9,99 € par mois) ; SaaS : Lancer
    const plan = site ? "site" : "explorer_pro";
    setBusy(true);
    try { const { url } = await fn("billing-checkout", { workspace_id: ws.id, plan, periode: "mois", retour: "revelation" }); if (url) { window.location.href = url; return; } nav("/explorer/revelation"); }
    catch { nav(`/abonnement?formule=${plan}&periode=mois`); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <p className="text-[13px] font-bold uppercase tracking-[.16em] text-accent-dark">Ton idée{idee.type === "app" ? " d'app" : idee.type === "site" ? " de site" : ""}</p>
      <h1 className="mt-2 text-[28px] sm:text-[38px] font-black leading-[1.08] tracking-tight" style={HF}>{idee.titre ?? <>« {idee.texte} »</>}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[13.5px] text-ink-soft">Bingoo! construit :</span>
        {[["saas", "Un logiciel (SaaS)"], ["site", "Un site web"], ["app", "Une app mobile"]].map(([k, l]) => <button key={k} aria-pressed={(idee.type ?? "saas") === k} disabled={etat === "charge"} onClick={() => { if ((idee.type ?? "saas") === k) return; ecrire("bingoo-idee", { texte: idee.texte, titre: idee.titre, nom: idee.nom, source: idee.source, type: k, at: Date.now() }); window.location.reload(); }} className={cx("rounded-full border px-3 py-1.5 text-[13px] font-semibold transition", (idee.type ?? "saas") === k ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink-faint")}>{l}</button>)}
        <button onClick={() => { ecrire("bingoo-idee", null); nav("/accueil"); }} className="ml-1 text-[13.5px] font-semibold text-ink-soft underline-offset-4 hover:underline">Changer d'idée</button>
      </div>

      {etat === "charge" && <div className="mt-10 flex items-center gap-3 rounded-2xl border border-line bg-white p-6"><span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" /><span className="text-[15px] text-ink-soft">{idee.type === "site" ? "Bingoo! étudie ton idée et prépare l'aperçu de ton site…" : "Bingoo! étudie ton idée et cherche ce qui marche déjà sur ce créneau…"}</span></div>}
      {etat === "erreur" && <div className="mt-10 rounded-2xl border border-bad/30 bg-bad/5 p-6"><p className="font-semibold">{err}</p><button onClick={() => charger(reponses)} className="mt-3 rounded-xl bg-ink px-4 py-2 font-bold text-white">Réessayer</button></div>}
      {etat === "refus" && <div className="mt-10 rounded-2xl border border-bad/30 bg-bad/5 p-6"><p className="text-[17px] font-bold">Bingoo! ne peut pas construire cette idée.</p><p className="mt-1 text-ink-soft">{r.refus}</p><button onClick={() => { ecrire("bingoo-idee", null); nav("/accueil"); }} className="mt-4 rounded-xl bg-ink px-4 py-2 font-bold text-white">Écrire une autre idée</button></div>}

      {etat === "questions" && (
        <div className="mt-8 rounded-3xl border border-line bg-white p-6">
          <p className="text-[18px] font-black" style={HF}>{r.questions.length > 1 ? "Deux précisions pour viser juste" : "Une précision pour viser juste"}</p>
          <p className="text-[14px] text-ink-soft">Ton idée peut partir dans plusieurs directions : dis-moi laquelle.</p>
          <div className="mt-5 space-y-5">{r.questions.map((q) => (
            <div key={q.q}><p className="font-semibold">{q.q}</p>
              <div className="mt-2 flex flex-wrap gap-2">{q.choix.map((c) => <button key={c} aria-pressed={choix[q.q] === c} onClick={() => setChoix({ ...choix, [q.q]: c })} className={cx("rounded-full border px-4 py-2 text-[14px] font-medium transition", choix[q.q] === c ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink-faint")}>{c}</button>)}</div>
              <input placeholder="Ou écris ta réponse…" value={q.choix.includes(choix[q.q]) ? "" : choix[q.q] ?? ""} onChange={(e) => setChoix({ ...choix, [q.q]: e.target.value })} className="mt-2 w-full max-w-md rounded-xl border border-line px-3 py-2 text-[14px] outline-none focus:border-ink" />
            </div>
          ))}</div>
          <button disabled={r.questions.some((q) => !String(choix[q.q] ?? "").trim())} onClick={() => { const rep = r.questions.map((q) => ({ q: q.q, r: choix[q.q] })); setReponses(rep); charger(rep); }} className="mt-6 rounded-full bg-accent px-6 py-3 font-bold text-white disabled:opacity-40">Voir mon aperçu</button>
        </div>
      )}

      {etat === "apercu" && r?.apercu && (() => { const ap = r.apercu, site = idee.type === "site"; return (
        <>
          <section className="mt-8 rounded-3xl border-2 border-ink bg-white p-5 sm:p-7">
            <p className="text-[12px] font-bold uppercase tracking-[.14em] text-ink-faint">L'aperçu de ta première version</p>
            <div className={cx("mt-4 grid grid-cols-1 gap-6 [&>*]:min-w-0", !site && "lg:grid-cols-[1fr_1.1fr]")}>
              <div>
                <label className="text-[12.5px] font-semibold text-ink-soft" htmlFor="nom-idee">{site ? "Le nom affiché sur ton site" : "Son nom"}</label>
                <input id="nom-idee" value={nom} onChange={(e) => setNom(e.target.value.slice(0, 40))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-[22px] font-black outline-none focus:border-ink" style={HF} />
                <p className="mt-3 text-[15px]">{ap.pitch}</p>
                <p className="mt-1 text-[13.5px] text-ink-soft">Pour : {ap.cible}</p>
                <p className="mt-5 text-[13px] font-bold">{site ? `Ce que Bingoo! construit maintenant (${ap.ecrans.length} parties)` : idee.type === "app" ? `Ce que Bingoo! construit maintenant (${ap.ecrans.length} onglets)` : `Ce que Bingoo! construit maintenant (${ap.ecrans.length} écrans)`}</p>
                <ol className="mt-2 space-y-1.5">{ap.ecrans.map((e, i) => <li key={e.titre} className="flex gap-2.5 text-[14px]"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-paper text-[11px] font-bold">{i + 1}</span><span><b>{e.titre}</b> <span className="text-ink-soft">— {e.role}</span></span></li>)}</ol>
                {ap.plus_tard?.length > 0 && <><p className="mt-5 text-[13px] font-bold">Ensuite, dans l'atelier</p><p className="mt-1 text-[13.5px] text-ink-soft">{ap.plus_tard.join(" · ")}</p></>}
                {ap.limites?.length > 0 && <div className="mt-5 rounded-xl bg-[#FFF7F0] p-3"><p className="text-[13px] font-bold text-[var(--p)]">Fait autrement</p><ul className="mt-1 space-y-1">{ap.limites.map((l) => <li key={l.demande} className="text-[13.5px]"><span className="line-through decoration-[#C2410C]/50">{l.demande}</span> → {l.alternative}</li>)}</ul></div>}
              </div>
              <div className={site ? "order-first" : ""}>{site ? <SiteReel nom={nom || ap.nom} ap={ap} /> : idee.type === "app" ? <MaquetteTel nom={nom || ap.nom} principal={ap.principal} ecrans={ap.ecrans} ap={ap} /> : <Maquette nom={nom || ap.nom} principal={ap.principal} ecrans={ap.ecrans} ap={ap} />}<p className="mt-2 text-center text-[12px] text-ink-faint">{site ? "Ta future page d'accueil, faite avec le gabarit des sites Bingoo! : fais-la défiler. Tu ajouteras ta photo, tes horaires et ton adresse ensuite." : "Ton écran principal, avec le style choisi pour toi : la construction reprend ces couleurs et ces polices."}</p></div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <Prix ws={ws} type={idee.type} />
              <button disabled={busy || nom.trim().length < 2} onClick={() => lancer("idee")} className="rounded-full bg-accent px-7 py-3.5 text-[16px] font-bold text-white shadow-[0_12px_30px_-14px_rgba(226,85,35,.9)] disabled:opacity-50">{busy ? "Un instant…" : `Construire ${nom.trim() || ap.nom}`}</button>
              <p className="text-[13px] text-ink-soft">{site ? <>Bingoo! écrit tes textes, met ton site en ligne et teste ton espace gérant. Tu vérifies ensuite tes prix et tes horaires.</> : <>Bingoo! le construit, teste chaque écran comme un vrai utilisateur, corrige, puis le met en ligne.{idee.type === "app" ? " Tu l'essaies ensuite sur ton téléphone dans Expo Go (gratuit). La publication sur l'App Store et Google Play arrive bientôt." : ""}</>}</p>
            </div>
          </section>

          {!site && idee.type !== "app" && r.proches?.length > 0 && (
            <section className="mt-10">
              <p className="text-[15px] font-bold">Pour t'inspirer, si tu veux : {r.proches.length > 1 ? `${r.proches.length} logiciels proches qui marchent déjà` : "un logiciel proche qui marche déjà"}</p>
              <p className="text-[14px] text-ink-soft">Facultatif : ton idée se construit telle quelle avec le bouton ci-dessus. Tu peux aussi partir de leur logique, qui a fait ses preuves.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">{r.proches.map((s) => (
                <div key={s.domaine} className="flex flex-col rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-center gap-3"><CompanyLogo name={s.nom} url={`https://${s.domaine}`} className="h-10 w-10" pad="p-1.5" /><div className="min-w-0"><p className="truncate font-bold">{s.nom}</p><p className="text-[12.5px] text-ink-faint">{s.mrr ? <span className="font-semibold text-good">{dollars(s.mrr)} par mois, vérifié</span> : s.domaine}</p></div></div>
                  <p className="mt-2 flex-1 text-[13.5px] text-ink-soft line-clamp-3">{s.description}</p>
                  <button disabled={busy} onClick={() => lancer("inspirer", s)} className="mt-3 rounded-xl border border-ink px-3 py-2 text-[13.5px] font-bold hover:bg-ink hover:text-white">M'en inspirer</button>
                </div>
              ))}</div>
            </section>
          )}

        </>
      ); })()}
    </div>
  );
}
