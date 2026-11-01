import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button, Field, Input, Spinner, Textarea } from "../components/ui";
import { cx } from "../lib/utils";

const URL_ = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export async function pub(action, body) {
  const res = await fetch(`${URL_}/functions/v1/k/${action}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || "Erreur réseau, réessayez");
  return data;
}

export default function PublicBooking() {
  const loc = useLocation();
  const slug = loc.pathname.split("/")[2];
  const t = new URLSearchParams(loc.search).get("t");
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState("");
  const [day, setDay] = useState(null);
  const [slot, setSlot] = useState(null);
  const [f, setF] = useState({ name: "", email: "", company: "", phone: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  useEffect(() => {
    pub("public-booking", { slug, t }).then((d) => { setInfo(d); if (d.prefill) setF((x) => ({ ...x, ...Object.fromEntries(Object.entries(d.prefill).map(([k, v]) => [k, v ?? ""])) })); }).catch((e) => setErr(e.message));
  }, [slug, t]);
  const days = useMemo(() => {
    const m = new Map();
    for (const s of info?.slots ?? []) { const k = new Date(s).toDateString(); if (!m.has(k)) m.set(k, []); m.get(k).push(s); }
    return [...m.entries()];
  }, [info]);
  useEffect(() => { if (days.length && !day) setDay(days[0][0]); }, [days, day]);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try { const r = await pub("public-book", { slug, t, start: slot, ...f }); setDone(r.label); }
    catch (e2) { setErr(e2.message); if (/pris/.test(e2.message)) { setSlot(null); pub("public-booking", { slug, t }).then(setInfo); } }
    finally { setBusy(false); }
  };

  if (err && !info) return <div className="min-h-full grid place-items-center p-6 text-center"><p className="font-serif text-3xl">{err}</p></div>;
  if (!info) return <div className="min-h-full grid place-items-center"><Spinner /></div>;
  if (done) return (
    <div className="min-h-full grid place-items-center p-6 text-center">
      <div className="max-w-md rise">
        <p className="text-good font-semibold">Rendez-vous confirmé</p>
        <h1 className="font-serif text-5xl leading-tight mt-2">À {done}.</h1>
        <p className="text-ink-soft mt-4">Vous allez recevoir une confirmation par e-mail avec l'invitation pour votre agenda.</p>
      </div>
    </div>
  );
  return (
    <div className="min-h-full px-4 py-10 sm:py-16">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm font-semibold text-accent">{info.company}</p>
        <h1 className="font-serif text-4xl sm:text-5xl leading-[1.05] mt-2">Prendre rendez-vous avec {info.person}</h1>
        <p className="text-ink-soft mt-3">{info.duration} minutes · {info.location}</p>
        {days.length === 0 ? <p className="mt-10">Aucun créneau disponible pour le moment. Répondez simplement à l'e-mail reçu pour convenir d'un moment.</p> : (
          <div className="grid md:grid-cols-[1fr_1.2fr] gap-8 mt-10">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mb-3">1. Choisissez un créneau</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                {days.map(([k, list]) => (
                  <button key={k} onClick={() => { setDay(k); setSlot(null); }} className={cx("shrink-0 rounded-xl border px-3 py-2 text-center w-20", day === k ? "bg-ink text-white border-ink" : "bg-white border-line")}>
                    <span className="block text-xs capitalize">{new Date(list[0]).toLocaleDateString("fr-FR", { weekday: "short" })}</span>
                    <span className="block font-serif text-2xl leading-none mt-1">{new Date(list[0]).getDate()}</span>
                    <span className="block text-xs capitalize">{new Date(list[0]).toLocaleDateString("fr-FR", { month: "short" })}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {(days.find(([k]) => k === day)?.[1] ?? []).map((s) => (
                  <button key={s} onClick={() => setSlot(s)} className={cx("rounded-xl border py-2 text-sm font-semibold tnum", slot === s ? "bg-accent text-white border-accent" : "bg-white border-line hover:border-ink-faint")}>
                    {new Date(s).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </button>
                ))}
              </div>
            </div>
            <form onSubmit={submit} className={cx("space-y-3 transition", !slot && "opacity-40 pointer-events-none")}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mb-1">2. Vos coordonnées</h2>
              {slot && <p className="text-sm font-semibold">{new Date(slot).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p>}
              <Field label="Nom et prénom"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
              <Field label="E-mail professionnel"><Input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
              <Field label="Entreprise / établissement"><Input required value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
              <Field label="Téléphone (facultatif)"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
              <Field label="Un mot sur votre besoin (facultatif)"><Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
              {err && <p className="text-sm text-bad">{err}</p>}
              <Button type="submit" variant="accent" size="lg" loading={busy} className="w-full">Confirmer le rendez-vous</Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
