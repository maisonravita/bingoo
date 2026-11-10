import { useMemo, useState } from "react";
import pays from "i18n-iso-countries";
import fr from "i18n-iso-countries/langs/fr.json";
import CompanyLogo from "./CompanyLogo";

/* Le monde des SaaS, façon jeu : six îles (les continents) sur l'océan, en vue isométrique, dans le style du village Bingoo!.
   Chaque pays est un bâtiment, d'autant plus haut qu'il compte de SaaS. Clic sur une île : on y débarque et on voit tous
   ses pays ; clic sur un bâtiment : ses SaaS phares. Dessins originaux. Données : RPC saas_carte (un objet par pays). */
pays.registerLocale(fr);
const C = Math.cos(Math.PI / 6), S = 0.5;
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
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
};
const ILE_DE = Object.fromEntries(Object.entries(ILES).flatMap(([k, i]) => i.liste.split(" ").map((c) => [c, k])));

/** Petit moteur isométrique : U = taille d'une case en pixels. */
function iso(U) {
  const P = (x, y, z = 0) => [(x - y) * C * U, (x + y) * S * U - z * U];
  const pts = (a) => a.map(([x, y, z]) => P(x, y, z).map((n) => n.toFixed(1)).join(",")).join(" ");
  const Box = ({ x, y, z = 0, w, d, h, c, top }) => (
    <g>
      <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={shade(c, 0.8)} />
      <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={shade(c, 0.93)} />
      <polygon points={pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={top ?? c} />
    </g>
  );
  const Roof = ({ x, y, z, w, d, h, c }) => { const m = y + d / 2; return (
    <g>
      <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, m, z + h], [x, m, z + h]])} fill={shade(c, 0.86)} />
      <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, m, z + h]])} fill={shade(c, 0.7)} />
      <polygon points={pts([[x, y, z], [x + w, y, z], [x + w, m, z + h], [x, m, z + h]])} fill={c} />
    </g>
  ); };
  const Vitres = ({ x, y, w, d, h, etages }) => (
    <g>{Array.from({ length: etages }, (_, e) => {
      const z = 0.6 + e * (h - 0.8) / etages, hh = Math.min(0.9, (h - 0.8) / etages - 0.35);
      return <g key={e}>
        <polygon points={pts([[x + 0.25, y + d, z], [x + w - 0.25, y + d, z], [x + w - 0.25, y + d, z + hh], [x + 0.25, y + d, z + hh]])} fill="#FFD9A0" opacity=".9" />
        <polygon points={pts([[x + w, y + 0.25, z], [x + w, y + d - 0.25, z], [x + w, y + d - 0.25, z + hh], [x + w, y + 0.25, z + hh]])} fill="#FFCB85" opacity=".85" />
      </g>;
    })}</g>
  );
  const Arbre = ({ x, y, s = 1 }) => { const [px, py] = P(x, y, 0); const r = U * 0.32 * s; return (
    <g><ellipse cx={px} cy={py} rx={r * 1.1} ry={r * 0.55} fill="rgba(40,60,20,.18)" /><rect x={px - r * 0.12} y={py - r * 1.6} width={r * 0.24} height={r * 1.6} fill="#8A6142" />
      <circle cx={px - r * 0.5} cy={py - r * 1.9} r={r * 0.8} fill="#6DAA45" /><circle cx={px + r * 0.5} cy={py - r * 2} r={r * 0.85} fill="#5F9C3C" /><circle cx={px} cy={py - r * 2.7} r={r * 0.9} fill="#7CBB52" /></g>
  ); };
  return { P, Box, Roof, Vitres, Arbre };
}

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
        <Batiment g={g} x={at[0]} y={at[1]} h={1.6 + 9 * Math.sqrt(Number(p.n) / max)} c={ile.c} choisi={sel === p.pays} />
      </g>
    ) })),
    ...libres.flatMap((at, i) => [{ t: at[0] + at[1] + 0.5, el: <Arbre key={`a${i}`} x={at[0] + 1} y={at[1] + 1} s={1 + (i % 3) * 0.15} /> }, ...(i % 2 ? [{ t: at[0] + at[1] + 2, el: <Arbre key={`b${i}`} x={at[0] + 2.2} y={at[1] + 0.4} s={0.8} /> }] : [])]),
  ].sort((a, b) => a.t - b.t);
  const hover = survol === k;
  return (
    <g onClick={onClick} onMouseEnter={() => setSurvol?.(k)} onMouseLeave={() => setSurvol?.(null)} className={onClick ? "cursor-pointer" : undefined} style={{ filter: hover ? "drop-shadow(0 0 10px rgba(255,255,255,.55))" : undefined, transition: "filter .2s" }}>
      <Box x={x - 0.7} y={y - 0.7} z={-1.1} w={w + 1.4} d={d + 1.4} h={0.7} c="#E9D7A4" top="#F1E3B8" />
      <Box x={x} y={y} z={-0.4} w={w} d={d} h={0.4} c={ile.c} top={ile.sol} />
      {objets.map((o) => o.el)}
      {etiquettes && places.map(({ p, at }) => {
        const h = 1.6 + 9 * Math.sqrt(Number(p.n) / max);
        const [px, py] = P(at[0] + 1.1, at[1] + 1.1, h + 1.9);
        const on = sel === p.pays;
        return <g key={`e${p.pays}`} transform={`translate(${px} ${py})`} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onPays?.(p.pays); }}>
          <rect x={-26} y={-12} width={52} height={22} rx={11} fill={on ? "#fff" : "#16213A"} fillOpacity={on ? 1 : 0.88} stroke={ile.c} strokeWidth="1.4" />
          <text y="4" textAnchor="middle" fontSize="12.5" fontWeight="800" fill={on ? "#16213A" : "#fff"}>{drapeau(p.pays)} {p.n}</text>
        </g>;
      })}
    </g>
  );
}

