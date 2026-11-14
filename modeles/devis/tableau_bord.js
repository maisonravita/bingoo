function Ecran() {
  const D = useCollection("devis"), F = useCollection("factures"), C = useCollection("clients"), E = useCollection("entreprise");
  const [busy, setBusy] = useState(null);
  const auj = new Date().toISOString().slice(0, 10), mois = auj.slice(0, 7);
  const ttc = (d) => { const ht = (d?.lignes ?? []).reduce((a, l) => a + (Number(l.quantite) || 0) * (Number(l.prix) || 0), 0); return ht * (1 + (Number(d?.tva ?? 20) || 0) / 100); };
  const ent = E.rows[0] ?? {};
  const encaisse = (m) => F.rows.filter((f) => f.statut === "payee" && String(f.payee_le ?? "").slice(0, 7) === m).reduce((a, f) => a + ttc(f), 0);
  const ouvertes = F.rows.filter((f) => f.statut !== "payee"), retard = ouvertes.filter((f) => f.echeance && f.echeance < auj);
  const envoyes = D.rows.filter((d) => d.statut === "envoye"), demandes = D.rows.filter((d) => d.statut === "demande");
  const fin = D.rows.filter((d) => ["accepte", "refuse"].includes(d.statut)), taux = fin.length ? Math.round(100 * fin.filter((d) => d.statut === "accepte").length / fin.length) : 0;
  const mois6 = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); const m = d.toISOString().slice(0, 7); return { label: d.toLocaleDateString("fr-FR", { month: "short" }), valeur: encaisse(m) }; });
  const LIB = { demande: "Demandes", brouillon: "Brouillons", envoye: "Envoyés", accepte: "Acceptés", refuse: "Refusés" };
  const parStatut = Object.entries(LIB).map(([k, l]) => ({ label: l, valeur: D.rows.filter((d) => d.statut === k).length })).filter((x) => x.valeur);
  const vieux = envoyes.filter((d) => (d.envoye_le ?? d.date) <= new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10));
  const relancer = async (x, type) => { const mail = C.rows.find((c) => c.id === x.client_id)?.email ?? x.client_email; if (!mail) { toast("Pas d'e-mail pour ce " + V.client.toLowerCase(), "bad"); return; } setBusy(x.id); try { await email({ a: mail, sujet: (type === "facture" ? "Rappel : facture " : "Notre devis ") + x.numero, texte: "Bonjour " + (x.client_nom || "") + ",\n\n" + (type === "facture" ? "Sauf erreur de notre part, la facture " + x.numero + " de " + fmt.eur(ttc(x)) + " TTC, arrivée à échéance le " + fmt.date(x.echeance) + ", reste à régler. Merci de procéder au paiement dès que possible." : "Avez-vous pu regarder notre devis " + x.numero + " de " + fmt.eur(ttc(x)) + " TTC ? Je reste disponible pour en parler ou l'ajuster.") + "\n\nBien à vous,\n" + (ent.nom || "") }); if (type === "facture") await F.update(x.id, { relancee_le: auj }); else await D.update(x.id, { relance_le: auj }); toast("Relance envoyée"); } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); } };
  if (D.loading || F.loading) return html`<${ui.Loading}/>`;
  const somme = (xs) => xs.reduce((a, x) => a + ttc(x), 0);
  const aRelancer = [...retard.map((x) => ({ x, type: "facture", t: "Facture " + x.numero + " en retard depuis le " + fmt.date(x.echeance) })), ...vieux.filter((d) => !d.relance_le || d.relance_le < new Date(Date.now() - 5 * 864e5).toISOString().slice(0, 10)).map((x) => ({ x, type: "devis", t: "Devis " + x.numero + " envoyé le " + fmt.date(x.envoye_le ?? x.date) + ", sans réponse" }))].slice(0, 6);
  return html`<${ui.Page} titre="Tableau de bord" sous=${"Ton activité, " + new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} actions=${html`<${ui.Button} onClick=${() => go("devis")}>Nouveau devis</${ui.Button}>`}>
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <${ui.Stat} label="Encaissé ce mois" valeur=${fmt.eur(encaisse(mois))} icone="panier"/>
      <${ui.Stat} label="Reste à encaisser" valeur=${fmt.eur(somme(ouvertes))} sous=${retard.length ? retard.length + " facture" + (retard.length > 1 ? "s" : "") + " en retard" : "aucun retard"} icone="horloge"/>
      <${ui.Stat} label="Devis en attente" valeur=${fmt.eur(somme(envoyes))} sous=${envoyes.length + " envoyé" + (envoyes.length > 1 ? "s" : "")} icone="fichier"/>
      <${ui.Stat} label="Taux d'acceptation" valeur=${taux + " %"} sous=${fin.length + " devis tranchés"} icone="graphique"/>
    </div>
    ${demandes.length ? html`<${ui.Card} class="mt-4" titre=${"Demandes de devis reçues (" + demandes.length + ")"}><div class="divide-y divide-slate-100">${demandes.slice(0, 5).map((d) => html`<div class="flex flex-wrap items-center gap-3 py-2.5"><div class="flex-1 min-w-[200px]"><p class="font-medium">${d.client_nom}</p><p class="text-sm text-slate-500 truncate">${(d.lignes ?? []).map((l) => l.libelle).join(", ") || "Demande libre"} · ${fmt.date(d.date)}</p></div><${ui.Button} onClick=${() => go("devis", { ouvrir: d.id })}>Préparer le devis</${ui.Button}></div>`)}</div></${ui.Card}>` : null}
    <div class="mt-4 grid lg:grid-cols-3 gap-4">
      <${ui.Card} class="lg:col-span-2" titre="Encaissé ces 6 derniers mois"><${ui.Bar} donnees=${mois6}/></${ui.Card}>
      <${ui.Card} titre="Tes devis">${parStatut.length ? html`<${ui.Donut} donnees=${parStatut}/>` : html`<${ui.Empty} texte="Pas encore de devis."/>`}</${ui.Card}>
    </div>
    <${ui.Card} class="mt-4" titre="À relancer">${aRelancer.length ? html`<div class="divide-y divide-slate-100">${aRelancer.map(({ x, type, t }) => html`<div class="flex flex-wrap items-center gap-3 py-2.5"><div class="flex-1 min-w-[200px]"><p class="font-medium">${x.client_nom}</p><p class="text-sm text-slate-500">${t}</p></div><p class="font-semibold tabular-nums">${fmt.eur(ttc(x))}</p><${ui.Button} variant="secondary" icone="mail" disabled=${busy === x.id} onClick=${() => relancer(x, type)}>${busy === x.id ? "Envoi…" : "Relancer"}</${ui.Button}></div>`)}</div>` : html`<p class="py-3 text-sm text-emerald-700">Personne à relancer : tout est à jour.</p>`}</${ui.Card}>
  </${ui.Page}>`;
}
