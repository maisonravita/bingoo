import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Button, Card, Input, Spinner, useToast } from "../components/ui";
import { eur } from "../lib/labels";
import { cx } from "../lib/utils";

// Le pilotage, rangé là où on s'en sert : le bandeau du matin dans « Aujourd'hui » (terrain, action à faire, anneaux),
// les chiffres, les quartiers et les comptes stratégiques dans « Résultats ». La carte, c'est la ville de l'équipe (/qg/).
// Tout est calculé par le serveur (m/pilotage) à partir des vraies données ; le même calcul nourrit le récap du lundi.

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

export function Reglages({ r, onSave, compact }) {
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

export function usePilotage() {
  const { ws } = useWs();
  const toast = useToast();
  const [d, setD] = useState(null);
  const load = useCallback(() => fn("m/pilotage", { workspace_id: ws.id }).then(setD).catch(() => setD(false)), [ws.id]);
  useEffect(() => { load(); }, [load]);
  const saveReg = async (r) => { await fn("m/pilotage-reglages", { workspace_id: ws.id, ...r }); toast("Réglages enregistrés", "good"); load(); };
  const unmark = async (id, v) => { await supabase.from("prospects").update({ strategique: v }).eq("id", id); load(); };
  return { d, load, saveReg, unmark };
}
const terrainOf = (d) => d.zones.reduce((t, z) => ({ cibles: t.cibles + z.cibles, contactees: t.contactees + z.contactees, discussion: t.discussion + z.discussion, gagnees: t.gagnees + z.gagnees }), { cibles: 0, contactees: 0, discussion: 0, gagnees: 0 });
const ratio = (v) => (v.total ? `${v.fait} sur ${v.total}` : "—");

/** Le bandeau du matin (« Aujourd'hui ») : ton terrain, la chose à faire maintenant, tes anneaux, et ta ville. */
export function BandeauMatin({ d }) {
  const a = d.anneaux;
  const terrain = terrainOf(d);
  const part = terrain.cibles ? Math.round((terrain.contactees / terrain.cibles) * 100) : 0;
  const zones = d.zones.filter((z) => z.cibles >= 3);
  const plusGros = [...zones].sort((x, y) => (y.cibles - y.contactees) - (x.cibles - x.contactees))[0];
  const top = d.priorites[0];
  return (
    <section className="mb-5 rounded-3xl p-6 sm:p-7 text-white relative overflow-hidden" style={{ background: "linear-gradient(120deg,#1c1917 0%,#3b1d10 55%,#E0531F 130%)" }}>
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] items-center">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white/70">Ton terrain · {d.rdv} rendez-vous sur {d.objectif} cette semaine{d.rdv < d.objectif && d.semaine.jour > 1 ? ` · à ce rythme ${d.prevision} vendredi` : ""}</p>
          <p className="text-[26px] sm:text-[32px] font-semibold leading-tight mt-1">
            {terrain.cibles ? <>{terrain.cibles.toLocaleString("fr-FR")} entreprises cibles, <span className="text-[#FDBA74]">{part} % contactées</span>.</> : "Ton terrain se dessine cette nuit."}
          </p>
          <p className="text-white/75 mt-2 text-[15px]">
            {terrain.gagnees ? `${terrain.gagnees} gagnée${terrain.gagnees > 1 ? "s" : ""}, ${terrain.discussion} en discussion. ` : terrain.discussion ? `${terrain.discussion} en discussion. ` : ""}
            {plusGros && plusGros.cibles - plusGros.contactees > 0 ? `Le plus gros morceau à prendre : ${plusGros.nom} (${plusGros.cibles - plusGros.contactees} entreprises).` : ""}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {top && (
              <Link to={top.lien} className="inline-flex items-center gap-3 rounded-2xl bg-white text-ink px-5 py-3 font-semibold hover:bg-[#FFF3EA] transition">
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" aria-hidden />
                <span><span className="block text-[12px] font-semibold text-accent-dark">À faire maintenant</span>{top.titre}{top.valeur ? ` · environ ${eur(top.valeur)}` : ""}</span>
                <span className="text-accent-dark" aria-hidden>→</span>
              </Link>
            )}
            <a href="/qg/" className="inline-flex items-center gap-3 rounded-2xl bg-white/10 hover:bg-white/20 px-4 py-3 font-semibold transition">
              <span className="flex -space-x-2" aria-hidden>{["leo", "sam", "lina"].map((n) => <img key={n} src={`/salaries/${n}.png`} alt="" className="w-8 h-8 rounded-full object-cover object-top bg-accent-soft ring-2 ring-[#3b1d10]" />)}</span>
              <span><span className="block text-[12px] font-semibold text-white/70">Ta ville, colorée</span>Voir ce que tu as pris</span>
            </a>
          </div>
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
  );
}

