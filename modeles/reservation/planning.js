function Ecran() {
  const R = useCollection("rendezvous"), P = useCollection("prestations");
  const [m, setM] = useState(null), [vue, setVue] = useState("mois"), [dec, setDec] = useState(0);
  const auj = jourISO(new Date());
  const vide = { client_nom: "", client_email: "", prestation_id: "", date: "", heure: "09:00", intervenant: "", statut: "confirme", montant: 0, duree: 60, notes: "" };
  const ouvrir = (r) => setM(r ? { ...r } : { ...vide, date: auj });
  const presta = (id) => { const p = P.rows.find((x) => x.id === id); setM({ ...m, prestation_id: id, montant: p?.prix ?? m.montant, duree: p?.duree ?? m.duree }); };
  const enregistrer = async () => {
    if (!String(m.client_nom ?? "").trim() || !m.date) { toast("Indiquez au moins le nom et la date", "bad"); return; }
    const { id, created_at, updated_at, ...d } = m;
    if (id) await R.update(id, d); else await R.add(d);
    toast("Enregistré"); setM(null);
  };
  const supprimer = async () => { if (!await demander("Supprimer ce " + V.rdv.toLowerCase() + " ?", { ok: "Supprimer", danger: true })) return; await R.remove(m.id); setM(null); toast("Supprimé"); };
  const STAT = [["demande", "À confirmer"], ["confirme", "Confirmé"], ["termine", "Terminé"], ["annule", "Annulé"]];
  const heures = Array.from({ length: 27 }, (_, i) => { const h = 7 + Math.floor(i / 2), mn = i % 2 ? "30" : "00"; return String(h).padStart(2, "0") + ":" + mn; });
  const visibles = R.rows.filter((r) => r.statut !== "annule").sort((a, b) => String(a.heure).localeCompare(String(b.heure)));
  const nomP = (id) => P.rows.find((p) => p.id === id)?.nom ?? "";
  // Vue semaine : 7 colonnes, de 8 h à 20 h, chaque rendez-vous placé à son heure et à sa durée
  const lundi = new Date(); lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7) + dec * 7);
  const jours = Array.from({ length: 7 }, (_, i) => { const d = new Date(lundi); d.setDate(lundi.getDate() + i); return d; });
  const H0 = 8, H1 = 20, PX = 52;
  const min = (h) => { const [a, b] = String(h || "0:0").split(":").map(Number); return (a || 0) * 60 + (b || 0); };
  // Rendez-vous qui se chevauchent dans la journée : posés côte à côte (comme un agenda), jamais l'un sur l'autre
  const colonnes = (rs) => { const tri = [...rs].sort((a, b) => min(a.heure) - min(b.heure)); const fin = (r) => min(r.heure) + (Number(r.duree) || 60); const out = []; let groupe = [], finGroupe = -1;
    const fermer = () => { const nb = Math.max(1, ...groupe.map((g) => g.col + 1)); for (const g of groupe) out.push({ ...g, nb }); groupe = []; };
    for (const r of tri) { if (groupe.length && min(r.heure) >= finGroupe) fermer(); const prises = groupe.filter((g) => fin(g.r) > min(r.heure)).map((g) => g.col); let col = 0; while (prises.includes(col)) col++; groupe.push({ r, col }); finGroupe = Math.max(finGroupe, fin(r)); if (groupe.length === 1) finGroupe = fin(r); }
    if (groupe.length) fermer(); return out; };
  const titreSemaine = jours[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + " – " + jours[6].toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const COUL = { demande: "border-amber-300 bg-amber-50 text-amber-900", confirme: "border-[var(--c)]/30 bg-[var(--c)]/10 text-slate-900", termine: "border-slate-200 bg-slate-50 text-slate-500" };
  if (R.loading) return html`<${ui.Loading}/>`;
  return html`<div>
    <${Entete} titre="Planning" sous="Visualisez vos réservations en un coup d'œil. Cliquez sur un jour ou un créneau pour ajouter.">
      <${Segments} valeur=${vue} onChange=${(v) => { setVue(v); setDec(0); }} options=${[["mois", "Vue mois"], ["semaine", "Vue semaine"]]}/>
      <${ui.Button} icone="plus" onClick=${() => ouvrir(null)}>Ajouter</${ui.Button}>
    </${Entete}>
    ${vue === "mois" ? html`<${Carte}><${ui.Calendrier} lignes=${visibles} champ="date" rendu=${(r) => r.heure + " " + r.client_nom} onClick=${ouvrir} onJour=${(d) => setM({ ...vide, date: d })}/></${Carte}>`
    : html`<${Carte} titre=${titreSemaine} actions=${html`<div class="flex items-center gap-1"><button aria-label="Semaine précédente" onClick=${() => setDec(dec - 1)} class="grid w-8 h-8 place-items-center rounded-lg hover:bg-slate-100">‹</button><button onClick=${() => setDec(0)} class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">Aujourd'hui</button><button aria-label="Semaine suivante" onClick=${() => setDec(dec + 1)} class="grid w-8 h-8 place-items-center rounded-lg hover:bg-slate-100">›</button></div>`}>
      <div class="-mx-5 overflow-x-auto"><div class="min-w-[760px] px-5">
        <div class="grid grid-cols-[48px_repeat(7,1fr)] border-b border-slate-100 pb-2">${[html`<span></span>`, ...jours.map((d) => html`<div class="text-center"><p class="text-xs text-slate-500">${d.toLocaleDateString("fr-FR", { weekday: "short" })}</p><p class=${"mx-auto mt-0.5 grid w-8 h-8 place-items-center rounded-full text-sm font-semibold " + (jourISO(d) === auj ? "bg-[var(--c)] text-white" : "")}>${d.getDate()}</p></div>`)]}</div>
        <div class="relative grid grid-cols-[48px_repeat(7,1fr)]" style=${"height:" + (H1 - H0) * PX + "px"}>
          <div class="relative">${Array.from({ length: H1 - H0 }, (_, i) => html`<span class="absolute right-2 -translate-y-1/2 text-[11px] text-slate-400" style=${"top:" + i * PX + "px"}>${H0 + i}:00</span>`)}</div>
          ${jours.map((d) => { const j = jourISO(d); return html`<div class="relative border-l border-slate-100">${Array.from({ length: H1 - H0 }, (_, i) => html`<button aria-label=${"Ajouter le " + j + " à " + (H0 + i) + " h"} onClick=${() => setM({ ...vide, date: j, heure: String(H0 + i).padStart(2, "0") + ":00" })} class="absolute inset-x-0 border-t border-slate-100 hover:bg-[var(--c)]/5" style=${"top:" + i * PX + "px;height:" + PX + "px"}></button>`)}
            ${colonnes(visibles.filter((r) => r.date === j)).map(({ r, col, nb }) => { const t = Math.max(0, min(r.heure) - H0 * 60), h = Math.max(24, ((Number(r.duree) || 60) / 60) * PX - 3); return html`<button onClick=${() => ouvrir(r)} class=${"absolute overflow-hidden rounded-lg border px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm " + (COUL[r.statut] ?? COUL.confirme)} style=${"top:" + (t / 60) * PX + "px;height:" + h + "px;left:calc(" + (col * 100 / nb) + "% + 2px);width:calc(" + (100 / nb) + "% - 4px)"}><p class="font-semibold truncate">${r.heure} ${r.client_nom}</p><p class="truncate opacity-75">${nomP(r.prestation_id)}</p></button>`; })}</div>`; })}
        </div>
      </div></div>
    </${Carte}>`}
    <${ui.Modal} open=${!!m} onClose=${() => setM(null)} titre=${m?.id ? "Modifier" : "Nouveau " + V.rdv.toLowerCase()} actions=${html`${m?.id && html`<${ui.Button} variant="danger" onClick=${supprimer}>Supprimer</${ui.Button}>`}<${ui.Button} variant="secondary" onClick=${() => setM(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
      ${m && html`<div class="grid sm:grid-cols-2 gap-3">
        <${ui.Input} label=${V.client} value=${m.client_nom} onInput=${(v) => setM({ ...m, client_nom: v })}/>
        <${ui.Input} label="E-mail" type="email" value=${m.client_email} onInput=${(v) => setM({ ...m, client_email: v })}/>
        <${ui.Select} label=${V.presta} value=${m.prestation_id} onChange=${presta} options=${[["", "Choisir…"], ...P.rows.map((p) => [p.id, p.nom + " · " + fmt.eur(p.prix)])]}/>
        <${ui.Input} label="Montant (€)" type="number" value=${m.montant} onInput=${(v) => setM({ ...m, montant: v })}/>
        <${ui.Input} label="Date" type="date" value=${m.date} onInput=${(v) => setM({ ...m, date: v })}/>
        <${ui.Select} label="Heure" value=${m.heure} onChange=${(v) => setM({ ...m, heure: v })} options=${heures}/>
        <${ui.Input} label=${V.intervenant} value=${m.intervenant} onInput=${(v) => setM({ ...m, intervenant: v })}/>
        <${ui.Select} label="Statut" value=${m.statut} onChange=${(v) => setM({ ...m, statut: v })} options=${STAT}/>
        <div class="sm:col-span-2"><${ui.Textarea} label="Notes" value=${m.notes} onInput=${(v) => setM({ ...m, notes: v })}/></div>
      </div>`}
    </${ui.Modal}>
  </div>`;
}
