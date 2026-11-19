function Ecran() {
  const T = useCollection("taches"), C = useCollection("contacts");
  const [vue, setVue] = useState("faire"), [m, setM] = useState(null);
  const auj = new Date().toISOString().slice(0, 10);
  const TYPES = [["appel", "Appel"], ["email", "E-mail"], ["rdv", "Rendez-vous"], ["relance", "Relance"], ["autre", "Autre"]];
  const EMO = { appel: "📞", email: "✉️", rdv: "🤝", relance: "🔁", autre: "📌" };
  const aFaire = T.rows.filter((t) => !t.fait).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const lignes = vue === "faire" ? aFaire : vue === "retard" ? aFaire.filter((t) => t.date && t.date < auj) : T.rows.filter((t) => t.fait).sort((a, b) => String(b.fait_le ?? b.date).localeCompare(String(a.fait_le ?? a.date)));
  const basculer = (t) => T.update(t.id, t.fait ? { fait: false, fait_le: null } : { fait: true, fait_le: auj }).then(() => toast(t.fait ? "Tâche rouverte" : "Tâche terminée"));
  const enregistrer = async () => { const { id, created_at, updated_at, ...d } = m; if (!d.titre) { toast("Décrivez la tâche", "bad"); return; } d.contact_nom = C.rows.find((c) => c.id === d.contact_id)?.nom ?? ""; if (id) await T.update(id, d); else await T.add({ ...d, fait: false }); setM(null); toast("Enregistré"); };
  const supprimer = async () => { if (!await demander("Supprimer cette tâche ?", { ok: "Supprimer", danger: true })) return; await T.remove(m.id); setM(null); };
  if (T.loading) return html`<${ui.Loading}/>`;
  return html`<${ui.Page} titre="Tâches" sous="Vos appels, relances et rendez-vous à ne pas oublier." actions=${html`<${ui.Button} onClick=${() => setM({ titre: "", type: "appel", contact_id: "", date: auj, notes: "" })}>Nouvelle tâche</${ui.Button}>`}>
    <div class="mb-4"><${ui.Tabs} valeur=${vue} onChange=${setVue} onglets=${[["faire", "À faire (" + aFaire.length + ")"], ["retard", "En retard (" + aFaire.filter((t) => t.date && t.date < auj).length + ")"], ["calendrier", "Calendrier"], ["faites", "Faites"]]}/></div>
    ${vue === "calendrier" ? html`<${ui.Calendrier} lignes=${aFaire} champ="date" rendu=${(t) => (EMO[t.type] ?? "📌") + " " + t.titre} onClick=${(t) => setM({ ...t })} onJour=${(d) => setM({ titre: "", type: "appel", contact_id: "", date: d, notes: "" })}/>` : html`<${ui.Liste} lignes=${lignes} onClick=${(t) => setM({ ...t })} vide=${vue === "retard" ? "Aucune tâche en retard, bravo." : "Aucune tâche ici."} rendu=${(t) => ({ emoji: EMO[t.type] ?? "📌", titre: t.titre, sous: (t.contact_nom ? t.contact_nom + " · " : "") + (t.date ? fmt.date(t.date) : "sans date"), couleur: !t.fait && t.date && t.date < auj ? "rouge" : null, droite: html`<${ui.Button} variant=${t.fait ? "ghost" : "secondary"} onClick=${(e) => { e.stopPropagation(); basculer(t); }}>${t.fait ? "Rouvrir" : "Fait"}</${ui.Button}>` })}/>`}
    <${ui.Modal} open=${!!m} onClose=${() => setM(null)} titre=${m?.id ? "Modifier la tâche" : "Nouvelle tâche"} actions=${html`${m?.id && html`<${ui.Button} variant="danger" onClick=${supprimer}>Supprimer</${ui.Button}>`}<${ui.Button} variant="secondary" onClick=${() => setM(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
      ${m && html`<div class="grid sm:grid-cols-2 gap-3"><div class="sm:col-span-2"><${ui.Input} label="Tâche" value=${m.titre} placeholder="Ex. Rappeler pour le devis" onInput=${(v) => setM({ ...m, titre: v })}/></div><${ui.Select} label="Type" value=${m.type} onChange=${(v) => setM({ ...m, type: v })} options=${TYPES}/><${ui.Input} label="Date" type="date" value=${m.date} onInput=${(v) => setM({ ...m, date: v })}/><div class="sm:col-span-2"><${ui.Select} label="Contact" value=${m.contact_id} onChange=${(v) => setM({ ...m, contact_id: v })} options=${[["", "Aucun"], ...C.rows.map((c) => [c.id, c.nom])]}/></div><div class="sm:col-span-2"><${ui.Textarea} label="Notes" value=${m.notes} onInput=${(v) => setM({ ...m, notes: v })}/></div></div>`}
    </${ui.Modal}>
  </${ui.Page}>`;
}
