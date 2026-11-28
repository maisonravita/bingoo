// Modèle de la bibliothèque « Vallée Verte » (28 nov. 2026) : recopie de la mise en page d'une maquette d'agence
// immobilière en illustration (paysage plein cadre, cartes sombres, liste, biens, encart, pied de page à 4 colonnes).
// Nom, textes et images originaux : aucune marque, aucun texte ni image d'autrui.
export const nom = "Vallée Verte";
export const slugBase = "vallee-verte";
export const metier = "Agence immobilière de maisons à la campagne";
export const design = {
  mode: "dark", style: "Illustré", source: "bibliotheque",
  polices: { titres: "Poppins", texte: "Poppins" },
  couleurs: { background: "#173B34", foreground: "#FFFFFF", primary: "#1FB46B", on_primary: "#FFFFFF", card: "#1F4740", muted: "#1F4740", border: "#2B564D", muted_foreground: "#A9C2BA", accent: "#1FB46B", secondary: "#2B564D", ring: "#1FB46B", on_accent: "#FFFFFF" },
};

const ICO = {
  prix: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 3h6l-1.5 3h-3L9 3Z" fill="currentColor"/><path d="M10.5 6h3c3.6 2.2 6 5.6 6 9a5 5 0 0 1-5 5h-5a5 5 0 0 1-5-5c0-3.4 2.4-6.8 6-9Z" fill="currentColor"/><path d="M13.6 11.2c-.4-.5-1-.8-1.6-.8-1 0-1.6.5-1.6 1.2 0 1.6 3.4.9 3.4 2.6 0 .8-.7 1.3-1.8 1.3-.7 0-1.4-.3-1.8-.8M12 9.4v1M12 15.5v1" stroke="#173B34" stroke-width="1.3" stroke-linecap="round"/></svg>',
  maison: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 11 12 3.5 21 11v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" fill="currentColor"/></svg>',
  rapide: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="11" height="4" rx="1" fill="currentColor"/><rect x="3" y="10" width="11" height="4" rx="1" fill="currentColor"/><rect x="3" y="16" width="11" height="4" rx="1" fill="currentColor"/><circle cx="18" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/><path d="M18 7v1.6M18 15.4V17M22 12h-1.6M15.6 12H14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  coche: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 8.4 2.6 2.4L12 5.4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  fleche: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1920, height: 1088 }, prompt: "IMG_1 is a FLAT VECTOR ILLUSTRATION, not a photograph: a wide digital landscape artwork in a modern flat illustration style, layered stylised mountains in deep teal, pine green and sage green with pale snowy peaks, a pale minty sky with a few soft rounded cream clouds near the top, a bright green valley in the middle third with a winding light path leading to a small cluster of simple countryside houses with gabled roofs and lit windows, rows of dark rounded pine trees framing the left and right edges, the whole lower quarter getting darker and ending in a deep forest green (#173B34) so it melts into a dark page, clean vector shapes, subtle grain, calm, no people, no text, no logo." },
  { id: "IMG_2", pour: "services", taille: "square_hd", prompt: "FLAT VECTOR ILLUSTRATION, not a photograph: a cosy two-storey countryside house with a red-brown gabled roof, cream walls, wooden door and warm lit windows, a small garden with rounded green bushes, a little tree and a stone path in front, the house and garden standing on a rounded patch of grass, isolated on a plain deep forest green background (#173B34), modern flat illustration style with soft shading and subtle grain, no people, no text, no logo." },
  { id: "IMG_3", pour: "biens", taille: "landscape_4_3", prompt: "FLAT VECTOR ILLUSTRATION, not a photograph: a white two-storey family house with a grey slate roof and a green lawn, a small tree on the side, under a light blue sky with a soft cloud, modern flat illustration style, clean shapes, subtle grain, no people, no text, no logo." },
  { id: "IMG_4", pour: "biens", taille: "landscape_4_3", prompt: "FLAT VECTOR ILLUSTRATION, not a photograph: a modern wooden chalet with large windows beside a calm blue lake, pine trees around, light blue sky, modern flat illustration style, clean shapes, subtle grain, no people, no text, no logo." },
  { id: "IMG_5", pour: "biens", taille: "landscape_4_3", prompt: "FLAT VECTOR ILLUSTRATION, not a photograph: an old stone farmhouse with a terracotta tile roof, blue shutters and a climbing plant, a small garden and a gravel path, warm late afternoon light, light sky, modern flat illustration style, clean shapes, subtle grain, no people, no text, no logo." },
];

export const nav = [{ mot: "Accueil", ancre: "hero" }, { mot: "Services", ancre: "services" }, { mot: "Nos biens", ancre: "biens" }, { mot: "À propos", ancre: "pourquoi" }, { mot: "Contact", ancre: "contact" }];

export const sections = [
  { id: "nav", html: `<header class="nav">
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero">Vallée Verte</a>
    <nav class="nav__links" aria-label="Principal">
      <div class="nav__item"><a class="nav__link" href="#hero">Accueil</a></div>
      <div class="nav__item"><a class="nav__link" href="#services">Services</a></div>
      <div class="nav__item"><a class="nav__link" href="#biens">Nos biens</a></div>
      <div class="nav__item"><a class="nav__link" href="#pourquoi">À propos</a></div>
      <div class="nav__item"><a class="nav__link" href="#contact">Contact</a></div>
    </nav>
    <div class="nav__actions">
      <a class="nav__link" href="#contact">Nous appeler</a>
      <a class="btn btn--primary" href="#contact">Estimer mon bien</a>
    </div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    </button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-paysage">
  <img class="hero-paysage__fond" src="IMG_1" alt="Une vallée verte entre les montagnes, avec quelques maisons au bout d'un chemin">
  <div class="hero-paysage__contenu">
    <h1 class="hero-paysage__titre">Trouve la maison où tu as envie de vivre</h1>
    <p>Une maison au calme, entre lacs et montagnes du Vercors ? On t'aide à trouver celle qui te ressemble, au juste prix.</p>
    <a class="btn btn--primary hero-paysage__btn" href="#biens">Voir les maisons</a>
  </div>
</section>` },
  { id: "pourquoi", html: `<section id="pourquoi" class="section tf-pourquoi" aria-labelledby="pourquoi-h">
  <style>
    #pourquoi { padding-block: clamp(64px, 8vw, 112px) !important; }
    #pourquoi h2 { text-align: center; margin: 0 0 clamp(32px, 4vw, 56px); font-weight: 600; font-size: clamp(28px, 2.6vw, 40px); }
    #pourquoi .tf-cartes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(16px, 2vw, 28px); max-width: 1080px; margin-inline: auto; }
    #pourquoi .tf-carte { background: var(--surface, #1F4740); border-radius: 6px; padding: 34px 30px 36px; text-align: center; }
    #pourquoi .tf-ico { display: inline-grid; place-items: center; width: 44px; height: 44px; color: var(--accent, #1FB46B); }
    #pourquoi .tf-ico svg { width: 40px; height: 40px; }
    #pourquoi h3 { margin: 14px 0 14px; font-size: 18px; font-weight: 600; }
    #pourquoi p { margin: 0; font-size: 14px; line-height: 1.75; color: var(--muted, #A9C2BA); }
    @media (max-width: 767px) { #pourquoi .tf-cartes { grid-template-columns: 1fr; } }
  </style>
  <div class="wrap">
    <h2 id="pourquoi-h">Pourquoi nous choisir ?</h2>
    <div class="tf-cartes">
      <article class="tf-carte"><span class="tf-ico">${ICO.prix}</span><h3>Le juste prix</h3><p>Chaque maison est estimée d'après les ventes récentes du village. Tu sais ce que tu paies, sans mauvaise surprise.</p></article>
      <article class="tf-carte"><span class="tf-ico">${ICO.maison}</span><h3>Une maison vérifiée</h3><p>Toiture, chauffage, diagnostics : on visite chaque bien avant de te le proposer et on te dit ce qu'on a vu.</p></article>
      <article class="tf-carte"><span class="tf-ico">${ICO.rapide}</span><h3>Des démarches rapides</h3><p>Offre, compromis, notaire : on s'occupe des papiers et des rendez-vous pour que tu emménages plus vite.</p></article>
    </div>
  </div>
</section>` },
  { id: "services", html: `<section id="services" class="section tf-services" aria-labelledby="services-h">
  <style>
    #services { padding-block: clamp(48px, 6vw, 96px) !important; }
    #services .tf-duo { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(32px, 5vw, 80px); align-items: center; max-width: 1080px; margin-inline: auto; }
    #services .tf-duo img { width: 100%; max-width: 480px; aspect-ratio: 1; object-fit: cover; border-radius: 0; display: block; mask-image: radial-gradient(closest-side, #000 72%, transparent 100%); -webkit-mask-image: radial-gradient(closest-side, #000 72%, transparent 100%); }
    #services h2 { margin: 0; font-weight: 600; font-size: clamp(28px, 2.6vw, 40px); }
    #services .tf-chapo { margin: 14px 0 26px; font-size: 15px; line-height: 1.7; color: var(--muted, #A9C2BA); max-width: 440px; }
    #services ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; max-width: 440px; }
    #services li { display: flex; align-items: center; gap: 14px; background: var(--surface, #1F4740); border-radius: 4px; padding: 12px 16px; font-size: 14px; }
    #services li span { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 4px; background: var(--accent, #1FB46B); color: #fff; flex: none; }
    #services li svg { width: 14px; height: 14px; }
    #services .btn { margin-top: 24px; border-radius: 4px !important; padding: 11px 20px !important; font-size: 13px; }
    @media (max-width: 767px) { #services .tf-duo { grid-template-columns: 1fr; } }
  </style>
  <div class="wrap">
    <div class="tf-duo">
      <img src="IMG_2" alt="Une maison de campagne avec son jardin">
      <div>
        <h2 id="services-h">Ce que nous proposons</h2>
        <p class="tf-chapo">Acheter, vendre ou louer une maison à la campagne, sans y passer tes week-ends.</p>
        <ul>
          <li><span>${ICO.coche}</span>Estimation de ta maison offerte</li>
          <li><span>${ICO.coche}</span>Visites le samedi, sur rendez-vous</li>
          <li><span>${ICO.coche}</span>Diagnostics et papiers préparés pour toi</li>
          <li><span>${ICO.coche}</span>Un seul interlocuteur jusqu'aux clés</li>
        </ul>
        <a class="btn btn--primary" href="#contact">Plus d'informations</a>
      </div>
    </div>
  </div>
</section>` },
  { id: "biens", html: `<section id="biens" class="section tf-biens" aria-labelledby="biens-h">
  <style>
    #biens { padding-block: clamp(48px, 6vw, 96px) !important; }
    #biens .tf-tete { display: flex; align-items: center; justify-content: space-between; gap: 16px; max-width: 1080px; margin: 0 auto clamp(24px, 3vw, 36px); }
    #biens h2 { margin: 0; font-weight: 600; font-size: clamp(26px, 2.4vw, 36px); }
    #biens .tf-fleches { display: flex; gap: 10px; }
    #biens .tf-fleches span { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--border, #2B564D); color: var(--muted, #A9C2BA); }
    #biens .tf-fleches span:first-child svg { transform: rotate(180deg); }
    #biens .tf-fleches span:last-child { background: var(--accent, #1FB46B); border-color: var(--accent, #1FB46B); color: #fff; }
    #biens .tf-fleches svg { width: 14px; height: 14px; }
    #biens .tf-grille { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(16px, 2vw, 26px); max-width: 1080px; margin-inline: auto; }
    #biens .tf-bien { background: var(--surface, #1F4740); border-radius: 6px; overflow: hidden; }
    #biens .tf-bien img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
    #biens .tf-corps { padding: 16px 16px 18px; }
    #biens h3 { margin: 0; font-size: 15px; font-weight: 600; }
    #biens .tf-infos { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 10px 0 14px; font-size: 12px; color: var(--muted, #A9C2BA); }
    #biens .tf-bas { display: flex; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid var(--border, #2B564D); padding-top: 14px; }
    #biens .tf-prix { font-size: 19px; font-weight: 700; }
    #biens .tf-bas a { font-size: 12px; font-weight: 600; color: #fff; background: var(--accent, #1FB46B); border-radius: 4px; padding: 7px 12px; text-decoration: none; }
    @media (max-width: 899px) { #biens .tf-grille { grid-template-columns: 1fr; max-width: 440px; } }
  </style>
  <div class="wrap">
    <div class="tf-tete"><h2 id="biens-h">Nos maisons du moment</h2><div class="tf-fleches" aria-hidden="true"><span>${ICO.fleche}</span><span>${ICO.fleche}</span></div></div>
    <div class="tf-grille">
      <article class="tf-bien"><img src="IMG_3" alt="Une maison familiale blanche avec son jardin"><div class="tf-corps"><h3>Maison familiale, Villard-de-Lans</h3><p class="tf-infos"><span>4 chambres</span><span>2 salles de bain</span><span>140 m²</span></p><div class="tf-bas"><span class="tf-prix">320 000 €</span><a href="#contact">Visiter</a></div></div></article>
      <article class="tf-bien"><img src="IMG_4" alt="Un chalet en bois au bord d'un lac"><div class="tf-corps"><h3>Chalet au bord du lac, Lans-en-Vercors</h3><p class="tf-infos"><span>3 chambres</span><span>1 salle de bain</span><span>95 m²</span></p><div class="tf-bas"><span class="tf-prix">285 000 €</span><a href="#contact">Visiter</a></div></div></article>
      <article class="tf-bien"><img src="IMG_5" alt="Une ferme en pierre aux volets bleus"><div class="tf-corps"><h3>Ferme en pierre, Méaudre</h3><p class="tf-infos"><span>5 chambres</span><span>2 salles de bain</span><span>180 m²</span></p><div class="tf-bas"><span class="tf-prix">410 000 €</span><a href="#contact">Visiter</a></div></div></article>
    </div>
  </div>
</section>` },
  { id: "appel", html: `<section id="appel" class="section tf-appel" aria-labelledby="appel-h">
  <style>
    #appel { padding-block: clamp(32px, 4vw, 64px) !important; }
    #appel .tf-encart { max-width: 1080px; margin-inline: auto; background: var(--surface, #1F4740); border-radius: 10px; padding: clamp(36px, 4vw, 56px) 24px; text-align: center; }
    #appel h2 { margin: 0; font-weight: 600; font-size: clamp(22px, 2vw, 30px); }
    #appel p { margin: 12px auto 22px; max-width: 460px; font-size: 14px; line-height: 1.7; color: var(--muted, #A9C2BA); }
    #appel .btn { border-radius: 4px !important; padding: 11px 22px !important; font-size: 13px; }
  </style>
  <div class="wrap">
    <div class="tf-encart">
      <h2 id="appel-h">Commence ta recherche avec Vallée Verte</h2>
      <p>Dis-nous ce que tu cherches : on te prévient dès qu'une maison qui te ressemble arrive.</p>
      <a class="btn btn--primary" href="#contact">Commencer</a>
    </div>
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing" id="contact" aria-label="Pied de page">
  <style>
    #contact { padding-block: clamp(48px, 5vw, 72px) 24px !important; border-top: 1px solid var(--border, #2B564D); }
    #contact .tf-pied { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 32px; max-width: 1080px; margin-inline: auto; }
    #contact .tf-marque { font-weight: 700; font-size: 17px; }
    #contact .tf-pied p { margin: 12px 0 0; font-size: 13px; line-height: 1.7; color: var(--muted, #A9C2BA); max-width: 260px; }
    #contact h3 { margin: 0 0 14px; font-size: 14px; font-weight: 600; }
    #contact ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; font-size: 13px; }
    #contact ul a { color: var(--muted, #A9C2BA); text-decoration: none; }
    #contact ul a:hover { color: #fff; }
    #contact .tf-copy { max-width: 1080px; margin: 44px auto 0; padding-top: 18px; border-top: 1px solid var(--border, #2B564D); text-align: center; font-size: 12px; color: var(--muted, #A9C2BA); }
    @media (max-width: 767px) { #contact .tf-pied { grid-template-columns: 1fr 1fr; } }
  </style>
  <div class="wrap">
    <div class="tf-pied">
      <div><p class="tf-marque">Vallée Verte</p><p>L'agence des maisons à la campagne, entre lacs et montagnes du Vercors.</p></div>
      <div><h3>Services</h3><ul><li><a href="#biens">Acheter une maison</a></li><li><a href="#services">Vendre ta maison</a></li><li><a href="#services">Louer à l'année</a></li></ul></div>
      <div><h3>Agence</h3><ul><li><a href="#pourquoi">À propos</a></li><li><a href="#biens">Nos maisons</a></li><li><a href="#appel">Être prévenu</a></li></ul></div>
      <div><h3>Contact</h3><ul><li><a href="#contact">Nous écrire</a></li><li><a href="#contact">Prendre rendez-vous</a></li><li><a href="#contact">Mentions légales</a></li></ul></div>
    </div>
    <p class="tf-copy">© Vallée Verte · modèle de la bibliothèque Bingoo!</p>
  </div>
</footer>` },
];
// Pour la bibliothèque (site-modeles.ts) : plan et mises en page
export const journal = ["Premier écran : composition Paysage illustré", "Plan : hero, pourquoi, services, biens, appel, contact"];
