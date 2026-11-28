// Modèle « Noyau » (28 nov. 2026) : recopie d'une maquette de plateforme de données (fond noir traversé de faisceaux
// bleus en X, titre fin centré, pilule blanche, téléphone posé sur le nom géant, trois cartes de verre inclinées, écran
// final avec le téléphone au centre et deux textes de part et d'autre). Nom, textes et images originaux.
export const nom = "Noyau";
export const slugBase = "noyau";
export const metier = "Plateforme de données d'entreprise";
export const design = {
  mode: "dark", style: "Faisceaux bleus", source: "bibliotheque",
  polices: { titres: "Urbanist", texte: "Urbanist" },
  couleurs: { background: "#000000", foreground: "#FFFFFF", primary: "#2F35F5", on_primary: "#FFFFFF", card: "#0A0A2A", muted: "#0A0A2A", border: "#24247A", muted_foreground: "#B9BBF0", accent: "#2F35F5", secondary: "#0A0A2A", ring: "#2F35F5", on_accent: "#FFFFFF" },
};
const B = "#2F35F5";
const FAISCEAUX = `background: radial-gradient(ellipse 22% 60% at 6% 8%, rgb(255 255 255 / .6), transparent 70%), radial-gradient(ellipse 40% 45% at 50% 100%, #3A3FFF, transparent 75%), linear-gradient(58deg, transparent 30%, rgb(32 38 235 / .95) 44%, rgb(20 24 200 / .6) 52%, transparent 64%), linear-gradient(-58deg, transparent 30%, rgb(32 38 235 / .95) 44%, rgb(20 24 200 / .6) 52%, transparent 64%), #000 !important;`;
const tel = (corps, cls = "") => `<div class="ny-tel ${cls}"><div class="ny-ilot"></div><div class="ny-etat"><span>07:15</span><span>●●● ▮</span></div>${corps}</div>`;
export const images = [
  { id: "IMG_1", pour: "hero", taille: "square_hd", prompt: "3D render of an abstract pie chart cylinder: a tall rounded cylinder cut into slices, one slice lifted, matte gradient materials from warm orange to violet and deep blue, soft studio light, centered, isolated on a smooth violet-blue gradient background (#5A55E8 to #2F35F5), no text, no logo." },
];
export const nav = [{ mot: "Produit", ancre: "probleme" }, { mot: "Marché", ancre: "probleme" }, { mot: "Équipe", ancre: "plateforme" }, { mot: "Contact", ancre: "contact" }];

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    header.nav { background: transparent !important; border: 0 !important; }
    header.nav .nav__bar { position: relative; }
    header.nav .nav__logo { position: absolute; left: 50%; transform: translateX(-50%); font-style: italic; font-weight: 700; font-size: 19px; text-decoration: underline; text-underline-offset: 3px; color: #fff !important; }
    header.nav .nav__links { margin-right: auto; } header.nav .nav__link { color: #fff !important; font-size: 12px; opacity: .85; }
    header.nav .ny-c { color: #fff; font-size: 12px; text-decoration: none; margin-right: 22px; opacity: .85; }
    header.nav .ny-go { padding: 7px 16px; border-radius: 999px; background: ${B}; color: #fff; font-size: 12px; text-decoration: none; box-shadow: 0 0 18px rgb(47 53 245 / .6); }
  </style>
  <div class="wrap nav__bar">
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#probleme">Produit</a></div><div class="nav__item"><a class="nav__link" href="#probleme">Marché</a></div><div class="nav__item"><a class="nav__link" href="#plateforme">Équipe</a></div></nav>
    <a class="nav__logo" href="#hero">Noyau</a>
    <div class="nav__actions"><a class="ny-c" href="#contact">Contact</a><a class="ny-go" href="#plateforme">Comment ça marche</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif ny-hero">
  <style>
    .ny-tel { position: relative; width: 250px; height: 500px; padding: 14px 14px 0; border-radius: 34px; border: 1.5px solid rgb(190 195 255 / .7); background: linear-gradient(180deg, #4744D9, #2A2DB8 60%, #1C1F9A); box-shadow: 0 30px 80px -20px rgb(0 0 0 / .7), inset 0 0 0 4px rgb(255 255 255 / .06); color: #fff; text-align: center; overflow: hidden; }
    .ny-tel .ny-ilot { width: 76px; height: 22px; margin: 0 auto; border-radius: 999px; background: #050510; } .ny-tel .ny-etat { position: absolute; top: 16px; left: 22px; right: 22px; display: flex; justify-content: space-between; font-size: 9px; }
    .ny-tel .ny-heure { margin: 26px 0 0; font-size: 52px; font-weight: 300; line-height: 1; } .ny-tel small { display: block; margin-top: 6px; font-size: 9px; opacity: .8; }
    .ny-tel img { display: block; width: 100%; margin-top: 10px; border-radius: 12px; -webkit-mask: radial-gradient(circle, #000 55%, transparent 72%); mask: radial-gradient(circle, #000 55%, transparent 72%); }
    #hero { position: relative; overflow: hidden; isolation: isolate; min-height: 0 !important; padding: clamp(140px, 15vw, 170px) 0 0 !important; text-align: center; color: #fff; ${FAISCEAUX} }
    #hero h1 { margin: 0 auto; font-weight: 400; font-size: clamp(30px, 2.8vw, 42px); line-height: 1.2; letter-spacing: -.01em; color: #fff; }
    #hero p { margin: 26px auto 0; max-width: 360px; font-size: 16px; line-height: 1.3; color: #fff; }
    #hero .ny-pil { position: relative; display: inline-block; margin-top: 30px; padding: 9px 20px; border-radius: 999px; background: #fff; color: #000; font-size: 12.5px; text-decoration: none; }
    #hero .ny-pil::after { content: ""; position: absolute; right: -12px; bottom: -16px; width: 18px; height: 18px; background: #8A8FFF; clip-path: polygon(0 0, 100% 45%, 55% 55%, 40% 100%); }
    #hero .ny-scene { position: relative; height: clamp(300px, 26vw, 400px); margin-top: 40px; }
    #hero .ny-geant { position: absolute; left: 0; right: 0; bottom: -0.2em; margin: 0; font-size: clamp(160px, 26vw, 400px); font-weight: 500; line-height: .8; letter-spacing: -.04em; text-align: left; white-space: nowrap; padding-left: 1vw; color: #fff; text-shadow: 0 0 40px rgb(140 145 255 / .35); z-index: 0; }
    #hero .ny-tel { z-index: 1; position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 230px; height: 560px; background: linear-gradient(180deg, rgb(110 105 255 / .55), rgb(60 60 230 / .45)); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
    @media (max-width: 767px) { #hero .ny-geant { font-size: 120px; } }
  </style>
  <h1>Des données<br>à l'avantage stratégique</h1>
  <p>Nous transformons le chaos de l'entreprise en une intelligence centrale.</p>
  <a class="ny-pil" href="#probleme">La plateforme</a>
  <div class="ny-scene">
    <p class="ny-geant" aria-hidden="true">Noyau</p>
    ${tel(`<p class="ny-heure">7:15</p><small>Vendredi 22 janvier</small><img src="IMG_1" alt="Un graphique en camembert en 3D">`)}
  </div>
</section>` },
  { id: "probleme", html: `<section id="probleme" class="section ny-probleme" aria-labelledby="probleme-h">
  <style>
    #probleme { position: relative; overflow: hidden; padding: clamp(80px, 8vw, 110px) 24px clamp(110px, 11vw, 150px) !important; text-align: center; background: radial-gradient(ellipse 60% 45% at 50% 105%, #3A3FFF, #1B1FD8 35%, transparent 75%), #000 !important; }
    #probleme h2 { margin: 0 auto; max-width: 25ch; font-size: clamp(26px, 2.5vw, 36px); font-weight: 400; line-height: 1.2; color: #fff; } #probleme h2 span { color: #A9ACFF; }
    #probleme .ny-g { display: flex; justify-content: center; gap: 14px; margin-top: 64px; }
    #probleme article { width: min(260px, 30vw); height: 290px; padding: 18px; border-radius: 22px; border: 1px solid rgb(150 155 255 / .6); background: linear-gradient(170deg, #050520 20%, #2226C9 120%); text-align: left; display: flex; flex-direction: column; color: #fff; box-shadow: 0 20px 60px -20px rgb(47 53 245 / .5); }
    #probleme article:nth-child(1) { transform: rotate(4deg) translateY(10px); } #probleme article:nth-child(2) { transform: rotate(-5deg); } #probleme article:nth-child(3) { transform: rotate(6deg) translateY(12px); }
    #probleme article span { align-self: flex-start; padding: 3px 26px; border-radius: 999px; border: 1px solid rgb(200 205 255 / .7); font-size: 10.5px; }
    #probleme h3 { margin: auto 0 8px; font-size: 21px; font-weight: 400; line-height: 1.05; color: #fff; } #probleme p { margin: 0; font-size: 11.5px; line-height: 1.25; color: #D9DAFF; }
    @media (max-width: 767px) { #probleme .ny-g { flex-direction: column; align-items: center; } #probleme article { width: 260px; } }
  </style>
  <h2 id="probleme-h">Nous créons un noyau central et intelligent qui rassemble tout <span>ce chaos</span></h2>
  <div class="ny-g">
    <article><span>Problème 1</span><h3>Le chaos de l'information</h3><p>Fichiers, messages et outils éparpillés : personne ne sait où trouver la bonne réponse.</p></article>
    <article><span>Problème 2</span><h3>La fuite du savoir-faire</h3><p>Le système extrait et range le savoir du travail quotidien, pour le garder pour toujours.</p></article>
    <article><span>Problème 3</span><h3>Les liens cachés</h3><p>Notre carte des connaissances révèle, comme une radio, les liens que personne ne voyait.</p></article>
  </div>
</section>` },
  { id: "plateforme", html: `<section id="plateforme" class="section ny-plateforme" aria-label="La plateforme">
  <style>
    #plateforme { position: relative; overflow: hidden; padding: 60px 24px !important; color: #fff; ${FAISCEAUX} }
    #plateforme .ny-g { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: clamp(30px, 6vw, 90px); max-width: 1080px; margin: 0 auto; }
    #plateforme .ny-tel { width: 230px; height: 450px; margin: 0 auto; background: linear-gradient(180deg, #4C49E0, #2B2EBE); }
    #plateforme .ny-tel b { display: block; margin-top: 22px; font-size: 34px; font-weight: 500; } #plateforme .ny-tel em { display: block; margin: 4px auto 0; max-width: 150px; font-style: normal; font-size: 8.5px; line-height: 1.2; }
    #plateforme .ny-tel img { width: 70%; margin: 4px auto 0; }
    #plateforme p { margin: 0; font-size: 16px; line-height: 1.25; color: #fff; } #plateforme .ny-d p { max-width: 260px; }
    #plateforme a { display: inline-block; margin-top: 16px; padding: 5px 30px; border-radius: 999px; border: 1px solid rgb(200 205 255 / .8); color: #fff; font-size: 11px; text-decoration: none; }
    @media (max-width: 899px) { #plateforme .ny-g { grid-template-columns: 1fr; text-align: center; } }
  </style>
  <div class="ny-g">
    <p>Nous avons créé une plateforme intelligente qui se branche sur toutes vos sources de données et en tire, toute seule, une « carte du monde » unique de votre entreprise.</p>
    ${tel(`<p class="ny-heure" style="font-size:40px;margin-top:16px">7:15</p><small>Vendredi 22 janvier</small><b>Noyau</b><em>Le système nerveux central de votre entreprise</em><img src="IMG_1" alt="">`)}
    <div class="ny-d"><p>Cela change en profondeur votre façon de gérer le savoir.</p><a href="#contact">En savoir plus</a></div>
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing ny-contact" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding: clamp(80px, 8vw, 110px) 24px 30px !important; background: #000 !important; text-align: center; }
    #contact h2 { margin: 0 auto; font-size: clamp(28px, 2.6vw, 38px); font-weight: 400; color: #fff; }
    #contact .ny-go { display: inline-block; margin-top: 28px; padding: 11px 26px; border-radius: 999px; background: ${B}; color: #fff; text-decoration: none; box-shadow: 0 0 24px rgb(47 53 245 / .6); }
    #contact .ny-pied { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; max-width: 1080px; margin: clamp(80px, 8vw, 110px) auto 0; padding-top: 20px; border-top: 1px solid #1A1A3A; font-size: 12.5px; color: #8E90C8; }
  </style>
  <h2 id="contact-h">Voyez votre entreprise d'un seul coup d'œil</h2>
  <a class="ny-go" href="mailto:bonjour@noyau.io">Demander une démo</a>
  <div class="ny-pied"><span>© Noyau · modèle de la bibliothèque Bingoo!</span><span>bonjour@noyau.io</span></div>
</footer>` },
];
export const journal = ["Plan : hero, probleme, plateforme, contact"];
