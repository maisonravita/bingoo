// Modèle « Relais » (28 nov. 2026) : recopie d'une maquette de livraison (rendu 3D isométrique clair, barre de navigation
// en pilule flottante, titre noir puis orange, champ départ / arrivée avec bouton rond, trois chiffres séparés).
export const nom = "Relais";
export const slugBase = "relais";
export const metier = "Service de livraison de colis";
export const design = {
  mode: "light", style: "Clair et orange", source: "bibliotheque",
  polices: { titres: "Inter", texte: "Inter" },
  couleurs: { background: "#F7F4F1", foreground: "#15151A", primary: "#FF6A13", on_primary: "#FFFFFF", card: "#FFFFFF", muted: "#EFEBE6", border: "#E6E0D9", muted_foreground: "#5E5C63", accent: "#FF6A13", secondary: "#EFEBE6", ring: "#FF6A13", on_accent: "#FFFFFF" },
};
const FL = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1920, height: 1280 }, prompt: "Isometric 3D render in a soft clay and glossy plastic style, bright and airy: a small rounded white parcel depot building with a big glowing orange doorway on the right half of the frame, a curved dark conveyor belt carrying cardboard boxes out of the door, a white delivery van on the belt road at the front right, small potted trees on white blocks, a white signpost with three blank arrow signs, an orange panel with vertical ribs on the building, soft warm sunlight with long soft shadows, white and warm beige ground, the left 40 percent of the image very bright, almost white and empty, depth of field blur on the edges, no text, no letters, no logo." },
  { id: "IMG_2", pour: "comment", taille: "square_hd", prompt: "Isometric 3D clay render of a single cardboard parcel box with an orange tape stripe floating above a white rounded platform, soft shadows, warm white background, no text, no logo." },
  { id: "IMG_3", pour: "comment", taille: "square_hd", prompt: "Isometric 3D clay render of a small white delivery van driving on a curved road with a glowing orange arrow on the ground, warm white background, soft shadows, no text, no logo." },
  { id: "IMG_4", pour: "comment", taille: "square_hd", prompt: "Isometric 3D clay render of a cosy front door with a parcel box on the doormat and a small potted plant, warm white background, soft shadows, no text, no logo." },
];
export const nav = [{ mot: "Envoyer", ancre: "hero" }, { mot: "Suivre", ancre: "comment" }, { mot: "Entreprises", ancre: "pros" }, { mot: "Tarifs", ancre: "tarifs" }, { mot: "Aide", ancre: "contact" }];

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    .nav { background: transparent !important; box-shadow: none !important; border: 0 !important; padding-top: 18px; }
    .nav .nav__bar { max-width: 1120px; margin-inline: auto; padding: 12px 14px 12px 34px !important; border-radius: 999px; background: #fff; box-shadow: 0 18px 40px -24px rgb(40 30 20 / .35); }
    .nav .nav__logo { font-size: 26px; font-weight: 800; letter-spacing: -.04em; color: #15151A; }
    .nav .nav__logo b { color: #FF6A13; }
    .nav .nav__link { font-size: 15px; color: #15151A !important; text-shadow: none !important; } .nav .nav__logo { color: #15151A !important; text-shadow: none !important; }
    .nav .nav__actions { display: flex; gap: 8px; align-items: center; }
    .nav .re-cnx { padding: 12px 22px; border-radius: 999px; background: #F3F1EF; color: #15151A; font-size: 15px; text-decoration: none; }
    .nav .re-env { display: inline-flex !important; align-items: center; gap: 10px; border-radius: 999px !important; padding: 12px 22px !important; background: #15151A !important; border-color: #15151A !important; color: #fff !important; font-size: 15px; }
    .nav .re-env svg { width: 16px; height: 16px; color: #FF6A13; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero">relais<b>.</b></a>
    <nav class="nav__links" aria-label="Principal">
      <div class="nav__item"><a class="nav__link" href="#hero">Envoyer</a></div>
      <div class="nav__item"><a class="nav__link" href="#comment">Suivre</a></div>
      <div class="nav__item"><a class="nav__link" href="#pros">Entreprises</a></div>
      <div class="nav__item"><a class="nav__link" href="#tarifs">Tarifs</a></div>
      <div class="nav__item"><a class="nav__link" href="#contact">Aide</a></div>
    </nav>
    <div class="nav__actions"><a class="re-cnx" href="#contact">Connexion</a><a class="btn re-env" href="#hero">Envoyer ${FL}</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero re-hero">
  <style>
    #hero { position: relative; min-height: clamp(700px, 100svh, 920px) !important; padding: 0 !important; overflow: hidden; isolation: isolate; color: #15151A; background: #F7F4F1; }
    #hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 70% center; z-index: -2; }
    #hero::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, rgb(247 244 241 / .92) 0%, rgb(247 244 241 / .7) 32%, transparent 55%); }
    #hero .re-texte { max-width: 1120px; margin-inline: auto; padding: calc(var(--nav) + clamp(64px, 11vh, 120px)) var(--gut) 56px; }
    #hero .re-etiq { margin: 0; font-size: 12px; letter-spacing: .32em; text-transform: uppercase; color: #8C8A90; }
    #hero h1 { margin: 22px 0 0; font-weight: 800; font-size: clamp(52px, 6vw, 92px); line-height: .98; letter-spacing: -.04em; color: #15151A; }
    #hero h1 span { display: block; } #hero h1 span:last-child { color: #FF6A13; }
    #hero .re-chapo { margin: 22px 0 0; max-width: 440px; font-size: 19px; line-height: 1.45; color: #4A484E; }
    #hero .re-champs { display: flex; align-items: center; width: min(100%, 520px); margin-top: 36px; padding: 8px 8px 8px 22px; border-radius: 999px; background: #fff; box-shadow: 0 20px 44px -26px rgb(40 30 20 / .4); }
    #hero .re-champs span { flex: 1; display: flex; align-items: center; gap: 10px; font-size: 15px; color: #8C8A90; } #hero .re-champs span + span { padding-left: 20px; border-left: 1px solid #E6E0D9; }
    #hero .re-champs span i { width: 20px; height: 20px; border-radius: 4px; background: linear-gradient(135deg, #FF8A3D, #FF6A13); }
    #hero .re-champs a { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 50%; background: #FF6A13; color: #fff; } #hero .re-champs a svg { width: 18px; height: 18px; }
    #hero dl { display: flex; gap: 0; margin: 64px 0 0; }
    #hero dl div { padding-right: 36px; } #hero dl div + div { padding-left: 36px; border-left: 1px solid #D9D3CC; }
    #hero dt { font-size: 28px; font-weight: 800; letter-spacing: -.02em; } #hero dd { margin: 4px 0 0; font-size: 14px; color: #5E5C63; }
    #hero .re-texte > * { animation: compo-monte 1s cubic-bezier(.2,.7,.2,1) both; }
    @media (max-width: 899px) { #hero::after { background: linear-gradient(180deg, rgb(247 244 241 / .95) 0%, rgb(247 244 241 / .8) 60%, transparent); } #hero .re-champs { flex-wrap: wrap; border-radius: 22px; } #hero dl { flex-wrap: wrap; gap: 16px; } #hero dl div, #hero dl div + div { padding: 0; border: 0; } }
  </style>
  <img src="IMG_1" alt="Un dépôt blanc à porte orange, un tapis de colis et une camionnette blanche, en 3D">
  <div class="re-texte">
    <p class="re-etiq">Livrer un monde plus simple</p>
    <h1><span>Envoie tout.</span><span>Partout.</span></h1>
    <p class="re-chapo">Une livraison rapide, fiable et abordable pour les particuliers et les entreprises, de ta porte à n'importe où en France.</p>
    <div class="re-champs" role="search" aria-label="Préparer un envoi"><span><i aria-hidden="true"></i>Adresse de départ</span><span>Adresse d'arrivée</span><a href="#tarifs" aria-label="Voir le prix">${FL}</a></div>
    <dl><div><dt>1M+</dt><dd>Colis livrés</dd></div><div><dt>99 %</dt><dd>Livrés à l'heure</dd></div><div><dt>7j/7</dt><dd>Service client</dd></div></dl>
  </div>
</section>` },
  { id: "comment", html: `<section id="comment" class="section re-comment" aria-labelledby="comment-h">
  <style>
    #comment { padding-block: clamp(80px, 10vw, 140px) !important; }
    #comment .re-etiq { margin: 0; font-size: 12px; letter-spacing: .32em; text-transform: uppercase; color: #8C8A90; }
    #comment h2 { margin: 14px 0 44px; font-weight: 800; font-size: clamp(36px, 4vw, 60px); line-height: 1; letter-spacing: -.035em; }
    #comment h2 span { color: #FF6A13; }
    #comment .re-g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
    #comment article { padding: 18px 18px 26px; border-radius: 26px; background: #fff; box-shadow: 0 24px 50px -36px rgb(40 30 20 / .45); }
    #comment img { width: 100%; aspect-ratio: 1.25; object-fit: cover; display: block; border-radius: 18px; background: #F7F4F1; }
    #comment b { display: inline-grid; place-items: center; width: 30px; height: 30px; margin: 20px 0 0; border-radius: 50%; background: #FFEEE3; color: #FF6A13; font-size: 13px; }
    #comment h3 { margin: 12px 0 6px; font-size: 21px; font-weight: 700; letter-spacing: -.02em; } #comment article p { margin: 0; font-size: 15px; line-height: 1.55; color: #5E5C63; }
    @media (max-width: 899px) { #comment .re-g { grid-template-columns: 1fr; } }
  </style>
  <div class="wrap">
    <p class="re-etiq">Comment ça marche</p>
    <h2 id="comment-h">Trois étapes, <span>zéro file d'attente.</span></h2>
    <div class="re-g">
      <article><img src="IMG_2" alt="Un colis prêt à partir"><b>1</b><h3>Prépare ton colis</h3><p>Indique le poids et les adresses, imprime l'étiquette ou montre le code.</p></article>
      <article><img src="IMG_3" alt="Une camionnette qui part livrer"><b>2</b><h3>On vient le chercher</h3><p>Un livreur passe chez toi le jour même, ou dépose-le dans un relais.</p></article>
      <article><img src="IMG_4" alt="Un colis livré devant une porte"><b>3</b><h3>Il arrive à bon port</h3><p>Suivi en direct et photo à la livraison, partout en France.</p></article>
    </div>
  </div>
</section>` },
  { id: "tarifs", html: `<section id="tarifs" class="section re-tarifs" aria-labelledby="tarifs-h">
  <style>
    #tarifs { padding-block: clamp(48px, 6vw, 96px) !important; }
    #tarifs .re-boite { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; align-items: center; gap: 24px; padding: clamp(28px, 4vw, 48px); border-radius: 30px; background: #15151A; color: #fff; }
    #tarifs h2 { margin: 0; font-weight: 800; font-size: clamp(30px, 3vw, 44px); line-height: 1.02; letter-spacing: -.03em; color: #fff; } #tarifs h2 span { color: #FF6A13; }
    #tarifs .re-p { padding-left: 24px; border-left: 1px solid rgb(255 255 255 / .16); } #tarifs .re-p small { font-size: 13px; color: #A9A6AD; }
    #tarifs .re-p b { display: block; margin-top: 6px; font-size: 34px; font-weight: 800; letter-spacing: -.02em; } #tarifs .re-p span { font-size: 13px; color: #A9A6AD; }
    @media (max-width: 899px) { #tarifs .re-boite { grid-template-columns: 1fr; } #tarifs .re-p { padding: 16px 0 0; border-left: 0; border-top: 1px solid rgb(255 255 255 / .16); } }
  </style>
  <div class="wrap"><div class="re-boite">
    <h2 id="tarifs-h">Des prix <span>clairs,</span> sans surprise.</h2>
    <div class="re-p"><small>Petit colis</small><b>4,90 €</b><span>jusqu'à 1 kg</span></div>
    <div class="re-p"><small>Colis moyen</small><b>7,90 €</b><span>jusqu'à 5 kg</span></div>
    <div class="re-p" id="pros"><small>Entreprises</small><b>Sur devis</b><span>enlèvements réguliers</span></div>
  </div></div>
</section>` },
  { id: "contact", html: `<footer class="footer closing" id="contact" aria-label="Pied de page">
  <style>
    #contact { padding-block: clamp(56px, 7vw, 96px) 28px !important; }
    #contact .re-g { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 24px; }
    #contact .re-logo { font-size: 26px; font-weight: 800; letter-spacing: -.04em; } #contact .re-logo b { color: #FF6A13; }
    #contact p { margin: 10px 0 0; max-width: 280px; font-size: 14px; line-height: 1.6; color: #5E5C63; }
    #contact h3 { margin: 0 0 12px; font-size: 14px; font-weight: 700; } #contact ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; font-size: 14px; } #contact a { color: #5E5C63; text-decoration: none; }
    #contact .re-copy { margin-top: 48px; padding-top: 18px; border-top: 1px solid #E6E0D9; font-size: 13px; color: #8C8A90; }
    @media (max-width: 767px) { #contact .re-g { grid-template-columns: 1fr 1fr; } }
  </style>
  <div class="wrap">
    <div class="re-g"><div><span class="re-logo">relais<b>.</b></span><p>Ce qui compte pour toi, livré là où il faut.</p></div><div><h3>Envoyer</h3><ul><li><a href="#hero">Un colis</a></li><li><a href="#tarifs">Les tarifs</a></li></ul></div><div><h3>Suivre</h3><ul><li><a href="#comment">Un envoi</a></li><li><a href="#comment">Les relais</a></li></ul></div><div><h3>Aide</h3><ul><li><a href="#contact">Nous écrire</a></li><li><a href="#contact">Mentions légales</a></li></ul></div></div>
    <p class="re-copy">© Relais · modèle de la bibliothèque Bingoo!</p>
  </div>
</footer>` },
];
export const journal = ["Plan : hero, comment, tarifs, contact"];
