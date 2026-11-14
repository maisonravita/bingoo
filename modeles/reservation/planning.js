function Ecran() {
  const R = useCollection("rendezvous"), P = useCollection("prestations");
  const [m, setM] = useState(null);
  const vide = { client_nom: "", client_email: "", prestation_id: "", date: "", heure: "09:00", intervenant: "", statut: "confirme", montant: 0, duree: 60, notes: "" };
  const ouvrir = (r) => setM(r ? { ...r } : { ...vide });
  const presta = (id) => { const p = P.rows.find((x) => x.id === id); setM({ ...m, prestation_id: id, montant: p?.prix ?? m.montant, duree: p?.duree ?? m.duree }); };
  const enregistrer = async () => {
    if (!m.client_nom || !m.date) { toast("Indique au moins le nom et la date", "bad"); return; }
    const { id, created_at, updated_at, ...d } = m;
    if (id) await R.update(id, d); else await R.add(d);
    toast("Enregistré"); setM(null);
  };
  const supprimer = async () => { if (confirm("Supprimer ?")) { await R.remove(m.id); setM(null); toast("Supprimé"); } };
  const STAT = [["demande", "À confirmer"], ["confirme", "Confirmé"], ["termine", "Terminé"], ["annule", "Annulé"]];
  const heures = Array.from({ length: 23 }, (_, i) => { const h = 8 + Math.floor(i / 2), mn = i % 2 ? "30" : "00"; return String(h).padStart(2, "0") + ":" + mn; });
  if (R.loading) return html`<${ui.Loading}/>`;
  return html`<${ui.Page} titre="Planning" sous="Ton mois en un coup d'œil. Clique sur un jour pour ajouter quelque chose." actions=${html`<${ui.Button} icone="agenda" onClick=${() => ouvrir(null)}>Ajouter</${ui.Button}>`}>
    <${ui.Calendrier} lignes=${R.rows.filter((r) => r.statut !== "annule").sort((a, b) => String(a.heure).localeCompare(String(b.heure)))} champ="date" rendu=${(r) => r.heure + " " + r.client_nom} onClick=${ouvrir} onJour=${(d) => setM({ ...vide, date: d })}/>
    <${ui.Modal} open=${!!m} onClose=${() => setM(null)} titre=${m?.id ? "Modifier" : "Ajouter : " + V.rdv.toLowerCase()} actions=${html`${m?.id && html`<${ui.Button} variant="danger" onClick=${supprimer}>Supprimer</${ui.Button}>`}<${ui.Button} variant="secondary" onClick=${() => setM(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
      ${m && html`<div class="grid sm:grid-cols-2 gap-3">
        <${ui.Input} label=${V.client} value=${m.client_nom} onInput=${(v) => setM({ ...m, client_nom: v })}/>
        <${ui.Input} label="E-mail" type="email" value=${m.client_email} onInput=${(v) => setM({ ...m, client_email: v })}/>
        <${ui.Select} label=${V.presta} value=${m.prestation_id} onChange=${presta} options=${[["", "Choisir…"], ...P.rows.map((p) => [p.id, p.nom + " · " + fmt.eur(p.prix)])]}/>
        <${ui.Input} label="Montant (€)" type="number" value=${m.montant} onInput=${(v) => setM({ ...m, montant: v })}/>
        <${ui.Input} label="Date" type="date" value=${m.date} onInput=${(v) => setM({ ...m, date: v })}/>
        <${ui.Select} label="Heure" value=${m.heure} onChange=${(v) => setM({ ...m, heure: v })} options=${heures}/>
        <${ui.Input} label=${V.intervenant} value=${m.intervenant} onInput=${(v) => setM({ ...m, intervenant: v })}/>
        <${ui.Select} label="Statut" value=${m.statut} onChange=${(v) => setM({ ...m, statut: v })} options=${STAT}/>
        <div class="sm:col-span-2"><${ui.Textarea} label="Notes" value=${m.notes} onInput=${(v) => setM({ ...m, notes: v })}/></div>
      </div>`}
    </${ui.Modal}>
  </${ui.Page}>`;
}
