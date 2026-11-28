// Modèle « Matière » (28 nov. 2026) : design repris d'une maquette de studio de création 3D par IA (page blanche quadrillée
// de filets fins, titre éditorial à gauche, texte et bouton à droite, rangée de pastilles, deux grandes images dont une
// noire, bloc partagé avec image 3D et liste numérotée, grande bande grise verre cannelé + objet 3D, dernières créations).
// Couleurs changées (orange vermillon au lieu du bleu électrique), textes et images originaux.
export const nom = "Matière";
export const slugBase = "matiere";
export const metier = "Studio de création 3D par IA";
export const design = {
  mode: "light", style: "Vermillon éditorial", source: "bibliotheque",
  polices: { titres: "Inter Tight", texte: "Inter" },
  couleurs: { background: "#FFFFFF", foreground: "#0C0C0C", primary: "#0C0C0C", on_primary: "#FFFFFF", card: "#F4F4F4", muted: "#F4F4F4", border: "#E3E3E3", muted_foreground: "#5C5C5C", accent: "#FF4D1A", secondary: "#F4F4F4", ring: "#FF4D1A", on_accent: "#FFFFFF" },
};
const O = "#FF4D1A";
const S3 = "3D render, studio lighting, high detail, no text, no logo";
export const images = [
  { id: "IMG_1", pour: "duo", taille: "portrait_4_3", prompt: `Abstract photograph through vertical ribbed fluted glass, a glowing sphere of orange, red and warm white light distorted into vertical stripes, soft grey surroundings, ${S3}.` },
  { id: "IMG_2", pour: "duo", taille: "portrait_4_3", prompt: `Bold glossy vermilion orange 3D ribbon shapes curving and folding in the upper part of the image, on a pure black background, the lower half empty black, ${S3}.` },
  { id: "IMG_3", pour: "atelier", taille: "portrait_4_3", prompt: `Abstract composition of translucent orange glass panels and soft rounded orange blobs refracted behind glass, pale pink and vermilion, ${S3}.` },
  { id: "IMG_4", pour: "atelier", taille: "square_hd", prompt: `A soft abstract orange sculpture shaped like a twisted vase next to a small glossy black sphere, on a pale pink floor against a pale pink wall, ${S3}.` },
  { id: "IMG_5", pour: "bande", taille: { width: 1920, height: 1088 }, prompt: `Composition on a soft grey gradient background: on the left a tall panel of vertical ribbed fluted glass with a thin orange beam of light behind it, on the right a large glossy vermilion orange sphere resting on a long orange rectangular block tilted diagonally, ${S3}.` },
  { id: "IMG_6", pour: "creations", taille: "landscape_4_3", prompt: `A small orange glossy 3D figure made of stacked spheres on a white pedestal against a white background, ${S3}.` },
  { id: "IMG_7", pour: "creations", taille: "landscape_4_3", prompt: `Flowing translucent orange glass ribbons twisting, soft light background, ${S3}.` },
  { id: "IMG_8", pour: "creations", taille: "landscape_4_3", prompt: `Two fuzzy textured orange spheres on a pale grey background, ${S3}.` },
];
export const nav = [{ mot: "Présentation", ancre: "hero" }, { mot: "Études de cas", ancre: "atelier" }];
const pil = (t) => `<span class="mt-pil">${t}</span>`;

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    .mt-pil { display: inline-block; padding: 5px 12px; border-radius: 999px; border: 1px solid #D5D5D5; font-size: 11px; color: #0C0C0C; background: #fff; }
    header.nav { background: #fff !important; border-bottom: 1px solid #E3E3E3 !important; }
    header.nav .nav__bar { position: relative; max-width: 1080px !important; padding: 6px 0 !important; min-height: 46px !important; }
    header.nav .nav__links { order: -1; gap: 28px !important; flex: none !important; } header.nav .nav__link { color: #0C0C0C !important; font-size: 10.5px; letter-spacing: .02em; } header.nav .nav__link small { color: #A0A0A0; margin-right: 6px; }
    header.nav .nav__logo { position: absolute; left: 50%; transform: translateX(-50%); font-size: 16px; font-weight: 600; letter-spacing: .06em; color: #0C0C0C !important; } header.nav .nav__logo span { color: ${O}; }
    header.nav .nav__actions { margin-left: auto; gap: 28px !important; } header.nav .mt-a { color: #0C0C0C; font-size: 10.5px; text-decoration: none; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero"><span>✦</span> MATIÈRE</a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#hero"><small>01.</small>PRÉSENTATION</a></div><div class="nav__item"><a class="nav__link" href="#atelier"><small>02.</small>ÉTUDES DE CAS</a></div></nav>
    <div class="nav__actions"><a class="mt-a" href="#contact">À PROPOS</a><a class="mt-a" href="#contact">COMMENCER ↗</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero mt-hero">
  <style>
    #hero { min-height: 0 !important; padding: 66px 0 0 !important; background: #fff !important; }
    #hero .mt-g { display: grid; grid-template-columns: 1.95fr 1fr; max-width: 1080px; margin: 0 auto; border-bottom: 1px solid #E3E3E3; }
    #hero h1 { margin: 0; padding: 34px 30px 34px 0; border-right: 1px solid #E3E3E3; font-weight: 400; font-size: clamp(38px, 4.2vw, 56px); line-height: 1.05; letter-spacing: -.055em; color: #0C0C0C; }
    #hero .mt-d { padding: 36px 0 0 30px; } #hero .mt-d p { margin: 0; max-width: 260px; font-size: 12px; line-height: 1.4; letter-spacing: -.01em; color: #0C0C0C; }
    #hero .mt-go { display: inline-block; margin-top: 18px; padding: 7px 14px; border-radius: 999px; background: #0C0C0C; color: #fff; font-size: 11px; text-decoration: none; }
    #hero .mt-bar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; max-width: 1080px; margin: 0 auto; padding: 30px 0; font-size: 9.5px; letter-spacing: .02em; color: #0C0C0C; } #hero .mt-bar span.g { color: #A0A0A0; }
    @media (max-width: 767px) { #hero .mt-g { grid-template-columns: 1fr; padding: 0 20px; } #hero h1 { border-right: 0; } #hero .mt-bar { padding: 20px; } }
  </style>
  <div class="mt-g"><h1>Créez sans limite :<br>une idée, mille possibles</h1><div class="mt-d"><p>Laissez parler votre créativité. Une seule idée suffit pour obtenir d'innombrables variantes et donner vie à votre projet plus vite que jamais.</p><a class="mt-go" href="#contact">Lancer ↗</a></div></div>
  <div class="mt-bar"><span>${pil("Modèle 3D")} ${pil("Motifs et textures")} ${pil("Plus +")}</span><span>SANS OUTILS. <span class="g">SANS LIMITES.</span> JUSTE CRÉER</span><span><span class="g">INSTANTANÉ</span> &nbsp;GÉNÉRATION D'IMAGES &nbsp;&nbsp;&nbsp;&nbsp; IDÉE +</span></div>
</section>` },
  { id: "duo", html: `<section id="duo" class="section mt-duo" aria-label="Exemples">
  <style>
    #duo { padding: 0 0 60px !important; background: #fff !important; border-bottom: 1px solid #E3E3E3; }
    #duo .mt-g { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; max-width: 1080px; margin: 0 auto; }
    #duo figure { position: relative; margin: 0; height: clamp(380px, 40vw, 540px); overflow: hidden; background: #000; } #duo figure img { width: 100%; height: 100%; object-fit: cover; display: block; }
    #duo figcaption { position: absolute; inset: 0; padding: 40px 30px 30px; display: flex; flex-direction: column; justify-content: space-between; color: #fff; }
    #duo h2 { margin: 0; font-size: clamp(20px, 1.8vw, 24px); font-weight: 400; letter-spacing: -.04em; line-height: 1.05; color: #fff; } #duo figure:first-child p { margin: 0; font-size: 12px; color: #fff; }
    #duo figure:last-child figcaption { justify-content: space-between; } #duo figure:last-child h2 { font-size: clamp(32px, 3.4vw, 46px); max-width: 13ch; } #duo .mt-ess { position: absolute; right: 30px; bottom: 44px; font-size: 9.5px; color: #fff; }
    @media (max-width: 767px) { #duo .mt-g { grid-template-columns: 1fr; } }
  </style>
  <div class="mt-g">
    <figure><img src="IMG_1" alt=""><figcaption><h2>Votre style,<br>reconnu et appliqué</h2><p>Des visuels dans votre propre style, ou dans une ambiance existante, grâce à l'IA.</p></figcaption></figure>
    <figure><img src="IMG_2" alt=""><figcaption><span>${pil("Croquis vers 3D")}</span><h2>Passez d'un croquis à un modèle 3D en un clic</h2></figcaption><span class="mt-ess">ESSAYER ↗</span></figure>
  </div>
</section>` },
  { id: "atelier", html: `<section id="atelier" class="section mt-atelier" aria-labelledby="atelier-h">
  <style>
    #atelier { padding: 0 !important; background: #fff !important; border-bottom: 1px solid #E3E3E3; }
    #atelier .mt-g { display: grid; grid-template-columns: 1fr 1fr; max-width: 1080px; margin: 0 auto; }
    #atelier .mt-t { padding: 90px 30px 60px 0; } #atelier .mt-t > span.mt-pil { font-size: 10px; } #atelier h2 { margin: 18px 0 0; padding-bottom: 60px; border-bottom: 1px solid #E3E3E3; font-size: clamp(32px, 3vw, 40px); font-weight: 400; letter-spacing: -.055em; line-height: 1.05; color: #0C0C0C; }
    #atelier .mt-t p { margin: 60px 0 0; max-width: 300px; font-size: 12px; line-height: 1.4; color: #0C0C0C; } #atelier .mt-go { display: inline-block; margin-top: 24px; padding: 7px 14px; border-radius: 999px; background: #0C0C0C; color: #fff; font-size: 11px; text-decoration: none; }
    #atelier .mt-d { position: relative; display: grid; grid-template-columns: 1.4fr 1fr; gap: 50px; padding: 90px 0 120px; border-left: 1px solid #E3E3E3; }
    #atelier .mt-v1 { position: relative; margin-left: -30%; height: 380px; clip-path: polygon(0 0, 100% 0, 100% 100%, 22% 100%, 0 80%); } #atelier .mt-v1 img { width: 100%; height: 100%; object-fit: cover; } #atelier .mt-v1 span { position: absolute; left: 22px; top: 6px; }
    #atelier ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; align-content: start; font-size: 9.5px; letter-spacing: .02em; } #atelier ol li span { color: #A0A0A0; margin-right: 10px; }
    #atelier .mt-v2 { position: relative; margin-top: 40px; height: 220px; clip-path: polygon(14% 0, 100% 0, 100% 100%, 0 100%, 0 12%); } #atelier .mt-v2 img { width: 100%; height: 100%; object-fit: cover; } #atelier .mt-v2 i { position: absolute; right: 10px; top: 10px; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: ${O}; color: #fff; font-style: normal; } #atelier .mt-v2 span.mt-pil { position: absolute; left: 12px; bottom: 12px; background: transparent; color: #fff; border-color: #fff; }
    @media (max-width: 899px) { #atelier .mt-g, #atelier .mt-d { grid-template-columns: 1fr; } #atelier .mt-v1 { margin-left: 0; } #atelier .mt-t { padding: 50px 20px; } }
  </style>
  <div class="mt-g">
    <div class="mt-t">${pil("Matière")}<h2 id="atelier-h">Une façon plus rapide<br>et plus maline de créer</h2><p>Une simple phrase suffit pour donner vie à une idée, gagner des heures de production et garder la main sur votre vision.</p><a class="mt-go" href="#contact">Lancer ↗</a></div>
    <div class="mt-d"><div class="mt-v1"><img src="IMG_3" alt=""><span class="mt-pil" style="background:transparent;color:#fff;border-color:#fff">Motifs et textures</span></div>
      <div><ol><li><span>01.</span>CRÉER UN MODÈLE 3D</li><li><span>02.</span>CONCEVOIR TEXTURES ET MOTIFS</li><li><span>03.</span>IMAGES HAUTE QUALITÉ</li></ol><div class="mt-v2"><img src="IMG_4" alt=""><i>↗</i><span class="mt-pil">Modèle 3D</span></div></div></div>
  </div>
</section>` },
  { id: "bande", html: `<section id="bande" class="section hero-immersif mt-bande" aria-labelledby="bande-h">
  <style>
    #bande { position: relative; overflow: hidden; isolation: isolate; height: clamp(520px, 50vw, 680px); padding: 0 !important; color: #fff; background: #9A9A9A !important; }
    #bande > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1; }
    #bande ul { list-style: none; position: absolute; left: 30px; top: 50px; margin: 0; padding: 0; font-size: 9.5px; letter-spacing: .02em; line-height: 2.4; color: rgb(255 255 255 / .8); } #bande ul span { margin-right: 10px; }
    #bande .mt-cs { position: absolute; right: 30px; top: 50px; margin: 0; text-align: right; font-size: clamp(20px, 1.8vw, 24px); font-weight: 300; letter-spacing: -.04em; line-height: 1.05; color: #fff; }
    #bande h2 { position: absolute; left: 30px; bottom: 50px; margin: 0; font-size: clamp(32px, 3.4vw, 46px); font-weight: 300; letter-spacing: -.055em; line-height: 1.05; color: #fff; }
    #bande .mt-r { position: absolute; right: 30px; bottom: 50px; margin: 0; max-width: 200px; text-align: right; font-size: 11px; color: #fff; }
  </style>
  <img src="IMG_5" alt="">
  <ul><li><span>01.</span>CRÉATION DE MODÈLES 3D</li><li><span>02.</span>CRÉATION DE MOTIFS ET TEXTURES</li></ul>
  <p class="mt-cs">Des visuels<br>sur mesure</p>
  <h2 id="bande-h">Ne le construisez pas.<br>Ne le dessinez pas. Dites-le.</h2>
  <p class="mt-r">Oubliez les banques d'images : créez exactement ce que vous imaginez.</p>
</section>` },
  { id: "contact", html: `<footer class="footer closing mt-contact" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding: 0 !important; background: #fff !important; }
    #contact .mt-tete { display: flex; justify-content: space-between; align-items: center; max-width: 1080px; margin: 0 auto; padding: 60px 0 40px; border-top: 1px solid #E3E3E3; }
    #contact h2 { margin: 0; font-size: clamp(32px, 3vw, 40px); font-weight: 400; letter-spacing: -.055em; color: #0C0C0C; }
    #contact .mt-g { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; max-width: 1080px; margin: 0 auto; } #contact .mt-g img { width: 100%; height: 260px; object-fit: cover; display: block; }
    #contact .mt-pied { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; max-width: 1080px; margin: 0 auto; padding: 30px 0; font-size: 10.5px; color: #5C5C5C; }
    @media (max-width: 767px) { #contact .mt-g { grid-template-columns: 1fr; } #contact .mt-tete, #contact .mt-pied { padding-inline: 20px; } }
  </style>
  <div class="mt-tete"><h2 id="contact-h">Dernières créations</h2><span>${pil("Modèle 3D")} ${pil("Motifs et textures")} ${pil("Plus +")}</span></div>
  <div class="mt-g"><img src="IMG_6" alt=""><img src="IMG_7" alt=""><img src="IMG_8" alt=""></div>
  <div class="mt-pied"><span>© Matière · modèle de la bibliothèque Bingoo!</span><span>bonjour@matiere.studio</span></div>
</footer>` },
];
export const journal = ["Plan : hero, duo, atelier, bande, contact"];
