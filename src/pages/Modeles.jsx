import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fn } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";
import { demanderCompte, estInvite } from "../lib/invite";

// Galerie « Partir d'un modèle » : les modèles faits main de Bingoo! (écrans écrits et testés à l'avance),
// adaptés au métier du membre. Chaque modèle s'appuie sur un SaaS de référence de la base, qui sert de point de départ
// au parcours habituel (questions, construction, atelier) ; le modèle choisi est imposé à la construction.
const HF = { fontFamily: "var(--font-titre)" };
const CLE_CHANTIER = "bingoo-chantier";
const ecrire = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
const paye = (ws) => ws?.plan === "fondateur" || (["explorer", "explorer_pro", "lancer_pro", "business", "solo", "pro"].includes(ws?.plan) && ["active", "trialing", "past_due"].includes(ws?.plan_status));

export const MODELES = [
  {
    id: "reservation", titre: "Réservation et planning", ref: { domaine: "planity.com", nom: "Planity", categorie: "Commerce et restauration" },
    accroche: "Tes clients réservent en ligne sur les vrais créneaux libres. Toi, tu vois ta journée d'un coup d'œil.",
    metiers: ["Coiffeur", "Esthéticienne", "Coach sportif", "Ostéopathe", "Garage", "Professeur particulier"],
    fonctions: ["Page de réservation en ligne, sans compte pour le client", "Planning du mois et rendez-vous à confirmer en un clic", "Prestations avec prix et durées", "Heures d'ouverture, pauses et jours fermés", "Fichier clients avec historique et chiffre d'affaires"],
    couleur: "#9F1239", exemple: "Salonia, pour un salon de coiffure",
  },
  {
    id: "beaute", modele: "reservation", allure: "nature", titre: "Institut de beauté", ref: { domaine: "planity.com", nom: "Planity", categorie: "Commerce et restauration" },
    accroche: "La même réservation en ligne, habillée comme un spa : vert profond, fond crème, tout en douceur.",
    metiers: ["Institut de beauté", "Spa", "Onglerie", "Massage bien-être", "Esthéticienne à domicile", "Barbier"],
    fonctions: ["Réservation en 3 étapes : soin, date, créneau libre", "Planning du mois et de la semaine", "Carte des soins avec prix et durées", "Clientes VIP, historique et export", "Tableau de bord : chiffre d'affaires, annulations, répartition"],
    couleur: "#1F3D33", exemple: "Sublima, pour un institut de beauté",
  },
  {
    id: "devis", titre: "Devis et factures", ref: { domaine: "henrri.com", nom: "Henrri", categorie: "Facturation et comptabilité" },
    accroche: "Un devis propre en une minute, transformé en facture quand il est accepté, et les retards relancés tout seuls.",
    metiers: ["Électricien", "Plombier", "Graphiste", "Consultant", "Traiteur", "Agence"],
    fonctions: ["Catalogue de prestations et devis en un clic (TVA, total)", "Devis envoyés par e-mail et en PDF", "Factures numérotées avec mentions légales et IBAN", "Suivi des paiements et relances", "Formulaire public de demande de devis"],
    couleur: "#0F766E", exemple: "Devizo, pour un électricien",
  },
  {
    id: "crm", titre: "CRM commercial", ref: { domaine: "pipedrive.com", nom: "Pipedrive", categorie: "CRM et ventes" },
    accroche: "Tous tes prospects et tes affaires au même endroit, avec les relances du jour pour ne plus rien laisser filer.",
    metiers: ["Agence web", "Commercial indépendant", "Agent immobilier", "Cabinet de conseil", "Courtier", "Formateur"],
    fonctions: ["Pipeline d'affaires à faire glisser, avec prévision", "Fichier de contacts avec historique", "Tâches et relances datées, liste et calendrier", "Vrais e-mails envoyés à un contact", "Formulaire de contact public qui crée le prospect"],
    couleur: "#4338CA", exemple: "Pistio, pour une agence web",
  },
  {
    id: "projets", titre: "Gestion de projets", ref: { domaine: "asana.com", nom: "Asana", categorie: "Gestion de projet" },
    accroche: "Un tableau par projet, des cartes qu'on fait glisser jusqu'à « Terminé », et toute l'équipe sur la même page.",
    metiers: ["Agence", "Équipe produit", "Association", "Chantier BTP", "Événementiel", "Freelance"],
    fonctions: ["Tableaux en colonnes, cartes avec responsable, échéance, sous-tâches", "« Mes tâches » sur tous les projets, par échéance", "Calendrier des échéances", "Avancement par projet et charge par personne", "Formulaire public de demandes, transformées en cartes"],
    couleur: "#2563EB", exemple: "Kanbo, pour une agence",
  },
  {
    id: "ecriture", titre: "Rédaction par IA", ref: { domaine: "jasper.ai", nom: "Jasper", categorie: "IA et automatisation" },
    accroche: "Tes utilisateurs choisissent un type de texte, remplissent trois champs, et l'IA écrit dans leur style.",
    metiers: ["Posts LinkedIn", "E-mails de prospection", "Fiches produit", "Annonces immobilières", "CV et lettres", "Réponses aux avis"],
    fonctions: ["Types de textes sur mesure, avec leurs champs", "L'IA écrit, puis « plus court », « plus percutant »…", "Textes rangés, cherchables, en favoris", "Copie et téléchargement en PDF", "« Mon style » : l'IA écrit comme l'utilisateur"],
    couleur: "#7C3AED", exemple: "Plumeo, pour des posts LinkedIn",
  },
  {
    id: "support", titre: "Support client", ref: { domaine: "crisp.chat", nom: "Crisp", categorie: "Support client" },
    accroche: "Chaque demande devient un ticket, on répond par e-mail sans quitter l'outil, et un centre d'aide répond à votre place.",
    metiers: ["Logiciel en ligne", "Boutique en ligne", "Agence", "Syndic", "Service après-vente", "Association"],
    fonctions: ["Tickets ouverts, en attente, résolus, avec priorité et personne assignée", "Réponse par vrai e-mail depuis le ticket, avec réponses types", "Centre d'aide public avec vos articles", "Formulaire public qui crée le ticket", "Temps de première réponse et demandes par catégorie"],
    couleur: "#0E7490", exemple: "Aidely, pour un logiciel en ligne",
  },
  {
    id: "boutique", titre: "Boutique en ligne", ref: { domaine: "shopify.com", nom: "Shopify", categorie: "E-commerce" },
    accroche: "Une vitrine avec panier, des commandes suivies jusqu'à la livraison, et le client prévenu à chaque étape.",
    metiers: ["Créatrice de bougies", "Épicerie fine", "Fleuriste", "Caviste", "Boutique de vêtements", "Librairie"],
    fonctions: ["Vitrine publique avec panier et commande", "Commandes : nouvelle, en préparation, expédiée, livrée", "E-mail au client à chaque étape", "Produits, prix, stock et catégories", "Ventes, panier moyen et meilleurs produits"],
    couleur: "#C2410C", exemple: "Lumio, pour une créatrice de bougies",
  },
  {
    id: "formation", titre: "Formation en ligne", ref: { domaine: "thinkific.com", nom: "Thinkific", categorie: "Éducation et formation" },
    accroche: "Vos formations découpées en leçons, un catalogue où l'on s'inscrit, et les leçons envoyées aux élèves par e-mail.",
    metiers: ["Formateur indépendant", "Coach", "Professeur de yoga", "Photographe", "Organisme de formation", "Consultant"],
    fonctions: ["Formations et leçons (texte, vidéo, durée) à réordonner", "Catalogue public avec programme et inscription", "Leçons envoyées aux inscrits par e-mail", "Suivi de la progression de chaque élève", "Inscriptions, revenus et taux d'achèvement"],
    couleur: "#15803D", exemple: "Apprenti, pour un photographe formateur",
  },
  {
    id: "recrutement", titre: "Recrutement", ref: { domaine: "teamtailor.com", nom: "Teamtailor", categorie: "Recrutement" },
    accroche: "Vos offres sur une page carrières, et chaque candidat suivi étape par étape jusqu'à l'embauche.",
    metiers: ["PME", "Restaurant", "Cabinet de recrutement", "Startup", "Commerce", "Association"],
    fonctions: ["Page carrières publique où l'on postule", "Candidats en colonnes à faire glisser jusqu'à l'embauche", "Note, commentaires et lien vers le CV", "Convocation et refus par e-mail en un clic", "Entretiens à venir et sources des candidats"],
    couleur: "#4338CA", exemple: "Embauche, pour une PME",
  },
  {
    id: "reseaux", titre: "Réseaux sociaux", ref: { domaine: "buffer.com", nom: "Buffer", categorie: "Réseaux sociaux et contenu" },
    accroche: "Le calendrier de toutes vos publications, l'IA pour les écrire, et un rappel le jour J avec le texte prêt à copier.",
    metiers: ["Community manager", "Commerçant", "Coach", "Restaurant", "Agence de communication", "Créateur de contenu"],
    fonctions: ["Calendrier du mois par réseau", "Publications écrites avec l'aide de l'IA", "Rappel par e-mail le jour J, texte prêt à copier", "Réserve d'idées", "Résultats : meilleur jour, meilleur réseau, meilleures publications"],
    couleur: "#BE185D", exemple: "Postly, pour un community manager",
  },
  {
    id: "formulaires", titre: "Formulaires et sondages", ref: { domaine: "tally.so", nom: "Tally", categorie: "Autre" },
    accroche: "Des formulaires qu'on remplit une question à la fois, et les réponses en graphiques sans rien calculer.",
    metiers: ["Avis clients", "Inscriptions à un événement", "Demandes de devis", "Sondage d'équipe", "Association", "École"],
    fonctions: ["Constructeur de questions (choix, note, 0 à 10, date…)", "Aperçu avant de publier", "Page publique, une question à la fois", "Synthèse par question avec graphiques", "Réponses une par une et export tableur"],
    couleur: "#111827", exemple: "Formo, pour recueillir des avis",
  },
  {
    id: "notes", titre: "Notes et wiki", ref: { domaine: "notion.so", nom: "Notion", categorie: "Collaboration et documents" },
    accroche: "Des pages qu'on écrit en blocs et qu'on range en arborescence : les notes et procédures de toute l'équipe.",
    metiers: ["Équipe", "Agence", "Indépendant", "Association", "Étudiant", "Cabinet"],
    fonctions: ["Éditeur en blocs avec menu « / »", "Pages et sous-pages, favoris, recherche", "Modèles de page", "Toutes les cases à cocher au même endroit", "Corbeille et export PDF"],
    couleur: "#475569", exemple: "Carnet, pour une équipe",
  },
];
const COULEURS = ["#1F3D33", "#475569", "#9F1239", "#C2410C", "#B45309", "#0F766E", "#15803D", "#0E7490", "#2563EB", "#4338CA", "#7C3AED", "#BE185D", "#111827"];

