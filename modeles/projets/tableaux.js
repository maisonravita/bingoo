// Modèle Projets — écran principal : la liste des tableaux, puis le tableau ouvert en colonnes de cartes (ui.Tableau).
// Tout le tableau (colonnes et cartes) tient dans le champ json « contenu » d'un élément de la collection tableaux.
function Ecran(props) {
  const T = useCollection("tableaux"), D = useCollection("demandes");
  const [ouvert, setOuvert] = useState(props?.params?.tableau ?? null);
  const [vue, setVue] = useState("actifs"), [q, setQ] = useState(""), [nouveau, setNouveau] = useState(null), [reglage, setReglage] = useState(null), [etat, setEtat] = useState("");
  const minuteur = useRef(null), attente = useRef(null), cache = useRef({});
  const EMOJIS = ["🚀", "📋", "🎯", "🛠️", "📣", "🎨", "📦", "💡", "🗓️", "🤝", "✍️", "🏁"];
  const COULEURS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2", "#475569", "#ca8a04"];
  const MODELES = [{ id: "vierge", nom: "Tableau vierge", emoji: "📋", colonnes: ["À faire", "En cours", "Terminé"], cartes: [] }, ...((V.modeles ?? []).slice(0, 4))];
  const auj = new Date().toISOString().slice(0, 10);
  const nid = () => "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const contenuDe = (r) => { if (r && cache.current[r.id]) return cache.current[r.id]; let v = r?.contenu; if (typeof v === "string") { try { v = JSON.parse(v); } catch (e) { v = null; } } return { colonnes: Array.isArray(v?.colonnes) ? v.colonnes : [], cartes: Array.isArray(v?.cartes) ? v.cartes : [] }; };
  const finie = (c, cols) => { const i = cols.findIndex((x) => x.id === c.colonne); return i >= 0 && (i === cols.length - 1 || /^(termin|fait|livr|clos|archiv)/i.test(cols[i].nom ?? "")); };
  const bilan = (r) => { const x = contenuDe(r), faites = x.cartes.filter((c) => finie(c, x.colonnes)).length; return { total: x.cartes.length, faites, retard: x.cartes.filter((c) => c.echeance && c.echeance < auj && !finie(c, x.colonnes)).length, pct: x.cartes.length ? Math.round(faites / x.cartes.length * 100) : 0 }; };
  useEffect(() => { if (props?.params?.tableau) setOuvert(props.params.tableau); }, [props?.params?.tableau]);
  // Enregistrement automatique (différé) : chaque changement du tableau est gardé, « Enregistré » s'affiche
  const vider = async () => { const a = attente.current; if (!a) return; attente.current = null; clearTimeout(minuteur.current); try { await T.update(a.id, { contenu: a.contenu }); setEtat("Enregistré"); } catch (x) { setEtat(""); toast("Enregistrement impossible : " + x.message, "bad"); } };
  const changer = (id, contenu) => { cache.current[id] = contenu; attente.current = { id, contenu }; setEtat("Enregistrement…"); clearTimeout(minuteur.current); minuteur.current = setTimeout(vider, 700); };
  useEffect(() => () => { vider(); }, []);
  const fermer = async () => { await vider(); setOuvert(null); setEtat(""); };
  const creer = async () => {
    const n = nouveau; if (!String(n.nom ?? "").trim()) { toast("Donnez un nom au tableau", "bad"); return; }
    const m = MODELES.find((x) => x.id === n.modele) ?? MODELES[0];
    const colonnes = (m.colonnes ?? []).map((nom, i) => ({ id: "c" + (i + 1), nom }));
    const cartes = (m.cartes ?? []).map((t, i) => ({ id: nid() + i, colonne: "c1", titre: String(t) }));
    const r = await T.add({ nom: n.nom.trim(), description: n.description ?? "", emoji: n.emoji, couleur: n.couleur, contenu: { colonnes, cartes }, favori: false, archive: false });
    setNouveau(null); toast("Tableau créé"); if (r?.id) setOuvert(r.id);
  };
  const majInfos = async () => { const { id, nom, description, emoji, couleur } = reglage; if (!String(nom ?? "").trim()) { toast("Donnez un nom au tableau", "bad"); return; } await T.update(id, { nom: nom.trim(), description, emoji, couleur }); setReglage(null); toast("Enregistré"); };
  const archiver = async (t) => { await vider(); await T.update(t.id, { archive: !t.archive }); toast(t.archive ? "Tableau restauré" : "Tableau archivé"); if (!t.archive) setOuvert(null); };
  const supprimer = async (t) => { if (!await demander("Supprimer le tableau « " + t.nom + " » et toutes ses cartes ?", { ok: "Supprimer", danger: true })) return; attente.current = null; await T.remove(t.id); setReglage(null); setOuvert(null); toast("Tableau supprimé"); };
  const dupliquer = async (t) => { const x = contenuDe(t); const r = await T.add({ nom: t.nom + " (copie)", description: t.description ?? "", emoji: t.emoji, couleur: t.couleur, contenu: { colonnes: x.colonnes, cartes: x.cartes.map((c) => ({ ...c, id: nid() + c.id, commentaires: [] })) }, favori: false, archive: false }); toast("Tableau dupliqué"); if (r?.id) setOuvert(r.id); };
  if (T.loading) return html`<${ui.Loading}/>`;
  const membres = [...new Set([props?.user?.nom, ...T.rows.flatMap((r) => contenuDe(r).cartes.map((c) => c.responsable))].filter(Boolean))];
  const demandes = D.rows.filter((d) => d.statut === "nouvelle").length;
  const t = T.rows.find((x) => x.id === ouvert);
  const pastille = (actif, l, f) => html`<button onClick=${f} class=${"rounded-full px-3 py-1 text-sm font-medium border " + (actif ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300")}>${l}</button>`;
  const formInfos = (x, set) => html`<div class="space-y-4">
    <${ui.Input} label="Nom du tableau" value=${x.nom} placeholder="Ex. Refonte du site" onInput=${(v) => set({ ...x, nom: v })}/>
    <${ui.Textarea} label="Description (facultatif)" rows=${2} value=${x.description} onInput=${(v) => set({ ...x, description: v })}/>
    <div><p class="text-xs font-medium text-slate-500 mb-1.5">Icône</p><div class="flex flex-wrap gap-1.5">${EMOJIS.map((e) => html`<button aria-label=${"Icône " + e} onClick=${() => set({ ...x, emoji: e })} class=${"w-9 h-9 rounded-lg text-lg " + (x.emoji === e ? "bg-slate-900/10 ring-2 ring-slate-900" : "bg-slate-50 hover:bg-slate-100")}>${e}</button>`)}</div></div>
    <div><p class="text-xs font-medium text-slate-500 mb-1.5">Couleur</p><div class="flex flex-wrap gap-2">${COULEURS.map((c) => html`<button aria-label=${"Couleur " + c} onClick=${() => set({ ...x, couleur: c })} class=${"w-8 h-8 rounded-full " + (x.couleur === c ? "ring-2 ring-offset-2 ring-slate-900" : "")} style=${"background:" + c}></button>`)}</div></div>
  </div>`;

  // ---------------------------------------------------------------- Tableau ouvert
  if (t) {
    const b = bilan(t);
    return html`<div class="space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <button onClick=${fermer} class="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">← ${V.tableaux}</button>
        <span class="grid w-10 h-10 place-items-center rounded-xl text-xl" style=${"background:" + (t.couleur || "#2563eb") + "22"}>${t.emoji || "📋"}</span>
        <div class="min-w-0 flex-1"><h1 class="text-xl font-bold tracking-tight truncate">${t.nom}</h1>${t.description && html`<p class="text-sm text-slate-500 truncate">${t.description}</p>`}</div>
        <span class="text-xs text-slate-400 w-24 text-right">${etat}</span>
        <button title=${t.favori ? "Retirer des favoris" : "Mettre en favori"} onClick=${() => T.update(t.id, { favori: !t.favori })} class=${"rounded-lg px-2.5 py-1.5 text-lg hover:bg-slate-100 " + (t.favori ? "text-amber-500" : "text-slate-300")}>★</button>
        <${ui.Button} variant="secondary" onClick=${() => setReglage({ ...t })}>Réglages</${ui.Button}>
      </div>
      <div class="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl bg-white border border-slate-200 px-4 py-3 text-sm">
        <span><b class="tabular-nums">${b.total}</b> ${V.cartes.toLowerCase()}</span>
        <span><b class="tabular-nums">${b.faites}</b> terminée${b.faites > 1 ? "s" : ""}</span>
        <span class=${b.retard ? "text-red-600" : "text-slate-500"}><b class="tabular-nums">${b.retard}</b> en retard</span>
        <div class="flex-1 min-w-[140px] flex items-center gap-2"><div class="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div class="h-full rounded-full" style=${"width:" + b.pct + "%;background:" + (t.couleur || "var(--c)")}></div></div><span class="tabular-nums text-slate-500">${b.pct} %</span></div>
      </div>
      <${ui.Tableau} key=${t.id} value=${contenuDe(t)} membres=${membres} onChange=${(x) => changer(t.id, x)}/>
      <${ui.Modal} open=${!!reglage} onClose=${() => setReglage(null)} titre="Réglages du tableau" actions=${html`<${ui.Button} variant="danger" onClick=${() => supprimer(t)}>Supprimer</${ui.Button}><${ui.Button} variant="secondary" onClick=${() => { setReglage(null); archiver(t); }}>Archiver</${ui.Button}><${ui.Button} variant="secondary" onClick=${() => { setReglage(null); dupliquer(t); }}>Dupliquer</${ui.Button}><${ui.Button} onClick=${majInfos}>Enregistrer</${ui.Button}>`}>
        ${reglage && formInfos(reglage, setReglage)}
      </${ui.Modal}>
    </div>`;
  }

  // ---------------------------------------------------------------- Tous les tableaux
  const liste = T.rows.filter((r) => (vue === "archives" ? r.archive : !r.archive) && (!q || (r.nom + " " + (r.description ?? "")).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (b.favori ? 1 : 0) - (a.favori ? 1 : 0) || String(b.updated_at ?? b.created_at).localeCompare(String(a.updated_at ?? a.created_at)));
  const tuile = (r) => { const b = bilan(r); return html`<div onClick=${() => setOuvert(r.id)} class="group cursor-pointer rounded-2xl bg-white border border-slate-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition">
    <div class="h-2" style=${"background:" + (r.couleur || "#2563eb")}></div>
    <div class="p-4">
      <div class="flex items-start gap-3"><span class="text-2xl">${r.emoji || "📋"}</span><div class="min-w-0 flex-1"><p class="font-semibold leading-snug truncate">${r.nom}</p><p class="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">${r.description || "Aucune description"}</p></div>${r.favori && html`<span class="text-amber-500" title="Favori">★</span>`}</div>
      <div class="mt-3 flex items-center gap-2"><div class="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div class="h-full rounded-full" style=${"width:" + b.pct + "%;background:" + (r.couleur || "var(--c)")}></div></div><span class="text-xs tabular-nums text-slate-500">${b.pct} %</span></div>
      <div class="mt-2 flex items-center gap-3 text-xs text-slate-500"><span>${b.total} ${V.cartes.toLowerCase()}</span>${b.retard > 0 && html`<span class="rounded bg-red-50 px-1.5 py-0.5 text-red-700">${b.retard} en retard</span>`}</div>
    </div></div>`; };
  return html`<${ui.Page} titre=${V.tableaux} sous="Un tableau par projet : des colonnes, des cartes à faire glisser, et toute l'équipe sur la même page." actions=${html`<${ui.Button} onClick=${() => setNouveau({ nom: "", description: "", emoji: "🚀", couleur: COULEURS[T.rows.length % COULEURS.length], modele: MODELES[1]?.id ?? "vierge" })}>Nouveau tableau</${ui.Button}>`}>
    ${demandes > 0 && html`<button onClick=${() => go("demandes")} class="mb-4 w-full flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-left text-sm hover:bg-amber-100"><span class="text-lg">📥</span><span class="flex-1"><b>${demandes} demande${demandes > 1 ? "s" : ""}</b> reçue${demandes > 1 ? "s" : ""} par votre formulaire, à transformer en ${V.carte.toLowerCase()}.</span><span class="font-medium text-amber-800">Voir →</span></button>`}
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <input class="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm outline-none focus:border-[var(--c)] w-56" placeholder="Rechercher un tableau" value=${q} onInput=${(e) => setQ(e.target.value)}/>
      ${pastille(vue === "actifs", "En cours (" + T.rows.filter((r) => !r.archive).length + ")", () => setVue("actifs"))}
      ${pastille(vue === "archives", "Archivés (" + T.rows.filter((r) => r.archive).length + ")", () => setVue("archives"))}
    </div>
    ${liste.length ? html`<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${liste.map(tuile)}</div>` : html`<${ui.Empty} texte=${vue === "archives" ? "Aucun tableau archivé." : q ? "Aucun tableau ne correspond." : "Créez votre premier tableau pour démarrer."}/>`}
    <${ui.Modal} open=${!!nouveau} onClose=${() => setNouveau(null)} titre="Nouveau tableau" actions=${html`<${ui.Button} variant="secondary" onClick=${() => setNouveau(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${creer}>Créer le tableau</${ui.Button}>`}>
      ${nouveau && html`<div class="space-y-4">
        <div><p class="text-xs font-medium text-slate-500 mb-1.5">Partir d'un modèle</p><div class="grid sm:grid-cols-2 gap-2">${MODELES.map((m) => html`<button onClick=${() => setNouveau({ ...nouveau, modele: m.id, emoji: m.emoji || nouveau.emoji })} class=${"rounded-xl border p-3 text-left " + (nouveau.modele === m.id ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-300")}><p class="font-medium text-sm">${m.emoji || "📋"} ${m.nom}</p><p class="text-xs text-slate-500 truncate">${(m.colonnes ?? []).join(" → ")}</p></button>`)}</div></div>
        ${formInfos(nouveau, setNouveau)}
      </div>`}
    </${ui.Modal}>
  </${ui.Page}>`;
}
