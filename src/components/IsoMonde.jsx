import { useMemo, useState } from "react";
import pays from "i18n-iso-countries";
import fr from "i18n-iso-countries/langs/fr.json";
import CompanyLogo from "./CompanyLogo";

/* Le monde des SaaS, façon jeu : six îles (les continents) sur l'océan, en vue isométrique, dans le style du village Bingoo!.
   Chaque pays est un bâtiment, d'autant plus haut qu'il compte de SaaS. Clic sur une île : on y débarque et on voit tous
   ses pays ; clic sur un bâtiment : ses SaaS phares. Dessins originaux. Données : RPC saas_carte (un objet par pays). */
pays.registerLocale(fr);
const C = Math.cos(Math.PI / 6), S = 0.5;
const shade = (col, k) => {
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  const m = String(col).match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) return `rgb(${f(+m[1])},${f(+m[2])},${f(+m[3])})`;
  const n = parseInt(String(col).slice(1), 16); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
const drapeau = (c) => (c && c.length === 2 ? String.fromCodePoint(...[...c.toUpperCase()].map((x) => 127397 + x.charCodeAt(0))) : "");
const nomPays = (c) => pays.getName(c, "fr") ?? c;

// Îles : centre sur l'écran (u vers la droite, v vers le bas, en cases) et taille en cases
const ILES = {
  amnord: { nom: "Amérique du Nord", c: "#F2A541", sol: "#F7E3B5", u: -21, v: 5, w: 13, d: 11, liste: "US CA MX GT BZ SV HN NI CR PA CU JM HT DO BS BB TT PR GL" },
  europe: { nom: "Europe", c: "#4F7FE0", sol: "#D9E5FA", u: 1, v: 1, w: 11, d: 9, liste: "AL AD AT BY BE BA BG HR CY CZ DK EE FI FR DE GR HU IS IE IT XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA EU" },
  asie: { nom: "Asie", c: "#B45FC8", sol: "#EFDDF3", u: 22, v: 6, w: 12, d: 10, liste: "AF AM AZ BH BD BT BN KH CN GE IN ID IR IQ IL JP JO KZ KW KG LA LB MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TW TJ TH TL TR TM AE UZ VN YE HK" },
  amsud: { nom: "Amérique du Sud", c: "#3DAE76", sol: "#D5EEDD", u: -13, v: 22, w: 8, d: 8, liste: "AR BO BR CL CO EC GY PY PE SR UY VE FK GF" },
  afrique: { nom: "Afrique", c: "#E0692F", sol: "#F8DCC9", u: 3, v: 19, w: 9, d: 9, liste: "DZ AO BJ BW BF BI CM CV CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW EH" },
  oceanie: { nom: "Océanie", c: "#2FA7BC", sol: "#D3EEF2", u: 24, v: 22, w: 8, d: 6, liste: "AU NZ FJ PG SB VU NC WS TO" },
  // Les SaaS construits sur Bingoo! : un bâtiment par SaaS, un étage tous les 1 000 € de revenu mensuel vérifié, un phare à 10 000 €
  createurs: { nom: "Île des créateurs", c: "#E0531F", sol: "#FCE3D6", u: 13, v: 37, w: 10, d: 8, liste: "" },
};
const hauteurApp = (mrr) => 1.6 + 1.25 * Math.min(14, Math.floor(Number(mrr || 0) / 1000));
export const ILE_DE = Object.fromEntries(Object.entries(ILES).flatMap(([k, i]) => i.liste.split(" ").map((c) => [c, k])));

