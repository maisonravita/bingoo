import { useState } from "react";
import { supabase } from "../lib/supabase";
import brand from "../../brand.json";
import Logo from "../components/Logo";

const L = brand.legal;
// Éditeur : une société (SIRET) ou, en attendant sa création, une personne physique (nom, adresse, e-mail)
export const legalReady = !!(L.company && L.address && L.privacy_email);
const isPerson = !L.siret;

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

const editor = () => isPerson ? `${L.company}, personne physique, ${L.address}` : `${L.company}${L.form ? `, ${L.form}` : ""}${L.capital ? ` au capital de ${L.capital}` : ""}, dont le siège est situé ${L.address}${L.rcs ? `, immatriculée au RCS de ${L.rcs}` : ""}, SIRET ${L.siret}${L.vat ? `, TVA intracommunautaire ${L.vat}` : ""}`;
const UPDATED = "3 novembre 2026";
const contact = () => L.contact_email || L.privacy_email;

export function MentionsLegales() {
  return (
    <Shell title="Mentions légales">
      <p className="text-sm text-ink-soft">Dernière mise à jour : {UPDATED}</p>
      <h2>Éditeur</h2>
      <p>Le site et l'application {brand.name} sont édités par {editor()}.</p>
      <p>Contact : {contact()}</p>
      {L.director && <p>Directeur de la publication : {L.director}.</p>}
      <h2>Hébergement</h2>
      <p>Site : {L.host}.</p>
      <p>Données et traitements : {L.data_host}.</p>
      <h2>Propriété intellectuelle</h2>
      <p>La marque {brand.name}, le logo, les textes, les illustrations, les personnages et le logiciel sont la propriété de {L.company}. Toute reproduction ou réutilisation sans autorisation écrite est interdite. Les marques et noms d'entreprises tiers cités dans l'application ou sur le site appartiennent à leurs titulaires et ne sont mentionnés qu'à titre d'information.</p>
      <h2>Données publiques</h2>
      <p>{brand.name} s'appuie sur des données publiques et réutilisables : données essentielles de la commande publique, BOAMP, BODACC, registre national des entreprises (Sirene), TED, ainsi que les informations publiées par les entreprises elles-mêmes. Chaque information affichée indique sa source.</p>
      <h2>Données personnelles</h2>
      <p>Le traitement des données est décrit dans la <a className="underline" href="#/confidentialite">politique de confidentialité</a>. Pour ne plus être contacté par une entreprise utilisant {brand.name} : <a className="underline" href="#/opposition">Ne plus être contacté</a>.</p>
    </Shell>
  );
}

