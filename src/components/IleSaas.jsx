import { useEffect, useMemo, useRef, useState } from "react";
// three.js n'est chargé que lorsqu'on ouvre l'archipel (le site est un seul fichier : l'inclure alourdirait toutes les pages)
const URL_THREE = "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js";
let THREE = null;
let chargement = null;
const chargerThree = () => (THREE ? Promise.resolve(THREE) : (chargement ??= import(/* @vite-ignore */ URL_THREE).then((m) => { THREE = m; return m; })));

/* L'archipel Bingoo! : la carte du jeu. Chaque île est un lieu du produit, branché sur les vraies données :
   la Tour des records (classement), le Château des niches, le Phare (ce qui monte), le Marché (à vendre),
   le Chantier naval (à copier), l'Île des créateurs (SaaS construits sur Bingoo!), l'Atlas (les pays) et le Sage (Demande à Bingoo!).
   Vraie 3D low-poly (three.js), lumière et ombres, eau animée, bateaux = SaaS à vendre. Dessins originaux. */

const COUL = {
  sable: "#F3D9A4", roche: "#B5A497", rocheSombre: "#8C7D74", herbe: "#7BC24B", herbeSombre: "#5FA83B",
  bois: "#C8763A", boisSombre: "#9A5128", pierre: "#BDB8CB", pierreSombre: "#918BA6", tuile: "#2F9E92",
  rouge: "#D8433A", blanc: "#F7F4EE", orange: "#E0531F", violet: "#6B4FA3", jaune: "#F6C343", vert: "#2F8F57",
};
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85, metalness: 0, ...o });
const hasard = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function maille(geo, m, { x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, s = 1, ombre = true } = {}) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.setScalar(s);
  o.castShadow = ombre; o.receiveShadow = true;
  return o;
}

// Île irrégulière : falaise rocheuse, plage, plateau d'herbe ou de pierre
function socle(rayon, graine, { dessus = COUL.herbe, plage = true, haut = 0.9 } = {}) {
  const g = new THREE.Group();
  const forme = (r, h, seg, c, y, k) => {
    const geo = new THREE.CylinderGeometry(r, r * 0.86, h, seg, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getZ(i), p.getX(i)), d = Math.hypot(p.getX(i), p.getZ(i));
      if (d < 0.01) continue;
      const f = 1 + (hasard(graine * 13 + Math.round(a * 10) * k) - 0.5) * 0.22;
      p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f);
    }
    geo.computeVertexNormals();
    return maille(geo, mat(c), { y });
  };
  g.add(forme(rayon * 1.02, 1.6, 9, COUL.rocheSombre, -0.9, 3));
  g.add(forme(rayon, 0.9, 9, COUL.roche, -0.05, 3));
  if (plage) g.add(forme(rayon * 1.12, 0.25, 9, COUL.sable, -0.45, 5));
  g.add(forme(rayon * 0.94, 0.3, 9, dessus, haut / 2 - 0.05, 3));
  // Eau peu profonde autour, et écume
  const halo = new THREE.Mesh(new THREE.CircleGeometry(rayon * 1.75, 28), new THREE.MeshBasicMaterial({ color: "#7FE3F0", transparent: true, opacity: 0.35, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = -0.58; halo.userData.halo = 0.35; g.add(halo);
  const ecume = new THREE.Mesh(new THREE.RingGeometry(rayon * 1.12, rayon * 1.24, 28), new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.55, depthWrite: false }));
  ecume.rotation.x = -Math.PI / 2; ecume.position.y = -0.55; ecume.userData.ecume = true; g.add(ecume);
  // Rochers au bord
  for (let i = 0; i < 4; i++) {
    const a = hasard(graine + i * 7) * Math.PI * 2, d = rayon * (1.05 + hasard(graine + i) * 0.25);
    g.add(maille(new THREE.DodecahedronGeometry(0.22 + hasard(graine * 3 + i) * 0.25, 0), mat(COUL.roche), { x: Math.cos(a) * d, y: -0.45, z: Math.sin(a) * d, ry: a }));
  }
  return g;
}

function palmier(x, z, s = 1, graine = 1) {
  const g = new THREE.Group();
  const tronc = new THREE.Group();
  for (let i = 0; i < 5; i++) tronc.add(maille(new THREE.CylinderGeometry(0.09 - i * 0.008, 0.11 - i * 0.008, 0.38, 6), mat(i % 2 ? COUL.boisSombre : "#A8653A"), { y: 0.19 + i * 0.36, x: i * i * 0.012 }));
  g.add(tronc);
  for (let i = 0; i < 6; i++) {
    const f = maille(new THREE.ConeGeometry(0.16, 1.1, 3), mat(i % 2 ? COUL.herbe : COUL.herbeSombre), { x: 0.2, y: 1.85, ry: (i / 6) * Math.PI * 2 + graine, rz: -1.15 });
    f.geometry.translate(0, 0.55, 0);
    const pivot = new THREE.Group(); pivot.position.set(0.18, 1.85, 0); pivot.rotation.y = (i / 6) * Math.PI * 2 + graine;
    f.position.set(0, 0, 0); f.rotation.set(0, 0, -1.2); pivot.add(f); g.add(pivot);
  }
  g.position.set(x, 0.4, z); g.scale.setScalar(s); g.rotation.y = graine;
  g.userData.vent = 0.03;
  return g;
}

function fanions(points, y, couleurs) {
  const g = new THREE.Group();
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b] = [points[i], points[i + 1]];
    for (let k = 0; k < 4; k++) {
      const t = (k + 0.5) / 4;
      const f = maille(new THREE.ConeGeometry(0.09, 0.22, 3), mat(couleurs[(i * 4 + k) % couleurs.length]), { x: a[0] + (b[0] - a[0]) * t, y: y - Math.sin(t * Math.PI) * 0.18, z: a[1] + (b[1] - a[1]) * t, rx: Math.PI, ombre: false });
      g.add(f);
    }
  }
  return g;
}

