function Ecran() {
  const R = useCollection("rendezvous"), P = useCollection("prestations");
  const [vue, setVue] = useState("colonnes"), [m, setM] = useState(null), [filtre, setFiltre] = useState("avenir");
  const auj = new Date().toISOString().slice(0, 10);
  const STAT = [["demande", "À confirmer"], ["confirme", "Confirmé"], ["termine", "Terminé"], ["annule", "Annulé"]];
  const COUL = { demande: "orange", confirme: "bleu", termine: "vert", annule: "gris" };
  const nomP = (id) => P.rows.find((p) => p.id === id)?.nom ?? "—";
  const L = R.rows.filter((r) => filtre === "tous" ? true : filtre === "avenir" ? r.date >= auj : r.date < auj).sort((a, b) => (filtre === "passes" ? -1 : 1) * (a.date + a.heure).localeCompare(b.date + b.heure));
  const enregistrer = async () => { const { id, created_at, updated_at, ...d } = m; if (!d.client_nom || !d.date) { toast("Nom et date obligatoires", "bad"); return; } if (id) await R.update(id, d); else await R.add(d); setM(null); toast("Enregistré"); };
  const presta = (id) => { const p = P.rows.find((x) => x.id === id); setM({ ...m, prestation_id: id, montant: p?.prix ?? m.montant, duree: p?.duree ?? m.duree }); };
  if (R.loading) return html`<${ui.Loading}/>`;
  return html`<${ui.Page} titre=${V.rdvs} sous="De la demande à la fin : fais glisser chaque carte à son étape." actions=${html`<${ui.Tabs} valeur=${vue} onChange=${setVue} onglets=${[["colonnes", "Colonnes"], ["liste", "Liste"]]}/><${ui.Button} onClick=${() => setM({ client_nom: "", client_email: "", prestation_id: "", date: auj, heure: "09:00", statut: "confirme", montant: 0, intervenant: "", notes: "" })}>Ajouter</${ui.Button}>`}>
    <div class="mb-4"><${ui.Tabs} valeur=${filtre} onChange=${setFiltre} onglets=${[["avenir", "À venir"], ["passes", "Passés"], ["tous", "Tous"]]}/></div>
    ${vue === "colonnes" ? html`<${ui.Kanban} colonnes=${STAT} lignes=${L} champ="statut" onDeplacer=${(id, s) => R.update(id, { statut: s })} onClick=${(r) => setM({ ...r })} rendu=${(r) => html`<p class="font-medium">${r.client_nom}</p><p class="text-xs text-slate-500 mt-0.5">${fmt.date(r.date)} · ${r.heure}</p><p class="text-xs text-slate-500">${nomP(r.prestation_id)}</p><p class="mt-1.5 text-sm font-semibold">${fmt.eur(r.montant)}</p>`}/>`
    : html`<${ui.Card}><${ui.Table} lignes=${L} onClick=${(r) => setM({ ...r })} colonnes=${[{ cle: "date", label: "Date" }, { cle: "heure", label: "Heure" }, { cle: "client_nom", label: V.client }, { label: V.presta, rendu: (r) => nomP(r.prestation_id) }, { cle: "intervenant", label: V.intervenant }, { cle: "montant", label: "Montant", rendu: (r) => fmt.eur(r.montant) }, { cle: "statut", label: "Statut", rendu: (r) => html`<${ui.Badge} couleur=${COUL[r.statut]}>${(STAT.find((s) => s[0] === r.statut) ?? ["", r.statut])[1]}</${ui.Badge}>` }]}/></${ui.Card}>`}
    <${ui.Modal} open=${!!m} onClose=${() => setM(null)} titre=${m?.id ? m.client_nom : "Ajouter : " + V.rdv.toLowerCase()} actions=${html`${m?.id && html`<${ui.Button} variant="danger" onClick=${async () => { if (confirm("Supprimer ?")) { await R.remove(m.id); setM(null); } }}>Supprimer</${ui.Button}>`}<${ui.Button} variant="secondary" onClick=${() => setM(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
      ${m && html`<div class="grid sm:grid-cols-2 gap-3">
        <${ui.Input} label=${V.client} value=${m.client_nom} onInput=${(v) => setM({ ...m, client_nom: v })}/>
        <${ui.Input} label="E-mail" type="email" value=${m.client_email} onInput=${(v) => setM({ ...m, client_email: v })}/>
        <${ui.Select} label=${V.presta} value=${m.prestation_id} onChange=${presta} options=${[["", "Choisir…"], ...P.rows.map((p) => [p.id, p.nom])]}/>
        <${ui.Input} label="Montant (€)" type="number" value=${m.montant} onInput=${(v) => setM({ ...m, montant: v })}/>
        <${ui.Input} label="Date" type="date" value=${m.date} onInput=${(v) => setM({ ...m, date: v })}/>
        <${ui.Input} label="Heure" value=${m.heure} onInput=${(v) => setM({ ...m, heure: v })}/>
        <${ui.Input} label=${V.intervenant} value=${m.intervenant} onInput=${(v) => setM({ ...m, intervenant: v })}/>
        <${ui.Select} label="Statut" value=${m.statut} onChange=${(v) => setM({ ...m, statut: v })} options=${STAT}/>
        <div class="sm:col-span-2"><${ui.Textarea} label="Notes" value=${m.notes} onInput=${(v) => setM({ ...m, notes: v })}/></div></div>`}
    </${ui.Modal}>
  </${ui.Page}>`;
}