export function Confidentialite() {
  return (
    <Shell title="Politique de confidentialité">
      <p className="text-sm text-ink-soft">Dernière mise à jour : {UPDATED}</p>
      <p>Cette politique explique comment {L.company} traite les données personnelles dans le cadre de {brand.name}, conformément au Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés.</p>

      <h2>1. Qui est responsable ?</h2>
      <p>Pour les données de ses utilisateurs (comptes, facturation, site internet), {L.company} est <b>responsable de traitement</b>.</p>
      <p>Pour les données des personnes que nos clients prospectent, chaque entreprise cliente est <b>responsable de traitement</b> de sa prospection ; {L.company} agit pour son compte en tant que <b>sous-traitant</b> (article 28 du RGPD), dans les conditions prévues aux <a className="underline" href="#/conditions">conditions d'utilisation</a>.</p>
      <p>Contact pour toute question sur vos données : {L.privacy_email}.</p>

      <h2>2. Les utilisateurs de {brand.name}</h2>
      <p><b>Données :</b> nom, adresse e-mail, entreprise, réglages, contenu saisi dans l'application, historique d'utilisation, données de facturation (le paiement par carte est traité par Stripe : {brand.name} ne voit jamais votre numéro de carte).</p>
      <p><b>Finalités et bases légales :</b> fournir le service et le support (exécution du contrat) ; facturer et tenir la comptabilité (obligation légale) ; sécuriser le service et prévenir les abus (intérêt légitime) ; vous informer des évolutions du service (intérêt légitime, désinscription possible à tout moment).</p>
      <p><b>Durée :</b> pendant l'abonnement, puis 3 ans après la fin de la relation pour la gestion commerciale ; 10 ans pour les pièces comptables.</p>

      <h2>3. Les personnes prospectées</h2>
      <p>{brand.name} aide des entreprises à contacter d'autres entreprises (prospection entre professionnels). Les données utilisées sont <b>professionnelles</b> : nom de l'entreprise, adresse, dirigeants publiés au registre officiel, fonction, e-mail et téléphone professionnels publiés par l'entreprise ou retrouvés par un service spécialisé, profil LinkedIn public.</p>
      <p><b>Sources :</b> registre national des entreprises, annonces légales (BODACC), avis de marchés publics (BOAMP, TED, données de la commande publique), sites internet des entreprises, offres d'emploi publiques, services de recherche d'adresses professionnelles.</p>
      <p><b>Base légale :</b> l'intérêt légitime de l'entreprise qui prospecte, pour un message en rapport avec la fonction professionnelle de la personne contactée, conformément à l'article L34-5 du Code des postes et des communications électroniques et aux recommandations de la CNIL. Aucun particulier n'est prospecté par e-mail sans son consentement.</p>
      <p><b>Information et opposition :</b> chaque message indique qui écrit et permet de s'opposer en répondant « STOP ». La page <a className="underline" href="#/opposition">Ne plus être contacté</a> bloque l'adresse pour <b>toutes</b> les entreprises utilisant {brand.name}, définitivement.</p>
      <p><b>Durée :</b> les données d'un prospect sans échange sont supprimées au plus tard 3 ans après le dernier contact. Les adresses opposées sont conservées dans une liste d'exclusion, uniquement pour garantir qu'elles ne soient plus jamais contactées.</p>

      <h2>4. Visiteurs des sites de nos clients</h2>
      <p>Si un client installe le script de suivi {brand.name} sur son site, le script mesure les pages vues sans cookie, avec un identifiant de session aléatoire qui disparaît à la fermeture de l'onglet. Pour reconnaître l'entreprise qui visite, {brand.name} consulte le titulaire public de l'adresse IP (registres RIPE, ARIN) : seul le <b>nom de l'entreprise</b> est conservé, jamais l'adresse IP, et uniquement quand il s'agit d'une entreprise et non d'un particulier ou d'un opérateur. Le client qui installe le script en informe ses visiteurs.</p>

      <h2>5. Destinataires et sous-traitants</h2>
      <p>Les données ne sont jamais vendues. Elles sont traitées par les prestataires techniques suivants, liés par contrat :</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Supabase : base de données et serveurs, hébergés dans l'Union européenne (Paris).</li>
        <li>Vercel : hébergement du site (États-Unis).</li>
        <li>Resend : envoi et réception des e-mails (région Union européenne).</li>
        <li>Anthropic : intelligence artificielle pour l'analyse et la rédaction (États-Unis). Les données envoyées ne servent pas à entraîner ses modèles.</li>
        <li>Stripe : paiement et facturation.</li>
        <li>Cloudflare : sécurité et acheminement du trafic.</li>
        <li>Si vous les connectez : Google (boîte Gmail, agenda), votre messagerie (OVH, IONOS, Zoho…), votre CRM (HubSpot, Pipedrive), et les services de recherche d'adresses professionnelles (Dropcontact, BetterContact, FullEnrich).</li>
      </ul>
      <p>Les transferts hors de l'Union européenne sont encadrés par le cadre de protection des données UE–États-Unis (Data Privacy Framework) ou par les clauses contractuelles types de la Commission européenne.</p>

      <h2>6. Sécurité</h2>
      <p>Connexions chiffrées, données de chaque entreprise cloisonnées, mots de passe et jetons de messagerie chiffrés, clés d'accès stockées sous forme d'empreinte, accès aux données limité au strict nécessaire.</p>

      <h2>7. Cookies</h2>
      <p>{brand.name} n'utilise <b>aucun cookie publicitaire ni de mesure d'audience tierce</b>. L'application utilise uniquement le stockage local du navigateur, strictement nécessaire pour garder votre session ouverte et retenir vos préférences. Aucun consentement n'est donc requis.</p>

      <h2>8. Vos droits</h2>
      <p>Vous pouvez demander l'accès à vos données, leur rectification, leur effacement, la limitation de leur traitement ou leur portabilité, et vous opposer à leur traitement, en écrivant à {L.privacy_email}. Nous répondons sous un mois. Si vous avez été prospecté par un client de {brand.name}, nous transmettons votre demande à l'entreprise concernée et appliquons immédiatement toute opposition.</p>
      <p>Vous pouvez introduire une réclamation auprès de la CNIL : www.cnil.fr, 3 place de Fontenoy, 75007 Paris.</p>
    </Shell>
  );
}

