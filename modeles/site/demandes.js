function Ecran() {
  const D = useCollection("demandes");
  const [filtre, setFiltre] = useState("nouvelle"), [q, setQ] = useState(""), [selId, setSelId] = useState(params?.ouvrir ?? null), [note, setNote] = useState(null), [nouvelle, setNouvelle] = useState(null);
  if (D.loading) return html`<${ui.Loading}/>`;
  const ql = q.trim().toLowerCase();
  const nb = (s) => D.rows.filter((d) => (d.statut || "nouvelle") === s).length;
  const vues = D.rows.filter((d) => (filtre === "toutes" || (d.statut || "nouvelle") === filtre) && (!ql || (d.nom + " " + (d.email ?? "") + " " + (d.telephone ?? "") + " " + (d.service ?? "") + " " + (d.message ?? "")).toLowerCase().includes(ql))).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const sel = D.rows.find((d) => d.id === selId) ?? vues[0] ?? null;
  const statut = async (s) => { await D.update(sel.id, { statut: s }); toast(s === "traitee" ? "Demande traitée" : s === "en_cours" ? "Demande en cours" : "Demande remise à traiter"); };
  const garderNote = async () => { await D.update(sel.id, { note: note ?? "" }); setNote(null); toast("Note enregistrée"); };
  const creer = async () => { if (!nouvelle.nom) { toast("Indiquez au moins un nom", "bad"); return; } const r = await D.add({ ...nouvelle, statut: "nouvelle" }); setNouvelle(null); setFiltre("nouvelle"); if (r?.id) setSelId(r.id); toast("Demande ajoutée"); };
  const sujet = encodeURIComponent("Votre demande" + (sel?.service ? " : " + sel.service : ""));
  return html`<div class="anim">
    <${Entete} titre="Demandes" sous="Tout ce que vos visiteurs vous envoient depuis votre site."><${Recherche} valeur=${q} onInput=${setQ} placeholder="Rechercher…"/><${Bouton} secondaire onClick=${() => setNouvelle({ nom: "", email: "", telephone: "", service: "", message: "" })}>+ Ajouter à la main</${Bouton}></${Entete}>
    <div class="mb-4"><${Onglets} valeur=${filtre} onChange=${(v) => { setFiltre(v); setSelId(null); }} options=${[["nouvelle", "À traiter (" + nb("nouvelle") + ")"], ["en_cours", "En cours (" + nb("en_cours") + ")"], ["traitee", "Traitées (" + nb("traitee") + ")"], ["toutes", "Toutes"]]}/></div>
    <div class="grid gap-4 lg:grid-cols-5">
      <div class="lg:col-span-2 rounded-2xl border border-slate-200/70 bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
        ${vues.length ? vues.map((d) => html`<button aria-pressed=${sel?.id === d.id ? "true" : "false"} onClick=${() => { setSelId(d.id); setNote(null); }} class=${"flex w-full items-start gap-3 rounded-xl p-3 text-left transition " + (sel?.id === d.id ? "bg-[var(--c)]/8 ring-1 ring-[var(--c)]/20" : "hover:bg-slate-50")}><${Avatar} nom=${d.nom}/><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><p class="truncate font-semibold text-sm">${d.nom}</p><span class="ml-auto shrink-0 text-xs text-slate-400">${ilya(d.created_at)}</span></div><p class="truncate text-sm text-slate-600">${d.service || "Demande"}</p>${d.message && html`<p class="truncate text-xs text-slate-400">${d.message}</p>`}</div></button>`)
          : html`<p class="py-10 text-center text-sm text-slate-400">Aucune demande ici.</p>`}
      </div>
      <div class="lg:col-span-3">${sel ? html`<${Carte}>
        <div class="flex flex-wrap items-start justify-between gap-3"><div class="flex items-center gap-3"><${Avatar} nom=${sel.nom} taille="w-11 h-11 text-sm"/><div><h2 class="text-lg font-bold">${sel.nom}</h2><p class="text-sm text-slate-500">Reçue ${ilya(sel.created_at).toLowerCase()} · ${fmt.dateHeure(sel.created_at)}</p></div></div><${Pill} ton=${STATUTS_D[sel.statut]?.[1] ?? "orange"}>${STATUTS_D[sel.statut]?.[0] ?? "Nouvelle"}</${Pill}></div>
        <dl class="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div class="rounded-xl bg-slate-50 p-3"><dt class="text-xs text-slate-500">Pour</dt><dd class="font-semibold">${sel.service || "Non précisé"}</dd></div>
          ${sel.date_souhaitee ? html`<div class="rounded-xl bg-slate-50 p-3"><dt class="text-xs text-slate-500">Date souhaitée</dt><dd class="font-semibold">${dateCourte(sel.date_souhaitee)}</dd></div>` : null}
          <div class="rounded-xl bg-slate-50 p-3"><dt class="text-xs text-slate-500">E-mail</dt><dd class="font-semibold truncate">${sel.email ? html`<a class="text-[var(--c)] hover:underline" href=${"mailto:" + sel.email}>${sel.email}</a>` : "—"}</dd></div>
          <div class="rounded-xl bg-slate-50 p-3"><dt class="text-xs text-slate-500">Téléphone</dt><dd class="font-semibold">${sel.telephone ? html`<a class="text-[var(--c)] hover:underline" href=${telLien(sel.telephone)}>${sel.telephone}</a>` : "—"}</dd></div>
        </dl>
        ${sel.message && html`<div class="mt-4 rounded-2xl border border-slate-200 p-4"><p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Message</p><p class="mt-1 whitespace-pre-line text-[15px] leading-relaxed">${sel.message}</p></div>`}
        <div class="mt-4"><${ui.Textarea} label="Note pour vous (jamais visible du client)" rows=${2} value=${note ?? sel.note ?? ""} onInput=${(v) => setNote(v)}/>${note != null && note !== (sel.note ?? "") && html`<div class="mt-2"><${Bouton} petit onClick=${garderNote}>Enregistrer la note</${Bouton}></div>`}</div>
        <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          ${sel.email ? html`<a href=${"mailto:" + sel.email + "?subject=" + sujet} class="inline-flex items-center gap-1.5 rounded-xl bg-[var(--c)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"><${Icone} nom="mail" class="w-4 h-4"/>Répondre par e-mail</a>` : sel.telephone ? html`<a href=${telLien(sel.telephone)} class="inline-flex items-center gap-1.5 rounded-xl bg-[var(--c)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"><${Icone} nom="contacts" class="w-4 h-4"/>Appeler</a>` : null}
          ${(sel.statut || "nouvelle") === "nouvelle" && html`<${Bouton} secondaire onClick=${() => statut("en_cours")}>Je m'en occupe</${Bouton}>`}
          ${sel.statut !== "traitee" ? html`<${Bouton} secondaire onClick=${() => statut("traitee")}>✓ Marquer traitée</${Bouton}>` : html`<${Bouton} secondaire onClick=${() => statut("nouvelle")}>Remettre à traiter</${Bouton}>`}
          <span class="ml-auto"><${Menu} actions=${[["Remettre à traiter", () => statut("nouvelle")], ["Supprimer la demande", async () => { if (await demander("Supprimer cette demande ?", { ok: "Supprimer", danger: true })) { await D.remove(sel.id); setSelId(null); toast("Demande supprimée"); } }, true]]}/></span>
        </div>
      </${Carte}>` : html`<${Vide} icone="message" titre="Aucune demande" texte=${"Les demandes envoyées depuis votre site (bouton « " + V.cta + " ») arrivent ici, et vous êtes prévenu par e-mail."}/>`}</div>
    </div>
    <${ui.Modal} open=${!!nouvelle} onClose=${() => setNouvelle(null)} titre="Ajouter une demande" actions=${html`<${ui.Button} variant="secondary" onClick=${() => setNouvelle(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${creer}>Ajouter</${ui.Button}>`}>
      ${nouvelle && html`<p class="mb-3 text-sm text-slate-500">Une demande reçue par téléphone ou en personne : rangez-la avec les autres.</p><div class="grid gap-3 sm:grid-cols-2"><${ui.Input} label="Nom" value=${nouvelle.nom} onInput=${(v) => setNouvelle({ ...nouvelle, nom: v })}/><${ui.Input} label="Service" value=${nouvelle.service} onInput=${(v) => setNouvelle({ ...nouvelle, service: v })}/><${ui.Input} label="E-mail" type="email" value=${nouvelle.email} onInput=${(v) => setNouvelle({ ...nouvelle, email: v })}/><${ui.Input} label="Téléphone" value=${nouvelle.telephone} onInput=${(v) => setNouvelle({ ...nouvelle, telephone: v })}/><div class="sm:col-span-2"><${ui.Textarea} label="Message" rows=${3} value=${nouvelle.message} onInput=${(v) => setNouvelle({ ...nouvelle, message: v })}/></div></div>`}
    </${ui.Modal}>
  </div>`;
}
