function Ecran() {
  const L = useCollection("inscrits");
  const [q, setQ] = useState(""), [mail, setMail] = useState(null), [busy, setBusy] = useState(false);
  if (L.loading) return html`<${ui.Loading}/>`;
  const ql = q.trim().toLowerCase();
  const vus = [...L.rows].filter((x) => !ql || ((x.prenom ?? "") + " " + x.email).toLowerCase().includes(ql)).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const exporter = () => {
    const csv = "prenom;email;source;inscrit_le\n" + L.rows.map((x) => [x.prenom ?? "", x.email, x.source ?? "", String(x.created_at).slice(0, 10)].map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(";")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent("﻿" + csv); a.download = "inscrits.csv"; document.body.appendChild(a); a.click(); a.remove();
    toast(L.rows.length + " inscrits exportés");
  };
  const envoyer = async () => {
    if (!mail.sujet.trim() || !mail.texte.trim()) { toast("Écrivez un objet et un message", "bad"); return; }
    if (!(await demander("Envoyer ce message aux " + L.rows.length + " inscrits ?", { ok: "Envoyer" }))) return;
    setBusy(true);
    try { let n = 0; for (const x of L.rows) { await email({ a: x.email, sujet: mail.sujet, texte: (x.prenom ? "Bonjour " + x.prenom + ",\n\n" : "Bonjour,\n\n") + mail.texte }); n++; } setMail(null); toast("Message envoyé à " + n + " inscrits"); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  return html`<div class="anim">
    <${Entete} titre="Inscrits" sous=${L.rows.length + " personnes attendent votre lancement."}><${Recherche} valeur=${q} onInput=${setQ} placeholder="Rechercher…"/><${Bouton} secondaire onClick=${exporter}>Exporter</${Bouton}><${Bouton} onClick=${() => setMail({ sujet: "C'est ouvert !", texte: "Vous attendiez ce moment : c'est ouvert. " })}>Écrire à tous</${Bouton}></${Entete}>
    ${vus.length ? html`<${Carte}><div class="divide-y divide-slate-100">${vus.map((x) => html`<div class="flex items-center gap-3 py-2.5"><${Avatar} nom=${x.prenom || x.email}/><div class="min-w-0 flex-1"><p class="truncate font-medium">${x.prenom || "—"}</p><p class="truncate text-sm text-slate-500">${x.email}</p></div>${x.source && x.source !== "direct" && html`<${Pill} ton="bleu">${x.source}</${Pill}>`}<span class="hidden sm:block text-xs text-slate-500">${ilya(x.created_at)}</span><${Menu} actions=${[["Copier l'e-mail", () => { try { navigator.clipboard.writeText(x.email).then(() => toast("E-mail copié")); } catch (e) { toast(x.email); } }], ["Retirer de la liste", async () => { if (await demander("Retirer " + x.email + " de la liste ?", { ok: "Retirer", danger: true })) { await L.remove(x.id); toast("Inscrit retiré"); } }, true]]}/></div>`)}</div></${Carte}>`
      : html`<${Vide} icone="contacts" titre=${q ? "Personne ne correspond" : "Pas encore d'inscrit"} texte="Partagez le lien de votre page : chaque inscription arrive ici."/>`}
    <${ui.Modal} open=${!!mail} onClose=${() => !busy && setMail(null)} titre="Écrire à tous les inscrits" actions=${html`<${ui.Button} variant="secondary" onClick=${() => setMail(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${envoyer} disabled=${busy}>${busy ? "Envoi…" : "Envoyer"}</${ui.Button}>`}>
      ${mail && html`<div class="space-y-3"><${ui.Input} label="Objet" value=${mail.sujet} onInput=${(v) => setMail({ ...mail, sujet: v })}/><${ui.Textarea} label="Message (« Bonjour {prénom}, » est ajouté au début)" rows=${6} value=${mail.texte} onInput=${(v) => setMail({ ...mail, texte: v })}/><p class="text-xs text-slate-500">Un e-mail par personne, envoyé depuis votre site.</p></div>`}
    </${ui.Modal}>
  </div>`;
}
