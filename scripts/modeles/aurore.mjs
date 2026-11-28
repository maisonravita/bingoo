// Modèle « Aurore » (28 nov. 2026) : design repris d'une maquette d'assistant IA (menu en pilule, pastille d'annonce, titre
// centré, deux boutons, horizon d'une planète vue de l'espace avec halo, rangée de clients sur la planète, trois colonnes
// aux icônes à bord lumineux, quatre étapes avec panneau de code). Couleurs changées (halo orange et violet au lieu de vert
// et bleu), textes originaux, clients inventés.
export const nom = "Aurore";
export const slugBase = "aurore";
export const metier = "Assistant IA pour le service client";
export const design = {
  mode: "dark", style: "Horizon orangé", source: "bibliotheque",
  polices: { titres: "Figtree", texte: "Figtree" },
  couleurs: { background: "#07060D", foreground: "#FFFFFF", primary: "#FF9A4D", on_primary: "#1A0B02", card: "#0E0C18", muted: "#0E0C18", border: "#221E33", muted_foreground: "#A29DB8", accent: "#B26BFF", secondary: "#0E0C18", ring: "#FF9A4D", on_accent: "#07060D" },
};
const O = "#FF9A4D", V = "#B26BFF";
const DEG = `linear-gradient(135deg, ${O}, ${V})`;
export const images = [
  { id: "IMG_1", pour: "hero", taille: { width: 1920, height: 1088 }, prompt: "Photograph from space of the curved horizon of the Earth at the bottom of the image, clouds over the ocean, a thick glowing atmosphere in warm orange on the left fading to magenta and violet on the right, black starless space above taking the upper half, cinematic, photorealistic, no text." },
  { id: "IMG_2", pour: "etapes", taille: "landscape_4_3", prompt: "Deep space photograph with a faint violet nebula and scattered small stars, very dark, subtle, no planet, no text." },
];
export const nav = [{ mot: "À propos", ancre: "pourquoi" }, { mot: "Fonctions", ancre: "pourquoi" }, { mot: "Avis", ancre: "etapes" }, { mot: "Tarifs", ancre: "contact" }];
const ico = (d) => `<span class="au-ic"><svg viewBox="0 0 24 24" width="30" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg></span>`;
const et = (n, t, p, d, on = false) => `<li class="${on ? "on" : ""}"><svg viewBox="0 0 24 24" width="24" fill="none" stroke="#fff" stroke-width="1.4" aria-hidden="true"><path d="${d}"/></svg><div><b>${n} — ${t}</b><p>${p}</p></div></li>`;

