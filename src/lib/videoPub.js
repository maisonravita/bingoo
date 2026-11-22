// Vidéo pub en motion design : dessine chaque image (canvas) à partir du scénario écrit par l'IA,
// aux couleurs du SaaS, puis l'exporte en vidéo dans le navigateur (aucun serveur de rendu, rendu illimité).

export const DUREE = 21; // secondes
export const FORMATS = { vertical: [1080, 1920], carre: [1080, 1080], paysage: [1920, 1080] };
// Trois styles : percutant (fond sombre, rythme vif), sobre (fond clair), démo (les vrais écrans restent plus longtemps)
export const STYLES = { percutant: "Percutant", sobre: "Sobre", demo: "Démo" };
// Couleurs du style courant (fixées à chaque image par dessiner)
let TX = "#fff", TX2 = (a) => `rgba(255,255,255,${a})`, CARTE = "rgba(255,255,255,0.07)", CLAIR = false;
let POLICE = '"Plus Jakarta Sans", system-ui, sans-serif';
// Signature visuelle propre à chaque SaaS (tirée de son nom) : motif de fond, transitions, forme du logo
let MOTIF = 0, TRANSITION = 0, FORME = 0;
/** Graine stable d'un SaaS : deux SaaS n'ont pas la même vidéo. */
export const graineDe = (s) => { let h = 2166136261; for (const c of String(s ?? "")) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };

