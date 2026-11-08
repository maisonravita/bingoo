import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { pub } from "./PublicBooking";
import { cx } from "../lib/utils";

// Page publique « Estimez vos revenus en location courte durée » d'un espace (ex. MVJ Conciergerie).
// Une question par écran ; à la fin, une fourchette honnête (hypothèses et sources visibles) et un créneau à réserver.
// Le propriétaire donne son accord pour être recontacté : c'est ce qui permet de le rappeler et de lui écrire.
const HF = { fontFamily: "var(--font-titre)" };
const Q = [
  { id: "type", titre: "Quel est votre logement ?", options: [["studio", "Un studio"], ["t2", "Un 2 pièces"], ["t3", "Un 3 pièces"], ["t4", "Un 4 pièces ou plus"], ["maison", "Une maison"]] },
  { id: "usage", titre: "C'est…", options: [["principale", "Ma résidence principale"], ["secondaire", "Une résidence secondaire"], ["investissement", "Un investissement locatif"]] },
  { id: "situation", titre: "Aujourd'hui, il est…", options: [["vide", "Vide"], ["annee", "Loué à l'année"], ["seul", "Loué en courte durée, je gère seul"], ["conciergerie", "Géré par une autre conciergerie"]] },
  { id: "dispo", titre: "Quand pourrait-il être loué ?", options: [["maintenant", "Tout de suite"], ["trois_mois", "Dans les 3 mois"], ["plus_tard", "Plus tard"], ["renseigne", "Je me renseigne"]] },
  { id: "lieu", titre: "Où se trouve-t-il ?" },
  { id: "contact", titre: "Où vous envoyer l'estimation ?" },
];

