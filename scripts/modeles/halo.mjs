// Modèle « Halo » (28 nov. 2026) : recopie d'une maquette de logiciel SaaS sombre (arc de lumière façon lever de planète,
// faisceaux verticaux, pastille « accès anticipé », titre blanc et bleu, deux boutons, poussière d'étoiles, aperçu du
// tableau de bord en vrai HTML). Nom, textes et données originaux.
export const nom = "Halo";
export const slugBase = "halo";
export const metier = "Logiciel SaaS";
export const design = {
  mode: "dark", style: "Lever de planète", source: "bibliotheque",
  polices: { titres: "Manrope", texte: "Manrope" },
  couleurs: { background: "#05071A", foreground: "#FFFFFF", primary: "#C9D6FF", on_primary: "#0A0F2E", card: "#0B0E24", muted: "#0B0E24", border: "#1C2142", muted_foreground: "#8C93B8", accent: "#6F8DFF", secondary: "#11152F", ring: "#6F8DFF", on_accent: "#05071A" },
};
const BLEU = "#7E98FF";
export const images = [];
export const nav = [{ mot: "Fonctions", ancre: "fonctions" }, { mot: "Modèles", ancre: "fonctions" }, { mot: "Aide", ancre: "tarifs" }, { mot: "Tarifs", ancre: "tarifs" }];
const ch = `<svg viewBox="0 0 12 12" width="11" fill="none" aria-hidden="true"><path d="m3 4.5 3 3 3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
const etoile = (t = 22) => `<svg viewBox="0 0 24 24" width="${t}" height="${t}" aria-hidden="true"><path d="M12 1c.6 5.6 3.4 8.6 9 9.5-5.6.9-8.4 3.9-9 9.5-.6-5.6-3.4-8.6-9-9.5C8.6 9.6 11.4 6.6 12 1Z" fill="#9DB0FF"/><path d="M20 15c.3 2.2 1.2 3.2 3 3.5-1.8.3-2.7 1.3-3 3.5-.3-2.2-1.2-3.2-3-3.5 1.8-.3 2.7-1.3 3-3.5Z" fill="#9DB0FF"/></svg>`;
const ligne = (id, nom, ini, proj, lieu, date, statut, coul) => `<tr><td><i class="hl-case"></i></td><td>${id}</td><td><span class="hl-av" style="background:${coul}">${ini}</span>${nom}</td><td>${proj}</td><td>${lieu}</td><td>${date}</td><td><span class="hl-st" style="color:${statut[1]}">● ${statut[0]}</span></td></tr>`;

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    header.nav { background: transparent !important; border: 0 !important; }
    header.nav .nav__logo { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; letter-spacing: .02em; font-size: 18px; color: #fff !important; }
    header.nav .nav__link { display: inline-flex; align-items: center; gap: 6px; color: #fff !important; font-size: 14.5px; }
    header.nav .hl-in { color: #fff; font-size: 15px; text-decoration: none; margin-right: 22px; }
    header.nav .hl-go { padding: 10px 18px; border-radius: 10px; background: #fff; color: #0A0F2E; font-size: 15px; font-weight: 500; text-decoration: none; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero">${etoile(24)}HALO</a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#fonctions">Fonctions</a></div><div class="nav__item"><a class="nav__link" href="#fonctions">Modèles ${ch}</a></div><div class="nav__item"><a class="nav__link" href="#tarifs">Aide ${ch}</a></div><div class="nav__item"><a class="nav__link" href="#tarifs">Tarifs ${ch}</a></div></nav>
    <div class="nav__actions"><a class="hl-in" href="#tarifs">Connexion</a><a class="hl-go" href="#tarifs">Commencer</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif hl-hero">
  <style>
    #hero { position: relative; overflow: hidden; isolation: isolate; min-height: 0 !important; padding: clamp(230px, 23vw, 280px) 24px 0 !important; text-align: center; color: #fff; background: #05071A !important; }
    #hero .hl-rayons { position: absolute; left: 50%; top: 0; width: 520px; height: 300px; transform: translateX(-50%); z-index: -2; background: repeating-linear-gradient(90deg, rgb(120 150 255 / .0) 0 26px, rgb(120 150 255 / .09) 26px 30px, rgb(120 150 255 / 0) 30px 52px); -webkit-mask: linear-gradient(180deg, transparent, #000 60%, transparent); mask: linear-gradient(180deg, transparent, #000 60%, transparent); }
    #hero .hl-ciel { position: absolute; left: 50%; top: -75px; width: 1200px; height: 760px; transform: translateX(-50%); z-index: -1; -webkit-mask: radial-gradient(ellipse 52% 62% at 50% 20%, #000 50%, transparent 100%); mask: radial-gradient(ellipse 52% 62% at 50% 20%, #000 50%, transparent 100%); }
    #hero .hl-arc { position: absolute; left: 50%; top: 200px; width: 760px; height: 760px; transform: translateX(-50%); border-radius: 50%; background: #05071A;
      box-shadow: 0 -2px 0 0 #DCE5FF, 0 -10px 24px 2px rgb(140 170 255 / .9), 0 -30px 80px 10px rgb(90 120 255 / .55), 0 -60px 160px 40px rgb(60 90 230 / .25); }
    #hero .hl-arc::after { content: ""; position: absolute; inset: 0; border-radius: 50%; box-shadow: inset 0 40px 70px -30px rgb(110 140 255 / .35); }
    #hero .hl-pastille { display: inline-flex; align-items: center; gap: 10px; padding: 6px 14px; border-radius: 12px; border: 1px solid rgb(160 180 255 / .45); background: rgb(80 100 200 / .22); font-size: 14.5px; color: #E6EBFF; }
    #hero h1 { margin: 26px auto 0; max-width: none; font-weight: 700; font-size: clamp(44px, 5.4vw, 72px); line-height: 1.02; letter-spacing: -.035em; color: #fff; }
    #hero h1 span { background: linear-gradient(180deg, #B8C8FF, #6F8DFF); -webkit-background-clip: text; background-clip: text; color: transparent; }
    #hero p { margin: 28px auto 0; max-width: 430px; font-size: 16px; line-height: 1.6; color: #D6DBF3; }
    #hero .hl-actions { display: flex; justify-content: center; gap: 12px; margin-top: 36px; }
    #hero .hl-b1 { padding: 11px 20px; border-radius: 10px; background: linear-gradient(180deg, #E9EEFF, #A9BBFF); color: #0A0F2E; font-weight: 500; font-size: 15px; text-decoration: none; box-shadow: 0 0 24px rgb(130 160 255 / .45); }
    #hero .hl-b2 { padding: 11px 20px; border-radius: 10px; border: 1px solid rgb(160 180 255 / .4); background: rgb(20 26 60 / .7); color: #fff; font-size: 15px; text-decoration: none; }
    #hero .hl-poussiere { position: relative; height: 90px; margin-top: 20px; } #hero .hl-poussiere i { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #AFC0FF; box-shadow: 0 0 6px #AFC0FF; }
    #hero .hl-socle { position: relative; max-width: 820px; margin: 0 auto; } #hero .hl-socle::before { content: ""; position: absolute; left: 0; right: 0; top: -60px; height: 120px; background: radial-gradient(ellipse 50% 60% at 50% 100%, rgb(110 140 255 / .55), transparent 70%); z-index: -1; }
    #hero .hl-app { display: grid; grid-template-columns: 124px 1fr 150px; max-width: 820px; margin: 0 auto; border-radius: 16px 16px 0 0; border: 1px solid #262C52; border-bottom: 0; outline: 8px solid rgb(30 36 80 / .45); background: #080A1C; text-align: left; font-size: 9.5px; color: #8C93B8; overflow: hidden; }
    #hero .hl-app aside { padding: 16px 14px; border-right: 1px solid #1C2142; } #hero .hl-app aside b { display: flex; gap: 6px; align-items: center; color: #fff; font-size: 11px; margin-bottom: 18px; } #hero .hl-app aside span { display: block; margin: 10px 0; } #hero .hl-app aside span.on { color: #C9D2F0; }
    #hero .hl-app .hl-centre { padding: 12px 16px 0; min-width: 0; } #hero .hl-app .hl-top { display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid #1C2142; } #hero .hl-app .hl-top em { font-style: normal; color: #fff; }
    #hero .hl-app .hl-rech { width: 90px; padding: 3px 8px; border-radius: 8px; background: #12162E; }
    #hero .hl-app h4 { margin: 18px 0 10px; color: #fff; font-size: 10.5px; font-weight: 600; }
    #hero .hl-app table { width: 100%; border-collapse: collapse; } #hero .hl-app th { text-align: left; font-weight: 400; padding: 8px 4px; border-bottom: 1px solid #1C2142; } #hero .hl-app td { padding: 8px 4px; color: #C9D2F0; border-bottom: 1px solid #12162E; white-space: nowrap; }
    #hero .hl-case { display: inline-block; width: 9px; height: 9px; border: 1px solid #3A4170; border-radius: 3px; } #hero .hl-av { display: inline-grid; place-items: center; width: 15px; height: 15px; margin-right: 6px; border-radius: 50%; font-size: 7px; font-weight: 700; color: #fff; vertical-align: middle; }
    #hero .hl-app .hl-notes { padding: 16px 12px; border-left: 1px solid #1C2142; } #hero .hl-notes b { display: block; color: #fff; font-size: 10px; font-weight: 600; margin-bottom: 12px; } #hero .hl-notes p { margin: 0 0 12px; font-size: 9.5px; color: #C9D2F0; text-align: left; line-height: 1.35; } #hero .hl-notes small { display: block; color: #6C7399; }
    @media (max-width: 767px) { #hero .hl-app { grid-template-columns: 1fr; } #hero .hl-app aside, #hero .hl-notes { display: none; } #hero .hl-arc { width: 520px; height: 520px; } #hero h1 br { display: none; } }
  </style>
  <span class="hl-rayons" aria-hidden="true"></span><span class="hl-ciel" aria-hidden="true"><span class="hl-arc"></span></span>
  <span class="hl-pastille">${etoile(18)} Accès anticipé</span>
  <h1>Avancez plus vite <span>avec</span><br>des idées <span>claires</span></h1>
  <p>Un outil simple, aidé par l'IA, qui transforme vos tâches compliquées en étapes nettes, pour lancer vos projets plus tôt.</p>
  <div class="hl-actions"><a class="hl-b1" href="#tarifs">Commencer</a><a class="hl-b2" href="#fonctions">Voir la démo</a></div>
  <div class="hl-poussiere" aria-hidden="true"><i style="left:42%;top:4px"></i><i style="left:47%;top:2px"></i><i style="left:51%;top:24px"></i><i style="left:57%;top:6px"></i><i style="left:44.5%;top:30px"></i><i style="left:53%;top:34px"></i><i style="left:48%;top:56px"></i><i style="left:53.5%;top:60px"></i></div>
  <div class="hl-socle"><div class="hl-app" aria-label="Aperçu du tableau de bord">
    <aside><b>${etoile(12)} HALO</b><span>Favoris</span><span>Récents</span><span class="on">• Vue d'ensemble</span><span class="on">• Projets</span><span style="margin-top:22px">Tableaux</span></aside>
    <div class="hl-centre"><div class="hl-top"><span>Tableaux / <em>Principal</em></span><span class="hl-rech">Rechercher</span></div>
      <h4>Commandes</h4>
      <table><thead><tr><th></th><th>N°</th><th>Client</th><th>Projet</th><th>Adresse</th><th>Date</th><th>Statut</th></tr></thead><tbody>
      ${ligne("#HL9801", "Inès Morel", "IM", "Page d'accueil", "Rue des Lilas, Lyon", "À l'instant", ["En cours", "#9DB0FF"], "#5B6BE0")}
      ${ligne("#HL9802", "Hugo Bernard", "HB", "Application", "Quai Saint-Jean, Nantes", "Il y a 1 min", ["Terminé", "#6FE0B0"], "#2F9D7E")}
      ${ligne("#HL9803", "Léa Martin", "LM", "Tableau de bord", "Rue Pasteur, Lille", "Il y a 1 h", ["En attente", "#8C93B8"], "#A9539F")}
      </tbody></table></div>
    <div class="hl-notes"><b>Notifications</b><p>Vous avez corrigé un bug.<small>À l'instant</small></p><p>Nouvel utilisateur inscrit.<small>Il y a 59 min</small></p><p>Rapport hebdo prêt.<small>Il y a 12 h</small></p></div>
  </div></div>
</section>` },
  { id: "fonctions", html: `<section id="fonctions" class="section hl-fonctions" aria-labelledby="fonctions-h">
  <style>
    #fonctions { padding: clamp(80px, 8vw, 120px) 24px !important; background: #05071A !important; border-top: 1px solid #1C2142; text-align: center; }
    #fonctions h2 { margin: 0 auto; max-width: 18ch; font-size: clamp(32px, 3.4vw, 48px); font-weight: 700; letter-spacing: -.03em; line-height: 1.08; color: #fff; } #fonctions h2 span { color: ${BLEU}; }
    #fonctions .hl-g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; max-width: 1080px; margin: 52px auto 0; text-align: left; }
    #fonctions article { position: relative; padding: 30px 26px; border-radius: 18px; border: 1px solid #1C2142; background: linear-gradient(180deg, #0D1130, #080A1C); overflow: hidden; }
    #fonctions article::before { content: ""; position: absolute; left: 20%; right: 20%; top: 0; height: 1px; background: linear-gradient(90deg, transparent, #9DB0FF, transparent); }
    #fonctions article i { display: inline-grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: rgb(110 140 255 / .14); border: 1px solid rgb(160 180 255 / .3); }
    #fonctions h3 { margin: 28px 0 10px; font-size: 19px; font-weight: 600; color: #fff; } #fonctions p { margin: 0; font-size: 15px; line-height: 1.6; color: #8C93B8; }
    @media (max-width: 899px) { #fonctions .hl-g { grid-template-columns: 1fr; } }
  </style>
  <h2 id="fonctions-h">Tout votre travail, <span>enfin lisible</span></h2>
  <div class="hl-g">
    <article><i>${etoile(20)}</i><h3>Tri automatique</h3><p>L'IA range vos demandes par priorité et vous dit quoi faire en premier.</p></article>
    <article><i><svg viewBox="0 0 24 24" width="20" fill="none" stroke="#9DB0FF" stroke-width="1.8" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg></i><h3>Suivi en direct</h3><p>Chaque projet, chaque client, chaque statut sur un seul écran.</p></article>
    <article><i><svg viewBox="0 0 24 24" width="20" fill="none" stroke="#9DB0FF" stroke-width="1.8" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/></svg></i><h3>Alertes utiles</h3><p>Seulement ce qui compte : un retard, un paiement, un nouveau client.</p></article>
  </div>
</section>` },
  { id: "tarifs", html: `<footer class="footer closing hl-tarifs" id="tarifs" aria-labelledby="tarifs-h">
  <style>
    #tarifs { position: relative; overflow: hidden; padding: clamp(80px, 8vw, 120px) 24px 32px !important; background: #05071A !important; text-align: center; }
    #tarifs::before { content: ""; position: absolute; left: 50%; bottom: -520px; width: 900px; height: 700px; transform: translateX(-50%); border-radius: 50%; box-shadow: 0 -2px 0 #DCE5FF, 0 -20px 90px 10px rgb(90 120 255 / .5); }
    #tarifs h2 { position: relative; margin: 0 auto; max-width: 16ch; font-size: clamp(32px, 3.6vw, 52px); font-weight: 700; letter-spacing: -.03em; line-height: 1.06; color: #fff; } #tarifs h2 span { color: ${BLEU}; }
    #tarifs p { position: relative; margin: 18px auto 0; max-width: 420px; color: #C2C8E6; }
    #tarifs .hl-b1 { position: relative; display: inline-block; margin-top: 30px; padding: 12px 22px; border-radius: 10px; background: linear-gradient(180deg, #E9EEFF, #A9BBFF); color: #0A0F2E; font-weight: 500; text-decoration: none; box-shadow: 0 0 24px rgb(130 160 255 / .45); }
    #tarifs .hl-bas { position: relative; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; max-width: 1080px; margin: clamp(140px, 14vw, 200px) auto 0; padding-top: 22px; border-top: 1px solid #1C2142; font-size: 13px; color: #8C93B8; }
  </style>
  <h2 id="tarifs-h">Essayez <span>gratuitement</span> pendant 14 jours</h2>
  <p>Ensuite 19 € par mois. Sans engagement, résiliable en un clic.</p>
  <a class="hl-b1" href="#hero">Commencer</a>
  <div class="hl-bas"><span>© Halo · modèle de la bibliothèque Bingoo!</span><span>bonjour@halo.app</span></div>
</footer>` },
];
export const journal = ["Plan : hero, fonctions, tarifs"];