// --- outils
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const ressort = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.cos(x * Math.PI * 2.4) * Math.exp(-x * 6));
function hexRgb(h) { const n = parseInt(String(h || "#4F46E5").slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const melange = (c, d, k) => c.map((v, i) => Math.round(v + (d[i] - v) * k));
// Couleur vive dérivée de la couleur du SaaS (pour les accents sur fond sombre)
const vive = (c) => melange(c, [255, 255, 255], 0.35);

function rond(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function lignes(ctx, texte, largeur) {
  const mots = String(texte || "").split(" "); const out = []; let l = "";
  for (const m of mots) { const essai = l ? `${l} ${m}` : m; if (ctx.measureText(essai).width > largeur && l) { out.push(l); l = m; } else l = essai; }
  if (l) out.push(l); return out;
}
// Texte centré sur plusieurs lignes, mots qui montent un par un
function texteAnime(ctx, texte, x, y, { taille, poids = 800, largeur, couleur = TX, t = 1, decale = 0.06, interligne = 1.12 }) {
  ctx.font = `${poids} ${taille}px ${POLICE}`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  const ls = lignes(ctx, texte, largeur); const h = ls.length * taille * interligne; let i = 0; const base = ctx.globalAlpha;
  ls.forEach((l, k) => {
    const mots = l.split(" "); const w = ctx.measureText(l).width; let cx = x - w / 2; const cy = y - h / 2 + taille * interligne * (k + 0.5);
    for (const m of mots) {
      const p = easeOut(prog(t, i * decale, i * decale + 0.45)); i++;
      ctx.globalAlpha = base * p; ctx.fillStyle = couleur; ctx.fillText(m, cx, cy + (1 - p) * taille * 0.5);
      cx += ctx.measureText(m + " ").width;
    }
  });
  ctx.globalAlpha = base; return h;
}

// --- scènes (temps en secondes)
const SCENES_STD = [
  { de: 0, a: 3.4, dessin: accroche }, { de: 3.4, a: 6.2, dessin: probleme }, { de: 6.2, a: 9.4, dessin: revelation },
  { de: 9.4, a: 15.4, dessin: ecrans }, { de: 15.4, a: 18.2, dessin: benefices }, { de: 18.2, a: DUREE, dessin: appel },
];
// Démo : accroche plus courte, 9 secondes d'écrans réels
const SCENES_DEMO = [
  { de: 0, a: 2.8, dessin: accroche }, { de: 2.8, a: 5.2, dessin: probleme }, { de: 5.2, a: 7.6, dessin: revelation },
  { de: 7.6, a: 16.6, dessin: ecrans }, { de: 16.6, a: 18.6, dessin: benefices }, { de: 18.6, a: DUREE, dessin: appel },
];

/** Dessine l'image au temps t (secondes). */
export function dessiner(ctx, W, H, t, script, { nom, couleur, lien, images = [], style = "percutant", police = null, graine = 0 }) {
  CLAIR = style === "sobre";
  POLICE = `"${police || "Plus Jakarta Sans"}", system-ui, sans-serif`;
  MOTIF = graine % 4; TRANSITION = (graine >>> 3) % 3; FORME = (graine >>> 6) % 3;
  TX = CLAIR ? "#0F172A" : "#fff"; TX2 = CLAIR ? (a) => `rgba(15,23,42,${a})` : (a) => `rgba(255,255,255,${a})`; CARTE = CLAIR ? "rgba(15,23,42,0.05)" : "rgba(255,255,255,0.07)";
  const c = hexRgb(couleur), cv = CLAIR ? c : vive(c), u = Math.min(W, H) / 1080, vertical = H > W, carre = H === W;
  const SCENES = style === "demo" ? SCENES_DEMO : SCENES_STD;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  fond(ctx, W, H, t, c, u);
  for (const s of SCENES) {
    if (t < s.de - 0.01 || t > s.a + 0.01) continue;
    const local = t - s.de, d = s.a - s.de;
    const entree = easeOut(prog(local, 0, 0.45)), sortie = s.a === DUREE ? 0 : easeInOut(prog(local, d - 0.4, d));
    ctx.save(); ctx.globalAlpha = 1;
    if (TRANSITION === 0) ctx.translate(0, (1 - entree) * 40 * u - sortie * 40 * u);
    else if (TRANSITION === 1) ctx.translate((1 - entree) * 70 * u - sortie * 70 * u, 0);
    else { const k = 1 + (1 - entree) * 0.06 - sortie * 0.05; ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2); }
    const alpha = Math.min(entree, 1 - sortie);
    try { s.dessin(ctx, { W, H, u, t: Math.max(0, local), d, c, cv, nom, lien, script, vertical, carre, alpha, images }); }
    catch (e) { console.warn("scène", e); }
    finally { ctx.restore(); ctx.globalAlpha = 1; }
  }
  // Marque du SaaS en haut, une fois révélée (sauf sur l'écran final où elle est en grand)
  const sr = SCENES.find((x) => x.dessin === revelation), sa = SCENES.find((x) => x.dessin === appel);
  const m = easeOut(prog(t, sr.a, sr.a + 0.6)) * (1 - easeInOut(prog(t, sa.de - 0.2, sa.de + 0.2)));
  if (m > 0) {
    ctx.save(); ctx.globalAlpha = m;
    const ty = (vertical ? 110 : 80) * u, tl = 64 * u;
    ctx.font = `800 ${40 * u}px ${POLICE}`; const lw = ctx.measureText(nom).width, x = W / 2 - (tl + 20 * u + lw) / 2;
    logo(ctx, x + tl / 2, ty, tl, c, nom, u);
    ctx.fillStyle = TX; ctx.font = `800 ${40 * u}px ${POLICE}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(nom, x + tl + 20 * u, ty + 2 * u);
    ctx.restore();
  }
  // Barre de progression discrète
  ctx.fillStyle = TX2(0.10); ctx.fillRect(0, H - 8 * u, W, 8 * u);
  ctx.fillStyle = rgba(cv, 0.9); ctx.fillRect(0, H - 8 * u, W * (t / DUREE), 8 * u);
}

function motif(ctx, W, H, t, u, couleur) {
  ctx.strokeStyle = couleur; ctx.fillStyle = couleur; ctx.lineWidth = 1.5 * u; const pas = 90 * u, dec = (t * 18 * u) % pas;
  if (MOTIF === 0) { ctx.beginPath(); for (let x = -pas + dec; x < W; x += pas) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = -pas + dec; y < H; y += pas) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke(); }
  else if (MOTIF === 1) { for (let x = -pas + dec; x < W + pas; x += pas * 0.6) for (let y = -pas + dec; y < H + pas; y += pas * 0.6) { ctx.beginPath(); ctx.arc(x, y, 2.6 * u, 0, 7); ctx.fill(); } }
  else if (MOTIF === 2) { ctx.beginPath(); for (let x = -H + dec * 2; x < W; x += pas * 0.8) { ctx.moveTo(x, 0); ctx.lineTo(x + H, H); } ctx.stroke(); }
  else { for (let k = 0; k < 7; k++) { ctx.beginPath(); const y0 = H * (k + 0.5) / 7; for (let x = 0; x <= W; x += 20 * u) { const y = y0 + Math.sin(x / (180 * u) + t * 0.8 + k) * 24 * u; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); } }
}

function fond(ctx, W, H, t, c, u) {
  if (CLAIR) {
    const g0 = ctx.createLinearGradient(0, 0, W, H); g0.addColorStop(0, "#FFFFFF"); g0.addColorStop(1, rgba(melange(c, [255, 255, 255], 0.9), 1));
    ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
    [[0.15, 0.2, 0.5, c, 0.10], [0.9, 0.8, 0.55, c, 0.08]].forEach(([x, y, r, col, a], i) => {
      const px = W * (x + Math.sin(t * 0.35 + i * 2) * 0.05), py = H * (y + Math.cos(t * 0.3 + i) * 0.04), R = Math.max(W, H) * r;
      const rg = ctx.createRadialGradient(px, py, 0, px, py, R); rg.addColorStop(0, rgba(col, a)); rg.addColorStop(1, rgba(col, 0)); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    });
    motif(ctx, W, H, t, u, "rgba(15,23,42,0.05)"); return;
  }
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#07070C"); g.addColorStop(1, rgba(melange(c, [7, 7, 12], 0.72), 1));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // Halos qui dérivent
  const halos = [[0.2, 0.25, 0.55, c, 0.55], [0.85, 0.7, 0.6, vive(c), 0.32], [0.5, 1.05, 0.5, [255, 140, 90], 0.16]];
  halos.forEach(([x, y, r, col, a], i) => {
    const px = W * (x + Math.sin(t * 0.35 + i * 2) * 0.06), py = H * (y + Math.cos(t * 0.3 + i) * 0.05), R = Math.max(W, H) * r;
    const rg = ctx.createRadialGradient(px, py, 0, px, py, R); rg.addColorStop(0, rgba(col, a)); rg.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  });
  // Motif fin qui défile (propre au SaaS)
  motif(ctx, W, H, t, u, "rgba(255,255,255,0.05)");
}

function accroche(ctx, s) {
  const { W, H, u, t, cv, script, alpha } = s;
  ctx.globalAlpha = alpha;
  const h = texteAnime(ctx, script.accroche, W / 2, H / 2, { taille: (s.vertical ? 104 : 96) * u, largeur: W * 0.82, t, decale: 0.09 });
  ctx.globalAlpha = alpha;
  const p = easeOut(prog(t, 0.6, 1.4)), lw = 260 * u * p;
  ctx.fillStyle = rgba(cv, 1); rond(ctx, W / 2 - lw / 2, H / 2 + h / 2 + 40 * u, lw, 12 * u, 6 * u); ctx.fill();
}

function probleme(ctx, s) {
  const { W, H, u, t, script, alpha } = s;
  ctx.globalAlpha = alpha;
  // Pastille « ✕ »
  const p = ressort(prog(t, 0, 0.9)), r = 54 * u * p, cy = H / 2 - 170 * u;
  ctx.fillStyle = "rgba(239,68,68,0.18)"; ctx.beginPath(); ctx.arc(W / 2, cy, r * 1.5, 0, 7); ctx.fill();
  ctx.fillStyle = "#EF4444"; ctx.beginPath(); ctx.arc(W / 2, cy, r, 0, 7); ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 10 * u; ctx.lineCap = "round"; const k = 20 * u * p;
  ctx.beginPath(); ctx.moveTo(W / 2 - k, cy - k); ctx.lineTo(W / 2 + k, cy + k); ctx.moveTo(W / 2 + k, cy - k); ctx.lineTo(W / 2 - k, cy + k); ctx.stroke();
  texteAnime(ctx, script.probleme || script.accroche, W / 2, H / 2 + 40 * u, { taille: 72 * u, poids: 700, largeur: W * 0.8, t: t - 0.2, couleur: TX2(0.92) });
}

function logo(ctx, x, y, taille, c, nom, u) {
  const g = ctx.createLinearGradient(x - taille / 2, y - taille / 2, x + taille / 2, y + taille / 2);
  g.addColorStop(0, rgba(vive(c), 1)); g.addColorStop(1, rgba(c, 1));
  ctx.shadowColor = rgba(c, 0.6); ctx.shadowBlur = 60 * u;
  ctx.fillStyle = g;
  if (FORME === 1) { ctx.beginPath(); ctx.arc(x, y, taille / 2, 0, 7); }
  else if (FORME === 2) { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); rond(ctx, -taille * 0.36, -taille * 0.36, taille * 0.72, taille * 0.72, taille * 0.16); ctx.restore(); }
  else rond(ctx, x - taille / 2, y - taille / 2, taille, taille, taille * 0.28);
  ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff"; ctx.font = `800 ${taille * 0.5}px ${POLICE}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(nom || "?").trim().charAt(0).toUpperCase(), x, y + taille * 0.03);
}

function revelation(ctx, s) {
  const { W, H, u, t, c, nom, script, alpha } = s;
  ctx.globalAlpha = alpha;
  const p = ressort(prog(t, 0, 1.1)), cy = H / 2 - (s.vertical ? 230 : 170) * u;
  ctx.save(); ctx.translate(W / 2, cy); ctx.scale(p, p); ctx.rotate((1 - p) * -0.4); logo(ctx, 0, 0, 200 * u, c, nom, u); ctx.restore();
  ctx.globalAlpha = alpha * easeOut(prog(t, 0.35, 0.9));
  ctx.fillStyle = TX; ctx.font = `800 ${(s.vertical ? 120 : 110) * u}px ${POLICE}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(nom, W / 2, H / 2 + 10 * u);
  texteAnime(ctx, script.presentation, W / 2, H / 2 + (s.vertical ? 170 : 140) * u, { taille: 50 * u, poids: 600, largeur: W * 0.78, t: t - 0.7, couleur: TX2(0.75), decale: 0.04 });
}

// Fenêtre d'application stylisée (un écran du SaaS)
function fenetre(ctx, x, y, w, h, u, c, titre, t, graine) {
  ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 70 * u; ctx.shadowOffsetY = 30 * u;
  ctx.fillStyle = "#FFFFFF"; rond(ctx, x, y, w, h, 34 * u); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.save(); rond(ctx, x, y, w, h, 34 * u); ctx.clip();
  // Barre latérale
  const sb = w * 0.2; ctx.fillStyle = rgba(c, 1); ctx.fillRect(x, y, sb, h);
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i === graine % 5 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)"; rond(ctx, x + sb * 0.18, y + 120 * u + i * 62 * u, sb * 0.64, 22 * u, 11 * u); ctx.fill(); }
  // En-tête
  ctx.fillStyle = "#0F172A"; ctx.font = `800 ${44 * u}px ${POLICE}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(titre, x + sb + 48 * u, y + 80 * u, w - sb - 96 * u);
  const cx = x + sb + 48 * u, cw = w - sb - 96 * u;
  // Cartes chiffres
  for (let i = 0; i < 3; i++) {
    const kw = (cw - 40 * u) / 3, kx = cx + i * (kw + 20 * u), ky = y + 140 * u;
    ctx.fillStyle = i === 0 ? rgba(c, 0.1) : "#F1F5F9"; rond(ctx, kx, ky, kw, 120 * u, 20 * u); ctx.fill();
    ctx.fillStyle = "#94A3B8"; rond(ctx, kx + 22 * u, ky + 30 * u, kw * 0.45, 14 * u, 7 * u); ctx.fill();
    const v = easeOut(prog(t, 0.3 + i * 0.15, 1.2 + i * 0.15));
    ctx.fillStyle = i === 0 ? rgba(c, 1) : "#0F172A"; rond(ctx, kx + 22 * u, ky + 66 * u, kw * 0.6 * v, 30 * u, 10 * u); ctx.fill();
  }
  // Graphique en barres qui poussent
  const gy = y + 300 * u, gh = h * 0.3, nb = 9;
  for (let i = 0; i < nb; i++) {
    const bw = cw / nb * 0.62, bx = cx + i * (cw / nb), hauteur = gh * (0.3 + 0.7 * Math.abs(Math.sin((i + 1) * 1.7 + graine))) * easeOut(prog(t, 0.2 + i * 0.06, 1 + i * 0.06));
    ctx.fillStyle = i === nb - 1 ? rgba(c, 1) : rgba(c, 0.28); rond(ctx, bx, gy + gh - hauteur, bw, hauteur, 8 * u); ctx.fill();
  }
  // Lignes de tableau
  for (let i = 0; i < 4; i++) {
    const ly = gy + gh + 40 * u + i * 66 * u; if (ly > y + h - 40 * u) break;
    const p = easeOut(prog(t, 0.5 + i * 0.12, 1.1 + i * 0.12));
    ctx.globalAlpha *= 1; ctx.fillStyle = "#F8FAFC"; rond(ctx, cx, ly, cw * p, 50 * u, 14 * u); ctx.fill();
    ctx.fillStyle = "#CBD5E1"; rond(ctx, cx + 20 * u, ly + 18 * u, cw * 0.4 * p, 14 * u, 7 * u); ctx.fill();
    ctx.fillStyle = ["#22C55E", rgba(c, 1), "#F59E0B", "#22C55E"][i]; rond(ctx, cx + cw * 0.78 * p, ly + 13 * u, cw * 0.16 * p, 24 * u, 12 * u); ctx.fill();
  }
  ctx.restore();
}

// Une vraie capture de l'application, dans une fenêtre de navigateur : zoom lent vers le cœur de l'écran, curseur qui clique
function vraiEcran(ctx, x, y, w, h, u, c, img, t, d, graine, lien) {
  const barre = 46 * u;
  ctx.shadowColor = "rgba(0,0,0,0.40)"; ctx.shadowBlur = 70 * u; ctx.shadowOffsetY = 28 * u;
  ctx.fillStyle = "#FFFFFF"; rond(ctx, x, y, w, h, 26 * u); ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.save(); rond(ctx, x, y, w, h, 26 * u); ctx.clip();
  ctx.fillStyle = "#F1F5F9"; ctx.fillRect(x, y, w, barre);
  ["#F87171", "#FBBF24", "#34D399"].forEach((col, k) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + 30 * u + k * 26 * u, y + barre / 2, 8 * u, 0, 7); ctx.fill(); });
  ctx.fillStyle = "#FFFFFF"; rond(ctx, x + 120 * u, y + 10 * u, w - 240 * u, barre - 20 * u, 13 * u); ctx.fill();
  if (lien) { ctx.fillStyle = "#64748B"; ctx.font = `600 ${18 * u}px ${POLICE}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(lien, x + w / 2, y + barre / 2 + 1 * u, w - 280 * u); }
  // Image : largeur pleine, zoom de 1 à 1,14 vers un point d'intérêt (le contenu, à droite du menu)
  const zx = [0.42, 0.62, 0.5][graine % 3], zy = [0.32, 0.45, 0.38][graine % 3];
  const z = 1 + 0.14 * easeInOut(prog(t, 0.4, d));
  const iw = w * z, ih = iw * (img.height / img.width), cy = y + barre;
  const ox = x - (iw - w) * zx, oy = cy - Math.max(0, ih - (h - barre)) * zy;
  ctx.beginPath(); ctx.rect(x, cy, w, h - barre); ctx.clip();
  ctx.drawImage(img, ox, oy, iw, ih);
  // Curseur : entre par le bas à droite, se pose sur le point d'intérêt, clique (onde)
  const pc = easeInOut(prog(t, 0.6, Math.min(d - 0.5, 1.9)));
  const fx = x + w * (zx + 0.08), fy = cy + (h - barre) * (zy + 0.1);
  const mx = x + w * 0.95 + (fx - x - w * 0.95) * pc, my = y + h * 0.95 + (fy - y - h * 0.95) * pc;
  const clic = prog(t, Math.min(d - 0.5, 1.9), Math.min(d - 0.5, 1.9) + 0.6);
  if (clic > 0 && clic < 1) { ctx.strokeStyle = rgba(c, 0.6 * (1 - clic)); ctx.lineWidth = 6 * u; ctx.beginPath(); ctx.arc(fx, fy, 12 * u + clic * 60 * u, 0, 7); ctx.stroke(); }
  ctx.restore();
  ctx.save(); ctx.translate(mx, my); ctx.scale(u * 1.6 * (clic > 0 && clic < 0.25 ? 0.9 : 1), u * 1.6 * (clic > 0 && clic < 0.25 ? 0.9 : 1));
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 26); ctx.lineTo(7, 20); ctx.lineTo(12, 31); ctx.lineTo(16, 29); ctx.lineTo(11, 18); ctx.lineTo(19, 18); ctx.closePath();
  ctx.fillStyle = "#0F172A"; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
}

function ecrans(ctx, s) {
  const { W, H, u, t, c, cv, script, alpha } = s;
  const liste = script.ecrans.slice(0, 3), par = s.d / Math.max(1, liste.length);
  const i = Math.max(0, Math.min(liste.length - 1, Math.floor(t / par))), lt = Math.max(0, t - i * par), e = liste[i];
  if (!e) return;
  const img = s.images?.[i] && s.images[i].width ? s.images[i] : null;
  const entree = easeOut(prog(lt, 0, 0.6)), sortie = i < liste.length - 1 ? easeInOut(prog(lt, par - 0.35, par)) : 0;
  // Vidéo libre (pas un logiciel) : pas de fausse fenêtre d'application, un temps fort en grand autour d'un numéro
  if (script.genre === "libre") {
    const a = alpha * Math.min(entree, 1 - sortie), cx = W / 2, cy = H * (s.vertical ? 0.34 : 0.3), R = (s.vertical ? 150 : 120) * u;
    ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - entree) * 180 * u - sortie * 180 * u, 0);
    ctx.strokeStyle = rgba(cv, 0.28); ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, 7); ctx.stroke();
    ctx.strokeStyle = rgba(cv, 1); ctx.lineWidth = 10 * u; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * easeOut(prog(lt, 0.1, par * 0.8))); ctx.stroke();
    ctx.fillStyle = rgba(cv, 1); ctx.beginPath(); ctx.arc(cx, cy, R * ressort(prog(lt, 0, 0.7)), 0, 7); ctx.fill();
    ctx.fillStyle = CLAIR ? "#fff" : "#07070C"; ctx.font = `800 ${R * 1.05}px ${POLICE}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(i + 1), cx, cy + 4 * u);
    const ty = H * (s.vertical ? 0.58 : 0.62), larg = W * (s.vertical ? 0.84 : 0.7);
    texteAnime(ctx, e.titre, cx, ty, { taille: (s.vertical ? 96 : s.carre ? 78 : 84) * u, largeur: larg, t: lt, decale: 0.05 });
    if (e.detail) texteAnime(ctx, e.detail, cx, ty + (s.vertical ? 150 : 120) * u, { taille: (s.vertical ? 50 : 44) * u, poids: 600, largeur: larg, t: lt - 0.25, couleur: TX2(0.72), decale: 0.03 });
    ctx.restore(); return;
  }
  ctx.globalAlpha = alpha;
  // Une vraie capture garde ses proportions (16:10) : la fenêtre s'y adapte
  const empile = s.vertical || s.carre;
  const w = s.vertical ? W * 0.9 : s.carre ? W * 0.8 : W * (img ? 0.56 : 0.5);
  const h = img ? w * (img.height / img.width) + 46 * u : s.vertical ? H * 0.5 : s.carre ? H * 0.5 : H * 0.64;
  const x = empile ? (W - w) / 2 : W * (img ? 0.4 : 0.45), y = s.vertical ? H * 0.40 : s.carre ? H * 0.40 : (H - h) / 2 + 40 * u;
  ctx.save(); ctx.globalAlpha = alpha * Math.min(entree, 1 - sortie);
  ctx.translate((1 - entree) * 260 * u - sortie * 260 * u, 0);
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate((empile ? -0.02 : -0.03) * (1 - entree)); ctx.translate(-(x + w / 2), -(y + h / 2));
  if (img) vraiEcran(ctx, x, y, w, h, u, c, img, lt, par, i, s.lien); else fenetre(ctx, x, y, w, h, u, c, e.titre, lt, i * 3 + 1);
  ctx.restore();
  // Légende
  ctx.globalAlpha = alpha * Math.min(entree, 1 - sortie);
  const tx = empile ? W / 2 : W * 0.2, ty = s.vertical ? H * 0.25 : s.carre ? H * 0.23 : H / 2, larg = empile ? W * 0.82 : W * 0.32;
  ctx.fillStyle = rgba(cv, 1); ctx.font = `800 ${34 * u}px ${POLICE}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`${i + 1} / ${liste.length}`, tx, ty - 110 * u);
  texteAnime(ctx, e.titre, tx, ty - 20 * u, { taille: (s.vertical ? 92 : s.carre ? 70 : 76) * u, largeur: larg, t: lt, decale: 0.05 });
  if (e.detail) texteAnime(ctx, e.detail, tx, ty + 100 * u, { taille: (s.vertical ? 50 : 44) * u, poids: 600, largeur: larg, t: lt - 0.25, couleur: TX2(0.72), decale: 0.03 });
}

function benefices(ctx, s) {
  const { W, H, u, t, cv, script, alpha } = s;
  const liste = (script.benefices.length ? script.benefices : [script.presentation]).slice(0, 3);
  const pasY = (s.vertical ? 200 : 150) * u, y0 = H / 2 - ((liste.length - 1) * pasY) / 2, larg = s.vertical ? W * 0.88 : Math.min(W * 0.8, 1100 * u), x0 = W / 2 - larg / 2;
  liste.forEach((b, i) => {
    const p = easeOut(prog(t, i * 0.35, i * 0.35 + 0.55)), y = y0 + i * pasY;
    ctx.globalAlpha = alpha * p;
    const bh = (s.vertical ? 150 : 116) * u; ctx.fillStyle = CARTE; rond(ctx, x0 + (1 - p) * 120 * u, y - bh / 2, larg, bh, 30 * u); ctx.fill();
    const cx = x0 + 75 * u + (1 - p) * 120 * u, r = (s.vertical ? 36 : 30) * u * ressort(prog(t, i * 0.35 + 0.2, i * 0.35 + 0.9));
    ctx.fillStyle = rgba(cv, 1); ctx.beginPath(); ctx.arc(cx, y, Math.max(0, r), 0, 7); ctx.fill();
    ctx.strokeStyle = CLAIR ? "#fff" : "#0B0B12"; ctx.lineWidth = 7 * u; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (r > 5) { ctx.beginPath(); ctx.moveTo(cx - 12 * u, y); ctx.lineTo(cx - 3 * u, y + 10 * u); ctx.lineTo(cx + 14 * u, y - 10 * u); ctx.stroke(); }
    ctx.fillStyle = TX; ctx.font = `700 ${(s.vertical ? 56 : 48) * u}px ${POLICE}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(b, cx + 66 * u, y + 2 * u, larg - 170 * u);
  });
}

