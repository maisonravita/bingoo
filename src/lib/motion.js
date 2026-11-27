// Moteur de motion design « pub premium » (façon Opal, Velobank) : une suite de scènes composée par l'IA,
// dessinée image par image sur un canvas aux couleurs de la marque, puis exportée dans le navigateur.
// Langage visuel : fond noir profond ou blanc vignetté, objets lumineux posés sur un halo, mots qui arrivent un par un
// (un mot clé en couleur), chiffres qui comptent (seulement ceux donnés par la personne), aplat couleur, logo qui sort du flou.

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eo = (x) => 1 - Math.pow(1 - x, 3);
const eob = (x) => { const c = 1.25; return x <= 0 ? 0 : x >= 1 ? 1 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }; // léger dépassement
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
// Ressort amorti (amortissement 0,75 : à peine 3 % de dépassement, jamais de rebond de dessin animé)
const ressort = (x) => { if (x <= 0) return 0; if (x >= 1) return 1; const z = 0.75, w = 9, wd = w * Math.sqrt(1 - z * z), k = x; return 1 - Math.exp(-z * w * k) * (Math.cos(wd * k) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * k)); };
const hexRgb = (h) => { const n = parseInt(String(/^#[0-9a-f]{6}$/i.test(h ?? "") ? h : "#4F46E5").slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (c, d, k) => c.map((v, i) => Math.round(v + (d[i] - v) * k));
const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

export const DUREES = { telephone: 3.8, personnage: 3.8, image: 3.2, ecran_vitre: 3.2, ecran_zoom: 3.4, ecran_cascade: 3.2, ecran_defile: 3.4, ecran_split: 3, ecran_mur: 3, ecran_curseur: 3.4, ecran_telephone: 3.2, impact: 1.4, liste: 3.2, choix: 3, rature: 2.8, mots: 2.6, objet: 3.2, pilules: 3.2, compteur: 2.8, barres: 3, pastille: 1.8, cartes: 2.8, aplat: 2.2, logo: 3 };
export const TYPES_SCENES = Object.keys(DUREES);
export const dureeScene = (s) => clamp(Number(s?.duree) || DUREES[s?.type] || 2.6, 1.4, 5);
export const dureeTotale = (script) => (script?.scenes ?? []).reduce((a, s) => a + dureeScene(s), 0) || 20;

// Icônes au trait (grille 24)
const ICONES = {
  check: "M20 6 9 17l-5-5", etoile: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z",
  coeur: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z",
  cadenas: "M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4", agenda: "M3 5h18v16H3z M3 10h18 M8 3v4 M16 3v4",
  horloge: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 7v5l3 2", eclair: "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
  lieu: "M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z M12 7.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z",
  ciseaux: "M6 3a3 3 0 1 0 0 6a3 3 0 1 0 0-6z M6 15a3 3 0 1 0 0 6a3 3 0 1 0 0-6z M20 4 8.12 15.88 M14.47 14.48 20 20 M8.12 8.12 12 12",
  lune: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z", panier: "M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6 M9 21h.01 M18 21h.01",
  message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", maison: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  feuille: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z M2 21c0-3 1.85-5.36 5.08-6",
  tasse: "M17 8h1a4 4 0 1 1 0 8h-1 M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z M6 2v2 M10 2v2 M14 2v2",
  etincelle: "M12 3l1.9 5.8L20 10.7l-6.1 1.9L12 18.4l-1.9-5.8L4 10.7l6.1-1.9z", personne: "M12 12a4 4 0 1 0 0-8a4 4 0 1 0 0 8z M4 21a8 8 0 0 1 16 0",
  graphique: "M4 20V10 M10 20V4 M16 20v-7 M22 20H2", euro: "M18 6a7 7 0 1 0 0 12 M4 10h10 M4 14h10",
  telephone: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M11 18h2", cadeau: "M3 8h18v4H3z M5 12h14v9H5z M12 8v13 M12 8C10 4 6 4 7 7 M12 8c2-4 6-4 5-1",
  musique: "M9 18V5l12-2v13 M9 18a3 3 0 1 1-6 0a3 3 0 1 1 6 0z M21 16a3 3 0 1 1-6 0a3 3 0 1 1 6 0z", camion: "M1 4h14v11H1z M15 8h4l3 3v4h-7z M5.5 18a1.5 1.5 0 1 0 0 .01 M18.5 18a1.5 1.5 0 1 0 0 .01",
};
export const NOMS_ICONES = Object.keys(ICONES);
export const STYLES_PERSONNAGE = ["trait", "neon", "craie"];
const chemins = {};
function icone(ctx, nom, x, y, taille, couleur, epaisseur = 2) {
  const d = ICONES[nom] ?? ICONES.etincelle;
  const p = (chemins[nom] ??= new Path2D(d));
  ctx.save(); ctx.translate(x - taille / 2, y - taille / 2); ctx.scale(taille / 24, taille / 24);
  ctx.strokeStyle = couleur; ctx.lineWidth = epaisseur; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(p); ctx.restore();
}
function rond(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
// Lettres serrées pour les gros titres seulement (le petit texte garde son espacement, sinon les mots se collent)
function serre(ctx, v) { if (LOOK === "pop" && parseFloat(v) <= -0.03) v = "-0.06em"; try { ctx.letterSpacing = v; } catch { /* navigateur sans espacement de lettres */ } }
// Taille de police pour qu'une ligne tienne dans la largeur
function ajuste(ctx, texte, taille, largeur, poids = 800) { ctx.font = `${poids} ${taille}px ${F}`; const w = ctx.measureText(texte).width; return w > largeur ? taille * largeur / w : taille; }
// La plus grande taille pour qu'un texte tienne en « lignes » lignes dans la largeur (les titres remplissent le cadre)
function remplit(ctx, texte, max, largeur, lignes, poids = 800) {
  let taille = max;
  for (let k = 0; k < 24; k++) {
    ctx.font = `${poids} ${taille}px ${F}`;
    const l = coupe(ctx, texte, largeur);
    if (l.length <= lignes && l.every((x) => ctx.measureText(x).width <= largeur * 1.001)) break;
    taille *= 0.94;
  }
  return taille;
}
function coupe(ctx, texte, largeur) {
  const mots = String(texte || "").split(/\s+/).filter(Boolean), out = []; let l = "";
  for (const m of mots) { const e = l ? `${l} ${m}` : m; if (ctx.measureText(e).width > largeur && l) { out.push(l); l = m; } else l = e; }
  if (l) out.push(l); return out;
}
// Grain (une fois) : donne la matière « film » des pubs
let GRAIN = null;
function grain() {
  if (GRAIN || typeof document === "undefined") return GRAIN;
  const c = document.createElement("canvas"); c.width = c.height = 220; const g = c.getContext("2d"), im = g.createImageData(220, 220);
  for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); GRAIN = c; return c;
}

// Le logo du membre, toujours sur une plaque blanche (un logo sombre resterait invisible sur fond noir)
let LOGO = null;
function plaqueLogo(ctx, cx, cy, hauteur, u, ombre = true, image = true) {
  if (!LOGO?.width) return false;
  const k = LOGO.width / LOGO.height, h = hauteur, w = Math.min(h * k, h * 3.2), ih = Math.min(h, w / k), pad = h * 0.32;
  ctx.save(); if (ombre) { ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 40 * u; ctx.shadowOffsetY = 10 * u; }
  rond(ctx, cx - w / 2 - pad, cy - h / 2 - pad, w + pad * 2, h + pad * 2, Math.min(h * 0.45, 40 * u)); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
  if (image) ctx.drawImage(LOGO, cx - (ih * k) / 2, cy - ih / 2, ih * k, ih); return true;
}
// Contexte de dessin courant (posé à chaque image)
let F = "system-ui", C = [79, 70, 229], CV = C, NOIR = true, INK = "#fff", INK2 = (a) => `rgba(255,255,255,${a})`;
// Quatre allures pour que deux vidéos ne se ressemblent pas : nuit (sombre, capitales grasses), pop (couleur de la marque
// partout), editorial (crème, titres à empattements, casse normale, sans halo), minimal (blanc pur, sobre, sans halo)
export const LOOKS = ["nuit", "pop", "editorial", "minimal", "verre", "clair", "aura", "film", "lueur", "prisme"];
let LOOK = "nuit";
// Les vrais écrans du SaaS ou du site du membre (captures de son produit), par titre : { titre: image }
let ECRANS = {}, ECRANS_L = [];
// Les images de la vidéo (photos du membre ou images créées pour lui), par identifiant : { IMG_1: image chargée }
let IMAGES = {};
const ecranDe = (titre, i = 0) => { const n = (x) => String(x ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); const k = Object.keys(ECRANS).find((x) => n(x) === n(titre)); return (k && ECRANS[k]) || ECRANS_L[i % Math.max(1, ECRANS_L.length)] || null; };
export const policeMotion = (script) => ({ editorial: "Fraunces", minimal: "Plus Jakarta Sans", prisme: "Plus Jakarta Sans" }[LOOKS.includes(script?.look) ? script.look : "nuit"] ?? "Inter Tight");
const MAJ = (x) => (LOOK === "nuit" ? String(x ?? "").toUpperCase() : String(x ?? ""));

// Palette selon le fond de la scène : noir, blanc, ou couleur de la marque (plein écran)
let MODE = "noir";
function palette(mode) {
  MODE = mode; NOIR = mode !== "blanc" && !(mode === "couleur" && lum(C) > 0.62);
  if (mode === "couleur") { CV = NOIR ? [14, 15, 19] : [255, 255, 255]; }
  else CV = NOIR ? (lum(C) < 0.35 ? mix(C, [255, 255, 255], 0.35) : C) : (lum(C) > 0.7 ? mix(C, [0, 0, 0], 0.35) : C);
  INK = NOIR ? "#fff" : "#0E0F13"; INK2 = NOIR ? (a) => `rgba(255,255,255,${a})` : (a) => `rgba(14,15,19,${a})`;
}
function fond(ctx, W, H, t, u) {
  // Film : chaque plan peint son propre fond (noir pour la phrase tapée, crème ensuite, couleur pleine pour les grands mots)
  if (LOOK === "film") { ctx.fillStyle = "#F6F4EF"; ctx.fillRect(0, 0, W, H); return; }
  // Aura : blanc pur ; la couleur n'existe que dans le dégradé irisé des pièces
  if (LOOK === "aura") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); return; }
  // Clair : un gris très clair, doux, avec de grandes taches de lumière floues qui bougent à peine
  if (LOOK === "clair") {
    ctx.fillStyle = "#ECECEE"; ctx.fillRect(0, 0, W, H);
    [[0.22, 0.2, 0.75, "255,255,255", 0.95], [0.85, 0.78, 0.7, "255,255,255", 0.8], [0.8, 0.12, 0.5, "205,205,210", 0.55], [0.12, 0.88, 0.55, "210,210,215", 0.5]].forEach(([x, y, r, c, a], i) => {
      const cx = W * (x + Math.sin(t * 0.22 + i * 1.7) * 0.05), cy = H * (y + Math.cos(t * 0.18 + i) * 0.04), R = Math.max(W, H) * r, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    });
    return;
  }
  // Verre : noir profond, une brume claire teintée de la marque qui tombe du haut (comme un écran dans le noir)
  if (LOOK === "verre") {
    ctx.fillStyle = "#050507"; ctx.fillRect(0, 0, W, H);
    const cx = W * (0.5 + Math.sin(t * 0.25) * 0.06), R = Math.max(W, H) * 0.75, g = ctx.createRadialGradient(cx, -H * 0.05, 0, cx, -H * 0.05, R);
    g.addColorStop(0, rgba(mix(C, [170, 165, 200], 0.55), 0.34)); g.addColorStop(0.5, rgba(mix(C, [120, 115, 150], 0.6), 0.1)); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    return;
  }
  // Prisme : gris perle, à peine plus clair au centre (la brume irisée est posée par les scènes qui la veulent)
  if (LOOK === "prisme") {
    ctx.fillStyle = "#E9E9EE"; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.7); g.addColorStop(0, "rgba(255,255,255,.75)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    return;
  }
  // Lueur : nuit indigo, une lumière violette qui monte du bas et respire, un voile plus sombre en haut
  if (LOOK === "lueur") {
    const g0 = ctx.createLinearGradient(0, 0, 0, H); g0.addColorStop(0, "#04030F"); g0.addColorStop(0.55, "#0A0828"); g0.addColorStop(1, "#140F45"); ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
    const cx = W * (0.5 + Math.sin(t * 0.3) * 0.08), R = Math.max(W, H) * (0.6 + Math.sin(t * 0.7) * 0.04), g = ctx.createRadialGradient(cx, H * 1.08, 0, cx, H * 1.08, R);
    g.addColorStop(0, "rgba(124,77,255,.42)"); g.addColorStop(0.45, "rgba(86,70,230,.14)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    return;
  }
  if (LOOK === "pop") { ctx.fillStyle = MODE === "couleur" ? rgba(C, 1) : "#fff"; ctx.fillRect(0, 0, W, H); return; }
  if (MODE === "couleur") {
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, rgba(mix(C, [255, 255, 255], 0.1), 1)); g.addColorStop(1, rgba(mix(C, [0, 0, 0], 0.18), 1)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const px = W * (0.3 + Math.sin(t * 0.3) * 0.2), R = Math.max(W, H) * 0.6, r = ctx.createRadialGradient(px, H * 0.2, 0, px, H * 0.2, R); r.addColorStop(0, "rgba(255,255,255,.18)"); r.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  } else if (NOIR && LOOK === "pop") {
    // Pop : jamais de noir, la couleur de la marque très foncée
    ctx.fillStyle = rgba(mix(C, [0, 0, 0], 0.72), 1); ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * 0.5, H * 0.3, 0, W * 0.5, H * 0.3, Math.max(W, H) * 0.7); g.addColorStop(0, rgba(C, 0.35)); g.addColorStop(1, rgba(C, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else if (!NOIR && LOOK === "pop") {
    ctx.fillStyle = rgba(mix(C, [255, 252, 246], 0.93), 1); ctx.fillRect(0, 0, W, H);
    const px = W * (0.85 + Math.sin(t * 0.3) * 0.05), g = ctx.createRadialGradient(px, H * 0.92, 0, px, H * 0.92, Math.max(W, H) * 0.55); g.addColorStop(0, rgba(C, 0.16)); g.addColorStop(1, rgba(C, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else if (!NOIR && LOOK === "editorial") {
    // Éditorial : papier crème, un filet fin en haut et en bas
    ctx.fillStyle = "#F4EFE6"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(14,15,19,.14)"; ctx.fillRect(W * 0.08, H * 0.07, W * 0.84, Math.max(1, 2 * u)); ctx.fillRect(W * 0.08, H * 0.93, W * 0.84, Math.max(1, 2 * u));
  } else if (!NOIR && LOOK === "minimal") {
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, W, H);
  } else if (NOIR) {
    ctx.fillStyle = "#050507"; ctx.fillRect(0, 0, W, H);
    const px = W * (0.5 + Math.sin(t * 0.25) * 0.12), py = H * (0.18 + Math.cos(t * 0.2) * 0.05), R = Math.max(W, H) * 0.75;
    const g = ctx.createRadialGradient(px, py, 0, px, py, R); g.addColorStop(0, rgba(C, 0.22)); g.addColorStop(1, rgba(C, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.65)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.72); g.addColorStop(0, "#FFFFFF"); g.addColorStop(0.55, "#F3F3F5"); g.addColorStop(1, "#C9CAD2");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const gr = grain(); if (gr) { ctx.save(); ctx.globalAlpha = NOIR ? 0.045 : 0.03; ctx.globalCompositeOperation = "overlay"; const p = ctx.createPattern(gr, "repeat"); ctx.translate((t * 997) % 220, (t * 613) % 220); ctx.fillStyle = p; ctx.fillRect(-220, -220, W + 440, H + 440); ctx.restore(); }
}

// Mots qui arrivent un par un (flou → net, montée), le mot clé en couleur
function motsAnimes(ctx, texte, accent, x, y, { taille, largeur, t, poids = 700, decale = 0.07, couleur = INK, aligne = "centre" }) {
  ctx.font = `${poids} ${taille}px ${F}`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  const gros = taille >= 90; serre(ctx, gros ? "-0.035em" : "-0.01em");
  const lignes = coupe(ctx, texte, largeur), inter = taille * (gros ? 1.02 : 1.15), h = lignes.length * inter, espace = taille * 0.26;
  const acc = String(accent || "").toLowerCase().split(/\s+/).filter(Boolean);
  let i = 0;
  lignes.forEach((l, k) => {
    const mots = l.split(" "), w = mots.reduce((a, m) => a + ctx.measureText(m).width, 0) + espace * (mots.length - 1); let cx = aligne === "centre" ? x - w / 2 : x; const cy = y - h / 2 + inter * (k + 0.5);
    for (const m of mots) {
      const p = eo(prog(t, i * decale, i * decale + 0.55)); const mw = ctx.measureText(m).width + espace;
      if (p > 0) {
        const estAcc = acc.includes(m.toLowerCase().replace(/[.,!?;:«»"]/g, ""));
        // Montée masquée : le mot sort de derrière sa ligne (le texte à lire n'est jamais flouté)
        ctx.save(); ctx.beginPath(); ctx.rect(cx - taille * 0.1, cy - taille * 0.72, mw + taille * 0.2, taille * 1.44); ctx.clip();
        ctx.globalAlpha *= Math.min(1, p * 1.6); if ("filter" in ctx) ctx.filter = "none";
        ctx.fillStyle = estAcc ? rgba(CV, 1) : couleur;
        ctx.translate(cx, cy + (1 - p) * taille * 1.05); ctx.rotate((1 - p) * 0.06); ctx.fillText(m, 0, 0); ctx.restore();
      }
      cx += mw; i++;
    }
  });
  serre(ctx, "-0.01em");
  return { h, n: i };
}
function halo(ctx, x, y, rx, ry, a) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, rgba(mix(CV, [255, 255, 255], 0.35), a)); g.addColorStop(0.35, rgba(CV, a * 0.75)); g.addColorStop(1, rgba(CV, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 7); ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------- Les scènes
// Listes et pastilles dessinées autrement selon l'allure : éditorial = lignes numérotées et filets fins, minimal = texte
// seul et un point, pop = blocs pleins penchés façon stickers (la version « nuit » garde les cartes pastel)
function listeAllure(ctx, s, e, courte = false) {
  const { W, H, u, t, vertical } = s;
  const items = (e.items ?? []).slice(0, 4), n = items.length;
  // Paysage : le titre à gauche, la liste à droite (sinon tout s'entasse au centre et le titre est écrasé)
  const large = W > H * 1.2 && !!e.texte, cx = large ? W * 0.7 : W / 2;
  const titreY = H * (vertical ? 0.24 : 0.22);
  if (e.texte) { if (large) motsAnimes(ctx, e.texte, e.accent, W * 0.07, H / 2, { taille: 76 * u, largeur: W * 0.38, t, poids: 800, decale: 0.05, aligne: "gauche" }); else motsAnimes(ctx, e.texte, e.accent, W / 2, titreY, { taille: (vertical ? 100 : 72) * u, largeur: W * 0.84, t, poids: LOOK === "minimal" ? 600 : 700, decale: 0.06 }); }
  // Paysage : lignes plus serrées et légèrement remontées (le bandeau du bas du style pop ne doit rien cacher)
  const ve = vertical ? 1.42 : 1.12, h = (LOOK === "minimal" ? 96 : 128) * u * ve * (large ? 0.8 : 1), y0 = H * 0.5 - ((n - 1) * h) / 2 + (e.texte && !large ? 40 * u : 0);
  items.forEach((x, i) => {
    const p = eo(prog(t, 0.3 + i * 0.24, 0.9 + i * 0.24)); if (p <= 0) return;
    const y = y0 + i * h; ctx.save(); ctx.globalAlpha *= p; ctx.textBaseline = "middle";
    if (LOOK === "editorial") {
      const x0 = large ? W * 0.48 : W * 0.1, x1 = large ? W * 0.93 : W * 0.9;
      ctx.fillStyle = INK2(0.22); ctx.fillRect(x0, y + h / 2 - 1 * u, (x1 - x0) * p, Math.max(1, 1.5 * u));
      ctx.fillStyle = rgba(CV, 1); ctx.font = `italic 600 ${34 * u * ve}px ${F}`; ctx.textAlign = "left"; ctx.fillText(String(i + 1).padStart(2, "0"), x0, y);
      ctx.fillStyle = INK; let tl = (courte ? 54 : 46) * u * ve; ctx.font = `600 ${tl}px ${F}`; const place = x1 - x0 - 90 * u * ve, lt = ctx.measureText(x.texte).width; if (lt > place) { tl *= place / lt; ctx.font = `600 ${tl}px ${F}`; } ctx.fillText(x.texte, x0 + 90 * u * ve + (1 - p) * 30 * u, y);
    } else if (LOOK === "minimal") {
      ctx.fillStyle = rgba(CV, 1);
      ctx.font = `500 ${(courte ? 50 : 42) * u * ve}px ${F}`; ctx.textAlign = "center";
      const lw = ctx.measureText(x.texte).width; ctx.beginPath(); ctx.arc(cx - lw / 2 - 30 * u, y, 7 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = INK2(0.85); ctx.fillText(x.texte, cx + (1 - p) * 20 * u, y);
    } else {
      // Pop : stickers pleins, un sur deux en couleur, penchés
      ctx.font = `900 ${(courte ? 54 : 46) * u * ve}px ${F}`; ctx.textAlign = "center";
      // Paysage : les étiquettes restent dans la moitié droite, sans mordre sur le titre
      if (large) { const lw0 = Math.max(...items.map((z) => ctx.measureText(MAJ(z.texte)).width)) + 70 * u; if (lw0 > W * 0.44) ctx.font = `900 ${(courte ? 54 : 46) * u * ve * (W * 0.44) / lw0}px ${F}`; }
      const txt = MAJ(x.texte), lw = ctx.measureText(txt).width + 70 * u, bh = h * 0.78, r = ressort(prog(t, 0.3 + i * 0.24, 0.95 + i * 0.24));
      ctx.translate(cx, y + (1 - r) * 60 * u); ctx.globalAlpha *= clamp(r * 1.4);
      const plein = i % 2 === 0, sc = MODE === "couleur";
      rond(ctx, -lw / 2, -bh / 2, lw, bh, bh * 0.26); ctx.fillStyle = plein ? (sc ? "#fff" : rgba(C, 1)) : sc ? rgba(C, 1) : "#fff"; ctx.fill();
      if (!plein) { ctx.strokeStyle = sc ? "#fff" : rgba(C, 1); ctx.lineWidth = Math.max(3, 5 * u); ctx.stroke(); }
      ctx.fillStyle = plein ? (sc ? rgba(C, 1) : "#fff") : sc ? "#fff" : rgba(C, 1); ctx.fillText(txt, 0, 3 * u);
    }
    ctx.restore();
  });
}

// --- Scènes « produit » : de vraies captures du SaaS du membre, mises en mouvement (cadre, zoom, curseur, éventail…)
function fenetre(ctx, img, x, y, w, h, u, { barre = true, ombre = true, rayon = 18 } = {}) {
  const r = rayon * u, hb = barre ? Math.max(18 * u, h * 0.055) : 0;
  ctx.save();
  if (ombre) { ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 60 * u; ctx.shadowOffsetY = 24 * u; }
  rond(ctx, x, y, w, h, r); ctx.fillStyle = "#fff"; ctx.fill(); ctx.shadowColor = "transparent";
  ctx.save(); rond(ctx, x, y, w, h, r); ctx.clip();
  if (barre) { ctx.fillStyle = "#F1F1F4"; ctx.fillRect(x, y, w, hb); ["#FF5F57", "#FEBC2E", "#28C840"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + hb * 0.6 + i * hb * 0.55, y + hb / 2, hb * 0.17, 0, Math.PI * 2); ctx.fill(); }); }
  if (img) { const ih = h - hb, k = Math.max(w / img.width, ih / img.height); ctx.drawImage(img, x, y + hb, img.width * k, img.height * k); }
  ctx.restore(); ctx.restore();
}
// Paysage : titre à gauche, écran à droite (un écran centré sous le titre resterait petit, entouré de vide)
const cotes = (s) => s.W > s.H * 1.2;
function boiteCote(s) { const w = Math.min(s.W * 0.56, (s.H * 0.78) / 0.625), h = w * 0.625; return { w, h, x: s.W * 0.96 - w, y: s.H / 2 - h / 2 }; }
function titreCote(ctx, s, e) { if (e.texte) motsAnimes(ctx, e.texte, e.accent, s.W * 0.06, s.H / 2, { taille: 72 * s.u, largeur: s.W * 0.3, t: s.t, poids: LOOK === "minimal" ? 700 : 800, decale: 0.05, aligne: "gauche" }); }
function legende(ctx, s, e, y) {
  if (!e.texte) return;
  motsAnimes(ctx, e.texte, e.accent, s.W / 2, y, { taille: (s.vertical ? 66 : cotes(s) ? 64 : 58) * s.u, largeur: s.W * 0.86, t: s.t, poids: LOOK === "minimal" ? 600 : 800, decale: 0.05 });
}
const SCENES_PRODUIT = {
  // La fenêtre arrive penchée en perspective, puis se redresse
  ecran_vitre(ctx, s, e) {
    const { W, H, u, t, vertical } = s, img = ecranDe(e.ecran), p = eo(prog(t, 0.05, 1.1));
    // Carré et paysage : la fenêtre tient sous le titre (sinon le titre sort du cadre)
    const bc = cotes(s) ? boiteCote(s) : null;
    const w = bc ? bc.w : vertical ? W * 0.9 : Math.min(W * 0.72, (H * 0.6) / 0.625), h = w * 0.625, x = bc ? bc.x : W / 2 - w / 2, y = bc ? bc.y : H * (vertical ? 0.5 : 0.61) - h / 2;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.transform(1, (1 - p) * 0.18, (1 - p) * -0.35, 1, 0, 0); ctx.scale(0.8 + 0.2 * p, 0.8 + 0.2 * p); ctx.translate(-(x + w / 2), -(y + h / 2));
    fenetre(ctx, img, x, y, w, h, u); ctx.restore();
    if (bc) titreCote(ctx, s, e); else legende(ctx, s, e, vertical ? y - 170 * u : H * 0.15);
  },
  // Plein cadre, puis la caméra plonge sur une zone avec un cercle de mise en avant
  ecran_zoom(ctx, s, e) {
    const { W, H, u, t, d, vertical } = s, img = ecranDe(e.ecran);
    const w = vertical ? W * 0.92 : Math.min(W * 0.8, (H * 0.64) / 0.625), h = w * 0.625, x = W / 2 - w / 2, y = H * (vertical ? 0.56 : 0.61) - h / 2;
    const fx = e.zone === "gauche" ? 0.25 : e.zone === "droite" ? 0.75 : 0.5, fy = e.zone === "bas" ? 0.75 : e.zone === "haut" ? 0.3 : 0.5;
    const z = 1 + 0.9 * eio(prog(t, 0.6, d - 0.4)), cx = x + w * fx, cy = y + h * fy;
    // Hors téléphone, le zoom reste sous le titre : jamais d'écran par-dessus le texte
    ctx.save(); if (!vertical) { ctx.beginPath(); ctx.rect(0, H * 0.25, W, H * 0.75); ctx.clip(); } ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy); fenetre(ctx, img, x, y, w, h, u); ctx.restore();
    const q = prog(t, 1.3, 2.1); if (q > 0) { ctx.save(); ctx.strokeStyle = rgba(C, 1); ctx.lineWidth = 6 * u; ctx.globalAlpha *= Math.min(1, q * 2); ctx.beginPath(); ctx.arc(cx, cy, (90 + 20 * Math.sin(t * 5)) * u * eo(q), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    legende(ctx, s, e, H * (vertical ? 0.17 : 0.13));
  },
  // Trois écrans en éventail, comme des cartes qu'on étale
  ecran_cascade(ctx, s, e) {
    const { W, H, u, t, vertical } = s;
    const titres = Array.isArray(e.ecrans) && e.ecrans.length ? e.ecrans : [e.ecran];
    const w = vertical ? W * 0.72 : Math.min(W * 0.5, (H * 0.5) / 0.625), h = w * 0.625;
    [0, 1, 2].forEach((i) => {
      const p = ressort(prog(t, 0.1 + i * 0.25, 0.9 + i * 0.25)); if (p <= 0) return;
      const a = (i - 1) * 0.16 * p, dx = (i - 1) * W * (vertical ? 0.14 : 0.2) * p, dy = Math.abs(i - 1) * 40 * u * p;
      ctx.save(); ctx.globalAlpha *= clamp(p * 1.5); ctx.translate(W / 2 + dx, H * (vertical ? 0.56 : 0.62) + dy); ctx.rotate(a); fenetre(ctx, ecranDe(titres[i] ?? titres[0], i), -w / 2, -h / 2, w, h, u); ctx.restore();
    });
    legende(ctx, s, e, H * (vertical ? 0.2 : 0.15));
  },
  // L'écran défile doucement dans son cadre, comme si on le parcourait
  ecran_defile(ctx, s, e) {
    const { W, H, u, t, d, vertical } = s, img = ecranDe(e.ecran);
    const bc = cotes(s) ? boiteCote(s) : null;
    const w = bc ? bc.w : vertical ? W * 0.86 : Math.min(W * 0.66, (H * 0.64) / 0.62), h = bc ? bc.h : vertical ? H * 0.56 : w * 0.62, x = bc ? bc.x : W / 2 - w / 2, y = bc ? bc.y : H * (vertical ? 0.36 : 0.3);
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 50 * u; rond(ctx, x, y, w, h, 22 * u); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
    if (img) { ctx.save(); rond(ctx, x, y, w, h, 22 * u); ctx.clip(); const k = (w / img.width) * 1.35, ih = img.height * k, iw = img.width * k, q = eio(prog(t, 0.3, d - 0.2)); ctx.drawImage(img, x - (iw - w) * q * 0.6, y - Math.max(0, ih - h) * q, iw, ih); ctx.restore(); }
    if (bc) titreCote(ctx, s, e); else legende(ctx, s, e, vertical ? y - 120 * u : H * 0.15);
  },
  // Texte d'un côté, l'écran qui glisse de l'autre et dépasse du cadre
  ecran_split(ctx, s, e) {
    const { W, H, u, t, vertical } = s, img = ecranDe(e.ecran), p = eo(prog(t, 0.15, 1));
    if (W <= H * 1.2) { // téléphone et carré : le titre en haut, l'écran qui dépasse en bas à droite
      const w = W * 1.05, h = w * 0.625; fenetre(ctx, img, W * 0.12 + (1 - p) * W * 0.6, H * (vertical ? 0.52 : 0.5), w, h, u);
      if (e.texte) motsAnimes(ctx, e.texte, e.accent, W * 0.08, H * (vertical ? 0.3 : 0.24), { taille: 78 * u, largeur: W * 0.84, t, poids: 800, decale: 0.05, aligne: "gauche" });
    } else {
      const w = W * 0.62, h = w * 0.625; fenetre(ctx, img, W * 0.46 + (1 - p) * W * 0.4, H / 2 - h / 2, w, h, u);
      if (e.texte) motsAnimes(ctx, e.texte, e.accent, W * 0.07, H / 2, { taille: 70 * u, largeur: W * 0.36, t, poids: 800, decale: 0.05, aligne: "gauche" });
    }
  },
  // Un mur de tous ses écrans qui défilent en diagonale, le titre par-dessus
  ecran_mur(ctx, s, e) {
    const { W, H, u, t } = s; const n = Math.max(1, ECRANS_L.length), w = W * 0.42, h = w * 0.625, g = 24 * u;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.18); ctx.translate(-W / 2, -H / 2);
    for (let r = -2; r <= 3; r++) for (let c = -1; c <= 3; c++) {
      const dx = ((t * (r % 2 ? 60 : -60) * u) % (w + g)), x = c * (w + g) + dx - (r % 2 ? 0 : w / 2), y = H / 2 + r * (h + g) - h / 2;
      ctx.save(); ctx.globalAlpha *= 0.9; fenetre(ctx, ECRANS_L[(r * 3 + c + 99) % n] ?? null, x, y, w, h, u, { barre: false, ombre: false, rayon: 14 }); ctx.restore();
    }
    ctx.restore();
    const v = ctx.createLinearGradient(0, H * 0.3, 0, H * 0.7); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(0.5, NOIR ? "rgba(0,0,0,.7)" : "rgba(255,255,255,.8)"); v.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = v; ctx.fillRect(0, H * 0.3, W, H * 0.4);
    legende(ctx, s, e, H / 2);
  },
  // Un curseur traverse l'écran, clique, et une étiquette apparaît
  ecran_curseur(ctx, s, e) {
    const { W, H, u, t, vertical } = s, img = ecranDe(e.ecran);
    const bc = cotes(s) ? boiteCote(s) : null;
    const w = bc ? bc.w : vertical ? W * 0.92 : Math.min(W * 0.76, (H * 0.62) / 0.625), h = w * 0.625, x = bc ? bc.x : W / 2 - w / 2, y = bc ? bc.y : H * (vertical ? 0.56 : 0.61) - h / 2;
    fenetre(ctx, img, x, y, w, h, u);
    const q = eio(prog(t, 0.3, 1.5)), cx = x + w * (0.85 - 0.45 * q), cy = y + h * (0.9 - 0.45 * q), clic = prog(t, 1.5, 2.1);
    if (clic > 0 && clic < 1) { ctx.save(); ctx.strokeStyle = rgba(C, 1 - clic); ctx.lineWidth = 4 * u; ctx.beginPath(); ctx.arc(cx, cy, 70 * u * clic, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    ctx.save(); ctx.translate(cx, cy); const k = (clic > 0 && clic < 0.3 ? 0.85 : 1) * 1.6 * u; ctx.scale(k, k);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 26); ctx.lineTo(7, 20); ctx.lineTo(12, 31); ctx.lineTo(17, 29); ctx.lineTo(12, 18); ctx.lineTo(21, 18); ctx.closePath();
    ctx.fillStyle = "#111"; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    const et = ressort(prog(t, 1.8, 2.6)); if (et > 0 && e.etiquette) { ctx.save(); ctx.font = `800 ${40 * u}px ${F}`; const lw = ctx.measureText(e.etiquette).width + 50 * u; ctx.translate(cx + 40 * u, cy - 70 * u); ctx.scale(et, et); rond(ctx, 0, -32 * u, lw, 64 * u, 32 * u); ctx.fillStyle = rgba(C, 1); ctx.fill(); ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillText(e.etiquette, 25 * u, 2 * u); ctx.restore(); }
    if (bc) titreCote(ctx, s, e); else legende(ctx, s, e, H * (vertical ? 0.18 : 0.15));
  },
  // Un téléphone qui monte en tournant légèrement, l'écran (la partie principale de la capture) dedans
  ecran_telephone(ctx, s, e) {
    const { W, H, u, t, vertical } = s, img = ecranDe(e.ecran), p = ressort(prog(t, 0.05, 1));
    // Carré et paysage : le téléphone à droite, le texte à gauche (ils ne se chevauchent plus)
    const h = H * (vertical ? 0.6 : 0.78), w = h * 0.49, mx = vertical ? W / 2 : W * 0.7, x = mx - w / 2, y = H * (vertical ? 0.33 : 0.13);
    ctx.save(); ctx.translate(mx, y + h / 2 + (1 - p) * H * 0.4); ctx.rotate((1 - p) * 0.25 - 0.04 * Math.sin(t)); ctx.translate(-mx, -(y + h / 2));
    ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 70 * u; ctx.shadowOffsetY = 30 * u; rond(ctx, x, y, w, h, 56 * u); ctx.fillStyle = "#111"; ctx.fill(); ctx.shadowColor = "transparent";
    const b = 12 * u; ctx.save(); rond(ctx, x + b, y + b, w - 2 * b, h - 2 * b, 46 * u); ctx.clip(); ctx.fillStyle = "#fff"; ctx.fillRect(x, y, w, h);
    if (img) { const ih = h - 2 * b, k = ih / img.height, iw = img.width * k; ctx.drawImage(img, x + b - (iw - (w - 2 * b)) * 0.62, y + b, iw, ih); }
    ctx.restore(); rond(ctx, mx - w * 0.17, y + b + 10 * u, w * 0.34, 26 * u, 13 * u); ctx.fillStyle = "#111"; ctx.fill(); ctx.restore();
    if (e.texte) { if (vertical) legende(ctx, s, e, H * 0.17); else motsAnimes(ctx, e.texte, e.accent, W * 0.07, H / 2, { taille: (W > H * 1.2 ? 72 : 60) * u, largeur: W * (W > H * 1.2 ? 0.44 : 0.46), t, poids: 800, decale: 0.05, aligne: "gauche" }); }
  },
};

const SCENES = {
  ...Object.fromEntries(Object.entries(SCENES_PRODUIT).map(([k, f]) => [k, (ctx, s, e) => (ECRANS_L.length ? f(ctx, s, e) : SCENES.mots(ctx, s, { texte: e.texte || s.nom, accent: e.accent }))])),
  // Un mot géant qui claque (« tap », « done »)
  impact(ctx, s, e) {
    const { W, H, u, t } = s;
    const p = ressort(prog(t, 0, 0.55)); serre(ctx, "-0.05em"); ctx.font = `900 ${380 * u}px ${F}`;
    const w = ctx.measureText(e.texte).width, k = Math.min(1, (W * 0.88) / Math.max(1, w));
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k * (0.6 + 0.4 * p), k * (0.6 + 0.4 * p)); ctx.globalAlpha *= clamp(p * 1.5);
    ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e.texte, 0, 10 * u); ctx.restore(); serre(ctx, "-0.01em");
  },
  // Cartes pastel empilées, comme des notifications (style Notion)
  liste(ctx, s, e) {
    if (LOOK !== "nuit") return listeAllure(ctx, s, e);
    const { W, H, u, t, vertical } = s;
    const large = W > H * 1.2 && !!e.texte, cx = large ? W * 0.7 : W / 2;
    const items = (e.items ?? []).slice(0, 4), n = items.length, w = Math.min(W * (large ? 0.44 : 0.78), 760 * u), h = (large ? 112 : 130) * u, gap = (large ? 20 : 26) * u;
    const teintes = [[255, 214, 220], [214, 228, 255], [214, 245, 222], [255, 236, 204]], encres = [[190, 40, 70], [40, 80, 190], [30, 130, 70], [190, 110, 20]];
    const y0 = H * (e.texte && !large ? (vertical ? 0.42 : 0.4) : 0.5) - ((n - 1) * (h + gap)) / 2;
    if (e.texte) { if (large) motsAnimes(ctx, e.texte, e.accent, W * 0.07, H / 2, { taille: 76 * u, largeur: W * 0.38, t, poids: 800, decale: 0.05, aligne: "gauche" }); else motsAnimes(ctx, e.texte, e.accent, W / 2, y0 - h - 40 * u, { taille: (vertical ? 70 : 62) * u, largeur: W * 0.84, t, poids: 700, decale: 0.06 }); }
    items.forEach((x, i) => {
      const p = ressort(prog(t, 0.3 + i * 0.28, 1 + i * 0.28)); if (p <= 0) return;
      const y = y0 + i * (h + gap) - h / 2, bx = cx - w / 2 + (1 - p) * 260 * u;
      ctx.save(); ctx.globalAlpha *= clamp(p * 1.3);
      ctx.shadowColor = "rgba(0,0,0,.18)"; ctx.shadowBlur = 30 * u; ctx.shadowOffsetY = 10 * u;
      rond(ctx, bx, y, w, h, 26 * u); ctx.fillStyle = rgba(teintes[i % 4], 1); ctx.fill(); ctx.shadowColor = "transparent";
      ctx.fillStyle = rgba(encres[i % 4], 1); ctx.font = `700 ${46 * u}px ${F}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(x.texte, bx + 40 * u, y + h / 2 + 2 * u);
      ctx.restore();
    });
  },
  // Cartes de choix côte à côte (À emporter / Livraison) : la seconde se fait choisir
  choix(ctx, s, e) {
    const { W, H, u, t, vertical } = s;
    const items = (e.items ?? []).slice(0, 3), n = Math.max(1, items.length);
    const aDroite = W > H * 1.2 && !!e.texte;
    if (vertical || aDroite) { // téléphone : les choix l'un sous l'autre, en grand ; paysage : pareil, à droite du titre
      const w = aDroite ? W * 0.42 : W * 0.82, h = (aDroite ? 132 : 190) * u, gap = (aDroite ? 24 : 34) * u, y0 = H * (aDroite ? 0.5 : 0.56) - ((n - 1) * (h + gap)) / 2, sel = Math.min(n - 1, 1), choisi = eo(prog(t, 1.4, 1.9));
      const ox = aDroite ? W * 0.72 - W / 2 : 0;
      if (e.texte) { if (aDroite) motsAnimes(ctx, e.texte, e.accent, W * 0.07, H / 2, { taille: 76 * u, largeur: W * 0.38, t, poids: 800, decale: 0.05, aligne: "gauche" }); else motsAnimes(ctx, e.texte, e.accent, W / 2, y0 - h / 2 - 130 * u, { taille: 84 * u, largeur: W * 0.86, t, decale: 0.06, poids: 800 }); }
      ctx.save(); ctx.translate(ox, 0);
      items.forEach((x, i) => {
        const p = ressort(prog(t, 0.2 + i * 0.2, 0.9 + i * 0.2)); if (p <= 0) return;
        const bx = W / 2 - w / 2 + (1 - p) * 200 * u, by = y0 + i * (h + gap) - h / 2, on = i === sel && choisi > 0;
        ctx.save(); ctx.globalAlpha *= clamp(p * 1.3); if (on) { ctx.shadowColor = rgba(CV, 0.6); ctx.shadowBlur = 60 * u; }
        rond(ctx, bx, by, w, h, 40 * u); ctx.fillStyle = on ? rgba(CV, 1) : NOIR ? "rgba(255,255,255,.06)" : "#fff"; ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = rgba(CV, on ? 1 : 0.5); ctx.lineWidth = 4 * u; ctx.stroke();
        const fg = on ? (MODE === "couleur" ? rgba(C, 1) : lum(CV) > 0.62 ? "#111" : "#fff") : rgba(CV, 1);
        ctx.fillStyle = on ? fg : INK; ctx.font = `800 ${62 * u}px ${F}`; { const lw = ctx.measureText(x.texte).width, dispo = w - 170 * u; if (lw > dispo) ctx.font = `800 ${Math.max(30 * u, 62 * u * dispo / lw)}px ${F}`; } ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(x.texte, bx + 50 * u, by + h / 2 + 3 * u);
        if (on) { ctx.font = `800 ${56 * u}px ${F}`; ctx.textAlign = "right"; ctx.fillText("✓", bx + w - 50 * u, by + h / 2 + 3 * u); }
        ctx.restore();
      });
      ctx.restore();
      return;
    }
    const large = W > H * 1.2 && !!e.texte, cx = large ? W * 0.7 : W / 2, place = large ? W * 0.5 : W * 0.86;
    const w = Math.min((place - (n - 1) * 30 * u) / n, 520 * u), h = Math.min(w * 0.6, 220 * u);
    const tot = n * w + (n - 1) * 30 * u, sel = Math.min(n - 1, 1), choisi = eo(prog(t, 1.4, 1.9));
    if (e.texte) { if (large) motsAnimes(ctx, e.texte, e.accent, W * 0.07, H / 2, { taille: 76 * u, largeur: W * 0.38, t, poids: 800, decale: 0.05, aligne: "gauche" }); else motsAnimes(ctx, e.texte, e.accent, W / 2, H * (vertical ? 0.28 : 0.2), { taille: (vertical ? 74 : 64) * u, largeur: W * 0.84, t, decale: 0.06 }); }
    items.forEach((x, i) => {
      const p = ressort(prog(t, 0.2 + i * 0.2, 0.9 + i * 0.2)); if (p <= 0) return;
      const bx = cx - tot / 2 + i * (w + 30 * u), by = H * (large ? 0.5 : vertical ? 0.52 : 0.58) - h / 2, on = i === sel && choisi > 0;
      ctx.save(); ctx.globalAlpha *= clamp(p * 1.3); ctx.translate(bx + w / 2, by + h / 2); const k = (0.7 + 0.3 * p) * (on ? 1 + choisi * 0.06 : 1 - choisi * 0.04 * (i !== sel)); ctx.scale(k, k); ctx.translate(-(bx + w / 2), -(by + h / 2));
      if (on) { ctx.shadowColor = rgba(CV, 0.6); ctx.shadowBlur = 50 * u; }
      rond(ctx, bx, by, w, h, 34 * u); ctx.fillStyle = on ? rgba(CV, 1) : NOIR ? "rgba(255,255,255,.06)" : "#fff"; ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba(CV, on ? 1 : 0.55); ctx.lineWidth = 4 * u; ctx.stroke();
      const fg = on ? (MODE === "couleur" ? rgba(C, 1) : lum(CV) > 0.62 ? "#111" : "#fff") : rgba(CV, 1);
      ctx.fillStyle = fg; { const f0 = Math.min(56 * u, w / 5.5); ctx.font = `800 ${f0}px ${F}`; const lw = ctx.measureText(MAJ(x.texte)).width; if (lw > w * 0.84) ctx.font = `800 ${Math.max(20 * u, f0 * w * 0.84 / lw)}px ${F}`; } ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(MAJ(x.texte), bx + w / 2, by + h / 2);
      ctx.restore();
    });
  },
  // Une phrase barrée puis corrigée (« LE PLUS DUR ? ~~FAIRE LA VIDÉO~~ QU'ON S'ARRÊTE DESSUS »)
  rature(ctx, s, e) {
    const { W, H, u, t, vertical } = s;
    const taille = (vertical ? 96 : 86) * u, larg = W * 0.84;
    ctx.font = `800 ${taille}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const barre = MAJ(e.barre ?? ""), y1 = H / 2 - taille * 0.9;
    if (e.texte_avant) { const av = MAJ(e.texte_avant); ctx.save(); ctx.globalAlpha *= eo(prog(t, 0, 0.35)); ctx.font = `800 ${ajuste(ctx, av, taille, larg)}px ${F}`; ctx.fillStyle = INK; ctx.fillText(av, W / 2, y1 - taille * 1.15); ctx.restore(); }
    const tb = ajuste(ctx, barre, taille, larg);
    const pb = eo(prog(t, 0.15, 0.55)); ctx.save(); ctx.globalAlpha *= pb; ctx.font = `800 ${tb}px ${F}`; ctx.fillStyle = INK2(0.55); ctx.fillText(barre, W / 2, y1); ctx.restore();
    ctx.font = `800 ${tb}px ${F}`; const wb = Math.min(larg, ctx.measureText(barre).width), pr = eio(prog(t, 0.7, 1.05));
    ctx.save(); ctx.strokeStyle = rgba(CV, 1); ctx.lineWidth = 10 * u; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(W / 2 - wb / 2 - 10 * u, y1 + 4 * u); ctx.lineTo(W / 2 - wb / 2 - 10 * u + (wb + 20 * u) * pr, y1 + 4 * u); ctx.stroke(); ctx.restore();
    // La correction, tapée lettre à lettre
    const txt = MAJ(e.texte ?? ""), nb = Math.floor(txt.length * prog(t, 1.15, 1.15 + txt.length * 0.045));
    ctx.font = `800 ${taille}px ${F}`; const lignes = coupe(ctx, txt.slice(0, nb), larg);
    lignes.forEach((l, k) => { ctx.fillStyle = rgba(CV, 1); ctx.fillText(l, W / 2, y1 + taille * 1.35 + k * taille * 1.08); });
    if (nb < txt.length && Math.floor(t * 4) % 2 === 0) { const l = lignes.at(-1) ?? ""; ctx.fillStyle = rgba(CV, 1); ctx.fillRect(W / 2 + ctx.measureText(l).width / 2 + 8 * u, y1 + taille * 1.35 + (lignes.length - 1) * taille * 1.08 - taille * 0.4, 8 * u, taille * 0.8); }
  },
  mots(ctx, s, e) {
    const { W, H, u, t, vertical } = s;
    if (e.style === "machine") { // majuscules tapées lettre à lettre, le mot clé en couleur (style « Junior »)
      const txt = MAJ(e.texte ?? ""), nb = Math.floor(txt.length * prog(t, 0.05, 0.05 + txt.length * 0.04));
      // Le mot le plus long doit tenir sur une ligne
      const long = txt.split(" ").sort((a, b) => b.length - a.length)[0] ?? "", taille = ajuste(ctx, long, (vertical ? 170 : 130) * u, W * 0.84);
      ctx.font = `800 ${taille}px ${F}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      const lignes = coupe(ctx, txt, W * 0.84), acc = MAJ(e.accent ?? "").split(/\s+/).filter(Boolean); let vu = 0;
      lignes.forEach((l, k) => { let x = W / 2 - ctx.measureText(l).width / 2; const y = H / 2 - ((lignes.length - 1) * taille * 1.06) / 2 + k * taille * 1.06;
        for (const m of l.split(" ")) { const reste = Math.max(0, nb - vu), part = m.slice(0, reste); ctx.fillStyle = acc.includes(m.replace(/[.,!?;:]/g, "")) ? rgba(CV, 1) : INK; ctx.fillText(part, x, y); x += ctx.measureText(m + " ").width; vu += m.length + 1; } });
      return;
    }
    const gauche = LOOK !== "minimal" && LOOK !== "nuit" && (s.i ?? 0) % 2 === 1, largeur = W * (vertical ? 0.86 : gauche ? 0.7 : 0.8);
    serre(ctx, "-0.035em"); const taille = remplit(ctx, e.texte || "", (LOOK === "nuit" ? (vertical ? 128 : 104) : vertical ? 200 : 150) * u, largeur, vertical ? 5 : 3); serre(ctx, "-0.01em");
    const r = motsAnimes(ctx, e.texte, e.accent, gauche ? W * 0.07 : W / 2, gauche ? H * (vertical ? 0.6 : 0.5) : H / 2, { taille, poids: 800, largeur, t, decale: 0.1, aligne: gauche ? "gauche" : "centre" });
    if (false && e.trait) { // (retiré : plus de trait dessiné)
      const p = eio(prog(t, 0.25 + r.n * 0.1, 0.9 + r.n * 0.1)), y0 = H / 2 + r.h / 2 + 50 * u, x0 = W * 0.22, x1 = W * 0.78;
      ctx.save(); ctx.strokeStyle = rgba(CV, 1); ctx.lineWidth = 9 * u; ctx.lineCap = "round"; ctx.beginPath();
      for (let k = 0; k <= 40 * p; k++) { const q = k / 40, x = x0 + (x1 - x0) * q, y = y0 + Math.sin(q * Math.PI) * -26 * u + q * 10 * u; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.restore();
    }
  },
  // Plus d'objet dessiné : la légende seule, en grand (le visuel vient du logo, des photos ou des captures du membre)
  objet(ctx, s, e) { SCENES.mots(ctx, s, { texte: e.texte || s.nom, accent: e.accent }); },
  pilules(ctx, s, e) {
    if (LOOK !== "nuit") return listeAllure(ctx, s, { ...e, items: (e.items ?? []).slice(0, 3) }, true);
    const { W, H, u, t, vertical } = s;
    const items = (e.items ?? []).slice(0, 3), n = Math.max(1, items.length), actif = Math.min(n - 1, Math.floor(t / (s.d / n)));
    const ph = (vertical ? 188 : 120) * u, gap = (vertical ? 36 : 30) * u, tp = (vertical ? 70 : 44) * u;
    ctx.font = `700 ${tp}px ${F}`;
    const ws = items.map((x) => ctx.measureText(x.texte).width + (vertical ? 130 : 90) * u);
    const large = W > H * 1.2 && !!e.texte, cx = large ? W * 0.7 : W / 2;
    const pile = vertical || large || ws.reduce((a, b) => a + b + gap, -gap) > W * 0.9;
    const tot = pile ? Math.max(...ws) : ws.reduce((a, b) => a + b + gap, -gap);
    items.forEach((x, i) => {
      const p = ressort(prog(t, 0.12 + i * 0.22, 0.85 + i * 0.22)); if (p <= 0) return;
      const w = ws[i], px = pile ? cx - w / 2 : W / 2 - tot / 2 + ws.slice(0, i).reduce((a, b) => a + b + gap, 0), py = pile ? H / 2 - ((n - 1) * (ph + gap)) / 2 + i * (ph + gap) - ph / 2 : H / 2 - ph / 2;
      const on = i === actif;
      ctx.save(); ctx.globalAlpha *= clamp(p); ctx.translate(px + w / 2, py + ph / 2); ctx.scale(0.8 + 0.2 * p, 0.8 + 0.2 * p); ctx.translate(-(px + w / 2), -(py + ph / 2));
      if (on) { ctx.shadowColor = rgba(CV, 0.8); ctx.shadowBlur = 60 * u; }
      rond(ctx, px, py, w, ph, ph / 2); ctx.fillStyle = NOIR ? (on ? "rgba(30,30,38,.95)" : "rgba(22,22,28,.85)") : (on ? "#fff" : "rgba(255,255,255,.8)"); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = on ? rgba(CV, 0.9) : NOIR ? "rgba(255,255,255,.14)" : "rgba(15,23,42,.10)"; ctx.lineWidth = (on ? 3 : 2) * u; ctx.stroke();
      ctx.fillStyle = on ? INK : INK2(0.8); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(x.texte, px + w / 2, py + ph / 2 + 2 * u);
      ctx.restore();
    });
    if (e.texte) { if (large) motsAnimes(ctx, e.texte, e.accent, W * 0.07, H / 2, { taille: 76 * u, largeur: W * 0.38, t: t - 0.1, poids: 800, decale: 0.05, aligne: "gauche" }); else motsAnimes(ctx, e.texte, e.accent, W / 2, H * (vertical ? 0.2 : 0.2), { taille: (vertical ? 96 : 64) * u, largeur: W * 0.86, t: t - 0.1, poids: 700, decale: 0.06 }); }
  },
  compteur(ctx, s, e) {
    const { W, H, u, t, vertical } = s;
    const cible = Number(String(e.valeur ?? "").replace(/\s/g, "").replace(",", ".")) || 0, dec = /[.,]/.test(String(e.valeur ?? "")) ? 1 : 0;
    const v = cible * eo(prog(t, 0.15, 1.6)), txt = (dec ? v.toFixed(1).replace(".", ",") : Math.round(v).toLocaleString("fr-FR")) + (e.suffixe ? ` ${e.suffixe}` : "");
    const taille = (vertical ? 260 : 230) * u;
    ctx.save(); serre(ctx, "-0.04em"); ctx.font = `900 ${taille}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = rgba(CV, 0.55); ctx.shadowBlur = 70 * u; ctx.fillStyle = INK; ctx.fillText(txt, W / 2, H / 2 - 40 * u); serre(ctx, "-0.01em"); ctx.restore();
    const p = eo(prog(t, 1.2, 1.7)), lw = 340 * u * p;
    ctx.fillStyle = rgba(CV, 1); rond(ctx, W / 2 - lw / 2, H / 2 + taille * 0.42, lw, 10 * u, 5 * u); ctx.fill();
    if (e.legende) motsAnimes(ctx, e.legende, e.accent, W / 2, H / 2 + taille * 0.42 + 110 * u, { taille: 58 * u, largeur: W * 0.82, t: t - 1, poids: 600, couleur: INK2(0.82), decale: 0.06 });
  },
  barres(ctx, s, e) { SCENES.mots(ctx, s, { texte: e.texte || s.nom, accent: e.accent }); },
  pastille(ctx, s, e) {
    const { W, H, u, t } = s;
    const p = ressort(prog(t, 0.05, 0.75)), tp = ajuste(ctx, e.texte, (LOOK === "nuit" ? 96 : 128) * u, W * 0.64, 800); ctx.font = `800 ${tp}px ${F}`;
    const w = ctx.measureText(e.texte).width + tp * 1.5, h = tp * 2.1;
    for (let k = 0; k < 2 && LOOK !== "pop" && LOOK !== "nuit"; k++) { const q = prog(t, 0.3 + k * 0.35, 1.3 + k * 0.35); if (q > 0 && q < 1) { ctx.save(); ctx.globalAlpha *= (1 - q) * 0.5; ctx.strokeStyle = rgba(CV, 1); ctx.lineWidth = 4 * u; rond(ctx, W / 2 - w / 2 - q * 90 * u, H / 2 - h / 2 - q * 90 * u, w + q * 180 * u, h + q * 180 * u, (h + q * 180 * u) / 2); ctx.stroke(); ctx.restore(); } }
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(p, p);
    const surCouleur = MODE === "couleur";
    if (LOOK === "nuit" && !surCouleur) {
      ctx.restore(); // le mot ne grossit pas : il est là, puis on le sélectionne, puis il devient bouton
      const ap = eo(prog(t, 0, 0.35)), sel = eo(prog(t, 0.55, 0.85)), plein = eo(prog(t, 1.0, 1.35)), k = 1 + 0.06 * Math.sin(Math.PI * prog(t, 1.0, 1.4));
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.globalAlpha *= ap; ctx.font = `700 ${tp}px ${F}`;
      const lw = w * (0.86 + 0.14 * plein), lh = h * (0.62 + 0.38 * plein);
      if (sel > 0) {
        rond(ctx, -lw / 2, -lh / 2, lw * (plein > 0 ? 1 : sel), lh, lh * 0.22 * plein + 4 * u);
        if (plein > 0) { const g = ctx.createLinearGradient(0, -lh / 2, 0, lh / 2); g.addColorStop(0, rgba(mix(C, [255, 255, 255], 0.16), 1)); g.addColorStop(1, rgba(mix(C, [0, 0, 0], 0.12), 1)); ctx.shadowColor = rgba(C, 0.45 * plein); ctx.shadowBlur = 50 * u * plein; ctx.shadowOffsetY = 16 * u * plein; ctx.fillStyle = g; ctx.globalAlpha *= 0.25 + 0.75 * plein; ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.globalAlpha = ap; }
        else { ctx.fillStyle = rgba(C, 0.22); ctx.fill(); ctx.strokeStyle = rgba(C, 0.9); ctx.lineWidth = Math.max(2, 2.5 * u); ctx.stroke(); }
      }
      ctx.fillStyle = plein > 0.5 ? (lum(C) > 0.62 ? "#111" : "#fff") : INK; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e.texte, 0, tp * 0.04); ctx.restore(); return;
    }
    if (LOOK === "pop") {
      rond(ctx, -w / 2, -h / 2, w, h, h * 0.26); ctx.fillStyle = "#fff"; ctx.fill();
      if (!surCouleur) { ctx.strokeStyle = rgba(C, 1); ctx.lineWidth = Math.max(3, 6 * u); ctx.stroke(); }
      ctx.fillStyle = rgba(C, 1); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e.texte, 0, tp * 0.04); ctx.restore(); return;
    }
    ctx.shadowColor = surCouleur ? "rgba(0,0,0,.28)" : rgba(C, 0.55); ctx.shadowBlur = 60 * u; ctx.shadowOffsetY = surCouleur ? 18 * u : 0; rond(ctx, -w / 2, -h / 2, w, h, h / 2);
    ctx.fillStyle = surCouleur ? "#fff" : rgba(C, 1); ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = surCouleur ? rgba(mix(C, [0, 0, 0], lum(C) > 0.5 ? 0.5 : 0.1), 1) : lum(C) > 0.62 ? "#111" : "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e.texte, 0, tp * 0.04); ctx.restore();
  },
  cartes(ctx, s, e) {
    const { W, H, u, t } = s;
    const items = (e.items ?? []).map((x) => (typeof x === "string" ? x : String(x?.texte ?? x?.titre ?? ""))).filter((x) => x && !/^\[object/.test(x)).slice(0, 3), w = Math.min(W * 0.84, 780 * u), h = 184 * u;
    if (!items.length) return SCENES.mots(ctx, s, { texte: e.texte || s.nom }); // ancienne vidéo aux cartes illisibles : le nom, plutôt qu'un écran vide
    items.forEach((x, i) => {
      const p = ressort(prog(t, 0.1 + i * 0.35, 0.9 + i * 0.35)); if (p <= 0) return;
      const off = (items.length - 1 - i) * 26 * u, y = H / 2 - h / 2 + (i - (items.length - 1) / 2) * (s.vertical ? h + 22 * u : h * 0.8);
      ctx.save(); ctx.globalAlpha *= clamp(p); ctx.translate(W / 2, y + h / 2 + (1 - p) * 160 * u); ctx.rotate((i - 1) * 0.04 * (1 - p * 0.6)); ctx.translate(-W / 2, -(y + h / 2));
      if (LOOK !== "pop") { ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 40 * u; ctx.shadowOffsetY = 14 * u; }
      rond(ctx, W / 2 - w / 2 + off / 2, y, w - off, h, 30 * u);
      const blanche = MODE === "couleur" || LOOK === "pop";
      if (LOOK === "pop" && MODE !== "couleur") { ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = rgba(C, 1); ctx.lineWidth = Math.max(3, 5 * u); ctx.stroke(); }
      if (blanche) ctx.fillStyle = "#fff"; else { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, rgba(mix(C, [255, 255, 255], 0.1 + i * 0.05), 1)); g.addColorStop(1, rgba(mix(C, [0, 0, 0], 0.15), 1)); ctx.fillStyle = g; } ctx.fill();
      ctx.shadowColor = "transparent"; ctx.fillStyle = LOOK === "pop" ? rgba(C, 1) : blanche ? rgba(mix(C, [0, 0, 0], lum(C) > 0.5 ? 0.55 : 0.15), 1) : lum(C) > 0.62 ? "#111" : "#fff"; ctx.font = `800 ${ajuste(ctx, x, 68 * u, w - 110 * u, 800)}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(x, W / 2, y + h / 2 + 3 * u);
      ctx.restore();
    });
  },
  aplat(ctx, s, e) {
    const { W, H, u, t } = s;
    const r = Math.hypot(W, H) * eio(prog(t, 0, 0.7));
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, 7); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, rgba(mix(C, [255, 255, 255], 0.12), 1)); g.addColorStop(1, rgba(mix(C, [0, 0, 0], 0.25), 1)); ctx.fillStyle = LOOK === "pop" ? rgba(C, 1) : g; ctx.fillRect(0, 0, W, H);
    const p = ressort(prog(t, 0.45, 1.2)), txt = e.texte || s.nom, ta = ajuste(ctx, txt, 118 * u, W * 0.66, 800); ctx.font = `800 ${ta}px ${F}`;
    if (LOGO?.width) { ctx.translate(W / 2, H / 2); ctx.scale(p, p); plaqueLogo(ctx, 0, 0, 130 * u, u); ctx.restore(); return; }
    const w = ctx.measureText(txt).width + ta * 1.5, h = ta * 2.1;
    ctx.translate(W / 2, H / 2); ctx.scale(p, p); rond(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.fillStyle = rgba(mix(C, [0, 0, 0], lum(C) > 0.6 ? 0.55 : 0), 1); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(txt, 0, ta * 0.04); ctx.restore();
  },
  personnage(ctx, s, e) { scenePersonnage(ctx, s, e); },
  // Le téléphone entouré d'applis n'existe que dans l'allure « clair » ; ailleurs, ses items s'affichent comme des pastilles
  telephone(ctx, s, e) { SCENES.pilules(ctx, s, { ...e, items: (e.items ?? []).slice(0, 3) }); },
  // L'image (ou le clip) de ce dont on parle, en plein écran : elle remplit tout le plan et avance doucement,
  // la phrase se pose dessus en bas, sur un voile sombre. Sans image chargée, la phrase seule.
  image(ctx, s, e) {
    const { W, H, u, t, vertical } = s, img = IMAGES[e.image], iw0 = img?.videoWidth || img?.width, ih0 = img?.videoHeight || img?.height;
    if (!iw0) return SCENES.mots(ctx, s, { texte: e.texte || s.nom, accent: e.accent });
    const k = Math.max(W / iw0, H / ih0) * (1.16 - 0.08 * prog(t, 0, s.d)), iw = iw0 * k, ih = ih0 * k;
    ctx.save(); ctx.globalAlpha = 1; ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2 - (e.texte && vertical ? Math.min(H * 0.07, (ih - H) / 2) : 0), iw, ih);
    if (e.texte) { const g = ctx.createLinearGradient(0, H * 0.6, 0, H); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.55, "rgba(0,0,0,.62)"); g.addColorStop(1, "rgba(0,0,0,.86)"); ctx.fillStyle = g; ctx.fillRect(0, H * 0.6, W, H * 0.4); }
    ctx.restore();
    if (e.texte) {
      const largeur = W * (vertical ? 0.84 : 0.6), encre = INK, cv = CV; INK = "#fff"; CV = C.map((v) => Math.round(v + (255 - v) * 0.3));
      serre(ctx, "-0.035em"); const taille = remplit(ctx, e.texte, (vertical ? 118 : 104) * u, largeur * 0.94, 2); serre(ctx, "-0.01em");
      motsAnimes(ctx, e.texte, e.accent, W * 0.08, H * (vertical ? 0.85 : 0.8), { taille, poids: 800, largeur, t: t - 0.3, decale: 0.08, aligne: "gauche" });
      INK = encre; CV = cv;
    }
  },
  logo(ctx, s, e) {
    const { W, H, u, t, vertical } = s;
    const p = eo(prog(t, 0, 1)), T = 150 * u;
    const y = H / 2 - (vertical ? 70 : 50) * u;
    if (LOGO?.width) { // son vrai logo : une onde de la couleur de la marque, la plaque qui rebondit, le logo dévoilé de gauche à droite
      const cyL = y - 60 * u, onde = prog(t, 0, 0.9);
      if (onde > 0 && onde < 1) { ctx.save(); ctx.globalAlpha *= (1 - onde) * 0.9; ctx.strokeStyle = rgba(CV, 1); ctx.lineWidth = (1 - onde) * 26 * u; ctx.beginPath(); ctx.arc(W / 2, cyL, eo(onde) * Math.max(W, H) * 0.55, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      const k = eob(prog(t, 0.05, 0.75)), rev = eo(prog(t, 0.3, 0.95));
      ctx.save(); ctx.globalAlpha *= Math.min(1, prog(t, 0.05, 0.3) * 1.2);
      ctx.translate(W / 2, cyL); ctx.scale(0.55 + 0.45 * k, 0.55 + 0.45 * k); ctx.rotate((1 - k) * -0.06); ctx.translate(-W / 2, -cyL);
      ctx.save(); ctx.shadowColor = rgba(CV, 0.7); ctx.shadowBlur = 120 * u * k;
      // La plaque d'abord vide, puis le logo qui apparaît derrière un rideau qui glisse
      const LG = LOGO; plaqueLogo(ctx, W / 2, cyL, 150 * u, u, false, false); ctx.restore();
      const kk = LG.width / LG.height, h = 150 * u, w = Math.min(h * kk, h * 3.2), ih = Math.min(h, w / kk);
      ctx.save(); ctx.beginPath(); ctx.rect(W / 2 - (ih * kk) / 2 - 4 * u, cyL - ih / 2 - 4 * u, (ih * kk + 8 * u) * rev, ih + 8 * u); ctx.clip();
      ctx.drawImage(LG, W / 2 - (ih * kk) / 2, cyL - ih / 2, ih * kk, ih); ctx.restore();
      ctx.restore();
      // Un logo qui contient déjà le nom (plus large que haut) : pas de nom répété dessous ; sinon le nom monte lettre par lettre
      if (LG.width / LG.height < 1.6) {
        ctx.save(); ctx.fillStyle = INK; ctx.font = `800 ${(vertical ? 84 : 76) * u}px ${F}`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
        const lettres = [...s.nom], larg = ctx.measureText(s.nom).width; let x = W / 2 - larg / 2;
        lettres.forEach((c, i) => { const q = eo(prog(t, 0.55 + i * 0.04, 0.95 + i * 0.04)); ctx.save(); ctx.globalAlpha *= q; ctx.fillText(c, x, y + 120 * u + (1 - q) * 40 * u); ctx.restore(); x += ctx.measureText(c).width; });
        ctx.restore();
      }
    } else {
    ctx.save(); if ("filter" in ctx) ctx.filter = p < 0.98 && LOOK !== "pop" ? `blur(${(1 - p) * 26 * u}px)` : "none"; ctx.globalAlpha *= p; // sans logo envoyé : le nom seul, en grand (aucune pastille dessinée)
    if (LOOK !== "pop") { ctx.shadowColor = rgba(CV, 0.6); ctx.shadowBlur = 60 * u; } serre(ctx, "-0.04em");
    ctx.fillStyle = INK; ctx.font = `900 ${ajuste(ctx, s.nom, (vertical ? 150 : 140) * u, W * 0.86, 900)}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s.nom, W / 2, y + 20 * u); serre(ctx, "-0.01em");
    ctx.restore();
    }
    const q = eo(prog(t, 0.8, 1.5));
    if (e.texte) { ctx.save(); ctx.globalAlpha *= q; ctx.fillStyle = INK2(0.78); ctx.font = `600 ${ajuste(ctx, e.texte, 58 * u, W * 0.84, 600)}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e.texte, W / 2, y + 200 * u); ctx.restore(); }
    if (s.lien) { ctx.save(); ctx.globalAlpha *= eo(prog(t, 1.1, 1.8)); ctx.font = `600 ${40 * u}px ${F}`; const lw = ctx.measureText(s.lien).width + 70 * u;
      rond(ctx, W / 2 - lw / 2, y + 280 * u, lw, 84 * u, 42 * u); ctx.fillStyle = NOIR ? "rgba(255,255,255,.08)" : "rgba(15,23,42,.06)"; ctx.fill(); ctx.strokeStyle = rgba(CV, 0.6); ctx.lineWidth = 2 * u; ctx.stroke();
      ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s.lien, W / 2, y + 323 * u); ctx.restore(); }
  },
};

// ---------------------------------------------------------------- Personnage animé (scène « personnage »)
// Un bonhomme articulé vu de profil qui marche dans un décor qui défile, dessiné dans un « style » :
//   trait  : fil blanc sur noir · neon : croquis lumineux sous un projecteur · craie : tableau d'école
// Tout est tracé par le moteur (aucune image, aucun personnage de marque). D'autres styles s'ajoutent sur le même squelette.
const STYLES_PERSO = ["trait", "neon", "craie"];
// Squelette au temps t : les points des membres, pour un personnage de taille S dont les pieds touchent le sol en (x, sol)
function squelette(x, sol, S, t) {
  const ph = t * Math.PI * 2 * 1.35, pas = (k) => Math.sin(ph + k), cuisse = 0.56 * S, tibia = 0.56 * S, tronc = 0.95 * S, bras = 0.4 * S, avant = 0.38 * S;
  const hanche = { x, y: sol - (cuisse + tibia) * 0.97 - Math.abs(Math.sin(ph)) * 0.035 * S };
  const jambe = (k) => { const a = pas(k) * 0.48, pli = Math.max(0, Math.cos(ph + k)) * 0.85 + 0.06; const g = { x: hanche.x + Math.sin(a) * cuisse, y: hanche.y + Math.cos(a) * cuisse }; const b = a - pli; const p = { x: g.x + Math.sin(b) * tibia, y: Math.min(sol, g.y + Math.cos(b) * tibia) }; return [hanche, g, p, { x: p.x + 0.17 * S, y: Math.min(sol, p.y + 0.02 * S) }]; };
  const penche = 0.07, epaule = { x: hanche.x + Math.sin(penche) * tronc, y: hanche.y - Math.cos(penche) * tronc };
  const brasDe = (k, tient) => { const a = tient ? 0.12 : -pas(k) * 0.42, c = { x: epaule.x + Math.sin(a) * bras, y: epaule.y + Math.cos(a) * bras }; const b = a + (tient ? 1.25 : 0.35 + Math.max(0, pas(k)) * 0.3); return [epaule, c, { x: c.x + Math.sin(b) * avant, y: c.y + Math.cos(b) * avant }]; };
  const tete = { x: epaule.x + 0.03 * S, y: epaule.y - 0.3 * S, r: 0.2 * S };
  return { hanche, epaule, tete, jambes: [jambe(0), jambe(Math.PI)], bras: [brasDe(Math.PI, false), brasDe(0, true)] };
}
// Tracé d'une ligne brisée, avec la « main » du style (craie : deux passes légèrement décalées)
function ligne(ctx, pts, style, graine = 0) {
  const trace = (dx, dy) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x + dx, p.y + dy) : ctx.moveTo(p.x + dx, p.y + dy))); ctx.stroke(); };
  if (style === "craie") { const j = ctx.lineWidth * 0.35, a = Math.sin(graine * 12.9898) * j, b = Math.cos(graine * 78.233) * j; ctx.save(); ctx.globalAlpha *= 0.85; trace(a, b); ctx.globalAlpha *= 0.55; trace(-b, a); ctx.restore(); } else trace(0, 0);
}
function cerclePerso(ctx, x, y, r, style, graine = 0) {
  const n = style === "craie" ? 2 : 1;
  for (let k = 0; k < n; k++) { ctx.save(); if (k) ctx.globalAlpha *= 0.5; ctx.beginPath(); ctx.arc(x + (k ? Math.sin(graine) * ctx.lineWidth * 0.4 : 0), y, r * (k ? 1.03 : 1), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
}
function scenePersonnage(ctx, s, e) {
  const { W, H, u, t, vertical } = s, style = STYLES_PERSO.includes(e.style) ? e.style : "trait";
  const encre = style === "neon" ? "#F5B83D" : style === "craie" ? "#F2F4EE" : "#FFFFFF", pale = style === "neon" ? "rgba(245,184,61,.32)" : style === "craie" ? "rgba(242,244,238,.5)" : "rgba(255,255,255,.34)";
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = Math.min(1, t / 0.25); if ("filter" in ctx) ctx.filter = "none"; ctx.shadowBlur = 0;
  // Fond du style
  if (style === "craie") {
    ctx.fillStyle = "#6B4A2E"; ctx.fillRect(0, 0, W, H); const m = Math.min(W, H) * 0.035; ctx.fillStyle = "#2E5E4A"; ctx.fillRect(m, m, W - 2 * m, H - 2 * m);
    const g = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.max(W, H) * 0.7); g.addColorStop(0, "rgba(255,255,255,.07)"); g.addColorStop(1, "rgba(0,0,0,.18)"); ctx.fillStyle = g; ctx.fillRect(m, m, W - 2 * m, H - 2 * m);
  } else { ctx.fillStyle = "#050506"; ctx.fillRect(0, 0, W, H); }
  const sol = H * (vertical ? 0.8 : 0.82), S = Math.min(W * (vertical ? 0.34 : 0.16), H * 0.21), cx = W * 0.5, ep = Math.max(2.5, (style === "craie" ? 5 : 4) * u);
  if (style === "neon") { // projecteur : un cône de lumière et un anneau au sol
    const g = ctx.createLinearGradient(0, 0, 0, sol); g.addColorStop(0, "rgba(245,184,61,.34)"); g.addColorStop(1, "rgba(245,184,61,.03)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - W * 0.03, 0); ctx.lineTo(cx + W * 0.03, 0); ctx.lineTo(cx + S * 1.9, sol); ctx.lineTo(cx - S * 1.9, sol); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = pale; ctx.lineWidth = ep * 0.6; ctx.lineCap = "round"; ctx.lineJoin = "round";
  // Décor qui défile vers la gauche (le personnage marche sur place) : sol en pointillés, cadre avec barres, plante, bureau
  const v = t * S * 1.5, large = W + S * 2.4, pos = (x0) => ((((x0 - v) % large) + large) % large) - S * 2;
  ligne(ctx, [{ x: 0, y: sol }, { x: W, y: sol }], style, 1);
  for (let k = 0; k < 14; k++) { const x = pos(k * large / 14); ligne(ctx, [{ x, y: sol + S * 0.22 }, { x: x + S * 0.12, y: sol + S * 0.22 }], style, k); }
  { const x = pos(W * 0.3), y = sol - S * 3.1, w = S * 1.5, h = S * 1.05; ligne(ctx, [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }], style, 3); [0.35, 0.6, 0.45, 0.8].forEach((q, i) => ligne(ctx, [{ x: x + w * (0.18 + i * 0.2), y: y + h * 0.88 }, { x: x + w * (0.18 + i * 0.2), y: y + h * (0.88 - q * 0.7) }], style, 4 + i)); }
  { const x = pos(W * 0.95), b = sol; [-0.5, -0.2, 0.12, 0.42].forEach((a, i) => ligne(ctx, [{ x, y: b }, { x: x + Math.sin(a) * S * 0.9, y: b - Math.cos(a) * S * (0.75 + (i % 2) * 0.25) }], style, 9 + i)); }
  { const x = pos(W * 1.3), w = S * 1.7, h = S * 0.95; ligne(ctx, [{ x, y: sol }, { x, y: sol - h }, { x: x + w, y: sol - h }, { x: x + w, y: sol }], style, 14); ligne(ctx, [{ x: x + w * 0.25, y: sol - h }, { x: x + w * 0.25, y: sol - h - S * 0.6 }, { x: x + w * 0.8, y: sol - h - S * 0.6 }, { x: x + w * 0.8, y: sol - h }], style, 15); }
  // Le personnage
  const k = squelette(cx, sol, S, t);
  ctx.strokeStyle = encre; ctx.lineWidth = ep;
  if (style === "neon") { ctx.shadowColor = "rgba(245,184,61,.95)"; ctx.shadowBlur = 22 * u; ctx.beginPath(); ctx.ellipse(cx, sol + S * 0.05, S * 0.95, S * 0.16, 0, 0, Math.PI * 2); ctx.stroke(); }
  ligne(ctx, k.jambes[1], style, 20); ligne(ctx, k.bras[0], style, 21);
  ligne(ctx, [k.hanche, k.epaule], style, 22); cerclePerso(ctx, k.tete.x, k.tete.y, k.tete.r, style, 23);
  ligne(ctx, k.jambes[0], style, 24); ligne(ctx, k.bras[1], style, 25);
  { const m = k.bras[1][2]; ligne(ctx, [{ x: m.x - S * 0.02, y: m.y + S * 0.03 }, { x: m.x + S * 0.3, y: m.y - S * 0.2 }], style, 26); } // ce qu'il tient : une tablette, de profil
  ctx.shadowBlur = 0;
  // La phrase de la scène, dans la « main » du style
  if (e.texte) {
    const craie = style === "craie", f = craie ? `"Caveat", "Segoe Print", cursive` : F, taille = (vertical ? (craie ? 110 : 78) : craie ? 84 : 60) * u;
    ctx.font = `${craie ? 500 : 600} ${taille}px ${f}`; ctx.fillStyle = encre; ctx.textAlign = "center"; ctx.textBaseline = "middle"; if (style === "neon") { ctx.shadowColor = "rgba(245,184,61,.8)"; ctx.shadowBlur = 16 * u; }
    const lignes = coupe(ctx, e.texte, W * 0.82).slice(0, 3), y0 = H * (vertical ? 0.17 : 0.15) - ((lignes.length - 1) * taille * 1.1) / 2;
    lignes.forEach((l, i) => { const p = eo(prog(t, 0.25 + i * 0.18, 0.8 + i * 0.18)); ctx.save(); ctx.globalAlpha *= p; ctx.fillText(l, W / 2, y0 + i * taille * 1.1 + (1 - p) * 20 * u); ctx.restore(); });
  }
  ctx.restore();
}

/** Dessine l'image au temps t (secondes) d'une vidéo composée de scènes. */
// Toujours une linéale très grasse et serrée (comme les pubs de référence), jamais la police à empattements du site
// Petit coup de caméra sur chaque temps (+1,2 %, retombe en 0,12 s), comme les films de lancement calés sur la musique
function pulsation(script, t) { const b = Number(script?.tempo) || 0; if (!b) return 1; const x = t % b; return 1 + 0.012 * Math.exp(-x / 0.12); }

/** Chaque scène dure un nombre entier de temps de la musique : les changements de scène tombent sur la grosse caisse. */
export function caleSurTempo(script, temps) {
  if (!temps || !script?.scenes?.length) return script;
  const scenes = script.scenes.map((s) => { const d = dureeScene(s); let n = Math.max(2, Math.round(d / temps)); while (n * temps > 5 && n > 2) n--; while (n * temps < 1.4) n++; return { ...s, duree: +(n * temps).toFixed(4) }; });
  return { ...script, scenes, tempo: temps };
}

/** Débuts et fins de scènes (pour les sons de transition). */
export function coupesScenes(script) {
  const out = []; let de = 0;
  for (const s of (script?.scenes ?? []).filter((x) => SCENES[x?.type])) { out.push({ t: de, type: s.type, vague: s.transition === "vague" }); de += dureeScene(s); }
  out.sons = sonsScenes(script); // les bruitages voyagent avec les coupes jusqu'au compositeur de musique
  return out;
}

/** Instants à dessiner pour une image (flou de mouvement à 180°) : plusieurs sous-images pendant les entrées, sorties
 * et vagues, une seule sinon (le texte posé reste net). Jamais de flou à cheval sur un changement de scène. */
export function sousInstants(script, t, fps = 30) {
  let de = 0;
  for (const s of (script?.scenes ?? []).filter((x) => SCENES[x?.type])) {
    const d = dureeScene(s), a = de, b = de + d; de = b;
    if (t < a || t >= b) continue;
    const local = t - a, bouge = local < 0.6 || local > d - 0.36 || (s.transition === "vague" && local < 0.7);
    if (!bouge) return [t];
    const n = 9, ouv = 0.5 / fps, out = [];
    for (let j = 0; j < n; j++) out.push(clamp(t + (j / (n - 1) - 0.5) * ouv, a + 1e-4, b - 1e-4));
    return out;
  }
  return [t];
}

// Pop : chaque scène est sur blanc ou sur la couleur de la marque, jamais deux fois de suite le même fond ; la fin sur blanc
function modesPop(scenes) {
  const m = scenes.map((e) => (e.fond === "blanc" ? "blanc" : "couleur"));
  for (let j = 1; j < m.length; j++) if (m[j] === m[j - 1]) m[j] = m[j] === "blanc" ? "couleur" : "blanc";
  if (m.length > 1) { m[m.length - 1] = "blanc"; if (m[m.length - 2] === "blanc") m[m.length - 2] = "couleur"; }
  return m;
}
// ── Allure « verre » : une interface sombre faite de pièces en verre et de lumière. Des capsules translucides au contour
// fin, un trait blanc lumineux qui fait le tour de la capsule pendant que le chiffre monte, des textes blancs de graisse
// moyenne, un point de lumière qui relie les plans. Les scènes non redéfinies ici gardent leur dessin habituel.
const texteDe = (x) => (typeof x === "string" ? x : String(x?.texte ?? x?.titre ?? x?.nom ?? ""));
// Tout y est petit, fin et lumineux, avec beaucoup de noir autour : une capsule sombre, un arc clair qui en fait le tour,
// des chiffres qui montent, une caméra qui avance sans jamais couper.
const teinte = (k = 0.2) => mix([255, 255, 255], C, k);
function flou(ctx, px) { if ("filter" in ctx) ctx.filter = px > 0.4 ? `blur(${px}px)` : "none"; }
function capsule(ctx, x, y, w, h, u, { tour = 0, r = h / 2, clair = 0 } = {}) {
  ctx.save();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, `rgba(34,33,42,${0.92})`); g.addColorStop(1, `rgba(16,16,21,${0.92})`);
  rond(ctx, x, y, w, h, r); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = `rgba(255,255,255,${0.07 + clair * 0.2})`; ctx.lineWidth = Math.max(1, 1.6 * u); ctx.stroke();
  if (tour > 0.002) {
    // L'arc part du milieu du bord haut et tourne dans le sens des aiguilles ; sa queue s'efface
    const L = 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r, len = L * Math.min(0.86, tour * 0.86), dep = -(w / 2 - r);
    ctx.lineCap = "round"; ctx.lineWidth = Math.max(2, 4.2 * u); ctx.shadowColor = rgba(teinte(0.45), 0.85); ctx.shadowBlur = 16 * u;
    [[1, 0.28], [0.62, 0.55], [0.3, 1]].forEach(([part, a]) => { ctx.strokeStyle = rgba(teinte(0.18), a); ctx.setLineDash([len * part, L * 2]); ctx.lineDashOffset = dep - len * (1 - part); rond(ctx, x, y, w, h, r); ctx.stroke(); });
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
  }
  ctx.restore();
}
// « Sommeil 67 » → le libellé d'un côté, le chiffre de l'autre (une capsule montre le chiffre, le libellé passe dessous)
const partage = (x) => { const m = String(x).match(/^(.*?)[\s:·–-]*(\d[\d\s.,]*\s?[%€a-zA-Z]{0,4})$/); return m && m[1].trim() ? { nom: m[1].trim(), val: m[2].trim() } : { nom: "", val: String(x) }; };
function ecrit(ctx, txt, x, y, { taille, poids = 500, t = 1, couleur = null, aligne = "center", u = 1 }) {
  const p = eo(prog(t, 0, 0.5)); if (p <= 0) return;
  ctx.save(); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 10 * u); ctx.font = `${poids} ${taille}px ${F}`; ctx.textAlign = aligne; ctx.textBaseline = "middle"; ctx.fillStyle = couleur ?? rgba(teinte(0.16), 0.96); ctx.fillText(txt, x, y); ctx.restore();
}
const VERRE = {
  // Un histogramme vu de loin et de biais ; la caméra fonce dessus, une barre se remplit de la couleur de la marque, vire au
  // chaud puis au blanc, et il n'en reste qu'un point de lumière d'où sort la capsule du chiffre
  compteur(ctx, s, e) {
    const { W, H, u, t, d, vertical } = s, long = d >= 2.6, tb = long ? 1.45 : 0;
    const cible = Number(String(e.valeur ?? "").replace(/\s/g, "").replace(",", ".")) || 0, dec = /[.,]/.test(String(e.valeur ?? "")) ? 1 : 0;
    if (long && t < tb + 0.15) {
      const q = eio(prog(t, 0, 1.15)), a = Math.min(1, prog(t, 0, 0.3) * 1.3) * (1 - prog(t, tb - 0.18, tb + 0.12)), n = 7, k = 4;
      const bw = 46 * u, gap = 34 * u, larg = n * bw + (n - 1) * gap, hm = 250 * u, base = hm * 0.5;
      ctx.save(); ctx.translate(W / 2, H * 0.5); const z = 0.42 + q * 1.5; ctx.transform(z, 0, -0.55 * (1 - q) * z, z * (0.42 + 0.58 * q), 0, (1 - q) * 60 * u);
      ctx.translate(-(k * (bw + gap) + bw / 2 - larg / 2) * q, 0); ctx.globalAlpha *= a; flou(ctx, (1 - q) * 5 * u);
      ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.lineWidth = 1.5 * u; for (let g = 0; g < 4; g++) { ctx.beginPath(); ctx.moveTo(-larg / 2 - 40 * u, base - hm * g / 3); ctx.lineTo(larg / 2 + 40 * u, base - hm * g / 3); ctx.stroke(); }
      ctx.setLineDash([7 * u, 9 * u]); ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.moveTo(-larg / 2 - 40 * u, base - hm * 0.6); ctx.lineTo(larg / 2 + 40 * u, base - hm * 0.6); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < n; i++) {
        const hh = hm * [0.5, 0.4, 0.62, 0.55, 0.9, 0.7, 0.48][i], x = -larg / 2 + i * (bw + gap);
        const gb = ctx.createLinearGradient(0, base - hh, 0, base); gb.addColorStop(0, "rgba(255,255,255,.16)"); gb.addColorStop(1, "rgba(255,255,255,.05)"); ctx.fillStyle = gb; ctx.fillRect(x, base - hh, bw, hh);
        if (i === k) {
          const r = eio(prog(t, 0.45, 1.0)), ch = prog(t, 0.85, 1.2), bl = prog(t, 1.1, tb), hc = hh * r; if (hc < 1) continue;
          const bas = mix(C, [255, 255, 255], bl), haut = mix(mix(C, [255, 196, 70], ch), [255, 255, 255], bl);
          const g = ctx.createLinearGradient(0, base, 0, base - hc); g.addColorStop(0, rgba(bas, 1)); g.addColorStop(0.55, rgba(mix(bas, haut, 0.5), 1)); g.addColorStop(1, rgba(haut, 1));
          ctx.save(); ctx.shadowColor = rgba(mix(haut, [255, 255, 255], bl), 0.95); ctx.shadowBlur = (26 + ch * 40 + bl * 110) * u; ctx.fillStyle = g; ctx.fillRect(x, base - hc, bw, hc); if (bl > 0) ctx.fillRect(x, base - hc, bw, hc); ctx.restore();
        }
      }
      ctx.restore();
    }
    const tl = t - tb; if (tl < 0) return;
    const p = ressort(prog(tl, 0, 0.75)), fin0 = Math.min(1.9, Math.max(0.9, d - tb - 0.7)), v = cible * eo(prog(tl, 0.1, fin0));
    const fmt = (x) => (dec ? x.toFixed(1).replace(".", ",") : Math.round(x).toLocaleString("fr-FR")) + (e.suffixe ? ` ${e.suffixe}` : "");
    serre(ctx, "-0.01em"); const tp = (vertical ? 84 : 76) * u; ctx.font = `500 ${tp}px ${F}`;
    const w = Math.max(ctx.measureText(fmt(cible)).width + tp * 1.5, tp * 3), h = tp * 1.85, cy = H * 0.49;
    ctx.save(); ctx.translate(W / 2, cy); ctx.scale(0.25 + 0.75 * p, 0.25 + 0.75 * p); ctx.globalAlpha *= Math.min(1, prog(tl, 0, 0.2) * 1.2);
    capsule(ctx, -w / 2, -h / 2, w, h, u, { tour: cible ? v / cible : prog(tl, 0.1, fin0) });
    ctx.fillStyle = rgba(teinte(0.22), 1); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(fmt(v), 0, tp * 0.04); ctx.restore();
    const leg = e.legende || e.texte; if (leg) { let tg = (vertical ? 42 : 36) * u; ctx.font = `500 ${tg}px ${F}`; const wl = ctx.measureText(leg).width; if (wl > W * 0.8) tg *= (W * 0.8) / wl; ecrit(ctx, leg, W / 2, cy + h / 2 + tg * 1.5, { taille: tg, t: tl - 0.5, u }); }
  },
  // Trois petites capsules côte à côte : le chiffre de chacune monte pendant que son arc se trace, le libellé dessous.
  // À la fin elles descendent, une accolade les réunit, et le titre s'écrit au-dessus.
  pilules(ctx, s, e) {
    const { W, H, u, t, d, vertical } = s, items = (e.items ?? []).slice(0, 3).map(texteDe).filter(Boolean).map(partage), n = Math.max(1, items.length);
    const fin = e.texte ? eio(prog(t, d * 0.52, d * 0.52 + 0.6)) : 0;
    let tp = (vertical ? 62 : 50) * u; ctx.font = `500 ${tp}px ${F}`;
    const gap = (vertical ? 22 : 50) * u, lw = items.map((x) => Math.max(ctx.measureText(x.val).width + tp * 1.5, tp * 2.9)), tot = lw.reduce((a, b) => a + b, 0) + gap * (n - 1), k = Math.min(1, (W * 0.9) / tot);
    tp *= k; const h = tp * 1.85, cy = H * 0.5 + fin * 110 * u; let x = W / 2 - (tot * k) / 2; const centres = [];
    items.forEach((it, i) => {
      const w = lw[i] * k, ti = t - 0.15 - i * 0.38, p = ressort(prog(ti, 0, 0.6)), cx = x + w / 2; x += w + gap * k; centres.push(cx); if (p <= 0) return;
      const num = Number(it.val.replace(/[^\d.,]/g, "").replace(",", ".")), compte = Number.isFinite(num) && /^\d/.test(it.val), q = eo(prog(ti, 0.1, 1.2));
      ctx.save(); ctx.translate(cx, cy + (1 - p) * 26 * u); ctx.scale(0.6 + 0.4 * p, 0.6 + 0.4 * p); ctx.globalAlpha *= Math.min(1, prog(ti, 0, 0.2) * 1.3);
      capsule(ctx, -w / 2, -h / 2, w, h, u, { tour: q });
      ctx.font = `500 ${tp}px ${F}`; ctx.fillStyle = rgba(teinte(0.22), 1); ctx.textAlign = "center"; ctx.textBaseline = "middle"; const nd = (it.val.match(/[.,](\d+)/)?.[1] ?? "").length; ctx.fillText(compte ? it.val.replace(/[\d.,]+/, (num * q).toFixed(nd).replace(".", ",")) : it.val, 0, tp * 0.04); ctx.restore();
      if (it.nom) ecrit(ctx, it.nom, cx, cy + h / 2 + tp * 0.85, { taille: tp * 0.6, t: ti - 0.35, u });
    });
    if (fin > 0 && centres.length > 1) {
      const yb = cy - h / 2 - 34 * u, yh = yb - 46 * u, x1 = centres[0], x2 = centres[centres.length - 1], r = 22 * u, mid = W / 2;
      ctx.save(); ctx.strokeStyle = rgba(teinte(0.2), 0.9); ctx.lineWidth = Math.max(2, 3.4 * u); ctx.lineCap = "round"; ctx.shadowColor = rgba(teinte(0.45), 0.7); ctx.shadowBlur = 12 * u;
      const demi = (sx) => { const xe = mid + (sx < 0 ? x1 - mid : x2 - mid) * fin; ctx.beginPath(); ctx.moveTo(mid, yh); ctx.lineTo(xe - sx * r, yh); ctx.quadraticCurveTo(xe, yh, xe, yh + r); ctx.lineTo(xe, yh + r + (yb - yh - r) * fin); ctx.stroke(); };
      demi(-1); demi(1); ctx.beginPath(); ctx.moveTo(mid, yh); ctx.lineTo(mid, yh - 20 * u * fin); ctx.stroke(); ctx.restore();
      let tg = (vertical ? 76 : 84) * u; ctx.font = `600 ${tg}px ${F}`; const wt = ctx.measureText(e.texte).width; if (wt > W * 0.86) tg *= (W * 0.86) / wt;
      ecrit(ctx, e.texte, W / 2, yh - 20 * u - tg * 0.85, { taille: tg, poids: 600, t: t - d * 0.52 - 0.25, u });
    }
  },
  // Un petit panneau d'interface : son titre, puis des lignes fines qui se posent l'une sous l'autre
  liste(ctx, s, e) {
    const { W, H, u, t, vertical } = s, items = (e.items ?? []).slice(0, 4).map(texteDe).filter(Boolean), n = Math.max(1, items.length);
    const tp0 = (vertical ? 40 : 38) * u, h = tp0 * 2.3, gap = tp0 * 0.5, w = W * (vertical ? 0.66 : 0.36), x0 = (W - w) / 2, hh = n * h + (n - 1) * gap, y0 = H / 2 - hh / 2 + (e.texte ? tp0 * 1.1 : 0);
    if (e.texte) { let tg = tp0 * 1.12; ctx.font = `600 ${tg}px ${F}`; const wt = ctx.measureText(e.texte).width; if (wt > w) tg *= w / wt; ecrit(ctx, e.texte, x0, y0 - tp0 * 1.5, { taille: tg, poids: 600, t, aligne: "left", u, couleur: "rgba(255,255,255,.96)" }); }
    items.forEach((x, i) => {
      const ti = t - 0.25 - i * 0.2, p = eo(prog(ti, 0, 0.5)); if (p <= 0) return;
      const y = y0 + i * (h + gap) + (1 - p) * 24 * u;
      ctx.save(); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 8 * u); capsule(ctx, x0, y, w, h, u, { r: 22 * u, clair: i === 0 ? 0.6 : 0 });
      ctx.fillStyle = rgba(teinte(0.5), 1); ctx.shadowColor = rgba(teinte(0.6), 0.9); ctx.shadowBlur = 12 * u; ctx.beginPath(); ctx.arc(x0 + h * 0.45, y + h / 2, 6 * u, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      let tp = tp0; ctx.font = `500 ${tp}px ${F}`; const place = w - h * 1.1, wt = ctx.measureText(x).width; if (wt > place) { tp *= place / wt; ctx.font = `500 ${tp}px ${F}`; }
      ctx.fillStyle = rgba(teinte(0.14), 0.95); ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(x, x0 + h * 0.82, y + h / 2 + tp * 0.04); ctx.restore();
    });
  },
  cartes(ctx, s, e) { VERRE.liste(ctx, s, e); },
  choix(ctx, s, e) { VERRE.liste(ctx, s, e); },
  // Un long bouton de verre teinté par le bas, un triangle « lecture » et son texte ; un reflet le traverse, puis il s'enfonce
  pastille(ctx, s, e) {
    const { W, H, u, t, vertical } = s, p = eo(prog(t, 0.05, 0.75)), appui = prog(t, 1.5, 1.68) * (1 - prog(t, 1.68, 1.95)), allume = prog(t, 1.62, 2.2);
    let tp = (vertical ? 46 : 42) * u; ctx.font = `500 ${tp}px ${F}`; const w = W * (vertical ? 0.8 : 0.5), wt = ctx.measureText(e.texte ?? "").width; if (wt > w * 0.7) { tp *= (w * 0.7) / wt; ctx.font = `500 ${tp}px ${F}`; }
    const h = (vertical ? 46 : 42) * u * 2.5, k = (1.25 - 0.25 * p) * (1 - appui * 0.04);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 14 * u);
    ctx.save(); ctx.shadowColor = rgba(C, 0.25 + allume * 0.6); ctx.shadowBlur = (30 + allume * 90) * u;
    const g = ctx.createLinearGradient(-w * 0.2, -h / 2, w * 0.3, h / 2); g.addColorStop(0, "rgba(40,39,50,.95)"); g.addColorStop(0.55, rgba(mix([40, 39, 50], C, 0.35 + allume * 0.3), 0.95)); g.addColorStop(1, rgba(mix([60, 58, 76], C, 0.6 + allume * 0.3), 0.95));
    rond(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    rond(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = Math.max(1, 1.6 * u); ctx.stroke();
    const br = prog(t, 0.6, 1.4); if (br > 0 && br < 1) { ctx.save(); rond(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.clip(); const bx = -w / 2 - h + (w + 2 * h) * eio(br), gr = ctx.createLinearGradient(bx - h, 0, bx + h, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,.2)"); gr.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = gr; ctx.fillRect(bx - h, -h / 2, 2 * h, h); ctx.restore(); }
    const tw = ctx.measureText(e.texte ?? "").width, tri = tp * 0.34, xt = -(tw + tri * 2.8) / 2;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(xt, -tri); ctx.lineTo(xt + tri * 1.6, 0); ctx.lineTo(xt, tri); ctx.closePath(); ctx.fill();
    ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(e.texte ?? "", xt + tri * 2.8, tp * 0.04); ctx.restore();
  },
  // Une phrase courte, petite et fine, qui sort du flou mot après mot
  mots(ctx, s, e) {
    const { W, H, u, t, vertical } = s, largeur = W * (vertical ? 0.8 : 0.6), txt = e.texte || "";
    const taille = remplit(ctx, txt, (vertical ? 78 : 70) * u, largeur, 3, 500); ctx.font = `500 ${taille}px ${F}`;
    const lignes = coupe(ctx, txt, largeur), acc = String(e.accent || "").toLowerCase().split(/\s+/).filter(Boolean), esp = taille * 0.27; let i = 0;
    lignes.forEach((l, k) => {
      const mots = l.split(" "), w = mots.reduce((a, m) => a + ctx.measureText(m).width, 0) + esp * (mots.length - 1); let cx = W / 2 - w / 2; const cy = H / 2 + (k - (lignes.length - 1) / 2) * taille * 1.22;
      for (const m of mots) { const estAcc = acc.includes(m.toLowerCase().replace(/[.,!?;:«»"]/g, "")); ctx.font = `500 ${taille}px ${F}`; const mw = ctx.measureText(m).width; ecrit(ctx, m, cx, cy, { taille, t: t - i * 0.09, aligne: "left", u, couleur: estAcc ? rgba(mix(C, [255, 255, 255], 0.35), 1) : null }); cx += mw + esp; i++; }
    });
  },
  rature(ctx, s, e) { VERRE.mots(ctx, s, e); },
  aplat(ctx, s, e) { VERRE.impact(ctx, s, { ...e, texte: e.texte || s.nom }); },
  // Un mot seul qui sort du flou en reculant, avec un halo
  impact(ctx, s, e) {
    const { W, H, u, t, vertical } = s, p = eo(prog(t, 0, 0.8)), txt = e.texte || s.nom;
    serre(ctx, "-0.03em"); const taille = remplit(ctx, txt, (vertical ? 150 : 140) * u, W * 0.8, 2, 600);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1.3 - 0.3 * p, 1.3 - 0.3 * p); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 28 * u);
    ctx.font = `600 ${taille}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.shadowColor = rgba(teinte(0.4), 0.55); ctx.shadowBlur = 40 * u;
    const ls = coupe(ctx, txt, W * 0.8); ls.forEach((l, i) => ctx.fillText(l, 0, (i - (ls.length - 1) / 2) * taille * 1.06)); ctx.restore(); serre(ctx, "-0.01em");
  },
  // La fin : le nom sort du flou, lumineux, puis l'adresse en tout petit dessous
  logo(ctx, s, e) {
    if (LOGO?.width) return SCENES.logo(ctx, s, e);
    const { W, H, u, t, vertical } = s, p = eo(prog(t, 0, 1));
    serre(ctx, "-0.04em"); const taille = ajuste(ctx, s.nom, (vertical ? 150 : 150) * u, W * 0.7, 600);
    ctx.save(); ctx.translate(W / 2, H * 0.49); ctx.scale(1.35 - 0.35 * p, 1.35 - 0.35 * p); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 34 * u);
    ctx.font = `600 ${taille}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(255,255,255,.5)"; ctx.shadowBlur = (16 + (1 - p) * 70) * u; ctx.fillText(s.nom, 0, 0); ctx.restore(); serre(ctx, "-0.01em");
    [e.texte, s.lien].filter(Boolean).forEach((x, i) => { let tp = (i ? 28 : 38) * u; ctx.font = `500 ${tp}px ${F}`; const wt = ctx.measureText(x).width; if (wt > W * 0.8) tp *= (W * 0.8) / wt; ecrit(ctx, x, W / 2, H * 0.49 + taille * 0.72 + (36 + i * 62) * u, { taille: tp, t: t - 1 - i * 0.25, u, couleur: i ? "rgba(255,255,255,.42)" : "rgba(255,255,255,.78)" }); });
  },
};
// ── Allure « clair » : sobre comme une pub de logiciel. Un gris très clair, de petites phrases noires nettes dont un mot
// prend la couleur de la marque, une caméra qui finit par plonger dans la phrase, une tuile blanche, des cartes pastel
// qui s'empilent, un passage au noir quand ça va mal, et un fil de couleur qui traverse l'écran d'un plan à l'autre.
const ENCRE = "#111114";
const teinteDe = (c) => { const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < 0.001) return 220; const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };
const tons = (i) => { const h = (teinteDe(C) + [0, 135, 250, 60][i % 4]) % 360; return { fond: `hsl(${h},85%,90%)`, encre: `hsl(${h},55%,30%)`, plein: `hsl(${h},62%,46%)` }; };
// Une tuile d'appli : carré très arrondi, dégradé de couleur, reflet en haut, ombre douce, un pictogramme blanc au centre
function tuile(ctx, cx, cy, taille, i, nomIcone, u, angle = 0) {
  const h = (teinteDe(C) + [0, 135, 250, 60, 300][i % 5]) % 360, r = taille * 0.23;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
  ctx.save(); ctx.shadowColor = `hsla(${h},60%,30%,.3)`; ctx.shadowBlur = taille * 0.22; ctx.shadowOffsetY = taille * 0.1; rond(ctx, -taille / 2, -taille / 2, taille, taille, r); ctx.fillStyle = `hsl(${h},70%,52%)`; ctx.fill(); ctx.restore();
  const g = ctx.createLinearGradient(0, -taille / 2, 0, taille / 2); g.addColorStop(0, `hsl(${h},88%,66%)`); g.addColorStop(1, `hsl(${h},74%,46%)`); rond(ctx, -taille / 2, -taille / 2, taille, taille, r); ctx.fillStyle = g; ctx.fill();
  ctx.save(); rond(ctx, -taille / 2, -taille / 2, taille, taille, r); ctx.clip(); const gl = ctx.createLinearGradient(0, -taille / 2, 0, 0); gl.addColorStop(0, "rgba(255,255,255,.38)"); gl.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(0, -taille * 0.52, taille * 0.8, taille * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = Math.max(1, taille * 0.008); rond(ctx, -taille / 2, -taille / 2, taille, taille, r); ctx.stroke();
  icone(ctx, ICONES[nomIcone] && nomIcone !== "etincelle" ? nomIcone : ["message", "agenda", "graphique", "feuille", "etoile"][i % 5], 0, 0, taille * 0.5, "#fff", 2);
  ctx.restore();
}
// ── Allure « lueur » : une pub d'outil intelligent dans la nuit indigo. Une lumière violette monte du bas de l'écran, des
// panneaux de verre flottent en profondeur, les phrases arrivent en se « décodant » (lettres qui défilent puis se figent),
// une barre de recherche où la demande se tape, une réponse qui s'écrit, des cartes de chiffres en perspective, un ruban de
// lumière qui balaie l'écran, et la signature : une étoile à quatre branches et le nom qui s'écrit lettre par lettre.
const VIO = [124, 77, 255], ROSE = [205, 92, 255], BLEU = [86, 110, 255];
const hasard = (i, j = 0) => { const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return x - Math.floor(x); };
const GLYPHES = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&$@*+=";
// Une phrase qui se décode : chaque lettre défile (glyphes violets) avant de se poser en blanc ; une ombre colorée décalée s'efface
function decode(ctx, txt, x, y, { taille, t, u, poids = 600, aligne = "center", vitesse = 0.028, couleur = "#F4F2FF", largeurMax = null }) {
  if (t <= 0 || !txt) return;
  let tp = taille; ctx.font = `${poids} ${tp}px ${F}`; const wt = ctx.measureText(txt).width; if (largeurMax && wt > largeurMax) { tp *= largeurMax / wt; ctx.font = `${poids} ${tp}px ${F}`; }
  const lettres = [...txt], larg = ctx.measureText(txt).width, x0 = aligne === "center" ? x - larg / 2 : aligne === "right" ? x - larg : x, tic = Math.floor(t * 28);
  ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "middle";
  let cx = x0;
  lettres.forEach((l, i) => {
    const w = ctx.measureText(l).width, debut = i * vitesse, pose = debut + 0.22; if (t < debut) { cx += w; return; }
    const fixe = t >= pose || l === " ", a = Math.min(1, (t - debut) / 0.08);
    const car = fixe ? l : GLYPHES[Math.floor(hasard(i, tic) * GLYPHES.length)];
    ctx.globalAlpha = a;
    if (!fixe) { ctx.fillStyle = rgba(mix(VIO, ROSE, hasard(i, tic + 3)), 0.95); ctx.shadowColor = rgba(VIO, 0.9); ctx.shadowBlur = 14 * u; ctx.fillText(car, cx + (hasard(i, tic + 7) - 0.5) * 6 * u, y); }
    else {
      const ab = 1 - prog(t, pose, pose + 0.35);
      if (ab > 0.02) { ctx.shadowBlur = 0; ctx.globalAlpha = a * ab * 0.8; ctx.fillStyle = rgba(ROSE, 1); ctx.fillText(l, cx - 4 * u * ab, y); ctx.fillStyle = rgba(BLEU, 1); ctx.fillText(l, cx + 4 * u * ab, y); ctx.globalAlpha = a; }
      ctx.shadowColor = rgba(VIO, 0.55); ctx.shadowBlur = 18 * u; ctx.fillStyle = couleur; ctx.fillText(l, cx, y);
    }
    cx += w;
  });
  ctx.restore();
}
// Un panneau de verre indigo au bord lumineux (le bord s'éclaire du violet, plus fort en bas)
function vitre(ctx, x, y, w, h, u, { r = 22, lueur = 0.6, plein = 0.55 } = {}) {
  ctx.save();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, `rgba(22,20,58,${plein})`); g.addColorStop(1, `rgba(12,10,36,${plein + 0.15})`);
  rond(ctx, x, y, w, h, r * u); ctx.fillStyle = g; ctx.shadowColor = rgba(VIO, 0.45 * lueur); ctx.shadowBlur = 40 * u * lueur; ctx.fill(); ctx.shadowBlur = 0;
  const b = ctx.createLinearGradient(x, y, x + w * 0.4, y + h); b.addColorStop(0, `rgba(255,255,255,${0.1 + 0.25 * lueur})`); b.addColorStop(0.5, rgba(VIO, 0.35 + 0.4 * lueur)); b.addColorStop(1, rgba(ROSE, 0.25 + 0.4 * lueur));
  ctx.strokeStyle = b; ctx.lineWidth = Math.max(1.2, 2.2 * u); rond(ctx, x, y, w, h, r * u); ctx.stroke();
  ctx.restore();
}
// Des lignes de texte floutées, comme une interface vue de loin
function lignesFloues(ctx, x, y, w, n, u, a = 0.5, graine = 1) {
  for (let k = 0; k < n; k++) { const lw = w * (0.45 + hasard(graine, k) * 0.5); ctx.fillStyle = `rgba(220,214,255,${a * (k === 0 ? 0.9 : 0.45)})`; rond(ctx, x, y + k * 18 * u, lw, 7 * u, 3.5 * u); ctx.fill(); }
}
// L'étoile à quatre branches, signature de l'allure
function etoile(ctx, cx, cy, R, rot = 0, a = 1, u = 1) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.globalAlpha *= a;
  const g = ctx.createLinearGradient(-R, -R, R, R); g.addColorStop(0, rgba(mix(BLEU, [255, 255, 255], 0.3), 1)); g.addColorStop(0.5, rgba(VIO, 1)); g.addColorStop(1, rgba(ROSE, 1));
  ctx.fillStyle = g; ctx.shadowColor = rgba(VIO, 0.95); ctx.shadowBlur = R * 0.9;
  ctx.beginPath(); for (let k = 0; k < 4; k++) { const an = (k * Math.PI) / 2, an2 = an + Math.PI / 4; ctx.lineTo(Math.cos(an) * R, Math.sin(an) * R); ctx.quadraticCurveTo(Math.cos(an2) * R * 0.12, Math.sin(an2) * R * 0.12, Math.cos(an + Math.PI / 2) * R, Math.sin(an + Math.PI / 2) * R); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
// Des panneaux qui flottent en profondeur derrière une phrase (la scène d'ouverture)
function panneauxFlottants(ctx, s, n = 4, a = 1) {
  const { W, H, u, t } = s;
  for (let k = 0; k < n; k++) {
    const z = 0.55 + hasard(k, 9) * 0.6, px = W * (k % 2 ? 0.74 : 0.2) + Math.sin(t * 0.5 + k) * 18 * u, py = H * (0.22 + 0.17 * k) - t * 22 * u * z, w = W * 0.36 * z, h = w * 0.42;
    ctx.save(); ctx.globalAlpha *= a * (0.35 + 0.35 * z) * Math.min(1, prog(t, k * 0.12, k * 0.12 + 0.5) * 1.2); flou(ctx, (1.2 - z) * 6 * u);
    vitre(ctx, px - w / 2, py - h / 2, w, h, u * z, { r: 14, lueur: 0.5 + 0.4 * z });
    lignesFloues(ctx, px - w / 2 + 18 * u * z, py - h / 2 + 22 * u * z, w - 36 * u * z, 4, u * z, 0.55, k);
    if (k % 2 === 0) etoile(ctx, px + w * 0.32, py + h * 0.18, 14 * u * z, t * 0.6, 0.8, u);
    ctx.restore();
  }
}
const LUEUR = {
  // La question qui pose le problème : panneaux flottants derrière, la phrase se décode en bas de l'écran
  mots(ctx, s, e) {
    const { W, H, u, t, vertical } = s;
    panneauxFlottants(ctx, s, vertical ? 5 : 4);
    decode(ctx, e.texte ?? "", W / 2, H * (vertical ? 0.7 : 0.74), { taille: (vertical ? 74 : 62) * u, t: t - 0.25, u, largeurMax: W * 0.86, poids: 600 });
  },
  rature(ctx, s, e) { LUEUR.mots(ctx, s, { texte: [e.texte_avant, e.barre, e.texte].filter(Boolean).join(" ") }); },
  // La barre de recherche : la caméra arrive dessus, la demande se tape, la petite flèche d'envoi s'allume
  pastille(ctx, s, e) {
    const { W, H, u, t, vertical } = s, z = 0.72 + 0.28 * eio(prog(t, 0, 1.1)), txt = String(e.texte ?? ""), tape = Math.floor(Math.max(0, t - 0.7) / 0.045);
    const w = W * (vertical ? 0.86 : 0.62), h = (vertical ? 120 : 104) * u;
    ctx.save(); ctx.translate(W / 2, H * 0.5); ctx.scale(z, z);
    vitre(ctx, -w / 2, -h / 2 - 40 * u, w, h * 1.9, u, { r: 26, lueur: 0.55 + 0.35 * Math.sin(t * 2.4) ** 2 });
    etoile(ctx, -w / 2 + 50 * u, -40 * u, 16 * u, t * 0.8, 1, u);
    const pw = 230 * u, ph = 54 * u, px = -w / 2 + 86 * u, py = -40 * u - ph / 2;
    rond(ctx, px, py, pw, ph, ph / 2); const gp = ctx.createLinearGradient(px, 0, px + pw, 0); gp.addColorStop(0, rgba(VIO, 0.95)); gp.addColorStop(1, rgba(mix(VIO, BLEU, 0.5), 0.95)); ctx.fillStyle = gp; ctx.shadowColor = rgba(VIO, 0.8); ctx.shadowBlur = 24 * u; ctx.fill(); ctx.shadowBlur = 0;
    ctx.font = `600 ${24 * u}px ${F}`; ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillText("Demander…", px + 26 * u, py + ph / 2);
    // La demande, tapée lettre par lettre, avec le curseur
    let tp = (vertical ? 38 : 34) * u; ctx.font = `500 ${tp}px ${F}`; const zone = w - 140 * u, wt = ctx.measureText(txt).width; if (wt > zone) { tp *= zone / wt; ctx.font = `500 ${tp}px ${F}`; }
    const vu = txt.slice(0, tape), yt = 60 * u; ctx.fillStyle = "rgba(240,236,255,.95)"; ctx.fillText(vu, -w / 2 + 44 * u, yt);
    if (tape < txt.length || Math.floor(t * 2.2) % 2 === 0) { const cx = -w / 2 + 44 * u + ctx.measureText(vu).width + 4 * u; ctx.fillStyle = rgba(ROSE, 1); ctx.fillRect(cx, yt - tp * 0.55, 3 * u, tp * 1.1); }
    const fini = prog(t, 0.75 + txt.length * 0.045, 1.05 + txt.length * 0.045);
    if (fini > 0) { const r = 26 * u, bx = w / 2 - 50 * u; ctx.save(); ctx.globalAlpha *= fini; ctx.beginPath(); ctx.arc(bx, yt, r, 0, Math.PI * 2); ctx.fillStyle = rgba(VIO, 1); ctx.shadowColor = rgba(ROSE, 0.9); ctx.shadowBlur = 30 * u * fini; ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3.2 * u; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(bx, yt + 10 * u); ctx.lineTo(bx, yt - 10 * u); ctx.moveTo(bx - 9 * u, yt - 2 * u); ctx.lineTo(bx, yt - 11 * u); ctx.lineTo(bx + 9 * u, yt - 2 * u); ctx.stroke(); ctx.restore(); }
    ctx.restore();
  },
  // La réponse : un grand panneau, la question en bulle à droite, puis les lignes de la réponse qui s'écrivent
  liste(ctx, s, e) {
    const { W, H, u, t, vertical } = s, items = (e.items ?? []).map(texteDe).filter(Boolean).slice(0, 5), z = 1.06 - 0.06 * eo(prog(t, 0, 1.2));
    const w = W * (vertical ? 0.9 : 0.66), h = H * (vertical ? 0.4 : 0.62), x0 = -w / 2, y0 = -h / 2;
    ctx.save(); ctx.translate(W / 2, H * 0.5 + Math.sin(t * 0.8) * 6 * u); ctx.scale(z, z);
    vitre(ctx, x0, y0, w, h, u, { r: 24, lueur: 0.7 });
    etoile(ctx, x0 + 40 * u, y0 + 42 * u, 13 * u, t * 0.7, 1, u);
    if (e.texte) { ctx.font = `600 ${22 * u}px ${F}`; const bw = Math.min(w * 0.6, ctx.measureText(e.texte).width + 40 * u), bx = x0 + w - bw - 28 * u; ctx.save(); ctx.globalAlpha *= eo(prog(t, 0.15, 0.5)); rond(ctx, bx, y0 + 24 * u, bw, 40 * u, 20 * u); ctx.fillStyle = rgba(VIO, 0.85); ctx.fill(); ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.textAlign = "center"; ctx.fillText(e.texte, bx + bw / 2, y0 + 44 * u, bw - 20 * u); ctx.restore(); }
    let tp = (vertical ? 40 : 32) * u; const xl = x0 + 40 * u, zone = w - 80 * u; let y = y0 + 110 * u; const pas = Math.min(tp * 2.1, (h - 140 * u) / Math.max(1, items.length));
    items.forEach((it, i) => {
      const ti = t - 0.5 - i * 0.42, n = Math.floor(Math.max(0, ti) / 0.022); if (ti < 0) return;
      const ligne = `${i + 1}. ${it}`; let tl = tp; ctx.font = `500 ${tl}px ${F}`; const wl = ctx.measureText(ligne).width; if (wl > zone) { tl *= zone / wl; ctx.font = `500 ${tl}px ${F}`; }
      ctx.fillStyle = "rgba(236,232,255,.92)"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(ligne.slice(0, n), xl, y);
      if (n < ligne.length) { const cx = xl + ctx.measureText(ligne.slice(0, n)).width + 3 * u; ctx.fillStyle = rgba(ROSE, 1); ctx.fillRect(cx, y - tl * 0.5, 3 * u, tl); }
      y += pas;
    });
    ctx.restore();
  },
  cartes(ctx, s, e) { LUEUR.liste(ctx, s, { ...e, items: (e.items ?? []).map((x) => (typeof x === "string" ? x : [x?.titre, x?.texte].filter(Boolean).join(" : "))) }); },
  choix(ctx, s, e) { LUEUR.liste(ctx, s, e); },
  // Les chiffres : trois cartes en perspective (un total qui monte, un anneau qui se remplit, des barres qui poussent) ; la légende se décode en bas
  pilules(ctx, s, e) {
    const { W, H, u, t, vertical } = s, items = (e.items ?? []).slice(0, 3).map(texteDe).filter(Boolean).map(partage);
    const pos = vertical ? [[0.3, 0.28, 0.95], [0.7, 0.44, 1.1], [0.34, 0.6, 0.85]] : [[0.2, 0.42, 0.9], [0.52, 0.34, 1.1], [0.82, 0.48, 0.85]];
    items.forEach((it, i) => {
      const [fx, fy, z0] = pos[i], ti = t - 0.15 - i * 0.3, p = eo(prog(ti, 0, 0.7)); if (p <= 0) return;
      const z = z0 * (0.85 + 0.15 * p), cw = W * (vertical ? 0.5 : 0.26) * z, ch = cw * 0.8, cx = W * fx + Math.sin(t * 0.6 + i) * 8 * u, cy = H * fy + (1 - p) * 40 * u - t * 6 * u;
      ctx.save(); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 10 * u + (z0 < 0.9 ? 1.5 * u : 0));
      vitre(ctx, cx - cw / 2, cy - ch / 2, cw, ch, u * z, { r: 16, lueur: 0.75 });
      ctx.fillStyle = "rgba(220,214,255,.8)"; ctx.font = `600 ${20 * u * z}px ${F}`; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(it.nom || ["Total", "Part", "Suivi"][i], cx - cw / 2 + 20 * u * z, cy - ch / 2 + 18 * u * z, cw - 40 * u * z);
      const num = Number(String(it.val).replace(/[^\d.,]/g, "").replace(",", ".")), q = eo(prog(ti, 0.3, 1.5));
      if (i === 1) {
        // L'anneau : il se remplit jusqu'au pourcentage (ou aux trois quarts)
        const pc = /%/.test(it.val) && num ? Math.min(100, num) / 100 : 0.75, R = ch * 0.26, ax = cx, ay = cy + ch * 0.1;
        ctx.lineWidth = R * 0.32; ctx.strokeStyle = "rgba(255,255,255,.1)"; ctx.beginPath(); ctx.arc(ax, ay, R, 0, Math.PI * 2); ctx.stroke();
        const ga = ctx.createLinearGradient(ax - R, ay - R, ax + R, ay + R); ga.addColorStop(0, rgba(BLEU, 1)); ga.addColorStop(0.5, rgba(VIO, 1)); ga.addColorStop(1, rgba(ROSE, 1));
        ctx.strokeStyle = ga; ctx.lineCap = "round"; ctx.shadowColor = rgba(VIO, 0.9); ctx.shadowBlur = 18 * u; ctx.beginPath(); ctx.arc(ax, ay, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pc * q); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff"; ctx.font = `700 ${R * 0.62}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(`${Math.round(pc * 100 * q)}%`, ax, ay);
      } else if (i === 2) {
        // Les barres : elles poussent l'une après l'autre, la dernière la plus haute
        const n = 5, bw = cw * 0.11, gx = cw * 0.06, base = cy + ch / 2 - 22 * u * z, hm = ch * 0.5;
        for (let k = 0; k < n; k++) { const hh = hm * [0.35, 0.5, 0.45, 0.72, 1][k] * eo(prog(ti, 0.35 + k * 0.1, 0.9 + k * 0.1)), bx = cx - (n * bw + (n - 1) * gx) / 2 + k * (bw + gx); const gb = ctx.createLinearGradient(0, base - hh, 0, base); gb.addColorStop(0, rgba(ROSE, 1)); gb.addColorStop(1, rgba(VIO, 0.85)); ctx.fillStyle = gb; ctx.shadowColor = rgba(VIO, 0.7); ctx.shadowBlur = 12 * u; rond(ctx, bx, base - hh, bw, hh, 4 * u); ctx.fill(); }
        ctx.shadowBlur = 0; if (it.val && it.nom) { ctx.fillStyle = "#fff"; ctx.font = `700 ${26 * u * z}px ${F}`; ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText(it.val, cx + cw / 2 - 20 * u * z, cy - ch / 2 + 16 * u * z); }
      } else {
        // Le total : le nombre monte
        const compte = Number.isFinite(num) && num > 0 && /\d/.test(it.val), aff = compte ? String(it.val).replace(/[\d][\d\s.,]*/, (m) => { const nd = (m.match(/[.,](\d+)/)?.[1] ?? "").length; return (num * q).toLocaleString("fr-FR", { minimumFractionDigits: nd, maximumFractionDigits: nd }); }) : it.val;
        let tn = 64 * u * z; ctx.font = `700 ${tn}px ${F}`; const wn = ctx.measureText(aff).width; if (wn > cw - 40 * u * z) { tn *= (cw - 40 * u * z) / wn; ctx.font = `700 ${tn}px ${F}`; }
        ctx.fillStyle = "#fff"; ctx.shadowColor = rgba(VIO, 0.8); ctx.shadowBlur = 20 * u; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(aff, cx - cw / 2 + 20 * u * z, cy + ch * 0.12); ctx.shadowBlur = 0;
        const pts = [0.7, 0.55, 0.62, 0.4, 0.45, 0.2], lx = cx - cw / 2 + 20 * u * z, lw = cw - 40 * u * z, ly = cy + ch * 0.36; ctx.strokeStyle = rgba(ROSE, 0.9); ctx.lineWidth = 3 * u * z; ctx.beginPath(); pts.forEach((v, k) => { const xx = lx + (lw * k) / (pts.length - 1) * Math.min(1, q * 1.2), yy = ly - (1 - v) * ch * 0.12; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }); ctx.stroke();
      }
      ctx.restore();
    });
    if (e.texte) decode(ctx, e.texte, W / 2, H * (vertical ? 0.82 : 0.86), { taille: (vertical ? 64 : 52) * u, t: t - 0.9, u, largeurMax: W * 0.86 });
  },
  compteur(ctx, s, e) { LUEUR.pilules(ctx, s, { texte: e.legende || e.texte, items: [`${e.legende || "Total"} ${e.valeur ?? ""}${e.suffixe ? " " + e.suffixe : ""}`, "Progression 82%", "Croissance"] }); },
  // Le ruban de lumière : une bande violette et rose qui tourne en balayant l'écran, puis les mots se décodent
  impact(ctx, s, e) {
    const { W, H, u, t, vertical } = s, q = prog(t, 0, 1.25);
    if (q < 1) {
      const R = Math.max(W, H) * (0.32 + 0.5 * eio(q)), cx = W * (0.5 + 0.25 * Math.cos(q * 3)), cy = H * (0.52 + 0.1 * Math.sin(q * 4)), ep = R * 0.55 * Math.sin(q * Math.PI), rot = q * Math.PI * 2.2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(1, 0.62);
      for (let k = 0; k < 26; k++) {
        const r = R - (k / 26) * ep, a0 = -0.4 + Math.sin(q * 5 + k * 0.1) * 0.2, a1 = a0 + Math.PI * (1.25 + 0.3 * Math.sin(k)), c = mix(mix(BLEU, VIO, k / 26), ROSE, Math.max(0, (k - 13) / 13));
        ctx.strokeStyle = rgba(k % 5 === 2 ? mix(c, [255, 255, 255], 0.55) : c, 0.75 * Math.sin(q * Math.PI)); ctx.lineWidth = ep / 26 + 1.5 * u; ctx.shadowColor = rgba(VIO, 0.6); ctx.shadowBlur = 20 * u;
        ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); ctx.stroke();
      }
      ctx.restore();
    }
    decode(ctx, e.texte ?? "", W / 2, H * (vertical ? 0.62 : 0.66), { taille: (vertical ? 78 : 66) * u, t: t - 0.95, u, largeurMax: W * 0.86, poids: 700 });
  },
  aplat(ctx, s, e) { LUEUR.impact(ctx, s, e); },
  // La signature : l'étoile arrive en tournant, le nom s'écrit à côté lettre par lettre, une lumière monte du bas
  logo(ctx, s, e) {
    if (LOGO?.width) return SCENES.logo(ctx, s, e);
    const { W, H, u, t, nom, vertical } = s, p = ressort(prog(t, 0.1, 0.9)), nm = String(nom || "");
    let tn = (vertical ? 86 : 96) * u; ctx.font = `600 ${tn}px ${F}`; let wn = ctx.measureText(nm).width; if (wn > W * 0.6) { tn *= (W * 0.6) / wn; ctx.font = `600 ${tn}px ${F}`; wn = ctx.measureText(nm).width; }
    const R = tn * 0.62, gap = tn * 0.35, tot = R * 2 + gap + wn, x0 = W / 2 - tot / 2, cy = H * 0.5, glisse = eio(prog(t, 0.6, 1.1));
    const ex = W / 2 + (x0 + R - W / 2) * glisse;
    const sol = ctx.createRadialGradient(W / 2, H * 1.05, 0, W / 2, H * 1.05, H * 0.75 * (0.4 + 0.6 * eo(prog(t, 0.3, 1.6)))); sol.addColorStop(0, rgba(VIO, 0.55)); sol.addColorStop(0.5, rgba(mix(VIO, BLEU, 0.4), 0.18)); sol.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = sol; ctx.fillRect(0, 0, W, H);
    etoile(ctx, ex, cy, R * p, (1 - p) * Math.PI * 1.5 + t * 0.15, Math.min(1, p * 1.5), u);
    const n = Math.floor(Math.max(0, t - 1.05) / 0.07), xs = x0 + R * 2 + gap;
    ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = "#F6F4FF"; ctx.shadowColor = rgba(VIO, 0.7); ctx.shadowBlur = 22 * u;
    serre(ctx, `${0.06 * (1 - eo(prog(t, 1.05, 2)))}em`); ctx.fillText(nm.slice(0, n), xs, cy + tn * 0.04); serre(ctx, "-0.01em"); ctx.restore();
    if (e.texte) decode(ctx, e.texte, W / 2, cy + tn * 1.25, { taille: tn * 0.34, t: t - 1.2 - nm.length * 0.07, u, poids: 500, couleur: "rgba(226,220,255,.85)", largeurMax: W * 0.8 });
  },
};

// ── Allure « prisme » : une pub d'assistant tout en douceur, sur un gris perle. Des cartes blanches au bord irisé (un arc-en-ciel
// qui tourne), des phrases qui arrivent mot par mot en sortant du flou, un mot surligné comme une sélection, des vignettes
// qui flottent autour d'une phrase avec une brume irisée au bas de l'écran, un téléphone qui écoute, des mots seuls qui se
// succèdent. Signature : une perle irisée. Aucune marque d'autrui : les couleurs sont un spectre générique.
const SPECTRE = [[255, 106, 136], [255, 178, 74], [84, 205, 150], [70, 156, 255], [160, 108, 255]];
const GRIS = "#53555E";
function spectre(ctx, x0, y0, x1, y1, decal = 0, a = 1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1); const n = SPECTRE.length;
  for (let k = 0; k <= n; k++) { const c = SPECTRE[(((k + Math.floor(decal * n)) % n) + n) % n]; g.addColorStop(k / n, rgba(c, a)); }
  return g;
}
// La brume irisée qui monte du bas (scènes « vignettes » et « téléphone »)
function brume(ctx, W, H, t, a = 1) {
  if (a <= 0.01) return;
  SPECTRE.forEach((c, k) => { const cx = W * (0.1 + k * 0.2 + Math.sin(t * 0.5 + k) * 0.05), cy = H * (1.02 - (k % 2) * 0.04), R = W * 0.42, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, rgba(c, 0.42 * a)); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); });
}
// La perle irisée, signature de l'allure
function perle(ctx, cx, cy, R, t, a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.05, cx, cy, R); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, rgba(SPECTRE[(Math.floor(t * 2) + 4) % 5], 0.9)); g.addColorStop(1, rgba(SPECTRE[(Math.floor(t * 2) + 2) % 5], 0.95));
  ctx.shadowColor = rgba(SPECTRE[3], 0.5); ctx.shadowBlur = R * 1.2; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = spectre(ctx, cx - R, cy - R, cx + R, cy + R, t * 0.6, 0.9); ctx.lineWidth = R * 0.18; ctx.beginPath(); ctx.arc(cx, cy, R * 0.92, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
// Une carte blanche au bord irisé, légèrement penchée comme posée sur une table
function carteIrisee(ctx, x, y, w, h, u, t, { r = 34, bord = 1 } = {}) {
  ctx.save();
  ctx.shadowColor = "rgba(40,40,60,.14)"; ctx.shadowBlur = 50 * u; ctx.shadowOffsetY = 18 * u; rond(ctx, x, y, w, h, r * u); ctx.fillStyle = "rgba(255,255,255,.96)"; ctx.fill(); ctx.shadowOffsetY = 0;
  if (bord > 0) { ctx.shadowColor = rgba(SPECTRE[(Math.floor(t * 1.5)) % 5], 0.55 * bord); ctx.shadowBlur = 30 * u; ctx.strokeStyle = spectre(ctx, x, y + h, x + w, y, t * 0.35, bord); ctx.lineWidth = 7 * u; rond(ctx, x, y, w, h, r * u); ctx.stroke(); }
  ctx.restore();
}
// Une phrase qui arrive mot par mot : chaque mot sort du flou en glissant depuis la droite ; un mot "accent" prend le spectre
function motParMot(ctx, txt, accent, cx, cy, { taille, t, u, poids = 400, pas = 0.16, largeurMax, couleur = GRIS }, coupee) {
  const mots = String(txt ?? "").split(/\s+/).filter(Boolean); if (!mots.length) return;
  // Phrase trop longue pour une ligne : on la coupe en deux plutôt que de la rapetisser
  if (largeurMax && mots.length >= 4 && !arguments[6]) { ctx.font = `${poids} ${taille}px ${F}`; if (ctx.measureText(mots.join(" ")).width > largeurMax * 1.08) {
    let best = 1, ecart = Infinity; for (let k = 1; k < mots.length; k++) { const d = Math.abs(ctx.measureText(mots.slice(0, k).join(" ")).width - ctx.measureText(mots.slice(k).join(" ")).width); if (d < ecart) { ecart = d; best = k; } }
    const o = { taille, t, u, poids, pas, largeurMax, couleur };
    motParMot(ctx, mots.slice(0, best).join(" "), accent, cx, cy - taille * 0.62, o, true);
    motParMot(ctx, mots.slice(best).join(" "), accent, cx, cy + taille * 0.62, { ...o, t: t - best * pas }, true); return;
  } }
  let tp = taille; ctx.font = `${poids} ${tp}px ${F}`; const esp = () => ctx.measureText(" ").width;
  let tot = mots.reduce((a, m) => a + ctx.measureText(m).width, 0) + esp() * (mots.length - 1); if (largeurMax && tot > largeurMax) { tp *= largeurMax / tot; ctx.font = `${poids} ${tp}px ${F}`; tot = largeurMax; }
  // La caméra suit la phrase : elle glisse vers la gauche à mesure que les mots arrivent
  const arr = mots.length ? eio(prog(t, 0, mots.length * pas + 0.3)) : 1, x0 = cx - tot / 2 + (1 - arr) * tot * 0.25; let x = x0;
  const ac = String(accent ?? "").toLowerCase().replace(/[^\p{L}\d]/gu, "");
  ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "middle";
  mots.forEach((m, i) => {
    const w = ctx.measureText(m).width, p = eo(prog(t, i * pas, i * pas + 0.45)); if (p <= 0) { x += w + esp(); return; }
    ctx.save(); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 12 * u); const dx = (1 - p) * 60 * u;
    if (ac && m.toLowerCase().replace(/[^\p{L}\d]/gu, "") === ac) ctx.fillStyle = spectre(ctx, x + dx, cy, x + dx + w, cy, 0.6); else ctx.fillStyle = couleur;
    ctx.fillText(m, x + dx, cy); ctx.restore(); x += w + esp();
  });
  ctx.restore();
}
const PRISME = {
  // L'accueil de l'assistant : son nom et une sous-ligne, puis une carte irisée penchée qui salue et attend une question
  pastille(ctx, s, e) {
    const { W, H, u, t, nom, vertical } = s, p = eo(prog(t, 0, 0.5)), bascule = 1 - eio(prog(t, 0.2, 1.3));
    ctx.save(); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 14 * u); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#1F2026"; ctx.font = `600 ${(vertical ? 74 : 66) * u}px ${F}`; const tn = ctx.measureText(nom).width; ctx.fillText(nom, W / 2 - 18 * u, H * 0.3);
    perle(ctx, W / 2 + tn / 2 + 8 * u, H * 0.3 - 22 * u, 13 * u, t, p);
    ctx.fillStyle = GRIS; ctx.font = `400 ${(vertical ? 36 : 32) * u}px ${F}`; ctx.fillText(e.sous || e.legende || "Votre assistant personnel", W / 2, H * 0.3 + 62 * u); ctx.restore();
    const w = W * (vertical ? 0.78 : 0.5), h = w * 0.62, cy = H * 0.58;
    ctx.save(); ctx.translate(W / 2, cy); ctx.transform(1, 0, -0.18 * bascule, 1 - 0.25 * bascule, 0, 0); ctx.rotate(-0.05 * bascule); ctx.globalAlpha *= eo(prog(t, 0.25, 0.9));
    flou(ctx, 0); carteIrisee(ctx, -w / 2, -h / 2, w, h, u, t);
    perle(ctx, -w / 2 + 54 * u, -h / 2 + 62 * u, 9 * u, t);
    ctx.fillStyle = GRIS; ctx.font = `500 ${30 * u}px ${F}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("Bonjour !", -w / 2 + 76 * u, -h / 2 + 62 * u);
    const q = String(e.texte ?? ""), n = Math.floor(Math.max(0, t - 0.5) / 0.03); let tq = 44 * u; ctx.font = `600 ${tq}px ${F}`; const wq = ctx.measureText(q).width; if (wq > w - 100 * u) { tq *= (w - 100 * u) / wq; ctx.font = `600 ${tq}px ${F}`; }
    ctx.fillStyle = "#1F2026"; ctx.fillText(q.slice(0, n), -w / 2 + 50 * u, -h / 2 + 130 * u);
    rond(ctx, -w / 2 + 34 * u, h / 2 - 120 * u, w - 68 * u, 88 * u, 44 * u); ctx.fillStyle = "#F2F2F5"; ctx.fill();
    ctx.fillStyle = "rgba(83,85,94,.75)"; ctx.font = `400 ${28 * u}px ${F}`; ctx.fillText(`Demander à ${nom}`, -w / 2 + 70 * u, h / 2 - 76 * u);
    ctx.restore();
  },
  mots(ctx, s, e) {
    const { W, H, u, t, nom, vertical } = s;
    if (!e.suite) return motParMot(ctx, e.texte, e.accent, W / 2, H * 0.5, { taille: (vertical ? 70 : 62) * u, t: t - 0.3, u, largeurMax: W * 0.86 });
    // « Voici ✦ Nom » se pose, tient, puis glisse vers la gauche pendant que la suite s'écrit mot par mot à droite
    let tp = (vertical ? 66 : 64) * u; ctx.font = `400 ${tp}px ${F}`;
    const sp = ctx.measureText(" ").width, mots = String(e.suite).split(/\s+/).filter(Boolean);
    let wa = ctx.measureText(e.texte || "").width, wn = ctx.measureText(nom).width, ws = mots.reduce((a, m) => a + sp + ctx.measureText(m).width, 0);
    const R = tp * 0.26, gap = tp * 0.32, w1 = wa + gap * 2 + R * 2 + wn, k0 = Math.min(1, (W * 0.88) / (w1 + ws));
    const gl = eio(prog(t, 0.8, 1.45)), kf = Math.min(1.25, (W * 0.92) / (w1 + ws)), x0 = W / 2 - w1 / 2, x1 = W / 2 - ((w1 + ws) * kf) / 2, k = 1 + (kf - 1) * gl;
    ctx.save(); ctx.translate(x0 + (x1 - x0) * gl, H / 2); ctx.scale(k, k); ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const vient = (i) => eo(prog(t, 0.05 + i * 0.1, 0.45 + i * 0.1));
    [[e.texte || "", 0], ["", 1], [nom, 2]].forEach(([m, i]) => {
      const a = vient(i); if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; flou(ctx, (1 - a) * 12 * u);
      if (i === 1) perle(ctx, wa + gap + R, 0, R * a, t, 1); else { ctx.fillStyle = i === 2 ? "#1F2026" : GRIS; ctx.fillText(m, i === 0 ? 0 : wa + gap * 2 + R * 2, 0); }
      ctx.restore();
    });
    let x = w1;
    mots.forEach((m, i) => { const a = eo(prog(t, 0.88 + i * 0.22, 1.25 + i * 0.22)), w = ctx.measureText(m).width; x += sp; if (a > 0) { ctx.save(); ctx.globalAlpha *= a; flou(ctx, (1 - a) * 12 * u); ctx.fillStyle = GRIS; ctx.fillText(m, x + (1 - a) * 40 * u, 0); ctx.restore(); } x += w; });
    ctx.restore();
  },
  // La demande : une barre « Demander à … », deux panneaux qui montent dessous ; la caméra file vers le bouton d'envoi qui s'allume
  choix(ctx, s, e) {
    const { W, H, u, t, d, nom, vertical } = s, items = (e.items ?? []).map(texteDe).filter(Boolean).slice(0, 2);
    const pw = W * (vertical ? 0.82 : 0.52), ph = 76 * u, px = W / 2 - pw / 2, py = H * (vertical ? 0.3 : 0.24), bx = px + pw - 44 * u, by = py + ph / 2;
    const pan = eio(prog(t, 0.62, 0.92)), zoom = 1 + Math.pow(prog(t, 0.85, d), 1.6) * 1.4;
    ctx.save(); const fx = W / 2 + (bx - W / 2) * pan, fy = H / 2 + (by - H / 2) * pan; ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-fx, -fy);
    // brume irisée qui déborde à gauche
    SPECTRE.forEach((c, k) => { const cx = px - 30 * u + k * 22 * u, cy = py + ph * (2.6 + (k % 2) * 0.5), R = 260 * u, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, rgba(c, 0.38 * eo(prog(t, 0, 0.5)))); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); });
    items.forEach((m, k) => {
      const a = eo(prog(t, 0.1 + k * 0.18, 0.6 + k * 0.18)); if (a <= 0) return;
      const y = py + ph + 26 * u + k * 112 * u + (1 - a) * 90 * u, w = pw - 40 * u;
      ctx.save(); ctx.globalAlpha *= a; ctx.shadowColor = "rgba(40,40,60,.10)"; ctx.shadowBlur = 30 * u; rond(ctx, px + 20 * u, y, w, 96 * u, 22 * u); ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.fill(); ctx.shadowBlur = 0;
      perle(ctx, px + 48 * u, y + 32 * u, 8 * u, t + k); ctx.fillStyle = "#1F2026"; ctx.font = `600 ${24 * u}px ${F}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(m, px + 66 * u, y + 32 * u);
      ctx.fillStyle = "rgba(83,85,94,.18)"; rond(ctx, px + 44 * u, y + 58 * u, w * 0.7, 9 * u, 4.5 * u); ctx.fill(); rond(ctx, px + 44 * u, y + 74 * u, w * 0.45, 9 * u, 4.5 * u); ctx.fill(); ctx.restore();
    });
    ctx.save(); ctx.shadowColor = "rgba(40,40,60,.16)"; ctx.shadowBlur = 36 * u; ctx.shadowOffsetY = 10 * u; rond(ctx, px, py, pw, ph, ph / 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
    ctx.fillStyle = "rgba(83,85,94,.8)"; ctx.font = `400 ${28 * u}px ${F}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(e.texte || `Demander à ${nom}`, px + 34 * u, by);
    const lu = eo(prog(t, 0.9, 1.3));
    ctx.save(); if (lu > 0) { ctx.shadowColor = `rgba(70,140,255,${0.9 * lu})`; ctx.shadowBlur = 34 * u * lu; } ctx.beginPath(); ctx.arc(bx, by, 22 * u, 0, Math.PI * 2); ctx.fillStyle = lu > 0 ? `rgba(${Math.round(31 + 39 * lu)},${Math.round(32 + 124 * lu)},${Math.round(38 + 217 * lu)},1)` : "#1F2026"; ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(bx - 7 * u, by - 9 * u); ctx.lineTo(bx + 10 * u, by); ctx.lineTo(bx - 7 * u, by + 9 * u); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.restore();
  },
  rature(ctx, s, e) { PRISME.mots(ctx, s, { texte: [e.texte_avant, e.barre, e.texte].filter(Boolean).join(" "), accent: e.texte }); },
  // Un mot sélectionné : il arrive, puis un rectangle de sélection bleuté pointillé l'entoure, comme surligné à la souris
  impact(ctx, s, e) {
    if (e.avant) {
      const { W, H, u, t, vertical } = s, mot = String(e.texte ?? "").replace(/\.$/, ""), avant = String(e.avant);
      let tp = (vertical ? 80 : 72) * u; ctx.font = `400 ${tp}px ${F}`; const sp = ctx.measureText(" ").width;
      let wa = ctx.measureText(avant).width, wm = ctx.measureText(mot).width; const R = tp * 0.22, tot = R * 2 + tp * 0.3 + wa + sp + wm;
      if (tot > W * 0.86) { tp *= (W * 0.86) / tot; ctx.font = `400 ${tp}px ${F}`; wa = ctx.measureText(avant).width; wm = ctx.measureText(mot).width; }
      const x0 = W / 2 - (R * 2 + tp * 0.3 + wa + sp + wm) / 2, cy = H / 2, a1 = eo(prog(t, 0, 0.4)), a2 = eo(prog(t, 0.45, 0.75)), sel = eio(prog(t, 0.75, 1.0));
      perle(ctx, x0 + R, cy, R * a1, t, a1);
      ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.globalAlpha *= a1; flou(ctx, (1 - a1) * 12 * u); ctx.fillStyle = GRIS; ctx.fillText(avant, x0 + R * 2 + tp * 0.3, cy); ctx.restore();
      const xm = x0 + R * 2 + tp * 0.3 + wa + sp;
      if (sel > 0) { ctx.save(); const x = xm - 10 * u, w = (wm + 20 * u) * sel; ctx.fillStyle = "rgba(120,170,255,.28)"; ctx.fillRect(x, cy - tp * 0.62, w, tp * 1.24); ctx.setLineDash([8 * u, 6 * u]); ctx.strokeStyle = "rgba(70,120,255,.85)"; ctx.lineWidth = 2 * u; ctx.strokeRect(x, cy - tp * 0.62, w, tp * 1.24); ctx.restore(); }
      if (a2 > 0) { ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.globalAlpha *= a2; flou(ctx, (1 - a2) * 12 * u); ctx.fillStyle = sel > 0.5 ? "#2B4FD8" : GRIS; ctx.fillText(mot, xm + (1 - a2) * 70 * u, cy); ctx.restore(); }
      return;
    }
    const { W, H, u, t, vertical } = s, txt = String(e.texte ?? "").replace(/\.$/, ""), p = eo(prog(t, 0, 0.5));
    let tp = (vertical ? 96 : 86) * u; ctx.font = `400 ${tp}px ${F}`; let w = ctx.measureText(txt).width; if (w > W * 0.8) { tp *= (W * 0.8) / w; ctx.font = `400 ${tp}px ${F}`; w = ctx.measureText(txt).width; }
    const sel = eio(prog(t, 0.45, 0.95)), cy = H * 0.5;
    perle(ctx, W / 2 - w / 2 - 54 * u, cy, 16 * u * p, t, p);
    if (sel > 0) {
      const hw = (w + 30 * u) * sel, x = W / 2 - w / 2 - 15 * u;
      ctx.save(); ctx.fillStyle = "rgba(120,170,255,.28)"; ctx.shadowColor = "rgba(90,140,255,.45)"; ctx.shadowBlur = 24 * u; ctx.fillRect(x, cy - tp * 0.62, hw, tp * 1.24); ctx.shadowBlur = 0;
      ctx.setLineDash([8 * u, 6 * u]); ctx.strokeStyle = "rgba(70,120,255,.85)"; ctx.lineWidth = 2 * u; ctx.strokeRect(x, cy - tp * 0.62, hw, tp * 1.24); ctx.setLineDash([]); ctx.restore();
    }
    ctx.save(); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 12 * u); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = sel > 0.5 ? "#2B4FD8" : GRIS; ctx.fillText(txt, W / 2 + (1 - p) * 40 * u, cy); ctx.restore();
  },
  aplat(ctx, s, e) { PRISME.impact(ctx, s, e); },
  // Des vignettes qui flottent autour d'une phrase (les images de la vidéo s'il y en a, sinon des tuiles irisées), et la brume au bas de l'écran
  cartes(ctx, s, e) {
    const { W, H, u, t, vertical } = s, imgs = Object.values(IMAGES).filter((x) => x && (x.width || x.videoWidth));
    brume(ctx, W, H, t, eo(prog(t, 0, 0.3)));
    const places = vertical ? [[0.2, 0.2, 0.34], [0.78, 0.17, 0.3], [0.82, 0.72, 0.34], [0.2, 0.78, 0.3], [0.5, 0.06, 0.22]] : [[0.12, 0.25, 0.2], [0.85, 0.2, 0.18], [0.88, 0.78, 0.2], [0.14, 0.8, 0.18], [0.5, 0.1, 0.14]];
    places.forEach(([fx, fy, fw], k) => {
      const p = eo(prog(t, 0.36 + k * 0.38, 0.91 + k * 0.38)); if (p <= 0) return;
      const w = W * fw, h = w * 0.72, x = W * fx - w / 2 + Math.sin(t * 0.6 + k) * 10 * u, y = H * fy - h / 2 + (1 - p) * 60 * u - t * 8 * u;
      ctx.save(); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 10 * u); ctx.shadowColor = "rgba(30,30,50,.18)"; ctx.shadowBlur = 30 * u; rond(ctx, x, y, w, h, 22 * u); ctx.fillStyle = "#fff"; ctx.fill(); ctx.shadowBlur = 0; ctx.clip();
      const im = imgs[k % Math.max(1, imgs.length)];
      if (im) { const iw = im.videoWidth || im.width, ih = im.videoHeight || im.height, k2 = Math.max(w / iw, h / ih); ctx.drawImage(im, x + (w - iw * k2) / 2, y + (h - ih * k2) / 2, iw * k2, ih * k2); }
      else { ctx.fillStyle = spectre(ctx, x, y, x + w, y + h, k * 0.2 + t * 0.1, 0.55); ctx.fillRect(x, y, w, h); perle(ctx, x + w / 2, y + h / 2, h * 0.16, t + k, 0.9); }
      ctx.restore();
    });
    if (!e.swap) return motParMot(ctx, e.texte, e.accent, W / 2, H * 0.5, { taille: (vertical ? 56 : 48) * u, t: t - 0.15, u, largeurMax: W * 0.62 });
    // Deux mots ; le second change (ex. « sites » → « applis ») en glissant vers le haut
    const mots = String(e.texte ?? "").split(/\s+/), der = mots.pop(), deb = mots.join(" "), tp = (vertical ? 58 : 50) * u; ctx.font = `400 ${tp}px ${F}`;
    const sp = ctx.measureText(" ").width, wd = ctx.measureText(deb).width, ch = eio(prog(t, 0.75, 1.0)), w2 = ctx.measureText(der).width * (1 - ch) + ctx.measureText(e.swap).width * ch;
    const x0 = W / 2 - (wd + sp + w2) / 2, cy = H / 2, a = eo(prog(t, 0.15, 0.55));
    ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.globalAlpha *= a; flou(ctx, (1 - a) * 12 * u); ctx.fillStyle = "#1F2026"; ctx.fillText(deb, x0, cy);
    ctx.save(); ctx.globalAlpha *= 1 - ch; ctx.fillStyle = "rgba(83,85,94,.7)"; ctx.fillText(der, x0 + wd + sp, cy - ch * tp * 0.6); ctx.restore();
    if (ch > 0) { ctx.globalAlpha *= ch; ctx.fillStyle = spectre(ctx, x0 + wd, cy, x0 + wd + sp + w2, cy, 0.6); ctx.fillText(e.swap, x0 + wd + sp, cy + (1 - ch) * tp * 0.6); }
    ctx.restore();
  },
  pilules(ctx, s, e) {
    const { W, H, u, t } = s, T = 170 * u, cx = W / 2, cy = H / 2, a = eo(prog(t, 0.1, 0.45)), g = eio(prog(t, 0.55, 0.9)) * (1 - eio(prog(t, 0.95, 1.2)));
    const noms = (e.items ?? []).map((x) => x?.icone).filter((x) => ICONES[x]); while (noms.length < 4) noms.push(["telephone", "maison", "etoile", "musique"][noms.length]);
    const fin = eio(prog(t, 1.0, 1.35)), sc = (0.7 + 0.3 * a + g * 0.08) * (1 - fin * 0.45);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.globalAlpha *= 1 - fin * 0.5; ctx.globalAlpha *= a; flou(ctx, (1 - a) * 12 * u);
    carteIrisee(ctx, -T / 2, -T / 2, T, T, u, t, { r: 40 });
    if (g < 0.5) perle(ctx, 0, 0, T * 0.2 * (1 - g * 2), t, 1 - g * 2);
    if (g > 0) noms.slice(0, 4).forEach((n, k) => icone(ctx, n, (k % 2 ? 1 : -1) * T * 0.2 * g, (k < 2 ? -1 : 1) * T * 0.2 * g, T * 0.24 * g, rgba(SPECTRE[[0, 1, 3, 4][k]], 1), 2.4));
    ctx.restore();
  },
  // Un téléphone tenu, qui écoute : « À l'écoute », une onde qui bouge ; le titre en dégradé au-dessus, des lettres qui flottent
  telephone(ctx, s, e) {
    const { W, H, u, t, d, vertical } = s, p = eio(prog(t, 0.05, 1.0)) * (1 - eio(prog(t, d - 0.85, d - 0.45))), chute = eio(prog(t, d - 0.8, d)), tel = e.texte || "Il vous écoute.";
    brume(ctx, W, H, t, 0.9 * p);
    let tt = (vertical ? 70 : 60) * u; ctx.font = `600 ${tt}px ${F}`; const wt = ctx.measureText(tel).width; if (wt > W * 0.84) { tt *= (W * 0.84) / wt; ctx.font = `600 ${tt}px ${F}`; }
    ctx.save(); ctx.globalAlpha *= p; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = spectre(ctx, W / 2 - wt / 2, 0, W / 2 + wt / 2, 0, 0.6 + t * 0.15); ctx.fillText(tel, W / 2, H * 0.24); ctx.restore();
    const pw = W * (vertical ? 0.46 : 0.26), ph = pw * 1.9, px = W / 2 - pw / 2, py = H * 0.36 + (1 - eio(prog(t, 0.05, 1.0))) * H * 0.35 + chute * H * 0.7;
    ctx.save(); ctx.translate(W / 2, py + ph / 2); ctx.rotate(-0.06 + Math.sin(t * 0.7) * 0.015); ctx.translate(-W / 2, -(py + ph / 2));
    ctx.shadowColor = "rgba(20,20,40,.25)"; ctx.shadowBlur = 50 * u; rond(ctx, px, py, pw, ph, 56 * u); ctx.fillStyle = "#1C1D22"; ctx.fill(); ctx.shadowBlur = 0;
    rond(ctx, px + 10 * u, py + 10 * u, pw - 20 * u, ph - 20 * u, 48 * u); ctx.fillStyle = "#F7F7FA"; ctx.fill();
    ctx.fillStyle = "#3C64E6"; ctx.font = `600 ${30 * u}px ${F}`; ctx.textAlign = "center"; ctx.fillText("À l'écoute", W / 2, py + ph * 0.42);
    for (let k = 0; k < 9; k++) { const hh = (12 + 46 * Math.abs(Math.sin(t * 6 + k * 0.9))) * u, x = W / 2 + (k - 4) * 16 * u; ctx.fillStyle = rgba(mix(SPECTRE[3], SPECTRE[4], k / 8), 0.9); rond(ctx, x - 4 * u, py + ph * 0.55 - hh / 2, 8 * u, hh, 4 * u); ctx.fill(); }
    ctx.restore();
    // Des lettres qui flottent autour, comme des mots qu'on dit
    const lettres = "bonjouréi"; for (let k = 0; k < 8; k++) { const a = Math.min(1, prog(t, 0.4 + k * 0.1, 0.8 + k * 0.1)), an = k * 0.8 + t * 0.4, R = pw * (0.9 + (k % 3) * 0.2); if (a <= 0) continue; ctx.save(); ctx.globalAlpha *= a * 0.85; ctx.fillStyle = GRIS; ctx.font = `400 ${(28 + (k % 3) * 8) * u}px ${F}`; ctx.fillText(lettres[k], W / 2 + Math.cos(an) * R, py + ph * 0.5 + Math.sin(an) * R * 0.9); ctx.restore(); }
  },
  // Des mots seuls qui se succèdent au centre, puis la phrase qui les réunit
  liste(ctx, s, e) {
    const { W, H, u, t, d, vertical } = s, items = (e.items ?? []).map(texteDe).filter(Boolean).slice(0, 4), n = Math.max(1, items.length), tranche = Math.min(1.35, (d - (e.texte ? 0.3 : 0.2)) / n);
    items.forEach((m, i) => {
      const t0 = i * tranche, a = Math.min(eo(prog(t, t0, t0 + 0.4)), 1 - eio(prog(t, t0 + tranche * (i === n - 1 ? 0.73 : 0.63), t0 + tranche * (i === n - 1 ? 0.88 : 0.78)))); if (a <= 0) return;
      ctx.save(); ctx.globalAlpha *= a; flou(ctx, (1 - a) * 10 * u); ctx.fillStyle = GRIS; ctx.font = `400 ${(vertical ? 84 : 74) * u}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(m, W / 2, H * 0.5 + (1 - a) * 14 * u); ctx.restore();
    });
    if (e.texte) motParMot(ctx, e.texte, e.accent, W / 2, H * 0.5, { taille: (vertical ? 62 : 54) * u, t: t - (n * tranche + 0.2), u, largeurMax: W * 0.86 });
  },
  compteur(ctx, s, e) { PRISME.mots(ctx, s, { texte: `${e.valeur ?? ""}${e.suffixe ? " " + e.suffixe : ""} ${e.legende ?? ""}`.trim(), accent: String(e.valeur ?? "") }); },
  // La signature : la perle grossit, le nom s'écrit à côté, la brume s'allume une dernière fois
  logo(ctx, s, e) {
    if (LOGO?.width) return SCENES.logo(ctx, s, e);
    const { W, H, u, t, nom, vertical } = s, p = ressort(prog(t, 0.1, 0.9)), nm = String(nom || "");
    brume(ctx, W, H, t, 0.6 * eo(prog(t, 0.3, 1.4)));
    let tn = (vertical ? 92 : 100) * u; ctx.font = `500 ${tn}px ${F}`; let wn = ctx.measureText(nm).width; if (wn > W * 0.62) { tn *= (W * 0.62) / wn; ctx.font = `500 ${tn}px ${F}`; wn = ctx.measureText(nm).width; }
    const R = tn * 0.34, gap = tn * 0.32, tot = R * 2 + gap + wn, x0 = W / 2 - tot / 2, cy = H * 0.48, gl = eio(prog(t, 0.5, 1.0));
    perle(ctx, W / 2 + (x0 + R - W / 2) * gl, cy, R * p, t, Math.min(1, p * 1.4));
    const n = Math.floor(Math.max(0, t - 0.95) / 0.06);
    ctx.save(); ctx.fillStyle = "#1F2026"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(nm.slice(0, n), x0 + R * 2 + gap, cy + tn * 0.03); ctx.restore();
    if (e.texte) motParMot(ctx, e.texte, null, W / 2, cy + tn * 1.15, { taille: tn * 0.36, t: t - 1.1 - nm.length * 0.06, u, largeurMax: W * 0.8 });
  },
};

