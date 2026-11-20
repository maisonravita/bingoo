function Ecran() {
  const D = useCollection("disponibilites");
  const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const [m, setM] = useState(null);
  const minutes = (h) => { const [a, b] = String(h || "0:0").split(":").map(Number); return (a || 0) * 60 + (b || 0); };
  const actives = D.rows.filter((p) => p.actif !== false);
  const heures = actives.reduce((a, p) => a + Math.max(0, minutes(p.fin) - minutes(p.debut)), 0) / 60;
  const joursOuverts = new Set(actives.map((p) => Number(p.jour))).size;
  const enregistrer = async () => {
    const { id, created_at, updated_at, ...d } = m;
    if (!d.debut || !d.fin || minutes(d.fin) <= minutes(d.debut)) { toast("L'heure de fin doit suivre l'heure de début.", "bad"); return; }
    const chevauche = D.rows.some((p) => p.id !== id && Number(p.jour) === Number(d.jour) && minutes(d.debut) < minutes(p.fin) && minutes(p.debut) < minutes(d.fin));
    if (chevauche) { toast("Cette plage chevauche une autre plage du même jour.", "bad"); return; }
    const data = { ...d, jour: Number(d.jour), actif: d.actif !== false };
    if (id) await D.update(id, data); else await D.add(data);
    setM(null); toast("Enregistré");
  };
  const supprimer = async () => { if (!await demander("Supprimer cette plage horaire ?", { ok: "Supprimer", danger: true })) return; await D.remove(m.id); setM(null); toast("Supprimé"); };
  const basculer = (p) => D.update(p.id, { actif: p.actif === false });
  if (D.loading) return html`<${ui.Loading}/>`;
  return html`<${ui.Page} titre="Disponibilités" sous=${"Vos heures d'ouverture. Vos " + V.clients.toLowerCase() + " ne voient que les créneaux libres pendant ces plages."} actions=${html`<${ui.Button} icone="horloge" onClick=${() => setM({ jour: 1, debut: "09:00", fin: "12:00", actif: true })}>Ajouter une plage</${ui.Button}>`}>
    <div class="grid sm:grid-cols-2 gap-4 mb-4"><${ui.Stat} label="Jours ouverts" valeur=${joursOuverts + " / 7"} icone="agenda"/><${ui.Stat} label="Heures par semaine" valeur=${Math.round(heures * 10) / 10 + " h"} icone="horloge"/></div>
    <${ui.Card}>
      <div class="divide-y divide-slate-100">${JOURS.map((nom, i) => { const plages = D.rows.filter((p) => Number(p.jour) === i + 1).sort((a, b) => minutes(a.debut) - minutes(b.debut)); return html`<div class="py-3 flex flex-wrap items-center gap-3">
        <p class="w-28 font-medium">${nom}</p>
        ${plages.length ? plages.map((p) => html`<span class=${"inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm " + (p.actif === false ? "border-slate-200 text-slate-400 line-through" : "border-[var(--c)]/30 bg-[var(--c)]/5")}>
          <button onClick=${() => setM({ ...p })} class="font-medium">${p.debut} – ${p.fin}</button>
          <button onClick=${() => basculer(p)} class="text-xs text-slate-500 hover:text-slate-800">${p.actif === false ? "Activer" : "Pause"}</button></span>`) : html`<span class="text-sm text-slate-400">Fermé</span>`}
        <button onClick=${() => setM({ jour: i + 1, debut: "09:00", fin: "12:00", actif: true })} class="ml-auto text-sm font-medium text-[var(--c)] hover:underline">+ Plage</button>
      </div>`; })}</div>
    </${ui.Card}>
    <${ui.Modal} open=${!!m} onClose=${() => setM(null)} titre=${m?.id ? "Modifier la plage" : "Nouvelle plage horaire"} actions=${html`${m?.id && html`<${ui.Button} variant="danger" onClick=${supprimer}>Supprimer</${ui.Button}>`}<${ui.Button} variant="secondary" onClick=${() => setM(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
      ${m && html`<div class="grid sm:grid-cols-3 gap-3"><${ui.Select} label="Jour" value=${String(m.jour)} onChange=${(v) => setM({ ...m, jour: Number(v) })} options=${JOURS.map((j, i) => [String(i + 1), j])}/><${ui.Input} label="Début" type="time" value=${m.debut} onInput=${(v) => setM({ ...m, debut: v })}/><${ui.Input} label="Fin" type="time" value=${m.fin} onInput=${(v) => setM({ ...m, fin: v })}/></div>`}
    </${ui.Modal}>
  </${ui.Page}>`;
}
