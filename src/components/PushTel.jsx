import { useEffect, useState } from "react";
import { useWs } from "../lib/ws";
import { activerPush, couperPush, etatPush } from "../lib/push";
import { useToast } from "./ui";
import { cx } from "../lib/utils";

/** « Reçois les réponses chaudes sur ce téléphone » : un bouton, et l'aide pour iPhone (ajout à l'écran d'accueil). */
export default function PushTel({ compact = false }) {
  const { ws } = useWs();
  const toast = useToast();
  const [etat, setEtat] = useState(null);
  const [busy, setBusy] = useState(false);
  const [masque, setMasque] = useState(() => { try { return localStorage.getItem("bingoo-push-masque") === "1"; } catch { return false; } });
  useEffect(() => { etatPush().then(setEtat).catch(() => setEtat("impossible")); }, []);
  if (!etat || etat === "impossible") return null;
  if (compact && (!["inactif", "ios-installer"].includes(etat) || masque)) return null;

  const activer = async () => {
    setBusy(true);
    try { await activerPush(ws); setEtat("actif"); toast("C'est branché : une notification d'essai arrive.", "good"); }
    catch (e) { toast(e.message, "bad"); setEtat(await etatPush().catch(() => "inactif")); }
    finally { setBusy(false); }
  };
  const couper = async () => { setBusy(true); try { await couperPush(ws); setEtat("inactif"); } finally { setBusy(false); } };
  const fermer = () => { try { localStorage.setItem("bingoo-push-masque", "1"); } catch { /* rien */ } setMasque(true); };

  return (
    <div className={cx("rounded-2xl border border-line bg-white p-4 flex gap-3 items-start", compact && "mb-5")}>
      <span className="mt-0.5 grid place-items-center w-9 h-9 shrink-0 rounded-xl bg-accent-soft text-accent-dark " aria-hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg></span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Les réponses chaudes sur ton téléphone</p>
        {etat === "ios-installer" ? (
          <p className="text-sm text-ink-soft mt-1">Sur iPhone : touche <b>Partager</b> en bas de Safari, puis <b>Sur l'écran d'accueil</b>. Ouvre Bingoo! depuis cette icône et reviens ici pour activer.</p>
        ) : etat === "refuse" ? (
          <p className="text-sm text-ink-soft mt-1">Les notifications sont bloquées pour ce site. Réautorise-les dans les réglages du navigateur, puis recharge la page.</p>
        ) : etat === "actif" ? (
          <p className="text-sm text-ink-soft mt-1">Activé sur cet appareil. Dès qu'un prospect répond « intéressé », « prix » ou « rappelez-moi », tu es prévenu en quelques secondes, avec la réponse déjà prête.</p>
        ) : (
          <p className="text-sm text-ink-soft mt-1">Dès qu'un prospect est intéressé, tu es prévenu en quelques secondes avec la réponse déjà prête. Répondre dans l'heure change tout.</p>
        )}
        <div className="flex gap-2 mt-3">
          {etat === "inactif" && <button disabled={busy} onClick={activer} className="rounded-xl bg-accent text-white px-4 py-2 text-sm font-semibold disabled:opacity-60">{busy ? "Activation…" : "Activer sur cet appareil"}</button>}
          {etat === "actif" && !compact && <button disabled={busy} onClick={couper} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold">Couper sur cet appareil</button>}
          {compact && <button onClick={fermer} className="rounded-xl px-3 py-2 text-sm font-medium text-ink-soft">Plus tard</button>}
        </div>
      </div>
    </div>
  );
}
