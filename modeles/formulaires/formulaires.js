function Ecran() {
  const F = useCollection("formulaires"), R = useCollection("reponses");
  const [selId, setSelId] = useState(null), [vue, setVue] = useState("modifier"), [brouillon, setBrouillon] = useState(null), [etat, setEtat] = useState("");
  const minuteur = useRef(null);
  const sel = F.rows.find((f) => f.id === selId) ?? [...F.rows].sort((x, y) => R.rows.filter((r) => r.formulaire_id === y.id).length - R.rows.filter((r) => r.formulaire_id === x.id).length)[0] ?? null;
  useEffect(() => { if (sel && brouillon?.id !== sel.id) setBrouillon({ ...sel, questions: qsDe(sel) }); }, [sel?.id, F.loading]);
  if (F.loading) return html`<${ui.Loading}/>`;
  // Enregistrement automatique, un instant après la dernière modification
  const maj = (d) => { const n = { ...brouillon, ...d }; setBrouillon(n); setEtat("…"); clearTimeout(minuteur.current); minuteur.current = setTimeout(async () => { const { id, created_at, updated_at, ...x } = n; await F.update(id, x); setEtat("Enregistré"); }, 600); };
  const creer = async () => { const r = await F.add({ titre: "Nouveau formulaire", intro: "", emoji: "📝", merci: "Merci, vos réponses sont bien envoyées.", ouvert: false, questions: [{ id: "q" + Date.now().toString(36), type: "texte", titre: "Votre nom", aide: "", options: [], obligatoire: true }] }); if (r?.id) { setSelId(r.id); setVue("modifier"); } toast("Formulaire créé"); };
  const nbR = (id) => R.rows.filter((r) => r.formulaire_id === id).length;
  const b = brouillon && sel && brouillon.id === sel.id ? brouillon : null;
  return html`<div class="anim">
    <${Entete} titre="Formulaires" sous="Construisez, prévisualisez, ouvrez aux réponses."><${Bouton} onClick=${creer}>+ Nouveau formulaire</${Bouton}></${Entete}>
    ${F.rows.length ? html`<div class="grid gap-4 lg:grid-cols-3">
      <div class="space-y-2">${F.rows.map((f) => html`<button aria-pressed=${sel?.id === f.id ? "true" : "false"} onClick=${() => setSelId(f.id)} class=${"flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left transition " + (sel?.id === f.id ? "border-[var(--c)] ring-2 ring-[var(--c)]/15" : "border-slate-200/70 hover:border-slate-300")}><span class="grid w-11 h-11 shrink-0 place-items-center rounded-xl bg-[var(--c)]/10 text-2xl">${f.emoji || "📝"}</span><div class="min-w-0 flex-1"><p class="truncate font-semibold">${f.titre}</p><p class="text-xs text-slate-500">${qsDe(f).length} questions · ${nbR(f.id)} réponse(s)</p></div><${Pill} ton=${f.ouvert ? "vert" : "gris"}>${f.ouvert ? "Ouvert" : "Fermé"}</${Pill}></button>`)}</div>
      ${b && html`<div class="lg:col-span-2"><${Carte}>
        <div class="flex flex-wrap items-center gap-2"><${Segments} valeur=${vue} onChange=${setVue} options=${[["modifier", "Modifier"], ["apercu", "Aperçu"]]}/><span class="text-xs text-slate-500">${etat}</span><span class="ml-auto"></span><${Bouton} secondaire petit onClick=${() => go("reponses", { formulaire: b.id })}>Réponses (${nbR(b.id)})</${Bouton}><${Bouton} petit onClick=${() => { maj({ ouvert: !b.ouvert }); toast(b.ouvert ? "Formulaire fermé aux réponses" : "Formulaire ouvert : il est visible sur votre page publique"); }}>${b.ouvert ? "Fermer" : "Ouvrir aux réponses"}</${Bouton}><${Menu} actions=${[["Dupliquer", async () => { const { id, created_at, updated_at, ...d } = b; await F.add({ ...d, titre: d.titre + " (copie)", ouvert: false }); toast("Formulaire dupliqué"); }], ["Supprimer", async () => { if (await demander("Supprimer ce formulaire ? Ses réponses sont gardées.", { ok: "Supprimer", danger: true })) { await F.remove(b.id); setSelId(null); setBrouillon(null); } }, true]]}/></div>
        ${vue === "modifier" ? html`<div class="mt-4 space-y-3"><div class="grid gap-3 sm:grid-cols-6"><div class="sm:col-span-1"><${ui.Input} label="Emoji" value=${b.emoji} onInput=${(v) => maj({ emoji: v })}/></div><div class="sm:col-span-5"><${ui.Input} label="Titre" value=${b.titre} onInput=${(v) => maj({ titre: v })}/></div></div><${ui.Input} label="Introduction" value=${b.intro} onInput=${(v) => maj({ intro: v })}/><${ui.ConstructeurFormulaire} value=${b.questions} onChange=${(q) => maj({ questions: q })}/><${ui.Input} label="Message de remerciement" value=${b.merci} onInput=${(v) => maj({ merci: v })}/></div>`
          : html`<div class="mt-4 rounded-2xl bg-slate-50 p-4"><${ui.Questionnaire} questions=${b.questions} titre=${b.titre} intro=${b.intro} merci=${b.merci} apercu=${true}/></div>`}
      </${Carte}></div>`}
    </div>` : html`<${Vide} icone="fichier" titre="Aucun formulaire" texte="Créez votre premier formulaire en une minute." action=${html`<${Bouton} onClick=${creer}>Créer un formulaire</${Bouton}>`}/>`}
  </div>`;
}
