import { useState } from "react";
import { useNavigate } from "react-router-dom";

/* Bingoo!-ville en vue isométrique (dessins originaux, couleurs Bingoo!). Une parcelle par partie de l'application,
   des rues, des arbres, et au survol (ou au focus clavier) une carte « en direct » avec les vrais chiffres. Clic = on entre. */

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

export default function IsoVille({ batiments }) {
  const nav = useNavigate();
  const [on, setOn] = useState(null);
  const N = 3, T = 2 * MARGE + N * LOT + (N - 1) * ROAD; // taille du plateau
  // Bornes de l'image
  const corners = [P(0, 0, 0), P(T, 0, 0), P(0, T, 0), P(T, T, -2)];
  const minX = Math.min(...corners.map((c) => c[0])) - 10, maxX = Math.max(...corners.map((c) => c[0])) + 10;
  const minY = Math.min(...corners.map((c) => c[1])) - 70, maxY = Math.max(...corners.map((c) => c[1])) + 16;
  const VW = maxX - minX, VH = maxY - minY;
  const PLACE = ["poste", "atelier", "radar", "annuaire", "observatoire", "espion", "rdv", "linkedin", "mairie"];
  const pos = PLACE.map((k) => batiments.find((b) => b.art === k)).filter(Boolean).map((b, i) => ({ ...b, gx: i % N, gy: Math.floor(i / N) }));
  const order = [...pos].sort((a, b) => a.gx + a.gy - (b.gx + b.gy));
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
      <svg viewBox={`${minX} ${minY} ${VW} ${VH}`} className="w-full h-auto select-none" role="group" aria-label="Bingoo!-ville">
        {/* Plateau */}
        <polygon points={pts([[0, T, 0], [T, T, 0], [T, T, -2], [0, T, -2]])} fill="#D8D2C4" />
        <polygon points={pts([[T, 0, 0], [T, T, 0], [T, T, -2], [T, 0, -2]])} fill="#E3DDD0" />
        <polygon points={pts([[0, 0, 0], [T, 0, 0], [T, T, 0], [0, T, 0]])} fill="#F3F1EC" />
        {/* Rues */}
        {roads.map((r, i) => <polygon key={i} points={pts(r.map(([x, y]) => [x, y, 0.02]))} fill="#E4E1DA" />)}
        {roads.map((r, i) => { const vert = r[0][1] === 0 && r[3][1] === T; const m = vert ? (r[0][0] + r[1][0]) / 2 : (r[0][1] + r[2][1]) / 2; return Array.from({ length: 12 }, (_, k) => { const t = 1.5 + k * 3.5; const a = vert ? P(m, t, 0.05) : P(t, m, 0.05), b = vert ? P(m, t + 1.6, 0.05) : P(t + 1.6, m, 0.05); return <line key={`${i}-${k}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#fff" strokeWidth="2" />; }); })}
        {trees.map(([x, y, k], i) => <Tree key={i} x={x} y={y} kind={k} />)}
        {/* Parcelles et bâtiments (de l'arrière vers l'avant) */}
        {order.map((b) => {
          const i = pos.indexOf(b), x = lot(b.gx), y = lot(b.gy), hot = on === i;
          const [lx, ly] = P(x + 5, y + 5, 0);
          return (
            <a key={b.art} href={`#${b.to}`} onClick={(e) => { e.preventDefault(); nav(b.to); }} onMouseEnter={() => setOn(i)} onMouseLeave={() => setOn(null)} onFocus={() => setOn(i)} onBlur={() => setOn(null)} aria-label={`${b.nom} : ${b.quoi}`} className="cursor-pointer focus:outline-none">
              <polygon points={pts([[x, y, 0.03], [x + LOT, y, 0.03], [x + LOT, y + LOT, 0.03], [x, y + LOT, 0.03]])} fill={hot ? "#FCE7DC" : "#ECE9E1"} stroke={hot ? "#E0531F" : "none"} strokeWidth="2" />
              {hot && <ellipse cx={lx} cy={ly} rx="62" ry="31" fill="none" stroke="#E0531F" strokeWidth="1.5" opacity=".6" />}
              <g style={{ transition: "transform .2s", transform: hot ? "translateY(-4px)" : "none" }}>{ART[b.art](x, y)}</g>
            </a>
          );
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
      </svg>
      {/* La carte « en direct » du bâtiment survolé */}
      {act && (
        <div className="pointer-events-none absolute z-10 w-[260px] rounded-2xl border border-line bg-white p-4 shadow-[0_18px_40px_-18px_rgba(21,22,26,.35)]"
          style={{ left: `${Math.min(78, Math.max(2, ((anchor[0] - minX) / VW) * 100 + 4))}%`, top: `${Math.max(0, ((anchor[1] - minY) / VH) * 100 - 30)}%` }}>
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
