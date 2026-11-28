// Modèle « Altière » (28 nov. 2026) : recopie d'une maquette de groupe immobilier et hôtelier (rail vertical à gauche,
// photo de façade la nuit, titre en capitales, bouton doré, barre d'infos, titres dorés avec leur écho en filigrane,
// chiffres en cases, quatre panneaux de projets verticaux, formulaire de contact). Nom, textes et images originaux.
export const nom = "Altière";
export const slugBase = "altiere";
export const metier = "Groupe immobilier et hôtelier";
export const design = {
  mode: "dark", style: "Nuit et or", source: "bibliotheque",
  polices: { titres: "Montserrat", texte: "Montserrat" },
  couleurs: { background: "#17171B", foreground: "#FFFFFF", primary: "#B39A62", on_primary: "#17171B", card: "#1E1E23", muted: "#1E1E23", border: "#2B2B31", muted_foreground: "#9C9CA3", accent: "#B39A62", secondary: "#1E1E23", ring: "#B39A62", on_accent: "#17171B" },
};
const OR = "#B39A62";
const titre = (id, mot) => `<h2 id="${id}" class="al-titre"><span>${mot}</span><i aria-hidden="true">${mot}</i></h2>`;
const TITRE_CSS = (s) => `${s} .al-titre { position: relative; margin: 0; font-weight: 800; font-size: clamp(30px, 2.8vw, 42px); letter-spacing: .01em; text-transform: uppercase; color: ${OR}; line-height: 1; }
    ${s} .al-titre span { position: relative; z-index: 1; } ${s} .al-titre i { position: absolute; left: 34%; top: -6px; font-style: normal; font-size: 1.45em; color: rgb(255 255 255 / .05); white-space: nowrap; }`;
