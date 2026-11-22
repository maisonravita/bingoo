function Ecran() {
  const L = useCollection("inscrits"), I = useCollection("infos");
  if (L.loading || I.loading) return html`<${ui.Loading}/>`;
  const jourDe = (x) => String(x.created_at).slice(0, 10);
  const semaine = L.rows.filter((x) => jourDe(x) >= decale(-7)).length, avant = L.rows.filter((x) => jourDe(x) >= decale(-14) && jourDe(x) < decale(-7)).length;
  const parJour = Array.from({ length: 14 }, (_, i) => { const j = decale(i - 13); return { label: new Date(j + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "numeric" }), valeur: L.rows.filter((x) => jourDe(x) === j).length }; });
  const src = {}; L.rows.forEach((x) => { const k = x.source && x.source !== "direct" ? x.source : "Lien direct"; src[k] = (src[k] ?? 0) + 1; });
  const sources = Object.entries(src).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, valeur]) => ({ label, valeur }));
  const inf = I.rows[0] ?? {};
  return html`<div class="anim">
    <${Entete} titre=${"Bonjour" + (user?.nom ? " " + String(user.nom).split(" ")[0] : "")} sous="Les personnes qui attendent votre lancement."><${Bouton} onClick=${() => go("inscrits")}>Voir les inscrits</${Bouton}></${Entete}>
    <div class="grid gap-4 sm:grid-cols-3">
      <${Kpi} icone="contacts" label="Inscrits au total" valeur=${L.rows.length}/>
      <${Kpi} icone="graphique" label="Ces 7 jours" valeur=${semaine} tendance=${evol(semaine, avant)}/>
      <${Kpi} icone="carte" label="Première source" valeur=${sources[0]?.label ?? "—"}/>
    </div>
    <div class="mt-4 grid gap-4 lg:grid-cols-3">
      <${Carte} titre="Inscriptions par jour" classe="lg:col-span-2"><${ui.Bar} donnees=${parJour}/></${Carte}>
      <${Carte} titre="D'où ils viennent">${sources.length ? html`<${ui.Donut} donnees=${sources}/>` : html`<p class="text-sm text-slate-500">Pas encore d'inscrit.</p>`}<p class="mt-3 text-xs text-slate-500">Ajoutez ?src=instagram (ou linkedin, newsletter…) à votre lien pour savoir ce qui marche.</p></${Carte}>
    </div>
    ${!inf.email && html`<button onClick=${() => go("infos")} class="mt-4 flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-[var(--c)]"><span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-slate-300"></span><span><span class="block text-sm font-semibold">Ajoutez votre e-mail de contact</span><span class="block text-xs text-slate-500">Vos futurs clients pourront vous écrire avant le lancement.</span></span></button>`}
  </div>`;
}
