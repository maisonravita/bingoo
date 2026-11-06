import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* Bingoo!-ville en vue isométrique (dessins originaux, couleurs Bingoo!). Une parcelle par partie de l'application,
   des rues, des arbres, et au survol (ou au focus clavier) une carte « en direct » avec les vrais chiffres. Clic = on entre. */

const cx2 = (...a) => a.filter(Boolean).join(" ");
const C = Math.cos(Math.PI / 6), S = 0.5, U = 13; // projection : 1 unité = 11 px
const P = (x, y, z = 0) => [(x - y) * C * U, (x + y) * S * U - z * U];
const pts = (a) => a.map(([x, y, z]) => P(x, y, z).join(",")).join(" ");
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };

/** Pavé : x, y = coin arrière, w (vers la droite-bas), d (vers la gauche-bas), h = hauteur. */
function Box({ x, y, z = 0, w, d, h, c, top }) {
  return (
    <g>
      <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={shade(c, 0.78)} />
      <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={shade(c, 0.92)} />
      <polygon points={pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={top ?? c} />
    </g>
  );
}
/** Toit à deux pans (faîtage parallèle à x). */
function Roof({ x, y, z, w, d, h, c }) {
  const m = y + d / 2;
  return (
    <g>
      <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, m, z + h], [x, m, z + h]])} fill={shade(c, 0.85)} />
      <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, m, z + h]])} fill={shade(c, 0.7)} />
      <polygon points={pts([[x, y, z], [x + w, y, z], [x + w, m, z + h], [x, m, z + h]])} fill={c} />
    </g>
  );
}
/** Fenêtre ou porte sur la face avant gauche (plan y = y0+d) ou droite (plan x = x0+w). */
const FaceL = ({ x, y, z, w, h, c }) => <polygon points={pts([[x, y, z], [x + w, y, z], [x + w, y, z + h], [x, y, z + h]])} fill={c} />;
const FaceR = ({ x, y, z, d, h, c }) => <polygon points={pts([[x, y, z], [x, y + d, z], [x, y + d, z + h], [x, y, z + h]])} fill={c} />;
// Décor : arbres ronds touffus, conifères, lampadaires, bancs, haies fleuries
function Tree({ x, y, kind, s = 1 }) {
  const [px, py] = P(x, y, 0);
  return kind ? (
    <g><ellipse cx={px} cy={py} rx={7 * s} ry={3.5 * s} fill="rgba(80,60,30,.12)" /><path d={`M${px - 7 * s} ${py - 3} L${px} ${py - 34 * s} L${px + 7 * s} ${py - 3}Z`} fill="#5E9E45" /><path d={`M${px} ${py - 34 * s} L${px + 7 * s} ${py - 3} L${px} ${py - 3}Z`} fill="#4C8838" /></g>
  ) : (
    <g><ellipse cx={px} cy={py} rx={9 * s} ry={4.5 * s} fill="rgba(80,60,30,.12)" /><rect x={px - 1.6} y={py - 13 * s} width="3.2" height={13 * s} rx="1" fill="#8A6142" />
      <circle cx={px - 5 * s} cy={py - 17 * s} r={7 * s} fill="#6DAA45" /><circle cx={px + 5 * s} cy={py - 18 * s} r={7.5 * s} fill="#5F9C3C" /><circle cx={px} cy={py - 25 * s} r={8.5 * s} fill="#7CBB52" /><circle cx={px - 2.5 * s} cy={py - 28 * s} r={3.5 * s} fill="#9BD06C" /></g>
  );
}
function Lamp({ x, y }) { const [px, py] = P(x, y, 0); return <g><ellipse cx={px} cy={py} rx="3" ry="1.5" fill="rgba(0,0,0,.12)" /><rect x={px - 0.9} y={py - 24} width="1.8" height="24" fill="#3B3F48" /><rect x={px - 2.6} y={py - 28} width="5.2" height="5" rx="1.5" fill="#3B3F48" /><rect x={px - 1.8} y={py - 27} width="3.6" height="3" rx="1" fill="#FFD27A" /></g>; }
function Bench({ x, y }) { return <><Box x={x} y={y} w={1.8} d={0.5} h={0.5} c="#B07A4E" /><Box x={x} y={y} w={1.8} d={0.15} h={1.1} c="#9A6740" /></>; }
const Bush = ({ x, y, c = "#7CBB52", r = 5 }) => { const [px, py] = P(x, y, 0); return <g><ellipse cx={px} cy={py} rx={r} ry={r / 2} fill="rgba(0,0,0,.08)" /><circle cx={px} cy={py - r * 0.7} r={r} fill={c} /><circle cx={px - r * 0.4} cy={py - r} r={r * 0.4} fill="#9BD06C" /></g>; };
const Flower = ({ x, y }) => { const [px, py] = P(x, y, 0); return <g><circle cx={px} cy={py - 3} r="3.2" fill="#7CBB52" />{[[-2, -5, "#F49AC1"], [2, -4, "#FFF"], [0, -6.5, "#F6C344"]].map(([dx, dy, c], k) => <circle key={k} cx={px + dx} cy={py + dy} r="1.4" fill={c} />)}</g>; };
/** Vitres éclairées (lueur chaude) sur une face. */
const GlassL = ({ x, y, z, w, h, n = 3 }) => <g>{Array.from({ length: n }, (_, k) => <FaceL key={k} x={x + (w / n) * k + 0.15} y={y} z={z} w={w / n - 0.3} h={h} c="#FFD08A" />)}</g>;
const GlassR = ({ x, y, z, d, h, n = 3 }) => <g>{Array.from({ length: n }, (_, k) => <FaceR key={k} x={x} y={y + (d / n) * k + 0.15} z={z} d={d / n - 0.3} h={h} c="#FFC979" />)}</g>;