// ---------------------------------------------------------------- Les lieux
function tourRecords(etages) {
  const g = new THREE.Group();
  g.add(socle(3.2, 1));
  const n = Math.max(3, Math.min(6, etages));
  let y = 0.45;
  for (let i = 0; i < n; i++) {
    const w = 2.2 - i * 0.12, h = 0.95;
    const etage = new THREE.Group();
    etage.add(maille(new THREE.BoxGeometry(w, h, w), mat(i % 2 ? "#8B78C9" : "#9C8BD6"), { y: h / 2 }));
    etage.add(maille(new THREE.BoxGeometry(w + 0.3, 0.12, w + 0.3), mat(COUL.bois), { y: 0.03 }));
    for (const [px, pz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) etage.add(maille(new THREE.BoxGeometry(0.12, h, 0.12), mat(COUL.boisSombre), { x: px * (w / 2 + 0.1), y: h / 2, z: pz * (w / 2 + 0.1) }));
    // Fenêtres (s'allument la nuit)
    for (const s of [1, -1]) {
      const fen = maille(new THREE.BoxGeometry(0.34, 0.42, 0.04), new THREE.MeshStandardMaterial({ color: "#FFE3A6", emissive: "#FFB84D", emissiveIntensity: 0.0, flatShading: true }), { x: s * 0.45, y: h / 2 + 0.05, z: w / 2 + 0.02, ombre: false });
      fen.userData.fenetre = true; etage.add(fen);
      const fen2 = fen.clone(); fen2.material = fen.material; fen2.position.set(w / 2 + 0.02, h / 2 + 0.05, s * 0.45); fen2.rotation.y = Math.PI / 2; fen2.userData.fenetre = true; etage.add(fen2);
    }
    // Balcons en bois tous les deux étages
    if (i % 2 === 1) etage.add(maille(new THREE.BoxGeometry(w + 0.5, 0.08, 0.5), mat(COUL.bois), { y: 0.05, z: w / 2 + 0.25 }));
    etage.position.y = y; etage.rotation.y = (i % 2) * 0.12 - 0.06;
    g.add(etage); y += h + 0.05;
  }
  const toit = maille(new THREE.ConeGeometry(1.55, 1.2, 4), mat(COUL.tuile), { y: y + 0.55, ry: Math.PI / 4 });
  g.add(toit);
  g.add(maille(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), mat(COUL.boisSombre), { y: y + 1.6 }));
  const drap = maille(new THREE.BoxGeometry(0.6, 0.35, 0.03), mat(COUL.orange), { x: 0.3, y: y + 1.9, ombre: false }); drap.userData.drapeau = true; g.add(drap);
  g.add(fanions([[-1.4, 1.4], [0, 1.6], [1.4, 1.4]], y * 0.55, [COUL.blanc, "#F2C14E", COUL.blanc]));
  // Auvent turquoise au rez-de-chaussée
  g.add(maille(new THREE.BoxGeometry(2.9, 0.08, 0.9), mat(COUL.tuile), { y: 1.35, z: 1.45, rx: 0.35 }));
  g.add(palmier(2.0, 1.0, 1, 1.2)); g.add(palmier(1.4, 2.2, 0.8, 2.3)); g.add(palmier(-2.1, 1.5, 0.9, 0.4));
  return g;
}

function chateau(flags) {
  const g = new THREE.Group();
  // Esplanade de pierre carrée
  const dalle = maille(new THREE.BoxGeometry(5.6, 1.4, 5.0), mat(COUL.pierre), { y: -0.2 });
  g.add(dalle);
  g.add(maille(new THREE.BoxGeometry(5.8, 0.2, 5.2), mat("#CFCAD9"), { y: 0.55 }));
  const halo = new THREE.Mesh(new THREE.CircleGeometry(4.6, 28), new THREE.MeshBasicMaterial({ color: "#7FE3F0", transparent: true, opacity: 0.35, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = -0.58; halo.userData.halo = 0.35; g.add(halo);
  for (let i = -1; i <= 1; i++) g.add(maille(new THREE.BoxGeometry(0.7, 0.6, 0.12), mat("#6E6884"), { x: i * 1.8, y: -0.4, z: 2.52 }));
  const donjon = new THREE.Group();
  donjon.add(maille(new THREE.BoxGeometry(2.4, 2.6, 2.2), mat(COUL.pierre), { y: 1.95 }));
  donjon.add(maille(new THREE.BoxGeometry(1.2, 1.4, 1.2), mat(COUL.pierre), { y: 3.9, x: 0.3 }));
  const creneaux = (w, d, y, x0 = 0) => { for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { donjon.add(maille(new THREE.BoxGeometry(0.28, 0.3, 0.28), mat(COUL.pierreSombre), { x: x0 - w / 2 + 0.2 + i * (w - 0.4) / 3, y, z: s * d / 2 })); donjon.add(maille(new THREE.BoxGeometry(0.28, 0.3, 0.28), mat(COUL.pierreSombre), { x: x0 + s * w / 2, y, z: -d / 2 + 0.2 + i * (d - 0.4) / 3 })); } };
  creneaux(2.4, 2.2, 3.4); creneaux(1.2, 1.2, 4.75, 0.3);
  donjon.add(maille(new THREE.BoxGeometry(0.6, 1.0, 0.1), mat(COUL.boisSombre), { y: 1.15, z: 1.12 }));
  g.add(donjon);
  // Tours d'angle, chacune avec le drapeau d'une niche
  const coins = [[-2.2, -1.9], [2.2, -1.9], [-2.2, 1.7], [2.2, 1.7]];
  coins.forEach(([x, z], i) => {
    g.add(maille(new THREE.CylinderGeometry(0.5, 0.55, 2.2, 8), mat(COUL.pierre), { x, y: 1.75, z }));
    g.add(maille(new THREE.ConeGeometry(0.62, 0.9, 8), mat(i % 2 ? COUL.rouge : COUL.violet), { x, y: 3.3, z }));
    g.add(maille(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4), mat(COUL.boisSombre), { x, y: 4.1, z }));
    const d = maille(new THREE.BoxGeometry(0.5, 0.3, 0.02), mat(flags[i] ?? COUL.jaune), { x: x + 0.25, y: 4.35, z, ombre: false }); d.userData.drapeau = true; g.add(d);
  });
  // Échafaudage en bois et torches
  g.add(maille(new THREE.BoxGeometry(1.4, 0.1, 1.0), mat(COUL.bois), { x: -1.75, y: 2.1, z: 0.4 }));
  for (const [x, z] of [[-2.4, 0], [-1.1, 0], [-2.4, 0.8], [-1.1, 0.8]]) g.add(maille(new THREE.BoxGeometry(0.08, 1.5, 0.08), mat(COUL.boisSombre), { x, y: 1.4, z }));
  for (const [x, z] of [[1.4, 2.2], [2.5, 0.6]]) {
    g.add(maille(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 5), mat(COUL.boisSombre), { x, y: 1.1, z }));
    const flamme = maille(new THREE.ConeGeometry(0.15, 0.4, 5), new THREE.MeshStandardMaterial({ color: "#FFB020", emissive: "#FF7A00", emissiveIntensity: 1.2, flatShading: true }), { x, y: 1.75, z, ombre: false });
    flamme.userData.flamme = true; g.add(flamme);
    const l = new THREE.PointLight("#FF9A3C", 0, 4); l.position.set(x, 1.9, z); l.userData.torche = true; g.add(l);
  }
  // Ponton
  const ponton = new THREE.Group();
  ponton.add(maille(new THREE.BoxGeometry(1.6, 0.14, 2.6), mat(COUL.bois), { y: -0.35 }));
  for (const [x, z] of [[-0.7, -1.2], [0.7, -1.2], [-0.7, 1.2], [0.7, 1.2]]) ponton.add(maille(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 5), mat(COUL.boisSombre), { x, y: -0.6, z }));
  ponton.position.set(2.0, 0, 3.6); g.add(ponton);
  return g;
}