/** Petit moteur isométrique : U = taille d'une case en pixels. */
function iso(U, nuit = false) {
  const L = nuit ? 0.52 : 1; // lumière : la nuit, tout s'assombrit sauf les fenêtres et les phares
  const P = (x, y, z = 0) => [(x - y) * C * U, (x + y) * S * U - z * U];
  const pts = (a) => a.map(([x, y, z]) => P(x, y, z).map((n) => n.toFixed(1)).join(",")).join(" ");
  const Box = ({ x, y, z = 0, w, d, h, c, top }) => (
    <g>
      <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={shade(c, 0.8 * L)} />
      <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={shade(c, 0.93 * L)} />
      <polygon points={pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={shade(top ?? c, L)} />
    </g>
  );
  const Roof = ({ x, y, z, w, d, h, c }) => { const m = y + d / 2; return (
    <g>
      <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, m, z + h], [x, m, z + h]])} fill={shade(c, 0.86 * L)} />
      <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, m, z + h]])} fill={shade(c, 0.7 * L)} />
      <polygon points={pts([[x, y, z], [x + w, y, z], [x + w, m, z + h], [x, m, z + h]])} fill={shade(c, L)} />
    </g>
  ); };
  const Vitres = ({ x, y, w, d, h, etages }) => (
    <g>{Array.from({ length: etages }, (_, e) => {
      const z = 0.6 + e * (h - 0.8) / etages, hh = Math.min(0.9, (h - 0.8) / etages - 0.35);
      return <g key={e}>
        <polygon points={pts([[x + 0.25, y + d, z], [x + w - 0.25, y + d, z], [x + w - 0.25, y + d, z + hh], [x + 0.25, y + d, z + hh]])} fill={nuit ? "#FFE7A3" : "#FFD9A0"} opacity=".9" />
        <polygon points={pts([[x + w, y + 0.25, z], [x + w, y + d - 0.25, z], [x + w, y + d - 0.25, z + hh], [x + w, y + 0.25, z + hh]])} fill={nuit ? "#FFDD8A" : "#FFCB85"} opacity=".85" />
      </g>;
    })}</g>
  );
  const Arbre = ({ x, y, s = 1 }) => { const [px, py] = P(x, y, 0); const r = U * 0.32 * s; return (
    <g><ellipse cx={px} cy={py} rx={r * 1.1} ry={r * 0.55} fill="rgba(40,60,20,.18)" /><rect x={px - r * 0.12} y={py - r * 1.6} width={r * 0.24} height={r * 1.6} fill="#8A6142" />
      <circle cx={px - r * 0.5} cy={py - r * 1.9} r={r * 0.8} fill={shade("#6DAA45", L)} /><circle cx={px + r * 0.5} cy={py - r * 2} r={r * 0.85} fill={shade("#5F9C3C", L)} /><circle cx={px} cy={py - r * 2.7} r={r * 0.9} fill={shade("#7CBB52", L)} /></g>
  ); };
  /** Phare rayé rouge et blanc ; son faisceau tourne (bien visible la nuit). */
  const Phare = ({ x, y }) => {
    const [lx, ly] = P(x + 0.4, y + 0.4, 4.1);
    return (
      <g>
        <Box x={x} y={y} w={0.8} d={0.8} h={3.6} c="#F4F1EA" />
        <Box x={x - 0.02} y={y - 0.02} z={0.8} w={0.84} d={0.84} h={0.5} c="#D2463B" />
        <Box x={x - 0.02} y={y - 0.02} z={2.2} w={0.84} d={0.84} h={0.5} c="#D2463B" />
        <Box x={x + 0.1} y={y + 0.1} z={3.6} w={0.6} d={0.6} h={0.55} c="#FFD45E" top="#FFE69A" />
        <Roof x={x - 0.05} y={y - 0.05} z={4.15} w={0.9} d={0.9} h={0.5} c="#A8322A" />
        <circle cx={lx} cy={ly} r={U * 0.5} fill="#FFE69A" opacity={nuit ? 0.9 : 0.35} />
        <g style={{ mixBlendMode: "screen" }} opacity={nuit ? 0.75 : 0.22} pointerEvents="none">
          <polygon points={`${lx},${ly} ${lx + U * 9},${ly - U * 1.4} ${lx + U * 9},${ly + U * 1.4}`} fill="url(#faisceau)">
            {BOUGE && <animateTransform attributeName="transform" type="rotate" from={`0 ${lx} ${ly}`} to={`360 ${lx} ${ly}`} dur="7s" repeatCount="indefinite" />}
          </polygon>
        </g>
      </g>
    );
  };
  /** Ponton en bois avec un bateau amarré, au bord de l'île. */
  const Port = ({ x, y }) => {
    const [bx, by] = P(x + 1.2, y + 2.3, -1);
    return (
      <g>
        <Box x={x} y={y} z={-0.75} w={2.6} d={1.9} h={0.18} c="#9A6B47" top="#B9845A" />
        {[[x, y + 1.7], [x + 2.4, y + 1.7]].map(([a, b], i) => <Box key={i} x={a} y={b} z={-1.2} w={0.2} d={0.2} h={0.75} c="#6E4A31" />)}
        <g transform={`translate(${bx} ${by})`}><Bateau s={U / 13} sens={-1} c="#E8692B" /></g>
      </g>
    );
  };
  return { P, Box, Roof, Vitres, Arbre, Phare, Port, nuit };
}

