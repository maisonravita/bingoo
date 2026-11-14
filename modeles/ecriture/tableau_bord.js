function Ecran() {
  const D = useCollection("documents");
  const types = V.types ?? [];
  const mots = (s) => (String(s ?? "").trim().match(/\S+/g) ?? []).length;
  if (D.loading) return html`<${ui.Loading}/>`;
  const mois = new Date().toISOString().slice(0, 7);
  const ceMois = D.rows.filter((d) => String(d.created_at).slice(0, 7) === mois);
  const total = D.rows.reduce((a, d) => a + (Number(d.mots) || mots(d.contenu)), 0);
  const lundi = new Date(); lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
  const semaines = Array.from({ length: 8 }, (_, i) => { const a = new Date(lundi); a.setDate(a.getDate() - (7 - i) * 7); const b = new Date(a); b.setDate(a.getDate() + 7); const A = a.toISOString().slice(0, 10), Bd = b.toISOString().slice(0, 10); return { label: a.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), valeur: D.rows.filter((d) => String(d.created_at).slice(0, 10) >= A && String(d.created_at).slice(0, 10) < Bd).length }; });
  const parType = types.map((t) => ({ label: t.nom, valeur: D.rows.filter((d) => d.type === t.id).length })).filter((x) => x.valeur);
  const recents = [...D.rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 5);
  return html`<${ui.Page} titre="Tableau de bord" sous=${"Bonjour" + (user?.nom ? " " + String(user.nom).split(" ")[0] : "") + ", que veux-tu écrire aujourd'hui ?"}>
    <div class="grid sm:grid-cols-2 lg:grid-cols-${Math.min(4, Math.max(2, types.length))} gap-3 mb-4">${types.map((t) => html`<button onClick=${() => go("creer", { type: t.id })} class="group text-left rounded-2xl bg-[var(--c)] text-white p-4 hover:brightness-110 transition"><p class="font-semibold">+ ${t.nom}</p><p class="mt-1 text-sm text-white/75 line-clamp-2">${t.description}</p></button>`)}</div>
    <div class="grid sm:grid-cols-3 gap-4"><${ui.Stat} label="Écrits ce mois" valeur=${ceMois.length} icone="fichier"/><${ui.Stat} label=${V.docs + " au total"} valeur=${D.rows.length} sous=${D.rows.filter((d) => d.favori).length + " en favoris"} icone="boite"/><${ui.Stat} label="Mots écrits" valeur=${fmt.num(total)} icone="message"/></div>
    <div class="mt-4 grid lg:grid-cols-3 gap-4"><${ui.Card} class="lg:col-span-2" titre="Ton rythme d'écriture"><${ui.Bar} donnees=${semaines}/></${ui.Card}><${ui.Card} titre="Par type">${parType.length ? html`<${ui.Donut} donnees=${parType}/>` : html`<${ui.Empty} texte="Pas encore de texte."/>`}</${ui.Card}></div>
    <${ui.Card} class="mt-4" titre="Derniers textes" actions=${html`<${ui.Button} variant="ghost" onClick=${() => go("documents")}>Tout voir</${ui.Button}>`}>${recents.length ? html`<div class="divide-y divide-slate-100">${recents.map((d) => html`<button onClick=${() => go("documents", { ouvrir: d.id })} class="w-full text-left flex items-center gap-4 py-2.5 hover:bg-slate-50 rounded-lg px-1"><div class="flex-1 min-w-0"><p class="font-medium truncate">${d.titre}</p><p class="text-sm text-slate-500 truncate">${String(d.contenu ?? "").slice(0, 110)}</p></div><span class="text-xs text-slate-400 shrink-0">${fmt.date(d.created_at)}</span></button>`)}</div>` : html`<${ui.Empty} texte="Ton premier texte t'attend."/>`}</${ui.Card}>
  </${ui.Page}>`;
}
