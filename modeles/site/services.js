function Ecran() {
  const S = useCollection("services"), I = useCollection("infos");
  const [edit, setEdit] = useState(null);
  if (S.loading || I.loading) return html`<${ui.Loading}/>`;
  const inf = I.rows[0];
  const confirmer = async () => { if (inf?.id) await I.update(inf.id, { prix_verifies: true }); else await I.add({ prix_verifies: true }); toast("Merci ! Vos prix sont confirmés"); };
  const liste = [...S.rows].sort((a, b) => (Number(a.ordre) || 0) - (Number(b.ordre) || 0));
  const enregistrer = async () => {
    if (!String(edit.titre ?? "").trim()) { toast("Donnez un nom au service", "bad"); return; }
    const d = { titre: edit.titre.trim(), description: edit.description ?? "", prix: edit.prix === "" || edit.prix == null ? null : Number(String(edit.prix).replace(",", ".")), prix_texte: edit.prix_texte ? "à partir de" : "", duree: edit.duree ?? "", visible: edit.visible !== false };
    if (d.prix != null && !(d.prix >= 0)) { toast("Le prix doit être un nombre", "bad"); return; }
    if (edit.id) await S.update(edit.id, d); else await S.add({ ...d, ordre: (liste.length ? Math.max(...liste.map((x) => Number(x.ordre) || 0)) : 0) + 1 });
    setEdit(null); toast("Service enregistré : il est à jour sur votre site");
  };
  const bouger = async (i, sens) => { const a = liste[i], b = liste[i + sens]; if (!a || !b) return; await S.update(a.id, { ordre: Number(b.ordre) || i + sens + 1 }); await S.update(b.id, { ordre: Number(a.ordre) || i + 1 }); };
  const basculer = async (s) => { await S.update(s.id, { visible: s.visible === false }); toast(s.visible === false ? "Service affiché sur le site" : "Service masqué du site"); };
  return html`<div class="anim">
    <${Entete} titre="Services" sous="Ce que vous proposez, avec vos prix : c'est ce qu'affiche votre site, dans cet ordre."><${Bouton} onClick=${() => setEdit({ titre: "", description: "", prix: "", prix_texte: "", duree: "", visible: true })}>+ Ajouter un service</${Bouton}></${Entete}>
    ${!inf?.prix_verifies && liste.length > 0 && html`<div class="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p class="min-w-0 flex-1 text-sm text-amber-900"><b>Ces prix ont été proposés à la construction de votre site.</b> Mettez vos vrais tarifs et vos durées, puis confirmez : vos visiteurs les voient déjà.</p><${Bouton} petit onClick=${confirmer}>Mes prix sont justes</${Bouton}></div>`}
    ${liste.length ? html`<div class="space-y-2">${liste.map((s, i) => html`<div class=${"flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] " + (s.visible === false ? "border-dashed border-slate-300 opacity-70" : "border-slate-200/70")}>
      <div class="flex flex-col"><button aria-label="Monter" title="Monter" disabled=${i === 0} onClick=${() => bouger(i, -1)} class="h-5 w-6 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30">▲</button><button aria-label="Descendre" title="Descendre" disabled=${i === liste.length - 1} onClick=${() => bouger(i, 1)} class="h-5 w-6 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30">▼</button></div>
      <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><p class="font-semibold">${s.titre}</p>${s.duree && html`<${Pill} ton="gris">${s.duree}</${Pill}>`}${s.visible === false && html`<${Pill} ton="orange">Masqué</${Pill}>`}</div>${s.description && html`<p class="mt-0.5 text-sm text-slate-500">${s.description}</p>`}</div>
      <p class="text-lg font-bold tabular-nums text-[var(--c)]">${prixDe(s)}</p>
      <div class="flex items-center gap-1"><${Bouton} petit secondaire onClick=${() => setEdit({ ...s, prix: s.prix ?? "" })}>Modifier</${Bouton}><${Menu} actions=${[[s.visible === false ? "Afficher sur le site" : "Masquer du site", () => basculer(s)], ["Supprimer", async () => { if (await demander("Supprimer « " + s.titre + " » ?", { ok: "Supprimer", danger: true })) { await S.remove(s.id); toast("Service supprimé"); } }, true]]}/></div>
    </div>`)}</div>` : html`<${Vide} icone="tag" titre="Aucun service" texte="Ajoutez ce que vous proposez : il apparaît tout de suite sur votre site." action=${html`<${Bouton} onClick=${() => setEdit({ titre: "", description: "", prix: "", prix_texte: "", duree: "", visible: true })}>+ Ajouter un service</${Bouton}>`}/>`}
    <p class="mt-4 text-xs text-slate-400">Sans prix, le site affiche « Sur devis ». Cochez « à partir de » quand le prix varie.</p>
    <${ui.Modal} open=${!!edit} onClose=${() => setEdit(null)} titre=${edit?.id ? "Modifier le service" : "Nouveau service"} actions=${html`<${ui.Button} variant="secondary" onClick=${() => setEdit(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
      ${edit && html`<div class="grid gap-3 sm:grid-cols-2"><div class="sm:col-span-2"><${ui.Input} label="Nom du service" value=${edit.titre} onInput=${(v) => setEdit({ ...edit, titre: v })}/></div><div class="sm:col-span-2"><${ui.Textarea} label="Description (une phrase)" rows=${2} value=${edit.description} onInput=${(v) => setEdit({ ...edit, description: v })}/></div><${ui.Input} label="Prix en euros (vide = sur devis)" value=${String(edit.prix ?? "")} onInput=${(v) => setEdit({ ...edit, prix: v })}/><${ui.Input} label="Durée (facultatif)" value=${edit.duree} onInput=${(v) => setEdit({ ...edit, duree: v })} placeholder="45 min"/>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" checked=${!!edit.prix_texte} onChange=${(e) => setEdit({ ...edit, prix_texte: e.target.checked ? "à partir de" : "" })}/>Afficher « à partir de »</label><label class="flex items-center gap-2 text-sm"><input type="checkbox" checked=${edit.visible !== false} onChange=${(e) => setEdit({ ...edit, visible: e.target.checked })}/>Visible sur le site</label></div>`}
    </${ui.Modal}>
  </div>`;
}