const panneau = (img, n, t, lieu, loupe = false) => `<figure class="al-p"><img src="${img}" alt="${t}, ${lieu}"><figcaption><b>${n}</b><span>${t}</span></figcaption><em>${lieu}</em>${loupe ? '<i class="al-loupe" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#fff" stroke-width="1.6"/><path d="M11 8v6M8 11h6M16 16l4 4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg></i>' : ""}</figure>`;
export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1920, height: 1088 }, prompt: "Night photograph looking up at a large curved modern office building with a dark glass and steel grid facade, many windows warmly lit in yellow with silhouettes of desks and lamps, a second curved tower on the right edge, deep blue-black night, high contrast, photorealistic architecture photography, no people recognisable, no text, no logo." },
  { id: "IMG_2", pour: "apropos", taille: "landscape_4_3", prompt: "Aerial night photograph looking straight down between several tall modern glass skyscrapers lit in warm gold and white, a lit plaza below, dramatic perspective, photorealistic, not a famous landmark, no text, no logo." },
  { id: "IMG_3", pour: "projets", taille: "portrait_16_9", prompt: "Vertical night photograph of a modern dark-clad house facade with tall lit windows and a garden terrace, blue hour, photorealistic architecture, no people, no text." },
  { id: "IMG_4", pour: "projets", taille: "portrait_16_9", prompt: "Vertical night photograph of a modern white villa with a swimming pool reflecting the lit windows, palm leaves in the foreground, photorealistic architecture, no people, no text." },
  { id: "IMG_5", pour: "projets", taille: "portrait_16_9", prompt: "Vertical photograph at dusk of a modern house entrance with a wide garage door, wood and grey stone cladding, warm lit windows, concrete driveway, photorealistic architecture, no people, no text." },
  { id: "IMG_6", pour: "projets", taille: "portrait_16_9", prompt: "Vertical photograph of a minimalist beige stucco house with horizontal shutters and a flat roof, soft overcast light, photorealistic architecture, no people, no text." },
];
export const nav = [{ mot: "Accueil", ancre: "hero" }, { mot: "À propos", ancre: "apropos" }, { mot: "Projets", ancre: "projets" }, { mot: "Contact", ancre: "contact" }];

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    .nav { left: 82px !important; width: auto !important; right: 0; }
    .nav .nav__logo { font-size: 18px; font-weight: 500; letter-spacing: .02em; text-transform: uppercase; }
    .nav .nav__links { display: none !important; } .nav .nav__actions { display: none !important; }
    .al-rail { position: fixed; left: 0; top: 0; bottom: 0; z-index: 60; width: 82px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 34px 0; background: #17171B; border-right: 1px solid #2B2B31; }
    .al-rail .al-grille { display: grid; grid-template-columns: repeat(3, 4px); gap: 4px; } .al-rail .al-grille i { width: 4px; height: 4px; background: #fff; }
    .al-rail nav { display: flex; flex-direction: column; gap: 28px; writing-mode: vertical-rl; transform: rotate(180deg); font-size: 12px; } .al-rail nav a { color: #9C9CA3; text-decoration: none; } .al-rail nav a:last-child { color: #fff; text-decoration: underline; }
    .al-rail .al-marque { display: grid; grid-template-columns: repeat(4, 5px); gap: 2px; } .al-rail .al-marque i { width: 5px; height: 5px; background: #fff; } .al-rail .al-marque i:nth-child(2n) { background: transparent; }
    main { padding-left: 82px; }
    @media (max-width: 767px) { .al-rail { display: none; } main { padding-left: 0; } .nav { left: 0 !important; } }
  </style>
  <aside class="al-rail" aria-label="Raccourcis"><span class="al-grille" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><nav><a href="#contact">Écrire</a><a href="#contact">Appeler</a><a href="#projets">Visiter</a></nav><span class="al-marque" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></aside>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero">Altière</a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#apropos">À propos</a></div><div class="nav__item"><a class="nav__link" href="#projets">Projets</a></div><div class="nav__item"><a class="nav__link" href="#contact">Contact</a></div></nav>
    <div class="nav__actions"></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif al-hero">
  <style>
    #hero { position: relative; min-height: 0 !important; padding: 0 !important; color: #fff; background: #17171B; }
    #hero .al-photo { position: relative; overflow: hidden; isolation: isolate; height: clamp(560px, 86vh, 760px); }
    #hero .al-photo > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
    #hero .al-photo::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, rgb(10 10 14 / .5), transparent 55%); }
    #hero h1 { position: absolute; left: clamp(24px, 6vw, 88px); top: 40%; margin: 0; font-weight: 800; font-size: clamp(34px, 3.2vw, 50px); line-height: 1.12; letter-spacing: .01em; text-transform: uppercase; color: #fff; }
    #hero .al-btn { position: absolute; left: clamp(24px, 6vw, 88px); top: calc(40% + 128px); padding: 12px 52px; border-radius: 999px; background: ${OR}; color: #fff; font-size: 17px; text-decoration: none; }
    #hero .al-fl { position: absolute; right: clamp(24px, 6vw, 88px); bottom: 36px; display: flex; gap: 22px; } #hero .al-fl i { width: 40px; height: 1.5px; background: #fff; position: relative; } #hero .al-fl i::before { content: ""; position: absolute; top: -5px; width: 12px; height: 1.5px; background: #fff; } #hero .al-fl i:first-child::before { left: 0; transform: rotate(-30deg); transform-origin: left; } #hero .al-fl i:last-child::before { right: 0; transform: rotate(30deg); transform-origin: right; }
    #hero .al-infos { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 14px clamp(28px, 6vw, 88px); padding: 20px clamp(24px, 6vw, 88px); border-bottom: 1px solid #2B2B31; font-size: 12px; }
    #hero .al-infos span { display: inline-flex; align-items: center; gap: 12px; } #hero .al-infos svg { width: 16px; height: 16px; }
  </style>
  <div class="al-photo">
    <img src="IMG_1" alt="Une tour de bureaux aux fenêtres éclairées, la nuit">
    <h1>Avec vous.<br>Toujours</h1>
    <a class="al-btn" href="#contact">Réserver</a>
    <span class="al-fl" aria-hidden="true"><i></i><i></i></span>
  </div>
  <p class="al-infos"><span><svg viewBox="0 0 16 16" fill="#fff"><path d="M8 15s5-4.6 5-8.5A5 5 0 0 0 3 6.5C3 10.4 8 15 8 15Zm0-6.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/></svg>Quai des Chartrons, Bordeaux</span><span><svg viewBox="0 0 16 16" fill="#fff"><path d="M4.5 1.5 6.8 4 5.6 6.3a8 8 0 0 0 4.1 4.1L12 9.2l2.5 2.3-1.3 2.7C7.6 14.2 1.8 8.4 1.8 2.8L4.5 1.5Z"/></svg>05 56 00 00 00</span><span><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.6" stroke="#fff" stroke-width="1.4"/><path d="M10.6 8v1a1.8 1.8 0 0 0 3.6 0V8A6.2 6.2 0 1 0 11 13.4" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></svg>bonjour@altiere.fr</span></p>
</section>` },
  { id: "apropos", html: `<section id="apropos" class="section al-apropos" aria-labelledby="apropos-h">
  <style>
    #apropos { padding: clamp(56px, 7vw, 96px) clamp(24px, 6vw, 88px) !important; border-left: 1px solid #2B2B31; margin-left: 34px; }
    ${TITRE_CSS("#apropos")}
    #apropos .al-g { display: grid; grid-template-columns: 1fr 1.15fr; gap: clamp(32px, 4vw, 56px); align-items: center; }
    #apropos p { margin: 28px 0 0; font-size: 15px; line-height: 1.75; color: #E4E4E8; max-width: 440px; }
    #apropos a { display: inline-flex; gap: 10px; margin-top: 32px; color: #9C9CA3; font-size: 15px; } #apropos img { width: 100%; aspect-ratio: 1.75; object-fit: cover; display: block; }
    @media (max-width: 899px) { #apropos .al-g { grid-template-columns: 1fr; } #apropos { margin-left: 0; border-left: 0; } }
  </style>
  <div class="al-g">
    <div>${titre("apropos-h", "À propos")}<p>L'alliance d'un groupe immobilier et d'une maison hôtelière, chacun pionnier depuis près de trente ans dans son métier. Ils ont marqué leur domaine et unissent aujourd'hui leurs savoir-faire.</p><p>Altière réunit le meilleur de l'immobilier et de l'hospitalité, sous un même toit.</p><a href="#projets">En savoir plus <span aria-hidden="true">›</span></a></div>
    <img src="IMG_2" alt="Des tours de verre éclairées vues d'en haut, la nuit">
  </div>
</section>` },
  { id: "chiffres", html: `<section id="chiffres" class="section al-chiffres" aria-label="Chiffres">
  <style>
    #chiffres { padding: 0 !important; border-top: 1px solid #2B2B31; border-bottom: 1px solid #2B2B31; }
    #chiffres .al-g { display: grid; grid-template-columns: 1fr 1fr 1.4fr; }
    #chiffres .al-g > div { display: flex; align-items: center; gap: 22px; padding: 44px clamp(20px, 3.5vw, 52px); } #chiffres .al-g > div + div { border-left: 1px solid #2B2B31; }
    #chiffres svg { width: 62px; height: 62px; flex: none; } #chiffres b { display: block; font-size: 25px; font-weight: 500; } #chiffres span { font-size: 19px; color: ${OR}; }
    #chiffres p { margin: 0; font-size: clamp(22px, 2vw, 30px); font-weight: 500; line-height: 1.15; color: ${OR}; }
    @media (max-width: 899px) { #chiffres .al-g { grid-template-columns: 1fr; } #chiffres .al-g > div + div { border-left: 0; border-top: 1px solid #2B2B31; } }
  </style>
  <div class="al-g">
    <div><svg viewBox="0 0 64 64" fill="#fff" aria-hidden="true"><circle cx="32" cy="32" r="30"/><circle cx="22" cy="25" r="3.4" fill="#17171B"/><circle cx="42" cy="25" r="3.4" fill="#17171B"/><path d="M18 36c3 8 9 12 14 12s11-4 14-12" stroke="#17171B" stroke-width="4" fill="none" stroke-linecap="round"/></svg><div><b>1 000</b><span>Chambres louées</span></div></div>
    <div><svg viewBox="0 0 64 64" fill="#fff" aria-hidden="true"><path d="M14 4h36v56H38V48H26v12H14V4Z"/><g fill="#17171B"><rect x="21" y="12" width="7" height="7"/><rect x="36" y="12" width="7" height="7"/><rect x="21" y="24" width="7" height="7"/><rect x="36" y="24" width="7" height="7"/><rect x="21" y="36" width="7" height="7"/><rect x="36" y="36" width="7" height="7"/></g></svg><div><b>12</b><span>Immeubles</span></div></div>
    <div><p>Et votre bonheur.<br>Inestimable…</p></div>
  </div>
</section>` },
  { id: "projets", html: `<section id="projets" class="section al-projets" aria-labelledby="projets-h">
  <style>
    #projets { padding: 0 !important; }
    #projets .al-tete { display: grid; place-items: center; padding: clamp(56px, 6vw, 88px) 0; margin: 0 34px; border-left: 1px solid #2B2B31; border-right: 1px solid #2B2B31; }
    ${TITRE_CSS("#projets")} #projets .al-titre i { left: 40%; }
    #projets .al-rang { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    #projets .al-p { position: relative; margin: 0; height: clamp(520px, 52vw, 720px); overflow: hidden; } #projets .al-p img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .7s; } #projets .al-p:hover img { transform: scale(1.05); }
    #projets .al-p::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgb(10 10 14 / .35), transparent 30%, transparent 70%, rgb(10 10 14 / .4)); }
    #projets figcaption { position: absolute; z-index: 1; left: 24px; top: 48px; color: #fff; } #projets figcaption b { display: block; font-size: 21px; letter-spacing: .3em; color: ${OR}; } #projets figcaption span { display: block; margin-top: 14px; font-size: 21px; }
    #projets em { position: absolute; z-index: 1; left: 24px; bottom: 48px; writing-mode: vertical-rl; transform: rotate(180deg); font-style: normal; font-size: 13px; color: #fff; }
    #projets .al-loupe { position: absolute; z-index: 1; left: 50%; top: 50%; transform: translate(-50%, -50%); display: grid; place-items: center; width: 140px; height: 140px; border-radius: 50%; background: rgb(0 0 0 / .45); box-shadow: 0 0 0 40px rgb(0 0 0 / .18); } #projets .al-loupe svg { width: 40px; height: 40px; }
    @media (max-width: 899px) { #projets .al-rang { grid-template-columns: 1fr 1fr; } #projets .al-p { height: 420px; } }
  </style>
  <div class="al-tete">${titre("projets-h", "Projets")}</div>
  <div class="al-rang">
    ${panneau("IMG_3", "01", "Résidence Garonne", "Bordeaux")}
    ${panneau("IMG_4", "02", "Villa des Pins", "Arcachon")}
    ${panneau("IMG_5", "03", "Maison du Parc", "Mérignac", true)}
    ${panneau("IMG_6", "04", "Les Terrasses", "Pessac")}
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing al-contact" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding: 0 !important; background: #17171B !important; }
    #contact .al-haut { padding: clamp(56px, 6vw, 88px) clamp(24px, 6vw, 88px); margin-left: 34px; border-left: 1px solid #2B2B31; }
    ${TITRE_CSS("#contact")}
    #contact .al-g { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(32px, 5vw, 80px); margin-top: 48px; }
    #contact form { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; }
    #contact .al-c { padding: 10px 14px; background: #2A2A30; color: #6E6E75; font-size: 12.5px; } #contact .al-m { grid-row: span 2; min-height: 80px; }
    #contact .al-env { grid-column: 2; padding: 10px; background: ${OR}; color: #fff; text-align: center; font-size: 13px; letter-spacing: .06em; text-transform: uppercase; }
    #contact .al-infos { display: grid; gap: 22px; align-content: start; font-size: 19px; } #contact .al-infos span { display: flex; gap: 22px; align-items: center; } #contact .al-infos small { font-size: 15px; line-height: 1.6; }
    #contact .al-bas { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 20px; padding: 40px clamp(24px, 6vw, 88px); background: #111114; }
    #contact .al-bas b { display: block; font-size: 25px; font-weight: 500; line-height: 1; } #contact .al-bas small { font-size: 11px; color: #9C9CA3; }
    #contact .al-bas nav { display: flex; gap: 36px; font-size: 12px; } #contact .al-bas a { color: #fff; text-decoration: none; }
    @media (max-width: 899px) { #contact .al-g { grid-template-columns: 1fr; } #contact .al-haut { margin-left: 0; border-left: 0; } }
  </style>
  <div class="al-haut">${titre("contact-h", "Contact")}
    <div class="al-g">
      <div><div class="al-form" style="display:grid;grid-template-columns:1fr 1fr;gap:14px 18px"><span class="al-c">Nom</span><span class="al-c al-m">Message</span><span class="al-c">E-mail</span><span class="al-c">Téléphone</span><a class="al-env" href="#contact">Envoyer</a></div></div>
      <div class="al-infos"><span><svg viewBox="0 0 16 16" width="22" height="22" fill="#fff" aria-hidden="true"><path d="M4.5 1.5 6.8 4 5.6 6.3a8 8 0 0 0 4.1 4.1L12 9.2l2.5 2.3-1.3 2.7C7.6 14.2 1.8 8.4 1.8 2.8L4.5 1.5Z"/></svg>05 56 00 00 00</span><span><small>Quai des Chartrons, 33000 Bordeaux<br>Du lundi au samedi, sur rendez-vous</small></span></div>
    </div>
  </div>
  <div class="al-bas"><div><b>Altière<br>Groupe</b><small>© Altière · modèle de la bibliothèque Bingoo!</small></div><nav aria-label="Pied de page"><a href="#hero">Plan du site</a><a href="#contact">Conditions</a><a href="#contact">Confidentialité</a></nav></div>
</footer>` },
];
export const journal = ["Plan : hero, apropos, chiffres, projets, contact"];
