import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, Spinner } from "../components/ui";
import { Kpi, PeriodSelect, nf } from "../components/Charts";
import { STATUS, cx } from "../lib/utils";
import { SubNav } from "../components/SubNav";

const I = ({ d, className = "h-5 w-5" }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={d} /></svg>;
const IC = {
  plane: "M22 2L11 13M22 2l-7 20-4-9-9-4z", users: "M16 20a4 4 0 0 0-8 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  chat: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z", cal: "M5 5h14v15H5zM5 9h14M9 3v4M15 3v4", doc: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z", reply: "M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-1", search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5",
};
const KIND = { envoi: ["mail", "E-mail envoyé"], reponse: ["reply", "Réponse reçue"], rdv: ["cal", "Rendez-vous"], recherche: ["search", "Recherche"], enquete: ["search", "Enquête"], redaction: ["mail", "Rédaction"], devis: ["doc", "Devis"], radar: ["star", "Radar"], mission: ["star", "Mission"] };
const ago = (d) => { const m = Math.round((Date.now() - new Date(d).getTime()) / 6e4); return m < 60 ? `il y a ${Math.max(1, m)} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`; };
const TILE = ["bg-[#FCE7DC] text-[#BF4314]", "bg-[#E3EDFD] text-[#1D5BD6]", "bg-good-soft text-good", "bg-[#F3E8FF] text-[#7C3AED]", "bg-[#FEF3C7] text-[#A16207]"];

export default function Prospection() {
  const { ws } = useWs();
  const nav = useNavigate();
  const [days, setDays] = useState(30);
  const [s, setS] = useState(null);
  const [last, setLast] = useState(null);
  const [act, setAct] = useState(null);

  useEffect(() => {
    let alive = true;
    supabase.rpc("pro_stats", { p_ws: ws.id, p_days: days }).then(({ data }) => alive && setS(data ?? {}));
    return () => { alive = false; };
  }, [ws.id, days]);
  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: a }] = await Promise.all([
        supabase.from("prospects").select("id, name, contact_name, activity, status, created_at").eq("workspace_id", ws.id).order("updated_at", { ascending: false }).limit(6),
        supabase.from("activity").select("kind, summary, created_at").eq("workspace_id", ws.id).in("kind", ["envoi", "reponse", "rdv", "recherche", "enquete", "devis", "radar", "mission"]).order("created_at", { ascending: false }).limit(6),
      ]);
      setLast(p ?? []); setAct(a ?? []);
    })();
  }, [ws.id]);

  const p = s?.prev ?? {};

  return (
    <div className="space-y-5">
      <SubNav section="prospects" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-accent"><I d={IC.plane} className="h-11 w-11" /></span>
          <div><h1 className="font-serif text-4xl leading-none">Kairo Prospection</h1><p className="text-ink-soft mt-1.5">Trouve des prospects qualifiés et contacte-les avec des messages personnalisés.</p></div>
        </div>
        <PeriodSelect value={days} onChange={setDays} />
      </div>

      <div className="grid xl:grid-cols-[1fr_1fr] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {!s ? <Spinner /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Kpi icon={<I d={IC.users} />} value={nf(s.prospects)} label="Prospects trouvés" cur={s.prospects} prev={p.prospects} />
              <Kpi icon={<I d={IC.mail} />} value={nf(s.sent)} label="E-mails envoyés" cur={s.sent} prev={p.sent} />
              <Kpi icon={<I d={IC.chat} />} value={nf(s.replies)} label="Réponses reçues" cur={s.replies} prev={p.replies} />
              <Kpi icon={<I d={IC.cal} />} value={nf(s.rdv)} label="Rendez-vous obtenus" cur={s.rdv} prev={p.rdv} />
              <Kpi icon={<I d={IC.doc} />} value={nf(s.quotes)} label="Devis envoyés" cur={s.quotes} prev={p.quotes} />
              <Kpi icon={<I d={IC.star} />} value={nf(s.clients)} label="Clients signés" cur={s.clients} prev={p.clients} />
            </div>
          )}
          <Button variant="accent" size="lg" className="w-full" onClick={() => nav("/mission")}>+ Trouver des prospects</Button>

          <Card className="p-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold text-lg flex items-center gap-2"><span className="text-accent"><I d={IC.star} /></span>Activité récente</h2><button onClick={() => nav("/")} className="text-sm text-ink-soft hover:text-ink">Voir tout ›</button></div>
            {!act ? <Spinner /> : !act.length ? <p className="text-sm text-ink-soft mt-3">Rien pour l'instant.</p> : (
              <ul className="mt-3 space-y-3">
                {act.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm"><span className="text-accent mt-0.5"><I d={IC[KIND[a.kind]?.[0] ?? "star"]} /></span><div className="min-w-0"><p className="truncate">{a.summary}</p><p className="text-xs text-ink-faint">{ago(a.created_at)}</p></div></li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5 min-w-0">
          <Card className="p-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold text-lg flex items-center gap-2"><span className="text-accent"><I d={IC.users} /></span>Derniers prospects</h2><button onClick={() => nav("/prospects")} className="text-sm text-ink-soft hover:text-ink">Voir tous ›</button></div>
            {!last ? <Spinner /> : !last.length ? <p className="text-sm text-ink-soft mt-3">Aucun prospect pour l'instant.</p> : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm min-w-[380px]">
                  <thead><tr className="text-left text-xs text-ink-soft bg-paper/70"><th className="py-2 px-2 font-medium rounded-l-lg">Entreprise</th><th className="font-medium">Contact</th><th className="font-medium hidden 2xl:table-cell">Secteur</th><th className="font-medium rounded-r-lg">Statut</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {last.map((x, i) => (
                      <tr key={x.id} className="cursor-pointer hover:bg-paper/50" onClick={() => nav("/prospects")}>
                        <td className="py-2.5 px-2"><span className="flex items-center gap-2"><span className={cx("grid place-items-center h-6 w-6 rounded-md text-[11px] font-semibold", TILE[i % TILE.length])}>{x.name.slice(0, 1)}</span><span className="truncate max-w-[150px] font-medium">{x.name}</span></span></td>
                        <td className="truncate max-w-[130px]">{x.contact_name || <span className="text-ink-faint">—</span>}</td>
                        <td className="truncate max-w-[140px] text-ink-soft hidden 2xl:table-cell">{x.activity}</td>
                        <td><Badge tone={STATUS[x.status]?.tone}>{STATUS[x.status]?.label ?? x.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
