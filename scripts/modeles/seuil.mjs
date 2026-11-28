// Modèle « Seuil » (28 nov. 2026) : recopie d'une maquette d'agence immobilière (grande carte photo arrondie, titre avec
// un mot en italique, barre de recherche en 4 champs, chiffres en italique, grille de types de biens, sélection).
// Nom, textes et images originaux, aucune marque.
export const nom = "Seuil";
export const slugBase = "seuil";
export const metier = "Agence immobilière : achat, vente et location";
export const design = {
  mode: "light", style: "Éditorial bleu", source: "bibliotheque",
  polices: { titres: "Manrope", texte: "Manrope" },
  couleurs: { background: "#F4F4F4", foreground: "#141A4A", primary: "#1F2A9C", on_primary: "#FFFFFF", card: "#FFFFFF", muted: "#ECECEC", border: "#E2E2E2", muted_foreground: "#6B6F86", accent: "#1F2A9C", secondary: "#ECECEC", ring: "#1F2A9C", on_accent: "#FFFFFF" },
};
const SERIF = '"Instrument Serif", "Playfair Display", Georgia, serif';
const FONT = `@import url("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap");`;
const FL = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICO = {
  lieu: '<svg viewBox="0 0 16 16" fill="none"><path d="M8 14s4.5-4.2 4.5-7.5a4.5 4.5 0 0 0-9 0C3.5 9.8 8 14 8 14Z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="6.5" r="1.6" stroke="currentColor" stroke-width="1.3"/></svg>',
  prix: '<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M9.8 5.8C9.4 5.3 8.8 5 8 5c-1.3 0-2.2 1.2-2.2 3s.9 3 2.2 3c.8 0 1.4-.3 1.8-.8M5 7.4h3.4M5 8.8h3.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
  lit: '<svg viewBox="0 0 16 16" fill="none"><path d="M2 12V5M2 9h12v3M14 9V7.5A1.5 1.5 0 0 0 12.5 6H7v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  maison: '<svg viewBox="0 0 16 16" fill="none"><path d="M2.5 7 8 2.5 13.5 7v6.5h-11V7Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  loupe: '<svg viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.3" stroke="currentColor" stroke-width="1.6"/><path d="m10.3 10.3 3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
};
const LOGO = '<svg viewBox="0 0 18 18" width="16" height="16" fill="none" aria-hidden="true"><path d="M3 2v14h12" stroke="currentColor" stroke-width="2.4"/><path d="M8 2h4v9" stroke="currentColor" stroke-width="2.4"/></svg>';

