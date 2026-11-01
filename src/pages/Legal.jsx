import { useState } from "react";
import { supabase } from "../lib/supabase";
import brand from "../../brand.json";
import Logo from "../components/Logo";

const L = brand.legal;
export const legalReady = !!(L.company && L.address && L.siret && L.privacy_email);

function Shell({ title, children }) {
  return (
    <div className="min-h-full bg-paper px-4 py-8 md:py-14">
      <div className="max-w-2xl mx-auto">
        <a href="#/" className="inline-block mb-8"><Logo /></a>
        <h1 className="font-serif text-4xl mb-6">{title}</h1>
        <div className="space-y-4 text-[15px] leading-relaxed text-ink [&_h2]:font-semibold [&_h2]:text-lg [&_h2]:mt-8">{children}</div>
        {legalReady && <LegalLinks className="mt-12" />}
      </div>
    </div>
  );
}

export function LegalLinks({ className = "" }) {
  if (!legalReady) return <p className={`text-xs text-ink-faint ${className}`}><a href="#/opposition" className="hover:text-ink">Ne plus être contacté</a></p>;
  return (
    <p className={`text-xs text-ink-faint flex flex-wrap gap-x-4 gap-y-1 ${className}`}>
      <a href="#/mentions-legales" className="hover:text-ink">Mentions légales</a>
      <a href="#/confidentialite" className="hover:text-ink">Confidentialité</a>
      <a href="#/conditions" className="hover:text-ink">Conditions d'utilisation</a>
      <a href="#/opposition" className="hover:text-ink">Ne plus être contacté</a>
    </p>
  );
}

/** Page publique : un destinataire demande à ne plus jamais être contacté (toute la plateforme). */
export function Opposition() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle");
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setState("busy");
    const { error } = await supabase.rpc("opt_out", { p_email: email });
    if (error) { setErr(error.message.includes("invalide") ? "Cette adresse e-mail n'est pas valide." : "Une erreur est survenue, réessaie dans un instant."); setState("idle"); }
    else setState("done");
  };
  return (
    <Shell title="Ne plus être contacté">
      <p>Vous avez reçu un message de prospection envoyé avec {brand.name} et vous ne souhaitez plus être sollicité ? Indiquez votre adresse e-mail : elle sera bloquée pour <b>toutes</b> les entreprises qui utilisent {brand.name}, définitivement.</p>
      {state === "done" ? (
        <p className="rounded-xl bg-white border border-line p-5"><b>C'est fait.</b> L'adresse {email.trim().toLowerCase()} ne recevra plus aucun message de prospection envoyé avec {brand.name}. Les messages déjà programmés ont été annulés.</p>
      ) : (
        <form onSubmit={submit} className="rounded-xl bg-white border border-line p-5 space-y-3">
          <label className="block text-sm font-medium" htmlFor="optout">Votre adresse e-mail</label>
          <input id="optout" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@entreprise.fr" className="w-full rounded-lg border border-line px-3 py-2.5 bg-white" />
          {err && <p className="text-sm text-bad">{err}</p>}
          <button disabled={state === "busy"} className="rounded-full bg-ink text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50">{state === "busy" ? "Enregistrement…" : "Ne plus être contacté"}</button>
        </form>
      )}
      <p className="text-sm text-ink-soft">Vous pouvez aussi simplement répondre « STOP » à n'importe quel message reçu.{L.privacy_email ? ` Pour toute autre demande sur vos données (accès, rectification, effacement) : ${L.privacy_email}.` : ""}</p>
    </Shell>
  );
}

const editor = () => `${L.company}${L.form ? `, ${L.form}` : ""}${L.capital ? ` au capital de ${L.capital}` : ""}, ${L.address}, SIRET ${L.siret}`;

