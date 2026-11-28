// Modèle « Socle » (28 nov. 2026) : design repris d'une maquette de plateforme de gestion (cadre fin arrondi, menu en
// pilule, prairie de nuit en fond, titre mi-droit mi-italique, tableau de bord avec radar, onglets, bloc routines avec
// jauge, tarifs). Couleurs changées (nuit bleu pétrole et ambre au lieu de gris anthracite), textes originaux.
export const nom = "Socle";
export const slugBase = "socle";
export const metier = "Plateforme de gestion d'entreprise";
export const design = {
  mode: "dark", style: "Prairie de nuit", source: "bibliotheque",
  polices: { titres: "Inter Tight", texte: "Inter" },
  couleurs: { background: "#08141A", foreground: "#FFFFFF", primary: "#F0B66B", on_primary: "#1A1206", card: "#0E1D25", muted: "#0E1D25", border: "#1C3038", muted_foreground: "#9BB0B8", accent: "#F0B66B", secondary: "#0E1D25", ring: "#F0B66B", on_accent: "#1A1206" },
};
const SERIF = '"Instrument Serif", "Playfair Display", Georgia, serif';
const FONT = `@import url("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap");`;
const A = "#F0B66B";
const fl = `<svg viewBox="0 0 16 16" width="13" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ok = `<svg viewBox="0 0 18 18" width="17" aria-hidden="true"><circle cx="9" cy="9" r="9" fill="#2BB673"/><path d="m5.5 9.2 2.3 2.2 4.6-4.8" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`;
const stat = (t, v, txt, w) => `<div class="sc-st"><b>${t}</b><strong>${v}</strong><small>${txt}</small><i><span style="width:${w}"></span></i></div>`;
export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1920, height: 1088 }, prompt: "Night photograph of a wild meadow seen from ground level: dandelion seed heads, tall grasses, small white daisies and wild flowers in silhouette at the left and right edges, the centre and top of the image a deep teal-blue night sky with a faint soft glow and a few stars, dark moody, cinematic, photorealistic, no people, no text." },
];
export const nav = [{ mot: "Accueil", ancre: "hero" }, { mot: "À propos", ancre: "pourquoi" }, { mot: "Services", ancre: "tarifs" }];

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    header.nav { top: 22px !important; left: 50% !important; right: auto !important; transform: translateX(-50%); width: auto !important; background: rgb(14 29 37 / .85) !important; border: 1px solid #1C3038 !important; border-radius: 999px; }
    header.nav .nav__bar { max-width: none !important; width: max-content !important; margin: 0 !important; padding: 5px !important; min-height: 0 !important; gap: 18px; } header.nav { width: max-content !important; padding: 0 !important; }
    header.nav .sc-o { width: 30px; height: 30px; border-radius: 50%; border: 4px solid #fff; box-sizing: border-box; display: block; }
    header.nav .nav__link { color: #fff !important; font-size: 13px; } header.nav .nav__bar { display: flex !important; align-items: center; } header.nav .nav__links { flex: none !important; display: flex !important; gap: 22px; margin: 0 6px; }
    header.nav .sc-p { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #fff; } header.nav .sc-p i { width: 10px; height: 10px; border-radius: 50%; border: 3px solid #08141A; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero" aria-label="Socle, accueil"><span class="sc-o"></span></a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#hero">Accueil</a></div><div class="nav__item"><a class="nav__link" href="#pourquoi">À propos</a></div><div class="nav__item"><a class="nav__link" href="#tarifs">Services</a></div></nav>
    <div class="nav__actions"><a class="sc-p" href="#tarifs" aria-label="Tarifs"><i></i></a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif sc-hero">
  <style>
    ${FONT}
    #hero { position: relative; overflow: hidden; isolation: isolate; min-height: 0 !important; padding: clamp(150px, 15vw, 190px) 24px 0 !important; text-align: center; color: #fff; background: #08141A !important; border: 1px solid #1C3038; border-bottom: 0; border-radius: 14px 14px 0 0; margin: 18px 18px 0; }
    #hero > img { position: absolute; inset: 0 0 auto; width: 100%; height: 860px; object-fit: cover; z-index: -2; }
    #hero::after { content: ""; position: absolute; left: 0; right: 0; top: 560px; height: 300px; z-index: -1; background: linear-gradient(180deg, transparent, #08141A 80%); }
    #hero .sc-cadres { position: absolute; inset: 0; z-index: -1; pointer-events: none; } #hero .sc-cadres i { position: absolute; border: 1px solid rgb(255 255 255 / .08); border-radius: 26px; }
    #hero .sc-ban { display: inline-flex; align-items: center; gap: 10px; font-size: 13px; color: #fff; } #hero .sc-ban span { display: flex; } #hero .sc-ban span i { width: 22px; height: 22px; margin-left: -7px; border-radius: 50%; border: 2px solid #08141A; display: grid; place-items: center; font-style: normal; font-size: 8px; font-weight: 700; color: #08141A; }
    #hero h1 { margin: 22px auto 0; font-family: "Inter Tight", sans-serif; font-weight: 500; font-size: clamp(44px, 5.2vw, 74px); line-height: 1.02; letter-spacing: -.055em; color: #fff; }
    #hero h1 em { font-family: ${SERIF}; font-weight: 400; letter-spacing: -.03em; font-size: 1.08em; }
    #hero p { margin: 26px auto 0; max-width: 380px; font-size: 14.5px; line-height: 1.45; color: rgb(255 255 255 / .9); }
    #hero .sc-act { display: flex; justify-content: center; gap: 12px; margin-top: 30px; }
    #hero .sc-act a { display: inline-flex; align-items: center; gap: 10px; padding: 13px 26px; border-radius: 999px; font-size: 13px; text-decoration: none; } #hero .sc-b1 { background: #050C10; color: #fff; } #hero .sc-b2 { background: #fff; color: #08141A; }
    #hero .sc-app { display: grid; grid-template-columns: 170px 1fr; max-width: 900px; margin: 44px auto 0; padding: 14px; border-radius: 10px 10px 0 0; background: #0B181F; text-align: left; font-size: 10px; color: #9BB0B8; box-shadow: 0 -20px 60px rgb(0 0 0 / .5); }
    #hero .sc-app aside b { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #fff; font-weight: 500; } #hero .sc-app aside b i { width: 22px; height: 22px; border-radius: 6px; background: linear-gradient(135deg, #fff, #9BB0B8); }
    #hero .sc-app aside small { display: block; margin: 18px 0 8px; font-size: 7px; letter-spacing: .1em; opacity: .5; } #hero .sc-app aside span { display: block; padding: 5px 8px; } #hero .sc-app aside span.on { color: #fff; }
    #hero .sc-ctr { padding: 0 6px; } #hero .sc-hd { display: flex; justify-content: space-between; font-size: 8px; padding-bottom: 12px; } #hero .sc-msg { padding: 7px 10px; border: 1px solid #1C3038; border-radius: 4px; font-size: 8px; color: #fff; }
    #hero .sc-g { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; } #hero .sc-radar b { color: #fff; font-size: 9px; }
    #hero .sc-sts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; } #hero .sc-st { padding: 10px; border: 1px solid #1C3038; border-radius: 6px; } #hero .sc-st b { display: block; font-size: 8px; color: #fff; font-weight: 500; }
    #hero .sc-st strong { display: block; margin: 8px 0 4px; font-size: 18px; font-weight: 400; color: #fff; } #hero .sc-st small { display: block; font-size: 6.5px; line-height: 1.3; } #hero .sc-st i { display: block; height: 4px; margin-top: 8px; border-radius: 4px; background: #1C3038; } #hero .sc-st i span { display: block; height: 100%; border-radius: 4px; background: ${A}; }
    @media (max-width: 767px) { #hero .sc-app { grid-template-columns: 1fr; } #hero .sc-app aside { display: none; } #hero .sc-g { grid-template-columns: 1fr; } #hero { margin: 8px 8px 0; } }
  </style>
  <img src="IMG_1" alt="">
  <span class="sc-cadres" aria-hidden="true"><i style="left:8%;top:60px;width:26%;height:320px"></i><i style="right:6%;top:40px;width:22%;height:240px"></i><i style="right:4%;top:360px;width:18%;height:200px"></i></span>
  <span class="sc-ban"><span><i style="background:#F0B66B">AL</i><i style="background:#9BD3E0">MR</i><i style="background:#E8A3A3">SB</i><i style="background:#C6E3A1">JD</i></span>| Déjà plus de 1 000 entreprises</span>
  <h1>Une seule plateforme,<br><em>toute</em> votre entreprise.</h1>
  <p>Paiements sécurisés, chiffres en direct et tâches automatisées : vos finances enfin simples.</p>
  <div class="sc-act"><a class="sc-b1" href="#pourquoi">En savoir plus ${fl}</a><a class="sc-b2" href="#tarifs">Voir la démo ${fl}</a></div>
  <div class="sc-app" aria-label="Aperçu du tableau de bord">
    <aside><b><i></i>Socle</b><small>GÉNÉRAL</small><span class="on">⌂ Tableau de bord</span><span>Équipe</span><span>Projets</span><span>Planning</span><span>Paie</span><span>Analyses</span><small>SUIVI</small><span>Recrutement</span><span>Rapports</span></aside>
    <div class="sc-ctr"><div class="sc-hd"><span>Vue d'ensemble</span><span>Rechercher…  ·  28 novembre 2026</span></div>
      <div class="sc-msg">Faites grandir votre équipe avec des chiffres clairs.  <b>Passez à l'offre Pro.</b></div>
      <div class="sc-g">
        <div class="sc-radar"><b>Résumé des performances</b><svg viewBox="0 0 200 170" width="100%" aria-hidden="true"><g fill="none" stroke="#1C3038"><polygon points="100,20 176,75 147,160 53,160 24,75"/><polygon points="100,55 143,86 126,135 74,135 57,86"/></g><polygon points="100,40 160,80 130,140 66,145 44,82" fill="rgb(240 182 107 / .18)" stroke="${A}" stroke-width="1.5"/><g fill="#9BB0B8" font-size="7" text-anchor="middle"><text x="100" y="14">Engagement 7,8</text><text x="172" y="66">Prêts 8,5</text><text x="150" y="170">Formation 7,2</text><text x="50" y="170">Mobilité 6,5</text><text x="30" y="66">Postes clés 9,4</text></g></svg></div>
        <div class="sc-sts">${stat("Objectifs atteints", "85 %", "85 % de l'équipe atteint ses objectifs.", "85%")}${stat("Formation", "72 %", "72 % de l'équipe est formée.", "72%")}${stat("Mobilité interne", "65 %", "65 % des postes pourvus en interne.", "30%")}${stat("Postes clés", "94 %", "94 % des postes clés couverts.", "94%")}</div>
      </div></div>
  </div>
</section>` },
  { id: "clients", html: `<section id="clients" class="section sc-clients" aria-label="Clients">
  <style>
    #clients { padding: clamp(70px, 8vw, 110px) 24px !important; background: #08141A !important; margin: 0 18px; border: 1px solid #1C3038; border-top: 0; border-bottom: 0; }
    #clients .sc-r { display: flex; flex-wrap: wrap; justify-content: space-around; gap: 30px; max-width: 1000px; margin: 0 auto; color: #C9D6DB; font-size: 19px; font-weight: 600; letter-spacing: -.01em; }
  </style>
  <div class="sc-r"><span>◐ Calepin</span><span style="font-weight:400;letter-spacing:.1em">∞ flotte</span><span>◎ Ancre</span><span>⌁ Basalte</span><span style="font-weight:800">attelle</span><span style="font-weight:300;letter-spacing:.05em">GALETTE</span></div>
</section>` },
  { id: "pourquoi", html: `<section id="pourquoi" class="section sc-pourquoi" aria-labelledby="pourquoi-h">
  <style>
    #pourquoi { padding: clamp(40px, 5vw, 70px) 24px clamp(80px, 8vw, 120px) !important; background: #08141A !important; margin: 0 18px; border: 1px solid #1C3038; border-top: 0; border-bottom: 0; text-align: center; }
    .sc-pil { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; background: #fff; color: #08141A; font-size: 10px; font-weight: 500; } .sc-pil i { width: 9px; height: 9px; border-radius: 50%; border: 2.5px solid #08141A; }
    #pourquoi h2 { margin: 26px auto 0; font-size: clamp(32px, 3.4vw, 46px); font-weight: 400; letter-spacing: -.04em; line-height: 1.1; color: #fff; }
    #pourquoi > p { margin: 26px auto 0; max-width: 480px; font-size: 14.5px; color: #C9D6DB; }
    #pourquoi .sc-tabs { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 26px; margin: 56px auto 0; font-size: 14px; color: #C9D6DB; } #pourquoi .sc-tabs span { padding: 10px 6px; } #pourquoi .sc-tabs span.on { padding: 10px 20px; border-radius: 999px; background: #fff; color: #08141A; }
    #pourquoi .sc-g { display: grid; grid-template-columns: 1.3fr 1fr; gap: 40px; align-items: center; max-width: 940px; margin: 60px auto 0; text-align: left; }
    #pourquoi h3 { margin: 0; font-size: clamp(26px, 2.4vw, 32px); font-weight: 400; letter-spacing: -.03em; line-height: 1.15; color: #fff; } #pourquoi .sc-g p { margin: 22px 0; max-width: 380px; font-size: 14px; color: #C9D6DB; }
    #pourquoi ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; font-size: 14px; color: #fff; } #pourquoi li { display: flex; gap: 12px; align-items: center; }
    #pourquoi .sc-act { display: flex; gap: 10px; margin-top: 34px; } #pourquoi .sc-act a { display: inline-flex; gap: 10px; align-items: center; padding: 12px 18px; border-radius: 999px; font-size: 13px; text-decoration: none; } #pourquoi .sc-act a:first-child { border: 1px solid #1C3038; color: #fff; background: #050C10; } #pourquoi .sc-act a:last-child { background: #fff; color: #08141A; }
    #pourquoi .sc-c { padding: 16px; border-radius: 22px; background: #0E1D25; } #pourquoi .sc-c > i { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: #08141A; font-style: normal; }
    #pourquoi .sc-c h4 { margin: 18px 0 16px; font-size: 24px; font-weight: 400; color: #fff; } #pourquoi .sc-in { padding: 16px; border-radius: 12px; background: #050C10; font-size: 13px; color: #fff; } #pourquoi .sc-in b { display: block; margin: 14px 0 10px; font-size: 19px; font-weight: 500; }
    #pourquoi .sc-barre { display: flex; gap: 4px; height: 28px; } #pourquoi .sc-barre i { flex: 8; border-radius: 4px; background: repeating-linear-gradient(135deg, ${A} 0 3px, #F7D7A8 3px 6px); } #pourquoi .sc-barre i + i { flex: 3.5; background: repeating-linear-gradient(135deg, #5FB8CF 0 3px, #A9DCE8 3px 6px); }
    #pourquoi .sc-ech { display: flex; justify-content: space-between; margin-top: 6px; font-size: 10px; }
    #pourquoi .sc-tog { display: flex; align-items: center; gap: 12px; margin-top: 8px; padding: 12px 14px; border-radius: 12px; background: #050C10; font-size: 12.5px; color: #fff; } #pourquoi .sc-tog small { display: block; color: #9BB0B8; } #pourquoi .sc-tog em { margin-left: auto; width: 34px; height: 18px; border-radius: 9px; background: ${A}; position: relative; } #pourquoi .sc-tog em::after { content: ""; position: absolute; right: 3px; top: 3px; width: 12px; height: 12px; border-radius: 50%; background: #fff; }
    @media (max-width: 899px) { #pourquoi .sc-g { grid-template-columns: 1fr; } }
  </style>
  <span class="sc-pil"><i></i>Pourquoi nous</span>
  <h2 id="pourquoi-h">Des solutions techniques<br>qui vont plus loin</h2>
  <p>Pensée pour les grandes entreprises, simple pour les petites équipes : de l'automatisation aux analyses détaillées.</p>
  <div class="sc-tabs"><span class="on">Tout</span><span>Industrie</span><span>Agriculture</span><span>Médias</span><span>Bâtiment</span><span>Énergie</span><span>Autre</span></div>
  <div class="sc-g">
    <div><h3>Les tâches répétitives,<br>lancées toutes seules</h3><p>Socle apprend de vos habitudes et automatise votre quotidien. Jusqu'à 70 % de travail manuel en moins.</p>
      <ul><li>${ok}Des modèles de tâches guidés par l'IA</li><li>${ok}Une alerte dès qu'un seuil important est franchi</li><li>${ok}La sauvegarde automatique de toutes vos données</li></ul>
      <div class="sc-act"><a href="#tarifs">En savoir plus ${fl}</a><a href="#tarifs">Voir la démo ${fl}</a></div></div>
    <div class="sc-c"><i aria-hidden="true">◉</i><h4>Routines automatiques</h4>
      <div class="sc-in">Routines lancées sans vous<b>80 000+</b><div class="sc-barre"><i></i><i></i></div><div class="sc-ech"><span>0 %</span><span>80 %</span><span>100 %</span></div></div>
      <div class="sc-tog"><span>Mode économie<small>Éteint ce qui ne sert pas, la nuit…</small></span><em aria-hidden="true"></em></div></div>
  </div>
</section>` },
  { id: "tarifs", html: `<footer class="footer closing sc-tarifs" id="tarifs" aria-labelledby="tarifs-h">
  <style>
    #tarifs { padding: clamp(60px, 6vw, 90px) 24px 30px !important; background: #08141A !important; margin: 0 18px 18px; border: 1px solid #1C3038; border-top: 0; border-radius: 0 0 14px 14px; text-align: center; }
    #tarifs h2 { margin: 22px auto 0; font-size: clamp(32px, 3.4vw, 46px); font-weight: 400; letter-spacing: -.04em; line-height: 1.05; color: #fff; }
    #tarifs .sc-g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; max-width: 940px; margin: 48px auto 0; text-align: left; }
    #tarifs article { padding: 26px; border-radius: 20px; background: #0E1D25; color: #fff; } #tarifs article.on { background: #fff; color: #08141A; }
    #tarifs article b { font-size: 15px; font-weight: 500; } #tarifs article strong { display: block; margin: 18px 0 6px; font-size: 38px; font-weight: 400; letter-spacing: -.03em; } #tarifs article small { font-size: 13px; opacity: .7; }
    #tarifs article a { display: block; margin-top: 22px; padding: 11px; border-radius: 999px; text-align: center; font-size: 13px; text-decoration: none; background: #050C10; color: #fff; } #tarifs article.on a { background: ${A}; color: #1A1206; }
    #tarifs .sc-pied { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; max-width: 940px; margin: 70px auto 0; padding-top: 18px; border-top: 1px solid #1C3038; font-size: 12.5px; color: #9BB0B8; }
    @media (max-width: 899px) { #tarifs .sc-g { grid-template-columns: 1fr; } }
  </style>
  <span class="sc-pil"><i></i>Tarifs et offres</span>
  <h2 id="tarifs-h">Choisissez<br>la bonne formule</h2>
  <div class="sc-g">
    <article><b>Départ</b><strong>0 €</strong><small>Pour tester, jusqu'à 3 personnes.</small><a href="mailto:bonjour@socle.app">Commencer</a></article>
    <article class="on"><b>Équipe</b><strong>29 €</strong><small>Par mois, jusqu'à 25 personnes.</small><a href="mailto:bonjour@socle.app">Essayer 14 jours</a></article>
    <article><b>Entreprise</b><strong>Sur devis</strong><small>Sites multiples, accompagnement dédié.</small><a href="mailto:bonjour@socle.app">Nous contacter</a></article>
  </div>
  <div class="sc-pied"><span>© Socle · modèle de la bibliothèque Bingoo!</span><span>bonjour@socle.app</span></div>
</footer>` },
];
export const journal = ["Plan : hero, clients, pourquoi, tarifs"];