function phare() {
  const g = new THREE.Group();
  g.add(socle(1.5, 7, { dessus: COUL.roche, haut: 0.6 }));
  for (let i = 0; i < 5; i++) g.add(maille(new THREE.CylinderGeometry(0.62 - i * 0.06, 0.68 - i * 0.06, 0.62, 10), mat(i % 2 ? COUL.blanc : COUL.rouge), { y: 0.7 + i * 0.62 }));
  g.add(maille(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 10), mat("#5B5C66"), { y: 3.85 }));
  const lampe = maille(new THREE.CylinderGeometry(0.32, 0.32, 0.5, 8), new THREE.MeshStandardMaterial({ color: "#FFF6CC", emissive: "#FFD45C", emissiveIntensity: 0.6, flatShading: true }), { y: 4.15, ombre: false });
  lampe.userData.lampe = true; g.add(lampe);
  g.add(maille(new THREE.ConeGeometry(0.5, 0.55, 10), mat(COUL.rouge), { y: 4.68 }));
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.add(maille(new THREE.BoxGeometry(0.04, 0.3, 0.04), mat("#5B5C66"), { x: Math.cos(a) * 0.72, y: 4.0, z: Math.sin(a) * 0.72 })); }
  // Faisceau qui tourne
  const geo = new THREE.ConeGeometry(0.9, 7, 16, 1, true); geo.translate(0, -3.5, 0); geo.rotateZ(Math.PI / 2);
  const faisceau = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: "#FFF3B0", transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }));
  faisceau.position.y = 4.15; faisceau.userData.faisceau = true; g.add(faisceau);
  g.add(maille(new THREE.BoxGeometry(0.4, 0.6, 0.05), mat(COUL.boisSombre), { y: 0.95, z: 0.63 }));
  return g;
}

function marche() {
  const g = new THREE.Group();
  g.add(socle(1.8, 4, { dessus: "#C9B07E" }));
  const b = new THREE.Group();
  b.add(maille(new THREE.BoxGeometry(1.7, 1.3, 1.4), mat("#2E7C6B"), { y: 1.1 }));
  b.add(maille(new THREE.ConeGeometry(1.4, 0.9, 4), mat(COUL.violet), { y: 2.2, ry: Math.PI / 4 }));
  b.add(maille(new THREE.BoxGeometry(0.5, 0.8, 0.05), mat(COUL.boisSombre), { y: 0.85, z: 0.72 }));
  // Enseigne
  const enseigne = maille(new THREE.BoxGeometry(1.6, 0.5, 0.08), mat("#F25FB2"), { y: 2.35, z: 0.75, rx: -0.15 });
  b.add(enseigne);
  // Flèches vertes de part et d'autre
  for (const s of [-1, 1]) {
    b.add(maille(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 4), mat(COUL.boisSombre), { x: s * 1.2, y: 1.2, z: 0.3, rz: s * 0.6 }));
    b.add(maille(new THREE.ConeGeometry(0.25, 0.4, 4), mat("#8BE04E"), { x: s * 1.55, y: 1.65, z: 0.3, rz: -s * 0.95 }));
  }
  // Caisses
  for (let i = 0; i < 3; i++) b.add(maille(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat(COUL.bois), { x: -0.9 + i * 0.25, y: 0.65 + (i === 1 ? 0.4 : 0), z: 0.95 - (i === 1 ? 0.15 : 0), ry: i }));
  g.add(b);
  return g;
}

function chantier() {
  const g = new THREE.Group();
  g.add(socle(2.6, 9, { dessus: "#E6C98F" }));
  // Coque d'un bateau en construction (la copie qu'on lance)
  const coque = new THREE.Group();
  const forme = new THREE.CylinderGeometry(0.9, 0.5, 3.0, 8, 1, false, 0, Math.PI); forme.rotateZ(Math.PI / 2); forme.rotateX(Math.PI);
  coque.add(maille(forme, mat(COUL.bois), { y: 1.1 }));
  for (let i = 0; i < 5; i++) coque.add(maille(new THREE.TorusGeometry(0.85, 0.05, 4, 10, Math.PI), mat(COUL.boisSombre), { x: -1.2 + i * 0.6, y: 1.1, ry: Math.PI / 2, rx: Math.PI }));
  coque.add(maille(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 6), mat(COUL.boisSombre), { y: 2.2 }));
  coque.rotation.y = 0.5; coque.position.set(-0.3, 0, 0.2); g.add(coque);
  for (const [x, z] of [[-1.3, -0.6], [0.9, 1.0]]) for (let i = 0; i < 3; i++) g.add(maille(new THREE.BoxGeometry(0.1, 0.9, 0.1), mat(COUL.boisSombre), { x: x + i * 0.4, y: 0.85, z }));
  // Grue
  g.add(maille(new THREE.BoxGeometry(0.25, 3.2, 0.25), mat(COUL.jaune), { x: 1.6, y: 2.0, z: -1.0 }));
  g.add(maille(new THREE.BoxGeometry(2.4, 0.2, 0.2), mat(COUL.jaune), { x: 0.7, y: 3.55, z: -1.0 }));
  g.add(maille(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 4), mat("#333"), { x: -0.3, y: 2.8, z: -1.0 }));
  g.add(maille(new THREE.BoxGeometry(0.4, 0.3, 0.4), mat(COUL.orange), { x: -0.3, y: 2.0, z: -1.0 }));
  // Caisses et tonneaux
  for (let i = 0; i < 4; i++) g.add(maille(new THREE.BoxGeometry(0.42, 0.42, 0.42), mat(i % 2 ? COUL.bois : "#B36A35"), { x: 1.4 + (i % 2) * 0.46, y: 0.68 + Math.floor(i / 2) * 0.42, z: 1.2, ry: i * 0.3 }));
  for (let i = 0; i < 2; i++) g.add(maille(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 8), mat("#8A4A22"), { x: -1.9 + i * 0.5, y: 0.7, z: 1.3 }));
  g.add(palmier(-1.9, -1.2, 0.85, 3.3));
  return g;
}

function createurs(nb) {
  const g = new THREE.Group();
  g.add(socle(3.0, 11));
  const couleurs = [COUL.orange, "#4F7FE0", COUL.vert, "#C13C6B", "#F2A541", "#2FA7BC", COUL.violet, "#3DAE76"];
  const n = Math.max(3, Math.min(8, nb));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3, d = 1.6;
    const m = new THREE.Group();
    const h = 0.8 + hasard(i + 4) * 0.9;
    m.add(maille(new THREE.BoxGeometry(0.8, h, 0.8), mat(COUL.blanc), { y: h / 2 }));
    m.add(maille(new THREE.ConeGeometry(0.68, 0.6, 4), mat(couleurs[i % couleurs.length]), { y: h + 0.3, ry: Math.PI / 4 }));
    const fen = maille(new THREE.BoxGeometry(0.25, 0.25, 0.03), new THREE.MeshStandardMaterial({ color: "#FFE3A6", emissive: "#FFB84D", emissiveIntensity: 0, flatShading: true }), { y: h * 0.6, z: 0.41, ombre: false });
    fen.userData.fenetre = true; m.add(fen);
    m.position.set(Math.cos(a) * d, 0.45, Math.sin(a) * d); m.rotation.y = -a + Math.PI / 2;
    g.add(m);
  }
  // Place centrale avec un mât au drapeau Bingoo!
  g.add(maille(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 10), mat(COUL.sable), { y: 0.5 }));
  g.add(maille(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 5), mat(COUL.boisSombre), { y: 1.6 }));
  const d = maille(new THREE.BoxGeometry(0.7, 0.4, 0.03), mat(COUL.orange), { x: 0.35, y: 2.5, ombre: false }); d.userData.drapeau = true; g.add(d);
  g.add(palmier(2.2, -1.0, 0.8, 5.1));
  return g;
}

