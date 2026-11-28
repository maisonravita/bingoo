// Modèle de la bibliothèque « Onde » (28 nov. 2026) : recopie de la mise en page d'une maquette de place de marché
// d'œuvres numériques (texte + deux visuels, cartes à enchères, vus récemment, œuvre du moment avec courbe, tableau).
// Nom, textes et images originaux : aucune marque (ni crypto, ni logo d'avis), prix en euros.
export const nom = "Onde";
export const slugBase = "onde";
export const metier = "Galerie en ligne d'œuvres numériques à collectionner";
export const design = {
  mode: "light", style: "Galerie claire", source: "bibliotheque",
  polices: { titres: "Poppins", texte: "Poppins" },
  couleurs: { background: "#F6F6F6", foreground: "#121212", primary: "#121212", on_primary: "#FFFFFF", card: "#FFFFFF", muted: "#EDEDED", border: "#E4E4E4", muted_foreground: "#8C8C8C", accent: "#121212", secondary: "#EDEDED", ring: "#121212", on_accent: "#FFFFFF" },
};

const F = { g: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.5 5.5 8 10 12.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>', d: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' };
const carte = (img, nom, prix, temps) => `<article class="od-carte"><div class="od-visuel">${img}<span class="od-temps">${temps}</span></div><div class="od-pied"><div><h3>${nom}</h3><p>Enchère actuelle</p><b>${prix}</b></div><a href="#contact">Enchérir</a></div></article>`;
const grad = (a, b, c) => `<span class="od-grad" style="background: radial-gradient(circle at 50% 50%, ${a} 0 14%, ${b} 38%, ${c} 78%)"></span>`;

export const images = [
  { id: "IMG_1", pour: "hero", taille: "square_hd", prompt: "A square studio render: one soft abstract 3D sculpture made of stacked translucent discs of frosted glass and matte ceramic, slightly tilted, in pastel peach, sky blue and pearl white, floating on a pale peach-to-blue gradient background, soft diffused light, gentle shadows, centered, minimal, premium, no text, no logo." },
  { id: "IMG_2", pour: "semaine", taille: "square_hd", prompt: "A square abstract artwork: thick glossy brush strokes of coral red, orange and soft pink swirling across a creamy white surface, macro view, smooth and liquid, soft light, minimal, premium digital art, no text, no logo." },
  { id: "IMG_3", pour: "semaine", taille: "square_hd", prompt: "A square abstract 3D render: smooth flowing white and pale lavender ribbons forming gentle parallel waves, soft shadows, very light and airy, minimal, premium digital art, no text, no logo." },
  { id: "IMG_4", pour: "semaine", taille: "square_hd", prompt: "A square abstract 3D render: a glossy pastel sphere with iridescent blue, lilac and peach reflections resting on curved pastel shapes, soft gradient background, dreamy and minimal, premium digital art, no text, no logo." },
];

