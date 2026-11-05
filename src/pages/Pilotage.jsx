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
  a_contacter: ["#a8a29e", "À contacter"],
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
          "circle-color": ["interpolate", ["linear"], ["get", "pct"], 0, "#fff3ea", 25, "#F7B58C", 60, "#E0531F", 100, "#9a3412"],
          "circle-opacity": 0.38, "circle-stroke-color": "#E0531F", "circle-stroke-width": 1.5,
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
      <div ref={box} className="absolute inset-0" />
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
  const ratio = (v) => (v.total ? `${v.fait} sur ${v.total}` : "rien à mesurer pour l'instant");

  return (
    <div>
      <PageHead title="Salle de pilotage" sub={`Semaine du ${lundi}`}>
        <Button onClick={() => setEdit((x) => !x)}>{edit ? "Fermer les réglages" : "Mes chiffres"}</Button>
      </PageHead>
      {edit && <Card className="p-5 mb-5"><Reglages r={d.reglages} onSave={saveReg} /><p className="text-xs text-ink-soft mt-3">Ces deux chiffres ne servent qu'à estimer ton pipeline en euros. Ils restent dans ton espace.</p></Card>}

      <div className="grid gap-4 lg:grid-cols-3 mb-4">
        {d.pipeline ? (
          <Card className="p-5 !bg-ink !border-ink text-white">
            <p className="text-[13px] font-semibold text-white/70">Pipeline estimé</p>
            <p className="text-[34px] font-semibold leading-tight tnum">{eur(d.pipeline.montant)}</p>
            {d.pipeline.semaine > 0 && <p className="text-sm font-semibold text-emerald-300">+{eur(d.pipeline.semaine)} cette semaine</p>}
            <p className="text-xs text-white/60 mt-2">{d.pipeline.rdv_ouverts} rendez-vous en cours × {eur(d.pipeline.valeur)} × {d.pipeline.taux} % qui signent.{d.pipeline.clients ? ` Déjà gagné : ${eur(d.pipeline.gagne)}.` : ""}</p>
          </Card>
        ) : (
          <Card className="p-5">
            <p className="font-semibold">Ton pipeline en euros</p>
            <p className="text-sm text-ink-soft mt-1 mb-3">Deux chiffres et Bingoo! estime ce que valent tes rendez-vous en cours.</p>
            <Reglages r={d.reglages} onSave={saveReg} compact />
          </Card>
        )}
        <Card className="p-5">
          <p className="text-[13px] font-semibold text-ink-soft">Objectif de la semaine</p>
          <p className="text-[34px] font-semibold leading-tight tnum">{d.rdv} <span className="text-lg text-ink-soft">rendez-vous sur {d.objectif}</span></p>
          <div className="h-2 rounded-full bg-paper overflow-hidden mt-2"><div className="h-2 bg-accent rounded-full" style={{ width: `${Math.min(100, (d.rdv / d.objectif) * 100)}%` }} /></div>
          <p className={cx("text-sm font-medium mt-3 rounded-xl px-3 py-2", d.manque ? "bg-accent-soft text-accent-dark" : "bg-good-soft text-good")}>
            {d.rdv >= d.objectif ? "Objectif atteint. Bravo." : d.semaine.jour <= 1 && d.rdv === 0 ? "La semaine commence : tes priorités sont plus bas." : `À ce rythme : ${d.prevision} vendredi.${d.manque ? ` Il t'en manque ${d.manque}.` : ""}`}
          </p>
          {d.record > 0 && <p className="text-xs text-ink-soft mt-2">Record : {d.record} rendez-vous en une semaine.</p>}
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <Anneaux a={a} />
          <ul className="text-[13px] space-y-2">
            <li><b style={{ color: RING[0][2] }}>Réactivité</b><br /><span className="text-ink-soft">{ratio(a.reactivite)} réponses positives traitées le jour même</span></li>
            <li><b>Régularité</b><br /><span className="text-ink-soft">{a.regularite.fait} jour{a.regularite.fait > 1 ? "s" : ""} actif{a.regularite.fait > 1 ? "s" : ""} sur {a.regularite.total}</span></li>
            <li><b style={{ color: RING[2][2] }}>Résultats</b><br /><span className="text-ink-soft">{a.resultats.fait} rendez-vous sur {a.resultats.total}</span></li>
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px] mb-4">
        <Card className="overflow-hidden h-[460px] p-0"><Carte d={d} /></Card>
        <Card className="p-5">
          <p className="font-semibold">Ta part de marché</p>
          <p className="text-xs text-ink-soft mb-3">Part des entreprises cibles de ta liste déjà contactées, par quartier.</p>
          {zones.length ? (
            <ul className="space-y-3">
              {zones.map((z) => (
                <li key={z.cle}>
                  <div className="flex justify-between text-sm"><b>{z.nom}</b><span className="tnum font-semibold">{z.pct} %</span></div>
                  <div className="h-2 rounded-full bg-paper overflow-hidden mt-1"><div className="h-2 rounded-full" style={{ width: `${z.pct}%`, background: "linear-gradient(90deg,#F7B58C,#E0531F)" }} /></div>
                  <p className="text-xs text-ink-soft mt-1">{z.contactees} sur {z.cibles} contactées{z.discussion ? ` · ${z.discussion} en discussion` : ""}{z.gagnees ? ` · ${z.gagnees} gagnée${z.gagnees > 1 ? "s" : ""}` : ""}{z.semaine ? ` · +${z.semaine} cette semaine` : ""}</p>
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
