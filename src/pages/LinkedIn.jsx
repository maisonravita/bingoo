import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { useJob } from "../lib/useJob";
import { Button, Card, Empty, PageHead, Spinner, useToast } from "../components/ui";
import { plural } from "../lib/utils";
import { SubNav } from "../components/SubNav";

function Copy({ text, label }) {
  const toast = useToast();
  return <Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(text); toast("Copié"); } catch { toast("Copie impossible, sélectionne le texte", "bad"); } }}>{label}</Button>;
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
      <PageHead title="LinkedIn" sub="La machine trouve le décideur et écrit pour toi. Tu envoies toi-même : ton compte ne risque rien.">
        <Button quota="linkedin" variant="li" loading={job?.key === "li"} disabled={!!job} onClick={() => run({ key: "li", action: "linkedin", body: { workspace_id: ws.id, count: 4 }, rounds: 2, label: "Recherche des décideurs", done: (n, f) => `${f} profils trouvés sur ${n} prospects` })}>
          {job?.key === "li" ? job.text : "Préparer 8 invitations"}
        </Button>
      </PageHead>
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
