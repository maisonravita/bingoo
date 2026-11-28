// Modèle « Azur » (28 nov. 2026) : design repris d'une maquette de fintech (titre à mots colorés, bouton et rond vidéo,
// étiquettes en pilules, cartes bancaires dans un cercle d'orbite, partenaires, phrase-titre aux mots colorés, quatre
// cartes colorées, bande pleine avec carte de solde sombre, grandes lettres en filigrane et trois étapes).
// Couleurs changées (bleu cobalt et ciel au lieu du vert anis), textes originaux, sans logos de banques ni de cartes.
export const nom = "Azur";
export const slugBase = "azur";
export const metier = "Application de gestion d'argent";
export const design = {
  mode: "light", style: "Cobalt et ciel", source: "bibliotheque",
  polices: { titres: "Lexend", texte: "Lexend" },
  couleurs: { background: "#F1F3F6", foreground: "#0D1526", primary: "#2F5BFF", on_primary: "#FFFFFF", card: "#FFFFFF", muted: "#E6EAF2", border: "#D9DFEA", muted_foreground: "#5A6478", accent: "#2F5BFF", secondary: "#E6EAF2", ring: "#2F5BFF", on_accent: "#FFFFFF" },
};
const B = "#2F5BFF", C = "#8FD3FF", N = "#0A2A6B";
export const images = [
  { id: "IMG_1", pour: "fonctions", taille: "square_hd", prompt: "Collage style photo: a black and white photograph of a hand holding a blue leather wallet, on a bright sky blue background with a few floating blue coins and a torn paper receipt, playful editorial style, no text, no logo." },
];
export const nav = [{ mot: "Fonctions", ancre: "fonctions" }, { mot: "Étapes", ancre: "etapes" }, { mot: "Tarifs", ancre: "contact" }, { mot: "Contact", ancre: "contact" }];
const carte = (cls, fond, num, nom, date, coul = "#fff") => `<div class="az-cb ${cls}" style="background:${fond};color:${coul}"><span class="az-pu" aria-hidden="true"></span><small>Numéro de carte</small><b>•••• •••• •••• ${num}</b><div><span><small>Titulaire</small>${nom}</span><span><small>Expire</small>${date}</span></div></div>`;

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    header.nav { background: rgb(241 243 246 / .9) !important; border: 0 !important; }
    header.nav .nav__logo { font-weight: 700; font-size: 26px; letter-spacing: .04em; color: ${B} !important; }
    header.nav .nav__links { justify-content: center; } header.nav .nav__link { color: #0D1526 !important; font-size: 13px; }
    header.nav .az-in { color: ${B}; font-size: 13px; text-decoration: none; } header.nav .az-go { padding: 8px 16px; border-radius: 999px; border: 1.5px solid ${B}; color: ${B}; font-size: 13px; text-decoration: none; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero">AZUR</a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#fonctions">Fonctions</a></div><div class="nav__item"><a class="nav__link" href="#etapes">Comment ça marche</a></div><div class="nav__item"><a class="nav__link" href="#contact">Tarifs</a></div><div class="nav__item"><a class="nav__link" href="#contact">Contact</a></div></nav>
    <div class="nav__actions"><a class="az-in" href="#contact">Connexion</a><a class="az-go" href="#contact">Commencer</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero az-hero">
  <style>
    #hero { min-height: 0 !important; padding: clamp(110px, 10vw, 130px) 24px 40px !important; background: #F1F3F6 !important; }
    #hero .az-g { display: grid; grid-template-columns: 1fr 1.05fr; gap: 30px; align-items: center; max-width: 1080px; margin: 0 auto; }
    #hero h1 { margin: 0; font-weight: 600; font-size: clamp(36px, 3.6vw, 50px); line-height: 1.12; color: #0D1526 !important; -webkit-text-fill-color: #0D1526; } #hero h1 span { color: ${B} !important; -webkit-text-fill-color: ${B}; }
    #hero .az-g > div > p { margin: 22px 0 0; max-width: 420px; font-size: 14px; color: #1E2A40 !important; -webkit-text-fill-color: #1E2A40; }
    #hero .az-act { display: flex; align-items: center; gap: 14px; margin-top: 26px; } #hero .az-act a { padding: 11px 22px; border-radius: 999px; background: ${C}; color: ${N} !important; font-size: 13px; text-decoration: none; } #hero .az-act span { display: inline-flex; align-items: center; gap: 10px; font-size: 13px; color: #0D1526; } #hero .az-act span i { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: ${N}; color: #fff; font-style: normal; box-shadow: inset 0 0 0 3px ${N}, inset 0 0 0 5px #fff; }
    #hero hr { margin: 56px 0 18px; max-width: 360px; border: 0; border-top: 1px solid #9AA3B5; } #hero .az-tags { display: flex; flex-wrap: wrap; gap: 8px; max-width: 300px; } #hero .az-tags span { padding: 3px 14px; border-radius: 999px; border: 1px solid #0D1526; font-size: 10px; color: #0D1526; }
    #hero .az-v { position: relative; aspect-ratio: 1; } #hero .az-v::before { content: ""; position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid ${C}; background: radial-gradient(circle, rgb(143 211 255 / .12), transparent 70%); }
    .az-cb { position: absolute; width: 56%; padding: 18px; border-radius: 16px; font-size: 9px; box-shadow: 0 20px 40px -14px rgb(10 42 107 / .45); } .az-cb b { display: block; margin: 4px 0 14px; font-size: 15px; letter-spacing: .08em; font-weight: 500; } .az-cb small { display: block; opacity: .75; font-size: 8px; } .az-cb > div { display: flex; gap: 30px; font-size: 11px; font-weight: 500; }
    .az-pu { display: block; width: 26px; height: 18px; margin-bottom: 22px; border-radius: 4px; background: linear-gradient(135deg, #E6EEFF, #A9BDE8); }
    #hero .c1 { right: 4%; top: 18%; } #hero .c2 { left: 6%; top: 46%; }
    #hero .az-st { position: absolute; left: 30%; top: 6%; z-index: 2; width: 120px; padding: 10px; border-radius: 8px; background: #fff; box-shadow: 0 10px 30px -10px rgb(0 0 0 / .2); font-size: 9px; color: #0D1526; } #hero .az-st svg { display: block; width: 100%; height: 40px; margin-top: 6px; }
    #hero .az-rev { position: absolute; right: 12%; top: 57%; z-index: 2; display: flex; align-items: center; gap: 6px; padding: 6px 18px 6px 6px; border-radius: 999px; background: rgb(255 255 255 / .4); border: 1px solid rgb(255 255 255 / .7); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); font-size: 11px; color: #fff; } #hero .az-rev i { width: 22px; height: 22px; border-radius: 6px; background: #fff; }
    #hero .az-wal { position: absolute; right: 26%; bottom: 23%; z-index: 2; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: ${C}; color: ${N}; }
    #hero .az-part { max-width: 1080px; margin: 30px auto 0; text-align: center; } #hero .az-part small { font-size: 11px; color: ${B}; } #hero .az-part div { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 20px; margin-top: 30px; font-size: 30px; font-weight: 700; color: #6A7385; }
    @media (max-width: 899px) { #hero .az-g { grid-template-columns: 1fr; } }
  </style>
  <div class="az-g">
    <div><h1>Votre allié pour des<br>décisions <span>financières<br>plus malines</span></h1><p>Gardez la main sur votre argent avec des outils qui vous aident à épargner, investir et prévoir, sans effort.</p>
      <div class="az-act"><a href="#contact">Parler à un conseiller</a><span><i>▶</i>Voir la vidéo</span></div>
      <hr><div class="az-tags"><span>Marchés</span><span>Investir</span><span>Grandir</span><span>Prévoir</span><span>Budget</span><span>Conseils</span></div></div>
    <div class="az-v" aria-hidden="true">
      <div class="az-st">Statistiques<svg viewBox="0 0 100 40"><g fill="${N}"><rect x="40" y="10" width="3" height="30"/><rect x="46" y="4" width="3" height="36"/><rect x="52" y="14" width="3" height="26"/><rect x="58" y="2" width="3" height="38"/><rect x="64" y="12" width="3" height="28"/><rect x="70" y="6" width="3" height="34"/><rect x="76" y="16" width="3" height="24"/></g><text x="0" y="36" font-size="8" fill="#5A6478">264 € · 478 €</text></svg></div>
      ${carte("c1", `linear-gradient(135deg, ${B}, ${C})`, "3294", "Bianca Morel", "03/28")}
      ${carte("c2", `linear-gradient(135deg, ${N}, #1E6FA8)`, "3294", "Maria Lopez", "10/29")}
      <span class="az-rev"><i></i>Revenus</span><span class="az-wal">▣</span>
    </div>
  </div>
  <div class="az-part"><small>Nos partenaires</small><div><span style="font-style:italic">NAVA</span><span>◐◑</span><span>✣ PLAINE</span><span style="font-family:Georgia,serif;font-weight:400">Fortune</span><span>Dalton.</span></div></div>
</section>` },
  { id: "fonctions", html: `<section id="fonctions" class="section az-fonctions" aria-labelledby="fonctions-h">
  <style>
    #fonctions { padding: clamp(70px, 7vw, 100px) 24px !important; background: #F1F3F6 !important; }
    #fonctions .az-in { max-width: 1080px; margin: 0 auto; } #fonctions .az-tete { display: flex; justify-content: space-between; align-items: center; } #fonctions .az-tete span { padding: 6px 20px; border-radius: 999px; background: ${N}; color: #fff; font-size: 12px; } #fonctions .az-tete small { font-size: 11px; color: #0D1526; }
    #fonctions h2 { margin: 22px 0 0; max-width: 780px; font-size: clamp(26px, 2.6vw, 34px); font-weight: 500; line-height: 1.2; color: #0D1526; } #fonctions h2 span { color: ${B}; } #fonctions h2 em { font-style: normal; color: #1E6FA8; }
    #fonctions .az-g { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-top: 40px; }
    #fonctions article { position: relative; height: 290px; padding: 16px; border-radius: 10px; overflow: hidden; color: ${N}; } #fonctions article h3 { position: relative; margin: 0; font-size: 13px; font-weight: 600; color: inherit; } #fonctions article p { position: absolute; left: 16px; right: 16px; bottom: 16px; margin: 0; font-size: 10.5px; line-height: 1.35; }
    #fonctions article b { position: absolute; left: 50%; top: 52%; transform: translate(-50%, -50%); font-size: 160px; line-height: 1; opacity: .18; color: #fff; }
    #fonctions article img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    @media (max-width: 899px) { #fonctions .az-g { grid-template-columns: 1fr 1fr; } }
  </style>
  <div class="az-in"><div class="az-tete"><span>Fonctions</span><small>Tout ce qu'il faut, rien de trop.</small></div>
  <h2 id="fonctions-h">Gagnez en <span>clarté financière</span> et reprenez la main sur votre avenir avec des outils qui simplifient votre <em>gestion d'argent</em>, sur une seule plateforme sécurisée.</h2>
  <div class="az-g">
    <article><img src="IMG_1" alt="Une main tient un portefeuille bleu"></article>
    <article style="background:${B};color:#fff"><b>▲</b><h3>Budgets et alertes automatiques</h3><p>Créez vos budgets et recevez une alerte en temps réel pour rester dans les clous.</p></article>
    <article style="background:#5B8CFF;color:#fff"><b>◔</b><h3>Tous vos comptes réunis</h3><p>Vos comptes, cartes et opérations dans une seule interface simple.</p></article>
    <article style="background:${C}"><b>€</b><h3>Conseils personnalisés</h3><p>Des conseils concrets selon vos dépenses et vos objectifs d'épargne.</p></article>
  </div></div>
</section>` },
  { id: "etapes", html: `<section id="etapes" class="section az-etapes" aria-labelledby="etapes-h">
  <style>
    #etapes { position: relative; overflow: hidden; padding: clamp(60px, 6vw, 80px) 24px !important; background: ${B} !important; }
    #etapes .az-geant { position: absolute; left: 0; right: 0; bottom: -0.18em; margin: 0; font-size: clamp(180px, 26vw, 380px); font-weight: 700; line-height: 1; text-align: center; color: transparent; -webkit-text-stroke: 0; background: none; opacity: .18; color: ${C}; pointer-events: none; }
    #etapes .az-g { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; max-width: 1080px; margin: 0 auto; }
    #etapes .az-sol { padding: 22px; border-radius: 26px; background: #161B26; color: #fff; } #etapes .az-sol .az-hd { display: flex; justify-content: space-between; } #etapes .az-sol .az-hd span { padding: 10px 18px; border-radius: 999px; border: 1px solid #3A4254; font-size: 12px; } #etapes .az-sol .az-hd i { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; border: 1px solid #3A4254; font-style: normal; }
    #etapes .az-sol small { display: block; margin-top: 60px; font-size: 11px; color: #C8CEDB; } #etapes .az-sol b { display: block; margin-top: 6px; font-size: 30px; font-weight: 600; }
    #etapes .az-sol .az-bt { display: flex; gap: 8px; margin-top: 24px; } #etapes .az-sol .az-bt span { padding: 9px 16px; border-radius: 999px; border: 1px solid #3A4254; font-size: 11px; } #etapes .az-sol .az-bt i { margin-left: auto; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: ${C}; color: ${N}; font-style: normal; font-size: 20px; }
    #etapes h2 { margin: 0; font-size: clamp(28px, 2.6vw, 36px); font-weight: 600; line-height: 1.15; color: #fff; }
    #etapes ul { list-style: none; margin: 34px 0 0; padding: 0; display: grid; gap: 22px; } #etapes li { display: flex; gap: 14px; align-items: center; font-size: 11.5px; line-height: 1.4; color: #EAF1FF; } #etapes li i { flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: ${N}; color: ${C}; font-style: normal; }
    @media (max-width: 899px) { #etapes .az-g { grid-template-columns: 1fr; } }
  </style>
  <p class="az-geant" aria-hidden="true">AZUR</p>
  <div class="az-g">
    <div class="az-sol" aria-label="Exemple de solde"><div class="az-hd"><span>€ Euro</span><i>◎</i></div><small>Solde total disponible</small><b>47 586,32 €</b><div class="az-bt"><span>▦</span><span>↙ Demander</span><span>↗ Virer</span><i>+</i></div></div>
    <div><h2 id="etapes-h">Gérez votre argent<br>en 3 étapes simples</h2>
      <ul><li><i>◉</i>Inscrivez-vous et reliez vos comptes. Banque, cartes et portefeuilles, avec un chiffrement de niveau bancaire.</li><li><i>▥</i>Des conseils d'investissement malins, adaptés à votre profil de risque.</li><li><i>✓</i>Tous vos comptes synchronisés au même endroit, chiffrés et toujours à jour.</li></ul></div>
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing az-contact" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding: clamp(70px, 7vw, 100px) 24px 28px !important; background: #F1F3F6 !important; }
    #contact .az-in { max-width: 1080px; margin: 0 auto; } #contact .az-tete { display: flex; justify-content: space-between; align-items: center; } #contact .az-tete span { padding: 6px 20px; border-radius: 999px; background: ${N}; color: #fff; font-size: 12px; } #contact .az-tete small { font-size: 11px; }
    #contact .az-g { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 30px; } #contact article { padding: 24px; border-radius: 14px; background: #fff; } #contact article.on { background: ${B}; color: #fff; } #contact h2 { margin: 0; font-size: 15px; font-weight: 600; color: inherit; } #contact article b { display: block; margin: 16px 0 6px; font-size: 32px; } #contact article p { margin: 0; font-size: 12px; opacity: .8; }
    #contact .az-pied { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-top: 50px; padding-top: 18px; border-top: 1px solid #D9DFEA; font-size: 12px; color: #5A6478; }
    @media (max-width: 767px) { #contact .az-g { grid-template-columns: 1fr; } }
  </style>
  <div class="az-in"><div class="az-tete"><span>Tarifs</span><small>Essai gratuit, changez quand vous voulez.</small></div>
  <div class="az-g"><article><h2 id="contact-h">Gratuit</h2><b>0 €</b><p>Un compte, le suivi de vos dépenses.</p></article><article class="on"><h2>Plus</h2><b>4,99 €</b><p>Par mois. Comptes illimités et conseils.</p></article><article><h2>Famille</h2><b>8,99 €</b><p>Par mois, jusqu'à 5 personnes.</p></article></div>
  <div class="az-pied"><span>© Azur · modèle de la bibliothèque Bingoo!</span><span>bonjour@azur.app</span></div></div>
</footer>` },
];
export const journal = ["Plan : hero, fonctions, etapes, contact"];
