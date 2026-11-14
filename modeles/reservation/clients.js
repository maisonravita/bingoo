function Ecran() {
  const C = useCollection("clients"), R = useCollection("rendezvous");
  const [m, setM] = useState(null);
  const stats = (c) => { const L = R.rows.filter((r) => r.client_id === c.id || (r.client_nom && r.client_nom === c.nom)); const faits = L.filter((r) => r.statut === "termine"); return { n: L.length, ca: faits.reduce((a, r) => a + (Number(r.montant) || 0), 0), dernier: L.filter((r) => r.date <= new Date().toISOString().slice(0, 10) && r.statut !== "annule").map((r) => r.date).sort().pop() ?? null, L }; };
  const lignes = C.rows.map((c) => ({ ...c, ...stats(c) }));
  const enregistrer = async () => { const { id, created_at, updated_at, n, ca, dernier, L, ...d } = m; if (!d.nom) { toast("Le nom est obligatoire", "bad"); return; } if (id) await C.update(id, d); else await C.add(d); setM(null); toast("Enregistré"); };
  if (C.loading) return html`<${ui.Loading}/>`;
  const top = [...lignes].sort((a, b) => b.ca - a.ca)[0];
  return html`<${ui.Page} titre=${V.clients} sous=${"Ton fichier " + V.clients.toLowerCase() + ", leur historique et ce qu'ils t'ont rapporté."} actions=${html`<${ui.Button} onClick=${() => setM({ nom: "", email: "", telephone: "", notes: "" })}>Ajouter</${ui.Button}>`}>
    <div class="grid sm:grid-cols-3 gap-4 mb-4"><${ui.Stat} label=${V.clients} valeur=${C.rows.length} icone="contacts"/><${ui.Stat} label="Fidèles (3 visites ou plus)" valeur=${lignes.filter((c) => c.n >= 3).length} icone="etoile"/><${ui.Stat} label="Meilleur" valeur=${top?.nom ?? "—"} sous=${top ? fmt.eur(top.ca) : ""}/></div>
    <${ui.Card}><${ui.Table} lignes=${lignes} onClick=${(c) => setM({ ...c })} colonnes=${[{ cle: "nom", label: "Nom" }, { cle: "email", label: "E-mail" }, { cle: "telephone", label: "Téléphone" }, { cle: "n", label: V.rdvs }, { cle: "ca", label: "Total", rendu: (c) => fmt.eur(c.ca) }, { cle: "dernier", label: "Dernière visite" }]} vide="Personne pour l'instant : ajoute-les ou importe ton fichier."/></${ui.Card}>
    <${ui.Modal} open=${!!m} onClose=${() => setM(null)} titre=${m?.id ? m.nom : "Ajouter : " + V.client.toLowerCase()} actions=${html`${m?.id && html`<${ui.Button} variant="danger" onClick=${async () => { if (confirm("Supprimer ?")) { await C.remove(m.id); setM(null); } }}>Supprimer</${ui.Button}>`}<${ui.Button} variant="secondary" onClick=${() => setM(null)}>Fermer</${ui.Button}><${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
      ${m && html`<div class="grid sm:grid-cols-2 gap-3"><${ui.Input} label="Nom" value=${m.nom} onInput=${(v) => setM({ ...m, nom: v })}/><${ui.Input} label="E-mail" value=${m.email} onInput=${(v) => setM({ ...m, email: v })}/><${ui.Input} label="Téléphone" value=${m.telephone} onInput=${(v) => setM({ ...m, telephone: v })}/><div class="sm:col-span-2"><${ui.Textarea} label="Notes" value=${m.notes} onInput=${(v) => setM({ ...m, notes: v })}/></div></div>
      ${m.L?.length > 0 && html`<p class="mt-4 text-sm font-semibold">Historique</p><div class="mt-1 max-h-48 overflow-auto divide-y divide-slate-100 text-sm">${[...m.L].sort((a, b) => b.date.localeCompare(a.date)).map((r) => html`<div class="flex justify-between py-1.5"><span>${fmt.date(r.date)} · ${r.heure}</span><span class="text-slate-500">${fmt.eur(r.montant)}</span></div>`)}</div>`}`}
    </${ui.Modal}>
  </${ui.Page}>`;
}
