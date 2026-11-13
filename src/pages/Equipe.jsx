import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, Input, PageHead, Spinner, useToast } from "../components/ui";
import { fmtDate } from "../lib/utils";
import { SubNav } from "../components/SubNav";
import { modeExplorer } from "../lib/mode";

const ROLE = { owner: "Propriétaire", admin: "Administrateur", member: "Commercial" };
const ROLE_SAAS = { owner: "Propriétaire", admin: "Administrateur", member: "Membre" };
const SEATS = { essai: 1, solo: 1, pro: 3, equipe: 10, fondateur: 50 };

export default function Equipe() {
  const { ws, session } = useWs();
  const toast = useToast();
  const [d, setD] = useState(null);
  const [f, setF] = useState({ email: "", role: "member" });
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    const [m, i, p] = await Promise.all([
      supabase.from("members").select("*").eq("workspace_id", ws.id).order("created_at"),
      supabase.from("invites").select("*").eq("workspace_id", ws.id).is("used_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
      supabase.from("prospects").select("owner_id, status").eq("workspace_id", ws.id).limit(10000),
    ]);
    const counts = {};
    let free = 0;
    for (const x of p.data ?? []) { if (!x.owner_id) { if (!["refus", "ignore"].includes(x.status)) free++; continue; } const c = counts[x.owner_id] ??= { total: 0, rdv: 0, clients: 0 }; c.total++; if (x.status === "rdv") c.rdv++; if (x.status === "client") c.clients++; }
    setD({ members: m.data ?? [], invites: i.data ?? [], counts, free });
  }, [ws.id]);
  useEffect(() => { load(); }, [load]);

  const me = d?.members.find((m) => m.user_id === session?.user?.id);
  const canManage = ["owner", "admin"].includes(me?.role);
  const saas = modeExplorer(ws) || ws.plan === "fondateur";
  // « Lancer à plusieurs » : 3 utilisateurs
  const seats = saas ? (["business", "fondateur"].includes(ws.plan) ? 3 : 1) : SEATS[ws.plan] ?? 1;
  const used = (d?.members.length ?? 0) + (d?.invites.length ?? 0);

  const invite = async () => {
    setBusy("invite");
    try { const r = await fn("team-invite", { workspace_id: ws.id, ...f }); setLink(r.link); setF({ email: "", role: "member" }); await load(); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const act = async (route, body, msg) => {
    setBusy(route + (body.user_id ?? body.invite_id ?? ""));
    try { const r = await fn(route, { workspace_id: ws.id, ...body }); toast(typeof msg === "function" ? msg(r) : msg, "good"); await load(); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast("Lien copié", "good"); } catch { toast("Sélectionne le lien pour le copier", "bad"); } };

  if (!d) return <Spinner />;
  return (
    <div>
      <SubNav section="reglages" />
      <PageHead title="Équipe" sub={`${d.members.length} membre${d.members.length > 1 ? "s" : ""} · ${seats} place${seats > 1 ? "s" : ""} dans ta formule`} />

      <Card className="divide-y divide-line mb-6">
        {d.members.map((m) => {
          const c = d.counts[m.user_id] ?? { total: 0, rdv: 0, clients: 0 };
          return (
            <div key={m.user_id} className="p-4 flex flex-wrap items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-paper grid place-items-center font-semibold uppercase shrink-0">{(m.email || "?")[0]}</div>
              <div className="flex-1 min-w-[160px]">
                <p className="font-medium break-all">{m.email || "Membre"}{m.user_id === session?.user?.id && <span className="text-ink-soft font-normal"> (toi)</span>}</p>
                {!saas && <p className="text-xs text-ink-soft">{c.total} prospects · {c.rdv} en RDV · {c.clients} clients</p>}
              </div>
              <Badge tone={m.role === "owner" ? "accent" : "muted"}>{(saas ? ROLE_SAAS : ROLE)[m.role]}</Badge>
              {canManage && m.role !== "owner" && m.user_id !== session?.user?.id && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" loading={busy === "team-member" + m.user_id} onClick={() => act("team-member", { user_id: m.user_id, action: m.role === "admin" ? "member" : "admin" }, "Rôle modifié")}>{m.role === "admin" ? "Passer commercial" : "Passer admin"}</Button>
                  <Button size="sm" variant="danger" onClick={() => { if (confirmRemove(m.email)) act("team-member", { user_id: m.user_id, action: "remove" }, "Membre retiré"); }}>Retirer</Button>
                </div>
              )}
            </div>
          );
        })}
        {d.invites.map((i) => (
          <div key={i.id} className="p-4 flex flex-wrap items-center gap-3 bg-paper/50">
            <div className="w-9 h-9 rounded-full border border-dashed border-line grid place-items-center text-ink-soft shrink-0">+</div>
            <div className="flex-1 min-w-[160px]"><p className="font-medium break-all">{i.email || "Invitation ouverte"}</p><p className="text-xs text-ink-soft">Invitation envoyée le {fmtDate(i.created_at)}, valable jusqu'au {fmtDate(i.expires_at)}</p></div>
            <Badge>{(saas ? ROLE_SAAS : ROLE)[i.role]}</Badge>
            {canManage && <Button size="sm" variant="ghost" onClick={() => act("team-revoke", { invite_id: i.id }, "Invitation annulée")}>Annuler</Button>}
          </div>
        ))}
      </Card>

      {canManage && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5 sm:p-6 min-w-0">
            <h2 className="font-serif text-2xl">Inviter quelqu'un</h2>
            {used >= seats ? (
              <p className="text-sm text-ink-soft mt-2">Toutes les places de ta formule sont prises. <Link to="/abonnement" className="font-semibold underline">Passe à une formule supérieure</Link> pour ajouter des commerciaux.</p>
            ) : (
              <>
                <p className="text-sm text-ink-soft mt-1">Tu obtiens un lien à lui envoyer (valable 7 jours). Il crée son compte et rejoint ton espace.</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Input type="email" placeholder="E-mail (facultatif)" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="flex-1 min-w-[180px]" />
                  <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className="rounded-xl border border-line bg-white px-3 text-sm"><option value="member">{saas ? "Membre" : "Commercial"}</option><option value="admin">Administrateur</option></select>
                  <Button variant="primary" loading={busy === "invite"} onClick={invite}>Créer le lien</Button>
                </div>
                {link && <div className="mt-3 flex flex-wrap gap-2 items-center"><code className="flex-1 min-w-0 text-xs bg-paper rounded-lg px-3 py-2 break-all">{link}</code><Button size="sm" onClick={copy}>Copier</Button></div>}
                <p className="text-xs text-ink-soft mt-3">Un commercial voit et travaille tous les prospects de l'espace. Un administrateur peut aussi gérer l'équipe et l'abonnement.</p>
              </>
            )}
          </Card>
          <Card className="p-5 sm:p-6 min-w-0">
            <h2 className="font-serif text-2xl">Répartir les prospects</h2>
            <p className="text-sm text-ink-soft mt-1">{d.free.toLocaleString("fr-FR")} prospects n'ont pas encore de responsable. Bingoo! les partage à tour de rôle, les meilleurs scores d'abord.</p>
            <Button className="mt-4" disabled={!d.free || d.members.length < 2} loading={busy === "team-distribute"} onClick={() => act("team-distribute", { count: 1000 }, (r) => `${r.assigned} prospects répartis`)}>Répartir entre {d.members.length} personne{d.members.length > 1 ? "s" : ""}</Button>
            {d.members.length < 2 && <p className="text-xs text-ink-soft mt-2">Invite d'abord un commercial.</p>}
            <p className="text-xs text-ink-soft mt-3">Chacun retrouve les siens avec le bouton « Mes prospects ». Tu peux changer le responsable dans chaque fiche.</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function confirmRemove(email) {
  return window.confirm(`Retirer ${email || "ce membre"} de l'équipe ? Ses prospects redeviennent sans responsable.`);
}
