function Ecran() {
  const P = useCollection("posts"), I = useCollection("idees");
  const vide = (date) => ({ texte: "", reseaux: ["instagram"], date: date || jourISO(new Date()), heure: "18:00", statut: "brouillon" });
  const [f, setF] = useState(() => vide(params?.nouveau)), [onglet, setOnglet] = useState("programme"), [busy, setBusy] = useState(""), [res, setRes] = useState(null);
  useEffect(() => { if (params?.ouvrir && !P.loading) { const p = P.rows.find((x) => x.id === params.ouvrir); if (p) setF({ ...p, reseaux: resDe(p) }); } }, [P.loading]);
  if (P.loading) return html`<${ui.Loading}/>`;
  const limite = Math.min(...f.reseaux.map((r) => RES[r][2]), 5000), long = String(f.texte).length;
  const basculer = (r) => setF({ ...f, reseaux: f.reseaux.includes(r) ? (f.reseaux.length > 1 ? f.reseaux.filter((x) => x !== r) : f.reseaux) : [...f.reseaux, r] });
  const aide = async (consigne, cle) => { setBusy(cle); try { const t = await ia(consigne + " Réseaux : " + f.reseaux.map((r) => RES[r][0]).join(", ") + ". Rends uniquement le texte de la publication, prêt à copier, sans guillemets ni commentaire.", { texte: f.texte }); if (t) setF({ ...f, texte: String(t).trim() }); } catch (e) { toast(e.message, "bad"); } finally { setBusy(""); } };
  const enregistrer = async (statut) => {
    if (!String(f.texte).trim()) { toast("Écrivez le texte de la publication", "bad"); return; }
    if (long > limite) { toast("Texte trop long pour " + f.reseaux.map((r) => RES[r][0]).join(", ") + " (" + limite + " caractères au plus)", "bad"); return; }
    const { id, created_at, updated_at, ...d } = f; d.statut = statut;
    if (d.rappel_id && typeof annulerEmail === "function") { try { await annulerEmail(d.rappel_id); } catch (_) {} d.rappel_id = ""; }
    if (statut === "programme") d.rappel_id = (await programmerRappel(d)) ?? "";
    if (id) await P.update(id, d); else await P.add(d);
    toast(statut === "programme" ? "Programmée : un rappel avec le texte prêt à copier vous sera envoyé le jour J" : statut === "publie" ? "Marquée comme publiée" : "Brouillon enregistré");
    setF(vide()); setOnglet(statut);
  };
  const L = P.rows.filter((p) => p.statut === onglet).sort((a, b) => onglet === "publie" ? String(b.date).localeCompare(String(a.date)) : String(a.date).localeCompare(String(b.date)));
  const nb = (s) => P.rows.filter((p) => p.statut === s).length;
  const idees = I.rows.filter((x) => !x.utilisee).slice(0, 4);
  return html`<div class="anim">
    <${Entete} titre="Publications" sous="Écrivez, programmez : le jour J, vous recevez un rappel avec le texte prêt à copier."/>
    <div class="grid gap-4 lg:grid-cols-5">
      <${Carte} classe="lg:col-span-3">
        <${TitreCarte} icone="crayon" titre=${f.id ? "Modifier la publication" : "Nouvelle publication"} sous="Choisissez les réseaux, écrivez, choisissez le moment."/>
        <div class="flex flex-wrap gap-2">${Object.entries(RES).map(([k, [l, c]]) => html`<button aria-pressed=${f.reseaux.includes(k) ? "true" : "false"} onClick=${() => basculer(k)} class="rounded-full border px-3.5 py-1.5 text-sm font-medium transition" style=${f.reseaux.includes(k) ? "background:" + c + ";border-color:" + c + ";color:white" : ""}>${l}</button>`)}</div>
        <textarea value=${f.texte} onInput=${(e) => setF({ ...f, texte: e.target.value })} rows="7" placeholder="Qu'avez-vous envie de partager ?" class="mt-3 w-full rounded-xl border border-slate-200 p-3.5 text-[15px] leading-relaxed outline-none focus:border-[var(--c)]"></textarea>
        <div class="mt-1 flex flex-wrap items-center gap-2"><span class=${"text-xs tabular-nums " + (long > limite ? "font-semibold text-rose-700" : "text-slate-400")}>${long} / ${limite}</span><span class="ml-auto"></span>${[["Écris une publication engageante sur ce sujet (ou, si le texte est vide, sur une idée utile pour mon public).", "✦ Écrire avec l'IA", "ecrire"], ["Raccourcis ce texte de moitié en gardant l'essentiel.", "Plus court", "court"], ["Ajoute 3 à 5 hashtags pertinents à la fin, sans changer le reste.", "Hashtags", "tags"]].map(([c, l, k]) => html`<button disabled=${!!busy} onClick=${() => aide(c, k)} class="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium hover:border-[var(--c)] hover:text-[var(--c)] disabled:opacity-50">${busy === k ? "…" : l}</button>`)}</div>
        <div class="mt-3 grid gap-3 sm:grid-cols-2"><${ui.Input} label="Date" type="date" value=${f.date} onInput=${(v) => setF({ ...f, date: v })}/><${ui.Input} label="Heure" type="time" value=${f.heure} onInput=${(v) => setF({ ...f, heure: v })}/></div>
        <div class="mt-4 flex flex-wrap gap-2"><${Bouton} onClick=${() => enregistrer("programme")}>Programmer</${Bouton}><${Bouton} secondaire onClick=${() => enregistrer("brouillon")}>Brouillon</${Bouton}><${Bouton} secondaire onClick=${() => enregistrer("publie")}>Déjà publiée</${Bouton}>${f.id && html`<button onClick=${() => setF(vide())} class="ml-auto text-sm text-slate-500">Nouvelle</button>`}</div>
        ${idees.length > 0 && html`<div class="mt-5 border-t border-slate-100 pt-4"><p class="mb-2 text-sm font-semibold">Une idée pour démarrer ?</p><div class="flex flex-wrap gap-2">${idees.map((x) => html`<button onClick=${async () => { setF({ ...f, texte: x.texte }); await I.update(x.id, { utilisee: true }); }} class="rounded-full bg-[var(--c)]/8 px-3 py-1.5 text-sm text-[var(--c)] hover:bg-[var(--c)]/15">${x.texte}</button>`)}</div></div>`}
      </${Carte}>
      <div class="lg:col-span-2"><${Carte}>
        <${Onglets} valeur=${onglet} onChange=${setOnglet} options=${[["programme", "Programmées (" + nb("programme") + ")"], ["brouillon", "Brouillons (" + nb("brouillon") + ")"], ["publie", "Publiées (" + nb("publie") + ")"]]}/>
        ${L.length ? html`<div class="mt-2 divide-y divide-slate-100">${L.slice(0, 12).map((p) => html`<div class="flex items-start gap-3 py-3"><button onClick=${() => setF({ ...p, reseaux: resDe(p) })} class="min-w-0 flex-1 text-left"><p class="line-clamp-2 text-sm">${p.texte}</p><div class="mt-1.5 flex flex-wrap items-center gap-1">${resDe(p).map((r) => html`<${Puce} r=${r}/>`)}<span class="ml-1 text-xs text-slate-400">${fmt.date(p.date)} ${p.heure || ""}</span></div></button><${Menu} actions=${[["Modifier", () => setF({ ...p, reseaux: resDe(p) })], p.statut !== "publie" && ["Marquer publiée", () => P.update(p.id, { statut: "publie" })], p.statut === "publie" && ["Saisir les résultats", () => setRes({ ...p })], ["Dupliquer", () => { const { id, created_at, updated_at, rappel_id, ...d } = p; P.add({ ...d, statut: "brouillon", jaime: 0, commentaires: 0, partages: 0 }); }], ["Supprimer", async () => { if (await demander("Supprimer cette publication ?", { ok: "Supprimer", danger: true })) P.remove(p.id); }, true]]}/></div>`)}</div>` : html`<p class="py-8 text-center text-sm text-slate-400">Rien ici pour l'instant.</p>`}
      </${Carte}></div>
    </div>
    <${ui.Modal} open=${!!res} onClose=${() => setRes(null)} titre="Résultats de la publication" actions=${html`<${ui.Button} variant="secondary" onClick=${() => setRes(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${async () => { await P.update(res.id, { jaime: Number(res.jaime) || 0, commentaires: Number(res.commentaires) || 0, partages: Number(res.partages) || 0 }); setRes(null); toast("Résultats enregistrés"); }}>Enregistrer</${ui.Button}>`}>
      ${res && html`<div class="grid gap-3 sm:grid-cols-3"><${ui.Input} label="J'aime" type="number" value=${res.jaime ?? 0} onInput=${(v) => setRes({ ...res, jaime: v })}/><${ui.Input} label="Commentaires" type="number" value=${res.commentaires ?? 0} onInput=${(v) => setRes({ ...res, commentaires: v })}/><${ui.Input} label="Partages" type="number" value=${res.partages ?? 0} onInput=${(v) => setRes({ ...res, partages: v })}/></div>`}
    </${ui.Modal}>
  </div>`;
}
