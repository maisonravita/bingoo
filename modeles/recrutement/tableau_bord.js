function Ecran() {
  const K = useCollection("candidats"), O = useCollection("offres");
  if (K.loading || O.loading) return html`<${ui.Loading}/>`;
  const jourDe = (x) => String(x.created_at).slice(0, 10);
  const sem = K.rows.filter((x) => jourDe(x) >= decale(-7)), semAv = K.rows.filter((x) => jourDe(x) >= decale(-14) && jourDe(x) < decale(-7));
  const ouvertes = O.rows.filter((o) => o.statut === "publiee");
  const entretiens = K.rows.filter((x) => x.etape === "entretien" && x.entretien_le && x.entretien_le >= jourISO(new Date())).sort((a, b) => a.entretien_le.localeCompare(b.entretien_le));
  const embauches = K.rows.filter((x) => x.etape === "embauche").length;
  const entonnoir = ETAPES_R.filter(([e]) => e !== "refuse").map(([e, l]) => ({ label: l, valeur: K.rows.filter((x) => x.etape === e).length }));
  const sources = {}; K.rows.forEach((x) => { const s = x.source || "Autre"; sources[s] = (sources[s] ?? 0) + 1; });
  const nouveaux = K.rows.filter((x) => x.etape === "nouveau").sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 5);
  return html`<div class="anim">
    <${Entete} titre="Tableau de bord" sous="Vos recrutements en cours."><${Bouton} onClick=${() => go("candidats")}>Voir les candidats</${Bouton}></${Entete}>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <${Kpi} icone="fichier" label="Postes ouverts" valeur=${ouvertes.length}/>
      <${Kpi} icone="contacts" label="Candidatures cette semaine" valeur=${sem.length} tendance=${evol(sem.length, semAv.length)}/>
      <${Kpi} icone="agenda" label="Entretiens à venir" valeur=${entretiens.length}/>
      <${Kpi} icone="check" label="Embauches" valeur=${embauches}/>
    </div>
    <div class="mt-4 grid gap-4 lg:grid-cols-3">
      <${Carte} titre="Candidats par étape" classe="lg:col-span-2"><${ui.Bar} donnees=${entonnoir}/></${Carte}>
      <${Carte} titre="D'où viennent-ils ?"><${ui.Donut} donnees=${Object.entries(sources).sort((a, b) => b[1] - a[1]).map(([label, valeur]) => ({ label, valeur }))}/></${Carte}>
    </div>
    <div class="mt-4 grid gap-4 lg:grid-cols-2">
      <${Carte} titre="Nouvelles candidatures" actions=${html`<button onClick=${() => go("candidats")} class="text-sm font-medium text-[var(--c)]">Tout voir →</button>`}>${nouveaux.length ? html`<div class="divide-y divide-slate-100">${nouveaux.map((x) => html`<button onClick=${() => go("candidats", { ouvrir: x.id })} class="flex w-full items-center gap-3 py-2.5 text-left hover:bg-slate-50/70"><${Avatar} nom=${x.nom}/><div class="min-w-0 flex-1"><p class="truncate font-medium">${x.nom}</p><p class="truncate text-sm text-slate-500">${x.offre_titre}</p></div><span class="text-xs text-slate-400">${ilya(x.created_at)}</span></button>`)}</div>` : html`<p class="text-sm text-slate-400">Pas de nouvelle candidature.</p>`}</${Carte}>
      <${Carte} titre="Prochains entretiens">${entretiens.length ? html`<div class="divide-y divide-slate-100">${entretiens.slice(0, 5).map((x) => { const d = new Date(x.entretien_le + "T12:00:00"); return html`<button onClick=${() => go("candidats", { ouvrir: x.id })} class="flex w-full items-center gap-3 py-2.5 text-left"><span class="grid w-12 shrink-0 place-items-center rounded-xl bg-slate-100 py-1"><span class="text-[10px] font-semibold uppercase text-slate-500">${d.toLocaleDateString("fr-FR", { weekday: "short" })}</span><span class="text-lg font-bold leading-none">${d.getDate()}</span></span><div class="min-w-0 flex-1"><p class="truncate font-medium">${x.nom}</p><p class="truncate text-sm text-slate-500">${x.offre_titre}</p></div></button>`; })}</div>` : html`<p class="text-sm text-slate-400">Aucun entretien prévu.</p>`}</${Carte}>
    </div>
  </div>`;
}
