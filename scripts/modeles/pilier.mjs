// Modèle « Pilier » (28 nov. 2026) : design repris d'une maquette de finances personnelles (premier écran coupé en deux,
// sommaire vertical à étapes, forme 3D au centre entourée de cartes flottantes, sections texte + carte sombre, grande
// goutte liquide sous une carte bancaire). Couleurs changées (bleu nuit et ivoire au lieu de noir et blanc), textes originaux.
export const nom = "Pilier";
export const slugBase = "pilier";
export const metier = "Application de finances personnelles";
export const design = {
  mode: "light", style: "Bleu nuit et ivoire", source: "bibliotheque",
  polices: { titres: "Syne", texte: "Manrope" },
  couleurs: { background: "#F7F4EC", foreground: "#0E1A3A", primary: "#0E1A3A", on_primary: "#F7F4EC", card: "#FFFFFF", muted: "#EEE9DD", border: "#E2DCCD", muted_foreground: "#5F6680", accent: "#3D63DD", secondary: "#EEE9DD", ring: "#0E1A3A", on_accent: "#FFFFFF" },
};
const N = "#0E1A3A", I = "#F7F4EC";
const etapes = (n) => `<ol class="pi-et" aria-hidden="true">${["Atteindre ses objectifs", "Qui sommes-nous", "Fixer ses objectifs", "Investir"].map((t, i) => `<li class="${i <= n ? "on" : ""}">${t}</li>`).join("")}</ol>`;
const S3 = "3D render, glossy, studio light, isolated, no text, no logo";
export const images = [
  { id: "IMG_1", pour: "hero", detourer: true, taille: "square_hd", prompt: `A soft puffy 3D organic flower-like torus shape with a hole in the middle, glossy deep midnight navy blue material with subtle blue reflections, on a plain white background, ${S3}.` },
  { id: "IMG_2", pour: "apropos", detourer: true, taille: "square_hd", prompt: `A stack of six thick rounded square plates fanned diagonally like a staircase, alternating ivory white and midnight navy blue glossy plastic, on a plain white background, ${S3}.` },
  { id: "IMG_3", pour: "budget", detourer: true, taille: "square_hd", prompt: `A large flat puddle-shaped blob of clear liquid glass seen from above at an angle, very light and transparent with soft caustic reflections, on a plain white background, ${S3}.` },
  { id: "IMG_4", pour: "investir", detourer: true, taille: "square_hd", prompt: `A single glossy midnight navy blue 3D faceted pyramid crystal tilted, on a plain white background, ${S3}.` },
];
export const nav = [{ mot: "Accueil", ancre: "hero" }, { mot: "À propos", ancre: "apropos" }, { mot: "Services", ancre: "objectifs" }, { mot: "Tarifs", ancre: "contact" }];

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    header.nav { background: transparent !important; border: 0 !important; }
    header.nav .nav__bar { max-width: none !important; padding: 22px clamp(24px, 4vw, 56px) !important; }
    header.nav .nav__links { order: -1; gap: 30px !important; } header.nav .nav__link { color: ${I} !important; font-size: 13px; }
    header.nav .nav__logo { position: absolute; left: 50%; transform: translateX(-50%); display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; border: 4px solid ${N}; color: ${N} !important; font-family: Syne, sans-serif; font-weight: 800; font-size: 16px; background: ${I}; }
    header.nav .pi-in { padding: 9px 20px; border-radius: 999px; border: 1px solid ${N}; color: ${N}; font-size: 13px; text-decoration: none; } header.nav .pi-up { padding: 9px 20px; border-radius: 999px; background: ${N}; color: ${I}; font-size: 13px; text-decoration: none; }
    header.nav:not(.nav--sur-photo) { background: rgb(247 244 236 / .92) !important; } header.nav:not(.nav--sur-photo) .nav__link { color: ${N} !important; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero">P</a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#hero">Accueil</a></div><div class="nav__item"><a class="nav__link" href="#apropos">À propos</a></div><div class="nav__item"><a class="nav__link" href="#objectifs">Services</a></div><div class="nav__item"><a class="nav__link" href="#contact">Tarifs</a></div></nav>
    <div class="nav__actions"><a class="pi-in" href="#contact">Connexion</a><a class="pi-up" href="#contact">Inscription</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif pi-hero">
  <style>
    .pi-et { list-style: none; margin: 0; padding: 0 0 0 16px; border-left: 2px solid rgb(127 135 160 / .35); display: grid; gap: 34px; font-size: 10.5px; font-weight: 600; max-width: 110px; }
    .pi-et li { position: relative; color: rgb(127 135 160 / .7); } .pi-et li.on { color: inherit; } .pi-et li::before { content: ""; position: absolute; left: -21px; top: 3px; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    #hero { display: grid; grid-template-columns: 1fr 1fr; min-height: 0 !important; padding: 0 !important; background: ${I} !important; }
    #hero .pi-g { position: relative; min-height: clamp(600px, 50vw, 680px); padding: 160px clamp(24px, 4vw, 56px) 60px; color: ${I}; background: radial-gradient(ellipse 70% 60% at 30% 40%, #1C2C5E, transparent 70%), radial-gradient(circle at 70% 20%, #243A7A 0, transparent 40%), ${N}; overflow: hidden; }
    #hero .pi-g::before { content: ""; position: absolute; inset: -20%; background: repeating-radial-gradient(circle at 20% 35%, rgb(255 255 255 / .04) 0 18px, transparent 18px 40px); }
    #hero h1 { position: absolute; left: clamp(24px, 4vw, 56px); bottom: 70px; margin: 0; font-family: Syne, sans-serif; font-weight: 600; font-size: clamp(40px, 4.2vw, 62px); line-height: 1.05; color: ${I}; }
    #hero .pi-d { position: relative; display: grid; place-items: center; padding: 100px 40px 40px; background: radial-gradient(circle at 50% 55%, #fff 0 20%, transparent 21%), repeating-radial-gradient(circle at 50% 55%, #FBF9F3 0 30px, #F1ECE0 30px 34px), ${I}; overflow: hidden; }
    #hero .pi-solde { position: absolute; left: 30%; top: 22%; width: 260px; height: 400px; padding: 22px; border-radius: 16px; background: rgb(238 233 221 / .85); color: ${N}; } #hero .pi-solde b { display: block; font-size: 26px; } #hero .pi-solde small { font-size: 12px; }
    #hero .pi-solde i { position: absolute; right: 14px; top: 14px; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: ${N}; color: ${I}; font-style: normal; font-size: 13px; }
    #hero .pi-forme { position: relative; width: 74%; max-width: 380px; z-index: 1; filter: drop-shadow(0 30px 40px rgb(14 26 58 / .3)); }
    #hero .pi-not { position: absolute; left: 6%; top: 34%; z-index: 2; display: flex; align-items: center; gap: 10px; padding: 8px 20px 8px 8px; border-radius: 999px; background: #3A4466; color: ${I}; font-size: 11.5px; } #hero .pi-not i { width: 30px; height: 30px; border-radius: 50%; background: #8FA8FF; } #hero .pi-not small { display: block; font-size: 9px; opacity: .7; }
    #hero .pi-cb { position: absolute; z-index: 2; padding: 14px; border-radius: 12px; font-size: 13px; }
    #hero .pi-c1 { left: 12%; bottom: 13%; width: 170px; height: 190px; background: linear-gradient(180deg, #fff 40%, #D9D4C6); color: ${N}; } #hero .pi-c1 b { font-size: 17px; } #hero .pi-c1 svg { display: block; margin-top: 18px; width: 100%; }
    #hero .pi-c2 { right: 6%; bottom: 26%; width: 130px; background: ${N}; color: ${I}; text-align: center; } #hero .pi-c2 small { display: block; margin-top: 10px; font-size: 9.5px; line-height: 1.3; }
    #hero .pi-soc { position: absolute; right: 6%; bottom: 8%; display: flex; gap: 2px; } #hero .pi-soc i { width: 30px; height: 30px; border-radius: 50%; background: ${N}; }
    #hero .pi-desc { position: absolute; left: clamp(24px, 4vw, 56px); bottom: -46px; z-index: 3; width: 30px; height: 90px; border-radius: 16px; background: #5F6680; display: grid; place-items: center; color: #fff; }
    @media (max-width: 899px) { #hero { grid-template-columns: 1fr; } #hero .pi-g { min-height: 460px; } #hero .pi-g .pi-et { display: none; } }
  </style>
  <div class="pi-g">${etapes(0)}<h1>Atteignez vos<br>objectifs d'argent</h1><span class="pi-desc" aria-hidden="true">↓</span></div>
  <div class="pi-d">
    <div class="pi-solde"><b>3 845,75 €</b><small>Disponible</small><i>↗</i></div>
    <img class="pi-forme" src="IMG_1" alt="">
    <span class="pi-not"><i></i><span>Virement envoyé à Hugo<small>14:30</small></span></span>
    <div class="pi-cb pi-c1"><b>3 845,75 €</b><br><small>↗ +25,42 %</small><svg viewBox="0 0 150 70" aria-hidden="true"><path d="M0 50C20 48 30 38 45 44s20 10 35 0 15-36 30-30 20 40 40 34" stroke="${N}" stroke-width="1.6" fill="none"/><circle cx="80" cy="44" r="4" fill="${N}"/></svg></div>
    <div class="pi-cb pi-c2"><b>120,00 €</b><small>Virement réussi.</small></div>
    <span class="pi-soc" aria-hidden="true"><i></i><i></i><i></i></span>
  </div>
</section>` },
  { id: "apropos", html: `<section id="apropos" class="section pi-sec" aria-labelledby="apropos-h">
  <style>
    .pi-sec { padding: clamp(90px, 9vw, 130px) clamp(24px, 4vw, 56px) !important; background: ${I} !important; }
    .pi-sec .pi-in { display: grid; grid-template-columns: 140px 1.3fr 1fr; gap: clamp(30px, 5vw, 70px); align-items: center; max-width: 1180px; margin: 0 auto; color: ${N}; }
    .pi-sec h2 { margin: 0; font-family: Syne, sans-serif; font-size: clamp(30px, 3vw, 42px); font-weight: 600; line-height: 1.05; color: ${N}; } .pi-sec p { margin: 18px 0 0; max-width: 400px; font-size: 13px; line-height: 1.6; color: #5F6680; }
    .pi-sec .pi-lire { display: inline-flex; gap: 8px; margin-top: 22px; padding: 7px 14px; border-radius: 999px; border: 1px solid ${N}; font-size: 12px; color: ${N}; text-decoration: none; }
    #apropos .pi-v { position: relative; height: 360px; border-radius: 16px; background: #EEE9DD; } #apropos .pi-v img { position: absolute; right: -10px; bottom: 10px; width: 78%; }
    #apropos .pi-v b { position: absolute; right: 20px; top: 16px; font-family: Syne, sans-serif; font-size: 34px; } #apropos .pi-v b small { display: block; font-family: Manrope, sans-serif; font-size: 11px; font-weight: 400; }
    #apropos .pi-av { position: absolute; left: -30px; top: 40px; display: flex; gap: 10px; align-items: center; padding: 6px 16px 6px 6px; border-radius: 999px; background: #fff; font-size: 11px; } #apropos .pi-av i { width: 30px; height: 30px; border-radius: 50%; background: #8FA8FF; } #apropos .pi-av small { display: block; color: #E2A93A; }
    #apropos .pi-cl { position: absolute; left: -40px; bottom: -20px; width: 120px; padding: 12px; border-radius: 12px; background: ${N}; color: ${I}; font-size: 12px; text-align: center; } #apropos .pi-cl small { display: block; font-size: 9px; opacity: .7; } #apropos .pi-cl span { display: inline-grid; place-items: center; margin-top: 30px; width: 26px; height: 26px; border-radius: 50%; background: #fff; color: ${N}; font-size: 8px; font-weight: 700; }
    @media (max-width: 899px) { .pi-sec .pi-in { grid-template-columns: 1fr; } .pi-sec .pi-et { display: none; } }
  </style>
  <div class="pi-in">${etapes(1)}
    <div><h2 id="apropos-h">Proches de vous,<br>partout ◎</h2><p>Chez Pilier, nous croyons que chacun peut réaliser ses projets. Préparer sa retraite, rembourser un crédit ou mettre de côté pour les imprévus : on vous aide à y arriver.</p><a class="pi-lire" href="#objectifs">En savoir plus →</a></div>
    <div class="pi-v"><span class="pi-av"><i></i><span>Hugo Martin<small>★★★★★ (5,0)</small></span></span><b>50+<small>personnes dans l'équipe</small></b><img src="IMG_2" alt=""><div class="pi-cl">Clients heureux<small>depuis 3 ans</small><span>20+</span></div></div>
  </div>
</section>` },
  { id: "objectifs", html: `<section id="objectifs" class="section pi-sec" aria-labelledby="objectifs-h">
  <style>
    #objectifs .pi-k { padding: 26px; border-radius: 16px; background: ${N}; color: ${I}; } #objectifs .pi-k h3 { margin: 0; font-family: Syne, sans-serif; font-size: 26px; font-weight: 600; line-height: 1.1; color: ${I}; }
    #objectifs .pi-k b { display: block; margin-top: 30px; font-size: 24px; font-weight: 500; } #objectifs .pi-k small { font-size: 9.5px; opacity: .7; }
    #objectifs .pi-k p { display: flex; gap: 10px; align-items: center; margin: 26px 0 0; padding: 12px; border-radius: 8px; background: rgb(255 255 255 / .06); font-size: 10.5px; color: ${I}; max-width: none; }
  </style>
  <div class="pi-in">${etapes(2)}
    <div><h2 id="objectifs-h">Fixez des objectifs<br>précis</h2><p>La première étape, c'est un objectif chiffré. Un apport pour une maison, un crédit à solder, une réserve de sécurité : sachez exactement ce que vous visez.</p></div>
    <div class="pi-k"><h3>Montant<br>épargné</h3><b>1 890 €</b><small>Ce mois-ci</small><b style="margin-top:18px">9 890 €</b><small>Épargne totale</small><p>✓ Vous avez atteint l'objectif que vous vous étiez fixé.</p></div>
  </div>
</section>` },
  { id: "budget", html: `<section id="budget" class="section pi-budget" aria-labelledby="budget-h">
  <style>
    #budget { position: relative; padding: clamp(60px, 6vw, 90px) clamp(24px, 4vw, 56px) clamp(90px, 9vw, 120px) !important; background: ${I} !important; overflow: hidden; }
    #budget .pi-in { position: relative; display: grid; grid-template-columns: 140px 1fr 1fr; gap: 40px; max-width: 1180px; margin: 0 auto; min-height: 700px; color: ${N}; }
    #budget .pi-goutte { position: absolute; left: 18%; top: 140px; width: 46%; opacity: .95; }
    #budget .pi-plan { position: relative; z-index: 1; align-self: start; width: 260px; padding: 24px; border-radius: 14px; background: #EEE9DD; } #budget .pi-plan h3 { margin: 0 0 30px; font-family: Syne, sans-serif; font-size: 26px; font-weight: 600; line-height: 1.1; color: ${N}; } #budget .pi-plan b { display: block; font-size: 22px; font-weight: 500; } #budget .pi-plan small { display: block; margin-bottom: 18px; font-size: 9.5px; }
    #budget .pi-cart { position: absolute; z-index: 2; left: 33%; top: 140px; width: 170px; height: 250px; border-radius: 10px; background: linear-gradient(180deg, ${N} 70%, #fff 70%); transform: rotate(12deg); box-shadow: 0 20px 40px rgb(14 26 58 / .3); color: ${I}; font-size: 10px; } #budget .pi-cart span { position: absolute; right: 14px; top: 16px; } #budget .pi-cart em { position: absolute; left: 12px; top: 60px; writing-mode: vertical-rl; transform: rotate(180deg); font-style: normal; letter-spacing: .2em; } #budget .pi-cart i { position: absolute; right: 18px; bottom: 18px; width: 36px; height: 22px; border-radius: 50%; background: radial-gradient(circle at 30% 50%, ${N} 0 10px, transparent 10px), radial-gradient(circle at 70% 50%, #8FA8FF 0 10px, transparent 10px); }
    #budget .pi-t1 { position: relative; z-index: 1; align-self: start; margin-top: 100px; } #budget .pi-t2 { position: absolute; z-index: 1; left: 140px; bottom: 0; max-width: 380px; }
    #budget h2, #budget h3.pi-h { margin: 0; font-family: Syne, sans-serif; font-size: clamp(30px, 3vw, 42px); font-weight: 600; line-height: 1.05; color: ${N}; } #budget p { margin: 18px 0 0; max-width: 360px; font-size: 13px; line-height: 1.6; color: #5F6680; }
    #budget .pi-inv { position: absolute; right: 0; bottom: 0; z-index: 1; width: 260px; padding: 26px; border-radius: 14px; background: ${N}; color: ${I}; overflow: visible; } #budget .pi-inv h4 { margin: 0; font-family: Syne, sans-serif; font-size: 26px; font-weight: 600; line-height: 1.1; color: ${I}; } #budget .pi-inv b { display: block; margin-top: 30px; font-size: 22px; font-weight: 500; } #budget .pi-inv small { font-size: 9.5px; opacity: .7; } #budget .pi-inv img { position: absolute; right: -40px; top: 30px; width: 120px; }
    @media (max-width: 899px) { #budget .pi-in { grid-template-columns: 1fr; min-height: 0; } #budget .pi-goutte, #budget .pi-cart, #budget .pi-et { display: none; } #budget .pi-t2, #budget .pi-inv { position: static; } }
  </style>
  <div class="pi-in">${etapes(3)}
    <img class="pi-goutte" src="IMG_3" alt="">
    <div class="pi-plan"><h3>Plan de<br>budget</h3><b>1 890 €</b><small>Ce mois-ci</small><b>9 890 €</b><small>Montant à mettre de côté</small></div>
    <div class="pi-cart" aria-hidden="true"><span>débit</span><em>PILIER</em><i></i></div>
    <div class="pi-t1"><h2 id="budget-h">Construisez<br>votre budget</h2><p>Épargner, c'est la clé. Programmez des virements automatiques vers votre épargne chaque mois : vous mettez de côté sans y penser.</p></div>
    <div class="pi-t2"><h3 class="pi-h">Investissez pour<br>votre avenir</h3><p>Ouvrez un plan retraite ou investissez dans des fonds simples et peu coûteux pour faire grandir votre argent.</p></div>
    <div class="pi-inv"><h4>Montant<br>investi</h4><b>1 890 € ⌄</b><small>Investi</small><img src="IMG_4" alt=""></div>
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing pi-contact" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding: 0 !important; background: ${N} !important; color: ${I}; }
    #contact .pi-b { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 24px; max-width: 1180px; margin: 0 auto; padding: clamp(70px, 7vw, 100px) clamp(24px, 4vw, 56px) 30px; }
    #contact h2 { margin: 0; font-family: Syne, sans-serif; font-size: clamp(36px, 4vw, 58px); font-weight: 600; line-height: 1; color: ${I}; }
    #contact a.pi-up { padding: 12px 26px; border-radius: 999px; background: ${I}; color: ${N}; text-decoration: none; }
    #contact .pi-pied { width: 100%; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-top: 40px; padding-top: 18px; border-top: 1px solid rgb(247 244 236 / .15); font-size: 12.5px; color: rgb(247 244 236 / .7); }
  </style>
  <div class="pi-b"><h2 id="contact-h">Votre argent,<br>enfin rangé.</h2><a class="pi-up" href="mailto:bonjour@pilier.app">Créer mon compte</a>
  <div class="pi-pied"><span>© Pilier · modèle de la bibliothèque Bingoo!</span><span>bonjour@pilier.app</span></div></div>
</footer>` },
];
export const journal = ["Plan : hero, apropos, objectifs, budget, contact"];
