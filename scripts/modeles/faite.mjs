// Modèle « Faîte » (28 nov. 2026) : recopie d'une maquette de studio d'architecture (photo plein cadre au crépuscule, grand
// titre sur deux lignes à gauche, deux boutons, phrase en bas à gauche et trois chiffres en bas à droite).
export const nom = "Faîte";
export const slugBase = "faite";
export const metier = "Studio d'architecture";
export const design = {
  mode: "dark", style: "Architecture sombre", source: "bibliotheque",
  polices: { titres: "Urbanist", texte: "Inter" },
  couleurs: { background: "#101211", foreground: "#F2F2EE", primary: "#F2F2EE", on_primary: "#101211", card: "#181B19", muted: "#181B19", border: "#2A2E2B", muted_foreground: "#9EA39F", accent: "#C9B48A", secondary: "#1E2220", ring: "#C9B48A", on_accent: "#101211" },
};
export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1920, height: 1088 }, prompt: "Architectural photograph at dusk: a dark charcoal modern house with a tall asymmetric sloped roof and floor-to-ceiling glass walls, warm interior lights glowing, a long dark stone path and low steps leading to it, a calm reflecting pool on the left, surrounded by pine trees and lush shrubs, moody overcast grey-green sky with soft clouds, the left half of the frame calm for text, cinematic, photorealistic, no people, no text." },
  { id: "IMG_2", pour: "projets", taille: "portrait_4_3", prompt: "Architectural photograph of a minimalist concrete and glass house on a hillside among pine trees, overcast soft light, muted green and grey tones, photorealistic, no people, no text." },
  { id: "IMG_3", pour: "projets", taille: "portrait_4_3", prompt: "Architectural photograph of a black timber cabin with a steep gable roof in a snowy forest at blue hour, warm windows, photorealistic, no people, no text." },
  { id: "IMG_4", pour: "projets", taille: "portrait_4_3", prompt: "Architectural photograph of a modern stone and wood house by a lake at sunset, large terrace, calm water reflection, photorealistic, no people, no text." },
  { id: "IMG_5", pour: "approche", taille: "landscape_16_9", prompt: "Interior architectural photograph of a calm modern living space with a double-height ceiling, dark wood, concrete floor, a large window framing a forest, soft daylight, minimalist furniture, photorealistic, no people, no text." },
];
export const nav = [{ mot: "Explorer", ancre: "projets" }, { mot: "Manifeste", ancre: "manifeste" }, { mot: "Approche", ancre: "approche" }, { mot: "Contact", ancre: "contact" }];

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    .nav .nav__logo { font-size: 22px; font-weight: 500; letter-spacing: -.01em; }
    .nav .nav__links { margin-left: auto; } .nav .nav__link { font-size: 12.5px; letter-spacing: .06em; text-transform: uppercase; }
    .nav .nav__actions { display: none; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero">Faîte</a>
    <nav class="nav__links" aria-label="Principal">
      <div class="nav__item"><a class="nav__link" href="#projets">Explorer</a></div>
      <div class="nav__item"><a class="nav__link" href="#manifeste">Manifeste</a></div>
      <div class="nav__item"><a class="nav__link" href="#approche">Approche</a></div>
      <div class="nav__item"><a class="nav__link" href="#contact">Contact</a></div>
    </nav>
    <div class="nav__actions"></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif fa-hero">
  <style>
    #hero { position: relative; min-height: clamp(640px, 100svh, 960px) !important; padding: 0 !important; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; isolation: isolate; color: #fff; background: #101211; }
    #hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; animation: compo-zoom 18s cubic-bezier(.2,.6,.2,1) both; }
    #hero::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, rgb(10 12 11 / .55), rgb(10 12 11 / .1) 55%, transparent), linear-gradient(180deg, transparent 55%, rgb(10 12 11 / .6)); }
    #hero .fa-haut, #hero .fa-bas { width: min(100%, 1240px); margin-inline: auto; padding-inline: var(--gut); }
    #hero .fa-haut { padding-top: calc(var(--nav) + clamp(64px, 14vh, 150px)); }
    #hero h1 { margin: 0; font-weight: 500; font-size: clamp(44px, 5.4vw, 84px); line-height: 1.02; letter-spacing: -.02em; color: #fff; }
    #hero h1 span { display: block; }
    #hero .fa-haut p { margin: 22px 0 0; max-width: 520px; font-size: 16px; line-height: 1.5; color: rgb(255 255 255 / .9); }
    #hero .fa-btns { display: flex; gap: 14px; margin-top: 30px; }
    #hero .fa-btns a { display: inline-flex; align-items: center; gap: 8px; padding: 13px 22px; border-radius: 10px; font-size: 15px; text-decoration: none; }
    #hero .fa-btns a:first-child { background: #fff; color: #101211; font-weight: 500; } #hero .fa-btns a + a { border: 1px solid rgb(255 255 255 / .6); color: #fff; }
    #hero .fa-bas { display: flex; justify-content: space-between; align-items: end; gap: 32px; padding-bottom: clamp(32px, 6vh, 56px); }
    #hero .fa-bas > p { margin: 0; max-width: 460px; font-size: 15px; line-height: 1.5; color: rgb(255 255 255 / .85); }
    #hero dl { display: flex; gap: clamp(28px, 4vw, 64px); margin: 0; text-align: center; }
    #hero dt { font-size: clamp(32px, 2.8vw, 44px); font-weight: 400; } #hero dd { margin: 6px 0 0; font-size: 14px; color: rgb(255 255 255 / .85); }
    #hero h1, #hero .fa-haut p, #hero .fa-btns, #hero .fa-bas { animation: compo-monte 1s cubic-bezier(.2,.7,.2,1) both; }
    #hero .fa-haut p { animation-delay: .1s; } #hero .fa-btns { animation-delay: .2s; } #hero .fa-bas { animation-delay: .3s; }
    @media (max-width: 899px) { #hero .fa-bas { flex-direction: column; align-items: start; } #hero dl { gap: 24px; text-align: left; } }
  </style>
  <img src="IMG_1" alt="Une maison sombre au toit en pente, éclairée de l'intérieur, au milieu des pins au crépuscule">
  <div class="fa-haut">
    <h1><span>Pensée pour le lieu.</span><span>Construite pour durer.</span></h1>
    <p>Nous dessinons des maisons qui comprennent leur terrain, servent la vie qu'on y mène et gardent une architecture claire.</p>
    <div class="fa-btns"><a href="#contact">Nous écrire →</a><a href="#projets">Voir les projets</a></div>
  </div>
  <div class="fa-bas">
    <p>Des lieux qui répondent à de vrais besoins et à de vrais paysages, pensés pour la clarté, l'usage et le long terme.</p>
    <dl><div><dt>10+</dt><dd>Années d'atelier</dd></div><div><dt>150+</dt><dd>Projets dessinés</dd></div><div><dt>200+</dt><dd>Idées en chantier</dd></div></dl>
  </div>
</section>` },
  { id: "manifeste", html: `<section id="manifeste" class="section fa-manifeste" aria-labelledby="manifeste-h">
  <style>
    #manifeste { padding-block: clamp(96px, 12vw, 168px) !important; }
    #manifeste .fa-m { display: grid; grid-template-columns: 1fr 3fr; gap: 32px; }
    #manifeste span { font-size: 12.5px; letter-spacing: .08em; text-transform: uppercase; color: #9EA39F; }
    #manifeste h2 { margin: 0; font-weight: 400; font-size: clamp(30px, 3.4vw, 52px); line-height: 1.15; letter-spacing: -.015em; color: #F2F2EE; }
    #manifeste h2 em { font-style: normal; color: #C9B48A; }
    @media (max-width: 767px) { #manifeste .fa-m { grid-template-columns: 1fr; } }
  </style>
  <div class="wrap"><div class="fa-m"><span>Manifeste</span><h2 id="manifeste-h">Une maison commence par une promenade sur le terrain : la pente, le vent, la lumière du soir. Nous dessinons ensuite <em>le moins possible</em>, et le mieux possible.</h2></div></div>
</section>` },
  { id: "projets", html: `<section id="projets" class="section fa-projets" aria-labelledby="projets-h">
  <style>
    #projets { padding-block: clamp(48px, 6vw, 96px) !important; }
    #projets .fa-tete { display: flex; justify-content: space-between; align-items: end; margin-bottom: 32px; }
    #projets h2 { margin: 0; font-weight: 500; font-size: clamp(30px, 3vw, 46px); letter-spacing: -.02em; }
    #projets .fa-tete a { font-size: 12.5px; letter-spacing: .06em; text-transform: uppercase; color: #F2F2EE; text-decoration: none; border-bottom: 1px solid #C9B48A; padding-bottom: 3px; }
    #projets .fa-grille { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
    #projets figure { margin: 0; } #projets img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block; border-radius: 4px; }
    #projets figcaption { display: flex; justify-content: space-between; margin-top: 14px; font-size: 15px; } #projets figcaption small { color: #9EA39F; font-size: 13px; }
    @media (max-width: 899px) { #projets .fa-grille { grid-template-columns: 1fr; } }
  </style>
  <div class="wrap">
    <div class="fa-tete"><h2 id="projets-h">Projets récents</h2><a href="#contact">Tous les projets</a></div>
    <div class="fa-grille">
      <figure><img src="IMG_2" alt="Une maison de béton et de verre sur une colline boisée"><figcaption>Maison des Pins <small>Haute-Savoie · 2025</small></figcaption></figure>
      <figure><img src="IMG_3" alt="Une cabane noire au toit pointu dans la forêt enneigée"><figcaption>Refuge Noir <small>Jura · 2024</small></figcaption></figure>
      <figure><img src="IMG_4" alt="Une maison de pierre et de bois au bord d'un lac"><figcaption>Maison du Lac <small>Savoie · 2024</small></figcaption></figure>
    </div>
  </div>
</section>` },
  { id: "approche", html: `<section id="approche" class="section fa-approche" aria-labelledby="approche-h">
  <style>
    #approche { padding-block: clamp(64px, 8vw, 128px) !important; }
    #approche img { width: 100%; aspect-ratio: 2.2; object-fit: cover; display: block; border-radius: 4px; }
    #approche h2 { margin: 48px 0 32px; font-weight: 500; font-size: clamp(30px, 3vw, 46px); letter-spacing: -.02em; }
    #approche ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; counter-reset: e; }
    #approche li { counter-increment: e; padding-top: 18px; border-top: 1px solid #2A2E2B; }
    #approche li::before { content: counter(e, decimal-leading-zero); color: #C9B48A; font-size: 13px; }
    #approche h3 { margin: 12px 0 8px; font-size: 18px; font-weight: 500; } #approche li p { margin: 0; color: #9EA39F; font-size: 14px; line-height: 1.6; }
    @media (max-width: 899px) { #approche ol { grid-template-columns: 1fr 1fr; } }
  </style>
  <div class="wrap">
    <img src="IMG_5" alt="Un séjour en double hauteur ouvert sur la forêt">
    <h2 id="approche-h">Notre approche</h2>
    <ol>
      <li><h3>Le terrain</h3><p>Une journée sur place pour lire la pente, le soleil et les vues.</p></li>
      <li><h3>Le programme</h3><p>Vos usages, votre budget, vos envies, écrits noir sur blanc.</p></li>
      <li><h3>Le dessin</h3><p>Esquisses, maquettes et plans, jusqu'au permis de construire.</p></li>
      <li><h3>Le chantier</h3><p>Le suivi des artisans, chaque semaine, jusqu'aux clés.</p></li>
    </ol>
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding-block: clamp(96px, 12vw, 160px) 28px !important; border-top: 1px solid #2A2E2B; }
    #contact h2 { margin: 0; max-width: 16ch; font-weight: 500; font-size: clamp(38px, 4.6vw, 72px); line-height: 1.02; letter-spacing: -.02em; }
    #contact .fa-btn { display: inline-flex; margin-top: 32px; padding: 14px 24px; border-radius: 10px; background: #fff; color: #101211; font-size: 15px; text-decoration: none; }
    #contact .fa-bas { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; margin-top: clamp(72px, 9vw, 120px); padding-top: 20px; border-top: 1px solid #2A2E2B; font-size: 12.5px; color: #9EA39F; text-transform: uppercase; letter-spacing: .06em; }
    #contact .fa-bas nav { display: flex; gap: 22px; } #contact .fa-bas a { color: #9EA39F; text-decoration: none; }
  </style>
  <div class="wrap">
    <h2 id="contact-h">Parlons de votre terrain.</h2>
    <p style="margin:0"><a class="fa-btn" href="#hero">Prendre rendez-vous →</a></p>
    <div class="fa-bas"><span>© Faîte · modèle de la bibliothèque Bingoo!</span><nav aria-label="Pied de page"><a href="#projets">Projets</a><a href="#approche">Approche</a><a href="#manifeste">Manifeste</a></nav></div>
  </div>
</footer>` },
];
export const journal = ["Plan : hero, manifeste, projets, approche, contact"];
