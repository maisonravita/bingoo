// Modèle Projets — « Mes tâches » : toutes les cartes de tous les tableaux, par échéance, filtrées par personne.
function Ecran(props) {
  const T = useCollection("tableaux");
  const [qui, setQui] = useState(null), [fini, setFini] = useState(false), [m, setM] = useState(null);
  const auj = new Date().toISOString().slice(0, 10);
  const dans = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const nid = () => "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const contenuDe = (r) => { let v = r?.contenu; if (typeof v === "string") { try { v = JSON.parse(v); } catch (e) { v = null; } } return { colonnes: Array.isArray(v?.colonnes) ? v.colonnes : [], cartes: Array.isArray(v?.cartes) ? v.cartes : [] }; };
  const finie = (c, cols) => { const i = cols.findIndex((x) => x.id === c.colonne); return i >= 0 && (i === cols.length - 1 || /^(termin|fait|livr|clos|archiv)/i.test(cols[i].nom ?? "")); };
  if (T.loading) return html`<${ui.Loading}/>`;
  const actifs = T.rows.filter((r) => !r.archive);
  const toutes = actifs.flatMap((r) => { const x = contenuDe(r); return x.cartes.map((c) => ({ ...c, tableau: r, colonne_nom: x.colonnes.find((o) => o.id === c.colonne)?.nom ?? "", fini: finie(c, x.colonnes) })); });
  const gens = [...new Set(toutes.map((c) => c.responsable).filter(Boolean))].sort();
  const moi = props?.user?.nom && gens.includes(props.user.nom) ? props.user.nom : "";
  const filtre = qui ?? moi;
  const vues = toutes.filter((c) => (!filtre || c.responsable === filtre) && (fini || !c.fini));
  const semaine = dans(7);
  const GROUPES = [
    ["En retard", (c) => !c.fini && c.echeance && c.echeance < auj, "text-red-600"],
    ["Aujourd'hui", (c) => c.echeance === auj, "text-[var(--c)]"],
    ["Cette semaine", (c) => c.echeance > auj && c.echeance <= semaine, "text-slate-900"],
    ["Plus tard", (c) => c.echeance > semaine, "text-slate-900"],
    ["Sans échéance", (c) => !c.echeance, "text-slate-500"],
    ["Terminées", (c) => c.fini && c.echeance && c.echeance < auj, "text-emerald-700"],
  ];
  const deja = new Set();
  const groupes = GROUPES.map(([titre, test, couleur]) => { const xs = vues.filter((c) => !deja.has(c.tableau.id + c.id) && test(c)).sort((a, b) => String(a.echeance).localeCompare(String(b.echeance))); xs.forEach((c) => deja.add(c.tableau.id + c.id)); return { titre, couleur, xs }; }).filter((g) => g.xs.length);
  // Terminer une tâche = la ranger dans la dernière colonne de son tableau ; la rouvrir = la remettre dans la première
  const basculer = async (c) => { const x = contenuDe(c.tableau); if (!x.colonnes.length) return; const cible = c.fini ? x.colonnes[0].id : x.colonnes[x.colonnes.length - 1].id; await T.update(c.tableau.id, { contenu: { ...x, cartes: x.cartes.map((k) => k.id === c.id ? { ...k, colonne: cible } : k) } }); toast(c.fini ? "Tâche rouverte" : "Bravo, tâche terminée !"); };
  const ajouter = async () => {
    if (!String(m.titre ?? "").trim()) { toast("Donnez un titre à la tâche", "bad"); return; }
    const r = actifs.find((x) => x.id === m.tableau_id); if (!r) { toast("Choisissez un tableau", "bad"); return; }
    const x = contenuDe(r); const colonnes = x.colonnes.length ? x.colonnes : [{ id: "c1", nom: "À faire" }, { id: "c2", nom: "En cours" }, { id: "c3", nom: "Terminé" }];
    await T.update(r.id, { contenu: { colonnes, cartes: [...x.cartes, { id: nid(), colonne: colonnes[0].id, titre: m.titre.trim(), description: m.description ?? "", responsable: m.responsable ?? "", echeance: m.echeance ?? "", etiquettes: [], cases: [], commentaires: [] }] } });
    setM(null); toast("Tâche ajoutée à « " + r.nom + " »");
  };
  const pastille = (actif, l, f) => html`<button onClick=${f} class=${"rounded-full px-3 py-1 text-sm font-medium border " + (actif ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300")}>${l}</button>`;
  const ligne = (c) => html`<div class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
    <button aria-label=${c.fini ? "Rouvrir la tâche" : "Marquer comme terminée"} title=${c.fini ? "Rouvrir" : "Terminer"} onClick=${() => basculer(c)} class=${"grid w-6 h-6 shrink-0 place-items-center rounded-full border-2 text-xs " + (c.fini ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-[var(--c)] text-transparent hover:text-[var(--c)]")}>✓</button>
    <div class="min-w-0 flex-1 cursor-pointer" onClick=${() => go("tableaux", { tableau: c.tableau.id })}>
      <p class=${"text-sm font-medium truncate " + (c.fini ? "line-through text-slate-500" : "")}>${c.titre}</p>
      <p class="text-xs text-slate-500 truncate">${c.tableau.emoji || "📋"} ${c.tableau.nom} · ${c.colonne_nom}${(c.cases ?? []).length ? " · ☑ " + c.cases.filter((k) => k.fait).length + "/" + c.cases.length : ""}</p>
    </div>
    ${c.responsable && html`<span title=${c.responsable} class="hidden sm:grid w-7 h-7 shrink-0 place-items-center rounded-full bg-[var(--c)] text-white text-[10px] font-bold">${c.responsable.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()}</span>`}
    <span class=${"w-24 shrink-0 text-right text-xs " + (!c.fini && c.echeance && c.echeance < auj ? "text-red-600 font-semibold" : "text-slate-500")}>${c.echeance ? fmt.date(c.echeance) : "—"}</span>
  </div>`;
  return html`<${ui.Page} titre="Mes tâches" sous="Tout ce qui est à faire, sur tous vos tableaux, classé par échéance." actions=${html`<${ui.Button} onClick=${() => setM({ titre: "", tableau_id: actifs[0]?.id ?? "", responsable: filtre || props?.user?.nom || "", echeance: auj, description: "" })}>Nouvelle tâche</${ui.Button}>`}>
    <div class="mb-4 flex flex-wrap items-center gap-2">
      ${pastille(!filtre, "Tout le monde", () => setQui(""))}
      ${gens.map((g) => pastille(filtre === g, g, () => setQui(g)))}
      <label class="ml-auto flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" class="accent-[var(--c)] w-4 h-4" checked=${fini} onChange=${(e) => setFini(e.target.checked)}/>Afficher les terminées</label>
    </div>
    ${groupes.length ? html`<div class="space-y-5">${groupes.map((g) => html`<section>
      <h2 class=${"mb-2 text-sm font-semibold " + g.couleur}>${g.titre} <span class="font-normal text-slate-500">${g.xs.length}</span></h2>
      <div class="rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100 overflow-hidden">${g.xs.map(ligne)}</div>
    </section>`)}</div>` : html`<${ui.Empty} texte=${filtre ? "Rien à faire pour " + filtre + " : tout est à jour." : "Aucune tâche pour l'instant. Ajoutez-en une, ou ouvrez un tableau."}/>`}
    <${ui.Modal} open=${!!m} onClose=${() => setM(null)} titre="Nouvelle tâche" actions=${html`<${ui.Button} variant="secondary" onClick=${() => setM(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${ajouter}>Ajouter la tâche</${ui.Button}>`}>
      ${m && html`<div class="grid sm:grid-cols-2 gap-3">
        <div class="sm:col-span-2"><${ui.Input} label="Tâche" value=${m.titre} placeholder="Ex. Préparer la présentation" onInput=${(v) => setM({ ...m, titre: v })}/></div>
        <${ui.Select} label="Tableau" value=${m.tableau_id} onChange=${(v) => setM({ ...m, tableau_id: v })} options=${actifs.map((r) => [r.id, (r.emoji || "📋") + " " + r.nom])}/>
        <${ui.Input} label="Échéance" type="date" value=${m.echeance} onInput=${(v) => setM({ ...m, echeance: v })}/>
        <div class="sm:col-span-2"><${ui.Input} label="Responsable" value=${m.responsable} placeholder="Prénom Nom" onInput=${(v) => setM({ ...m, responsable: v })}/></div>
        <div class="sm:col-span-2"><${ui.Textarea} label="Description (facultatif)" rows=${2} value=${m.description} onInput=${(v) => setM({ ...m, description: v })}/></div>
      </div>`}
    </${ui.Modal}>
  </${ui.Page}>`;
}
