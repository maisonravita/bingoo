import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { FIELDS, guessMapping, parseCsv } from "../lib/csv";
import { Button, Card } from "./ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (s) => String(s ?? "").trim();

export default function ImportCsv({ ws, existing, onDone, onClose, toast }) {
  const [file, setFile] = useState(null);
  const [map, setMap] = useState({});
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);

  const pick = async (f) => {
    if (!f) return;
    if (f.size > 8e6) { toast("Fichier trop lourd (8 Mo maximum)", "bad"); return; }
    const text = await f.text();
    const parsed = parseCsv(text);
    if (!parsed.headers.length || !parsed.rows.length) { toast("Fichier vide ou illisible : enregistre-le au format CSV", "bad"); return; }
    setFile({ name: f.name, ...parsed });
    setMap(guessMapping(parsed.headers));
  };

  const prepared = useMemo(() => {
    if (!file) return null;
    const emails = new Set(existing.map((r) => r.email).filter(Boolean));
    const sirets = new Set(existing.map((r) => r.siret).filter(Boolean));
    const get = (row, k) => (map[k] === undefined || map[k] === "" ? "" : clean(row[map[k]]));
    const out = []; let dup = 0, empty = 0;
    for (const row of file.rows.slice(0, 5000)) {
      const email = get(row, "email").toLowerCase().replace(/^mailto:/, "");
      const contact = get(row, "contact_name") || [get(row, "first_name"), get(row, "last_name")].filter(Boolean).join(" ");
      const name = get(row, "name") || contact;
      if (!name) { empty++; continue; }
      const siret = get(row, "siret").replace(/\s/g, "") || null;
      const okEmail = EMAIL_RE.test(email) ? email : "";
      if ((okEmail && emails.has(okEmail)) || (siret && sirets.has(siret))) { dup++; continue; }
      if (okEmail) emails.add(okEmail);
      if (siret) sirets.add(siret);
      let website = get(row, "website");
      if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
      const li = get(row, "linkedin_url");
      out.push({
        workspace_id: ws.id, target, name: name.slice(0, 200), contact_name: contact.slice(0, 120), contact_role: get(row, "contact_role").slice(0, 120),
        email: okEmail, phone: get(row, "phone").slice(0, 40), website: website.slice(0, 300), address: get(row, "address").slice(0, 300),
        postal_code: get(row, "postal_code").slice(0, 10), city: get(row, "city").slice(0, 120), siret: siret?.slice(0, 14) ?? null,
        siren: get(row, "siren").replace(/\s/g, "").slice(0, 9) || (siret ? siret.slice(0, 9) : null), activity: get(row, "activity").slice(0, 160),
        notes: get(row, "notes").slice(0, 2000), source: "import CSV",
        status: okEmail ? "pret" : "nouveau", enriched_at: okEmail ? new Date().toISOString() : null,
        enrich_note: okEmail ? "Importé avec son e-mail" : "", channel: okEmail ? "email" : "", email_source: okEmail ? "import" : "",
        linkedin_url: /linkedin\.com\/in\//i.test(li) ? li.slice(0, 200) : "",
      });
    }
    return { out, dup, empty, withEmail: out.filter((r) => r.email).length };
  }, [file, map, target, existing, ws.id]);

  const go = async () => {
    if (!prepared?.out.length) return;
    setBusy(true);
    try {
      let done = 0;
      for (let i = 0; i < prepared.out.length; i += 400) {
        const { error, data } = await supabase.from("prospects").upsert(prepared.out.slice(i, i + 400), { onConflict: "workspace_id,siret", ignoreDuplicates: true }).select("id");
        if (error) throw new Error(error.message);
        done += data?.length ?? 0;
      }
      toast(`${done} prospect${done > 1 ? "s" : ""} importé${done > 1 ? "s" : ""}`, "good");
      onDone();
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };

  return (
    <Card className="p-5 sm:p-6 mb-6 rise">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl">Importer des prospects</h2>
          <p className="text-sm text-ink-soft mt-1">Un fichier CSV exporté d'Excel, Google Sheets, d'un CRM ou d'un autre outil. Les doublons (même e-mail ou SIRET) sont ignorés.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
      </div>
      {!file ? (
        <label className="block border-2 border-dashed border-line rounded-2xl p-8 text-center cursor-pointer hover:border-ink-faint">
          <input type="file" accept=".csv,text/csv,.txt" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          <span className="font-semibold">Choisir un fichier CSV</span>
          <span className="block text-sm text-ink-soft mt-1">Dans Excel : Fichier → Enregistrer sous → CSV UTF-8</span>
        </label>
      ) : (
        <>
          <p className="text-sm mb-3"><b>{file.name}</b> · {file.rows.length.toLocaleString("fr-FR")} lignes · vérifie les colonnes reconnues :</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 mb-4">
            {FIELDS.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-sm min-w-0">
                <span className="w-32 shrink-0 text-ink-soft">{f.label}</span>
                <select value={map[f.key] ?? ""} onChange={(e) => setMap((m) => ({ ...m, [f.key]: e.target.value === "" ? "" : Number(e.target.value) }))}
                  className="flex-1 min-w-0 rounded-lg border border-line bg-white px-2 py-1.5 text-sm">
                  <option value="">—</option>
                  {file.headers.map((h, i) => <option key={i} value={i}>{h || `Colonne ${i + 1}`}</option>)}
                </select>
              </label>
            ))}
          </div>
          <label className="flex flex-wrap items-center gap-2 text-sm mb-4">
            <span className="text-ink-soft">Rattacher à la cible</span>
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm">
              <option value="">Aucune (prospects importés)</option>
              {(ws.targets ?? []).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          {prepared && (
            <div className="rounded-xl bg-paper p-3 text-sm mb-4">
              <b>{prepared.out.length}</b> à importer, dont <b>{prepared.withEmail}</b> avec e-mail (prêts à être contactés) et {prepared.out.length - prepared.withEmail} à enquêter.
              {prepared.dup > 0 && <> {prepared.dup} doublon{prepared.dup > 1 ? "s" : ""} ignoré{prepared.dup > 1 ? "s" : ""}.</>}
              {prepared.empty > 0 && <> {prepared.empty} ligne{prepared.empty > 1 ? "s" : ""} sans nom ignorée{prepared.empty > 1 ? "s" : ""}.</>}
              {file.rows.length > 5000 && <> Seules les 5 000 premières lignes sont prises.</>}
            </div>
          )}
          <p className="text-xs text-ink-soft mb-4">En important, tu confirmes que ces contacts sont des professionnels et que tu peux les solliciter (intérêt légitime B2B, RGPD). Chaque e-mail leur permet de s'opposer.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" loading={busy} disabled={!prepared?.out.length || (map.name === undefined && map.contact_name === undefined)} onClick={go}>Importer {prepared?.out.length ?? 0} prospects</Button>
            <Button variant="ghost" onClick={() => setFile(null)}>Changer de fichier</Button>
          </div>
        </>
      )}
    </Card>
  );
}
