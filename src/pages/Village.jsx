import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";
import IsoVille from "../components/IsoVille";

/* Bingoo!-ville : l'accueil en carte. Chaque bâtiment = une partie de Bingoo!, son nom écrit en gros,
   ce qu'on y fait en trois mots, et un badge quand quelque chose t'y attend. Un panneau dit où aller d'abord. */

const H = { fontFamily: "Nunito, Geist, system-ui, sans-serif" };

// Dessins originaux (formes simples, couleurs de la marque) : viewBox 0 0 160 130, sol à y = 124
const ART = {
  poste: (
    <>
      <rect x="22" y="52" width="116" height="72" rx="3" fill="#F7D9A8" />
      <path d="M14 56 80 18l66 38z" fill="#E0531F" />
      <rect x="64" y="86" width="32" height="38" rx="2" fill="#7A3E1D" />
      <rect x="34" y="66" width="22" height="18" rx="2" fill="#FFF8EC" stroke="#7A3E1D" strokeWidth="2" />
      <rect x="104" y="66" width="22" height="18" rx="2" fill="#FFF8EC" stroke="#7A3E1D" strokeWidth="2" />
      <rect x="62" y="34" width="36" height="22" rx="2" fill="#FFF8EC" />
      <path d="m62 34 18 13 18-13" fill="none" stroke="#E0531F" strokeWidth="2.5" />
      <rect x="140" y="92" width="12" height="20" rx="2" fill="#E0531F" /><rect x="144" y="112" width="4" height="12" fill="#7A3E1D" />
    </>
  ),
  atelier: (
    <>
      <rect x="20" y="58" width="120" height="66" rx="3" fill="#E9E4D8" />
      <path d="M14 62h132l-10-26H24z" fill="#3B3F48" />
      <path d="M30 36h20v-14h-20z" fill="#3B3F48" />
      <rect x="30" y="72" width="48" height="30" rx="2" fill="#FFF8EC" stroke="#3B3F48" strokeWidth="2" />
      <path d="m42 96 22-18 6 6-22 18-8 2z" fill="#E0531F" /><path d="m64 78 4-3 6 6-4 3z" fill="#3B3F48" />
      <rect x="94" y="80" width="32" height="44" rx="2" fill="#7A3E1D" />
    </>
  ),
  rdv: (
    <>
      <rect x="28" y="40" width="104" height="84" rx="3" fill="#DCE8F5" />
      <rect x="22" y="34" width="116" height="10" rx="2" fill="#2F4A6E" />
      <circle cx="80" cy="22" r="16" fill="#FFF8EC" stroke="#2F4A6E" strokeWidth="3" />
      <path d="M80 13v10l7 4" stroke="#E0531F" strokeWidth="3" strokeLinecap="round" fill="none" />
      {[40, 66, 92, 118].map((x) => <rect key={x} x={x - 8} y="54" width="16" height="16" rx="2" fill="#FFF8EC" />)}
      {[40, 118].map((x) => <rect key={x} x={x - 8} y="80" width="16" height="16" rx="2" fill="#FFF8EC" />)}
      <rect x="66" y="84" width="28" height="40" rx="2" fill="#2F4A6E" />
    </>
  ),
  annuaire: (
    <>
      <rect x="24" y="50" width="112" height="74" fill="#F2EEE4" />
      <path d="M16 52 80 20l64 32z" fill="#8C5A3C" />
      <rect x="20" y="50" width="120" height="8" fill="#8C5A3C" />
      {[36, 58, 102, 124].map((x) => <rect key={x} x={x - 5} y="62" width="10" height="56" fill="#E3DCCB" />)}
      <rect x="68" y="78" width="24" height="46" rx="12" fill="#5A3A26" />
      <rect x="66" y="30" width="28" height="16" rx="2" fill="#FFF8EC" /><path d="M80 31v14M70 34h8M82 34h8M70 39h8M82 39h8" stroke="#8C5A3C" strokeWidth="1.6" />
    </>
  ),
  radar: (
    <>
      <path d="M62 124 70 40h20l8 84z" fill="#3B3F48" />
      <rect x="64" y="68" width="32" height="6" fill="#E0531F" /><rect x="66" y="96" width="28" height="6" fill="#E0531F" />
      <path d="M50 30a30 30 0 0 0 46 22z" fill="#E9E4D8" stroke="#3B3F48" strokeWidth="2.5" />
      <path d="m73 41 18-20" stroke="#3B3F48" strokeWidth="2.5" /><circle cx="92" cy="20" r="4" fill="#E0531F" />
      <path d="M104 14a16 16 0 0 1 10 14M110 6a26 26 0 0 1 14 22" fill="none" stroke="#E0531F" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="74" y="108" width="12" height="16" rx="1" fill="#7A3E1D" />
    </>
  ),
  espion: (
    <>
      <rect x="30" y="62" width="100" height="62" rx="3" fill="#2B2D33" />
      <path d="M22 66 80 30l58 36z" fill="#15161A" />
      <ellipse cx="80" cy="84" rx="20" ry="11" fill="#FFF8EC" /><circle cx="80" cy="84" r="7" fill="#E0531F" /><circle cx="80" cy="84" r="3" fill="#15161A" />
      <rect x="66" y="100" width="28" height="24" rx="2" fill="#5B5E66" />
      <path d="M104 52h12v-14h-12z" fill="#15161A" />
    </>
  ),
  linkedin: (
    <>
      <rect x="22" y="58" width="116" height="66" rx="3" fill="#F7F4EE" />
      <path d="M16 60h128l-6-22H22z" fill="#0A66C2" />
      <path d="M16 60h128v10H16z" fill="#FFF8EC" />
      {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${16 + i * 16} 70h16l-8 8z`} fill="#0A66C2" />)}
      <rect x="66" y="40" width="28" height="16" rx="3" fill="#FFF8EC" /><text x="80" y="53" textAnchor="middle" fontSize="13" fontWeight="900" fill="#0A66C2" style={H}>in</text>
      <rect x="32" y="84" width="34" height="24" rx="2" fill="#FFF8EC" stroke="#0A66C2" strokeWidth="2" />
      <rect x="94" y="84" width="30" height="40" rx="2" fill="#7A3E1D" />
    </>
  ),
  observatoire: (
    <>
      <rect x="32" y="70" width="96" height="54" rx="3" fill="#E9E4D8" />
      <path d="M36 72a44 44 0 0 1 88 0z" fill="#5B5E66" />
      <path d="m90 40 26-16 4 7-26 16z" fill="#E0531F" />
      <rect x="66" y="92" width="28" height="32" rx="2" fill="#7A3E1D" />
      <path d="M44 112v-12M52 112v-20M60 112v-8" stroke="#1F7A4D" strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  mairie: (
    <>
      <rect x="20" y="56" width="120" height="68" fill="#FFF8EC" />
      <path d="M12 58 80 26l68 32z" fill="#E0531F" />
      <rect x="16" y="56" width="128" height="8" fill="#BF4314" />
      {[36, 60, 100, 124].map((x) => <rect key={x} x={x - 6} y="70" width="12" height="20" rx="6" fill="#DCE8F5" />)}
      <rect x="68" y="88" width="24" height="36" rx="12" fill="#7A3E1D" />
      <path d="M80 26V6" stroke="#3B3F48" strokeWidth="2" /><path d="M80 6h16l-4 5 4 5H80z" fill="#E0531F" />
      <circle cx="80" cy="44" r="7" fill="#FFF8EC" stroke="#BF4314" strokeWidth="2" />
    </>
  ),
};

function Batiment({ b }) {
  return (
    <Link to={b.to} className="group relative flex flex-col items-center rounded-3xl p-2 pt-3 transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" aria-label={`${b.nom} : ${b.quoi}${b.badge ? `, ${b.badge} en attente` : ""}`}>
      {/* L'enseigne : le nom en gros */}
      <span className="relative z-10 -mb-2 rounded-xl border-2 border-[#7A3E1D] bg-[#FFF8EC] px-3 py-1 text-[17px] sm:text-[20px] font-black leading-tight text-ink shadow-[0_3px_0_#7A3E1D] text-center" style={H}>{b.nom}</span>
      <span className="relative w-full max-w-[200px]">
        <svg viewBox="0 0 160 130" className="w-full drop-shadow-[0_6px_0_rgba(21,22,26,.08)]" aria-hidden>{ART[b.art]}<rect x="0" y="124" width="160" height="6" rx="3" fill="#C9C2B0" /></svg>
        {b.badge > 0 && <span className="absolute -right-1 top-2 grid h-8 min-w-8 place-items-center rounded-full bg-accent px-2 text-[15px] font-black text-white ring-4 ring-[#EAF2DF] animate-pulse" style={H}>{b.badge > 99 ? "99+" : b.badge}</span>}
        {b.alerte && <span className="absolute -right-1 top-2 grid h-8 w-8 place-items-center rounded-full bg-accent text-[17px] font-black text-white ring-4 ring-[#EAF2DF]" style={H}>!</span>}
      </span>
      <span className="mt-1 text-center text-[13.5px] font-semibold text-ink">{b.quoi}</span>
      {b.detail && <span className="text-center text-[12px] text-ink-soft">{b.detail}</span>}
    </Link>
  );
}

export default function Village() {
  const { ws } = useWs();
  const nav = useNavigate();
  const [d, setD] = useState(null);

  useEffect(() => {
    const c = (q) => q.then((r) => r.count ?? 0);
    const head = (t) => supabase.from(t).select("id", { count: "exact", head: true }).eq("workspace_id", ws.id);
    const now = new Date().toISOString(), w1 = new Date(Date.now() - 7 * 864e5).toISOString();
    Promise.all([
      c(head("replies").eq("handled", false)), c(head("messages").eq("status", "brouillon")),
      c(head("meetings").eq("status", "confirme").gte("starts_at", now)), c(head("radar_opps").eq("status", "nouveau")),
      c(head("prospects").eq("linkedin_status", "a_envoyer")), c(head("prospects").neq("contact_name", "").neq("status", "ignore")),
      c(head("prospects").neq("email", "").neq("status", "ignore")), c(head("competitors")),
      c(head("replies")), c(head("replies").in("class", ["interesse", "question", "prix", "rappel"])), c(head("meetings").neq("status", "annule")),
      c(head("prospects").neq("phone", "").neq("status", "ignore")), c(head("radar_opps").gte("created_at", w1)),
      c(head("messages").eq("status", "envoye").gte("sent_at", w1)), c(head("messages").eq("status", "envoye").eq("step", 0)),
    ]).then(([rep, drafts, rdv, opps, li, dec, mails, rivals, repTotal, hot, rdvTotal, tels, opps7, sent7, sentTotal]) => setD({ rep, drafts, rdv, opps, li, dec, mails, rivals, repTotal, hot, rdvTotal, tels, opps7, sent7, sentTotal })).catch(() => setD({}));
  }, [ws.id]);

  const boite = ws.domain_status === "verified" || !!ws.integrations?.mailbox?.ok;
  const reglage = !boite || !ws.postal_address;
  const v = d ?? {};
  const B = [
    { art: "poste", nom: "La Poste", quoi: "Tes réponses", to: "/reponses", badge: v.rep, detail: v.rep ? `${v.rep} prospect${v.rep > 1 ? "s" : ""} t'${v.rep > 1 ? "ont" : "a"} répondu` : "" },
    { art: "atelier", nom: "L'Atelier", quoi: "Messages à valider", to: "/valider", badge: v.drafts, detail: v.drafts ? "Bingoo! les a écrits pour toi" : "" },
    { art: "rdv", nom: "Les Rendez-vous", quoi: "Tes rendez-vous", to: "/agenda", badge: v.rdv, detail: v.rdv ? `${v.rdv} à venir` : "" },
    { art: "annuaire", nom: "L'Annuaire", quoi: "Tes contacts", to: "/prospects", detail: d ? `${v.dec ?? 0} décideur${v.dec > 1 ? "s" : ""} · ${v.mails ?? 0} e-mail${v.mails > 1 ? "s" : ""}` : "" },
    { art: "radar", nom: "La Tour Radar", quoi: "Qui va acheter", to: "/radar", badge: v.opps, detail: v.opps ? "Entreprises repérées" : "" },
    { art: "espion", nom: "L'Espion", quoi: "Tes concurrents", to: "/espion", detail: d ? (v.rivals ? `${v.rivals} surveillé${v.rivals > 1 ? "s" : ""}` : "Aucun suivi pour l'instant") : "" },
    { art: "linkedin", nom: "Le Café LinkedIn", quoi: "Plus de contacts", to: "/linkedin", badge: v.li, detail: v.li ? "Invitations à valider" : "" },
    { art: "observatoire", nom: "L'Observatoire", quoi: "Tes résultats", to: "/resultats" },
    { art: "mairie", nom: "La Mairie", quoi: "Tes réglages", to: reglage ? (boite ? "/reglages" : "/connexions") : "/reglages", alerte: reglage, detail: reglage ? (!boite ? "Connecte ta boîte mail" : "Ajoute ton adresse") : "" },
  ];
  const n = (x) => (x ?? 0).toLocaleString("fr-FR");
  const STATS = {
    poste: [["À traiter", n(v.rep)], ["Réponses reçues", n(v.repTotal)], ["Intéressés", n(v.hot)]],
    atelier: [["Messages à valider", n(v.drafts)], ["Envoyés cette semaine", n(v.sent7)]],
    rdv: [["À venir", n(v.rdv)], ["Obtenus au total", n(v.rdvTotal)]],
    annuaire: [["Décideurs", n(v.dec)], ["E-mails", n(v.mails)], ["Téléphones", n(v.tels)]],
    radar: [["Nouvelles entreprises", n(v.opps)], ["Repérées cette semaine", n(v.opps7)]],
    espion: [["Concurrents surveillés", n(v.rivals)]],
    linkedin: [["Invitations à valider", n(v.li)]],
    observatoire: [["Entreprises contactées", n(v.sentTotal)], ["Taux de réponse", v.sentTotal ? `${Math.round(((v.repTotal ?? 0) / v.sentTotal) * 100)} %` : "–"], ["Rendez-vous", n(v.rdvTotal)]],
    mairie: [["Boîte mail", boite ? "connectée" : "à connecter"], ["Adresse légale", ws.postal_address ? "renseignée" : "à ajouter"]],
  };
  B.forEach((b) => { b.stats = STATS[b.art]; });
  // Ce que disent les agents : leurs vrais chiffres, rien d'inventé
  const pl = (x, a, b) => `${n(x)} ${x > 1 ? b : a}`;
  const paroles = {
    Iris: reglage ? (!boite ? "Connecte ta boîte mail à la Mairie !" : "Ajoute ton adresse à la Mairie !") : "Ta cible est prête, on travaille.",
    ...(v.dec ? { Léo: `J'ai trouvé ${pl(v.dec, "décideur", "décideurs")}` } : {}),
    ...(v.mails ? { Sam: `${pl(v.mails, "e-mail trouvé", "e-mails trouvés")}` } : {}),
    ...(v.opps ? { Max: `${pl(v.opps, "entreprise prête à acheter", "entreprises prêtes à acheter")}` } : {}),
    ...(v.drafts ? { Hugo: `${pl(v.drafts, "message prêt", "messages prêts")} à valider à l'Atelier` } : {}),
    ...(v.rep ? { Inès: `${pl(v.rep, "réponse", "réponses")} à lire à la Poste !` } : {}),
    ...(v.li ? { Lina: `${pl(v.li, "invitation LinkedIn", "invitations LinkedIn")} à valider` } : {}),
    ...(v.rdv ? { Paul: `${pl(v.rdv, "rendez-vous", "rendez-vous")} à venir` } : {}),
    ...(v.rivals ? { Oscar: `${pl(v.rivals, "concurrent surveillé", "concurrents surveillés")}` } : {}),
  };
  // Le panneau : un seul endroit où aller d'abord
  const next = reglage ? { b: B[8], t: !boite ? "Va à la Mairie : connecte ta boîte mail pour que tes messages puissent partir." : "Va à la Mairie : ajoute l'adresse de ton entreprise (obligatoire en bas des e-mails)." }
    : v.rep ? { b: B[0], t: `Va à la Poste : ${v.rep} prospect${v.rep > 1 ? "s t'ont" : " t'a"} répondu, une réponse est prête.` }
    : v.drafts ? { b: B[1], t: `Va à l'Atelier : ${v.drafts} message${v.drafts > 1 ? "s" : ""} à valider, un clic chacun.` }
    : v.opps ? { b: B[4], t: `Passe à la Tour Radar : ${v.opps} entreprise${v.opps > 1 ? "s" : ""} prête${v.opps > 1 ? "s" : ""} à acheter.` }
    : null;
  const first = (ws.sender_name || "").split(" ")[0];

  // Arrivée : on descend du ciel à travers les nuages jusqu'à sa ville (une fois par visite, et jamais si l'on préfère moins d'animations)
  const [intro, setIntro] = useState(() => {
    try { if (sessionStorage.getItem("bingoo-intro") || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false; } catch { return false; }
    return true;
  });
  useEffect(() => {
    if (!intro) return;
    try { sessionStorage.setItem("bingoo-intro", "1"); } catch { /* rien */ }
    const t = setTimeout(() => setIntro(false), 3400);
    return () => clearTimeout(t);
  }, [intro]);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 45%, #FFF8F1 0%, #FBEFE4 55%, #F6E6D8 100%)" }}>
      {/* Nuages du décor */}
      {[["8%", "14%", 1], ["78%", "11%", 0.9], ["58%", "4%", 0.6]].map(([l, t, k], n) => (
        <svg key={n} aria-hidden viewBox="0 0 120 50" className="pointer-events-none absolute opacity-90" style={{ left: l, top: t, width: `${160 * k}px` }}><path d="M18 44h86a14 14 0 0 0 0-28 22 22 0 0 0-41-6 16 16 0 0 0-29 8A13 13 0 0 0 18 44z" fill="#fff" /></svg>
      ))}
      <style>{`
        @keyframes bv-descente { 0% { transform: scale(.35) translateY(-8%); opacity: 0; filter: blur(6px) } 45% { opacity: 1; filter: blur(2px) } 100% { transform: none; opacity: 1; filter: none } }
        @keyframes bv-ciel { 0% { opacity: 1 } 70% { opacity: 1 } 100% { opacity: 0; visibility: hidden } }
        @keyframes bv-nuage { 0% { transform: translate(var(--x), 40vh) scale(.6); opacity: 0 } 20% { opacity: .95 } 100% { transform: translate(calc(var(--x) * 2.4), -70vh) scale(2.6); opacity: 0 } }
        @keyframes bv-ui { 0%, 75% { opacity: 0; transform: translateY(-8px) } 100% { opacity: 1; transform: none } }
      `}</style>

      {/* La ville, plein écran */}
      <div style={intro ? { animation: "bv-descente 3.2s cubic-bezier(.2,.7,.2,1) both" } : undefined}>
        <IsoVille batiments={B} paroles={d ? paroles : {}} full />
      </div>

      {/* Le ciel et les nuages qu'on traverse */}
      {intro && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-40" style={{ animation: "bv-ciel 3.2s ease-in both", background: "linear-gradient(#8EC5FF 0%, #CFE6FF 55%, rgba(239,236,228,0) 100%)" }}>
          {Array.from({ length: 14 }, (_, k) => (
            <span key={k} className="absolute left-1/2 top-1/2 rounded-full bg-white" style={{ "--x": `${((k * 37) % 100) - 50}vw`, width: `${30 + (k % 5) * 12}vw`, height: `${12 + (k % 4) * 6}vw`, marginLeft: "-15vw", filter: "blur(18px)", animation: `bv-nuage ${1.6 + (k % 4) * 0.35}s ${(k % 7) * 0.12}s ease-in both` }} />
          ))}
          <p className="absolute inset-x-0 top-[38%] text-center text-[34px] sm:text-[52px] font-black text-white drop-shadow-[0_4px_18px_rgba(47,74,110,.5)]" style={H}>Bingoo!-ville{first ? `, ${first}` : ""}</p>
          <button onClick={() => setIntro(false)} className="pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-4 py-2 text-[13px] font-semibold text-ink">Passer</button>
        </div>
      )}

      {/* Par-dessus la ville : le prochain geste, en haut */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-20 flex justify-center pl-[84px] pr-4 sm:px-24" style={intro ? { animation: "bv-ui 3.6s both" } : undefined}>
        <button onClick={() => next && nav(next.b.to)} disabled={!next} className={cx("pointer-events-auto relative flex max-w-[820px] items-center gap-2.5 sm:gap-4 rounded-[22px] sm:rounded-[28px] border-2 bg-white py-2 pl-2 pr-3 sm:py-3 sm:pl-3 sm:pr-5 text-left shadow-[0_14px_34px_-18px_rgba(232,105,43,.55)] transition hover:bg-white", next ? "border-[#F5A06A]" : "border-[#F1E2D2]")}>
          <span className="grid h-9 w-9 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#FF8A3D] to-[#E8571C] text-white shadow-[0_6px_14px_-6px_rgba(232,87,28,.8)]"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{next ? <path d="M5 12h14M13 6l6 6-6 6" /> : <path d="m5 12.5 4.5 4.5L19 7.5" />}</svg></span>
          <span className="hidden sm:block h-9 w-px bg-[#F1E2D2]" aria-hidden />
          {next && <svg viewBox="0 0 24 24" className="order-last h-5 w-5 shrink-0 text-ink" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="m9 6 6 6-6 6" /></svg>}
          <svg viewBox="0 0 30 24" className="absolute -right-7 -top-4 hidden sm:block h-6 w-8 text-[#F26A21]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden><path d="M6 14l-3-8M14 10l1-8M21 14l6-5" /></svg>
          <span className="min-w-0 flex-1">
            <span className="block text-[11.5px] sm:text-[13px] font-bold text-[#F26A21]">{next ? "Prochaine étape" : `Tout est fait${first ? `, ${first}` : ""}`}</span>
            <span className="block text-[13px] sm:text-[17px] font-bold text-ink leading-snug">{next ? next.t : "Bingoo! cherche, écrit et relance pour toi. Reviens demain matin."}</span>
          </span>
        </button>
      </div>

      {/* En bas : comment ça marche, et la nuit rejouée */}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex justify-center px-4" style={intro ? { animation: "bv-ui 3.6s both" } : undefined}>
        <div className="pointer-events-auto flex items-center gap-3 rounded-[24px] bg-white p-2 sm:pl-5 shadow-[0_12px_30px_-16px_rgba(122,74,42,.5)]">
          <svg viewBox="0 0 24 24" className="hidden sm:block h-5 w-5 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><rect x="7" y="3" width="10" height="18" rx="5" /><path d="M12 7v3" /></svg>
          <p className="hidden sm:block text-[14px] italic text-ink-soft">Survole un bâtiment pour ses chiffres · clique pour entrer · glisse pour te déplacer</p>
          <span className="hidden sm:block h-7 w-px bg-[#F1E2D2]" aria-hidden />
          <a href="/qg/" className="flex items-center gap-2 rounded-[18px] bg-[#1E1E24] px-5 py-3 text-[14.5px] font-semibold text-white hover:bg-black"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /><path d="M17 3v3M15.5 4.5h3" /></svg>La nuit de ton équipe</a>
        </div>
      </div>
    </div>
  );
}
