function Ecran() {
  const I = useCollection("inscriptions"), C = useCollection("cours");
  const [jours, setJours] = useState(30);
  if (I.loading || C.loading) return html`<${ui.Loading}/>`;
  const jourDe = (x) => String(x.created_at).slice(0, 10), debut = decale(-jours), avant = decale(-2 * jours);
  const valides = I.rows.filter((x) => x.statut !== "a_valider");
  const per = I.rows.filter((x) => jourDe(x) >= debut), prec = I.rows.filter((x) => jourDe(x) >= avant && jourDe(x) < debut);
  const rev = (L) => L.filter((x) => x.statut !== "a_valider").reduce((a, x) => a + (Number(x.montant) || 0), 0);
  const nbL = (id) => progDe(C.rows.find((c) => c.id === id)).length;
  const fini = valides.length ? Math.round((valides.filter((x) => x.statut === "termine").length / valides.length) * 100) : 0;
  const pas = jours <= 7 ? 1 : 7, nb = Math.ceil(jours / pas);
  const courbe = Array.from({ length: nb }, (_, i) => { const a = decale(-jours + i * pas + 1), b = decale(-jours + (i + 1) * pas + 1); return { label: new Date(a + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), valeur: I.rows.filter((x) => jourDe(x) >= a && jourDe(x) < b).length }; });
  const classement = C.rows.map((c) => { const L = I.rows.filter((x) => x.cours_id === c.id); return { c, n: L.length, ca: rev(L) }; }).sort((a, b) => b.ca - a.ca || b.n - a.n);
  const aValider = I.rows.filter((x) => x.statut === "a_valider");
  return html`<div class="anim">
    <${Entete} titre="Tableau de bord" sous=${"Vos formations et vos " + V.eleves.toLowerCase() + " en un coup d'œil."}><select value=${jours} onChange=${(e) => setJours(Number(e.target.value))} class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option></select><${Bouton} onClick=${() => go("cours")}>Mes formations</${Bouton}></${Entete}>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <${Kpi} icone="contacts" label="Inscriptions" valeur=${per.length} tendance=${evol(per.length, prec.length)}/>
      <${Kpi} icone="panier" label="Revenus" valeur=${fmt.eur(rev(per))} tendance=${evol(rev(per), rev(prec))}/>
      <${Kpi} icone="liste" label=${V.eleves + " en cours"} valeur=${I.rows.filter((x) => x.statut === "actif").length}/>
      <${Kpi} icone="check" label="Taux d'achèvement" valeur=${fini + " %"}/>
    </div>
    <div class="mt-4 grid gap-4 lg:grid-cols-3">
      <${Carte} titre="Inscriptions" classe="lg:col-span-2"><${ui.Ligne} donnees=${courbe}/></${Carte}>
      <${Carte} titre="À valider" actions=${aValider.length ? html`<button onClick=${() => go("eleves")} class="text-sm font-medium text-[var(--c)]">Voir →</button>` : null}>${aValider.length ? html`<div class="divide-y divide-slate-100">${aValider.slice(0, 5).map((x) => html`<button onClick=${() => go("eleves")} class="flex w-full items-center gap-3 py-2.5 text-left"><${Avatar} nom=${x.nom}/><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">${x.nom}</p><p class="truncate text-xs text-slate-500">${x.cours_titre}</p></div><span class="text-xs text-slate-400">${ilya(x.created_at)}</span></button>`)}</div>` : html`<p class="text-sm text-slate-400">Aucune inscription en attente.</p>`}</${Carte}>
    </div>
    <${Carte} titre="Vos formations" classe="mt-4">
      <div class="divide-y divide-slate-100">${classement.map(({ c, n, ca }) => { const L = I.rows.filter((x) => x.cours_id === c.id && x.statut !== "a_valider"), moy = L.length ? L.reduce((a, x) => a + (Number(x.lecons_faites) || 0), 0) / L.length : 0; return html`<button onClick=${() => go("cours", { ouvrir: c.id })} class="flex w-full items-center gap-4 py-3 text-left hover:bg-slate-50/70"><span class="grid w-11 h-11 shrink-0 place-items-center rounded-xl bg-[var(--c)]/10 text-2xl">${c.emoji || "🎓"}</span><div class="min-w-0 flex-1"><p class="truncate font-semibold">${c.titre}</p><p class="text-sm text-slate-500">${progDe(c).length} leçons · ${c.niveau || "Tous niveaux"}</p></div><div class="hidden sm:block"><${Barre} v=${moy} max=${nbL(c.id)}/></div><div class="w-24 text-right"><p class="font-semibold tabular-nums">${fmt.eur(ca)}</p><p class="text-xs text-slate-500">${n} inscrit(s)</p></div></button>`; })}</div>
    </${Carte}>
  </div>`;
}
