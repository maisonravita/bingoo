// Modèle « Rempart » (28 nov. 2026) : recopie d'une maquette de cybersécurité (fond noir, formes de verre irisées orange
// et bleu, titre géant en minuscules sur trois niveaux, chiffres flottants, pilule d'essai, rangée de clients, trois
// cartes d'avantages). Nom, textes et images originaux ; les clients sont des noms inventés.
export const nom = "Rempart";
export const slugBase = "rempart";
export const metier = "Cybersécurité";
export const design = {
  mode: "dark", style: "Verre irisé", source: "bibliotheque",
  polices: { titres: "Jost", texte: "Jost" },
  couleurs: { background: "#000000", foreground: "#FFFFFF", primary: "#F2A07A", on_primary: "#1A0E08", card: "#0E0E12", muted: "#0E0E12", border: "#1E1E24", muted_foreground: "#A0A0AA", accent: "#F2A07A", secondary: "#0E0E12", ring: "#F2A07A", on_accent: "#1A0E08" },
};
const SANS = "pure black background, no text, no logo";
export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1088, height: 1920 }, prompt: `Abstract 3D render of several soft translucent glass blobs floating in darkness: a large rounded pebble-shaped blob with a glowing rim of orange, coral and red on top fading to violet and electric blue at the bottom, a second elongated blob above with white and orange highlights, a small blue blob on the right edge, iridescent refractions, dreamy, high contrast, ${SANS}.` },
  { id: "IMG_2", pour: "avantages", taille: "square_hd", prompt: `Abstract 3D render of a single soft rounded translucent glass blob, dark inside, its rim glowing orange, pink, green and blue iridescent, floating, centered, ${SANS}.` },
];
export const nav = [{ mot: "Solution", ancre: "avantages" }, { mot: "Clients", ancre: "clients" }, { mot: "Avantages", ancre: "avantages" }, { mot: "Contact", ancre: "contact" }];
const marque = (svg, nom, on = false) => `<span class="rp-m${on ? " on" : ""}">${svg}${nom}</span>`;

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    header.nav { background: transparent !important; border: 0 !important; }
    header.nav .nav__logo { font-weight: 500; font-size: 20px; letter-spacing: .02em; color: #fff !important; text-transform: lowercase; }
    header.nav .nav__link { color: #fff !important; font-size: 14px; }
    header.nav .rp-go { padding: 8px 18px; border-radius: 999px; border: 1px solid #F2A07A; color: #fff; font-size: 13px; text-decoration: none; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero">rempart</a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#avantages">Solution</a></div><div class="nav__item"><a class="nav__link" href="#clients">Clients</a></div><div class="nav__item"><a class="nav__link" href="#contact">Contact</a></div></nav>
    <div class="nav__actions"><a class="rp-go" href="#contact">Essayer</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif rp-hero">
  <style>
    #hero { position: relative; overflow: hidden; isolation: isolate; min-height: 0 !important; height: clamp(860px, 118vh, 1100px) !important; padding: 0 !important; background: #000 !important; color: #fff; }
    #hero > img { position: absolute; left: 50%; top: -4%; width: min(780px, 72vw); height: 108%; transform: translateX(-46%); object-fit: cover; z-index: -1; mix-blend-mode: screen; }
    #hero h1 { position: absolute; inset: 0; margin: 0; font-weight: 500; font-size: clamp(80px, 11.5vw, 170px); line-height: .9; letter-spacing: -.02em; text-transform: lowercase; color: #fff; pointer-events: none; }
    #hero h1 span { position: absolute; white-space: nowrap; } #hero h1 .l1 { left: 8%; top: 8%; } #hero h1 .l2 { right: 7%; top: 21%; } #hero h1 .l3 { left: 27%; top: 34%; }
    #hero .rp-chiffre { position: absolute; font-size: clamp(26px, 2.4vw, 36px); line-height: 1; } #hero .rp-chiffre small { display: block; margin-top: 6px; font-size: 11px; color: #C8C8D0; }
    #hero .rp-chiffre::before { content: ""; position: absolute; width: 60px; height: 1px; background: rgb(255 255 255 / .5); }
    #hero .c1 { right: 16%; top: 2.5%; } #hero .c1::before { right: 100%; top: 40px; transform: rotate(-30deg); transform-origin: right; margin-right: 12px; }
    #hero .c2 { left: 8%; top: 33%; } #hero .c2::before { left: 100%; top: 14px; margin-left: 14px; transform: rotate(-12deg); }
    #hero .c3 { right: 18%; top: 45%; } #hero .c3::before { right: 100%; top: -14px; margin-right: 6px; transform: rotate(35deg); transform-origin: right; }
    #hero .rp-lede { position: absolute; left: 8%; top: 25%; max-width: 230px; margin: 0; font-size: 15px; line-height: 1.25; color: #E5E5EA; }
    #hero .rp-pilule { position: absolute; left: 50%; top: 55%; transform: translateX(-50%); display: flex; align-items: center; gap: 30px; padding: 6px 6px 6px 22px; border-radius: 999px; background: rgb(20 20 26 / .75); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); font-size: 13px; color: #fff; white-space: nowrap; }
    #hero .rp-pilule a { padding: 9px 20px; border-radius: 999px; background: linear-gradient(180deg, #F6B28E, #EE8E66); color: #1A0E08; text-decoration: none; }
    #hero .rp-texte { position: absolute; right: 12%; top: 64%; max-width: 360px; margin: 0; font-size: 14px; line-height: 1.45; color: #E5E5EA; }
    #hero .rp-bas { position: absolute; left: 15%; top: 79%; max-width: 330px; margin: 0; font-size: 17px; line-height: 1.4; color: #D5D5DD; }
    @media (max-width: 767px) { #hero h1 { font-size: 64px; } #hero .rp-texte, #hero .c3 { display: none; } #hero .rp-lede { top: 30%; } #hero .c2 { top: 44%; } #hero .rp-bas { left: 8%; right: 8%; } }
  </style>
  <img src="IMG_1" alt="">
  <h1><span class="l1">protégez</span><span class="l2">vos</span><span class="l3">données</span></h1>
  <p class="rp-lede">Nous gardons vos données avec le plus grand soin, et votre vie privée partout.</p>
  <span class="rp-chiffre c1">+65k<small>entreprises clientes</small></span>
  <span class="rp-chiffre c2">+1,5 Md<small>Go de données protégés</small></span>
  <span class="rp-chiffre c3">+300k<small>installations</small></span>
  <div class="rp-pilule">Testez votre protection<a href="#contact">Essai gratuit</a></div>
  <p class="rp-texte">Avec un spécialiste de la sécurité à vos côtés, vos données sensibles sont chiffrées, les accès contrôlés et votre réseau surveillé jour et nuit contre les fuites, les intrusions et les attaques.</p>
  <p class="rp-bas">Protéger vos données avec ce qui se fait de mieux, et votre vie privée partout.</p>
</section>` },
  { id: "clients", html: `<section id="clients" class="section rp-clients" aria-label="Ils nous font confiance">
  <style>
    #clients { padding: 20px 24px clamp(60px, 6vw, 90px) !important; background: #000 !important; }
    #clients .rp-rang { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; max-width: 1180px; margin: 0 auto; }
    #clients .rp-m { display: flex; align-items: center; justify-content: center; gap: 10px; height: 104px; border-radius: 18px; font-size: 26px; font-weight: 600; letter-spacing: -.02em; color: #fff; background: radial-gradient(ellipse at 50% 120%, rgb(40 40 48 / .6), transparent 70%); }
    #clients .rp-m.on { background: linear-gradient(180deg, #232329, #17171C); box-shadow: inset 0 1px 0 rgb(255 255 255 / .08); } #clients svg { width: 30px; height: 30px; }
    #clients .rp-ligne { display: flex; justify-content: space-between; align-items: center; gap: 20px; max-width: 1040px; margin: clamp(80px, 9vw, 130px) auto 0; }
    #clients .rp-ligne p { margin: 0; max-width: 340px; font-size: 17px; line-height: 1.4; color: #D5D5DD; } #clients .rp-ligne a { padding: 10px 28px; border-radius: 999px; border: 1px solid #F2A07A; color: #fff; text-decoration: none; font-size: 14px; }
    @media (max-width: 899px) { #clients .rp-rang { grid-template-columns: 1fr 1fr; } #clients .rp-ligne { flex-direction: column; align-items: flex-start; } }
  </style>
  <div class="rp-rang">
    ${marque('<svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10Z"/></svg>', "Veille", true)}
    ${marque('<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" aria-hidden="true"><path d="M12 2 21 7v10l-9 5-9-5V7Z"/></svg>', "prisme")}
    ${marque('<svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M2 5h5l5 14 5-14h5L14 21h-4Z"/></svg>', "Vantail")}
    ${marque('<svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><circle cx="7" cy="7" r="4"/><circle cx="17" cy="7" r="4"/><circle cx="12" cy="16" r="4"/></svg>', "Trèfle")}
  </div>
  <div class="rp-ligne"><p>Protéger vos données avec ce qui se fait de mieux, et votre vie privée partout.</p><a href="#contact">Essai gratuit</a></div>
</section>` },
  { id: "avantages", html: `<section id="avantages" class="section rp-avantages" aria-labelledby="avantages-h">
  <style>
    #avantages { padding: 0 24px clamp(80px, 8vw, 120px) !important; background: #000 !important; }
    #avantages h2 { margin: 0 0 40px; text-align: center; font-size: clamp(30px, 2.8vw, 40px); font-weight: 400; color: #fff; }
    #avantages .rp-g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; max-width: 1080px; margin: 0 auto; }
    #avantages article { position: relative; display: flex; flex-direction: column; min-height: 470px; padding: 34px 30px; border-radius: 20px; overflow: hidden; background: linear-gradient(180deg, #17171D, #0D0D11); box-shadow: inset 0 1px 0 rgb(255 255 255 / .06); }
    #avantages h3 { margin: 0; font-size: 21px; font-weight: 400; line-height: 1.3; color: #fff; } #avantages p { margin: 34px 0 0; font-size: 14px; line-height: 1.45; color: #C8C8D0; }
    #avantages article:nth-child(2) { justify-content: flex-end; } #avantages article:nth-child(2) img { position: absolute; left: 10%; top: 8%; width: 80%; mix-blend-mode: screen; -webkit-mask: radial-gradient(circle at 50% 45%, #000 38%, transparent 62%); mask: radial-gradient(circle at 50% 45%, #000 38%, transparent 62%); }
    #avantages article:nth-child(3) p { margin-top: auto; }
    @media (max-width: 899px) { #avantages .rp-g { grid-template-columns: 1fr; } }
  </style>
  <h2 id="avantages-h">Nos atouts</h2>
  <div class="rp-g">
    <article><h3>Détection et réponse aux menaces</h3><p>Nous surveillons en continu votre réseau, vos journaux et votre activité pour repérer le moindre comportement suspect qui pourrait annoncer une attaque.</p></article>
    <article><img src="IMG_2" alt=""><h3>Une équipe d'experts à votre écoute</h3></article>
    <article><h3>Chiffrement de bout en bout</h3><p>Vos fichiers, vos échanges et vos sauvegardes restent illisibles pour qui n'a pas la clé, chez vous comme dans le nuage.</p></article>
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing rp-contact" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { position: relative; overflow: hidden; padding: clamp(80px, 8vw, 120px) 24px 32px !important; background: #000 !important; text-align: center; }
    #contact::before { content: ""; position: absolute; left: 50%; top: 40%; width: 560px; height: 300px; transform: translate(-50%, -50%); border-radius: 50%; background: radial-gradient(ellipse, rgb(238 142 102 / .35), rgb(80 90 230 / .2) 50%, transparent 72%); filter: blur(30px); }
    #contact h2 { position: relative; margin: 0 auto; font-size: clamp(48px, 6vw, 92px); font-weight: 500; line-height: .95; text-transform: lowercase; color: #fff; }
    #contact a.rp-b { position: relative; display: inline-block; margin-top: 36px; padding: 12px 30px; border-radius: 999px; background: linear-gradient(180deg, #F6B28E, #EE8E66); color: #1A0E08; text-decoration: none; }
    #contact .rp-pied { position: relative; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; max-width: 1080px; margin: clamp(90px, 9vw, 130px) auto 0; padding-top: 22px; border-top: 1px solid #1E1E24; font-size: 13px; color: #A0A0AA; }
  </style>
  <h2 id="contact-h">dormez<br>tranquille</h2>
  <a class="rp-b" href="mailto:bonjour@rempart.fr">Parler à un expert</a>
  <div class="rp-pied"><span>© Rempart · modèle de la bibliothèque Bingoo!</span><span>bonjour@rempart.fr</span></div>
</footer>` },
];
export const journal = ["Plan : hero, clients, avantages, contact"];
