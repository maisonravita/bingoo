import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button, Input, Spinner } from "../components/ui";
import { pub } from "./PublicBooking";
import { eur2 } from "../lib/labels";

export default function PublicQuote() {
  const token = useLocation().pathname.split("/")[2];
  const [q, setQ] = useState(null);
  const [err, setErr] = useState("");
  const [name, setName] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(null);
  const load = () => pub("public-quote", { token }).then(setQ).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [token]);
  const sign = async (accept) => {
    setBusy(accept ? "sign" : "no"); setErr("");
    try { await pub("public-sign", { token, name, accept }); await load(); } catch (e) { setErr(e.message); } finally { setBusy(null); }
  };
  if (err && !q) return <div className="min-h-full grid place-items-center p-6"><p className="font-serif text-3xl">{err}</p></div>;
  if (!q) return <div className="min-h-full grid place-items-center"><Spinner /></div>;
  const s = q.seller, c = q.client ?? {};
  return (
    <div className="min-h-full px-4 py-8 sm:py-14">
      <article className="max-w-3xl mx-auto bg-white border border-line rounded-3xl p-6 sm:p-10">
        <div className="flex flex-wrap justify-between gap-6">
          <div><p className="font-serif text-3xl">{s.name}</p><p className="text-sm text-ink-soft whitespace-pre-line mt-1">{[s.legal_name, s.address, s.siret && `SIRET ${s.siret}`].filter(Boolean).join("\n")}</p></div>
          <div className="text-right"><p className="text-sm text-ink-soft">Devis</p><p className="font-semibold text-lg">{q.number}</p><p className="text-sm text-ink-soft">Du {new Date(q.created_at).toLocaleDateString("fr-FR")}{q.valid_until && <><br />Valable jusqu'au {new Date(q.valid_until).toLocaleDateString("fr-FR")}</>}</p></div>
        </div>
        <div className="mt-8"><p className="text-sm text-ink-soft">Pour</p><p className="font-semibold">{c.name}</p><p className="text-sm text-ink-soft">{[c.contact_name, c.address].filter(Boolean).join(" · ")}</p></div>
        {q.title && <h1 className="font-serif text-3xl mt-8">{q.title}</h1>}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-ink-soft border-b border-line"><th className="py-2">Prestation</th><th className="text-right">Qté</th><th className="text-right">Prix HT</th><th className="text-right">Total HT</th></tr></thead>
            <tbody>{q.lines.map((l, i) => <tr key={i} className="border-b border-line"><td className="py-2.5">{l.label}</td><td className="text-right tnum">{l.qty} {l.unit}</td><td className="text-right tnum">{eur2(l.price)}</td><td className="text-right tnum">{eur2(l.qty * l.price)}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="mt-4 ml-auto w-64 text-sm space-y-1">
          <p className="flex justify-between"><span>Total HT</span><span className="tnum">{eur2(q.totals.ht)}</span></p>
          <p className="flex justify-between text-ink-soft"><span>TVA {q.vat_rate} %</span><span className="tnum">{eur2(q.totals.tva)}</span></p>
          <p className="flex justify-between font-semibold text-lg pt-1 border-t border-line"><span>Total TTC</span><span className="tnum">{eur2(q.totals.ttc)}</span></p>
          {q.recurring && <p className="text-right text-ink-soft">par mois</p>}
        </div>
        {q.notes && <p className="mt-8 text-sm whitespace-pre-line text-ink-soft">{q.notes}</p>}

        <div className="mt-10 pt-6 border-t border-line">
          {q.status === "signe" ? (
            <p className="text-good font-semibold">✓ Signé par {q.signed_name} le {new Date(q.signed_at).toLocaleString("fr-FR")}. Merci pour votre confiance.</p>
          ) : q.status === "refuse" ? (
            <p className="text-ink-soft">Ce devis a été décliné.</p>
          ) : (
            <div className="space-y-3 max-w-md">
              <p className="font-semibold">Bon pour accord</p>
              <Input placeholder="Votre nom et prénom" value={name} onChange={(e) => setName(e.target.value)} />
              <label className="flex gap-2 text-sm"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-0.5" />J'accepte ce devis et ses conditions, et je suis habilité(e) à engager {c.name}.</label>
              {err && <p className="text-sm text-bad">{err}</p>}
              <div className="flex gap-2"><Button variant="accent" size="lg" disabled={!ok || name.trim().length < 3} loading={busy === "sign"} onClick={() => sign(true)}>Signer le devis</Button><Button variant="ghost" loading={busy === "no"} onClick={() => sign(false)}>Décliner</Button></div>
              <p className="text-xs text-ink-faint">Signature électronique simple : votre nom, la date, l'heure et votre adresse IP sont enregistrés.</p>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
