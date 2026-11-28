// Modèle « Cadran » (28 nov. 2026) : recopie d'une maquette d'agence marketing (menu en pilule flottante, premier écran
// nuit qui vire au violet puis au blanc, titre mi-droit mi-italique, cloche 3D, barres translucides à droite, rangée de
// clients, cartes de résultats). Nom, textes et images originaux ; les logos clients sont des noms inventés.
export const nom = "Cadran";
export const slugBase = "cadran";
export const metier = "Agence marketing";
export const design = {
  mode: "light", style: "Nuit violette", source: "bibliotheque",
  polices: { titres: "Inter Tight", texte: "Inter" },
  couleurs: { background: "#FFFFFF", foreground: "#14152B", primary: "#4A3FE0", on_primary: "#FFFFFF", card: "#F1F2FD", muted: "#F1F2FD", border: "#E3E4F4", muted_foreground: "#5D5F7A", accent: "#4A3FE0", secondary: "#F1F2FD", ring: "#4A3FE0", on_accent: "#FFFFFF" },
};
const SERIF = '"Instrument Serif", "Playfair Display", Georgia, serif';
const FONT = `@import url("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap");`;
const BLEU = "#4A3FE0";
const fleche = (fond, trait) => `<i class="cd-rond" style="background:${fond}"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5" stroke="${trait}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></i>`;
export const images = [
  { id: "IMG_1", pour: "hero", detourer: true, taille: "square_hd", prompt: "3D render of a glossy cute notification bell icon, iridescent gradient from hot pink and orange to violet and royal blue, a small white glossy ball as the clapper at the bottom and two small white spheres on the top ring, soft studio lighting, slightly tilted, isolated on a pure white background, nothing else, no text." },
  { id: "IMG_2", pour: "realisations", taille: "landscape_4_3", prompt: "Photograph of a bright modern creative agency meeting room, a small team around a light wood table with laptops and printed charts, large window, soft daylight, violet accents, candid, faces not in focus, photorealistic, no text, no logo." },
  { id: "IMG_3", pour: "realisations", taille: "landscape_4_3", prompt: "Photograph of a hand holding a smartphone showing a colourful abstract violet and blue social media post, blurred cafe background, soft light, photorealistic, no readable text, no logo." },
];
export const nav = [{ mot: "Agence", ancre: "resultats" }, { mot: "Services", ancre: "services" }, { mot: "Réalisations", ancre: "realisations" }, { mot: "Tarifs", ancre: "contact" }];

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    .cd-rond { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; flex: none; } .cd-rond svg { width: 15px; height: 15px; }
    header.nav { top: 18px !important; left: 50% !important; right: auto !important; transform: translateX(-50%); width: min(760px, calc(100% - 32px)) !important; background: rgb(38 40 66 / .72) !important; -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); border: 1px solid rgb(255 255 255 / .08) !important; border-radius: 22px; }
    header.nav .nav__bar { max-width: none !important; padding: 8px 8px 8px 16px !important; min-height: 0 !important; }
    header.nav .nav__logo { display: inline-flex; align-items: center; gap: 10px; color: #fff !important; font-weight: 600; font-size: 18px; letter-spacing: -.02em; }
    header.nav .cd-logo { width: 26px; height: 26px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #F4B5FF, #B45CF0 55%, #7A3BE0); display: grid; place-items: center; color: #fff; font-size: 17px; font-weight: 400; }
    header.nav .nav__link { color: #fff !important; font-size: 13.5px; }
    header.nav .cd-cta { display: inline-flex; align-items: center; gap: 12px; padding: 6px 6px 6px 20px; border-radius: 16px; background: rgb(255 255 255 / .14); color: #fff; font-size: 14px; text-decoration: none; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero"><span class="cd-logo" aria-hidden="true">+</span>Cadran</a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#resultats">Agence</a></div><div class="nav__item"><a class="nav__link" href="#services">Services</a></div><div class="nav__item"><a class="nav__link" href="#realisations">Réalisations</a></div><div class="nav__item"><a class="nav__link" href="#contact">Tarifs</a></div></nav>
    <div class="nav__actions"><a class="cd-cta" href="#contact">Parlons-en ${fleche("#fff", "#14152B")}</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif cd-hero">
  <style>
    ${FONT}
    #hero { position: relative; overflow: hidden; isolation: isolate; min-height: 0 !important; padding: clamp(150px, 17vw, 200px) 24px clamp(150px, 14vw, 190px) !important; text-align: center; color: #fff;
      background: radial-gradient(ellipse 70% 38% at 50% 58%, #4F44E8 0%, rgb(79 68 232 / .55) 45%, transparent 75%), linear-gradient(180deg, #090A18 0%, #0D0E26 26%, #2C2690 50%, #6F67E6 66%, #C9C7F5 82%, #F3F3FC 100%) !important; }
    #hero::before { content: ""; position: absolute; inset: 0; z-index: -1; background: radial-gradient(ellipse 30% 60% at 0% 40%, rgb(9 10 24 / .55), transparent), radial-gradient(ellipse 30% 60% at 100% 40%, rgb(9 10 24 / .55), transparent); }
    #hero .cd-barres { position: absolute; right: 0; top: 28%; bottom: 0; width: 18%; z-index: -1; display: flex; }
    #hero .cd-barres i { flex: 1; background: linear-gradient(180deg, rgb(255 255 255 / .1), rgb(255 255 255 / .28)); border-left: 1px solid rgb(255 255 255 / .12); } #hero .cd-barres i:nth-child(2n) { opacity: .6; }
    #hero h1 { margin: 0 auto; font-family: "Inter Tight", Inter, sans-serif; font-weight: 500; font-size: clamp(46px, 6.6vw, 96px); line-height: 1.04; letter-spacing: -.045em; color: #fff; max-width: 15ch; }
    #hero h1 em { font-family: ${SERIF}; font-style: italic; font-weight: 400; letter-spacing: -.03em; font-size: 1.08em; }
    #hero p { margin: 30px auto 0; max-width: 520px; font-size: 16px; color: rgb(255 255 255 / .86); }
    #hero .cd-actions { position: relative; display: inline-flex; align-items: center; gap: 26px; margin-top: 34px; }
    #hero .cd-btn { display: inline-flex; align-items: center; gap: 14px; padding: 8px 8px 8px 22px; border-radius: 999px; background: #fff; color: #14152B; font-size: 15px; text-decoration: none; }
    #hero .cd-lien { display: inline-flex; align-items: center; gap: 8px; color: #fff; font-size: 15px; text-decoration: none; } #hero .cd-lien svg { width: 14px; }
    #hero .cd-courbe { position: absolute; right: calc(100% + 18px); top: -6px; width: 74px; }
    #hero .cd-cloche { position: absolute; right: 13%; top: 52%; width: clamp(90px, 9vw, 130px); transform: rotate(-12deg); filter: drop-shadow(0 18px 30px rgb(40 20 120 / .35)); }
    @media (max-width: 767px) { #hero .cd-barres, #hero .cd-courbe { display: none; } #hero .cd-cloche { right: 4%; top: auto; bottom: 30px; width: 70px; } #hero .cd-actions { flex-direction: column; } }
  </style>
  <span class="cd-barres" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
  <h1>Un marketing qui <em>fait bouger</em> les lignes</h1>
  <p>Chaque campagne est pensée pour des résultats, pas pour faire joli.</p>
  <div class="cd-actions">
    <svg class="cd-courbe" viewBox="0 0 80 50" fill="none" aria-hidden="true"><path d="M2 48C10 24 34 10 70 12M62 4l9 8-10 7" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <a class="cd-btn" href="#contact">Parlons-en ${fleche("#14152B", "#fff")}</a>
    <a class="cd-lien" href="#contact">Réserver un appel <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 12 12 4M5.5 4H12v6.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg></a>
  </div>
  <img class="cd-cloche" src="IMG_1" alt="">
</section>` },
  { id: "clients", html: `<section id="clients" class="section cd-clients" aria-label="Ils nous font confiance">
  <style>
    #clients { padding: clamp(48px, 5vw, 64px) 24px 24px !important; background: #fff !important; text-align: center; }
    #clients p { margin: 0 0 34px; font-size: 16px; color: #14152B; }
    #clients .cd-rang { display: flex; flex-wrap: wrap; justify-content: space-around; align-items: center; gap: 28px 40px; max-width: 1180px; margin: 0 auto; color: ${BLEU}; }
    #clients .cd-rang span { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 17px; letter-spacing: -.01em; } #clients svg { width: 24px; height: 24px; }
  </style>
  <p>Plus de 100 entreprises nous confient leur présence en ligne.</p>
  <div class="cd-rang">
    <span><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2 22 20H2Z"/></svg>VERTIGE</span>
    <span style="font-style:italic;font-weight:900;font-size:21px">Kolo</span>
    <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M7 12h10"/></svg>Brise</span>
    <span><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>MAILLE</span>
    <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M4 18c4-10 12-10 16 0"/></svg>arcade</span>
    <span><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="3"/><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/></svg>Trio</span>
  </div>
</section>` },
  { id: "resultats", html: `<section id="resultats" class="section cd-resultats" aria-label="Résultats">
  <style>
    #resultats { padding: clamp(40px, 4vw, 56px) 24px !important; background: #fff !important; }
    #resultats .cd-g { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; max-width: 1180px; margin: 0 auto; width: 100%; }
    #resultats .cd-c { position: relative; overflow: hidden; border-radius: 34px; padding: clamp(40px, 5vw, 60px) clamp(24px, 4vw, 48px); background: #EEF0FC; min-height: 340px; }
    #resultats .cd-c1 { background: linear-gradient(115deg, #E6E9FB, #C3D2FB); display: grid; place-items: center; }
    #resultats .cd-carte { position: relative; width: min(450px, 100%); padding: 26px 24px; border-radius: 18px; background: linear-gradient(180deg, #fff, #F3F5FE); box-shadow: 0 30px 50px -20px rgb(60 70 160 / .3), 0 -14px 0 -6px rgb(255 255 255 / .55); }
    #resultats .cd-carte small { font-size: 13px; color: #14152B; } #resultats .cd-carte b { display: block; margin: 6px 0 18px; font-size: 38px; font-weight: 500; letter-spacing: -.03em; color: #14152B; } #resultats .cd-carte b sup { font-size: 16px; vertical-align: baseline; margin-left: 4px; }
    #resultats .cd-carte svg { width: 100%; height: 90px; display: block; }
    #resultats .cd-pastille { width: 46px; height: 46px; border-radius: 50%; background: radial-gradient(circle, #fff 18%, #DCE0FA 20%, #DCE0FA 34%, #E9ECFD 36%); box-shadow: 0 0 0 8px rgb(255 255 255 / .5); }
    #resultats .cd-c2 h3 { margin: 46px 0 10px; font-size: 24px; font-weight: 500; letter-spacing: -.02em; color: #14152B; } #resultats .cd-c2 p { margin: 0; font-size: 15px; line-height: 1.6; color: #5D5F7A; }
    #resultats .cd-c2 ul { list-style: none; margin: 26px 0 0; padding: 0; display: grid; gap: 10px; } #resultats .cd-c2 li { display: flex; justify-content: space-between; padding: 12px 16px; border-radius: 14px; background: #fff; font-size: 14px; color: #14152B; } #resultats .cd-c2 li b { color: ${BLEU}; font-weight: 600; }
    @media (max-width: 899px) { #resultats .cd-g { grid-template-columns: 1fr; } }
  </style>
  <div class="cd-g">
    <div class="cd-c cd-c1"><div class="cd-carte"><small>Croissance du chiffre d'affaires</small><b>99<sup>%</sup></b>
      <svg viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="cd-aire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BLEU}" stop-opacity=".28"/><stop offset="1" stop-color="${BLEU}" stop-opacity="0"/></linearGradient></defs><path d="M0 78C40 74 60 60 100 62s70-20 110-24 60 8 100-14 60-18 90-20V90H0Z" fill="url(#cd-aire)"/><path d="M0 78C40 74 60 60 100 62s70-20 110-24 60 8 100-14 60-18 90-20" stroke="${BLEU}" stroke-width="2.5" fill="none"/></svg></div></div>
    <div class="cd-c cd-c2"><span class="cd-pastille" aria-hidden="true"></span><h3>Des campagnes qui rapportent</h3><p>On mesure tout, chaque semaine, et on coupe ce qui ne marche pas.</p><ul><li>Coût par client<b>−38 %</b></li><li>Taux de clic<b>×2,4</b></li></ul></div>
  </div>
</section>` },
  { id: "services", html: `<section id="services" class="section cd-services" aria-labelledby="services-h">
  <style>
    #services { padding: clamp(56px, 6vw, 88px) 24px !important; background: #fff !important; }
    #services .cd-in { max-width: 1180px; margin: 0 auto; width: 100%; }
    #services h2 { margin: 0 0 40px; font-size: clamp(32px, 3.6vw, 52px); font-weight: 500; letter-spacing: -.04em; line-height: 1.05; color: #14152B; } #services h2 em { font-family: ${SERIF}; font-weight: 400; }
    #services .cd-g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    #services article { padding: 30px 28px; border-radius: 28px; background: #F1F2FD; } #services article:nth-child(2) { background: #14152B; color: #fff; }
    #services article span { display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; background: ${BLEU}; color: #fff; font-weight: 600; }
    #services h3 { margin: 40px 0 10px; font-size: 21px; font-weight: 500; letter-spacing: -.02em; color: inherit; } #services p { margin: 0; font-size: 15px; line-height: 1.6; color: #5D5F7A; } #services article:nth-child(2) p { color: rgb(255 255 255 / .7); }
    @media (max-width: 899px) { #services .cd-g { grid-template-columns: 1fr; } }
  </style>
  <div class="cd-in"><h2 id="services-h">Trois métiers, <em>un seul</em> objectif</h2>
  <div class="cd-g">
    <article><span>01</span><h3>Publicité en ligne</h3><p>Des annonces sur les bons réseaux, réglées chaque semaine pour baisser le coût de chaque client.</p></article>
    <article><span>02</span><h3>Réseaux sociaux</h3><p>Un calendrier, des visuels et des vidéos courtes qui donnent envie de vous suivre.</p></article>
    <article><span>03</span><h3>Site et référencement</h3><p>Un site rapide qui ressort sur Google et transforme les visites en demandes.</p></article>
  </div></div>
</section>` },
  { id: "realisations", html: `<section id="realisations" class="section cd-realisations" aria-labelledby="realisations-h">
  <style>
    #realisations { padding: 0 24px clamp(56px, 6vw, 88px) !important; background: #fff !important; }
    #realisations .cd-in { max-width: 1180px; margin: 0 auto; width: 100%; }
    #realisations h2 { margin: 0 0 28px; font-size: clamp(28px, 2.8vw, 40px); font-weight: 500; letter-spacing: -.04em; color: #14152B; }
    #realisations .cd-g { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; }
    #realisations figure { position: relative; margin: 0; border-radius: 28px; overflow: hidden; aspect-ratio: 1.45; } #realisations img { width: 100%; height: 100%; object-fit: cover; display: block; }
    #realisations figcaption { position: absolute; left: 18px; bottom: 18px; padding: 10px 16px; border-radius: 14px; background: rgb(255 255 255 / .9); font-size: 14px; color: #14152B; } #realisations figcaption b { color: ${BLEU}; }
    @media (max-width: 899px) { #realisations .cd-g { grid-template-columns: 1fr; } }
  </style>
  <div class="cd-in"><h2 id="realisations-h">Réalisations récentes</h2>
  <div class="cd-g">
    <figure><img src="IMG_2" alt="Une équipe autour d'une table, en atelier de travail"><figcaption>Maison Orée · <b>+120 % de demandes</b></figcaption></figure>
    <figure><img src="IMG_3" alt="Une publication colorée sur un téléphone"><figcaption>Atelier Sève · <b>48 000 vues</b></figcaption></figure>
  </div></div>
</section>` },
  { id: "contact", html: `<footer class="footer closing cd-contact" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding: 24px !important; background: #fff !important; }
    #contact .cd-bloc { position: relative; overflow: hidden; max-width: 1180px; margin: 0 auto; padding: clamp(64px, 7vw, 100px) 24px 40px; border-radius: 34px; text-align: center; color: #fff;
      background: radial-gradient(ellipse 60% 70% at 50% 110%, #5A50F0, transparent 70%), #0D0E26; }
    #contact h2 { margin: 0 auto; max-width: 16ch; font-size: clamp(34px, 4.4vw, 64px); font-weight: 500; letter-spacing: -.045em; line-height: 1.05; color: #fff; } #contact h2 em { font-family: ${SERIF}; font-weight: 400; }
    #contact .cd-btn { display: inline-flex; align-items: center; gap: 14px; margin-top: 34px; padding: 8px 8px 8px 22px; border-radius: 999px; background: #fff; color: #14152B; font-size: 15px; text-decoration: none; }
    #contact .cd-bas { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 14px; margin-top: clamp(60px, 7vw, 96px); padding-top: 22px; border-top: 1px solid rgb(255 255 255 / .14); font-size: 13px; color: rgb(255 255 255 / .7); } #contact .cd-bas a { color: inherit; text-decoration: none; margin-left: 22px; }
  </style>
  <div class="cd-bloc">
    <h2 id="contact-h">Prêt à <em>faire bouger</em> vos chiffres ?</h2>
    <a class="cd-btn" href="mailto:bonjour@cadran.fr">Parlons-en ${fleche("#14152B", "#fff")}</a>
    <div class="cd-bas"><span>© Cadran · modèle de la bibliothèque Bingoo!</span><span>bonjour@cadran.fr<a href="#services">Services</a><a href="#realisations">Réalisations</a></span></div>
  </div>
</footer>` },
];
export const journal = ["Plan : hero, clients, resultats, services, realisations, contact"];
