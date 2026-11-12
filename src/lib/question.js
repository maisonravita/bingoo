// « Demande à Bingoo! » : transforme une question en français (ou en anglais) en filtres de recherche, sans IA.
// Ex. « trouve-moi 3 SaaS de facturation qui scalent en ce moment » → { texte: "invoic|factur", tri: "croissance", nombre: 3, verifie: true }
const sans = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Mots du quotidien → mots-clés cherchés dans les SaaS (souvent en anglais)
const SUJETS = [
  [/factur|invoice|devis/, "invoic(e|es|ing)\\b|factur|billing (software|tool|app)|\\bdevis\\b", "facturation"],
  [/compta|accounting|impot|tva|tax/, "accounting|bookkeep|comptab|\\btax", "comptabilité"],
  [/cv\b|resume|candidat|emploi|job/, "resume|\\bcv\\b|cover letter|job", "CV et emploi"],
  [/pinterest/, "pinterest", "Pinterest"], [/tiktok/, "tiktok", "TikTok"], [/instagram|insta\b/, "instagram", "Instagram"], [/linkedin/, "linkedin", "LinkedIn"], [/reddit/, "reddit", "Reddit"], [/youtube/, "youtube", "YouTube"], [/twitter|\bx\b/, "twitter|\\btweets?\\b", "X"],
  [/seo|referencement|google/, "\\bseo\\b|rank|keyword|blog", "SEO"], [/backlink|annuaire/, "backlink|director", "backlinks"],
  [/email|e-mail|mail|newsletter/, "email|newsletter|inbox", "e-mail"], [/prospect|lead/, "\\bleads?\\b|prospect|outreach", "prospection"],
  [/video|clip|short|reel|ugc/, "video|clip|shorts|reels|ugc", "vidéo"], [/image|photo|logo|design/, "image|photo|logo|design", "images"], [/voix|voice|audio|podcast/, "voice|audio|podcast|speech", "voix et audio"],
  [/musique|music|chanson/, "music|song", "musique"], [/sous-titre|subtitle|transcri/, "subtit|caption|transcri", "transcription"], [/tradu|translat/, "translat", "traduction"],
  [/chatbot|support client|service client/, "chatbot|support|helpdesk", "support client"], [/rendez-vous|reservation|booking|agenda|calendar/, "booking|appointment|calendar|schedul", "rendez-vous"],
  [/immobili|real estate|airbnb|location/, "real estate|realtor|propert|airbnb|rental", "immobilier"], [/restaurant|menu/, "restaurant|menu", "restaurants"],
  [/sport|fitness|muscu|gym|running/, "fitness|workout|gym|running|sport", "sport"], [/nutrition|recette|repas|calorie|regime/, "meal|nutrition|calorie|recipe|diet", "nutrition"],
  [/sante|medical|clinique|patient|therap/, "health|medical|clinic|patient|therap", "santé"], [/beaute|coiffure|salon|esthetique/, "beauty|salon|hair|nail|spa", "beauté"],
  [/trading|bourse|crypto|invest/, "trading|stock|crypto|invest", "trading"], [/pari|betting|pronostic/, "betting|\\bbets?\\b|odds|picks", "paris sportifs"],
  [/langue|anglais|espagnol|language/, "language|english|spanish|vocab", "langues"], [/etudiant|revision|etude|cours|flashcard|exam/, "study|student|flashcard|exam|course", "études"],
  [/ecommerce|e-commerce|shopify|boutique|etsy|amazon/, "shopify|ecommerce|e-commerce|etsy|amazon|store", "e-commerce"],
  [/\bia\b|\bai\b|chatgpt|gpt|llm|agent/, "\\bai\\b|gpt|llm|agent|claude", "IA"], [/automatis|no-code|nocode|n8n|zapier/, "automat|no-?code|n8n|zapier", "automatisation"],
  [/recrut|rh\b|hiring/, "recruit|hiring|\\bats\\b|\\bhr\\b", "recrutement"], [/juridique|avocat|contrat|legal|rgpd/, "legal|contract|lawyer|gdpr", "juridique"],
  [/pdf/, "\\bpdf", "PDF"], [/qr/, "qr ?code", "QR codes"], [/formulaire|sondage|quiz|survey/, "form|survey|quiz", "formulaires"], [/extension|chrome/, "extension|chrome", "extensions"],
  [/dev|developpeur|api|code/, "developer|\\bapi\\b|code|github", "développeurs"], [/analytics|statistique|trafic/, "analytics|traffic|visitor", "statistiques"],
  [/dating|rencontre/, "dating|tinder|relationship", "rencontres"], [/jeu|gaming|game/, "\\bgames?\\b|gaming", "jeux"], [/voyage|travel|esim|visa/, "travel|esim|visa|trip", "voyage"],
];
const NOMBRES = { deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, vingt: 20 };