function atlas() {
  const g = new THREE.Group();
  g.add(socle(2.0, 13));
  g.add(maille(new THREE.CylinderGeometry(0.5, 0.7, 0.8, 8), mat(COUL.pierre), { y: 0.85 }));
  const globe = new THREE.Group();
  globe.add(maille(new THREE.IcosahedronGeometry(0.95, 1), mat("#3A8FD8"), {}));
  // Continents posés sur le globe
  for (let i = 0; i < 9; i++) {
    const u = hasard(i * 3 + 1) * Math.PI * 2, v = (hasard(i * 3 + 2) - 0.5) * 2.2;
    const p = new THREE.Vector3(Math.cos(u) * Math.cos(v * 0.6), Math.sin(v * 0.6), Math.sin(u) * Math.cos(v * 0.6)).multiplyScalar(0.92);
    const c = maille(new THREE.DodecahedronGeometry(0.22 + hasard(i) * 0.18, 0), mat(i % 3 ? COUL.herbe : COUL.sable), { x: p.x, y: p.y, z: p.z, ombre: false });
    c.scale.set(1, 0.45, 1); c.lookAt(p.clone().multiplyScalar(2)); globe.add(c);
  }
  globe.add(maille(new THREE.TorusGeometry(1.15, 0.05, 4, 24), mat("#C9A04A"), { rx: 1.1 }));
  globe.position.y = 2.25; globe.userData.globe = true; g.add(globe);
  g.add(palmier(-1.4, 0.8, 0.8, 7.7)); g.add(palmier(1.3, 1.0, 0.7, 2.9));
  return g;
}

function bateau(couleurVoile) {
  const g = new THREE.Group();
  const coque = new THREE.CylinderGeometry(0.42, 0.22, 1.3, 6, 1, false, 0, Math.PI); coque.rotateZ(Math.PI / 2); coque.rotateX(Math.PI);
  g.add(maille(coque, mat("#7A3C59"), { y: 0.05 }));
  g.add(maille(new THREE.BoxGeometry(1.2, 0.06, 0.6), mat(COUL.bois), { y: 0.12 }));
  g.add(maille(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 4), mat(COUL.boisSombre), { y: 0.85 }));
  const voile = new THREE.BufferGeometry();
  voile.setAttribute("position", new THREE.Float32BufferAttribute([0, 0.25, 0, 0, 1.55, 0, 0.7, 0.3, 0.05], 3)); voile.computeVertexNormals();
  g.add(new THREE.Mesh(voile, new THREE.MeshStandardMaterial({ color: couleurVoile, side: THREE.DoubleSide, flatShading: true })));
  return g;
}

function personnage({ peau = "#F1C7A0", habit = COUL.vert, chapeau = COUL.vert, barbe = false, baton = false } = {}) {
  const g = new THREE.Group();
  g.add(maille(new THREE.CylinderGeometry(0.16, 0.22, 0.55, 6), mat(habit), { y: 0.3 }));
  g.add(maille(new THREE.DodecahedronGeometry(0.17, 0), mat(peau), { y: 0.72 }));
  if (barbe) g.add(maille(new THREE.ConeGeometry(0.14, 0.35, 5), mat("#EEE"), { y: 0.55, z: 0.1, rx: Math.PI }));
  g.add(maille(new THREE.ConeGeometry(0.2, 0.32, 6), mat(chapeau), { y: 0.95 }));
  if (baton) g.add(maille(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 4), mat(COUL.boisSombre), { x: 0.28, y: 0.6 }));
  return g;
}

