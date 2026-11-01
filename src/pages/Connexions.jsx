import { useEffect, useState } from "react";
import { fn } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, Field, Input, PageHead, useToast } from "../components/ui";
import { cx } from "../lib/utils";
import { SubNav } from "../components/SubNav";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/k`;

function Section({ title, sub, status, children }) {
  return (
    <Card className="p-5 sm:p-6 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0"><h2 className="font-serif text-2xl">{title}</h2>{sub && <p className="text-sm text-ink-soft mt-1">{sub}</p>}</div>
        {status}
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function Copy({ value, label = "Copier" }) {
  const toast = useToast();
  return <Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(value); toast("Copié", "good"); } catch { toast("Copie impossible : sélectionne le texte", "bad"); } }}>{label}</Button>;
}

function Mailbox() {
  const { ws, reload } = useWs();
  const toast = useToast();
  const mb = ws.integrations?.mailbox;
  const [providers, setProviders] = useState([]);
  const [f, setF] = useState({ provider: "gmail", email: "", password: "", host: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { fn("mailbox-options").then((r) => setProviders(r.providers)).catch(() => {}); }, []);
  const cur = providers.find((p) => p.key === f.provider);
  const save = async () => {
    setBusy(true);
    try { await fn("mailbox-save", { workspace_id: ws.id, ...f }); toast("Boîte connectée : les e-mails partiront de ton adresse", "good"); setF({ ...f, password: "" }); await reload(); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const remove = async () => { setBusy(true); try { await fn("mailbox-remove", { workspace_id: ws.id }); await reload(); toast("Boîte déconnectée"); } finally { setBusy(false); } };
  return (
    <Section title="Ta boîte mail" sub="Kairo envoie depuis ta vraie adresse : les messages apparaissent dans tes « Envoyés » et les prospects te répondent directement."
      status={mb ? <Badge tone={mb.ok ? "good" : "bad"}>{mb.ok ? "Connectée" : "À reconnecter"}</Badge> : <Badge>Non connectée</Badge>}>
      {mb?.ok ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm flex-1 min-w-0">Envoi depuis <b className="break-all">{mb.email}</b>. {ws.reply_status === "verified" ? "Les réponses sont aussi lues et classées par Kairo." : "Les réponses arrivent dans ta boîte : colle-les dans « Réponses » pour que Kairo les traite, ou active le domaine de réponse dans Réglages."}</p>
          <Button variant="danger" size="sm" loading={busy} onClick={remove}>Déconnecter</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {mb && !mb.ok && <p className="text-sm text-bad">Le mot de passe de {mb.email} ne fonctionne plus (changé ou révoqué). Reconnecte la boîte.</p>}
          <div className="flex flex-wrap gap-1.5">
            {providers.map((p) => <button key={p.key} onClick={() => setF({ ...f, provider: p.key })} className={cx("rounded-full px-3 py-1.5 text-sm border", f.provider === p.key ? "bg-ink text-white border-ink" : "bg-white border-line")}>{p.label}</button>)}
          </div>
          {cur && <p className="text-sm text-ink-soft">{cur.help}</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Adresse e-mail"><Input type="email" autoComplete="off" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="toi@tonentreprise.fr" /></Field>
            <Field label={f.provider === "gmail" ? "Mot de passe d'application (16 lettres)" : "Mot de passe"}><Input type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
            {f.provider === "autre" && <Field label="Serveur SMTP (SSL, port 465)"><Input value={f.host} onChange={(e) => setF({ ...f, host: e.target.value })} placeholder="smtp.monhebergeur.fr" /></Field>}
          </div>
          <p className="text-xs text-ink-soft">Le mot de passe est chiffré et ne sert qu'à envoyer tes e-mails. Tu peux le révoquer à tout moment chez ton fournisseur. Outlook / Microsoft 365 : bientôt disponible.</p>
          <Button variant="primary" loading={busy} disabled={!f.email || !f.password} onClick={save}>Tester et connecter</Button>
        </div>
      )}
    </Section>
  );
}

function Warmup() {
  const { ws } = useWs();
  const [w, setW] = useState(null);
  useEffect(() => { fn("warmup", { workspace_id: ws.id }).then(setW).catch(() => {}); }, [ws.id]);
  if (!w) return null;
  return (
    <Section title="Préchauffage" sub="Les messageries se méfient des adresses qui envoient beaucoup d'un coup. Kairo monte le volume progressivement pour que tes e-mails arrivent en boîte de réception, pas en spam."
      status={<Badge tone={w.done ? "good" : "accent"}>{w.done ? "Terminé" : w.started ? `Semaine ${w.week} sur 4` : "Démarre au 1er envoi"}</Badge>}>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {w.ramp.map((n, i) => {
          const active = !w.done && w.started && w.week === i + 1;
          const past = w.done || (w.started && w.week > i + 1);
          return (
            <div key={i} className={cx("rounded-xl border p-3 text-center", active ? "border-ink bg-ink text-white" : past ? "border-line bg-paper" : "border-line")}>
              <p className={cx("text-xs", active ? "text-white/70" : "text-ink-soft")}><span className="hidden sm:inline">Semaine </span><span className="sm:hidden">S</span>{i + 1}</p>
              <p className="font-serif text-2xl tnum">{Math.min(n, w.limit)}</p>
              <p className={cx("text-[11px]", active ? "text-white/70" : "text-ink-soft")}>e-mails / jour</p>
            </div>
          );
        })}
      </div>
      <p className="text-sm">Aujourd'hui : <b className="tnum">{w.sent_today}</b> envoyé{w.sent_today > 1 ? "s" : ""} sur <b className="tnum">{w.cap}</b> possibles. Ensuite : {w.limit} par jour (réglable dans Réglages).</p>
    </Section>
  );
}

function Crm() {
  const { ws, reload } = useWs();
  const toast = useToast();
  const [tok, setTok] = useState({ hubspot: "", pipedrive: "" });
  const [busy, setBusy] = useState(null);
  const act = async (crm, remove) => {
    setBusy(crm);
    try { await fn("crm-connect", { workspace_id: ws.id, crm, token: tok[crm], remove }); toast(remove ? "Déconnecté" : "CRM connecté : les prospects qui avancent y sont envoyés automatiquement", "good"); setTok({ ...tok, [crm]: "" }); await reload(); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const sync = async () => {
    setBusy("sync");
    try { const r = await fn("crm-sync", { workspace_id: ws.id }); toast(r.synced ? `${r.synced} fiche${r.synced > 1 ? "s" : ""} envoyée${r.synced > 1 ? "s" : ""}` : "Tout est déjà à jour", "good"); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const ITEMS = [
    { key: "hubspot", label: "HubSpot", help: "Dans HubSpot : Paramètres → Intégrations → Applications privées → Créer. Coche les accès crm.objects.contacts, companies et deals (lecture et écriture), puis copie le jeton." },
    { key: "pipedrive", label: "Pipedrive", help: "Dans Pipedrive : clique sur ton profil → Préférences personnelles → API, puis copie ton jeton personnel." },
  ];
  const any = ws.integrations?.hubspot?.ok || ws.integrations?.pipedrive?.ok;
  return (
    <Section title="CRM" sub="Chaque prospect qui est contacté, répond, prend RDV ou signe est créé et mis à jour dans ton CRM : entreprise, contact, transaction et montant.">
      <div className="grid md:grid-cols-2 gap-4">
        {ITEMS.map((it) => {
          const on = ws.integrations?.[it.key]?.ok;
          return (
            <div key={it.key} className="rounded-xl border border-line p-4 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2"><p className="font-semibold">{it.label}</p><Badge tone={on ? "good" : "muted"}>{on ? "Connecté" : "Non connecté"}</Badge></div>
              {on ? (
                <div className="flex items-center justify-between gap-2"><p className="text-sm text-ink-soft truncate">{ws.integrations[it.key].company || (ws.integrations[it.key].portal ? `Compte ${ws.integrations[it.key].portal}` : "Synchronisation active")}</p><Button size="sm" variant="danger" loading={busy === it.key} onClick={() => act(it.key, true)}>Déconnecter</Button></div>
              ) : (
                <>
                  <p className="text-xs text-ink-soft mb-2">{it.help}</p>
                  <div className="flex gap-2"><Input type="password" autoComplete="off" placeholder="Jeton d'accès" value={tok[it.key]} onChange={(e) => setTok({ ...tok, [it.key]: e.target.value })} className="min-w-0" /><Button loading={busy === it.key} disabled={!tok[it.key]} onClick={() => act(it.key)}>Connecter</Button></div>
                </>
              )}
            </div>
          );
        })}
      </div>
      {any && <div className="mt-4 flex flex-wrap items-center gap-3"><Button loading={busy === "sync"} onClick={sync}>Synchroniser maintenant</Button><p className="text-xs text-ink-soft">Sinon, la synchronisation se fait toute seule chaque heure.</p></div>}
    </Section>
  );
}

function Calendar() {
  const { ws } = useWs();
  const url = `${FN_URL}/calendar?t=${ws.calendar_token}`;
  const webcal = url.replace(/^https:/, "webcal:");
  return (
    <Section title="Agenda" sub="Tes rendez-vous Kairo apparaissent automatiquement dans Google Agenda, Outlook ou l'agenda de ton téléphone.">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <code className="flex-1 min-w-0 text-xs bg-paper rounded-lg px-3 py-2 break-all">{url}</code>
        <Copy value={url} label="Copier le lien" />
      </div>
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl border border-line p-3"><p className="font-semibold mb-1">Google Agenda</p><p className="text-ink-soft text-xs">Autres agendas → « + » → À partir de l'URL → colle le lien.</p><a className="text-xs font-semibold underline mt-2 inline-block" href={`https://calendar.google.com/calendar/r/settings/addbyurl?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer">Ouvrir Google Agenda</a></div>
        <div className="rounded-xl border border-line p-3"><p className="font-semibold mb-1">Outlook</p><p className="text-ink-soft text-xs">Ajouter un calendrier → S'abonner à partir du web → colle le lien.</p><a className="text-xs font-semibold underline mt-2 inline-block" href={`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(url)}&name=${encodeURIComponent("Kairo")}`} target="_blank" rel="noreferrer">Ouvrir Outlook</a></div>
        <div className="rounded-xl border border-line p-3"><p className="font-semibold mb-1">iPhone / Mac</p><p className="text-ink-soft text-xs">Ouvre ce lien sur l'appareil pour t'abonner.</p><a className="text-xs font-semibold underline mt-2 inline-block" href={webcal}>S'abonner</a></div>
      </div>
      <p className="text-xs text-ink-soft mt-3">Ce lien est privé : ne le partage qu'avec ton équipe. Google met à jour les agendas abonnés toutes les quelques heures.</p>
    </Section>
  );
}

