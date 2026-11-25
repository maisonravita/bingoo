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

export const DUREES = { personnage: 3.8, image: 3.2, ecran_vitre: 3.2, ecran_zoom: 3.4, ecran_cascade: 3.2, ecran_defile: 3.4, ecran_split: 3, ecran_mur: 3, ecran_curseur: 3.4, ecran_telephone: 3.2, impact: 1.4, liste: 3.2, choix: 3, rature: 2.8, mots: 2.6, objet: 3.2, pilules: 3.2, compteur: 2.8, barres: 3, pastille: 1.8, cartes: 2.8, aplat: 2.2, logo: 3 };
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
export const LOOKS = ["nuit", "pop", "editorial", "minimal"];
let LOOK = "nuit";
// Les vrais écrans du SaaS ou du site du membre (captures de son produit), par titre : { titre: image }
let ECRANS = {}, ECRANS_L = [];
// Les images de la vidéo (photos du membre ou images créées pour lui), par identifiant : { IMG_1: image chargée }
let IMAGES = {};
const ecranDe = (titre, i = 0) => { const n = (x) => String(x ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); const k = Object.keys(ECRANS).find((x) => n(x) === n(titre)); return (k && ECRANS[k]) || ECRANS_L[i % Math.max(1, ECRANS_L.length)] || null; };
export const policeMotion = (script) => ({ editorial: "Fraunces", minimal: "Plus Jakarta Sans" }[LOOKS.includes(script?.look) ? script.look : "nuit"] ?? "Inter Tight");
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
      ctx.fillStyle = INK; ctx.font = `600 ${(courte ? 54 : 46) * u * ve}px ${F}`; ctx.fillText(x.texte, x0 + 90 * u * ve + (1 - p) * 30 * u, y);
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
  // L'image de ce dont on parle (photo du membre ou image créée), dans un cadre arrondi qui monte, avec sa phrase dessous.
  // L'image avance doucement dans son cadre ; sans image chargée, la phrase seule.
  image(ctx, s, e) {
    const { W, H, u, t, vertical } = s, img = IMAGES[e.image];
    if (!img?.width) return SCENES.mots(ctx, s, { texte: e.texte || s.nom, accent: e.accent });
    const p = 1 - Math.pow(1 - prog(t, 0, 0.6), 4), a = vertical ? 1.12 : 0.62;
    const w = vertical ? W * 0.8 : Math.min(W * 0.4, H * 1.0), h = w * a, x = vertical ? (W - w) / 2 : W * 0.07, y = vertical ? H * 0.13 : (H - h) / 2, r = (LOOK === "minimal" ? 10 : 44) * u;
    ctx.save(); ctx.translate(0, LOOK === "pop" ? 0 : (1 - p) * 90 * u); ctx.globalAlpha *= Math.min(1, p * 1.5);
    if (LOOK !== "pop" && LOOK !== "minimal") { ctx.save(); ctx.shadowColor = NOIR ? rgba(C, 0.45) : "rgba(15,20,40,.28)"; ctx.shadowBlur = 80 * u; ctx.shadowOffsetY = 30 * u; rond(ctx, x, y, w, h, r); ctx.fillStyle = "#000"; ctx.fill(); ctx.restore(); }
    ctx.save(); rond(ctx, x, y, w, h, r); ctx.clip();
    const k = Math.max(w / img.width, h / img.height) * (1.12 - 0.08 * prog(t, 0, s.d)), iw = img.width * k, ih = img.height * k;
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); ctx.restore();
    if (LOOK === "pop") { rond(ctx, x, y, w, h, r); ctx.strokeStyle = MODE === "couleur" ? "#fff" : rgba(C, 1); ctx.lineWidth = Math.max(4, 8 * u); ctx.stroke(); }
    ctx.restore();
    if (e.texte) {
      const lx = vertical ? W / 2 : x + w + (W - x - w) / 2, ly = vertical ? y + h + (H - y - h) * 0.42 : H / 2, largeur = vertical ? W * 0.84 : W - x - w - W * 0.1;
      serre(ctx, "-0.035em"); const taille = remplit(ctx, e.texte, (LOOK === "nuit" ? 92 : 124) * u, largeur, vertical ? 2 : 3); serre(ctx, "-0.01em");
      motsAnimes(ctx, e.texte, e.accent, lx, ly, { taille, poids: 800, largeur, t: t - 0.25, decale: 0.08 });
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
export const POLICE_MOTION = "Inter Tight";
export function dessinerScenes(ctx, W, H, t, script, { logo = null, ecrans = null, images = null, filigrane = false } = {}) {
  LOGO = logo; IMAGES = images && typeof images === "object" ? images : {}; ECRANS = ecrans && typeof ecrans === "object" ? ecrans : {}; ECRANS_L = Object.values(ECRANS).filter(Boolean);
  LOOK = LOOKS.includes(script?.look) ? script.look : "nuit";
  F = `"${policeMotion(script)}", "Inter", "Helvetica Neue", Arial, system-ui, sans-serif`;
  serre(ctx, "-0.01em");
  const FOND = LOOK === "editorial" || LOOK === "minimal" || LOOK === "pop" ? "blanc" : script?.fond === "blanc" ? "blanc" : "noir";
  // Pop : graisse moyenne partout (les titres très gras deviennent des linéales serrées, comme une pub de marque)
  const policeCtx = LOOK === "pop" ? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ctx), "font") : null;
  if (policeCtx?.set) try { Object.defineProperty(ctx, "font", { configurable: true, get() { return policeCtx.get.call(this); }, set(v) { policeCtx.set.call(this, String(v).replace(/^(italic )?(\d{3}) /, (m, it, w) => `${it || ""}${Math.min(+w, 600)} `)); } }); } catch { /* contexte figé */ }
  C = hexRgb(script?.couleur); palette(FOND);
  // En vertical (téléphone), tout est un peu plus grand : la vidéo se regarde sur un petit écran
  const vertical = H > W * 1.2, u = (Math.min(W, H) / 1080) * (vertical ? 1.42 : W > H * 1.2 ? 1.62 : 1.4);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; if ("filter" in ctx) ctx.filter = "none";
  fond(ctx, W, H, t, u);
  const scenes = (script?.scenes ?? []).filter((x) => SCENES[x?.type]);
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
    } else {
      const k = (1 + local / d * 0.035 + (1 - ent) * 0.05 + sort * 0.08) * pulsation(script, t);
      ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha = Math.min(1, ent * 1.2) * (1 - sort);
      if ("filter" in ctx) ctx.filter = (1 - ent) + sort > 0.02 ? `blur(${((1 - ent) * 16 + sort * 22) * u}px)` : "none";
    }
    // Éditorial et minimal : aucun halo lumineux (le réglage d'ombre des scènes est ignoré le temps de la scène)
    const sansHalo = LOOK === "editorial" || LOOK === "minimal";
    if (sansHalo) try { Object.defineProperty(ctx, "shadowBlur", { configurable: true, get: () => 0, set: () => {} }); } catch { /* contexte figé */ }
    try { SCENES[e.type](ctx, { W, H, u, t: local, d, vertical, i, nom: script.nom ?? "", lien: script.lien ?? "" }, e); }
    catch (x) { console.warn("scène", e.type, x); }
    finally { if (sansHalo) try { delete ctx.shadowBlur; } catch { /* rien */ } ctx.restore(); }
    // Vague de couleur qui balaie l'écran à l'entrée de la scène (style Jiwa)
    if (e.transition === "vague" && local < 0.7) {
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
  if (LOOK === "nuit") {
    let de4 = 0;
    scenes.forEach((e, j) => {
      const d = dureeScene(e), loc = t - de4; de4 += d;
      const trace = (n, tete, queue) => {
        if (tete - queue < 0.004 || ["logo", "aplat", "personnage"].includes(scenes[n]?.type)) return;
        const sens = n % 2 ? -1 : 1, y0 = H * (0.66 + 0.1 * ((n * 7) % 3 - 1)), P = [[-W * 0.05, y0], [W * 0.3, y0 + sens * H * 0.16], [W * 0.62, y0 - sens * H * 0.22], [W * 1.05, y0 - sens * H * 0.05]];
        const pt = (q) => { const m = 1 - q; return [m * m * m * P[0][0] + 3 * m * m * q * P[1][0] + 3 * m * q * q * P[2][0] + q * q * q * P[3][0], m * m * m * P[0][1] + 3 * m * m * q * P[1][1] + 3 * m * q * q * P[2][1] + q * q * q * P[3][1]]; };
        palette(["couleur", "blanc", "noir"].includes(scenes[j].fond) ? scenes[j].fond : FOND);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; if ("filter" in ctx) ctx.filter = "none"; ctx.shadowBlur = 0;
        ctx.strokeStyle = rgba(CV, 1); ctx.lineWidth = Math.max(2, 4 * u); ctx.lineCap = "round"; ctx.beginPath();
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
  if (LOGO?.width) {
    let a = 0, de2 = 0;
    for (const e of scenes) { const d = dureeScene(e); if (t >= de2 && t < de2 + d) a = ["aplat", "logo", "impact"].includes(e.type) ? 0 : Math.min(1, (t - de2) / 0.4, (de2 + d - t) / 0.3); de2 += d; }
    if (a > 0.01 && LOGO?.width) { ctx.save(); ctx.globalAlpha = a * 0.95; if ("filter" in ctx) ctx.filter = "none"; const hl = 40 * u, kl = Math.min(LOGO.width / LOGO.height, 3.2); plaqueLogo(ctx, 40 * u + hl * 0.32 + (hl * kl) / 2, 40 * u + hl * 0.82, hl, u); ctx.restore(); }
  }
  // Habillage propre à chaque allure, par-dessus les scènes
  let iCour = 0, modeCour = FOND; { let de3 = 0; for (let j = 0; j < scenes.length; j++) { const dj = dureeScene(scenes[j]); if (t >= de3) { iCour = j; modeCour = ["couleur", "blanc", "noir"].includes(scenes[j].fond) ? scenes[j].fond : FOND; } de3 += dj; } }
  if ((LOOK === "editorial" || LOOK === "minimal") && modeCour === "noir") modeCour = "blanc";
  if (MP) modeCour = MP[iCour];
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
