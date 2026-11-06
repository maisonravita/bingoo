import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";

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
    const now = new Date().toISOString();
    Promise.all([
      c(head("replies").eq("handled", false)), c(head("messages").eq("status", "brouillon")),
      c(head("meetings").eq("status", "confirme").gte("starts_at", now)), c(head("radar_opps").eq("status", "nouveau")),
      c(head("prospects").eq("linkedin_status", "a_envoyer")), c(head("prospects").neq("contact_name", "").neq("status", "ignore")),
      c(head("prospects").neq("email", "").neq("status", "ignore")), c(head("competitors")),
    ]).then(([rep, drafts, rdv, opps, li, dec, mails, rivals]) => setD({ rep, drafts, rdv, opps, li, dec, mails, rivals })).catch(() => setD({}));
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
  // Le panneau : un seul endroit où aller d'abord
  const next = reglage ? { b: B[8], t: !boite ? "Va à la Mairie : connecte ta boîte mail pour que tes messages puissent partir." : "Va à la Mairie : ajoute l'adresse de ton entreprise (obligatoire en bas des e-mails)." }
    : v.rep ? { b: B[0], t: `Va à la Poste : ${v.rep} prospect${v.rep > 1 ? "s t'ont" : " t'a"} répondu, une réponse est prête.` }
    : v.drafts ? { b: B[1], t: `Va à l'Atelier : ${v.drafts} message${v.drafts > 1 ? "s" : ""} à valider, un clic chacun.` }
    : v.opps ? { b: B[4], t: `Passe à la Tour Radar : ${v.opps} entreprise${v.opps > 1 ? "s" : ""} prête${v.opps > 1 ? "s" : ""} à acheter.` }
    : null;
  const first = (ws.sender_name || "").split(" ")[0];

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="font-black text-[34px] sm:text-[46px] leading-none tracking-tight" style={H}>Bienvenue à Bingoo!-ville{first ? `, ${first}` : ""}</h1>
          <p className="text-ink-soft text-[16px] mt-2">Chaque bâtiment est une partie de Bingoo! : clique pour y entrer. Un badge orange : quelque chose t'y attend.</p>
        </div>
        <button onClick={() => { try { localStorage.setItem("bingoo-vue", "liste"); } catch { /* rien */ } nav("/liste"); }} className="rounded-full border border-line bg-white px-4 py-2 text-[14px] font-semibold hover:border-ink-faint">Vue liste</button>
      </div>

      {/* Le panneau de la place */}
      <button onClick={() => next && nav(next.b.to)} disabled={!next} className={cx("mb-5 flex w-full items-center gap-4 rounded-2xl border-2 px-4 py-3 text-left transition", next ? "border-accent bg-accent-soft/60 hover:bg-accent-soft" : "border-line bg-white")}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-white text-[22px] font-black" style={H}>{next ? "→" : "✓"}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[12.5px] font-semibold text-accent-dark">{next ? "Prochaine étape" : "Tout est fait"}</span>
          <span className="block text-[16px] font-semibold text-ink">{next ? next.t : "Rien ne t'attend : Bingoo! cherche, écrit et relance pour toi. Reviens demain matin."}</span>
        </span>
      </button>

      {/* La carte : terrain, rues, bâtiments */}
      <div className="relative overflow-hidden rounded-[28px] border border-line p-3 sm:p-6" style={{ background: "linear-gradient(#EAF2DF, #DDEACB)" }}>
        <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-4 sm:gap-x-6 sm:gap-y-6">
          {B.map((b) => <Batiment key={b.art} b={b} />)}
        </div>
        <a href="/qg/" className="relative mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[#15161A] px-4 py-3 text-[14.5px] font-semibold text-white hover:bg-black">La nuit en vrai : revois ce que ton équipe a fait cette nuit dans ta ville</a>
      </div>
    </div>
  );
}