// ---------------------------------------------------------------- Vie du monde : bateaux, avions, habitants
const BOUGE = typeof window === "undefined" || !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const hasard = (n) => { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); };
const chemin = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
/** Un objet qui suit un chemin en boucle (aller simple ou aller-retour). */
function Trajet({ d, dur, debut = 0, retour = false, children }) {
  if (!BOUGE) { const m = d.match(/M([-\d.]+) ([-\d.]+)/); return <g transform={`translate(${m?.[1] ?? 0} ${m?.[2] ?? 0})`}>{children}</g>; }
  return <g>{children}<animateMotion dur={`${dur}s`} begin={`${-debut}s`} repeatCount="indefinite" path={d} {...(retour ? { keyPoints: "0;1;0", keyTimes: "0;0.5;1", calcMode: "linear" } : {})} /></g>;
}
/** Bateau vu de trois quarts : coque, voile, sillage. sens = 1 vers la droite, -1 vers la gauche. */
const Bateau = ({ s = 1, c = "#E8692B", sens = 1 }) => (
  <g transform={`scale(${s * sens} ${s})`}>
    <path d="M-16 5 Q-22 -2 -30 4" stroke="#fff" strokeWidth="1.6" fill="none" opacity=".7" />
    <path d="M-10 0h22l-5 6h-14z" fill="#7A4A2E" /><path d="M-10 0h22l-1 1.6h-20z" fill="#A86B44" />
    <rect x="0" y="-15" width="1.4" height="15" fill="#5A4E4E" /><path d="M1.4 -14 L11 -2 L1.4 -2z" fill="#fff" /><path d="M0 -13 L-7 -2 L0 -2z" fill={c} />
  </g>
);
/** Avion de ligne, nez vers la droite ; son ombre glisse sur l'eau. */
const Avion = ({ s = 1 }) => (
  <g transform={`scale(${s})`}>
    <path d="M-18 0 Q-18 -3 -14 -3 H12 Q18 -3 20 0 Q18 3 12 3 H-14 Q-18 3 -18 0z" fill="#fff" stroke="#C9D6E3" strokeWidth=".8" />
    <path d="M-2 -2 L-9 -14 L-4 -14 L6 -2z" fill="#E8692B" /><path d="M-2 2 L-7 9 L-3 9 L5 2z" fill="#E8692B" opacity=".85" /><path d="M-15 -2 L-19 -9 L-15 -9 L-11 -2z" fill="#E8692B" />
    {[0, 4, 8].map((x) => <circle key={x} cx={x} cy="-0.5" r=".9" fill="#7FB3E0" />)}
  </g>
);
const OmbreAvion = ({ s = 1 }) => <ellipse rx={18 * s} ry={4 * s} fill="rgba(0,30,60,.22)" />;
/** Habitant : tête, corps coloré, jambes qui bougent. */
function Habitant({ s = 1, c = "#E8692B", i = 0 }) {
  return (
    <g transform={`scale(${s})`}>
      <ellipse cy="0.5" rx="3" ry="1.2" fill="rgba(0,0,0,.18)" />
      <rect x="-1.6" y="-4.5" width="1.2" height="4.5" rx=".6" fill="#3B3F48">{BOUGE && <animateTransform attributeName="transform" type="rotate" values="-18 -1 -4.5;18 -1 -4.5;-18 -1 -4.5" dur=".6s" begin={`${i * 0.13}s`} repeatCount="indefinite" />}</rect>
      <rect x="0.4" y="-4.5" width="1.2" height="4.5" rx=".6" fill="#3B3F48">{BOUGE && <animateTransform attributeName="transform" type="rotate" values="18 1 -4.5;-18 1 -4.5;18 1 -4.5" dur=".6s" begin={`${i * 0.13}s`} repeatCount="indefinite" />}</rect>
      <rect x="-2.4" y="-10" width="4.8" height="6" rx="2" fill={c} />
      <circle cy="-12.4" r="2.4" fill="#F1C7A0" />
    </g>
  );
}
const COULEURS_HAB = ["#E8692B", "#3E5BA6", "#1F9D60", "#C13C6B", "#F2A541", "#6B4FC8", "#2FA7BC"];

/** Un pays = un bâtiment : maison (peu de SaaS), immeuble, puis tour. */
function Batiment({ g, x, y, h, c, choisi }) {
  const { Box, Roof, Vitres } = g;
  if (h < 2.6) return <g><Box x={x} y={y} w={2} d={2} h={h} c="#F6EADB" /><Roof x={x - 0.15} y={y - 0.15} z={h} w={2.3} d={2.3} h={1.1} c={choisi ? "#FFFFFF" : c} /><Vitres x={x} y={y} w={2} d={2} h={h} etages={1} /></g>;
  if (h < 6) return <g><Box x={x} y={y} w={2.2} d={2.2} h={h} c="#EFE9E1" top={choisi ? "#FFFFFF" : c} /><Vitres x={x} y={y} w={2.2} d={2.2} h={h} etages={Math.round(h / 1.3)} /></g>;
  return <g><Box x={x} y={y} w={2.4} d={2.4} h={h} c="#E6EDF5" top={c} /><Vitres x={x} y={y} w={2.4} d={2.4} h={h} etages={Math.round(h / 1.2)} /><Box x={x + 0.6} y={y + 0.6} z={h} w={1.2} d={1.2} h={1.2} c={choisi ? "#FFFFFF" : c} top={choisi ? "#FFFFFF" : shade(c, 1.15)} /></g>;
}

