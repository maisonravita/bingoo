function Ecran() {
  const T = useCollection("tickets");
  const [jours, setJours] = useState(30);
  if (T.loading) return html`<${ui.Loading}/>`;
  const jourDe = (t) => String(t.created_at).slice(0, 10);
  const debut = decale(-jours), avant = decale(-2 * jours);
  const per = T.rows.filter((t) => jourDe(t) >= debut), prec = T.rows.filter((t) => jourDe(t) >= avant && jourDe(t) < debut);
  const ouverts = T.rows.filter((t) => t.statut === "ouvert"), attente = T.rows.filter((t) => t.statut === "attente");
  const resolus = (L) => L.filter((t) => t.statut === "resolu").length;
  const moy = (L) => { const d = L.map(delaiReponse).filter((x) => x != null); return d.length ? d.reduce((a, b) => a + b, 0) / d.length : null; };
  const mP = moy(per), mA = moy(prec);
  const n = Math.min(jours, 14), parJour = Array.from({ length: n }, (_, i) => { const j = decale(i - n + 1); return { label: new Date(j + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: n > 7 ? "numeric" : "short" }), valeur: T.rows.filter((t) => jourDe(t) === j).length }; });
  const cats = {}; per.forEach((t) => { const c = t.categorie || "Autre"; cats[c] = (cats[c] ?? 0) + 1; });
  const parCat = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, valeur]) => ({ label, valeur }));
  const ORDRE = { haute: 0, normale: 1, basse: 2 };
  const urgents = [...ouverts].sort((a, b) => (ORDRE[a.priorite] ?? 1) - (ORDRE[b.priorite] ?? 1) || String(a.created_at).localeCompare(String(b.created_at))).slice(0, 6);
  return html`<div class="anim">
    <${Entete} titre="Tableau de bord" sous="Vos demandes en un coup d'œil."><select value=${jours} onChange=${(e) => setJours(Number(e.target.value))} class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option></select><${Bouton} onClick=${() => go("tickets")}>Voir les tickets</${Bouton}></${Entete}>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <${Kpi} icone="message" label="Tickets ouverts" valeur=${ouverts.length} sous=${ouverts.filter((t) => t.priorite === "haute").length + " en priorité haute"}/>
      <${Kpi} icone="horloge" label="En attente du client" valeur=${attente.length}/>
      <${Kpi} icone="check" label="Résolus sur la période" valeur=${resolus(per)} tendance=${evol(resolus(per), resolus(prec))}/>
      <${Kpi} icone="graphique" label="Première réponse (moyenne)" valeur=${duree(mP)} tendance=${mP != null && mA ? evol(mP, mA) : null} inverse=${true}/>
    </div>
    <div class="mt-4 grid gap-4 lg:grid-cols-3">
      <${Carte} titre="À traiter maintenant" classe="lg:col-span-2" actions=${html`<button onClick=${() => go("tickets")} class="text-sm font-medium text-[var(--c)]">Tout voir →</button>`}>
        ${urgents.length ? html`<div class="divide-y divide-slate-100">${urgents.map((t) => html`<button onClick=${() => go("tickets", { ouvrir: t.id })} class="flex w-full items-center gap-3 py-2.5 text-left hover:bg-slate-50/70"><${Avatar} nom=${t.nom}/><div class="min-w-0 flex-1"><p class="truncate font-medium">${t.sujet}</p><p class="truncate text-sm text-slate-500">${t.nom} · ${t.categorie || "Autre"}</p></div><span class="hidden sm:block shrink-0 text-xs text-slate-400">${ilya(t.created_at)}</span><${Pill} ton=${PRIO[t.priorite]?.[1]}>${PRIO[t.priorite]?.[0] ?? "Normale"}</${Pill}></button>`)}</div>` : html`<${Vide} icone="check" titre="Aucun ticket ouvert" texte="Tout le monde a sa réponse. Bravo !"/>`}
      </${Carte}>
      <${Carte} titre="Par catégorie">${parCat.length ? html`<${ui.Donut} donnees=${parCat}/>` : html`<p class="text-sm text-slate-400">Pas de demande sur la période.</p>`}</${Carte}>
    </div>
    <${Carte} titre="Demandes reçues par jour" classe="mt-4"><${ui.Bar} donnees=${parJour}/></${Carte}>
  </div>`;
}
