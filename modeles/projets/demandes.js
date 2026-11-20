// Modèle Projets — demandes reçues par le formulaire public, transformées en cartes d'un tableau en un clic.
function Ecran(props) {
  const D = useCollection("demandes"), T = useCollection("tableaux");
  const [vue, setVue] = useState("nouvelle"), [acc, setAcc] = useState(null);
  const auj = new Date().toISOString().slice(0, 10);
  const nid = () => "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const contenuDe = (r) => { let v = r?.contenu; if (typeof v === "string") { try { v = JSON.parse(v); } catch (e) { v = null; } } return { colonnes: Array.isArray(v?.colonnes) ? v.colonnes : [], cartes: Array.isArray(v?.cartes) ? v.cartes : [] }; };
  if (D.loading || T.loading) return html`<${ui.Loading}/>`;
  const actifs = T.rows.filter((r) => !r.archive);
  const n = (s) => D.rows.filter((d) => d.statut === s).length;
  const liste = D.rows.filter((d) => d.statut === vue).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const accepter = async () => {
    const d = acc, r = actifs.find((x) => x.id === d.tableau_id); if (!r) { toast("Choisissez un tableau", "bad"); return; }
    const x = contenuDe(r); const colonnes = x.colonnes.length ? x.colonnes : [{ id: "c1", nom: "À faire" }, { id: "c2", nom: "En cours" }, { id: "c3", nom: "Terminé" }];
    const desc = [d.description, "", "Demandé par " + (d.nom || "un visiteur") + (d.email ? " (" + d.email + ")" : "") + " le " + fmt.date(d.created_at)].join("\n").trim();
    await T.update(r.id, { contenu: { colonnes, cartes: [...x.cartes, { id: nid(), colonne: colonnes[0].id, titre: d.titre, description: desc, responsable: d.responsable ?? "", echeance: d.echeance ?? "", etiquettes: d.priorite === "urgente" ? ["rouge"] : [], cases: [], commentaires: [] }] } });
    await D.update(d.id, { statut: "acceptee", tableau_id: r.id, traitee_le: auj });
    if (d.prevenir && d.email) await email({ a: d.email, sujet: "Votre demande est prise en charge", texte: "Bonjour " + String(d.nom || "").split(" ")[0] + ",\n\nVotre demande « " + d.titre + " » a bien été prise en charge" + (d.echeance ? ", pour le " + fmt.date(d.echeance) : "") + ".\nNous revenons vers vous dès qu'elle avance.\n\nBonne journée !" }).catch(() => {});
    setAcc(null); toast("Demande ajoutée à « " + r.nom + " »");
  };
  const refuser = async (d) => { if (!await demander("Refuser la demande « " + d.titre + " » ?", { ok: "Refuser" })) return; await D.update(d.id, { statut: "refusee", traitee_le: auj }); toast("Demande refusée"); };
  const rouvrir = async (d) => { await D.update(d.id, { statut: "nouvelle" }); toast("Demande remise dans les nouvelles"); };
  return html`<${ui.Page} titre="Demandes" sous="Ce que l'on vous demande par votre formulaire en ligne. Acceptez une demande : elle devient une carte de votre tableau.">
    <div class="mb-4"><${ui.Tabs} valeur=${vue} onChange=${setVue} onglets=${[["nouvelle", "À traiter (" + n("nouvelle") + ")"], ["acceptee", "Acceptées (" + n("acceptee") + ")"], ["refusee", "Refusées (" + n("refusee") + ")"]]}/></div>
    ${liste.length ? html`<div class="space-y-3">${liste.map((d) => { const r = T.rows.find((x) => x.id === d.tableau_id); return html`<div class="rounded-2xl bg-white border border-slate-200 p-4">
      <div class="flex flex-wrap items-start gap-3">
        <div class="min-w-0 flex-1"><div class="flex items-center gap-2"><p class="font-semibold">${d.titre}</p>${d.priorite === "urgente" && html`<${ui.Badge} couleur="rouge">Urgent</${ui.Badge}>`}</div>
          <p class="text-xs text-slate-500">${d.nom || "Visiteur"}${d.email ? " · " + d.email : ""} · reçue le ${fmt.date(d.created_at)}</p></div>
        ${d.statut === "nouvelle" ? html`<div class="flex gap-2"><${ui.Button} variant="secondary" onClick=${() => refuser(d)}>Refuser</${ui.Button}><${ui.Button} onClick=${() => setAcc({ ...d, tableau_id: actifs[0]?.id ?? "", responsable: props?.user?.nom ?? "", echeance: "", prevenir: !!d.email })}>Accepter</${ui.Button}></div>`
          : html`<div class="flex items-center gap-2">${r && d.statut === "acceptee" && html`<button onClick=${() => go("tableaux", { tableau: r.id })} class="text-sm text-[var(--c)] hover:underline">${r.emoji || "📋"} ${r.nom} →</button>`}<${ui.Button} variant="ghost" onClick=${() => rouvrir(d)}>Remettre en nouvelle</${ui.Button}></div>`}
      </div>
      ${d.description && html`<p class="mt-2 text-sm text-slate-700 whitespace-pre-line">${d.description}</p>`}
    </div>`; })}</div>` : html`<${ui.Empty} texte=${vue === "nouvelle" ? "Aucune nouvelle demande. Partagez le lien de votre formulaire pour en recevoir." : "Rien ici pour l'instant."}/>`}
    <${ui.Modal} open=${!!acc} onClose=${() => setAcc(null)} titre=${acc ? "Accepter « " + acc.titre + " »" : ""} actions=${html`<${ui.Button} variant="secondary" onClick=${() => setAcc(null)}>Annuler</${ui.Button}><${ui.Button} onClick=${accepter}>Créer la carte</${ui.Button}>`}>
      ${acc && html`<div class="grid sm:grid-cols-2 gap-3">
        <div class="sm:col-span-2"><${ui.Select} label="Dans le tableau" value=${acc.tableau_id} onChange=${(v) => setAcc({ ...acc, tableau_id: v })} options=${actifs.map((r) => [r.id, (r.emoji || "📋") + " " + r.nom])}/></div>
        <${ui.Input} label="Responsable" value=${acc.responsable} onInput=${(v) => setAcc({ ...acc, responsable: v })}/>
        <${ui.Input} label="Échéance" type="date" value=${acc.echeance} onInput=${(v) => setAcc({ ...acc, echeance: v })}/>
        ${acc.email && html`<label class="sm:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" class="accent-[var(--c)] w-4 h-4" checked=${acc.prevenir} onChange=${(e) => setAcc({ ...acc, prevenir: e.target.checked })}/>Prévenir ${acc.nom || "la personne"} par e-mail que sa demande est prise en charge</label>`}
      </div>`}
    </${ui.Modal}>
  </${ui.Page}>`;
}
