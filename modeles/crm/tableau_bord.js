function Ecran() {
  const A = useCollection("affaires"), T = useCollection("taches"), C = useCollection("contacts");
  const auj = new Date().toISOString().slice(0, 10), mois = auj.slice(0, 7);
  const ouvertes = A.rows.filter((a) => !["gagne", "perdu"].includes(a.etape));
  const gagnees = A.rows.filter((a) => a.etape === "gagne");
  const PROBA = { nouveau: 0.1, qualifie: 0.25, proposition: 0.5, negociation: 0.75 };
  const pondere = ouvertes.reduce((s, a) => s + (Number(a.montant) || 0) * (PROBA[a.etape] ?? 0.2), 0);
  const gagneMois = gagnees.filter((a) => String(a.gagnee_le ?? "").slice(0, 7) === mois).reduce((s, a) => s + (Number(a.montant) || 0), 0);
  const tranchees = A.rows.filter((a) => ["gagne", "perdu"].includes(a.etape));
  const taux = tranchees.length ? Math.round((gagnees.length / tranchees.length) * 100) : 0;
  const aFaire = T.rows.filter((t) => !t.fait), retard = aFaire.filter((t) => t.date && t.date < auj);
  const duJour = aFaire.filter((t) => t.date && t.date <= auj).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  const parMois = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); const k = d.toISOString().slice(0, 7); return { label: d.toLocaleDateString("fr-FR", { month: "short" }), valeur: gagnees.filter((a) => String(a.gagnee_le ?? "").slice(0, 7) === k).reduce((s, a) => s + (Number(a.montant) || 0), 0) }; });
  const ETAPES = [["nouveau", "Nouveau"], ["qualifie", "Qualifié"], ["proposition", "Proposition"], ["negociation", "Négociation"]];
  const parEtape = ETAPES.map(([v, l]) => ({ label: l, valeur: ouvertes.filter((a) => a.etape === v).length })).filter((x) => x.valeur);
  // Tendances : ce mois-ci comparé au mois dernier
  const moisAvant = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
  const gagneAvant = gagnees.filter((a) => String(a.gagnee_le ?? "").slice(0, 7) === moisAvant).reduce((s, a) => s + (Number(a.montant) || 0), 0);
  const evo = (a, b) => (b > 0 ? ((a - b) / b) * 100 : null);
  const faire = (t) => T.update(t.id, { fait: true, fait_le: auj }).then(() => toast("Tâche terminée"));
  if (A.loading || T.loading) return html`<${ui.Loading}/>`;
  return html`<${ui.Page} titre="Tableau de bord" sous=${"Votre activité commerciale, " + new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} actions=${html`<${ui.Button} icone="graphique" onClick=${() => go("pipeline")}>Voir le pipeline</${ui.Button}>`}>
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <${ui.Stat} label="Gagné ce mois-ci" valeur=${fmt.eur(gagneMois)} icone="panier" tendance=${evo(gagneMois, gagneAvant)}/>
      <${ui.Stat} label="Pipeline pondéré" valeur=${fmt.eur(pondere)} sous=${ouvertes.length + " affaires en cours"} icone="graphique"/>
      <${ui.Stat} label="Taux de réussite" valeur=${taux + " %"} sous=${gagnees.length + " gagnées sur " + tranchees.length} icone="etoile"/>
      <${ui.Stat} label="Tâches en retard" valeur=${retard.length} sous=${aFaire.length + " à faire au total"} icone="horloge" inverse=${true}/>
    </div>
    <div class="mt-4 grid lg:grid-cols-3 gap-4">
      <${ui.Card} class="lg:col-span-2" titre="Affaires gagnées par mois"><${ui.Bar} donnees=${parMois}/></${ui.Card}>
      <${ui.Card} titre="Affaires en cours par étape">${parEtape.length ? html`<${ui.Donut} donnees=${parEtape}/>` : html`<${ui.Empty} texte="Aucune affaire en cours."/>`}</${ui.Card}>
    </div>
    <${ui.Card} class="mt-4" titre="À faire aujourd'hui" actions=${html`<${ui.Button} variant="ghost" onClick=${() => go("taches")}>Toutes les tâches</${ui.Button}>`}>
      ${duJour.length ? html`<div class="divide-y divide-slate-100">${duJour.map((t) => html`<div class="flex items-center gap-3 py-2.5"><button onClick=${() => faire(t)} class="w-5 h-5 shrink-0 rounded-md border-2 border-slate-300 hover:border-[var(--c)]" title="Marquer comme fait"></button><div class="flex-1 min-w-0"><p class="font-medium truncate">${t.titre}</p><p class="text-sm text-slate-500 truncate">${t.contact_nom || ""}${t.contact_nom ? " · " : ""}${t.date < auj ? "en retard depuis le " + fmt.date(t.date) : "aujourd'hui"}</p></div>${t.date < auj && html`<${ui.Badge} couleur="rouge">En retard</${ui.Badge}>`}</div>`)}</div>` : html`<${ui.Empty} texte="Rien d'urgent : tout est à jour."/>`}
    </${ui.Card}>
    <p class="mt-4 text-sm text-slate-500">${C.rows.filter((c) => c.statut === "prospect").length} prospects et ${C.rows.filter((c) => c.statut === "client").length} clients dans votre fichier.</p>
  </${ui.Page}>`;
}
