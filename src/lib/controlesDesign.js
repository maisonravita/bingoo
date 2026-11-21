// Contrôles de finition gratuits (sans IA), repris de Taste Skill (gate/copy-lint, licence MIT) et de la checklist
// d'UI UX Pro Max (licence MIT). Une seule source pour trois usages :
//  - le robot de la page (appShell, injecté tel quel par Function.prototype.toString : tout est DANS les fonctions) ;
//  - le robot du serveur (scripts/verif-apps.mjs, page.evaluate) pour le site public à 390 et 320 px ;
//  - le plan (supabase/functions/_shared/design-fiches.ts) pour le copy-lint français.
// Chaque fonction est autonome : aucune variable extérieure.

/** Copy-lint français : ce qui trahit un texte écrit par une IA. `corps` : texte courant (les ! y sont interdits). */
export function lintFr(texte, corps = true) {
  // Le nom « Bingoo! » (la marque) n'est pas une exclamation
  const t = String(texte ?? "").replace(/Bingoo!/g, "Bingoo");
  if (!t.trim()) return [];
  const INTERDITS = ["révolutionnaire", "révolutionner", "sans effort", "de pointe", "incontournable", "booster", "propulser", "propulsez", "boostez",
    "sublimer", "subliment", "sublimez", "transformer votre", "transformez votre", "inégalé", "inégalée", "next-level", "game changer", "game-changer",
    "synergie", "holistique", "écosystème", "véritable révolution", "solution clé en main", "expérience unique", "à la pointe"];
  const REGLES = [
    [/à portée de (main|clic)/i, "« à portée de main »"],
    [/en (quelques|un seul|deux|trois) clics?/i, "« en quelques clics »"],
    [/que vous soyez .{1,60} ou /i, "« Que vous soyez… ou… »"],
    [/dites adieu à/i, "« Dites adieu à… »"],
    [/dans un monde (où|en constante)/i, "« Dans un monde où… »"],
    [/ne cherchez plus/i, "« Ne cherchez plus »"],
    [/(plus qu'un|bien plus qu'un) .{1,30}, (c'est|un)/i, "« Plus qu'un X, c'est un Y »"],
    [/rejoignez (des milliers|plus de)/i, "« Rejoignez des milliers… »"],
    [/(le résultat|la différence|le secret)\s*\?/i, "question-réponse (« Le résultat ? »)"],
    [/au c(œ|oe)ur de/i, "« au cœur de »"],
    [/en toute simplicité/i, "« en toute simplicité »"],
    [/\bje suis (une? )?(application|logiciel|site|plateforme|outil)\b/i, "reste de modèle (« Je suis application de… »)"],
    [/\[(nom|votre nom|entreprise|ville|prénom)[^\]]*\]/i, "reste de modèle ([Nom])"],
    [/lorem ipsum/i, "reste de modèle (lorem)"],
    [/\{\{[^}]*\}\}/, "reste de modèle ({{…}})"],
    [/\*\*[^*\n]{1,60}\*\*|(^|\n)#{1,3} /, "balisage Markdown visible"],
    [/\b(bien sûr !|voici (votre|le|la|les) )/i, "reste de conversation"],
  ];
  const ext = (i) => t.slice(Math.max(0, i - 25), i + 35).replace(/\s+/g, " ").trim();
  const out = [], bas = t.toLowerCase();
  for (const m of INTERDITS) { const i = bas.indexOf(m); if (i >= 0) out.push({ regle: "mot interdit « " + m + " »", extrait: ext(i) }); }
  for (const [re, nom] of REGLES) { const r = re.exec(t); if (r) out.push({ regle: nom, extrait: ext(r.index) }); }
  const tirets = (t.replace(/(\d) [–—] (?=\d)/g, "$1-").match(/ — | – /g) ?? []).length;
  if (tirets >= 2) out.push({ regle: "tirets cadratins en série (" + tirets + ")", extrait: ext(Math.max(t.indexOf("—"), t.indexOf("–"))) });
  if (corps && t.length > 40 && /[a-zà-ÿ]!(\s|$)|\s!(\s|$)/i.test(t)) out.push({ regle: "point d'exclamation dans le texte", extrait: ext(t.indexOf("!")) });
  return out;
}

/** Contrôles de finition d'une zone affichée (écran d'app ou page publique). Rend des phrases courtes, 4 au plus.
 *  `page` : la page publique entière (débordement de la fenêtre, balises de partage, zone vide, ordre des titres).
 *  `lint` : la fonction lintFr, passée en paramètre (injectée telle quelle, une fonction ne peut pas en appeler une autre par son nom). */
export function controlesDesign(zone, page = false, lint = null) {
  const pbs = [];
  if (!zone) return pbs;
  const W = innerWidth, mobile = W <= 480;
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 1 && r.height > 1 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05; };
  const court = (el) => (el.innerText || el.getAttribute("aria-label") || el.alt || "").replace(/\s+/g, " ").trim().slice(0, 40);
  // Tailwind 4 rend ses couleurs en oklch() : on les convertit par un canevas (sinon un bouton rouge à texte blanc était lu « blanc sur blanc »)
  const cnv = document.createElement("canvas"); cnv.width = cnv.height = 1; const cx2 = cnv.getContext("2d", { willReadFrequently: true });
  const rgb = (c) => { const m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(c || ""); if (m) return [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]]; if (!c || !cx2 || c === "transparent") return null; try { cx2.clearRect(0, 0, 1, 1); cx2.fillStyle = "rgba(0,0,0,0)"; cx2.fillStyle = c; cx2.fillRect(0, 0, 1, 1); const d = cx2.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; } catch (e) { return null; } };
  const lum = ([r, g, b]) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // Fond réel : la première couleur opaque en remontant ; un dégradé compte pour toutes ses couleurs (on garde la pire) ;
  // une image de fond n'est pas mesurable ici
  const fondsDe = (el) => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n); const bi = cs.backgroundImage; if (bi && bi !== "none") { if (/url\(/.test(bi)) return null; const stops = [...bi.matchAll(/rgba?\([^)]*\)/g)].map((m) => rgb(m[0])).filter((c) => c && c[3] > 0.5); if (stops.length) return stops; } const c = rgb(cs.backgroundColor); if (c && c[3] > 0.9) return [c]; } return [[255, 255, 255, 1]]; };
  const tous = [...zone.querySelectorAll("*")].filter(vis);
  const textes = tous.filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1));

  // Contraste du texte : 4,5:1 (3:1 pour le grand texte), le texte sur image ou dégradé n'est pas mesurable ici
  const contrastes = [];
  for (const el of textes.slice(0, 400)) {
    const cs = getComputedStyle(el), c = rgb(cs.color), fs = fondsDe(el);
    if (!c || !fs || c[3] < 0.5) continue;
    const taille = parseFloat(cs.fontSize), gras = Number(cs.fontWeight) >= 700;
    const seuil = taille >= 24 || (gras && taille >= 18.66) ? 3 : 4.5;
    const r = Math.min(...fs.map((f) => ratio(c, f)));
    if (r < seuil) contrastes.push(court(el) + " (" + r.toFixed(1) + ":1)");
  }
  if (contrastes.length) pbs.push("Contraste trop faible (minimum 4,5:1) : « " + contrastes.slice(0, 2).join(" », « ") + " ».");

  // Emoji à la place d'une icône (bouton, lien, titre, élément de liste qui commence par un emoji)
  const emo = /^\p{Extended_Pictographic}/u;
  const emojis = tous.filter((el) => /^(BUTTON|A|H[1-6]|LI|LABEL)$/.test(el.tagName) && emo.test((el.innerText || "").trim()));
  if (emojis.length) pbs.push("Emoji utilisé comme icône (" + emojis.length + ") : « " + court(emojis[0]) + " » ; utiliser une icône SVG.");

  // Tout ce qui se clique : curseur pointeur, zone tactile suffisante
  const cliquables = tous.filter((el) => el.matches("button:not([disabled]), a[href], [role=button], summary, select, input[type=checkbox], input[type=radio]"));
  const sansPointeur = cliquables.filter((el) => getComputedStyle(el).cursor !== "pointer" && !el.matches("select, input"));
  if (sansPointeur.length) pbs.push("Curseur pointeur absent sur " + sansPointeur.length + " élément(s) cliquable(s), dont « " + court(sansPointeur[0]) + " ».");
  const mini = mobile ? 44 : 24;
  // (une case à cocher dans son libellé se clique sur tout le libellé : elle ne compte pas)
  const petits = cliquables.filter((el) => { const r = el.getBoundingClientRect(); return (r.height < mini - 0.5 || r.width < mini - 0.5) && !el.closest("nav p, p, li > a:only-child, label") && el.matches("button, [role=button], input"); });
  if (petits.length) pbs.push("Zone tactile trop petite (moins de " + mini + " px) : « " + court(petits[0]) + " ».");

  // Textes et badges coupés (texte qui dépasse de sa boîte sans retour à la ligne)
  const coupes = textes.filter((el) => { const cs = getComputedStyle(el); return el.scrollWidth > el.clientWidth + 2 && (cs.overflowX === "hidden" || cs.overflowX === "clip" || cs.textOverflow === "ellipsis") && el.clientWidth > 0; });
  if (coupes.length) pbs.push("Texte coupé : « " + court(coupes[0]) + " ».");

  // Images sans texte alternatif, champs sans libellé
  const sansAlt = tous.filter((el) => el.tagName === "IMG" && !el.hasAttribute("alt"));
  if (sansAlt.length) pbs.push("Image sans texte alternatif (" + sansAlt.length + ").");
  // (le piège à robots caché, aria-hidden ou hors tabulation, ne compte pas)
  const champs = tous.filter((el) => el.matches("input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), select, textarea") && el.getAttribute("aria-hidden") !== "true" && el.getAttribute("tabindex") !== "-1");
  const sansLabel = champs.filter((el) => !(el.id && zone.ownerDocument.querySelector('label[for="' + el.id + '"]')) && !el.closest("label") && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !el.getAttribute("title"));
  if (sansLabel.length) pbs.push("Champ sans libellé (" + sansLabel.length + ")" + (sansLabel[0].placeholder ? ", dont « " + sansLabel[0].placeholder.slice(0, 30) + " » (le texte indicatif ne suffit pas)" : "") + ".");

  // Éléments qui se chevauchent (textes et boutons, hors parents/enfants)
  // (un menu ou une fenêtre ouverte recouvre la page par nature : exclus)
  const blocs = tous.filter((el) => el.matches("h1, h2, h3, p, button, a[href], label, li") && court(el) && (el.innerText || "").trim() && !el.closest("[role=menu], [role=dialog], [role=listbox], [aria-modal=true]")).slice(0, 160);
  let chevauche = null;
  for (let i = 0; i < blocs.length && !chevauche; i++) for (let j = i + 1; j < blocs.length; j++) {
    const a = blocs[i], b = blocs[j];
    if (a.contains(b) || b.contains(a)) continue;
    // Ligne par ligne (getClientRects) : un lien qui passe à la ligne n'est pas un grand rectangle qui recouvre ses voisins
    let touche = false;
    for (const r of a.getClientRects()) { for (const t of b.getClientRects()) {
      const x = Math.min(r.right, t.right) - Math.max(r.left, t.left), y = Math.min(r.bottom, t.bottom) - Math.max(r.top, t.top);
      if (x > 4 && y > 4 && x * y > 0.25 * Math.min(r.width * r.height, t.width * t.height)) { touche = true; break; }
    } if (touche) break; }
    if (touche) { chevauche = "« " + court(a) + " » et « " + court(b) + " »"; break; }
  }
  if (chevauche) pbs.push("Éléments qui se chevauchent : " + chevauche + ".");

  // Contenu qui dépasse de la largeur de l'écran
  const deborde = tous.find((el) => { const r = el.getBoundingClientRect(); return r.right > W + 2 && getComputedStyle(el).position !== "fixed" && !el.closest("[class*=overflow-x-auto], [class*=overflow-auto], [style*=overflow]"); });
  if (deborde || (page && document.documentElement.scrollWidth > W + 2)) pbs.push("Du contenu dépasse de l'écran à " + W + " px" + (deborde ? " : « " + (court(deborde) || deborde.tagName.toLowerCase()) + " »" : "") + ".");

  if (page) {
    // Ordre des titres (pas de saut de niveau, un seul h1)
    const titres = [...zone.querySelectorAll("h1, h2, h3, h4")].filter(vis).map((h) => +h.tagName[1]);
    const h1 = titres.filter((n) => n === 1).length;
    if (h1 !== 1) pbs.push("La page doit avoir un seul grand titre (h1), elle en a " + h1 + ".");
    else for (let k = 1; k < titres.length; k++) if (titres[k] > titres[k - 1] + 1) { pbs.push("Ordre des titres : un h" + titres[k] + " suit un h" + titres[k - 1] + "."); break; }
    // Balises de partage (seulement sur la vraie adresse publique : page === "url")
    if (page === "url") {
    const meta = (n) => document.querySelector('meta[property="' + n + '"], meta[name="' + n + '"]')?.content;
    const manque = ["og:title", "og:description", "og:image", "description"].filter((n) => !meta(n));
    if (manque.length) pbs.push("Balises de partage absentes : " + manque.join(", ") + ".");
    }
    // Zone vide : plus de la moitié de la hauteur de l'écran sans rien
    const H = innerHeight, pas = 8, occupe = new Set();
    for (const el of tous) { if (!el.matches("h1,h2,h3,h4,p,li,a,button,img,svg,input,textarea,select,video,canvas,picture") && ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; const r = el.getBoundingClientRect(); for (let y = Math.max(0, Math.floor((r.top + scrollY) / pas)); y <= Math.floor((r.bottom + scrollY) / pas); y++) occupe.add(y); }
    const fin = Math.floor(document.documentElement.scrollHeight / pas); let vide = 0, max = 0;
    for (let y = 0; y < fin; y++) { if (occupe.has(y)) vide = 0; else { vide++; max = Math.max(max, vide); } }
    if (max * pas > 0.5 * H) pbs.push("Zone vide de " + Math.round(max * pas) + " px (plus de la moitié de l'écran).");
  }

  // Textes en français (mêmes règles que le plan)
  const l = lint ? lint(zone.innerText || "", true) : [];
  if (l.length) pbs.push("Texte à reprendre : " + l.slice(0, 2).map((x) => x.regle + " (« " + x.extrait + " »)").join(" ; ") + ".");
  return pbs.slice(0, 4);
}