export const nav = [{ mot: "Découvrir", ancre: "semaine" }, { mot: "Artistes", ancre: "collections" }, { mot: "Vendre", ancre: "contact" }, { mot: "Chiffres", ancre: "piece" }];

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    .nav .od-logo { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; }
    .nav .od-logo i { display: inline-block; width: 22px; height: 22px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #fff 0 18%, #121212 20%); }
    .nav .od-cherche { display: inline-flex; align-items: center; gap: 8px; width: 220px; padding: 9px 14px; border-radius: 6px; background: #EDEDED; color: #9A9A9A; font-size: 12px; }
    .nav .nav__link { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    .nav .btn { border-radius: 6px !important; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; padding: 10px 16px !important; }
    @media (max-width: 1023px) { .nav .od-cherche { display: none; } }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo od-logo" href="#hero"><i aria-hidden="true"></i>Onde</a>
    <nav class="nav__links" aria-label="Principal">
      <div class="nav__item"><a class="nav__link" href="#semaine">Découvrir</a></div>
      <div class="nav__item"><a class="nav__link" href="#collections">Artistes</a></div>
      <div class="nav__item"><a class="nav__link" href="#contact">Vendre</a></div>
      <div class="nav__item"><a class="nav__link" href="#piece">Chiffres</a></div>
    </nav>
    <div class="nav__actions">
      <span class="od-cherche" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="m10.5 10.5 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Une œuvre, un artiste</span>
      <a class="btn btn--primary" href="#contact">Se connecter</a>
    </div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-duo">
  <div class="hero-duo__texte">
    <h1 class="hero-duo__titre">Découvre et collectionne des œuvres</h1>
    <p>Achète et vends des œuvres numériques signées par leurs artistes, sur une galerie de plus de 240 000 pièces. <b>20 € offerts</b> sur ta première enchère.</p>
    <div class="hero-duo__btns"><a class="btn btn--primary" href="#semaine">Explorer</a><a class="btn btn--ghost" href="#contact">Vendre une œuvre</a></div>
    <dl class="hero-duo__chiffres"><div><dt>240K+</dt><dd>Œuvres</dd></div><div><dt>159K+</dt><dd>Artistes</dd></div><div><dt>87K+</dt><dd>Collections</dd></div></dl>
  </div>
  <div class="hero-duo__visuels" aria-hidden="true">
    <img class="hero-duo__un" src="IMG_1" alt="">
    <span class="hero-duo__deux"></span>
    <span class="hero-duo__points"></span>
  </div>
</section>` },
  { id: "semaine", html: `<section id="semaine" class="section od-semaine" aria-labelledby="semaine-h">
  <style>
    #semaine { background: #EDEDED; padding-block: clamp(56px, 7vw, 96px) !important; overflow: hidden; position: relative; }
    #semaine h2 { text-align: center; margin: 0 0 clamp(28px, 3.5vw, 44px); font-weight: 600; font-size: clamp(26px, 2.6vw, 38px); color: #C4C4C4; }
    #semaine .od-rang { display: flex; gap: 18px; justify-content: center; width: max(100%, 1180px); margin-left: 50%; transform: translateX(-50%); }
    #semaine .od-carte { flex: 0 0 200px; background: #fff; border-radius: 14px; padding: 8px; box-shadow: 0 20px 40px -30px rgb(0 0 0 / .35); }
    #semaine .od-visuel { position: relative; aspect-ratio: 1; border-radius: 10px; overflow: hidden; }
    #semaine .od-visuel img, #semaine .od-grad { display: block; width: 100%; height: 100%; object-fit: cover; }
    #semaine .od-temps { position: absolute; right: 8px; top: 8px; padding: 4px 8px; border-radius: 6px; background: rgb(20 20 20 / .45); color: #fff; font-size: 10px; backdrop-filter: blur(6px); }
    #semaine .od-pied { display: flex; align-items: end; justify-content: space-between; gap: 8px; padding: 10px 4px 4px; }
    #semaine h3 { margin: 0; font-size: 13px; font-weight: 600; }
    #semaine .od-pied p { margin: 4px 0 2px; font-size: 10px; color: #9A9A9A; }
    #semaine .od-pied b { font-size: 12px; }
    #semaine .od-pied a { flex: none; padding: 8px 10px; border-radius: 6px; background: #121212; color: #fff; font-size: 9.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; text-decoration: none; }
    #semaine .od-fleches { display: flex; justify-content: center; margin-top: 34px; }
    #semaine .od-fleches span { display: inline-flex; background: #fff; border-radius: 10px; box-shadow: 0 14px 30px -18px rgb(0 0 0 / .4); }
    #semaine .od-fleches i { display: inline-grid; place-items: center; width: 44px; height: 38px; color: #121212; }
    #semaine .od-fleches i + i { border-left: 1px solid #EDEDED; }
    #semaine .od-fleches svg { width: 14px; height: 14px; }
    #semaine .od-vus { position: absolute; right: max(4vw, calc(50% - 560px)); bottom: clamp(20px, 3vw, 40px); width: 230px; background: #fff; border-radius: 12px; padding: 14px 14px 10px; box-shadow: 0 24px 50px -28px rgb(0 0 0 / .4); }
    #semaine .od-vus p { margin: 0 0 10px; font-size: 12px; font-weight: 600; }
    #semaine .od-vus li { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid #F0F0F0; font-size: 11px; }
    #semaine .od-vus ul { list-style: none; margin: 0; padding: 0; }
    #semaine .od-vus em { width: 26px; height: 26px; border-radius: 50%; flex: none; }
    #semaine .od-vus span { flex: 1; } #semaine .od-vus small { display: block; color: #9A9A9A; font-size: 9.5px; }
    #semaine .od-vus b { text-align: right; } #semaine .od-vus b small { font-weight: 500; }
    @media (max-width: 899px) { #semaine .od-vus { display: none; } #semaine .od-rang { justify-content: flex-start; } }
  </style>
  <h2 id="semaine-h">Le top de la semaine</h2>
  <div class="od-rang">
    ${carte(grad("#FF8A3D", "#F8C0A0", "#C8D8EE"), "Soleil de verre", "180 €", "02h 41m 08s")}
    ${carte('<img src="IMG_1" alt="Sculpture de disques pastel">', "Pile douce", "175 €", "07h 09m 12s")}
    ${carte('<img src="IMG_2" alt="Coups de pinceau corail">', "Corail", "175 €", "07h 09m 12s")}
    ${carte('<img src="IMG_3" alt="Vagues blanches et lavande">', "Houle blanche", "125 €", "13h 21m 12s")}
    ${carte('<img src="IMG_4" alt="Sphère irisée pastel">', "Bulle", "125 €", "19h 05m 40s")}
  </div>
  <div class="od-fleches"><span><i>${F.g}</i><i>${F.d}</i></span></div>
  <aside class="od-vus" aria-label="Vus récemment"><p>Vus récemment</p><ul>
    <li><em style="background: radial-gradient(circle, #FF8A3D, #F8C0A0)"></em><span>Atelier Lune<small>par Inès</small></span><b>845 €<small style="color:#1FA35C">+25,00 %</small></b></li>
    <li><em style="background: radial-gradient(circle, #8FA8FF, #D9C8F5)"></em><span>Julie S.<small>par Julie</small></span><b>532 €<small style="color:#E2473B">−12,00 %</small></b></li>
  </ul></aside>
</section>` },
  { id: "piece", html: `<section id="piece" class="section od-piece" aria-labelledby="piece-h">
  <style>
    #piece { padding-block: clamp(56px, 7vw, 104px) !important; }
    #piece .od-fiche { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: clamp(24px, 3vw, 44px); max-width: 1000px; margin-inline: auto; background: #fff; border-radius: 16px; padding: clamp(18px, 2vw, 26px); box-shadow: 0 30px 60px -40px rgb(0 0 0 / .35); }
    #piece .od-grand { aspect-ratio: 1.1; border-radius: 12px; background: radial-gradient(circle at 48% 52%, #FF7A1A 0 12%, #FF9C47 24%, #F6C3A2 44%, #BCD0EA 66%, #DCE6F2 88%); }
    #piece h2 { margin: 6px 0 10px; font-weight: 600; font-size: clamp(26px, 2.4vw, 34px); letter-spacing: -.01em; }
    #piece .od-desc { margin: 0; font-size: 13px; line-height: 1.7; color: #9A9A9A; max-width: 320px; }
    #piece .od-gens { display: flex; gap: 28px; margin: 22px 0; font-size: 11px; color: #9A9A9A; }
    #piece .od-gens div { display: flex; align-items: center; gap: 10px; } #piece .od-gens b { display: block; color: #121212; font-size: 13px; }
    #piece .od-gens em { width: 32px; height: 32px; border-radius: 50%; }
    #piece .od-mise { display: flex; justify-content: space-between; align-items: end; padding-top: 18px; border-top: 1px solid #F0F0F0; font-size: 11px; color: #9A9A9A; }
    #piece .od-mise b { display: block; margin-top: 4px; font-size: 22px; color: #121212; } #piece .od-mise span { text-align: right; } #piece .od-mise span b { font-size: 12px; }
    #piece .od-encherir { display: block; margin-top: 20px; padding: 14px; border-radius: 8px; background: #121212; color: #fff; text-align: center; font-size: 13px; font-weight: 600; text-decoration: none; }
    #piece .od-bas { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 18px; max-width: 1000px; margin: 22px auto 0; }
    #piece .od-boite { background: #fff; border-radius: 14px; padding: 18px; box-shadow: 0 24px 50px -38px rgb(0 0 0 / .35); }
    #piece .od-boite > p { margin: 0 0 12px; font-size: 12px; font-weight: 600; display: flex; justify-content: space-between; }
    #piece .od-boite > p small { font-weight: 400; color: #9A9A9A; }
    #piece svg.od-courbe { width: 100%; height: auto; display: block; }
    #piece .od-durees { display: flex; justify-content: space-between; margin-top: 8px; font-size: 10px; color: #9A9A9A; }
    #piece .od-durees b { padding: 3px 8px; border-radius: 5px; background: #EDEDED; color: #121212; font-weight: 500; }
    #piece .od-histo { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    #piece .od-histo li { display: flex; align-items: center; gap: 10px; padding: 9px; border-radius: 8px; border: 1px solid #F0F0F0; font-size: 11px; }
    #piece .od-histo em { width: 24px; height: 24px; border-radius: 50%; } #piece .od-histo span { flex: 1; } #piece .od-histo small { display: block; color: #9A9A9A; font-size: 9.5px; }
    #piece .od-ta { margin-top: 14px; font-size: 11px; font-weight: 600; }
    #piece .od-champ { display: flex; gap: 6px; margin-top: 8px; } #piece .od-champ span { flex: none; padding: 8px 10px; border-radius: 6px; background: #121212; color: #fff; font-size: 11px; } #piece .od-champ i { flex: 1; border: 1px solid #E4E4E4; border-radius: 6px; }
    #piece .od-champ + a { display: block; margin-top: 8px; padding: 10px; border-radius: 6px; background: #121212; color: #fff; text-align: center; font-size: 11px; font-weight: 600; text-decoration: none; }
    @media (max-width: 899px) { #piece .od-fiche, #piece .od-bas { grid-template-columns: 1fr; } }
  </style>
  <div class="wrap">
    <div class="od-fiche">
      <div class="od-grand" role="img" aria-label="Un soleil orange flou sur un fond bleu pâle"></div>
      <div>
        <h2 id="piece-h">Soleil de verre</h2>
        <p class="od-desc">Une série de 1 000 tirages numériques signés, tous différents, autour d'une même lumière d'été.</p>
        <div class="od-gens"><div><em style="background: radial-gradient(circle at 40% 35%, #F7B4C8, #D6548A)"></em><span>Créée par<b>Inès L.</b></span></div><div><em style="background: radial-gradient(circle at 40% 35%, #FFD59E, #B9783F)"></em><span>Détenue par<b>Malo V.</b></span></div></div>
        <div class="od-mise"><div>Enchère actuelle<b>175 €</b></div><span>Fin le<b>17 juin à 20 h</b></span></div>
        <a class="od-encherir" href="#contact">Enchérir</a>
      </div>
    </div>
    <div class="od-bas">
      <div class="od-boite"><p>Historique des enchères <small>10 – 16 juin</small></p>
        <svg class="od-courbe" viewBox="0 0 600 180" aria-hidden="true"><g stroke="#EDEDED"><path d="M30 20h560M30 60h560M30 100h560M30 140h560"/></g><g fill="#9A9A9A" font-size="10" font-family="Poppins, sans-serif"><text x="4" y="24">200</text><text x="4" y="64">150</text><text x="4" y="104">100</text><text x="4" y="144">50</text></g><path d="M40 150 C 80 150 90 110 130 112 S 170 60 210 70 S 250 120 280 110 S 320 40 360 44 S 400 90 430 70 S 470 30 500 42 S 540 92 590 96" fill="none" stroke="#121212" stroke-width="2.2"/><circle cx="500" cy="42" r="5" fill="#fff" stroke="#121212" stroke-width="2"/><rect x="470" y="10" width="62" height="20" rx="4" fill="#121212"/><text x="501" y="24" fill="#fff" font-size="10" text-anchor="middle" font-family="Poppins, sans-serif">165 €</text></svg>
        <div class="od-durees"><span>1 j</span><b>5 j</b><span>1 m</span><span>3 m</span><span>6 m</span><span>1 an</span><span>2 ans</span></div>
      </div>
      <div class="od-boite"><p>Dernières enchères</p>
        <ul class="od-histo"><li><em style="background: radial-gradient(circle, #FFB27A, #E06A2B)"></em><span>Sami<small>16 juin, 11 h 55</small></span><b>155 €</b></li><li><em style="background: radial-gradient(circle, #A9C2FF, #5D7BE0)"></em><span>Tess<small>16 juin, 10 h 20</small></span><b>140 €</b></li></ul>
        <p class="od-ta">Ton enchère</p><div class="od-champ"><span>€</span><i></i></div><a href="#contact">Valider</a>
      </div>
    </div>
  </div>
</section>` },
  { id: "collections", html: `<section id="collections" class="section od-collections" aria-labelledby="collections-h">
  <style>
    #collections { padding-block: clamp(48px, 6vw, 88px) !important; }
    #collections h2 { text-align: center; margin: 0 0 clamp(28px, 3vw, 40px); font-weight: 600; font-size: clamp(24px, 2.2vw, 32px); }
    #collections .od-table { max-width: 900px; margin-inline: auto; }
    #collections .od-ligne { display: grid; grid-template-columns: 2fr repeat(5, 1fr); align-items: center; gap: 12px; padding: 16px 8px; border-bottom: 1px solid #EDEDED; font-size: 13px; text-align: right; }
    #collections .od-ligne > :first-child { text-align: left; display: flex; align-items: center; gap: 14px; }
    #collections .od-tete { color: #9A9A9A; font-size: 12px; border-bottom: 0; }
    #collections .od-ligne em { width: 40px; height: 40px; border-radius: 50%; flex: none; }
    #collections .od-ligne small { display: block; color: #9A9A9A; font-size: 11px; }
    #collections .od-plus { color: #1FA35C; } #collections .od-moins { color: #E2473B; }
    @media (max-width: 767px) { #collections .od-ligne { grid-template-columns: 1.6fr 1fr 1fr; } #collections .od-ligne > :nth-child(n+4) { display: none; } }
  </style>
  <div class="wrap">
    <h2 id="collections-h">Les collections les plus suivies</h2>
    <div class="od-table" role="table" aria-label="Collections">
      <div class="od-ligne od-tete" role="row"><span>Collection</span><span>Volume</span><span>24 h</span><span>Prix plancher</span><span>Collectionneurs</span><span>Œuvres</span></div>
      <div class="od-ligne" role="row"><span><em style="background: radial-gradient(circle at 40% 35%, #FFC9A3, #F06B2C)"></em><span>Lumières d'été<small>par Inès L.</small></span></span><span>8 456 €</span><span class="od-plus">+27,78 %</span><span>35 €</span><span>2,2K</span><span>500</span></div>
      <div class="od-ligne" role="row"><span><em style="background: radial-gradient(circle at 40% 35%, #C9D6FF, #6A7FE8)"></em><span>Houles<small>par Malo V.</small></span></span><span>4 780 €</span><span class="od-plus">+12,40 %</span><span>79 €</span><span>3,4K</span><span>900</span></div>
      <div class="od-ligne" role="row"><span><em style="background: radial-gradient(circle at 40% 35%, #E9D3FF, #9B6BE0)"></em><span>Sphères<small>par Tess R.</small></span></span><span>3 120 €</span><span class="od-moins">−4,10 %</span><span>42 €</span><span>1,8K</span><span>320</span></div>
    </div>
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing" id="contact" aria-label="Pied de page">
  <style>
    #contact { padding-block: clamp(48px, 5vw, 72px) 24px !important; border-top: 1px solid #E4E4E4; }
    #contact .od-pied { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 32px; max-width: 1000px; margin-inline: auto; }
    #contact .od-marque { font-weight: 700; font-size: 17px; margin: 0; }
    #contact .od-pied > div > p:not(.od-marque) { margin: 10px 0 0; font-size: 13px; line-height: 1.7; color: #8C8C8C; max-width: 260px; }
    #contact h3 { margin: 0 0 12px; font-size: 13px; font-weight: 600; }
    #contact ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; font-size: 13px; }
    #contact ul a { color: #8C8C8C; text-decoration: none; }
    #contact .od-copy { max-width: 1000px; margin: 40px auto 0; padding-top: 16px; border-top: 1px solid #E4E4E4; text-align: center; font-size: 12px; color: #8C8C8C; }
    @media (max-width: 767px) { #contact .od-pied { grid-template-columns: 1fr 1fr; } }
  </style>
  <div class="wrap">
    <div class="od-pied">
      <div><p class="od-marque">Onde</p><p>La galerie en ligne des œuvres numériques signées, à collectionner en euros.</p></div>
      <div><h3>Galerie</h3><ul><li><a href="#semaine">Le top de la semaine</a></li><li><a href="#collections">Collections</a></li><li><a href="#piece">Œuvre du moment</a></li></ul></div>
      <div><h3>Artistes</h3><ul><li><a href="#contact">Vendre une œuvre</a></li><li><a href="#contact">Frais et paiements</a></li></ul></div>
      <div><h3>Aide</h3><ul><li><a href="#contact">Nous écrire</a></li><li><a href="#contact">Mentions légales</a></li></ul></div>
    </div>
    <p class="od-copy">© Onde · modèle de la bibliothèque Bingoo!</p>
  </div>
</footer>` },
];
export const journal = ["Premier écran : composition Vitrine en duo", "Plan : hero, semaine, piece, collections, contact"];
