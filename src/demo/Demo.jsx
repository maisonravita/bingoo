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
import { cx } from "../lib/utils";
import EspionHub from "../pages/EspionHub";
import Village from "../pages/Village";

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

// Le Radar : l'écran Opportunités, données d'exemple — filmé par scripts/demos.cjs (vraie vidéo, pas un diaporama)
const OPPS = [
  { id: "o1", nom: "Nova Conseil", ville: "Lyon", activite: "Cabinet de conseil B2B, 12 salariés", score: 86, signal: "Recrute 2 commerciaux B2B", src: "France Travail", quand: "il y a 2 jours",
    pourquoi: "Une entreprise qui recrute des commerciaux se développe : c'est le moment où elle s'équipe pour trouver plus de clients.",
    decideur: ["Claire Martin", "Présidente", "claire.martin@nova-conseil.fr", "registre SIRENE · e-mail vérifié"] },
  { id: "o2", nom: "Atelier Verne", ville: "Nantes", activite: "Éditeur de logiciel RH, 8 salariés", score: 81, signal: "A levé 1,2 M€", src: "presse spécialisée", quand: "cette semaine",
    pourquoi: "Après une levée, une entreprise accélère et choisit ses outils dans le trimestre qui suit.",
    decideur: ["Paul Riva", "Fondateur", "paul@atelierverne.fr", "site officiel · e-mail vérifié"] },
  { id: "o3", nom: "Studio Kelio", ville: "Bordeaux", activite: "Agence produit et design, 15 salariés", score: 77, signal: "Nouveau dirigeant", src: "BODACC", quand: "il y a 5 jours",
    pourquoi: "Un nouveau dirigeant revoit ses priorités et ses prestataires dans ses premiers mois.",
    decideur: ["Anna Sèze", "Directrice générale", "anna.seze@studiokelio.fr", "registre SIRENE · e-mail vérifié"] },
];
const RADAR_MSG = { id: "m2", step: 0, prospect_id: "o1", subject: "Votre recrutement de 2 commerciaux", body: "Bonjour Claire,\n\nNova Conseil recrute deux commerciaux B2B depuis mardi. Les premières semaines d'une équipe commerciale se jouent sur la liste : qui contacter, et pourquoi maintenant.\n\nBingoo! repère chaque matin les entreprises en mouvement, avec le bon décideur et le message prêt.\n\nUn échange de 15 minutes la semaine prochaine ?",
  prospects: { name: "Nova Conseil", city: "Lyon", contact_name: "Claire Martin", contact_role: "Présidente", email: "claire.martin@nova-conseil.fr", status: "pret", signals: [{ type: "recrutement", label: "Recrute 2 commerciaux B2B (France Travail, il y a 2 jours)" }] } };