export default function Modeles() {
  const { session, ws } = useWs();
  const nav = useNavigate();
  const [ouvert, setOuvert] = useState(null), [img, setImg] = useState({}), [f, setF] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState(null);
  useEffect(() => { document.title = "Partir d'un modèle · Bingoo!"; }, []);

  const choisir = (m) => { setOuvert(m.id); setF({ metier: "", nom: "", couleur: m.couleur }); setErr(null); };
  const lancer = async (m) => {
    if (estInvite(session) || !ws) { demanderCompte("Crée ton compte gratuit pour lancer ton SaaS à partir de ce modèle."); return; }
    if (!f.metier.trim()) { setErr("Dis-nous pour quel métier ou quel public."); return; }
    // Le parcours habituel reprend ces réponses : nom choisi, métier visé, modèle imposé
    ecrire(`bingoo-reponses-${m.ref.domaine}`, { nom: f.nom.trim(), clients: f.metier.trim(), mieux: `Couleur principale ${f.couleur}`, angle: [f.nom.trim() && `Nom souhaité, à utiliser tel quel : ${f.nom.trim()}`, `Clients visés : ${f.metier.trim()}`, `Couleur principale : ${f.couleur}`].filter(Boolean).join(". ") });
    ecrire(CLE_CHANTIER, { ...m.ref, ws: ws.id, modele: m.modele ?? m.id, allure: m.allure ?? null, metier: f.metier.trim(), couleur: f.couleur });
    if (paye(ws)) { nav("/explorer/revelation"); return; }
    setBusy(true);
    try { const { url } = await fn("billing-checkout", { workspace_id: ws.id, plan: "explorer_pro", periode: "mois", retour: "revelation" }); if (url) { window.location.href = url; return; } nav("/explorer/revelation"); }
    catch (_) { nav("/abonnement?formule=explorer_pro&periode=mois"); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
      <header className="pt-6 pb-8 max-w-3xl">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#E8571C]">Partir d'un modèle</p>
        <h1 className="mt-2 text-[34px] sm:text-[42px] font-black leading-[1.05] tracking-tight" style={HF}>Pas d'idée précise ? Pars d'un modèle prêt à l'emploi.</h1>
        <p className="mt-3 text-[16px] text-ink-soft">Des logiciels complets, écrits et testés à l'avance par Bingoo!. Tu choisis ton métier, ton nom et ta couleur : Bingoo! l'adapte et le met en ligne en quelques minutes. Tu l'ajustes ensuite dans l'atelier.</p>
      </header>

      <div className="space-y-8">
        {MODELES.map((m, i) => {
          const k = img[m.id] ?? 0;
          return (
            <section key={m.id} className={cx("grid gap-6 lg:gap-10 items-start rounded-3xl border border-line bg-white p-4 sm:p-6", i % 2 ? "lg:grid-cols-[1fr_1.35fr]" : "lg:grid-cols-[1.35fr_1fr]")}>
              <div className={cx(i % 2 && "lg:order-2")}>
                <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_30px_60px_-40px_rgba(21,23,42,.45)]">
                  <img src={`/modeles/${m.id}-${k + 1}.webp`} alt={`${m.titre} : aperçu ${k + 1}`} loading="lazy" className="block w-full aspect-[16/10] object-cover object-top" />
                </div>
                <div className="mt-2.5 flex justify-center gap-1.5">{[0, 1, 2].map((j) => <button key={j} aria-label={`Aperçu ${j + 1}`} onClick={() => setImg((x) => ({ ...x, [m.id]: j }))} className={cx("h-2 rounded-full transition-all", k === j ? "w-6 bg-ink" : "w-2 bg-ink/20 hover:bg-ink/40")} />)}</div>
              </div>
              <div className={cx(i % 2 && "lg:order-1")}>
                <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] font-bold text-white" style={{ background: m.couleur }}>Testé par Bingoo!</span>
                <h2 className="mt-3 text-[26px] font-black tracking-tight" style={HF}>{m.titre}</h2>
                <p className="mt-2 text-[15px] text-ink-soft">{m.accroche}</p>
                <ul className="mt-4 space-y-1.5 text-[14px]">{m.fonctions.map((x) => <li key={x} className="flex gap-2"><span className="mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: m.couleur }}>✓</span>{x}</li>)}</ul>
                <p className="mt-4 text-[12.5px] text-ink-faint">Pour : {m.metiers.join(", ")}… · Aperçu : {m.exemple}</p>
                {ouvert !== m.id ? (
                  <button onClick={() => choisir(m)} className="mt-5 rounded-xl bg-ink px-5 py-3 text-[14.5px] font-bold text-white hover:opacity-90">Utiliser ce modèle</button>
                ) : (
                  <div className="mt-5 rounded-2xl border border-line bg-[#FCFBF9] p-4 space-y-3">
                    <div>
                      <label className="block text-[13px] font-semibold">Pour quel métier ou quel public ?
                        <input autoFocus value={f.metier} onChange={(e) => setF({ ...f, metier: e.target.value })} placeholder={`Ex. ${m.metiers[0].toLowerCase()}`} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-[14px] font-normal outline-none focus:border-ink-faint" />
                      </label>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">{m.metiers.slice(0, 4).map((x) => <button type="button" key={x} onClick={() => setF({ ...f, metier: x })} className={cx("rounded-full border px-2.5 py-1 text-[12px] font-medium", f.metier === x ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink-faint")}>{x}</button>)}</div>
                    </div>
                    <label className="block text-[13px] font-semibold">Son nom <span className="font-normal text-ink-faint">(facultatif : sinon Bingoo! en propose un)</span>
                      <input value={f.nom} maxLength={40} onChange={(e) => setF({ ...f, nom: e.target.value })} placeholder="Ex. Salonia" className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-[14px] font-normal outline-none focus:border-ink-faint" />
                    </label>
                    <div className="text-[13px] font-semibold">Sa couleur
                      <div className="mt-1.5 flex flex-wrap gap-2">{COULEURS.map((c) => <button type="button" key={c} aria-label={`Couleur ${c}`} onClick={() => setF({ ...f, couleur: c })} className={cx("h-7 w-7 rounded-full", f.couleur === c && "ring-2 ring-offset-2 ring-ink")} style={{ background: c }} />)}</div>
                    </div>
                    {err && <p className="text-[13px] text-[#B42318]">{err}</p>}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button disabled={busy} onClick={() => lancer(m)} className="rounded-xl bg-[#E8571C] px-5 py-2.5 text-[14px] font-bold text-white hover:opacity-90 disabled:opacity-50">{busy ? "Un instant…" : paye(ws) ? "Construire mon SaaS" : "Continuer"}</button>
                      <button onClick={() => setOuvert(null)} className="rounded-xl px-3 py-2.5 text-[13.5px] text-ink-soft hover:text-ink">Annuler</button>
                    </div>
                    <p className="text-[11.5px] text-ink-faint">Compris dans l'abonnement Lancer (un SaaS par abonnement). Bingoo! construit la meilleure version possible ; rien ne garantit son succès commercial.</p>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-10 text-center text-[14px] text-ink-soft">Tu préfères partir d'un SaaS qui marche déjà ? <button onClick={() => nav("/explorer/trouver")} className="font-semibold text-ink underline underline-offset-2">Trouver mon SaaS</button></p>
    </div>
  );
}
