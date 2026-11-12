// Micro-niches de SaaS : des marchés précis (« Humaniser les textes IA », « Pinterest »…), reconnus sans IA par mots-clés
// (anglais et français) dans le nom, la description et la fiche TrustMRR. Ordre = priorité : la première qui colle l'emporte.
// Motifs au format des expressions régulières PostgreSQL (\y = limite de mot).
export const MICRO_NICHES: [slug: string, emoji: string, nom: string, phrase: string, motif: string][] = [
[
"humaniser-ia",
"✍️",
"Humaniser les textes IA",
"Rend un texte écrit par ChatGPT indétectable",
"humani[sz]|undetectable|bypass (ai )?detect|ai detector bypass"
],
[
"detecteur-ia",
"🔎",
"Détecter les textes IA",
"Dit si un texte a été écrit par une IA",
"ai (content )?detector|detect(s|ing)? ai|ai detection|plagiar"
],
[
"portraits-ia",
"🧑‍💼",
"Portraits et photos de profil IA",
"Photos pro générées à partir de selfies",
"headshot|professional portrait|profile (picture|photo)|linkedin photo|ai photoshoot|avatar"
],
[
"deco-ia",
"🛋️",
"Déco et home staging IA",
"Meuble ou redécore une pièce en photo",
"interior design|room (design|redesign)|virtual staging|home staging|redecorat|décor|renovat"
],
[
"video-courte",
"🎬",
"Vidéos courtes et UGC IA",
"TikTok, Reels, Shorts générés ou découpés",
"\\yugc\\y|short.?form|youtube shorts|\\yreels?\\y|faceless|tiktok video|viral clips?|clipping|clip maker|video clips?"
],
[
"sous-titres",
"💬",
"Sous-titres et transcription",
"Transforme l'audio ou la vidéo en texte",
"transcri|subtitle|captions?\\y|sous-titr|speech.?to.?text|dictation"
],
[
"voix-ia",
"🎙️",
"Voix off, doublage et voix IA",
"Texte en voix, clonage, doublage",
"voice.?over|text.?to.?speech|\\ytts\\y|voice clon|dubbing|doublage|ai voices?"
],
[
"musique-ia",
"🎵",
"Musique IA",
"Chansons, beats et sons générés",
"\\ymusic\\y|\\ysongs?\\y|\\ybeats?\\y|lyrics|musique"
],
[
"logos-ia",
"🎨",
"Logos et identité de marque",
"Logos, chartes et kits de marque",
"\\ylogos?\\y|brand kit|branding|brand identity"
],
[
"miniatures",
"🖼️",
"Miniatures YouTube",
"Miniatures qui font cliquer",
"thumbnail"
],
[
"pinterest",
"📌",
"Pinterest",
"Épingles et trafic Pinterest",
"pinterest"
],
[
"linkedin",
"💼",
"Croissance LinkedIn",
"Posts, prospection et audience LinkedIn",
"linkedin"
],
[
"x-twitter",
"🐦",
"Croissance sur X",
"Tweets, threads et audience X",
"twitter|\\ytweets?\\y|\\ythreads? on x\\y|\\yx \\(twitter\\)|x/twitter|post on x"
],
[
"insta-tiktok",
"📱",
"Instagram et TikTok",
"Croissance, contenus et statistiques",
"instagram|tiktok"
],
[
"reddit",
"👽",
"Marketing sur Reddit",
"Trouver des clients sur Reddit",
"reddit"
],
[
"youtube",
"▶️",
"Outils YouTube",
"Scripts, idées, statistiques YouTube",
"youtube"
],
[
"planif-social",
"🗓️",
"Planifier ses posts",
"Programmer ses publications partout",
"schedul\\w* (posts|content|social)|social media (schedul|management|manager)|post schedul|publish (to|on) (all|multiple)|cross.?post"
],
[
"cold-email",
"📨",
"Cold e-mailing et délivrabilité",
"Envoyer des e-mails de prospection qui arrivent",
"cold (email|outreach)|deliverab|warm.?up|inbox placement|email outreach|sending infrastructure"
],
[
"verif-email",
"✅",
"Vérification d'e-mails",
"Nettoyer ses listes d'adresses",
"email verif|verify emails?|email valid|bounce"
],
[
"leads",
"🎯",
"Trouver des leads",
"Listes de prospects et enrichissement",
"\\yleads?\\y|lead gen|prospect(s|ing)? list|b2b data|enrich|scrap(e|er|ing)|contact data|find emails"
],
[
"geo-ia",
"🤖",
"Être cité par ChatGPT (GEO)",
"Visibilité dans les réponses des IA",
"\\ygeo\\y|\\yaeo\\y|answer engine|llm visibility|ai visibility|ai search visibility|chatgpt visibility|mentioned (by|in) (ai|chatgpt)|ai overviews"
],
[
"seo-articles",
"📝",
"SEO et articles de blog IA",
"Articles optimisés pour Google",
"\\yseo\\y|blog (post|article)s?|article (writer|generator)|keyword research|rank (on|higher)|organic traffic"
],
[
"backlinks",
"🔗",
"Backlinks et annuaires",
"Liens et inscriptions dans les annuaires",
"backlink|directory submission|directories|launch platform|submit your (startup|saas)"
],
[
"analytics",
"📊",
"Statistiques de site",
"Comprendre ses visiteurs",
"web analytics|website analytics|privacy.?friendly analytics|visitor analytics|google analytics alternative|heatmap|session replay"
],
[
"monitoring",
"🛰️",
"Surveillance de sites",
"Alerte quand un site tombe ou change",
"uptime|status page|monitor(ing)? (your )?(website|site|changes)|downtime"
],
[
"formulaires",
"🧾",
"Formulaires et sondages",
"Questionnaires, quiz, sondages",
"form builder|forms?\\y.*(builder|create)|survey|questionnaire|formulaire|quiz maker"
],
[
"rdv",
"📅",
"Prise de rendez-vous",
"Réservations et agendas en ligne",
"booking|appointment|scheduling (tool|software|link)|book (a )?(call|meeting)|calendar|rendez-vous|réservation"
],
[
"agent-vocal",
"☎️",
"Standards téléphoniques IA",
"Une IA répond aux appels",
"ai receptionist|voice agent|phone (agent|assistant)|answer(s|ing)? (phone )?calls|call(s)? answering|ai calling|phone calls?"
],
[
"support-ia",
"🛟",
"Chatbot et support client IA",
"Répond aux clients à ta place",
"chatbot|customer support|helpdesk|support (agent|tickets)|live chat|answers? customer"
],
[
"factures",
"🧾",
"Factures et devis",
"Facturer et relancer ses clients",
"invoic|factur|\\yquotes?\\y|devis|estimates?\\y|billing for freelanc"
],
[
"cv-emploi",
"📄",
"CV et recherche d'emploi",
"CV, lettres, candidatures automatiques",
"\\yresumes?\\y|\\ycv\\y|cover letter|job (search|application|hunt)|apply (to|for) jobs|ats.?friendly"
],
[
"entretiens",
"🗣️",
"Préparer ses entretiens",
"Entraînement et questions d'entretien",
"interview (prep|practice|coach|copilot)|mock interview"
],
[
"langues",
"🌍",
"Apprendre une langue",
"Applis et coachs de langue",
"language learning|learn (english|spanish|french|german|japanese|italian|portuguese|a language)|vocabulary|fluency|langue"
],
[
"etudes",
"🎓",
"Réviser et étudier",
"Fiches, quiz et aide aux devoirs",
"flashcards?|\\ystudy\\y|students?|exam prep|\\yexams?\\y|homework|révision|anki"
],
[
"trading",
"📈",
"Trading et bourse",
"Signaux, journaux de trading, analyses",
"trading|traders?\\y|stocks?\\y|forex|crypto|options flow|portfolio|dividend|investing"
],
[
"paris-sportifs",
"⚽",
"Paris sportifs et pronostics",
"Pronostics et statistiques sportives",
"betting|\\ybets?\\y|sportsbook|\\yodds\\y|\\ypicks\\y|fantasy (football|sports)|prediction"
],
[
"fitness",
"🏋️",
"Sport et fitness",
"Programmes, coaching, suivi",
"fitness|workout|\\ygym\\y|running|training plan|athlet|exercise|coach(ing)? (app|for)"
],
[
"nutrition",
"🥗",
"Nutrition et repas",
"Calories, recettes, plans de repas",
"\\ymeals?\\y|nutrition|calorie|recipes?|\\ydiet\\y|macros|food tracking"
],
[
"bien-etre",
"🧘",
"Bien-être et habitudes",
"Journal, méditation, habitudes",
"journal(ing)?|mental health|meditat|habit|mindful|anxiety|sleep"
],
[
"dating",
"💘",
"Rencontres",
"Profils, messages et coaching de dating",
"dating|tinder|hinge|bumble|relationship|couple"
],
[
"immobilier",
"🏠",
"Immobilier",
"Outils pour agents et propriétaires",
"real estate|realtor|propert(y|ies)|listing (photos|description)|landlord|rental|immobili|airbnb|short.?term rental"
],
[
"restaurants",
"🍽️",
"Restaurants",
"Menus, commandes, avis",
"restaurant|menu\\y|food ordering|caf(e|é)s?\\y|bars?\\y"
],
[
"shopify",
"🛍️",
"Applis Shopify",
"Pour les boutiques Shopify",
"shopify"
],
[
"marketplaces",
"🏷️",
"Amazon, Etsy et marketplaces",
"Fiches produits et ventes sur marketplaces",
"amazon|etsy|ebay|product listing|dropship|marketplace sellers?|vinted|print.?on.?demand"
],
[
"boilerplates",
"🧱",
"Boilerplates et kits pour coder",
"Partir d'une base de code prête",
"boilerplate|starter kit|saas template|next\\.?js (template|starter)|ship (faster|fast)|codebase"
],
[
"api-dev",
"🛠️",
"API et outils pour développeurs",
"Briques techniques à brancher",
"\\yapis?\\y|developers?\\y|\\ysdk\\y|webhook|devtools?|github|code review|deploy"
],
[
"automatisation",
"⚙️",
"Automatisations (n8n, Zapier)",
"Workflows et automatisations prêts",
"\\yn8n\\y|zapier|make\\.com|automation workflows?|workflow automation|automate (your|repetitive)"
],
[
"agents-ia",
"🦾",
"Agents IA et hébergement",
"Agents autonomes, OpenClaw, hébergement",
"\\yclaw|openclaw|ai agents?\\y|agentic|autonomous agent|mcp\\y"
],
[
"llm",
"🧠",
"Accès à ChatGPT, Claude et cie",
"Interfaces et passerelles vers les IA",
"chatgpt|\\yllms?\\y|\\ygpt\\y|claude|gemini|openai|ai chat|multiple (ai )?models|prompts?\\y"
],
[
"notion",
"🗂️",
"Templates et outils Notion",
"Pour les utilisateurs de Notion",
"notion"
],
[
"sites-ia",
"🌐",
"Créer un site ou une landing page",
"Sites générés ou sans code",
"website builder|landing pages?|site builder|build (a |your )?website|no.?code website|web design"
],
[
"extensions",
"🧩",
"Extensions de navigateur",
"Petits outils dans Chrome",
"chrome extension|browser extension|extension for chrome"
],
[
"mac-apps",
"🍎",
"Applis Mac",
"Utilitaires pour macOS",
"\\ymac(os)? app|\\ymacos\\y|menu bar|for mac\\y"
],
[
"captures",
"📸",
"Captures d'écran et maquettes",
"Screenshots, mockups, visuels d'appli",
"screenshot|mockup|app store (screenshots|images)"
],
[
"pdf",
"📑",
"Outils PDF",
"Lire, éditer, convertir des PDF",
"\\ypdfs?\\y"
],
[
"qr",
"🔳",
"QR codes",
"Créer et suivre des QR codes",
"qr ?codes?"
],
[
"liens",
"🔗",
"Liens et pages bio",
"Raccourcisseurs et link in bio",
"link in bio|url shortener|short links?|bio link"
],
[
"newsletters",
"📰",
"Newsletters",
"Écrire et faire grandir une newsletter",
"newsletter"
],
[
"communautes",
"👥",
"Communautés et Discord",
"Membres, communautés, bots Discord",
"communit(y|ies)|membership|discord"
],
[
"evenements",
"🎟️",
"Événements et billetterie",
"Organiser et vendre des places",
"\\yevents?\\y|ticket|webinar|conference"
],
[
"paiements",
"💳",
"Paiements et abonnements",
"Encaisser et gérer ses abonnés",
"stripe|payments?\\y|subscription (billing|management)|checkout|paywall"
],
[
"affiliation",
"🤝",
"Affiliation et parrainage",
"Faire vendre par d'autres",
"affiliate|referral|parrainage"
],
[
"avis",
"⭐",
"Avis clients et témoignages",
"Collecter et afficher des avis",
"reviews?\\y|testimonial|feedback|google reviews"
],
[
"compta",
"🧮",
"Comptabilité et impôts",
"Compta, TVA, impôts",
"\\ytax(es)?\\y|bookkeeping|accounting|comptab|expense"
],
[
"recrutement",
"🧲",
"Recrutement",
"Trouver et trier des candidats",
"recruit|hiring|\\yats\\y|applicants?|talent|job board"
],
[
"juridique",
"⚖️",
"Juridique et conformité",
"Contrats, RGPD, documents légaux",
"\\ylegal\\y|contracts?|lawyers?|gdpr|privacy polic|terms of service|compliance"
],
[
"securite",
"🛡️",
"Sécurité",
"Scans, failles, mots de passe",
"security|vulnerab|pentest|password|malware|phishing"
],
[
"proxies",
"🌐",
"Proxies, VPN et hébergement",
"Infrastructure réseau",
"prox(y|ies)|\\yvpn\\y|hosting|vps\\y|servers?"
],
[
"voyage",
"✈️",
"Voyages et eSIM",
"eSIM, visas, itinéraires",
"\\yesim|travel|\\ytrips?\\y|\\yvisas?\\y|itinerar|flights?"
],
[
"retouche",
"🪄",
"Retouche photo IA",
"Détourer, agrandir, restaurer des photos",
"background remov|upscal|retouch|restore (old )?photos?|photo edit|enhance (photos|images)|colori[sz]"
],
[
"images-ia",
"🖌️",
"Génération d'images IA",
"Images, illustrations, art IA",
"image generat|ai (art|images?)|text.?to.?image|illustration|anime|coloring pages?|tattoo|stickers?"
],
[
"presentations",
"🖥️",
"Présentations et slides",
"Diaporamas et pitch decks",
"presentations?|slides|pitch deck|powerpoint"
],
[
"ecriture",
"📚",
"Livres et écriture",
"Ebooks, romans, édition",
"\\ybooks?\\y|ebooks?|novel|\\ykdp\\y|writing (assistant|tool)|authors?\\y|story|stories"
],
[
"podcasts",
"🎧",
"Podcasts",
"Créer et diffuser des podcasts",
"podcast"
],
[
"productivite",
"✔️",
"Productivité et to-do",
"Tâches, focus, organisation",
"to.?do|task manager|productivity|\\yfocus\\y|pomodoro|planner"
],
[
"gestion-projet",
"📋",
"Gestion de projet",
"Projets et équipes",
"project management|kanban|roadmap|team collaboration"
],
[
"notes",
"🗒️",
"Notes et base de connaissances",
"Prendre des notes, second cerveau",
"note.?taking|\\ynotes\\y|knowledge base|second brain|bookmarks?"
],
[
"reunions",
"🤝",
"Réunions",
"Comptes rendus et notes de réunion",
"meeting|call notes|zoom|google meet"
],
[
"traduction",
"🈯",
"Traduction",
"Traduire textes, sites, vidéos",
"translat|traduct|locali[sz]ation"
],
[
"ecole",
"🏫",
"Enseignants et écoles",
"Outils pour profs et classes",
"teachers?|classroom|schools?|kids|children|parents?\\y"
],
[
"sante",
"🩺",
"Cliniques et santé",
"Patients, cabinets, soins",
"clinic|patients?|medical|dental|therap|doctors?|health(care)?"
],
[
"beaute",
"💅",
"Salons et beauté",
"Coiffure, ongles, esthétique",
"salons?|beauty|hair|nails?|\\yspa\\y|skin ?care|makeup"
],
[
"artisans",
"🔧",
"Artisans et services à domicile",
"Plombiers, ménage, travaux",
"plumb|cleaning|contractors?|hvac|landscap|roofing|electrician|handyman|construction"
],
[
"jeux",
"🎮",
"Jeux vidéo",
"Outils et services pour joueurs",
"\\ygames?\\y|gaming|minecraft|roblox|fortnite|valorant|steam"
]
];
