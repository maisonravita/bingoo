// Plan des 30 premiers jours et prompt pour son propre Claude, construits sans IA à partir des vraies données du SaaS choisi
const ACTIONS = {
  "SEO": (q) => `Écris ${q(4, 2)} articles qui répondent aux questions que se pose ta cible sur Google, un mot-clé précis par article.`,
  "Blog": (q) => `Publie ${q(2, 1)} articles de blog par semaine qui montrent le problème et comment ton outil le règle.`,
  "Content marketing": (q) => `Transforme chaque article en ${q(3, 2)} posts courts pour les réseaux.`,
  "Newsletter": () => "Lance une newsletter hebdomadaire et propose-la en bas de chaque page de ton site.",
  "Email marketing": () => "Mets en place 3 e-mails automatiques pour les inscrits à l'essai : bienvenue, astuce, relance.",
  "X / Twitter": (q) => `Raconte la construction de ton SaaS en public sur X : ${q(1, 1)} post par jour, chiffres compris.`,
  "LinkedIn": (q) => `Publie ${q(3, 2)} posts par semaine sur LinkedIn sur le problème de ta cible, et commente 10 posts de ta cible par jour.`,
  "Reddit": (q) => `Trouve 3 communautés Reddit où ta cible pose des questions, et réponds utilement ${q(5, 2)} fois par semaine avant de parler de ton outil.`,
  "TikTok": (q) => `Publie ${q(1, 1)} vidéo courte par jour qui montre le résultat que ton outil donne, en 15 secondes.`,
  "Instagram": (q) => `Publie ${q(4, 2)} carrousels ou Reels par semaine avec des exemples avant / après.`,
  "YouTube": () => "Publie un tutoriel par semaine qui répond à une question précise de ta cible, avec ton outil à l'écran.",
  "Facebook": () => "Rejoins 5 groupes Facebook de ta cible et réponds aux questions sans vendre ; partage ton outil quand il règle un problème cité.",
  "Threads": () => "Reprends tes meilleurs posts X ou Instagram sur Threads.",
  "Pinterest": (q) => `Crée ${q(5, 3)} épingles par jour qui renvoient vers tes pages : Pinterest envoie du trafic pendant des mois.`,
  "Discord": () => "Rejoins les serveurs Discord de ta cible et ouvre un salon d'entraide autour de ton outil.",
  "Hacker News": () => "Publie un « Show HN » un mardi matin (heure de New York) avec une démo qui marche sans inscription.",
  "Forums": () => "Réponds sur les forums spécialisés de ta niche et mets ton outil en signature.",
  "Slack communities": () => "Rejoins 3 communautés Slack de ta cible et partage tes apprentissages chaque semaine.",
  "Product Hunt": () => "Prépare ton lancement Product Hunt : visuels, vidéo de 30 secondes, et 20 personnes prévenues pour le jour J.",
  "App store optimization": () => "Optimise ta fiche App Store : mots-clés dans le titre, 5 captures qui montrent le résultat.",
  "Cold email": (q) => `Envoie ${q(20, 10)} e-mails personnalisés par jour à des gens qui ont exactement le problème, avec une question, pas un argumentaire.`,
  "Cold DM": (q) => `Envoie ${q(15, 8)} messages privés par jour à des personnes de ta cible qui parlent publiquement du problème.`,
  "Cold calling": (q) => `Appelle ${q(10, 5)} entreprises de ta cible par jour pour comprendre leur problème et proposer un essai.`,
  "Partnerships": () => "Propose un partenariat à 5 outils complémentaires : vous vous recommandez mutuellement.",
  "Events & conferences": () => "Va à un salon ou un meetup de ta cible ce mois-ci, avec ton outil prêt à montrer sur ton téléphone.",
  "Google Ads": () => "Lance une petite campagne Google Ads (10 € par jour) sur 3 mots-clés très précis, et coupe ce qui ne convertit pas après 7 jours.",
  "Meta Ads": () => "Teste 3 visuels sur Meta Ads à 10 € par jour chacun ; garde le meilleur après 5 jours.",
  "LinkedIn Ads": () => "Teste LinkedIn Ads seulement si ton prix dépasse 50 € par mois : la pub y coûte cher.",
  "TikTok Ads": () => "Booste ta meilleure vidéo TikTok de la semaine avec 10 € par jour.",
  "Influencers": () => "Contacte 10 petits créateurs de ta niche et offre-leur l'outil contre un avis honnête.",
  "Word of mouth": () => "Demande à chaque client satisfait de te présenter une personne qui a le même problème.",
  "Referral program": () => "Ajoute un parrainage : un mois offert pour le parrain et le filleul.",
  "Affiliate": () => "Ouvre un programme d'affiliation à 30 % du revenu, et propose-le aux créateurs de ta niche.",
};
const REFUS_CANAUX = {
  appeler: ["Cold calling", "Cold DM", "Cold email", "Partnerships", "Events & conferences"],
  video: ["YouTube", "TikTok", "Instagram", "Influencers", "YouTube Ads", "TikTok Ads"],
  ecrire: ["SEO", "Blog", "Content marketing", "Newsletter", "X / Twitter", "LinkedIn", "Threads"],
  pub: ["Google Ads", "Meta Ads", "LinkedIn Ads", "TikTok Ads", "X Ads", "YouTube Ads"],
};
const DEFAUT = ["SEO", "Reddit", "Product Hunt", "Word of mouth"];

