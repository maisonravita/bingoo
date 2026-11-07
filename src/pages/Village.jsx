import { estSimple } from "../lib/lieu";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";
import IsoVille, { QUARTIER, QUARTIERS } from "../components/IsoVille";
import { LieuContext } from "../lib/lieu";
import { estMobile, trace } from "../lib/usage";
import Review from "./Review";
import Prospects from "./Prospects";
import LinkedIn from "./LinkedIn";
import Settings from "./Settings";
import Replies from "./Replies";
import Agenda from "./Agenda";
import Results from "./Results";
import Connexions from "./Connexions";
import Radar from "./Radar";
import Espion from "./EspionHub";

const PICTO = {
  rdv: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", annuaire: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 11a3 3 0 1 0 0-6M17 14c2.4.6 4 2.9 4 6",
  poste: "M3 6h18v12H3zM3 6l9 7 9-7", atelier: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-2.4z",
  radar: "M10 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14",
  observatoire: "M4 14l12-6 2 4-12 6zM16 8l2-1 2 4-2 1M8 17l-2 4M10 16l2 5", linkedin: "M4 4h16v16H4zM8 10v6M8 7v.01M12 16v-6M12 13a3 3 0 0 1 6 0v3",
  espion: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0", mairie: "M3 21h18M5 21V10M19 21V10M9 21v-7M15 21v-7M2 10l10-6 10 6z",
};
const Icone = ({ art }) => <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={PICTO[art] ?? ""} /></svg>;

// « La nuit de ton équipe » rejouée : uniquement le journal réel des actions (table activity), regroupé par métier
const NUIT = {
  recherche: ["annuaire", "Léo", "recherches d'entreprises"], prospect: ["annuaire", "Léo", "fiches ajoutées"],
  enquete: ["annuaire", "Sam", "enquêtes sur des entreprises"], enquete_plus: ["annuaire", "Sam", "e-mails cherchés"], contacts: ["annuaire", "Sam", "recherches de décideurs"], contacts_auto: ["annuaire", "Sam", "recherches de décideurs"], credit_email: ["annuaire", "Sam", "e-mails débloqués"],
  radar_scan: ["radar", "Max", "passages du Radar"], radar: ["radar", "Max", "entreprises ajoutées depuis le Radar"], radar_alerte: ["radar", "Max", "alertes du Radar"],
  redaction: ["atelier", "Hugo", "e-mails rédigés"], envoi: ["poste", "Inès", "envois"], reponse: ["poste", "Inès", "réponses triées"],
  rdv: ["rdv", "Paul", "rendez-vous"], linkedin: ["linkedin", "Lina", "actions LinkedIn préparées"],
  espion: ["espion", "Oscar", "mises à jour de l'Espion"], veille: ["espion", "Oscar", "rapports de veille"], espion_lourd: ["espion", "Oscar", "recherches de concurrents"], espion_alerte: ["espion", "Oscar", "alertes de l'Espion"],
  ciblage: ["observatoire", "Iris", "ajustements de tes cibles"],
};
const heure = (d) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

// Ce qu'on fait dans chaque bâtiment, en une phrase simple
const AIDE = {
  poste: "Tes messages envoyés et les réponses de tes prospects", atelier: "Tes opportunités : pourquoi maintenant, à qui, et le message prêt",
  rdv: "Tes rendez-vous et la fiche pour les préparer", annuaire: "Toutes les entreprises trouvées et leurs décideurs",
  radar: "Les entreprises à contacter au bon moment, et pourquoi", espion: "Ce que font tes concurrents, et comment les battre",
  linkedin: "Les invitations LinkedIn à envoyer toi-même", observatoire: "Ce qui marche : réponses, rendez-vous, cibles",
  mairie: "Ta boîte mail, ton entreprise et tes réglages",
};

// Ce qu'on voit en entrant dans un bâtiment : la vraie page, dans un panneau par-dessus la ville
const INTERIEUR = { "/reponses": Replies, "/valider": Review, "/agenda": Agenda, "/prospects": Prospects, "/radar": Radar, "/espion": Espion, "/linkedin": LinkedIn, "/resultats": Results, "/reglages": Settings, "/connexions": Connexions };

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

/** Cette semaine contre la semaine dernière, et la barre vers le prochain palier. */
function Semaine({ semaine, prochain }) {
  const ecart = (a = 0, b = 0) => (a === b ? "=" : a > b ? `+${a - b}` : `${a - b}`);
  const pl = (n, a, b) => (n > 1 ? b : a);
  return (
    <div className="mt-2 w-[260px] rounded-2xl bg-white px-3 py-2.5 text-[12.5px] shadow-[0_8px_20px_-12px_rgba(122,74,42,.5)]">
      <p className="font-bold text-ink">Cette semaine</p>
      <ul className="mt-1 space-y-0.5">
        {semaine.map(([l, a, b]) => (
          <li key={l} className="flex items-baseline gap-2 tnum">
            <span className="w-7 text-right text-[15px] font-black text-ink">{a ?? 0}</span><span className="flex-1 text-ink-soft">{l}</span>
            <span className={cx("text-[11.5px] font-bold", (a ?? 0) > (b ?? 0) ? "text-good" : (a ?? 0) < (b ?? 0) ? "text-[#C2410C]" : "text-ink-faint")} title="par rapport à la semaine dernière">{ecart(a, b)}</span>
          </li>
        ))}
      </ul>
      {prochain && (() => {
        const [, t, , n = 0, seuil, un, plusieurs] = prochain, depart = seuil >= 10 ? Math.floor(seuil / 2) : seuil > 1 ? 1 : 0;
        const pct = Math.max(4, Math.min(100, Math.round(((n - depart) / Math.max(1, seuil - depart)) * 100)));
        return (
          <div className="mt-2 border-t border-[#F1E2D2] pt-2">
            <p className="text-ink-soft">Prochain palier : <span className="font-semibold text-ink">{t}</span></p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F3E7DA]"><div className="h-full rounded-full bg-[#F26A21]" style={{ width: `${pct}%` }} /></div>
            <p className="mt-0.5 text-[11.5px] text-ink-faint tnum">encore {seuil - n} {pl(seuil - n, un, plusieurs)}</p>
          </div>
        );
      })()}
    </div>
  );
}

