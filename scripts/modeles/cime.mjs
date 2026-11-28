// Modèle « Cime » (28 nov. 2026) : design repris d'une maquette de SaaS (collines en photo plein écran, menu sobre, pastille,
// grand titre centré sur deux lignes, deux boutons, tableau de bord clair posé sur les collines). Couleurs changées
// (collines dorées au couchant et bleu canard au lieu de vert et orange), textes originaux.
export const nom = "Cime";
export const slugBase = "cime";
export const metier = "Logiciel de gestion pour PME";
export const design = {
  mode: "light", style: "Collines dorées", source: "bibliotheque",
  polices: { titres: "Fraunces", texte: "Inter" },
  couleurs: { background: "#FBF7F0", foreground: "#1D1A16", primary: "#0F6E74", on_primary: "#FFFFFF", card: "#FFFFFF", muted: "#F3ECE0", border: "#E8DFD0", muted_foreground: "#6D655A", accent: "#0F6E74", secondary: "#F3ECE0", ring: "#0F6E74", on_accent: "#FFFFFF" },
};
const T = "#0F6E74";
const kpi = (t, v, c) => `<div class="ci-k"><small>${t}</small><b>${v}</b><i style="color:${c}">${c === T ? "▲ 12 %" : "▼ 3 %"}</i></div>`;
export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1920, height: 1088 }, prompt: "Landscape photograph of soft rolling hills covered in golden wheat and dry grass at sunset, a few round trees on the crests, warm hazy peach and amber sky, gentle light, calm and wide, the upper half of the image mostly soft sky, photorealistic, no people, no buildings, no text." },
];
export const nav = [{ mot: "Fonctions", ancre: "fonctions" }, { mot: "Tarifs", ancre: "contact" }, { mot: "Solutions", ancre: "fonctions" }, { mot: "Blog", ancre: "contact" }];

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    header.nav { background: transparent !important; border: 0 !important; }
    header.nav .nav__logo { font-family: Fraunces, serif; font-weight: 600; font-size: 20px; color: #1D1A16 !important; }
    header.nav .nav__links { justify-content: center; } header.nav .nav__link { color: #1D1A16 !important; font-size: 14px; }
    header.nav .ci-go { padding: 9px 18px; border-radius: 10px; background: #1D1A16; color: #fff; font-size: 14px; text-decoration: none; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero">Cime</a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#fonctions">Fonctions</a></div><div class="nav__item"><a class="nav__link" href="#contact">Tarifs</a></div><div class="nav__item"><a class="nav__link" href="#fonctions">Solutions</a></div><div class="nav__item"><a class="nav__link" href="#contact">Blog</a></div></nav>
    <div class="nav__actions"><a class="ci-go" href="#contact">Démarrer</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero ci-hero s-clair">
  <style>
    #hero { position: relative; overflow: hidden; isolation: isolate; min-height: 0 !important; padding: clamp(120px, 12vw, 150px) 24px 0 !important; text-align: center; background: #FBF7F0 !important; }
    #hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
    #hero::after { display: none !important; } #hero > img { z-index: 0 !important; opacity: 1 !important; } #hero > :not(img) { position: relative; z-index: 1; } #hero h1, #hero > p { color: #1D1A16 !important; opacity: 1 !important; mix-blend-mode: normal !important; -webkit-text-fill-color: #1D1A16; } #hero > p { color: #3B352D !important; -webkit-text-fill-color: #3B352D; } #hero::before { z-index: 0 !important; }
    #hero::before { content: ""; position: absolute; inset: 0 0 auto; height: 55%; z-index: -1; background: linear-gradient(180deg, rgb(251 247 240 / .75), transparent); }
    #hero .ci-pas { display: inline-flex; align-items: center; gap: 8px; padding: 5px 12px; border-radius: 999px; background: rgb(255 255 255 / .7); font-size: 12px; color: #1D1A16; } #hero .ci-pas i { width: 7px; height: 7px; border-radius: 50%; background: ${T}; }
    #hero h1 { margin: 18px auto 0; max-width: none; font-family: Fraunces, serif; font-weight: 600; font-size: clamp(40px, 4.8vw, 68px); line-height: 1.05; letter-spacing: -.03em; color: #1D1A16; }
    #hero p { margin: 18px auto 0; max-width: 440px; font-size: 15px; color: #3B352D; }
    #hero .ci-act { display: flex; justify-content: center; gap: 10px; margin-top: 26px; } #hero .ci-act a { padding: 11px 20px; border-radius: 10px; font-size: 14px; text-decoration: none; } #hero .ci-act a:first-child { background: #1D1A16; color: #fff !important; } #hero .ci-act a:last-child { background: #fff !important; color: #1D1A16 !important; }
    #hero .ci-app { max-width: 920px; margin: 56px auto 0; padding: 18px; border-radius: 18px 18px 0 0; background: rgb(255 255 255 / .92); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); box-shadow: 0 -10px 50px rgb(60 40 10 / .18); text-align: left; }
    #hero .ci-hd { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; color: #1D1A16; } #hero .ci-hd span { font-weight: 400; font-size: 11px; color: #6D655A; }
    #hero .ci-ks { display: grid; grid-template-columns: repeat(3, 1fr) 1.1fr; gap: 10px; margin-top: 14px; }
    #hero .ci-k { padding: 12px; border-radius: 12px; border: 1px solid #E8DFD0; } #hero .ci-k small { display: block; font-size: 10.5px; color: #6D655A; } #hero .ci-k b { display: block; margin: 6px 0 2px; font-size: 19px; color: #1D1A16; } #hero .ci-k i { font-style: normal; font-size: 10px; }
    #hero .ci-k.on { background: ${T}; border-color: ${T}; } #hero .ci-k.on small, #hero .ci-k.on b, #hero .ci-k.on i { color: #fff !important; }
    #hero .ci-g { display: grid; grid-template-columns: 2fr 1fr; gap: 10px; margin-top: 10px; } #hero .ci-p { padding: 12px; border-radius: 12px; border: 1px solid #E8DFD0; font-size: 11px; color: #6D655A; }
    #hero .ci-p svg { display: block; width: 100%; height: 120px; margin-top: 8px; }
    #hero .ci-donut { display: grid; place-items: center; } #hero .ci-donut svg { width: 120px; height: 120px; }
    @media (max-width: 767px) { #hero .ci-ks { grid-template-columns: 1fr 1fr; } #hero .ci-g { grid-template-columns: 1fr; } }
  </style>
  <img src="IMG_1" alt="">
  <span class="ci-pas"><i></i>Élu meilleur outil de gestion 2026</span>
  <h1>Nous construisons ce que<br>votre entreprise devient</h1>
  <p>Factures, clients, stocks et chiffres réunis dans un seul outil, simple à prendre en main.</p>
  <div class="ci-act"><a href="#contact">Démarrer</a><a href="#fonctions">Voir la vidéo</a></div>
  <div class="ci-app" aria-label="Aperçu du tableau de bord">
    <div class="ci-hd">Tableau de bord<span>Novembre 2026 ▾</span></div>
    <div class="ci-ks">${kpi("Chiffre d'affaires", "32 400 €", T)}${kpi("Factures payées", "128", T)}${kpi("En attente", "4 180 €", "#B4532A")}<div class="ci-k on"><small>Objectif du mois</small><b>86 %</b><i>Encore 4 jours</i></div></div>
    <div class="ci-g">
      <div class="ci-p">Ventes de l'année<svg viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 95C40 90 60 70 100 74s60-30 100-26 60 22 100-4 70-30 100-36" stroke="${T}" stroke-width="2.5" fill="none"/><path d="M0 105C40 102 70 92 110 95s60-16 100-12 70 10 100-6 60-14 90-18" stroke="#E2A04A" stroke-width="2" fill="none" stroke-dasharray="4 4"/></svg></div>
      <div class="ci-p ci-donut">Répartition<svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="15.9" fill="none" stroke="#F3ECE0" stroke-width="6"/><circle cx="21" cy="21" r="15.9" fill="none" stroke="${T}" stroke-width="6" stroke-dasharray="58 42" stroke-dashoffset="25"/><circle cx="21" cy="21" r="15.9" fill="none" stroke="#E2A04A" stroke-width="6" stroke-dasharray="24 76" stroke-dashoffset="67"/></svg></div>
    </div>
  </div>
</section>` },
  { id: "fonctions", html: `<section id="fonctions" class="section ci-fonctions" aria-labelledby="fonctions-h">
  <style>
    #fonctions { padding: clamp(72px, 7vw, 110px) 24px !important; background: #FBF7F0 !important; text-align: center; }
    #fonctions h2 { margin: 0 auto; max-width: 18ch; font-family: Fraunces, serif; font-size: clamp(30px, 3vw, 44px); font-weight: 600; letter-spacing: -.02em; line-height: 1.1; color: #1D1A16; }
    #fonctions .ci-g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; max-width: 1080px; margin: 44px auto 0; text-align: left; }
    #fonctions article { padding: 26px; border-radius: 18px; background: #fff; border: 1px solid #E8DFD0; } #fonctions article span { display: inline-grid; place-items: center; width: 40px; height: 40px; border-radius: 10px; background: #E3F0F0; color: ${T}; font-weight: 700; }
    #fonctions h3 { margin: 22px 0 8px; font-size: 19px; color: #1D1A16; } #fonctions p { margin: 0; font-size: 14.5px; line-height: 1.6; color: #6D655A; }
    @media (max-width: 899px) { #fonctions .ci-g { grid-template-columns: 1fr; } }
  </style>
  <h2 id="fonctions-h">Tout ce qu'il faut pour gérer sereinement</h2>
  <div class="ci-g">
    <article><span>€</span><h3>Factures en 1 clic</h3><p>Créez, envoyez et relancez vos factures sans quitter l'outil.</p></article>
    <article><span>◎</span><h3>Clients au même endroit</h3><p>Chaque échange, devis et paiement rangé dans la fiche du client.</p></article>
    <article><span>↗</span><h3>Chiffres en direct</h3><p>Votre trésorerie et vos ventes à jour, chaque matin.</p></article>
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing ci-contact" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding: 0 24px 24px !important; background: #FBF7F0 !important; }
    #contact .ci-b { max-width: 1080px; margin: 0 auto; padding: clamp(56px, 6vw, 80px) 24px 28px; border-radius: 24px; background: ${T}; text-align: center; color: #fff; }
    #contact h2 { margin: 0 auto; font-family: Fraunces, serif; font-size: clamp(30px, 3.2vw, 46px); font-weight: 600; color: #fff; } #contact p { margin: 12px auto 0; color: rgb(255 255 255 / .85); }
    #contact a.ci-go { display: inline-block; margin-top: 26px; padding: 12px 24px; border-radius: 10px; background: #fff; color: #1D1A16; text-decoration: none; }
    #contact .ci-pied { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-top: 60px; padding-top: 18px; border-top: 1px solid rgb(255 255 255 / .2); font-size: 12.5px; color: rgb(255 255 255 / .75); }
  </style>
  <div class="ci-b"><h2 id="contact-h">Essayez Cime gratuitement</h2><p>14 jours offerts, sans carte bancaire.</p><a class="ci-go" href="mailto:bonjour@cime.app">Démarrer</a>
  <div class="ci-pied"><span>© Cime · modèle de la bibliothèque Bingoo!</span><span>bonjour@cime.app</span></div></div>
</footer>` },
];
export const journal = ["Plan : hero, fonctions, contact"];