export function plan30(s, r) {
  const peu = r.temps === "peu";
  const q = (beaucoup, un_peu) => (peu ? un_peu : beaucoup);
  const interdits = new Set((r.refus ?? []).flatMap((k) => REFUS_CANAUX[k] ?? []));
  const canaux = [...(s.canaux ?? []), ...DEFAUT].filter((c, i, a) => ACTIONS[c] && !interdits.has(c) && a.indexOf(c) === i).slice(0, 3);
  const prix = s.prix_entree_eur ? Math.round(s.prix_entree_eur) : null;
  const cible = s.persona || (/B2B/.test(s.audience ?? "") ? "les professionnels visés" : "ta cible");
  return {
    canaux,
    semaines: [
      { titre: "Semaine 1 : construire ta version", actions: [
        `Fais construire par Bingoo! ta version de ${s.nom}, à ton nom et avec ton design (environ une heure de ton côté).`,
        "Choisis un nom, achète le domaine et branche-le en un clic depuis Mes SaaS.",
        "Branche ton compte Stripe : tes clients pourront payer dès le premier jour.",
        prix ? `Fixe ton prix près du sien : ${s.nom} démarre à ${prix} € par mois, c'est un prix que le marché accepte déjà.` : `Regarde le prix de ${s.nom} sur son site et place-toi au même niveau pour commencer.`,
      ] },
      { titre: "Semaine 2 : préparer le lancement", actions: [
        "Publie ta page de précommande et montre-la à 10 personnes qui ont le problème : note leurs mots exacts.",
        `Fais une liste de ${q(50, 25)} personnes ou entreprises de ${cible} à qui ton outil servirait.`,
        ...canaux.slice(0, 1).map((c) => `Commence ${c === "SEO" || c === "Blog" ? "ton premier contenu" : "à te montrer"} sur ton premier canal : ${ACTIONS[c](q)}`),
      ] },
      { titre: "Semaines 3 et 4 : tes 10 premiers clients", actions: canaux.map((c) => ACTIONS[c](q)) },
      { titre: "Jour 30 : le point", actions: [
        prix ? `Objectif : 10 clients payants, soit ${10 * prix} € par mois.` : "Objectif : 10 clients payants.",
        "Garde le canal qui a amené le plus de clients et arrête les autres : concentre-toi le mois suivant.",
        "Appelle 3 clients pour savoir ce qui les a convaincus, et mets leurs mots sur ta page d'accueil.",
      ] },
    ],
  };
}

export function promptClaude(s, r) {
  const debutant = r.profil !== "code";
  return `Tu es mon associé technique. Je veux lancer un SaaS inspiré d'un SaaS qui gagne déjà de l'argent, mais à mon nom : sans reprendre son nom, ses textes, ses images ni son design.

Le SaaS de référence : ${s.nom} (${s.domaine})
Ce qu'il fait : ${s.proposition || s.description || ""}
${s.prix_texte ? `Son prix : ${s.prix_texte}\n` : ""}Sa cible : ${s.persona || s.audience || "à préciser"}
Son revenu vérifié : environ ${s.mrr ? `${Number(s.mrr).toLocaleString("fr-FR")} $ par mois` : "non public"}
Comment il trouve ses clients : ${(s.canaux ?? []).slice(0, 5).join(", ") || "non précisé"}

Ce que je veux :
1. Liste d'abord les 5 fonctions indispensables de la première version, et ce que je laisse pour plus tard.
2. Propose un nom, puis construis l'application avec Next.js, Supabase (comptes et base de données), Stripe (abonnements) et Vercel (mise en ligne).
3. ${debutant ? "Je débute : explique chaque étape simplement, donne-moi une seule commande à la fois, et attends que je te dise que ça a marché avant de passer à la suite." : "Va droit au but : donne-moi la structure du projet, puis le code fichier par fichier."}
4. Termine par une page d'accueil qui explique le bénéfice en une phrase, avec un essai gratuit.

Mon temps disponible : ${r.temps === "peu" ? "moins de 5 heures par semaine" : r.temps === "beaucoup" ? "plus de 15 heures par semaine" : "5 à 15 heures par semaine"}.`;
}
