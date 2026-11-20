function Ecran() {
  const R = useCollection("realisations");
  const [edit, setEdit] = useState(null), [filtre, setFiltre] = useState("");
  if (R.loading) return html`<${ui.Loading}/>`;
  const liste = [...R.rows].sort((a, b) => (Number(a.ordre) || 0) - (Number(b.ordre) || 0));
  const cats = [...new Set(liste.map((r) => r.categorie).filter(Boolean))];
  const vues = liste.filter((r) => !filtre || r.categorie === filtre);
  const vide = { titre: "", categorie: "", description: "", image: "", lien: "", visible: true };
  const enregistrer = async () => {
    if (!String(edit.titre ?? "").trim()) { toast("Donnez un titre au projet", "bad"); return; }
    if (edit.lien && !/^https?:\/\//.test(edit.lien)) { toast("Le lien doit commencer par https://", "bad"); return; }
    const d = { titre: edit.titre.trim(), categorie: (edit.categorie ?? "").trim(), description: edit.description ?? "", image: edit.image ?? "", lien: edit.lien ?? "", visible: edit.visible !== false };
    if (edit.id) await R.update(edit.id, d); else await R.add({ ...d, ordre: (liste.length ? Math.max(...liste.map((x) => Number(x.ordre) || 0)) : 0) + 1 });
    setEdit(null); toast("Projet enregistré : il est à jour sur votre site");
  };
  const bouger = async (r, sens) => { const i = liste.findIndex((x) => x.id === r.id), b = liste[i + sens]; if (!b) return; await R.update(r.id, { ordre: Number(b.ordre) || i + sens + 1 }); await R.update(b.id, { ordre: Number(r.ordre) || i + 1 }); };
  return html`<div class="anim">
    <${Entete} titre="Réalisations" sous="Vos projets, avec leurs photos : c'est ce que vos visiteurs regardent en premier."><${Bouton} onClick=${() => setEdit({ ...vide })}>+ Ajouter un projet</${Bouton}></${Entete}>
    ${cats.length > 1 && html`<div class="mb-4"><${Segments} valeur=${filtre} onChange=${setFiltre} options=${[["", "Tous"], ...cats.map((c) => [c, c])]}/></div>`}
    ${vues.length ? html`<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">${vues.map((r) => html`<div class=${"overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)] " + (r.visible === false ? "border-dashed border-slate-300 opacity-70" : "border-slate-200/70")}>
      ${r.image ? html`<img src=${r.image} alt=${r.titre} class="aspect-[4/3] w-full object-cover"/>` : html`<button onClick=${() => setEdit({ ...r })} class="grid aspect-[4/3] w-full place-items-center bg-[var(--c)]/5 text-sm font-semibold text-[var(--c)]">+ Ajouter la photo</button>`}
      <div class="p-4"><div class="flex items-start justify-between gap-2"><div class="min-w-0"><p class="truncate font-semibold">${r.titre}</p>${r.categorie && html`<p class="text-xs text-slate-500">${r.categorie}</p>`}</div><${Menu} actions=${[["Modifier", () => setEdit({ ...r })], ["Monter", () => bouger(r, -1)], ["Descendre", () => bouger(r, 1)], [r.visible === false ? "Afficher sur le site" : "Masquer du site", async () => { await R.update(r.id, { visible: r.visible === false }); toast(r.visible === false ? "Projet affiché sur le site" : "Projet masqué du site"); }], ["Supprimer", async () => { if (await demander("Supprimer « " + r.titre + " » ?", { ok: "Supprimer", danger: true })) { await R.remove(r.id); toast("Projet supprimé"); } }, true]]}/></div>
        ${r.description && html`<p class="mt-1.5 text-sm text-slate-500">${r.description}</p>`}${r.visible === false && html`<div class="mt-2"><${Pill} ton="orange">Masqué</${Pill}></div>`}</div>
    </div>`)}</div>` : html`<${Vide} icone="etoile" titre="Aucun projet pour l'instant" texte="Ajoutez vos réalisations avec une photo : elles apparaissent tout de suite sur votre site." action=${html`<${Bouton} onClick=${() => setEdit({ ...vide })}>+ Ajouter un projet</${Bouton}>`}/>`}
    <${ui.Modal} open=${!!edit} onClose=${() => setEdit(null)} titre=${edit?.id ? "Modifier le projet" : "Nouveau projet"} actions=${html`<${ui.Button} variant="secondary" onClick=${() => setEdit(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
      ${edit && html`<div class="grid gap-3 sm:grid-cols-2"><div class="sm:col-span-2"><${ui.Fichier} label="Photo du projet" value=${edit.image} accept="image/*" onChange=${(f) => setEdit({ ...edit, image: f?.url ?? "" })}/></div><${ui.Input} label="Titre" value=${edit.titre} onInput=${(v) => setEdit({ ...edit, titre: v })}/><${ui.Input} label="Catégorie (facultatif)" value=${edit.categorie} onInput=${(v) => setEdit({ ...edit, categorie: v })} placeholder="Mariage, Logo, Site web…"/><div class="sm:col-span-2"><${ui.Textarea} label="Description (une ou deux phrases)" rows=${2} value=${edit.description} onInput=${(v) => setEdit({ ...edit, description: v })}/></div><div class="sm:col-span-2"><${ui.Input} label="Lien vers le projet (facultatif)" value=${edit.lien} onInput=${(v) => setEdit({ ...edit, lien: v })} placeholder="https://…"/></div><label class="flex items-center gap-2 text-sm"><input type="checkbox" checked=${edit.visible !== false} onChange=${(e) => setEdit({ ...edit, visible: e.target.checked })}/>Visible sur le site</label></div>`}
    </${ui.Modal}>
  </div>`;
}
