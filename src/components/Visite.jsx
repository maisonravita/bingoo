import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "../lib/utils";

// La visite de Bingoo! : à la première arrivée (après l'inscription) et à l'installation de l'extension.
// Chaque étape montre la chose en vrai : une vidéo de l'application, ou un exemple dessiné (marqué « Exemple »).

function Video({ src, poster, actif, label, fit = "cover" }) {
  const v = useRef(null);
  useEffect(() => {
    const el = v.current;
    if (!el) return;
    if (actif) { el.currentTime = 0; el.play().catch(() => {}); } else el.pause();
  }, [actif]);
  return <video ref={v} src={src} poster={poster} muted loop playsInline preload={actif ? "auto" : "none"} aria-label={label} className={cx("w-full h-full", fit === "contain" ? "object-contain bg-white" : "object-cover")} />;
}

const Exemple = () => <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-ink-soft shadow-sm">Exemple</span>;

/** Un message prêt, qu'on valide d'un geste. */
function MockValider() {
  return (
    <div className="relative w-full h-full grid place-items-center bg-[#F3EEE6] p-5">
      <Exemple />
      <div className="w-full max-w-[340px] rounded-2xl bg-white shadow-xl border border-black/5 p-3 sm:p-4 rotate-[-1.5deg]">
        <div className="flex items-center gap-2 text-[11px]"><span className="rounded-full bg-accent-soft text-accent-dark px-2 py-0.5 font-semibold">Premier message</span><span className="text-ink-faint">Ouverture en mai</span></div>
        <p className="mt-2 font-serif text-[22px] leading-tight">Atelier Lumen</p>
        <p className="text-[11.5px] text-ink-soft">À Claire Morel, gérante · claire@atelier-lumen.fr</p>
        <div className="mt-3 rounded-xl bg-paper p-3 text-[12.5px] leading-relaxed">
          <p className="font-semibold">Votre nouvel atelier rue Oberkampf</p>
          <p className="mt-1.5 text-ink-soft line-clamp-2 sm:line-clamp-none">Bonjour Claire, j'ai vu l'ouverture de votre second atelier. Pour une équipe qui double, l'entretien des locaux devient vite un casse-tête…</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-[12px] font-semibold">
          <span className="rounded-lg bg-ink text-white py-2 text-center">Envoyer</span>
          <span className="rounded-lg border border-line py-2 text-center">Modifier</span>
          <span className="rounded-lg border border-line py-2 text-center text-ink-soft">Passer</span>
        </div>
      </div>
      <p className="hidden sm:block absolute bottom-3 inset-x-0 text-center text-[11.5px] text-ink-soft">Relance J+5 dans le même fil · LinkedIn J+3 · appel J+8</p>
    </div>
  );
}