function appel(ctx, s) {
  const { W, H, u, t, c, cv, nom, lien, script, alpha } = s;
  ctx.globalAlpha = alpha;
  const p = ressort(prog(t, 0, 1));
  ctx.save(); ctx.translate(W / 2, H / 2 - 250 * u); ctx.scale(p, p); logo(ctx, 0, 0, 150 * u, c, nom, u); ctx.restore();
  ctx.globalAlpha = alpha * easeOut(prog(t, 0.25, 0.8));
  ctx.fillStyle = TX; ctx.font = `800 ${110 * u}px ${POLICE}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(nom, W / 2, H / 2 - 50 * u);
  // Bouton qui respire
  ctx.font = `800 ${50 * u}px ${POLICE}`; const tw = ctx.measureText(script.appel).width, bw = tw + 120 * u, bh = 120 * u;
  const pulse = 1 + Math.sin(t * 5) * 0.025 * prog(t, 1, 1.4), bp = easeOut(prog(t, 0.5, 1.1));
  ctx.save(); ctx.globalAlpha = alpha * bp; ctx.translate(W / 2, H / 2 + 120 * u); ctx.scale(pulse, pulse);
  ctx.shadowColor = rgba(cv, 0.7); ctx.shadowBlur = 50 * u; ctx.fillStyle = rgba(cv, 1); rond(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = CLAIR ? "#fff" : "#0B0B12"; ctx.fillText(script.appel, 0, 3 * u); ctx.restore();
  if (lien) { ctx.globalAlpha = alpha * easeOut(prog(t, 0.9, 1.4)); ctx.fillStyle = TX2(0.7); ctx.font = `600 ${40 * u}px ${POLICE}`; ctx.fillText(lien, W / 2, H / 2 + 270 * u, W * 0.9); }
}

/** Charge la police avant de dessiner (sinon le canvas prend la police par défaut). */
export async function preparerPolice(police = "Plus Jakarta Sans") {
  // La police du SaaS (celle de son application), chargée depuis Google Fonts si besoin
  try {
    const id = `police-video-${police.replace(/\W/g, "")}`;
    if (police !== "Plus Jakarta Sans" && !document.getElementById(id)) { const l = document.createElement("link"); l.id = id; l.rel = "stylesheet"; l.href = `https://fonts.googleapis.com/css2?family=${police.replace(/ /g, "+")}:wght@600;700;800&display=swap`; document.head.appendChild(l); }
    await Promise.all(["800", "700", "600"].map((p) => document.fonts.load(`${p} 60px "${police}"`)));
  } catch { /* police de secours */ }
}