function Radar() {
  const [ouvert, setOuvert] = useState(null);
  const [msg, setMsg] = useState(false);
  const o = OPPS.find((x) => x.id === ouvert);
  return (
    <Cadre titre="Radar · données d'exemple">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="font-black text-[40px] leading-none" style={{ fontFamily: "var(--font-titre)" }}>Opportunités</h1>
        <p className="text-ink-soft text-[16px] mt-2">Les entreprises qui viennent de bouger. Chaque signal affiche sa source.</p>
        <div className="mt-7 grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-5 items-start">
          <div className="space-y-3">
            <p className="text-[13px] font-bold text-accent-dark uppercase tracking-wide">Top 3 du jour</p>
            {OPPS.map((x) => (
              <button key={x.id} data-opp={x.id} onClick={() => { setOuvert(x.id); setMsg(false); }}
                className={cx("w-full text-left rounded-2xl border bg-white p-4 transition shadow-[0_10px_30px_-26px_rgba(21,22,26,.5)]", ouvert === x.id ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink-faint")}>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent-dark">{x.signal}</span>
                  <span className="text-[13px] font-bold tnum text-ink-soft">{x.score}</span>
                </div>
                <p className="mt-2 text-[17px] font-semibold">{x.nom} <span className="font-normal text-ink-soft">· {x.ville}</span></p>
                <p className="text-[13px] text-ink-soft">{x.activite}</p>
                <p className="mt-1.5 text-[12.5px] text-ink-faint">{x.src} · {x.quand}</p>
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 min-h-[380px]">
            {!o ? <p className="text-[15px] text-ink-soft">Ouvre une opportunité pour voir le détail : le fait, sa source, le décideur, et le message prêt.</p> : (
              <div className="rise">
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="text-[26px] font-black leading-tight" style={{ fontFamily: "var(--font-titre)" }}>{o.nom}</h2><p className="text-[14px] text-ink-soft">{o.activite} · {o.ville}</p></div>
                  <span className="rounded-full bg-good-soft text-good px-3 py-1 text-[13px] font-bold tnum">Score {o.score}</span>
                </div>
                <div className="mt-4 rounded-xl bg-paper border border-line p-4">
                  <p className="text-[12.5px] font-bold text-accent-dark uppercase tracking-wide">Le fait</p>
                  <p className="mt-1 text-[15.5px] font-medium">{o.signal} <span className="font-normal text-ink-soft">— {o.src}, {o.quand}</span></p>
                  <p className="mt-2 text-[14px] text-ink-soft">{o.pourquoi}</p>
                </div>
                <div className="mt-3 rounded-xl bg-paper border border-line p-4">
                  <p className="text-[12.5px] font-bold text-accent-dark uppercase tracking-wide">Le décideur</p>
                  <p className="mt-1 text-[15.5px] font-medium">{o.decideur[0]} <span className="font-normal text-ink-soft">· {o.decideur[1]}</span></p>
                  <p className="text-[14px]">{o.decideur[2]}</p>
                  <p className="mt-1 text-[12.5px] text-ink-faint">Source : {o.decideur[3]}</p>
                </div>
                {!msg ? (
                  <button data-prep onClick={() => setMsg(true)} className="mt-4 w-full rounded-xl bg-accent text-white py-3.5 text-[16px] font-bold hover:bg-accent-dark transition">Préparer le message</button>
                ) : (
                  <div className="mt-4 rise"><DraftCard m={RADAR_MSG} canSend onDone={() => {}} /></div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Cadre>
  );
}

// Le décideur et son e-mail : l'écran Contacts, la fiche s'ouvre et Bingoo! trouve le dirigeant puis son e-mail vérifié.
// Données d'exemple ; les étapes sont celles de la vraie cascade (registre → dirigeant rapproché → e-mail pro → vérification).
const FICHES = [
  { id: "f1", nom: "Atelier Verne", ville: "Nantes", activite: "Éditeur de logiciel RH · 8 salariés", siret: "912 345 678 00014", site: "atelierverne.fr", signal: "A levé 1,2 M€" },
  { id: "f2", nom: "Studio Kelio", ville: "Bordeaux", activite: "Agence produit et design · 15 salariés", siret: "897 654 321 00027", site: "studiokelio.fr", signal: "Nouveau dirigeant", fait: ["Anna Sèze", "Directrice générale", "anna.seze@studiokelio.fr"] },
  { id: "f3", nom: "Nova Conseil", ville: "Lyon", activite: "Cabinet de conseil B2B · 12 salariés", siret: "883 112 450 00019", site: "nova-conseil.fr", signal: "Recrute 2 commerciaux", fait: ["Claire Martin", "Présidente", "claire.martin@nova-conseil.fr"] },
];
const ETAPES = [
  ["Registre officiel", "SIREN 912 345 678 lu au registre national des entreprises"],
  ["Dirigeant déclaré", "Paul Riva, Président, rapproché sans homonyme"],
  ["E-mail professionnel", "paul.riva@atelierverne.fr trouvé"],
  ["Vérification", "Le serveur de atelierverne.fr accepte cette adresse"],
];
function Contacts() {
  const [ouvert, setOuvert] = useState(null);
  const [k, setK] = useState(-1);
  const go = () => { setK(0); [1, 2, 3, 4].forEach((n) => setTimeout(() => setK(n), n * 1100)); };
  const f = FICHES.find((x) => x.id === ouvert);
  const fini = k >= 4;
  return (
    <Cadre titre="Contacts · données d'exemple">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="font-black text-[40px] leading-none" style={{ fontFamily: "var(--font-titre)" }}>Contacts</h1>
        <p className="text-ink-soft text-[16px] mt-2">Le bon décideur dans chaque entreprise, et son e-mail vérifié. Jamais une adresse devinée.</p>
        <div className="mt-7 grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-5 items-start">
          <div className="bg-white border border-line rounded-2xl overflow-hidden divide-y divide-line">
            {FICHES.map((x) => {
              const mail = x.fait?.[2] || (x.id === "f1" && fini ? "paul.riva@atelierverne.fr" : "");
              return (
                <button key={x.id} data-fiche={x.id} onClick={() => setOuvert(x.id)} className={cx("w-full text-left px-4 py-3.5 transition", ouvert === x.id ? "bg-paper" : "hover:bg-paper")}>
                  <p className="font-semibold text-[16px]">{x.nom} <span className="font-normal text-ink-soft">· {x.ville}</span></p>
                  <p className={cx("text-[13.5px]", mail ? "text-ink" : "text-ink-faint")}>{mail ? `✉ ${mail}` : "E-mail à trouver"}</p>
                  <span className="mt-1.5 inline-block rounded bg-accent-soft px-2 py-0.5 text-[11.5px] font-semibold text-accent-dark">{x.signal}</span>
                </button>
              );
            })}
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 min-h-[430px]">
            {!f ? <p className="text-[15px] text-ink-soft">Ouvre une fiche.</p> : (
              <div className="rise">
                <h2 className="text-[26px] font-black leading-tight" style={{ fontFamily: "var(--font-titre)" }}>{f.nom}</h2>
                <p className="text-[14px] text-ink-soft">{f.activite} · {f.ville}</p>
                <dl className="mt-4 grid grid-cols-[120px_1fr] gap-y-2.5 text-[14.5px]">
                  <dt className="text-ink-soft">Décideur</dt>
                  <dd>{k >= 2 ? <span className="rise inline-block"><b className="font-semibold">Paul Riva</b> · Président<span className="block text-[12px] text-ink-faint">Source : registre national des entreprises</span></span> : <span className="text-ink-faint">—</span>}</dd>
                  <dt className="text-ink-soft">E-mail</dt>
                  <dd>{fini ? <span className="rise inline-block"><span className="underline">paul.riva@atelierverne.fr</span> <span className="ml-1 rounded-full bg-good-soft text-good px-2 py-0.5 text-[11.5px] font-bold">Vérifié</span><span className="block text-[12px] text-ink-faint">Source : trouvé! (e-mail pro vérifié) · aujourd'hui</span></span> : k < 0 ? <button data-trouver onClick={go} className="rounded-lg bg-accent text-white px-4 py-2 text-[14px] font-bold hover:bg-accent-dark">Trouver l'e-mail</button> : <span className="text-ink-soft">Recherche en cours…</span>}</dd>
                  <dt className="text-ink-soft">Site</dt><dd className="underline">{f.site}</dd>
                  <dt className="text-ink-soft">SIRET</dt><dd className="tnum">{f.siret}</dd>
                </dl>
                {k >= 0 && (
                  <ol className="mt-5 space-y-2">
                    {ETAPES.map(([t, d], i) => {
                      const done = k > i, on = k === i;
                      return (
                        <li key={t} className={cx("flex gap-3 rounded-xl border px-3.5 py-2.5 transition", done ? "border-good/30 bg-good-soft/40" : on ? "border-accent/40 bg-accent-soft/40" : "border-line opacity-50")}>
                          <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold", done ? "bg-good text-white" : on ? "bg-accent text-white" : "bg-paper text-ink-soft")}>{done ? "✓" : i + 1}</span>
                          <span><span className="block text-[14px] font-semibold">{t}</span><span className="block text-[12.5px] text-ink-soft">{d}</span></span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Cadre>
  );
}

// Il écrit. Tu valides. : l'écran « À valider », données d'exemple. On relit, on corrige un mot, on voit l'invitation
// LinkedIn et la suite prévue (J+3, J+7, appel J+10, clôture J+14), on valide : le message suivant arrive.
const A_VALIDER = [
  { id: "v1", nom: "Atelier Verne", qui: "Paul Riva, Président", email: "paul.riva@atelierverne.fr", fait: "A levé 1,2 M€ · presse spécialisée, cette semaine", objet: "votre levée de 1,2 M€",
    corps: "Bonjour Paul,\n\nAtelier Verne vient de lever 1,2 M€. Le trimestre qui suit une levée est celui où l'on recrute et où l'on choisit ses outils.\n\nBingoo! repère chaque matin les entreprises qui ont besoin de vous, avec le bon décideur et le message prêt.\n\nUn échange de 15 minutes jeudi ?",
    note: "Bonjour Paul, bravo pour la levée d'Atelier Verne. Je suis le fondateur de Bingoo!, ravi d'échanger si l'acquisition client est sur votre liste ce trimestre." },
  { id: "v2", nom: "Studio Kelio", qui: "Anna Sèze, Directrice générale", email: "anna.seze@studiokelio.fr", fait: "Nouveau dirigeant · BODACC, il y a 5 jours", objet: "vos premiers mois chez Studio Kelio",
    corps: "Bonjour Anna,\n\nVous avez pris la direction de Studio Kelio ce mois-ci. Les premiers mois sont souvent ceux où l'on revoit ses priorités commerciales.\n\nBingoo! trouve chaque matin les entreprises au bon moment, avec le décideur et le message prêt.\n\nUn échange de 15 minutes la semaine prochaine ?",
    note: "Bonjour Anna, félicitations pour votre arrivée à la tête de Studio Kelio. Ravi d'échanger si le développement commercial fait partie de vos chantiers." },
];
const SUITE = [["J+0", "Ce message", true], ["J+3", "Relance"], ["J+7", "Relance"], ["J+10", "Appel avec script"], ["J+14", "E-mail de clôture"]];
function Valider() {
  const [i, setI] = useState(0);
  const [canal, setCanal] = useState("email");
  const [corps, setCorps] = useState(A_VALIDER[0].corps);
  const [ok, setOk] = useState(false);
  const m = A_VALIDER[i];
  const valider = () => { setOk(true); setTimeout(() => { setOk(false); setI(1); setCorps(A_VALIDER[1].corps); setCanal("email"); }, 2200); };
  return (
    <Cadre titre="À valider · données d'exemple">
      <div className="max-w-5xl mx-auto px-6 py-7">
        <div className="flex items-end justify-between gap-4">
          <div><h1 className="font-black text-[38px] leading-none" style={{ fontFamily: "var(--font-titre)" }}>À valider</h1><p className="text-ink-soft text-[15.5px] mt-2">Bingoo! a écrit. Tu relis, tu corriges si tu veux, tu valides. Rien ne part sans toi.</p></div>
          <span className="rounded-full bg-paper border border-line px-3 py-1 text-[13px] font-semibold text-ink-soft tnum">{i + 1} / {A_VALIDER.length}</span>
        </div>
        <div key={m.id} className="mt-6 grid md:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] gap-5 items-start rise">
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="font-semibold text-[17px]">{m.nom}</p><p className="text-[13.5px] text-ink-soft">{m.qui} · {m.email}</p></div>
              <div className="flex rounded-lg border border-line overflow-hidden text-[13.5px] font-semibold">
                <button data-canal="email" onClick={() => setCanal("email")} className={cx("px-3 py-1.5", canal === "email" ? "bg-ink text-white" : "text-ink-soft")}>E-mail</button>
                <button data-canal="li" onClick={() => setCanal("li")} className={cx("px-3 py-1.5", canal === "li" ? "bg-li text-white" : "text-ink-soft")}>LinkedIn</button>
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-accent-soft/60 px-3 py-2 text-[13px] text-accent-dark"><b className="font-semibold">Le fait :</b> {m.fait}</p>
            {canal === "email" ? (<>
              <p className="mt-3 text-[13.5px] text-ink-soft">Objet : <span className="text-ink font-medium">{m.objet}</span></p>
              <textarea data-corps value={corps} onChange={(e) => setCorps(e.target.value)} rows={9} className="mt-2 w-full rounded-xl border border-line bg-paper/40 p-3.5 text-[15px] leading-relaxed outline-none focus:border-ink" />
              <p className="mt-1 text-[12px] text-ink-faint tnum">{corps.split(/\s+/).filter(Boolean).length} mots · 75 au plus</p>
            </>) : (
              <div className="mt-3 rise">
                <p className="text-[13.5px] text-ink-soft">Invitation LinkedIn avec note (envoyée par l'extension, depuis ton compte)</p>
                <p className="mt-2 rounded-xl border border-li/30 bg-[#EEF4FB] p-3.5 text-[15px] leading-relaxed">{m.note}</p>
                <p className="mt-1 text-[12px] text-ink-faint">S'il répond par e-mail, LinkedIn s'arrête tout seul.</p>
              </div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <button data-valider onClick={valider} className={cx("flex-1 rounded-xl py-3.5 text-[16px] font-bold text-white transition", ok ? "bg-good" : "bg-accent hover:bg-accent-dark")}>{ok ? "✓ Validé : envoi à 9 h 40, relance J+3 prête" : "Valider et envoyer"}</button>
              <button className="rounded-xl border border-line px-4 py-3.5 text-[15px] text-ink-soft">Passer</button>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="text-[13px] font-bold text-accent-dark uppercase tracking-wide">La suite, déjà prévue</p>
            <ol className="mt-3 space-y-2.5">
              {SUITE.map(([j, t, now]) => (
                <li key={j} className="flex items-center gap-3">
                  <span className={cx("w-12 shrink-0 rounded-md px-1.5 py-0.5 text-center text-[12px] font-bold tnum", now ? "bg-ink text-white" : "bg-paper text-ink-soft")}>{j}</span>
                  <span className={cx("text-[14.5px]", now ? "font-semibold" : "text-ink-soft")}>{t}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[12.5px] text-ink-faint">Une réponse arrête tout. Chaque relance repasse par toi.</p>
          </div>
        </div>
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
function App() { useEffect(() => { try { sessionStorage.clear(); } catch { /* rien */ } }, []); return v === "journee" ? <Journee /> : v === "cadence" ? <Cadence /> : v === "radar" ? <Radar /> : v === "contacts" ? <Contacts /> : v === "valider" ? <Valider /> : v === "village" ? <WsCtx.Provider value={{ ws: { ...WS, profile: { ...WS.profile, avance: true } } }}><Village /></WsCtx.Provider> : v === "espion" ? <Cadre titre="Concurrents · données d'exemple"><div className="max-w-6xl mx-auto px-6 py-8"><EspionHub /></div></Cadre> : <Inscription />; }
ReactDOM.createRoot(document.getElementById("root")).render(<MemoryRouter><WsCtx.Provider value={{ ws: WS }}><ToastProvider><App /></ToastProvider></WsCtx.Provider></MemoryRouter>);