export function Conditions() {
  return (
    <Shell title="Conditions générales d'utilisation et de vente">
      <p className="text-sm text-ink-soft">Dernière mise à jour : {UPDATED}</p>
      <p>Les présentes conditions régissent l'utilisation de {brand.name}, service édité par {editor()} (« nous »), par les entreprises et professionnels qui y souscrivent (« vous »). {brand.name} est réservé aux professionnels : le droit de la consommation ne s'applique pas.</p>
      {isPerson && <p className="rounded-xl bg-white border border-line p-4 text-sm">{brand.name} est actuellement en phase de lancement : l'accès se fait par l'essai gratuit, et aucun abonnement payant n'est encore proposé. Les articles relatifs au paiement s'appliqueront dès l'ouverture des abonnements, qui sera annoncée au préalable.</p>}

      <h2>1. Le service</h2>
      <p>{brand.name} met à disposition, sous forme d'abonnement en ligne, des agents logiciels d'intelligence artificielle qui repèrent des entreprises ayant une raison d'acheter (Radar), analysent vos concurrents (Espion), recherchent les coordonnées professionnelles des décideurs, rédigent et envoient des messages de prospection, suivent les réponses et organisent les rendez-vous (Mission). Ce sont des logiciels : leurs résultats peuvent comporter des erreurs et doivent être relus.</p>

      <h2>2. Compte et essai gratuit</h2>
      <p>La création d'un compte nécessite des informations exactes. Vous êtes responsable de la confidentialité de vos identifiants et des actions réalisées depuis votre compte et par les membres de votre équipe. Un essai gratuit de 14 jours, sans carte bancaire, permet de découvrir le service ; à son terme, les fonctions payantes sont suspendues jusqu'à la souscription d'une formule.</p>

      <h2>3. Formules, prix et paiement</h2>
      <p>Les formules, leurs prix hors taxes et leurs limites (utilisateurs, volume d'actions, budget d'intelligence artificielle inclus) sont présentés sur la page Tarifs et dans l'application. L'abonnement est payable d'avance, mensuellement ou annuellement, par carte bancaire ou prélèvement via Stripe. Les recharges d'intelligence artificielle sont payables à l'unité et valables jusqu'à leur consommation. En cas d'échec de paiement, l'accès aux fonctions payantes est suspendu jusqu'à régularisation. Tout retard de paiement entraîne de plein droit des pénalités au taux d'intérêt légal multiplié par trois et une indemnité forfaitaire de 40 € pour frais de recouvrement.</p>
      <p>Nous pouvons faire évoluer nos prix ; le nouveau prix s'applique à la période suivante, après information au moins 30 jours à l'avance.</p>

      <h2>4. Durée et résiliation</h2>
      <p>L'abonnement est sans engagement de durée au-delà de la période payée : il se renouvelle automatiquement et peut être résilié à tout moment depuis l'espace Abonnement, avec effet à la fin de la période en cours. Les sommes versées ne sont pas remboursées, sauf manquement de notre part. Nous pouvons suspendre ou résilier un compte en cas de manquement grave aux présentes conditions, notamment en cas d'usage abusif ou illicite du service.</p>

      <h2>5. Vos engagements</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Prospecter uniquement des professionnels, pour une offre en rapport avec leur activité, dans le respect du RGPD, de l'article L34-5 du Code des postes et des communications électroniques et des recommandations de la CNIL.</li>
        <li>Ne pas prospecter de particuliers par e-mail sans leur consentement préalable.</li>
        <li>Relire les messages avant envoi lorsque le pilote automatique n'est pas activé, et rester responsable des messages envoyés en votre nom.</li>
        <li>Respecter immédiatement toute demande d'opposition, que {brand.name} applique automatiquement à l'ensemble de la plateforme.</li>
        <li>Ne pas utiliser {brand.name} pour envoyer des contenus illicites, trompeurs, diffamatoires ou portant atteinte aux droits de tiers, ni pour contourner les limites techniques du service.</li>
        <li>Informer les visiteurs de votre site si vous y installez le script de suivi {brand.name}.</li>
      </ul>

      <h2>6. Limites d'usage</h2>
      <p>Chaque formule comporte des limites quotidiennes affichées dans l'application. Les envois sont plafonnés et augmentés progressivement pour protéger la réputation de votre domaine. Le budget d'intelligence artificielle inclus est mensuel ; au-delà, le service ralentit ou vous pouvez acheter une recharge.</p>

      <h2>7. Disponibilité</h2>
      <p>Nous faisons nos meilleurs efforts pour assurer la disponibilité du service, sans garantie de fonctionnement ininterrompu. Des interruptions peuvent survenir pour maintenance, mise à jour ou en raison de prestataires tiers (hébergement, messagerie, sources de données publiques).</p>

      <h2>8. Vos données</h2>
      <p>Vos données restent les vôtres. Vous pouvez les exporter à tout moment. À la fin de l'abonnement, ou de l'essai gratuit s'il n'est pas suivi d'un abonnement, elles restent accessibles 30 jours, puis sont supprimées automatiquement, sauf obligation légale de conservation.</p>

      <h2>9. Protection des données (article 28 du RGPD)</h2>
      <p>Pour les données des personnes que vous prospectez, vous êtes responsable de traitement et nous agissons comme sous-traitant. À ce titre, nous nous engageons à : traiter ces données uniquement pour fournir le service et selon vos instructions ; en garantir la confidentialité et la sécurité ; n'avoir recours qu'aux sous-traitants listés dans la <a className="underline" href="#/confidentialite">politique de confidentialité</a>, liés par des obligations équivalentes ; vous aider à répondre aux demandes d'exercice de droits ; vous notifier toute violation de données dans les meilleurs délais ; supprimer ou restituer les données à la fin du contrat ; mettre à votre disposition les informations nécessaires pour démontrer le respect de ces obligations.</p>

      <h2>10. Responsabilité</h2>
      <p>{brand.name} est un outil d'aide à la prospection : nous ne garantissons aucun nombre de réponses, de rendez-vous ou de ventes, ni l'exactitude ou l'exhaustivité des informations issues de sources publiques ou de l'intelligence artificielle. Notre responsabilité est limitée aux dommages directs et prouvés, dans la limite des sommes versées au titre des douze derniers mois. Nous ne sommes pas responsables des contenus que vous envoyez ni de l'usage que vous faites des informations fournies.</p>

      <h2>11. Propriété intellectuelle</h2>
      <p>Le logiciel, la marque et les contenus de {brand.name} restent notre propriété. Vous bénéficiez d'un droit d'utilisation personnel et non transférable pendant la durée de l'abonnement. Les messages et documents générés pour vous vous appartiennent.</p>

      <h2>12. Confidentialité</h2>
      <p>Chaque partie garde confidentielles les informations non publiques de l'autre partie dont elle a connaissance, pendant le contrat et deux ans après.</p>

      <h2>13. Modification des conditions</h2>
      <p>Nous pouvons modifier ces conditions ; toute modification importante vous est notifiée au moins 30 jours à l'avance. Si vous la refusez, vous pouvez résilier avant son entrée en vigueur.</p>

      <h2>14. Droit applicable et litiges</h2>
      <p>Les présentes conditions sont soumises au droit français. En cas de litige, les parties recherchent d'abord une solution amiable ; à défaut, compétence exclusive est attribuée aux tribunaux du ressort du domicile de l'éditeur.</p>

      <h2>15. Contact</h2>
      <p>{contact()}</p>
    </Shell>
  );
}