/** Enregistre la vidéo complète (temps réel), avec la musique choisie ; renvoie { blob, ext }. */
export async function exporterVideo(canvas, dessinerA, onProgres, musique = null, graine = 0) {
  const avecSon = !!musique;
  const types = avecSon
    ? ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1,mp4a.40.2", "video/mp4;codecs=avc1,opus", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
    : ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  const type = types.find((x) => window.MediaRecorder?.isTypeSupported?.(x));
  if (!type) throw new Error("Ton navigateur ne sait pas enregistrer de vidéo : essaie avec Chrome ou Safari à jour.");
  const image = canvas.captureStream(30);
  let ac = null, flux = image;
  if (avecSon) {
    // La musique est composée en direct et enregistrée avec l'image (rien ne sort des haut-parleurs)
    const { jouerMusique } = await import("./musiqueVideo.js");
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const dest = ac.createMediaStreamDestination();
    jouerMusique(ac, dest, musique, DUREE + 0.2, ac.currentTime + 0.02, graine);
    flux = new MediaStream([...image.getVideoTracks(), ...dest.stream.getAudioTracks()]);
  }
  const rec = new MediaRecorder(flux, { mimeType: type, videoBitsPerSecond: 8_000_000, ...(avecSon ? { audioBitsPerSecond: 160_000 } : {}) });
  const morceaux = []; rec.ondataavailable = (e) => e.data.size && morceaux.push(e.data);
  const fini = new Promise((ok) => { rec.onstop = ok; });
  rec.start(250);
  const t0 = performance.now();
  await new Promise((ok) => {
    const image = () => {
      const t = (performance.now() - t0) / 1000;
      dessinerA(Math.min(t, DUREE)); onProgres?.(Math.min(1, t / DUREE));
      if (t < DUREE + 0.2) requestAnimationFrame(image); else ok();
    };
    requestAnimationFrame(image);
  });
  rec.stop(); await fini; flux.getTracks().forEach((x) => x.stop()); image.getTracks().forEach((x) => x.stop());
  if (ac) ac.close().catch(() => {});
  return { blob: new Blob(morceaux, { type: type.split(";")[0] }), ext: type.startsWith("video/mp4") ? "mp4" : "webm" };
}