// Les bâtiments, chacun sur sa parcelle 10 × 10 (origine = coin arrière de la parcelle). Dessins originaux, palette chaude.
const ART = {
  poste: (x, y) => <>
    <Box x={x + 1.5} y={y + 2} w={7} d={6} h={4.2} c="#F6E7D3" /><Roof x={x + 1.2} y={y + 1.7} z={4.2} w={7.6} d={6.6} h={3.2} c="#E8692B" />
    <Box x={x + 4} y={y + 7.6} w={2.2} d={1.2} h={5} c="#F6E7D3" /><Roof x={x + 3.8} y={y + 7.4} z={5} w={2.6} d={1.6} h={1.4} c="#E8692B" />
    <FaceL x={x + 4.4} y={y + 8.8} z={0} w={1.4} h={2.6} c="#9A5A2C" /><FaceL x={x + 4.5} y={y + 8.8} z={3} w={1.2} h={0.9} c="#FFFFFF" />
    <GlassL x={x + 1.8} y={y + 8} z={1.4} w={2} h={1.8} n={2} /><GlassL x={x + 6.4} y={y + 8} z={1.4} w={1.9} h={1.8} n={2} /><GlassR x={x + 8.5} y={y + 2.5} z={1.4} d={5} h={1.8} />
    <Box x={x + 8.9} y={y + 8.8} w={0.8} d={0.8} h={1.8} c="#D93A2B" /><Bush x={x + 1.4} y={y + 9.2} r={4} /><Flower x={x + 3.2} y={y + 9.4} />
  </>,
  atelier: (x, y) => <>
    <Box x={x + 1} y={y + 2} w={8} d={6} h={4.6} c="#F2EEE8" top="#4A4E57" />
    {[0, 1, 2].map((k) => <polygon key={k} points={pts([[x + 2 + k * 2.2, y + 3, 4.62], [x + 3.8 + k * 2.2, y + 3, 4.62], [x + 3.8 + k * 2.2, y + 5, 4.62], [x + 2 + k * 2.2, y + 5, 4.62]])} fill="#8FB5DA" />)}
    <GlassL x={x + 1.4} y={y + 8} z={0.5} w={7.2} h={3.2} n={4} /><GlassR x={x + 9} y={y + 2.4} z={0.5} d={5.2} h={3.2} n={3} />
    <Bush x={x + 9.6} y={y + 8.8} r={4} /><Bush x={x + 0.6} y={y + 8.6} r={3.5} c="#6DAA45" />
  </>,
  rdv: (x, y) => <>
    <Box x={x + 2} y={y + 2} w={6} d={6} h={12} c="#E6E3DE" top="#5B6270" />
    {[1.2, 4.6, 8].map((z) => <GlassL key={`l${z}`} x={x + 2.4} y={y + 8} z={z} w={5.2} h={2.6} n={3} />)}{[1.2, 4.6, 8].map((z) => <GlassR key={`r${z}`} x={x + 8} y={y + 2.4} z={z} d={5.2} h={2.6} n={3} />)}
    <Box x={x + 2.6} y={y + 8} w={4.8} d={1} z={2.6} h={0.4} c="#E8692B" />
    {(() => { const [cx, cy] = P(x + 8, y + 4.6, 9.6); return <g><rect x={cx - 9} y={cy - 9} width="18" height="18" rx="4" fill="#fff" stroke="#E8692B" strokeWidth="1.5" /><rect x={cx - 9} y={cy - 9} width="18" height="5" rx="2" fill="#E8692B" /><path d={`M${cx - 5} ${cy}h2m3 0h2m3 0h2M${cx - 5} ${cy + 4}h2m3 0h2`} stroke="#E8692B" strokeWidth="1.6" /></g>; })()}
    <Bush x={x + 1.2} y={y + 8.8} r={4} /><Bush x={x + 8.8} y={y + 9} r={4} c="#6DAA45" />
  </>,
  annuaire: (x, y) => <>
    <Box x={x + 1.4} y={y + 2.5} w={7.2} d={5.5} h={4.4} c="#F3E9DC" /><Roof x={x + 1.1} y={y + 2.2} z={4.4} w={7.8} d={6.1} h={2.8} c="#8A5B3E" />
    {[0, 1].map((k) => <polygon key={k} points={pts([[x + 2.4 + k * 3, y + 2.8, 5.6], [x + 4.4 + k * 3, y + 2.8, 5.6], [x + 4.4 + k * 3, y + 4.2, 6.6], [x + 2.4 + k * 3, y + 4.2, 6.6]])} fill="#9EC3E6" />)}
    <GlassL x={x + 1.8} y={y + 8} z={0.5} w={6.4} h={3} n={3} /><GlassR x={x + 8.6} y={y + 3} z={0.6} d={4.6} h={2.6} n={2} />
    <Bush x={x + 9.4} y={y + 8.8} r={4} /><Flower x={x + 1.2} y={y + 9.2} /><Flower x={x + 2.4} y={y + 9.4} />
  </>,
  radar: (x, y) => { const [cx, cy] = P(x + 5, y + 5, 16.6); return <>
    <Box x={x + 3.8} y={y + 3.8} w={2.4} d={2.4} h={11} c="#3B3F48" /><FaceL x={x + 4.7} y={y + 6.2} z={2} w={0.5} h={7} c="#FFB25B" />
    <Box x={x + 3} y={y + 3} w={4} d={4} z={11} h={1.4} c="#E8692B" /><Box x={x + 3.3} y={y + 3.3} w={3.4} d={3.4} z={12.4} h={1.6} c="#FFD08A" top="#3B3F48" /><Box x={x + 3} y={y + 3} w={4} d={4} z={14} h={0.6} c="#E8692B" />
    <ellipse cx={cx} cy={cy - 8} rx="16" ry="9" fill="#F3F1EC" stroke="#9AA0A8" strokeWidth="1.5" transform={`rotate(-28 ${cx} ${cy - 8})`} /><path d={`M${cx} ${cy - 8}l8 -12`} stroke="#3B3F48" strokeWidth="2" /><circle cx={cx + 8} cy={cy - 20} r="2.6" fill="#E8692B" />
    <path d={`M${cx + 18} ${cy - 24}a12 12 0 0 1 8 10M${cx + 22} ${cy - 32}a20 20 0 0 1 12 18`} fill="none" stroke="#E8692B" strokeWidth="2.6" strokeLinecap="round" />
    <Bush x={x + 1.2} y={y + 8.6} r={5} /><Tree x={x + 9} y={y + 2} /><Bush x={x + 8.8} y={y + 9} r={4} c="#6DAA45" />
  </>; },
  espion: (x, y) => { const [ex, ey] = P(x + 5, y + 8.05, 2.4); return <>
    <Box x={x + 1.8} y={y + 2.4} w={6.6} d={5.6} h={4.4} c="#2A2C31" top="#1F2125" />
    <ellipse cx={ex} cy={ey} rx="13" ry="7.5" fill="none" stroke="#FF8A3D" strokeWidth="2.4" /><circle cx={ex} cy={ey} r="4.2" fill="#FF8A3D" /><circle cx={ex} cy={ey} r="1.8" fill="#2A2C31" />
    <FaceR x={x + 8.4} y={y + 5} z={0} d={1.6} h={2.8} c="#FFC979" /><path d={(() => { const [a1, b1] = P(x + 8.4, y + 3, 2.2), [a2, b2] = P(x + 8.4, y + 4.6, 2.2); return `M${a1} ${b1}L${a2} ${b2}`; })()} stroke="#FF8A3D" strokeWidth="2" />
    <Bush x={x + 9.4} y={y + 9} r={4} /><Bush x={x + 1} y={y + 9} r={3.5} c="#6DAA45" />
  </>; },
  linkedin: (x, y) => { const [lx, ly] = P(x + 5, y + 8.2, 5.2); return <>
    <Box x={x + 1.5} y={y + 2} w={7} d={6} h={4.2} c="#F6F1EA" top="#E2DAD0" /><GlassL x={x + 1.9} y={y + 8} z={0.4} w={6.2} h={2.6} n={3} /><GlassR x={x + 8.5} y={y + 2.4} z={0.4} d={5.2} h={2.6} n={2} />
    <polygon points={pts([[x + 1.2, y + 8, 4], [x + 8.8, y + 8, 4], [x + 8.8, y + 9.6, 2.9], [x + 1.2, y + 9.6, 2.9]])} fill="#1F6FC5" />
    <polygon points={pts([[x + 8.5, y + 1.8, 4], [x + 8.5, y + 8, 4], [x + 10, y + 8, 2.9], [x + 10, y + 1.8, 2.9]])} fill="#2B7FD6" />
    <text x={lx} y={ly + 10} textAnchor="middle" fontSize="13" fontWeight="900" fontStyle="italic" fill="#fff" fontFamily="Nunito, sans-serif">in</text>
    {(() => { const [ux, uy] = P(x + 2.5, y + 10.6, 0); return <g><rect x={ux - 0.8} y={uy - 18} width="1.6" height="18" fill="#8A6142" /><path d={`M${ux - 11} ${uy - 16}q11 -9 22 0z`} fill="#F7E7D2" stroke="#E2C9A8" /></g>; })()}
    <Bench x={x + 6.5} y={y + 10.2} />
  </>; },
  observatoire: (x, y) => { const [dx, dy] = P(x + 5, y + 5, 3.4); return <>
    <Box x={x + 2} y={y + 2} w={6} d={6} h={3.4} c="#F5F3EF" /><GlassL x={x + 2.4} y={y + 8} z={0.5} w={5.2} h={1.8} n={3} />
    <path d={`M${dx - 38} ${dy}a38 30 0 0 1 76 0z`} fill="#E3E6EA" /><path d={`M${dx - 38} ${dy}a38 30 0 0 1 38 -30v30z`} fill="#F3F5F7" /><path d={`M${dx - 4} ${dy - 30}h8v30h-8z`} fill="#3B3F48" />
    <path d={`M${dx + 2} ${dy - 14}l26 -14 4 8 -26 14z`} fill="#E8692B" /><circle cx={dx + 30} cy={dy - 24} r="4" fill="#3B3F48" />
    <Bush x={x + 1.2} y={y + 9} r={4.5} /><Bush x={x + 9} y={y + 8.6} r={4} c="#6DAA45" /><Flower x={x + 3} y={y + 9.6} /><Flower x={x + 7} y={y + 9.6} />
  </>; },
  mairie: (x, y) => { const [fx, fy] = P(x + 5, y + 8.4, 7.4); return <>
    <Box x={x + 0.8} y={y + 2.4} w={8.4} d={5.6} h={4.6} c="#FBF4EA" /><Roof x={x + 0.5} y={y + 2.1} z={4.6} w={9} d={6.2} h={2.4} c="#E8692B" />
    <polygon points={pts([[x + 3.4, y + 8.4, 4.6], [x + 6.6, y + 8.4, 4.6], [x + 5, y + 8.4, 6.4]])} fill="#FBF4EA" stroke="#E7D8C4" />
    {[3.5, 4.4, 5.3, 6.2].map((d) => <FaceL key={d} x={x + d} y={y + 8.4} z={0} w={0.35} h={4.6} c="#E7D8C4" />)}
    <FaceL x={x + 4.6} y={y + 8.4} z={0} w={0.8} h={2.4} c="#9A5A2C" /><GlassL x={x + 1.2} y={y + 8} z={1.4} w={2} h={2} n={2} /><GlassL x={x + 6.8} y={y + 8} z={1.4} w={2} h={2} n={2} /><GlassR x={x + 9.2} y={y + 3} z={1.4} d={4.6} h={2} n={3} />
    <circle cx={fx} cy={fy} r="4.5" fill="#fff" stroke="#9A5A2C" strokeWidth="1.2" /><path d={`M${fx} ${fy - 2.6}v2.6l1.8 1`} stroke="#3B3F48" strokeWidth="1" fill="none" />
    {(() => { const [ax, ay] = P(x + 4.4, y + 8.6, 3), [bx, by] = P(x + 5.6, y + 8.6, 3); return <g><rect x={ax - 3} y={ay - 6} width="2" height="6" fill="#1F4FB4" /><rect x={ax - 1} y={ay - 6} width="2" height="6" fill="#fff" /><rect x={ax + 1} y={ay - 6} width="2" height="6" fill="#D93A2B" /><rect x={bx - 3} y={by - 6} width="2" height="6" fill="#1F4FB4" /><rect x={bx - 1} y={by - 6} width="2" height="6" fill="#fff" /><rect x={bx + 1} y={by - 6} width="2" height="6" fill="#D93A2B" /></g>; })()}
    <Bush x={x + 0.6} y={y + 9.2} r={4} /><Bush x={x + 9.6} y={y + 9.2} r={4} c="#6DAA45" /><Flower x={x + 2.4} y={y + 9.6} /><Flower x={x + 7.6} y={y + 9.6} />
  </>; },
};
// Petites icônes des enseignes (24 × 24, trait orange)
const ICONE = {
  rdv: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h2M12 14h2M16 14h2",
  annuaire: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 11a3 3 0 1 0 0-6M17 14c2.4.6 4 2.9 4 6",
  poste: "M3 6h18v12H3zM3 6l9 7 9-7",
  atelier: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-2.4z",
  radar: "M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14",
  observatoire: "M4 14l12-6 2 4-12 6zM16 8l2-1 2 4-2 1M8 17l-2 4M10 16l2 5",
  linkedin: "",
  espion: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
  mairie: "M3 21h18M5 21V10M19 21V10M9 21v-7M15 21v-7M2 10l10-6 10 6z",
};

