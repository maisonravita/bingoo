// Modèle « Abri » (28 nov. 2026) : design repris d'une maquette d'immobilier de prestige (grande carte arrondie, ciel uni,
// titre centré, villa contemporaine qui se fond dans le blanc, titre avec une petite photo en pastille dans la phrase,
// champ e-mail, seconde villa). Couleurs changées (ciel rosé du soir et villa sable au lieu du bleu), textes originaux.
export const nom = "Abri";
export const slugBase = "abri";
export const metier = "Promoteur de villas contemporaines";
export const design = {
  mode: "light", style: "Ciel rosé", source: "bibliotheque",
  polices: { titres: "Manrope", texte: "Manrope" },
  couleurs: { background: "#FFFFFF", foreground: "#141414", primary: "#141414", on_primary: "#FFFFFF", card: "#F6F2EF", muted: "#F6F2EF", border: "#ECE5E0", muted_foreground: "#6B625C", accent: "#C9775A", secondary: "#F6F2EF", ring: "#141414", on_accent: "#FFFFFF" },
};
const A = "architecture photography, photorealistic, no people, no text";
export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1440, height: 1920 }, prompt: `Low angle photograph of a bold modern cantilevered villa with stacked sand-coloured concrete volumes, large glass windows with light curtains, an outdoor staircase with glass railing, a small olive tree on the top terrace, against a perfectly clear soft dusty pink and peach evening sky, the top third of the image empty sky, ${A}.` },
  { id: "IMG_2", pour: "vision", taille: "landscape_16_9", prompt: `Photograph of a low modern pavilion house with a wide flat roof among green trees and a lawn, warm late afternoon light, ${A}.` },
  { id: "IMG_3", pour: "vision", taille: { width: 1920, height: 960 }, prompt: `Photograph of a long white modern villa with three stacked horizontal floors and warm lit windows at dusk, soft pink sky, the villa in the lower half, isolated feel with plain sky, ${A}.` },
];
export const nav = [{ mot: "Vision", ancre: "vision" }, { mot: "Contact", ancre: "contact" }];

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    header.nav { top: 70px !important; left: 50% !important; right: auto !important; transform: translateX(-50%); width: min(960px, calc(100% - 40px)) !important; background: transparent !important; border: 0 !important; }
    header.nav .nav__bar { max-width: none !important; padding: 14px 18px !important; }
    header.nav .nav__actions { margin-left: auto !important; } header.nav .nav__logo { color: #fff !important; font-size: 19px; font-weight: 500; letter-spacing: -.02em; } header.nav .nav__links { display: none !important; }
    header.nav .ab-plus { color: #fff; font-size: 24px; font-weight: 300; text-decoration: none; }
    header.nav:not(.nav--sur-photo) { top: 0 !important; width: 100% !important; background: rgb(255 255 255 / .9) !important; } header.nav:not(.nav--sur-photo) .nav__logo, header.nav:not(.nav--sur-photo) .ab-plus { color: #141414 !important; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero">Abri*</a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#vision">Vision</a></div></nav>
    <div class="nav__actions"><a class="ab-plus" href="#contact" aria-label="Nous contacter">+</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif ab-hero">
  <style>
    #hero { min-height: 0 !important; padding: 60px 20px 0 !important; background: linear-gradient(180deg, #F7E6E1, #FFF 40%) !important; }
    #hero .ab-carte { position: relative; overflow: hidden; isolation: isolate; max-width: 960px; margin: 0 auto; height: clamp(700px, 70vw, 840px); border-radius: 14px 14px 0 0; text-align: center; color: #fff; background: linear-gradient(180deg, #E8B4A6, #F2CDBF 50%, #fff 100%); box-shadow: 0 40px 80px -30px rgb(120 60 40 / .25); }
    #hero .ab-carte > img { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 66%; object-fit: cover; object-position: center 70%; z-index: -1; -webkit-mask: linear-gradient(180deg, transparent 0, #000 22%, #000 72%, transparent 100%); mask: linear-gradient(180deg, transparent 0, #000 22%, #000 72%, transparent 100%); }
    #hero h1 { margin: 0 auto; padding-top: 70px; font-weight: 500; font-size: clamp(40px, 5vw, 64px); line-height: 1.08; letter-spacing: -.045em; color: #fff; }
    #hero p { margin: 22px auto 0; max-width: 380px; font-size: 15px; line-height: 1.55; color: rgb(255 255 255 / .95); }
  </style>
  <div class="ab-carte">
    <h1>Un art de vivre<br>hors du commun.</h1>
    <p>Une architecture intemporelle, des adresses rares et des maisons pensées pour votre prochain chapitre.</p>
    <img src="IMG_1" alt="Une villa contemporaine en béton sable sous un ciel rosé">
  </div>
</section>` },
  { id: "vision", html: `<section id="vision" class="section ab-vision" aria-labelledby="vision-h">
  <style>
    #vision { padding: 0 20px !important; background: #fff !important; }
    #vision .ab-carte { max-width: 960px; margin: 0 auto; padding: clamp(80px, 8vw, 120px) 24px 0; text-align: center; background: #fff; box-shadow: 0 40px 80px -30px rgb(120 60 40 / .25); }
    #vision h2 { margin: 0 auto; font-weight: 500; font-size: clamp(36px, 4.2vw, 56px); line-height: 1.1; letter-spacing: -.045em; color: #141414; }
    #vision h2 img { display: inline-block; width: 1.9em; height: .9em; vertical-align: -.08em; margin: 0 .2em; object-fit: cover; border-radius: .45em .15em .45em .15em; }
    #vision p { margin: 26px auto 0; max-width: 560px; font-size: 15.5px; line-height: 1.55; color: #6B625C; }
    #vision .ab-champ { display: flex; justify-content: space-between; align-items: center; width: min(360px, 100%); margin: 30px auto 0; padding: 4px 4px 4px 14px; border-radius: 10px; background: #F6F2EF; font-size: 12.5px; color: #6B625C; }
    #vision .ab-champ a { padding: 10px 18px; border-radius: 8px; background: #141414; color: #fff; font-size: 12.5px; text-decoration: none; }
    #vision .ab-carte > img { display: block; width: 100%; max-width: 760px; margin: 60px auto 0; -webkit-mask: linear-gradient(180deg, transparent, #000 25%); mask: radial-gradient(ellipse 60% 70% at 50% 60%, #000 55%, transparent 100%); }
  </style>
  <div class="ab-carte">
    <h2 id="vision-h">Là où votre vision<br>trouve sa <img src="IMG_2" alt=""> maison.</h2>
    <p>Abri vous offre bien plus qu'un lieu où vivre : un espace à votre image, construit avec une précision intemporelle et pensé pour plusieurs générations.</p>
    <div class="ab-champ"><span>Votre adresse e-mail</span><a href="#contact">Rester informé</a></div>
    <img src="IMG_3" alt="Une longue villa blanche aux fenêtres éclairées">
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing ab-contact" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding: 0 20px 40px !important; background: #fff !important; }
    #contact .ab-carte { max-width: 960px; margin: 0 auto; padding: 60px 40px 30px; border-radius: 0 0 14px 14px; background: #141414; color: #fff; }
    #contact .ab-in { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 30px; }
    #contact h2 { margin: 0; font-weight: 500; font-size: 30px; letter-spacing: -.03em; color: #fff; } #contact h3 { margin: 0 0 12px; font-size: 12px; font-weight: 500; color: #A89F98; } #contact p { margin: 0; font-size: 14px; line-height: 1.7; color: #fff; }
    #contact .ab-pied { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-top: 50px; padding-top: 18px; border-top: 1px solid #2A2A2A; font-size: 12px; color: #A89F98; }
    @media (max-width: 767px) { #contact .ab-in { grid-template-columns: 1fr; } }
  </style>
  <div class="ab-carte"><div class="ab-in"><h2 id="contact-h">Abri*</h2><div><h3>Nous écrire</h3><p>bonjour@abri-villas.fr<br>04 93 00 00 00</p></div><div><h3>Nous voir</h3><p>Promenade des Anglais<br>06000 Nice</p></div></div>
  <div class="ab-pied"><span>© Abri · modèle de la bibliothèque Bingoo!</span><span>Sur rendez-vous</span></div></div>
</footer>` },
];
export const journal = ["Plan : hero, vision, contact"];
