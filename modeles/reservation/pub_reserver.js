function Ecran() {
  const P = useCollection("prestations"), R = useCollection("rendezvous"), D = useCollection("disponibilites");
  const [f, setF] = useState({ prestation_id: "", date: "", heure: "", client_nom: "", client_email: "", telephone: "", notes: "" }), [ok, setOk] = useState(false), [busy, setBusy] = useState(false);
  const auj = jourISO(new Date()), maintenant = new Date().toTimeString().slice(0, 5);
  const offres = P.rows.filter((p) => p.actif !== false);
  const p = offres.find((x) => x.id === f.prestation_id);
  const min = (h) => { const [a, b] = String(h || "0:0").split(":").map(Number); return (a || 0) * 60 + (b || 0); };
  const hh = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  // Créneaux libres d'un jour : dans les plages d'ouverture, assez longs pour la prestation, sans chevaucher un rendez-vous
  const creneaux = (date) => {
    if (!date || !p) return [];
    const js = new Date(date + "T12:00:00").getDay(), jour = js === 0 ? 7 : js, duree = Number(p.duree) || 60;
    const plages = D.rows.length ? D.rows.filter((x) => x.actif !== false && Number(x.jour) === jour) : jour <= 6 ? [{ debut: "09:00", fin: "18:00" }] : [];
    const pris = R.rows.filter((r) => r.date === date && r.statut !== "annule").map((r) => [min(r.heure), min(r.heure) + (Number(r.duree) || 60)]);
    const out = [];
    for (const pl of plages) for (let t = min(pl.debut); t + duree <= min(pl.fin); t += 30) {
      if (pris.some(([a, b]) => t < b && a < t + duree)) continue;
      if (date === auj && hh(t) <= maintenant) continue;
      out.push(hh(t));
    }
    return [...new Set(out)].sort();
  };
  const jours = Array.from({ length: 21 }, (_, i) => decale(i)).filter((d) => creneaux(d).length).slice(0, 10);
  const libres = creneaux(f.date);
  const etape = !p ? 1 : !f.date || !f.heure ? 2 : 3;
  const envoyer = async (e) => {
    e.preventDefault();
    if (!p || !f.date || !f.heure || !f.client_nom.trim() || !/^[^ @]+@[^ @]+[.][^ @]+$/.test(f.client_email)) { toast("Complétez votre nom et une adresse e-mail valide", "bad"); return; }
    setBusy(true);
    try {
      const quand = fmt.date(f.date) + " à " + f.heure, veille = new Date(f.date + "T" + f.heure + ":00"); veille.setDate(veille.getDate() - 1);
      await db.add("rendezvous", { ...f, statut: "demande", montant: Number(p.prix) || 0, duree: Number(p.duree) || 60 }, { confirmation: { sujet: "Votre demande : " + p.nom + " le " + quand, texte: "Bonjour " + f.client_nom + ",\n\nNous avons bien reçu votre demande : " + p.nom + " le " + quand + " (" + fmt.eur(p.prix) + ").\nNous revenons vers vous très vite pour la confirmer.\n\nÀ bientôt !" }, rappels: veille > new Date() ? [{ quand: veille.toISOString(), sujet: "Rappel : " + p.nom + " demain à " + f.heure, texte: "Bonjour " + f.client_nom + ",\n\nPetit rappel : " + p.nom + " demain à " + f.heure + ".\nUn empêchement ? Répondez simplement à cet e-mail.\n\nÀ demain !" }] : [] });
      setOk(true);
    } catch (x) { toast(x.message, "bad"); } finally { setBusy(false); }
  };
  const Etape = ({ n, l }) => html`<span class=${"flex items-center gap-2 text-sm font-semibold " + (etape >= n ? "text-[var(--c)]" : "text-slate-400")}><span class=${"grid w-6 h-6 place-items-center rounded-full text-xs " + (etape > n ? "bg-[var(--c)] text-white" : etape === n ? "border-2 border-[var(--c)]" : "border-2 border-slate-200")}>${etape > n ? "✓" : n}</span>${l}</span>`;
  if (P.loading) return html`<${ui.Loading}/>`;
  if (ok) return html`<div class="max-w-lg mx-auto text-center py-16 px-4"><span class="mx-auto grid w-16 h-16 place-items-center rounded-full bg-emerald-100 text-emerald-700 text-3xl">✓</span><h1 class="mt-5 text-2xl font-bold">Demande envoyée</h1><p class="mt-2 text-slate-500">${p?.nom} le ${fmt.date(f.date)} à ${f.heure}. Un e-mail de confirmation vient de vous être envoyé, et vous recevrez un rappel la veille.</p><button onClick=${() => { setOk(false); setF({ ...f, prestation_id: "", date: "", heure: "" }); }} class="mt-6 text-sm font-semibold text-[var(--c)] hover:underline">Réserver autre chose</button></div>`;
  return html`<div class="max-w-5xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold tracking-tight">Réserver</h1>
    <p class="mt-1 text-slate-500">Choisissez votre ${V.presta.toLowerCase()}, puis votre créneau : seuls les créneaux vraiment libres sont proposés.</p>
    <div class="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2"><${Etape} n=${1} l=${V.presta}/><${Etape} n=${2} l="Date et créneau"/><${Etape} n=${3} l="Vos coordonnées"/></div>
    <form onSubmit=${envoyer} class="mt-6 grid lg:grid-cols-[1fr_1.1fr] gap-6 items-start">
      <div class="space-y-2.5">${offres.length ? offres.map((x) => html`<button type="button" onClick=${() => setF({ ...f, prestation_id: x.id, heure: "" })} class=${"w-full flex items-center gap-3 rounded-2xl border bg-white p-4 text-left transition " + (f.prestation_id === x.id ? "border-[var(--c)] ring-2 ring-[var(--c)]/20" : "border-slate-200 hover:border-slate-300")}>
        <span class="grid w-10 h-10 shrink-0 place-items-center rounded-xl bg-[var(--c)]/10 text-[var(--c)]"><${Icone} nom="tag" class="w-5 h-5"/></span>
        <span class="min-w-0 flex-1"><span class="block font-semibold">${x.nom}</span><span class="block text-sm text-slate-500 line-clamp-2">${x.description || x.duree + " min"}</span><span class="block text-xs text-slate-400">${x.duree} min</span></span>
        <span class="text-right"><span class="block font-bold">${fmt.eur(x.prix)}</span>${f.prestation_id === x.id && html`<span class="mt-1 ml-auto grid w-5 h-5 place-items-center rounded-full bg-[var(--c)] text-[11px] text-white">✓</span>`}</span></button>`) : html`<p class="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Aucune ${V.presta.toLowerCase()} n'est proposée pour le moment.</p>`}</div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5">
        ${!p ? html`<p class="py-10 text-center text-sm text-slate-500">Choisissez d'abord une ${V.presta.toLowerCase()} à gauche.</p>` : html`
          <p class="text-sm font-semibold">Date</p>
          <div class="mt-2 flex flex-wrap gap-2">${jours.map((d) => { const x = new Date(d + "T12:00:00"); return html`<button type="button" onClick=${() => setF({ ...f, date: d, heure: "" })} class=${"w-16 rounded-xl border py-2 text-center transition " + (f.date === d ? "border-[var(--c)] bg-[var(--c)] text-white" : "border-slate-200 hover:border-slate-300")}><span class="block text-[11px] uppercase opacity-80">${x.toLocaleDateString("fr-FR", { weekday: "short" })}</span><span class="block text-lg font-bold leading-tight">${x.getDate()}</span><span class="block text-[11px] opacity-80">${x.toLocaleDateString("fr-FR", { month: "short" })}</span></button>`; })}</div>
          <div class="mt-3 max-w-[220px]"><${ui.Input} label="Ou une autre date" type="date" min=${auj} value=${f.date} onInput=${(v) => setF({ ...f, date: v, heure: "" })}/></div>
          ${f.date && html`<p class="mt-5 text-sm font-semibold">Créneau horaire</p>${libres.length ? html`<div class="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">${libres.map((h) => html`<button type="button" onClick=${() => setF({ ...f, heure: h })} class=${"rounded-full border py-2 text-sm font-semibold tabular-nums transition " + (f.heure === h ? "border-[var(--c)] bg-[var(--c)] text-white" : "border-slate-200 hover:border-[var(--c)]/50")}>${h}</button>`)}</div>` : html`<p class="mt-2 text-sm text-slate-500">Plus de créneau libre ce jour-là : essayez une autre date.</p>`}`}
          ${f.heure && html`<div class="mt-5 border-t border-slate-100 pt-4"><p class="text-sm font-semibold">Vos coordonnées</p><div class="mt-2 grid sm:grid-cols-2 gap-3"><${ui.Input} label="Nom" required value=${f.client_nom} onInput=${(v) => setF({ ...f, client_nom: v })}/><${ui.Input} label="E-mail" type="email" required value=${f.client_email} onInput=${(v) => setF({ ...f, client_email: v })}/><${ui.Input} label="Téléphone" value=${f.telephone} onInput=${(v) => setF({ ...f, telephone: v })}/><${ui.Input} label="Précisions (facultatif)" value=${f.notes} onInput=${(v) => setF({ ...f, notes: v })}/></div></div>`}
          <button type="submit" disabled=${busy || !f.heure} class="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--c)] py-3 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-40">${busy ? "Envoi…" : f.heure ? "Confirmer la réservation · " + fmt.eur(p.prix) + " →" : "Choisissez un créneau"}</button>`}
      </div>
    </form>
  </div>`;
}
