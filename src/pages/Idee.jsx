import { useEffect, useState } from "react";
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
const COULEUR = "#E8571C";
const dollars = (n) => Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " $";

// Maquette de la page d'accueil d'un site : en-tête, accroche, bouton, services et prix (tirés de l'aperçu)
function MaquetteSite({ nom, ap }) {
  const sv = ap.services?.length ? ap.services : [{ titre: "…", prix: "" }, { titre: "…", prix: "" }, { titre: "…", prix: "" }];
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_50px_-30px_rgba(20,20,40,.4)]">
      <div className="flex items-center gap-1.5 border-b border-line bg-[#FAFAF8] px-3 py-2"><span className="h-2 w-2 rounded-full bg-[#FF5F57]" /><span className="h-2 w-2 rounded-full bg-[#FEBC2E]" /><span className="h-2 w-2 rounded-full bg-[#28C840]" /><span className="ml-2 flex-1 truncate rounded-md bg-white px-2 py-0.5 text-[10.5px] text-ink-faint">{(nom || "mon-site").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "")}.fr</span></div>
      <div className="flex items-center justify-between px-4 py-2.5"><p className="flex items-center gap-1.5 text-[12px] font-bold"><span className="grid h-5 w-5 place-items-center rounded-md text-[10px] text-white" style={{ background: COULEUR }}>{nom.charAt(0)}</span>{nom}</p><div className="hidden gap-3 text-[10px] text-ink-faint sm:flex"><span>Services</span><span>À propos</span><span>Contact</span></div><span className="rounded-full px-2.5 py-1 text-[10px] font-bold text-white" style={{ background: COULEUR }}>{ap.cta}</span></div>
      <div className="px-5 pb-6 pt-4 text-center" style={{ background: "linear-gradient(180deg,#FFF4EC,#fff)" }}>
        <p className="mx-auto inline-block rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold" style={{ color: COULEUR }}>{ap.metier}</p>
        <p className="mx-auto mt-2 max-w-sm text-[19px] font-black leading-tight" style={HF}>{ap.accroche || ap.pitch}</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[11px] text-ink-soft line-clamp-2">{ap.pitch}</p>
        <span className="mt-3 inline-block rounded-full px-4 py-1.5 text-[11px] font-bold text-white" style={{ background: COULEUR }}>{ap.cta}</span>
      </div>
      {ap.modele === "portfolio"
        ? <div className="grid grid-cols-3 gap-2 px-4 pb-3">{sv.slice(0, 3).map((x, i) => <div key={i} className="overflow-hidden rounded-xl border border-line"><div className="h-14" style={{ background: ["#FDE7D9", "#E7E4F7", "#DDF0E8"][i % 3] }} /><p className="truncate px-2 py-1 text-[10px] font-bold">{x.titre}</p></div>)}</div>
        : ap.modele === "lancement"
          ? <div className="mx-4 mb-3 flex gap-1.5 rounded-full border border-line bg-white p-1"><div className="h-6 flex-1 rounded-full bg-[#FAFAF8]" /><span className="rounded-full px-3 py-1 text-[10px] font-bold text-white" style={{ background: COULEUR }}>{ap.cta}</span></div>
          : <div className="grid grid-cols-3 gap-2 px-4 pb-3">{sv.slice(0, 3).map((x, i) => <div key={i} className="rounded-xl border border-line p-2"><p className="truncate text-[10.5px] font-bold">{x.titre}</p><p className="mt-0.5 text-[10px]" style={{ color: COULEUR }}>{x.prix}</p></div>)}</div>}
      {ap.modele === "lancement" ? <div className="mx-4 mb-4 grid grid-cols-3 gap-2">{sv.slice(0, 3).map((x, i) => <div key={i} className="rounded-xl bg-[#FAFAF8] p-2"><p className="truncate text-[10px] font-bold">{x.titre}</p></div>)}</div>
        : <div className="mx-4 mb-4 rounded-xl bg-[#FAFAF8] p-2.5"><p className="text-[10.5px] font-bold">{ap.cta}</p><div className="mt-1.5 grid grid-cols-2 gap-1.5"><div className="h-5 rounded-md border border-line bg-white" /><div className="h-5 rounded-md border border-line bg-white" /><div className="col-span-2 h-8 rounded-md border border-line bg-white" /></div></div>}
    </div>
  );
}

