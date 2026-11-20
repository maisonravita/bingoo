// Modèle Projets — calendrier des échéances de toutes les cartes ; un clic sur un jour crée une tâche à cette date.
function Ecran(props) {
  const T = useCollection("tableaux");
  const [sel, setSel] = useState(null), [m, setM] = useState(null), [tab, setTab] = useState("tous");
  const auj = new Date().toISOString().slice(0, 10);
  const nid = () => "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const contenuDe = (r) => { let v = r?.contenu; if (typeof v === "string") { try { v = JSON.parse(v); } catch (e) { v = null; } } return { colonnes: Array.isArray(v?.colonnes) ? v.colonnes : [], cartes: Array.isArray(v?.cartes) ? v.cartes : [] }; };
  const finie = (c, cols) => { const i = cols.findIndex((x) => x.id === c.colonne); return i >= 0 && (i === cols.length - 1 || /^(termin|fait|livr|clos|archiv)/i.test(cols[i].nom ?? "")); };
  if (T.loading) return html`<${ui.Loading}/>`;
  const actifs = T.rows.filter((r) => !r.archive);
  const cartes = actifs.filter((r) => tab === "tous" || r.id === tab).flatMap((r) => { const x = contenuDe(r); return x.cartes.filter((c) => c.echeance).map((c) => ({ ...c, tableau: r, colonne_nom: x.colonnes.find((o) => o.id === c.colonne)?.nom ?? "", fini: finie(c, x.colonnes) })); });
  const retard = cartes.filter((c) => !c.fini && c.echeance < auj).sort((a, b) => a.echeance.localeCompare(b.echeance));
  const majCarte = async (c, d) => { const x = contenuDe(c.tableau); await T.update(c.tableau.id, { contenu: { ...x, cartes: x.cartes.map((k) => k.id === c.id ? { ...k, ...d } : k) } }); };
  const enregistrer = async () => { await majCarte(sel, { echeance: sel.echeance, responsable: sel.responsable ?? "", titre: sel.titre }); setSel(null); toast("Échéance mise à jour"); };
  const ajouter = async () => {
    if (!String(m.titre ?? "").trim()) { toast("Donnez un titre à la tâche", "bad"); return; }
    const r = actifs.find((x) => x.id === m.tableau_id); if (!r) { toast("Choisissez un tableau", "bad"); return; }
    const x = contenuDe(r); const colonnes = x.colonnes.length ? x.colonnes : [{ id: "c1", nom: "À faire" }, { id: "c2", nom: "En cours" }, { id: "c3", nom: "Terminé" }];
    await T.update(r.id, { contenu: { colonnes, cartes: [...x.cartes, { id: nid(), colonne: colonnes[0].id, titre: m.titre.trim(), description: "", responsable: m.responsable ?? "", echeance: m.echeance, etiquettes: [], cases: [], commentaires: [] }] } });
    setM(null); toast("Tâche ajoutée au " + fmt.date(m.echeance));
  };
  const pastille = (actif, l, f) => html`<button onClick=${f} class=${"rounded-full px-3 py-1 text-sm font-medium border " + (actif ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300")}>${l}</button>`;
  return html`<${ui.Page} titre="Calendrier" sous="Les échéances de tous vos projets. Cliquez sur un jour pour y ajouter une tâche." actions=${html`<${ui.Button} onClick=${() => setM({ titre: "", tableau_id: actifs[0]?.id ?? "", responsable: props?.user?.nom ?? "", echeance: auj })}>Nouvelle tâche</${ui.Button}>`}>
    <div class="mb-4 flex flex-wrap gap-2">${pastille(tab === "tous", "Tous les tableaux", () => setTab("tous"))}${actifs.map((r) => pastille(tab === r.id, (r.emoji || "📋") + " " + r.nom, () => setTab(r.id)))}</div>
    ${retard.length > 0 && html`<section class="mb-4 rounded-2xl bg-red-50 border border-red-100 p-4">
      <h2 class="text-sm font-semibold text-red-700">${retard.length} échéance${retard.length > 1 ? "s" : ""} dépassée${retard.length > 1 ? "s" : ""}</h2>
      <div class="mt-2 flex flex-wrap gap-2">${retard.slice(0, 6).map((c) => html`<button onClick=${() => setSel({ ...c })} class="rounded-lg bg-white px-2.5 py-1 text-xs text-slate-700 border border-red-100 hover:border-red-300">${c.tableau.emoji || "📋"} ${c.titre} · <span class="text-red-600">${fmt.date(c.echeance)}</span></button>`)}</div>
    </section>`}
    <${ui.Calendrier} lignes=${cartes} champ="echeance" rendu=${(c) => (c.fini ? "✓ " : "") + c.titre} onClick=${(c) => setSel({ ...c })} onJour=${(d) => setM({ titre: "", tableau_id: (tab !== "tous" ? tab : actifs[0]?.id) ?? "", responsable: props?.user?.nom ?? "", echeance: d })}/>
    <${ui.Modal} open=${!!sel} onClose=${() => setSel(null)} titre=${sel?.titre ?? ""} actions=${html`<${ui.Button} variant="secondary" onClick=${() => { const id = sel.tableau.id; setSel(null); go("tableaux", { tableau: id }); }}>Ouvrir le tableau</${ui.Button}><${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
      ${sel && html`<div class="space-y-3">
        <p class="text-sm text-slate-500">${sel.tableau.emoji || "📋"} ${sel.tableau.nom} · <${ui.Badge} couleur=${sel.fini ? "vert" : sel.echeance < auj ? "rouge" : "bleu"}>${sel.colonne_nom || "Sans colonne"}</${ui.Badge}></p>
        ${sel.description && html`<p class="text-sm whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2">${sel.description}</p>`}
        <${ui.Input} label="Titre" value=${sel.titre} onInput=${(v) => setSel({ ...sel, titre: v })}/>
        <div class="grid sm:grid-cols-2 gap-3"><${ui.Input} label="Échéance" type="date" value=${sel.echeance} onInput=${(v) => setSel({ ...sel, echeance: v })}/><${ui.Input} label="Responsable" value=${sel.responsable} onInput=${(v) => setSel({ ...sel, responsable: v })}/></div>
      </div>`}
    </${ui.Modal}>
    <${ui.Modal} open=${!!m} onClose=${() => setM(null)} titre=${m ? "Nouvelle tâche — " + fmt.date(m.echeance) : ""} actions=${html`<${ui.Button} variant="secondary" onClick=${() => setM(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${ajouter}>Ajouter la tâche</${ui.Button}>`}>
      ${m && html`<div class="grid sm:grid-cols-2 gap-3">
        <div class="sm:col-span-2"><${ui.Input} label="Tâche" value=${m.titre} placeholder="Ex. Livrer la maquette" onInput=${(v) => setM({ ...m, titre: v })}/></div>
        <${ui.Select} label="Tableau" value=${m.tableau_id} onChange=${(v) => setM({ ...m, tableau_id: v })} options=${actifs.map((r) => [r.id, (r.emoji || "📋") + " " + r.nom])}/>
        <${ui.Input} label="Échéance" type="date" value=${m.echeance} onInput=${(v) => setM({ ...m, echeance: v })}/>
        <div class="sm:col-span-2"><${ui.Input} label="Responsable" value=${m.responsable} onInput=${(v) => setM({ ...m, responsable: v })}/></div>
      </div>`}
    </${ui.Modal}>
  </${ui.Page}>`;
}
