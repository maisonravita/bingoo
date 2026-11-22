function Ecran() {
  const P = useCollection("posts");
  const [jours, setJours] = useState(30), [res, setRes] = useState("tous");
  if (P.loading) return html`<${ui.Loading}/>`;
  const pub = P.rows.filter((p) => p.statut === "publie" && (res === "tous" || resDe(p).includes(res)));
  const debut = decale(-jours), avant = decale(-2 * jours);
  const per = pub.filter((p) => p.date >= debut), prec = pub.filter((p) => p.date >= avant && p.date < debut);
  const som = (L, k) => L.reduce((a, p) => a + (Number(p[k]) || 0), 0);
  const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const parJour = JOURS.map((label, i) => { const L = per.filter((p) => (new Date(p.date + "T12:00:00").getDay() + 6) % 7 === i); return { label, valeur: L.length ? Math.round(L.reduce((a, p) => a + engag(p), 0) / L.length) : 0 }; });
  const parRes = Object.entries(RES).map(([k, [l]]) => ({ label: l, valeur: per.filter((p) => resDe(p).includes(k)).reduce((a, p) => a + engag(p), 0) })).filter((x) => x.valeur);
  const top = [...per].sort((a, b) => engag(b) - engag(a)).slice(0, 5);
  return html`<div class="anim">
    <${Entete} titre="Résultats" sous="Ce qui plaît vraiment à votre public."><${Segments} valeur=${res} onChange=${setRes} options=${[["tous", "Tous"], ...Object.entries(RES).map(([k, v]) => [k, v[0]])]}/><select value=${jours} onChange=${(e) => setJours(Number(e.target.value))} class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option></select></${Entete}>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <${Kpi} icone="message" label="Publications" valeur=${per.length} tendance=${evol(per.length, prec.length)}/>
      <${Kpi} icone="etoile" label="J'aime" valeur=${fmt.num(som(per, "jaime"))} tendance=${evol(som(per, "jaime"), som(prec, "jaime"))}/>
      <${Kpi} icone="contacts" label="Commentaires" valeur=${fmt.num(som(per, "commentaires"))} tendance=${evol(som(per, "commentaires"), som(prec, "commentaires"))}/>
      <${Kpi} icone="graphique" label="Partages" valeur=${fmt.num(som(per, "partages"))} tendance=${evol(som(per, "partages"), som(prec, "partages"))}/>
    </div>
    <div class="mt-4 grid gap-4 lg:grid-cols-3">
      <${Carte} titre="Meilleur jour pour publier" classe="lg:col-span-2"><${ui.Bar} donnees=${parJour}/><p class="mt-2 text-xs text-slate-500">Interactions moyennes par publication selon le jour.</p></${Carte}>
      <${Carte} titre="Par réseau">${parRes.length ? html`<${ui.Donut} donnees=${parRes}/>` : html`<p class="text-sm text-slate-500">Pas encore de résultat.</p>`}</${Carte}>
    </div>
    <${Carte} titre="Vos meilleures publications" classe="mt-4">${top.length ? html`<div class="divide-y divide-slate-100">${top.map((p, i) => html`<button onClick=${() => go("publications", { ouvrir: p.id })} class="flex w-full items-start gap-3 py-3 text-left"><span class="grid w-7 h-7 shrink-0 place-items-center rounded-lg bg-[var(--c)]/10 text-xs font-bold text-[var(--c)]">${i + 1}</span><div class="min-w-0 flex-1"><p class="line-clamp-2 text-sm">${p.texte}</p><div class="mt-1 flex flex-wrap items-center gap-1">${resDe(p).map((r) => html`<${Puce} r=${r}/>`)}<span class="ml-1 text-xs text-slate-500">${fmt.date(p.date)}</span></div></div><div class="shrink-0 text-right text-xs text-slate-500"><p><span class="font-semibold text-slate-800">${fmt.num(p.jaime || 0)}</span> j'aime</p><p>${fmt.num(p.commentaires || 0)} comm. · ${fmt.num(p.partages || 0)} part.</p></div></button>`)}</div>` : html`<p class="text-sm text-slate-500">Marquez vos publications comme publiées et saisissez leurs résultats.</p>`}</${Carte}>
  </div>`;
}
