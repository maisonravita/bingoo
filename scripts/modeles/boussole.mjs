// Modèle « Boussole » (28 nov. 2026) : design repris d'une maquette de cabinet de conseil (photo arrondie plein cadre,
// titre avec trait, bouton pilule et rond fléché, trois onglets en bas, indicateur vertical, trois cartes dont une
// colorée avec photo découpée en étoile, panneau gris des services en quatre photos). Couleurs changées (corail et bleu
// nuit au lieu de vert anis), textes et photos originaux.
export const nom = "Boussole";
export const slugBase = "boussole";
export const metier = "Cabinet de conseil";
export const design = {
  mode: "light", style: "Corail et bleu nuit", source: "bibliotheque",
  polices: { titres: "Work Sans", texte: "Work Sans" },
  couleurs: { background: "#FFFFFF", foreground: "#1F2A44", primary: "#FF7A59", on_primary: "#1F2A44", card: "#F6F4F2", muted: "#F6F4F2", border: "#E9E5E1", muted_foreground: "#5E6678", accent: "#FF7A59", secondary: "#F6F4F2", ring: "#FF7A59", on_accent: "#1F2A44" },
};
const C = "#FF7A59", N = "#1F2A44";
const fl = (fond = "#fff") => `<i class="bo-fl" style="background:${fond}"><svg viewBox="0 0 16 16" width="13" fill="none" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5" stroke="${N}" stroke-width="1.7" stroke-linecap="round"/></svg></i>`;
const P = "photorealistic, natural light, no text, no logo";
export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1920, height: 1152 }, prompt: `Photograph of two business consultants, a woman with short grey hair in a navy blazer and a young man in a light blue shirt, smiling and talking across a white meeting table with a laptop and coffee cups, warm modern office with vertical wooden slat wall behind, a plant, the left third of the image calm and slightly out of focus, ${P}.` },
  { id: "IMG_2", pour: "cartes", taille: "landscape_4_3", prompt: `Photograph of three colleagues of different ages looking at a laptop together on a sofa in a bright office with large windows, casual business clothes, ${P}.` },
  { id: "IMG_3", pour: "cartes", taille: "landscape_4_3", prompt: `Photograph of two business people shaking hands across a meeting table and smiling, other colleagues blurred around, warm light, ${P}.` },
  { id: "IMG_4", pour: "cartes", taille: "portrait_4_3", prompt: `Photograph of a confident woman with curly hair holding a tablet, standing in front of a soft navy blue wall with a plant, ${P}.` },
  { id: "IMG_5", pour: "services", taille: "portrait_4_3", prompt: `Photograph of a smiling young woman in an office with plants behind, looking at the camera, ${P}.` },
  { id: "IMG_6", pour: "services", taille: "portrait_4_3", prompt: `Photograph of a woman with red hair and glasses in a modern office with lights, looking at the camera, ${P}.` },
  { id: "IMG_7", pour: "services", taille: "portrait_4_3", prompt: `Photograph of a small team in a workshop around a table with wooden slats in the background, ${P}.` },
  { id: "IMG_8", pour: "services", taille: "portrait_4_3", prompt: `Close-up photograph of hands on a laptop keyboard with a chart on a notebook, ${P}.` },
];
export const nav = [{ mot: "Accueil", ancre: "hero" }, { mot: "Services", ancre: "services" }, { mot: "Secteurs", ancre: "cartes" }, { mot: "À propos", ancre: "cartes" }];
const ico = (d) => `<span class="bo-ic"><svg viewBox="0 0 24 24" width="18" fill="none" stroke="${N}" stroke-width="1.9" aria-hidden="true"><path d="${d}"/></svg></span>`;
const ser = (img, ic, t) => `<figure><img src="${img}" alt="">${ico(ic)}<figcaption>${t}</figcaption></figure>`;

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    .bo-fl { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; }
    header.nav { top: 14px !important; background: transparent !important; border: 0 !important; }
    header.nav .nav__bar { max-width: none !important; padding: 10px clamp(24px, 4vw, 48px) !important; }
    header.nav .nav__logo { display: inline-flex; align-items: center; gap: 8px; color: #fff !important; font-size: 19px; font-weight: 500; } header.nav .nav__logo i { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: ${C}; color: ${N}; font-style: normal; font-weight: 700; }
    header.nav .nav__links { justify-content: center; gap: 8px !important; } header.nav .nav__link { color: #fff !important; font-size: 13px; }
    header.nav .nav__link.bo-ins { padding: 7px 16px !important; border-radius: 999px; background: rgb(255 255 255 / .75); color: ${N} !important; font-size: 12.5px; }
    header.nav:not(.nav--sur-photo) { background: rgb(255 255 255 / .92) !important; -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); top: 0 !important; } header.nav:not(.nav--sur-photo) .nav__link, header.nav:not(.nav--sur-photo) .nav__logo { color: ${N} !important; } header.nav:not(.nav--sur-photo) .bo-ins { background: #F6F4F2 !important; }
    header.nav .bo-rech { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: rgb(255 255 255 / .8); color: ${N}; font-size: 14px; }
    header.nav .bo-go { padding: 10px 20px; border-radius: 999px; background: ${C}; color: ${N}; font-size: 13px; font-weight: 500; text-decoration: none; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero"><i>✳</i>Boussole</a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#hero">Accueil ⌄</a></div><div class="nav__item"><a class="nav__link" href="#services">Services ⌄</a></div><div class="nav__item"><a class="nav__link" href="#cartes">Secteurs ⌄</a></div><div class="nav__item"><a class="nav__link" href="#cartes">À propos ⌄</a></div><div class="nav__item"><a class="nav__link bo-ins" href="#cartes">Analyses</a></div></nav>
    <div class="nav__actions"><span class="bo-rech" aria-hidden="true">⌕</span><a class="bo-go" href="#contact">Nous contacter</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif bo-hero">
  <style>
    #hero { min-height: 0 !important; padding: 12px !important; background: #fff !important; }
    #hero .bo-cadre { position: relative; overflow: hidden; isolation: isolate; height: clamp(560px, 64vw, 760px); border-radius: 22px; }
    #hero .bo-cadre > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
    #hero .bo-cadre::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, rgb(31 42 68 / .45), transparent 55%), linear-gradient(0deg, rgb(255 255 255 / .35), transparent 25%); }
    #hero h1 { position: absolute; left: 5%; top: 42%; margin: 0; font-weight: 500; font-size: clamp(36px, 3.8vw, 54px); line-height: 1.12; letter-spacing: .01em; color: #fff; }
    #hero h1 span { display: inline-flex; align-items: center; gap: 14px; } #hero h1 span::after { content: ""; width: 110px; height: 1.5px; background: ${C}; }
    #hero .bo-act { position: absolute; left: 5%; top: calc(42% + 140px); display: flex; gap: 2px; } #hero .bo-act a { padding: 9px 20px; border-radius: 999px; background: ${C}; color: ${N}; font-size: 13px; font-weight: 500; text-decoration: none; }
    #hero .bo-ind { position: absolute; right: 5.5%; top: 36%; display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 9px; color: #fff; } #hero .bo-ind i { width: 2px; height: 110px; background: rgb(255 255 255 / .5); position: relative; } #hero .bo-ind i::after { content: ""; position: absolute; left: -1px; top: 18px; width: 4px; height: 34px; border-radius: 2px; background: ${C}; }
    #hero .bo-onglets { position: absolute; left: 5%; right: 5%; bottom: 26px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    #hero .bo-onglets span { padding: 13px 22px; border-radius: 14px; background: rgb(255 255 255 / .6); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); font-size: 10px; font-weight: 600; letter-spacing: .06em; color: ${N}; } #hero .bo-onglets span:first-child { background: #fff; }
    @media (max-width: 767px) { #hero .bo-onglets { grid-template-columns: 1fr; } #hero .bo-ind { display: none; } #hero h1 { top: 30%; } #hero .bo-act { top: calc(30% + 130px); } }
  </style>
  <div class="bo-cadre">
    <img src="IMG_1" alt="Deux consultants en rendez-vous autour d'une table">
    <h1><span>Votre partenaire</span><br>de confiance en conseil</h1>
    <div class="bo-act"><a href="#contact">Premier rendez-vous offert</a>${fl(C)}</div>
    <span class="bo-ind" aria-hidden="true">01<i></i>03</span>
    <div class="bo-onglets"><span>PARTENAIRE DE CONFIANCE</span><span>FINANCE</span><span>INVESTISSEMENT</span></div>
  </div>
</section>` },
  { id: "cartes", html: `<section id="cartes" class="section bo-cartes" aria-label="Actualités du cabinet">
  <style>
    #cartes { padding: clamp(60px, 6vw, 90px) 24px !important; background: #fff !important; }
    #cartes .bo-g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; max-width: 1180px; margin: 0 auto; }
    #cartes article { position: relative; display: flex; flex-direction: column; min-height: 450px; padding: 22px 22px 0; border-radius: 18px; background: #F6F4F2; overflow: hidden; }
    #cartes article > .bo-fl { position: absolute; right: 18px; top: 18px; }
    #cartes .bo-tag { align-self: flex-start; padding: 5px 12px; border-radius: 999px; border: 1px solid #D9D3CC; font-size: 8.5px; font-weight: 600; letter-spacing: .08em; color: ${N}; background: #fff; }
    #cartes h3 { margin: 16px 0 0; max-width: 240px; font-size: 18px; font-weight: 500; line-height: 1.3; color: ${N}; }
    #cartes article img { width: 100%; height: 220px; margin-top: auto; object-fit: cover; border-radius: 16px 16px 0 0; display: block; }
    #cartes article.on { background: ${C}; padding: 0; justify-content: flex-end; }
    #cartes article.on img { position: absolute; inset: 0 0 auto; height: 72%; border-radius: 0; clip-path: polygon(0 0, 100% 0, 100% 34%, 72% 44%, 86% 74%, 58% 62%, 48% 100%, 36% 64%, 8% 74%, 22% 44%, 0 34%); }
    #cartes article.on .bo-bas { position: relative; padding: 22px; } #cartes article.on h3 { max-width: 230px; }
    @media (max-width: 899px) { #cartes .bo-g { grid-template-columns: 1fr; } }
  </style>
  <div class="bo-g">
    <article><span class="bo-tag">QUI SOMMES-NOUS</span>${fl()}<h3>Un cabinet expert en analyse et en conseil financier</h3><img src="IMG_2" alt="Trois collègues autour d'un ordinateur"></article>
    <article class="on"><img src="IMG_3" alt="Une poignée de main en réunion"><div class="bo-bas"><span class="bo-tag" style="background:rgb(255 255 255 / .45);border-color:rgb(31 42 68 / .2)">DISTINCTION</span><h3>Boussole élu cabinet de l'année en région</h3></div><span class="bo-fl" style="position:absolute;right:18px;bottom:22px;background:#fff"><svg viewBox="0 0 16 16" width="13" fill="none" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5" stroke="${N}" stroke-width="1.7" stroke-linecap="round"/></svg></span></article>
    <article><span class="bo-tag">RAPPORT</span>${fl()}<h3>Rapport 2026 sur l'égalité et la diversité</h3><img src="IMG_4" alt="Une consultante tenant une tablette"></article>
  </div>
</section>` },
  { id: "services", html: `<section id="services" class="section bo-services" aria-labelledby="services-h">
  <style>
    #services { padding: 0 12px 12px !important; background: #fff !important; }
    #services .bo-pan { padding: clamp(70px, 7vw, 100px) 24px; border-radius: 22px; background: #F6F4F2; text-align: center; }
    #services .bo-tag { display: inline-block; padding: 5px 14px; border-radius: 999px; border: 1px solid #D9D3CC; font-size: 8.5px; font-weight: 600; letter-spacing: .08em; color: ${N}; background: #fff; }
    #services h2 { margin: 18px auto 0; max-width: 20ch; font-size: clamp(28px, 2.8vw, 40px); font-weight: 400; line-height: 1.2; color: ${N}; }
    #services .bo-g { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; max-width: 1180px; margin: 44px auto 0; }
    #services figure { position: relative; margin: 0; border-radius: 16px; overflow: hidden; height: 330px; } #services figure img { width: 100%; height: 100%; object-fit: cover; display: block; }
    #services .bo-ic { position: absolute; left: 14px; top: 14px; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; background: ${C}; }
    #services figcaption { position: absolute; left: 12px; right: 12px; bottom: 12px; padding: 12px 14px; border-radius: 12px; background: rgb(255 255 255 / .92); font-size: 14px; font-weight: 500; color: ${N}; text-align: left; }
    @media (max-width: 899px) { #services .bo-g { grid-template-columns: 1fr 1fr; } }
  </style>
  <div class="bo-pan"><span class="bo-tag">SERVICES</span><h2 id="services-h">Nous accompagnons les audacieux vers l'extraordinaire</h2>
  <div class="bo-g">
    ${ser("IMG_5", "M12 3v18M7 7h7a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8", "Conseil financier")}
    ${ser("IMG_6", "M12 3a9 9 0 1 0 9 9h-9Z", "Stratégie et croissance")}
    ${ser("IMG_7", "M3 10 12 4l9 6M5 10v9h14v-9", "Transmission d'entreprise")}
    ${ser("IMG_8", "M4 19V9M10 19V5M16 19v-7M22 19H2", "Pilotage et données")}
  </div></div>
</section>` },
  { id: "contact", html: `<footer class="footer closing bo-contact" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding: clamp(60px, 6vw, 90px) 24px 28px !important; background: #fff !important; }
    #contact .bo-in { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 24px; max-width: 1180px; margin: 0 auto; }
    #contact h2 { margin: 0; max-width: 16ch; font-size: clamp(28px, 2.8vw, 40px); font-weight: 400; line-height: 1.15; color: ${N}; }
    #contact .bo-act { display: flex; gap: 2px; } #contact .bo-act a { padding: 12px 24px; border-radius: 999px; background: ${C}; color: ${N}; font-weight: 500; text-decoration: none; }
    #contact .bo-pied { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; max-width: 1180px; margin: 60px auto 0; padding-top: 18px; border-top: 1px solid #E9E5E1; font-size: 12.5px; color: #5E6678; }
  </style>
  <div class="bo-in"><h2 id="contact-h">Parlons de votre prochaine étape</h2><div class="bo-act"><a href="mailto:bonjour@boussole-conseil.fr">Prendre rendez-vous</a>${fl(C)}</div></div>
  <div class="bo-pied"><span>© Boussole · modèle de la bibliothèque Bingoo!</span><span>12 rue de la Paix, Lyon · bonjour@boussole-conseil.fr</span></div>
</footer>` },
];
export const journal = ["Plan : hero, cartes, services, contact"];