const LOT = 10, ROAD = 4, MARGE = 3;
const lot = (g) => MARGE + g * (LOT + ROAD);
const LAMPES = [[13.3, 4], [27.3, 4], [13.3, 31], [27.3, 31], [4, 16.7], [31, 16.7], [4, 30.7], [31, 30.7]];
const BANCS = [[5, 2.2], [30, 2.2], [2.3, 22]];

/* ---------- La vie de la ville : voitures et agents (animés hors React, pour rester fluide) ---------- */
const ROADY = (gy) => (gy < 2 ? lot(gy) + LOT + ROAD / 2 : lot(2) - ROAD / 2);
const ROADX = [lot(0) + LOT + ROAD / 2, lot(1) + LOT + ROAD / 2];
function chemin(a, b) {
  const ya = ROADY(a[1]), yb = ROADY(b[1]), xa = lot(a[0]) + 5, xb = lot(b[0]) + 5;
  if (ya === yb) return [[xa, ya], [xb, yb]];
  const vx = ROADX.reduce((p, c) => (Math.abs(c - xa) < Math.abs(p - xa) ? c : p));
  return [[xa, ya], [vx, ya], [vx, yb], [xb, yb]];
}
// Les 9 agents de Bingoo! : où ils travaillent (bâtiments visités à tour de rôle)
export const AGENTS = [
  { nom: "Iris", c: "#7C5CFF", tour: ["mairie", "observatoire"] },
  { nom: "Léo", c: "#2F80ED", tour: ["annuaire", "radar"] },
  { nom: "Sam", c: "#1F7A4D", tour: ["annuaire", "poste"] },
  { nom: "Max", c: "#3B3F48", tour: ["radar", "observatoire"] },
  { nom: "Hugo", c: "#E0531F", tour: ["atelier", "poste"] },
  { nom: "Inès", c: "#D6336C", tour: ["poste", "atelier"] },
  { nom: "Lina", c: "#0A66C2", tour: ["linkedin", "annuaire"] },
  { nom: "Paul", c: "#B7791F", tour: ["rdv", "poste"] },
  { nom: "Oscar", c: "#15161A", tour: ["espion", "radar"] },
];
const CARS = [
  { axe: "x", m: ROADY(0) - 0.9, v: 5, c: "#FFFFFF", d: 0 }, { axe: "x", m: ROADY(0) + 0.9, v: -4, c: "#F2C94C", d: 18 },
  { axe: "x", m: ROADY(1) - 0.9, v: 4.5, c: "#E0531F", d: 30 }, { axe: "x", m: ROADY(1) + 0.9, v: -5.5, c: "#FFFFFF", d: 5 },
  { axe: "y", m: ROADX[0] - 0.9, v: 4, c: "#FFFFFF", d: 10 }, { axe: "y", m: ROADX[0] + 0.9, v: -4.5, c: "#2F4A6E", d: 25 },
  { axe: "y", m: ROADX[1] - 0.9, v: 5, c: "#FFFFFF", d: 2 }, { axe: "y", m: ROADX[1] + 0.9, v: -3.8, c: "#F2C94C", d: 33 },
];
function Car({ axe, c }) {
  // Dessinée à l'origine, déplacée en bloc (la projection est linéaire)
  return axe === "x"
    ? <><Box x={-1.2} y={-0.6} w={2.4} d={1.2} h={0.8} c={c} /><Box x={-0.5} y={-0.5} z={0.8} w={1.1} d={1} h={0.5} c="#3B3F48" /></>
    : <><Box x={-0.6} y={-1.2} w={1.2} d={2.4} h={0.8} c={c} /><Box x={-0.5} y={-0.4} z={0.8} w={1} d={1.1} h={0.5} c="#3B3F48" /></>;
}
function Agent({ a, bulle }) {
  const w = bulle ? Math.min(220, bulle.length * 6.3 + 16) : 0;
  return (
    <g transform="scale(1.35)">
      <ellipse cx="0" cy="0" rx="6" ry="3" fill="rgba(0,0,0,.15)" />
      <rect x="-3.5" y="-7" width="2.6" height="7" rx="1.2" fill="#3B3F48" /><rect x="0.9" y="-7" width="2.6" height="7" rx="1.2" fill="#3B3F48" />
      <rect x="-5" y="-17" width="10" height="11" rx="4" fill={a.c} />
      <circle cx="0" cy="-21.5" r="5.2" fill="#F2C9A5" />
      <path d="M-5.4 -22.5a5.4 5.4 0 0 1 10.8 0z" fill="#E0531F" /><rect x="0" y="-23.4" width="7.5" height="1.8" rx=".9" fill="#E0531F" />
      <rect x={-a.nom.length * 3.4 - 7} y="-44" width={a.nom.length * 6.8 + 14} height="15" rx="7.5" fill="#fff" stroke={a.c} strokeWidth="1.2" />
      <text x="0" y="-33" textAnchor="middle" fontSize="10" fontWeight="800" fill="#1E1E24" fontFamily="Nunito, Geist, system-ui, sans-serif">{a.nom}</text>
      {bulle && <g><rect x={-w / 2} y="-68" width={w} height="22" rx="8" fill="#15161A" /><path d="M-4 -46.5h8l-4 5z" fill="#15161A" /><text x="0" y="-53" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="Nunito, Geist, system-ui, sans-serif">{bulle}</text></g>}
    </g>
  );
}