function tortue() {
  const g = new THREE.Group();
  g.add(maille(new THREE.SphereGeometry(0.75, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat("#8A5A35"), { y: -0.25 }));
  g.add(maille(new THREE.DodecahedronGeometry(0.22, 0), mat("#5FA36A"), { x: 0.85, y: -0.25 }));
  for (const [x, z] of [[0.5, 0.55], [0.5, -0.55], [-0.5, 0.55], [-0.5, -0.55]]) g.add(maille(new THREE.BoxGeometry(0.35, 0.08, 0.2), mat("#5FA36A"), { x, y: -0.35, z }));
  const p = personnage({ habit: COUL.vert, chapeau: "#3C8F3A", baton: true }); p.position.y = 0.1; g.add(p);
  return g;
}

// ---------------------------------------------------------------- La scène
// Placement pensé à l'écran (sx vers la droite, sy vers le bas), converti en coordonnées du monde isométrique
const ecran = (sx, sy) => ({ x: ((sx + sy) / 2) * 1.45, z: ((sy - sx) / 2) * 1.45 });
export const LIEUX = [
  { id: "classement", nom: "La Tour des records", ...ecran(-9.5, -4), page: "/explorer/classement" },
  { id: "atlas", nom: "L'Atlas des pays", ...ecran(1, -9), page: null },
  { id: "niches", nom: "Le Château des niches", ...ecran(11, -3), page: "/explorer/niches" },
  { id: "phare", nom: "Le Phare de ce qui monte", ...ecran(0.5, 1.5), page: "/explorer/marche" },
  { id: "marche", nom: "Le Marché", ...ecran(-16, 5), page: "/explorer/vendre" },
  { id: "createurs", nom: "L'Île des créateurs", ...ecran(-7.5, 9.5), page: "/explorer/createurs" },
  { id: "chantier", nom: "Le Chantier naval", ...ecran(9, 9), page: "/explorer/copier" },
  { id: "sage", nom: "Le Sage", ...ecran(17, 5.5), page: "/explorer/demande" },
];

// ---------------------------------------------------------------- L'Atlas : un continent par île, un immeuble par pays
const CONTINENTS = [
  ["amnord", "Amérique du Nord", "#F2A541", "#F7E3B5", -13, -3], ["europe", "Europe", "#4F7FE0", "#D9E5FA", 0, -7.5], ["asie", "Asie", "#B45FC8", "#EFDDF3", 13.5, -3],
  ["amsud", "Amérique du Sud", "#3DAE76", "#D5EEDD", -8.5, 7.5], ["afrique", "Afrique", "#E0692F", "#F8DCC9", 2.5, 6.5], ["oceanie", "Océanie", "#2FA7BC", "#D3EEF2", 15, 8.5],
];
const nomsPays = (() => { try { return new Intl.DisplayNames(["fr"], { type: "region" }); } catch { return null; } })();
export const nomPays = (c) => { try { return nomsPays?.of(c) ?? c; } catch { return c; } };
const drapeauPays = (c) => (c && c.length === 2 ? String.fromCodePoint(...[...c.toUpperCase()].map((x) => 127397 + x.charCodeAt(0))) : "");
function lieuxAtlas(pays, ileDe) {
  const par = {};
  for (const p of pays ?? []) { const k = ileDe[p.pays]; if (k) (par[k] ??= []).push(p); }
  const totaux = CONTINENTS.map(([id]) => (par[id] ?? []).reduce((a, p) => a + Number(p.n), 0));
  const maxT = Math.max(1, ...totaux), maxN = Math.max(1, ...(pays ?? []).map((p) => Number(p.n)));
  return CONTINENTS.map(([id, nom, c, sol, sx, sy], i) => {
    const liste = (par[id] ?? []).sort((a, b) => b.n - a.n);
    const r = 2.3 + 2.1 * Math.sqrt(totaux[i] / maxT);
    return { id, nom, couleur: c, sol, ...ecran(sx, sy), r, liste, maxN, total: totaux[i], haut: 1.6 + 5.6 * Math.sqrt((liste[0]?.n ?? 0) / maxN) + 1.4, texte: `${totaux[i].toLocaleString("fr-FR")} SaaS, ${liste.length} pays` };
  });
}
function ileContinent(l, graine) {
  const g = socle(l.r, graine, { dessus: l.sol === "#F8DCC9" ? "#D9B77A" : COUL.herbe });
  const places = [[0, 0]];
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.4; places.push([Math.cos(a) * l.r * 0.42, Math.sin(a) * l.r * 0.42]); }
  for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2 + 0.1; places.push([Math.cos(a) * l.r * 0.72, Math.sin(a) * l.r * 0.72]); }
  l.liste.slice(0, places.length).forEach((p, i) => {
    const [x, z] = places[i];
    const h = 0.7 + 5.6 * Math.sqrt(Number(p.n) / l.maxN), w = i === 0 ? 1.15 : 0.78;
    const b = new THREE.Group();
    b.add(maille(new THREE.BoxGeometry(w, h, w), mat(i % 2 ? COUL.blanc : l.sol), { y: h / 2 }));
    b.add(maille(new THREE.BoxGeometry(w + 0.12, 0.12, w + 0.12), mat(l.couleur), { y: h + 0.06 }));
    for (let e = 0; e < Math.min(8, Math.floor(h / 0.55)); e++) for (const sx of [-1, 1]) {
      const f = maille(new THREE.BoxGeometry(0.16, 0.2, 0.03), new THREE.MeshStandardMaterial({ color: "#FFE3A6", emissive: "#FFB84D", emissiveIntensity: 0, flatShading: true }), { x: sx * w * 0.22, y: 0.35 + e * 0.55, z: w / 2 + 0.02, ombre: false });
      f.userData.fenetre = true; b.add(f);
    }
    b.add(maille(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4), mat(COUL.boisSombre), { y: h + 0.4 }));
    const dr = maille(new THREE.BoxGeometry(0.36, 0.22, 0.02), mat(l.couleur), { x: 0.18, y: h + 0.6, ombre: false }); dr.userData.drapeau = true; b.add(dr);
    b.position.set(x, 0.45, z); b.rotation.y = hasard(graine + i) * 0.6 - 0.3;
    b.traverse((o) => { o.userData.pays = p.pays; });
    g.add(b);
  });
  for (let k = 0; k < 3; k++) { const a = hasard(graine * 5 + k) * 6.28; g.add(palmier(Math.cos(a) * l.r * 0.86, Math.sin(a) * l.r * 0.86, 0.7, k + graine)); }
  return g;
}

