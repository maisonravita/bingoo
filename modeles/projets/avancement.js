// Modèle Projets — « Avancement » : où en est chaque projet, qui porte quoi, ce qui coince.
function Ecran(props) {
  const T = useCollection("tableaux");
  const auj = new Date().toISOString().slice(0, 10);
  const dans = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const contenuDe = (r) => { let v = r?.contenu; if (typeof v === "string") { try { v = JSON.parse(v); } catch (e) { v = null; } } return { colonnes: Array.isArray(v?.colonnes) ? v.colonnes : [], cartes: Array.isArray(v?.cartes) ? v.cartes : [] }; };
  const finie = (c, cols) => { const i = cols.findIndex((x) => x.id === c.colonne); return i >= 0 && (i === cols.length - 1 || /^(termin|fait|livr|clos|archiv)/i.test(cols[i].nom ?? "")); };
  if (T.loading) return html`<${ui.Loading}/>`;
  const projets = T.rows.filter((r) => !r.archive).map((r) => { const x = contenuDe(r); const cs = x.cartes.map((c) => ({ ...c, fini: finie(c, x.colonnes), tableau: r })); const faites = cs.filter((c) => c.fini).length;
    return { r, x, cs, faites, retard: cs.filter((c) => !c.fini && c.echeance && c.echeance < auj), bientot: cs.filter((c) => !c.fini && c.echeance >= auj && c.echeance <= dans(7)), pct: cs.length ? Math.round(faites / cs.length * 100) : 0 }; });
  const toutes = projets.flatMap((p) => p.cs), ouvertes = toutes.filter((c) => !c.fini);
  const retards = projets.flatMap((p) => p.retard).sort((a, b) => a.echeance.localeCompare(b.echeance));
  const pctGlobal = toutes.length ? Math.round(toutes.filter((c) => c.fini).length / toutes.length * 100) : 0;
  const parPersonne = Object.entries(ouvertes.reduce((a, c) => { const k = c.responsable || "Sans responsable"; a[k] = (a[k] ?? 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const sante = (p) => p.retard.length >= 3 || (p.cs.length && p.retard.length / p.cs.length > 0.25) ? ["rouge", "En difficulté"] : p.retard.length ? ["orange", "À surveiller"] : ["vert", "Dans les temps"];
  return html`<${ui.Page} titre="Avancement" sous="Où en est chaque projet, qui porte quoi, et ce qui prend du retard.">
    <div class="mb-6 rounded-2xl bg-white border border-slate-200 p-5 flex flex-wrap items-center gap-6">
      <${ui.Anneau} valeur=${pctGlobal} max=${100} sous="terminé" taille="petit"/>
      <div class="flex-1 min-w-[220px]"><p class="text-lg font-semibold">${projets.length} projet${projets.length > 1 ? "s" : ""} en cours, ${ouvertes.length} ${V.cartes.toLowerCase()} ouverte${ouvertes.length > 1 ? "s" : ""}</p>
        <p class="text-sm text-slate-500">${retards.length ? retards.length + " en retard, " : "Aucun retard, "}${projets.reduce((a, p) => a + p.bientot.length, 0)} à rendre dans les 7 jours.</p></div>
    </div>
    <div class="grid lg:grid-cols-3 gap-4">
      <section class="lg:col-span-2 space-y-3"><h2 class="text-sm font-semibold text-slate-700">Projets</h2>
        ${projets.length ? projets.map((p) => { const [c, l] = sante(p); return html`<div onClick=${() => go("tableaux", { tableau: p.r.id })} class="cursor-pointer rounded-2xl bg-white border border-slate-200 p-4 hover:border-slate-300">
          <div class="flex items-center gap-3"><span class="text-xl">${p.r.emoji || "📋"}</span><p class="flex-1 min-w-0 font-semibold truncate">${p.r.nom}</p><${ui.Badge} couleur=${c}>${l}</${ui.Badge}></div>
          <div class="mt-3"><${ui.Progress} valeur=${p.faites} max=${Math.max(1, p.cs.length)} label=${p.faites + " sur " + p.cs.length + " terminées"}/></div>
          <div class="mt-3 flex gap-1 h-2 rounded-full overflow-hidden bg-slate-100">${p.x.colonnes.map((col, i) => { const n = p.cs.filter((k) => k.colonne === col.id).length; return n ? html`<div title=${col.nom + " : " + n} style=${"flex:" + n + ";background:" + (p.r.couleur || "#2563eb") + ";opacity:" + (0.25 + 0.75 * (i + 1) / p.x.colonnes.length)}></div>` : null; })}</div>
          <div class="mt-1.5 flex flex-wrap gap-x-3 text-xs text-slate-500">${p.x.colonnes.map((col) => html`<span>${col.nom} ${p.cs.filter((k) => k.colonne === col.id).length}</span>`)}</div>
        </div>`; }) : html`<${ui.Empty} texte="Aucun projet en cours."/>`}
      </section>
      <div class="space-y-4">
        <section class="rounded-2xl bg-white border border-slate-200 p-4"><h2 class="text-sm font-semibold text-slate-700 mb-3">Charge par personne</h2>
          ${parPersonne.length ? html`<div class="space-y-2.5">${parPersonne.map(([n, v]) => html`<div><div class="flex justify-between text-sm"><span class="truncate">${n}</span><span class="tabular-nums text-slate-500">${v}</span></div><div class="mt-1 h-1.5 rounded-full bg-slate-100"><div class="h-full rounded-full bg-[var(--c)]" style=${"width:" + Math.round(v / parPersonne[0][1] * 100) + "%"}></div></div></div>`)}</div>` : html`<p class="text-sm text-slate-500">Personne n'a de tâche ouverte.</p>`}
        </section>
        <section class="rounded-2xl bg-white border border-slate-200 p-4"><h2 class="text-sm font-semibold text-slate-700 mb-3">En retard</h2>
          ${retards.length ? html`<div class="space-y-2">${retards.slice(0, 8).map((c) => html`<button onClick=${() => go("tableaux", { tableau: c.tableau.id })} class="w-full text-left rounded-xl px-2 py-1.5 hover:bg-slate-50"><p class="text-sm font-medium truncate">${c.titre}</p><p class="text-xs text-slate-500 truncate">${c.tableau.emoji || "📋"} ${c.tableau.nom} · ${c.responsable || "sans responsable"} · <span class="text-red-600">${fmt.date(c.echeance)}</span></p></button>`)}</div>` : html`<p class="text-sm text-slate-500">Rien en retard. 👏</p>`}
        </section>
      </div>
    </div>
  </${ui.Page}>`;
}
