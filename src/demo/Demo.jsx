// Démos vidéo de la page d'accueil : les VRAIS composants de l'application, avec des données d'exemple.
// Enregistrées par scripts/demos.cjs (Playwright), jamais servies en production.
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import "../index.css";
import Quiz from "../components/Quiz";
import Demande from "../components/Demande";
import { DraftCard } from "../components/TodayFeed";
import { PlanAction } from "../pages/Onboarding";
import { ToastProvider } from "../components/ui";
import { WsCtx } from "../lib/ws";
import Logo from "../components/Logo";
import Sequence from "../components/Sequence";
import { cadence } from "../lib/cadence";
import { Badge } from "../components/ui";

const WS = { id: "demo", name: "Démo", sender_name: "Jean", postal_address: "Paris", domain_status: "verified", integrations: { mailbox: { ok: true } }, profile: { nom: "Ton SaaS" } };
const jours = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

const DEMANDES = [
  { id: "d1", title: "On cherche une alternative à notre outil de prospection : trop cher pour une équipe de 3. Vous utilisez quoi ?", why: "Il veut changer d'outil maintenant : réponds avec un conseil concret.", url: "#", source: "r/SaaS", published: jours(1), created_at: jours(1), status: "nouveau",
    raw: { plateforme: "Reddit", intention: "remplacement", auteur: "fondateur d'un SaaS RH", reponse: "À 3, le plus rentable est de n'écrire qu'aux entreprises qui ont un déclencheur récent (recrutement, levée, nouveau dirigeant) : moins d'envois, beaucoup plus de réponses. Transparence : je suis le fondateur d'un outil qui fait exactement ça, si ça peut aider." } },
  { id: "d2", title: "Quelqu'un connaît un logiciel simple pour suivre les notes de frais d'une PME de 20 personnes ?", url: "#", source: "LinkedIn", published: jours(0), created_at: jours(0), status: "nouveau",
    raw: { plateforme: "LinkedIn", intention: "recherche", auteur: "directrice administrative d'une PME", reponse: "Regardez d'abord l'export comptable et la photo des tickets : ce sont les deux points qui font gagner le plus de temps. Je suis le fondateur d'un outil qui fait ça, je vous montre en 10 minutes si utile." } },
];
const MSG = { id: "m1", step: 0, prospect_id: "p1", subject: "Votre recrutement de 2 commerciaux", body: "Bonjour Claire,\n\nJ'ai vu que Nova Conseil recrute deux commerciaux B2B cette semaine. C'est souvent le moment où la prospection devient le goulot : trouver qui contacter et quand.\n\nNous aidons des cabinets comme le vôtre à repérer chaque matin les entreprises qui ont un besoin, avec le bon décideur.\n\nUn échange de 15 minutes vous serait utile ?",
  prospects: { name: "Nova Conseil", city: "Lyon", contact_name: "Claire Martin", contact_role: "Présidente", email: "claire.martin@nova-conseil.fr", status: "pret", signals: [{ type: "recrutement", label: "Recrute 2 commerciaux B2B (offre publiée il y a 2 jours)" }] } };

function Cadre({ children, titre }) {
  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <header className="h-16 border-b border-black/[.06] bg-white flex items-center justify-between px-8"><Logo height={30} /><span className="text-[13px] text-ink-faint">{titre}</span></header>
      {children}
    </div>
  );
}

function Inscription() {
  const [q, setQ] = useState(null);
  return (
    <Cadre titre="Inscription · données d'exemple">
      <div className="max-w-2xl mx-auto px-4 py-8">{q ? <div className="rise"><h1 className="text-[40px] font-black leading-tight" style={{ fontFamily: "var(--font-titre)" }}>Ton plan du jour est prêt.</h1><PlanAction q={q} /></div> : <Quiz onDone={setQ} />}</div>
    </Cadre>
  );
}

function Journee() {
  const [dem, setDem] = useState(DEMANDES);
  return (
    <Cadre titre="Aujourd'hui · données d'exemple">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="font-black text-[48px] leading-none" style={{ fontFamily: "var(--font-titre)" }}>Bonjour Jean !</h1>
        <p className="text-ink-soft text-[17px] mt-3">2 personnes cherchent ta solution, 1 message est prêt.</p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-paper border border-line px-3 py-1 text-[13px] font-semibold text-ink-soft">Ton plan du jour : environ 15 minutes. Bingoo! s'occupe du reste.</p>
        <section className="mt-8" id="demandes">
          <h2 className="text-[19px] font-semibold">Ils cherchent une solution comme la tienne <span className="text-ink-faint font-normal">{dem.length}</span></h2>
          <p className="mt-1 mb-3 text-[14px] text-ink-soft">Publié en ce moment sur Reddit, LinkedIn, X ou les forums. Ta réponse est prête : tu la copies, tu la publies.</p>
          <div className="grid gap-4">{dem.map((o) => <Demande key={o.id} o={o} compact onDone={(id) => setDem((x) => x.filter((d) => d.id !== id))} />)}</div>
        </section>
        <section className="mt-8 mb-24" id="prets">
          <h2 className="text-[19px] font-semibold mb-3">Messages prêts à partir <span className="text-ink-faint font-normal">1</span></h2>
          <DraftCard m={MSG} canSend onDone={() => {}} />
        </section>
      </div>
    </Cadre>
  );
}

// La cadence : la séquence par défaut (vrai composant de Réglages) et le badge « Touche x/y » des fiches
const CONTACTES = [
  { name: "Nova Conseil", contact: "Claire Martin, Présidente", status: "envoye", seq_etape: 0 },
  { name: "Atelier Verne", contact: "Paul Riva, Gérant", status: "envoye", seq_etape: 1 },
  { name: "Studio Kelio", contact: "Anna Sèze, Directrice générale", status: "envoye", seq_etape: 3 },
];
function Cadence() {
  return (
    <Cadre titre="Réglages · séquence de relances">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-black text-[34px] leading-tight" style={{ fontFamily: "var(--font-titre)" }}>Ta séquence</h1>
        <p className="text-ink-soft text-[15px] mt-1 mb-6">Relance à J+3 puis J+7, appel à J+10, e-mail de clôture à J+14. Une réponse arrête tout.</p>
        <Sequence />
        <h2 className="text-[19px] font-semibold mt-10 mb-3">Et sur chaque fiche contactée</h2>
        <div className="bg-white border border-line rounded-2xl overflow-hidden divide-y divide-line">
          {CONTACTES.map((r) => { const c = cadence(WS, r); return (
            <div key={r.name} className="px-4 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0"><p className="font-medium">{r.name}</p><p className="text-[13px] text-ink-soft">{r.contact}</p></div>
              <Badge tone="accent">Touche {c.touche}/{c.total} · prochaine : {c.prochaine}</Badge>
            </div>
          ); })}
        </div>
      </div>
    </Cadre>
  );
}

const v = new URLSearchParams(location.search).get("v");
function App() { useEffect(() => { try { sessionStorage.clear(); } catch { /* rien */ } }, []); return v === "journee" ? <Journee /> : v === "cadence" ? <Cadence /> : <Inscription />; }
ReactDOM.createRoot(document.getElementById("root")).render(<MemoryRouter><WsCtx.Provider value={{ ws: WS }}><ToastProvider><App /></ToastProvider></WsCtx.Provider></MemoryRouter>);
