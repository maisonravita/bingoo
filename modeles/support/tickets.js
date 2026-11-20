function Ecran() {
  const T = useCollection("tickets");
  const [onglet, setOnglet] = useState("ouvert"), [q, setQ] = useState(""), [selId, setSelId] = useState(params?.ouvrir ?? null), [rep, setRep] = useState(""), [busy, setBusy] = useState(false), [nouveau, setNouveau] = useState(null);
  if (T.loading) return html`<${ui.Loading}/>`;
  const equipe = [...new Set(T.rows.map((t) => t.assigne).filter(Boolean))];
  const ql = q.trim().toLowerCase();
  const vus = T.rows.filter((t) => (onglet === "tous" || t.statut === onglet) && (!ql || (t.sujet + " " + t.nom + " " + t.email + " " + (t.message ?? "")).toLowerCase().includes(ql))).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const sel = T.rows.find((t) => t.id === selId) ?? vus[0] ?? null;
  const nb = (s) => T.rows.filter((t) => t.statut === s).length;
  const repondre = async () => {
    if (!rep.trim()) { toast("Écrivez votre réponse", "bad"); return; }
    setBusy(true);
    try {
      if (sel.email) await email({ a: sel.email, sujet: "Re : " + sel.sujet, texte: rep });
      const e = [...echangesDe(sel), { de: "equipe", nom: user?.nom || "Équipe", texte: rep, at: new Date().toISOString() }];
      await T.update(sel.id, { echanges: e, statut: "attente", ...(sel.repondu_le ? {} : { repondu_le: jourISO(new Date()) }) });
      setRep(""); toast("Réponse envoyée à " + (sel.nom || sel.email));
    } catch (x) { toast(x.message, "bad"); } finally { setBusy(false); }
  };
  const statut = async (s) => { await T.update(sel.id, { statut: s, ...(s === "resolu" ? { resolu_le: jourISO(new Date()) } : {}) }); toast(s === "resolu" ? "Ticket résolu" : "Statut mis à jour"); };
  const creer = async () => { if (!nouveau.sujet || !nouveau.nom) { toast("Indiquez au moins un sujet et un nom", "bad"); return; } const r = await T.add({ ...nouveau, statut: "ouvert", echanges: [{ de: "client", nom: nouveau.nom, texte: nouveau.message, at: new Date().toISOString() }] }); setNouveau(null); setOnglet("ouvert"); if (r?.id) setSelId(r.id); toast("Ticket créé"); };
  return html`<div class="anim">
    <${Entete} titre="Tickets" sous="Répondez à vos ${V.clients.toLowerCase()} par e-mail, sans quitter le ticket."><${Recherche} valeur=${q} onInput=${setQ} placeholder="Rechercher un ticket…"/><${Bouton} onClick=${() => setNouveau({ sujet: "", nom: "", email: "", message: "", priorite: "normale", categorie: "" })}>+ Nouveau ticket</${Bouton}></${Entete}>
    <div class="mb-4"><${Onglets} valeur=${onglet} onChange=${(v) => { setOnglet(v); setSelId(null); }} options=${[["ouvert", "Ouverts (" + nb("ouvert") + ")"], ["attente", "En attente (" + nb("attente") + ")"], ["resolu", "Résolus (" + nb("resolu") + ")"], ["tous", "Tous"]]}/></div>
    <div class="grid gap-4 lg:grid-cols-5">
      <div class="lg:col-span-2 rounded-2xl border border-slate-200/70 bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
        ${vus.length ? vus.map((t) => html`<button aria-pressed=${sel?.id === t.id ? "true" : "false"} onClick=${() => setSelId(t.id)} class=${"flex w-full items-start gap-3 rounded-xl p-3 text-left transition " + (sel?.id === t.id ? "bg-[var(--c)]/8 ring-1 ring-[var(--c)]/20" : "hover:bg-slate-50")}><${Avatar} nom=${t.nom}/><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><p class="truncate font-semibold text-sm">${t.nom}</p><span class="ml-auto shrink-0 text-xs text-slate-400">${ilya(t.created_at)}</span></div><p class="truncate text-sm">${t.sujet}</p><div class="mt-1 flex gap-1.5">${t.priorite === "haute" && html`<${Pill} ton="rouge">Haute</${Pill}>`}<${Pill} ton="gris">${t.categorie || "Autre"}</${Pill}></div></div></button>`) : html`<p class="py-10 text-center text-sm text-slate-400">Aucun ticket ici.</p>`}
      </div>
      <div class="lg:col-span-3">${sel ? html`<${Carte}>
        <div class="flex flex-wrap items-start justify-between gap-3"><div class="min-w-0"><h2 class="text-lg font-bold">${sel.sujet}</h2><p class="text-sm text-slate-500">${sel.nom} · ${sel.email || "sans e-mail"} · reçu ${ilya(sel.created_at).toLowerCase()}</p></div><${Pill} ton=${STATUTS_T[sel.statut]?.[1]}>${STATUTS_T[sel.statut]?.[0] ?? sel.statut}</${Pill}></div>
        <div class="mt-3 grid gap-2 sm:grid-cols-3">
          <select value=${sel.priorite} onChange=${(e) => T.update(sel.id, { priorite: e.target.value })} class="rounded-xl border border-slate-200 px-3 py-2 text-sm">${Object.entries(PRIO).map(([k, [l]]) => html`<option value=${k}>Priorité ${l.toLowerCase()}</option>`)}</select>
          <select value=${sel.assigne ?? ""} onChange=${(e) => T.update(sel.id, { assigne: e.target.value })} class="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Non assigné</option>${[...new Set([...equipe, user?.nom].filter(Boolean))].map((n) => html`<option value=${n}>${n}</option>`)}</select>
          <input value=${sel.categorie ?? ""} onChange=${(e) => T.update(sel.id, { categorie: e.target.value })} placeholder="Catégorie" class="rounded-xl border border-slate-200 px-3 py-2 text-sm"/>
        </div>
        <div class="mt-4 space-y-3 max-h-[340px] overflow-y-auto pr-1">${echangesDe(sel).map((m) => html`<div class=${"flex gap-2.5 " + (m.de === "equipe" ? "flex-row-reverse" : "")}><${Avatar} nom=${m.nom} taille="w-7 h-7 text-[10px]"/><div class=${"max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm " + (m.de === "equipe" ? "bg-[var(--c)] text-white" : "bg-slate-100")}><p class="whitespace-pre-line">${m.texte}</p><p class=${"mt-1 text-[11px] " + (m.de === "equipe" ? "text-white/70" : "text-slate-400")}>${m.nom} · ${fmt.dateHeure(m.at)}</p></div></div>`)}</div>
        <div class="mt-4 border-t border-slate-100 pt-4">
          <div class="mb-2 flex flex-wrap gap-1.5">${(V.reponses ?? []).map((r) => html`<button onClick=${() => setRep(r.texte)} class="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-[var(--c)] hover:text-[var(--c)]">${r.titre}</button>`)}</div>
          <textarea value=${rep} onInput=${(e) => setRep(e.target.value)} rows="4" placeholder=${"Votre réponse à " + (sel.nom || "ce client") + "…"} class="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[var(--c)]"></textarea>
          <div class="mt-2 flex flex-wrap items-center gap-2"><${Bouton} disabled=${busy} onClick=${repondre}>${busy ? "Envoi…" : "Envoyer la réponse"}</${Bouton}>${sel.statut !== "resolu" ? html`<${Bouton} secondaire onClick=${() => statut("resolu")}>✓ Marquer résolu</${Bouton}>` : html`<${Bouton} secondaire onClick=${() => statut("ouvert")}>Rouvrir</${Bouton}>`}<span class="ml-auto"><${Menu} actions=${[["Remettre en ouvert", () => statut("ouvert")], ["Mettre en attente", () => statut("attente")], ["Supprimer le ticket", async () => { if (await demander("Supprimer ce ticket ?", { ok: "Supprimer", danger: true })) { await T.remove(sel.id); setSelId(null); } }, true]]}/></span></div>
        </div>
      </${Carte}>` : html`<${Vide} icone="message" titre="Aucun ticket sélectionné" texte="Choisissez un ticket dans la liste."/>`}</div>
    </div>
    <${ui.Modal} open=${!!nouveau} onClose=${() => setNouveau(null)} titre="Nouveau ticket" actions=${html`<${ui.Button} variant="secondary" onClick=${() => setNouveau(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${creer}>Créer</${ui.Button}>`}>
      ${nouveau && html`<div class="grid gap-3 sm:grid-cols-2"><div class="sm:col-span-2"><${ui.Input} label="Sujet" value=${nouveau.sujet} onInput=${(v) => setNouveau({ ...nouveau, sujet: v })}/></div><${ui.Input} label=${V.client} value=${nouveau.nom} onInput=${(v) => setNouveau({ ...nouveau, nom: v })}/><${ui.Input} label="E-mail" type="email" value=${nouveau.email} onInput=${(v) => setNouveau({ ...nouveau, email: v })}/><${ui.Select} label="Priorité" value=${nouveau.priorite} onChange=${(v) => setNouveau({ ...nouveau, priorite: v })} options=${[["basse", "Basse"], ["normale", "Normale"], ["haute", "Haute"]]}/><${ui.Input} label="Catégorie" value=${nouveau.categorie} onInput=${(v) => setNouveau({ ...nouveau, categorie: v })}/><div class="sm:col-span-2"><${ui.Textarea} label="Message" rows=${4} value=${nouveau.message} onInput=${(v) => setNouveau({ ...nouveau, message: v })}/></div></div>`}
    </${ui.Modal}>
  </div>`;
}