// Un bloc de la maquette (liste, chiffres, calendrier…), dessiné en fil de fer
const Bloc = ({ b }) => {
    const el = b.elements?.length ? b.elements : ["…", "…", "…"];
    if (b.type === "kpi") return <div className="grid grid-cols-3 gap-2">{el.slice(0, 3).map((x) => <div key={x} className="rounded-lg border border-line bg-white p-2"><p className="text-[10px] text-ink-faint truncate">{x.replace(/^\d+[,.]?\d*\s*/, "")}</p><p className="text-[15px] font-black">{/\d+/.exec(x)?.[0] ?? (x.length % 9) + 2}</p></div>)}</div>;
    if (b.type === "calendrier") return <div className="grid grid-cols-7 gap-1">{Array.from({ length: 14 }, (_, i) => <div key={i} className={cx("h-7 rounded-md border border-line bg-white p-0.5 text-[8px] text-ink-faint", [2, 5, 9].includes(i) && "bg-[#FDECD8]")}>{i + 1}{[2, 5, 9].includes(i) && <span className="block truncate text-[#C2410C]">{el[i % el.length]}</span>}</div>)}</div>;
    if (b.type === "colonnes") return <div className="grid grid-cols-3 gap-2">{el.slice(0, 3).map((x, i) => <div key={x} className="rounded-lg bg-[#F1F0EC] p-1.5"><p className="mb-1 text-[10px] font-bold">{x}</p>{Array.from({ length: 2 - (i % 2) }, (_, k) => <div key={k} className="mb-1 h-5 rounded bg-white" />)}</div>)}</div>;
    if (b.type === "galerie") return <div className="grid grid-cols-3 gap-2">{el.slice(0, 3).map((x) => <div key={x} className="overflow-hidden rounded-lg border border-line bg-white"><div className="h-9 bg-[#F1F0EC]" /><p className="truncate px-1.5 py-1 text-[10px]">{x}</p></div>)}</div>;
    if (b.type === "graphique") return <div className="flex h-14 items-end gap-1.5 rounded-lg border border-line bg-white p-2">{[40, 65, 30, 80, 55, 90, 70].map((h, i) => <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 5 ? COULEUR : "#F6C9B0" }} />)}</div>;
    if (b.type === "formulaire") return <div className="space-y-1.5">{el.slice(0, 3).map((x) => <div key={x}><p className="text-[10px] text-ink-faint">{x}</p><div className="h-5 rounded-md border border-line bg-white" /></div>)}<div className="h-6 w-24 rounded-md" style={{ background: COULEUR }} /></div>;
    if (b.type === "chat") return <div className="space-y-1.5">{el.slice(0, 3).map((x, i) => <p key={x} className={cx("max-w-[80%] rounded-xl px-2 py-1 text-[10px]", i % 2 ? "ml-auto text-white" : "bg-[#F1F0EC]")} style={i % 2 ? { background: COULEUR } : null}>{x}</p>)}</div>;
    if (b.type === "editeur") return <div className="space-y-1 rounded-lg border border-line bg-white p-2">{el.slice(0, 3).map((x, i) => <p key={x} className={cx("truncate", i ? "text-[10px] text-ink-soft" : "text-[12px] font-bold")}>{x}</p>)}</div>;
    return <div className="divide-y divide-line rounded-lg border border-line bg-white">{el.slice(0, 4).map((x) => <div key={x} className="flex items-center gap-2 px-2 py-1.5"><span className="h-4 w-4 shrink-0 rounded-full bg-[#F1F0EC]" /><span className="min-w-0 flex-1 truncate text-[10.5px]">{x}</span><span className="h-2 w-8 rounded bg-[#F1F0EC]" /></div>)}</div>;
};

// Maquette d'une APP MOBILE : un téléphone, l'écran principal et les onglets en bas
function MaquetteTel({ nom, principal, ecrans }) {
  return (
    <div className="mx-auto w-[270px] rounded-[2.6rem] bg-[#15161A] p-2.5 shadow-[0_30px_60px_-30px_rgba(20,20,40,.6)]">
      <div className="relative overflow-hidden rounded-[2.1rem] bg-[#FAFAF8]">
        <div className="flex items-center justify-between px-5 pt-3 text-[10px] font-semibold"><span>9:41</span><span className="h-4 w-16 rounded-full bg-[#15161A]" /><span>●●●</span></div>
        <div className="space-y-3 px-3.5 pb-3 pt-3" style={{ minHeight: 420 }}>
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-ink-soft"><span className="grid h-5 w-5 place-items-center rounded-md text-[10px] text-white" style={{ background: COULEUR }}>{nom.charAt(0)}</span>{nom}</p>
          <p className="text-[19px] font-black leading-tight" style={HF}>{principal.titre}</p>
          {principal.blocs.slice(0, 3).map((b, i) => <div key={i}><p className="mb-1 text-[10.5px] font-semibold text-ink-soft">{b.titre}</p><Bloc b={b.type === "tableau" || b.type === "colonnes" ? { ...b, type: "liste" } : b} /></div>)}
        </div>
        <div className="grid border-t border-line bg-white" style={{ gridTemplateColumns: `repeat(${Math.min(5, ecrans.length) || 1},1fr)` }}>{ecrans.slice(0, 5).map((e, i) => <div key={e.titre} className="flex flex-col items-center gap-0.5 py-2"><span className="h-3.5 w-3.5 rounded-md" style={{ background: i === 0 ? COULEUR : "#D9D7D0" }} /><span className={cx("max-w-full truncate px-0.5 text-[8.5px] font-semibold", i === 0 ? "" : "text-ink-faint")} style={i === 0 ? { color: COULEUR } : null}>{e.titre}</span></div>)}</div>
      </div>
    </div>
  );
}

