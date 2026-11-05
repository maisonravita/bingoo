import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Button, Card, Input, PageHead, Spinner, useToast } from "../components/ui";
import { eur } from "../lib/labels";
import { cx } from "../lib/utils";

// La salle de pilotage : objectif de la semaine et prévision, trois anneaux, pipeline estimé (avec les chiffres
// du client), carte de la part de marché par quartier, priorités du matin, comptes stratégiques. Tout est calculé
// par le serveur (m/pilotage) à partir des vraies données ; le même calcul nourrit le récap du lundi.

const ETAT = {
  gagne: ["#E0531F", "Rendez-vous ou client"],
  discussion: ["#2563eb", "En discussion"],
  contacte: ["#F5A623", "Contacté"],
  a_contacter: ["#F7B58C", "À prendre"],
};
const RING = [["reactivite", "Réactivité", "#E0531F", "#fde3d6"], ["regularite", "Régularité", "#1c1917", "#e7e5e4"], ["resultats", "Résultats", "#2563eb", "#dbeafe"]];

function Anneaux({ a }) {
  const R = [48, 35, 22];
  return (
    <svg viewBox="0 0 112 112" className="w-28 h-28 shrink-0" role="img" aria-label="Tes trois anneaux de la semaine">
      {RING.map(([k, , c, bg], i) => {
        const v = a[k], r = R[i], L = 2 * Math.PI * r, f = v.total ? Math.min(1, v.fait / v.total) : 0;
        return (
          <g key={k}>
            <circle cx="56" cy="56" r={r} fill="none" stroke={bg} strokeWidth="10" />
            {f > 0 && <circle cx="56" cy="56" r={r} fill="none" stroke={c} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${f * L} ${L}`} transform="rotate(-90 56 56)" />}
          </g>
        );
      })}
    </svg>
  );
}

/** MapLibre, chargé à la demande (il ne pèse rien tant qu'on n'ouvre pas la salle de pilotage). */
function maplibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  return new Promise((ok, ko) => {
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css";
    document.head.append(css);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js";
    s.onload = () => ok(window.maplibregl); s.onerror = () => ko(new Error("carte indisponible"));
    document.head.append(s);
  });
}

function Carte({ d }) {
  const box = useRef(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!d?.points?.length || !box.current) return;
    let map = null, gone = false;
    maplibre().then((ml) => {
      if (gone) return;
      map = new ml.Map({ container: box.current, style: "https://tiles.openfreemap.org/styles/liberty", attributionControl: { compact: true } });
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      const pts = { type: "FeatureCollection", features: d.points.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lon, p.lat] }, properties: { id: p.id, n: p.n, e: p.e, rang: { gagne: 3, discussion: 2, contacte: 1, a_contacter: 0 }[p.e] } })) };
      const zones = { type: "FeatureCollection", features: d.zones.filter((z) => z.cibles >= 3).map((z) => ({ type: "Feature", geometry: { type: "Point", coordinates: [z.lon, z.lat] }, properties: { t: `${z.nom}\n${z.pct} %`, pct: z.pct, n: z.cibles } })) };
      map.on("load", () => {
        map.addSource("zones", { type: "geojson", data: zones });
        map.addLayer({ id: "zones", type: "circle", source: "zones", paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, ["*", 3, ["sqrt", ["get", "n"]]], 14, ["*", 12, ["sqrt", ["get", "n"]]]],
          "circle-color": ["interpolate", ["linear"], ["get", "pct"], 0, "#FDBA74", 25, "#F97316", 60, "#E0531F", 100, "#9a3412"],
          "circle-opacity": 0.28, "circle-stroke-color": "#E0531F", "circle-stroke-width": 1.5,
        } });
        map.addSource("pts", { type: "geojson", data: pts });
        map.addLayer({ id: "pts", type: "circle", source: "pts", layout: { "circle-sort-key": ["get", "rang"] }, paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 2.5, 15, ["match", ["get", "e"], "gagne", 9, "discussion", 8, 6]],
          "circle-color": ["match", ["get", "e"], "gagne", ETAT.gagne[0], "discussion", ETAT.discussion[0], "contacte", ETAT.contacte[0], ETAT.a_contacter[0]],
          "circle-stroke-color": "#fff", "circle-stroke-width": 1.2,
        } });
        map.addLayer({ id: "zones-t", type: "symbol", source: "zones", layout: { "text-field": ["get", "t"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-allow-overlap": false }, paint: { "text-color": "#1c1917", "text-halo-color": "#fff", "text-halo-width": 2 } });
        const b = new ml.LngLatBounds();
        for (const p of d.points) b.extend([p.lon, p.lat]);
        map.fitBounds(b, { padding: 40, maxZoom: 14, duration: 0 });
        map.on("click", "pts", (e) => {
          const f = e.features?.[0]; if (!f) return;
          const el = document.createElement("div");
          el.innerHTML = `<b style="font-size:13px"></b><br><span style="font-size:12px;color:#57534e"></span><br><a style="font-size:12px;color:#E0531F;font-weight:700">Ouvrir la fiche</a>`;
          el.querySelector("b").textContent = f.properties.n;
          el.querySelector("span").textContent = ETAT[f.properties.e]?.[1] ?? "";
          el.querySelector("a").href = `#/prospects?id=${encodeURIComponent(f.properties.id)}`;
          new ml.Popup({ closeButton: false }).setLngLat(f.geometry.coordinates).setDOMContent(el).addTo(map);
        });
        map.on("mouseenter", "pts", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "pts", () => { map.getCanvas().style.cursor = ""; });
      });
    }).catch((e) => setErr(e.message));
    return () => { gone = true; map?.remove(); };
  }, [d]);
  if (!d?.points?.length) return <div className="h-full grid place-items-center text-ink-soft text-sm p-6 text-center">Tes prospects sont placés sur la carte chaque nuit : elle se remplit dès demain matin.</div>;
  return (
    <div className="relative h-full">
      {/* MapLibre impose « position: relative » à son conteneur : il lui faut une hauteur à lui */}
      <div ref={box} style={{ width: "100%", height: "100%" }} />
      {err && <p className="absolute inset-0 grid place-items-center text-sm text-ink-soft bg-paper">La carte n'a pas pu se charger. Les chiffres par quartier restent à droite.</p>}
      <div className="absolute left-3 bottom-3 flex flex-wrap gap-x-3 gap-y-1 rounded-xl bg-white/95 px-3 py-2 text-[12px] font-medium text-ink-soft shadow-sm">
        {Object.entries(ETAT).map(([k, [c, l]]) => <span key={k} className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{l}</span>)}
      </div>
    </div>
  );
}