export default function IleSaas({ d, onLieu, nuit, mode = "archipel", pays, ileDe }) {
  const lieux = useMemo(() => (mode === "atlas" ? lieuxAtlas(pays, ileDe ?? {}) : LIEUX), [mode, pays, ileDe]);
  const [bulle, setBulle] = useState(null);
  const boite = useRef(null);
  const etat = useRef({});
  const rappel = useRef(onLieu);
  rappel.current = onLieu;
  const [labels, setLabels] = useState([]);
  const [survol, setSurvol] = useState(null);
  const reduit = useMemo(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);

  const [pret, setPret] = useState(!!THREE);
  const [erreur, setErreur] = useState(false);
  useEffect(() => { if (!pret) chargerThree().then(() => setPret(true), () => setErreur(true)); }, [pret]);
  useEffect(() => {
    const el = boite.current; if (!el || !pret) return undefined;
    const W = () => el.clientWidth, H = () => el.clientHeight;
    const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendu.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    rendu.setSize(W(), H());
    rendu.shadowMap.enabled = true; rendu.shadowMap.type = THREE.PCFSoftShadowMap;
    rendu.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(rendu.domElement);
    const scene = new THREE.Scene();

    // Caméra isométrique (orthographique), zoom et déplacement à la souris ou au doigt
    // Le haut de la scène porte les boutons et la guide : on décale le monde un peu vers le bas de l'écran
    const centre = mode === "atlas" ? new THREE.Vector3(ecran(1, -2.2).x, 0, ecran(1, -2.2).z) : new THREE.Vector3(-1.9, 0, -2.65);
    const vue = { zoom: 1, cible: centre.clone() };
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 200);
    const cadrer = () => {
      const r = W() / H(), base = (mode === "atlas" ? 1.12 : 1) * (W() < 640 ? 24 : W() / H() > 1.6 ? 12.5 : 14.5);
      const h = base / vue.zoom, w = h * r;
      cam.left = -w; cam.right = w; cam.top = h; cam.bottom = -h; cam.updateProjectionMatrix();
      cam.position.copy(vue.cible).add(new THREE.Vector3(20, 20, 20)); cam.lookAt(vue.cible);
    };
    cadrer();

    // Lumières
    const ciel = new THREE.HemisphereLight("#CFF3FF", "#2D6EA8", 1.0); scene.add(ciel);
    const soleil = new THREE.DirectionalLight("#FFF1D6", 2.2);
    soleil.position.set(14, 26, 8); soleil.castShadow = true;
    soleil.shadow.mapSize.set(2048, 2048);
    Object.assign(soleil.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 });
    soleil.shadow.bias = -0.0008;
    scene.add(soleil);

    // Océan : dégradé du bleu profond au turquoise, petites vagues qui bougent
    const oceanMat = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, nuit: { value: 0 } },
      vertexShader: "varying vec3 vP; void main(){ vP = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vP,1.); }",
      fragmentShader: `varying vec3 vP; uniform float t; uniform float nuit;
        void main(){ float d = length(vP.xz - vec2(1.2,0.6)) / 30.;
          vec3 c = mix(vec3(0.20,0.80,0.89), vec3(0.06,0.33,0.68), smoothstep(0.05, 1.0, d));
          vec2 q = vec2(vP.x - vP.z, vP.x + vP.z);
          float s1 = sin(q.x*1.7 + t*0.8) * sin(q.y*2.3 - t*0.6);
          float s2 = sin(q.x*0.9 - t*0.5 + 1.3) * sin(q.y*1.1 + t*0.4);
          c += smoothstep(0.82, 0.98, s1) * 0.05 + smoothstep(0.88, 1.0, s2) * 0.04;
          c = mix(c, c*vec3(0.32,0.42,0.7), nuit);
          gl_FragColor = vec4(c, 1.); }`,
    });
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(220, 220, 1, 1), oceanMat);
    ocean.rotation.x = -Math.PI / 2; ocean.position.y = -0.6; scene.add(ocean);
    // Rochers sous l'eau, poissons
    for (let i = 0; i < 26; i++) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + hasard(i) * 0.9, 0), new THREE.MeshBasicMaterial({ color: "#1F67B3", transparent: true, opacity: 0.55, depthWrite: false }));
      r.position.set((hasard(i * 3) - 0.5) * 56, -0.95, (hasard(i * 5) - 0.5) * 50); r.scale.y = 0.35; scene.add(r);
    }
    const poissons = [];
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 3), new THREE.MeshBasicMaterial({ color: "#174C8F", transparent: true, opacity: 0.55, depthWrite: false }));
      p.rotation.z = Math.PI / 2; p.position.y = -0.9; p.userData = { r: 14 + i * 3, v: 0.05 + hasard(i) * 0.05, a: hasard(i + 3) * 6, c: [(hasard(i + 8) - 0.5) * 6, (hasard(i + 9) - 0.5) * 6] };
      scene.add(p); poissons.push(p);
    }

    // Les lieux
    const objets = {};
    const fabriques = {
      classement: () => tourRecords(Math.min(6, 3 + Math.floor((d?.grands ?? 0) / 50))),
      niches: () => chateau(["#F2C14E", "#4F7FE0", "#3DAE76", "#E0531F"]),
      phare: () => phare(), marche: () => marche(), chantier: () => chantier(),
      createurs: () => createurs(d?.apps ?? 4), atlas: () => atlas(),
      sage: () => { const g = new THREE.Group(); g.add(maille(new THREE.BoxGeometry(1.1, 0.5, 1.1), mat(COUL.bois), { y: -0.35 })); g.add(maille(new THREE.BoxGeometry(1.15, 0.08, 1.15), mat(COUL.boisSombre), { y: -0.1 })); const p = personnage({ habit: "#E8C65A", chapeau: "#F1EFEA", peau: "#F0C9A7", barbe: true, baton: true }); p.position.y = -0.05; p.scale.setScalar(1.6); g.add(p); g.add(maille(new THREE.DodecahedronGeometry(0.14, 0), mat(COUL.orange), { x: -0.35, y: 0.05, z: 0.3 })); g.userData.flotte = true; return g; },
    };
    lieux.forEach((l, i) => {
      const g = mode === "atlas" ? ileContinent(l, 20 + i * 3) : fabriques[l.id](); g.position.set(l.x, 0, l.z); g.userData.lieu = l.id;
      g.traverse((o) => { o.userData.lieu = l.id; });
      scene.add(g); objets[l.id] = g;
    });
    // Bateaux : un par SaaS à vendre (jusqu'à 6), qui naviguent entre les îles
    const voiles = [COUL.blanc, "#FFE7C2", "#E6F0FF", "#FFD6D6", COUL.blanc, "#E8FFE0"];
    const bateaux = (mode === "atlas" ? [] : d?.ventes ?? []).slice(0, 6).map((v, i) => {
      const b = bateau(voiles[i % voiles.length]); b.scale.setScalar(1.15);
      b.userData = { vente: v, r: 9 + (i % 3) * 3.2, v: (0.025 + hasard(i) * 0.02) * (i % 2 ? 1 : -1), a: (i / 6) * Math.PI * 2, c: [hasard(i + 2) * 2 - 1, 2 + hasard(i + 5) * 2] };
      b.traverse((o) => { o.userData.bateau = i; });
      scene.add(b); return b;
    });
    const tort = tortue(); tort.scale.setScalar(0.9); scene.add(tort);
    // Habitants qui se promènent sur les îles (aller-retour, ou tour de place)
    const CHEMINS = {
      classement: [[[-1.7, 1.5], [1.4, 2.0]], [[2.3, -0.6], [2.1, 1.4]], [[-2.0, -0.4], [-0.6, -2.2]]],
      niches: [[[-1.6, 2.0], [1.4, 2.1]], [[2.5, -1.2], [2.5, 1.0]], [[-2.5, -1.0], [-2.5, 1.0]]],
      marche: [[[-1.0, 1.15], [0.9, 1.25]]],
      chantier: [[[-1.9, 1.5], [0.9, 1.9]], [[0.4, -1.6], [1.9, 0.0]], [[-1.6, -0.2], [-0.4, 1.2]]],
      createurs: [[[0, 1.0], [1.0, 0], [0, -1.0], [-1.0, 0]], [[-2.2, 0.6], [-1.0, 2.0]], [[1.8, 1.4], [2.2, -0.2]]],
      atlas: [[[-1.1, 1.2], [1.2, 1.0]]],
      phare: [[[-0.8, 0.75], [0.7, 0.8]]],
    };
    if (mode === "atlas") { for (const k of Object.keys(CHEMINS)) delete CHEMINS[k]; lieux.forEach((l) => { const r = l.r * 0.92; CHEMINS[l.id] = [[[r, 0], [0, r], [-r, 0], [0, -r]], [[-r * 0.9, r * 0.3], [-r * 0.3, r * 0.9]]]; }); }
    const SOL = { niches: 0.68, phare: 0.32 };
    const tenues = [[COUL.orange, "#2B2F45"], ["#4F7FE0", "#F6C343"], [COUL.vert, "#8A4A22"], ["#C13C6B", "#F1EFEA"], ["#F2A541", "#2F9E92"], ["#6B4FA3", "#E0531F"], ["#2FA7BC", "#16213A"], ["#D8433A", "#F6C343"]];
    const habitants = [];
    let nh = 0;
    for (const [id, chemins] of Object.entries(CHEMINS)) for (const pts of chemins) {
      const [habit, chapeau] = tenues[nh % tenues.length];
      const h = personnage({ habit, chapeau, peau: ["#F1C7A0", "#C98B5E", "#8D5A3B", "#F5D5B8"][nh % 4] });
      h.scale.setScalar(0.72);
      h.userData = { lieu: id, pts, boucle: pts.length > 2, v: 0.32 + hasard(nh) * 0.2, p: hasard(nh + 4) * pts.length, sol: SOL[id] ?? 0.5 };
      objets[id]?.add(h); habitants.push(h); nh++;
    }
    // Mouettes
    const oiseaux = [];
    for (let i = 0; i < 5; i++) {
      const o = new THREE.Group();
      const aile = (s) => { const a = maille(new THREE.BoxGeometry(0.55, 0.04, 0.16), mat("#FFFFFF"), { x: s * 0.27, ombre: false }); const piv = new THREE.Group(); piv.add(a); a.position.x = s * 0.27; piv.userData.aile = s; return piv; };
      o.add(maille(new THREE.BoxGeometry(0.18, 0.1, 0.32), mat("#F4F4F4"), { ombre: false })); o.add(aile(1)); o.add(aile(-1));
      o.userData = { r: 6 + i * 2.5, a: hasard(i) * 6.28, v: 0.18 + hasard(i + 2) * 0.12, y: 6.5 + i * 0.6, c: [hasard(i + 7) * 8 - 4, hasard(i + 9) * 8 - 4] };
      scene.add(o); oiseaux.push(o);
    }

    // Interaction : survol, clic, glisser, zoom
    const ray = new THREE.Raycaster(), souris = new THREE.Vector2();
    let glisse = null, bouge = false;
    const viser = (e) => {
      const r = rendu.domElement.getBoundingClientRect();
      souris.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(souris, cam);
      const h = ray.intersectObjects(scene.children, true).find((x) => x.object.userData.pays || x.object.userData.lieu || x.object.userData.bateau !== undefined);
      return h ? (h.object.userData.pays ? { pays: h.object.userData.pays, lieu: h.object.userData.lieu } : h.object.userData.bateau !== undefined ? { bateau: h.object.userData.bateau } : { lieu: h.object.userData.lieu }) : null;
    };
    const surPointeur = (e) => {
      if (glisse) {
        const dx = e.clientX - glisse.x, dy = e.clientY - glisse.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) bouge = true;
        const k = (cam.right - cam.left) / W();
        const droite = new THREE.Vector3(1, 0, -1).normalize(), bas = new THREE.Vector3(1, 0, 1).normalize();
        vue.cible.copy(glisse.c).addScaledVector(droite, -dx * k).addScaledVector(bas, -dy * k * 1.4);
        cadrer(); return;
      }
      const h = viser(e);
      const id = h?.lieu ?? (h?.bateau !== undefined ? `bateau-${h.bateau}` : null);
      etat.current.survol = id; setSurvol(id);
      if (h?.pays) { const r = rendu.domElement.getBoundingClientRect(); const p = (pays ?? []).find((q) => q.pays === h.pays); setBulle({ code: h.pays, n: p?.n, x: e.clientX - r.left, y: e.clientY - r.top }); } else setBulle(null);
      rendu.domElement.style.cursor = id ? "pointer" : "grab";
    };
    const bas = (e) => { glisse = { x: e.clientX, y: e.clientY, c: vue.cible.clone() }; bouge = false; rendu.domElement.setPointerCapture?.(e.pointerId); };
    const haut = (e) => {
      const etaitGlisse = bouge; glisse = null;
      if (etaitGlisse) return;
      const h = viser(e);
      if (h?.pays) { rappel.current?.("pays", h.pays); return; }
      if (h?.lieu) { const l = lieux.find((x) => x.id === h.lieu); etat.current.vol = { de: vue.cible.clone(), a: new THREE.Vector3(l.x, 0, l.z + 1), z0: vue.zoom, z1: Math.max(vue.zoom, 1.6), t: 0 }; rappel.current?.(h.lieu); }
      else if (h?.bateau !== undefined) rappel.current?.("bateau", bateaux[h.bateau]?.userData.vente);
    };
    const molette = (e) => { e.preventDefault(); vue.zoom = Math.max(0.7, Math.min(3, vue.zoom * (e.deltaY < 0 ? 1.1 : 0.9))); cadrer(); };
    rendu.domElement.addEventListener("pointermove", surPointeur);
    rendu.domElement.addEventListener("pointerdown", bas);
    rendu.domElement.addEventListener("pointerup", haut);
    rendu.domElement.addEventListener("wheel", molette, { passive: false });
    rendu.domElement.style.cursor = "grab"; rendu.domElement.style.touchAction = "none";
    etat.current.recentrer = () => { etat.current.vol = { de: vue.cible.clone(), a: centre.clone(), z0: vue.zoom, z1: 1, t: 0 }; };
    etat.current.zoomer = (k) => { vue.zoom = Math.max(0.7, Math.min(3, vue.zoom * k)); cadrer(); };

    // Animation
    let t = 0, dernier = performance.now(), anim = 0, compteurLabels = 0;
    const tmp = new THREE.Vector3();
    const boucle = (maintenant) => {
      anim = requestAnimationFrame(boucle);
      if (document.hidden) return;
      const dt = Math.min(0.05, (maintenant - dernier) / 1000); dernier = maintenant;
      if (!reduit) t += dt;
      const n = etat.current.nuit ? 1 : 0;
      oceanMat.uniforms.t.value = t; oceanMat.uniforms.nuit.value += (n - oceanMat.uniforms.nuit.value) * 0.05;
      const k = oceanMat.uniforms.nuit.value;
      soleil.intensity = 2.2 * (1 - k * 0.8); ciel.intensity = 1.0 - k * 0.55;
      soleil.color.set(k > 0.5 ? "#9DB4FF" : "#FFF1D6");
      // Vol de caméra vers un lieu
      const v = etat.current.vol;
      if (v) { v.t = Math.min(1, v.t + dt * 1.6); const e = 1 - Math.pow(1 - v.t, 3); vue.cible.lerpVectors(v.de, v.a, e); vue.zoom = v.z0 + (v.z1 - v.z0) * e; cadrer(); if (v.t >= 1) etat.current.vol = null; }
      scene.traverse((o) => {
        const u = o.userData;
        if (u.ecume) { o.scale.setScalar(1 + Math.sin(t * 1.5 + o.parent.position.x) * 0.025); o.material.opacity = 0.55 * (1 - k * 0.55); }
        if (u.halo) o.material.opacity = u.halo * (1 - k * 0.6);
        if (u.drapeau) o.rotation.y = Math.sin(t * 3 + o.position.x) * 0.35;
        if (u.flamme) { o.scale.y = 1 + Math.sin(t * 13 + o.position.x * 5) * 0.18; }
        if (u.torche) o.intensity = k * (2.2 + Math.sin(t * 11) * 0.4);
        if (u.fenetre) o.material.emissiveIntensity = k * 1.4;
        if (u.lampe) o.material.emissiveIntensity = 0.6 + k * 2;
        if (u.faisceau) { o.rotation.y = t * 0.9; o.material.opacity = 0.05 + k * 0.28; }
        if (u.globe) o.rotation.y = t * 0.35;
        if (u.flotte) { o.position.y = Math.sin(t * 1.4) * 0.08; o.rotation.z = Math.sin(t * 1.1) * 0.04; }
      });
      // Survol : l'île se soulève un peu
      for (const [id, g] of Object.entries(objets)) { const cibleY = etat.current.survol === id ? 0.35 : 0; g.position.y += (cibleY - g.position.y) * 0.15; }
      for (const b of bateaux) {
        const u = b.userData; u.a += u.v * dt * 4;
        const x = u.c[0] + Math.cos(u.a) * u.r, z = u.c[1] + Math.sin(u.a) * u.r * 0.75;
        b.rotation.y = Math.atan2(-(z - b.position.z), x - b.position.x);
        b.position.set(x, -0.45 + Math.sin(t * 2 + u.a) * 0.05, z);
        b.rotation.z = Math.sin(t * 1.7 + u.a) * 0.06;
      }
      const ta = t * 0.06;
      const tx = -4 + Math.cos(ta) * 11, tz = 4 + Math.sin(ta) * 8;
      tort.rotation.y = Math.atan2(-(tz - tort.position.z), tx - tort.position.x); tort.position.set(tx, -0.35, tz);
      for (const h of habitants) {
        const u = h.userData, n = u.pts.length;
        u.p = (u.p + dt * u.v * 0.5) % (u.boucle ? n : 2 * (n - 1));
        let seg = Math.floor(u.p), f = u.p - seg, a, b;
        if (u.boucle) { a = u.pts[seg % n]; b = u.pts[(seg + 1) % n]; }
        else if (seg < n - 1) { a = u.pts[seg]; b = u.pts[seg + 1]; } else { const r = seg - (n - 1); a = u.pts[n - 1 - r]; b = u.pts[Math.max(0, n - 2 - r)]; }
        const x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f;
        h.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
        h.position.set(x, u.sol + Math.abs(Math.sin(t * 9 + u.v * 10)) * 0.05, z);
      }
      for (const o of oiseaux) {
        const u = o.userData; u.a += u.v * dt;
        o.position.set(u.c[0] + Math.cos(u.a) * u.r, u.y + Math.sin(t + u.r) * 0.3, u.c[1] + Math.sin(u.a) * u.r);
        o.rotation.y = -u.a;
        for (const c of o.children) if (c.userData.aile) c.rotation.z = c.userData.aile * Math.sin(t * 8 + u.r) * 0.5;
      }
      for (const p of poissons) { const u = p.userData; u.a += u.v * dt * 3; p.position.x = u.c[0] + Math.cos(u.a) * u.r; p.position.z = u.c[1] + Math.sin(u.a) * u.r * 0.6; p.rotation.y = -u.a; }
      rendu.render(scene, cam);
      // Étiquettes HTML au-dessus des lieux (mises à jour quelques fois par seconde)
      if (++compteurLabels % 3 === 0) {
        const hauteurs = { classement: 7.8, niches: 5.4, phare: 5.6, marche: 3.4, chantier: 4.2, createurs: 3.4, atlas: 4.2, sage: 2.2 };
        const brut = lieux.map((l) => {
          tmp.set(l.x, (l.haut ?? hauteurs[l.id]) + objets[l.id].position.y, l.z).project(cam);
          return { id: l.id, x: (tmp.x * 0.5 + 0.5) * W(), y: (-tmp.y * 0.5 + 0.5) * H(), w: l.nom.length * 7.6 + 26 };
        }).sort((a, b) => a.y - b.y);
        // Pas de chevauchement : étiquette réduite au nom, puis décalée vers le haut si besoin
        const poses = [];
        const touche = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 4 && a.y > b.y - a.h - 4 && a.y - a.h < b.y + 4;
        for (const l of brut) {
          l.compact = vue.zoom < 0.95; l.h = l.compact ? 26 : 40;
          if (poses.some((p) => touche(l, p))) { l.compact = true; l.h = 26; }
          for (let k = 0; k < 6 && poses.some((p) => touche(l, p)); k++) l.y -= 14;
          poses.push(l);
        }
        setLabels(brut);
      }
    };
    anim = requestAnimationFrame(boucle);
    const taille = () => { rendu.setSize(W(), H()); cadrer(); };
    const ro = new ResizeObserver(taille); ro.observe(el);
    return () => {
      cancelAnimationFrame(anim); ro.disconnect();
      rendu.domElement.removeEventListener("wheel", molette);
      scene.traverse((o) => { o.geometry?.dispose?.(); if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose()); else o.material?.dispose?.(); });
      rendu.dispose(); el.removeChild(rendu.domElement);
    };
  }, [d, reduit, pret, lieux, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { etat.current.nuit = nuit; }, [nuit]);

  const texte = {
    classement: d?.records?.[0] ? `N° 1 : ${d.records[0].nom}` : "Le classement",
    niches: d?.niches?.[0] ? `${d.niches.length} grandes niches` : "Les niches",
    phare: d?.monte ? `${d.monte.emoji} ${d.monte.nom} +${d.monte.crois_med} %` : "Ce qui monte",
    marche: d ? `${d.nb_ventes} SaaS à vendre` : "À vendre",
    chantier: d ? `${Number(d.a_copier).toLocaleString("fr-FR")} à copier` : "À copier",
    createurs: d ? `${d.apps} SaaS construits` : "Créateurs",
    atlas: d ? `${d.pays} pays` : "Les pays",
    sage: "Pose-lui ta question",
  };
  return (
    <div className="relative w-full h-full">
      <div ref={boite} className="absolute inset-0" />
      {!pret && <div className="absolute inset-0 grid place-items-center text-white/80 text-[14px] font-semibold">{erreur ? "L'archipel n'a pas pu se charger : vérifie ta connexion et recharge la page." : "L'archipel se dessine…"}</div>}
      {labels.map((l) => {
        const lieu = lieux.find((x) => x.id === l.id);
        const on = survol === l.id;
        return (
          <button key={l.id} onClick={() => onLieu?.(l.id)} style={{ left: l.x, top: l.y, zIndex: on ? 15 : 10, transform: `translate(-50%, -100%) scale(${on ? 1.08 : 1})` }}
            className={cx2("absolute z-10 whitespace-nowrap rounded-xl px-3 py-1.5 text-left shadow-[0_6px_16px_rgba(10,30,70,.35)] transition-transform", on ? "bg-white" : "bg-[#16213A]/90 text-white")}>
            <span className="block text-[13px] font-black leading-tight" style={{ fontFamily: "var(--font-titre)" }}>{lieu.nom}</span>
            {(!l.compact || on) && <span className={cx2("block text-[11.5px] font-semibold leading-tight", on ? "text-[#BF4314]" : "text-[#FFC9A8]")}>{lieu.texte ?? texte[l.id]}</span>}
          </button>
        );
      })}
      {bulle && <div className="pointer-events-none absolute z-20 rounded-xl bg-white px-3 py-1.5 text-[13px] font-bold text-[#16213A] shadow-lg" style={{ left: bulle.x + 14, top: bulle.y - 10 }}>{drapeauPays(bulle.code)} {nomPays(bulle.code)}{bulle.n != null ? <span className="font-semibold text-[#BF4314]"> · {Number(bulle.n).toLocaleString("fr-FR")} SaaS</span> : null}</div>}
      <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-1.5">
        <button onClick={() => etat.current.zoomer?.(1.2)} aria-label="Zoomer" className="h-9 w-9 rounded-xl bg-white/90 text-[18px] font-black text-[#16213A] shadow">+</button>
        <button onClick={() => etat.current.zoomer?.(0.83)} aria-label="Dézoomer" className="h-9 w-9 rounded-xl bg-white/90 text-[18px] font-black text-[#16213A] shadow">−</button>
        <button onClick={() => etat.current.recentrer?.()} aria-label="Recentrer" className="h-9 w-9 rounded-xl bg-white/90 text-[15px] font-black text-[#16213A] shadow">⌂</button>
      </div>
    </div>
  );
}
const cx2 = (...c) => c.filter(Boolean).join(" ");