// Maquette fil de fer de l'écran principal, dessinée à partir des blocs de l'aperçu (aucun appel d'IA en plus)
function Maquette({ nom, principal, ecrans }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#FAFAF8] shadow-[0_20px_50px_-30px_rgba(20,20,40,.4)]">
      <div className="flex items-center gap-1.5 border-b border-line bg-white px-3 py-2"><span className="h-2 w-2 rounded-full bg-[#FF5F57]" /><span className="h-2 w-2 rounded-full bg-[#FEBC2E]" /><span className="h-2 w-2 rounded-full bg-[#28C840]" /><span className="ml-2 text-[11px] text-ink-faint">{nom}</span></div>
      <div className="flex">
        <div className="hidden w-32 shrink-0 space-y-1 border-r border-line bg-white p-2 sm:block"><p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold"><span className="grid h-5 w-5 place-items-center rounded-md text-[10px] text-white" style={{ background: COULEUR }}>{nom.charAt(0)}</span>{nom}</p>{ecrans.slice(0, 7).map((e, i) => <p key={e.titre} className={cx("truncate rounded-md px-1.5 py-1 text-[10.5px]", i === 0 ? "font-semibold" : "text-ink-soft")} style={i === 0 ? { background: "#FDECD8", color: "#C2410C" } : null}>{e.titre}</p>)}</div>
        <div className="min-w-0 flex-1 space-y-3 p-3"><p className="text-[14px] font-black">{principal.titre}</p>{principal.blocs.map((b, i) => <div key={i}><p className="mb-1 text-[10.5px] font-semibold text-ink-soft">{b.titre}</p><Bloc b={b} /></div>)}</div>
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
      <button onClick={() => { ecrire("bingoo-idee", null); nav("/accueil"); }} className="mt-2 text-[13.5px] font-semibold text-ink-soft underline-offset-4 hover:underline">Changer d'idée</button>

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
            <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <label className="text-[12.5px] font-semibold text-ink-soft" htmlFor="nom-idee">{site ? "Le nom affiché sur ton site" : "Son nom"}</label>
                <input id="nom-idee" value={nom} onChange={(e) => setNom(e.target.value.slice(0, 40))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-[22px] font-black outline-none focus:border-ink" style={HF} />
                <p className="mt-3 text-[15px]">{ap.pitch}</p>
                <p className="mt-1 text-[13.5px] text-ink-soft">Pour : {ap.cible}</p>
                <p className="mt-5 text-[13px] font-bold">{site ? `Ce que Bingoo! construit maintenant (${ap.ecrans.length} parties)` : idee.type === "app" ? `Ce que Bingoo! construit maintenant (${ap.ecrans.length} onglets)` : `Ce que Bingoo! construit maintenant (${ap.ecrans.length} écrans)`}</p>
                <ol className="mt-2 space-y-1.5">{ap.ecrans.map((e, i) => <li key={e.titre} className="flex gap-2.5 text-[14px]"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-paper text-[11px] font-bold">{i + 1}</span><span><b>{e.titre}</b> <span className="text-ink-soft">— {e.role}</span></span></li>)}</ol>
                {ap.plus_tard?.length > 0 && <><p className="mt-5 text-[13px] font-bold">Ensuite, dans l'atelier</p><p className="mt-1 text-[13.5px] text-ink-soft">{ap.plus_tard.join(" · ")}</p></>}
                {ap.limites?.length > 0 && <div className="mt-5 rounded-xl bg-[#FFF7F0] p-3"><p className="text-[13px] font-bold text-[#C2410C]">Fait autrement</p><ul className="mt-1 space-y-1">{ap.limites.map((l) => <li key={l.demande} className="text-[13.5px]"><span className="line-through decoration-[#C2410C]/50">{l.demande}</span> → {l.alternative}</li>)}</ul></div>}
              </div>
              <div>{site ? <MaquetteSite nom={nom || ap.nom} ap={ap} /> : idee.type === "app" ? <MaquetteTel nom={nom || ap.nom} principal={ap.principal} ecrans={ap.ecrans} /> : <Maquette nom={nom || ap.nom} principal={ap.principal} ecrans={ap.ecrans} />}<p className="mt-2 text-center text-[12px] text-ink-faint">{site ? "Maquette de ta page d'accueil : le vrai design, tes couleurs et tes textes sont faits à la construction." : "Maquette de l'écran principal : le vrai design est fait à la construction."}</p></div>
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
