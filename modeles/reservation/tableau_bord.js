function Ecran() {
  const R = useCollection("rendezvous"), P = useCollection("prestations"), C = useCollection("clients");
  const auj = new Date().toISOString().slice(0, 10);
  const mois = auj.slice(0, 7);
  const actifs = R.rows.filter((r) => r.statut !== "annule");
  const caMois = actifs.filter((r) => String(r.date).slice(0, 7) === mois && r.statut !== "demande").reduce((a, r) => a + (Number(r.montant) || 0), 0);
  const lundi = new Date(); lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7)); const l0 = lundi.toISOString().slice(0, 10);
  const dim = new Date(lundi); dim.setDate(lundi.getDate() + 6); const d0 = dim.toISOString().slice(0, 10);
  const semaine = actifs.filter((r) => r.date >= l0 && r.date <= d0).length;
  const demandes = R.rows.filter((r) => r.statut === "demande");
  const annules = R.rows.filter((r) => r.statut === "annule").length;
  const taux = R.rows.length ? Math.round((annules / R.rows.length) * 100) : 0;
  const semaines = Array.from({ length: 8 }, (_, i) => { const d = new Date(lundi); d.setDate(d.getDate() - (7 - i) * 7); const a = d.toISOString().slice(0, 10); const f = new Date(d); f.setDate(d.getDate() + 6); const b = f.toISOString().slice(0, 10); return { label: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), valeur: actifs.filter((r) => r.date >= a && r.date <= b && r.statut !== "demande").reduce((x, r) => x + (Number(r.montant) || 0), 0) }; });
  const parPresta = P.rows.map((p) => ({ label: p.nom, valeur: actifs.filter((r) => r.prestation_id === p.id).length })).filter((x) => x.valeur).sort((a, b) => b.valeur - a.valeur).slice(0, 5);
  const prochains = actifs.filter((r) => r.date >= auj && r.statut !== "demande").sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure)).slice(0, 6);
  const nomP = (id) => P.rows.find((p) => p.id === id)?.nom ?? "";
  const statut = (r, s) => R.update(r.id, { statut: s }).then(() => toast(s === "confirme" ? "Confirmé" : "Demande refusée"));
  if (R.loading) return html`<${ui.Loading}/>`;
  return html`<${ui.Page} titre="Tableau de bord" sous=${"Ton activité, " + new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} actions=${html`<${ui.Button} icone="agenda" onClick=${() => go("planning")}>Ouvrir le planning</${ui.Button}>`}>
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <${ui.Stat} label="Chiffre d'affaires du mois" valeur=${fmt.eur(caMois)} icone="graphique"/>
      <${ui.Stat} label=${V.rdvs + " cette semaine"} valeur=${semaine} icone="agenda"/>
      <${ui.Stat} label="Demandes à confirmer" valeur=${demandes.length} sous=${demandes.length ? "à traiter aujourd'hui" : "tout est à jour"} icone="boite"/>
      <${ui.Stat} label=${V.clients + " au total"} valeur=${C.rows.length} sous=${"annulations : " + taux + " %"} icone="contacts"/>
    </div>
    ${demandes.length > 0 && html`<${ui.Card} class="mt-4" titre=${"Demandes à confirmer (" + demandes.length + ")"}><div class="divide-y divide-slate-100">${demandes.slice(0, 5).map((r) => html`<div class="flex flex-wrap items-center gap-3 py-2.5"><div class="flex-1 min-w-[180px]"><p class="font-medium">${r.client_nom}</p><p class="text-sm text-slate-500">${nomP(r.prestation_id)} · ${fmt.date(r.date)} à ${r.heure}</p></div><${ui.Button} variant="secondary" onClick=${() => statut(r, "annule")}>Refuser</${ui.Button}><${ui.Button} onClick=${() => statut(r, "confirme")}>Confirmer</${ui.Button}></div>`)}</div></${ui.Card}>`}
    <div class="mt-4 grid lg:grid-cols-3 gap-4">
      <${ui.Card} class="lg:col-span-2" titre="Chiffre d'affaires par semaine"><${ui.Ligne} donnees=${semaines}/></${ui.Card}>
      <${ui.Card} titre=${"Par " + V.presta.toLowerCase()}>${parPresta.length ? html`<${ui.Donut} donnees=${parPresta}/>` : html`<${ui.Empty} texte="Pas encore de données."/>`}</${ui.Card}>
    </div>
    <${ui.Card} class="mt-4" titre="À venir" actions=${html`<${ui.Button} variant="ghost" onClick=${() => go("rendezvous")}>Tout voir</${ui.Button}>`}>
      ${prochains.length ? html`<div class="divide-y divide-slate-100">${prochains.map((r) => html`<div class="flex items-center gap-4 py-2.5"><div class="w-14 shrink-0 text-center rounded-xl bg-[var(--c)]/10 py-1.5"><p class="text-xs text-[var(--c)] font-semibold">${new Date(r.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short" })}</p><p class="text-lg font-bold leading-none">${new Date(r.date + "T12:00:00").getDate()}</p></div><div class="flex-1 min-w-0"><p class="font-medium truncate">${r.client_nom}</p><p class="text-sm text-slate-500 truncate">${r.heure} · ${nomP(r.prestation_id)}${r.intervenant ? " · " + r.intervenant : ""}</p></div><p class="font-semibold tabular-nums">${fmt.eur(r.montant)}</p></div>`)}</div>` : html`<${ui.Empty} texte="Rien de prévu pour l'instant."/>`}
    </${ui.Card}>
  </${ui.Page}>`;
}