/** Une île : sable, herbe, bâtiments des pays (les plus gros d'abord), arbres sur les cases libres. */
function Ile({ g, k, x, y, w, d, lots, max, onPays, sel, etiquettes, onClick, survol, setSurvol }) {
  const ile = ILES[k];
  const { Box, Arbre, P } = g;
  const pas = etiquettes ? 4 : 3;
  const cols = Math.max(1, Math.floor(w / pas)), rangs = Math.max(1, Math.floor(d / pas));
  const cases = [];
  for (let r = 0; r < rangs; r++) for (let q = 0; q < cols; q++) cases.push([x + 0.6 + q * (w - 1.2) / cols, y + 0.6 + r * (d - 1.2) / rangs]);
  // Les plus gros pays au centre de l'île
  const centre = [x + w / 2, y + d / 2];
  const ordre = [...cases].sort((a, b) => Math.hypot(a[0] + 1 - centre[0], a[1] + 1 - centre[1]) - Math.hypot(b[0] + 1 - centre[0], b[1] + 1 - centre[1]));
  const places = lots.slice(0, ordre.length).map((p, i) => ({ p, at: ordre[i] }));
  const libres = ordre.slice(places.length);
  const objets = [
    ...places.map(({ p, at }) => ({ t: at[0] + at[1], el: (
      <g key={p.pays} className={onPays ? "cursor-pointer" : undefined} onClick={onPays ? (e) => { e.stopPropagation(); onPays(p.pays); } : undefined}>
        <Batiment g={g} x={at[0]} y={at[1]} h={p.app ? hauteurApp(p.mrr) : 1.6 + 9 * Math.sqrt(Number(p.n) / max)} c={p.app ? (p.couleur || ile.c) : ile.c} choisi={sel === p.pays} />
        {p.app && Number(p.mrr) >= 10000 && <g.Phare x={at[0] + 2.3} y={at[1] + 0.2} />}
      </g>
    ) })),
    ...libres.flatMap((at, i) => [{ t: at[0] + at[1] + 0.5, el: <Arbre key={`a${i}`} x={at[0] + 1} y={at[1] + 1} s={1 + (i % 3) * 0.15} /> }, ...(i % 2 ? [{ t: at[0] + at[1] + 2, el: <Arbre key={`b${i}`} x={at[0] + 2.2} y={at[1] + 0.4} s={0.8} /> }] : [])]),
    // Habitants : chacun fait l'aller-retour entre deux points de l'île, au bord des bâtiments
    ...Array.from({ length: etiquettes ? 10 : Math.min(6, 2 + lots.length) }, (_, i) => {
      const r = (n) => hasard(k.length * 31 + i * 7 + n);
      const a = [x + 0.5 + r(1) * (w - 1), y + d - 0.4 - r(2) * 1.2], b = [x + 0.5 + r(3) * (w - 1), y + d - 0.4 - r(4) * 1.2];
      const versLeFond = i % 3 === 0;
      const A = versLeFond ? [x + w - 0.4 - r(5) * 1, y + 0.5 + r(6) * (d - 1)] : a, B = versLeFond ? [x + w - 0.4 - r(7) * 1, y + 0.5 + r(8) * (d - 1)] : b;
      const d2 = chemin([P(A[0], A[1], 0), P(B[0], B[1], 0)]);
      return { t: versLeFond ? x + w : x + y + w + d, el: <Trajet key={`h${i}`} d={d2} dur={8 + r(9) * 8} debut={r(10) * 10} retour><Habitant s={etiquettes ? 1.3 : 0.95} c={COULEURS_HAB[i % COULEURS_HAB.length]} i={i} /></Trajet> };
    }),
  ].sort((a, b) => a.t - b.t);
  const hover = survol === k;
  return (
    <g onClick={onClick} onMouseEnter={() => setSurvol?.(k)} onMouseLeave={() => setSurvol?.(null)} className={onClick ? "cursor-pointer" : undefined} style={{ filter: hover ? "drop-shadow(0 0 10px rgba(255,255,255,.55))" : undefined, transition: "filter .2s" }}>
      <Box x={x - 0.7} y={y - 0.7} z={-1.1} w={w + 1.4} d={d + 1.4} h={0.7} c="#E9D7A4" top="#F1E3B8" />
      <g.Port x={x + 0.4} y={y + d + 0.2} />
      <Box x={x} y={y} z={-0.4} w={w} d={d} h={0.4} c={ile.c} top={ile.sol} />
      <g.Phare x={x + w - 1.1} y={y + 0.3} />
      {objets.map((o) => o.el)}
      {etiquettes && places.map(({ p, at }) => {
        const h = p.app ? hauteurApp(p.mrr) : 1.6 + 9 * Math.sqrt(Number(p.n) / max);
        const [px, py] = P(at[0] + 1.1, at[1] + 1.1, h + 1.9);
        const on = sel === p.pays;
        const g = p.app && Number(p.mrr_30j) > 0 ? Math.round((Number(p.mrr) / Number(p.mrr_30j) - 1) * 100) : null;
        const txt = p.app ? `${p.a_moi ? "★ " : ""}${p.nom} · ${Math.round(Number(p.mrr)).toLocaleString("fr-FR")} €${g ? ` ${g > 0 ? "↑" : "↓"}${Math.abs(g)} %` : ""}` : `${drapeau(p.pays)} ${p.n}`;
        const lw = p.app ? Math.max(52, txt.length * 7 + 14) : 52;
        return <g key={`e${p.pays}`} transform={`translate(${px} ${py})`} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onPays?.(p.pays); }}>
          <rect x={-lw / 2} y={-12} width={lw} height={22} rx={11} fill={on ? "#fff" : p.a_moi ? "#E0531F" : "#16213A"} fillOpacity={on ? 1 : 0.92} stroke={p.a_moi ? "#fff" : ile.c} strokeWidth="1.4" />
          <text y="4" textAnchor="middle" fontSize="12.5" fontWeight="800" fill={on ? "#16213A" : "#fff"}>{txt}</text>
        </g>;
      })}
    </g>
  );
}

