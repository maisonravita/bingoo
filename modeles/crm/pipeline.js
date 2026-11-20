function Ecran() {
  const A = useCollection("affaires"), C = useCollection("contacts");
  const [m, setM] = useState(null);
  const ETAPES = [["nouveau", "Nouveau"], ["qualifie", "Qualifié"], ["proposition", "Proposition"], ["negociation", "Négociation"], ["gagne", "Gagné"], ["perdu", "Perdu"]];
  const auj = new Date().toISOString().slice(0, 10);
  const deplacer = async (id, etape) => { const a = A.rows.find((x) => x.id === id); await A.update(id, { etape, ...(etape === "gagne" && !a?.gagnee_le ? { gagnee_le: auj } : {}), ...(etape === "perdu" ? { perdue_le: auj } : {}) }); if (etape === "gagne") { toast("Bravo, affaire gagnée !"); const c = C.rows.find((x) => x.id === a?.contact_id); if (c && c.statut !== "client") await C.update(c.id, { statut: "client" }); } };
  const enregistrer = async () => { const { id, created_at, updated_at, ...d } = m; if (!d.titre) { toast("Donnez un nom à l'affaire", "bad"); return; } const c = C.rows.find((x) => x.id === d.contact_id); d.contact_nom = c?.nom ?? d.contact_nom ?? ""; d.montant = Number(d.montant) || 0; if (d.etape === "gagne" && !d.gagnee_le) d.gagnee_le = auj; if (id) await A.update(id, d); else await A.add(d); setM(null); toast("Enregistré"); };
  const supprimer = async () => { if (!await demander("Supprimer cette affaire ?", { ok: "Supprimer", danger: true })) return; await A.remove(m.id); setM(null); };
  const total = (v) => A.rows.filter((a) => a.etape === v).reduce((s, a) => s + (Number(a.montant) || 0), 0);
  if (A.loading) return html`<${ui.Loading}/>`;
  return html`<${ui.Page} titre="Pipeline" sous="Vos affaires étape par étape. Faites glisser une carte pour la faire avancer." actions=${html`<${ui.Button} onClick=${() => setM({ titre: "", contact_id: "", montant: 0, etape: "nouveau", echeance: "", notes: "" })}>Nouvelle affaire</${ui.Button}>`}>
    <${ui.Kanban} colonnes=${ETAPES} lignes=${A.rows} champ="etape" somme="montant" onDeplacer=${deplacer} onClick=${(a) => setM({ ...a })} rendu=${(a) => html`<div><p class="font-medium leading-snug">${a.contact_nom || "Sans contact"}</p><p class="text-sm text-slate-500">${a.titre}</p><div class="mt-1.5 flex items-center justify-between"><span class="font-semibold tabular-nums">${fmt.eur(a.montant)}</span>${a.echeance && !["gagne", "perdu"].includes(a.etape) && html`<span class=${"text-xs " + (a.echeance < auj ? "text-red-600 font-semibold" : "text-slate-400")}>${fmt.date(a.echeance)}</span>`}</div></div>`}/>
    <${ui.Modal} open=${!!m} onClose=${() => setM(null)} titre=${m?.id ? m.titre : "Nouvelle affaire"} actions=${html`${m?.id && html`<${ui.Button} variant="danger" onClick=${supprimer}>Supprimer</${ui.Button}>`}<${ui.Button} variant="secondary" onClick=${() => setM(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
      ${m && html`<div class="grid sm:grid-cols-2 gap-3"><div class="sm:col-span-2"><${ui.Input} label="Affaire" value=${m.titre} placeholder="Ex. Contrat annuel" onInput=${(v) => setM({ ...m, titre: v })}/></div>
        <${ui.Select} label="Contact" value=${m.contact_id} onChange=${(v) => setM({ ...m, contact_id: v })} options=${[["", "Choisir…"], ...C.rows.map((c) => [c.id, c.nom + (c.entreprise ? " (" + c.entreprise + ")" : "")])]}/>
        <${ui.Input} label="Montant (€)" type="number" value=${m.montant} onInput=${(v) => setM({ ...m, montant: v })}/>
        <${ui.Select} label="Étape" value=${m.etape} onChange=${(v) => setM({ ...m, etape: v })} options=${ETAPES}/>
        <${ui.Input} label="Signature prévue" type="date" value=${m.echeance} onInput=${(v) => setM({ ...m, echeance: v })}/>
        <div class="sm:col-span-2"><${ui.Textarea} label="Notes" value=${m.notes} onInput=${(v) => setM({ ...m, notes: v })}/></div></div>`}
    </${ui.Modal}>
  </${ui.Page}>`;
}
