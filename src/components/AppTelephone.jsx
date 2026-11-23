import { useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { fn } from "../lib/supabase";
import { cx } from "../lib/utils";
import { lienApp } from "./AppCadre";
import PublierStores from "./PublierStores";

// L'app sur son téléphone (étape 3) : tout de suite dans le navigateur, ou dans sa vraie coque native avec Expo Go.
// La coque est publiée à la demande (un Snack Expo, sans compte), puis republiée seulement si le nom, la couleur ou le domaine changent.
function QR({ texte, taille = 156 }) {
  const svg = useMemo(() => { const q = qrcode(0, "M"); q.addData(texte); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); }, [texte]);
  return <div className="shrink-0 rounded-xl bg-white p-2 ring-1 ring-black/5" style={{ width: taille, height: taille }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function AppTelephone({ app, wsId, sombre = false }) {
  const [expo, setExpo] = useState(app?.mobile?.page ? app.mobile : null), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  if (!app?.slug) return null;
  const nom = app.spec?.nom ?? "ton app";
  const web = lienApp(app.slug, app.domaine_statut === "ok" ? app.domaine : null);
  const ouvrir = async () => {
    setBusy(true); setErr("");
    try { setExpo(await fn("r/saas-app-expo", { workspace_id: wsId, app_id: app.id })); }
    catch (e) { setErr(e.message || "Expo ne répond pas, réessaie dans un instant."); }
    finally { setBusy(false); }
  };
  const t = sombre ? { carte: "bg-white/[.06] ring-1 ring-white/10", doux: "text-white/65", fort: "text-white" } : { carte: "bg-white ring-1 ring-line", doux: "text-ink-soft", fort: "text-ink" };
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className={cx("rounded-2xl p-4", t.carte)}>
        <p className={cx("text-[12px] font-bold uppercase tracking-[.12em]", t.doux)}>Tout de suite</p>
        <p className={cx("mt-1 font-bold", t.fort)}>Ouvre {nom} sur ton téléphone</p>
        <div className="mt-3 flex items-center gap-4"><QR texte={web} taille={128} /><p className={cx("text-[13px]", t.doux)}>Scanne avec l'appareil photo. Sur Android ou iPhone, tu peux ensuite l'ajouter à l'écran d'accueil.</p></div>
      </div>
      <div className={cx("rounded-2xl p-4", t.carte)}>
        <p className={cx("text-[12px] font-bold uppercase tracking-[.12em]", t.doux)}>Comme une vraie app</p>
        <p className={cx("mt-1 font-bold", t.fort)}>Dans sa coque native, avec Expo Go</p>
        {expo?.page ? (
          <div className="mt-3 flex items-center gap-4">
            <QR texte={expo.page} taille={128} />
            <ol className={cx("list-decimal space-y-1 pl-4 text-[13px]", t.doux)}>
              <li>Installe <b className={t.fort}>Expo Go</b> (gratuit, App Store ou Google Play).</li>
              <li>Scanne ce code avec l'appareil photo.</li>
              <li>Touche « Ouvrir dans Expo Go » : {nom} s'ouvre en plein écran, avec son écran de démarrage.</li>
            </ol>
          </div>
        ) : (
          <div className="mt-3">
            <p className={cx("text-[13px]", t.doux)}>Bingoo! prépare la coque native de {nom} (écran de démarrage, plein écran, mode hors ligne) et te donne un code à scanner. C'est la même coque que celle qui ira sur les stores.</p>
            <button disabled={busy} onClick={ouvrir} className="mt-3 rounded-xl bg-[#E8571C] px-4 py-2.5 text-[14px] font-bold text-white hover:brightness-110 disabled:opacity-60">{busy ? "Préparation de la coque…" : "Préparer l'aperçu Expo Go"}</button>
            {err && <p className="mt-2 text-[13px] text-bad">{err}</p>}
          </div>
        )}
        <p className={cx("mt-3 text-[12px]", t.doux)}>Expo Go sert à essayer. Pour l'App Store et Google Play, c'est juste en dessous.</p>
      </div>
      <PublierStores app={app} wsId={wsId} t={t} />
    </div>
  );
}
