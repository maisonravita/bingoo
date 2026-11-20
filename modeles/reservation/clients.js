function Ecran() {
  const C = useCollection("clients"), R = useCollection("rendezvous");
  const [m, setM] = useState(null), [q, setQ] = useState(""), [tri, setTri] = useState("recent");
  const auj = jourISO(new Date());
  const stats = (c) => { const L = R.rows.filter((r) => r.client_id === c.id || (r.client_nom && r.client_nom === c.nom)); const faits = L.filter((r) => r.statut === "termine" || (r.statut === "confirme" && r.date <= auj)); return { n: L.filter((r) => r.statut !== "annule").length, ca: faits.reduce((a, r) => a + (Number(r.montant) || 0), 0), dernier: L.filter((r) => r.date <= auj && r.statut !== "annule").map((r) => r.date).sort().pop() ?? null, prochain: L.filter((r) => r.date >= auj && r.statut !== "annule").map((r) => r.date).sort()[0] ?? null, L }; };
  const lignes = C.rows.map((c) => ({ ...c, ...stats(c) }));
  const actifs = (a, b) => lignes.filter((c) => c.L.some((r) => r.statut !== "annule" && r.date >= a && r.date <= b)).length;
  const actP = actifs(decale(-89), auj), actA = actifs(decale(-179), decale(-90));
  const nouveaux = (a, b) => lignes.filter((c) => { const d = c.L.filter((r) => r.statut !== "annule").map((r) => r.date).sort()[0]; return d && d >= a && d <= b; }).length;
  const nvP = nouveaux(decale(-29), auj), nvA = nouveaux(decale(-59), decale(-30));
  const vip = [...lignes].sort((a, b) => b.ca - a.ca)[0];
  const vus = lignes.filter((c) => !q || (c.nom + " " + (c.email ?? "") + " " + (c.telephone ?? "")).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => tri === "nom" ? String(a.nom).localeCompare(String(b.nom)) : tri === "ca" ? b.ca - a.ca : String(b.dernier ?? "").localeCompare(String(a.dernier ?? "")));
  const enregistrer = async () => { const { id, created_at, updated_at, n, ca, dernier, prochain, L, ...d } = m; if (!String(d.nom ?? "").trim()) { toast("Le nom est obligatoire", "bad"); return; } if (id) await C.update(id, d); else await C.add(d); setM(null); toast("Enregistré"); };
  const supprimer = async (c) => { if (!await demander("Supprimer " + c.nom + " de vos " + V.clients.toLowerCase() + " ?", { ok: "Supprimer", danger: true })) return; await C.remove(c.id); setM(null); toast("Supprimé"); };
  const exporter = () => { const l = [["Nom", "E-mail", "Téléphone", V.rdvs, "Total", "Dernière visite"], ...vus.map((c) => [c.nom, c.email ?? "", c.telephone ?? "", c.n, c.ca, c.dernier ?? ""])]; const csv = l.map((x) => x.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(";")).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })); a.download = "clients.csv"; a.click(); toast("Fichier téléchargé"); };
  if (C.loading) return html`<${ui.Loading}/>`;
  return html`<div>
    <${Entete} titre=${V.clients} sous=${"Gérez vos " + V.clients.toLowerCase() + ", leurs " + V.rdvs.toLowerCase() + " et leur historique."}>
      <${Recherche} valeur=${q} onInput=${setQ} placeholder="Rechercher…"/>
      <${ui.Button} icone="plus" onClick=${() => setM({ nom: "", email: "", telephone: "", notes: "" })}>Ajouter</${ui.Button}>
    </${Entete}>
    <div class="grid sm:grid-cols-3 gap-4 mb-4">
      <${Kpi} icone="contacts" valeur=${actP} label=${V.clients + " actifs (3 mois)"} tendance=${evol(actP, actA)}/>
      <${Kpi} icone="agenda" valeur=${nvP} label="Nouveaux ce mois" tendance=${evol(nvP, nvA)}/>
      ${vip && vip.ca > 0 ? html`<button onClick=${() => setM({ ...vip })} class="rounded-2xl bg-white border border-slate-200/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] flex items-center gap-3 text-left hover:border-[var(--c)]/40"><${Avatar} nom=${vip.nom} taille="w-11 h-11 text-sm"/><div class="min-w-0 flex-1"><p class="truncate text-lg font-bold">${vip.nom}</p><p class="text-xs text-slate-500">${V.client} VIP · ${fmt.eur(vip.ca)}</p></div><span class="text-[var(--c)]">→</span></button>` : html`<${Kpi} icone="etoile" valeur="—" label=${V.client + " VIP"}/>`}
    </div>
    <${Carte} titre=${"Liste des " + V.clients.toLowerCase() + " (" + vus.length + ")"} actions=${html`<div class="flex items-center gap-2"><select aria-label="Trier" value=${tri} onChange=${(e) => setTri(e.target.value)} class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"><option value="recent">Dernière visite</option><option value="ca">Total dépensé</option><option value="nom">Nom</option></select><${ui.Button} variant="secondary" onClick=${exporter}>Exporter</${ui.Button}></div>`}>
      ${vus.length ? html`<div class="-mx-5 overflow-x-auto"><table class="w-full min-w-[720px] text-sm">
        <thead><tr class="border-b border-slate-100 text-left text-xs text-slate-500"><th class="px-5 py-2 font-medium">Nom complet</th><th class="py-2 font-medium">E-mail</th><th class="py-2 font-medium">Téléphone</th><th class="py-2 pl-4 font-medium text-right">${V.rdvs}</th><th class="py-2 pl-6 font-medium text-right">Total</th><th class="py-2 pl-6 font-medium">Dernière visite</th><th class="px-5 py-2 font-medium text-right">Actions</th></tr></thead>
        <tbody class="divide-y divide-slate-50">${vus.map((c) => html`<tr class="cursor-pointer hover:bg-slate-50/70" onClick=${() => setM({ ...c })}>
          <td class="px-5 py-2.5"><div class="flex items-center gap-2.5"><${Avatar} nom=${c.nom}/><span class="font-medium">${c.nom}</span>${c.prochain && html`<span class="rounded-full bg-[var(--c)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--c)]">${"le " + fmt.date(c.prochain)}</span>`}</div></td>
          <td class="py-2.5 text-slate-600">${c.email || "—"}</td><td class="py-2.5 text-slate-600 whitespace-nowrap">${c.telephone || "—"}</td>
          <td class="py-2.5 pl-4 text-right tabular-nums">${c.n}</td><td class="py-2.5 pl-6 text-right tabular-nums font-medium whitespace-nowrap">${fmt.eur(c.ca)}</td>
          <td class="py-2.5 pl-6 text-slate-600 whitespace-nowrap">${c.dernier ? fmt.date(c.dernier) : "—"}</td>
          <td class="px-5 py-2.5 text-right"><${Menu} actions=${[["Ouvrir la fiche", () => setM({ ...c })], c.email && ["Écrire un e-mail", () => { location.href = "mailto:" + c.email; }], ["Nouveau " + V.rdv.toLowerCase(), () => go("planning")], ["Supprimer", () => supprimer(c), true]]}/></td></tr>`)}</tbody></table></div>`
        : html`<p class="py-8 text-center text-sm text-slate-500">${q ? "Personne ne correspond à cette recherche." : "Personne pour l'instant : ajoutez vos " + V.clients.toLowerCase() + "."}</p>`}
    </${Carte}>
    <${ui.Modal} open=${!!m} onClose=${() => setM(null)} titre=${m?.id ? m.nom : "Ajouter : " + V.client.toLowerCase()} actions=${html`${m?.id && html`<${ui.Button} variant="danger" onClick=${() => supprimer(m)}>Supprimer</${ui.Button}>`}<${ui.Button} variant="secondary" onClick=${() => setM(null)}>Fermer</${ui.Button}><${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
      ${m && html`${m.id && html`<div class="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3"><${Avatar} nom=${m.nom} taille="w-11 h-11 text-sm"/><div class="flex-1"><p class="font-semibold">${m.nom}</p><p class="text-xs text-slate-500">${m.n} ${V.rdvs.toLowerCase()} · ${fmt.eur(m.ca)} dépensés</p></div></div>`}
      <div class="grid sm:grid-cols-2 gap-3"><${ui.Input} label="Nom complet" value=${m.nom} onInput=${(v) => setM({ ...m, nom: v })}/><${ui.Input} label="E-mail" value=${m.email} onInput=${(v) => setM({ ...m, email: v })}/><${ui.Input} label="Téléphone" value=${m.telephone} onInput=${(v) => setM({ ...m, telephone: v })}/><div class="sm:col-span-2"><${ui.Textarea} label="Notes" value=${m.notes} onInput=${(v) => setM({ ...m, notes: v })}/></div></div>
      ${m.L?.length > 0 && html`<p class="mt-4 text-sm font-semibold">Historique</p><div class="mt-1 max-h-48 overflow-auto divide-y divide-slate-100 text-sm">${[...m.L].sort((a, b) => b.date.localeCompare(a.date)).map((r) => html`<div class="flex items-center justify-between gap-3 py-1.5"><span>${fmt.date(r.date)} · ${r.heure}</span><span class="flex items-center gap-2"><${Pastille} statut=${r.statut}/><span class="tabular-nums text-slate-500">${fmt.eur(r.montant)}</span></span></div>`)}</div>`}`}
    </${ui.Modal}>
  </div>`;
}
