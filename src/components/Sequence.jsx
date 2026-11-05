import { useState } from "react";
import { fn } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Button, Input, Textarea, useToast } from "./ui";
import { cx } from "../lib/utils";

// Ta séquence : ce qui se passe après le premier e-mail, étape par étape. Une réponse du prospect arrête tout.
// E-mail : une relance dans le même fil, préparée pour validation (ou envoyée seule en pilote automatique).
// LinkedIn et appel : une tâche du jour sur la fiche, qui apparaît dans « Ton matin ».
const CANAUX = [["email", "E-mail"], ["linkedin", "LinkedIn"], ["appel", "Appel"]];
const SI = { email: [["toujours", "Toujours"]], linkedin: [["toujours", "Toujours"], ["linkedin_connu", "Si son profil LinkedIn est connu"]], appel: [["toujours", "Toujours"], ["telephone_connu", "Si son numéro est connu"]] };
const DEFAUT = [{ apres: 5, canal: "email", si: "toujours", texte: "" }, { apres: 12, canal: "email", si: "toujours", texte: "" }];
const AIDE = { email: "Laisse vide : Bingoo! écrit une relance adaptée au premier message. Variables : {prenom}, {entreprise}, {ville}.", linkedin: "Laisse vide : « LinkedIn : inviter … et lui écrire ».", appel: "Laisse vide : « Appeler … (numéro) »." };

export default function Sequence() {
  const { ws, reload } = useWs();
  const toast = useToast();
  const init = ws.sequence?.etapes?.length ? ws.sequence.etapes : (ws.followup_days?.length === 2 ? ws.followup_days.map((d) => ({ apres: d, canal: "email", si: "toujours", texte: "" })) : DEFAUT);
  const [etapes, setEtapes] = useState(init);
  const [busy, setBusy] = useState(false);
  const [ouvert, setOuvert] = useState(null);
  const maj = (i, patch) => setEtapes((e) => e.map((x, j) => (j === i ? { ...x, ...patch, ...(patch.canal ? { si: "toujours" } : {}) } : x)));
  const save = async () => {
    setBusy(true);
    try { const r = await fn("m/sequence", { workspace_id: ws.id, etapes }); setEtapes(r.etapes.length ? r.etapes : DEFAUT); await reload(); toast("Séquence enregistrée : elle s'applique aux prochaines étapes de chaque prospect", "good"); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const triees = [...etapes].map((e, i) => ({ ...e, i })).sort((a, b) => a.apres - b.apres);

  return (
    <div>
      {/* La frise : on voit la séquence d'un coup d'œil */}
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-[13px]" aria-label="Déroulé">
        <li className="rounded-full bg-ink text-white px-3 py-1 font-semibold">Jour 0 · premier e-mail</li>
        {triees.map((e) => <li key={e.i} className="flex items-center gap-1.5"><span className="text-ink-faint" aria-hidden>›</span><span className="rounded-full border border-line bg-white px-3 py-1 font-semibold">Jour {e.apres} · {CANAUX.find(([k]) => k === e.canal)?.[1]}</span></li>)}
      </ol>
      <p className="text-xs text-ink-soft mt-2">Dès que le prospect répond, la séquence s'arrête pour lui.</p>

      <ul className="mt-4 space-y-3">
        {etapes.map((e, i) => (
          <li key={i} className="rounded-xl border border-line bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-soft">Jour</span>
              <Input type="number" min={1} max={90} value={e.apres} onChange={(ev) => maj(i, { apres: Number(ev.target.value) || 1 })} className="!w-20" aria-label="Jour après le premier e-mail" />
              <div className="flex rounded-lg border border-line overflow-hidden" role="group" aria-label="Canal">
                {CANAUX.map(([k, l]) => <button key={k} type="button" onClick={() => maj(i, { canal: k })} className={cx("px-3 py-1.5 text-sm font-medium", e.canal === k ? "bg-ink text-white" : "bg-white text-ink-soft hover:text-ink")}>{l}</button>)}
              </div>
              {SI[e.canal].length > 1 && (
                <select value={e.si ?? "toujours"} onChange={(ev) => maj(i, { si: ev.target.value })} className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm">
                  {SI[e.canal].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              )}
              <span className="ml-auto flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setOuvert(ouvert === i ? null : i)}>{e.texte ? "Texte personnalisé" : "Texte"}</Button>
                <Button size="sm" variant="ghost" aria-label="Retirer l'étape" onClick={() => setEtapes((x) => x.filter((_, j) => j !== i))}>Retirer</Button>
              </span>
            </div>
            {ouvert === i && (
              <div className="mt-3">
                <Textarea rows={e.canal === "email" ? 6 : 2} value={e.texte ?? ""} onChange={(ev) => maj(i, { texte: ev.target.value })} placeholder={e.canal === "email" ? "Bonjour {prenom},\n\n…" : ""} />
                <p className="text-xs text-ink-soft mt-1">{AIDE[e.canal]}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 mt-4">
        {etapes.length < 6 && <Button size="sm" onClick={() => setEtapes((x) => [...x, { apres: Math.min(90, (Math.max(0, ...x.map((y) => y.apres)) || 0) + 4), canal: "email", si: "toujours", texte: "" }])}>Ajouter une étape</Button>}
        <Button size="sm" variant="ghost" onClick={() => setEtapes([{ apres: 3, canal: "linkedin", si: "linkedin_connu", texte: "" }, { apres: 5, canal: "email", si: "toujours", texte: "" }, { apres: 8, canal: "appel", si: "telephone_connu", texte: "" }, { apres: 12, canal: "email", si: "toujours", texte: "" }])}>Modèle multicanal</Button>
        <Button size="sm" variant="primary" loading={busy} onClick={save} className="ml-auto">Enregistrer la séquence</Button>
      </div>
    </div>
  );
}