export default function Village() {
  const { ws } = useWs();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  // Les rendez-vous d'aujourd'hui (pour « Ton matin »)
  const [rdvJour, setRdvJour] = useState([]);
  useEffect(() => {
    const fin = new Date(); fin.setHours(23, 59, 59, 999);
    supabase.from("meetings").select("id, starts_at, company, contact_name").eq("workspace_id", ws.id).eq("status", "confirme").gte("starts_at", new Date().toISOString()).lte("starts_at", fin.toISOString()).order("starts_at").limit(5)
      .then(({ data }) => setRdvJour(data ?? []));
  }, [ws.id]);

  // Tous les compteurs en une seule requête (fonction « compteurs » côté base)
  useEffect(() => {
    supabase.rpc("compteurs", { p_ws: ws.id }).then(({ data, error }) => setD(error || !data ? {} : data), () => setD({}));
  }, [ws.id]);

  const boite = ws.domain_status === "verified" || !!ws.integrations?.mailbox?.ok;
  const simple = estSimple(ws);
  const reglage = !boite || !ws.postal_address;
  const v = d ?? {};
  const B = [
    { art: "poste", nom: "Réponses", quoi: "Envoyés et réponses", to: "/reponses", badge: v.rep, detail: v.rep ? `${v.rep} prospect${v.rep > 1 ? "s" : ""} t'${v.rep > 1 ? "ont" : "a"} répondu` : "" },
    { art: "atelier", nom: "Messages à envoyer", quoi: "Prêts, un clic chacun", to: "/valider", badge: v.drafts, detail: v.drafts ? "Pourquoi maintenant, à qui, message prêt" : "" },
    { art: "rdv", nom: "Rendez-vous", quoi: "Tes rendez-vous", to: "/agenda", badge: v.rdv, detail: v.rdv ? `${v.rdv} à venir` : "" },
    { art: "annuaire", nom: "Entreprises", quoi: "Tes contacts", to: "/prospects", detail: d ? `${v.dec ?? 0} décideur${v.dec > 1 ? "s" : ""} · ${v.mails ?? 0} e-mail${v.mails > 1 ? "s" : ""}` : "" },
    { art: "radar", nom: "Opportunités", quoi: "Le bon moment", to: "/radar", badge: v.opps, detail: v.opps ? "Entreprises repérées" : "" },
    // Mode simple : Espion et Café LinkedIn restent dans le décor, fermés ; on les ouvre à la Mairie (outils avancés)
    simple ? { art: "espion", nom: "Concurrents", quoi: "Outil avancé", to: "/espion", ferme: true, detail: "À activer dans Réglages" }
      : { art: "espion", nom: "Concurrents", quoi: "Tes concurrents", to: "/espion", detail: d ? (v.rivals ? `${v.rivals} surveillé${v.rivals > 1 ? "s" : ""}` : "Aucun suivi pour l'instant") : "" },
    simple ? { art: "linkedin", nom: "LinkedIn", quoi: "Outil avancé", to: "/linkedin", ferme: true, detail: "À activer dans Réglages" }
      : { art: "linkedin", nom: "LinkedIn", quoi: "Plus de contacts", to: "/linkedin", badge: v.li, detail: v.li ? "Invitations à valider" : "" },
    { art: "observatoire", nom: "Résultats", quoi: "Tes résultats", to: "/resultats" },
    { art: "mairie", nom: "Réglages", quoi: "Tes réglages", to: reglage ? (boite ? "/reglages" : "/connexions") : "/reglages", alerte: reglage, detail: reglage ? (!boite ? "Connecte ta boîte mail" : "Ajoute ton adresse") : "" },
  ];
  const n = (x) => (x ?? 0).toLocaleString("fr-FR");
  const STATS = {
    poste: [["Réponses à traiter", n(v.rep)], ["Messages envoyés", n(v.sentAll)], ["Réponses reçues", n(v.repTotal)], ["Intéressés", n(v.hot)]],
    atelier: [["Opportunités prêtes", n(v.drafts)], ["Envoyés cette semaine", n(v.sent7)]],
    rdv: [["À venir", n(v.rdv)], ["Obtenus au total", n(v.rdvTotal)]],
    annuaire: [["Décideurs", n(v.dec)], ["E-mails", n(v.mails)], ["Téléphones", n(v.tels)]],
    radar: [["À contacter", n(v.opps)], ["Dont chaudes (75+)", n(v.chaudes)], ["Repérées cette semaine", n(v.opps7)]],
    espion: [["Concurrents surveillés", n(v.rivals)]],
    linkedin: [["Invitations à valider", n(v.li)]],
    observatoire: [["Entreprises contactées", n(v.sentTotal)], ["Taux de réponse", v.sentTotal ? `${Math.round(((v.repTotal ?? 0) / v.sentTotal) * 100)} %` : "–"], ["Rendez-vous", n(v.rdvTotal)]],
    mairie: [["Boîte mail", boite ? "connectée" : "à connecter"], ["Adresse légale", ws.postal_address ? "renseignée" : "à ajouter"]],
  };
  B.forEach((b) => { b.stats = STATS[b.art]; });
  // Ce que disent les agents : leurs vrais chiffres, rien d'inventé
  const pl = (x, a, b) => `${n(x)} ${x > 1 ? b : a}`;
  const paroles = {
    Iris: reglage ? (!boite ? "Connecte ta boîte mail dans Réglages !" : "Ajoute ton adresse dans Réglages !") : "Ta cible est prête, on travaille.",
    ...(v.dec ? { Léo: `J'ai trouvé ${pl(v.dec, "décideur", "décideurs")}` } : {}),
    ...(v.mails ? { Sam: `${pl(v.mails, "e-mail trouvé", "e-mails trouvés")}` } : {}),
    ...(v.opps ? { Max: `${pl(v.opps, "entreprise à contacter au bon moment", "entreprises à contacter au bon moment")}` } : {}),
    ...(v.drafts ? { Hugo: `${pl(v.drafts, "opportunité prête", "opportunités prêtes")} à envoyer` } : {}),
    ...(v.rep ? { Inès: `${pl(v.rep, "réponse", "réponses")} à lire !` } : {}),
    ...(v.li ? { Lina: `${pl(v.li, "invitation LinkedIn", "invitations LinkedIn")} à valider` } : {}),
    ...(v.rdv ? { Paul: `${pl(v.rdv, "rendez-vous", "rendez-vous")} à venir` } : {}),
    ...(v.rivals ? { Oscar: `${pl(v.rivals, "concurrent surveillé", "concurrents surveillés")}` } : {}),
  };
  // Le panneau : un seul endroit où aller d'abord
  const next = reglage ? { b: B[8], t: !boite ? "Va dans Réglages : connecte ta boîte mail pour que tes messages puissent partir." : "Va dans Réglages : ajoute l'adresse de ton entreprise (obligatoire en bas des e-mails)." }
    : v.rep ? { b: B[0], t: `Va dans Réponses : ${v.rep} prospect${v.rep > 1 ? "s t'ont" : " t'a"} répondu, une réponse est prête.` }
    : v.drafts ? { b: B[1], t: `Va dans Messages à envoyer : ${v.drafts} opportunité${v.drafts > 1 ? "s" : ""} prête${v.drafts > 1 ? "s" : ""}, un clic chacune.` }
    : v.opps ? { b: B.find((b) => b.art === "radar"), t: `Passe dans Opportunités : ${v.opps} entreprise${v.opps > 1 ? "s" : ""} à contacter au bon moment${v.chaudes ? `, dont ${v.chaudes} chaude${v.chaudes > 1 ? "s" : ""}` : ""}.` }
    : null;
  const first = (ws.sender_name || "").split(" ")[0];
  // Le bâtiment ouvert (?lieu=radar) : le bouton « retour » du navigateur ressort dans la ville
  const [sp, setSp] = useSearchParams();
  const lieu = B.find((b) => b.art === sp.get("lieu")) ?? null;
  const Page = lieu ? INTERIEUR[lieu.to] : null;
  const [grand, setGrand] = useState(false);
  const ouvre = (b) => { if (b.ferme) { setSp({ lieu: "mairie" }); return; } if (!INTERIEUR[b.to]) { nav(b.to); return; } setSp({ lieu: b.art }); };
  // Mesure : vue, bâtiment ouvert, et hésitation (un bâtiment quitté en moins de 5 s pour un autre)
  useEffect(() => { trace(ws.id, "vue", `village${estMobile() ? " mobile" : ""}`); }, [ws.id]);
  const ouvertA = useRef({ art: null, t: 0 });
  useEffect(() => {
    if (!lieu) { ouvertA.current = { art: null, t: 0 }; return; }
    const avant = ouvertA.current;
    if (avant.art && avant.art !== lieu.art && Date.now() - avant.t < 5000 && !serie) trace(ws.id, "hesitation", `${avant.art}>${lieu.art}`);
    trace(ws.id, "lieu", lieu.art);
    ouvertA.current = { art: lieu.art, t: Date.now() };
  }, [lieu?.art]); // eslint-disable-line react-hooks/exhaustive-deps
  const ferme = () => { setSerie((x) => (x && !x.fin ? null : x)); if (window.history.state?.idx > 0) window.history.back(); else setSp({}, { replace: true }); };
  useEffect(() => {
    if (!lieu) return;
    const k = (e) => { if (e.key === "Escape") ferme(); };
    window.addEventListener("keydown", k); document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [lieu?.art]); // eslint-disable-line react-hooks/exhaustive-deps
  // La flèche qui relie le panneau au bâtiment visé
  const [pin, setPin] = useState(null);
  // La nuit rejouée (20 secondes) : étapes construites depuis le journal, la caméra va de bâtiment en bâtiment
  const [nuit, setNuit] = useState(null);
  const rejouer = async () => {
    const depuis = new Date(); depuis.setHours(depuis.getHours() < 12 ? -5 : 19, 0, 0, 0); // depuis 19 h la veille (ou ce soir)
    if (depuis > new Date()) depuis.setDate(depuis.getDate() - 1);
    const { data } = await supabase.from("activity").select("kind, summary, created_at").eq("workspace_id", ws.id).gte("created_at", depuis.toISOString()).order("created_at").limit(500);
    const groupes = [];
    for (const a of data ?? []) {
      const m = NUIT[a.kind]; if (!m) continue;
      const g = groupes.find((x) => x.kind === a.kind);
      if (g) { g.n++; g.fin = a.created_at; } else groupes.push({ kind: a.kind, art: m[0], agent: m[1], lib: m[2], n: 1, ex: a.summary, debut: a.created_at, fin: a.created_at });
    }
    const steps = groupes.slice(0, 8).map((g) => ({ ...g, texte: g.n === 1 ? g.ex : `${g.n} ${g.lib}`, detail: g.n === 1 ? "" : g.ex }));
    setNuit({ steps, i: 0, total: (data ?? []).length, depuis: depuis.toISOString() });
  };
  useEffect(() => {
    if (!nuit || nuit.i >= nuit.steps.length) return;
    const t = setTimeout(() => setNuit((x) => x && { ...x, i: x.i + 1 }), 2500);
    return () => clearTimeout(t);
  }, [nuit?.i, nuit?.steps.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const etape = nuit?.steps[nuit.i] ?? null;

  // « Ton matin » : le travail du jour en une carte, et « Tout traiter » qui l'enchaîne bâtiment par bâtiment
  const cleMatin = `bingoo-matin-${ws.id}`, auj = new Date().toDateString();
  const [matinVu, setMatinVu] = useState(() => { try { return localStorage.getItem(cleMatin) === auj; } catch { return false; } });
  const finirMatin = () => { try { localStorage.setItem(cleMatin, auj); } catch { /* rien */ } setMatinVu(true); };
  const travaux = d ? [
    v.drafts > 0 && { art: "atelier", texte: `${v.drafts} opportunité${v.drafts > 1 ? "s" : ""} prête${v.drafts > 1 ? "s" : ""}`, faire: "Lis pourquoi maintenant, puis envoie (V) ou passe (P)", min: Math.ceil(v.drafts * 0.4) },
    v.rep > 0 && { art: "poste", texte: `${v.rep} réponse${v.rep > 1 ? "s" : ""} à lire`, faire: "Une réponse est déjà prête : relis-la et envoie", min: v.rep },
    rdvJour.length > 0 && { art: "rdv", texte: `${rdvJour.length} rendez-vous aujourd'hui, dès ${heure(rdvJour[0].starts_at)}`, faire: "Lis la fiche de préparation", min: rdvJour.length },
    (v.chaudes ?? 0) > 0 && { art: "radar", texte: `${v.chaudes} entreprise${v.chaudes > 1 ? "s" : ""} chaude${v.chaudes > 1 ? "s" : ""} au Radar`, faire: "Prépare un message pour les plus chaudes", min: 2 },
  ].filter(Boolean) : [];
  const minutes = travaux.reduce((t, x) => t + x.min, 0);
  const [serie, setSerie] = useState(null); // { i, fin: bool }
  const lancerSerie = () => { trace(ws.id, "serie", "debut"); finirMatin(); setSerie({ i: 0 }); setSp({ lieu: travaux[0].art }); };
  // « Tout traiter » est le chemin principal : lancé depuis la liste, le téléphone ou l'e-mail du matin (?serie=1)
  useEffect(() => {
    if (sp.get("serie") === "1" && d && !serie) { if (travaux.length) lancerSerie(); else setSp({}, { replace: true }); }
  }, [d, sp.get("serie")]); // eslint-disable-line react-hooks/exhaustive-deps
  const suivante = () => {
    if (!serie) return;
    const i = serie.i + 1;
    if (i >= travaux.length) { trace(ws.id, "serie", "fin"); setSerie({ i, fin: true }); setSp({}, { replace: true }); return; }
    setSerie({ i }); setSp({ lieu: travaux[i].art }, { replace: true });
  };
  // La ville grandit avec les vrais résultats
  // Paliers : les grands (qui changent la ville) et les intermédiaires (pour voir avancer chaque semaine)
  const PALIERS = [
    ["envoye", "Premier message envoyé", "un drapeau sur Réponses", v.sentAll, 1, "message envoyé", "messages envoyés"],
    ["envoye25", "25 messages envoyés", "", v.sentAll, 25, "message envoyé", "messages envoyés"],
    ["reponse", "Première réponse", "des ballons devant Réponses", v.repTotal, 1, "réponse", "réponses"],
    ["reponse5", "5 réponses", "", v.repTotal, 5, "réponse", "réponses"],
    ["rdv", "Premier rendez-vous", "une étoile sur les Rendez-vous", v.rdvTotal, 1, "rendez-vous", "rendez-vous"],
    ["rdv3", "3 rendez-vous", "", v.rdvTotal, 3, "rendez-vous", "rendez-vous"],
    ["client", "Premier client signé", "une fontaine devant Réglages", v.clients, 1, "client", "clients"],
    ["rdv10", "10 rendez-vous", "un trophée sur Résultats", v.rdvTotal, 10, "rendez-vous", "rendez-vous"],
  ];
  const progres = Object.fromEntries(PALIERS.map(([k, , , n, seuil]) => [k, (n ?? 0) >= seuil]));
  const prochain = PALIERS.find(([k]) => !progres[k]);
  // Cette semaine contre la semaine dernière ; le rythme des agents suit l'activité réelle
  const semaine = [["envoyés", v.sent7, v.sentPrev], ["réponses", v.rep7, v.repPrev], ["rendez-vous", v.rdv7, v.rdvPrev]];
  const rythme = Math.min(1, ((v.sent7 ?? 0) + 5 * (v.rep7 ?? 0) + 20 * (v.rdv7 ?? 0)) / 60);
  const [voirPaliers, setVoirPaliers] = useState(false);
  const panneau = useRef(null);
  const [fl, setFl] = useState(null);
  useEffect(() => {
    const el = panneau.current;
    if (!pin || !el || window.innerWidth < 900) { setFl(null); return; }
    const r = el.getBoundingClientRect(), x0 = r.right, y0 = r.top + r.height / 2;
    if (pin.y < r.bottom + 30) { setFl(null); return; }
    const x1 = pin.x, y1 = pin.y - 6;
    // Seulement quand le bâtiment est sur le côté : la flèche contourne le panneau sans traverser la ville
    if (x1 > r.right - 40) setFl(`M${x0 + 4} ${y0} H${Math.max(x0 + 8, x1 - 34)} Q${x1} ${y0} ${x1} ${y0 + 34} V${y1}`);
    else if (x1 < r.left + 40) setFl(`M${r.left - 4} ${y0} H${Math.min(r.left - 8, x1 + 34)} Q${x1} ${y0} ${x1} ${y0 + 34} V${y1}`);
    else setFl(null);
  }, [pin]);

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
        <IsoVille batiments={B} paroles={d ? paroles : {}} full cible={lieu ? null : next?.b.art} onCible={setPin} onOuvre={ouvre} focus={lieu?.art ?? etape?.art ?? null} progres={d ? progres : null} rythme={rythme} />
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

      {fl && !lieu && <svg aria-hidden className="pointer-events-none fixed inset-0 z-10 h-full w-full" style={intro ? { animation: "bv-ui 3.6s both" } : undefined}>
        <path d={fl} fill="none" stroke="#F26A21" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {(() => { const m = fl.match(/(-?[\d.]+)\s*$/), x = pin.x, y = Number(m?.[1] ?? pin.y); return <><path d={`M${x - 8} ${y - 10} L${x} ${y} L${x + 8} ${y - 10}`} fill="none" stroke="#F26A21" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /><path d={`M${x - 34} ${y - 22} l-6 -7 M${x - 24} ${y - 30} l-2 -9`} stroke="#F26A21" strokeWidth="2.6" strokeLinecap="round" /></>; })()}
      </svg>}

      {/* Le logo, à côté du menu */}
      {!lieu && <p className="pointer-events-none fixed left-[76px] top-[22px] sm:left-[100px] sm:top-[30px] z-20 hidden sm:block text-[30px] font-black tracking-tight text-[#3A2416]" style={{ ...H, animation: intro ? "bv-ui 3.6s both" : undefined }}>Bingoo<span className="italic text-[#F26A21]">!</span></p>}

      {/* Ta ville grandit : les paliers atteints, avec ce qui est apparu dans la ville */}
      {d && !lieu && !nuit && (
        <div className="fixed left-4 top-[84px] sm:left-6 sm:top-[96px] z-20" style={intro ? { animation: "bv-ui 3.6s both" } : undefined}>
          <button onClick={() => setVoirPaliers((x) => !x)} aria-expanded={voirPaliers} className="flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 text-[13px] font-semibold text-ink shadow-[0_8px_20px_-12px_rgba(122,74,42,.5)] hover:bg-white">
            <span className="flex gap-0.5">{PALIERS.map(([k]) => <span key={k} className={cx("h-2 w-2 rounded-full", progres[k] ? "bg-[#F26A21]" : "bg-[#EADCCD]")} />)}</span>
            <span className="text-left leading-tight">Ta ville grandit<span className="block text-[11.5px] font-normal text-ink-soft tnum">cette semaine : {v.sent7 ?? 0} envoyés{(v.sent7 ?? 0) !== (v.sentPrev ?? 0) && <span className={(v.sent7 ?? 0) > (v.sentPrev ?? 0) ? "text-good font-bold" : "text-[#C2410C] font-bold"}> ({(v.sent7 ?? 0) > (v.sentPrev ?? 0) ? "+" : ""}{(v.sent7 ?? 0) - (v.sentPrev ?? 0)})</span>}, {v.rep7 ?? 0} réponses</span></span>
          </button>
          {voirPaliers && <Semaine semaine={semaine} prochain={prochain} />}
          {voirPaliers && (
            <ul className="mt-2 w-[260px] rounded-2xl bg-white p-3 text-[13px] shadow-[0_14px_30px_-16px_rgba(122,74,42,.55)]">
              {PALIERS.map(([k, t, quoi, n, seuil]) => (
                <li key={k} className="flex gap-2 py-1">
                  <span className={cx("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-black", progres[k] ? "bg-[#F26A21] text-white" : "border border-[#EADCCD] text-transparent")}>✓</span>
                  <span><span className={progres[k] ? "font-semibold text-ink" : "text-ink-soft"}>{t}</span>{quoi ? <span className="block text-[12px] text-ink-faint">{progres[k] ? `Dans ta ville : ${quoi}` : `À venir : ${quoi}`}</span> : !progres[k] && <span className="block text-[12px] text-ink-faint tnum">{n ?? 0} sur {seuil}</span>}</span>
                </li>
              ))}
              <li className="mt-2 border-t border-[#F1E2D2] pt-2 text-[12px] text-ink-soft">Les quartiers, dans l'ordre du travail :
                {[1, 2, 3].map((k) => <span key={k} className="mt-1 flex items-center gap-2 font-semibold text-ink"><span className="grid h-4 w-4 place-items-center rounded-full text-[10px] font-black text-white" style={{ background: QUARTIERS[k].c }}>{k}</span>{QUARTIERS[k].nom}<span className="font-normal text-ink-faint">{k === 1 ? "Opportunités, Entreprises, Concurrents" : k === 2 ? "Messages, Réponses, LinkedIn" : "Rendez-vous, Résultats"}</span></span>)}
              </li>
            </ul>
          )}
        </div>
      )}

      {/* Par-dessus la ville : le prochain geste, en haut */}
      <div className="pointer-events-none fixed inset-x-0 top-4 sm:top-6 z-20 flex justify-center pl-[84px] pr-4 sm:pl-[230px] sm:pr-[110px]" style={lieu || nuit ? { display: "none" } : intro ? { animation: "bv-ui 3.6s both" } : undefined}>
        <button ref={panneau} onClick={() => (!reglage && travaux.length > 1 ? lancerSerie() : next && ouvre(next.b))} disabled={!next} className={cx("pointer-events-auto relative flex max-w-[820px] items-center gap-2.5 sm:gap-4 rounded-[22px] sm:rounded-[28px] border-2 bg-white py-2 pl-2 pr-3 sm:py-3 sm:pl-3 sm:pr-5 text-left shadow-[0_14px_34px_-18px_rgba(232,105,43,.55)] transition hover:bg-white", next ? "border-[#F5A06A]" : "border-[#F1E2D2]")}>
          <span className="grid h-9 w-9 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#FF8A3D] to-[#E8571C] text-white shadow-[0_6px_14px_-6px_rgba(232,87,28,.8)]"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{next ? <path d="M5 12h14M13 6l6 6-6 6" /> : <path d="m5 12.5 4.5 4.5L19 7.5" />}</svg></span>
          <span className="hidden sm:block h-9 w-px bg-[#F1E2D2]" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[11.5px] sm:text-[13px] font-bold text-[#F26A21]">{!reglage && travaux.length > 1 ? `Tout traiter · environ ${Math.max(2, minutes)} min` : next ? "Prochaine étape" : `Tout est fait${first ? `, ${first}` : ""}`}</span>
            <span className="block text-[13px] sm:text-[19px] font-bold text-ink leading-snug">{!reglage && travaux.length > 1 ? `${travaux.length} étapes : ${travaux.map((t) => B.find((x) => x.art === t.art)?.nom ?? t.art).join(", ")}. Je t'emmène de l'une à l'autre.` : next ? next.t : "Bingoo! cherche, écrit et relance pour toi. Reviens demain matin."}</span>
          </span>
        </button>
      </div>

      {/* En bas : la nuit rejouée */}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex justify-center px-4" style={lieu || nuit || serie || (d && travaux.length > 0 && !matinVu) ? { display: "none" } : intro ? { animation: "bv-ui 3.6s both" } : undefined}>
        <div className="pointer-events-auto flex items-center gap-3 rounded-[24px] bg-white p-2 shadow-[0_12px_30px_-16px_rgba(122,74,42,.5)]">
          <button onClick={rejouer} className="flex items-center gap-2 rounded-[18px] bg-[#1E1E24] px-5 py-3 text-[14.5px] font-semibold text-white hover:bg-black"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /><path d="M17 3v3M15.5 4.5h3" /></svg>La nuit de ton équipe</button>
        </div>
      </div>
      {/* Ton matin : le travail du jour, une seule carte, et un bouton qui l'enchaîne */}
      {d && travaux.length > 0 && !matinVu && !lieu && !nuit && !serie && (
        <div className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4" style={intro ? { animation: "bv-ui 3.6s both" } : undefined}>
          <div className="w-full max-w-[540px] rounded-[26px] bg-white p-5 shadow-[0_24px_60px_-24px_rgba(122,74,42,.6)]">
            <p className="text-[13px] font-bold text-[#F26A21]">Ton matin · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
            <p className="mt-0.5 text-[20px] font-black leading-tight text-ink" style={H}>{minutes <= 2 ? "2 minutes de travail aujourd'hui." : `Environ ${minutes} minutes de travail aujourd'hui.`}</p>
            <ul className="mt-3 space-y-1.5">{travaux.map((t) => {
              const b = B.find((x) => x.art === t.art);
              return <li key={t.art} className="flex items-center gap-2.5 text-[14.5px] text-ink"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-[#FFF1E6] text-[#E8571C] [&>svg]:h-4 [&>svg]:w-4"><Icone art={t.art} /></span><span className="flex-1">{t.texte}</span><span className="text-[12px] text-ink-faint">{b?.nom}</span></li>;
            })}</ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={lancerSerie} className="flex-1 rounded-2xl bg-gradient-to-br from-[#FF8A3D] to-[#E8571C] px-5 py-3 text-[15px] font-bold text-white shadow-[0_8px_18px_-8px_rgba(232,87,28,.8)] hover:brightness-105">Tout traiter (~{Math.max(2, minutes)} min)</button>
              <button onClick={finirMatin} className="rounded-2xl px-4 py-3 text-[14px] font-semibold text-ink-soft hover:bg-[#FFF3E8]">Plus tard</button>
            </div>
          </div>
        </div>
      )}

      {/* Fin de la série */}
      {serie?.fin && !lieu && (
        <div className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4">
          <div className="w-full max-w-[480px] rounded-[26px] bg-[#1E1E24] p-5 text-white shadow-[0_24px_60px_-24px_rgba(0,0,0,.6)] animate-[bv-fondu_.3s_ease-out_both]">
            <p className="text-[20px] font-black" style={H}>Fini pour aujourd'hui.</p>
            <p className="mt-1 text-[14px] text-white/70">Ton équipe reprend le relais : recherches, relances et nouveaux messages cette nuit. Reviens demain matin.</p>
            <button onClick={() => setSerie(null)} className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-[14px] font-semibold hover:bg-white/20">Voir ma ville</button>
          </div>
        </div>
      )}

      {/* La nuit rejouée : une carte par métier, seulement ce qui s'est vraiment passé */}
      {nuit && (
        <div className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4" role="status" aria-live="polite">
          <div className="w-full max-w-[560px] rounded-[24px] bg-[#1E1E24] p-4 sm:p-5 text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,.6)]">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg></span>
              <p className="flex-1 text-[13px] text-white/60">{etape ? `La nuit de ton équipe · ${nuit.i + 1}/${nuit.steps.length}` : "La nuit de ton équipe"}</p>
              <button onClick={() => setNuit(null)} className="rounded-xl px-3 py-1.5 text-[13px] font-semibold text-white/80 hover:bg-white/10">{etape ? "Passer" : "Fermer"}</button>
            </div>
            {etape ? (
              <div key={nuit.i} className="mt-3 animate-[bv-fondu_.3s_ease-out_both]">
                <p className="text-[12.5px] text-[#FDBA74]">{heure(etape.debut)}{etape.fin !== etape.debut ? ` – ${heure(etape.fin)}` : ""} · {etape.agent}</p>
                <p className="mt-0.5 text-[18px] font-bold leading-snug" style={H}>{etape.texte}</p>
                {etape.detail && <p className="mt-1 truncate text-[13px] text-white/60">Par exemple : {etape.detail}</p>}
                <div className="mt-3 flex gap-1">{nuit.steps.map((_, k) => <span key={k} className={cx("h-1 flex-1 rounded-full", k <= nuit.i ? "bg-[#F26A21]" : "bg-white/15")} />)}</div>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-[18px] font-bold" style={H}>{nuit.total ? `Depuis ${new Date(nuit.depuis).toDateString() === new Date().toDateString() ? "" : "hier "}${heure(nuit.depuis)}, ton équipe a fait ${nuit.total} action${nuit.total > 1 ? "s" : ""}.` : "Rien cette nuit : aucune action enregistrée depuis hier soir."}</p>
                <p className="mt-1 text-[13px] text-white/60">{nuit.total ? "Tout vient du journal réel de ton équipe : rien n'est inventé." : "Ton équipe travaille la nuit une fois tes cibles et ta boîte mail en place."}</p>
                <div className="mt-3 flex gap-2">
                  {nuit.steps.length > 0 && <button onClick={() => setNuit((x) => ({ ...x, i: 0 }))} className="rounded-xl bg-white/10 px-3.5 py-2 text-[13.5px] font-semibold hover:bg-white/20">Revoir</button>}
                  <a href="/qg/" className="rounded-xl bg-white/10 px-3.5 py-2 text-[13.5px] font-semibold hover:bg-white/20">Le détail heure par heure</a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* L'intérieur du bâtiment : la ville reste derrière, la vue a glissé dessus */}
      <style>{`
        @keyframes bv-entre { from { transform: translateX(40px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes bv-monte { from { transform: translateY(60px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes bv-fondu { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
      `}</style>
      {lieu && Page && (
        <>
          <button aria-label="Retour au village" onClick={ferme} className="fixed inset-0 z-30 cursor-zoom-out bg-[#3A2416]/[.06]" />
          <section role="dialog" aria-modal="true" aria-label={lieu.nom}
            className={cx("fixed z-40 flex flex-col overflow-hidden bg-[#FFFCF8] shadow-[0_30px_80px_-30px_rgba(122,74,42,.55)] transition-[top,width] duration-300",
              "inset-x-0 bottom-0 rounded-t-[28px] animate-[bv-monte_.35s_cubic-bezier(.2,.8,.2,1)_both]", grand ? "top-3" : "top-[22vh]",
              "md:inset-auto md:right-4 md:top-4 md:bottom-4 md:rounded-[28px] md:animate-[bv-entre_.35s_cubic-bezier(.2,.8,.2,1)_both]", grand ? "md:w-[calc(100vw-32px)]" : "md:w-[min(760px,calc(100vw-440px))] md:min-w-[520px]")}>
            {/* Poignée (téléphone) : agrandir ou réduire */}
            <div className="md:hidden shrink-0 bg-white pt-2"><button onClick={() => setGrand((g) => !g)} aria-label={grand ? "Réduire le panneau" : "Agrandir le panneau"} className="mx-auto block h-1.5 w-12 rounded-full bg-[#E3D3C2]" /></div>
            {serie && !serie.fin && travaux[serie.i] && (
              <div className="shrink-0 bg-[#1E1E24] px-4 py-2.5 text-white sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="text-[12.5px] text-white/60 tnum">Tout traiter · {serie.i + 1}/{travaux.length}</span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{travaux[serie.i].faire}</span>
                  <button onClick={suivante} className="shrink-0 rounded-xl bg-[#F26A21] px-3.5 py-1.5 text-[13.5px] font-bold hover:brightness-110">{serie.i + 1 < travaux.length ? "Étape suivante →" : "Terminer ✓"}</button>
                </div>
                <div className="mt-2 flex gap-1">{travaux.map((_, k) => <span key={k} className={cx("h-1 flex-1 rounded-full", k <= serie.i ? "bg-[#F26A21]" : "bg-white/15")} />)}</div>
              </div>
            )}
            <header className="shrink-0 bg-white px-4 pt-3 sm:px-6 sm:pt-4">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#FF8A3D] to-[#E8571C] text-white shadow-[0_6px_14px_-6px_rgba(232,87,28,.8)]"><Icone art={lieu.art} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[21px] sm:text-[24px] font-black leading-tight text-ink" style={H}>{lieu.nom}</span>
                  <span className="block truncate text-[13.5px] text-ink-soft">{AIDE[lieu.art] ?? lieu.quoi}</span>
                </span>
                <button onClick={() => setGrand((g) => !g)} title={grand ? "Réduire" : "Agrandir"} aria-label={grand ? "Réduire le panneau" : "Agrandir le panneau"} className="hidden md:grid h-10 w-10 place-items-center rounded-xl text-ink-soft hover:bg-[#FFF3E8] hover:text-ink">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{grand ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}</svg>
                </button>
                <button onClick={ferme} className="flex items-center gap-2 rounded-2xl bg-[#1E1E24] px-3.5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-black">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
                  <span className="hidden sm:inline">Retour au village</span><span className="sm:hidden">Village</span>
                </button>
              </div>
              {/* Les chiffres du bâtiment, en direct */}
              {(lieu.stats ?? []).length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {lieu.stats.map(([l, val]) => (
                    <span key={l} className="shrink-0 rounded-2xl border border-[#F1E2D2] bg-[#FFF8F1] px-3 py-1.5">
                      <span className="block text-[17px] font-black leading-tight text-ink tnum" style={H}>{val}</span>
                      <span className="block text-[11.5px] text-ink-soft whitespace-nowrap">{l}</span>
                    </span>
                  ))}
                </div>
              )}
              {/* Ponts entre bâtiments voisins : si tu t'es trompé de porte, la bonne est à un clic */}
              {(() => {
                const PONT = { annuaire: ["radar", v.opps, "entreprises à contacter au bon moment"], radar: ["annuaire", v.dec, "décideurs déjà trouvés"], atelier: ["poste", v.rep, "réponses à lire"], poste: ["atelier", v.drafts, "messages à valider"], espion: ["radar", v.opps, "entreprises au bon moment"] };
                const p = PONT[lieu.art]; const cible = p && B.find((x) => x.art === p[0]);
                return p && p[1] > 0 && cible ? <button onClick={() => setSp({ lieu: cible.art }, { replace: true })} className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-[#E8571C] hover:underline">
                  <span className="grid h-4 w-4 place-items-center rounded-full text-[10px] font-black text-white" style={{ background: QUARTIERS[QUARTIER[cible.art]]?.c ?? "#999" }}>{QUARTIER[cible.art]}</span>
                  Aussi : {p[1]} {p[2]} — {cible.nom} →</button> : null;
              })()}
              {/* Passer d'un bâtiment à l'autre sans revenir au village */}
              <nav aria-label="Les bâtiments" className="-mx-4 mt-2 flex gap-1 overflow-x-auto border-b border-[#F1E2D2] px-3 sm:-mx-6 sm:px-5">
                {B.filter((b) => INTERIEUR[b.to] && !b.ferme).map((b) => {
                  const ici = b.art === lieu.art;
                  return (
                    <button key={b.art} onClick={() => setSp({ lieu: b.art }, { replace: true })} aria-current={ici ? "page" : undefined} title={b.nom}
                      className={cx("relative flex shrink-0 items-center gap-1.5 rounded-t-xl px-2.5 pb-2.5 pt-2 text-[13px] font-semibold transition", ici ? "text-[#E8571C]" : "text-ink-soft hover:text-ink")}>
                      <span className="[&>svg]:h-[18px] [&>svg]:w-[18px]"><Icone art={b.art} /></span>
                      <span className={cx(!ici && "hidden lg:inline")}>{b.nom.replace(/^(La |Le |Les |L')/, "")}</span>
                      {(b.badge > 0 || b.alerte) && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#F26A21] px-1 text-[10.5px] font-black text-white">{b.alerte ? "!" : b.badge > 99 ? "99+" : b.badge}</span>}
                      {ici && <span className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-[#F26A21]" />}
                    </button>
                  );
                })}
              </nav>
            </header>
            <div key={lieu.art} className="bv-int min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 animate-[bv-fondu_.25s_ease-out_both]">
              <LieuContext.Provider value={(to) => { const b = B.find((x) => x.to === to.split("?")[0]); if (!b || !INTERIEUR[b.to]) return false; setSp({ lieu: b.art }, { replace: true }); return true; }}><Page /></LieuContext.Provider>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