export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1920, height: 1152 }, prompt: "Architectural photograph of a modern two-storey villa with white concrete volumes, warm wood cladding and large glass windows, a long turquoise swimming pool with a wooden deck and lounge chairs in front, a green lawn and lush trees around, warm golden late afternoon sunlight, bright blue sky with soft clouds, wide angle from the garden, photorealistic, premium real estate photography, no people, no text." },
  { id: "IMG_2", pour: "types", taille: "portrait_4_3", prompt: "Vertical architectural photograph of a modern family house with white concrete and wood facade, a small pool and a green garden in front, clear blue sky, bright daylight, photorealistic real estate photography, no people, no text." },
  { id: "IMG_3", pour: "types", taille: "landscape_16_9", prompt: "Interior photograph of a bright modern apartment living room with a large light grey sofa, wooden floor, big windows with city view, indoor plants and wooden shelves, soft daylight, photorealistic real estate photography, no people, no text." },
  { id: "IMG_4", pour: "types", taille: "landscape_4_3", prompt: "Photograph of a luxury rooftop terrace with an infinity pool, wooden deck and white lounge chairs, modern glass building, city skyline and blue sky in the background, bright daylight, photorealistic, no people, no text." },
  { id: "IMG_5", pour: "types", taille: "landscape_4_3", prompt: "Photograph of a modern mixed-use commercial building with stacked terraces, glass facades, concrete and wood, trees and plants on the balconies, blue sky, bright daylight, photorealistic architecture photography, no people, no text, no logo." },
  { id: "IMG_6", pour: "selection", taille: "landscape_4_3", prompt: "Photograph of a contemporary white house with flat roofs and large windows at dusk, warm interior lights, a manicured lawn, blue hour sky, photorealistic real estate photography, no people, no text." },
  { id: "IMG_7", pour: "selection", taille: "landscape_4_3", prompt: "Photograph of a bright Parisian-style apartment with a herringbone wooden floor, white mouldings, tall windows and a balcony, soft daylight, photorealistic real estate photography, no people, no text." },
  { id: "IMG_8", pour: "selection", taille: "landscape_4_3", prompt: "Photograph of a renovated stone house with a garden and an olive tree in Provence, blue shutters, warm sunlight, blue sky, photorealistic real estate photography, no people, no text." },
];
export const nav = [{ mot: "Accueil", ancre: "hero" }, { mot: "L'agence", ancre: "agence" }, { mot: "Biens", ancre: "types" }, { mot: "Sélection", ancre: "selection" }, { mot: "Contact", ancre: "contact" }];
const champ = (ico, l, v) => `<div class="se-champ"><i>${ico}</i><span><small>${l}</small>${v}</span></div>`;
const bien = (img, alt, prix, titre, infos) => `<article class="se-bien"><div class="se-photo"><img src="${img}" alt="${alt}"><span class="se-rond">${FL}</span></div><div class="se-corps"><b>${prix}</b><h3>${titre}</h3><p>${infos}</p></div></article>`;

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    .nav .se-logo { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; letter-spacing: .14em; font-size: 14px; }
    .nav .nav__link { font-size: 13px; }
    .nav .se-visite { border-radius: 999px !important; padding: 10px 18px !important; font-size: 13px; background: #1F2A9C !important; border-color: #1F2A9C !important; color: #fff !important; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo se-logo" href="#hero">${LOGO}SEUIL</a>
    <nav class="nav__links" aria-label="Principal">
      <div class="nav__item"><a class="nav__link" href="#hero">Accueil</a></div>
      <div class="nav__item"><a class="nav__link" href="#agence">L'agence</a></div>
      <div class="nav__item"><a class="nav__link" href="#types">Biens</a></div>
      <div class="nav__item"><a class="nav__link" href="#selection">Sélection</a></div>
      <div class="nav__item"><a class="nav__link" href="#contact">Contact</a></div>
    </nav>
    <div class="nav__actions"><a class="btn se-visite" href="#contact">Planifier une visite →</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif se-hero">
  <style>
    ${FONT}
    #hero { position: relative; padding: 12px !important; min-height: 0 !important; background: var(--bg); }
    #hero .se-carte { position: relative; overflow: hidden; isolation: isolate; border-radius: 26px; min-height: clamp(640px, 92vh, 880px); display: flex; flex-direction: column; justify-content: flex-end; padding: 0 clamp(24px, 10vw, 160px) 28px; color: #fff; }
    #hero .se-carte > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
    #hero .se-carte::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgb(10 16 50 / .28), transparent 25%, transparent 45%, rgb(10 16 50 / .45) 100%); }
    #hero h1 { margin: 0; max-width: 11ch; font-weight: 500; font-size: clamp(44px, 5vw, 76px); line-height: 1; letter-spacing: -.035em; }
    #hero h1 em { font-family: ${SERIF}; font-style: italic; font-weight: 400; letter-spacing: -.01em; }
    #hero .se-chapo { margin: 18px 0 0; max-width: 470px; font-size: 14.5px; line-height: 1.55; color: rgb(255 255 255 / .92); }
    #hero .se-ligne { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-top: 26px; }
    #hero .se-btns { display: flex; gap: 10px; }
    #hero .se-btns a { padding: 12px 18px; border-radius: 999px; font-size: 13px; font-weight: 600; text-decoration: none; color: #fff; }
    #hero .se-btns a:first-child { background: #1F2A9C; } #hero .se-btns a + a { border: 1px solid rgb(255 255 255 / .55); backdrop-filter: blur(6px); background: rgb(255 255 255 / .08); }
    #hero .se-familles { display: inline-flex; align-items: center; gap: 10px; padding: 7px 14px 7px 7px; border-radius: 999px; background: rgb(255 255 255 / .16); border: 1px solid rgb(255 255 255 / .3); backdrop-filter: blur(10px); font-size: 11px; line-height: 1.2; }
    #hero .se-familles i { display: inline-flex; } #hero .se-familles i b { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #fff; margin-left: -9px; background: radial-gradient(circle at 40% 35%, var(--a), var(--b)); }
    #hero .se-familles i b:first-child { margin-left: 0; } #hero .se-familles strong { display: block; font-size: 14px; }
    #hero .se-recherche { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)) auto; align-items: center; gap: 0; margin-top: 22px; padding: 6px; border-radius: 999px; background: #fff; color: #141A4A; box-shadow: 0 20px 50px -25px rgb(0 0 0 / .45); }
    #hero .se-champ { display: flex; align-items: center; gap: 12px; padding: 8px 18px; border-right: 1px solid #ECECEC; }
    #hero .se-champ i { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #F1F1F4; color: #1F2A9C; flex: none; }
    #hero .se-champ i svg { width: 15px; height: 15px; }
    #hero .se-champ span { font-size: 12.5px; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #hero .se-champ small { display: block; font-size: 10.5px; color: #8B8FA6; }
    #hero .se-chercher { display: inline-flex; align-items: center; gap: 8px; padding: 13px 22px; border-radius: 999px; background: #1F2A9C; color: #fff; font-size: 13px; font-weight: 600; text-decoration: none; }
    #hero .se-chercher svg { width: 14px; height: 14px; }
    @media (max-width: 899px) { #hero .se-recherche { grid-template-columns: 1fr; border-radius: 22px; } #hero .se-champ { border-right: 0; border-bottom: 1px solid #ECECEC; } #hero .se-chercher { justify-content: center; } #hero .se-carte { padding-inline: 20px; } }
  </style>
  <div class="se-carte">
    <img src="IMG_1" alt="Une villa moderne avec une piscine et un jardin au soleil">
    <h1>Le premier pas vers ton <em>chez-toi.</em></h1>
    <p class="se-chapo">Une sélection de biens à acheter, vendre ou louer, avec un conseiller proche et transparent à chaque étape de ton projet.</p>
    <div class="se-ligne">
      <div class="se-btns"><a href="#selection">Voir les biens →</a><a href="#contact">Parler à un conseiller</a></div>
      <span class="se-familles"><i aria-hidden="true"><b style="--a:#F6D1B5;--b:#B7764A"></b><b style="--a:#D8E2F7;--b:#6F86C9"></b><b style="--a:#F2E2C2;--b:#A9864E"></b></i><span><strong>+2 600</strong>familles accompagnées</span></span>
    </div>
    <div class="se-recherche" role="search" aria-label="Rechercher un bien">
      ${champ(ICO.lieu, "Lieu", "Quartier ou ville")}${champ(ICO.prix, "Budget", "300 000 € à 900 000 €")}${champ(ICO.lit, "Chambres", "2 à 4")}${champ(ICO.maison, "Type de bien", "Maisons, appartements…")}
      <a class="se-chercher" href="#selection">${ICO.loupe}Rechercher</a>
    </div>
  </div>
</section>` },
  { id: "agence", html: `<section id="agence" class="section se-agence" aria-labelledby="agence-h">
  <style>
    ${FONT}
    #agence { padding-block: clamp(80px, 10vw, 140px) !important; }
    #agence .se-grille { display: grid; grid-template-columns: 1fr 2.2fr; gap: 32px; max-width: 1000px; margin-inline: auto; }
    #agence .se-etiq { align-self: start; margin-top: 10px; display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: #1F2A9C; }
    #agence h2 { margin: 0; font-weight: 500; font-size: clamp(32px, 3.3vw, 48px); line-height: 1.08; letter-spacing: -.03em; color: #141A4A; }
    #agence h2 em, #agence dt { font-family: ${SERIF}; font-style: italic; font-weight: 400; }
    #agence p { margin: 22px 0 0; max-width: 520px; font-size: 14px; line-height: 1.7; color: #4A4F6A; }
    #agence dl { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; margin: 56px 0 0; }
    #agence dl div { padding-top: 14px; border-top: 1px solid #DADADF; }
    #agence dt { white-space: nowrap; font-size: clamp(40px, 4.2vw, 58px); line-height: 1; color: #1F2A9C; letter-spacing: -.02em; }
    #agence dd { margin: 10px 0 0; font-size: 11.5px; color: #6B6F86; }
    @media (max-width: 767px) { #agence .se-grille { grid-template-columns: 1fr; } #agence dl { grid-template-columns: 1fr 1fr; } }
  </style>
  <div class="wrap"><div class="se-grille">
    <span class="se-etiq">${LOGO}L'agence</span>
    <div>
      <h2 id="agence-h">On s'occupe de chaque projet comme si c'était <em>notre maison.</em></h2>
      <p>Seuil est née pour rendre l'achat, la vente et la location plus simples, plus claires et plus humaines. Des conseillers spécialisés, une estimation soignée et un suivi du premier appel à la remise des clés, pour décider en confiance et sans petites lignes.</p>
      <dl><div><dt>2012</dt><dd>L'année de nos débuts</dd></div><div><dt>48</dt><dd>Quartiers couverts</dd></div><div><dt>35</dt><dd>Conseillers dans l'équipe</dd></div><div><dt>2 600+</dt><dd>Familles accompagnées</dd></div></dl>
    </div>
  </div></div>
</section>` },
  { id: "types", html: `<section id="types" class="section se-types" aria-labelledby="types-h">
  <style>
    ${FONT}
    #types { padding-block: clamp(48px, 6vw, 96px) !important; }
    #types .se-tete { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 20px; max-width: 1000px; margin: 0 auto 36px; }
    #types .se-etiq { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: #1F2A9C; margin-bottom: 14px; }
    #types h2 { margin: 0; max-width: 14ch; font-weight: 500; font-size: clamp(32px, 3.3vw, 48px); line-height: 1.05; letter-spacing: -.03em; color: #141A4A; }
    #types h2 em { font-family: ${SERIF}; font-style: italic; font-weight: 400; }
    #types .se-tete p { margin: 0; max-width: 300px; font-size: 13px; line-height: 1.6; color: #6B6F86; }
    #types .se-bento { display: grid; grid-template-columns: 1.1fr 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 10px; max-width: 1000px; height: clamp(420px, 42vw, 560px); margin-inline: auto; }
    #types figure { position: relative; margin: 0; overflow: hidden; border-radius: 18px; }
    #types figure:first-child { grid-row: span 2; } #types figure:nth-child(2) { grid-column: span 2; }
    #types figure img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .6s; } #types figure:hover img { transform: scale(1.04); }
    #types figcaption { position: absolute; left: 14px; bottom: 14px; padding: 7px 14px; border-radius: 999px; background: rgb(255 255 255 / .92); font-size: 12px; font-weight: 600; color: #141A4A; }
    #types .se-rond { position: absolute; right: 14px; top: 14px; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #fff; color: #141A4A; } #types .se-rond svg { width: 13px; height: 13px; }
    @media (max-width: 767px) { #types .se-bento { grid-template-columns: 1fr 1fr; height: auto; grid-auto-rows: 200px; } #types figure:first-child { grid-row: auto; } }
  </style>
  <div class="wrap">
    <div class="se-tete"><div><span class="se-etiq">${LOGO}Types de biens</span><h2 id="types-h">Trouve le bien qui <em>te</em> ressemble.</h2></div><p>Des maisons avec jardin aux toits-terrasses et aux locaux commerciaux, une sélection pour chaque moment de ta vie.</p></div>
    <div class="se-bento">
      <figure><img src="IMG_2" alt="Une maison familiale moderne avec piscine"><span class="se-rond">${FL}</span><figcaption>Maisons</figcaption></figure>
      <figure><img src="IMG_3" alt="Le salon lumineux d'un appartement"><span class="se-rond">${FL}</span><figcaption>Appartements</figcaption></figure>
      <figure><img src="IMG_4" alt="Un toit-terrasse avec piscine face à la ville"><span class="se-rond">${FL}</span><figcaption>Toits-terrasses</figcaption></figure>
      <figure><img src="IMG_5" alt="Un immeuble moderne avec des terrasses plantées"><span class="se-rond">${FL}</span><figcaption>Locaux commerciaux</figcaption></figure>
    </div>
  </div>
</section>` },
  { id: "selection", html: `<section id="selection" class="section se-selection" aria-labelledby="selection-h">
  <style>
    ${FONT}
    #selection { padding-block: clamp(48px, 6vw, 96px) !important; }
    #selection .se-tete { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 20px; max-width: 1000px; margin: 0 auto 32px; }
    #selection .se-etiq { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: #1F2A9C; margin-bottom: 14px; }
    #selection h2 { margin: 0; max-width: 14ch; font-weight: 500; font-size: clamp(32px, 3.3vw, 48px); line-height: 1.05; letter-spacing: -.03em; color: #141A4A; }
    #selection h2 em { font-family: ${SERIF}; font-style: italic; font-weight: 400; }
    #selection .se-nav { display: flex; gap: 8px; align-items: center; }
    #selection .se-nav a { padding: 9px 16px; border-radius: 999px; border: 1px solid #1F2A9C; color: #1F2A9C; font-size: 12px; text-decoration: none; }
    #selection .se-nav span { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; border: 1px solid #C9CBD8; color: #141A4A; font-size: 13px; }
    #selection .se-rang { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; max-width: 1000px; margin-inline: auto; }
    #selection .se-photo { position: relative; aspect-ratio: 4 / 3; border-radius: 18px; overflow: hidden; } #selection .se-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    #selection .se-rond { position: absolute; right: 12px; top: 12px; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #fff; color: #141A4A; } #selection .se-rond svg { width: 13px; height: 13px; }
    #selection .se-corps { padding: 14px 4px 0; } #selection .se-corps b { font-size: 18px; color: #1F2A9C; }
    #selection h3 { margin: 6px 0 4px; font-size: 15px; font-weight: 600; color: #141A4A; } #selection .se-corps p { margin: 0; font-size: 12.5px; color: #6B6F86; }
    @media (max-width: 899px) { #selection .se-rang { grid-template-columns: 1fr; } }
  </style>
  <div class="wrap">
    <div class="se-tete"><div><span class="se-etiq">${LOGO}Biens à la une</span><h2 id="selection-h">Choisis <em>à la main,</em> prêts pour toi.</h2></div><div class="se-nav"><a href="#contact">Tout voir →</a><span aria-hidden="true">‹</span><span aria-hidden="true">›</span></div></div>
    <div class="se-rang">
      ${bien("IMG_6", "Une maison contemporaine blanche à la tombée de la nuit", "890 000 €", "Maison contemporaine, Saint-Cloud", "5 pièces · 4 chambres · 180 m² · jardin")}
      ${bien("IMG_7", "Un appartement haussmannien lumineux", "640 000 €", "Appartement de caractère, Paris 17e", "4 pièces · 2 chambres · 92 m² · balcon")}
      ${bien("IMG_8", "Une maison en pierre avec un olivier", "520 000 €", "Mas rénové, Aix-en-Provence", "6 pièces · 4 chambres · 160 m² · terrain")}
    </div>
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing" id="contact" aria-label="Pied de page">
  <style>
    ${FONT}
    #contact { padding-block: clamp(72px, 8vw, 120px) 28px !important; background: #141A4A !important; color: #fff; }
    #contact h2 { margin: 0; font-weight: 500; font-size: clamp(34px, 3.6vw, 56px); line-height: 1.05; letter-spacing: -.03em; color: #fff; }
    #contact h2 em { font-family: ${SERIF}; font-style: italic; font-weight: 400; }
    #contact .se-haut { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 24px; }
    #contact .se-haut a { padding: 14px 22px; border-radius: 999px; background: #fff; color: #141A4A; font-size: 14px; font-weight: 600; text-decoration: none; }
    #contact .se-bas { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; margin-top: clamp(56px, 7vw, 96px); padding-top: 20px; border-top: 1px solid rgb(255 255 255 / .16); font-size: 12.5px; color: rgb(255 255 255 / .65); }
    #contact .se-bas nav { display: flex; gap: 22px; } #contact .se-bas a { color: rgb(255 255 255 / .65); text-decoration: none; }
  </style>
  <div class="wrap">
    <div class="se-haut"><h2>Ton prochain chez-toi <em>commence ici.</em></h2><a href="#hero">Planifier une visite →</a></div>
    <div class="se-bas"><span>© Seuil · modèle de la bibliothèque Bingoo!</span><nav aria-label="Pied de page"><a href="#agence">L'agence</a><a href="#types">Biens</a><a href="#selection">Sélection</a></nav></div>
  </div>
</footer>` },
];
export const journal = ["Plan : hero, agence, types, selection, contact"];