function Reglages({ r, onSave, compact }) {
  const [obj, setObj] = useState(r.objectif_rdv ?? 5);
  const [val, setVal] = useState(r.valeur_client ?? "");
  const [sur10, setSur10] = useState(r.taux_signature != null ? Math.round(r.taux_signature / 10) : "");
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { await onSave({ objectif_rdv: Number(obj) || 5, valeur_client: val === "" ? null : Number(val), taux_signature: sur10 === "" ? null : Number(sur10) * 10 }); } finally { setBusy(false); } };
  return (
    <div className={cx("grid gap-3", compact ? "" : "sm:grid-cols-3")}>
      <label className="text-sm font-medium">Objectif de rendez-vous par semaine<Input type="number" min="1" max="200" value={obj} onChange={(e) => setObj(e.target.value)} className="mt-1" /></label>
      <label className="text-sm font-medium">Valeur moyenne d'un client (€)<Input type="number" min="0" placeholder="ex. 3000" value={val} onChange={(e) => setVal(e.target.value)} className="mt-1" /></label>
      <label className="text-sm font-medium">Sur 10 rendez-vous, combien signent ?<Input type="number" min="0" max="10" placeholder="ex. 3" value={sur10} onChange={(e) => setSur10(e.target.value)} className="mt-1" /></label>
      <div className={compact ? "" : "sm:col-span-3"}><Button variant="primary" loading={busy} onClick={save}>Enregistrer</Button></div>
    </div>
  );
}

