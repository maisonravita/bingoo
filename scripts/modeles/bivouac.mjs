// Modèle « Bivouac » (28 nov. 2026) : design repris d'une maquette de marque outdoor (grand paysage, titre très large et
// fin en capitales, surtitre et chevron, nid d'abeilles de six hexagones photo avec bouton contour, mission sur fond de
// montagnes, pied de page en colonnes). Couleurs changées (neige et bleu glacier au lieu du sable du désert), textes et
// photos originaux, sans logo.
export const nom = "Bivouac";
export const slugBase = "bivouac";
export const metier = "Marque d'équipement outdoor";
export const design = {
  mode: "light", style: "Glacier", source: "bibliotheque",
  polices: { titres: "Michroma", texte: "Inter" },
  couleurs: { background: "#DDE4EA", foreground: "#1E2A33", primary: "#1E2A33", on_primary: "#FFFFFF", card: "#EEF2F5", muted: "#E6ECF0", border: "#C7D2DA", muted_foreground: "#5D6C78", accent: "#3F7CA8", secondary: "#E6ECF0", ring: "#1E2A33", on_accent: "#FFFFFF" },
};
const P = "photorealistic, cold blue winter tones, no logo, no text, no brand";
export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1920, height: 1152 }, prompt: `Wide landscape photograph of a vast snowy high plateau with a single winding track of footprints and ski marks leading toward two sharp snowy mountain peaks under a deep blue sky with thin clouds, crisp light, the upper third mostly sky, ${P}.` },
  { id: "IMG_2", pour: "hexa", taille: "square_hd", prompt: `Photograph of two hikers with backpacks and helmets walking side by side toward the camera on a snowy ridge, cold light, faces partly hidden by goggles, ${P}.` },
  { id: "IMG_3", pour: "hexa", taille: "square_hd", prompt: `Close-up photograph of a grey waterproof roll-top backpack with a small hexagon pattern detail, lying on snow, ${P}.` },
  { id: "IMG_4", pour: "hexa", taille: "square_hd", prompt: `Photograph of layered blue icy mountain ridges at dawn with mist in the valleys, ${P}.` },
  { id: "IMG_5", pour: "hexa", taille: "square_hd", prompt: `Photograph of a lone hiker with a yellow backpack seen from behind, walking on a rocky snowy plateau under a cloudy sky, ${P}.` },
  { id: "IMG_6", pour: "hexa", taille: "square_hd", prompt: `Photograph of a hiker seen from behind walking on a long straight snowy mountain road toward distant peaks, ${P}.` },
  { id: "IMG_7", pour: "hexa", taille: "square_hd", prompt: `Photograph of a long empty straight road through a snowy plain toward mountains under a deep blue sky, ${P}.` },
  { id: "IMG_8", pour: "mission", taille: { width: 1920, height: 960 }, prompt: `Wide photograph of misty blue mountain ranges fading in layers into the distance at dusk, soft haze, calm, ${P}.` },
];
export const nav = [{ mot: "Innovation", ancre: "hexa" }, { mot: "Inspiration", ancre: "mission" }, { mot: "Boutique", ancre: "hexa" }];
const hexa = (img, t, s = "") => `<a class="bv-h" href="#mission" style="${s}"><img src="${img}" alt=""><span><b>${t}</b><i>EN SAVOIR PLUS</i></span></a>`;
const LOGO = `<svg viewBox="0 0 40 28" width="44" aria-hidden="true"><path d="M20 4 4 24h32Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M20 4v20M13 15l7 9 7-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    header.nav { background: transparent !important; border: 0 !important; }
    header.nav .nav__bar { max-width: none !important; padding: 16px 30px !important; }
    header.nav .nav__logo { display: flex; flex-direction: column; align-items: center; gap: 2px; color: #fff !important; font-family: Michroma, sans-serif; font-size: 9px; letter-spacing: .1em; }
    header.nav .nav__links { justify-content: center; gap: 40px !important; } header.nav .nav__link { color: #fff !important; font-family: Michroma, sans-serif; font-size: 9px; letter-spacing: .14em; }
    header.nav .bv-ic { display: flex; gap: 4px; } header.nav .bv-ic i { width: 18px; height: 18px; border-radius: 50%; border: 1px solid #fff; } header.nav .bv-pa { padding: 4px 8px; border: 1px solid #fff; color: #fff; font-family: Michroma, sans-serif; font-size: 8px; letter-spacing: .1em; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero">${LOGO}BIVOUAC</a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#hexa">INNOVATION ▾</a></div><div class="nav__item"><a class="nav__link" href="#mission">INSPIRATION ▾</a></div><div class="nav__item"><a class="nav__link" href="#hexa">BOUTIQUE ▾</a></div></nav>
    <div class="nav__actions"><span class="bv-ic" aria-hidden="true"><i></i><i></i><i></i></span><span class="bv-pa">0 € | 0 ARTICLE</span></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif bv-hero">
  <style>
    #hero { position: relative; overflow: hidden; isolation: isolate; min-height: 0 !important; height: clamp(560px, 62vw, 700px); padding: clamp(160px, 14vw, 190px) 24px 0 !important; text-align: center; color: #fff; background: #1E2A33 !important; }
    #hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
    #hero::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgb(10 25 40 / .35), transparent 40%, rgb(221 228 234 / .9) 100%); }
    #hero small { font-family: Michroma, sans-serif; font-size: 11px; letter-spacing: .2em; color: #fff; } #hero small b { font-weight: 400; opacity: .7; }
    #hero h1 { margin: 14px auto 0; font-family: Michroma, sans-serif; font-weight: 400; font-size: clamp(48px, 7.4vw, 108px); line-height: 1; letter-spacing: .06em; color: #fff; -webkit-text-stroke: 0; }
    #hero p { margin: 18px 0 0; font-family: Michroma, sans-serif; font-size: 11px; letter-spacing: .3em; color: #fff; } #hero .bv-ch { display: block; margin-top: 50px; font-size: 22px; transform: scaleX(1.6); }
  </style>
  <img src="IMG_1" alt="Un plateau enneigé et deux sommets">
  <small>À L'AVANT-GARDE <b>DE LA</b> RANDONNÉE</small>
  <h1>ULTRALÉGER</h1>
  <p>MONTAGNE</p>
  <span class="bv-ch" aria-hidden="true">⌄</span>
</section>` },
  { id: "hexa", html: `<section id="hexa" class="section hero-immersif bv-hexa" aria-label="Découvrir">
  <style>
    #hexa { padding: 30px 24px 80px !important; background: linear-gradient(180deg, #DDE4EA, #CFD9E1) !important; }
    #hexa .bv-g { position: relative; width: 560px; max-width: 100%; height: 760px; margin: 0 auto; }
    .bv-h { position: absolute; width: 190px; height: 218px; clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); overflow: hidden; display: block; text-decoration: none; }
    .bv-h img { width: 100%; height: 100%; object-fit: cover; filter: saturate(.85); transition: transform .6s; } .bv-h:hover img { transform: scale(1.06); }
    .bv-h span { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: rgb(20 35 48 / .25); padding-top: 50px; }
    .bv-h b { font-family: Michroma, sans-serif; font-weight: 400; font-size: 11.5px; letter-spacing: .14em; color: #fff; } .bv-h i { padding: 5px 12px; border: 1px solid #fff; font-style: normal; font-family: Michroma, sans-serif; font-size: 6.5px; letter-spacing: .12em; color: #fff; }
    @media (max-width: 599px) { #hexa .bv-g { transform: scale(.6); transform-origin: top center; height: 460px; } }
  </style>
  <div class="bv-g">
    ${hexa("IMG_2", "ATHLÈTES", "left:0;top:0")}${hexa("IMG_3", "BOUTIQUE", "left:185px;top:0")}${hexa("IMG_4", "AVENTURES", "left:370px;top:0")}
    ${hexa("IMG_5", "TECHNOLOGIE", "left:92px;top:160px")}${hexa("IMG_6", "BAGAGES", "left:277px;top:160px")}
    ${hexa("IMG_7", "LA MARQUE", "left:185px;top:320px")}
  </div>
</section>` },
  { id: "mission", html: `<footer class="footer closing hero-immersif bv-mission" id="mission" aria-labelledby="mission-h">
  <style>
    #mission { position: relative; overflow: hidden; isolation: isolate; padding: 70px 24px 22px !important; color: #fff; background: #3D4C58 !important; }
    #mission > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
    #mission::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgb(207 217 225) 0, rgb(207 217 225 / 0) 18%, rgb(30 42 51 / .3) 50%, rgb(30 42 51 / .85)); }
    #mission h2 { margin: 0; text-align: center; font-family: Michroma, sans-serif; font-weight: 400; font-size: 18px; letter-spacing: .14em; color: #fff; } #mission h2 b { font-weight: 400; opacity: .7; }
    #mission > p { margin: 14px auto 0; max-width: 620px; text-align: center; font-size: 11.5px; line-height: 1.8; color: rgb(255 255 255 / .85); }
    #mission .bv-col { display: grid; grid-template-columns: repeat(5, 1fr) 1.2fr; max-width: 1080px; margin: 30px auto 0; padding-top: 18px; border-top: 1px solid rgb(255 255 255 / .25); }
    #mission .bv-col div { padding: 0 16px; font-size: 9.5px; line-height: 2; color: rgb(255 255 255 / .85); } #mission .bv-col div + div { border-left: 1px solid rgb(255 255 255 / .2); } #mission .bv-col b { display: block; margin-bottom: 10px; font-family: Michroma, sans-serif; font-weight: 400; font-size: 8px; letter-spacing: .12em; color: #fff; }
    #mission .bv-lg { display: grid; place-items: center; color: #fff; font-family: Michroma, sans-serif; font-size: 10px; letter-spacing: .1em; }
    #mission .bv-pied { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; max-width: 1080px; margin: 24px auto 0; padding-top: 12px; border-top: 1px solid rgb(255 255 255 / .2); font-size: 9px; color: rgb(255 255 255 / .7); }
    @media (max-width: 767px) { #mission .bv-col { grid-template-columns: 1fr 1fr; gap: 16px; } #mission .bv-col div + div { border-left: 0; } }
  </style>
  <img src="IMG_8" alt="">
  <h2 id="mission-h">LA MISSION <b>BIVOUAC</b></h2>
  <p>Née d'une passion pour l'aventure, la marche et le grand air, Bivouac fait avancer l'équipement ultraléger et ouvre un nouveau terrain de jeu aux randonneurs passionnés.</p>
  <div class="bv-col">
    <div><b>INNOVATION</b>Concept<br>Technologie<br>La marque</div>
    <div><b>INSPIRATION</b>Athlètes<br>Aventures<br>Bagages</div>
    <div><b>BOUTIQUE</b>Sacs à dos<br>Sacoches<br>Sacs étanches<br>Accessoires</div>
    <div><b>CONTACT</b>Service client<br>Revendeurs<br>Partenariats<br>Recrutement</div>
    <div><b>RÉSEAUX</b>Instagram<br>Newsletter</div>
    <div class="bv-lg">${LOGO}<br>BIVOUAC</div>
  </div>
  <div class="bv-pied"><span>© Bivouac · modèle de la bibliothèque Bingoo!</span><span>Conditions · Confidentialité</span></div>
</footer>` },
];
export const journal = ["Plan : hero, hexa, mission"];