/** Dans « Résultats » : l'objectif, le pipeline, la part de marché par quartier et les comptes stratégiques. */
export function PilotageResultats() {
  const { d, saveReg, unmark } = usePilotage();
  const [edit, setEdit] = useState(false);
  if (d === null) return <div className="py-10 grid place-items-center"><Spinner /></div>;
  if (!d) return null;
  const terrain = terrainOf(d);
  const part = terrain.cibles ? Math.round((terrain.contactees / terrain.cibles) * 100) : 0;
  const zones = d.zones.filter((z) => z.cibles >= 3).slice(0, 8);
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3"><h2 className="font-semibold text-lg">Ta semaine en chiffres</h2><Button size="sm" onClick={() => setEdit((x) => !x)}>{edit ? "Fermer" : "Mes chiffres"}</Button></div>
      {edit && <Card className="p-5 mb-4"><Reglages r={d.reglages} onSave={async (r) => { await saveReg(r); setEdit(false); }} /><p className="text-xs text-ink-soft mt-3">Ces chiffres servent à fixer ton objectif et à estimer ton pipeline en euros. Ils restent dans ton espace.</p></Card>}
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
          <p className="text-[32px] font-semibold leading-tight tnum">{part} %</p>
          <div className="mt-2"><Barre z={{ ...terrain, cibles: Math.max(1, terrain.cibles) }} /></div>
          <p className="text-sm mt-2 text-ink-soft">{terrain.contactees} sur {terrain.cibles} entreprises de ta liste contactées.</p>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between"><p className="font-semibold">Quartier par quartier</p><a href="/qg/" className="text-sm font-semibold text-accent-dark hover:underline">Voir sur ma ville</a></div>
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
          ) : <p className="text-sm text-ink-soft">Les quartiers apparaissent dès que tes prospects sont placés (chaque nuit).</p>}
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
    </section>
  );
}

/** L'ancienne adresse /pilotage (lien du récap du lundi) mène aux résultats. */
export default function Pilotage() { return <Navigate to="/resultats" replace />; }

/** « Ce qui marche chez toi » : les traits qui reviennent chez les entreprises qui ont dit oui, calculés sur tes résultats. */
export function CeQuiMarche() {
  const { ws } = useWs();
  const [a, setA] = useState(null);
  useEffect(() => { fn("m/appris", { workspace_id: ws.id }).then(setA).catch(() => setA(false)); }, [ws.id]);
  if (!a) return null;
  const plus = a.facteurs.filter((f) => f.lift > 1).slice(0, 4), moins = a.facteurs.filter((f) => f.lift < 1).slice(-3).reverse();
  const pct = (x) => `${Math.round(x * 100)} %`;
  return (
    <section className="mb-8">
      <h2 className="font-semibold text-lg mb-3">Ce qui marche chez toi</h2>
      <Card className="p-5">
        {!a.assez ? (
          <>
            <p className="font-semibold">Bingoo! apprend de tes résultats, mais il lui en faut encore un peu.</p>
            <p className="text-sm text-ink-soft mt-1">{a.contactes} entreprise{a.contactes > 1 ? "s" : ""} contactée{a.contactes > 1 ? "s" : ""}, {a.positifs} réponse{a.positifs > 1 ? "s" : ""} positive{a.positifs > 1 ? "s" : ""} ou rendez-vous. Dès 20 contactées et 3 positives, Bingoo! te montre ici ce qu'elles ont en commun et cherche d'abord celles qui leur ressemblent.</p>
            <div className="mt-3 h-2 rounded-full bg-paper overflow-hidden" aria-hidden><div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(100, Math.round((Math.min(a.contactes / 20, 1) + Math.min(a.positifs / 3, 1)) * 50))}%` }} /></div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-soft">Sur {a.contactes} entreprises contactées, {pct(a.base)} ont répondu positivement ou pris rendez-vous. Bingoo! cherche et contacte d'abord celles qui ressemblent aux gagnantes.</p>
            {plus.length > 0 && <ul className="mt-4 space-y-2">{plus.map((f) => (
              <li key={f.cle} className="flex items-center gap-3"><span className="w-16 shrink-0 text-right font-semibold text-good tnum">×{f.lift.toLocaleString("fr-FR")}</span><span className="min-w-0"><span className="font-semibold">{f.label}</span><span className="block text-xs text-ink-soft">{f.positifs} positive{f.positifs > 1 ? "s" : ""} sur {f.n}</span></span></li>
            ))}</ul>}
            {moins.length > 0 && <><p className="text-sm font-semibold mt-5">Moins porteur</p><ul className="mt-2 space-y-2">{moins.map((f) => (
              <li key={f.cle} className="flex items-center gap-3"><span className="w-16 shrink-0 text-right font-semibold text-ink-soft tnum">×{f.lift.toLocaleString("fr-FR")}</span><span className="min-w-0"><span>{f.label}</span><span className="block text-xs text-ink-soft">{f.positifs} sur {f.n}</span></span></li>
            ))}</ul></>}
            {!plus.length && !moins.length && <p className="text-sm mt-3">Aucun trait ne se détache encore nettement : tes résultats sont répartis de façon égale.</p>}
          </>
        )}
      </Card>
    </section>
  );
}
