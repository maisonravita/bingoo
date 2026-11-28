// Modèle « Escale » (28 nov. 2026) : recopie d'une maquette de constructeur de véhicules (bandeau d'annonce, logo centré,
// grande photo avec titre centré et flèches, puis nom du modèle en lettres géantes derrière le véhicule de profil,
// onglets et cartes). Nom, textes et images originaux : véhicule inventé, sans logo ni marque.
export const nom = "Escale";
export const slugBase = "escale";
export const metier = "Constructeur de vans aménagés électriques";
export const design = {
  mode: "light", style: "Produit clair", source: "bibliotheque",
  polices: { titres: "Inter Tight", texte: "Inter" },
  couleurs: { background: "#F3F2F0", foreground: "#111111", primary: "#111111", on_primary: "#FFFFFF", card: "#FFFFFF", muted: "#E9E7E3", border: "#DEDCD7", muted_foreground: "#6E6C68", accent: "#F5B81B", secondary: "#E9E7E3", ring: "#111111", on_accent: "#111111" },
};
const SANS = "no logo, no badge, no brand, no text, no licence plate";
export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1920, height: 960 }, prompt: `Photograph of a modern boxy electric camper van painted steel blue with black wheels and two surfboards on the roof rack, parked on a coastal road by a wooden fence, the ocean and a far headland behind, clear blue sky, bright summer sunlight, side three-quarter view, the upper third of the image calm sky, photorealistic automotive advertising, ${SANS}.` },
  { id: "IMG_2", pour: "modele", detourer: true, taille: { width: 1920, height: 960 }, prompt: `Studio photograph of a modern boxy electric camper van in dark graphite grey seen exactly from the side, black wheels, isolated on a perfectly plain very light warm grey background (#F3F2F0) with a soft contact shadow under the wheels, nothing else, photorealistic, ${SANS}.` },
  { id: "IMG_3", pour: "aventure", taille: "landscape_4_3", prompt: `Photograph of the interior of a camper van: a cosy bed with linen sheets by a big side window opening onto a pine forest and a lake, warm morning light, wood panels, photorealistic, ${SANS}.` },
  { id: "IMG_4", pour: "aventure", taille: "landscape_4_3", prompt: `Photograph of a steel blue electric camper van driving on a gravel mountain road with dust, alpine peaks behind, dynamic, photorealistic, ${SANS}.` },
  { id: "IMG_5", pour: "aventure", taille: "landscape_4_3", prompt: `Photograph of the dashboard of a modern electric van seen from the driver seat, a simple screen and a minimal wooden dashboard, a winding coastal road through the windshield, photorealistic, ${SANS}.` },
];
export const nav = [{ mot: "E1", ancre: "modele" }, { mot: "E2", ancre: "modele" }, { mot: "Aventure", ancre: "aventure" }, { mot: "Contact", ancre: "contact" }];

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    .nav { top: 30px !important; }
    .nav .nav__bar { display: grid !important; grid-template-columns: 1fr auto 1fr; }
    .nav .nav__logo { grid-column: 2; grid-row: 1; font-size: 15px; font-weight: 600; letter-spacing: .32em; text-transform: uppercase; }
    .nav .nav__links { grid-column: 1; grid-row: 1; justify-self: start; } .nav .nav__link { font-size: 13px; }
    .nav .nav__actions { grid-column: 3; grid-row: 1; justify-self: end; display: flex; align-items: center; gap: 18px; }
    .nav .es-essai { border-radius: 999px !important; padding: 8px 16px !important; background: #F5B81B !important; border-color: #F5B81B !important; color: #111 !important; font-size: 12.5px; font-weight: 600; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero">Escale</a>
    <nav class="nav__links" aria-label="Principal">
      <div class="nav__item"><a class="nav__link" href="#modele">E1</a></div>
      <div class="nav__item"><a class="nav__link" href="#modele">E2</a></div>
      <div class="nav__item"><a class="nav__link" href="#aventure">Aventure</a></div>
      <div class="nav__item"><a class="nav__link" href="#contact">Pros</a></div>
    </nav>
    <div class="nav__actions"><a class="btn es-essai" href="#contact">Essai</a><a class="nav__link" href="#contact">Connexion</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif es-hero">
  <style>
    #hero { position: relative; min-height: clamp(560px, 74vh, 760px) !important; padding: 0 !important; overflow: hidden; isolation: isolate; color: #fff; text-align: center; }
    #hero .es-annonce { position: absolute; left: 0; right: 0; top: 0; z-index: 3; padding: 8px 16px; background: #E8E2D2; color: #111; font-size: 11.5px; }
    #hero .es-annonce a { color: #111; }
    #hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
    #hero::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgb(0 0 0 / .25), transparent 35%, transparent 60%, rgb(0 0 0 / .35)); }
    #hero h1 { margin: 0; padding-top: calc(var(--nav) + 48px); text-shadow: 0 2px 18px rgb(0 0 0 / .45); font-weight: 500; font-size: clamp(30px, 3vw, 44px); line-height: 1.12; letter-spacing: -.01em; color: #fff; }
    #hero .es-bas { position: absolute; left: 0; right: 0; bottom: 28px; }
    #hero .es-bas p { text-shadow: 0 1px 10px rgb(0 0 0 / .5); margin: 0 auto; max-width: 300px; font-size: 13px; line-height: 1.45; }
    #hero .es-btns { display: flex; justify-content: center; gap: 10px; margin-top: 16px; }
    #hero .es-btns a { min-width: 128px; padding: 11px 18px; border-radius: 999px; font-size: 12.5px; font-weight: 600; text-decoration: none; }
    #hero .es-btns a:first-child { background: #fff; color: #111; } #hero .es-btns a + a { border: 1px solid rgb(255 255 255 / .7); color: #fff; }
    #hero .es-points { display: inline-flex; gap: 5px; margin-top: 16px; padding: 7px 10px; border-radius: 999px; background: #fff; }
    #hero .es-points i { width: 6px; height: 6px; border-radius: 99px; background: #C9C6BF; } #hero .es-points i:first-child { width: 18px; background: #111; }
    #hero .es-fl { position: absolute; top: 50%; width: 34px; height: 34px; border-radius: 50%; background: #fff; color: #111; display: grid; place-items: center; font-size: 15px; }
    #hero .es-fl:first-of-type { left: 24px; } #hero .es-fl:last-of-type { right: 24px; }
  </style>
  <p class="es-annonce">Envie de voir ce qu'on prépare ? <a href="#contact">Reçois les nouvelles d'Escale.</a></p>
  <img src="IMG_1" alt="Un van électrique bleu avec deux planches de surf, garé face à l'océan">
  <h1>Ton été commence<br>prêt pour l'aventure</h1>
  <span class="es-fl" aria-hidden="true">‹</span><span class="es-fl" aria-hidden="true">›</span>
  <div class="es-bas">
    <p>La première mensualité offerte avec l'offre Grand Large, jusqu'au 31 août.</p>
    <div class="es-btns"><a href="#modele">Découvrir l'E1</a><a href="#modele">Découvrir l'E2</a></div>
    <span class="es-points" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
  </div>
</section>` },
  { id: "modele", html: `<section id="modele" class="section es-modele" aria-labelledby="modele-h">
  <style>
    #modele { position: relative; padding-block: clamp(48px, 6vw, 88px) clamp(56px, 7vw, 104px) !important; text-align: center; overflow: hidden; }
    #modele .es-scene { position: relative; max-width: 1100px; margin-inline: auto; }
    #modele h2 { margin: 0; font-weight: 600; font-size: clamp(140px, 19vw, 300px); line-height: .8; letter-spacing: -.05em; color: #111; }
    #modele img { position: relative; z-index: 1; display: block; width: min(100%, 980px); margin: -11vw auto 0; height: auto; filter: drop-shadow(0 28px 22px rgb(0 0 0 / .18)); }
    #modele .es-ligne { margin: 4px 0 0; font-size: 17px; font-weight: 500; }
    #modele .es-prix { margin: 8px 0 0; font-size: 12.5px; color: #4A4845; }
    #modele .es-btns { display: flex; justify-content: center; gap: 8px; margin-top: 18px; }
    #modele .es-btns a { min-width: 128px; padding: 11px 18px; border-radius: 999px; font-size: 13px; font-weight: 600; text-decoration: none; }
    #modele .es-btns a:first-child { background: #111; color: #fff; } #modele .es-btns a + a { background: #fff; color: #111; }
  </style>
  <div class="es-scene">
    <h2 id="modele-h">E1</h2>
    <img src="IMG_2" alt="Le van électrique E1 de profil, gris graphite">
  </div>
  <p class="es-ligne">Électrique, 4 couchages, pensé pour les longs week-ends.</p>
  <p class="es-prix">À partir de 54 900 € · ou 690 € par mois · jusqu'à 520 km d'autonomie</p>
  <div class="es-btns"><a href="#aventure">Explorer</a><a href="#contact">Réserver</a></div>
</section>` },
  { id: "aventure", html: `<section id="aventure" class="section es-aventure" aria-labelledby="aventure-h">
  <style>
    #aventure { padding-block: clamp(72px, 9vw, 128px) !important; text-align: center; overflow: hidden; }
    #aventure h2 { margin: 0 auto; max-width: 14ch; font-weight: 500; font-size: clamp(32px, 3.4vw, 52px); line-height: 1.08; letter-spacing: -.02em; }
    #aventure .es-onglets { width: auto !important; max-width: max-content; margin-inline: auto !important; display: flex; gap: 4px; margin-top: 24px; padding: 4px; border-radius: 999px; background: #fff; font-size: 12.5px; }
    #aventure .es-onglets span { padding: 8px 18px; border-radius: 999px; } #aventure .es-onglets span.on { background: #111; color: #fff; }
    #aventure .es-rang { display: grid; grid-template-columns: .9fr 1.3fr .9fr; gap: 16px; margin: 40px -6vw 0; }
    #aventure figure { margin: 0; text-align: left; } #aventure img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; border-radius: 14px; }
    #aventure figcaption { margin-top: 12px; font-size: 14px; } #aventure figcaption small { display: block; color: #6E6C68; font-size: 12.5px; margin-top: 2px; }
    @media (max-width: 899px) { #aventure .es-rang { grid-template-columns: 1fr; margin-inline: 0; } }
  </style>
  <div class="wrap">
    <h2 id="aventure-h">Des vans électriques pensés pour l'aventure</h2>
    <div class="es-onglets" aria-hidden="true"><span>Technologie</span><span class="on">Performance</span><span>Design</span></div>
    <div class="es-rang">
      <figure><img src="IMG_3" alt="Le lit du van ouvert sur un lac et une forêt"><figcaption>Dormir au bord de l'eau<small>Lit double, chauffage silencieux</small></figcaption></figure>
      <figure><img src="IMG_4" alt="Le van bleu sur une piste de montagne"><figcaption>Toutes les routes<small>Transmission intégrale, garde au sol relevée</small></figcaption></figure>
      <figure><img src="IMG_5" alt="Le tableau de bord du van face à une route côtière"><figcaption>Un poste de conduite simple<small>Un écran, l'essentiel, rien de plus</small></figcaption></figure>
    </div>
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing" id="contact" aria-label="Pied de page">
  <style>
    #contact { padding-block: clamp(56px, 7vw, 96px) 28px !important; background: #111 !important; color: #fff; }
    #contact .es-g { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 24px; }
    #contact .es-logo { font-size: 15px; font-weight: 600; letter-spacing: .32em; text-transform: uppercase; }
    #contact p { margin: 12px 0 0; max-width: 300px; font-size: 13px; line-height: 1.6; color: #A8A6A1; }
    #contact h3 { margin: 0 0 12px; font-size: 13px; font-weight: 600; } #contact ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; font-size: 13px; } #contact a { color: #A8A6A1; text-decoration: none; }
    #contact .es-copy { margin-top: 48px; padding-top: 18px; border-top: 1px solid #2A2A2A; font-size: 12px; color: #8A8884; }
    @media (max-width: 767px) { #contact .es-g { grid-template-columns: 1fr 1fr; } }
  </style>
  <div class="wrap">
    <div class="es-g"><div><span class="es-logo">Escale</span><p>Des vans électriques aménagés, conçus pour partir loin sans faire de bruit.</p></div><div><h3>Véhicules</h3><ul><li><a href="#modele">E1</a></li><li><a href="#modele">E2</a></li></ul></div><div><h3>Découvrir</h3><ul><li><a href="#aventure">Aventure</a></li><li><a href="#contact">Essai</a></li></ul></div><div><h3>Aide</h3><ul><li><a href="#contact">Nous écrire</a></li><li><a href="#contact">Mentions légales</a></li></ul></div></div>
    <p class="es-copy">© Escale · modèle de la bibliothèque Bingoo!</p>
  </div>
</footer>` },
];
export const journal = ["Plan : hero, modele, aventure, contact"];
