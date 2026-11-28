// Modèle « Prisme » (28 nov. 2026) : design repris d'une maquette de SaaS (surtitre, grand titre à gauche dont la dernière
// ligne en couleur, deux boutons, avatars, panneaux de verre 3D à droite avec annotations à filets, rangée de clients,
// quatre cartes de fonctions, chiffres, application mobile tenue en main avec puces de verre, appel final).
// Couleurs changées (rose framboise sur fond poudré au lieu du bleu), textes originaux, clients inventés.
export const nom = "Prisme";
export const slugBase = "prisme";
export const metier = "Logiciel collaboratif";
export const design = {
  mode: "light", style: "Verre framboise", source: "bibliotheque",
  polices: { titres: "Inter Tight", texte: "Inter" },
  couleurs: { background: "#FFFAFB", foreground: "#17121A", primary: "#D6336C", on_primary: "#FFFFFF", card: "#FFFFFF", muted: "#FBEFF3", border: "#F1E1E7", muted_foreground: "#6A5F66", accent: "#D6336C", secondary: "#FBEFF3", ring: "#D6336C", on_accent: "#FFFFFF" },
};
const R = "#D6336C";
export const images = [
  { id: "IMG_1", pour: "hero", detourer: true, taille: "square_hd", prompt: "3D render of several tall thin rounded glass panels standing in a fanned diagonal row, frosted and clear glass with raspberry pink, fuchsia and soft rose tints, one panel with a small white four-square logo engraved, subtle dotted texture on some panels, soft studio light, isolated on a plain white background, no text." },
  { id: "IMG_2", pour: "mobile", taille: "landscape_4_3", prompt: "Photograph of a hand holding a modern smartphone with the screen facing the viewer, the index finger of the other hand touching the screen, the screen plain white, soft blush pink background with blurred frosted glass panels, studio light, photorealistic, no logo, no text." },
];
export const nav = [{ mot: "Produit", ancre: "fonctions" }, { mot: "Solutions", ancre: "fonctions" }, { mot: "Tarifs", ancre: "contact" }, { mot: "Ressources", ancre: "mobile" }];
const fn = (ic, t, p) => `<article><i>${ic}</i><h3>${t}</h3><p>${p}</p><a href="#contact">En savoir plus →</a></article>`;

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    header.nav { background: rgb(255 250 251 / .85) !important; border-bottom: 1px solid #F1E1E7 !important; }
    header.nav .nav__logo { display: inline-flex; align-items: center; gap: 9px; font-size: 19px; font-weight: 500; color: #17121A !important; } header.nav .nav__logo i { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; width: 22px; } header.nav .nav__logo i b { height: 10px; border-radius: 3px; background: ${R}; } header.nav .nav__logo i b:nth-child(2n) { opacity: .6; }
    header.nav .nav__links { justify-content: center; } header.nav .nav__link { color: #3A3238 !important; font-size: 13px; }
    header.nav .pr-in { color: #17121A; font-size: 13px; text-decoration: none; } header.nav .pr-go { padding: 9px 16px; border-radius: 8px; background: ${R}; color: #fff; font-size: 13px; text-decoration: none; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero"><i><b></b><b></b><b></b><b></b></i>Prisme</a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#fonctions">Produit</a></div><div class="nav__item"><a class="nav__link" href="#fonctions">Solutions</a></div><div class="nav__item"><a class="nav__link" href="#contact">Tarifs</a></div><div class="nav__item"><a class="nav__link" href="#mobile">Ressources</a></div></nav>
    <div class="nav__actions"><a class="pr-in" href="#contact">Connexion</a><a class="pr-go" href="#contact">Commencer →</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero pr-hero">
  <style>
    #hero { position: relative; overflow: hidden; min-height: 0 !important; padding: clamp(110px, 10vw, 130px) clamp(24px, 4vw, 64px) 60px !important; background: radial-gradient(ellipse 50% 60% at 75% 40%, #FBE1EA, transparent 70%), #FFFAFB !important; }
    #hero .pr-g { display: grid; grid-template-columns: 1fr 1.05fr; gap: 20px; align-items: center; max-width: 1240px; margin: 0 auto; }
    #hero small.pr-k { font-size: 10.5px; letter-spacing: .14em; color: #6A5F66; }
    #hero h1 { margin: 20px 0 0; font-weight: 500; font-size: clamp(52px, 6.4vw, 92px); line-height: .98; letter-spacing: -.045em; color: #17121A !important; -webkit-text-fill-color: #17121A; } #hero h1 span { color: ${R} !important; -webkit-text-fill-color: ${R}; }
    #hero .pr-g > div > p { margin: 26px 0 0; max-width: 380px; font-size: 16px; line-height: 1.5; color: #2A2329 !important; -webkit-text-fill-color: #2A2329; }
    #hero .pr-act { display: flex; gap: 12px; margin-top: 34px; } #hero .pr-act a { display: inline-flex; align-items: center; gap: 10px; padding: 13px 22px; border-radius: 8px; font-size: 14px; text-decoration: none; } #hero .pr-act a:first-child { background: ${R}; color: #fff !important; } #hero .pr-act a:last-child { border: 1px solid #E5D3DA; color: #17121A !important; background: #fff; }
    #hero .pr-av { display: flex; align-items: center; gap: 14px; margin-top: 60px; font-size: 12px; color: #3A3238; } #hero .pr-av span { display: flex; } #hero .pr-av i { width: 30px; height: 30px; margin-left: -8px; border-radius: 50%; border: 2px solid #fff; display: grid; place-items: center; font-style: normal; font-size: 10px; font-weight: 600; color: #fff; }
    #hero .pr-v { position: relative; } #hero .pr-v img { width: 100%; display: block; }
    #hero .pr-a { position: absolute; font-size: 12px; line-height: 1.5; color: #3A3238; } #hero .a1 { left: -6%; top: 8%; padding-left: 14px; border-left: 1px solid #C9B8BF; } #hero .a1::after { content: ""; display: block; width: 90px; height: 1px; margin-top: 10px; margin-left: -14px; background: #C9B8BF; } #hero .a2 { right: 2%; bottom: 4%; padding-left: 14px; border-left: 1px solid #C9B8BF; }
    @media (max-width: 899px) { #hero .pr-g { grid-template-columns: 1fr; } #hero .pr-a { display: none; } }
  </style>
  <div class="pr-g">
    <div><small class="pr-k">PENSÉ POUR UN TRAVAIL PLUS LUMINEUX</small>
      <h1>Des outils<br>malins pour<br><span>avancer vraiment</span></h1>
      <p>Prisme aide les équipes à concevoir, construire et livrer de meilleurs produits grâce à l'IA.</p>
      <div class="pr-act"><a href="#contact">Commencer →</a><a href="#mobile">▷ Voir la vidéo</a></div>
      <div class="pr-av"><span><i style="background:#E79AB4">CL</i><i style="background:#8E7BD8">HB</i><i style="background:#F2B880">MR</i><i style="background:#6FBFA4">SD</i></span>Adopté par plus de 50 000<br>équipes dans le monde</div></div>
    <div class="pr-v"><img src="IMG_1" alt=""><span class="pr-a a1">Idées<br>Produits<br>Croissance</span><span class="pr-a a2">De l'idée<br>à l'impact.</span></div>
  </div>
</section>` },
  { id: "clients", html: `<section id="clients" class="section pr-clients" aria-label="Clients">
  <style>
    #clients { padding: 34px 24px !important; background: #FFFAFB !important; border-top: 1px solid #F1E1E7; border-bottom: 1px solid #F1E1E7; }
    #clients .pr-r { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 20px 40px; max-width: 1180px; margin: 0 auto; font-size: 21px; font-weight: 500; color: #8A7E85; }
  </style>
  <div class="pr-r"><span>◎ Orage</span><span>❖ Figue</span><span>▣ Carnet</span><span>✦ Dune</span><span style="font-weight:700">strata</span><span style="font-style:italic;font-weight:700">◪ marché</span></div>
</section>` },
  { id: "fonctions", html: `<section id="fonctions" class="section pr-fonctions" aria-labelledby="fonctions-h">
  <style>
    #fonctions { padding: clamp(40px, 4vw, 56px) 24px !important; background: #FFFAFB !important; }
    #fonctions .pr-g { display: grid; grid-template-columns: 1fr repeat(3, 1fr); gap: 16px; max-width: 1180px; margin: 0 auto; align-items: stretch; }
    #fonctions h2 { margin: 30px 0 0; font-size: 28px; font-weight: 400; line-height: 1.1; letter-spacing: -.02em; color: #17121A; } #fonctions .pr-t p { margin: 18px 0 0; font-size: 13px; color: #6A5F66; } #fonctions .pr-t a, #fonctions article a { display: inline-block; margin-top: 24px; font-size: 13px; color: ${R}; text-decoration: none; }
    #fonctions article { padding: 24px; border-radius: 12px; background: #fff; border: 1px solid #F1E1E7; } #fonctions article i { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 10px; background: #FBE1EA; color: ${R}; font-style: normal; font-size: 18px; }
    #fonctions h3 { margin: 24px 0 8px; font-size: 19px; font-weight: 500; color: #17121A; } #fonctions article p { margin: 0; font-size: 13px; line-height: 1.5; color: #6A5F66; }
    #fonctions .pr-ch { display: grid; grid-template-columns: repeat(4, 1fr); max-width: 1180px; margin: 40px auto 0; padding: 30px 0; border-top: 1px solid #F1E1E7; }
    #fonctions .pr-ch div { padding-left: 24px; } #fonctions .pr-ch div + div { border-left: 1px solid #F1E1E7; } #fonctions .pr-ch b { display: block; font-size: 40px; font-weight: 500; letter-spacing: -.03em; color: #17121A; } #fonctions .pr-ch span { font-size: 14px; color: #3A3238; }
    @media (max-width: 899px) { #fonctions .pr-g, #fonctions .pr-ch { grid-template-columns: 1fr 1fr; } }
  </style>
  <div class="pr-g">
    <div class="pr-t"><h2 id="fonctions-h">Une façon plus<br>maline de travailler</h2><p>Tout ce qu'il faut pour transformer vos idées en résultats.</p><a href="#mobile">Toutes les fonctions →</a></div>
    ${fn("◈", "Concevoir vite", "Des écrans soignés en quelques minutes, avec l'aide de l'IA.")}
    ${fn("✦", "Construire malin", "Les tâches répétitives se font seules, vous gardez l'essentiel.")}
    ${fn("▮", "Grandir ensemble", "Des chiffres clairs pour avancer et décider en équipe.")}
  </div>
  <div class="pr-ch"><div><b>50K+</b><span>Équipes inscrites</span></div><div><b>3,2M</b><span>Projets créés</span></div><div><b>99,9 %</b><span>Disponibilité</span></div><div><b>150+</b><span>Pays</span></div></div>
</section>` },
  { id: "mobile", html: `<section id="mobile" class="section pr-mobile" aria-labelledby="mobile-h">
  <style>
    #mobile { padding: 0 24px !important; background: linear-gradient(180deg, #FFFAFB, #FBE9EF) !important; border-top: 1px solid #F1E1E7; }
    #mobile .pr-g { display: grid; grid-template-columns: .9fr 1.3fr; align-items: center; gap: 30px; max-width: 1180px; margin: 0 auto; }
    #mobile small { font-size: 10.5px; letter-spacing: .14em; color: #6A5F66; } #mobile h2 { margin: 20px 0 0; font-size: clamp(36px, 3.8vw, 50px); font-weight: 500; letter-spacing: -.035em; line-height: 1.05; color: #17121A; } #mobile h2 span { color: ${R}; }
    #mobile p { margin: 24px 0 0; max-width: 340px; font-size: 14.5px; line-height: 1.5; color: #3A3238; }
    #mobile .pr-st { display: flex; gap: 14px; margin-top: 34px; } #mobile .pr-st span { display: inline-flex; flex-direction: column; padding: 8px 18px; border-radius: 8px; background: #17121A; color: #fff; font-size: 17px; font-weight: 600; } #mobile .pr-st small { font-size: 8px; letter-spacing: .02em; color: #fff; font-weight: 400; }
    #mobile .pr-v { position: relative; } #mobile .pr-v img { width: 100%; display: block; -webkit-mask: linear-gradient(180deg, transparent, #000 10%); mask: linear-gradient(180deg, transparent, #000 10%); }
    #mobile .pr-ecran { position: absolute; left: 36%; top: 14%; width: 22%; padding: 10px; font-size: 9px; color: #17121A; transform: rotate(-6deg); } #mobile .pr-ecran b { display: block; margin: 10px 0 6px; font-size: 15px; } #mobile .pr-ecran i { display: block; height: 22px; margin-top: 6px; border-radius: 6px; background: #FBE1EA; }
    #mobile .pr-puce { position: absolute; display: flex; gap: 10px; align-items: center; padding: 12px 16px; border-radius: 12px; background: rgb(255 255 255 / .7); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); box-shadow: 0 10px 30px -10px rgb(214 51 108 / .3); font-size: 11.5px; color: #17121A; } #mobile .pr-puce i { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: ${R}; color: #fff; font-style: normal; } #mobile .pr-puce small { display: block; font-size: 9px; letter-spacing: 0; }
    #mobile .pr-note { position: absolute; right: 2%; top: 56%; font-size: 13px; color: #3A3238; }
    @media (max-width: 899px) { #mobile .pr-g { grid-template-columns: 1fr; padding-top: 50px; } #mobile .pr-ecran, #mobile .pr-puce, #mobile .pr-note { display: none; } }
  </style>
  <div class="pr-g">
    <div><small>APPLICATION MOBILE</small><h2 id="mobile-h">Votre espace<br><span>dans la main</span></h2><p>Restez efficace partout : l'application garde votre équipe, vos projets et vos idées à jour, même en déplacement.</p>
      <div class="pr-st"><span><small>Télécharger sur</small>iPhone</span><span><small>Disponible sur</small>Android</span></div></div>
    <div class="pr-v"><img src="IMG_2" alt="Une main tient un téléphone"><div class="pr-ecran" aria-hidden="true">▦ Prisme<b>Bonjour Léa</b>Aujourd'hui<i></i><i></i><i style="height:40px"></i></div>
      <span class="pr-puce" style="left:6%;top:42%"><i>◔</i><span>Concentration<small>L'essentiel d'abord</small></span></span><span class="pr-puce" style="right:8%;top:12%"><i>☁</i><span>Synchro<small>Sur tous vos appareils</small></span></span><span class="pr-note">Même puissance.<br>Plus de liberté.</span></div>
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing pr-contact" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding: clamp(60px, 6vw, 80px) 24px 28px !important; background: #FFFAFB !important; border-top: 1px solid #F1E1E7; }
    #contact .pr-g { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; align-items: end; max-width: 1180px; margin: 0 auto; }
    #contact small { font-size: 10.5px; letter-spacing: .14em; color: #6A5F66; } #contact h2 { margin: 18px 0 0; font-size: clamp(34px, 3.4vw, 46px); font-weight: 500; letter-spacing: -.035em; line-height: 1.05; color: #17121A; } #contact h2 span { color: ${R}; }
    #contact p { margin: 0 0 20px; font-size: 14px; color: #3A3238; } #contact .pr-act a { display: inline-block; padding: 12px 22px; border-radius: 8px; font-size: 14px; text-decoration: none; margin-right: 10px; } #contact .pr-act a:first-child { background: ${R}; color: #fff; } #contact .pr-act a:last-child { border: 1px solid #E5D3DA; color: #17121A; }
    #contact .pr-pied { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; max-width: 1180px; margin: 50px auto 0; padding-top: 18px; border-top: 1px solid #F1E1E7; font-size: 12px; color: #6A5F66; }
    @media (max-width: 767px) { #contact .pr-g { grid-template-columns: 1fr; } }
  </style>
  <div class="pr-g"><div><small>PRÊT À COMMENCER ?</small><h2 id="contact-h">Changez vos idées<br>en <span>prochaine étape</span></h2></div>
  <div><p>Rejoignez des milliers d'équipes qui construisent déjà demain avec Prisme.</p><div class="pr-act"><a href="mailto:bonjour@prisme.app">Commencer →</a><a href="mailto:bonjour@prisme.app">Contacter l'équipe</a></div></div></div>
  <div class="pr-pied"><span>© Prisme · modèle de la bibliothèque Bingoo!</span><span>bonjour@prisme.app</span></div>
</footer>` },
];
export const journal = ["Plan : hero, clients, fonctions, mobile, contact"];
