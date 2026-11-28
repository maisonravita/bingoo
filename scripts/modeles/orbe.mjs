// Modèle de la bibliothèque « Orbe » (28 nov. 2026) : recopie du premier écran d'une maquette d'outil créatif
// (image sombre plein cadre, texte fin en haut à gauche, preuve en bas), suite de page dans le même style.
// Nom, textes et images originaux : aucune marque, aucune vraie personne (avatars en pastilles).
export const nom = "Orbe";
export const slugBase = "orbe";
export const metier = "Outil de retouche photo et vidéo par IA pour les créateurs";
export const design = {
  mode: "dark", style: "Nuit cinéma", source: "bibliotheque",
  polices: { titres: "Inter Tight", texte: "Inter" },
  couleurs: { background: "#050505", foreground: "#FFFFFF", primary: "#FF6B4A", on_primary: "#FFFFFF", card: "#111111", muted: "#111111", border: "#232323", muted_foreground: "#8C8C8C", accent: "#FF6B4A", secondary: "#1A1A1A", ring: "#FF6B4A", on_accent: "#FFFFFF" },
};
const MONO = 'ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, monospace';

export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1920, height: 1280 }, prompt: "A wide cinematic artwork, landscape format: the left third is near black with a few faint tiny stars, empty, so white text can sit there; on the right a huge luminous curved wall of light sweeping up from the horizon, with long vertical streaks of coral red, warm orange and pale cyan bleeding like an aurora into a bright white glow; below it a calm mirror-like water surface reflecting the colours; one small lone figure wearing a simple rounded helmet and dark suit walks towards the camera on the water, slightly right of centre, with a long reflection; dreamy, high contrast, soft film grain, no text, no logo." },
  { id: "IMG_2", pour: "comment", taille: { width: 1920, height: 820 }, prompt: "A wide abstract artwork on pure black: one long flowing ribbon of light crossing the frame like an aurora, made of fine luminous threads in coral red, orange, pale cyan and white, soft glow, silky motion blur, lots of black space around, cinematic, no text, no logo." },
];

