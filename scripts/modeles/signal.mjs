// Modèle « Signal » (28 nov. 2026) : design repris d'une maquette d'analyse de données (ciel nuageux clair, menu à onglet
// blanc, titre centré, deux boutons, tablette et téléphone inclinés avec le tableau de bord, trois cartes « problème »
// dont la centrale colorée, trois cartes outils avec graphiques, tarifs, intégrations en étoile, questions fréquentes).
// Couleurs changées (ciel pêche et orange au lieu du bleu), textes originaux, intégrations sans logos de marques.
export const nom = "Signal";
export const slugBase = "signal";
export const metier = "Logiciel d'analyse de données";
export const design = {
  mode: "light", style: "Ciel pêche", source: "bibliotheque",
  polices: { titres: "Inter Tight", texte: "Inter" },
  couleurs: { background: "#FFFFFF", foreground: "#141414", primary: "#F26B1D", on_primary: "#FFFFFF", card: "#F7F5F3", muted: "#F7F5F3", border: "#ECE7E2", muted_foreground: "#6B6560", accent: "#F26B1D", secondary: "#F7F5F3", ring: "#F26B1D", on_accent: "#FFFFFF" },
};
const O = "#F26B1D";
const barres = (h, fort = 6) => h.map((v, i) => `<i style="height:${v}%;${i === fort ? `background:${O}` : ""}"></i>`).join("");
export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1920, height: 1088 }, prompt: "Photograph of a soft bright sky full of fluffy white and cream clouds lit by a warm peach and apricot sunrise light, pastel, airy, upper sky, no horizon, no birds, no text." },
];
export const nav = [{ mot: "Accueil", ancre: "hero" }, { mot: "Solution", ancre: "defi" }, { mot: "Ressources", ancre: "outils" }, { mot: "Tarifs", ancre: "tarifs" }];
const tab = (cls) => `<div class="sg-tab ${cls}"><aside><b>✦ Signal.</b><span>Votre société</span><span class="on">Tableau de bord</span><span>Suivi</span><span>Analyses</span><span>Stocks</span><span>Livreurs</span></aside><div class="sg-ct"><small>Bonjour Camille,</small><h4>Bon après-midi !</h4><p>● 12 envois à vérifier aujourd'hui</p><div class="sg-p2"><div class="sg-pn"><b>Analyse des envois</b><div class="sg-hist">${barres([20, 28, 34, 30, 40, 52, 96, 60, 50, 44, 36, 30, 26, 22], 6)}</div></div><div class="sg-pn"><b>Temps de travail moyen</b><strong>48,64 %</strong><div class="sg-pil"><i></i><i></i><i class="o"></i><i></i><i class="o"></i><i class="o"></i></div></div></div></div></div>`;

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    header.nav { top: 14px !important; background: transparent !important; border: 0 !important; }
    header.nav .nav__bar { max-width: none !important; padding: 8px clamp(20px, 3vw, 40px) !important; }
    header.nav .nav__logo { color: #141414 !important; font-size: 19px; font-weight: 700; letter-spacing: -.03em; } header.nav .nav__logo span { color: ${O}; }
    header.nav .nav__links { flex: none !important; margin: 0 auto; padding: 5px; border-radius: 14px; background: rgb(255 255 255 / .55); gap: 6px !important; } header.nav .nav__link { color: #3A3530 !important; font-size: 13px; padding: 8px 22px !important; border-radius: 10px; } header.nav .nav__item:first-child .nav__link { background: #fff; color: #141414 !important; }
    header.nav .sg-lg { display: inline-flex; padding: 3px; border-radius: 999px; background: #fff; font-size: 10px; } header.nav .sg-lg b { padding: 3px 8px; border-radius: 999px; background: #141414; color: #fff; } header.nav .sg-lg span { padding: 3px 8px; }
    header.nav .sg-in { color: #141414; font-size: 13px; text-decoration: none; } header.nav .sg-go { padding: 9px 18px; border-radius: 999px; background: ${O}; color: #fff; font-size: 13px; text-decoration: none; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero"><span>✦</span> Signal.</a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#hero">Accueil</a></div><div class="nav__item"><a class="nav__link" href="#defi">Solution ⌄</a></div><div class="nav__item"><a class="nav__link" href="#outils">Ressources ⌄</a></div><div class="nav__item"><a class="nav__link" href="#tarifs">Tarifs</a></div></nav>
    <div class="nav__actions"><span class="sg-lg" aria-hidden="true"><b>FR</b><span>EN</span></span><a class="sg-in" href="#tarifs">Connexion</a><a class="sg-go" href="#tarifs">Commencer</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero sg-hero">
  <style>
    #hero { position: relative; overflow: hidden; isolation: isolate; min-height: 0 !important; padding: clamp(130px, 12vw, 160px) 24px 0 !important; text-align: center; background: #fff !important; }
    #hero::after { display: none !important; }
    #hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0 !important; -webkit-mask: linear-gradient(180deg, #000 60%, transparent); mask: linear-gradient(180deg, #000 60%, transparent); }
    #hero > :not(img) { position: relative; z-index: 1; }
    #hero h1 { margin: 0 auto; font-weight: 500; font-size: clamp(40px, 4.6vw, 64px); line-height: 1.05; letter-spacing: -.04em; color: #141414 !important; -webkit-text-fill-color: #141414; }
    #hero > p { margin: 22px auto 0; max-width: 480px; font-size: 15px; line-height: 1.6; color: #4A4540 !important; -webkit-text-fill-color: #4A4540; }
    #hero .sg-act { display: flex; justify-content: center; gap: 10px; margin-top: 28px; } #hero .sg-act a { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 999px; font-size: 13px; text-decoration: none; } #hero .sg-act a:first-child { background: ${O}; color: #fff !important; } #hero .sg-act a:last-child { background: #141414; color: #fff !important; } #hero .sg-act i { width: 10px; height: 10px; border-radius: 50%; background: #3DDC6B; }
    #hero .sg-scene { position: relative; height: clamp(320px, 30vw, 420px); max-width: 940px; margin: 50px auto 0; }
    .sg-tab { position: absolute; display: grid; grid-template-columns: 110px 1fr; border: 8px solid #1A1A1A; border-bottom: 0; border-radius: 30px 30px 0 0; background: #fff; text-align: left; font-size: 8px; color: #6B6560; overflow: hidden; box-shadow: 0 30px 60px rgb(120 60 20 / .25); }
    .sg-tab aside { padding: 14px 10px; border-right: 1px solid #ECE7E2; display: grid; gap: 8px; align-content: start; } .sg-tab aside b { font-size: 10px; color: #141414; } .sg-tab aside span.on { padding: 4px 6px; border-radius: 6px; border: 1px solid #ECE7E2; color: #141414; }
    .sg-ct { padding: 14px; } .sg-ct h4 { margin: 2px 0 4px; font-size: 14px; color: #141414; } .sg-ct p { margin: 0; color: ${O}; font-size: 7.5px; } .sg-p2 { display: grid; grid-template-columns: 1.6fr 1fr; gap: 8px; margin-top: 12px; } .sg-pn { padding: 10px; border: 1px solid #ECE7E2; border-radius: 8px; } .sg-pn b { color: #141414; } .sg-pn strong { display: block; margin: 8px 0; font-size: 13px; color: #141414; }
    .sg-hist { display: flex; align-items: flex-end; gap: 4px; height: 90px; margin-top: 10px; } .sg-hist i { flex: 1; border-radius: 3px 3px 0 0; background: #EAE4DE; }
    .sg-pil { display: flex; gap: 4px; } .sg-pil i { width: 14px; height: 34px; border-radius: 8px; background: #EAE4DE; } .sg-pil i.o { background: ${O}; }
    #hero .t1 { left: 12%; right: 0; top: 0; bottom: 0; transform: rotate(-4deg); transform-origin: bottom left; } #hero .t2 { left: 0; top: 40px; bottom: 0; width: 180px; grid-template-columns: 1fr; transform: rotate(-8deg); } #hero .t2 .sg-ct { display: none; }
    @media (max-width: 767px) { #hero .t2 { display: none; } #hero .t1 { left: 0; transform: none; } }
  </style>
  <img src="IMG_1" alt="">
  <h1>Des décisions fondées<br>sur vos données, grâce à l'IA</h1>
  <p>Analysez de gros volumes de données, repérez les tendances et décidez mieux, en quelques minutes.</p>
  <div class="sg-act"><a href="#tarifs">Essai gratuit</a><a href="#tarifs"><i></i>Réserver une démo</a></div>
  <div class="sg-scene" aria-label="Aperçu du tableau de bord">${tab("t2")}${tab("t1")}</div>
</section>` },
  { id: "defi", html: `<section id="defi" class="section sg-defi" aria-labelledby="defi-h">
  <style>
    #defi { padding: clamp(60px, 6vw, 90px) 24px !important; background: #fff !important; }
    #defi .sg-in { max-width: 1080px; margin: 0 auto; } #defi small.sg-k { font-size: 11px; letter-spacing: .06em; color: #6B6560; }
    #defi .sg-tete { display: flex; justify-content: space-between; align-items: end; gap: 20px; } #defi h2 { margin: 18px 0 0; font-size: clamp(30px, 3vw, 42px); font-weight: 500; letter-spacing: -.03em; line-height: 1.1; color: #141414; } #defi .sg-tete p { margin: 14px 0 0; max-width: 460px; font-size: 13.5px; color: #6B6560; }
    #defi .sg-tete a { padding: 9px 16px; border-radius: 999px; border: 1px solid #ECE7E2; font-size: 12.5px; color: #141414; text-decoration: none; white-space: nowrap; }
    #defi .sg-g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 40px; }
    #defi article { padding: 20px; border-radius: 18px; background: #F7F5F3; } #defi article.on { background: linear-gradient(180deg, ${O}, #FF9B5E); color: #fff; }
    #defi article > div { display: flex; gap: 14px; } #defi article i { flex: none; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: ${O}; color: #fff; font-style: normal; } #defi article.on i { background: #fff; color: ${O}; }
    #defi h3 { margin: 4px 0 8px; font-size: 14px; font-weight: 600; color: inherit; } #defi article p { margin: 0; font-size: 11.5px; line-height: 1.55; color: inherit; opacity: .8; }
    #defi .sg-mini { margin-top: 22px; padding: 12px; border-radius: 12px; background: #fff; color: #141414; font-size: 10px; } #defi .sg-mini .sg-hist { height: 60px; }
    @media (max-width: 899px) { #defi .sg-g { grid-template-columns: 1fr; } #defi .sg-tete { flex-direction: column; align-items: start; } }
  </style>
  <div class="sg-in"><small class="sg-k">POURQUOI SIGNAL</small>
  <div class="sg-tete"><div><h2 id="defi-h">Le défi des données,<br>pour chaque entreprise</h2><p>Transformer des données en décisions, c'est difficile. Signal simplifie tout le parcours pour décider plus vite et mieux.</p></div><a href="#outils">Comment ça marche</a></div>
  <div class="sg-g">
    <article><div><i>↗</i><div><h3>Études de marché</h3><p>Des montagnes de données, des sources éparpillées : difficile d'avoir une vue d'ensemble.</p></div></div><div class="sg-mini">Croissance du marché<div class="sg-hist">${barres([40, 40, 40, 40, 40, 70, 40], 5)}</div></div></article>
    <article class="on"><div><i>↗</i><div><h3>Trop de travail manuel</h3><p>Des heures perdues à traiter des tableaux au lieu de réfléchir à la stratégie.</p></div></div><div class="sg-mini">Données · analyse <b style="float:right">452</b><div class="sg-hist">${barres([20, 30, 40, 55, 70, 85, 60, 45, 35, 25], 5)}</div></div></article>
    <article><div><i>↗</i><div><h3>Des signaux manqués</h3><p>Sans les bons outils, les tendances importantes passent inaperçues.</p></div></div><div class="sg-mini">Croissance du marché<div class="sg-hist">${barres([40, 40, 40, 40, 40, 70, 40], 5)}</div></div></article>
  </div></div>
</section>` },
  { id: "outils", html: `<section id="outils" class="section sg-outils" aria-labelledby="outils-h">
  <style>
    #outils { padding: clamp(70px, 7vw, 100px) 24px !important; background: #F7F5F3 !important; text-align: center; }
    #outils h2 { margin: 0 auto; max-width: 20ch; font-size: clamp(30px, 3vw, 42px); font-weight: 500; letter-spacing: -.03em; line-height: 1.15; color: #141414; } #outils > p { margin: 18px auto 0; max-width: 520px; font-size: 13.5px; color: #6B6560; }
    #outils .sg-g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; max-width: 1080px; margin: 50px auto 0; text-align: left; }
    #outils article { padding: 16px 16px 24px; border-radius: 18px; background: #fff; } #outils .sg-v { height: 170px; padding: 14px; border-radius: 12px; background: #F7F5F3; } #outils .sg-v .sg-hist { height: 130px; margin: 0; }
    #outils h3 { margin: 24px 4px 8px; font-size: 17px; font-weight: 500; color: #141414; } #outils article p { margin: 0 4px; font-size: 12.5px; line-height: 1.55; color: #6B6560; }
    #outils article a { display: inline-block; margin: 22px 4px 0; padding: 8px 16px; border-radius: 999px; border: 1px solid #ECE7E2; font-size: 12px; color: #141414; text-decoration: none; } #outils article a.on { background: ${O}; border-color: ${O}; color: #fff; }
    #outils .sg-hub { position: relative; height: 140px; } #outils .sg-hub i { position: absolute; width: 22px; height: 22px; border-radius: 6px; } #outils .sg-hub b { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: #fff; border: 2px solid ${O}; color: ${O}; }
    @media (max-width: 899px) { #outils .sg-g { grid-template-columns: 1fr; } }
  </style>
  <h2 id="outils-h">Tous les outils pour analyser vos données</h2>
  <p>Des offres adaptées à chacun, des besoins simples aux solutions sur mesure.</p>
  <div class="sg-g">
    <article><div class="sg-v"><div class="sg-hist" style="gap:16px">${barres([30, 50, 80, 60, 40], 2)}</div></div><h3>Analyses par l'IA</h3><p>L'IA repère les tendances cachées dans vos données pour vous aider à décider.</p><a href="#tarifs">Commencer</a></article>
    <article><div class="sg-v"><div class="sg-hist">${barres([20, 30, 25, 40, 35, 96, 50, 30, 40, 25], 5)}</div></div><h3>Graphiques en direct</h3><p>Des tableaux et graphiques qui se mettent à jour en temps réel.</p><a class="on" href="#tarifs">Essai gratuit</a></article>
    <article><div class="sg-v sg-hub" aria-hidden="true"><b>✦</b><i style="left:12%;top:20%;background:#FFB27A"></i><i style="left:30%;top:70%;background:#7AD3A6"></i><i style="right:14%;top:18%;background:#8FA8FF"></i><i style="right:24%;top:68%;background:#F2C94C"></i><i style="left:46%;top:8%;background:#E58FB0"></i></div><h3>Intégration facile</h3><p>Branchez vos tableurs, votre outil de vente ou votre boutique en ligne en quelques clics.</p><a href="#tarifs">Commencer</a></article>
  </div>
</section>` },
  { id: "tarifs", html: `<section id="tarifs" class="section sg-tarifs" aria-labelledby="tarifs-h">
  <style>
    #tarifs { padding: clamp(70px, 7vw, 100px) 24px !important; background: linear-gradient(180deg, #fff, #FDF0E6) !important; text-align: center; }
    #tarifs h2 { margin: 0 auto; font-size: clamp(30px, 3vw, 42px); font-weight: 500; letter-spacing: -.03em; color: #141414; } #tarifs > p { margin: 14px auto 0; max-width: 480px; font-size: 13px; color: #6B6560; }
    #tarifs .sg-sw { display: inline-flex; align-items: center; gap: 10px; margin-top: 22px; font-size: 12px; } #tarifs .sg-sw i { width: 34px; height: 18px; border-radius: 9px; background: #fff; border: 1px solid #ECE7E2; position: relative; } #tarifs .sg-sw i::after { content: ""; position: absolute; left: 2px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: ${O}; }
    #tarifs .sg-g { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 640px; margin: 34px auto 0; text-align: left; }
    #tarifs article { padding: 26px; border-radius: 20px; background: rgb(255 255 255 / .8); border: 1px solid #ECE7E2; } #tarifs article.on { background: linear-gradient(180deg, #FFE9DA, #FFD3B5); }
    #tarifs article b { font-size: 14px; } #tarifs article p { margin: 8px 0 16px; font-size: 11.5px; color: #6B6560; } #tarifs article strong { font-size: 30px; font-weight: 600; } #tarifs article strong small { font-size: 11px; font-weight: 400; color: #6B6560; }
    #tarifs ul { list-style: none; margin: 18px 0 22px; padding: 0; display: grid; gap: 8px; font-size: 12px; } #tarifs li::before { content: "●"; margin-right: 8px; color: ${O}; }
    #tarifs article a { display: inline-block; padding: 8px 18px; border-radius: 999px; font-size: 12px; text-decoration: none; border: 1px solid #ECE7E2; color: #141414; } #tarifs article.on a { background: ${O}; color: #fff; border-color: ${O}; }
    @media (max-width: 767px) { #tarifs .sg-g { grid-template-columns: 1fr; } }
  </style>
  <h2 id="tarifs-h">Choisissez votre offre</h2>
  <p>Le meilleur rapport qualité-prix, de l'essentiel au sur-mesure.</p>
  <span class="sg-sw">Mensuel <i aria-hidden="true"></i> Annuel</span>
  <div class="sg-g">
    <article><b>✦ Essentiel</b><p>Pour démarrer, idéal pour les petites équipes.</p><strong>0 € <small>/ mois</small></strong><ul><li>Imports illimités</li><li>Support prioritaire</li><li>Sécurité avancée</li></ul><a href="mailto:bonjour@signal-data.fr">Commencer</a></article>
    <article class="on"><b>✦ Pro</b><p>Sur mesure pour les organisations aux besoins complexes.</p><strong>269 € <small>/ mois</small></strong><ul><li>Tout illimité</li><li>Analyses avancées et sur mesure</li><li>Un interlocuteur dédié</li></ul><a href="mailto:bonjour@signal-data.fr">Commencer</a></article>
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing sg-contact" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding: clamp(60px, 6vw, 80px) 24px 28px !important; background: #fff !important; }
    #contact .sg-in { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; max-width: 1080px; margin: 0 auto; }
    #contact h2 { margin: 0; font-size: 28px; font-weight: 500; letter-spacing: -.03em; color: #141414; } #contact p { margin: 10px 0 0; font-size: 13px; color: #6B6560; }
    #contact .sg-ch { display: flex; gap: 8px; margin-top: 20px; } #contact .sg-ch span { flex: 1; padding: 10px 14px; border-radius: 999px; border: 1px solid #ECE7E2; font-size: 12px; color: #9C958F; } #contact .sg-ch a { padding: 10px 18px; border-radius: 999px; background: ${O}; color: #fff; font-size: 12px; text-decoration: none; }
    #contact dl { margin: 0; display: grid; gap: 14px; font-size: 13px; } #contact dt { font-size: 11px; color: #6B6560; } #contact dd { margin: 2px 0 0; color: #141414; }
    #contact .sg-pied { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; max-width: 1080px; margin: 50px auto 0; padding-top: 18px; border-top: 1px solid #ECE7E2; font-size: 12px; color: #6B6560; }
    @media (max-width: 767px) { #contact .sg-in { grid-template-columns: 1fr; } }
  </style>
  <div class="sg-in"><div><h2 id="contact-h">Recevez nos nouveautés</h2><p>Un e-mail par mois, des conseils concrets sur vos données.</p><div class="sg-ch"><span>Votre e-mail</span><a href="mailto:bonjour@signal-data.fr">S'inscrire</a></div></div>
  <dl><div><dt>Adresse</dt><dd>18 quai de la Fosse, 44000 Nantes</dd></div><div><dt>Téléphone</dt><dd>02 40 00 00 00</dd></div><div><dt>E-mail</dt><dd>bonjour@signal-data.fr</dd></div></dl></div>
  <div class="sg-pied"><span>© Signal · modèle de la bibliothèque Bingoo!</span><span>Conditions · Confidentialité</span></div>
</footer>` },
];
export const journal = ["Plan : hero, defi, outils, tarifs, contact"];
