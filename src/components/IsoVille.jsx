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
function Tree({ x, y, kind }) {
  const [px, py] = P(x, y, 0);
  return kind ? (
    <g><ellipse cx={px} cy={py} rx="6" ry="3" fill="rgba(0,0,0,.08)" /><path d={`M${px - 7} ${py - 2} L${px} ${py - 26} L${px + 7} ${py - 2}Z`} fill="#4E9B6A" /></g>
  ) : (
    <g><ellipse cx={px} cy={py} rx="6" ry="3" fill="rgba(0,0,0,.08)" /><rect x={px - 1.5} y={py - 12} width="3" height="12" fill="#8C5A3C" /><circle cx={px} cy={py - 17} r="8" fill="#6DB37F" /></g>
  );
}

// Les bâtiments, chacun sur sa parcelle 10 × 10 (origine = coin arrière de la parcelle)
const ART = {
  poste: (x, y) => <><Box x={x + 1.5} y={y + 2} w={7} d={6} h={4} c="#F7D9A8" /><Roof x={x + 1.5} y={y + 2} z={4} w={7} d={6} h={3} c="#E0531F" /><FaceL x={x + 4} y={y + 8} z={0} w={2} h={2.6} c="#7A3E1D" /><FaceL x={x + 6.6} y={y + 8} z={1.6} w={1.4} h={1.2} c="#FFF8EC" /><FaceR x={x + 8.5} y={y + 3} z={1.6} d={2.2} h={1.6} c="#FFF8EC" /><Box x={x + 9} y={y + 8.6} w={0.8} d={0.8} h={2} c="#E0531F" /></>,
  atelier: (x, y) => <><Box x={x + 1} y={y + 2} w={8} d={6} h={4.5} c="#E9E4D8" top="#3B3F48" /><Box x={x + 2} y={y + 3} w={1.4} d={1.4} h={7} c="#3B3F48" /><FaceL x={x + 5.6} y={y + 8} z={0} w={2.4} h={3} c="#7A3E1D" /><FaceL x={x + 1.8} y={y + 8} z={1.4} w={3} h={2} c="#FFF8EC" /><FaceR x={x + 9} y={y + 3} z={1.4} d={3.6} h={2} c="#FFF8EC" /></>,
  rdv: (x, y) => <><Box x={x + 2} y={y + 2} w={6} d={6} h={11} c="#DCE8F5" top="#2F4A6E" />{[2, 5, 8].map((z) => <FaceL key={z} x={x + 2.8} y={y + 8} z={z} w={4.4} h={1.4} c="#FFF8EC" />)}{[2, 5, 8].map((z) => <FaceR key={z} x={x + 8} y={y + 2.8} z={z} d={4.4} h={1.4} c="#FFF8EC" />)}<FaceL x={x + 4} y={y + 8} z={0} w={2} h={1.6} c="#2F4A6E" /></>,
  annuaire: (x, y) => <><Box x={x + 1} y={y + 2.5} w={8} d={5} h={4.5} c="#F2EEE4" /><Roof x={x + 1} y={y + 2.5} z={4.5} w={8} d={5} h={2} c="#8C5A3C" />{[1.6, 3.4, 5.8, 7.6].map((dx) => <FaceL key={dx} x={x + dx} y={y + 7.5} z={0} w={0.6} h={4.5} c="#D9D0BC" />)}<FaceL x={x + 4.4} y={y + 7.5} z={0} w={1.2} h={3} c="#5A3A26" /></>,
  radar: (x, y) => { const [cx, cy] = P(x + 5, y + 5, 14); return <><Box x={x + 4} y={y + 4} w={2} d={2} h={13} c="#3B3F48" /><Box x={x + 3.6} y={y + 3.6} w={2.8} d={2.8} h={0.8} z={6} c="#E0531F" /><Box x={x + 3.6} y={y + 3.6} w={2.8} d={2.8} h={0.8} z={10} c="#E0531F" /><ellipse cx={cx} cy={cy - 6} rx="18" ry="9" fill="#E9E4D8" stroke="#3B3F48" strokeWidth="2" transform={`rotate(-25 ${cx} ${cy - 6})`} /><circle cx={cx + 6} cy={cy - 20} r="3" fill="#E0531F" /><path d={`M${cx + 14} ${cy - 30}a14 14 0 0 1 10 12M${cx + 18} ${cy - 38}a22 22 0 0 1 14 20`} fill="none" stroke="#E0531F" strokeWidth="2.5" strokeLinecap="round" /></>; },
  espion: (x, y) => { const [ex, ey] = P(x + 5, y + 8, 2.6); return <><Box x={x + 2} y={y + 2.5} w={6} d={5.5} h={4} c="#3A3C44" /><Roof x={x + 2} y={y + 2.5} z={4} w={6} d={5.5} h={3} c="#15161A" /><ellipse cx={ex} cy={ey} rx="9" ry="5" fill="#FFF8EC" /><circle cx={ex} cy={ey} r="3.4" fill="#E0531F" /><circle cx={ex} cy={ey} r="1.4" fill="#15161A" /></>; },
  linkedin: (x, y) => { const [lx, ly] = P(x + 5, y + 8, 5.4); return <><Box x={x + 1.5} y={y + 2} w={7} d={6} h={4} c="#F7F4EE" /><Box x={x + 1.2} y={y + 1.7} w={7.6} d={6.6} z={4} h={0.8} c="#0A66C2" /><FaceL x={x + 2} y={y + 8} z={1.2} w={3.2} h={1.8} c="#CFE0F3" /><FaceL x={x + 6} y={y + 8} z={0} w={1.8} h={2.8} c="#7A3E1D" /><rect x={lx - 9} y={ly - 13} width="18" height="12" rx="2" fill="#0A66C2" /><text x={lx} y={ly - 4} textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff" fontFamily="Nunito, sans-serif">in</text></>; },
  observatoire: (x, y) => { const [dx, dy] = P(x + 5, y + 5, 5); return <><Box x={x + 2} y={y + 2} w={6} d={6} h={5} c="#E9E4D8" /><path d={`M${dx - 34} ${dy}a34 26 0 0 1 68 0z`} fill="#5B5E66" /><path d={`M${dx + 4} ${dy - 18}l22 -14 4 6 -22 14z`} fill="#E0531F" /><FaceL x={x + 4.2} y={y + 8} z={0} w={1.6} h={2.6} c="#7A3E1D" /></>; },
  mairie: (x, y) => { const [fx, fy] = P(x + 5, y + 5, 9.5); return <><Box x={x + 0.8} y={y + 2} w={8.4} d={6} h={5} c="#FFF8EC" /><Roof x={x + 0.8} y={y + 2} z={5} w={8.4} d={6} h={2.6} c="#E0531F" />{[1.6, 3.4, 5.8, 7.6].map((d) => <FaceL key={d} x={x + d} y={y + 8} z={1.6} w={0.9} h={1.8} c="#DCE8F5" />)}<FaceL x={x + 4.4} y={y + 8} z={0} w={1.2} h={2.8} c="#7A3E1D" /><path d={`M${fx} ${fy}v-18`} stroke="#3B3F48" strokeWidth="1.6" /><path d={`M${fx} ${fy - 18}h12l-3 4 3 4h-12z`} fill="#E0531F" /></>; },
};

const LOT = 10, ROAD = 4, MARGE = 3;
const lot = (g) => MARGE + g * (LOT + ROAD);

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
      <rect x={-a.nom.length * 3.1 - 5} y="-41" width={a.nom.length * 6.2 + 10} height="13" rx="6.5" fill="#fff" stroke={a.c} strokeWidth="1.3" />
      <text x="0" y="-31.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#15161A" fontFamily="Nunito, Geist, system-ui, sans-serif">{a.nom}</text>
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
  const trees = [[1.2, 6, 1], [1.4, 20, 0], [6, 1.2, 0], [20, 1.4, 1], [34, 1.3, 0], [1.3, 34, 1], [T - 1.3, 8, 0], [T - 1.4, 26, 1], [9, T - 1.3, 1], [27, T - 1.3, 0]];
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
        <polygon points={pts([[0, T, 0], [T, T, 0], [T, T, -2], [0, T, -2]])} fill="#D8D2C4" />
        <polygon points={pts([[T, 0, 0], [T, T, 0], [T, T, -2], [T, 0, -2]])} fill="#E3DDD0" />
        <polygon points={pts([[0, 0, 0], [T, 0, 0], [T, T, 0], [0, T, 0]])} fill="#F3F1EC" />
        {/* Rues */}
        {roads.map((r, i) => <polygon key={i} points={pts(r.map(([x, y]) => [x, y, 0.02]))} fill="#E4E1DA" />)}
        {roads.map((r, i) => { const vert = r[0][1] === 0 && r[3][1] === T; const m = vert ? (r[0][0] + r[1][0]) / 2 : (r[0][1] + r[2][1]) / 2; return Array.from({ length: 12 }, (_, k) => { const t = 1.5 + k * 3.5; const a = vert ? P(m, t, 0.05) : P(t, m, 0.05), b = vert ? P(m, t + 1.6, 0.05) : P(t + 1.6, m, 0.05); return <line key={`${i}-${k}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#fff" strokeWidth="2" />; }); })}
        {trees.map(([x, y, k], i) => <Tree key={i} x={x} y={y} kind={k} />)}
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
              <polygon points={pts([[x, y, 0.03], [x + LOT, y, 0.03], [x + LOT, y + LOT, 0.03], [x, y + LOT, 0.03]])} fill={hot ? "#FCE7DC" : "#ECE9E1"} stroke={hot ? "#E0531F" : "none"} strokeWidth="2" />
              {hot && <ellipse cx={lx} cy={ly} rx="62" ry="31" fill="none" stroke="#E0531F" strokeWidth="1.5" opacity=".6" />}
              <g style={{ transition: "transform .2s", transform: hot ? "translateY(-4px)" : "none" }}>{ART[b.art](x, y)}</g>
            </a>,
            <Slot key={`slot${oi + 1}`} k={oi + 1} uses={uses} nav={nav} toOf={toOf} />,
          ];
        })}
        {/* Enseignes : le nom en gros, au-dessus de chaque bâtiment */}
        {pos.map((b, i) => {
          const [sx, sy] = b.art === "rdv" ? P(lot(b.gx) + 3, lot(b.gy) + 8, 12.5) : P(lot(b.gx) + 6, lot(b.gy) + 6, b.art === "radar" ? 18 : 8.6);
          const w = b.nom.length * 10.4 + 26;
          return (
            <g key={`s${b.art}`} pointerEvents="none">
              <rect x={sx - w / 2} y={sy - 20} width={w} height="30" rx="8" fill="#FFF8EC" stroke={on === i ? "#E0531F" : "#7A3E1D"} strokeWidth="2.5" />
              <text x={sx} y={sy + 2} textAnchor="middle" fontSize="19" fontWeight="900" fill="#15161A" fontFamily="Nunito, Geist, system-ui, sans-serif">{b.nom}</text>
              {(b.badge > 0 || b.alerte) && <g><circle cx={sx + w / 2} cy={sy - 20} r="12" fill="#E0531F" stroke="#fff" strokeWidth="2.5" /><text x={sx + w / 2} y={sy - 15.5} textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff" fontFamily="Nunito, sans-serif">{b.alerte ? "!" : b.badge > 99 ? "99+" : b.badge}</text></g>}
            </g>
          );
        })}
        {/* Ce que dit l'agent, au-dessus de tout */}
        <g ref={bulleRef} pointerEvents="none">
          {bulle && (() => { const w = Math.min(260, bulle.t.length * 6.6 + 20); const a = AGENTS[bulle.i]; return <g><rect x={-w / 2} y="-92" width={w} height="26" rx="9" fill="#15161A" /><path d="M-5 -66.5h10l-5 6z" fill="#15161A" /><text x="0" y="-74.5" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#fff" fontFamily="Nunito, Geist, system-ui, sans-serif"><tspan fill="#FDBA74">{a.nom} : </tspan>{bulle.t}</text></g>; })()}
        </g>
      </svg>
      {/* Zoom et déplacement */}
      <div className={cx2("absolute flex flex-col gap-1.5", full ? "right-4 bottom-6" : "right-3 top-3")}>
        {[["+", 1.25], ["−", 0.8]].map(([l, f]) => <button key={l} onClick={() => setVue((v) => ({ ...v, z: Math.min(3, Math.max(0.8, v.z * f)) }))} className="h-9 w-9 rounded-xl border border-line bg-white text-[18px] font-bold shadow-sm hover:border-ink-faint" aria-label={l === "+" ? "Zoomer" : "Dézoomer"}>{l}</button>)}
        <button onClick={() => setVue({ z: z0, dx: 0, dy: dy0 })} className="h-9 w-9 rounded-xl border border-line bg-white text-[13px] shadow-sm hover:border-ink-faint" aria-label="Recentrer" title="Recentrer">⌂</button>
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
