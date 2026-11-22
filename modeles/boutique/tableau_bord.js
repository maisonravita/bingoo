function Ecran() {
  const C = useCollection("commandes"), P = useCollection("produits");
  const [jours, setJours] = useState(30);
  if (C.loading || P.loading) return html`<${ui.Loading}/>`;
  const jourDe = (c) => String(c.created_at).slice(0, 10);
  const debut = decale(-jours), avant = decale(-2 * jours);
  const per = C.rows.filter((c) => vendu(c) && jourDe(c) >= debut), prec = C.rows.filter((c) => vendu(c) && jourDe(c) >= avant && jourDe(c) < debut);
  const ca = (L) => L.reduce((a, c) => a + (Number(c.total) || 0), 0);
  const aPreparer = C.rows.filter((c) => c.statut === "nouvelle" || c.statut === "preparation");
  const pas = jours <= 7 ? 1 : 7, nb = Math.ceil(jours / pas);
  const courbe = Array.from({ length: nb }, (_, i) => { const a = decale(-jours + i * pas + 1), b = decale(-jours + (i + 1) * pas + 1); return { label: new Date(a + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), valeur: ca(per.filter((c) => jourDe(c) >= a && jourDe(c) < b)) }; });
  const ventes = {}; per.forEach((c) => lignesDe(c).forEach((l) => { const k = l.nom; ventes[k] = ventes[k] ?? { nom: k, n: 0, ca: 0 }; ventes[k].n += Number(l.quantite) || 1; ventes[k].ca += (Number(l.prix) || 0) * (Number(l.quantite) || 1); }));
  const top = Object.values(ventes).sort((a, b) => b.ca - a.ca).slice(0, 5), max = Math.max(1, ...top.map((x) => x.ca));
  const emojiDe = (nom) => P.rows.find((p) => p.nom === nom)?.emoji ?? "🛍️";
  const bas = P.rows.filter((p) => p.actif !== false && Number(p.stock) <= 5);
  const recentes = [...C.rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 5);
  return html`<div class="anim">
    <${Entete} titre="Tableau de bord" sous="Vos ventes et ce qui attend d'être préparé."><select aria-label="Période" value=${jours} onChange=${(e) => setJours(Number(e.target.value))} class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option></select><${Bouton} onClick=${() => go("commandes")}>Voir les commandes</${Bouton}></${Entete}>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <${Kpi} icone="panier" label="Chiffre d'affaires" valeur=${fmt.eur(ca(per))} tendance=${evol(ca(per), ca(prec))}/>
      <${Kpi} icone="boite" label="Commandes" valeur=${per.length} tendance=${evol(per.length, prec.length)}/>
      <${Kpi} icone="tag" label="Panier moyen" valeur=${fmt.eur(per.length ? ca(per) / per.length : 0)}/>
      <${Kpi} icone="horloge" label="À préparer" valeur=${aPreparer.length} sous=${C.rows.filter((c) => c.statut === "nouvelle").length + " nouvelle(s)"}/>
    </div>
    <div class="mt-4 grid gap-4 lg:grid-cols-3">
      <${Carte} titre="Chiffre d'affaires" classe="lg:col-span-2"><${ui.Ligne} donnees=${courbe}/></${Carte}>
      <${Carte} titre="Meilleures ventes">${top.length ? html`<div class="space-y-3">${top.map((t) => html`<div><div class="flex items-center gap-2 text-sm"><span>${emojiDe(t.nom)}</span><span class="min-w-0 flex-1 truncate font-medium">${t.nom}</span><span class="tabular-nums text-slate-500">${t.n} vendus</span></div><div class="mt-1 h-1.5 rounded-full bg-slate-100"><div class="h-1.5 rounded-full bg-[var(--c)]" style=${"width:" + Math.round((t.ca / max) * 100) + "%"}></div></div></div>`)}</div>` : html`<p class="text-sm text-slate-400">Pas encore de vente sur la période.</p>`}</${Carte}>
    </div>
    <div class="mt-4 grid gap-4 lg:grid-cols-3">
      <${Carte} titre="Dernières commandes" classe="lg:col-span-2" actions=${html`<button onClick=${() => go("commandes")} class="text-sm font-medium text-[var(--c)]">Tout voir →</button>`}>
        <div class="divide-y divide-slate-100">${recentes.map((c) => html`<button onClick=${() => go("commandes", { ouvrir: c.id })} class="flex w-full items-center gap-3 py-2.5 text-left hover:bg-slate-50/70"><${Avatar} nom=${c.client_nom}/><div class="min-w-0 flex-1"><p class="truncate font-medium">${c.client_nom}</p><p class="text-sm text-slate-500">${c.numero} · ${nbArticles(c)} article(s) · ${ilya(c.created_at)}</p></div><span class="font-semibold tabular-nums">${fmt.eur(c.total)}</span><${Pill} ton=${ETAPES_C[c.statut]?.[1]}>${ETAPES_C[c.statut]?.[0] ?? c.statut}</${Pill}></button>`)}</div>
      </${Carte}>
      <${Carte} titre="Stock à surveiller">${bas.length ? html`<div class="divide-y divide-slate-100">${bas.map((p) => html`<button onClick=${() => go("produits")} class="flex w-full items-center gap-3 py-2 text-left"><span class="text-xl">${p.emoji || "🛍️"}</span><span class="min-w-0 flex-1 truncate text-sm font-medium">${p.nom}</span><${Pill} ton=${Number(p.stock) <= 0 ? "rouge" : "orange"}>${Number(p.stock) <= 0 ? "Épuisé" : p.stock + " restant(s)"}</${Pill}></button>`)}</div>` : html`<p class="text-sm text-slate-400">Tous vos produits sont bien en stock.</p>`}</${Carte}>
    </div>
  </div>`;
}
