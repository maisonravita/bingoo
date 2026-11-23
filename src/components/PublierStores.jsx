import { useEffect, useState } from "react";
import { fn } from "../lib/supabase";
import { cx } from "../lib/utils";

// Publication sur l'App Store et Google Play, sur les comptes du membre.
// Jamais de mot de passe : une clé API App Store Connect (fichier .p8) et un compte de service Google Play (fichier JSON).
// Les clés partent dans le coffre chiffré de Bingoo! ; l'écran ne montre ensuite qu'un aperçu (identifiant de clé, adresse du compte).
const ETAPES = {
  ios: [
    "Un compte Apple Developer (99 $ par an, à ton nom ou celui de ta société).",
    <>Dans App Store Connect : Apps › <b>+</b> › Nouvelle app, avec l'identifiant de bundle ci-dessous.</>,
    <>Utilisateurs et accès › Intégrations › <b>App Store Connect API</b> : crée une clé avec le rôle « Admin » et télécharge le fichier .p8 (une seule fois possible).</>,
    "Recopie ici l'Issuer ID, le Key ID, ton Team ID (developer.apple.com › Membership) et dépose le fichier .p8.",
  ],
  android: [
    "Un compte Google Play Console (25 $, une seule fois).",
    "Crée l'app dans la Play Console, avec l'identifiant de paquet ci-dessous.",
    <>Dans Google Cloud : un <b>compte de service</b> et sa clé au format JSON. Invite son adresse dans la Play Console (Utilisateurs et autorisations) avec le droit de publier.</>,
    "Dépose le fichier JSON ici.",
  ],
};
const lireFichier = (f) => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result ?? "")); r.onerror = ko; r.readAsText(f); });
const STATUT = { attente: ["En file", "bg-[#FFF4E5] text-[#9A5B00]"], construction: ["Compilation…", "bg-[#EEF2FF] text-[#3730A3]"], envoyee: ["Envoyée", "bg-[#E7F7EE] text-[#166534]"], erreur: ["À corriger", "bg-[#FDECEC] text-[#B42318]"] };