const CLAIR = {
  // Une petite phrase noire qui sort du flou mot après mot ; dans la seconde moitié, la caméra plonge dedans
  mots(ctx, s, e) {
    const { W, H, u, t, d, vertical } = s, largeur = W * (vertical ? 0.8 : 0.6), txt = e.texte || "";
    const taille = remplit(ctx, txt, (vertical ? 88 : 72) * u, largeur, 3, 500); ctx.font = `500 ${taille}px ${F}`;
    const z = 1 + Math.pow(prog(t, d * 0.58, d), 2.2) * 2.4;
    ctx.save(); ctx.translate(W / 2 - (z - 1) * W * 0.16, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    const lignes = coupe(ctx, txt, largeur), acc = String(e.accent || "").toLowerCase().split(/\s+/).filter(Boolean), esp = taille * 0.27; let i = 0;
    lignes.forEach((l, k) => {
      const mots = l.split(" "), w = mots.reduce((a, m) => a + ctx.measureText(m).width, 0) + esp * (mots.length - 1); let cx = W / 2 - w / 2; const cy = H / 2 + (k - (lignes.length - 1) / 2) * taille * 1.2;
      for (const m of mots) { const estAcc = acc.includes(m.toLowerCase().replace(/[.,!?;:«»"]/g, "")); ctx.font = `500 ${taille}px ${F}`; const mw = ctx.measureText(m).width; ecrit(ctx, m, cx, cy, { taille, t: t - 0.1 - i * 0.11, aligne: "left", u, couleur: estAcc ? rgba(C, 1) : ENCRE }); cx += mw + esp; i++; }
    });
    ctx.restore();
  },
  // Un grand mot gras qui arrive de côté avec un filé, puis se pose
  impact(ctx, s, e) {
    const { W, H, u, t } = s, txt = e.texte || s.nom, p = eo(prog(t, 0, 0.5));
    serre(ctx, "-0.04em"); const taille = remplit(ctx, txt, 250 * u, W * 0.9, 2, 700); ctx.font = `700 ${taille}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const ls = coupe(ctx, txt, W * 0.9), dessine = (dx, a) => { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = ENCRE; ls.forEach((l, i) => ctx.fillText(l, W / 2 + dx, H / 2 + (i - (ls.length - 1) / 2) * taille * 1.04)); ctx.restore(); };
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1.18 - 0.18 * p, 1.18 - 0.18 * p); ctx.translate(-W / 2, -H / 2);
    if (p < 0.98) for (let k = 1; k <= 6; k++) dessine((1 - p) * k * 46 * u, 0.1 * p);
    dessine((1 - p) * 12 * u, Math.min(1, p * 1.4)); ctx.restore(); serre(ctx, "-0.01em");
  },
  // Passage au noir : une phrase blanche en italique, floue, qui devient nette puis se dissout (ce qui ne va pas)
  rature(ctx, s, e) {
    const { W, H, u, t, d, vertical } = s, txt = [e.texte_avant, e.barre].filter(Boolean).join(" ") || e.texte || "", p = eo(prog(t, 0.05, 0.9)), q = prog(t, d - 0.45, d);
    ctx.save(); ctx.globalAlpha = Math.min(1, prog(t, 0, 0.18)) * (1 - prog(t, d - 0.18, d)); ctx.fillStyle = "#050506"; ctx.fillRect(-W, -H, W * 3, H * 3);
    ctx.fillStyle = "rgba(255,255,255,.035)"; for (let y = 0; y < H; y += 7 * u) ctx.fillRect(0, y, W, 2 * u); ctx.restore();
    const taille = remplit(ctx, txt, (vertical ? 96 : 84) * u, W * 0.82, 3, 500); ctx.font = `italic 500 ${taille}px ${F}`;
    ctx.save(); ctx.globalAlpha *= p * (1 - q); flou(ctx, ((1 - p) * 26 + q * 26) * u); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const ls = coupe(ctx, txt, W * 0.82); ls.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 + (i - (ls.length - 1) / 2) * taille * 1.2)); ctx.restore();
  },
  aplat(ctx, s, e) { CLAIR.impact(ctx, s, { ...e, texte: e.texte || s.nom }); },
  // L'image plein écran, légèrement voilée de blanc, avec un grand mot noir posé dessus
  image(ctx, s, e) {
    const { W, H, u, t, d } = s, img = IMAGES[e.image], iw0 = img?.videoWidth || img?.width, ih0 = img?.videoHeight || img?.height;
    if (!iw0) return CLAIR.impact(ctx, s, e);
    const k = Math.max(W / iw0, H / ih0) * (1.2 - 0.12 * prog(t, 0, d));
    ctx.save(); ctx.drawImage(img, (W - iw0 * k) / 2, (H - ih0 * k) / 2, iw0 * k, ih0 * k); ctx.fillStyle = "rgba(245,245,247,.38)"; ctx.fillRect(0, 0, W, H); ctx.restore();
    CLAIR.impact(ctx, s, { ...e, texte: e.accent || e.texte });
  },
  // Un téléphone qui tourne doucement, des tuiles d'applis qui en sortent et flottent autour, puis y retournent
  telephone(ctx, s, e) {
    const { W, H, u, t, d, vertical } = s, items = (e.items ?? []).slice(0, 4).map((x) => ({ texte: texteDe(x), icone: typeof x === "object" ? x?.icone : null })), p = ressort(prog(t, 0, 0.8));
    const ph = (vertical ? 760 : 560) * u, pw = ph * 0.49, ang = -0.42 + 0.7 * eio(prog(t, 0, d)), cs = Math.cos(ang), cx = W / 2, cy = H * 0.5;
    const sortie = eo(prog(t, 0.5, 1.2)) * (1 - eio(prog(t, d - 0.9, d - 0.3)));
    const pos = [[-1, -0.62], [1, -0.4], [-0.92, 0.38], [0.95, 0.52]], dessus = [];
    items.forEach((x, i) => { const [dx, dy] = pos[i], tx = cx + dx * pw * (vertical ? 0.8 : 1.5) * sortie, ty = cy + dy * ph * 0.5 * sortie + Math.sin(t * 1.6 + i * 2) * 14 * u, f = () => { ctx.save(); ctx.globalAlpha *= Math.min(1, sortie * 2.2); tuile(ctx, tx, ty, pw * (vertical ? 0.4 : 0.5) * (0.3 + 0.7 * sortie), i + 1, x.icone, u, dx * 0.22 * (1 - sortie * 0.4) + Math.sin(t * 1.2 + i) * 0.05); ctx.restore(); }; (dx * Math.sin(ang) > 0 ? dessus : { push: (g) => g() }).push(f); });
    ctx.save(); ctx.translate(cx, cy + (1 - p) * H * 0.3); ctx.transform(cs, Math.sin(ang) * 0.12, 0, 1, 0, 0); ctx.scale(0.7 + 0.3 * p, 0.7 + 0.3 * p); ctx.globalAlpha *= Math.min(1, prog(t, 0, 0.25) * 1.3);
    ctx.save(); ctx.shadowColor = "rgba(20,20,40,.28)"; ctx.shadowBlur = 80 * u; ctx.shadowOffsetY = 40 * u; rond(ctx, -pw / 2, -ph / 2, pw, ph, pw * 0.17); ctx.fillStyle = "#0B0B0E"; ctx.fill(); ctx.restore();
    const m = pw * 0.035, ew = pw - 2 * m, eh = ph - 2 * m; ctx.save(); rond(ctx, -pw / 2 + m, -ph / 2 + m, ew, eh, pw * 0.14); ctx.clip();
    const g = ctx.createLinearGradient(0, -ph / 2, 0, ph / 2); g.addColorStop(0, "#1B2340"); g.addColorStop(1, "#0C1022"); ctx.fillStyle = g; ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    const col = 4, c0 = ew / (col * 1.38 + 0.38), pas = c0 * 1.38; for (let r = 0; r < 6; r++) for (let c = 0; c < col; c++) { const h = (teinteDe(C) + ((r * 4 + c) * 47) % 360) % 360, a = eo(prog(t, 0.2 + (r * 4 + c) * 0.015, 0.6 + (r * 4 + c) * 0.015)); ctx.globalAlpha = a; ctx.fillStyle = (r * 4 + c) % 5 === 3 ? "#F2F2F4" : `hsl(${h},70%,${52 + ((r + c) % 3) * 6}%)`; rond(ctx, -ew / 2 + c0 * 0.38 + c * pas, -eh / 2 + c0 * 1.3 + r * pas, c0, c0, c0 * 0.26); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.fillStyle = "rgba(255,255,255,.14)"; rond(ctx, -ew / 2 + c0 * 0.25, eh / 2 - c0 * 1.75, ew - c0 * 0.5, c0 * 1.45, c0 * 0.5); ctx.fill();
    ctx.fillStyle = "#0B0B0E"; rond(ctx, -pw * 0.16, -ph / 2 + m + pw * 0.035, pw * 0.32, pw * 0.085, pw * 0.045); ctx.fill(); ctx.restore(); ctx.restore();
    dessus.forEach((f) => f());
    if (e.texte) { let tg = (vertical ? 60 : 52) * u; ctx.font = `500 ${tg}px ${F}`; const wt = ctx.measureText(e.texte).width; if (wt > W * 0.84) tg *= (W * 0.84) / wt; ecrit(ctx, e.texte, W / 2, cy + ph / 2 + tg * 1.3, { taille: tg, t: t - 1, u, couleur: ENCRE }); }
  },

  // Un défilé de grandes tuiles brillantes, une par chose citée : chacune sort du flou, grossit doucement puis file de
  // côté pendant que la suivante arrive ; le fil de couleur serpente derrière elles et les relie
  pilules(ctx, s, e) {
    const { W, H, u, t, d, vertical } = s, items = (e.items ?? []).slice(0, 3).map((x) => ({ texte: texteDe(x), icone: typeof x === "object" ? x?.icone : null })).filter((x) => x.texte), n = Math.max(1, items.length), seg = d / n;
    const taille = (vertical ? 400 : 330) * u;
    items.forEach((x, i) => {
      const tl = t - i * seg; if (tl < -0.05 || tl > seg + 0.3) return;
      const p = eo(prog(tl, 0, 0.5)), q = i < n - 1 ? Math.pow(prog(tl, seg - 0.05, seg + 0.3), 2) : 0, sens = i % 2 ? -1 : 1, z = (0.45 + 0.55 * p) * (1 + (tl / seg) * 0.16);
      const cx = W / 2 + sens * (1 - p) * W * 0.25 - sens * q * W * 0.95, cy = H * 0.46 + sens * (1 - p) * H * 0.06 - q * H * 0.1;
      // Le fil : une courbe qui se trace derrière la tuile et ressort de l'autre côté
      const tr = eio(prog(tl, 0.15, seg * 0.95)); if (tr > 0.01) {
        const y0 = cy - sens * taille * 1.25, P = [[-W * 0.05, y0], [W * 0.3, y0 + sens * taille * 0.1], [W * 0.42, cy - sens * taille * 0.3], [cx, cy], [W * 0.62, cy - sens * taille * 0.5], [W * 0.8, cy - sens * taille * 1.3], [W * 1.05, cy - sens * taille * 1.1]];
        ctx.save(); ctx.globalAlpha *= (1 - q) * Math.min(1, p * 1.5); ctx.strokeStyle = rgba(C, 1); ctx.lineWidth = Math.max(3, 8 * u); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
        ctx.bezierCurveTo(P[1][0], P[1][1], P[2][0], P[2][1], P[3][0], P[3][1]); ctx.bezierCurveTo(P[4][0], P[4][1], P[5][0], P[5][1], P[6][0], P[6][1]);
        const L = W * 2.6; ctx.setLineDash([L * tr, L * 2]); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      }
      ctx.save(); ctx.globalAlpha *= Math.min(1, p * 1.6) * (1 - q); flou(ctx, ((1 - p) * 22 + q * 26) * u);
      tuile(ctx, cx, cy, taille * z, i, x.icone, u, (-0.06 + 0.05 * (tl / seg)) * sens);
      ctx.restore();
      let tg = (vertical ? 58 : 50) * u; ctx.font = `500 ${tg}px ${F}`; const wt = ctx.measureText(x.texte).width; if (wt > W * 0.8) tg *= (W * 0.8) / wt;
      ctx.save(); ctx.globalAlpha *= 1 - q; ecrit(ctx, x.texte, W / 2, cy + taille * 0.78, { taille: tg, t: tl - 0.35, u, couleur: ENCRE }); ctx.restore();
    });
  },
  choix(ctx, s, e) { CLAIR.pilules(ctx, s, e); },
  // Des cartes pastel qui tombent l'une sous l'autre ; puis la pile recule un peu et son titre s'écrit au-dessus
  liste(ctx, s, e) {
    const { W, H, u, t, vertical } = s, items = (e.items ?? []).slice(0, 4).map(texteDe).filter(Boolean), n = Math.max(1, items.length);
    const tp0 = (vertical ? 50 : 44) * u, h = tp0 * 2.7, gap = tp0 * 0.5, w = W * (vertical ? 0.8 : 0.4), hh = n * h + (n - 1) * gap, tFin = 0.2 + n * 0.3 + 0.25, f = e.texte ? eio(prog(t, tFin, tFin + 0.6)) : 0, k = 1 - 0.14 * f;
    ctx.save(); ctx.translate(W / 2, H / 2 + f * tp0 * 1.1); ctx.scale(k, k);
    items.forEach((x, i) => {
      const ti = t - 0.2 - i * 0.3, p = eo(prog(ti, 0, 0.5)); if (p <= 0) return;
      const y = -hh / 2 + i * (h + gap) - (1 - p) * 170 * u, c = tons(i);
      ctx.save(); ctx.globalAlpha *= Math.min(1, p * 1.5); flou(ctx, (1 - p) * 12 * u);
      ctx.save(); ctx.shadowColor = "rgba(20,20,40,.1)"; ctx.shadowBlur = 30 * u; ctx.shadowOffsetY = 10 * u; rond(ctx, -w / 2, y, w, h, 36 * u); ctx.fillStyle = c.fond; ctx.fill(); ctx.restore();
      const cr = h * 0.46; rond(ctx, w / 2 - cr - h * 0.27, y + (h - cr) / 2, cr, cr, cr * 0.28); ctx.fillStyle = c.plein; ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(2, cr * 0.11); ctx.lineCap = "round"; ctx.lineJoin = "round"; const bx = w / 2 - cr - h * 0.27, by = y + (h - cr) / 2; ctx.beginPath(); ctx.moveTo(bx + cr * 0.27, by + cr * 0.52); ctx.lineTo(bx + cr * 0.44, by + cr * 0.68); ctx.lineTo(bx + cr * 0.74, by + cr * 0.34); ctx.stroke();
      let tp = tp0; ctx.font = `500 ${tp}px ${F}`; const place = w - cr - h * 0.9, wt = ctx.measureText(x).width; if (wt > place) { tp *= place / wt; ctx.font = `500 ${tp}px ${F}`; }
      ctx.fillStyle = c.encre; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(x, -w / 2 + h * 0.36, y + h / 2 + tp * 0.04); ctx.restore();
    });
    ctx.restore();
    if (e.texte && f > 0) { let tg = (vertical ? 68 : 58) * u; ctx.font = `600 ${tg}px ${F}`; const wt = ctx.measureText(e.texte).width; if (wt > W * 0.84) tg *= (W * 0.84) / wt; ecrit(ctx, e.texte, W / 2, H / 2 - (hh * k) / 2 - tg * 0.7 + f * tp0 * 1.1 - tp0 * 0.4, { taille: tg, poids: 600, t: t - tFin - 0.2, u, couleur: ENCRE }); }
  },
  cartes(ctx, s, e) { CLAIR.liste(ctx, s, e); },
  // Un grand chiffre noir qui monte, sa légende dessous
  compteur(ctx, s, e) {
    const { W, H, u, t, vertical } = s, cible = Number(String(e.valeur ?? "").replace(/\s/g, "").replace(",", ".")) || 0, dec = /[.,]/.test(String(e.valeur ?? "")) ? 1 : 0;
    const v = cible * eo(prog(t, 0.15, 1.6)), fmt = (x) => (dec ? x.toFixed(1).replace(".", ",") : Math.round(x).toLocaleString("fr-FR")) + (e.suffixe ? ` ${e.suffixe}` : ""), p = eo(prog(t, 0, 0.6));
    serre(ctx, "-0.04em"); const taille = ajuste(ctx, fmt(cible), (vertical ? 280 : 240) * u, W * 0.84, 600);
    ctx.save(); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 18 * u); ctx.font = `600 ${taille}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = ENCRE; ctx.fillText(fmt(v), W / 2, H / 2 - 30 * u); ctx.restore(); serre(ctx, "-0.01em");
    const leg = e.legende || e.texte; if (leg) { let tg = (vertical ? 54 : 46) * u; ctx.font = `500 ${tg}px ${F}`; const wl = ctx.measureText(leg).width; if (wl > W * 0.84) tg *= (W * 0.84) / wl; ecrit(ctx, leg, W / 2, H / 2 + taille * 0.55 + 30 * u, { taille: tg, t: t - 0.6, u, couleur: "rgba(17,17,20,.62)" }); }
  },
  // Un bouton plein de la couleur de la marque, avec son ombre colorée
  pastille(ctx, s, e) {
    const { W, H, u, t, vertical } = s, p = ressort(prog(t, 0.05, 0.75)), appui = prog(t, 1.4, 1.58) * (1 - prog(t, 1.58, 1.85));
    let tp = (vertical ? 60 : 52) * u; ctx.font = `600 ${tp}px ${F}`; const wt0 = ctx.measureText(e.texte ?? "").width; if (wt0 > W * 0.66) { tp *= (W * 0.66) / wt0; ctx.font = `600 ${tp}px ${F}`; }
    const w = ctx.measureText(e.texte ?? "").width + tp * 2.2, h = tp * 2.4, k = (0.5 + 0.5 * p) * (1 - appui * 0.06);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.globalAlpha *= Math.min(1, prog(t, 0.05, 0.3) * 1.2);
    ctx.save(); ctx.shadowColor = rgba(C, 0.38); ctx.shadowBlur = 50 * u; ctx.shadowOffsetY = 20 * u; rond(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = rgba(C, 1); ctx.fill(); ctx.restore();
    ctx.fillStyle = lum(C) > 0.62 ? ENCRE : "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e.texte ?? "", 0, tp * 0.04); ctx.restore();
  },
  // La fin : le nom en noir, puis la formule qui s'écrit mot par mot à côté, et l'adresse en petit
  logo(ctx, s, e) {
    if (LOGO?.width) return SCENES.logo(ctx, s, e);
    const { W, H, u, t, vertical } = s, p = eo(prog(t, 0, 0.7));
    serre(ctx, "-0.03em"); const taille = ajuste(ctx, s.nom, (vertical ? 130 : 120) * u, W * 0.72, 700);
    ctx.save(); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 20 * u); ctx.translate(W / 2, H * 0.47); ctx.scale(0.86 + 0.14 * p, 0.86 + 0.14 * p); ctx.font = `700 ${taille}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = ENCRE; ctx.fillText(s.nom, 0, 0); ctx.restore(); serre(ctx, "-0.01em");
    const mots = String(e.texte ?? "").split(/\s+/).filter(Boolean); let tp = (vertical ? 52 : 46) * u; ctx.font = `500 ${tp}px ${F}`; const esp = tp * 0.27, larg = () => mots.reduce((a, m) => a + ctx.measureText(m).width, 0) + esp * Math.max(0, mots.length - 1); if (larg() > W * 0.84) { tp *= (W * 0.84) / larg(); ctx.font = `500 ${tp}px ${F}`; }
    let cx = W / 2 - larg() / 2; const cy = H * 0.47 + taille * 0.72 + 30 * u;
    mots.forEach((m, i) => { ctx.font = `500 ${tp}px ${F}`; const mw = ctx.measureText(m).width; ecrit(ctx, m, cx, cy, { taille: tp, t: t - 0.8 - i * 0.32, aligne: "left", u, couleur: ENCRE }); cx += mw + tp * 0.27; });
    if (s.lien) ecrit(ctx, s.lien, W / 2, cy + tp * 1.7, { taille: 30 * u, t: t - 1.2 - mots.length * 0.32, u, couleur: "rgba(17,17,20,.45)" });
  },
};
// ── Allure « aura » : du blanc, du texte noir, et un seul effet signature : un dégradé irisé (la couleur de la marque qui
// glisse vers l'orangé, le violet et le bleu) qui remplit les grands mots, les boutons, les halos et les barres.
// Toujours la même famille (rose vif, orangé, violet, bleu) : c'est la signature de l'allure ; la teinte de la marque
// prend la place de celle qui lui ressemble le plus
const irise = () => { const h = teinteDe(C), base = [335, 18, 262, 222], ec = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b)); let k = 0; base.forEach((x, i) => { if (ec(x, h) < ec(base[k], h)) k = i; }); base[k] = h; return base.map((x) => `hsl(${x},96%,62%)`); };
function degradeAura(ctx, x0, x1, t, incl = 0) {
  const L = Math.max(1, x1 - x0), ph = (t * 0.22) % 1, g = ctx.createLinearGradient(x0 - L * ph, -incl, x0 - L * ph + 2 * L, incl), c = irise();
  for (let k = 0; k <= 8; k++) g.addColorStop(k / 8, c[k % 4]); return g;
}
// Un halo irisé flou derrière une pièce (carte, image, bouton)
function haloAura(ctx, x, y, w, h, u, t, force = 1) {
  const c = irise(); ctx.save(); ctx.globalAlpha *= force;
  c.forEach((col, i) => { const a = t * 0.6 + i * 1.57, cx = x + w / 2 + Math.cos(a) * w * 0.34, cy = y + h / 2 + Math.sin(a) * h * 0.34, R = Math.max(w, h) * 0.6, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, col.replace("hsl(", "hsla(").replace(")", ",.85)")); g.addColorStop(0.45, col.replace("hsl(", "hsla(").replace(")", ",.42)")); g.addColorStop(1, col.replace("hsl(", "hsla(").replace(")", ",0)")); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); });
  ctx.restore();
}
const AURA = {
  // Un mot géant rempli du dégradé irisé ; ses lettres arrivent l'une après l'autre
  impact(ctx, s, e) {
    const { W, H, u, t } = s, txt = e.texte || s.nom;
    serre(ctx, "-0.04em"); const taille = remplit(ctx, txt, 330 * u, W * 0.9, 2, 600); ctx.font = `600 ${taille}px ${F}`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    const ls = coupe(ctx, txt, W * 0.9); let n = 0;
    ls.forEach((l, k) => { const wl = ctx.measureText(l).width; let x = W / 2 - wl / 2; const y = H / 2 + (k - (ls.length - 1) / 2) * taille * 1.02;
      for (const ch of l) { const p = eo(prog(t, n * 0.07, n * 0.07 + 0.5)), w = ctx.measureText(ch).width; if (p > 0 && ch.trim()) { ctx.save(); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 18 * u); ctx.translate(x + w / 2, y + (1 - p) * taille * 0.3); ctx.scale(0.7 + 0.3 * p, 0.7 + 0.3 * p); ctx.fillStyle = degradeAura(ctx, -W / 2 - (x + w / 2 - W / 2), W / 2 - (x + w / 2 - W / 2), t, taille * 0.4); ctx.shadowColor = irise()[0].replace("hsl", "hsla").replace(")", ",.35)"); ctx.shadowBlur = 40 * u; ctx.textAlign = "center"; ctx.fillText(ch, 0, 0); ctx.restore(); } x += w; n++; }
    }); serre(ctx, "-0.01em");
  },
  // Plein écran irisé, un grand mot blanc
  aplat(ctx, s, e) {
    const { W, H, u, t } = s, txt = e.texte || s.nom, p = eo(prog(t, 0, 0.6));
    ctx.save(); ctx.globalAlpha *= Math.min(1, p * 1.5); ctx.fillStyle = degradeAura(ctx, -W * 0.3, W * 1.3, t * 1.5, H * 0.6); ctx.fillRect(-W, -H, W * 3, H * 3);
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, "rgba(255,255,255,.28)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    serre(ctx, "-0.03em"); const taille = remplit(ctx, txt, 230 * u, W * 0.84, 2, 600); ctx.save(); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 20 * u); ctx.translate(W / 2, H / 2); ctx.scale(1.2 - 0.2 * p, 1.2 - 0.2 * p); ctx.font = `600 ${taille}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff";
    const ls = coupe(ctx, txt, W * 0.84); ls.forEach((l, i) => ctx.fillText(l, 0, (i - (ls.length - 1) / 2) * taille * 1.04)); ctx.restore(); serre(ctx, "-0.01em");
  },
  // Un champ irisé aux bords ronds où le texte se tape lettre par lettre, avec son curseur
  pastille(ctx, s, e) {
    const { W, H, u, t, vertical } = s, txt = e.texte ?? "", p = ressort(prog(t, 0.05, 0.75)), nb = Math.floor(clamp((t - 0.45) / Math.max(0.5, Math.min(1.1, txt.length * 0.07))) * txt.length), vu = txt.slice(0, nb);
    let tp = (vertical ? 96 : 84) * u; ctx.font = `500 ${tp}px ${F}`; const wt = ctx.measureText(txt).width; if (wt > W * 0.62) { tp *= (W * 0.62) / wt; ctx.font = `500 ${tp}px ${F}`; }
    const w = Math.max(ctx.measureText(txt).width + tp * 1.6, W * 0.5), h = tp * 2.1;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(0.55 + 0.45 * p, 0.55 + 0.45 * p); ctx.globalAlpha *= Math.min(1, prog(t, 0.05, 0.3) * 1.2);
    haloAura(ctx, -w / 2, -h / 2, w, h, u, t, 0.7); rond(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = degradeAura(ctx, -w / 2, w / 2, t * 1.4, h); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; const x0 = -ctx.measureText(txt).width / 2; ctx.fillText(vu, x0, tp * 0.04);
    if (Math.floor(t * 2.4) % 2 === 0 || nb < txt.length) ctx.fillRect(x0 + ctx.measureText(vu).width + tp * 0.06, -tp * 0.55, Math.max(2, tp * 0.06), tp * 1.1);
    ctx.restore();
  },
  // Une phrase noire qui sort du flou ; le mot important prend le dégradé
  mots(ctx, s, e) {
    const { W, H, u, t, vertical } = s, largeur = W * (vertical ? 0.84 : 0.66), txt = e.texte || "";
    serre(ctx, "-0.03em"); const taille = remplit(ctx, txt, (vertical ? 118 : 96) * u, largeur, 4, 600); ctx.font = `600 ${taille}px ${F}`;
    const lignes = coupe(ctx, txt, largeur), acc = String(e.accent || "").toLowerCase().split(/\s+/).filter(Boolean), esp = taille * 0.24; let i = 0;
    lignes.forEach((l, k) => {
      const mots = l.split(" "), w = mots.reduce((a, m) => a + ctx.measureText(m).width, 0) + esp * (mots.length - 1); let cx = W / 2 - w / 2; const cy = H / 2 + (k - (lignes.length - 1) / 2) * taille * 1.12;
      for (const m of mots) { const estAcc = acc.includes(m.toLowerCase().replace(/[.,!?;:«»"]/g, "")); ctx.font = `600 ${taille}px ${F}`; const mw = ctx.measureText(m).width; ecrit(ctx, m, cx, cy, { taille, poids: 600, t: t - i * 0.09, aligne: "left", u, couleur: estAcc ? degradeAura(ctx, cx - mw, cx + mw * 2, t, taille * 0.3) : ENCRE }); cx += mw + esp; i++; }
    }); serre(ctx, "-0.01em");
  },
  rature(ctx, s, e) { AURA.mots(ctx, s, { ...e, texte: e.texte || e.barre }); },
  // Un menu : les lignes sont grises, celle qui passe devient noire avec son point irisé ; dessous, une carte blanche
  // entourée d'un halo irisé affiche en grand ce que la ligne promet
  liste(ctx, s, e) {
    const { W, H, u, t, d, vertical } = s, items = (e.items ?? []).slice(0, 4).map(texteDe).filter(Boolean), n = Math.max(1, items.length), seg = (d - 0.5) / n, actif = Math.min(n - 1, Math.max(0, Math.floor((t - 0.4) / seg)));
    const tp = (vertical ? 82 : 70) * u, lh = tp * 1.2, x0 = W * (vertical ? 0.1 : 0.08), yl = vertical ? H * 0.2 : H / 2 - (n * lh) / 2 + lh / 2;
    serre(ctx, "-0.03em");
    items.forEach((x, i) => { const p = eo(prog(t, i * 0.08, 0.45 + i * 0.08)), on = i === actif ? eo(prog(t - 0.4 - i * seg, 0, 0.25)) : 0; if (p <= 0) return; let tt = tp; ctx.font = `600 ${tt}px ${F}`; const wt = ctx.measureText(x).width, place = W * (vertical ? 0.8 : 0.4) - tp * 0.7; if (wt > place) tt *= place / wt;
      ctx.save(); ctx.globalAlpha *= p; ctx.font = `600 ${tt}px ${F}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = `rgba(17,17,20,${0.24 + 0.76 * on})`; ctx.fillText(x, x0 + tp * 0.7 * on + (1 - p) * -30 * u, yl + i * lh);
      if (on > 0) { ctx.globalAlpha *= on; ctx.fillStyle = degradeAura(ctx, x0 - tp, x0 + tp, t, tp); ctx.shadowColor = irise()[0]; ctx.shadowBlur = 18 * u; ctx.beginPath(); ctx.arc(x0 + tp * 0.22, yl + i * lh, tp * 0.17, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); });
    serre(ctx, "-0.01em");
    const tl = t - 0.4 - actif * seg, pc = ressort(prog(tl, 0, 0.55)), cw = W * (vertical ? 0.74 : 0.36), ch = vertical ? H * 0.3 : H * 0.56, cx = vertical ? W / 2 : W * 0.72, cy = vertical ? H * 0.7 : H / 2;
    if (t > 0.4) { ctx.save(); ctx.translate(cx, cy + (1 - pc) * 60 * u); ctx.scale(0.8 + 0.2 * pc, 0.8 + 0.2 * pc); ctx.globalAlpha *= Math.min(1, prog(tl, 0, 0.2) * 1.3);
      haloAura(ctx, -cw / 2, -ch / 2, cw, ch, u, t); ctx.save(); ctx.shadowColor = "rgba(20,20,40,.12)"; ctx.shadowBlur = 40 * u; ctx.shadowOffsetY = 16 * u; rond(ctx, -cw / 2, -ch / 2, cw, ch, 48 * u); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
      const txt = items[actif] ?? ""; serre(ctx, "-0.03em"); const tg = remplit(ctx, txt, (vertical ? 104 : 88) * u, cw * 0.8, 3, 600); ctx.font = `600 ${tg}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = ENCRE; const ls = coupe(ctx, txt, cw * 0.8); ls.forEach((l, i) => ctx.fillText(l, 0, -ch * 0.08 + (i - (ls.length - 1) / 2) * tg * 1.08)); serre(ctx, "-0.01em");
      const r = 30 * u, yy = ch / 2 - r * 2.3; ctx.fillStyle = degradeAura(ctx, -cw / 2, cw / 2, t, r * 2); ctx.beginPath(); ctx.arc(0, yy, r, 0, Math.PI * 2); ctx.fill(); const q = eo(prog(tl, 0.3, 0.7)); ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(2, 5 * u); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(-r * 0.42, yy); ctx.lineTo(-r * 0.42 + r * 0.3 * Math.min(1, q * 2), yy + r * 0.3 * Math.min(1, q * 2)); if (q > 0.5) ctx.lineTo(-r * 0.12 + r * 0.56 * (q - 0.5) * 2, yy + r * 0.3 - r * 0.68 * (q - 0.5) * 2); ctx.stroke();
      ctx.restore(); }
  },
  pilules(ctx, s, e) { AURA.liste(ctx, s, e); },
  cartes(ctx, s, e) { AURA.liste(ctx, s, e); },
  telephone(ctx, s, e) { AURA.liste(ctx, s, e); },
  // Un mot et son interrupteur, qui bascule et se remplit du dégradé
  choix(ctx, s, e) {
    const { W, H, u, t, vertical } = s, items = (e.items ?? []).map(texteDe).filter(Boolean), txt = items[items.length - 1] || e.texte || "", on = eio(prog(t, 1.0, 1.45)), p = eo(prog(t, 0, 0.6));
    serre(ctx, "-0.03em"); let tp = (vertical ? 130 : 120) * u; ctx.font = `600 ${tp}px ${F}`; const wt = ctx.measureText(txt).width; if (wt > W * 0.84) { tp *= (W * 0.84) / wt; ctx.font = `600 ${tp}px ${F}`; }
    const sw = (vertical ? 250 : 220) * u, sh = sw * 0.52, cy = H / 2;
    ctx.save(); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 16 * u); ctx.fillStyle = ENCRE; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (vertical) { ctx.fillText(txt, W / 2, cy - sh * 1.1); ctx.translate(W / 2 - sw / 2, cy + sh * 0.3); } else { const tot = ctx.measureText(txt).width + tp * 0.5 + sw; ctx.textAlign = "left"; ctx.fillText(txt, W / 2 - tot / 2, cy); ctx.translate(W / 2 + tot / 2 - sw, cy - sh / 2); }
    serre(ctx, "-0.01em"); if (on > 0.02) haloAura(ctx, 0, 0, sw, sh, u, t, on * 0.6);
    rond(ctx, 0, 0, sw, sh, sh / 2); ctx.fillStyle = "#D9D9DE"; ctx.fill(); if (on > 0) { ctx.save(); ctx.globalAlpha *= on; rond(ctx, 0, 0, sw, sh, sh / 2); ctx.fillStyle = degradeAura(ctx, 0, sw, t * 1.5, sh); ctx.fill(); ctx.restore(); }
    const r = sh * 0.4; ctx.shadowColor = "rgba(0,0,0,.22)"; ctx.shadowBlur = 14 * u; ctx.shadowOffsetY = 4 * u; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sh / 2 + (sw - sh) * on, sh / 2, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    if (e.texte && items.length) { let tg = (vertical ? 50 : 44) * u; ctx.font = `500 ${tg}px ${F}`; const w2 = ctx.measureText(e.texte).width; if (w2 > W * 0.84) tg *= (W * 0.84) / w2; ecrit(ctx, e.texte, W / 2, cy + sh * (vertical ? 1.7 : 1.5), { taille: tg, t: t - 1.4, u, couleur: "rgba(17,17,20,.6)" }); }
  },
  // Un grand chiffre noir qui monte, ses derniers chiffres irisés, et des barres irisées qui poussent en bas de l'écran
  compteur(ctx, s, e) {
    const { W, H, u, t, vertical } = s, cible = Number(String(e.valeur ?? "").replace(/\s/g, "").replace(",", ".")) || 0, dec = /[.,]/.test(String(e.valeur ?? "")) ? 1 : 0, q = eo(prog(t, 0.15, 1.8)), v = cible * q;
    const fmt = (x) => (dec ? x.toFixed(1).replace(".", ",") : Math.round(x).toLocaleString("fr-FR")) + (e.suffixe ? ` ${e.suffixe}` : ""), p = eo(prog(t, 0, 0.5));
    const nb = 9, bw = W / (nb + 1.5), base = H * 1.0; for (let i = 0; i < nb; i++) { const hh = H * (0.08 + 0.26 * ((i + 1) / nb) * (0.75 + 0.25 * Math.sin(i * 2.3))) * eo(prog(t, 0.2 + i * 0.09, 1.2 + i * 0.09)); ctx.save(); ctx.fillStyle = degradeAura(ctx, 0, W, t, H * 0.3); rond(ctx, bw * 0.75 + i * bw * 1.02, base - hh, bw * 0.78, hh + 40 * u, 14 * u); ctx.fill(); ctx.restore(); }
    serre(ctx, "-0.04em"); const txt = fmt(v), taille = ajuste(ctx, fmt(cible), (vertical ? 270 : 250) * u, W * 0.86, 700); ctx.font = `700 ${taille}px ${F}`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    const wt = ctx.measureText(txt).width, coupeA = Math.max(0, txt.length - (q < 1 ? 3 : 0)), a = txt.slice(0, coupeA), b = txt.slice(coupeA), x0 = W / 2 - wt / 2, cy = H * 0.42;
    ctx.save(); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 16 * u); ctx.fillStyle = ENCRE; ctx.fillText(a, x0, cy); if (b) { const xa = x0 + ctx.measureText(a).width; ctx.fillStyle = degradeAura(ctx, xa - taille, xa + taille * 2, t * 2, taille * 0.4); ctx.fillText(b, xa, cy); } ctx.restore(); serre(ctx, "-0.01em");
    const leg = e.legende || e.texte; if (leg) { let tg = (vertical ? 56 : 48) * u; ctx.font = `500 ${tg}px ${F}`; const wl = ctx.measureText(leg).width; if (wl > W * 0.84) tg *= (W * 0.84) / wl; ecrit(ctx, leg, W / 2, cy + taille * 0.62, { taille: tg, t: t - 0.6, u, couleur: "rgba(17,17,20,.62)" }); }
  },
  // L'image dans une carte arrondie entourée du halo irisé, sa phrase en noir dessous
  image(ctx, s, e) {
    const { W, H, u, t, d, vertical } = s, img = IMAGES[e.image], iw0 = img?.videoWidth || img?.width, ih0 = img?.videoHeight || img?.height;
    if (!iw0) return AURA.mots(ctx, s, e);
    const p = ressort(prog(t, 0, 0.7)), w = W * (vertical ? 0.74 : 0.34), h = w * (vertical ? 1.2 : 1.15), cx = W / 2, cy = vertical ? H * 0.42 : H / 2;
    ctx.save(); ctx.translate(cx, cy + (1 - p) * 80 * u); ctx.scale(0.7 + 0.3 * p, 0.7 + 0.3 * p); ctx.globalAlpha *= Math.min(1, prog(t, 0, 0.25) * 1.3); haloAura(ctx, -w / 2, -h / 2, w, h, u, t);
    ctx.save(); rond(ctx, -w / 2, -h / 2, w, h, 56 * u); ctx.clip(); const k = Math.max(w / iw0, h / ih0) * (1.14 - 0.1 * prog(t, 0, d)); ctx.drawImage(img, -iw0 * k / 2, -ih0 * k / 2, iw0 * k, ih0 * k); ctx.restore(); ctx.restore();
    if (e.texte) { serre(ctx, "-0.03em"); const tg = remplit(ctx, e.texte, (vertical ? 84 : 72) * u, W * 0.84, 2, 600); serre(ctx, "-0.01em"); const ls = coupe(ctx, e.texte, W * 0.84); ctx.font = `600 ${tg}px ${F}`; ls.forEach((l, i) => ecrit(ctx, l, W / 2, (vertical ? cy + h / 2 + tg * 1.4 : H * 0.9) + i * tg * 1.12, { taille: tg, poids: 600, t: t - 0.4 - i * 0.12, u, couleur: ENCRE })); }
  },
  // La fin : le nom en noir avec son point irisé, puis l'adresse
  logo(ctx, s, e) {
    if (LOGO?.width) return SCENES.logo(ctx, s, e);
    const { W, H, u, t, vertical } = s, p = eo(prog(t, 0, 0.7));
    serre(ctx, "-0.04em"); const taille = ajuste(ctx, s.nom, (vertical ? 170 : 150) * u, W * 0.7, 700); ctx.font = `700 ${taille}px ${F}`; const wn = ctx.measureText(s.nom).width;
    ctx.save(); ctx.globalAlpha *= p; flou(ctx, (1 - p) * 20 * u); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = ENCRE; ctx.fillText(s.nom, W / 2 + taille * 0.16, H * 0.47);
    ctx.fillStyle = degradeAura(ctx, W / 2 - wn, W / 2 + wn, t * 1.5, taille); ctx.shadowColor = irise()[0]; ctx.shadowBlur = 24 * u; ctx.beginPath(); ctx.arc(W / 2 - wn / 2 - taille * 0.1, H * 0.47, taille * 0.17 * ressort(prog(t, 0.2, 0.9)), 0, Math.PI * 2); ctx.fill(); ctx.restore(); serre(ctx, "-0.01em");
    [e.texte, s.lien].filter(Boolean).forEach((x, i) => { let tp = (i ? 40 : 50) * u; ctx.font = `500 ${tp}px ${F}`; const wt = ctx.measureText(x).width; if (wt > W * 0.84) tp *= (W * 0.84) / wt; ecrit(ctx, x, W / 2, H * 0.47 + taille * 0.72 + (36 + i * 76) * u, { taille: tp, t: t - 0.9 - i * 0.25, u, couleur: i ? "rgba(17,17,20,.5)" : ENCRE }); });
  },
};
// ── Allure « film » : un petit film de marque. Dans le noir, un point devient un champ où la phrase se tape ; puis une
// fenêtre se construit bloc par bloc et un curseur vient cliquer ; de grands mots sur fonds pleins ; une roue de mots qui
// ralentit ; une phrase soulignée ; et la signature, où le point retombe et rebondit. Chaque geste a son bruitage
// (frappes de clavier, clic de souris, souffles, coups) : voir sonsScenes plus bas.
const CREME = "#F6F4EF", NUIT = "#14151F";
let RANGS = []; // rang de chaque « impact » parmi les impacts de la vidéo (le fond change à chaque mot)
const quint = (x) => 1 - Math.pow(1 - x, 5), expo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const ress2 = (x, z = 0.5, w = 11) => { if (x <= 0) return 0; if (x >= 1) return 1; const wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + ((z * w) / wd) * Math.sin(wd * x)); };
const plein = (ctx, s, couleur) => { ctx.fillStyle = couleur; ctx.fillRect(0, 0, s.W, s.H); };
// Les instants d'un champ tapé de durée d : ouverture, début et fin de frappe, validation, fermeture
const tempsFrappe = (d) => ({ ouvre: 0.7, tape: 1.35, finTape: Math.max(2, d - 1.25), entree: d - 0.95, ferme: d - 0.62 });
const FILM = {
  // Le noir : un point bat, s'étire en champ de saisie, la phrase se tape, il valide et se referme en un trait
  mots(ctx, s, e) {
    const { W, H, t, d, vertical } = s, q = vertical ? W / 1300 : Math.min(W / 1920, H / 1080), txt = String(e.texte ?? ""), T = tempsFrappe(d);
    plein(ctx, s, "#08080B"); const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 900 * q); g.addColorStop(0, rgba(C, 0.12)); g.addColorStop(1, rgba(C, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    let tp = 50 * q * (vertical ? 1.2 : 1); ctx.font = `500 ${tp}px ${F}`; serre(ctx, "-0.015em"); const large = vertical ? W * 0.9 : 1180 * q, wt = ctx.measureText(txt).width; if (wt > large - 190 * q) { tp *= (large - 190 * q) / wt; ctx.font = `500 ${tp}px ${F}`; }
    const ouvre = expo(prog(t, T.ouvre, T.ouvre + 0.8)), pw = 30 * q + (large - 30 * q) * ouvre, ph = (30 + 94 * ouvre) * q, ferme = eio(prog(t, T.ferme, T.ferme + 0.4)), ap = ress2(prog(t, 0.1, 0.8), 0.42, 12), bat = 1 + 0.12 * Math.sin(t * 7) * (1 - ouvre), appui = Math.sin(prog(t, T.entree - 0.03, T.entree + 0.23) * Math.PI) * 0.035;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1 - appui, (1 - appui) * (1 - ferme * 0.97));
    if (ouvre > 0.01) { const lw = pw * (1 + ferme * 0.9); ctx.save(); ctx.globalAlpha = Math.min(1, ouvre * 2); ctx.shadowColor = rgba(C, 0.35); ctx.shadowBlur = 90 * q; rond(ctx, -lw / 2, -ph / 2, lw, ph, ph / 2); ctx.fillStyle = "rgba(255,255,255,.07)"; ctx.fill(); ctx.restore(); rond(ctx, -lw / 2, -ph / 2, lw, ph, ph / 2); ctx.strokeStyle = `rgba(255,255,255,${0.18 * ouvre + ferme * 0.8})`; ctx.lineWidth = Math.max(1.5, 2 * q); ctx.stroke(); }
    ctx.save(); ctx.shadowColor = rgba(C, 1); ctx.shadowBlur = (40 + 30 * Math.sin(t * 7) ** 2) * q; ctx.fillStyle = rgba(C, 1); ctx.beginPath(); ctx.arc((-pw / 2 + 62 * q) * ouvre, 0, 15 * q * ap * bat * (1 - ferme), 0, 7); ctx.fill(); ctx.restore();
    if (t > T.tape && ferme < 0.6) { const n = Math.floor(clamp((t - T.tape) / (T.finTape - T.tape)) * txt.length), vu = txt.slice(0, n); ctx.globalAlpha = Math.max(0, 1 - ferme * 1.6); ctx.font = `500 ${tp}px ${F}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.fillText(vu, -pw / 2 + 112 * q, 3 * q); if (n < txt.length || Math.floor(t * 2.6) % 2 === 0) { ctx.fillStyle = rgba(C, 1); ctx.fillRect(-pw / 2 + 112 * q + ctx.measureText(vu).width + 6 * q, -tp * 0.6, Math.max(2, 4 * q), tp * 1.2); } }
    ctx.restore(); serre(ctx, "-0.01em");
    const o = prog(t, T.entree + 0.1, T.entree + 0.75); if (o > 0 && o < 1) { ctx.save(); ctx.strokeStyle = rgba(C, 1); ctx.globalAlpha = (1 - o) * 0.9; ctx.lineWidth = (6 * (1 - o) + 1) * q; const a = o * 420 * q; rond(ctx, W / 2 - pw / 2 - a, H / 2 - ph / 2 - a, pw + 2 * a, ph + 2 * a, ph / 2 + a); ctx.stroke(); ctx.restore(); }
    const k = prog(t, d - 0.16, d); if (k > 0) { ctx.save(); ctx.globalAlpha = eio(k); ctx.fillStyle = "#fff"; ctx.fillRect(0, H / 2 - (H / 2) * eio(k), W, H * eio(k)); ctx.restore(); }
  },
  rature(ctx, s, e) { FILM.aplat(ctx, s, { ...e, texte: e.texte || e.barre }); },
  // Une fenêtre se trace au fil, de biais, puis se remplit bloc par bloc pendant que la caméra se redresse ; les entrées de
  // son menu sont les mots du membre ; un curseur vient cliquer sur le bouton, une onde part, et la fenêtre fonce vers nous
  liste(ctx, s, e) {
    const { W, H, t, d, vertical } = s, q = vertical ? (W * 0.92) / 1180 : Math.min(W / 1920, H / 1080), items = (e.items ?? []).slice(0, 4).map(texteDe).filter(Boolean);
    plein(ctx, s, CREME); const g = ctx.createRadialGradient(W * 0.3, H * 0.2, 0, W * 0.3, H * 0.2, Math.max(W, H) * 0.8); g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const cam = quint(prog(t, 0, 2.9)), part = Math.pow(prog(t, d - 0.62, d), 3), tClic = d - 1.25, clic = Math.sin(prog(t, tClic, tClic + 0.22) * Math.PI);
    const mx = W * 0.065, yh = vertical ? H * 0.2 : 96 * q, ca = prog(t, 0.3, 0.8) * (1 - prog(t, d - 0.8, d - 0.55));
    if (ca > 0 && e.texte) { ctx.save(); ctx.globalAlpha = ca; let tg = 30 * q * (vertical ? 1.5 : 1); ctx.font = `600 ${tg}px ${F}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = NUIT; ctx.fillText(e.texte, mx, yh); ctx.fillStyle = "rgba(20,21,31,.1)"; ctx.fillRect(mx, yh + tg * 1.2, W - 2 * mx, Math.max(2, 3 * q)); ctx.fillStyle = rgba(C, 1); ctx.fillRect(mx, yh + tg * 1.2, (W - 2 * mx) * eio(prog(t, 0.4, 3.1)), Math.max(2, 3 * q)); ctx.restore(); }
    const ech = (0.74 + 0.26 * cam) * (1 + part * 7) * q;
    ctx.save(); ctx.translate(W / 2, H / 2 + 40 * q); ctx.rotate(-0.09 * (1 - cam)); ctx.transform(1, 0, -0.22 * (1 - cam), 1, 0, 0); ctx.scale(ech, ech); ctx.translate(-590, -350); ctx.globalAlpha = 1 - part;
    const BL = [[0, 0, 1180, 700, 30, "fenetre", 0], [0, 0, 1180, 74, 0, "barre", 1], [0, 74, 290, 626, 0, "cote", 2], [26, 106, 238, 46, 12, "menu", 3], [26, 164, 238, 46, 12, "menu2", 3.3], [26, 222, 238, 46, 12, "menu2", 3.6], [26, 280, 238, 46, 12, "menu2", 3.9],
      [326, 110, 258, 150, 20, "carte", 4.4], [610, 110, 258, 150, 20, "carteO", 4.8], [894, 110, 258, 150, 20, "carte", 5.2], [326, 290, 542, 380, 20, "graphe", 5.8], [894, 290, 258, 380, 20, "grille", 6.3], [1006, 17, 148, 40, 20, "publier", 6.9]];
    let im = 0;
    for (const [x, y, w, h, r, genre, ordre] of BL) {
      const td = 0.12 + ordre * 0.25, trait = eio(prog(t, td, td + 0.5)), pl = ress2(prog(t, td + 0.4, td + 0.95), 0.6, 10); if (trait <= 0) continue; const L = 2 * (w + h);
      if (genre === "fenetre") { if (pl > 0) { ctx.save(); ctx.globalAlpha *= Math.min(1, pl); ctx.shadowColor = "rgba(20,21,31,.18)"; ctx.shadowBlur = 90; ctx.shadowOffsetY = 40; rond(ctx, x, y, w, h, r); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore(); } }
      else if (pl > 0) {
        ctx.save(); rond(ctx, 0, 0, 1180, 700, 30); ctx.clip(); let k = genre === "barre" || genre === "cote" ? 1 : 0.6 + 0.4 * pl; if (genre === "publier") k *= 1 - clic * 0.12;
        ctx.translate(x + w / 2, y + h / 2); ctx.scale(k, k); ctx.globalAlpha *= Math.min(1, pl * 1.4);
        ctx.fillStyle = { barre: "#FBFAF7", cote: "#F4F2EC", menu: rgba(C, 1), menu2: "#E6E3DA", carte: "#F4F2EC", carteO: rgba(C, 1), graphe: "#F4F2EC", grille: NUIT, publier: rgba(C, 1) }[genre]; rond(ctx, -w / 2, -h / 2, w, h, r); ctx.fill();
        if (genre === "menu" || genre === "menu2") { const mot = items[im++]; if (mot) { let tm = 24; ctx.font = `600 ${tm}px ${F}`; const wm = ctx.measureText(mot).width; if (wm > w - 30) { tm *= (w - 30) / wm; ctx.font = `600 ${tm}px ${F}`; } ctx.fillStyle = genre === "menu" ? (lum(C) > 0.62 ? NUIT : "#fff") : NUIT; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(mot, -w / 2 + 16, 1); } }
        if (genre === "publier") { ctx.fillStyle = "#fff"; rond(ctx, -44, -6, 88, 12, 6); ctx.fill(); }
        if (genre === "carte" || genre === "carteO") { ctx.fillStyle = genre === "carteO" ? "rgba(255,255,255,.55)" : "rgba(20,21,31,.16)"; rond(ctx, -w / 2 + 26, -h / 2 + 28, 96, 14, 7); ctx.fill(); ctx.fillStyle = genre === "carteO" ? "#fff" : NUIT; rond(ctx, -w / 2 + 26, -h / 2 + 62, 150 * eio(prog(t, td + 0.6, td + 1.3)), 46, 12); ctx.fill(); }
        if (genre === "graphe") for (let i = 0; i < 9; i++) { const hh = (60 + [40, 90, 60, 140, 110, 190, 150, 230, 270][i]) * quint(prog(t, td + 0.5 + i * 0.06, td + 1.2 + i * 0.06)); ctx.fillStyle = i === 8 ? rgba(C, 1) : i > 5 ? rgba(mix(C, [255, 255, 255], 0.5), 1) : "#DCD8CC"; rond(ctx, -w / 2 + 34 + i * 54, h / 2 - 36 - hh, 36, hh, 9); ctx.fill(); }
        if (genre === "grille") { ctx.fillStyle = "rgba(255,255,255,.85)"; rond(ctx, -w / 2 + 24, -h / 2 + 30, 120, 16, 8); ctx.fill(); for (let l = 0; l < 5; l++) for (let col = 0; col < 4; col++) { const n = l * 4 + col, a = ress2(prog(t, td + 0.5 + n * 0.035, td + 0.95 + n * 0.035), 0.55, 11); if (a <= 0) continue; ctx.globalAlpha = Math.min(1, a) * (1 - part); ctx.fillStyle = [5, 10, 14].includes(n) ? rgba(C, 1) : "rgba(255,255,255,.13)"; const cs = 44 * (0.4 + 0.6 * a); rond(ctx, -w / 2 + 24 + col * 54 + (44 - cs) / 2, -h / 2 + 74 + l * 54 + (44 - cs) / 2, cs, cs, 12); ctx.fill(); } }
        if (genre === "barre") ["#F0B4A0", "#E6E3DA", "#E6E3DA"].forEach((col, i) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(-w / 2 + 40 + i * 30, 0, 9, 0, 7); ctx.fill(); });
        ctx.restore();
      }
      if (trait < 1 || pl < 1) { ctx.save(); ctx.globalAlpha *= (1 - pl) * 0.9; ctx.strokeStyle = NUIT; ctx.lineWidth = 2.5; ctx.setLineDash([L * trait, L]); rond(ctx, x, y, w, h, Math.max(r, 2)); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }
    }
    ctx.restore();
    const bx = W / 2 + (1080 - 590) * q, by = H / 2 + 40 * q + (37 - 350) * q, va = eio(prog(t, tClic - 0.8, tClic)), cx = bx + 8 * q + (1 - va) * 250 * q, cy = by + 6 * q + (1 - va) * 600 * q - Math.sin(va * Math.PI) * 90 * q;
    if (t > tClic - 0.85 && part < 0.3) { ctx.save(); ctx.globalAlpha = prog(t, tClic - 0.85, tClic - 0.6) * (1 - prog(t, d - 0.75, d - 0.6)); ctx.translate(cx, cy); const kc = 1.35 * q * (1 - clic * 0.12) * (vertical ? 1.5 : 1); ctx.scale(kc, kc); ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 42); ctx.lineTo(11, 32); ctx.lineTo(19, 50); ctx.lineTo(27, 46); ctx.lineTo(19, 29); ctx.lineTo(33, 29); ctx.closePath(); ctx.fillStyle = "#fff"; ctx.fill(); ctx.shadowColor = "transparent"; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.strokeStyle = NUIT; ctx.stroke(); ctx.restore(); }
    const o = prog(t, tClic + 0.1, tClic + 0.8); if (o > 0 && o < 1) { ctx.save(); ctx.globalAlpha = (1 - o) * 0.9; ctx.strokeStyle = rgba(C, 1); ctx.lineWidth = (6 * (1 - o) + 1) * q; ctx.beginPath(); ctx.arc(bx, by, expo(o) * 260 * q, 0, 7); ctx.stroke(); ctx.restore(); }
    if (part > 0.5) { ctx.fillStyle = rgba(C, (part - 0.5) * 2); ctx.fillRect(0, 0, W, H); }
  },
  cartes(ctx, s, e) { FILM.liste(ctx, s, e); },
  telephone(ctx, s, e) { FILM.liste(ctx, s, e); },
  // Une demande tapée dans un champ sombre, au centre, sur fond crème
  pastille(ctx, s, e) {
    const { W, H, t, d, vertical } = s, q = vertical ? W / 1100 : Math.min(W / 1920, H / 1080), txt = String(e.texte ?? ""), monte = quint(prog(t, 0, 0.55)) * (1 - eio(prog(t, d - 0.45, d - 0.05))), tFin = Math.max(1.2, d - 1.2), ap = Math.sin(prog(t, d - 1.0, d - 0.75) * Math.PI) * 0.035;
    plein(ctx, s, CREME); let tp = 44 * q; ctx.font = `500 ${tp}px ${F}`; const pw = Math.min(W * 0.9, Math.max(ctx.measureText(txt).width + 190 * q, 700 * q)), ph = 110 * q; const place = pw - 150 * q, wt = ctx.measureText(txt).width; if (wt > place) { tp *= place / wt; ctx.font = `500 ${tp}px ${F}`; }
    ctx.save(); ctx.translate(W / 2, H / 2 + (1 - monte) * H * 0.6); ctx.scale(1 - ap, 1 - ap); ctx.shadowColor = "rgba(20,21,31,.3)"; ctx.shadowBlur = 60 * q; ctx.shadowOffsetY = 24 * q; rond(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fillStyle = NUIT; ctx.fill(); ctx.shadowColor = "transparent";
    ctx.fillStyle = rgba(C, 1); ctx.beginPath(); ctx.arc(-pw / 2 + 56 * q, 0, 13 * q, 0, 7); ctx.fill();
    const n = Math.floor(clamp((t - 0.6) / Math.max(0.3, tFin - 0.6)) * txt.length), vu = txt.slice(0, n); ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(vu, -pw / 2 + 98 * q, 2 * q);
    if (n < txt.length || Math.floor(t * 2.6) % 2 === 0) { ctx.fillStyle = rgba(C, 1); ctx.fillRect(-pw / 2 + 98 * q + ctx.measureText(vu).width + 5 * q, -tp * 0.58, Math.max(2, 3 * q), tp * 1.16); } ctx.restore();
    const o = prog(t, d - 0.9, d - 0.3); if (o > 0 && o < 1) { ctx.save(); ctx.globalAlpha = (1 - o) * 0.8; ctx.strokeStyle = rgba(C, 1); ctx.lineWidth = (5 * (1 - o) + 1) * q; const a = o * 300 * q; rond(ctx, W / 2 - pw / 2 - a, H / 2 - ph / 2 - a, pw + 2 * a, ph + 2 * a, ph / 2 + a); ctx.stroke(); ctx.restore(); }
  },
  // Un grand mot sur un fond plein, qui monte de derrière sa ligne et repart par le haut ; le fond change à chaque mot
  impact(ctx, s, e) {
    const { W, H, t, d, vertical } = s, q = Math.min(W, H) / 1080, txt = e.texte || s.nom, k = (RANGS[s.i ?? 0] ?? 0) % 4, clairC = lum(C) > 0.62;
    const [fondC, encre] = [[rgba(C, 1), clairC ? NUIT : "#fff"], [NUIT, "#fff"], ["#fff", clairC ? NUIT : rgba(C, 1)], [CREME, NUIT]][k];
    plein(ctx, s, fondC); serre(ctx, "-0.055em"); const taille = ajuste(ctx, txt, 330 * q, W * 0.88, 800), ent = quint(prog(t, 0, 0.42)), sor = Math.pow(prog(t, d - 0.16, d), 3);
    ctx.save(); ctx.beginPath(); ctx.rect(0, H / 2 - taille * 0.62, W, taille * 1.24); ctx.clip(); ctx.translate(W / 2, H / 2 + (1 - ent) * taille * 1.25 - sor * taille * 1.25); const z = 1 + t * 0.03; ctx.scale(z, z);
    ctx.font = `800 ${taille}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = encre; ctx.fillText(txt, 0, 0); ctx.restore(); serre(ctx, "-0.01em");
    const mx = W * 0.065, tr = eio(prog(t, 0.15, d)); ctx.fillStyle = encre; ctx.globalAlpha = 0.9; ctx.fillRect(mx, H - (vertical ? 200 : 100) * q, (W - 2 * mx) * tr, Math.max(2, 4 * q)); ctx.globalAlpha = 0.6 * prog(t, 0.1, 0.4); ctx.font = `700 ${28 * q * (vertical ? 1.3 : 1)}px ${F}`; ctx.textAlign = "right"; ctx.fillText(s.nom, W - mx, (vertical ? 260 : 96) * q); ctx.globalAlpha = 1;
  },
  // Une roue de mots : le premier mot reste, les autres défilent, ralentissent, et la roue se cale sur le dernier
  pilules(ctx, s, e) {
    const { W, H, t, d, vertical } = s, q = Math.min(W, H) / 1080, items = (e.items ?? []).map(texteDe).filter(Boolean), n = Math.max(1, items.length), tete = e.texte || "";
    plein(ctx, s, CREME); serre(ctx, "-0.045em"); let taille = (vertical ? 120 : 150) * q; ctx.font = `700 ${taille}px ${F}`; const wt = ctx.measureText(tete).width, wm = Math.max(...items.map((m) => ctx.measureText(m).width), 1), tot = wt + (tete ? taille * 0.3 : 0) + wm; if (tot > W * 0.9) { taille *= (W * 0.9) / tot; ctx.font = `700 ${taille}px ${F}`; }
    const w1 = ctx.measureText(tete).width, wmax = Math.max(...items.map((m) => ctx.measureText(m).width), 1), x0 = W / 2 - (w1 + (tete ? taille * 0.3 : 0) + wmax) / 2, xg = x0 + w1 + (tete ? taille * 0.3 : 0), lh = taille * 1.27;
    const tourne = d - 0.9, x = clamp((t - 0.25) / tourne), pos = (1 - Math.pow(1 - x, 2.6)) * (n - 1), ent = quint(prog(t, 0, 0.5)), sor = Math.pow(prog(t, d - 0.22, d), 2);
    ctx.save(); ctx.globalAlpha = ent * (1 - sor); ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillStyle = NUIT; if (tete) ctx.fillText(tete, x0 - (1 - ent) * 60 * q, H / 2);
    items.forEach((m, i) => { const dd = i - pos, a = Math.max(0, 1 - Math.abs(dd) * 0.62); if (a <= 0) return; ctx.globalAlpha = ent * (1 - sor) * (Math.abs(dd) < 0.5 ? 1 : a * 0.42); const k = 1 - Math.min(1, Math.abs(dd)) * 0.16; ctx.save(); ctx.translate(xg, H / 2 + dd * lh); ctx.scale(k, k); ctx.fillStyle = Math.abs(dd) < 0.5 ? rgba(lum(C) > 0.7 ? mix(C, [0, 0, 0], 0.35) : C, 1) : NUIT; ctx.fillText(m, 0, 0); ctx.restore(); });
    ctx.restore(); serre(ctx, "-0.01em");
    const fin = ress2(prog(t, tourne + 0.15, tourne + 0.6), 0.5, 12); if (fin > 0 && sor < 1) { ctx.save(); ctx.globalAlpha = 1 - sor; ctx.font = `700 ${taille}px ${F}`; ctx.fillStyle = rgba(C, 1); rond(ctx, xg, H / 2 + taille * 0.56, ctx.measureText(items[n - 1] ?? "").width * fin, Math.max(4, 10 * q), 5 * q); ctx.fill(); ctx.restore(); }
  },
  choix(ctx, s, e) { FILM.pilules(ctx, s, e); },
  // Une phrase noire sur crème : chaque mot monte de derrière la ligne, le mot important est en couleur et se souligne
  aplat(ctx, s, e) {
    const { W, H, t, d } = s, q = Math.min(W, H) / 1080, txt = e.texte || s.nom, acc = String(e.accent || "").toLowerCase().replace(/[.,!?;:«»"]/g, "").split(/\s+/).filter(Boolean);
    plein(ctx, s, CREME); serre(ctx, "-0.045em"); const taille = remplit(ctx, txt, 170 * q, W * 0.86, 3, 700); ctx.font = `700 ${taille}px ${F}`; const lignes = coupe(ctx, txt, W * 0.86), esp = taille * 0.24, sor = Math.pow(prog(t, d - 0.3, d), 2); let i = 0;
    lignes.forEach((l, kk) => { const mots = l.split(" "), ws = mots.map((m) => ctx.measureText(m).width), tot = ws.reduce((a, b) => a + b, 0) + esp * (mots.length - 1); let x = W / 2 - tot / 2; const y = H / 2 + (kk - (lignes.length - 1) / 2) * taille * 1.14;
      mots.forEach((m, j) => { const p = quint(prog(t, i * 0.13, 0.5 + i * 0.13)), estAcc = acc.includes(m.toLowerCase().replace(/[.,!?;:«»"]/g, "")), col = rgba(lum(C) > 0.7 ? mix(C, [0, 0, 0], 0.35) : C, 1);
        ctx.save(); ctx.beginPath(); ctx.rect(x - 20 * q, y - taille * 0.62, ws[j] + 40 * q, taille * 1.24); ctx.clip(); ctx.globalAlpha = 1 - sor; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = estAcc ? col : NUIT; ctx.fillText(m, x, y + (1 - p) * taille * 1.2 - sor * 60 * q); ctx.restore();
        if (estAcc) { const tr = eio(prog(t, 0.5 + i * 0.13, 1.0 + i * 0.13)) * (1 - sor); ctx.fillStyle = col; rond(ctx, x, y + taille * 0.56, ws[j] * tr, Math.max(4, 10 * q), 5 * q); ctx.fill(); }
        x += ws[j] + esp; i++; }); });
    serre(ctx, "-0.01em");
  },
  // La signature : le point tombe, rebondit, s'ouvre en anneaux ; le logo (ou le nom) se dévoile de gauche à droite
  logo(ctx, s, e) {
    const { W, H, t, vertical } = s, q = Math.min(W, H) / 1080;
    plein(ctx, s, CREME); const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 900 * q); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const chute = prog(t, 0, 0.42), y = H / 2 - H * 0.58 * (1 - chute) * (1 - chute) - Math.abs(Math.sin(prog(t, 0.42, 0.75) * Math.PI)) * 46 * q, ecr = 1 - 0.25 * Math.sin(prog(t, 0.4, 0.52) * Math.PI), rv = eio(prog(t, 0.55, 1.15));
    if (rv < 1) { ctx.save(); ctx.globalAlpha = 1 - prog(t, 0.6, 0.85); ctx.fillStyle = rgba(C, 1); ctx.beginPath(); ctx.ellipse(W / 2, y, (24 * q) / ecr, 24 * q * ecr, 0, 0, 7); ctx.fill(); ctx.restore(); }
    [0, 0.12].forEach((dd) => { const o = prog(t, 0.5 + dd, 1.3 + dd); if (o > 0 && o < 1) { ctx.save(); ctx.globalAlpha = (1 - o) * 0.8; ctx.strokeStyle = rgba(C, 1); ctx.lineWidth = (10 * (1 - o) + 1) * q; ctx.beginPath(); ctx.arc(W / 2, H / 2, expo(o) * 720 * q, 0, 7); ctx.stroke(); ctx.restore(); } });
    const zo = 0.92 + 0.08 * quint(prog(t, 0.55, 1.4)) + prog(t, 1.4, 5) * 0.03, lh = 190 * q; let bas = H / 2 + lh * 0.75;
    ctx.save(); ctx.translate(W / 2, H / 2 - 14 * q); ctx.scale(zo, zo);
    if (LOGO?.width) { const lw = Math.min(lh * LOGO.width / LOGO.height, W * 0.7), hh = lw * LOGO.height / LOGO.width; ctx.beginPath(); ctx.rect(-lw / 2 - 20, -hh, (lw + 40) * rv, hh * 2); ctx.clip(); ctx.drawImage(LOGO, -lw / 2, -hh / 2, lw, hh); }
    else { serre(ctx, "-0.04em"); const taille = ajuste(ctx, s.nom, 190 * q, W * 0.8, 800); ctx.font = `800 ${taille}px ${F}`; const wn = ctx.measureText(s.nom).width; ctx.beginPath(); ctx.rect(-wn / 2 - 20, -taille, (wn + 40) * rv, taille * 2); ctx.clip(); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = NUIT; ctx.fillText(s.nom, 0, 0); serre(ctx, "-0.01em"); }
    ctx.restore();
    [e.texte, s.lien].filter(Boolean).forEach((x, i) => { let tp = (i ? 30 : 44) * q * (vertical ? 1.25 : 1); ctx.font = `${i ? 600 : 500} ${tp}px ${F}`; const wt = ctx.measureText(x).width; if (wt > W * 0.86) tp *= (W * 0.86) / wt; const a = quint(prog(t, 1.15 + i * 0.2, 1.6 + i * 0.2)); if (a <= 0) return; ctx.save(); ctx.globalAlpha = a * (i ? 0.55 : 1); ctx.font = `${i ? 600 : 500} ${tp}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = NUIT; ctx.fillText(x, W / 2, bas + (1 - a) * 20 * q + tp * 0.6); ctx.restore(); bas += tp * 1.7; });
  },
};
/** Les bruitages d'une vidéo, calés sur ses plans : [{ t, son, f, g, d }]. Seule l'allure « film » en a pour l'instant. */
export function sonsScenes(script) {
  if (script?.look !== "film") return [];
  const sons = [], scenes = (script?.scenes ?? []).filter((x) => SCENES[x?.type]); let t0 = 0, nImpact = 0;
  const frappe = (txt, a, b) => { const n = Math.max(1, txt.length); for (let i = 0; i < txt.length; i++) sons.push({ t: a + ((b - a) * i) / n, son: txt[i] === " " ? "espace" : "touche", g: 0.8 + ((i * 37) % 10) / 33 }); };
  scenes.forEach((e, i) => {
    const d = dureeScene(e), type = { rature: "aplat", cartes: "liste", telephone: "liste", choix: "pilules" }[e.type] ?? e.type;
    if (type === "mots") { const T = tempsFrappe(d); sons.push({ t: t0 + 0.12, son: "coup", f: 44, g: 0.5 }, { t: t0 + 0.5, son: "coup", f: 44, g: 0.4 }, { t: t0 + T.ouvre, son: "souffle", d: 0.8, g: 0.14 }); frappe(String(e.texte ?? ""), t0 + T.tape, t0 + T.finTape); sons.push({ t: t0 + T.entree, son: "entree" }, { t: t0 + T.entree + 0.08, son: "note", f: 880, g: 0.1 }, { t: t0 + T.ferme - 0.1, son: "souffle", d: 0.6, g: 0.5, monte: true }, { t: t0 + d - 0.02, son: "coup", f: 60, g: 0.9 }); }
    else if (type === "liste") { [0, 1, 2, 3, 3.3, 3.6, 3.9, 4.4, 4.8, 5.2, 5.8, 6.3, 6.9].forEach((o, k) => sons.push({ t: t0 + 0.12 + o * 0.25 + 0.4, son: "pop", f: 420 + k * 55, g: 0.16 })); for (let k = 0; k < 30; k++) sons.push({ t: t0 + 0.4 + (2.7 * k) / 30, son: "tic", f: k % 2 ? 2600 : 2200, g: 0.035 }); for (let k = 0; k < 20; k++) sons.push({ t: t0 + 0.12 + 6.3 * 0.25 + 0.5 + k * 0.035, son: "pop", f: 700 + k * 45, g: 0.05 }); sons.push({ t: t0 + d - 1.25, son: "clic" }, { t: t0 + d - 1.15, son: "cloche", f: 659.3, g: 0.07 }, { t: t0 + d - 1.08, son: "cloche", f: 987.8, g: 0.07 }, { t: t0 + d - 0.7, son: "souffle", d: 0.7, g: 0.55, monte: true }); }
    else if (type === "pastille") { const tFin = Math.max(1.2, d - 1.2); sons.push({ t: t0, son: "souffle", d: 0.5, g: 0.14 }); frappe(String(e.texte ?? ""), t0 + 0.6, t0 + tFin); sons.push({ t: t0 + d - 0.98, son: "entree" }, { t: t0 + d - 0.9, son: "note", f: 880, g: 0.1 }, { t: t0 + d - 0.45, son: "souffle", d: 0.4, g: 0.14 }); }
    else if (type === "impact") { sons.push({ t: t0, son: "coup", f: 46, g: nImpact++ ? 0.9 : 1 }, { t: t0 + d - 0.2, son: "souffle", d: 0.2, g: 0.2 }); }
    else if (type === "pilules") { const n = Math.max(1, (e.items ?? []).length), tourne = d - 0.9; for (let k = 0; k < n - 1; k++) sons.push({ t: t0 + 0.25 + tourne * (1 - Math.pow(1 - (k + 0.5) / (n - 1), 1 / 2.6)), son: "bois", g: 0.35 }); sons.push({ t: t0 + 0.25 + tourne, son: "cloche", f: 880, g: 0.1 }, { t: t0 + d - 0.25, son: "souffle", d: 0.25, g: 0.15 }); }
    else if (type === "aplat") { const n = String(e.texte ?? "").split(/\s+/).filter(Boolean).length; for (let k = 0; k < Math.min(n, 6); k++) sons.push({ t: t0 + k * 0.13, son: "pop", f: [392, 494, 587, 659, 784, 880][k], g: 0.2 }); sons.push({ t: t0 + d - 0.3, son: "souffle", d: 0.3, g: 0.2 }); }
    else if (type === "logo") { sons.push({ t: t0, son: "sifflet", d: 0.42, g: 0.12 }, { t: t0 + 0.42, son: "coup", f: 70, g: 0.8 }, { t: t0 + 0.76, son: "coup", f: 90, g: 0.3 }, { t: t0 + 0.5, son: "souffle", d: 0.9, g: 0.18 }); [261.6, 392, 523.3, 587.3, 784].forEach((f, k) => sons.push({ t: t0 + 0.72 + k * 0.045, son: "cloche", f, g: 0.085, d: 4 })); }
    else if (i > 0) sons.push({ t: t0, son: "souffle", d: 0.3, g: 0.15 });
    t0 += d;
  });
  return sons.sort((a, b) => a.t - b.t);
}
export const POLICE_MOTION = "Inter Tight";
let TAMPON = null;
function tampon(W, H) {
  if (!TAMPON) { const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(W, H) : Object.assign(document.createElement("canvas"), { width: W, height: H }); TAMPON = { canvas, ctx: canvas.getContext("2d") }; }
  const { canvas, ctx } = TAMPON; if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = "transparent"; if ("filter" in ctx) ctx.filter = "none"; ctx.setLineDash([]); ctx.clearRect(0, 0, W, H);
  return TAMPON;
}
export function dessinerScenes(ctx, W, H, t, script, { logo = null, ecrans = null, images = null, filigrane = false } = {}) {
  LOGO = logo; IMAGES = images && typeof images === "object" ? images : {}; ECRANS = ecrans && typeof ecrans === "object" ? ecrans : {}; ECRANS_L = Object.values(ECRANS).filter(Boolean);
  LOOK = LOOKS.includes(script?.look) ? script.look : "nuit";
  F = `"${policeMotion(script)}", "Inter", "Helvetica Neue", Arial, system-ui, sans-serif`;
  serre(ctx, "-0.01em");
  const FOND = LOOK === "editorial" || LOOK === "minimal" || LOOK === "pop" || LOOK === "clair" || LOOK === "aura" || LOOK === "film" || LOOK === "prisme" ? "blanc" : LOOK === "verre" || LOOK === "lueur" ? "noir" : script?.fond === "blanc" ? "blanc" : "noir";
  // Pop : graisse moyenne partout (les titres très gras deviennent des linéales serrées, comme une pub de marque)
  const policeCtx = LOOK === "pop" ? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ctx), "font") : null;
  if (policeCtx?.set) try { Object.defineProperty(ctx, "font", { configurable: true, get() { return policeCtx.get.call(this); }, set(v) { policeCtx.set.call(this, String(v).replace(/^(italic )?(\d{3}) /, (m, it, w) => `${it || ""}${Math.min(+w, 600)} `)); } }); } catch { /* contexte figé */ }
  C = hexRgb(script?.couleur); palette(FOND);
  // En vertical (téléphone), tout est un peu plus grand : la vidéo se regarde sur un petit écran
  const vertical = H > W * 1.2, u = (Math.min(W, H) / 1080) * (vertical ? 1.42 : W > H * 1.2 ? 1.62 : 1.4);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; if ("filter" in ctx) ctx.filter = "none";
  fond(ctx, W, H, t, u);
  const scenes = (script?.scenes ?? []).filter((x) => SCENES[x?.type]);
  { let r = 0; RANGS = scenes.map((x) => (x.type === "impact" ? r++ : 0)); }
  const MP = LOOK === "pop" ? modesPop(scenes) : null;
  let de = 0;
  for (let i = 0; i < scenes.length; i++) {
    const e = scenes[i], d = dureeScene(e), a = de + d; de = a;
    if (t < a - d - 0.01 || t > a + 0.01) continue;
    const local = t - (a - d), derniere = i === scenes.length - 1;
    const ent = eo(prog(local, 0, 0.45)), sort = derniere ? 0 : eio(prog(local, d - 0.32, d));
    // Fond propre à la scène (couleur pleine, blanc, noir) : il apparaît avec elle
    // Éditorial et minimal restent clairs (le noir devient le fond de la vidéo) ; pop alterne papier clair, couleur pleine et couleur très foncée
    let modeScene = ["couleur", "blanc", "noir"].includes(e.fond) ? e.fond : FOND;
    if ((LOOK === "editorial" || LOOK === "minimal") && modeScene === "noir") modeScene = "blanc";
    if (MP) modeScene = MP[i];
    if (LOOK === "verre" || LOOK === "lueur") modeScene = "noir";
    if (LOOK === "clair" || LOOK === "aura" || LOOK === "film" || LOOK === "prisme") modeScene = "blanc";
    palette(modeScene);
    if (modeScene !== FOND) { ctx.save(); ctx.globalAlpha = MP ? 1 : Math.min(1, ent * 1.6) * (1 - sort); fond(ctx, W, H, t, u); ctx.restore(); }
    ctx.save();
    // Caméra : léger zoom continu ; entrée nette depuis un flou, sortie en zoom avant + flou
    // Chaque allure a sa propre façon de bouger (sinon toutes les vidéos se ressemblent)
    if (LOOK === "pop") {
      // Pop : le fond change d'un coup, le contenu monte du bas (vite, puis se pose) et repart par le haut
      const pz = pulsation(script, t); ctx.translate(W / 2, H / 2); ctx.scale(pz, pz); ctx.translate(-W / 2, -H / 2);
      const arr = 1 - Math.pow(1 - prog(local, 0, 0.42), 4), dep = derniere ? 0 : Math.pow(prog(local, d - 0.2, d), 3);
      ctx.translate(0, (1 - arr) * H * 0.55 - dep * H * 0.6);
      ctx.globalAlpha = 1; if ("filter" in ctx) ctx.filter = "none";
    } else if (LOOK === "editorial") {
      // Éditorial : glisse lentement vers le haut et apparaît en fondu, comme on tourne la page ; rien ne zoome
      const y = (1 - ent) * 46 * u - sort * 30 * u;
      ctx.translate(0, y); ctx.globalAlpha = ent * (1 - sort); if ("filter" in ctx) ctx.filter = "none";
    } else if (LOOK === "minimal") {
      // Minimal : simple fondu, très léger agrandissement, aucun effet
      const k = 0.985 + ent * 0.015; ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha = ent * (1 - sort); if ("filter" in ctx) ctx.filter = "none";
    } else if (LOOK === "film") {
      // Film : aucune caméra commune, chaque plan règle lui-même son entrée et sa sortie (coupes franches)
      ctx.globalAlpha = 1; if ("filter" in ctx) ctx.filter = "none";
    } else if (LOOK === "aura") {
      // Aura : le plan arrive en grossissant depuis le flou, et repart en fonçant vers nous
      const es = derniere ? 0 : Math.pow(prog(local, d - 0.24, d), 2), k = 0.9 + ent * 0.1 + (local / d) * 0.04 + es * 0.5;
      ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha = Math.min(1, ent * 1.4) * (1 - es); if ("filter" in ctx) ctx.filter = (1 - ent) + es > 0.02 ? `blur(${((1 - ent) * 12 + es * 20) * u}px)` : "none";
    } else if (LOOK === "clair") {
      // Clair : le plan sort du flou en s'approchant un peu, et repart en filant vers la gauche
      const es = derniere ? 0 : Math.pow(prog(local, d - 0.26, d), 2), k = 0.93 + ent * 0.07 + (local / d) * 0.03;
      ctx.translate(W / 2 - es * W * 0.2, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha = Math.min(1, ent * 1.4) * (1 - es); if ("filter" in ctx) ctx.filter = (1 - ent) + es > 0.02 ? `blur(${((1 - ent) * 14 + es * 18) * u}px)` : "none";
    } else if (LOOK === "prisme") {
      // Prisme : la caméra dérive en douceur et tourne à peine ; le plan entre en sortant du flou, sort en s'éloignant
      const es = derniere ? 0 : Math.pow(prog(local, d - 0.3, d), 2), k = 1.04 - (local / d) * 0.04 + (1 - ent) * 0.06 - es * 0.06;
      ctx.translate(W / 2 + Math.sin(t * 0.35) * 14 * u, H / 2); ctx.rotate(Math.sin(t * 0.25) * 0.012); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha = Math.min(1, ent * 1.4) * (1 - es); if ("filter" in ctx) ctx.filter = (1 - ent) + es > 0.02 ? `blur(${((1 - ent) * 14 + es * 16) * u}px)` : "none";
    } else if (LOOK === "lueur") {
      // Lueur : la caméra glisse et avance doucement ; le plan sort en fonçant vers nous dans un flou violet
      const es = derniere ? 0 : Math.pow(prog(local, d - 0.3, d), 2), k = 1 + (local / d) * 0.05 - (1 - ent) * 0.18 + es * 0.8;
      ctx.translate(W / 2 + Math.sin(t * 0.4) * 10 * u, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha = Math.min(1, ent * 1.4) * (1 - es); if ("filter" in ctx) ctx.filter = (1 - ent) + es > 0.02 ? `blur(${((1 - ent) * 12 + es * 24) * u}px)` : "none";
    } else if (LOOK === "verre") {
      // Verre : la caméra avance tout le temps ; le plan qui part fonce vers nous en se floutant, le suivant arrive de loin
      const es = derniere ? 0 : Math.pow(prog(local, d - 0.3, d), 2), k = 1 + (local / d) * 0.06 - (1 - ent) * 0.22 + es * 0.9;
      ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha = Math.min(1, ent * 1.4) * (1 - es); if ("filter" in ctx) ctx.filter = (1 - ent) + es > 0.02 ? `blur(${((1 - ent) * 10 + es * 26) * u}px)` : "none";
    } else {
      const k = (1 + local / d * 0.035 + (1 - ent) * 0.05 + sort * 0.08) * pulsation(script, t);
      ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha = Math.min(1, ent * 1.2) * (1 - sort);
      if ("filter" in ctx) ctx.filter = (1 - ent) + sort > 0.02 ? `blur(${((1 - ent) * 16 + sort * 22) * u}px)` : "none";
    }
    // Éditorial et minimal : aucun halo lumineux (le réglage d'ombre des scènes est ignoré le temps de la scène)
    const sansHalo = LOOK === "editorial" || LOOK === "minimal";
    if (sansHalo) try { Object.defineProperty(ctx, "shadowBlur", { configurable: true, get: () => 0, set: () => {} }); } catch { /* contexte figé */ }
    // Verre, clair, aura : pendant les entrées et sorties floues, le plan est d'abord dessiné à part puis posé en une fois.
    // Sans cela le navigateur floute chaque pièce une par une (des centaines par image) et l'export ne finit jamais.
    const ctxEcran = ctx, hors = ["verre", "clair", "aura", "lueur", "prisme"].includes(LOOK) && "filter" in ctx && ctx.filter !== "none" ? tampon(W, H) : null;
    if (hors) ctx = hors.ctx;
    try { ((LOOK === "prisme" && PRISME[e.type]) || (LOOK === "lueur" && LUEUR[e.type]) || (LOOK === "verre" && VERRE[e.type]) || (LOOK === "clair" && CLAIR[e.type]) || (LOOK === "aura" && AURA[e.type]) || (LOOK === "film" && FILM[e.type]) || SCENES[e.type])(ctx, { W, H, u, t: local, d, vertical, i, nom: script.nom ?? "", lien: script.lien ?? "" }, e); }
    catch (x) { console.warn("scène", e.type, x); }
    finally { if (hors) { ctx = ctxEcran; ctx.drawImage(hors.canvas, 0, 0, W, H); } if (sansHalo) try { delete ctx.shadowBlur; } catch { /* rien */ } ctx.restore(); }
    // Vague de couleur qui balaie l'écran à l'entrée de la scène (style Jiwa)
    if (e.transition === "vague" && local < 0.7 && LOOK !== "verre" && LOOK !== "lueur" && LOOK !== "prisme" && LOOK !== "clair" && LOOK !== "aura" && LOOK !== "film") {
      const q = eio(prog(local, 0, 0.7));
      ctx.save(); ctx.fillStyle = rgba(C, 1);
      if (LOOK === "pop") {
        // Pop : un anneau épais part du coin bas gauche et traverse l'écran (blanc sur la couleur, couleur sur le blanc)
        const R = q * Math.hypot(W, H) * 1.45, ep = Math.max(W, H) * 0.3 * Math.sin(q * Math.PI);
        if (ep > 1) { ctx.strokeStyle = MODE === "couleur" ? "#fff" : rgba(C, 1); ctx.lineWidth = ep; ctx.beginPath(); ctx.arc(-W * 0.12, H * 1.1, R, 0, Math.PI * 2); ctx.stroke(); }
      } else if (LOOK === "editorial") {
        // Éditorial : un rideau qui monte, droit, comme une page qui se tourne
        const h = H * (q < 0.5 ? q * 2 : 2 - q * 2), y0 = q < 0.5 ? H - h : 0; ctx.fillRect(0, y0, W, h);
      } else if (LOOK === "minimal") {
        // Minimal : un cercle qui s'ouvre puis se referme au centre
        const r = Math.max(W, H) * 0.75 * Math.sin(q * Math.PI); ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.fill();
      } else {
        const x = -W * 0.4 + q * W * 1.9; ctx.beginPath(); ctx.moveTo(x - W * 0.6, 0); ctx.lineTo(x, 0);
        ctx.bezierCurveTo(x + W * 0.25, H * 0.3, x - W * 0.25, H * 0.7, x, H); ctx.lineTo(x - W * 0.6, H); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }
  // Verre : un point de lumière s'allume au centre à chaque changement de plan, comme si le plan suivant en sortait
  if (LOOK === "verre") {
    let tc = 0;
    scenes.slice(0, -1).forEach((e) => {
      tc += dureeScene(e); const q = prog(t, tc - 0.2, tc + 0.3); if (q <= 0 || q >= 1) return;
      const k = Math.sin(q * Math.PI);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); if ("filter" in ctx) ctx.filter = "none"; ctx.globalAlpha = k; ctx.fillStyle = "#fff"; ctx.shadowColor = "#fff"; ctx.shadowBlur = (40 + k * 80) * u;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, (3 + k * 7) * u, 0, Math.PI * 2); ctx.fill(); ctx.fill(); ctx.restore();
    });
  }
  if (LOOK === "nuit" || LOOK === "clair") {
    let de4 = 0;
    scenes.forEach((e, j) => {
      const d = dureeScene(e), loc = t - de4; de4 += d;
      const trace = (n, tete, queue) => {
        if (tete - queue < 0.004 || ["logo", "aplat", "personnage"].includes(scenes[n]?.type) || (LOOK === "clair" && (["rature", "image", "impact"].includes(scenes[n]?.type) || ["rature", "image"].includes(scenes[n + 1]?.type)))) return;
        const sens = n % 2 ? -1 : 1, y0 = H * (0.66 + 0.1 * ((n * 7) % 3 - 1)), P = [[-W * 0.05, y0], [W * 0.3, y0 + sens * H * 0.16], [W * 0.62, y0 - sens * H * 0.22], [W * 1.05, y0 - sens * H * 0.05]];
        const pt = (q) => { const m = 1 - q; return [m * m * m * P[0][0] + 3 * m * m * q * P[1][0] + 3 * m * q * q * P[2][0] + q * q * q * P[3][0], m * m * m * P[0][1] + 3 * m * m * q * P[1][1] + 3 * m * q * q * P[2][1] + q * q * q * P[3][1]]; };
        palette(LOOK === "clair" ? "blanc" : ["couleur", "blanc", "noir"].includes(scenes[j].fond) ? scenes[j].fond : FOND);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; if ("filter" in ctx) ctx.filter = "none"; ctx.shadowBlur = 0;
        ctx.strokeStyle = rgba(LOOK === "clair" ? C : CV, 1); ctx.lineWidth = Math.max(2, (LOOK === "clair" ? 9 : 4) * u); ctx.lineCap = "round"; ctx.beginPath();
        for (let q = queue; q <= tete + 0.0001; q += 0.015) { const [x, y] = pt(Math.min(q, tete)); q === queue ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke(); ctx.restore();
      };
      if (loc >= 0 && loc < d) {
        if (j < scenes.length - 1) trace(j, eio(prog(loc, d - 0.85, d - 0.05)), 0);
        if (j > 0) trace(j - 1, 1, eio(prog(loc, 0, 0.6)));
      }
    });
  }
  // Habillage, comme un générique de marque : le nom en petites capitales en haut (s'il n'y a pas de logo), le numéro de la
  // scène, et un fil d'avancement en bas. Absent des scènes plein cadre (impact, aplat, fin).
  {
    let de3 = 0, k = -1, a = 0; const tot = scenes.reduce((x, e) => x + dureeScene(e), 0) || 1;
    scenes.forEach((e, j) => { const d = dureeScene(e); if (t >= de3 && t < de3 + d) { k = j; a = ["aplat", "logo", "impact", "personnage"].includes(e.type) ? 0 : Math.min(1, (t - de3) / 0.45, (de3 + d - t) / 0.3); } de3 += d; });
    if (k >= 0 && a > 0.01 && LOOK === "minimal") {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); if ("filter" in ctx) ctx.filter = "none"; ctx.shadowBlur = 0; ctx.globalAlpha = a;
      const mx = W * 0.07, yh = vertical ? H * 0.062 : H * 0.085, tl = 26 * u;
      ctx.font = `700 ${tl}px ${F}`; ctx.textBaseline = "middle"; serre(ctx, "0.12em"); ctx.fillStyle = INK2(0.72);
      if (!LOGO?.width && script?.nom) { ctx.textAlign = "left"; ctx.fillText(String(script.nom).toUpperCase().slice(0, 28), mx, yh); }
      if (!filigrane) { ctx.textAlign = "right"; ctx.fillText(`${String(k + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}`, W - mx, yh); }
      serre(ctx, "-0.01em");
      const yb = vertical ? H * 0.945 : H * 0.93, lw = W - mx * 2, ep = Math.max(2, 3 * u);
      ctx.fillStyle = INK2(0.16); ctx.fillRect(mx, yb, lw, ep); ctx.fillStyle = INK2(0.85); ctx.fillRect(mx, yb, lw * clamp(t / tot), ep);
      ctx.restore();
    }
  }
  // Son logo en petit, en haut, pendant toute la vidéo (sauf l'aplat et la fin, où il est en grand)
  if (LOGO?.width && LOOK !== "film") {
    let a = 0, de2 = 0;
    for (const e of scenes) { const d = dureeScene(e); if (t >= de2 && t < de2 + d) a = ["aplat", "logo", "impact"].includes(e.type) ? 0 : Math.min(1, (t - de2) / 0.4, (de2 + d - t) / 0.3); de2 += d; }
    if (a > 0.01 && LOGO?.width) { ctx.save(); ctx.globalAlpha = a * 0.95; if ("filter" in ctx) ctx.filter = "none"; const hl = 40 * u, kl = Math.min(LOGO.width / LOGO.height, 3.2); plaqueLogo(ctx, 40 * u + hl * 0.32 + (hl * kl) / 2, 40 * u + hl * 0.82, hl, u); ctx.restore(); }
  }
  // Habillage propre à chaque allure, par-dessus les scènes
  let iCour = 0, modeCour = FOND; { let de3 = 0; for (let j = 0; j < scenes.length; j++) { const dj = dureeScene(scenes[j]); if (t >= de3) { iCour = j; modeCour = ["couleur", "blanc", "noir"].includes(scenes[j].fond) ? scenes[j].fond : FOND; } de3 += dj; } }
  if ((LOOK === "editorial" || LOOK === "minimal") && modeCour === "noir") modeCour = "blanc";
  if (MP) modeCour = MP[iCour];
  if (LOOK === "verre" || LOOK === "lueur") modeCour = "noir";
  if (LOOK === "clair" || LOOK === "aura" || LOOK === "film" || LOOK === "prisme") modeCour = "blanc";
  palette(modeCour); ctx.globalAlpha = 1; if ("filter" in ctx) ctx.filter = "none"; ctx.shadowBlur = 0;
  const derniere = iCour === scenes.length - 1;
  if (LOOK === "editorial" && !derniere) {
    // Numéro de page en haut à gauche, nom de la marque en italique en haut à droite
    ctx.save(); ctx.fillStyle = INK2(0.7); ctx.textBaseline = "middle"; ctx.font = `600 ${22 * u}px ${F}`; ctx.textAlign = "left";
    ctx.fillText(`${String(iCour + 1).padStart(2, "0")} — ${String(scenes.length).padStart(2, "0")}`, W * 0.08, H * 0.045);
    ctx.textAlign = "right"; ctx.font = `italic 600 ${24 * u}px ${F}`; ctx.fillText(script.nom ?? "", W * 0.92, H * 0.045); ctx.restore();
  }
  if (policeCtx?.set) try { delete ctx.font; } catch { /* rien */ }
  // « Fait avec Bingoo! » en haut à droite, sur toutes les vidéos sauf l'offre Lancer Pro (comme le badge des sites)
  if (filigrane) {
    const uu = Math.min(W, H) / 1080, txt = "Fait avec Bingoo!";
    ctx.save(); ctx.globalAlpha = 0.92; ctx.font = `700 ${26 * uu}px "Plus Jakarta Sans", "Inter", system-ui, sans-serif`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    const tw = ctx.measureText(txt).width, ph = 46 * uu, pw = tw + 36 * uu, x = W - pw - 28 * uu, y = 28 * uu;
    rond(ctx, x, y, pw, ph, ph / 2); ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.fill();
    ctx.fillStyle = "#1E2030"; ctx.fillText("Fait avec ", x + 18 * uu, y + ph / 2 + 1 * uu);
    const w1 = ctx.measureText("Fait avec ").width; ctx.fillStyle = "#E8571C"; ctx.fillText("Bingoo!", x + 18 * uu + w1, y + ph / 2 + 1 * uu);
    ctx.restore();
  }
}