export function lireQuestion(q) {
  const t = sans(q);
  const p = { verifie: true, tri: "croissance", nombre: 10 };
  const lu = [];
  const n = t.match(/\b(\d{1,2})\b(?!\s*(?:k|000|\$|€|%|dollars|euros))/) ?? t.match(new RegExp(`\\b(${Object.keys(NOMBRES).join("|")})\\b\\s+(?:saas|logiciels?|outils?|apps?|applis?|idees?|exemples?|produits?|concurrents?)`));
  if (n) { p.nombre = Math.min(50, Number(n[1]) || NOMBRES[n[1]] || 10); }
  const sujets = SUJETS.filter(([re]) => re.test(t));
  if (sujets.length) { p.texte = sujets.map(([, m]) => m).join("|"); lu.push(sujets.map(([, , l]) => l).join(", ")); }
  if (/scal|grandi|croiss|monte|decoll|grow|explos|cartonn|marche (bien|fort)|en ce moment/.test(t)) { p.tri = "croissance"; lu.push("qui grandissent le plus"); }
  if (/plus gros|gagne le plus|plus rentable|plus d.argent|biggest|top revenu|millionnaire/.test(t)) { p.tri = "revenu"; lu.push("plus gros revenu"); }
  if (/encaiss/.test(t)) { p.tri = "encaisse"; lu.push("le plus encaissé en 30 jours"); }
  if (/facile|copier|copiable|simple a (faire|copier)/.test(t)) { p.tri = "copiable"; lu.push("faciles à copier"); }
  if (/nouveau|recent|cette annee|lance recemment|jeune/.test(t)) { p.recent = true; lu.push("créés cette année"); }
  if (/solo|seul|une (seule )?personne|indie|independant/.test(t)) { p.solo = true; lu.push("tenus par une seule personne"); }
  if (/a vendre|a racheter|racheter|acheter un saas|for sale|rachat/.test(t)) { p.a_vendre = true; lu.push("à vendre"); }
  if (/sans (concurrent )?francais|pas en france|pas d.equivalent|absent en france/.test(t)) { p.sans_fr = true; lu.push("sans concurrent français"); }
  if (/\bb2b\b|professionnel|entreprises?\b|pme|pros?\b|agences?/.test(t)) { p.cible = "B2B"; lu.push("vendent aux pros"); }
  if (/\bb2c\b|particulier|grand public|consommateur/.test(t)) { p.cible = "B2C"; lu.push("vendent aux particuliers"); }
  if (/francais|en france|\bfr\b/.test(t) && !p.sans_fr) { p.pays = "FR"; lu.push("français"); }
  if (/sans pub|organique|contenu|seo/.test(t) && /trouve|client|acquisi/.test(t)) { p.canal = "seo"; lu.push("clients par Google et le contenu"); }
  if (/par (les )?reseaux|via (les )?reseaux|grace aux reseaux/.test(t)) { p.canal = "reseaux"; lu.push("clients par les réseaux"); }
  if (/cold|prospection|demarch/.test(t) && /trouve|client|acquisi/.test(t)) { p.canal = "prospection"; lu.push("clients par la prospection"); }
  if (/publicite|\bads\b|pub\b/.test(t)) { p.canal = "pub"; lu.push("clients par la publicité"); }
  const montant = t.match(/(?:plus de|au moins|minimum|>|over|above)\s*(\d+(?:[.,]\d+)?)\s*(k|000)?\s*(?:\$|€|dollars|euros)?/);
  if (montant) { p.mrr_min = Math.round(Number(montant[1].replace(",", ".")) * (montant[2] === "k" ? 1000 : montant[2] === "000" ? 1000 : 1)); lu.push(`au moins ${p.mrr_min.toLocaleString("fr-FR")} $ par mois`); }
  const plafond = t.match(/(?:moins de|maximum|max|sous|under|below)\s*(\d+(?:[.,]\d+)?)\s*(k|000)?\s*(?:\$|€|dollars|euros)?/);
  if (plafond) { p.mrr_max = Math.round(Number(plafond[1].replace(",", ".")) * (plafond[2] ? 1000 : 1)); lu.push(`moins de ${p.mrr_max.toLocaleString("fr-FR")} $ par mois`); }
  if (/petit/.test(t) && !p.mrr_max) { p.mrr_max = 5000; lu.push("petits (moins de 5 000 $ par mois)"); }
  return { p, lu: [...new Set(lu)] };
}