export const nav = [{ mot: "Produit", ancre: "hero" }, { mot: "Avantages", ancre: "avantages" }, { mot: "Comment ça marche", ancre: "comment" }, { mot: "Chiffres", ancre: "chiffres" }, { mot: "Contact", ancre: "contact" }];

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    .nav .nav__link { font-family: ${MONO}; font-size: 12.5px; text-transform: uppercase; letter-spacing: .02em; color: rgb(255 255 255 / .78); }
    .nav .ob-logo { display: inline-flex; align-items: center; gap: 10px; font-weight: 600; }
    .nav .ob-logo i { width: 22px; height: 22px; border-radius: 50%; border: 5px solid #fff; }
    .nav .ob-pill { font-family: ${MONO}; font-size: 12.5px; text-transform: uppercase; padding: 11px 22px !important; border-radius: 999px !important; }
    .nav .ob-pill--sombre { background: rgb(255 255 255 / .06) !important; border: 1px solid rgb(255 255 255 / .16) !important; color: #fff !important; }
    .nav .ob-pill--corail { background: rgb(255 107 74 / .28) !important; border: 1px solid rgb(255 140 110 / .45) !important; color: #fff !important; backdrop-filter: blur(8px); }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo ob-logo" href="#hero"><i aria-hidden="true"></i>Orbe</a>
    <nav class="nav__links" aria-label="Principal">
      <div class="nav__item"><a class="nav__link" href="#hero">Produit</a></div>
      <div class="nav__item"><a class="nav__link" href="#avantages">Avantages</a></div>
      <div class="nav__item"><a class="nav__link" href="#comment">Comment ça marche</a></div>
      <div class="nav__item"><a class="nav__link" href="#chiffres">Chiffres</a></div>
      <div class="nav__item"><a class="nav__link" href="#contact">Contact</a></div>
    </nav>
    <div class="nav__actions">
      <a class="btn ob-pill ob-pill--sombre" href="#contact">Connexion</a>
      <a class="btn ob-pill ob-pill--corail" href="#contact">Commencer</a>
    </div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-horizon">
  <img class="hero-horizon__fond" src="IMG_1" alt="Une silhouette marche sur l'eau vers un grand mur de lumière aux couleurs d'aurore">
  <div class="hero-horizon__haut">
    <p class="hero-horizon__badge">Pour les créateurs d'aujourd'hui</p>
    <h1 class="hero-horizon__titre">La retouche par IA, pensée pour les créateurs.</h1>
    <a class="btn hero-horizon__btn" href="#contact">Commencer</a>
  </div>
  <div class="hero-horizon__bas">
    <p>Orbe comprend ce que tu veux faire de ton image et accélère chaque étape de ta retouche, de l'idée à l'export.</p>
    <p class="hero-horizon__preuve"><span class="hero-horizon__ronds" aria-hidden="true"><i></i><i></i><i></i><i></i></span>Déjà adopté par 12 000 créateurs.</p>
  </div>
</section>` },
  { id: "avantages", html: `<section id="avantages" class="section ob-avantages" aria-labelledby="avantages-h">
  <style>
    #avantages { padding-block: clamp(80px, 10vw, 140px) !important; position: relative; overflow: hidden; }
    #avantages::before { content: ""; position: absolute; right: -10%; top: -20%; width: 60%; height: 80%; background: radial-gradient(closest-side, rgb(255 107 74 / .18), transparent); pointer-events: none; }
    #avantages .ob-etiq { font-family: ${MONO}; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #8C8C8C; margin: 0; }
    #avantages h2 { margin: 16px 0 clamp(40px, 5vw, 64px); max-width: 18ch; font-weight: 400; font-size: clamp(32px, 3.4vw, 52px); line-height: 1.08; letter-spacing: -.03em; }
    #avantages .ob-cartes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    #avantages .ob-carte { padding: 28px 26px 30px; border-radius: 18px; background: linear-gradient(180deg, rgb(255 255 255 / .06), rgb(255 255 255 / .02)); border: 1px solid rgb(255 255 255 / .09); }
    #avantages .ob-carte b { font-family: ${MONO}; font-size: 12px; font-weight: 400; color: #FF8C6E; }
    #avantages h3 { margin: 40px 0 10px; font-size: 20px; font-weight: 500; letter-spacing: -.01em; }
    #avantages .ob-carte p { margin: 0; font-size: 14.5px; line-height: 1.6; color: #8C8C8C; }
    @media (max-width: 899px) { #avantages .ob-cartes { grid-template-columns: 1fr; } }
  </style>
  <div class="wrap">
    <p class="ob-etiq">(01) Avantages</p>
    <h2 id="avantages-h">Moins de clics, plus de temps pour créer.</h2>
    <div class="ob-cartes">
      <article class="ob-carte"><b>01</b><h3>Retouche en une phrase</h3><p>« Rends le ciel plus doux », « retire le passant » : tu l'écris, Orbe le fait sur ton image.</p></article>
      <article class="ob-carte"><b>02</b><h3>Ton style, partout</h3><p>Orbe apprend tes réglages préférés et les applique à toute une série de photos ou de plans vidéo.</p></article>
      <article class="ob-carte"><b>03</b><h3>Export prêt à publier</h3><p>Formats carré, vertical et paysage en un clic, à la bonne taille pour chaque réseau.</p></article>
    </div>
  </div>
</section>` },
  { id: "comment", html: `<section id="comment" class="section ob-comment" aria-labelledby="comment-h">
  <style>
    #comment { padding-block: clamp(64px, 8vw, 120px) !important; }
    #comment .ob-etiq { font-family: ${MONO}; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #8C8C8C; margin: 0; }
    #comment h2 { margin: 16px 0 clamp(36px, 4vw, 56px); max-width: 20ch; font-weight: 400; font-size: clamp(32px, 3.4vw, 52px); line-height: 1.08; letter-spacing: -.03em; }
    #comment img { display: block; width: 100%; aspect-ratio: 2.35; object-fit: cover; border-radius: 22px; border: 1px solid rgb(255 255 255 / .08); }
    #comment ol { list-style: none; margin: clamp(32px, 4vw, 48px) 0 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
    #comment li { padding-top: 20px; border-top: 1px solid rgb(255 255 255 / .14); }
    #comment li b { font-family: ${MONO}; font-size: 12px; font-weight: 400; color: #FF8C6E; }
    #comment h3 { margin: 14px 0 8px; font-size: 19px; font-weight: 500; }
    #comment li p { margin: 0; font-size: 14.5px; line-height: 1.6; color: #8C8C8C; }
    @media (max-width: 899px) { #comment ol { grid-template-columns: 1fr; } #comment img { aspect-ratio: 1.6; } }
  </style>
  <div class="wrap">
    <p class="ob-etiq">(02) Comment ça marche</p>
    <h2 id="comment-h">De ton image brute au visuel publié.</h2>
    <img src="IMG_2" alt="Un ruban de lumière corail et cyan sur fond noir">
    <ol>
      <li><b>Étape 01</b><h3>Dépose tes fichiers</h3><p>Photos ou vidéos, depuis ton ordinateur ou ton téléphone.</p></li>
      <li><b>Étape 02</b><h3>Dis ce que tu veux</h3><p>En une phrase, ou en choisissant un de tes styles enregistrés.</p></li>
      <li><b>Étape 03</b><h3>Publie</h3><p>Orbe prépare chaque format et tu télécharges en un clic.</p></li>
    </ol>
  </div>
</section>` },
  { id: "chiffres", html: `<section id="chiffres" class="section ob-chiffres" aria-label="Chiffres">
  <style>
    #chiffres { padding-block: clamp(48px, 6vw, 88px) !important; }
    #chiffres dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin: 0; border-top: 1px solid rgb(255 255 255 / .14); border-bottom: 1px solid rgb(255 255 255 / .14); padding-block: clamp(32px, 4vw, 56px); }
    #chiffres dt { font-weight: 300; font-size: clamp(44px, 5vw, 80px); letter-spacing: -.04em; line-height: 1; }
    #chiffres dd { margin: 12px 0 0; font-family: ${MONO}; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #8C8C8C; }
    @media (max-width: 767px) { #chiffres dl { grid-template-columns: 1fr; } }
  </style>
  <div class="wrap">
    <dl><div><dt>12 000+</dt><dd>Créateurs</dd></div><div><dt>4,2 M</dt><dd>Images retouchées</dd></div><div><dt>9 s</dt><dd>Par retouche, en moyenne</dd></div></dl>
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding-block: clamp(96px, 12vw, 168px) 28px !important; position: relative; overflow: hidden; text-align: center; }
    #contact::before { content: ""; position: absolute; left: 50%; top: 10%; width: 900px; height: 520px; transform: translateX(-50%); background: radial-gradient(closest-side, rgb(255 107 74 / .32), rgb(120 200 230 / .12) 55%, transparent); filter: blur(10px); pointer-events: none; }
    #contact h2 { position: relative; margin: 0 auto; max-width: 14ch; font-weight: 400; font-size: clamp(38px, 4.6vw, 72px); line-height: 1.04; letter-spacing: -.035em; }
    #contact .ob-btn { position: relative; display: inline-flex; margin-top: 32px; padding: 14px 26px; border-radius: 999px; background: linear-gradient(180deg, rgb(255 255 255 / .34), rgb(255 255 255 / .12)); border: 1px solid rgb(255 255 255 / .28); color: #fff; font-family: ${MONO}; font-size: 12.5px; text-transform: uppercase; text-decoration: none; }
    #contact .ob-pied { position: relative; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; margin-top: clamp(80px, 10vw, 140px); padding-top: 20px; border-top: 1px solid rgb(255 255 255 / .12); font-family: ${MONO}; font-size: 12px; text-transform: uppercase; color: #8C8C8C; }
    #contact .ob-pied nav { display: flex; gap: 22px; } #contact .ob-pied a { color: #8C8C8C; text-decoration: none; }
  </style>
  <div class="wrap">
    <h2 id="contact-h">Ton prochain visuel commence ici.</h2>
    <a class="ob-btn" href="#hero">Essayer Orbe</a>
    <div class="ob-pied"><span>© Orbe · modèle de la bibliothèque Bingoo!</span><nav aria-label="Pied de page"><a href="#avantages">Avantages</a><a href="#comment">Comment ça marche</a><a href="#contact">Mentions légales</a></nav></div>
  </div>
</footer>` },
];
export const journal = ["Premier écran : composition Horizon", "Plan : hero, avantages, comment, chiffres, contact"];
