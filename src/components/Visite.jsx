import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "../lib/utils";

// La visite de Bingoo! : à la première arrivée (après l'inscription) et à l'installation de l'extension.
// Seules de vraies vidéos de l'application sont montrées ; une étape sans vidéo reste du texte.

function Video({ src, poster, actif, label, fit = "cover" }) {
  const v = useRef(null);
  useEffect(() => {
    const el = v.current;
    if (!el) return;
    if (actif) { el.currentTime = 0; el.play().catch(() => {}); } else el.pause();
  }, [actif]);
  return <video ref={v} src={src} poster={poster} muted loop playsInline preload={actif ? "auto" : "none"} aria-label={label} className={cx("w-full h-full", fit === "contain" ? "object-contain bg-white" : "object-cover")} />;
}


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
  return (
    <div className="fixed inset-0 z-[60] bg-ink/60 backdrop-blur-sm grid place-items-center sm:p-6" role="dialog" aria-modal aria-label="Visite de Bingoo!">
      <div className={cx("relative w-full h-full sm:h-auto bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col", e.video ? "sm:max-w-5xl lg:grid lg:grid-cols-[1.35fr_1fr]" : "sm:max-w-xl")}>
        {/* Seulement de vraies vidéos de l'application : une étape sans vidéo reste du texte */}
        <div className={cx("relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[460px] bg-[#0b0910] shrink-0 overflow-hidden", !e.video && "hidden")}>
          {etapes.map((x, j) => x.video && <div key={j} className={cx("absolute inset-0 transition-opacity duration-300", j === i ? "opacity-100" : "opacity-0 pointer-events-none")}><Video src={x.video[0]} poster={x.video[1]} label={x.video[2]} fit={x.video[3]} actif={j === i} /></div>)}
        </div>
        <div className={cx("flex-1 flex flex-col p-6 sm:p-8 min-h-0 overflow-y-auto", !e.video && "sm:min-h-[380px] sm:p-10")}>
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
