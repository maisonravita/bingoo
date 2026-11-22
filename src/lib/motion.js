// Moteur de motion design « pub premium » (façon Opal, Velobank) : une suite de scènes composée par l'IA,
// dessinée image par image sur un canvas aux couleurs de la marque, puis exportée dans le navigateur.
// Langage visuel : fond noir profond ou blanc vignetté, objets lumineux posés sur un halo, mots qui arrivent un par un
// (un mot clé en couleur), chiffres qui comptent (seulement ceux donnés par la personne), aplat couleur, logo qui sort du flou.

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eo = (x) => 1 - Math.pow(1 - x, 3);
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const ressort = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.cos(x * Math.PI * 2.2) * Math.exp(-x * 5.5));
const hexRgb = (h) => { const n = parseInt(String(/^#[0-9a-f]{6}$/i.test(h ?? "") ? h : "#4F46E5").slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (c, d, k) => c.map((v, i) => Math.round(v + (d[i] - v) * k));
const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

export const DUREES = { impact: 1.4, liste: 3.2, choix: 3, rature: 2.8, mots: 2.6, objet: 3.2, pilules: 3.2, compteur: 2.8, barres: 3, pastille: 1.8, cartes: 2.8, aplat: 2.2, logo: 3 };
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
function serre(ctx, v) { try { ctx.letterSpacing = v; } catch { /* navigateur sans espacement de lettres */ } }
// Taille de police pour qu'une ligne tienne dans la largeur
function ajuste(ctx, texte, taille, largeur, poids = 800) { ctx.font = `${poids} ${taille}px ${F}`; const w = ctx.measureText(texte).width; return w > largeur ? taille * largeur / w : taille; }
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
function plaqueLogo(ctx, cx, cy, hauteur, u, ombre = true) {
  if (!LOGO?.width) return false;
  const k = LOGO.width / LOGO.height, h = hauteur, w = Math.min(h * k, h * 3.2), ih = Math.min(h, w / k), pad = h * 0.32;
  ctx.save(); if (ombre) { ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 40 * u; ctx.shadowOffsetY = 10 * u; }
  rond(ctx, cx - w / 2 - pad, cy - h / 2 - pad, w + pad * 2, h + pad * 2, Math.min(h * 0.45, 40 * u)); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
  ctx.drawImage(LOGO, cx - (ih * k) / 2, cy - ih / 2, ih * k, ih); return true;
}
// Contexte de dessin courant (posé à chaque image)
let F = "system-ui", C = [79, 70, 229], CV = C, NOIR = true, INK = "#fff", INK2 = (a) => `rgba(255,255,255,${a})`;

// Palette selon le fond de la scène : noir, blanc, ou couleur de la marque (plein écran)
let MODE = "noir";
function palette(mode) {
  MODE = mode; NOIR = mode !== "blanc" && !(mode === "couleur" && lum(C) > 0.62);
  if (mode === "couleur") { CV = NOIR ? [255, 255, 255] : [14, 15, 19]; }
  else CV = NOIR ? (lum(C) < 0.35 ? mix(C, [255, 255, 255], 0.35) : C) : (lum(C) > 0.7 ? mix(C, [0, 0, 0], 0.35) : C);
  INK = NOIR ? "#fff" : "#0E0F13"; INK2 = NOIR ? (a) => `rgba(255,255,255,${a})` : (a) => `rgba(14,15,19,${a})`;
}
function fond(ctx, W, H, t, u) {
  if (MODE === "couleur") {
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, rgba(mix(C, [255, 255, 255], 0.1), 1)); g.addColorStop(1, rgba(mix(C, [0, 0, 0], 0.18), 1)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const px = W * (0.3 + Math.sin(t * 0.3) * 0.2), R = Math.max(W, H) * 0.6, r = ctx.createRadialGradient(px, H * 0.2, 0, px, H * 0.2, R); r.addColorStop(0, "rgba(255,255,255,.18)"); r.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
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
function motsAnimes(ctx, texte, accent, x, y, { taille, largeur, t, poids = 700, decale = 0.11, couleur = INK, aligne = "centre" }) {
  ctx.font = `${poids} ${taille}px ${F}`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  const gros = taille >= 90; serre(ctx, gros ? "-0.035em" : "-0.01em");
  const lignes = coupe(ctx, texte, largeur), inter = taille * (gros ? 1.02 : 1.15), h = lignes.length * inter, espace = taille * 0.26;
  const acc = String(accent || "").toLowerCase().split(/\s+/).filter(Boolean);
  let i = 0;
  lignes.forEach((l, k) => {
    const mots = l.split(" "), w = mots.reduce((a, m) => a + ctx.measureText(m).width, 0) + espace * (mots.length - 1); let cx = aligne === "centre" ? x - w / 2 : x; const cy = y - h / 2 + inter * (k + 0.5);
    for (const m of mots) {
      const p = eo(prog(t, i * decale, i * decale + 0.5)); const mw = ctx.measureText(m).width + espace;
      if (p > 0) {
        const estAcc = acc.includes(m.toLowerCase().replace(/[.,!?;:«»"]/g, ""));
        ctx.save(); ctx.globalAlpha *= p; if ("filter" in ctx) ctx.filter = p < 0.98 ? `blur(${(1 - p) * 10 * (taille / 90)}px)` : "none";
        ctx.fillStyle = estAcc ? rgba(CV, 1) : couleur;
        ctx.fillText(m, cx, cy + (1 - p) * taille * 0.35); ctx.restore();
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
const SCENES = {
  // Un mot géant qui claque (« tap », « done »)
  impact(ctx, s, e) {
    const { W, H, u, t } = s;
    const p = ressort(prog(t, 0, 0.55)); serre(ctx, "-0.05em"); ctx.font = `900 ${380 * u}px ${F}`;
    const w = ctx.measureText(e.texte).width, k = Math.min(1, (W * 0.9) / Math.max(1, w));
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k * (0.6 + 0.4 * p), k * (0.6 + 0.4 * p)); ctx.globalAlpha *= clamp(p * 1.5);
    ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e.texte, 0, 10 * u); ctx.restore(); serre(ctx, "-0.01em");
  },
  // Cartes pastel empilées, comme des notifications (style Notion)
  liste(ctx, s, e) {
    const { W, H, u, t, vertical } = s;
    const items = (e.items ?? []).slice(0, 4), n = items.length, w = Math.min(W * 0.78, 760 * u), h = 130 * u, gap = 26 * u;
    const teintes = [[255, 214, 220], [214, 228, 255], [214, 245, 222], [255, 236, 204]], encres = [[190, 40, 70], [40, 80, 190], [30, 130, 70], [190, 110, 20]];
    const y0 = H * (e.texte ? (vertical ? 0.42 : 0.4) : 0.5) - ((n - 1) * (h + gap)) / 2;
    if (e.texte) motsAnimes(ctx, e.texte, e.accent, W / 2, y0 - h - 40 * u, { taille: (vertical ? 70 : 62) * u, largeur: W * 0.84, t, poids: 700, decale: 0.06 });
    items.forEach((x, i) => {
      const p = ressort(prog(t, 0.3 + i * 0.28, 1 + i * 0.28)); if (p <= 0) return;
      const y = y0 + i * (h + gap) - h / 2, bx = W / 2 - w / 2 + (1 - p) * 260 * u;
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
    if (vertical) { // téléphone : les choix l'un sous l'autre, en grand
      const w = W * 0.82, h = 190 * u, gap = 34 * u, y0 = H * 0.56 - ((n - 1) * (h + gap)) / 2, sel = Math.min(n - 1, 1), choisi = eo(prog(t, 1.4, 1.9));
      if (e.texte) motsAnimes(ctx, e.texte, e.accent, W / 2, y0 - h / 2 - 130 * u, { taille: 84 * u, largeur: W * 0.86, t, decale: 0.06, poids: 800 });
      items.forEach((x, i) => {
        const p = ressort(prog(t, 0.2 + i * 0.2, 0.9 + i * 0.2)); if (p <= 0) return;
        const bx = W / 2 - w / 2 + (1 - p) * 200 * u, by = y0 + i * (h + gap) - h / 2, on = i === sel && choisi > 0;
        ctx.save(); ctx.globalAlpha *= clamp(p * 1.3); if (on) { ctx.shadowColor = rgba(CV, 0.6); ctx.shadowBlur = 60 * u; }
        rond(ctx, bx, by, w, h, 40 * u); ctx.fillStyle = on ? rgba(CV, 1) : NOIR ? "rgba(255,255,255,.06)" : "#fff"; ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = rgba(CV, on ? 1 : 0.5); ctx.lineWidth = 4 * u; ctx.stroke();
        const fg = on ? (MODE === "couleur" ? rgba(C, 1) : lum(CV) > 0.62 ? "#111" : "#fff") : rgba(CV, 1);
        ctx.fillStyle = on ? fg : INK; ctx.font = `800 ${62 * u}px ${F}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(x.texte, bx + 50 * u, by + h / 2 + 3 * u);
        if (on) { ctx.font = `800 ${56 * u}px ${F}`; ctx.textAlign = "right"; ctx.fillText("✓", bx + w - 50 * u, by + h / 2 + 3 * u); }
        ctx.restore();
      });
      return;
    }
    const w = Math.min((W * 0.86 - (n - 1) * 30 * u) / n, 360 * u), h = w * 0.6;
    const tot = n * w + (n - 1) * 30 * u, sel = Math.min(n - 1, 1), choisi = eo(prog(t, 1.4, 1.9));
    if (e.texte) motsAnimes(ctx, e.texte, e.accent, W / 2, H * (vertical ? 0.28 : 0.2), { taille: (vertical ? 74 : 64) * u, largeur: W * 0.84, t, decale: 0.06 });
    items.forEach((x, i) => {
      const p = ressort(prog(t, 0.2 + i * 0.2, 0.9 + i * 0.2)); if (p <= 0) return;
      const bx = W / 2 - tot / 2 + i * (w + 30 * u), by = H * (vertical ? 0.52 : 0.58) - h / 2, on = i === sel && choisi > 0;
      ctx.save(); ctx.globalAlpha *= clamp(p * 1.3); ctx.translate(bx + w / 2, by + h / 2); const k = (0.7 + 0.3 * p) * (on ? 1 + choisi * 0.06 : 1 - choisi * 0.04 * (i !== sel)); ctx.scale(k, k); ctx.translate(-(bx + w / 2), -(by + h / 2));
      if (on) { ctx.shadowColor = rgba(CV, 0.6); ctx.shadowBlur = 50 * u; }
      rond(ctx, bx, by, w, h, 34 * u); ctx.fillStyle = on ? rgba(CV, 1) : NOIR ? "rgba(255,255,255,.06)" : "#fff"; ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba(CV, on ? 1 : 0.55); ctx.lineWidth = 4 * u; ctx.stroke();
      const fg = on ? (MODE === "couleur" ? rgba(C, 1) : lum(CV) > 0.62 ? "#111" : "#fff") : rgba(CV, 1);
      ctx.fillStyle = fg; ctx.font = `800 ${Math.min(56 * u, w / 5.5)}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(x.texte).toUpperCase(), bx + w / 2, by + h / 2);
      ctx.restore();
    });
  },
  // Une phrase barrée puis corrigée (« LE PLUS DUR ? ~~FAIRE LA VIDÉO~~ QU'ON S'ARRÊTE DESSUS »)
  rature(ctx, s, e) {
    const { W, H, u, t, vertical } = s;
    const taille = (vertical ? 96 : 86) * u, larg = W * 0.84;
    ctx.font = `800 ${taille}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const barre = String(e.barre ?? "").toUpperCase(), y1 = H / 2 - taille * 0.9;
    if (e.texte_avant) { const av = String(e.texte_avant).toUpperCase(); ctx.save(); ctx.globalAlpha *= eo(prog(t, 0, 0.35)); ctx.font = `800 ${ajuste(ctx, av, taille, larg)}px ${F}`; ctx.fillStyle = INK; ctx.fillText(av, W / 2, y1 - taille * 1.15); ctx.restore(); }
    const tb = ajuste(ctx, barre, taille, larg);
    const pb = eo(prog(t, 0.15, 0.55)); ctx.save(); ctx.globalAlpha *= pb; ctx.font = `800 ${tb}px ${F}`; ctx.fillStyle = INK2(0.55); ctx.fillText(barre, W / 2, y1); ctx.restore();
    ctx.font = `800 ${tb}px ${F}`; const wb = Math.min(larg, ctx.measureText(barre).width), pr = eio(prog(t, 0.7, 1.05));
    ctx.save(); ctx.strokeStyle = rgba(CV, 1); ctx.lineWidth = 10 * u; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(W / 2 - wb / 2 - 10 * u, y1 + 4 * u); ctx.lineTo(W / 2 - wb / 2 - 10 * u + (wb + 20 * u) * pr, y1 + 4 * u); ctx.stroke(); ctx.restore();
    // La correction, tapée lettre à lettre
    const txt = String(e.texte ?? "").toUpperCase(), nb = Math.floor(txt.length * prog(t, 1.15, 1.15 + txt.length * 0.045));
    ctx.font = `800 ${taille}px ${F}`; const lignes = coupe(ctx, txt.slice(0, nb), larg);
    lignes.forEach((l, k) => { ctx.fillStyle = rgba(CV, 1); ctx.fillText(l, W / 2, y1 + taille * 1.35 + k * taille * 1.08); });
    if (nb < txt.length && Math.floor(t * 4) % 2 === 0) { const l = lignes.at(-1) ?? ""; ctx.fillStyle = rgba(CV, 1); ctx.fillRect(W / 2 + ctx.measureText(l).width / 2 + 8 * u, y1 + taille * 1.35 + (lignes.length - 1) * taille * 1.08 - taille * 0.4, 8 * u, taille * 0.8); }
  },
  mots(ctx, s, e) {
    const { W, H, u, t, vertical } = s;
    if (e.style === "machine") { // majuscules tapées lettre à lettre, le mot clé en couleur (style « Junior »)
      const txt = String(e.texte ?? "").toUpperCase(), nb = Math.floor(txt.length * prog(t, 0.05, 0.05 + txt.length * 0.04));
      // Le mot le plus long doit tenir sur une ligne
      const long = txt.split(" ").sort((a, b) => b.length - a.length)[0] ?? "", taille = ajuste(ctx, long, (vertical ? 110 : 96) * u, W * 0.84);
      ctx.font = `800 ${taille}px ${F}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      const lignes = coupe(ctx, txt, W * 0.84), acc = String(e.accent ?? "").toUpperCase().split(/\s+/).filter(Boolean); let vu = 0;
      lignes.forEach((l, k) => { let x = W / 2 - ctx.measureText(l).width / 2; const y = H / 2 - ((lignes.length - 1) * taille * 1.06) / 2 + k * taille * 1.06;
        for (const m of l.split(" ")) { const reste = Math.max(0, nb - vu), part = m.slice(0, reste); ctx.fillStyle = acc.includes(m.replace(/[.,!?;:]/g, "")) ? rgba(CV, 1) : INK; ctx.fillText(part, x, y); x += ctx.measureText(m + " ").width; vu += m.length + 1; } });
      return;
    }
    const len = String(e.texte || "").length, taille = (vertical ? (len > 36 ? 104 : len > 22 ? 124 : 150) : len > 36 ? 96 : len > 22 ? 118 : 140) * u;
    const r = motsAnimes(ctx, e.texte, e.accent, W / 2, H / 2, { taille, poids: 800, largeur: W * (vertical ? 0.88 : 0.8), t, decale: 0.1 });
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
    const { W, H, u, t, vertical } = s;
    const items = (e.items ?? []).slice(0, 3), n = Math.max(1, items.length), actif = Math.min(n - 1, Math.floor(t / (s.d / n)));
    const ph = (vertical ? 140 : 120) * u, gap = 30 * u, tp = (vertical ? 52 : 44) * u;
    ctx.font = `700 ${tp}px ${F}`;
    const ws = items.map((x) => ctx.measureText(x.texte).width + 90 * u);
    const pile = vertical || ws.reduce((a, b) => a + b + gap, -gap) > W * 0.9;
    const tot = pile ? Math.max(...ws) : ws.reduce((a, b) => a + b + gap, -gap);
    items.forEach((x, i) => {
      const p = ressort(prog(t, 0.12 + i * 0.22, 0.85 + i * 0.22)); if (p <= 0) return;
      const w = ws[i], px = pile ? W / 2 - w / 2 : W / 2 - tot / 2 + ws.slice(0, i).reduce((a, b) => a + b + gap, 0), py = pile ? H / 2 - ((n - 1) * (ph + gap)) / 2 + i * (ph + gap) - ph / 2 : H / 2 - ph / 2;
      const on = i === actif;
      ctx.save(); ctx.globalAlpha *= clamp(p); ctx.translate(px + w / 2, py + ph / 2); ctx.scale(0.8 + 0.2 * p, 0.8 + 0.2 * p); ctx.translate(-(px + w / 2), -(py + ph / 2));
      if (on) { ctx.shadowColor = rgba(CV, 0.8); ctx.shadowBlur = 60 * u; }
      rond(ctx, px, py, w, ph, ph / 2); ctx.fillStyle = NOIR ? (on ? "rgba(30,30,38,.95)" : "rgba(22,22,28,.85)") : (on ? "#fff" : "rgba(255,255,255,.8)"); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = on ? rgba(CV, 0.9) : NOIR ? "rgba(255,255,255,.14)" : "rgba(15,23,42,.10)"; ctx.lineWidth = (on ? 3 : 2) * u; ctx.stroke();
      ctx.fillStyle = on ? INK : INK2(0.8); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(x.texte, px + w / 2, py + ph / 2 + 2 * u);
      ctx.restore();
    });
    if (e.texte) motsAnimes(ctx, e.texte, e.accent, W / 2, H * (vertical ? 0.2 : 0.2), { taille: 64 * u, largeur: W * 0.84, t: t - 0.1, poids: 600, decale: 0.06 });
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
    const p = ressort(prog(t, 0.05, 0.75)); ctx.font = `700 ${66 * u}px ${F}`;
    const w = ctx.measureText(e.texte).width + 120 * u, h = 140 * u;
    for (let k = 0; k < 2; k++) { const q = prog(t, 0.3 + k * 0.35, 1.3 + k * 0.35); if (q > 0 && q < 1) { ctx.save(); ctx.globalAlpha *= (1 - q) * 0.5; ctx.strokeStyle = rgba(CV, 1); ctx.lineWidth = 4 * u; rond(ctx, W / 2 - w / 2 - q * 90 * u, H / 2 - h / 2 - q * 90 * u, w + q * 180 * u, h + q * 180 * u, (h + q * 180 * u) / 2); ctx.stroke(); ctx.restore(); } }
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(p, p);
    ctx.shadowColor = rgba(CV, 0.7); ctx.shadowBlur = 60 * u; rond(ctx, -w / 2, -h / 2, w, h, 28 * u);
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, rgba(mix(CV, [255, 255, 255], 0.12), 1)); g.addColorStop(1, rgba(C, 1)); ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = lum(C) > 0.62 ? "#111" : "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e.texte, 0, 4 * u); ctx.restore();
  },
  cartes(ctx, s, e) {
    const { W, H, u, t } = s;
    const items = (e.items ?? []).slice(0, 3), w = Math.min(W * 0.72, 620 * u), h = 150 * u;
    items.forEach((x, i) => {
      const p = ressort(prog(t, 0.1 + i * 0.35, 0.9 + i * 0.35)); if (p <= 0) return;
      const off = (items.length - 1 - i) * 26 * u, y = H / 2 - h / 2 + (i - (items.length - 1) / 2) * 40 * u;
      ctx.save(); ctx.globalAlpha *= clamp(p); ctx.translate(W / 2, y + h / 2 + (1 - p) * 160 * u); ctx.rotate((i - 1) * 0.04 * (1 - p * 0.6)); ctx.translate(-W / 2, -(y + h / 2));
      ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 40 * u; ctx.shadowOffsetY = 14 * u;
      rond(ctx, W / 2 - w / 2 + off / 2, y, w - off, h, 30 * u);
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, rgba(mix(CV, [255, 255, 255], 0.1 + i * 0.05), 1)); g.addColorStop(1, rgba(mix(C, [0, 0, 0], 0.15), 1)); ctx.fillStyle = g; ctx.fill();
      ctx.shadowColor = "transparent"; ctx.fillStyle = lum(C) > 0.62 ? "#111" : "#fff"; ctx.font = `700 ${56 * u}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(x, W / 2, y + h / 2 + 3 * u);
      ctx.restore();
    });
  },
  aplat(ctx, s, e) {
    const { W, H, u, t } = s;
    const r = Math.hypot(W, H) * eio(prog(t, 0, 0.7));
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, 7); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, rgba(mix(C, [255, 255, 255], 0.12), 1)); g.addColorStop(1, rgba(mix(C, [0, 0, 0], 0.25), 1)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const p = ressort(prog(t, 0.45, 1.2)), txt = e.texte || s.nom; ctx.font = `700 ${70 * u}px ${F}`;
    if (LOGO?.width) { ctx.translate(W / 2, H / 2); ctx.scale(p, p); plaqueLogo(ctx, 0, 0, 130 * u, u); ctx.restore(); return; }
    const w = ctx.measureText(txt).width + 110 * u, h = 140 * u;
    ctx.translate(W / 2, H / 2); ctx.scale(p, p); rond(ctx, -w / 2, -h / 2, w, h, 26 * u); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.fillStyle = rgba(mix(C, [0, 0, 0], lum(C) > 0.6 ? 0.55 : 0), 1); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(txt, 0, 4 * u); ctx.restore();
  },
  logo(ctx, s, e) {
    const { W, H, u, t, vertical } = s;
    const p = eo(prog(t, 0, 1)), T = 150 * u;
    ctx.save(); if ("filter" in ctx) ctx.filter = p < 0.98 ? `blur(${(1 - p) * 26 * u}px)` : "none"; ctx.globalAlpha *= p;
    const y = H / 2 - (vertical ? 70 : 50) * u;
    if (LOGO?.width) { // son vrai logo, en grand, puis le nom plus petit
      ctx.save(); ctx.shadowColor = rgba(CV, 0.7); ctx.shadowBlur = 120 * u; plaqueLogo(ctx, W / 2, y - 60 * u, 150 * u, u, false); ctx.restore();
      // Un logo qui contient déjà le nom (plus large que haut) : pas de nom répété dessous
      if (LOGO.width / LOGO.height < 1.6) { ctx.fillStyle = INK; ctx.font = `800 ${(vertical ? 84 : 76) * u}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s.nom, W / 2, y + 120 * u); }
      ctx.restore();
    } else { // sans logo envoyé : le nom seul, en grand (aucune pastille dessinée)
    ctx.shadowColor = rgba(CV, 0.6); ctx.shadowBlur = 60 * u; serre(ctx, "-0.04em");
    ctx.fillStyle = INK; ctx.font = `900 ${ajuste(ctx, s.nom, (vertical ? 150 : 140) * u, W * 0.86, 900)}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s.nom, W / 2, y + 20 * u); serre(ctx, "-0.01em");
    ctx.restore();
    }
    const q = eo(prog(t, 0.8, 1.5));
    if (e.texte) { ctx.save(); ctx.globalAlpha *= q; ctx.fillStyle = INK2(0.78); ctx.font = `600 ${50 * u}px ${F}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e.texte, W / 2, y + 200 * u); ctx.restore(); }
    if (s.lien) { ctx.save(); ctx.globalAlpha *= eo(prog(t, 1.1, 1.8)); ctx.font = `600 ${40 * u}px ${F}`; const lw = ctx.measureText(s.lien).width + 70 * u;
      rond(ctx, W / 2 - lw / 2, y + 280 * u, lw, 84 * u, 42 * u); ctx.fillStyle = NOIR ? "rgba(255,255,255,.08)" : "rgba(15,23,42,.06)"; ctx.fill(); ctx.strokeStyle = rgba(CV, 0.6); ctx.lineWidth = 2 * u; ctx.stroke();
      ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s.lien, W / 2, y + 323 * u); ctx.restore(); }
  },
};

/** Dessine l'image au temps t (secondes) d'une vidéo composée de scènes. */
// Toujours une linéale très grasse et serrée (comme les pubs de référence), jamais la police à empattements du site
export const POLICE_MOTION = "Inter Tight";
export function dessinerScenes(ctx, W, H, t, script, { logo = null } = {}) {
  LOGO = logo;
  F = `"${POLICE_MOTION}", "Inter", "Helvetica Neue", Arial, system-ui, sans-serif`;
  serre(ctx, "-0.01em");
  C = hexRgb(script?.couleur); palette(script?.fond === "blanc" ? "blanc" : "noir");
  // En vertical (téléphone), tout est un peu plus grand : la vidéo se regarde sur un petit écran
  const vertical = H > W * 1.2, u = (Math.min(W, H) / 1080) * (vertical ? 1.42 : 1.22);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; if ("filter" in ctx) ctx.filter = "none";
  fond(ctx, W, H, t, u);
  const scenes = (script?.scenes ?? []).filter((x) => SCENES[x?.type]);
  let de = 0;
  for (let i = 0; i < scenes.length; i++) {
    const e = scenes[i], d = dureeScene(e), a = de + d; de = a;
    if (t < a - d - 0.01 || t > a + 0.01) continue;
    const local = t - (a - d), derniere = i === scenes.length - 1;
    const ent = eo(prog(local, 0, 0.45)), sort = derniere ? 0 : eio(prog(local, d - 0.32, d));
    // Fond propre à la scène (couleur pleine, blanc, noir) : il apparaît avec elle
    const modeScene = ["couleur", "blanc", "noir"].includes(e.fond) ? e.fond : script?.fond === "blanc" ? "blanc" : "noir";
    palette(modeScene);
    if (modeScene !== (script?.fond === "blanc" ? "blanc" : "noir")) { ctx.save(); ctx.globalAlpha = Math.min(1, ent * 1.6) * (1 - sort); fond(ctx, W, H, t, u); ctx.restore(); }
    ctx.save();
    // Caméra : léger zoom continu ; entrée nette depuis un flou, sortie en zoom avant + flou
    const k = 1 + local / d * 0.035 + (1 - ent) * 0.05 + sort * 0.08;
    ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
    ctx.globalAlpha = Math.min(1, ent * 1.2) * (1 - sort);
    if ("filter" in ctx) ctx.filter = (1 - ent) + sort > 0.02 ? `blur(${((1 - ent) * 16 + sort * 22) * u}px)` : "none";
    try { SCENES[e.type](ctx, { W, H, u, t: local, d, vertical, nom: script.nom ?? "", lien: script.lien ?? "" }, e); }
    catch (x) { console.warn("scène", e.type, x); }
    finally { ctx.restore(); }
    // Vague de couleur qui balaie l'écran à l'entrée de la scène (style Jiwa)
    if (e.transition === "vague" && local < 0.7) {
      const q = eio(prog(local, 0, 0.7)), x = -W * 0.4 + q * W * 1.9;
      ctx.save(); ctx.fillStyle = rgba(C, 1); ctx.beginPath(); ctx.moveTo(x - W * 0.6, 0); ctx.lineTo(x, 0);
      ctx.bezierCurveTo(x + W * 0.25, H * 0.3, x - W * 0.25, H * 0.7, x, H); ctx.lineTo(x - W * 0.6, H); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  // Son logo en petit, en haut, pendant toute la vidéo (sauf l'aplat et la fin, où il est en grand)
  if (LOGO?.width) {
    let a = 0, de2 = 0;
    for (const e of scenes) { const d = dureeScene(e); if (t >= de2 && t < de2 + d) a = ["aplat", "logo", "impact"].includes(e.type) ? 0 : Math.min(1, (t - de2) / 0.4, (de2 + d - t) / 0.3); de2 += d; }
    if (a > 0.01 && LOGO?.width) { ctx.save(); ctx.globalAlpha = a * 0.95; if ("filter" in ctx) ctx.filter = "none"; const hl = 40 * u, kl = Math.min(LOGO.width / LOGO.height, 3.2); plaqueLogo(ctx, 40 * u + hl * 0.32 + (hl * kl) / 2, 40 * u + hl * 0.82, hl, u); ctx.restore(); }
  }
  // Barre de progression très discrète
  const tot = dureeTotale(script); palette(script?.fond === "blanc" ? "blanc" : "noir");
  ctx.globalAlpha = 1; if ("filter" in ctx) ctx.filter = "none";
  ctx.fillStyle = INK2(0.08); ctx.fillRect(0, H - 6 * u, W, 6 * u); ctx.fillStyle = rgba(CV, 0.9); ctx.fillRect(0, H - 6 * u, W * clamp(t / tot), 6 * u);
}
