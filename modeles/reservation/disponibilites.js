function Ecran() {
  const D = useCollection("disponibilites"), R = useCollection("rendezvous");
  const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const [m, setM] = useState(null);
  const minutes = (h) => { const [a, b] = String(h || "0:0").split(":").map(Number); return (a || 0) * 60 + (b || 0); };
  const actives = D.rows.filter((p) => p.actif !== false);
  const heures = actives.reduce((a, p) => a + Math.max(0, minutes(p.fin) - minutes(p.debut)), 0) / 60;
  const joursOuverts = new Set(actives.map((p) => Number(p.jour))).size;
  // Taux de remplissage de la semaine en cours : minutes réservées / minutes ouvertes
  const lundi = new Date(); lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
  const semaine = Array.from({ length: 7 }, (_, i) => { const d = new Date(lundi); d.setDate(lundi.getDate() + i); return jourISO(d); });
  const reserve = R.rows.filter((r) => semaine.includes(r.date) && r.statut !== "annule").reduce((a, r) => a + (Number(r.duree) || 60), 0);
  const remplissage = heures > 0 ? Math.min(100, Math.round((reserve / 60 / heures) * 100)) : 0;
  const enregistrer = async () => {
    const { id, created_at, updated_at, ...d } = m;
    if (!d.debut || !d.fin || minutes(d.fin) <= minutes(d.debut)) { toast("L'heure de fin doit suivre l'heure de début.", "bad"); return; }
    const chevauche = D.rows.some((p) => p.id !== id && Number(p.jour) === Number(d.jour) && minutes(d.debut) < minutes(p.fin) && minutes(p.debut) < minutes(d.fin));
    if (chevauche) { toast("Cette plage chevauche une autre plage du même jour.", "bad"); return; }
    const data = { ...d, jour: Number(d.jour), actif: d.actif !== false };
    if (id) await D.update(id, data); else await D.add(data);
    setM(null); toast("Enregistré");
  };
  const supprimer = async (p) => { if (!await demander("Supprimer cette plage horaire ?", { ok: "Supprimer", danger: true })) return; await D.remove(p.id); setM(null); toast("Supprimé"); };
  const copierSurSemaine = async (jour) => { const src = D.rows.filter((p) => Number(p.jour) === jour); if (!src.length) return; for (let j = 1; j <= 5; j++) { if (j === jour || D.rows.some((p) => Number(p.jour) === j)) continue; for (const p of src) await D.add({ jour: j, debut: p.debut, fin: p.fin, actif: p.actif !== false }); } toast("Horaires copiés sur les jours de semaine encore vides"); };
  if (D.loading) return html`<${ui.Loading}/>`;
  return html`<div>
    <${Entete} titre="Disponibilités" sous=${"Définissez vos créneaux horaires. Vos " + V.clients.toLowerCase() + " ne voient que les créneaux libres pendant ces plages."}>
      <${ui.Button} icone="plus" onClick=${() => setM({ jour: 1, debut: "09:00", fin: "12:00", actif: true })}>Ajouter une plage</${ui.Button}>
    </${Entete}>
    <div class="grid sm:grid-cols-3 gap-4 mb-4">
      <${Kpi} icone="agenda" valeur=${joursOuverts + " / 7"} label="Jours ouverts"/>
      <${Kpi} icone="horloge" valeur=${Math.round(heures * 10) / 10 + " h"} label="Heures disponibles par semaine"/>
      <${Kpi} icone="graphique" valeur=${remplissage + " %"} label="Remplissage cette semaine"/>
    </div>
    <${Carte} titre="Jours">
      <div class="divide-y divide-slate-100">${JOURS.map((nom, i) => { const plages = D.rows.filter((p) => Number(p.jour) === i + 1).sort((a, b) => minutes(a.debut) - minutes(b.debut)); return html`<div class="py-3 flex flex-wrap items-center gap-2.5">
        <p class="w-28 font-medium">${nom}</p>
        ${plages.length ? plages.map((p) => html`<span class=${"inline-flex items-center gap-1 rounded-full border pl-3.5 pr-1 py-1 text-sm " + (p.actif === false ? "border-slate-200 text-slate-500 line-through" : "border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.05)]")}>
          <button onClick=${() => setM({ ...p })} class="font-medium tabular-nums">${p.debut} – ${p.fin}</button>
          <${Menu} actions=${[["Modifier", () => setM({ ...p })], [p.actif === false ? "Rouvrir cette plage" : "Mettre en pause", () => D.update(p.id, { actif: p.actif === false })], i < 5 && ["Copier sur la semaine", () => copierSurSemaine(i + 1)], ["Supprimer", () => supprimer(p), true]]}/></span>`) : html`<span class="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">Fermé</span>`}
        <button onClick=${() => setM({ jour: i + 1, debut: plages.length ? plages[plages.length - 1].fin : "09:00", fin: plages.length ? "19:00" : "12:00", actif: true })} class="ml-auto text-sm font-semibold text-[var(--c)] hover:underline">+ Plage</button>
      </div>`; })}</div>
    </${Carte}>
    <${ui.Modal} open=${!!m} onClose=${() => setM(null)} titre=${m?.id ? "Modifier la plage" : "Nouvelle plage horaire"} actions=${html`${m?.id && html`<${ui.Button} variant="danger" onClick=${() => supprimer(m)}>Supprimer</${ui.Button}>`}<${ui.Button} variant="secondary" onClick=${() => setM(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
      ${m && html`<div class="grid sm:grid-cols-3 gap-3"><${ui.Select} label="Jour" value=${String(m.jour)} onChange=${(v) => setM({ ...m, jour: Number(v) })} options=${JOURS.map((j, i) => [String(i + 1), j])}/><${ui.Input} label="Début" type="time" value=${m.debut} onInput=${(v) => setM({ ...m, debut: v })}/><${ui.Input} label="Fin" type="time" value=${m.fin} onInput=${(v) => setM({ ...m, fin: v })}/></div>`}
    </${ui.Modal}>
  </div>`;
}
