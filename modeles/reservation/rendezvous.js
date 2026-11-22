function Ecran() {
  const R = useCollection("rendezvous"), P = useCollection("prestations");
  const [vue, setVue] = useState("liste"), [m, setM] = useState(null), [filtre, setFiltre] = useState("avenir"), [q, setQ] = useState("");
  const auj = jourISO(new Date());
  const STAT = [["demande", "À confirmer"], ["confirme", "Confirmé"], ["termine", "Terminé"], ["annule", "Annulé"]];
  const nomP = (id) => P.rows.find((p) => p.id === id)?.nom ?? "—";
  const L = R.rows.filter((r) => (filtre === "tous" ? true : filtre === "avenir" ? r.date >= auj : r.date < auj) && (!q || (r.client_nom + " " + nomP(r.prestation_id)).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (filtre === "passes" ? -1 : 1) * (a.date + a.heure).localeCompare(b.date + b.heure));
  const enregistrer = async () => { const { id, created_at, updated_at, ...d } = m; if (!String(d.client_nom ?? "").trim() || !d.date) { toast("Indiquez au moins le nom et la date", "bad"); return; } if (id) await R.update(id, d); else await R.add(d); setM(null); toast("Enregistré"); };
  const presta = (id) => { const p = P.rows.find((x) => x.id === id); setM({ ...m, prestation_id: id, montant: p?.prix ?? m.montant, duree: p?.duree ?? m.duree }); };
  const changer = (r, s, t) => R.update(r.id, { statut: s }).then(() => toast(t));
  const supprimer = async (r) => { if (!await demander("Supprimer ce " + V.rdv.toLowerCase() + " ?", { ok: "Supprimer", danger: true })) return; await R.remove(r.id); setM(null); toast("Supprimé"); };
  const quand = (r) => { const d = new Date(r.date + "T12:00:00"); return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }).replace(/^./, (c) => c.toUpperCase()); };
  const nb = (f) => R.rows.filter((r) => (f === "avenir" ? r.date >= auj : r.date < auj)).length;
  if (R.loading) return html`<${ui.Loading}/>`;
  return html`<div>
    <${Entete} titre=${V.rdvs} sous=${"Consultez et gérez vos " + V.rdvs.toLowerCase() + ", de la demande à la fin."}>
      <${Segments} valeur=${vue} onChange=${setVue} options=${[["liste", "Liste"], ["etapes", "Étapes"]]}/>
      <${ui.Button} icone="plus" onClick=${() => setM({ client_nom: "", client_email: "", prestation_id: "", date: auj, heure: "09:00", statut: "confirme", montant: 0, duree: 60, intervenant: "", notes: "" })}>Ajouter</${ui.Button}>
    </${Entete}>
    <div class="mb-4 flex flex-wrap items-center gap-3"><${Segments} valeur=${filtre} onChange=${setFiltre} options=${[["avenir", "À venir (" + nb("avenir") + ")"], ["passes", "Passés"], ["tous", "Tout"]]}/><div class="ml-auto"><${Recherche} valeur=${q} onInput=${setQ} placeholder=${"Rechercher…"}/></div></div>
    ${vue === "etapes" ? html`<${ui.Kanban} colonnes=${STAT} lignes=${L} champ="statut" onDeplacer=${(id, s) => R.update(id, { statut: s })} onClick=${(r) => setM({ ...r })} rendu=${(r) => html`<div class="flex items-center gap-2"><${Avatar} nom=${r.client_nom} taille="w-6 h-6 text-[9px]"/><p class="font-medium truncate">${r.client_nom}</p></div><p class="text-xs text-slate-500 mt-1">${quand(r)} · ${r.heure}</p><p class="text-xs text-slate-500">${nomP(r.prestation_id)}</p><p class="mt-1.5 text-sm font-semibold">${fmt.eur(r.montant)}</p>`}/>`
    : html`<${Carte}>${L.length ? html`<div class="-mx-5 -my-3 overflow-x-auto"><table class="w-full min-w-[760px] text-sm">
        <thead><tr class="border-b border-slate-100 text-left text-xs text-slate-500"><th class="px-5 py-3 font-medium">Date</th><th class="py-3 font-medium">${V.client}</th><th class="py-3 font-medium">${V.presta}</th><th class="py-3 font-medium">Durée</th><th class="py-3 font-medium text-right">Montant</th><th class="py-3 pl-6 font-medium">Statut</th><th class="px-5 py-3 font-medium text-right">Actions</th></tr></thead>
        <tbody class="divide-y divide-slate-50">${L.map((r) => html`<tr class="cursor-pointer hover:bg-slate-50/70" onClick=${() => setM({ ...r })}>
          <td class="px-5 py-3 whitespace-nowrap"><p class="font-semibold">${quand(r)}</p><p class="text-xs text-slate-500">${r.heure}</p></td>
          <td class="py-3"><div class="flex items-center gap-2.5"><${Avatar} nom=${r.client_nom}/><span class="font-medium">${r.client_nom}</span></div></td>
          <td class="py-3 text-slate-600">${nomP(r.prestation_id)}${r.intervenant ? html`<span class="block text-xs text-slate-500">avec ${r.intervenant}</span>` : ""}</td>
          <td class="py-3 text-slate-600 whitespace-nowrap">${(Number(r.duree) || 60) >= 60 ? Math.floor((Number(r.duree) || 60) / 60) + " h" + ((Number(r.duree) || 60) % 60 ? " " + ((Number(r.duree) || 60) % 60) : "") : r.duree + " min"}</td>
          <td class="py-3 text-right tabular-nums font-medium">${fmt.eur(r.montant)}</td>
          <td class="py-3 pl-6"><${Pastille} statut=${r.statut}/></td>
          <td class="px-5 py-3 text-right"><${Menu} actions=${[r.statut === "demande" && ["Confirmer", () => changer(r, "confirme", V.rdv + " confirmé")], r.statut === "confirme" && ["Marquer terminé", () => changer(r, "termine", "Terminé")], ["Modifier", () => setM({ ...r })], r.statut !== "annule" && ["Annuler le " + V.rdv.toLowerCase(), () => changer(r, "annule", V.rdv + " annulé"), true]]}/></td></tr>`)}</tbody></table></div>`
      : html`<p class="py-8 text-center text-sm text-slate-500">${filtre === "avenir" ? "Rien de prévu pour l'instant." : "Aucun " + V.rdv.toLowerCase() + " ici."}</p>`}</${Carte}>`}
    <${ui.Modal} open=${!!m} onClose=${() => setM(null)} titre=${m?.id ? m.client_nom : "Nouveau " + V.rdv.toLowerCase()} actions=${html`${m?.id && html`<${ui.Button} variant="danger" onClick=${() => supprimer(m)}>Supprimer</${ui.Button}>`}<${ui.Button} variant="secondary" onClick=${() => setM(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
      ${m && html`<div class="grid sm:grid-cols-2 gap-3">
        <${ui.Input} label=${V.client} value=${m.client_nom} onInput=${(v) => setM({ ...m, client_nom: v })}/>
        <${ui.Input} label="E-mail" type="email" value=${m.client_email} onInput=${(v) => setM({ ...m, client_email: v })}/>
        <${ui.Select} label=${V.presta} value=${m.prestation_id} onChange=${presta} options=${[["", "Choisir…"], ...P.rows.map((p) => [p.id, p.nom + " · " + fmt.eur(p.prix)])]}/>
        <${ui.Input} label="Montant (€)" type="number" value=${m.montant} onInput=${(v) => setM({ ...m, montant: v })}/>
        <${ui.Input} label="Date" type="date" value=${m.date} onInput=${(v) => setM({ ...m, date: v })}/>
        <${ui.Input} label="Heure" type="time" value=${m.heure} onInput=${(v) => setM({ ...m, heure: v })}/>
        <${ui.Input} label=${V.intervenant} value=${m.intervenant} onInput=${(v) => setM({ ...m, intervenant: v })}/>
        <${ui.Select} label="Statut" value=${m.statut} onChange=${(v) => setM({ ...m, statut: v })} options=${STAT}/>
        <div class="sm:col-span-2"><${ui.Textarea} label="Notes" value=${m.notes} onInput=${(v) => setM({ ...m, notes: v })}/></div></div>`}
    </${ui.Modal}>
  </div>`;
}
