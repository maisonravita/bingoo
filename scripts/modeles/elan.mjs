// Modèle « Élan » (28 nov. 2026) : recopie d'une maquette de lancement d'outil IA (menu noir en pilule, carte claire
// baignée de violet, texte courbé au-dessus du titre, mot violet, bouton noir, tableau de bord sombre avec histogramme
// et jauge, puis fonctions, avis, tarif et inscription). Nom, textes et données originaux.
export const nom = "Élan";
export const slugBase = "elan";
export const metier = "Outil IA";
export const design = {
  mode: "light", style: "Lavande et violet", source: "bibliotheque",
  polices: { titres: "Space Grotesk", texte: "Space Grotesk" },
  couleurs: { background: "#FFFFFF", foreground: "#0E0E12", primary: "#6E56F5", on_primary: "#FFFFFF", card: "#F3F3F5", muted: "#F3F3F5", border: "#E6E6EC", muted_foreground: "#5E5E6A", accent: "#6E56F5", secondary: "#F3F3F5", ring: "#6E56F5", on_accent: "#FFFFFF" },
};
const V = "#6E56F5";
const logo = (t = 30, c = "#fff") => `<svg viewBox="0 0 32 32" width="${t}" height="${t}" aria-hidden="true"><g stroke="${c}" stroke-width="3.2" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<line x1="${(16 + 6 * Math.cos(a)).toFixed(1)}" y1="${(16 + 6 * Math.sin(a)).toFixed(1)}" x2="${(16 + 13 * Math.cos(a)).toFixed(1)}" y2="${(16 + 13 * Math.sin(a)).toFixed(1)}"/>`; }).join("")}</g></svg>`;
const barres = [76, 96, 56, 80, 56, 92, 78, 81, 78, 87, 96, 72];
const mois = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const ico = (d) => `<i><svg viewBox="0 0 24 24" width="17" fill="none" stroke="#8D8D9A" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg></i>`;
export const images = [];
export const nav = [{ mot: "Fonctions", ancre: "fonctions" }, { mot: "Comment ça marche", ancre: "fonctions" }, { mot: "Avis", ancre: "avis" }, { mot: "Tarifs", ancre: "tarifs" }, { mot: "Contact", ancre: "contact" }];

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    header.nav { top: 14px !important; left: 50% !important; right: auto !important; transform: translateX(-50%); width: min(660px, calc(100% - 24px)) !important; background: #0E0E12 !important; border: 3px solid #fff !important; border-radius: 16px; box-shadow: 0 10px 30px -10px rgb(0 0 0 / .35); }
    header.nav .nav__bar { max-width: none !important; padding: 4px 4px 4px 10px !important; min-height: 0 !important; gap: 14px; }
    header.nav .nav__links { gap: 2px !important; margin: 0 auto; } header.nav .nav__link { color: #fff !important; font-size: 13.5px; padding: 6px 8px !important; }
    header.nav .el-demo { padding: 7px 16px; border-radius: 11px; background: #fff; color: #0E0E12; font-size: 14px; font-weight: 500; text-decoration: none; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero" aria-label="Élan, accueil">${logo(28)}</a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#fonctions">Fonctions</a></div><div class="nav__item"><a class="nav__link" href="#avis">Avis</a></div><div class="nav__item"><a class="nav__link" href="#tarifs">Tarifs</a></div><div class="nav__item"><a class="nav__link" href="#contact">Contact</a></div></nav>
    <div class="nav__actions"><a class="el-demo" href="#fonctions">Voir la démo</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero el-hero">
  <style>
    #hero { min-height: 0 !important; padding: 70px 14px 0 !important; background: #fff !important; }
    #hero .el-carte { position: relative; overflow: hidden; isolation: isolate; max-width: 1240px; margin: 0 auto; padding: clamp(80px, 8vw, 104px) 24px 0; border-radius: 26px; text-align: center; color: #0E0E12;
      background: radial-gradient(ellipse 30% 10% at 50% 0%, rgb(110 86 245 / .75), transparent), radial-gradient(ellipse 60% 48% at 50% 78%, ${V} 0%, rgb(110 86 245 / .55) 45%, transparent 80%), #F1F1F4; }
    #hero .el-courbe { display: block; width: 300px; margin: 0 auto -6px; overflow: visible; }
    #hero h1 { margin: 0 auto; max-width: none; font-weight: 500; font-size: clamp(46px, 5.8vw, 82px); line-height: 1.05; letter-spacing: -.035em; color: #0E0E12; } #hero h1 span { color: ${V} !important; opacity: 1 !important; -webkit-text-fill-color: ${V}; }
    #hero .el-carte > p { margin: 26px auto 0; max-width: 470px; font-size: 16.5px; line-height: 1.45; color: #1E1E26 !important; -webkit-text-fill-color: #1E1E26; opacity: 1 !important; }
    #hero .el-go { display: inline-block; margin-top: 26px; padding: 11px 22px; border-radius: 13px; background: #0E0E12; color: #fff; font-size: 15px; text-decoration: none; box-shadow: 0 0 0 3px rgb(110 86 245 / .4); }
    #hero .el-app { display: grid; grid-template-columns: 58px 1fr; max-width: 1040px; margin: 40px auto 0; border-radius: 14px 14px 0 0; background: #121218; color: #fff; text-align: left; overflow: hidden; }
    #hero .el-app aside { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 18px 0; border-right: 1px solid #23232C; } #hero .el-app aside i { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; } #hero .el-app aside i.on { background: #26262F; }
    #hero .el-ctr { padding: 20px 22px 24px; min-width: 0; }
    #hero .el-top { display: flex; align-items: center; gap: 10px; } #hero .el-top h2 { margin: 0 auto 0 0; font-size: 21px; font-weight: 400; color: #fff; letter-spacing: -.01em; } #hero .el-top span { padding: 6px 12px; border-radius: 999px; border: 1px solid #33333D; font-size: 11px; color: #D5D5DE; }
    #hero .el-g { display: grid; grid-template-columns: 2.1fr 1fr; gap: 14px; margin-top: 22px; }
    #hero .el-p { border: 1px solid #26262F; border-radius: 12px; padding: 16px 18px; } #hero .el-p b { display: block; font-size: 13px; font-weight: 500; } #hero .el-p small { display: block; margin-top: 4px; font-size: 10.5px; color: #8D8D9A; }
    #hero .el-hist { display: grid; grid-template-columns: 24px repeat(12, 1fr); align-items: end; gap: 0 10px; height: 150px; margin-top: 18px; padding-bottom: 18px; position: relative; background: repeating-linear-gradient(180deg, #1E1E26 0 1px, transparent 1px 22px); }
    #hero .el-hist i { position: relative; display: block; border-radius: 999px; background: ${V}; width: 62%; margin: 0 auto; } #hero .el-hist i::after { content: attr(data-m); position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); font-style: normal; font-size: 9px; color: #8D8D9A; }
    #hero .el-hist em { align-self: stretch; display: flex; flex-direction: column; justify-content: space-between; font-style: normal; font-size: 8.5px; color: #8D8D9A; }
    #hero .el-jauge { position: relative; width: 150px; margin: 18px auto 0; } #hero .el-jauge b { position: absolute; left: 0; right: 0; top: 46px; text-align: center; font-size: 22px; font-weight: 500; }
    #hero .el-ok { float: right; color: #4ADE80; font-size: 10px; }
    #hero .el-lim { margin-top: 12px; font-size: 11.5px; } #hero .el-lim small { margin-top: 4px; }
    @media (max-width: 899px) { #hero .el-g { grid-template-columns: 1fr; } #hero .el-app { grid-template-columns: 1fr; } #hero .el-app aside { display: none; } }
  </style>
  <div class="el-carte">
    <svg class="el-courbe" viewBox="0 0 300 56" aria-hidden="true"><defs><path id="el-arc" d="M8 54 Q150 -8 292 54"/></defs><text font-size="13" fill="#0E0E12" font-family="Space Grotesk, sans-serif"><textPath href="#el-arc" startOffset="50%" text-anchor="middle">Rapide ✦ Accessible ✦ Bien référencé</textPath></text></svg>
    <h1>Lancez votre outil IA<br><span data-lisible="1">en un instant !</span></h1>
    <p data-lisible="1">Une page claire, pensée pour convertir, pour les outils IA, les jeunes logiciels et les produits en ligne.</p>
    <a class="el-go" href="#tarifs">Commencer</a>
    <div class="el-app" aria-label="Aperçu du tableau de bord">
      <aside><i>${logo(22)}</i>${ico("M3 11 12 4l9 7v9H3Z")}<i class="on"><svg viewBox="0 0 24 24" width="17" fill="none" stroke="#fff" stroke-width="1.7" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 15v-3M12 15V9M15 15v-5"/></svg></i>${ico("M12 3 3 8l9 5 9-5ZM3 13l9 5 9-5")}${ico("M8 8h11v11H8ZM5 16V5h11")}${ico("M12 3v9l7 4M21 12a9 9 0 1 1-9-9")}${ico("M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a7 7 0 0 1 14 0M17 3a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6")}</aside>
      <div class="el-ctr">
        <div class="el-top"><h2>Bon retour, Camille</h2><span>Personnaliser</span><span>Exporter</span></div>
        <div class="el-g">
          <div class="el-p"><b>Activité des assistants</b><small>Le nombre de réponses données chaque mois.</small>
            <div class="el-hist"><em><span>100</span><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span></em>${barres.map((h, i) => `<i data-m="${mois[i]}" style="height:${h}%"></i>`).join("")}</div></div>
          <div class="el-p"><b>Assistants actifs</b><small>Vous utilisez 80 % de vos places.</small>
            <div class="el-jauge"><svg viewBox="0 0 150 86" aria-hidden="true"><path d="M12 80a63 63 0 0 1 126 0" stroke="#2A2A33" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M12 80a63 63 0 0 1 112-40" stroke="${V}" stroke-width="14" fill="none" stroke-linecap="round"/></svg><b>240</b></div>
            <p class="el-lim" style="margin:12px 0 0;text-align:left;color:#fff;max-width:none">Vous approchez de la limite<span class="el-ok">↗ 10 %</span><small>Passez à l'offre supérieure pour en ajouter.</small></p></div>
        </div>
      </div>
    </div>
  </div>
</section>` },
  { id: "fonctions", html: `<section id="fonctions" class="section el-fonctions" aria-labelledby="fonctions-h">
  <style>
    #fonctions { padding: clamp(72px, 7vw, 110px) 24px !important; background: #fff !important; }
    #fonctions .el-in { max-width: 1180px; margin: 0 auto; width: 100%; }
    #fonctions h2 { margin: 0 0 40px; max-width: 18ch; font-size: clamp(32px, 3.4vw, 50px); font-weight: 500; letter-spacing: -.035em; line-height: 1.05; color: #0E0E12; } #fonctions h2 span { color: ${V}; }
    #fonctions .el-g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    #fonctions article { padding: 14px; border-radius: 22px; background: #F3F3F5; }
    #fonctions .el-vis { position: relative; height: 200px; border-radius: 16px; overflow: hidden; background: linear-gradient(160deg, ${V}, #B9AEFB 55%, #F3F3F5); }
    #fonctions .el-vis span { position: absolute; right: 22px; bottom: 22px; display: grid; gap: 7px; padding: 18px 16px; border-radius: 14px; background: #121218; } #fonctions .el-vis span i { display: block; width: 26px; height: 7px; border-radius: 4px; background: ${V}; }
    #fonctions h3 { margin: 20px 8px 6px; font-size: 19px; font-weight: 500; color: #0E0E12; } #fonctions p { margin: 0 8px 10px; font-size: 14.5px; line-height: 1.55; color: #5E5E6A; }
    @media (max-width: 899px) { #fonctions .el-g { grid-template-columns: 1fr; } }
  </style>
  <div class="el-in"><h2 id="fonctions-h">Tout ce qu'il faut pour <span>lancer vite</span></h2>
  <div class="el-g">
    <article><div class="el-vis"><span aria-hidden="true"><i></i><i></i><i></i></span></div><h3>Assistant de discussion</h3><p>Des réponses claires, à toute heure, pour vos clients.</p></article>
    <article><div class="el-vis" style="background:linear-gradient(200deg,#121218,#3B2FA0 60%,${V})"></div><h3>Tableau de bord</h3><p>Vos chiffres du jour, sans rien installer.</p></article>
    <article><div class="el-vis" style="background:linear-gradient(140deg,#F3F3F5,#D7D0FD 50%,${V})"></div><h3>Mise en ligne en 1 clic</h3><p>Votre page est en ligne, rapide et lisible sur téléphone.</p></article>
  </div></div>
</section>` },
  { id: "avis", html: `<section id="avis" class="section el-avis" aria-label="Avis">
  <style>
    #avis { padding: 0 24px clamp(72px, 7vw, 110px) !important; background: #fff !important; }
    #avis .el-in { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; max-width: 1180px; margin: 0 auto; width: 100%; }
    #avis blockquote { margin: 0; padding: 36px; border-radius: 22px; background: #F3F3F5; } #avis blockquote q { display: block; font-size: clamp(22px, 2vw, 28px); line-height: 1.25; letter-spacing: -.02em; color: #0E0E12; quotes: none; } #avis q span { color: #A9A9B4; }
    #avis cite { display: block; margin-top: 28px; font-style: normal; font-weight: 500; } #avis cite small { display: block; font-weight: 400; color: #8D8D9A; }
    #avis .el-q { font-size: 56px; line-height: .6; color: ${V}; font-family: Georgia, serif; }
    #avis .el-prix { padding: 30px; border-radius: 22px; background: #fff; border: 1px solid #E6E6EC; box-shadow: 0 20px 50px -30px rgb(0 0 0 / .3); } #avis .el-prix b { font-size: 52px; font-weight: 500; letter-spacing: -.04em; } #avis .el-prix b small { font-size: 15px; color: #8D8D9A; letter-spacing: 0; }
    #avis .el-prix p { margin: 14px 0 26px; color: #5E5E6A; } #avis .el-prix a { display: block; padding: 13px; border-radius: 13px; background: #0E0E12; color: #fff; text-align: center; text-decoration: none; box-shadow: 0 0 0 3px rgb(110 86 245 / .35); }
    @media (max-width: 899px) { #avis .el-in { grid-template-columns: 1fr; } }
  </style>
  <div class="el-in" id="tarifs">
    <blockquote><span class="el-q" aria-hidden="true">“</span><q>La qualité du design est meilleure <span>que tout ce que nous avions essayé.</span></q><cite>Clara Hamon<small>Responsable des opérations</small></cite></blockquote>
    <div class="el-prix"><b>29 € <small>/ mois</small></b><p>Tout l'outil, assistants illimités, idéal pour grandir sans limite.</p><a href="#contact">Commencer</a></div>
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing el-contact" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding: 0 14px 14px !important; background: #fff !important; }
    #contact .el-bloc { max-width: 1240px; margin: 0 auto; padding: clamp(64px, 7vw, 96px) 24px 32px; border-radius: 26px; text-align: center; background: radial-gradient(ellipse 70% 60% at 50% 100%, ${V}, rgb(110 86 245 / .45) 50%, transparent 85%), #F1F1F4; }
    #contact h2 { margin: 0 auto; font-size: clamp(30px, 3.2vw, 46px); font-weight: 500; letter-spacing: -.035em; color: #0E0E12; }
    #contact .el-bloc > p { margin: 14px auto 0; max-width: 400px; color: #2A2A33 !important; -webkit-text-fill-color: #2A2A33; opacity: 1 !important; }
    #contact .el-champ { display: flex; justify-content: space-between; align-items: center; width: min(380px, 100%); margin: 26px auto 0; padding: 5px 5px 5px 18px; border-radius: 14px; background: #fff; box-shadow: 0 6px 20px -8px rgb(0 0 0 / .2); font-size: 13.5px; color: #8D8D9A; }
    #contact .el-champ a { padding: 9px 22px; border-radius: 11px; background: #0E0E12; color: #fff; text-decoration: none; font-size: 13.5px; }
    #contact .el-bas { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; max-width: 1080px; margin: clamp(80px, 8vw, 120px) auto 0; font-size: 13px; color: #fff; }
  </style>
  <div class="el-bloc">
    <h2 id="contact-h">Soyez les premiers</h2>
    <p data-lisible="1">Recevez en avant-première les nouveautés, les fonctions et les avantages de lancement.</p>
    <div class="el-champ"><span>vous@entreprise.fr</span><a href="mailto:bonjour@elan.app">Envoyer</a></div>
    <div class="el-bas"><span>© Élan · modèle de la bibliothèque Bingoo!</span><span>bonjour@elan.app</span></div>
  </div>
</footer>` },
];
export const journal = ["Plan : hero, fonctions, avis, contact"];