function Plateforme({ plat, etat, identifiant, agir, t }) {
  const [ouvert, setOuvert] = useState(false), [champs, setChamps] = useState({}), [busy, setBusy] = useState(""), [err, setErr] = useState("");
  const { cle, derniere } = etat ?? {};
  const go = async (quoi, plus = {}) => { setBusy(quoi); setErr(""); try { await agir(plat, quoi, plus); if (quoi === "cle") { setOuvert(false); setChamps({}); } } catch (e) { setErr(e.message || "Ça n'a pas marché, réessaie."); } finally { setBusy(""); } };
  const fichier = async (e, k) => { const f = e.target.files?.[0]; if (!f) return; const txt = await lireFichier(f).catch(() => ""); setChamps((c) => ({ ...c, [k]: txt })); };
  const titre = plat === "ios" ? "App Store (iPhone, iPad)" : "Google Play (Android)";
  const enCours = derniere && ["attente", "construction"].includes(derniere.statut);
  const champ = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ink";
  return (
    <div className={cx("rounded-2xl p-4", t.carte)}>
      <div className="flex items-center justify-between gap-2">
        <p className={cx("font-bold", t.fort)}>{titre}</p>
        {derniere && <span className={cx("rounded-full px-2.5 py-1 text-[12px] font-bold", STATUT[derniere.statut]?.[1])}>{STATUT[derniere.statut]?.[0]} · n°{derniere.numero}</span>}
      </div>
      <p className={cx("mt-1 text-[12.5px]", t.doux)}>Identifiant : <code className={cx("rounded bg-black/5 px-1.5 py-0.5", t.fort)}>{identifiant}</code></p>
      {derniere?.message && <p className={cx("mt-2 text-[13px]", t.doux)}>{derniere.message}</p>}
      {derniere?.lien && <a href={derniere.lien} className="mt-1 inline-block text-[13px] font-semibold text-[#E8571C] underline underline-offset-2">Télécharger le fichier compilé</a>}
      {cle ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={cx("text-[13px]", t.doux)}>Clé enregistrée : {cle.apercu}</span>
          <button onClick={() => setOuvert((o) => !o)} className={cx("text-[13px] font-semibold underline underline-offset-2", t.fort)}>Remplacer</button>
          <button onClick={() => go("retirer")} disabled={!!busy} className="text-[13px] font-semibold text-bad underline underline-offset-2">Retirer</button>
          <button onClick={() => go("publier")} disabled={!!busy || enCours} className="ml-auto rounded-xl bg-[#E8571C] px-4 py-2 text-[14px] font-bold text-white hover:brightness-110 disabled:opacity-60">{busy === "publier" ? "Un instant…" : enCours ? "Publication en cours" : derniere?.statut === "envoyee" ? "Envoyer une mise à jour" : "Publier"}</button>
        </div>
      ) : !ouvert && <button onClick={() => setOuvert(true)} className={cx("mt-3 rounded-xl px-4 py-2 text-[14px] font-bold ring-1", t.fort, "ring-current/20 hover:bg-black/5")}>Brancher mon compte</button>}
      {ouvert && (
        <div className="mt-3 rounded-xl bg-black/[.03] p-3">
          <ol className={cx("list-decimal space-y-1 pl-4 text-[13px]", t.doux)}>{ETAPES[plat].map((e, i) => <li key={i}>{e}</li>)}</ol>
          {plat === "ios" ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[["issuer_id", "Issuer ID"], ["key_id", "Key ID"], ["team_id", "Team ID"]].map(([k, l]) => <label key={k} className={cx("text-[12.5px] font-semibold", t.doux)}>{l}<input value={champs[k] ?? ""} onChange={(e) => setChamps((c) => ({ ...c, [k]: e.target.value }))} autoComplete="off" spellCheck={false} className={champ} /></label>)}
              <label className={cx("sm:col-span-3 text-[12.5px] font-semibold", t.doux)}>Fichier .p8<input type="file" accept=".p8" onChange={(e) => fichier(e, "p8")} className="mt-1 block text-[13px]" /></label>
            </div>
          ) : <label className={cx("mt-3 block text-[12.5px] font-semibold", t.doux)}>Clé JSON du compte de service<input type="file" accept=".json,application/json" onChange={(e) => fichier(e, "json")} className="mt-1 block text-[13px]" /></label>}
          <p className={cx("mt-2 text-[12px]", t.doux)}>Bingoo! ne te demande jamais ton mot de passe Apple ou Google. La clé est rangée chiffrée ; tu peux la retirer quand tu veux (et la révoquer de ton côté).</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => go("cle", plat === "ios" ? { issuer_id: champs.issuer_id, key_id: champs.key_id, team_id: champs.team_id, p8: champs.p8 } : { json: champs.json })} disabled={!!busy || (plat === "ios" ? !(champs.issuer_id && champs.key_id && champs.team_id && champs.p8) : !champs.json)} className="rounded-xl bg-ink px-4 py-2 text-[14px] font-bold text-white disabled:opacity-50">{busy === "cle" ? "Enregistrement…" : "Enregistrer la clé"}</button>
            <button onClick={() => { setOuvert(false); setChamps({}); }} className={cx("rounded-xl px-3 py-2 text-[14px] font-semibold", t.doux)}>Annuler</button>
          </div>
        </div>
      )}
      {err && <p className="mt-2 text-[13px] text-bad">{err}</p>}
    </div>
  );
}

export default function PublierStores({ app, wsId, t }) {
  const [etat, setEtat] = useState(null), [err, setErr] = useState("");
  const charger = () => fn("r/saas-app-stores", { workspace_id: wsId, app_id: app.id, quoi: "etat" }).then(setEtat).catch((e) => setErr(e.message || "Indisponible pour le moment."));
  useEffect(() => { charger(); }, [app.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Tant qu'une compilation tourne, l'état se met à jour tout seul
  const enCours = ["ios", "android"].some((p) => ["attente", "construction"].includes(etat?.[p]?.derniere?.statut));
  useEffect(() => { if (!enCours) return; const i = setInterval(charger, 30000); return () => clearInterval(i); }, [enCours]); // eslint-disable-line react-hooks/exhaustive-deps
  const agir = async (plateforme, quoi, plus) => setEtat(await fn("r/saas-app-stores", { workspace_id: wsId, app_id: app.id, plateforme, quoi, ...plus }));
  return (
    <div className="md:col-span-2">
      <p className={cx("mt-2 text-[12px] font-bold uppercase tracking-[.12em]", t.doux)}>Sur les stores</p>
      <p className={cx("mt-1 text-[13.5px]", t.doux)}>Bingoo! compile la même coque que dans Expo Go et l'envoie sur <b className={t.fort}>ton</b> compte Apple et <b className={t.fort}>ton</b> compte Google : l'app est à ton nom, et c'est toi qui la soumets à la validation.</p>
      {err && <p className="mt-2 text-[13px] text-bad">{err}</p>}
      {etat && <div className="mt-3 grid gap-3 md:grid-cols-2">{["ios", "android"].map((p) => <Plateforme key={p} plat={p} etat={etat[p]} identifiant={etat.identifiant} agir={agir} t={t} />)}</div>}
    </div>
  );
}