export const sections = [
  { id: "nav", html: `<header class="nav">
  <style>
    header.nav { top: 18px !important; left: 50% !important; right: auto !important; transform: translateX(-50%); width: max-content !important; padding: 0 !important; background: rgb(14 12 24 / .8) !important; border: 1px solid #221E33 !important; border-radius: 999px; -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
    header.nav .nav__bar { max-width: none !important; width: max-content !important; margin: 0 !important; padding: 8px 10px 8px 20px !important; min-height: 0 !important; gap: 34px; }
    header.nav .nav__links { flex: none !important; gap: 20px !important; } header.nav .nav__link { color: #fff !important; font-size: 13px; }
    header.nav .nav__logo { display: inline-flex; align-items: center; gap: 8px; color: #fff !important; font-size: 18px; font-weight: 500; } header.nav .nav__logo i { width: 20px; height: 20px; border-radius: 5px; background: ${DEG}; }
    header.nav .au-in { padding: 7px 14px; border-radius: 999px; border: 1px solid #fff; color: #fff; font-size: 12.5px; text-decoration: none; }
  </style>
  <div class="wrap nav__bar">
    <a class="nav__logo" href="#hero"><i></i>Aurore IA</a>
    <nav class="nav__links" aria-label="Principal"><div class="nav__item"><a class="nav__link" href="#pourquoi">À propos</a></div><div class="nav__item"><a class="nav__link" href="#pourquoi">Fonctions</a></div><div class="nav__item"><a class="nav__link" href="#etapes">Avis</a></div><div class="nav__item"><a class="nav__link" href="#contact">Tarifs</a></div></nav>
    <div class="nav__actions"><a class="au-in" href="#contact">Connexion</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>` },
  { id: "hero", html: `<section id="hero" class="hero hero-immersif au-hero">
  <style>
    #hero { position: relative; overflow: hidden; isolation: isolate; min-height: 0 !important; padding: clamp(150px, 14vw, 180px) 24px 50px !important; text-align: center; color: #fff; background: #07060D !important; }
    #hero > img { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 72%; object-fit: cover; object-position: center top; z-index: -1; }
    #hero .au-pas { display: inline-flex; align-items: center; gap: 10px; padding: 5px 12px 5px 6px; border-radius: 999px; border: 1px solid #221E33; background: #0E0C18; font-size: 11px; color: #A29DB8; } #hero .au-pas i { width: 18px; height: 18px; border-radius: 5px; border: 1px solid ${O}; } #hero .au-pas b { color: #fff; font-weight: 500; }
    #hero h1 { margin: 22px auto 0; max-width: 17ch; font-weight: 500; font-size: clamp(38px, 4.4vw, 60px); line-height: 1.1; letter-spacing: -.01em; color: #fff; }
    #hero p { margin: 22px auto 0; max-width: 560px; font-size: 15px; line-height: 1.55; color: rgb(255 255 255 / .85); }
    #hero .au-act { display: flex; justify-content: center; gap: 16px; margin-top: 30px; } #hero .au-act a { padding: 10px 22px; border-radius: 999px; font-size: 13.5px; text-decoration: none; } #hero .au-act a:first-child { border: 1px solid #fff; color: #fff; } #hero .au-act a:last-child { background: ${O}; color: #1A0B02; font-weight: 500; }
    #hero .au-planete { height: clamp(260px, 22vw, 320px); }
    #hero small { display: block; font-size: 12px; color: rgb(255 255 255 / .8); }
    #hero .au-cl { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px 36px; margin-top: 18px; font-size: 21px; font-weight: 600; color: #fff; }
  </style>
  <img src="IMG_1" alt="">
  <span class="au-pas"><i></i>Discussion multilingue disponible · <b>Accès anticipé →</b></span>
  <h1>Un service client IA, jour et nuit, partout</h1>
  <p>Aurore est un assistant qui répond à vos clients en continu, instantanément et dans plus de 30 langues.</p>
  <div class="au-act"><a href="#contact">Réserver une démo</a><a href="#contact">Essai gratuit →</a></div>
  <div class="au-planete"></div>
  <small>Déjà choisi par plus de 500 équipes</small>
  <div class="au-cl"><span>▲ ALTAÏR</span><span>▦ Mosaïk</span><span>◫ Carnet</span><span style="font-style:italic">◖ comptoir</span><span>✣ ruche</span></div>
</section>` },
  { id: "pourquoi", html: `<section id="pourquoi" class="section au-pourquoi" aria-labelledby="pourquoi-h">
  <style>
    .au-tag { display: inline-block; padding: 4px 12px; border-radius: 999px; background: #1A1726; font-size: 8.5px; font-weight: 600; letter-spacing: .1em; color: #D8D3EA; }
    #pourquoi { padding: clamp(80px, 8vw, 110px) 24px !important; background: #07060D !important; text-align: center; }
    #pourquoi h2, #etapes h2 { margin: 16px auto 0; font-size: clamp(28px, 2.8vw, 38px); font-weight: 500; color: #fff; } #pourquoi > p, #etapes > p { margin: 12px auto 0; font-size: 14px; color: #A29DB8; }
    #pourquoi .au-g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: 920px; margin: 50px auto 0; border: 1px solid #221E33; border-radius: 10px; text-align: left; }
    #pourquoi article { padding: 30px 18px 30px; min-height: 280px; display: flex; flex-direction: column; } #pourquoi article + article { border-left: 1px solid #221E33; }
    .au-ic { display: grid; place-items: center; width: 74px; height: 74px; border-radius: 14px; background: #0E0C18; border: 1.5px solid transparent; background-image: linear-gradient(#0E0C18, #0E0C18), ${DEG}; background-origin: border-box; background-clip: padding-box, border-box; box-shadow: 0 0 24px -6px rgb(255 154 77 / .5); }
    #pourquoi h3 { margin: auto 0 10px; font-size: 14px; font-weight: 500; color: #fff; } #pourquoi article p { margin: 0; font-size: 11.5px; line-height: 1.6; color: #A29DB8; }
    @media (max-width: 767px) { #pourquoi .au-g { grid-template-columns: 1fr; } #pourquoi article + article { border-left: 0; border-top: 1px solid #221E33; } }
  </style>
  <span class="au-tag">POURQUOI AURORE ?</span>
  <h2 id="pourquoi-h">Ne perdez plus jamais un client faute de réponse</h2>
  <p>Trois raisons pour lesquelles les équipes choisissent Aurore plutôt qu'un support classique.</p>
  <div class="au-g">
    <article>${ico("M13 2 4 14h7l-1 8 9-12h-7Z")}<h3>Une réponse immédiate, à chaque fois.</h3><p>Vos clients ont une réponse en quelques secondes, pas en quelques heures. Plus de conversations perdues.</p></article>
    <article>${ico("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3.5 9h17M3.5 15h17M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18")}<h3>Un support qui parle toutes les langues.</h3><p>Anglais, espagnol, arabe ou japonais : Aurore répond dans la langue de votre client.</p></article>
    <article>${ico("M3 17 9 11l4 4 8-8M15 7h6v6")}<h3>Grandissez sans épuiser l'équipe.</h3><p>80 % des questions courantes réglées seules. Votre équipe garde les cas complexes.</p></article>
  </div>
</section>` },
  { id: "etapes", html: `<section id="etapes" class="section au-etapes" aria-labelledby="etapes-h">
  <style>
    #etapes { padding: clamp(40px, 5vw, 70px) 24px clamp(90px, 9vw, 120px) !important; text-align: center; background: radial-gradient(ellipse 40% 30% at 0% 100%, rgb(255 154 77 / .35), transparent), radial-gradient(ellipse 40% 30% at 100% 100%, rgb(178 107 255 / .35), transparent), #07060D !important; }
    #etapes .au-g { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; max-width: 920px; margin: 50px auto 0; text-align: left; }
    #etapes ol { list-style: none; margin: 0; padding: 0; } #etapes li { display: flex; gap: 20px; padding: 18px 0 18px 26px; border-left: 1px solid #221E33; } #etapes li.on { border-left: 2px solid ${O}; }
    #etapes li b { display: block; font-size: 14px; font-weight: 500; color: #fff; } #etapes li p { margin: 8px 0 0; max-width: 280px; font-size: 11.5px; line-height: 1.6; color: #A29DB8; }
    #etapes .au-code { position: relative; border-radius: 14px; overflow: hidden; min-height: 380px; } #etapes .au-code > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    #etapes .au-logo { position: absolute; left: 46px; top: 36px; display: grid; place-items: center; width: 50px; height: 50px; border-radius: 10px; background: #14111F; } #etapes .au-logo i { width: 22px; height: 22px; border-radius: 5px; background: ${DEG}; }
    #etapes pre { position: absolute; left: 24%; right: 10%; top: 26%; margin: 0; padding: 36px 20px 20px; border-radius: 10px; background: rgb(30 27 44 / .9); font-size: 9.5px; line-height: 1.5; color: #E6E2F2; white-space: pre-wrap; } #etapes pre::before { content: "● ● ●"; position: absolute; left: 14px; top: 10px; color: #4A4560; letter-spacing: 2px; }
    #etapes .au-b { position: absolute; bottom: 28px; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 10px; background: #14111F; color: #fff; font-size: 16px; }
    @media (max-width: 767px) { #etapes .au-g { grid-template-columns: 1fr; } }
  </style>
  <span class="au-tag">COMMENT ÇA MARCHE</span>
  <h2 id="etapes-h">Démarrez en 4 étapes simples</h2>
  <p>De zéro à un support mondial, plus vite que vous ne le pensez.</p>
  <div class="au-g">
    <ol>
      ${et(1, "Connecter", "Reliez vos canaux de discussion. Un code à coller, c'est fait en 5 minutes.", "M8 12h8M10 8l-4 4 4 4M14 8l4 4-4 4", true)}
      ${et(2, "Régler", "Donnez à Aurore sa personnalité et ses connaissances : vos questions fréquentes, vos produits.", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3")}
      ${et(3, "Lancer", "Passez en ligne avec un support 24 h/24. Vos clients ont leurs réponses, à toute heure.", "M5 19c0-4 2-9 9-14 1 6-1 10-5 13ZM9 15l-3 3")}
      ${et(4, "Grandir", "Suivez vos résultats, analysez les conversations et améliorez-vous en continu.", "M3 17 9 11l4 4 8-8")}
    </ol>
    <div class="au-code"><img src="IMG_2" alt=""><span class="au-logo"><i></i></span><pre>// Intégration Aurore
&lt;script src="aurore.js"&gt;&lt;/script&gt;
const aurore = new Aurore({
  site: "votre-boutique",
  canaux: ["site", "whatsapp"]
});
aurore.lancer();</pre><span class="au-b" style="left:52%">⧉</span><span class="au-b" style="right:12%">✓</span></div>
  </div>
</section>` },
  { id: "contact", html: `<footer class="footer closing au-contact" id="contact" aria-labelledby="contact-h">
  <style>
    #contact { padding: clamp(70px, 7vw, 100px) 24px 28px !important; background: #07060D !important; text-align: center; }
    #contact h2 { margin: 0 auto; font-size: clamp(30px, 3.2vw, 46px); font-weight: 500; color: #fff; } #contact a.au-go { display: inline-block; margin-top: 28px; padding: 12px 26px; border-radius: 999px; background: ${O}; color: #1A0B02; font-weight: 500; text-decoration: none; }
    #contact .au-pied { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; max-width: 920px; margin: 70px auto 0; padding-top: 18px; border-top: 1px solid #221E33; font-size: 12.5px; color: #A29DB8; }
  </style>
  <h2 id="contact-h">Vos clients n'attendront plus</h2><a class="au-go" href="mailto:bonjour@aurore-ia.fr">Essai gratuit 14 jours →</a>
  <div class="au-pied"><span>© Aurore IA · modèle de la bibliothèque Bingoo!</span><span>bonjour@aurore-ia.fr</span></div>
</footer>` },
];
export const journal = ["Plan : hero, pourquoi, etapes, contact"];