export default function IsoMonde({ data, apps = [], onVoir, onApp }) {
  const [ile, setIle] = useState(null);
  const [sel, setSel] = useState(null);
  const [survol, setSurvol] = useState(null);
  // Jour ou nuit selon l'heure de la personne (20 h - 7 h : nuit), et un bouton pour basculer
  const [nuit, setNuit] = useState(() => { const h = new Date().getHours(); return h >= 20 || h < 7; });
  const parIle = useMemo(() => {
    const out = Object.fromEntries(Object.keys(ILES).map((k) => [k, []]));
    for (const p of data ?? []) { const k = ILE_DE[p.pays]; if (k) out[k].push(p); }
    for (const k in out) out[k].sort((a, b) => b.n - a.n);
    out.createurs = (apps ?? []).map((a) => ({ ...a, app: true, pays: a.slug, n: 1 })).sort((a, b) => Number(b.mrr) - Number(a.mrr));
    return out;
  }, [data, apps]);
  const max = Math.max(1, ...(data ?? []).map((p) => Number(p.n)));
  const total = (k) => parIle[k].reduce((s, p) => s + Number(p.n), 0);
  const unite = (k) => k === "createurs" ? `${parIle[k].length} SaaS construits` : `${total(k)} SaaS · ${parIle[k].length} pays`;

  // Monde : les six îles. Île : la même île, agrandie pour loger tous ses pays.
  const scene = useMemo(() => {
    if (!ile) {
      const g = iso(14, nuit);
      const items = Object.entries(ILES).map(([k, i]) => {
        const x = ((i.u / C + i.v / S) / 2) - i.w / 2, y = ((i.v / S - i.u / C) / 2) - i.d / 2;
        return { k, x, y, w: i.w, d: i.d };
      }).sort((a, b) => a.x + a.y - (b.x + b.y));
      return { g, items };
    }
    const n = Math.max(1, parIle[ile].length), cols = Math.max(3, Math.ceil(Math.sqrt(n * 1.3)));
    const rangs = Math.max(3, Math.ceil(n / cols) + 1);
    return { g: iso(n > 12 ? 17 : 22, nuit), items: [{ k: ile, x: 0, y: 0, w: cols * 4 + 1.2, d: rangs * 4 + 1.2 }] };
  }, [ile, parIle, nuit]);
  const vb = useMemo(() => {
    const { g, items } = scene;
    const P = g.P;
    const xs = [], ys = [];
    for (const it of items) for (const [a, b, z] of [[it.x - 1, it.y - 1, 0], [it.x + it.w + 1, it.y - 1, 0], [it.x - 1, it.y + it.d + 1, -1.2], [it.x + it.w + 1, it.y + it.d + 1, -1.2], [it.x, it.y, 14]]) { const [px, py] = P(a, b, z); xs.push(px); ys.push(py); }
    const m = 40;
    return [Math.min(...xs) - m, Math.min(...ys) - m - 30, Math.max(...xs) - Math.min(...xs) + 2 * m, Math.max(...ys) - Math.min(...ys) + 2 * m + 40];
  }, [scene]);
  const p = sel && ile !== "createurs" ? (data ?? []).find((q) => q.pays === sel) : null;
  const a = sel && ile === "createurs" ? parIle.createurs.find((q) => q.pays === sel) : null;

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
      <div className="relative overflow-hidden rounded-3xl" style={{ background: nuit ? "radial-gradient(ellipse at 50% 30%, #23406B 0%, #142A4D 50%, #0A1730 100%)" : "radial-gradient(ellipse at 50% 35%, #5BB8E0 0%, #2E8CC4 45%, #1D5F99 100%)", transition: "background .6s" }}>
        <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" aria-hidden><defs><pattern id="vagues" width="46" height="24" patternUnits="userSpaceOnUse"><path d="M2 14q5 -5 10 0t10 0" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" /></pattern></defs><rect width="100%" height="100%" fill="url(#vagues)" /></svg>
        <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
          {ile ? <button onClick={() => { setIle(null); setSel(null); }} className="rounded-full bg-white/90 px-3.5 py-1.5 text-[13px] font-bold text-ink shadow hover:bg-white">← Le monde</button>
            : <span className="rounded-full bg-white/90 px-3.5 py-1.5 text-[13px] font-bold text-ink shadow">Choisis une île</span>}
          <button onClick={() => setNuit(!nuit)} className="rounded-full bg-white/90 px-3.5 py-1.5 text-[13px] font-bold text-ink shadow hover:bg-white" title="Basculer jour / nuit">{nuit ? "☀ Jour" : "☾ Nuit"}</button>
          {ile && <span className="rounded-full px-3.5 py-1.5 text-[13px] font-bold text-white shadow" style={{ background: ILES[ile].c }}>{ILES[ile].nom} · {unite(ile)}</span>}
        </div>
        <svg key={ile ?? "monde"} viewBox={vb.join(" ")} className="relative block w-full h-auto min-h-[360px] max-h-[640px] select-none" style={{ animation: "ile-in .55s cubic-bezier(.2,.8,.2,1) both" }} role="img" aria-label={ile ? `Île ${ILES[ile].nom}` : "Le monde des SaaS"}>
          <defs><linearGradient id="faisceau" x1="0" x2="1"><stop offset="0" stopColor="#FFF3C4" stopOpacity=".95" /><stop offset="1" stopColor="#FFF3C4" stopOpacity="0" /></linearGradient></defs>
          {/* Étoiles la nuit, oiseaux le jour */}
          {nuit && Array.from({ length: 46 }, (_, i) => {
            const cx = vb[0] + hasard(i * 3 + 1) * vb[2], cy = vb[1] + hasard(i * 3 + 2) * vb[3] * 0.45;
            return <circle key={`e${i}`} cx={cx} cy={cy} r={0.8 + hasard(i * 3 + 3) * 1.4} fill="#fff" opacity=".8">{BOUGE && <animate attributeName="opacity" values=".2;.95;.2" dur={`${2 + hasard(i) * 3}s`} begin={`${-hasard(i + 5) * 3}s`} repeatCount="indefinite" />}</circle>;
          })}
          {!nuit && [0, 1, 2].map((i) => {
            const y0 = vb[1] + vb[3] * (0.12 + i * 0.1);
            const d = `M${vb[0] + vb[2] + 40} ${y0} Q${vb[0] + vb[2] / 2} ${y0 - 40} ${vb[0] - 40} ${y0 + 20}`;
            return <Trajet key={`o${i}`} d={d} dur={30 + i * 7} debut={i * 9}><g>{[0, 1, 2].map((j) => <path key={j} d={`M${j * 12} ${j * 5}q4 -5 8 0q4 -5 8 0`} fill="none" stroke="#1D3A55" strokeWidth="1.6" strokeLinecap="round">{BOUGE && <animateTransform attributeName="transform" type="scale" values="1 1;1 .4;1 1" dur=".7s" begin={`${j * 0.2}s`} repeatCount="indefinite" additive="sum" />}</path>)}</g></Trajet>;
          })}
          {/* Bateaux entre les îles (monde) ou autour de l'île (escale) */}
          {(() => {
            const { P } = scene.g;
            if (!ile) {
              const par = Object.fromEntries(scene.items.map((it) => [it.k, it]));
              const centre = (it) => P(it.x + it.w / 2, it.y + it.d / 2, -1);
              const routes = [["amnord", "europe"], ["europe", "asie"], ["amsud", "afrique"], ["afrique", "oceanie"], ["amnord", "amsud"], ["asie", "oceanie"], ["europe", "afrique"], ["afrique", "createurs"], ["amsud", "createurs"]];
              return routes.map(([a, b], i) => {
                const [x1, y1] = centre(par[a]), [x2, y2] = centre(par[b]);
                const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + 40 + hasard(i) * 30;
                const sens = x2 >= x1 ? 1 : -1;
                const d = `M${x1.toFixed(1)} ${(y1 + 18).toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${(y2 + 18).toFixed(1)}`;
                return <Trajet key={`bt${i}`} d={d} dur={26 + hasard(i + 3) * 18} debut={hasard(i + 9) * 30}><Bateau s={1.4} sens={sens} c={["#E8692B", "#3E5BA6", "#1F9D60", "#C13C6B"][i % 4]} /></Trajet>;
              });
            }
            const it = scene.items[0];
            const tour = [[it.x - 3, it.y - 3], [it.x + it.w + 3, it.y - 3], [it.x + it.w + 3, it.y + it.d + 3], [it.x - 3, it.y + it.d + 3], [it.x - 3, it.y - 3]].map(([a, b]) => P(a, b, -1));
            const d = chemin(tour) + " Z";
            return [0, 1, 2].map((i) => <Trajet key={`bi${i}`} d={d} dur={60} debut={i * 20}><Bateau s={1.8} c={["#E8692B", "#3E5BA6", "#1F9D60"][i]} /></Trajet>);
          })()}
          {scene.items.map((it) => (
            <Ile key={it.k} g={scene.g} k={it.k} {...it} lots={ile ? parIle[it.k] : parIle[it.k].slice(0, 6)} max={max} sel={sel}
              etiquettes={!!ile} onPays={ile ? (c) => setSel(c) : null}
              onClick={ile ? undefined : () => setIle(it.k)} survol={survol} setSurvol={ile ? null : setSurvol} />
          ))}
          {!ile && scene.items.map((it) => {
            const haut = it.k === "createurs" ? hauteurApp(parIle[it.k][0]?.mrr) : parIle[it.k][0] ? 1.6 + 9 * Math.sqrt(Number(parIle[it.k][0].n) / max) : 1.5;
            const [px, py] = scene.g.P(it.x + it.w / 2, it.y + it.d / 2, haut + 3.2);
            const i = ILES[it.k];
            return (
              <g key={`b${it.k}`} transform={`translate(${px} ${py})`} className="cursor-pointer" onClick={() => setIle(it.k)} onMouseEnter={() => setSurvol(it.k)} onMouseLeave={() => setSurvol(null)}>
                <rect x={-72} y={-24} width={144} height={42} rx={12} fill="#fff" stroke={i.c} strokeWidth="2.5" style={{ filter: "drop-shadow(0 6px 10px rgba(0,30,60,.35))" }} />
                <text y="-6" textAnchor="middle" fontSize="14" fontWeight="800" fill="#16213A">{i.nom}</text>
                <text y="11" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={i.c}>{unite(it.k)}</text>
              </g>
            );
          })}
          {/* Avions : l'ombre sur l'eau, l'avion bien plus haut */}
          {[0, 1].map((i) => {
            const [vx, vy, vw, vh] = vb;
            const y0 = vy + vh * (0.3 + i * 0.35), pente = vh * 0.12 * (i ? -1 : 1);
            const d = `M${(vx - 60).toFixed(1)} ${y0.toFixed(1)} L${(vx + vw + 60).toFixed(1)} ${(y0 + pente).toFixed(1)}`;
            const dOmbre = `M${(vx - 60).toFixed(1)} ${(y0 + 70).toFixed(1)} L${(vx + vw + 60).toFixed(1)} ${(y0 + pente + 70).toFixed(1)}`;
            const dur = 22 + i * 9, debut = i * 11;
            return <g key={`av${i}`} pointerEvents="none"><Trajet d={dOmbre} dur={dur} debut={debut}><OmbreAvion s={ile ? 2 : 1.5} /></Trajet><Trajet d={d} dur={dur} debut={debut}><Avion s={ile ? 2 : 1.5} /></Trajet></g>;
          })}
        </svg>
        <style>{"@keyframes ile-in{from{opacity:0;transform:scale(.92)}}"}</style>
      </div>

      <aside className="rounded-3xl bg-white border border-line p-5 min-h-[300px]">
        {a ? (
          <>
            <button onClick={() => setSel(null)} className="text-[12.5px] text-ink-faint hover:text-ink">← Île des créateurs</button>
            <p className="mt-3 grid h-12 w-12 place-items-center rounded-2xl text-white text-[22px] font-black" style={{ background: a.couleur || "#E0531F" }}>{String(a.nom ?? "S")[0]}</p>
            <h2 className="mt-2 text-[24px] font-black" style={{ fontFamily: "var(--font-titre)" }}>{a.nom}</h2>
            <p className="text-[13.5px] text-ink-soft">{a.pitch}</p>
            <p className="mt-1 text-[12.5px] text-ink-faint">Créé par {a.createur}{a.a_moi ? " · c'est toi" : ""}{a.a_moi && !a.public ? " · visible par toi seulement" : ""}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[[`${Math.round(Number(a.mrr)).toLocaleString("fr-FR")} €`, "par mois"], [a.abonnes, "abonnés"], [a.comptes, "comptes"]].map(([v, l]) => <div key={l} className="rounded-xl bg-paper py-2"><p className="text-[18px] font-black tnum">{v}</p><p className="text-[11.5px] text-ink-faint">{l}</p></div>)}
            </div>
            <p className="mt-2 text-[11.5px] text-ink-faint">Revenu vérifié dans Stripe. {Number(a.mrr) >= 10000 ? "Phare allumé : plus de 10 000 € par mois." : `Prochain étage à ${(Math.floor(Number(a.mrr) / 1000) + 1) * 1000} €.`}</p>
            <button onClick={() => onApp?.(a)} className="mt-4 w-full rounded-xl bg-ink text-white py-2.5 text-[14px] font-bold hover:bg-black">Ouvrir {a.nom} ↗</button>
          </>
        ) : p ? (
          <>
            <button onClick={() => setSel(null)} className="text-[12.5px] text-ink-faint hover:text-ink">← {ILES[ile].nom}</button>
            <p className="mt-2 text-[40px] leading-none">{drapeau(p.pays)}</p>
            <h2 className="mt-1 text-[24px] font-black" style={{ fontFamily: "var(--font-titre)" }}>{nomPays(p.pays)}</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[[p.n, "SaaS"], [p.recrutent, "recrutent"], [p.postes, "postes ouverts"]].map(([v, l]) => <div key={l} className="rounded-xl bg-paper py-2"><p className="text-[20px] font-black tnum">{v}</p><p className="text-[11.5px] text-ink-faint">{l}</p></div>)}
            </div>
            {p.categories?.length > 0 && <div className="mt-4"><p className="text-[12px] font-bold uppercase tracking-wide text-ink-faint">Points forts</p><div className="mt-1.5 flex flex-wrap gap-1.5">{p.categories.map((c) => <span key={c.categorie} className="rounded-full bg-paper px-2.5 py-1 text-[12.5px]">{c.categorie} <span className="text-ink-faint">{c.n}</span></span>)}</div></div>}
            <p className="mt-4 text-[12px] font-bold uppercase tracking-wide text-ink-faint">SaaS phares</p>
            <ul className="mt-1.5 space-y-1.5">{(p.phares ?? []).map((s) => (
              <li key={s.domaine}><button onClick={() => onVoir?.(p.pays, s.domaine)} className="w-full flex items-center gap-2.5 rounded-xl border border-line px-2.5 py-2 text-left hover:border-ink-faint">
                <CompanyLogo name={s.nom} url={`https://${s.domaine}`} className="w-8 h-8" />
                <span className="min-w-0 flex-1"><span className="block font-semibold text-[14px] truncate">{s.nom}</span><span className="block text-[12px] text-ink-faint truncate">{s.categorie}{s.rang_web ? ` · N° ${Number(s.rang_web).toLocaleString("fr-FR")} mondial` : ""}</span></span>
              </button></li>
            ))}</ul>
            <button onClick={() => onVoir?.(p.pays)} className="mt-4 w-full rounded-xl bg-ink text-white py-2.5 text-[14px] font-bold hover:bg-black">Voir les {p.n} SaaS</button>
          </>
        ) : (
          <>
            <h2 className="font-bold text-[17px]">{ile === "createurs" ? "Les SaaS construits sur Bingoo!" : ile ? `${ILES[ile].nom} : ses pays` : "Le monde des SaaS"}</h2>
            <p className="text-[12.5px] text-ink-faint">{ile === "createurs" ? "Un étage tous les 1 000 € de revenu mensuel vérifié, un phare à 10 000 €." : ile ? "Clique sur un bâtiment : plus il est haut, plus le pays compte de SaaS." : "Chaque île est un continent, chaque bâtiment un pays. L'île orange : les SaaS construits sur Bingoo!."}</p>
            {ile === "createurs" ? (
              <ul className="mt-3 space-y-1">{parIle.createurs.slice(0, 15).map((q, i) => (
                <li key={q.slug}><button onClick={() => setSel(q.pays)} className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-paper">
                  <span className="w-5 text-[12px] text-ink-faint tnum">{i + 1}</span><span className="h-5 w-5 rounded-md" style={{ background: q.couleur || "#E0531F" }} /><span className="flex-1 text-[14px] truncate">{q.nom}</span><span className="text-[13px] font-semibold tnum">{Math.round(Number(q.mrr)).toLocaleString("fr-FR")} €</span>
                </button></li>
              ))}{!parIle.createurs.length && <li className="text-[13px] text-ink-faint">Aucun SaaS affiché pour l'instant. Construis le tien dans « Lancer ma version » et coche « Afficher dans le monde ».</li>}</ul>
            ) : <ul className="mt-3 space-y-1">{(ile ? parIle[ile] : [...(data ?? [])].sort((a, b) => b.n - a.n)).slice(0, 12).map((q) => (
              <li key={q.pays}><button onClick={() => { if (!ile) setIle(ILE_DE[q.pays]); setSel(q.pays); }} className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-paper">
                <span className="text-[18px]">{drapeau(q.pays)}</span><span className="flex-1 text-[14px] truncate">{nomPays(q.pays)}</span>
                <span className="h-1.5 w-16 rounded-full bg-paper overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${Math.max(6, (q.n / max) * 100)}%`, background: ILES[ILE_DE[q.pays]]?.c ?? "#999" }} /></span>
                <span className="w-8 text-right text-[13px] font-semibold tnum">{q.n}</span>
              </button></li>
            ))}</ul>}
            <p className="mt-3 text-[11.5px] text-ink-faint">Seuls les SaaS dont le pays est connu sont placés.</p>
          </>
        )}
      </aside>
    </div>
  );
}