/** Une barre par quartier : gagnées, en discussion, contactées, et ce qui reste à prendre. */
function Barre({ z }) {
  const w = (n) => `${(n / z.cibles) * 100}%`;
  const cont = Math.max(0, z.contactees - z.discussion - z.gagnees);
  return (
    <div className="flex h-2.5 rounded-full overflow-hidden bg-[#FDE7D6]" aria-hidden>
      <span style={{ width: w(z.gagnees), background: ETAT.gagne[0] }} />
      <span style={{ width: w(z.discussion), background: ETAT.discussion[0] }} />
      <span style={{ width: w(cont), background: ETAT.contacte[0] }} />
    </div>
  );
}

export default function Pilotage() {
  const { ws } = useWs();
  const toast = useToast();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState(false);
  const load = useCallback(() => fn("m/pilotage", { workspace_id: ws.id, carte: true }).then(setD).catch((e) => setErr(e.message)), [ws.id]);
  useEffect(() => { load(); }, [load]);
  const saveReg = async (r) => { await fn("m/pilotage-reglages", { workspace_id: ws.id, ...r }); toast("Réglages enregistrés", "good"); setEdit(false); load(); };
  const unmark = async (id, v) => { await supabase.from("prospects").update({ strategique: v }).eq("id", id); load(); };

  if (err) return <div><PageHead title="Salle de pilotage" /><Card className="p-6 text-bad">{err}</Card></div>;
  if (!d) return <div className="py-24 grid place-items-center"><Spinner /></div>;
  const a = d.anneaux;
  const lundi = new Date(d.semaine.lundi).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const zones = d.zones.filter((z) => z.cibles >= 3).slice(0, 8);
  const terrain = d.zones.reduce((t, z) => ({ cibles: t.cibles + z.cibles, contactees: t.contactees + z.contactees, discussion: t.discussion + z.discussion, gagnees: t.gagnees + z.gagnees }), { cibles: 0, contactees: 0, discussion: 0, gagnees: 0 });
  const partGlobale = terrain.cibles ? Math.round((terrain.contactees / terrain.cibles) * 100) : 0;
  const top = d.priorites[0];
  const plusGros = [...zones].sort((x, y) => (y.cibles - y.contactees) - (x.cibles - x.contactees))[0];
  const ratio = (v) => (v.total ? `${v.fait} sur ${v.total}` : "—");

  return (
    <div>
      <PageHead title="Salle de pilotage" sub={`Semaine du ${lundi}`}>
        <Button onClick={() => setEdit((x) => !x)}>{edit ? "Fermer" : "Mes chiffres"}</Button>
      </PageHead>
      {edit && <Card className="p-5 mb-5"><Reglages r={d.reglages} onSave={saveReg} /><p className="text-xs text-ink-soft mt-3">Ces chiffres servent à fixer ton objectif et à estimer ton pipeline en euros. Ils restent dans ton espace.</p></Card>}

      {/* Le matin : où tu en es, et la seule chose à faire maintenant */}
      <section className="mb-4 rounded-3xl p-6 sm:p-7 text-white relative overflow-hidden" style={{ background: "linear-gradient(120deg,#1c1917 0%,#3b1d10 55%,#E0531F 130%)" }}>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] items-center">
          <div>
            <p className="text-[13px] font-semibold text-white/70">Ton terrain</p>
            <p className="text-[28px] sm:text-[34px] font-semibold leading-tight mt-1">
              {terrain.cibles ? <>{terrain.cibles.toLocaleString("fr-FR")} entreprises cibles, <span className="text-[#FDBA74]">{partGlobale} % contactées</span>.</> : "Ton terrain se dessine cette nuit."}
            </p>
            <p className="text-white/75 mt-2 text-[15px]">
              {terrain.gagnees ? `${terrain.gagnees} gagnée${terrain.gagnees > 1 ? "s" : ""}, ${terrain.discussion} en discussion. ` : terrain.discussion ? `${terrain.discussion} en discussion. ` : ""}
              {plusGros && plusGros.cibles - plusGros.contactees > 0 ? `Le plus gros morceau à prendre : ${plusGros.nom} (${plusGros.cibles - plusGros.contactees} entreprises).` : ""}
            </p>
            {top && (
              <Link to={top.lien} className="mt-5 inline-flex items-center gap-3 rounded-2xl bg-white text-ink px-5 py-3.5 font-semibold hover:bg-[#FFF3EA] transition">
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" aria-hidden />
                <span><span className="block text-[12px] font-semibold text-accent-dark">À faire maintenant</span>{top.titre}{top.valeur ? ` · environ ${eur(top.valeur)}` : ""}</span>
                <span className="text-accent-dark">→</span>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4">
            <div className="rounded-full bg-white p-1.5"><Anneaux a={a} /></div>
            <ul className="text-[13px] space-y-1.5">
              <li><b className="text-[#FDBA74]">Réactivité</b> <span className="text-white/80">{ratio(a.reactivite)}</span></li>
              <li><b>Régularité</b> <span className="text-white/80">{a.regularite.fait} jour{a.regularite.fait > 1 ? "s" : ""} sur {a.regularite.total}</span></li>
              <li><b className="text-[#93C5FD]">Résultats</b> <span className="text-white/80">{a.resultats.fait} RDV sur {a.resultats.total}</span></li>
            </ul>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <Card className="p-5">
          <p className="text-[13px] font-semibold text-ink-soft">Rendez-vous cette semaine</p>
          <p className="text-[32px] font-semibold leading-tight tnum">{d.rdv}<span className="text-lg text-ink-soft"> / {d.objectif}</span></p>
          <div className="h-2 rounded-full bg-paper overflow-hidden mt-2"><div className="h-2 bg-accent rounded-full" style={{ width: `${Math.min(100, (d.rdv / d.objectif) * 100)}%` }} /></div>
          <p className="text-sm mt-2 text-ink-soft">{d.rdv >= d.objectif ? "Objectif atteint. Bravo." : d.semaine.jour <= 1 && d.rdv === 0 ? "La semaine commence." : `À ce rythme : ${d.prevision} vendredi${d.manque ? `, il en manque ${d.manque}` : ""}.`}{d.record > 0 ? ` Record : ${d.record}.` : ""}</p>
        </Card>
        <Card className={cx("p-5", d.pipeline && "!bg-ink !border-ink text-white")}>
          <p className={cx("text-[13px] font-semibold", d.pipeline ? "text-white/70" : "text-ink-soft")}>Pipeline estimé</p>
          {d.pipeline ? (
            <>
              <p className="text-[32px] font-semibold leading-tight tnum">{eur(d.pipeline.montant)}</p>
              <p className="text-xs text-white/60 mt-2">{d.pipeline.rdv_ouverts} RDV en cours × {eur(d.pipeline.valeur)} × {d.pipeline.taux} %{d.pipeline.semaine > 0 ? ` · +${eur(d.pipeline.semaine)} cette semaine` : ""}</p>
            </>
          ) : (
            <>
              <p className="text-[32px] font-semibold leading-tight text-ink-faint">— €</p>
              <button type="button" onClick={() => setEdit(true)} className="text-sm font-semibold text-accent-dark hover:underline mt-2">Ajoute la valeur d'un client pour le voir →</button>
            </>
          )}
        </Card>
        <Card className="p-5">
          <p className="text-[13px] font-semibold text-ink-soft">Part de marché</p>
          <p className="text-[32px] font-semibold leading-tight tnum">{partGlobale} %</p>
          <div className="mt-2"><Barre z={{ ...terrain, cibles: Math.max(1, terrain.cibles) }} /></div>
          <p className="text-sm mt-2 text-ink-soft">{terrain.contactees} sur {terrain.cibles} entreprises de ta liste contactées.</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px] mb-4">
        <Card className="overflow-hidden h-[480px] !p-0"><Carte d={d} /></Card>
        <Card className="p-5">
          <p className="font-semibold">Quartier par quartier</p>
          <p className="text-xs text-ink-soft mb-4">Ce que tu as pris, et ce qui reste à prendre.</p>
          {zones.length ? (
            <ul className="space-y-4">
              {zones.map((z) => (
                <li key={z.cle}>
                  <div className="flex justify-between items-baseline text-sm"><b>{z.nom}</b><span className="tnum font-semibold">{z.pct} %</span></div>
                  <div className="mt-1.5"><Barre z={z} /></div>
                  <p className="text-xs text-ink-soft mt-1">{z.cibles - z.contactees > 0 ? <span className="text-accent-dark font-semibold">{z.cibles - z.contactees} à prendre</span> : <span className="text-good font-semibold">Quartier couvert</span>}{z.discussion ? ` · ${z.discussion} en discussion` : ""}{z.gagnees ? ` · ${z.gagnees} gagnée${z.gagnees > 1 ? "s" : ""}` : ""}{z.semaine ? ` · +${z.semaine} cette semaine` : ""}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-soft">Les quartiers apparaissent dès que tes prospects sont placés sur la carte (chaque nuit).</p>}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="font-semibold mb-3">Tes priorités du matin</p>
          {d.priorites.length ? (
            <ul className="divide-y divide-line">
              {d.priorites.map((p, i) => (
                <li key={i}>
                  <Link to={p.lien} className="flex items-center gap-3 py-3 hover:bg-paper -mx-2 px-2 rounded-xl">
                    <span className={cx("w-1.5 self-stretch rounded-full", p.type === "reponse" ? "bg-accent" : p.type === "compte" ? "bg-ink" : "bg-line")} />
                    <span className="flex-1 min-w-0"><b className="text-sm block">{p.titre}</b><span className="text-xs text-ink-soft block truncate">{p.detail}{p.valeur ? ` · environ ${eur(p.valeur)}` : ""}</span></span>
                    <span className="text-sm font-semibold text-accent-dark">Y aller</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-soft">Rien ne t'attend : ton équipe travaille cette nuit.</p>}
        </Card>
        <Card className="p-5">
          <p className="font-semibold">Comptes stratégiques</p>
          <p className="text-xs text-ink-soft mb-3">Les entreprises de 50 salariés et plus, ou celles que tu as choisies depuis leur fiche.</p>
          {d.comptes.length ? (
            <ul className="space-y-4">
              {d.comptes.map((c) => (
                <li key={c.id}>
                  <div className="flex items-center justify-between gap-2">
                    <Link to={`/prospects?id=${c.id}`} className="text-sm font-semibold hover:underline truncate">{c.nom}</Link>
                    <span className="text-xs text-ink-soft shrink-0">{c.taille ? `${c.taille}+ salariés · ` : ""}{c.faites} / 6</span>
                  </div>
                  <div className="flex gap-1 mt-1.5" aria-hidden>{c.etapes.map((e, i) => <span key={i} className={cx("h-1.5 flex-1 rounded-full", e.fait ? "bg-accent" : "bg-paper")} />)}</div>
                  <div className="flex items-center justify-between mt-1.5 text-xs">
                    {c.prochaine ? <Link to={c.prochaine.lien} className="text-accent-dark font-semibold hover:underline">Prochaine étape : {c.prochaine.texte}</Link> : <span className="text-good font-semibold">Client gagné</span>}
                    <button type="button" className="text-ink-faint hover:text-ink" onClick={() => unmark(c.id, false)}>Retirer</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-soft">Aucun compte stratégique pour l'instant. Marque-en un depuis sa fiche prospect.</p>}
        </Card>
      </div>
      <p className="text-xs text-ink-faint mt-4">{d.places} de tes {d.total} prospects sont placés sur la carte. Les autres le seront dans les prochaines nuits. Chaque lundi, le récap de ta semaine arrive par e-mail.</p>
    </div>
  );
}