export default function PublicEstimation() {
  const slug = useLocation().pathname.split("/")[2];
  const [info, setInfo] = useState(null);
  const [i, setI] = useState(0);
  const [r, setR] = useState({ chambres: 1, accord: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null);
  useEffect(() => { pub("public-estimation-info", { slug }).then(setInfo).catch((e) => setErr(e.message)); }, [slug]);
  const e = Q[i];
  const set = (k, v) => setR((x) => ({ ...x, [k]: v }));
  const choisir = (v) => { set(e.id, v); setTimeout(() => setI(i + 1), 200); };
  const envoyer = async (ev) => {
    ev.preventDefault(); setBusy(true); setErr("");
    try { setRes(await pub("public-estimation", { slug, ...r })); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const champ = "w-full rounded-xl border border-line bg-white px-4 py-3.5 text-[16px] outline-none focus:border-ink";

  if (err && !info) return <div className="min-h-screen grid place-items-center bg-paper p-6 text-center text-ink-soft">{err}</div>;
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="max-w-2xl mx-auto px-5 pt-8 flex items-center justify-between">
        <p className="font-black text-[20px]" style={HF}>{info?.nom ?? ""}</p>
        {!res && <p className="text-[13px] text-ink-soft tnum">{Math.min(i + 1, Q.length)} / {Q.length}</p>}
      </header>
      <main className="max-w-2xl mx-auto px-5 py-10">
        {busy ? (
          <div className="text-center py-20">
            <span className="inline-block h-10 w-10 rounded-full border-4 border-accent border-t-transparent animate-spin" />
            <p className="mt-5 text-[18px] font-semibold">Calcul de votre estimation…</p>
            <p className="mt-1 text-ink-soft">Nous regardons les prix et la fréquentation des logements comparables autour de chez vous.</p>
          </div>
        ) : res ? (
          <div className="rise">
            <h1 className="text-[34px] sm:text-[44px] font-black leading-[1.05] tracking-tight" style={HF}>{res.estimation ? "Votre estimation" : "Merci, c'est noté"}</h1>
            {res.estimation ? (<>
              <div className="mt-6 rounded-2xl bg-white border border-line p-6">
                <p className="text-ink-soft text-[15px]">Revenus bruts estimés, par mois en moyenne sur l'année</p>
                <p className="mt-2 text-[40px] font-black leading-none tnum" style={HF}>{res.estimation.prudent_txt} <span className="text-ink-faint text-[24px]">à</span> {res.estimation.probable_txt}</p>
                <p className="mt-3 text-[14px] text-ink-soft tnum">Prix par nuit : {res.estimation.nuit[0]} à {res.estimation.nuit[1]} € · Taux d'occupation : {res.estimation.occ[0]} à {res.estimation.occ[1]} %</p>
              </div>
              <details className="mt-3 rounded-2xl bg-white border border-line p-5">
                <summary className="cursor-pointer font-semibold">Comment c'est calculé</summary>
                <ul className="mt-3 space-y-1.5 text-[14.5px] text-ink-soft list-disc pl-5">{res.estimation.hypotheses.map((h) => <li key={h}>{h}</li>)}</ul>
                {res.estimation.sources.length > 0 && <p className="mt-3 text-[13.5px] text-ink-soft">Sources : {res.estimation.sources.map((s, k) => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.titre || `source ${k + 1}`}{k < res.estimation.sources.length - 1 ? ", " : ""}</a>)}</p>}
                <p className="mt-3 text-[13px] text-ink-faint">Estimation indicative calculée automatiquement par une intelligence artificielle, avant frais et commission. Elle sera affinée avec vous selon le logement réel.</p>
              </details>
            </>) : <p className="mt-4 text-[17px] text-ink-soft">Nous n'avons pas assez de données pour vous donner un chiffre fiable en ligne. Nous le calculons avec vous, sur votre logement réel.</p>}
            <div className="mt-6 rounded-2xl bg-ink text-white p-6">
              <p className="text-[19px] font-bold">Parlons de votre logement</p>
              <p className="mt-1 text-white/75 text-[15px]">Un échange de 30 minutes avec {res.nom} : l'estimation affinée, et comment nous nous en occupons de A à Z.</p>
              <a href={`#${res.rdv}`} className="mt-4 inline-flex rounded-xl bg-accent px-6 py-3.5 font-bold hover:bg-accent-dark transition">Choisir un créneau</a>
            </div>
          </div>
        ) : (
          <div key={e.id} className="rise">
            {i === 0 && <p className="mb-3 text-[14px] font-semibold text-accent-dark uppercase tracking-wide">Location courte durée · estimation gratuite</p>}
            <h1 className="text-[32px] sm:text-[42px] font-black leading-[1.05] tracking-tight" style={HF}>{e.titre}</h1>
            {e.options ? (
              <ul className="mt-8 space-y-2.5">
                {e.options.map(([v, l]) => (
                  <li key={v}><button type="button" onClick={() => choisir(v)} className={cx("w-full rounded-2xl border bg-white px-5 py-4 text-left text-[17px] transition", r[e.id] === v ? "border-ink shadow-[0_0_0_1px_#15161A]" : "border-line hover:border-ink-faint")}>{l}</button></li>
                ))}
              </ul>
            ) : e.id === "lieu" ? (
              <form onSubmit={(x) => { x.preventDefault(); if (r.ville && /^\d{5}$/.test(r.cp ?? "")) setI(i + 1); }} className="mt-8 space-y-3">
                <input className={champ} placeholder="Ville (ex. Boulogne-Billancourt)" value={r.ville ?? ""} onChange={(x) => set("ville", x.target.value)} required />
                <input className={champ} placeholder="Code postal" inputMode="numeric" maxLength={5} value={r.cp ?? ""} onChange={(x) => set("cp", x.target.value.replace(/\D/g, ""))} required />
                <label className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-[16px]">Nombre de chambres
                  <input type="number" min="0" max="10" value={r.chambres} onChange={(x) => set("chambres", Number(x.target.value))} className="w-20 rounded-lg border border-line px-2 py-1.5 text-right tnum" />
                </label>
                <button className="w-full rounded-2xl bg-ink text-white py-4 text-[17px] font-bold hover:bg-black">Continuer</button>
              </form>
            ) : (
              <form onSubmit={envoyer} className="mt-8 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input className={champ} placeholder="Prénom" value={r.prenom ?? ""} onChange={(x) => set("prenom", x.target.value)} required />
                  <input className={champ} placeholder="Nom" value={r.nom ?? ""} onChange={(x) => set("nom", x.target.value)} />
                </div>
                <input className={champ} type="email" placeholder="E-mail" value={r.email ?? ""} onChange={(x) => set("email", x.target.value)} required />
                <input className={champ} type="tel" placeholder="Téléphone (facultatif)" value={r.tel ?? ""} onChange={(x) => set("tel", x.target.value)} />
                <label className="flex gap-3 items-start text-[14.5px] text-ink-soft">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-[#E0531F]" checked={r.accord} onChange={(x) => set("accord", x.target.checked)} required />
                  <span>J'accepte que {info?.nom ?? "la conciergerie"} me recontacte par e-mail ou par téléphone au sujet de mon logement. Je peux le refuser à tout moment.</span>
                </label>
                {err && <p className="rounded-xl bg-[#FDF0EC] px-4 py-3 text-[14.5px] text-[#9A3412]">{err}</p>}
                <button disabled={!r.accord} className="w-full rounded-2xl bg-accent text-white py-4 text-[17px] font-bold hover:bg-accent-dark disabled:opacity-50">Voir mon estimation</button>
              </form>
            )}
            {i > 0 && <button type="button" onClick={() => setI(i - 1)} className="mt-6 text-[14.5px] text-ink-soft underline">Revenir</button>}
          </div>
        )}
      </main>
    </div>
  );
}