export default function IsoMonde({ data, onVoir }) {
  const [ile, setIle] = useState(null);
  const [sel, setSel] = useState(null);
  const [survol, setSurvol] = useState(null);
  const parIle = useMemo(() => {
    const out = Object.fromEntries(Object.keys(ILES).map((k) => [k, []]));
    for (const p of data ?? []) { const k = ILE_DE[p.pays]; if (k) out[k].push(p); }
    for (const k in out) out[k].sort((a, b) => b.n - a.n);
    return out;
  }, [data]);
  const max = Math.max(1, ...(data ?? []).map((p) => Number(p.n)));
  const total = (k) => parIle[k].reduce((s, p) => s + Number(p.n), 0);

  // Monde : les six îles. Île : la même île, agrandie pour loger tous ses pays.
  const scene = useMemo(() => {
    if (!ile) {
      const g = iso(14);
      const items = Object.entries(ILES).map(([k, i]) => {
        const x = ((i.u / C + i.v / S) / 2) - i.w / 2, y = ((i.v / S - i.u / C) / 2) - i.d / 2;
        return { k, x, y, w: i.w, d: i.d };
      }).sort((a, b) => a.x + a.y - (b.x + b.y));
      return { g, items };
    }
    const n = Math.max(1, parIle[ile].length), cols = Math.max(3, Math.ceil(Math.sqrt(n * 1.3)));
    const rangs = Math.max(3, Math.ceil(n / cols) + 1);
    return { g: iso(n > 12 ? 17 : 22), items: [{ k: ile, x: 0, y: 0, w: cols * 4 + 1.2, d: rangs * 4 + 1.2 }] };
  }, [ile, parIle]);
  const vb = useMemo(() => {
    const { g, items } = scene;
    const P = g.P;
    const xs = [], ys = [];
    for (const it of items) for (const [a, b, z] of [[it.x - 1, it.y - 1, 0], [it.x + it.w + 1, it.y - 1, 0], [it.x - 1, it.y + it.d + 1, -1.2], [it.x + it.w + 1, it.y + it.d + 1, -1.2], [it.x, it.y, 14]]) { const [px, py] = P(a, b, z); xs.push(px); ys.push(py); }
    const m = 40;
    return [Math.min(...xs) - m, Math.min(...ys) - m - 30, Math.max(...xs) - Math.min(...xs) + 2 * m, Math.max(...ys) - Math.min(...ys) + 2 * m + 40];
  }, [scene]);
  const p = sel ? (data ?? []).find((q) => q.pays === sel) : null;

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
      <div className="relative overflow-hidden rounded-3xl" style={{ background: "radial-gradient(ellipse at 50% 35%, #5BB8E0 0%, #2E8CC4 45%, #1D5F99 100%)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" aria-hidden><defs><pattern id="vagues" width="46" height="24" patternUnits="userSpaceOnUse"><path d="M2 14q5 -5 10 0t10 0" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" /></pattern></defs><rect width="100%" height="100%" fill="url(#vagues)" /></svg>
        <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
          {ile ? <button onClick={() => { setIle(null); setSel(null); }} className="rounded-full bg-white/90 px-3.5 py-1.5 text-[13px] font-bold text-ink shadow hover:bg-white">← Le monde</button>
            : <span className="rounded-full bg-white/90 px-3.5 py-1.5 text-[13px] font-bold text-ink shadow">Choisis une île</span>}
          {ile && <span className="rounded-full px-3.5 py-1.5 text-[13px] font-bold text-white shadow" style={{ background: ILES[ile].c }}>{ILES[ile].nom} · {total(ile)} SaaS · {parIle[ile].length} pays</span>}
        </div>
        <svg key={ile ?? "monde"} viewBox={vb.join(" ")} className="relative block w-full h-auto min-h-[360px] max-h-[640px] select-none" style={{ animation: "ile-in .55s cubic-bezier(.2,.8,.2,1) both" }} role="img" aria-label={ile ? `Île ${ILES[ile].nom}` : "Le monde des SaaS"}>
          {scene.items.map((it) => (
            <Ile key={it.k} g={scene.g} k={it.k} {...it} lots={ile ? parIle[it.k] : parIle[it.k].slice(0, 6)} max={max} sel={sel}
              etiquettes={!!ile} onPays={ile ? (c) => setSel(c) : null}
              onClick={ile ? undefined : () => setIle(it.k)} survol={survol} setSurvol={ile ? null : setSurvol} />
          ))}
          {!ile && scene.items.map((it) => {
            const haut = parIle[it.k][0] ? 1.6 + 9 * Math.sqrt(Number(parIle[it.k][0].n) / max) : 1.5;
            const [px, py] = scene.g.P(it.x + it.w / 2, it.y + it.d / 2, haut + 3.2);
            const i = ILES[it.k];
            return (
              <g key={`b${it.k}`} transform={`translate(${px} ${py})`} className="cursor-pointer" onClick={() => setIle(it.k)} onMouseEnter={() => setSurvol(it.k)} onMouseLeave={() => setSurvol(null)}>
                <rect x={-72} y={-24} width={144} height={42} rx={12} fill="#fff" stroke={i.c} strokeWidth="2.5" style={{ filter: "drop-shadow(0 6px 10px rgba(0,30,60,.35))" }} />
                <text y="-6" textAnchor="middle" fontSize="14" fontWeight="800" fill="#16213A">{i.nom}</text>
                <text y="11" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={i.c}>{total(it.k)} SaaS · {parIle[it.k].length} pays</text>
              </g>
            );
          })}
        </svg>
        <style>{"@keyframes ile-in{from{opacity:0;transform:scale(.92)}}"}</style>
      </div>

      <aside className="rounded-3xl bg-white border border-line p-5 min-h-[300px]">
        {p ? (
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
            <h2 className="font-bold text-[17px]">{ile ? `${ILES[ile].nom} : ses pays` : "Le monde des SaaS"}</h2>
            <p className="text-[12.5px] text-ink-faint">{ile ? "Clique sur un bâtiment : plus il est haut, plus le pays compte de SaaS." : "Chaque île est un continent, chaque bâtiment un pays. Clique sur une île pour y débarquer."}</p>
            <ul className="mt-3 space-y-1">{(ile ? parIle[ile] : [...(data ?? [])].sort((a, b) => b.n - a.n)).slice(0, 12).map((q) => (
              <li key={q.pays}><button onClick={() => { if (!ile) setIle(ILE_DE[q.pays]); setSel(q.pays); }} className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-paper">
                <span className="text-[18px]">{drapeau(q.pays)}</span><span className="flex-1 text-[14px] truncate">{nomPays(q.pays)}</span>
                <span className="h-1.5 w-16 rounded-full bg-paper overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${Math.max(6, (q.n / max) * 100)}%`, background: ILES[ILE_DE[q.pays]]?.c ?? "#999" }} /></span>
                <span className="w-8 text-right text-[13px] font-semibold tnum">{q.n}</span>
              </button></li>
            ))}</ul>
            <p className="mt-3 text-[11.5px] text-ink-faint">Seuls les SaaS dont le pays est connu sont placés.</p>
          </>
        )}
      </aside>
    </div>
  );
}
