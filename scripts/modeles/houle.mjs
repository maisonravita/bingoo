// Modèle « Houle » (28 nov. 2026) : recopie d'une maquette en vue aérienne de l'océan (écume à gauche, mots géants en
// capitales étroites à droite où l'image transparaît, accroche espacée à gauche, numéro de diapositive).
export const nom = "Houle";
export const slugBase = "houle";
export const metier = "École de surf";
export const design = {
  mode: "dark", style: "Océan", source: "bibliotheque",
  polices: { titres: "Oswald", texte: "Josefin Sans" },
  couleurs: { background: "#0B3A47", foreground: "#FFFFFF", primary: "#FFFFFF", on_primary: "#0B3A47", card: "#0F4655", muted: "#0F4655", border: "#2A6070", muted_foreground: "#A7C6CE", accent: "#7FD1DE", secondary: "#0F4655", ring: "#7FD1DE", on_accent: "#0B3A47" },
};
const FONTS = `@import url("https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Josefin+Sans:wght@300;400;600&family=Yellowtail&display=swap");`;
export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1920, height: 1088 }, prompt: "Top-down aerial drone photograph of the ocean: the left third is a wide band of white crashing foam and breaking waves with rich bubbly texture, the rest of the frame is deep teal blue water with fine ripples, a tiny surfer lying on a white surfboard paddling in the middle left, natural light, no horizon, photorealistic, no text, no logo." },
  { id: "IMG_2", pour: "cours", taille: "portrait_4_3", prompt: "Photograph of a surf lesson on a wide sandy beach at golden hour, soft-top surfboards lying on the sand in a row, gentle waves behind, warm light, no recognisable faces, photorealistic, no text, no logo." },
  { id: "IMG_3", pour: "cours", taille: "portrait_4_3", prompt: "Photograph of a surfer riding a clean green-blue wave seen from the water, spray, sunlight, the surfer small and seen from behind, photorealistic, no text, no logo." },
  { id: "IMG_4", pour: "cours", taille: "portrait_4_3", prompt: "Top-down aerial photograph of a turquoise lagoon with a single paddle board, sand bottom visible, calm water, photorealistic, no text, no logo." },
  { id: "IMG_5", pour: "spot", taille: { width: 1920, height: 820 }, prompt: "Wide photograph of a wild Atlantic beach with dunes and pine forest behind, long rolling waves, soft evening light and mist, photorealistic, no people, no text, no logo." },
];
export const nav = [{ mot: "Accueil", ancre: "hero" }, { mot: "L'école", ancre: "ecole" }, { mot: "Cours", ancre: "cours" }, { mot: "Le spot", ancre: "spot" }, { mot: "Contact", ancre: "contact" }];

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    ${FONTS}
    .nav .nav__logo { font-family: Yellowtail, cursive; font-size: 30px; font-weight: 400; color: #8FD4E0; }
    .nav .nav__links { margin-left: auto; } .nav .nav__link { font-family: "Bebas Neue", Oswald, sans-serif; font-size: 24px; letter-spacing: .02em; color: rgb(255 255 255 / .72); }
    .nav .nav__item:first-child .nav__link { color: #fff; text-decoration: underline; text-underline-offset: 8px; text-decoration-thickness: 2px; }
    .nav .nav__actions { display: none; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero">Houle</a>
    <nav class="nav__links" aria-label="Principal">
      <div class="nav__item"><a class="nav__link" href="#hero">Accueil</a></div>
      <div class="nav__item"><a class="nav__link" href="#ecole">L'école</a></div>
      <div class="nav__item"><a class="nav__link" href="#cours">Cours</a></div>
      <div class="nav__item"><a class="nav__link" href="#spot">Le spot</a></div>
      <div class="nav__item"><a class="nav__link" href="#contact">Contact</a></div>
    </nav>
    <div class="nav__actions"></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif ho-hero">
  <style>
    ${FONTS}
    #hero { position: relative; min-height: clamp(640px, 100svh, 940px) !important; padding: 0 !important; overflow: hidden; isolation: isolate; color: #fff; background: #0B3A47; }
    #hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: left center; z-index: -2; }
    #hero::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, transparent 30%, rgb(5 40 50 / .25)); }
    #hero .ho-gauche { position: absolute; left: clamp(24px, 27vw, 420px); bottom: 15%; max-width: 330px; }
    #hero h1 { margin: 0; font-family: "Josefin Sans", sans-serif; font-weight: 400; font-size: clamp(30px, 3vw, 46px); line-height: 1.05; letter-spacing: .08em; color: #fff; }
    #hero .ho-gauche p { margin: 18px 0 0; font-family: "Josefin Sans", sans-serif; font-size: 13.5px; line-height: 1.45; letter-spacing: .06em; color: rgb(255 255 255 / .62); }
    #hero .ho-gauche a { display: inline-block; margin-top: 26px; padding: 10px 26px; border: 1px solid rgb(255 255 255 / .85); color: #fff; font-family: "Josefin Sans", sans-serif; font-size: 12.5px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; text-decoration: none; }
    #hero .ho-mots { position: absolute; right: clamp(48px, 6vw, 110px); top: 50%; transform: translateY(-52%); text-align: right; font-family: "Bebas Neue", Oswald, sans-serif; font-size: clamp(110px, 14vw, 220px); line-height: .86; letter-spacing: .01em; color: rgb(255 255 255 / .96); mix-blend-mode: overlay; }
    #hero .ho-mots span { display: block; }
    #hero .ho-ombre { position: absolute; right: clamp(48px, 6vw, 110px); top: 50%; transform: translateY(-52%); text-align: right; font-family: "Bebas Neue", Oswald, sans-serif; font-size: clamp(110px, 14vw, 220px); line-height: .86; letter-spacing: .01em; color: rgb(230 245 248 / .5); }
    #hero .ho-ombre span { display: block; }
    #hero .ho-trait { position: absolute; right: clamp(20px, 3vw, 44px); top: 26%; height: 48%; width: 1px; background: rgb(255 255 255 / .35); }
    #hero .ho-num { position: absolute; right: clamp(48px, 6vw, 110px); bottom: 13%; display: flex; align-items: baseline; gap: 14px; font-family: "Josefin Sans", sans-serif; font-weight: 600; }
    #hero .ho-num b { font-size: 40px; font-weight: 600; } #hero .ho-num small { font-size: 22px; color: rgb(255 255 255 / .6); } #hero .ho-num i { width: 90px; height: 1px; background: rgb(255 255 255 / .5); }
    #hero .ho-gauche, #hero .ho-mots, #hero .ho-ombre { animation: compo-monte 1.1s cubic-bezier(.2,.7,.2,1) both; }
    @media (max-width: 899px) { #hero .ho-gauche { left: 24px; bottom: 12%; } #hero .ho-mots, #hero .ho-ombre { right: 24px; top: 32%; font-size: 92px; } #hero .ho-num, #hero .ho-trait { display: none; } }
  </style>
  <img src="IMG_1" alt="L'océan vu du ciel, une bande d'écume à gauche et un surfeur qui rame">
  <div class="ho-ombre" aria-hidden="true"><span>Suis</span><span>la</span><span>vague</span></div>
  <div class="ho-mots" aria-hidden="true"><span>Suis</span><span>la</span><span>vague</span></div>
  <span class="ho-trait" aria-hidden="true"></span>
  <div class="ho-gauche">
    <h1>Le bonheur arrive par vagues</h1>
    <p>Cours de surf pour débutants et confirmés, sur les plages des Landes, d'avril à octobre.</p>
    <a href="#cours">En savoir plus</a>
  </div>
  <p class="ho-num" aria-hidden="true"><b>01</b><small>/ 03</small><i></i></p>
</section>` },
  { id: "ecole", html: `<section id="ecole" class="section ho-ecole" aria-labelledby="ecole-h">
  <style>
    ${FONTS}
    #ecole { padding-block: clamp(88px, 11vw, 150px) !important; text-align: center; }
    #ecole span { font-family: "Josefin Sans", sans-serif; font-size: 13px; letter-spacing: .3em; text-transform: uppercase; color: #7FD1DE; }
    #ecole h2 { margin: 18px auto 0; max-width: 22ch; font-family: "Josefin Sans", sans-serif; font-weight: 300; font-size: clamp(28px, 3vw, 46px); line-height: 1.25; letter-spacing: .04em; }
    #ecole dl { display: flex; justify-content: center; gap: clamp(32px, 7vw, 120px); margin: 56px 0 0; }
    #ecole dt { font-family: "Bebas Neue", Oswald, sans-serif; font-size: clamp(56px, 6vw, 92px); line-height: 1; } #ecole dd { margin: 6px 0 0; font-family: "Josefin Sans", sans-serif; font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: #A7C6CE; }
  </style>
  <div class="wrap"><span>L'école</span><h2 id="ecole-h">On t'apprend à lire l'océan avant de te mettre debout sur la planche.</h2>
  <dl><div><dt>15</dt><dd>Saisons</dd></div><div><dt>6</dt><dd>Moniteurs diplômés</dd></div><div><dt>8</dt><dd>Élèves max par cours</dd></div></dl></div>
</section>` },
  { id: "cours", html: `<section id="cours" class="section ho-cours" aria-labelledby="cours-h">
  <style>
    ${FONTS}
    #cours { padding-block: clamp(48px, 6vw, 96px) !important; }
    #cours h2 { margin: 0 0 36px; font-family: "Bebas Neue", Oswald, sans-serif; font-weight: 400; font-size: clamp(56px, 6vw, 96px); line-height: .9; }
    #cours .ho-g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
    #cours figure { position: relative; margin: 0; overflow: hidden; border-radius: 14px; } #cours img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block; }
    #cours figcaption { position: absolute; left: 0; right: 0; bottom: 0; padding: 60px 22px 22px; background: linear-gradient(180deg, transparent, rgb(5 30 38 / .85)); font-family: "Josefin Sans", sans-serif; }
    #cours figcaption b { display: block; font-family: "Bebas Neue", Oswald, sans-serif; font-size: 34px; font-weight: 400; letter-spacing: .02em; } #cours figcaption span { font-size: 14px; letter-spacing: .04em; color: rgb(255 255 255 / .8); }
    @media (max-width: 899px) { #cours .ho-g { grid-template-columns: 1fr; } }
  </style>
  <div class="wrap"><h2 id="cours-h">Nos cours</h2>
  <div class="ho-g">
    <figure><img src="IMG_2" alt="Des planches de surf alignées sur la plage au soleil couchant"><figcaption><b>Découverte</b><span>2 h · dès 8 ans · 45 €</span></figcaption></figure>
    <figure><img src="IMG_3" alt="Un surfeur sur une vague verte"><figcaption><b>Perfectionnement</b><span>Stage de 5 jours · 220 €</span></figcaption></figure>
    <figure><img src="IMG_4" alt="Un paddle sur un lagon turquoise"><figcaption><b>Paddle</b><span>1 h 30 · tous niveaux · 35 €</span></figcaption></figure>
  </div></div>
</section>` },
  { id: "spot", html: `<section id="spot" class="section ho-spot" aria-labelledby="spot-h">
  <style>
    ${FONTS}
    #spot { position: relative; padding: 0 !important; overflow: hidden; }
    #spot img { width: 100%; aspect-ratio: 2.35; object-fit: cover; display: block; }
    #spot div { position: absolute; left: var(--gut); bottom: 10%; max-width: 420px; }
    #spot h2 { margin: 0; font-family: "Bebas Neue", Oswald, sans-serif; font-weight: 400; font-size: clamp(56px, 6vw, 96px); line-height: .9; color: #fff; }
    #spot p { margin: 10px 0 0; font-family: "Josefin Sans", sans-serif; font-size: 15px; letter-spacing: .04em; color: rgb(255 255 255 / .9); }
  </style>
  <img src="IMG_5" alt="Une plage sauvage avec des dunes et des pins, de longues vagues au soir">
  <div><h2 id="spot-h">Le spot</h2><p>Une plage sauvage des Landes, à 10 minutes à pied de l'école, surveillée tout l'été.</p></div>
</section>` },
  { id: "contact", html: `<footer class="footer closing" id="contact" aria-labelledby="contact-h">
  <style>
    ${FONTS}
    #contact { padding-block: clamp(80px, 10vw, 140px) 28px !important; text-align: center; }
    #contact h2 { margin: 0; font-family: "Bebas Neue", Oswald, sans-serif; font-weight: 400; font-size: clamp(72px, 9vw, 150px); line-height: .88; }
    #contact a.ho-btn { display: inline-block; margin-top: 26px; padding: 12px 30px; border: 1px solid #fff; color: #fff; font-family: "Josefin Sans", sans-serif; font-size: 13px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; text-decoration: none; }
    #contact .ho-bas { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; margin-top: clamp(64px, 8vw, 112px); padding-top: 18px; border-top: 1px solid #2A6070; font-family: "Josefin Sans", sans-serif; font-size: 13px; letter-spacing: .06em; color: #A7C6CE; }
  </style>
  <div class="wrap"><h2 id="contact-h">À l'eau ?</h2><p style="margin:0"><a class="ho-btn" href="#cours">Réserver un cours</a></p>
  <div class="ho-bas"><span>© Houle · modèle de la bibliothèque Bingoo!</span><span>Ouvert d'avril à octobre</span></div></div>
</footer>` },
];
export const journal = ["Plan : hero, ecole, cours, spot, contact"];