export function MentionsLegales() {
  return (
    <Shell title="Mentions légales">
      <h2>Éditeur</h2><p>{brand.name} est édité par {editor()}.</p>
      <p>Directeur de la publication : {L.director || L.company}. Contact : {L.privacy_email}.</p>
      <h2>Hébergement</h2><p>Site : {L.host}. Données : {L.data_host}.</p>
    </Shell>
  );
}

export function Confidentialite() {
  return (
    <Shell title="Politique de confidentialité">
      <p>Cette politique explique comment {L.company} traite les données personnelles dans le cadre de {brand.name}.</p>
      <h2>1. Les utilisateurs de {brand.name}</h2>
      <p>Nous traitons les données de compte (nom, e-mail, entreprise), les réglages et l'activité dans l'application pour fournir le service (exécution du contrat). Elles sont conservées pendant la durée de l'abonnement puis 3 ans pour la gestion commerciale, sauf obligation légale plus longue.</p>
      <h2>2. Les personnes prospectées</h2>
      <p>{brand.name} aide des entreprises à contacter d'autres entreprises (prospection B2B). Les données utilisées sont professionnelles et publiques : registre officiel des entreprises (nom, adresse, dirigeants), sites internet et annuaires professionnels (e-mail et téléphone publiés). Chaque entreprise cliente est responsable de sa prospection ; {L.company} agit pour son compte comme sous-traitant.</p>
      <p>Base légale : l'intérêt légitime de l'entreprise qui prospecte, pour un message en rapport avec la fonction de la personne contactée. Chaque message permet de s'opposer en répondant « STOP », et la page <a className="underline" href="#/opposition">Ne plus être contacté</a> bloque l'adresse pour toutes les entreprises utilisant {brand.name}. Les données d'un prospect sans échange sont supprimées au plus tard 3 ans après le dernier contact.</p>
      <h2>3. Destinataires et sous-traitants</h2>
      <p>Hébergement : {L.host} ; {L.data_host}. Envoi d'e-mails : Resend. Intelligence artificielle : Anthropic (rédaction et analyse, sans entraînement de modèles sur vos données). Aucune donnée n'est vendue.</p>
      <h2>4. Vos droits</h2>
      <p>Vous pouvez demander l'accès, la rectification, l'effacement, la limitation ou la portabilité de vos données, et vous opposer à leur traitement, en écrivant à {L.privacy_email}. Vous pouvez aussi saisir la CNIL (cnil.fr).</p>
    </Shell>
  );
}

export function Conditions() {
  return (
    <Shell title="Conditions d'utilisation">
      <p>Les présentes conditions encadrent l'utilisation de {brand.name}, service édité par {editor()}.</p>
      <h2>1. Le service</h2><p>{brand.name} met à disposition des agents logiciels d'intelligence artificielle qui recherchent des entreprises, trouvent leurs coordonnées professionnelles publiques, rédigent et envoient des messages de prospection, et suivent les réponses. Ce sont des logiciels, pas des personnes : leurs résultats peuvent comporter des erreurs et doivent être relus.</p>
      <h2>2. Vos engagements</h2><p>Vous prospectez des professionnels, pour une offre liée à leur activité, et vous respectez le droit applicable (RGPD, recommandations de la CNIL, Code des postes et des communications électroniques). Vous ne prospectez pas de particuliers par e-mail sans leur consentement. Vous relisez les messages avant envoi quand le pilote automatique n'est pas activé, et vous restez responsable des messages envoyés en votre nom.</p>
      <h2>3. Limites</h2><p>Chaque formule comporte des limites d'usage quotidiennes, affichées dans l'application. Les envois sont plafonnés pour protéger la réputation de votre domaine. Nous ne garantissons pas un nombre de réponses, de rendez-vous ou de ventes.</p>
      <h2>4. Données</h2><p>Vos données restent les vôtres ; vous pouvez les exporter à tout moment. Leur traitement est décrit dans la <a className="underline" href="#/confidentialite">politique de confidentialité</a>.</p>
      <h2>5. Contact</h2><p>{L.privacy_email}</p>
    </Shell>
  );
}
