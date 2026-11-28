// Modèle « Forge » (28 nov. 2026) : design repris d'une maquette d'école (fond nuit traversé de vagues de couleur
// granuleuses, surtitre, grand titre sur deux lignes en dégradé, bouton contour, barre d'infos en quatre cases, étoile,
// pastille, titre « Et pour vous ? », quatre cartes de verre numérotées avec des cristaux 3D, cours).
// Couleurs changées (or, citron vert et bleu canard au lieu de rose, orange et violet), textes originaux.
export const nom = "Forge";
export const slugBase = "forge";
export const metier = "École et formation";
export const design = {
  mode: "dark", style: "Vagues dorées", source: "bibliotheque",
  polices: { titres: "Plus Jakarta Sans", texte: "Plus Jakarta Sans" },
  couleurs: { background: "#070B0E", foreground: "#FFFFFF", primary: "#FFFFFF", on_primary: "#070B0E", card: "#10161A", muted: "#10161A", border: "#1E2930", muted_foreground: "#A7B3B8", accent: "#F4C04E", secondary: "#10161A", ring: "#F4C04E", on_accent: "#070B0E" },
};
const VAGUE = (pos) => `radial-gradient(ellipse 70% 45% at ${pos}, rgb(244 192 78 / .85), transparent 60%), radial-gradient(ellipse 45% 40% at 85% 10%, rgb(20 150 140 / .9), transparent 65%), radial-gradient(ellipse 50% 35% at 50% 0%, rgb(170 220 60 / .55), transparent 60%)`;
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E")`;
export const images = [
  { id: "IMG_1", pour: "atouts", detourer: true, taille: "square_hd", prompt: "3D render of a tall clear glass crystal prism standing tilted, transparent with silver chrome edges and teal reflections, studio light, isolated on a plain white background, no text." },
  { id: "IMG_2", pour: "atouts", detourer: true, taille: "square_hd", prompt: "3D render of a flat clear glass hexagon tile tilted, transparent with silver edges and warm gold reflections, studio light, isolated on a plain white background, no text." },
  { id: "IMG_3", pour: "atouts", detourer: true, taille: "square_hd", prompt: "3D render of a clear glass triangular pyramid with chrome silver edges, transparent, studio light, isolated on a plain white background, no text." },
];
export const nav = [{ mot: "L'école", ancre: "atouts" }, { mot: "Cours", ancre: "cours" }, { mot: "Parcours", ancre: "atouts" }, { mot: "Questions", ancre: "contact" }];
const carte = (t, p, n) => `<article><h3>${t}</h3><p>${p}</p><b>${n}</b></article>`;

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    header.nav { background: transparent !important; border: 0 !important; }
    header.nav .nav__bar { max-width: none !important; padding: 14px 40px !important; }
    header.nav .nav__logo { color: #fff !important; font-size: 19px; font-weight: 600; letter-spacing: -.03em; }
    header.nav .nav__links { justify-content: center; } header.nav .nav__link { color: rgb(255 255 255 / .85) !important; font-size: 13px; }
    header.nav .fo-go { padding: 12px 26px; border-radius: 999px; background: #fff; color: #070B0E; font-size: 13px; font-weight: 500; text-decoration: none; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero">Forge.</a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#atouts">L'école</a></div><div class="nav__item"><a class="nav__link" href="#cours">Cours</a></div><div class="nav__item"><a class="nav__link" href="#atouts">Parcours</a></div><div class="nav__item"><a class="nav__link" href="#contact">Questions</a></div></nav>
    <div class="nav__actions"><a class="fo-go" href="#contact">Candidater</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif fo-hero">
  <style>
    #hero { position: relative; overflow: hidden; isolation: isolate; min-height: 0 !important; padding: clamp(150px, 13vw, 170px) 24px 0 !important; text-align: center; color: #fff; background: ${VAGUE("10% 0%")}, #070B0E !important; }
    #hero::before { content: ""; position: absolute; inset: 0; z-index: -1; background: ${GRAIN}; mix-blend-mode: overlay; }
    #hero::after { content: ""; position: absolute; left: -10%; right: -10%; top: 18%; height: 70%; z-index: -1; border-radius: 50%; background: #070B0E; filter: blur(50px); }
    #hero small { font-size: 12px; letter-spacing: .06em; color: rgb(255 255 255 / .8); }
    #hero h1 { margin: 28px auto 0; font-weight: 500; font-size: clamp(64px, 8.6vw, 124px); line-height: .78; letter-spacing: -.04em; background: linear-gradient(180deg, #fff 35%, #6E7B80); -webkit-background-clip: text; background-clip: text; color: transparent !important; -webkit-text-fill-color: transparent; padding-bottom: .12em; }
    #hero .fo-b { display: inline-block; margin-top: 30px; padding: 14px 28px; border-radius: 999px; border: 1px solid rgb(255 255 255 / .6); color: #fff; font-size: 13px; text-decoration: none; }
    #hero .fo-info { display: grid; grid-template-columns: repeat(4, 1fr); margin: clamp(100px, 10vw, 130px) -24px 0; padding: 22px 0; background: #10161A; text-align: left; }
    #hero .fo-info div { padding: 0 clamp(24px, 6vw, 80px); } #hero .fo-info div + div { border-left: 1px solid #1E2930; } #hero .fo-info span { display: block; font-size: 10px; letter-spacing: .08em; color: #A7B3B8; } #hero .fo-info b { display: block; margin-top: 6px; font-size: 14px; font-weight: 500; }
    @media (max-width: 767px) { #hero .fo-info { grid-template-columns: 1fr 1fr; gap: 16px; } #hero .fo-info div + div { border-left: 0; } }
  </style>
  <small>DÉVELOPPEMENT ET DESIGN · STAGE INTENSIF</small>
  <h1>Forge<br>Académie</h1>
  <a class="fo-b" href="#contact">Candidater</a>
  <div class="fo-info"><div><span>LIEU</span><b>Nantes / Lyon</b></div><div><span>DURÉE</span><b>8 semaines</b></div><div><span>MENTORS</span><b>5</b></div><div><span>COURS</span><b>4</b></div></div>
</section>` },
  { id: "atouts", html: `<section id="atouts" class="section hero-immersif fo-atouts" aria-labelledby="atouts-h">
  <style>
    #atouts { position: relative; overflow: hidden; isolation: isolate; padding: clamp(90px, 9vw, 130px) 24px clamp(120px, 12vw, 170px) !important; text-align: center; color: #fff; background: radial-gradient(ellipse 80% 40% at 50% 100%, rgb(244 192 78 / .75), transparent 60%), radial-gradient(ellipse 50% 40% at 0% 85%, rgb(20 150 140 / .95), transparent 65%), radial-gradient(ellipse 40% 40% at 100% 90%, rgb(170 220 60 / .6), transparent 60%), #070B0E !important; }
    #atouts::before { content: ""; position: absolute; inset: 0; z-index: -1; background: ${GRAIN}; mix-blend-mode: overlay; }
    #atouts .fo-et { font-size: 22px; } #atouts .fo-pil { display: inline-flex; gap: 6px; margin-top: 60px; padding: 5px 12px; border-radius: 999px; background: #1E2930; font-size: 11.5px; font-weight: 600; color: #fff; }
    #atouts h2 { margin: 22px auto 0; font-size: clamp(46px, 5vw, 66px); font-weight: 500; letter-spacing: -.035em; color: #fff; } #atouts > p { margin: 40px auto 0; max-width: 360px; font-size: 13px; line-height: 1.55; color: rgb(255 255 255 / .85); }
    #atouts .fo-g { position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; max-width: 1110px; margin: 130px auto 0; text-align: left; }
    #atouts article { position: relative; min-height: 350px; padding: 30px 32px; border-radius: 16px; border: 1px solid rgb(255 255 255 / .1); background: rgb(16 22 26 / .55); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
    #atouts h3 { margin: 0; font-size: 22px; font-weight: 500; line-height: 1.25; color: #fff; } #atouts article p { margin: 16px 0 0; font-size: 13px; line-height: 1.6; color: #A7B3B8; } #atouts article b { position: absolute; right: 30px; bottom: 26px; font-size: 26px; font-weight: 400; color: rgb(255 255 255 / .45); }
    #atouts .fo-cr { position: absolute; z-index: 2; pointer-events: none; } #atouts .k1 { left: -4%; bottom: -12%; width: 13%; } #atouts .k2 { left: 58%; bottom: -24%; width: 14%; } #atouts .k3 { right: -6%; bottom: -8%; width: 17%; }
    @media (max-width: 899px) { #atouts .fo-g { grid-template-columns: 1fr 1fr; } #atouts .fo-cr { display: none; } }
  </style>
  <span class="fo-et" aria-hidden="true">✦</span><br>
  <span class="fo-pil">⌁ En savoir plus sur nous</span>
  <h2 id="atouts-h">Et pour vous ?</h2>
  <p>Toutes les compétences pour lancer votre carrière, avec l'accompagnement de professionnels du métier.</p>
  <div class="fo-g">
    ${carte("Apprendre en faisant", "Chaque cours vous fait mener un vrai projet, de la première idée jusqu'aux tests.", "01")}
    ${carte("Des mentors experts", "Profitez de l'expérience de vos mentors et de retours concrets, tirés du terrain.", "02")}
    ${carte("Des compétences utiles partout", "L'académie vous donne des bases solides pour faire grandir votre carrière.", "03")}
    ${carte("Un vrai certificat", "À la fin, vous recevez un certificat qui atteste vos nouvelles compétences.", "04")}
    <img class="fo-cr k1" src="IMG_1" alt=""><img class="fo-cr k2" src="IMG_2" alt=""><img class="fo-cr k3" src="IMG_3" alt="">
  </div>
</section>` },
  { id: "cours", html: `<section id="cours" class="section fo-cours" aria-labelledby="cours-h">
  <style>
    #cours { padding: clamp(100px, 10vw, 140px) 24px !important; background: #070B0E !important; }
    #cours .fo-in { max-width: 1110px; margin: 0 auto; } #cours h2 { margin: 0 0 40px; font-size: clamp(56px, 6vw, 80px); font-weight: 500; letter-spacing: -.035em; color: #fff; }
    #cours ol { list-style: none; margin: 0; padding: 0; counter-reset: c; } #cours li { display: grid; grid-template-columns: 80px 1fr auto; gap: 20px; align-items: center; padding: 26px 0; border-top: 1px solid #1E2930; color: #fff; font-size: 22px; } #cours li::before { counter-increment: c; content: "0" counter(c); font-size: 14px; color: #A7B3B8; } #cours li span { font-size: 13px; color: #A7B3B8; }
  </style>
  <div class="fo-in"><h2 id="cours-h">Les cours</h2>
  <ol><li>Développement web<span>Lyon · 8 semaines</span></li><li>Design d'interface<span>Nantes · 8 semaines</span></li><li>Développement mobile<span>Lyon · 8 semaines</span></li><li>Tests et qualité<span>Nantes · 8 semaines</span></li></ol></div>
</section>` },
  { id: "contact", html: `<footer class="footer closing hero-immersif fo-contact" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding: clamp(70px, 7vw, 100px) 24px 28px !important; text-align: center; background: ${VAGUE("50% 120%")}, #070B0E !important; }
    #contact h2 { margin: 0 auto; font-size: clamp(36px, 4vw, 56px); font-weight: 500; letter-spacing: -.03em; color: #fff; } #contact a.fo-go { display: inline-block; margin-top: 30px; padding: 14px 30px; border-radius: 999px; background: #fff; color: #070B0E; text-decoration: none; }
    #contact .fo-pied { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; max-width: 1110px; margin: 90px auto 0; padding-top: 18px; border-top: 1px solid rgb(255 255 255 / .15); font-size: 12px; color: rgb(255 255 255 / .75); }
  </style>
  <h2 id="contact-h">Prochaine session en mars</h2><a class="fo-go" href="mailto:bonjour@forge-academie.fr">Candidater</a>
  <div class="fo-pied"><span>© Forge Académie · modèle de la bibliothèque Bingoo!</span><span>bonjour@forge-academie.fr</span></div>
</footer>` },
];
export const journal = ["Plan : hero, atouts, cours, contact"];
