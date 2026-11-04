import { useCallback, useEffect, useState } from "react";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { useJob } from "../lib/useJob";
import { Badge, Button, Card, Empty, PageHead, Spinner, useToast } from "../components/ui";
import { plural } from "../lib/utils";
import { SubNav } from "../components/SubNav";

function Copy({ text, label }) {
  const toast = useToast();
  return <Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(text); toast("Copié"); } catch { toast("Copie impossible, sélectionne le texte", "bad"); } }}>{label}</Button>;
}

/** Pilote automatique : l'extension Bingoo! envoie les invitations et le premier message depuis le LinkedIn du client. */
function Pilot({ ws }) {
  const toast = useToast();
  const [st, setSt] = useState(null);
  const [consent, setConsent] = useState(false);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => fn("li-settings", { workspace_id: ws.id }).then(setSt).catch(() => setSt({ error: true })), [ws.id]);
  useEffect(() => { load(); }, [load]);
  const set = async (enabled) => {
    setBusy(true);
    try {
      setSt(await fn("li-settings", { workspace_id: ws.id, set: true, enabled, accept: enabled ? true : undefined }));
      setAsk(false);
      toast(enabled ? "Pilote LinkedIn activé" : "Pilote LinkedIn arrêté", "good");
    } catch (e) { toast(e.message, "bad"); }
    setBusy(false);
  };
  if (!st || st.error) return null;
  const paused = st.enabled && st.paused_reason;
  return (
    <Card className="p-5 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Pilote automatique</h2>
            {st.enabled ? (paused ? <Badge tone="warn">En pause</Badge> : <Badge tone="good">Actif</Badge>) : <Badge>Arrêté</Badge>}
          </div>
          <p className="text-sm text-ink-soft mt-1">
            L'extension Bingoo! envoie tes invitations avec leur note, puis le premier message quand la personne accepte. Depuis ton navigateur, en semaine de 9 h à 18 h 30 : 5 invitations le premier jour, 3 de plus chaque jour, 20 au maximum.
          </p>
        </div>
        {st.enabled ? (
          <div className="flex gap-2">
            {paused && <Button size="sm" variant="li" loading={busy} onClick={() => set(true)}>Relancer</Button>}
            <Button size="sm" variant="ghost" loading={busy} onClick={() => set(false)}>Arrêter le pilote</Button>
          </div>
        ) : !ask && <Button size="sm" variant="li" onClick={() => setAsk(true)}>Activer le pilote</Button>}
      </div>
      {paused && <p className="mt-3 text-sm text-warn">{st.paused_reason}. Attends quelques jours avant de relancer.</p>}
      {st.enabled && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><p className="text-xs text-ink-soft">Invitations aujourd'hui</p><p className="font-semibold">{st.invitesDay} / {st.limite_jour}</p></div>
          <div><p className="text-xs text-ink-soft">Cette semaine</p><p className="font-semibold">{st.invitesWeek} / {st.limite_semaine}</p></div>
          <div><p className="text-xs text-ink-soft">Messages aujourd'hui</p><p className="font-semibold">{st.messagesDay}</p></div>
          <div><p className="text-xs text-ink-soft">En file d'attente</p><p className="font-semibold">{st.en_file}</p></div>
        </div>
      )}
      {st.enabled && <p className="mt-3 text-xs text-ink-faint">Le pilote ne tourne que si l'extension Bingoo! est installée et connectée (Réglages → Extension), avec ton navigateur ouvert et LinkedIn connecté.</p>}
      {ask && !st.enabled && (
        <div className="mt-4 rounded-xl bg-warn-soft p-4 text-sm">
          <p className="font-semibold">Avant d'activer</p>
          <p className="mt-1">LinkedIn interdit les outils qui agissent à ta place. Malgré les quotas prudents, ton compte peut être restreint temporairement, voire définitivement. Bingoo! s'arrête dès que LinkedIn affiche une limite ou un avertissement. Conseil : commence avec un compte secondaire.</p>
          <label className="flex items-start gap-2 mt-3 cursor-pointer">
            <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>J'ai compris le risque et j'utilise le pilote sous ma responsabilité.</span>
          </label>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="li" disabled={!consent} loading={busy} onClick={() => set(true)}>Activer le pilote</Button>
            <Button size="sm" variant="ghost" onClick={() => setAsk(false)}>Annuler</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function LinkedIn() {
  const { ws } = useWs();
  const toast = useToast();
  const { job, run } = useJob(toast);
  const [rows, setRows] = useState(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("prospects").select("*").eq("workspace_id", ws.id).eq("linkedin_status", "a_envoyer").order("updated_at", { ascending: false }).limit(50);
    setRows(data ?? []);
  }, [ws.id]);
  useEffect(() => { load(); window.addEventListener("kairo:refresh", load); return () => window.removeEventListener("kairo:refresh", load); }, [load]);

  const done = async (p) => {
    await supabase.from("prospects").update({ linkedin_status: "envoye" }).eq("id", p.id);
    setRows((r) => r.filter((x) => x.id !== p.id));
    window.dispatchEvent(new Event("kairo:refresh"));
    toast("Invitation notée comme envoyée", "good");
  };

  return (
    <div>
      <SubNav section="prospects" />
      <PageHead title="LinkedIn" sub="La machine trouve le décideur et écrit pour toi. Tu envoies toi-même (aucun risque pour ton compte), ou tu laisses le pilote le faire.">
        <Button quota="linkedin" variant="li" loading={job?.key === "li"} disabled={!!job} onClick={() => run({ key: "li", action: "linkedin", body: { workspace_id: ws.id, count: 4 }, rounds: 2, label: "Recherche des décideurs", done: (n, f) => `${f} profils trouvés sur ${n} prospects` })}>
          {job?.key === "li" ? job.text : "Préparer 8 invitations"}
        </Button>
      </PageHead>
      <Pilot ws={ws} />
      <ol className="text-sm text-ink-soft mb-6 flex flex-wrap gap-x-6 gap-y-1">
        <li>1. Copie la note</li><li>2. Ouvre le profil → « Se connecter » → « Ajouter une note »</li><li>3. Après acceptation, envoie le message</li>
      </ol>
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty title="Aucune invitation prête.">Clique sur « Préparer 8 invitations » : la machine cherche le décideur de tes prospects (en priorité ceux sans e-mail).</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((p) => (
            <Card key={p.id} className="p-5 flex flex-col">
              <p className="text-xs font-semibold text-li">{p.name}</p>
              <h3 className="font-serif text-2xl leading-tight mt-1">{p.linkedin_person}</h3>
              <div className="mt-4 rounded-xl bg-paper p-3 text-sm">
                <p className="text-xs font-semibold text-ink-soft mb-1">Note d'invitation · {p.linkedin_note.length}/300</p>
                <p>{p.linkedin_note}</p>
              </div>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-ink-soft">Message après acceptation</summary>
                <p className="mt-2 whitespace-pre-line">{p.linkedin_msg}</p>
                <div className="mt-2"><Copy text={p.linkedin_msg} label="Copier le message" /></div>
              </details>
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-line">
                <Copy text={p.linkedin_note} label="Copier la note" />
                <a href={p.linkedin_url} target="_blank" rel="noreferrer"><Button size="sm" variant="li">Ouvrir le profil ↗</Button></a>
                <Button size="sm" variant="ghost" onClick={() => done(p)}>C'est envoyé ✓</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {rows?.length > 0 && <p className="text-xs text-ink-faint mt-6">{plural(rows.length, "invitation prête", "invitations prêtes")}. Conseil : 15 à 20 invitations par jour maximum.</p>}
    </div>
  );
}
