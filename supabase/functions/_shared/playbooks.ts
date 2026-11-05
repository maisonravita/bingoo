// Playbooks de vente injectés dans les consignes des agents. Adaptés pour le marché français à partir des
// « skills » de Harvey (© 2026 Ethan Rogers, licence MIT : voir THIRD_PARTY_HARVEY_LICENSE.txt).

/** Rédaction d'un premier e-mail et des relances. */
export const PLAYBOOK_ECRITURE = `
Méthode d'écriture (à appliquer strictement) :
- Écris comme une vraie personne qui a remarqué quelque chose, pas comme un marketeur ni comme une IA. Relu à voix haute, ça ne doit pas sonner « commercial ».
- Un seul sujet, une seule idée, une seule question. Le prospect apparaît avant notre offre ; dans le premier e-mail, l'offre se résume en une phrase.
- Première phrase = le fait observé qui justifie d'écrire aujourd'hui (signal), dit simplement, sans flatterie. Sans signal réel : une observation honnête sur son métier.
- Question finale facile à répondre, propre à CE prospect et à CE fait : elle reprend un mot de son métier ou de la situation observée (ex. « Qui gère l'entretien des locaux depuis l'ouverture du site de Bois-d'Arcy ? », « Le sujet revient-il avec la reprise du fonds ? », « Comment gérez-vous les demandes qui arrivent le soir ? »). Une seule question, jamais la même formule passe-partout. Proposer quelque chose d'utile sans engagement (un diagnostic, un exemple concret) marche mieux que « 30 minutes ? ».
- Le fait observé se dit comme on le dirait à voix haute (« Vous avez repris le fonds de… », « Vous avez déménagé à… »), sans citer d'où vient l'information : jamais « selon le BODACC », « publié au BODACC », « d'après le registre », « attire notre attention », « attire mon attention ».
- Si la fonction du destinataire est inconnue, ne la suppose pas (pas de « En tant que responsable… »). Ne cite aucun autre établissement que celui du prospect.
- Français soigné : élision (« d'Inside », « l'EPS »), accords, pas d'anglicismes inutiles.
- Interdits : tiret long (—), « J'espère que vous allez bien », « Je me permets de », « Je reviens vers vous », « N'hésitez pas », « Imaginez », « Est-ce un sujet chez vous en ce moment », « Est-ce un sujet pour vous », « révolutionnaire », « solution innovante », « dans un monde où », « sans engagement » en argument, les listes, le gras, les parenthèses décoratives, les emojis, plus d'un point d'exclamation (zéro est mieux), plusieurs questions, commencer par « Je » ou « Nous ».
- Objet : 2 à 5 mots, en minuscules sauf noms propres, sincère : jamais de faux « Re : » ou « TR : » sur un premier message.
- Aucun lien dans le premier e-mail (sauf le lien de prise de rendez-vous ajouté automatiquement). Texte simple.
- Pertinence : le message doit concerner la fonction professionnelle du destinataire. Si le lien avec son métier est tiré par les cheveux, écris quelque chose de plus général mais vrai.`;

/** Utiliser un signal sans en dire plus que ce qu'il prouve. */
export const PLAYBOOK_SIGNAUX = `
Comment utiliser les signaux (un seul par e-mail, le plus pertinent pour notre offre) :
- Recrutement : parle de la charge de travail derrière le poste, pas du poste (« Vous recrutez un commercial : en attendant qu'il arrive, qui gère les nouveaux contacts ? »). Cite l'intitulé tel qu'il est publié. Jamais de salaire, d'effectif ou de raison supposée.
- Publicité Google / Meta / LinkedIn : ils dépensent déjà pour attirer des clients ; parle de ce qui se passe après le clic ou de ce qui manque à côté. Ne cite jamais un montant.
- Pas de rendez-vous en ligne : les prospects doivent appeler, donc ceux qui viennent le soir ou le week-end se perdent.
- Agence web citée : ne critique jamais l'agence ; place-toi à côté d'elle.
- Levée de fonds ou accélérateur : parle de la pression que ça crée (objectifs, recrutements, croissance), pas de « félicitations ».
- Site à l'abandon, référencement faible, invisible pour les IA : un manque concret et vérifiable, à nommer sans jugement.
- Techno du site : au plus un outil cité, et seulement s'il sert l'argument. Ne récite jamais la liste de ses outils.
- Utilise un concurrent : ne le dénigre jamais. Pars de ce qu'il fait déjà, puis montre l'angle que l'offre apporte en plus (celui fourni par la veille). Ne cite le concurrent que si c'est naturel.
- Un fait précis faux est pire qu'un fait général vrai : ne prétends rien qui ne figure pas dans les signaux ou la fiche.`;

/** Analyse des réponses et objections. */
export const PLAYBOOK_REPONSES = `
Répondre à un prospect :
- Diagnostique avant de répondre : réflexe (« pas intéressé » en une ligne) → clos poliment ou offre une seule info utile sans demande ; condition (« sous contrat jusqu'en mars ») → note la date et propose de revenir à ce moment-là ; écran de fumée (« trop cher » sans avoir demandé le prix) → l'objection réelle est la priorité ou la confiance ; objection argumentée → c'est un signal d'achat, réponds sur le fond.
- Méthode : écouter, reconnaître (« C'est logique »), clarifier si c'est vague, répondre avec un fait de la fiche, vérifier (« Est-ce que ça répond à votre question ? »).
- Budget : parle du coût de ne rien faire, uniquement à partir de ce que le prospect a dit lui-même. Autorité : demande qui est la bonne personne ou propose un court résumé à transmettre. Besoin : demande ce qui manque à leur solution actuelle. Timing : demande quand revenir, et respecte-le.
- Longueur : réponse plus courte que la sienne. Une seule question.
- Échelle d'offre : curieux → réponds et propose de montrer ; intéressé → propose un court échange avec des créneaux ; prêt (prix, délai, suite) → donne la prochaine étape concrète.
- Toute formule d'opposition (« stop », « retirez-moi », « ne plus être contacté ») = désinscription immédiate, sans argumenter.`;

/** Spécifique aux startups (accélérateur ou levée récente). */
export const PLAYBOOK_STARTUPS = `
Prospect startup : écris au fondateur comme à un pair, très court, concret, sans jargon de grand groupe. Après une levée, l'enjeu est d'atteindre vite les objectifs promis aux investisseurs ; une levée de plus de 18 mois n'est plus une actualité, ne la mentionne pas.`;

/** Nettoie un texte rédigé : supprime les tics d'écriture d'IA qui trahissent un message automatique. */
export function humanize(text: string) {
  return text
    // Caractères invisibles (espaces de largeur nulle, marques de direction, césures, balises Unicode) : jamais tapés au clavier
    .replace(/[\u200B-\u200F\u2060-\u2064\uFEFF\u00AD\u180E\u061C]|[\u{E0000}-\u{E007F}]/gu, "")
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/^(?:J['’]esp[eè]re que vous allez bien[.!]?\s*)/gim, "")
    .replace(/,?\s*(?:selon|d'après) (?:le )?(?:BODACC|registre(?: du commerce)?|Radar)\s*,?/gi, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/!(?=[^!]*!)/g, ".")
    // Élision devant un nom propre qui commence par une voyelle : « de Inside » → « d'Inside », « que Accor » → « qu'Accor »
    .replace(/\b([Dd]e|[Qq]ue) (?=[AEIOUÉÈ][a-zà-ÿ])/g, (_m, w: string) => `${w.slice(0, -1)}'`)
    .replace(/,\s*,/g, ",")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}
