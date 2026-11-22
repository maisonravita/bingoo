function Ecran() {
  const D = useCollection("demandes"), S = useCollection("services"), H = useCollection("horaires"), I = useCollection("infos"), R = useCollection("realisations");
  if (D.loading || S.loading || H.loading || I.loading || R.loading) return html`<${ui.Loading}/>`;
  const portfolio = V.modele === "portfolio";
  const nouvelles = D.rows.filter((d) => d.statut === "nouvelle" || !d.statut);
  const semaine = D.rows.filter((d) => String(d.created_at).slice(0, 10) >= decale(-7)).length;
  const avant = D.rows.filter((d) => { const j = String(d.created_at).slice(0, 10); return j >= decale(-14) && j < decale(-7); }).length;
  const enLigne = S.rows.filter((s) => s.visible !== false).length;
  const inf = I.rows[0] ?? {};
  const ouverts = H.rows.filter((h) => h.ouvert).length;
  const aFaire = [
    [!inf.telephone && !inf.email, "Ajoutez votre téléphone ou votre e-mail", "Vos visiteurs pourront vous joindre directement.", "infos"],
    [!inf.adresse && !inf.zone, "Indiquez votre adresse ou votre zone", "Pour que vos clients sachent où vous trouver.", "infos"],
    [S.rows.length > 0 && !inf.prix_verifies, "Vérifiez vos prix", "Proposés à la construction : mettez vos vrais tarifs.", "services"],
    [V.horaires !== false && !ouverts, "Indiquez vos horaires", "Aucun jour d'ouverture n'est renseigné.", "infos"],
    [portfolio && R.rows.filter((r) => r.image).length < 3, "Ajoutez vos réalisations avec leurs photos", "Trois projets au moins : c'est ce que vos visiteurs regardent d'abord.", "realisations"],
  ].filter((x) => x[0]);
  const recentes = [...D.rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 5);
  return html`<div class="anim">
    <${Entete} titre=${"Bonjour" + (user?.nom ? " " + String(user.nom).split(" ")[0] : "")} sous="Ce qui se passe sur votre site."><${Bouton} onClick=${() => go("demandes")}>Voir les demandes</${Bouton}></${Entete}>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <${Kpi} icone="message" label="Demandes à traiter" valeur=${nouvelles.length}/>
      <${Kpi} icone="graphique" label="Reçues ces 7 jours" valeur=${semaine} tendance=${evol(semaine, avant)}/>
      <${Kpi} icone="tag" label="Services en ligne" valeur=${enLigne}/>
      ${portfolio ? html`<${Kpi} icone="etoile" label="Réalisations en ligne" valeur=${R.rows.filter((r) => r.visible !== false).length}/>` : html`<${Kpi} icone="horloge" label="Jours d'ouverture" valeur=${ouverts + " / 7"}/>`}
    </div>
    <div class="mt-4 grid gap-4 lg:grid-cols-3">
      <${Carte} titre="Dernières demandes" classe="lg:col-span-2" actions=${html`<button onClick=${() => go("demandes")} class="inline-flex min-h-6 items-center text-sm font-medium text-[var(--c)]">Tout voir →</button>`}>
        ${recentes.length ? html`<div class="divide-y divide-slate-100">${recentes.map((d) => html`<button onClick=${() => go("demandes", { ouvrir: d.id })} class="flex w-full items-center gap-3 py-2.5 text-left hover:bg-slate-50/70"><${Avatar} nom=${d.nom}/><div class="min-w-0 flex-1"><p class="truncate font-medium">${d.nom}</p><p class="truncate text-sm text-slate-500">${d.service || "Demande"}${d.date_souhaitee ? " · " + dateCourte(d.date_souhaitee) : ""}</p></div><span class="hidden sm:block shrink-0 text-xs text-slate-500">${ilya(d.created_at)}</span><${Pill} ton=${STATUTS_D[d.statut]?.[1] ?? "orange"}>${STATUTS_D[d.statut]?.[0] ?? "Nouvelle"}</${Pill}></button>`)}</div>`
          : html`<${Vide} icone="message" titre="Pas encore de demande" texte=${"Les demandes envoyées depuis votre site (bouton « " + V.cta + " ») arrivent ici et par e-mail."}/>`}
      </${Carte}>
      <${Carte} titre=${aFaire.length ? "À compléter" : "Votre site est complet"}>
        ${aFaire.length ? html`<div class="space-y-2">${aFaire.map(([, t, x, ecran]) => html`<button onClick=${() => go(ecran)} class="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-[var(--c)]"><span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-slate-300"></span><span><span class="block text-sm font-semibold">${t}</span><span class="block text-xs text-slate-500">${x}</span></span></button>`)}</div>`
          : html`<p class="text-sm text-slate-500">Coordonnées, horaires et prix sont renseignés. Partagez le lien de votre site : sur votre fiche Google, vos réseaux et votre carte de visite.</p>`}
      </${Carte}>
    </div>
  </div>`;
}