const FINDERS = [["bettercontact", "BetterContact", "regroupe plus de 20 sources"], ["fullenrich", "FullEnrich", "regroupe plus de 15 sources"], ["dropcontact", "Dropcontact", "adresses vérifiées, conforme RGPD"]];
function Finders() {
  const { ws } = useWs();
  const [p, setP] = useState(null);
  useEffect(() => { fn("i/contacts-providers", { workspace_id: ws.id }).then((r) => setP(r.providers)).catch(() => setP({})); }, [ws.id]);
  const n = p ? FINDERS.filter(([k]) => p[k]).length : 0;
  return (
    <Section title="Recherche d'e-mails" sub="Quand un décideur n'a pas d'e-mail publié, Kairo interroge ces fournisseurs l'un après l'autre jusqu'à trouver une adresse vérifiée. Un crédit n'est compté que si un e-mail est trouvé."
      status={p && <Badge tone={n ? "good" : "warn"}>{n ? `${n} fournisseur${n > 1 ? "s" : ""} actif${n > 1 ? "s" : ""}` : "Aucun fournisseur actif"}</Badge>}>
      <ul className="space-y-2 text-sm">
        {FINDERS.map(([k, label, sub]) => (
          <li key={k} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
            <span className="min-w-0"><b>{label}</b> <span className="text-ink-soft">· {sub}</span></span>
            <Badge tone={p?.[k] ? "good" : "muted"}>{p?.[k] ? "Actif" : "Non branché"}</Badge>
          </li>
        ))}
      </ul>
      {p && !n && <p className="text-xs text-ink-soft mt-3">Sans fournisseur, Kairo ne garde que les e-mails publiés sur les sites et annuaires (jamais d'adresse devinée).</p>}
    </Section>
  );
}

export default function Connexions() {
  return (
    <div>
      <SubNav section="reglages" />
      <PageHead title="Connexions" sub="Ta boîte mail, ton CRM et ton agenda branchés sur Kairo." />
      <div className="space-y-4">
        <Mailbox />
        <Warmup />
        <Finders />
        <Crm />
        <Calendar />
      </div>
    </div>
  );
}
