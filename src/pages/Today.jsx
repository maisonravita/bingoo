import PushTel from "../components/PushTel";
import Visite from "../components/Visite";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { useJob } from "../lib/useJob";
import { Button, useToast } from "../components/ui";
import { cx, plural } from "../lib/utils";
import { fmtN } from "../lib/zones";
import { Avatar, TEAM } from "./Salaries";
import CompanyLogo from "../components/CompanyLogo";
import TodayFeed from "../components/TodayFeed";
import { BandeauMatin, usePilotage } from "./Pilotage";

const I = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  cal: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2a5 5 0 0 1 5.5 5" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
};
const Ico = ({ n, className = "w-5 h-5", fill }) => <svg viewBox="0 0 24 24" className={cx(className, "shrink-0")} fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{I[n]}</svg>;

// Temps qu'un commercial passerait sur chaque action faite par l'équipe (estimation affichée comme telle)
const MINUTES = { recherche: 20, enquete: 8, enquete_plus: 12, redaction: 10, envoi: 1, reponse: 5, radar: 5, radar_scan: 20, veille: 30, espion: 15, analyse: 30, linkedin: 6, rdv: 20, brief: 15, devis: 15, script: 10, intelligence: 20 };
const KIND = { recrutement: "Recrute", croissance: "Se développe", appel_offres: "Appel d'offres", besoin: "Cherche une solution", renouvellement: "Contrat à renouveler", dirigeant: "Nouveau dirigeant", demenagement: "Déménage", creation: "Création ou ouverture", site: "Site modifié", levee: "Levée de fonds", permis: "Permis de construire", aide: "Aide publique", budget: "Projet voté", salon: "Salon", difficulte: "Difficultés" };
const ago = (d) => { const h = Math.round((Date.now() - new Date(d).getTime()) / 36e5); return h < 1 ? "à l'instant" : h < 24 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j`; };
const short = (d) => { const m = Math.round((Date.now() - new Date(d).getTime()) / 6e4); return m < 60 ? `Actif · ${m} min` : `Actif · ${Math.round(m / 60)} h`; };
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

const fmtDur = (m) => { m = Math.round(m); if (m < 60) return [String(m), "min"]; const h = Math.floor(m / 60), r = Math.round((m % 60) / 5) * 5; return r ? [`${h} h ${String(r).padStart(2, "0")}`, ""] : [String(h), "h"]; };

/** Le résultat avant les fonctionnalités : le temps de prospection que l'équipe a fait à ta place, jour par jour. */
function TimeSaved({ s, trend }) {
  const days = Array.from({ length: 7 }, (_, k) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - k)); return d; });
  const per = days.map((d, k) => { const end = k < 6 ? days[k + 1] : new Date(8.64e15); return s.rows.filter((r) => { const t = new Date(r.created_at); return t >= d && t < end; }).reduce((m, r) => m + (MINUTES[r.kind] ?? 0), 0); });
  const max = Math.max(60, ...per);
  const [num, unit] = fmtDur(s.minutes);
  const drafts = s.rows.filter((r) => r.kind === "redaction").length;
  const made = [[s.found7, "entreprise trouvée", "entreprises trouvées"], [s.oppsWeek, "opportunité repérée", "opportunités repérées"], [drafts, "e-mail rédigé", "e-mails rédigés"]].filter(([n]) => n > 0).slice(0, 2).map(([n, o, m]) => plural(n, o, m));
  return (
    <Link to="/resultats" className="group lg:w-[380px] shrink-0 rounded-2xl p-5 bg-gradient-to-br from-accent-soft via-[#FFF1E8] to-white border border-accent/15 hover:border-accent/40 hover:shadow-sm transition">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11.5px] font-bold uppercase tracking-wider text-accent-dark flex items-center gap-1.5"><Ico n="clock" className="w-4 h-4" />Temps gagné cette semaine</p>
        <span title="Estimation : le temps qu'un commercial passerait à faire les mêmes actions à la main (chercher les entreprises, trouver les contacts, écrire les e-mails, surveiller le marché…)." className="w-5 h-5 rounded-full border border-accent/30 text-accent-dark text-[11px] font-bold grid place-items-center cursor-help">i</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-4">
        <p className="font-black leading-none text-ink tnum" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>
          <span className="text-[44px]">{num}</span>{unit && <span className="text-[22px] ml-1 text-ink-soft">{unit}</span>}
        </p>
        <div className="flex items-end gap-1.5 h-[52px]" aria-label="Temps gagné par jour sur 7 jours">
          {per.map((m, k) => (
            <div key={k} className="flex flex-col items-center gap-1" title={`${days[k].toLocaleDateString("fr-FR", { weekday: "long" })} : ${fmtDur(m).join(" ").trim()}`}>
              <div className={cx("w-2.5 rounded-full transition-all", k === 6 ? "bg-accent" : m ? "bg-accent/40" : "bg-ink/10")} style={{ height: `${Math.max(4, (m / max) * 40)}px` }} />
              <span className={cx("text-[9.5px] leading-none", k === 6 ? "text-accent-dark font-bold" : "text-ink-faint")}>{"DLMMJVS"[days[k].getDay()]}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[13px] text-ink-soft leading-snug">
        {made.length ? <>Ton équipe a fait le travail : <span className="text-ink font-medium">{made.join(" · ")}</span></> : "Ton équipe démarre : le temps gagné s'affichera ici."}
      </p>
      {trend != null && trend > 0 && <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-good-soft text-good text-[12px] font-semibold px-2.5 py-0.5">↑ +{trend} % d'opportunités vs semaine dernière</p>}
    </Link>
  );
}

function Sparks({ className }) {
  return <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" stroke="#E0531F" strokeWidth="4.5" strokeLinecap="round"><path d="M10 6l3 9M24 4l-4 10M30 18l-9 3" /></svg>;
}

function Stat({ icon, label, value, delta, accent }) {
  return (
    <div className="flex items-start gap-3 px-4 py-1">
      <span className="w-10 h-10 rounded-full bg-accent-soft text-accent grid place-items-center"><Ico n={icon} /></span>
      <div className="min-w-0">
        <p className="text-[14px] text-ink-soft">{label}</p>
        <p className={cx("text-[28px] font-bold leading-tight tnum", accent && value > 0 && "text-accent")}>{fmtN(value)}</p>
        <p className={cx("text-[12px] mt-0.5 tnum", delta > 0 ? "text-good font-medium" : "text-ink-faint")}>{delta == null ? " " : delta > 0 ? `↑ +${fmtN(delta)} en 7 jours` : "→ 0 en 7 jours"}</p>
      </div>
    </div>
  );
}

function Priority({ icon, n, one, many, sub, empty, to, cta, img, hot }) {
  const on = n > 0;
  return (
    <div className={cx("relative overflow-hidden rounded-2xl border bg-white p-5 min-h-[178px] flex flex-col", on && hot ? "border-accent/40" : "border-line")}>
      <img src={`/illus/${img}.png`} alt="" aria-hidden className={cx("absolute right-2 bottom-2 w-[112px] pointer-events-none select-none transition", !on && "opacity-40 grayscale")} />
      <div className="flex items-start gap-3 pr-16">
        <span className="w-11 h-11 rounded-full bg-accent-soft text-accent grid place-items-center shrink-0"><Ico n={icon} /></span>
        <div>
          <p className="font-bold text-[16.5px] leading-snug">{on ? plural(n, one, many) : empty}</p>
          <p className="text-[13.5px] text-ink-soft mt-1 leading-snug pr-8">{sub}</p>
        </div>
      </div>
      <div className="mt-auto pt-4">
        <Link to={to} className={cx("inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold transition", on ? "bg-accent text-white hover:bg-accent-dark" : "bg-paper text-ink-soft border border-line hover:text-ink")}>{cta}<Ico n="arrow" className="w-4 h-4" /></Link>
      </div>
    </div>
  );
}

const Logo = ({ name, url }) => <CompanyLogo name={name} url={url} className="w-10 h-10 text-lg" />;

function Detected({ rows, onPrepared }) {
  const { ws } = useWs();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const prepare = async (o) => {
    setBusy(o.id);
    try {
      const r = await fn("m/prepare", { workspace_id: ws.id, id: o.id });
      toast(r.message ? `${o.company} : contact trouvé et e-mail prêt à valider` : r.reason === "no_email" ? `${o.company} ajouté aux prospects (e-mail introuvable pour l'instant)` : `${o.company} ajouté aux prospects`, "good");
      onPrepared();
      window.dispatchEvent(new Event("kairo:refresh"));
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  return (
    <section className="min-w-0 bg-white rounded-2xl border border-line p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="flex items-center gap-2.5 font-bold text-[16px] uppercase tracking-wide"><Ico n="target" className="w-6 h-6 text-accent" />Tes 3 entreprises à contacter aujourd'hui</h2>
        <Link to="/radar" className="text-[13px] text-ink-soft hover:text-ink inline-flex items-center gap-1">Voir toutes les opportunités<Ico n="arrow" className="w-3.5 h-3.5" /></Link>
      </div>
      {!rows.length ? <div className="py-6 text-center"><p className="text-sm text-ink-soft">Rien de nouveau pour l'instant : Max relance le Radar chaque matin de semaine.</p><Link to="/radar" className="mt-3 inline-block text-sm font-semibold text-accent-dark hover:underline">Ouvrir le Radar →</Link></div> : (
        <ul className="space-y-2">
          {rows.map((o) => (
            <li key={o.id} className="rounded-xl border border-line px-3 sm:px-4 py-3 flex items-center gap-3 hover:border-ink/20 transition">
              <span className="hidden sm:inline-block w-[112px] shrink-0"><span className="inline-block text-[11px] font-bold uppercase tracking-wide rounded-full bg-accent-soft text-accent-dark px-2.5 py-1">{KIND[o.kind] ?? o.kind}</span></span>
              <Logo name={o.company} url={o.url} />
              <Link to="/radar" className="min-w-0 flex-1">
                <p className="font-semibold truncate">{o.company}</p>
                <p className="text-[13px] text-ink-soft line-clamp-2 leading-snug">{o.summary}</p>
                <p className="text-[11.5px] text-ink-faint mt-0.5"><span className="sm:hidden font-semibold text-accent-dark">{KIND[o.kind] ?? o.kind} · </span>{[o.city, ago(o.created_at)].filter(Boolean).join(" · ")}</p>
              </Link>
              {o.prospect_id ? (
                <Link to="/valider" className="shrink-0 rounded-full bg-good-soft text-good px-3 py-1.5 text-[12.5px] font-semibold hover:brightness-95">Message prêt</Link>
              ) : o.kind !== "appel_offres" && o.kind !== "besoin" && (
                <button onClick={() => prepare(o)} disabled={!!busy} title="Sam trouve le contact, Hugo écrit l'e-mail (rien n'est envoyé)"
                  className="shrink-0 rounded-full bg-accent-soft text-accent-dark px-3 py-1.5 text-[12.5px] font-semibold hover:bg-accent hover:text-white transition disabled:opacity-50">
                  {busy === o.id ? "Préparation…" : "Préparer"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TeamAtWork({ rows }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const lastOf = (a) => rows.find((r) => a.kinds.includes(r.kind));
  const ranked = TEAM.map((a) => ({ a, last: lastOf(a) })).sort((x, y) => (y.last ? new Date(y.last.created_at) : 0) - (x.last ? new Date(x.last.created_at) : 0));
  const active = ranked.filter((x) => x.last && new Date(x.last.created_at) >= today).length;
  return (
    <section className="min-w-0 bg-white rounded-2xl border border-line p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="flex items-center gap-2.5 font-bold text-[15px] uppercase tracking-wide whitespace-nowrap"><Ico n="users" className="w-6 h-6 text-accent" />Ton équipe au travail</h2>
        <Link to="/salaries" className="text-[13px] text-ink-soft inline-flex items-center gap-1.5 whitespace-nowrap"><span className={cx("w-2 h-2 rounded-full", active ? "bg-good" : "bg-ink-faint")} />{active} actif{active > 1 ? "s" : ""}</Link>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {ranked.slice(0, 3).map(({ a, last }) => {
          const working = !!last && Date.now() - new Date(last.created_at).getTime() < 4 * 60000;
          const todayDone = !!last && new Date(last.created_at) >= today;
          return (
            <Link key={a.id} to="/salaries" title={last ? `Dernière action : ${last.summary}` : undefined} className="min-w-0 rounded-xl border border-line pt-2 pb-3 px-1.5 flex flex-col items-center text-center hover:border-ink/25 transition">
              <Avatar id={a.id} working={working} className="w-[92px] h-[118px]" />
              <p className="font-bold mt-1">{a.first}</p>
              <p className="text-[12.5px] text-ink-soft">{a.role}</p>
              <span className={cx("mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium whitespace-nowrap", working ? "bg-accent-soft text-accent-dark" : todayDone ? "bg-good-soft text-good" : "bg-[#EFEEEA] text-ink-soft")}>
                <span className={cx("w-1.5 h-1.5 rounded-full", working ? "bg-accent pulse-dot" : todayDone ? "bg-good" : "bg-ink-soft")} />
                {working ? "Au travail" : todayDone ? short(last.created_at) : "En veille"}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Rendez-vous du jour, relances dues et devis sans réponse : ce qui ne doit pas attendre. */
function Urgent({ u }) {
  if (!u || (!u.meet.length && !u.due.length && !u.quotes.length)) return null;
  const late = (d) => Math.round((Date.now() - new Date(d).getTime()) / 864e5);
  return (
    <section className="mb-6 rounded-2xl bg-ink text-white p-4 sm:p-5">
      <p className="font-bold flex items-center gap-2"><Ico n="bolt" className="w-5 h-5 text-accent" fill />À ne pas laisser filer aujourd'hui</p>
      <ul className="mt-2 divide-y divide-white/10 text-[14px]">
        {u.meet.map((m) => <li key={m.id} className="py-2 flex gap-3"><span className="flex-1"><b>RDV à {new Date(m.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</b> · {m.company}, Paul a préparé la fiche</span><Link to="/agenda" className="text-accent font-semibold">Préparer</Link></li>)}
        {u.quotes.map((q) => <li key={q.id} className="py-2 flex gap-3"><span className="flex-1"><b>{q.prospects?.name}</b> · devis {q.number} {q.status === "vu" ? "ouvert" : "envoyé"} il y a {late(q.sent_at)} jours, sans signature</span><Link to="/devis" className="text-accent font-semibold">Relancer</Link></li>)}
        {u.due.map((p) => <li key={p.id} className="py-2 flex gap-3"><span className="flex-1"><b>{p.name}</b> · {p.next_action || "À suivre"}{late(p.next_action_at) > 0 ? <span className="text-white/60"> · en retard de {late(p.next_action_at)} j</span> : ""}</span>{p.phone ? <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="text-accent font-semibold">Appeler</a> : <Link to="/prospects" className="text-accent font-semibold">Ouvrir</Link>}</li>)}
      </ul>
    </section>
  );
}


/** Tes contacts : décideurs trouvés, e-mails, téléphones, réponses et rendez-vous (chiffres réels, jamais d'exemple). */
// Adresses génériques (contact@, info@, sales@…) : utiles, mais ce ne sont pas des décideurs
const GENERIQUE = "^(contact|info|infos|sales|vente|ventes|hello|bonjour|accueil|commercial|marketing|support|admin|office|secretariat|direction|reclamation[a-z.-]*|service[a-z.-]*|rh|recrutement|jobs|team|equipe)@";
function Contacts({ s }) {
  const T = [["Décideurs trouvés", s.dec, "/prospects"], ["E-mails directs", s.mailDirect ?? s.mail, "/prospects", s.mail > (s.mailDirect ?? s.mail) ? `+ ${s.mail - s.mailDirect} adresse${s.mail - s.mailDirect > 1 ? "s" : ""} générique${s.mail - s.mailDirect > 1 ? "s" : ""}` : ""], ["Téléphones", s.tel, "/prospects"], ["Réponses", s.replied, "/reponses"], ["Rendez-vous", s.rdv, "/agenda"]];
  return (
    <section aria-label="Tes contacts" className="mb-6 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
      {T.map(([l, v, to, sub], i) => (
        <Link key={l} to={to} className={cx("rounded-2xl border p-4 transition hover:border-ink-faint", i === 4 ? "bg-accent-soft/60 border-accent/20" : "bg-white border-line", i === 4 && "col-span-2 sm:col-span-1")}>
          <p className="text-[13px] text-ink-soft">{l}</p>
          <p className={cx("font-black text-[30px] leading-tight tnum", i === 4 && "text-accent-dark")} style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{(v ?? 0).toLocaleString("fr-FR")}</p>
          {sub && <p className="text-[11.5px] text-ink-faint mt-0.5">{sub}</p>}
        </Link>
      ))}
    </section>
  );
}

/** Le point d'entrée unique : décrire en une phrase les clients voulus. Bingoo! en fait une mission (cible, zone, moments d'achat). */
const IDEES = ["Les cabinets comptables d'Île-de-France qui recrutent", "Les startups SaaS qui viennent de lever des fonds", "20 rendez-vous avec des agences immobilières à Lyon"];
function Decris() {
  const nav = useNavigate();
  const [t, setT] = useState("");
  const go = (x) => { const v = (x ?? t).trim(); if (v.length >= 8) nav(`/mission?q=${encodeURIComponent(v)}`); };
  return (
    <section aria-label="Trouver de nouveaux clients" className="mb-6 rounded-2xl border border-line bg-white p-4 sm:p-5">
      <form onSubmit={(e) => { e.preventDefault(); go(); }} className="flex flex-col sm:flex-row gap-2">
        <label className="sr-only" htmlFor="decris">Décris les clients que tu veux</label>
        <input id="decris" value={t} onChange={(e) => setT(e.target.value)} placeholder="Décris les clients que tu veux, en une phrase" className="flex-1 min-w-0 rounded-xl border border-line bg-paper px-4 py-3 text-[16px] outline-none focus:border-ink-faint" />
        <Button type="submit" variant="accent" disabled={t.trim().length < 8}>Trouver ces clients</Button>
      </form>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {IDEES.map((x) => <button key={x} type="button" onClick={() => setT(x)} className="rounded-full border border-line px-3 py-1 text-[13px] text-ink-soft hover:text-ink hover:border-ink-faint">{x}</button>)}
      </div>
    </section>
  );
}

/** Ton public : Bingoo! teste plusieurs types de clients, garde ceux qui répondent, met en pause les autres et ajoute de nouvelles pistes. */
const ETAT = { marche: ["Ça marche", "bg-good-soft text-good"], en_test: ["En test", "bg-accent-soft text-accent-dark"], a_lancer: ["Bientôt contactée", "bg-paper text-ink-soft"], pause: ["En pause", "bg-[#EFEEEA] text-ink-soft"] };
function Public() {
  const { ws } = useWs();
  const toast = useToast();
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fn("r/ciblage", { workspace_id: ws.id }).then(setD).catch(() => setD(null)); }, [ws.id]);
  if (!d?.stats?.length) return null;
  const run = async () => {
    setBusy(true);
    try { const r = await fn("r/ciblage", { workspace_id: ws.id, run: true }); setD(r); toast(r.actions?.length ? `${r.actions.length} changement${r.actions.length > 1 ? "s" : ""} dans ton ciblage` : "Rien à changer pour l'instant", "good"); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const order = { marche: 0, en_test: 1, a_lancer: 2, pause: 3 };
  return (
    <section aria-label="Ton public" className="mb-6 rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">Ton public</p>
        <button onClick={run} disabled={busy} className="text-[13px] text-ink-soft underline hover:text-ink disabled:opacity-50">{busy ? "Analyse…" : "Revoir maintenant"}</button>
      </div>
      <p className="text-[13px] text-ink-soft mt-0.5">Bingoo! teste plusieurs types de clients, garde ceux qui répondent et en essaie de nouveaux chaque semaine. Tu n'as rien à faire.</p>
      <ul className="mt-3 divide-y divide-line">
        {[...d.stats].sort((a, b) => order[a.etat] - order[b.etat] || b.taux - a.taux).map((t) => (
          <li key={t.id} className="py-2 flex items-center gap-3 text-[14px]">
            <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold", ETAT[t.etat][1])}>{ETAT[t.etat][0]}</span>
            <span className="flex-1 min-w-0 truncate">{t.label}</span>
            <span className="shrink-0 text-[12.5px] text-ink-soft tnum">{t.etat === "pause" ? t.note : t.contactes ? `${t.positifs} réponse${t.positifs > 1 ? "s" : ""} positive${t.positifs > 1 ? "s" : ""} sur ${t.contactes}` : ""}</span>
          </li>
        ))}
      </ul>
      {d.journal?.length > 0 && <p className="mt-2 text-[12.5px] text-ink-faint">Dernier changement : {d.journal[0].texte}</p>}
    </section>
  );
}

/** Appel de démarrage offert : 30 minutes pour régler la cible, les messages et viser le premier rendez-vous. Proposé le premier mois. */
function Demarrage() {
  const { ws, reload } = useWs();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ dispo: "", tel: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(!!ws.onboarding_call_at);
  const key = `bingoo-demarrage-masque-${ws.id}`;
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(key) === "1"; } catch { return false; } });
  const age = ws.created_at ? (Date.now() - new Date(ws.created_at).getTime()) / 864e5 : 0;
  if (hidden || age > 30) return null;
  if (done) return <p className="mb-6 rounded-2xl border border-line bg-white px-4 py-3 text-[14.5px] text-ink-soft">Ton appel de démarrage est demandé. On t'écrit pour fixer le créneau.</p>;
  const send = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await fn("r/onboarding-call", { workspace_id: ws.id, ...f }); setDone(true); reload?.(); toast("Demande envoyée", "good"); }
    catch (x) { toast(x.message, "bad"); } finally { setBusy(false); }
  };
  return (
    <section aria-label="Appel de démarrage" className="mb-6 rounded-2xl border border-accent/25 bg-accent-soft/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[560px]">
          <p className="text-[17px] font-semibold text-ink">30 minutes offertes pour bien démarrer</p>
          <p className="mt-1 text-[14.5px] text-ink-soft">Un appel avec l'équipe Bingoo! : on règle ta cible et tes messages ensemble, pour viser ton premier rendez-vous.</p>
        </div>
        <div className="flex gap-2">
          {!open && <Button onClick={() => setOpen(true)}>Réserver mon appel</Button>}
          <button onClick={() => { try { localStorage.setItem(key, "1"); } catch { /* stockage indisponible */ } setHidden(true); }} className="rounded-lg px-3 py-2 text-[14px] text-ink-soft hover:text-ink">Plus tard</button>
        </div>
      </div>
      {open && (
        <form onSubmit={send} className="mt-4 grid gap-2.5 sm:grid-cols-[1fr_200px_auto]">
          <label className="sr-only" htmlFor="dm-dispo">Tes disponibilités</label>
          <input id="dm-dispo" value={f.dispo} onChange={(e) => setF({ ...f, dispo: e.target.value })} placeholder="Tes disponibilités (ex. mardi ou jeudi matin)" className="rounded-lg border border-line bg-white px-3 py-2.5 text-[15px]" />
          <label className="sr-only" htmlFor="dm-tel">Ton téléphone (facultatif)</label>
          <input id="dm-tel" value={f.tel} onChange={(e) => setF({ ...f, tel: e.target.value })} placeholder="Téléphone (facultatif)" inputMode="tel" className="rounded-lg border border-line bg-white px-3 py-2.5 text-[15px]" />
          <Button type="submit" disabled={busy}>{busy ? "Envoi…" : "Envoyer ma demande"}</Button>
        </form>
      )}
    </section>
  );
}

/** Le matin en 2 minutes : ce qui attend le client, dans l'ordre, et quand tout est fait, on le dit. */
/** Le bandeau du matin : ton terrain, la chose à faire maintenant, tes anneaux et ta ville. */
function Semaine() {
  const { d } = usePilotage();
  return d ? <BandeauMatin d={d} /> : null;
}

// Le matin en 5 minutes : la liste des choses à faire, dans l'ordre où elles rapportent, avec le temps que ça prend.
// Le point de départ du jour est gardé sur cet appareil pour montrer ce qui est déjà fait.
const SEC = { reponses: 40, valider: 15, linkedin: 8, rappels: 60, rdv: 0, radar: 20 };
function Morning({ s, canSend, wsId, adresse = true }) {
  const items = [
    ["reponses", s.replies, "réponse à traiter", "réponses à traiter", "Réponse déjà proposée : relis, envoie.", "/reponses", "chat"],
    ["valider", s.drafts, "message à valider", "messages à valider", "Un geste par message.", "#prets", "send"],
    ["rappels", s.urgent.due.length, "rappel prévu", "rappels prévus", "Le numéro est sur la fiche.", "/prospects", "clock"],
    ["linkedin", s.li, "invitation LinkedIn à valider", "invitations LinkedIn à valider", "Bingoo! les envoie à ton rythme.", "/linkedin", "send"],
    ["radar", s.opps, "entreprise prête à acheter repérée", "entreprises prêtes à acheter repérées", "Ajoute celles qui t'intéressent : Bingoo! trouve le décideur et écrit.", "/radar", "search"],
    ["rdv", s.urgent.meet.length, "rendez-vous aujourd'hui", "rendez-vous aujourd'hui", s.urgent.meet[0] ? `Le premier à ${new Date(s.urgent.meet[0].starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} : ${s.urgent.meet[0].company ?? ""}` : "", "/agenda", "cal"],
  ];
  const key = `bingoo-matin-${wsId}-${new Date().toISOString().slice(0, 10)}`;
  let depart = {};
  try { depart = JSON.parse(localStorage.getItem(key) || "{}"); } catch { /* stockage indisponible */ }
  for (const [k, n] of items) depart[k] = Math.max(depart[k] ?? 0, n);
  try { localStorage.setItem(key, JSON.stringify(depart)); } catch { /* rien */ }
  const total = items.reduce((t, [k]) => t + (k === "rdv" ? 0 : depart[k]), 0);
  const reste = items.reduce((t, [k, n]) => t + (k === "rdv" ? 0 : n), 0);
  const secondes = items.reduce((t, [k, n]) => t + SEC[k] * n, 0);
  const minutes = Math.max(1, Math.round(secondes / 60));
  const todo = items.filter(([, n]) => n > 0);
  const go = (to) => (e) => { if (to.startsWith("#")) { e.preventDefault(); document.getElementById(to.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }); } };

  return (
    <section aria-label="Ton matin" className="mb-6 rounded-3xl border border-line bg-white p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[19px] font-semibold">{reste ? `À faire maintenant · environ ${minutes} min` : "Tout est fait pour aujourd'hui."}</h2>
        {total > 0 && <span className="text-sm text-ink-soft tnum">{total - reste} sur {total} fait{total - reste > 1 ? "s" : ""}</span>}
      </div>
      {total > 0 && <div className="mt-2 h-2 rounded-full bg-paper overflow-hidden" aria-hidden><div className="h-full rounded-full bg-good transition-all" style={{ width: `${Math.round(((total - reste) / total) * 100)}%` }} /></div>}
      {!canSend && <Link to="/connexions" className="mt-3 flex items-center gap-3 rounded-2xl bg-accent-soft px-4 py-3 font-semibold"><Ico n="send" className="w-5 h-5 text-accent" />Dernière étape : connecter ta boîte mail (2 min)</Link>}
      {canSend && !adresse && <Link to="/reglages" className="mt-3 flex items-center gap-3 rounded-2xl bg-accent-soft px-4 py-3 font-semibold"><Ico n="send" className="w-5 h-5 text-accent" />Ajoute l'adresse postale de ton entreprise : sans elle, rien ne part (30 s)</Link>}
      {!todo.length ? <p className="mt-2 text-[15px] text-ink-soft">Bingoo! continue de chercher pour toi ; les nouveautés arrivent ici, et sur ton téléphone si tu actives les notifications.</p> : (
        <ul className="mt-3 divide-y divide-line">
          {todo.map(([k, n, a, b, aide, to, icon]) => {
            const inner = (
              <>
                <span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-accent-soft"><Ico n={icon} className="w-5 h-5 text-accent" /></span>
                <span className="min-w-0 flex-1"><span className="block font-semibold text-[15.5px]"><span className="tnum">{n}</span> {n > 1 ? b : a}</span>{aide && <span className="block text-[13px] text-ink-soft truncate">{aide}</span>}</span>
                {SEC[k] > 0 && <span className="text-[13px] text-ink-faint tnum shrink-0">{SEC[k] * n < 60 ? `${SEC[k] * n} s` : `${Math.round((SEC[k] * n) / 60)} min`}</span>}
                <span className="text-ink-faint" aria-hidden>›</span>
              </>
            );
            const cls = "flex items-center gap-3 py-3 min-h-[56px] -mx-2 px-2 rounded-xl hover:bg-paper transition";
            return <li key={k}>{to.startsWith("#") ? <a href={to} onClick={go(to)} className={cls}>{inner}</a> : <Link to={to} className={cls}>{inner}</Link>}</li>;
          })}
        </ul>
      )}
    </section>
  );
}

/** La preuve que Bingoo! travaille : ce qu'il a fait ces 7 derniers jours, en chiffres réels, et quand il a cherché pour la dernière fois. */
const FAIT = { recherche: "search", enquete: "user", enquete_plus: "user", credit_email: "user", redaction: "send", envoi: "send", radar: "search", radar_scan: "search", fit: "check", ciblage: "check" };
function Travail({ s }) {
  const rows = s.rows ?? [];
  const nb = (kinds, re) => rows.filter((r) => kinds.includes(r.kind) && (!re || re.test(r.summary ?? ""))).length;
  const trouves = rows.filter((r) => r.kind === "recherche").reduce((n, r) => n + (Number(String(r.summary ?? "").match(/(\d+)\s+nouve/)?.[1]) || 0), 0) || s.found7;
  const lignes = [
    [trouves, "entreprise trouvée dans ta cible", "entreprises trouvées dans ta cible"],
    [nb(["enquete", "enquete_plus", "credit_email"]), "recherche de contact", "recherches de contact"],
    [nb(["credit_email"]) + nb(["enquete"], /e-mail trouvé/i), "e-mail de décideur trouvé", "e-mails de décideurs trouvés"],
    [nb(["redaction"]), "message écrit pour toi", "messages écrits pour toi"],
    [s.oppsWeek, "entreprise prête à acheter repérée", "entreprises prêtes à acheter repérées"],
  ].filter(([n]) => n > 0);
  const last = rows.find((r) => FAIT[r.kind]);
  const ago = last ? (() => { const m = Math.round((Date.now() - new Date(last.created_at).getTime()) / 6e4); return m < 60 ? `il y a ${Math.max(1, m)} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`; })() : "";
  return (
    <section aria-label="Ce que Bingoo! a fait" className="mb-6 rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">Ce que Bingoo! a fait pour toi cette semaine</p>
        <Link to="/salaries" className="text-[13px] text-ink-soft underline hover:text-ink">Voir le détail</Link>
      </div>
      {lignes.length ? (
        <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[14.5px]">
          {lignes.map(([n, a, b]) => <li key={a} className="flex gap-2"><span className="text-good">✓</span><span><b className="tnum">{n.toLocaleString("fr-FR")}</b> {n > 1 ? b : a}</span></li>)}
        </ul>
      ) : <p className="mt-1 text-[14px] text-ink-soft">Bingoo! démarre : les premières recherches arrivent cette nuit.</p>}
      {last && <p className="mt-2 text-[12.5px] text-ink-faint">Dernière action : {last.summary} · {ago}</p>}
    </section>
  );
}

/** Une phrase qui dit où on en est, sans jargon. */
function resume(s) {
  const n = [s.replies, s.drafts, s.li, s.opps, s.urgent?.due?.length, s.urgent?.meet?.length].filter((x) => x > 0).length;
  if (n) return `${n} chose${n > 1 ? "s" : ""} t'attend${n > 1 ? "ent" : ""} ci-dessous. Bingoo! s'occupe du reste.`;
  return "Rien à faire pour l'instant : Bingoo! cherche, écrit et relance pour toi.";
}

export default function Today() {
  const { ws } = useWs();
  const toast = useToast();
  const { job, run } = useJob(toast);
  const [s, setS] = useState(null);

  const load = useCallback(async () => {
    const c = (q) => q.then((r) => r.count ?? 0);
    const head = (t) => supabase.from(t).select("id", { count: "exact", head: true }).eq("workspace_id", ws.id);
    const P = () => head("prospects");
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const w1 = new Date(Date.now() - 7 * 864e5).toISOString(), w2 = new Date(Date.now() - 14 * 864e5).toISOString();
    const today = new Date().toISOString().slice(0, 10), old = new Date(Date.now() - 4 * 864e5).toISOString();
    const [found, toContact, sent, replied, rdv, client, found7, sent7, replied7, rdv7, opps, oppsWeek, oppsPrev, replies, drafts, li, todo, ready, hard, act, detected, due, quotes, meet, dec, mail, tel, mailDirect] = await Promise.all([
      c(P()), c(P().in("status", ["pret", "a_valider"])),
      c(P().in("status", ["envoye", "repondu", "rdv", "client", "refus"]).not("email", "eq", "")),
      c(P().in("status", ["repondu", "rdv", "client", "refus"])), c(P().in("status", ["rdv", "client"])), c(P().eq("status", "client")),
      c(P().gte("created_at", w1)), c(head("messages").eq("status", "envoye").gte("sent_at", w1)), c(head("replies").gte("created_at", w1)), c(head("meetings").neq("status", "annule").gte("created_at", w1)),
      c(head("radar_opps").eq("status", "nouveau")), c(head("radar_opps").gte("created_at", w1)), c(head("radar_opps").gte("created_at", w2).lt("created_at", w1)),
      c(head("replies").eq("handled", false)), c(head("messages").eq("status", "brouillon")), c(P().eq("linkedin_status", "").neq("linkedin_note", "").not("status", "in", "(ignore,refus)")),
      c(P().eq("status", "nouveau")), c(P().eq("status", "pret")), c(P().eq("status", "sans_email").lt("enrich_level", 2)),
      supabase.from("activity").select("kind, summary, created_at").eq("workspace_id", ws.id).gte("created_at", w1).order("created_at", { ascending: false }).limit(2000),
      supabase.from("radar_opps").select("id, kind, company, summary, city, url, created_at, score, prospect_id, raw, status").eq("workspace_id", ws.id).in("status", ["nouveau", "ajoute"]).neq("kind", "difficulte").order("score", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(12),
      supabase.from("prospects").select("id, name, next_action, next_action_at, phone").eq("workspace_id", ws.id).lte("next_action_at", today).not("status", "in", "(ignore,refus)").order("next_action_at").limit(5),
      supabase.from("quotes").select("id, number, sent_at, status, prospects(name)").eq("workspace_id", ws.id).in("status", ["envoye", "vu"]).lt("sent_at", old).limit(3),
      supabase.from("meetings").select("id, company, starts_at").eq("workspace_id", ws.id).eq("status", "confirme").gte("starts_at", t0.toISOString()).lt("starts_at", new Date(t0.getTime() + 864e5).toISOString()).order("starts_at"),
      c(P().neq("contact_name", "").neq("status", "ignore")), c(P().neq("email", "").neq("status", "ignore")), c(P().neq("phone", "").neq("status", "ignore")),
      c(P().neq("email", "").neq("status", "ignore").not("email", "imatch", GENERIQUE)),
    ]);
    const rows = act.data ?? [];
    const minutes = rows.reduce((m, r) => m + (MINUTES[r.kind] ?? 0), 0);
    setS({ dec, mail, tel, mailDirect, found, toContact, sent, replied, rdv, client, found7, sent7, replied7, rdv7, opps, oppsWeek, oppsPrev, replies, drafts, li, todo, ready, hard,
      rows, minutes, actions: rows.filter((r) => MINUTES[r.kind]).length, detected: (() => { const d = detected.data ?? [], t = new Date().toISOString().slice(0, 10); const top = d.filter((o) => o.raw?.top_day === t); return [...top, ...d.filter((o) => o.raw?.top_day !== t && o.status !== "ajoute" && !o.prospect_id)].slice(0, 3); })(), urgent: { due: due.data ?? [], quotes: quotes.data ?? [], meet: meet.data ?? [] } });
  }, [ws.id]);

  useEffect(() => {
    fn("followups", { workspace_id: ws.id }).catch(() => {}).finally(load);
    const t = setInterval(load, 30000);
    window.addEventListener("kairo:refresh", load);
    return () => { clearInterval(t); window.removeEventListener("kairo:refresh", load); };
  }, [ws.id, load]);

  // Première arrivée : la visite (vidéos de l'équipe, de la carte et du Radar, l'extension…), une seule fois par personne
  const [visite, setVisite] = useState(false);
  useEffect(() => {
    let vu = false;
    try { vu = localStorage.getItem("bingoo-visite") === "1"; } catch { /* rien */ }
    if (vu) return;
    supabase.auth.getUser().then(({ data }) => { if (!data?.user?.user_metadata?.visite_vue) setVisite(true); }).catch(() => {});
  }, []);
  const finVisite = () => {
    setVisite(false);
    try { localStorage.setItem("bingoo-visite", "1"); } catch { /* rien */ }
    supabase.auth.updateUser({ data: { visite_vue: new Date().toISOString() } }).catch(() => {});
  };

  const hour = new Date().getHours();
  const hello = hour < 18 ? "Bonjour" : "Bonsoir";
  const first = (ws.sender_name || "").split(" ")[0];
  const trend = s && s.oppsPrev > 0 ? Math.round(((s.oppsWeek - s.oppsPrev) / s.oppsPrev) * 100) : null;

  return (
    <div className="max-w-4xl">
      {visite && <Visite onFin={finVisite} />}
      <header className="mb-6">
        <h1 className="font-black text-[40px] sm:text-[52px] leading-none tracking-tight flex items-start gap-1" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>
          {hello}{first ? ` ${first}` : ""} !<Sparks className="w-9 h-9 sm:w-11 sm:h-11 -mt-2" />
        </h1>
        <p className="text-ink-soft text-[17px] mt-3">{s ? resume(s) : "Ce qui t'attend aujourd'hui."}</p>
      </header>

      {/* Une page simple, dans l'ordre où on s'en sert : 1. ce qu'il y a à faire, 2. ce que ça donne, 3. trouver plus de clients.
          Tout le reste (ta ville, l'activité de la nuit, les opportunités, les chiffres détaillés) est replié plus bas. */}
      {s && <Travail s={s} />}
      {s && <Morning s={s} wsId={ws.id} canSend={ws.domain_status === "verified" || !!ws.integrations?.mailbox?.ok} adresse={!!ws.postal_address} />}

      <h2 className="text-[19px] font-semibold mb-3 mt-2">Tes résultats</h2>
      {s && <Contacts s={s} />}

      <h2 className="text-[19px] font-semibold mb-3">Trouver d'autres clients</h2>
      <Decris />
      <Public />
      <Demarrage />
      <PushTel compact />
      {/* Le bandeau de la semaine (et ta ville) n'apparaît qu'avec assez d'envois pour vouloir dire quelque chose */}
      {s && s.sent >= 20 && <div className="hidden sm:block"><Semaine /></div>}

      <details className="group mb-6 rounded-2xl border border-line bg-white">
        <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3">
          <span className="font-semibold">Le détail : réponses, messages prêts, opportunités, activité de la nuit</span>
          <span className="text-sm text-ink-soft group-open:hidden">Afficher</span><span className="text-sm text-ink-soft hidden group-open:inline">Masquer</span>
        </summary>
        <div className="px-4 pb-4 pt-1">
          <TodayFeed />
          {s && s.detected.length > 0 && (
            <section className="mb-8">
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h2 className="text-[19px] font-semibold">Nouvelles opportunités{s.opps > 0 && <span className="ml-2 text-ink-faint font-normal">{s.opps}</span>}</h2>
                <Link to="/radar" className="text-sm text-ink-soft hover:text-ink hover:underline underline-offset-4">Toutes les opportunités</Link>
              </div>
              <Detected rows={s.detected} onPrepared={load} />
            </section>
          )}
          {s && <Urgent u={s.urgent} />}
        </div>
      </details>

      {s && (
        <details className="group mt-2 rounded-2xl border border-line bg-white">
          <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3">
            <span className="font-semibold">Ta semaine en chiffres</span>
            <span className="text-sm text-ink-soft group-open:hidden">Afficher</span><span className="text-sm text-ink-soft hidden group-open:inline">Masquer</span>
          </summary>
          <div className="px-4 pb-5">
            <section className="py-2 mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-y-4 lg:divide-x divide-line">
              <Stat icon="search" label="Trouvés" value={s.found} delta={s.found7} />
              <Stat icon="send" label="À contacter" value={s.toContact} delta={null} />
              <Stat icon="check" label="Contactés" value={s.sent} delta={s.sent7} />
              <Stat icon="chat" label="Réponses" value={s.replied} delta={s.replied7} />
              <Stat icon="cal" label="RDV" value={s.rdv} delta={s.rdv7} accent />
              <Stat icon="users" label="Clients" value={s.client} delta={null} accent />
            </section>
            {(s.ready > 0 || s.todo > 0 || s.hard > 0) && (
              <div className="mt-4 rounded-2xl border border-dashed border-line p-4">
                <p className="font-semibold">Aller plus vite</p>
                <p className="text-[13px] text-ink-soft mt-0.5">Bingoo! le fait tout seul en semaine ; ces boutons lancent le travail tout de suite. Rien n'est envoyé sans toi.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.ready > 0 && <Button quota="redaction" loading={job?.key === "draft"} disabled={!!job} onClick={() => run({ key: "draft", action: "draft", body: { workspace_id: ws.id, count: 5 }, rounds: Math.ceil(Math.min(s.ready, 20) / 5), label: "Rédaction", done: (n) => `${plural(n, "message rédigé", "messages rédigés")}, à valider` })}>{job?.key === "draft" ? job.text : `Rédiger ${fmtN(Math.min(s.ready, 20))} messages`}</Button>}
                  {s.todo > 0 && <Button quota="enquete" loading={job?.key === "enrich"} disabled={!!job} onClick={() => run({ key: "enrich", action: "m/enrich", body: { workspace_id: ws.id, count: 4 }, rounds: 3, label: "Enquête", done: (n, f) => `${f} e-mails trouvés sur ${n} prospects` })}>{job?.key === "enrich" ? job.text : `Trouver les contacts (${fmtN(s.todo)})`}</Button>}
                  {s.hard > 0 && <Button quota="enquete_plus" loading={job?.key === "deep"} disabled={!!job} onClick={() => run({ key: "deep", action: "enrich-deep", body: { workspace_id: ws.id }, rounds: 5, label: "Enquête approfondie", done: (n, f) => `${f} e-mails trouvés sur ${n} prospects` })}>{job?.key === "deep" ? job.text : `Creuser ${fmtN(Math.min(s.hard, 5))} prospects sans e-mail`}</Button>}
                  <Button quota="recherche" loading={job?.key === "search"} disabled={!!job} onClick={() => run({ key: "search", action: "search", body: { workspace_id: ws.id, pages: 2 }, rounds: 1, label: "Recherche", done: (n) => `${plural(n, "nouveau prospect", "nouveaux prospects")}` })}>{job?.key === "search" ? job.text : "Chercher de nouvelles entreprises"}</Button>
                </div>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
