// Modèle « Lyra » (28 nov. 2026) : recopie d'une maquette d'appli d'assistant IA (dégradé violet et jaune, main qui tient
// le téléphone, cartes de verre flottantes autour). Nom, textes et image originaux, aucune marque ni vraie personne.
export const nom = "Lyra";
export const slugBase = "lyra";
export const metier = "Appli d'assistant IA du quotidien";
export const design = {
  mode: "dark", style: "Verre violet", source: "bibliotheque",
  polices: { titres: "Poppins", texte: "Poppins" },
  couleurs: { background: "#07050D", foreground: "#FFFFFF", primary: "#FFFFFF", on_primary: "#121018", card: "#15111F", muted: "#15111F", border: "#2A2340", muted_foreground: "#A9A2C2", accent: "#B78CFF", secondary: "#1E1830", ring: "#B78CFF", on_accent: "#121018" },
};
export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1920, height: 1280 }, prompt: "A wide premium product photograph for an app landing page: a soft luminous gradient background, deep violet and purple at the top right, glowing lilac pink in the centre, a warm soft yellow glow in the lower left, fading to near black at the bottom right; at the bottom centre a realistic human hand (no face, no person visible) holds a modern black smartphone tilted slightly, the screen shows a dark purple assistant app with a large greeting and four rounded glass tiles; the upper half of the image is empty gradient for a centered title; soft studio light, shallow depth of field, no text readable except blurry UI, no logo, no brand." },
  { id: "IMG_2", pour: "avantages", taille: "square_hd", prompt: "A square abstract 3D render: a soft glowing translucent glass orb in violet and lilac with a warm yellow rim light, floating on near black, dreamy, minimal, premium, no text, no logo." },
];
export const nav = [{ mot: "L'appli", ancre: "hero" }, { mot: "Avantages", ancre: "avantages" }, { mot: "Tarifs", ancre: "tarifs" }, { mot: "Questions", ancre: "questions" }];
const VERRE = "background: linear-gradient(160deg, rgb(205 170 255 / .42), rgb(150 110 240 / .22)); border: 1px solid rgb(255 255 255 / .35); box-shadow: inset 0 1px 0 rgb(255 255 255 / .4), 0 30px 60px -30px rgb(40 10 90 / .7); backdrop-filter: blur(14px);";

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    .nav .ly-logo { display: inline-flex; align-items: center; gap: 10px; font-weight: 600; }
    .nav .ly-logo i { width: 18px; height: 18px; border-radius: 50%; border: 2px solid transparent; background: conic-gradient(#7FD3FF, #B78CFF, #FF8FD8, #FFD36E, #7FD3FF) border-box; -webkit-mask: linear-gradient(#000 0 0) padding-box exclude, linear-gradient(#000 0 0); mask: linear-gradient(#000 0 0) padding-box exclude, linear-gradient(#000 0 0); }
    .nav .nav__link { font-size: 13px; }
    .nav .ly-tel { border-radius: 999px !important; padding: 10px 18px !important; background: transparent !important; border: 1px solid rgb(255 255 255 / .55) !important; color: #fff !important; font-size: 13px; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo ly-logo" href="#hero"><i aria-hidden="true"></i>Lyra</a>
    <nav class="nav__links" aria-label="Principal">
      <div class="nav__item"><a class="nav__link" href="#hero">L'appli</a></div>
      <div class="nav__item"><a class="nav__link" href="#avantages">Avantages</a></div>
      <div class="nav__item"><a class="nav__link" href="#tarifs">Tarifs</a></div>
      <div class="nav__item"><a class="nav__link" href="#questions">Questions</a></div>
    </nav>
    <div class="nav__actions"><a class="btn ly-tel" href="#tarifs">Télécharger</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif ly-hero">
  <style>
    #hero { position: relative; min-height: clamp(760px, 112vh, 1040px) !important; padding: 0 !important; overflow: hidden; isolation: isolate; background: #07050D; color: #fff; perspective: 1200px; }
    #hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center bottom; z-index: -1; }
    #hero .ly-tete { position: relative; max-width: 760px; margin: 0 auto; padding: calc(var(--nav) + clamp(40px, 7vh, 80px)) var(--gut) 0; text-align: center; }
    #hero h1 { margin: 0; font-weight: 500; font-size: clamp(40px, 4.6vw, 68px); line-height: 1.08; letter-spacing: -.02em; background: linear-gradient(180deg, #fff 30%, #D9C8FF); -webkit-background-clip: text; background-clip: text; color: transparent; }
    #hero .ly-tete p { margin: 18px auto 0; max-width: 420px; font-size: 15.5px; line-height: 1.55; color: rgb(255 255 255 / .92); }
    #hero .ly-essai { display: inline-flex; align-items: center; gap: 10px; margin-top: 26px; padding: 13px 24px; border-radius: 999px; background: #fff; color: #121018; font-size: 15px; font-weight: 600; text-decoration: none; box-shadow: 0 16px 40px -14px rgb(0 0 0 / .6); }
    #hero .ly-carte { position: absolute; z-index: 2; border-radius: 18px; padding: 18px 20px; color: #fff; ${VERRE} }
    #hero .ly-carte::after { content: ""; position: absolute; inset: 10px -14px -14px 14px; z-index: -1; border-radius: 18px; background: rgb(190 160 255 / .16); border: 1px solid rgb(255 255 255 / .14); }
    #hero .ly-profil { left: 17%; top: 61%; width: 190px; text-align: center; transform: rotateY(18deg) rotateZ(4deg); }
    #hero .ly-profil i { display: block; width: 44px; height: 44px; margin: 0 auto 10px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #FFE0B8, #F2A35E 70%); border: 2px solid #fff; }
    #hero .ly-profil b { display: block; font-size: 14px; } #hero .ly-profil small { font-size: 11px; opacity: .8; }
    #hero .ly-demande { left: 21%; top: 79%; width: 230px; transform: rotateY(16deg) rotateZ(3deg); font-size: 13.5px; line-height: 1.35; }
    #hero .ly-demande span { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding: 9px 9px 9px 14px; border-radius: 999px; border: 1px solid rgb(255 255 255 / .35); font-size: 12px; opacity: .9; }
    #hero .ly-demande span i { width: 24px; height: 24px; border-radius: 50%; background: rgb(255 255 255 / .9); }
    #hero .ly-offres { right: 15%; top: 60%; width: 220px; transform: rotateY(-18deg) rotateZ(4deg); font-size: 13px; }
    #hero .ly-offres p { display: flex; align-items: center; gap: 10px; margin: 0; padding: 7px 0; }
    #hero .ly-offres p i { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid #fff; flex: none; }
    #hero .ly-offres p.on i { background: #fff; box-shadow: inset 0 0 0 3px #A77BFF; }
    #hero .ly-offres small { display: block; opacity: .75; font-size: 11px; }
    #hero .ly-offres em { margin-left: auto; padding: 4px 9px; border-radius: 999px; background: #fff; color: #121018; font-size: 9.5px; font-style: normal; font-weight: 700; }
    #hero .ly-carte { animation: compo-monte 1s .4s cubic-bezier(.2,.7,.2,1) both; }
    @media (max-width: 899px) { #hero .ly-carte { display: none; } #hero { min-height: 760px !important; } }
  </style>
  <img src="IMG_1" alt="Une main tient un téléphone qui affiche l'assistant Lyra, sur un dégradé violet et jaune">
  <div class="ly-tete">
    <h1>L'IA qui t'aide pour tout, tous les jours</h1>
    <p>Des solutions simples pour tes achats, tes livraisons et l'organisation de tes voyages.</p>
    <a class="ly-essai" href="#tarifs">Essayer <span aria-hidden="true">↗</span></a>
  </div>
  <div class="ly-carte ly-profil" aria-hidden="true"><i></i><b>Complète ton profil</b><small>Un profil à ton image</small></div>
  <div class="ly-carte ly-demande" aria-hidden="true">Tes demandes traitées en quelques secondes<span>Comment puis-je t'aider ?<i></i></span></div>
  <div class="ly-carte ly-offres" aria-hidden="true"><p><i></i><span>Mensuel<small>4,99 € / mois</small></span></p><p class="on"><i></i><span>Annuel<small>39 € / an</small></span><em>Meilleur choix</em></p><p><i></i><span>À vie<small>89 €</small></span></p></div>
</section>` },
  { id: "avantages", html: `<section id="avantages" class="section ly-avantages" aria-labelledby="avantages-h">
  <style>
    #avantages { padding-block: clamp(80px, 10vw, 140px) !important; text-align: center; }
    #avantages h2 { margin: 0 auto; max-width: 16ch; font-weight: 500; font-size: clamp(32px, 3.4vw, 52px); line-height: 1.1; letter-spacing: -.02em; }
    #avantages .ly-sous { margin: 14px auto clamp(40px, 5vw, 64px); max-width: 460px; color: #A9A2C2; font-size: 15px; line-height: 1.6; }
    #avantages .ly-grille { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 16px; align-items: stretch; text-align: left; }
    #avantages .ly-boite { border-radius: 22px; padding: 28px; background: linear-gradient(180deg, rgb(183 140 255 / .12), rgb(183 140 255 / .03)); border: 1px solid #2A2340; }
    #avantages .ly-boite h3 { margin: 0 0 10px; font-size: 19px; font-weight: 500; }
    #avantages .ly-boite p { margin: 0; color: #A9A2C2; font-size: 14.5px; line-height: 1.6; }
    #avantages .ly-centre { position: relative; overflow: hidden; display: grid; place-items: end start; min-height: 360px; background: #15111F; } #avantages .ly-centre img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .9; } #avantages .ly-centre > div { position: relative; }
    #avantages .ly-pile { display: grid; gap: 16px; }
    @media (max-width: 899px) { #avantages .ly-grille { grid-template-columns: 1fr; } #avantages .ly-centre { min-height: 280px; } }
  </style>
  <div class="wrap">
    <h2 id="avantages-h">Une seule appli pour tes petites corvées</h2>
    <p class="ly-sous">Tu demandes en une phrase, Lyra s'occupe du reste et te prévient quand c'est fait.</p>
    <div class="ly-grille">
      <div class="ly-pile"><div class="ly-boite"><h3>Achats</h3><p>Compare les prix et commande au meilleur moment, sans passer ta soirée sur dix sites.</p></div><div class="ly-boite"><h3>Livraisons</h3><p>Suis tous tes colis au même endroit et reçois une alerte la veille.</p></div></div>
      <div class="ly-boite ly-centre"><img src="IMG_2" alt="Une sphère de verre violette lumineuse"><div><h3>Voyages</h3><p>Trains, vols, hôtels : Lyra prépare ton trajet et range tes billets.</p></div></div>
      <div class="ly-pile"><div class="ly-boite"><h3>Billets</h3><p>Concerts, expos, matchs : tes places dès l'ouverture des ventes.</p></div><div class="ly-boite"><h3>Rappels</h3><p>Rendez-vous, factures, anniversaires : rien ne t'échappe.</p></div></div>
    </div>
  </div>
</section>` },
  { id: "tarifs", html: `<section id="tarifs" class="section ly-tarifs" aria-labelledby="tarifs-h">
  <style>
    #tarifs { padding-block: clamp(64px, 8vw, 120px) !important; position: relative; overflow: hidden; }
    #tarifs::before { content: ""; position: absolute; left: 50%; top: 20%; width: 900px; height: 600px; transform: translateX(-50%); background: radial-gradient(closest-side, rgb(160 110 255 / .35), transparent); pointer-events: none; }
    #tarifs h2 { position: relative; text-align: center; margin: 0 0 clamp(36px, 4vw, 56px); font-weight: 500; font-size: clamp(30px, 3vw, 46px); letter-spacing: -.02em; }
    #tarifs .ly-plans { position: relative; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; max-width: 960px; margin-inline: auto; }
    #tarifs .ly-plan { border-radius: 22px; padding: 28px; ${VERRE} }
    #tarifs .ly-plan.on { background: linear-gradient(160deg, rgb(230 210 255 / .6), rgb(170 130 255 / .35)); }
    #tarifs .ly-plan p { margin: 0; font-size: 14px; opacity: .85; }
    #tarifs .ly-plan b { display: block; margin: 12px 0 16px; font-size: 40px; font-weight: 500; letter-spacing: -.02em; }
    #tarifs .ly-plan b small { font-size: 15px; opacity: .8; }
    #tarifs .ly-plan ul { list-style: none; margin: 0 0 22px; padding: 0; display: grid; gap: 8px; font-size: 14px; }
    #tarifs .ly-plan ul li::before { content: "✓  "; }
    #tarifs .ly-plan a { display: block; padding: 12px; border-radius: 999px; text-align: center; background: #fff; color: #121018; font-weight: 600; font-size: 14px; text-decoration: none; }
    #tarifs .ly-plan em { float: right; padding: 4px 10px; border-radius: 999px; background: #fff; color: #121018; font-size: 11px; font-style: normal; font-weight: 700; }
    @media (max-width: 899px) { #tarifs .ly-plans { grid-template-columns: 1fr; } }
  </style>
  <div class="wrap">
    <h2 id="tarifs-h">Choisis ta formule</h2>
    <div class="ly-plans">
      <div class="ly-plan"><p>Mensuel</p><b>4,99 € <small>/ mois</small></b><ul><li>Demandes illimitées</li><li>Suivi des colis</li></ul><a href="#hero">Commencer</a></div>
      <div class="ly-plan on"><p>Annuel <em>Meilleur choix</em></p><b>39 € <small>/ an</small></b><ul><li>Tout le mensuel</li><li>Voyages et billets</li></ul><a href="#hero">Commencer</a></div>
      <div class="ly-plan"><p>À vie</p><b>89 € <small>une fois</small></b><ul><li>Tout l'annuel</li><li>Pour toujours</li></ul><a href="#hero">Commencer</a></div>
    </div>
  </div>
</section>` },
  { id: "questions", html: `<section id="questions" class="section ly-questions" aria-labelledby="questions-h">
  <style>
    #questions { padding-block: clamp(56px, 7vw, 104px) !important; }
    #questions .ly-q { display: grid; grid-template-columns: 1fr 1.4fr; gap: clamp(24px, 5vw, 80px); max-width: 1000px; margin-inline: auto; }
    #questions h2 { margin: 0; font-weight: 500; font-size: clamp(30px, 3vw, 46px); letter-spacing: -.02em; }
    #questions details { border-bottom: 1px solid #2A2340; padding: 20px 0; }
    #questions summary { cursor: pointer; list-style: none; font-size: 17px; display: flex; justify-content: space-between; }
    #questions summary::after { content: "+"; color: #B78CFF; font-size: 22px; line-height: 1; }
    #questions details p { margin: 12px 0 0; color: #A9A2C2; font-size: 14.5px; line-height: 1.6; }
    @media (max-width: 767px) { #questions .ly-q { grid-template-columns: 1fr; } }
  </style>
  <div class="wrap"><div class="ly-q">
    <h2 id="questions-h">Tes questions</h2>
    <div>
      <details open><summary>Lyra commande-t-elle à ma place ?</summary><p>Seulement si tu le confirmes : Lyra prépare la commande et te demande ton accord avant de payer.</p></details>
      <details><summary>Mes données sont-elles revendues ?</summary><p>Non. Elles servent à te répondre, et tu peux tout effacer depuis l'appli.</p></details>
      <details><summary>Je peux arrêter quand je veux ?</summary><p>Oui, la formule mensuelle se résilie en deux clics.</p></details>
    </div>
  </div></div>
</section>` },
  { id: "contact", html: `<footer class="footer closing" id="contact" aria-label="Pied de page">
  <style>
    #contact { padding-block: 40px 24px !important; border-top: 1px solid #2A2340; }
    #contact .ly-pied { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; font-size: 13px; color: #A9A2C2; }
    #contact .ly-pied nav { display: flex; gap: 22px; } #contact a { color: #A9A2C2; text-decoration: none; }
  </style>
  <div class="wrap"><div class="ly-pied"><span>© Lyra · modèle de la bibliothèque Bingoo!</span><nav aria-label="Pied de page"><a href="#avantages">Avantages</a><a href="#tarifs">Tarifs</a><a href="#questions">Questions</a></nav></div></div>
</footer>` },
];
export const journal = ["Plan : hero, avantages, tarifs, questions, contact"];
