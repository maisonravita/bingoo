import { useCallback, useEffect, useState } from "react";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Input, useToast } from "./ui";

const STATUS = {
  publie: ["E-mail publié", "good"],
  verifie: ["E-mail vérifié", "good"],
  en_cours: ["Recherche de l'e-mail…", "accent"],
  introuvable: ["E-mail introuvable", "muted"],
  "": ["", "muted"],
};

/** Décideurs d'une entreprise : recherche par fonction, e-mail trouvé par cascade, choix de l'interlocuteur. */
export default function Contacts({ p, onChange }) {
  const { ws } = useWs();
  const toast = useToast();
  const target = ws.targets?.find((t) => t.id === p.target);
  const [list, setList] = useState(null);
  const [roles, setRoles] = useState(target?.interlocuteur ?? "");
  const [busy, setBusy] = useState(null);
  const [prov, setProv] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("contacts").select("*").eq("prospect_id", p.id).order("created_at");
    setList(data ?? []);
    return data ?? [];
  }, [p.id]);
  useEffect(() => { load(); }, [load]);
  // Tant qu'un e-mail est en cours de recherche, on relève les résultats toutes les 15 secondes
  useEffect(() => {
    if (!list?.some((c) => c.email_status === "en_cours")) return;
    const t = setInterval(async () => { await fn("i/contacts-poll", { workspace_id: ws.id }).catch(() => {}); const l = await load(); if (!l.some((c) => c.email_status === "en_cours")) refreshProspect(); }, 15000);
    return () => clearInterval(t);
  }, [list]);
  const refreshProspect = async () => { const { data } = await supabase.from("prospects").select("*").eq("id", p.id).single(); if (data) onChange(data); };

  const find = async () => {
    setBusy("find");
    try {
      const r = await fn("i/contacts-find", { workspace_id: ws.id, prospect_id: p.id, roles });
      setProv(r.providers);
      const l = await load();
      await refreshProspect();
      toast(l.length ? `${l.length} décideur${l.length > 1 ? "s" : ""} trouvé${l.length > 1 ? "s" : ""}` : "Aucun décideur public trouvé pour ces fonctions", l.length ? "good" : "default");
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const use = async (c) => {
    setBusy(c.id);
    try { await fn("i/contacts-use", { workspace_id: ws.id, contact_id: c.id }); await refreshProspect(); toast(`${c.name} devient l'interlocuteur`, "good"); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const noProvider = prov && !prov.bettercontact && !prov.fullenrich && !prov.dropcontact;

  return (
    <section className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">Décideurs</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="Fonctions : directeur commercial, DAF, RH…" className="flex-1" />
        <Button quota="contacts" loading={busy === "find"} onClick={find}>{list?.length ? "Chercher encore" : "Trouver les décideurs"}</Button>
      </div>
      {busy === "find" && <p className="text-xs text-ink-soft mt-2">Recherche sur le site, LinkedIn public, la presse et le registre… (30 à 60 secondes)</p>}
      {noProvider && <p className="text-xs text-warn mt-2">Aucun fournisseur d'e-mails vérifiés n'est encore branché : Kairo ne garde que les e-mails publiés. Ajoute une clé Dropcontact, FullEnrich ou BetterContact pour trouver les autres.</p>}
      <ul className="mt-3 space-y-2">
        {(list ?? []).map((c) => {
          const main = p.contact_name === c.name;
          const [label, tone] = STATUS[c.email_status] ?? STATUS[""];
          return (
            <li key={c.id} className="rounded-xl border border-line bg-white p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.name}{main && <span className="text-good font-normal"> · interlocuteur</span>}</p>
                  <p className="text-ink-soft truncate">{c.role || "Fonction non précisée"}</p>
                </div>
                {!main && <Button size="sm" variant="ghost" loading={busy === c.id} onClick={() => use(c)}>Choisir</Button>}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {c.email ? <a className="underline" href={`mailto:${c.email}`}>{c.email}</a> : null}
                {label && <Badge tone={tone}>{label}</Badge>}
                {c.linkedin_url && <a className="underline text-li" href={c.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>}
                {c.source && /^https?:/.test(c.source) && <a className="text-xs text-ink-faint underline truncate max-w-[180px]" href={c.source} target="_blank" rel="noreferrer">source</a>}
                {c.source && !/^https?:/.test(c.source) && <span className="text-xs text-ink-faint">{c.source}</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Ajout « type Waalaxy » : coller un profil LinkedIn ou « Prénom Nom, entreprise ». */
export function ImportPerson({ onDone }) {
  const { ws } = useWs();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const r = await fn("i/contacts-import", { workspace_id: ws.id, query: q });
      toast(`${r.name} (${r.company}) ajouté, recherche de l'e-mail lancée`, "good");
      setQ(""); onDone?.(r.prospect_id);
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && q && go()} placeholder="URL d'un profil LinkedIn, ou « Prénom Nom, entreprise »" className="flex-1" />
      <Button quota="contacts" loading={busy} disabled={!q.trim()} onClick={go}>Ajouter ce contact</Button>
    </div>
  );
}
