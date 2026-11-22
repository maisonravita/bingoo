function Ecran() {
  const P = useCollection("pages");
  const [vue, setVue] = useState("a_faire");
  if (P.loading) return html`<${ui.Loading}/>`;
  const pages = P.rows.filter((p) => !p.corbeille);
  const blocs = (p) => { let c = p.contenu; if (typeof c === "string") { try { c = JSON.parse(c); } catch (_) { c = []; } } return Array.isArray(c) ? c : []; };
  const toutes = pages.flatMap((p) => blocs(p).filter((b) => b.type === "todo" && String(b.texte ?? "").trim()).map((b) => ({ p, b })));
  const vues = toutes.filter(({ b }) => vue === "toutes" || (vue === "faites" ? b.fait : !b.fait));
  const cocher = async (p, id) => { const c = blocs(p).map((b) => b.id === id ? { ...b, fait: !b.fait } : b); await P.update(p.id, { contenu: c }); };
  const parPage = pages.map((p) => ({ p, L: vues.filter((x) => x.p.id === p.id) })).filter((x) => x.L.length);
  const faites = toutes.filter(({ b }) => b.fait).length;
  return html`<div class="anim">
    <${Entete} titre="Cases à cocher" sous=${faites + " faites sur " + toutes.length + ", dans toutes vos pages."}><${Segments} valeur=${vue} onChange=${setVue} options=${[["a_faire", "À faire"], ["faites", "Faites"], ["toutes", "Toutes"]]}/></${Entete}>
    <div class="mb-4"><${ui.Progress} valeur=${faites} max=${toutes.length || 1} label="Avancement"/></div>
    ${parPage.length ? html`<div class="grid gap-4 md:grid-cols-2">${parPage.map(({ p, L }) => html`<${Carte} titre=${html`<button onClick=${() => go("pages", { ouvrir: p.id })} class="hover:text-[var(--c)]">${p.emoji} ${p.titre}</button>`}><div class="space-y-1">${L.map(({ b }) => html`<label class="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1.5 hover:bg-slate-50"><input type="checkbox" checked=${!!b.fait} onChange=${() => cocher(p, b.id)} class="mt-0.5 w-4 h-4 accent-[var(--c)]"/><span class=${"text-sm " + (b.fait ? "text-slate-500 line-through" : "")}>${b.texte}</span></label>`)}</div></${Carte}>`)}</div>` : html`<${Vide} icone="check" titre=${vue === "faites" ? "Rien de coché pour l'instant" : "Tout est fait !"} texte="Ajoutez des cases à cocher dans vos pages avec « [] » ou le menu « / »."/>`}
  </div>`;
}
