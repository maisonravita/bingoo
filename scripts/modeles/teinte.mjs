// Modèle « Teinte » (28 nov. 2026) : recopie d'une maquette de carrosserie et peinture auto (fond nuit, halos bleus,
// titres en capitales, voiture en studio, grille de prestations avec visuels, cartes d'arguments, appel avec trois voitures).
// Nom, textes et images originaux : voitures sans logo ni marque.
export const nom = "Teinte";
export const slugBase = "teinte";
export const metier = "Carrosserie et peinture automobile";
export const design = {
  mode: "dark", style: "Nuit bleue", source: "bibliotheque",
  polices: { titres: "Inter", texte: "Inter" },
  couleurs: { background: "#121317", foreground: "#FFFFFF", primary: "#3A5BD9", on_primary: "#FFFFFF", card: "#1A1C22", muted: "#1A1C22", border: "#262932", muted_foreground: "#A3A7B5", accent: "#3A5BD9", secondary: "#1A1C22", ring: "#3A5BD9", on_accent: "#FFFFFF" },
};
const SANS = "no logo, no badge, no brand, no text, no licence plate";
export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1920, height: 960 }, prompt: `Studio photograph of a low sports coupe seen exactly from the side, the front half painted matte graphite grey and the rear half glossy royal blue with a soft gradient between, black sport rims, on a dark studio floor with a soft reflection and a pool of cold blue-grey light under it, pure dark background, premium automotive advertising, photorealistic, ${SANS}.` },
  { id: "IMG_2", pour: "types", taille: "landscape_4_3", prompt: `Studio photograph of a glossy royal blue sport sedan seen three quarters from the front, on pure black background, soft rim light, photorealistic automotive photography, ${SANS}.` },
  { id: "IMG_3", pour: "types", taille: "landscape_4_3", prompt: `Close studio photograph of a car door panel with fresh paint fading from grey primer to glossy royal blue, side mirror visible, on pure black background, photorealistic, ${SANS}.` },
  { id: "IMG_4", pour: "types", taille: "landscape_4_3", prompt: `Close studio photograph of a car brake disc with a caliper freshly painted in royal blue, on pure black background, dramatic light, photorealistic, ${SANS}.` },
  { id: "IMG_5", pour: "types", taille: "landscape_4_3", prompt: `Studio photograph of a single alloy car wheel rim painted glossy royal blue with dark spokes, three quarter view, on pure black background, photorealistic, ${SANS}.` },
  { id: "IMG_6", pour: "types", taille: "landscape_4_3", prompt: `Close studio photograph of a car front bumper corner and headlight with a fresh royal blue paint repair, on pure black background, photorealistic, ${SANS}.` },
  { id: "IMG_7", pour: "appel", taille: { width: 1920, height: 820 }, prompt: `Studio photograph of three modern cars seen from the front in a row, a black convertible on the left, a glossy royal blue coupe in the middle slightly forward, a black sedan on the right, on a dark studio floor with a pool of cold blue light, dark background, photorealistic automotive advertising, ${SANS}.` },
];
export const nav = [{ mot: "Accueil", ancre: "hero" }, { mot: "Prestations", ancre: "types" }, { mot: "Atelier", ancre: "atelier" }, { mot: "Engagements", ancre: "engagements" }, { mot: "Contact", ancre: "contact" }];
const type = (img, t, alt) => `<article class="te-type"><h3>${t}</h3><img src="${img}" alt="${alt}"><a href="#contact">En savoir plus</a></article>`;

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    .nav .nav__logo { font-size: 13px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
    .nav .nav__link { font-size: 12px; }
    .nav .te-rappel { border-radius: 999px !important; padding: 7px 18px !important; background: #fff !important; color: #121317 !important; border-color: #fff !important; font-size: 12px; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero">Teinte</a>
    <nav class="nav__links" aria-label="Principal">
      <div class="nav__item"><a class="nav__link" href="#hero">Accueil</a></div>
      <div class="nav__item"><a class="nav__link" href="#types">Prestations</a></div>
      <div class="nav__item"><a class="nav__link" href="#atelier">Atelier</a></div>
      <div class="nav__item"><a class="nav__link" href="#engagements">Engagements</a></div>
      <div class="nav__item"><a class="nav__link" href="#contact">Contact</a></div>
    </nav>
    <div class="nav__actions"><a class="btn te-rappel" href="#contact">Être rappelé</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif te-hero">
  <style>
    #hero { position: relative; padding: calc(var(--nav) + clamp(48px, 8vh, 88px)) var(--gut) clamp(40px, 6vw, 80px) !important; min-height: 0 !important; text-align: center; overflow: hidden; isolation: isolate; color: #fff; background: radial-gradient(70% 55% at 50% 0%, #1F2E66 0%, #151829 45%, #121317 75%); }
    #hero h1 { margin: 0; font-weight: 400; font-size: clamp(34px, 3.6vw, 54px); line-height: 1.08; letter-spacing: .005em; text-transform: uppercase; }
    #hero p { margin: 18px auto 0; max-width: 360px; font-size: 13px; line-height: 1.55; color: #C9CCD8; }
    #hero .te-btn { display: inline-block; margin-top: 22px; padding: 9px 22px; border-radius: 999px; background: #3A5BD9; color: #fff; font-size: 13px; text-decoration: none; }
    #hero img { display: block; width: min(100%, 980px); margin: clamp(24px, 4vw, 48px) auto 0; aspect-ratio: 2; object-fit: cover; -webkit-mask-image: radial-gradient(75% 85% at 50% 50%, #000 60%, transparent 100%); mask-image: radial-gradient(75% 85% at 50% 50%, #000 60%, transparent 100%); animation: compo-monte 1.2s .2s cubic-bezier(.2,.7,.2,1) both; }
  </style>
  <h1>Pousse la couleur<br>au maximum</h1>
  <p>Des petites retouches à la peinture complète de la carrosserie, toutes les prestations dans un seul atelier.</p>
  <a class="te-btn" href="#contact">Être rappelé</a>
  <img src="IMG_1" alt="Un coupé de profil, gris à l'avant et bleu à l'arrière">
</section>` },
  { id: "atelier", html: `<section id="atelier" class="section te-atelier" aria-labelledby="atelier-h">
  <style>
    #atelier { position: relative; padding-block: clamp(72px, 9vw, 128px) !important; overflow: hidden; }
    #atelier::before { content: ""; position: absolute; left: -10%; top: 0; width: 60%; height: 100%; background: radial-gradient(closest-side, rgb(58 91 217 / .35), transparent); pointer-events: none; }
    #atelier .te-g { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: clamp(32px, 6vw, 96px); max-width: 1000px; margin-inline: auto; }
    #atelier h2 { margin: 0; font-weight: 400; font-size: clamp(28px, 2.8vw, 42px); line-height: 1.12; text-transform: uppercase; }
    #atelier p { margin: 0 0 14px; font-size: 13px; line-height: 1.65; color: #A3A7B5; }
    #atelier a { display: inline-block; margin-top: 10px; padding: 8px 20px; border-radius: 999px; background: #3A5BD9; color: #fff; font-size: 12.5px; text-decoration: none; }
    @media (max-width: 767px) { #atelier .te-g { grid-template-columns: 1fr; } }
  </style>
  <div class="wrap"><div class="te-g">
    <h2 id="atelier-h">Nous peignons les voitures de toutes les marques</h2>
    <div><p>Nos carrossiers se forment sans cesse aux nouvelles techniques de réparation et de peinture. Résultat : un travail soigné, des délais courts et des prix justes.</p><p>Nos garanties couvrent toutes nos prestations, y compris sur les véhicules encore sous garantie constructeur, avec un contrôle indépendant possible à la livraison.</p><a href="#engagements">L'atelier</a></div>
  </div></div>
</section>` },
  { id: "types", html: `<section id="types" class="section te-types" aria-labelledby="types-h">
  <style>
    #types { padding-block: clamp(48px, 6vw, 96px) !important; }
    #types h2 { max-width: 1000px; margin: 0 auto 32px; font-weight: 400; font-size: clamp(28px, 2.8vw, 42px); text-transform: uppercase; }
    #types .te-grille { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; max-width: 1000px; margin-inline: auto; }
    #types .te-type { position: relative; overflow: hidden; min-height: 240px; padding: 22px; border-radius: 6px; background: #1A1C22; box-shadow: 0 0 0 1px #23252D; }
    #types .te-type h3 { position: relative; z-index: 1; margin: 0; font-size: 13.5px; font-weight: 500; text-transform: uppercase; }
    #types .te-type img { position: absolute; right: 0; bottom: 0; width: 62%; height: 78%; object-fit: cover; object-position: left center; -webkit-mask-image: linear-gradient(90deg, transparent, #000 35%); mask-image: linear-gradient(90deg, transparent, #000 35%); }
    #types .te-type a { position: absolute; left: 22px; bottom: 20px; z-index: 1; font-size: 11.5px; color: #fff; }
    #types .te-devis { background: #3A5BD9 !important; box-shadow: none; } #types .te-devis h3 { max-width: 220px; }
    @media (max-width: 767px) { #types .te-grille { grid-template-columns: 1fr; } }
  </style>
  <div class="wrap">
    <h2 id="types-h">Nos prestations de peinture</h2>
    <div class="te-grille">
      ${type("IMG_2", "Peinture complète", "Une berline bleue brillante")}
      ${type("IMG_3", "Peinture d'un élément", "Une portière repeinte en bleu")}
      ${type("IMG_4", "Peinture des étriers", "Un étrier de frein peint en bleu")}
      ${type("IMG_5", "Peinture des jantes", "Une jante peinte en bleu")}
      ${type("IMG_6", "Retouche locale", "Un pare-chocs retouché en bleu")}
      <article class="te-type te-devis"><h3>Demande un devis gratuit</h3><a href="#contact">Être rappelé</a></article>
    </div>
  </div>
</section>` },
  { id: "engagements", html: `<section id="engagements" class="section te-engagements" aria-labelledby="engagements-h">
  <style>
    #engagements { padding-block: clamp(72px, 9vw, 128px) !important; }
    #engagements .te-g { display: grid; grid-template-columns: 1fr 2fr; gap: 24px; max-width: 1000px; margin-inline: auto; }
    #engagements h2 { grid-column: 1 / -1; margin: 0 0 16px; max-width: 14ch; font-weight: 400; font-size: clamp(28px, 2.8vw, 42px); line-height: 1.12; text-transform: uppercase; }
    #engagements .te-intro { margin: 0; font-size: 12.5px; line-height: 1.65; color: #A3A7B5; }
    #engagements .te-cartes { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    #engagements .te-c { padding: 22px; border-radius: 6px; background: #1A1C22; box-shadow: 0 0 0 1px #23252D; }
    #engagements .te-c h3 { margin: 0 0 12px; font-size: 13px; font-weight: 500; text-transform: uppercase; }
    #engagements .te-c p { margin: 0; font-size: 12px; line-height: 1.6; color: #A3A7B5; }
    @media (max-width: 767px) { #engagements .te-g, #engagements .te-cartes { grid-template-columns: 1fr; } }
  </style>
  <div class="wrap"><div class="te-g">
    <h2 id="engagements-h">Ce que les autres ne font pas</h2>
    <p class="te-intro">On règle chaque problème avec soin et on rend la réparation simple : un devis clair, un délai tenu, une voiture rendue propre.</p>
    <div class="te-cartes">
      <div class="te-c"><h3>Teinte exacte</h3><p>La couleur est mesurée au spectrophotomètre : aucune différence avec la peinture d'origine.</p></div>
      <div class="te-c"><h3>Clients fidèles</h3><p>Des dizaines de passionnés nous confient leur voiture depuis des années.</p></div>
      <div class="te-c"><h3>Selon ton budget</h3><p>Plusieurs devis pour la même réparation, avec le pour et le contre de chacun.</p></div>
      <div class="te-c"><h3>Réparation invisible</h3><p>Une fois repeinte, personne ne voit où la voiture a été touchée.</p></div>
    </div>
  </div></div>
</section>` },
  { id: "appel", html: `<section id="appel" class="section te-appel" aria-labelledby="appel-h">
  <style>
    #appel { padding-block: clamp(72px, 9vw, 120px) 0 !important; text-align: center; background: radial-gradient(60% 50% at 50% 70%, #1F2E66, #121317 70%); }
    #appel h2 { margin: 0 auto; max-width: 18ch; font-weight: 400; font-size: clamp(28px, 2.8vw, 42px); line-height: 1.12; text-transform: uppercase; }
    #appel p { margin: 14px auto 0; max-width: 300px; font-size: 12.5px; color: #C9CCD8; }
    #appel a { display: inline-block; margin-top: 18px; padding: 8px 22px; border-radius: 999px; background: #3A5BD9; color: #fff; font-size: 12.5px; text-decoration: none; }
    #appel img { display: block; width: min(100%, 1000px); margin: 32px auto 0; aspect-ratio: 2.35; object-fit: cover; -webkit-mask-image: linear-gradient(180deg, #000 70%, transparent); mask-image: linear-gradient(180deg, #000 70%, transparent); }
  </style>
  <h2 id="appel-h">Démarque-toi avec Teinte</h2>
  <p>Laisse ta demande, on te rappelle pour en parler.</p>
  <a href="#contact">Être rappelé</a>
  <img src="IMG_7" alt="Trois voitures de face, une bleue entre deux noires">
</section>` },
  { id: "contact", html: `<footer class="footer closing" id="contact" aria-label="Pied de page">
  <style>
    #contact { padding-block: 24px 24px !important; }
    #contact .te-pied { display: grid; grid-template-columns: 2fr 1fr 1.2fr; gap: 24px; max-width: 1000px; margin-inline: auto; padding: 28px; border-radius: 6px; background: #1A1C22; box-shadow: 0 0 0 1px #23252D; font-size: 12px; color: #A3A7B5; }
    #contact .te-pied b { display: block; color: #fff; font-size: 13px; font-weight: 600; text-transform: uppercase; margin-bottom: 40px; }
    #contact ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; } #contact a { color: #A3A7B5; text-decoration: none; }
    @media (max-width: 767px) { #contact .te-pied { grid-template-columns: 1fr; } }
  </style>
  <div class="wrap"><div class="te-pied">
    <div><b>Teinte</b>© Teinte · modèle de la bibliothèque Bingoo!</div>
    <ul><li><a href="#hero">Accueil</a></li><li><a href="#types">Prestations</a></li><li><a href="#atelier">Atelier</a></li><li><a href="#engagements">Engagements</a></li></ul>
    <ul><li style="color:#fff">Nous joindre</li><li>Du lundi au samedi, 8 h - 19 h</li><li>Sur rendez-vous</li></ul>
  </div></div>
</footer>` },
];
export const journal = ["Plan : hero, atelier, types, engagements, appel, contact"];
