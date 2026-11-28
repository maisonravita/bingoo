// Modèle « Un pas » (28 nov. 2026) : design repris d'une maquette d'application de tâches (bandeau d'annonce, fond dégradé
// qui finit en arc lumineux, titre géant avec deux objets 3D, rangée de clients, trois cartes à icône blanche, interface
// en perspective). Couleurs changées (vert émeraude et menthe au lieu du violet), textes originaux, clients inventés.
export const nom = "Un pas";
export const slugBase = "unpas";
export const metier = "Application de gestion de tâches";
export const design = {
  mode: "dark", style: "Émeraude", source: "bibliotheque",
  polices: { titres: "Inter Tight", texte: "Inter" },
  couleurs: { background: "#000000", foreground: "#FFFFFF", primary: "#FFFFFF", on_primary: "#00140D", card: "#0B0F0D", muted: "#0B0F0D", border: "#1E2A25", muted_foreground: "#9FB5AC", accent: "#3DDC97", secondary: "#0B0F0D", ring: "#3DDC97", on_accent: "#00140D" },
};
const E = "#3DDC97";
export const images = [
  { id: "IMG_1", pour: "hero", detourer: true, taille: "square_hd", prompt: "3D render of a glossy translucent mint green and emerald mouse cursor arrow pointer, iridescent edges, soft studio light, tilted, isolated on a plain white background, no text." },
  { id: "IMG_2", pour: "hero", detourer: true, taille: "square_hd", prompt: "3D render of a glossy translucent mint green and emerald rounded speech bubble icon, iridescent edges, soft studio light, tilted, isolated on a plain white background, no text." },
];
export const nav = [{ mot: "Fonctions", ancre: "fonctions" }, { mot: "Entreprise", ancre: "interface" }];
const tache = (t, d, s, ok = false) => `<li class="${ok ? "ok" : ""}"><i>${ok ? "✓" : ""}</i><span>${t}</span><em>▭ ${d}</em><em class="st ${s === "Fait" ? "f" : "c"}">${s}</em><u></u></li>`;

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    .up-ann { position: absolute; left: 0; right: 0; top: 0; height: 40px; display: flex; justify-content: center; align-items: center; gap: 4px; font-size: 13px; color: #00140D; background: linear-gradient(90deg, #B8F5D9, #E8FFF4, #A6EDF0); }
    header.nav { top: 0 !important; background: transparent !important; border: 0 !important; padding-top: 40px !important; }
    header.nav .nav__bar { max-width: none !important; padding: 14px 18px !important; }
    header.nav .nav__logo { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; background: #0B0F0D; box-shadow: 0 0 14px rgb(61 220 151 / .4); } header.nav .nav__logo i { width: 14px; height: 14px; transform: rotate(45deg); border: 3px solid ${E}; border-radius: 3px; }
    header.nav .nav__links { margin-left: 18px; } header.nav .nav__link { color: #C8D6D0 !important; font-size: 15px; }
    header.nav .up-go { padding: 9px 16px; border-radius: 8px; background: #fff; color: #000; font-size: 15px; text-decoration: none; }
  </style>
  <div class="up-ann">Nouveau : Un pas arrive sur téléphone. <b>&nbsp;Télécharger l'appli →</b></div>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero" aria-label="Un pas, accueil"><i></i></a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#fonctions">Fonctions ⌄</a></div><div class="nav__item"><a class="nav__link" href="#interface">Entreprise ⌄</a></div></nav>
    <div class="nav__actions"><a class="up-go" href="#interface">Essai gratuit</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif up-hero">
  <style>
    #hero { position: relative; overflow: hidden; isolation: isolate; min-height: 0 !important; padding: clamp(180px, 16vw, 210px) 24px clamp(140px, 13vw, 180px) !important; text-align: center; color: #fff; background: linear-gradient(180deg, #000 4%, #062B20 30%, #0D6B4A 72%, #2FBF84 88%) !important; }
    #hero::after { content: ""; position: absolute; left: -10%; right: -10%; bottom: -78%; height: 100%; border-radius: 50%; background: #000; box-shadow: 0 -2px 0 #C8FFE6, 0 -14px 40px rgb(61 220 151 / .8), 0 -40px 90px rgb(61 220 151 / .4); z-index: 0; }
    #hero > * { position: relative; z-index: 1; }
    #hero .up-pas { display: inline-block; padding: 7px 12px; border-radius: 8px; border: 1px solid #1E2A25; background: rgb(0 0 0 / .5); font-size: 13px; color: #9FB5AC; } #hero .up-pas b { color: #fff; font-weight: 500; }
    #hero h1 { margin: 36px auto 0; max-width: none; font-weight: 700; font-size: clamp(64px, 10vw, 144px); line-height: .92; letter-spacing: -.035em; color: #fff; }
    #hero .up-o { position: absolute; z-index: 2; filter: drop-shadow(0 20px 30px rgb(0 0 0 / .4)); } #hero .o1 { left: 12%; top: 46%; width: clamp(120px, 14vw, 200px); } #hero .o2 { right: 11%; top: 24%; width: clamp(130px, 15vw, 220px); }
    #hero p { margin: 30px auto 0; max-width: 560px; font-size: 19px; line-height: 1.5; color: rgb(255 255 255 / .92); }
    #hero .up-go { display: inline-block; margin-top: 34px; padding: 13px 20px; border-radius: 8px; background: #fff; color: #000; font-size: 17px; text-decoration: none; }
    @media (max-width: 767px) { #hero .up-o { display: none; } }
  </style>
  <span class="up-pas">Nouvelle version 3.0. <b>En savoir plus →</b></span>
  <h1>Un pas<br>après l'autre</h1>
  <img class="up-o o1" src="IMG_1" alt=""><img class="up-o o2" src="IMG_2" alt="">
  <p>Savourez chaque tâche terminée avec une appli qui suit vos progrès, vous motive et fête vos réussites, une par une.</p>
  <a class="up-go" href="#interface">Commencer</a>
</section>` },
  { id: "clients", html: `<section id="clients" class="section up-clients" aria-label="Clients">
  <style>
    #clients { padding: clamp(60px, 6vw, 90px) 24px !important; background: #000 !important; text-align: center; }
    #clients p { margin: 0 0 26px; font-size: 13px; color: #9FB5AC; } #clients .up-r { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px 46px; font-size: 16px; font-weight: 600; color: #9FB5AC; }
  </style>
  <p>Adoptée par les équipes les plus inventives</p>
  <div class="up-r"><span>≫ Atelier Nord</span><span>✤ Quartz</span><span>✕ Val d'Écho</span><span style="letter-spacing:.15em">PULSO</span><span>◼ CIME</span><span>✳ Céleste</span></div>
</section>` },
  { id: "fonctions", html: `<section id="fonctions" class="section up-fonctions" aria-labelledby="fonctions-h">
  <style>
    #fonctions { padding: clamp(60px, 6vw, 90px) 24px clamp(90px, 9vw, 130px) !important; background: #000 !important; text-align: center; }
    #fonctions h2, #interface h2 { margin: 0 auto; font-size: clamp(40px, 4.4vw, 60px); font-weight: 600; letter-spacing: -.035em; color: #fff; } #fonctions > p, #interface > p { margin: 20px auto 0; max-width: 470px; font-size: 19px; line-height: 1.5; color: #C8D6D0; }
    #fonctions .up-g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; max-width: 1180px; margin: 60px auto 0; }
    #fonctions article { padding: 36px 30px 40px; border-radius: 14px; border: 1px solid #1E2A25; background: #070908; } #fonctions article i { display: inline-grid; place-items: center; width: 52px; height: 52px; border-radius: 10px; background: #fff; color: #000; font-style: normal; font-size: 22px; }
    #fonctions h3 { margin: 28px 0 10px; font-size: 18px; font-weight: 600; color: #fff; } #fonctions article p { margin: 0; font-size: 15px; line-height: 1.5; color: #C8D6D0; }
    @media (max-width: 899px) { #fonctions .up-g { grid-template-columns: 1fr; } }
  </style>
  <h2 id="fonctions-h">Tout ce qu'il vous faut</h2>
  <p>Listes sur mesure, travail d'équipe et suivi malin réunis au même endroit. Créez, recevez des rappels, voyez vos progrès.</p>
  <div class="up-g">
    <article><i>❦</i><h3>Vos outils connectés</h3><p>Reliez vos applis préférées et gardez l'essentiel au même endroit.</p></article>
    <article><i>◎</i><h3>Objectifs et suivi</h3><p>Découpez vos objectifs en petites tâches faciles à cocher.</p></article>
    <article><i>⊡</i><h3>Données chiffrées</h3><p>Vos données sont chiffrées de bout en bout et protégées.</p></article>
  </div>
</section>` },
  { id: "interface", html: `<section id="interface" class="section up-interface" aria-labelledby="interface-h">
  <style>
    #interface { padding: clamp(60px, 6vw, 90px) 24px 0 !important; text-align: center; background: linear-gradient(180deg, #000, #04261B 45%, #0A5A3E) !important; overflow: hidden; }
    #interface .up-sc { perspective: 1400px; margin-top: 90px; } #interface .up-app { display: grid; grid-template-columns: 50px 210px 1fr; max-width: 1020px; margin: 0 auto; border-radius: 14px 14px 0 0; border: 1px solid #1E2A25; background: #050806; text-align: left; transform: rotateX(18deg); transform-origin: bottom; font-size: 13px; color: #E6F0EC; overflow: hidden; }
    #interface .up-top { grid-column: 1 / -1; display: flex; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #1E2A25; color: #6E8279; font-size: 11px; } #interface .up-top span:last-child { padding: 3px 60px 3px 10px; border-radius: 6px; background: #121A16; }
    #interface .up-ic { display: grid; gap: 18px; justify-items: center; padding: 18px 0; border-right: 1px solid #1E2A25; color: #6E8279; } #interface .up-ic i { font-style: normal; }
    #interface .up-arbo { padding: 14px 12px; border-right: 1px solid #1E2A25; display: grid; gap: 14px; align-content: start; } #interface .up-arbo span { display: flex; gap: 10px; align-items: center; } #interface .up-arbo span::before { content: ""; width: 24px; height: 24px; border-radius: 6px; background: #1A2420; } #interface .up-arbo span.on { padding: 6px; margin-left: 20px; border-radius: 8px; background: #121A16; } #interface .up-arbo span.in { margin-left: 20px; }
    #interface .up-lst { padding: 16px 20px; } #interface .up-lst small { color: #6E8279; } #interface .up-lst h3 { margin: 18px 0 12px; font-size: 21px; font-weight: 600; color: #fff; }
    #interface ul { list-style: none; margin: 0; padding: 0; } #interface li { display: flex; align-items: center; gap: 10px; padding: 7px 0; font-size: 12.5px; } #interface li span { flex: 1; } #interface li.ok span { text-decoration: line-through; color: #6E8279; }
    #interface li i { width: 14px; height: 14px; border-radius: 50%; border: 1px solid #3A4A43; font-style: normal; font-size: 8px; display: grid; place-items: center; } #interface li em { font-style: normal; font-size: 10px; padding: 2px 8px; border-radius: 999px; border: 1px solid #1E2A25; color: #9FB5AC; } #interface li em.f { color: ${E}; } #interface li em.c { color: #F2C94C; }
    #interface li u { width: 18px; height: 18px; border-radius: 50%; background: linear-gradient(135deg, #F2B880, #C76D4A); text-decoration: none; }
    @media (max-width: 899px) { #interface .up-app { grid-template-columns: 1fr; } #interface .up-ic, #interface .up-arbo { display: none; } }
  </style>
  <h2 id="interface-h">Une interface évidente</h2>
  <p>Cochez, avancez, recommencez : tout est clair dès la première minute.</p>
  <div class="up-sc"><div class="up-app" aria-label="Aperçu de l'application">
    <div class="up-top"><span>● ● ●</span><span>Rechercher</span></div>
    <div class="up-ic"><i>☰</i><i>▦</i><i>◔</i><i>✿</i><i>⚙</i></div>
    <div class="up-arbo"><span>Marketing</span><span class="on">Site internet</span><span class="in">Campagne de Noël</span><span class="in">Référencement</span><span class="in">Partenariats</span><span>Produit</span><span>Analyses</span><span>Finances</span></div>
    <div class="up-lst"><small>Marketing / <b style="color:#fff">Site internet</b></small><h3>Lancement</h3><small>Design</small>
      <ul>${tache("Choisir les couleurs et les polices", "23 mars", "Fait", true)}${tache("Dessiner la page d'accueil", "28 mars", "Fait", true)}${tache("Adapter au téléphone et à la tablette", "12 avr.", "En cours")}${tache("Mettre en place le menu", "18 avr.", "En cours")}${tache("Ajouter les animations", "22 avr.", "En cours")}${tache("Ajouter les boutons d'action", "29 mars", "Fait", true)}</ul></div>
  </div></div>
</section>` },
  { id: "contact", html: `<footer class="footer closing up-contact" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding: 30px 24px !important; background: #000 !important; }
    #contact .up-pied { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; max-width: 1180px; margin: 0 auto; font-size: 13px; color: #9FB5AC; } #contact h2 { margin: 0; font-size: 13px; font-weight: 400; color: #9FB5AC; }
  </style>
  <div class="up-pied"><h2 id="contact-h">© Un pas · modèle de la bibliothèque Bingoo!</h2><span>bonjour@unpas.app</span></div>
</footer>` },
];
export const journal = ["Plan : hero, clients, fonctions, interface, contact"];