/** Un emplacement de profondeur : une copie (<use>) de chaque voiture et de chaque agent, une seule visible à la fois. */
function Slot({ k, uses, nav, toOf }) {
  return (
    <g>
      {CARS.map((c, i) => <use key={`c${i}`} href={`#iso-car${i}`} style={{ display: "none" }} pointerEvents="none" ref={(el) => { uses.current[`${k}-car${i}`] = el; }} />)}
      {AGENTS.map((a, i) => <use key={`a${i}`} href={`#iso-ag${i}`} style={{ display: "none", cursor: "pointer" }} ref={(el) => { uses.current[`${k}-ag${i}`] = el; }} onClick={() => nav(toOf(a.tour[0]))}><title>{`${a.nom} : clique pour aller à son bâtiment`}</title></use>)}
    </g>
  );
}

export default function IsoVille({ batiments, paroles = {}, full = false }) {
  const nav = useNavigate();
  const [on, setOn] = useState(null);
  const uses = useRef({}); // uses.current[`${slot}-${objet}`] = <use>
  const bulleRef = useRef(null), bulleI = useRef(-1);
  // Carte géante : on zoome (molette, boutons) et on se déplace (glisser)
  const mobile = typeof window !== "undefined" && window.innerWidth < 700;
  const z0 = full ? (mobile ? 1.45 : 0.95) : 1.15, dy0 = full ? 30 : 0;
  const [vue, setVue] = useState({ z: z0, dx: 0, dy: dy0 });
  const drag = useRef(null), moved = useRef(false), box = useRef(null);
  const [bulle, setBulle] = useState(null);
  const N = 3, T = 2 * MARGE + N * LOT + (N - 1) * ROAD; // taille du plateau
  // Bornes de l'image
  const corners = [P(0, 0, 0), P(T, 0, 0), P(0, T, 0), P(T, T, -2)];
  const minX = Math.min(...corners.map((c) => c[0])) - 10, maxX = Math.max(...corners.map((c) => c[0])) + 10;
  const minY = Math.min(...corners.map((c) => c[1])) - 70, maxY = Math.max(...corners.map((c) => c[1])) + 16;
  const VW = maxX - minX, VH = maxY - minY;
  const PLACE = ["poste", "atelier", "radar", "annuaire", "observatoire", "espion", "rdv", "linkedin", "mairie"];
  const pos = PLACE.map((k) => batiments.find((b) => b.art === k)).filter(Boolean).map((b, i) => ({ ...b, gx: i % N, gy: Math.floor(i / N) }));
  const order = [...pos].sort((a, b) => a.gx + a.gy - (b.gx + b.gy));
  const lotOf = (art) => { const b = pos.find((x) => x.art === art); return b ? [b.gx, b.gy] : [1, 1]; };
  const toOf = (art) => pos.find((x) => x.art === art)?.to ?? "/";

  // Animation : agents qui marchent d'un bâtiment à l'autre par les rues, voitures qui roulent
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const st = AGENTS.map((a, i) => {
      const k = i % a.tour.length, from = lotOf(a.tour[k]), to = lotOf(a.tour[(k + 1) % a.tour.length]);
      return { k: (k + 1) % a.tour.length, path: chemin(from, to), seg: 0, t: (i * 0.37) % 1, pause: i * 0.6 };
    });
    // Profondeur : un objet est dessiné juste après les bâtiments situés derrière lui (sinon il « marche sur les toits »)
    const centres = order.map((b) => lot(b.gx) + lot(b.gy) + LOT);
    const slotOf = (x, y) => centres.filter((c) => c < x + y).length;
    const cur = {};
    const place = (o, x, y) => {
      const k = slotOf(x, y), [px, py] = P(x, y, 0), tr = `translate(${px.toFixed(1)} ${py.toFixed(1)})`;
      if (cur[o] !== k) { for (let s2 = 0; s2 <= centres.length; s2++) { const u = uses.current[`${s2}-${o}`]; if (u) u.style.display = s2 === k ? "" : "none"; } cur[o] = k; }
      const u = uses.current[`${k}-${o}`]; if (u) u.setAttribute("transform", tr);
    };
    let raf = 0, last = performance.now();
    const T0 = 2 * MARGE + 3 * LOT + 2 * ROAD;
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      st.forEach((s, i) => {
        const a = AGENTS[i];
        if (s.pause > 0) { s.pause -= dt; }
        else {
          const [p0, p1] = [s.path[s.seg], s.path[s.seg + 1]];
          const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
          s.t += (2.2 * dt) / len;
          if (s.t >= 1) {
            s.t = 0; s.seg++;
            if (s.seg >= s.path.length - 1) { // arrivé : pause, puis bâtiment suivant
              const from = lotOf(a.tour[s.k]); s.k = (s.k + 1) % a.tour.length;
              s.path = chemin(from, lotOf(a.tour[s.k])); s.seg = 0; s.pause = 2.5 + Math.random() * 3;
            }
          }
        }
        const p0 = s.path[s.seg], p1 = s.path[Math.min(s.seg + 1, s.path.length - 1)];
        place(`ag${i}`, p0[0] + (p1[0] - p0[0]) * s.t + ((i % 3) - 1) * 0.5, p0[1] + (p1[1] - p0[1]) * s.t + ((i % 2) - 0.5) * 0.6);
      });
      CARS.forEach((c, i) => {
        const pos = ((((now / 1000) * c.v + c.d) % T0) + T0) % T0;
        if (c.axe === "x") place(`car${i}`, pos, c.m); else place(`car${i}`, c.m, pos);
      });
      // La bulle suit l'agent qui parle
      const bi = bulleI.current, bs = st[bi];
      if (bs && bulleRef.current) {
        const q0 = bs.path[bs.seg], q1 = bs.path[Math.min(bs.seg + 1, bs.path.length - 1)];
        const [bx, by] = P(q0[0] + (q1[0] - q0[0]) * bs.t, q0[1] + (q1[1] - q0[1]) * bs.t, 0);
        bulleRef.current.setAttribute("transform", `translate(${bx.toFixed(1)} ${by.toFixed(1)})`);
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // Bulles : un agent dit ce qu'il a vraiment fait
    const lignes = AGENTS.map((a, i) => [i, paroles[a.nom]]).filter(([, t]) => t);
    let n = 0;
    const iv = lignes.length && !reduce ? setInterval(() => { const [i, t] = lignes[n++ % lignes.length]; bulleI.current = i; setBulle({ i, t }); }, 4500) : 0;
    if (lignes.length) { bulleI.current = lignes[0][0]; setBulle({ i: lignes[0][0], t: lignes[0][1] }); n = 1; }
    return () => { cancelAnimationFrame(raf); if (iv) clearInterval(iv); };
  }, [batiments.length, JSON.stringify(paroles)]); // eslint-disable-line react-hooks/exhaustive-deps
  const roads = [];
  for (let k = 0; k < N - 1; k++) {
    const r = lot(k) + LOT;
    roads.push([[r, 0], [r + ROAD, 0], [r + ROAD, T], [r, T]], [[0, r], [T, r], [T, r + ROAD], [0, r + ROAD]]);
  }
  const trees = [[1.2, 6, 0], [1.4, 12, 1], [1.4, 20, 0], [1.3, 27, 0], [1.3, 34, 1], [6, 1.2, 0], [12, 1.3, 1], [20, 1.4, 0], [27, 1.3, 0], [34, 1.3, 1], [T - 1.3, 8, 0], [T - 1.3, 15, 0], [T - 1.4, 26, 1], [T - 1.3, 34, 0], [9, T - 1.3, 0], [16, T - 1.3, 1], [27, T - 1.3, 0], [34, T - 1.3, 0]];
  const act = on != null ? pos[on] : null;
  const anchor = act ? P(lot(act.gx) + 5, lot(act.gy) + 5, 9) : null;

  return (
    <div className="relative">
      <svg ref={box} viewBox={`${minX + (VW - VW / vue.z) / 2 - vue.dx} ${minY + (VH - VH / vue.z) / 2 - vue.dy} ${VW / vue.z} ${VH / vue.z}`}
        className={cx2(full ? "block h-[100dvh] w-screen select-none touch-none" : "w-full h-[min(78vh,820px)] select-none touch-none", drag.current ? "cursor-grabbing" : "cursor-grab")} role="group" aria-label="Bingoo!-ville"
        onWheel={(e) => { e.preventDefault?.(); setVue((v) => ({ ...v, z: Math.min(3, Math.max(0.8, v.z * (e.deltaY < 0 ? 1.1 : 0.9))) })); }}
        onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, v: vue }; moved.current = false; }}
        onPointerMove={(e) => { const d = drag.current; if (!d || !box.current) return; const k = (VW / vue.z) / box.current.clientWidth; const mx = e.clientX - d.x, my = e.clientY - d.y; if (Math.abs(mx) + Math.abs(my) > 5) moved.current = true; setVue({ ...d.v, dx: d.v.dx + mx * k, dy: d.v.dy + my * k }); }}
        onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}
        onClickCapture={(e) => { if (moved.current) { e.stopPropagation(); e.preventDefault(); moved.current = false; } }}>
        {/* Plateau */}
        <defs>
          <filter id="iso-ombre" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#7A4A2A" floodOpacity=".18" /></filter>
        </defs>
        <polygon points={pts([[0, T, 0], [T, T, 0], [T, T, -2.6], [0, T, -2.6]])} fill="#E9D6C2" />
        <polygon points={pts([[T, 0, 0], [T, T, 0], [T, T, -2.6], [T, 0, -2.6]])} fill="#F1E2D2" />
        <polygon points={pts([[0, 0, 0], [T, 0, 0], [T, T, 0], [0, T, 0]])} fill="#F7EEE4" />
        {/* Pelouses des parcelles et bordures fleuries */}
        {[0, 1, 2].flatMap((gx) => [0, 1, 2].map((gy) => <polygon key={`g${gx}${gy}`} points={pts([[lot(gx) - 0.6, lot(gy) - 0.6, 0.01], [lot(gx) + LOT + 0.6, lot(gy) - 0.6, 0.01], [lot(gx) + LOT + 0.6, lot(gy) + LOT + 0.6, 0.01], [lot(gx) - 0.6, lot(gy) + LOT + 0.6, 0.01]])} fill="#DDEBC6" />))}
        {/* Rues */}
        {roads.map((r, i) => <polygon key={i} points={pts(r.map(([x, y]) => [x, y, 0.02]))} fill="#ECE6DF" />)}
        {roads.map((r, i) => { const vert = r[0][1] === 0 && r[3][1] === T; const m = vert ? (r[0][0] + r[1][0]) / 2 : (r[0][1] + r[2][1]) / 2; return Array.from({ length: 12 }, (_, k) => { const t = 1.5 + k * 3.5; const a = vert ? P(m, t, 0.05) : P(t, m, 0.05), b = vert ? P(m, t + 1.6, 0.05) : P(t + 1.6, m, 0.05); return <line key={`${i}-${k}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#fff" strokeWidth="2" />; }); })}
        {/* Passages piétons aux carrefours */}
        {ROADX.flatMap((vx) => [ROADY(0), ROADY(1)].map((ry) => [vx, ry])).map(([vx, ry], k) => <g key={`pp${k}`}>{[-0.9, -0.3, 0.3, 0.9].map((o) => { const a = P(vx - 2.6, ry + o, 0.06), b = P(vx - 3.6, ry + o, 0.06); return <line key={o} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#fff" strokeWidth="2.6" />; })}</g>)}
        {trees.map(([x, y, k], i) => <Tree key={i} x={x} y={y} kind={k} s={1.1} />)}
        {LAMPES.map(([x, y], i) => <Lamp key={`l${i}`} x={x} y={y} />)}
        {BANCS.map(([x, y], i) => <Bench key={`b${i}`} x={x} y={y} />)}
        <defs>
          {CARS.map((c, i) => <g key={`d-car${i}`} id={`iso-car${i}`}><Car axe={c.axe} c={c.c} /></g>)}
          {AGENTS.map((a, i) => <g key={`d-ag${i}`} id={`iso-ag${i}`}><Agent a={a} bulle="" /></g>)}
        </defs>
        {/* Parcelles et bâtiments (de l'arrière vers l'avant), avec entre eux les emplacements des objets qui bougent */}
        <Slot k={0} uses={uses} nav={nav} toOf={toOf} />
        {order.map((b, oi) => {
          const i = pos.indexOf(b), x = lot(b.gx), y = lot(b.gy), hot = on === i;
          const [lx, ly] = P(x + 5, y + 5, 0);
          return [
            <a key={b.art} href={`#${b.to}`} onClick={(e) => { e.preventDefault(); nav(b.to); }} onMouseEnter={() => setOn(i)} onMouseLeave={() => setOn(null)} onFocus={() => setOn(i)} onBlur={() => setOn(null)} aria-label={`${b.nom} : ${b.quoi}`} className="cursor-pointer focus:outline-none">
              <polygon points={pts([[x, y, 0.03], [x + LOT, y, 0.03], [x + LOT, y + LOT, 0.03], [x, y + LOT, 0.03]])} fill={hot ? "rgba(232,105,43,.12)" : "rgba(0,0,0,0)"} stroke={hot ? "#E8692B" : "none"} strokeWidth="2" />
              {hot && <ellipse cx={lx} cy={ly} rx="62" ry="31" fill="none" stroke="#E0531F" strokeWidth="1.5" opacity=".6" />}
              <g style={{ transition: "transform .2s", transform: hot ? "translateY(-4px)" : "none" }}>{ART[b.art](x, y)}</g>
            </a>,
            <Slot key={`slot${oi + 1}`} k={oi + 1} uses={uses} nav={nav} toOf={toOf} />,
          ];
        })}
        {/* Enseignes : le nom en gros, au-dessus de chaque bâtiment */}
        {pos.map((b, i) => {
          const [sx, sy] = b.art === "rdv" ? P(lot(b.gx) + 3, lot(b.gy) + 8, 12.5) : P(lot(b.gx) + 6, lot(b.gy) + 6, b.art === "radar" ? 18 : 8.6);
          const w = b.nom.length * 9.6 + 58, x0 = sx - w / 2;
          return (
            <g key={`s${b.art}`} pointerEvents="none">
              <rect x={x0} y={sy - 21} width={w} height="34" rx="17" fill="#FFFFFF" stroke={on === i ? "#E8692B" : "#F1E2D2"} strokeWidth={on === i ? 2.5 : 1.5} filter="url(#iso-ombre)" />
              {b.art === "linkedin"
                ? <g><rect x={x0 + 14} y={sy - 13} width="18" height="18" rx="4" fill="#0A66C2" /><text x={x0 + 23} y={sy + 1} textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff" fontFamily="Nunito, sans-serif">in</text></g>
                : <g transform={`translate(${x0 + 12} ${sy - 15}) scale(0.92)`}><path d={ICONE[b.art]} fill="none" stroke="#E8692B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></g>}
              <text x={x0 + 40} y={sy + 2} fontSize="18" fontWeight="800" fill="#1E1E24" fontFamily="Nunito, Geist, system-ui, sans-serif">{b.nom}</text>
              {(b.badge > 0 || b.alerte) && <g><circle cx={sx + w / 2 - 4} cy={sy - 20} r="13" fill="#F26A21" stroke="#fff" strokeWidth="2.5" /><text x={sx + w / 2 - 4} y={sy - 15.5} textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff" fontFamily="Nunito, sans-serif">{b.alerte ? "!" : b.badge > 99 ? "99+" : b.badge}</text></g>}
            </g>
          );
        })}
        {/* Ce que dit l'agent, au-dessus de tout */}
        <g ref={bulleRef} pointerEvents="none">
          {bulle && (() => { const w = Math.min(260, bulle.t.length * 6.6 + 20); const a = AGENTS[bulle.i]; return <g><rect x={-w / 2} y="-92" width={w} height="26" rx="9" fill="#15161A" /><path d="M-5 -66.5h10l-5 6z" fill="#15161A" /><text x="0" y="-74.5" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#fff" fontFamily="Nunito, Geist, system-ui, sans-serif"><tspan fill="#FDBA74">{a.nom} : </tspan>{bulle.t}</text></g>; })()}
        </g>
      </svg>
      {/* Zoom et déplacement */}
      <div className={cx2("absolute flex flex-col gap-2 sm:gap-3", full ? "right-4 bottom-24 sm:right-5" : "right-3 top-3")}>
        {[["+", 1.25], ["−", 0.8]].map(([l, f]) => <button key={l} onClick={() => setVue((v) => ({ ...v, z: Math.min(3, Math.max(0.8, v.z * f)) }))} className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white text-[20px] sm:text-[24px] font-semibold text-ink shadow-[0_8px_20px_-10px_rgba(122,74,42,.45)] hover:bg-[#FFF7F0]" aria-label={l === "+" ? "Zoomer" : "Dézoomer"}>{l}</button>)}
        <button onClick={() => setVue({ z: z0, dx: 0, dy: dy0 })} className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-xl sm:rounded-2xl bg-white shadow-[0_8px_20px_-10px_rgba(122,74,42,.45)] hover:bg-[#FFF7F0]" aria-label="Recentrer" title="Recentrer"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="6.5" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg></button>
      </div>
      {/* La carte « en direct » du bâtiment survolé */}
      {act && (
        <div className="pointer-events-none absolute z-10 w-[260px] rounded-2xl border border-line bg-white p-4 shadow-[0_18px_40px_-18px_rgba(21,22,26,.35)]"
          style={(() => { const vx = minX + (VW - VW / vue.z) / 2 - vue.dx, vy = minY + (VH - VH / vue.z) / 2 - vue.dy, w = VW / vue.z, h = VH / vue.z; return { left: `${Math.min(76, Math.max(2, ((anchor[0] - vx) / w) * 100 + 4))}%`, top: `${Math.min(70, Math.max(full ? 14 : 0, ((anchor[1] - vy) / h) * 100 - 30))}%` }; })()}>
          <p className="text-[17px] font-black text-ink" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{act.nom}</p>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-accent-dark"><span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />En direct · {act.quoi}</p>
          <dl className="mt-2.5 space-y-1.5">
            {(act.stats ?? []).map(([l, v]) => <div key={l} className="flex items-baseline justify-between gap-3 text-[13.5px]"><dt className="text-ink-soft">{l}</dt><dd className="font-bold tnum text-ink">{v}</dd></div>)}
          </dl>
          <p className="mt-3 text-[12.5px] text-ink-soft">Clique sur le bâtiment pour entrer.</p>
        </div>
      )}
    </div>
  );
}