/** Le téléphone qui sonne : une réponse chaude, la réponse déjà prête. */
export function MockTelephone() {
  return (
    <div className="relative w-full h-full grid place-items-center bg-gradient-to-br from-[#1c1917] to-[#3b1d10] p-5">
      <Exemple />
      <div className="w-[230px] rounded-[34px] bg-[#0d0d0f] p-2.5 shadow-2xl ring-1 ring-white/10">
        <div className="rounded-[26px] bg-gradient-to-b from-[#2b2f3a] to-[#11131a] h-[230px] sm:h-[300px] p-3 relative overflow-hidden">
          <p className="text-center text-white/90 text-[28px] sm:text-[34px] font-light mt-1 sm:mt-3 tnum">9:41</p>
          <p className="text-center text-white/60 text-[11px]">mardi 10 novembre</p>
          <div className="mt-4 rounded-2xl bg-white/90 backdrop-blur p-2.5 shadow-lg rise">
            <div className="flex items-center gap-1.5 text-[10px] text-ink-soft"><span className="w-4 h-4 rounded bg-accent grid place-items-center text-white text-[9px] font-black">B</span>BINGOO! · maintenant</div>
            <p className="mt-1 text-[12px] font-semibold text-ink leading-snug">Clinique du Parc est intéressée</p>
            <p className="text-[11px] text-ink-soft leading-snug">« Pouvez-vous passer jeudi ? » Ta réponse est prête : touche pour l'envoyer.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** L'extension sur le site d'une entreprise : sa fiche, en un clic. */
export function MockExtension() {
  return (
    <div className="relative w-full h-full bg-[#EDEAE4] p-4 sm:p-5">
      <Exemple />
      <div className="h-full rounded-xl bg-white shadow-lg border border-black/5 overflow-hidden flex flex-col">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F1EFEC] border-b border-line">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" /><span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" /><span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 flex-1 rounded-md bg-white px-2 py-0.5 text-[10.5px] text-ink-soft truncate">transports-ravel.fr</span>
          <span className="w-5 h-5 rounded bg-accent grid place-items-center text-white text-[10px] font-black ring-2 ring-accent/30">B</span>
        </div>
        <div className="relative flex-1 p-4">
          <div className="space-y-2 opacity-60" aria-hidden><div className="h-4 w-1/2 rounded bg-[#e6e2dc]" /><div className="h-3 w-3/4 rounded bg-[#eeebe6]" /><div className="h-24 rounded bg-[#eeebe6]" /><div className="h-3 w-2/3 rounded bg-[#eeebe6]" /></div>
          <div className="absolute top-2 right-3 w-[230px] rounded-xl bg-white shadow-2xl border border-line p-3 text-[11.5px]">
            <p className="font-semibold text-[13px]">Transports Ravel</p>
            <p className="text-ink-soft">Transport routier · Rungis · 50 à 99 salariés</p>
            <p className="mt-2"><span className="text-ink-soft">Dirigeant :</span> Marc Ravel, président</p>
            <div className="mt-2 flex flex-wrap gap-1"><span className="rounded-full bg-accent-soft text-accent-dark px-2 py-0.5 font-semibold">Recrute 4 chauffeurs</span><span className="rounded-full bg-paper px-2 py-0.5">Nouveau dépôt</span></div>
            <div className="mt-2.5 grid gap-1.5 font-semibold text-center"><span className="rounded-lg bg-ink text-white py-1.5">Ajouter à mes prospects</span><span className="rounded-lg border border-[#0a66c2]/30 text-[#0a66c2] py-1.5">Trouver le dirigeant sur LinkedIn</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Le pilote LinkedIn : les actions validées, faites à un rythme humain. */
export function MockLinkedIn() {
  const rows = [["Invitation envoyée", "Sophie Laurent · DRH, Groupe Avéo", "10:12"], ["Invitation acceptée", "Karim Benali · Directeur, Hôtel Lisière", "10:47"], ["Message envoyé", "Karim Benali", "11:03"], ["A répondu", "Julie Martin · Gérante, Lumen", "11:20"]];
  return (
    <div className="relative w-full h-full grid place-items-center bg-[#E8EEF5] p-5">
      <Exemple />
      <div className="w-full max-w-[340px] rounded-2xl bg-white shadow-xl border border-black/5 p-4">
        <div className="flex items-center justify-between"><p className="font-semibold text-[13px]">Pilote LinkedIn</p><span className="rounded-full bg-good/10 text-good px-2 py-0.5 text-[11px] font-semibold">Actif · 12 / 20 aujourd'hui</span></div>
        <ul className="mt-3 divide-y divide-line text-[12px]">
          {rows.map(([a, b, h]) => <li key={a + h} className="py-2 flex items-center gap-2"><span className={cx("w-2 h-2 rounded-full shrink-0", /répondu|acceptée/.test(a) ? "bg-accent" : "bg-[#0a66c2]")} /><span className="min-w-0 flex-1"><span className="block font-semibold">{a}</span><span className="block text-ink-soft truncate">{b}</span></span><span className="text-ink-faint tnum">{h}</span></li>)}
        </ul>
        <p className="mt-2 text-[11px] text-ink-soft">Seulement ce que tu as validé, avec des pauses, comme une personne.</p>
      </div>
    </div>
  );
}

/** Dans Gmail : l'expéditeur est un prospect, sa fiche s'affiche. */
function MockGmail() {
  return (
    <div className="relative w-full h-full bg-[#F6F8FC] p-4 sm:p-5">
      <Exemple />
      <div className="h-full rounded-xl bg-white shadow-lg border border-black/5 grid grid-cols-[1fr_190px] overflow-hidden text-[11.5px]">
        <div className="p-4">
          <p className="font-semibold text-[14px]">Re : votre nouvel atelier</p>
          <p className="mt-1 text-ink-soft">Claire Morel &lt;claire@atelier-lumen.fr&gt;</p>
          <p className="mt-3 leading-relaxed">Bonjour, oui ça nous intéresse. Pouvez-vous nous envoyer un devis pour 300 m² ?</p>
        </div>
        <div className="border-l border-line bg-[#FFF8F4] p-3">
          <p className="flex items-center gap-1.5 font-semibold"><span className="w-4 h-4 rounded bg-accent grid place-items-center text-white text-[9px] font-black">B</span>Prospect Bingoo!</p>
          <p className="mt-2 font-semibold">Atelier Lumen</p>
          <p className="text-ink-soft">Contactée le 3 nov. · relance J+5 prévue</p>
          <p className="mt-2 rounded-lg bg-white border border-line p-2">Classée : <b>demande un prix</b>. Relances arrêtées.</p>
        </div>
      </div>
    </div>
  );
}

const MEDIA = { valider: MockValider, telephone: MockTelephone, extension: MockExtension, linkedin: MockLinkedIn, gmail: MockGmail };

export const VISITE_APP = [
  { titre: "Ton équipe commerciale travaille, même la nuit", texte: "Neuf collègues se partagent le travail : trouver les entreprises de ta zone, chercher le bon contact, écrire, relancer, lire les réponses. Toi, tu valides.", video: ["./demo-equipe.mp4", "./demo-equipe.jpg", "Une nuit de l'équipe Bingoo! rejouée dans Paris"] },
  { titre: "Ta ville, qui se colore à mesure que tu gagnes", texte: "Chaque entreprise ciblée est placée à sa vraie adresse. En orange ce que tu as gagné, en bleu ce qui est en discussion. Appuie sur « Jouer » : promène-toi, entre chez une entreprise, réponds ou envoie depuis la carte.", video: ["./demo-carte.mp4", "./demo-carte.jpg", "La carte interactive : se promener, ouvrir une entreprise, répondre"], lien: ["/qg/", "Ouvrir ma ville"] },
  { titre: "Le Radar : ceux qui ont besoin de toi maintenant", texte: "Ouvertures, recrutements, déménagements, contrats publics qui se terminent : Bingoo! repère les entreprises au bon moment et t'explique pourquoi les contacter.", video: ["./demo-radar.mp4", "./demo-radar.jpg", "Le Radar en 30 secondes", "contain"] },
  { titre: "Ton matin, en 5 minutes", texte: "Bingoo! rédige pour chaque entreprise un message qui parle de sa situation. Tu le relis et tu l'envoies d'un geste. Les relances suivent toutes seules : e-mail, LinkedIn, appel, selon ta séquence.", media: "valider" },
  { titre: "Une réponse chaude ? Ton téléphone sonne", texte: "Dès qu'un prospect est intéressé, tu es prévenu en quelques secondes, avec la réponse déjà rédigée. Répondre dans l'heure change tout.", media: "telephone", lien: ["#/reglages", "Activer les notifications"] },
  { titre: "L'extension Chrome, partout où tu vas", texte: "Sur le site d'une entreprise, sa fiche en un clic : dirigeant, taille, signaux. Sur LinkedIn, le pilote fait tes invitations validées à un rythme humain. Dans Gmail, tu reconnais tout de suite un prospect.", media: "extension", lien: ["#/reglages#acces", "Installer l'extension"] },
];

export const VISITE_EXTENSION = [
  { titre: "La fiche de chaque entreprise, sur son site", texte: "Clique sur l'icône Bingoo! sur n'importe quel site : tu vois qui dirige, la taille, ce qui bouge chez elle, et tu l'ajoutes à tes prospects en un clic.", media: "extension" },
  { titre: "Le pilote LinkedIn, à un rythme humain", texte: "Tu valides les invitations et les messages dans Bingoo! ; l'extension les fait pour toi, avec des pauses et dans des limites prudentes, pour protéger ton compte.", media: "linkedin", lien: ["#/linkedin", "Voir le pilote LinkedIn"] },
  { titre: "Dans Gmail, tu reconnais tes prospects", texte: "Quand un prospect t'écrit, sa fiche s'affiche à côté du message : où il en est, ce qu'il a reçu, et sa réponse est classée. Option à activer dans l'extension.", media: "gmail" },
];

/** La visite, en plein écran. onFin : appelée à la fermeture (bouton, Échap ou dernière étape). */
export default function Visite({ etapes = VISITE_APP, onFin, fin = "C'est parti" }) {
  const [i, setI] = useState(0);
  const e = etapes[i];
  const dernier = i === etapes.length - 1;
  const suivant = useCallback(() => (dernier ? onFin?.() : setI((x) => x + 1)), [dernier, onFin]);
  useEffect(() => {
    const k = (ev) => { if (ev.key === "Escape") onFin?.(); if (ev.key === "ArrowRight") suivant(); if (ev.key === "ArrowLeft") setI((x) => Math.max(0, x - 1)); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [suivant, onFin]);
  const Media = MEDIA[e.media];
  return (
    <div className="fixed inset-0 z-[60] bg-ink/60 backdrop-blur-sm grid place-items-center sm:p-6" role="dialog" aria-modal aria-label="Visite de Bingoo!">
      <div className="relative w-full h-full sm:h-auto sm:max-w-5xl bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:grid lg:grid-cols-[1.35fr_1fr]">
        <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[460px] bg-[#0b0910] shrink-0 overflow-hidden">
          {etapes.map((x, j) => x.video && <div key={j} className={cx("absolute inset-0 transition-opacity duration-300", j === i ? "opacity-100" : "opacity-0 pointer-events-none")}><Video src={x.video[0]} poster={x.video[1]} label={x.video[2]} fit={x.video[3]} actif={j === i} /></div>)}
          {Media && <div className="absolute inset-0"><Media /></div>}
        </div>
        <div className="flex-1 flex flex-col p-6 sm:p-8 min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-accent-dark tnum">{i + 1} sur {etapes.length}</p>
            <button type="button" onClick={onFin} className="text-[13px] font-semibold text-ink-soft hover:text-ink">Passer la visite</button>
          </div>
          <h2 key={i} className="mt-3 font-serif text-[30px] sm:text-[36px] leading-[1.05] rise">{e.titre}</h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">{e.texte}</p>
          {e.lien && <a href={e.lien[0]} onClick={() => onFin?.()} className="mt-4 inline-block text-[14px] font-semibold text-accent-dark underline underline-offset-4">{e.lien[1]}</a>}
          <div className="mt-auto pt-6 flex items-center gap-3">
            <div className="flex gap-1.5 mr-auto" aria-hidden>{etapes.map((_, j) => <button key={j} type="button" tabIndex={-1} onClick={() => setI(j)} className={cx("h-1.5 rounded-full transition-all", j === i ? "w-6 bg-accent" : "w-1.5 bg-line hover:bg-ink-faint")} />)}</div>
            {i > 0 && <button type="button" onClick={() => setI((x) => x - 1)} className="rounded-xl px-4 py-2.5 text-[14px] font-semibold text-ink-soft hover:text-ink">Retour</button>}
            <button type="button" onClick={suivant} autoFocus className="rounded-xl bg-ink text-white px-5 py-2.5 text-[14px] font-semibold hover:bg-ink/90">{dernier ? fin : "Suivant"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
