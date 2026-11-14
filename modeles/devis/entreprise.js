function Ecran() {
  const E = useCollection("entreprise");
  const [f, setF] = useState(null);
  useEffect(() => { if (!E.loading && !f) setF({ nom: "", adresse: "", siret: "", tva_intra: "", email: "", telephone: "", iban: "", bic: "", tva_defaut: 20, delai: 30, mentions: "", ...(E.rows[0] ?? {}) }); }, [E.loading]);
  const enregistrer = async () => { const { id, created_at, updated_at, ...d } = f; if (id) await E.update(id, d); else { const r = await E.add(d); setF({ ...f, id: r?.id }); } toast("Enregistré : tes prochains devis et factures l'utilisent"); };
  if (E.loading || !f) return html`<${ui.Loading}/>`;
  const manque = ["nom", "adresse", "siret"].filter((k) => !f[k]);
  return html`<${ui.Page} titre="Mon entreprise" sous="Ce qui apparaît en haut de tes devis et factures." actions=${html`<${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
    ${manque.length ? html`<div class="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Une facture doit indiquer ton nom, ton adresse et ton SIRET : complète ${manque.length > 1 ? "ces champs" : "ce champ"} avant d'envoyer.</div>` : null}
    <div class="grid lg:grid-cols-2 gap-4">
      <${ui.Card} titre="Identité"><div class="space-y-3"><${ui.Input} label="Nom de l'entreprise" value=${f.nom} onInput=${(v) => setF({ ...f, nom: v })}/><${ui.Input} label="Adresse" value=${f.adresse} onInput=${(v) => setF({ ...f, adresse: v })}/><div class="grid sm:grid-cols-2 gap-3"><${ui.Input} label="SIRET" value=${f.siret} onInput=${(v) => setF({ ...f, siret: v })}/><${ui.Input} label="N° de TVA intracommunautaire" value=${f.tva_intra} onInput=${(v) => setF({ ...f, tva_intra: v })}/><${ui.Input} label="E-mail" type="email" value=${f.email} onInput=${(v) => setF({ ...f, email: v })}/><${ui.Input} label="Téléphone" value=${f.telephone} onInput=${(v) => setF({ ...f, telephone: v })}/></div></div></${ui.Card}>
      <${ui.Card} titre="Paiement et facturation"><div class="space-y-3"><div class="grid sm:grid-cols-2 gap-3"><${ui.Input} label="IBAN" value=${f.iban} onInput=${(v) => setF({ ...f, iban: v })}/><${ui.Input} label="BIC" value=${f.bic} onInput=${(v) => setF({ ...f, bic: v })}/><${ui.Select} label="TVA par défaut" value=${String(f.tva_defaut)} onChange=${(v) => setF({ ...f, tva_defaut: Number(v) })} options=${[["20", "20 %"], ["10", "10 %"], ["5.5", "5,5 %"], ["0", "Non applicable (micro-entreprise)"]]}/><${ui.Select} label="Délai de paiement" value=${String(f.delai)} onChange=${(v) => setF({ ...f, delai: Number(v) })} options=${[["0", "À réception"], ["15", "15 jours"], ["30", "30 jours"], ["45", "45 jours"]]}/></div><${ui.Textarea} label="Mentions en bas de page (assurance, RCS…)" value=${f.mentions} onInput=${(v) => setF({ ...f, mentions: v })} rows="2"/></div></${ui.Card}>
    </div>
  </${ui.Page}>`;
}
