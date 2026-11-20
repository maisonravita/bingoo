function Ecran() {
  const P = useCollection("prestations"), R = useCollection("rendezvous");
  const [m, setM] = useState(null), [vue, setVue] = useState("toutes");
  const auj = jourISO(new Date());
  const compte = (p, a, b) => R.rows.filter((r) => r.prestation_id === p.id && r.statut !== "annule" && r.date >= a && r.date <= b).length;
  const enregistrer = async () => { const { id, created_at, updated_at, ...d } = m; if (!String(d.nom ?? "").trim()) { toast("Le nom est obligatoire", "bad"); return; } const data = { ...d, prix: Number(d.prix) || 0, duree: Number(d.duree) || 30 }; if (id) await P.update(id, data); else await P.add(data); setM(null); toast("Enregistré"); };
  const supprimer = async (p) => { if (!await demander("Supprimer « " + p.nom + " » ?", { ok: "Supprimer", danger: true })) return; await P.remove(p.id); setM(null); toast("Supprimé"); };
  const dupliquer = async (p) => { const { id, created_at, updated_at, ...d } = p; await P.add({ ...d, nom: p.nom + " (copie)" }); toast(V.presta + " dupliquée"); };
  const liste = P.rows.filter((p) => vue === "toutes" || (vue === "visibles" ? p.actif !== false : p.actif === false));
  if (P.loading) return html`<${ui.Loading}/>`;
  return html`<div>
    <${Entete} titre=${V.prestas} sous=${"Gérez vos " + V.prestas.toLowerCase() + " et vos tarifs. Ce sont elles que vos " + V.clients.toLowerCase() + " voient sur votre page de réservation."}>
      <${Segments} valeur=${vue} onChange=${setVue} options=${[["toutes", "Toutes"], ["visibles", "En ligne"], ["masquees", "Masquées"]]}/>
      <${ui.Button} icone="plus" onClick=${() => setM({ nom: "", prix: 0, duree: 60, description: "", actif: true })}>Ajouter</${ui.Button}>
    </${Entete}>
    ${!liste.length ? html`<${ui.Empty} texte=${vue === "masquees" ? "Aucune " + V.presta.toLowerCase() + " masquée." : "Ajoutez ce que vous proposez, avec votre prix et votre durée."}/>` : html`<div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">${liste.map((p) => { const ce = compte(p, decale(-29), auj), av = compte(p, decale(-59), decale(-30)); return html`<div class=${"rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.04)] transition hover:shadow-md " + (p.actif === false ? "border-dashed border-slate-300 opacity-60" : "border-slate-200/70")}>
      <div class="flex items-start justify-between gap-2"><span class="grid w-10 h-10 place-items-center rounded-xl bg-[var(--c)]/10 text-[var(--c)]"><${Icone} nom="tag" class="w-5 h-5"/></span><div class="flex items-center gap-1"><button onClick=${() => setM({ ...p })} class="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">Modifier</button><${Menu} actions=${[[p.actif === false ? "Remettre en ligne" : "Masquer de la page de réservation", () => P.update(p.id, { actif: p.actif === false }).then(() => toast(p.actif === false ? "Remise en ligne" : "Masquée"))], ["Dupliquer", () => dupliquer(p)], ["Supprimer", () => supprimer(p), true]]}/></div></div>
      <p class="mt-3 font-semibold">${p.nom}</p>
      <p class="mt-0.5 text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">${p.description || "—"}</p>
      <div class="mt-3 flex items-end justify-between gap-3"><p class="text-2xl font-bold tabular-nums">${fmt.eur(p.prix)}</p><div class="text-right"><${Tendance} v=${evol(ce, av)}/><p class="text-xs text-slate-500">${p.duree} min · ${ce} ce mois</p></div></div>
    </div>`; })}</div>`}
    <${ui.Modal} open=${!!m} onClose=${() => setM(null)} titre=${m?.id ? m.nom : "Nouvelle " + V.presta.toLowerCase()} actions=${html`${m?.id && html`<${ui.Button} variant="danger" onClick=${() => supprimer(m)}>Supprimer</${ui.Button}>`}<${ui.Button} variant="secondary" onClick=${() => setM(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
      ${m && html`<div class="grid sm:grid-cols-2 gap-3"><div class="sm:col-span-2"><${ui.Input} label="Nom" value=${m.nom} onInput=${(v) => setM({ ...m, nom: v })}/></div><${ui.Input} label="Prix (€)" type="number" value=${m.prix} onInput=${(v) => setM({ ...m, prix: v })}/><${ui.Input} label="Durée (minutes)" type="number" value=${m.duree} onInput=${(v) => setM({ ...m, duree: v })}/><div class="sm:col-span-2"><${ui.Textarea} label="Description" value=${m.description} onInput=${(v) => setM({ ...m, description: v })}/></div><label class="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" class="w-4 h-4 accent-[var(--c)]" checked=${m.actif !== false} onChange=${(e) => setM({ ...m, actif: e.target.checked })}/> Visible sur la page de réservation</label></div>`}
    </${ui.Modal}>
  </div>`;
}
