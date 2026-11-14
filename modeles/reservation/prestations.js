function Ecran() {
  const P = useCollection("prestations"), R = useCollection("rendezvous");
  const [m, setM] = useState(null);
  const enregistrer = async () => { const { id, created_at, updated_at, ...d } = m; if (!d.nom) { toast("Le nom est obligatoire", "bad"); return; } if (id) await P.update(id, d); else await P.add(d); setM(null); toast("Enregistré"); };
  if (P.loading) return html`<${ui.Loading}/>`;
  return html`<${ui.Page} titre=${V.prestas} sous=${"Ce que tu proposes, tes prix et tes durées. Ce sont eux que tes " + V.clients.toLowerCase() + " voient sur ta page de réservation."} actions=${html`<${ui.Button} onClick=${() => setM({ nom: "", prix: 0, duree: 60, description: "", actif: true })}>Ajouter</${ui.Button}>`}>
    ${!P.rows.length ? html`<${ui.Empty} texte="Ajoute ce que tu proposes, avec ton prix et ta durée."/>` : html`<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${P.rows.map((p) => { const n = R.rows.filter((r) => r.prestation_id === p.id && r.statut !== "annule").length; return html`<button onClick=${() => setM({ ...p })} class=${"text-left rounded-2xl border bg-white p-5 hover:shadow-md transition " + (p.actif === false ? "opacity-50 border-dashed border-slate-300" : "border-slate-200")}>
      <div class="flex items-start justify-between gap-3"><p class="font-semibold">${p.nom}</p>${p.actif === false ? html`<${ui.Badge}>Masquée</${ui.Badge}>` : null}</div>
      <p class="mt-1 text-sm text-slate-500 line-clamp-2">${p.description}</p>
      <div class="mt-4 flex items-end justify-between"><p class="text-2xl font-bold">${fmt.eur(p.prix)}</p><p class="text-sm text-slate-500">${p.duree} min · ${n} ${V.rdvs.toLowerCase()}</p></div></button>`; })}</div>`}
    <${ui.Modal} open=${!!m} onClose=${() => setM(null)} titre=${m?.id ? m.nom : "Ajouter : " + V.presta.toLowerCase()} actions=${html`${m?.id && html`<${ui.Button} variant="danger" onClick=${async () => { if (confirm("Supprimer ?")) { await P.remove(m.id); setM(null); } }}>Supprimer</${ui.Button}>`}<${ui.Button} variant="secondary" onClick=${() => setM(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
      ${m && html`<div class="grid sm:grid-cols-2 gap-3"><div class="sm:col-span-2"><${ui.Input} label="Nom" value=${m.nom} onInput=${(v) => setM({ ...m, nom: v })}/></div><${ui.Input} label="Prix (€)" type="number" value=${m.prix} onInput=${(v) => setM({ ...m, prix: v })}/><${ui.Input} label="Durée (minutes)" type="number" value=${m.duree} onInput=${(v) => setM({ ...m, duree: v })}/><div class="sm:col-span-2"><${ui.Textarea} label="Description" value=${m.description} onInput=${(v) => setM({ ...m, description: v })}/></div><label class="flex items-center gap-2 text-sm"><input type="checkbox" checked=${m.actif !== false} onChange=${(e) => setM({ ...m, actif: e.target.checked })}/> Visible sur la page de réservation</label></div>`}
    </${ui.Modal}>
  </${ui.Page}>`;
}
