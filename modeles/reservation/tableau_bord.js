function Ecran() {
  const R = useCollection("rendezvous"), P = useCollection("prestations"), C = useCollection("clients");
  const [periode, setPeriode] = useState("30");
  const n = Number(periode), auj = jourISO(new Date()), debut = decale(-n + 1), avant = decale(-2 * n + 1);
  const valides = R.rows.filter((r) => r.statut !== "annule" && r.statut !== "demande");
  const dans = (r, a, b) => r.date >= a && r.date <= b;
  const ca = (a, b) => valides.filter((r) => dans(r, a, b) && r.date <= auj).reduce((x, r) => x + (Number(r.montant) || 0), 0);
  const caP = ca(debut, auj), caA = ca(avant, decale(-n));
  // Nouveaux clients : leur premier rendez-vous tombe dans la période
  const premier = {}; for (const r of R.rows.filter((x) => x.statut !== "annule")) { const k = r.client_id || r.client_nom; if (!premier[k] || r.date < premier[k]) premier[k] = r.date; }
  const nouveaux = (a, b) => Object.values(premier).filter((d) => d >= a && d <= b).length;
  const nvP = nouveaux(debut, auj), nvA = nouveaux(avant, decale(-n));
  const annul = (a, b) => R.rows.filter((r) => r.statut === "annule" && dans(r, a, b)).length;
  const anP = annul(debut, auj), anA = annul(avant, decale(-n));
  const aVenir = R.rows.filter((r) => r.date >= auj && r.statut !== "annule").length;
  const demandes = R.rows.filter((r) => r.statut === "demande").sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
  // Courbe : par jour (7 jours), sinon par semaine
  const pas = n <= 7 ? 1 : 7, points = Math.ceil(n / pas);
  const courbe = Array.from({ length: points }, (_, i) => { const a = decale(-n + 1 + i * pas), b = decale(Math.min(0, -n + (i + 1) * pas)); return { label: new Date(a + "T12:00:00").toLocaleDateString("fr-FR", pas === 1 ? { weekday: "short" } : { day: "numeric", month: "short" }), valeur: ca(a, b) }; });
  const parPresta = P.rows.map((p) => ({ label: p.nom, valeur: valides.filter((r) => r.prestation_id === p.id && dans(r, debut, auj)).length })).filter((x) => x.valeur).sort((a, b) => b.valeur - a.valeur).slice(0, 5);
  const nomP = (id) => P.rows.find((p) => p.id === id)?.nom ?? "";
  const statut = (r, s) => R.update(r.id, { statut: s }).then(() => toast(s === "confirme" ? V.rdv + " confirmé" : "Demande refusée"));
  const prochains = R.rows.filter((r) => r.date >= auj && r.statut === "confirme").sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure)).slice(0, 5);
  if (R.loading) return html`<${ui.Loading}/>`;
  return html`<div>
    <${Entete} titre="Tableau de bord" sous="Une vue d'ensemble de votre activité.">
      <select aria-label="Période" value=${periode} onChange=${(e) => setPeriode(e.target.value)} class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[var(--c)]"><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option></select>
      <${ui.Button} icone="agenda" onClick=${() => go("planning")}>Ouvrir le planning</${ui.Button}>
    </${Entete}>
    <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <${Kpi} icone="graphique" valeur=${fmt.eur(caP)} label="Chiffre d'affaires" tendance=${evol(caP, caA)}/>
      <${Kpi} icone="contacts" valeur=${nvP} label="Premières visites" tendance=${evol(nvP, nvA)}/>
      <${Kpi} icone="croix" valeur=${anP} label=${V.rdvs + " annulés"} tendance=${anA || anP ? evol(anP, anA) : null} inverse=${true}/>
      <${Kpi} icone="agenda" valeur=${aVenir} label=${V.rdvs + " à venir"} sous=${demandes.length ? demandes.length + " à confirmer" : "tout est confirmé"}/>
    </div>
    <div class="mt-4 grid xl:grid-cols-3 gap-4">
      <${Carte} classe="xl:col-span-2" titre=${"Demandes à confirmer (" + demandes.length + ")"}>
        ${demandes.length ? html`<div class="divide-y divide-slate-100">${demandes.slice(0, 5).map((r) => html`<div class="flex flex-wrap items-center gap-3 py-2.5"><${Avatar} nom=${r.client_nom}/><div class="flex-1 min-w-[160px]"><p class="font-medium">${r.client_nom}</p><p class="text-sm text-slate-500">${nomP(r.prestation_id)} · ${fmt.date(r.date)} à ${r.heure}</p></div><button onClick=${() => statut(r, "confirme")} class="rounded-full bg-[var(--c)] px-3.5 py-1.5 text-sm font-semibold text-white hover:opacity-90">Confirmer</button><button onClick=${() => statut(r, "annule")} class="rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100">Refuser</button></div>`)}</div>`
          : html`<p class="py-6 text-center text-sm text-slate-500">Aucune demande en attente : tout est confirmé.</p>`}
      </${Carte}>
      <${Carte} titre="Répartition">${parPresta.length ? html`<${ui.Donut} donnees=${parPresta}/>` : html`<p class="py-6 text-center text-sm text-slate-500">Pas encore de ${V.rdvs.toLowerCase()} sur la période.</p>`}</${Carte}>
    </div>
    <div class="mt-4 grid xl:grid-cols-3 gap-4">
      <${Carte} classe="xl:col-span-2" titre=${pas === 1 ? "Chiffre d'affaires par jour" : "Chiffre d'affaires par semaine"}><${ui.Ligne} donnees=${courbe}/></${Carte}>
      <${Carte} titre="Prochains" actions=${html`<button onClick=${() => go("rendezvous")} class="text-sm font-medium text-[var(--c)] hover:underline">Tout voir</button>`}>
        ${prochains.length ? html`<div class="space-y-3">${prochains.map((r) => html`<div class="flex items-center gap-3"><div class="w-12 shrink-0 rounded-xl bg-[var(--c)]/10 py-1 text-center"><p class="text-[10px] font-semibold uppercase text-[var(--c)]">${new Date(r.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short" })}</p><p class="text-base font-bold leading-none">${new Date(r.date + "T12:00:00").getDate()}</p></div><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">${r.client_nom}</p><p class="truncate text-xs text-slate-500">${r.heure} · ${nomP(r.prestation_id)}</p></div></div>`)}</div>` : html`<p class="py-6 text-center text-sm text-slate-500">Rien de prévu pour l'instant.</p>`}
      </${Carte}>
    </div>
  </div>`;
}
