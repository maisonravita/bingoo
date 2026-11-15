function Ecran() {
  const P = useCollection("profil");
  const [f, setF] = useState(null);
  useEffect(() => { if (!P.loading && !f) setF({ a_propos: "", ton: V.tons?.[0] ?? "", langue: "français", exemples: "", ...(P.rows[0] ?? {}) }); }, [P.loading]);
  if (P.loading || !f) return html`<${ui.Loading}/>`;
  const enregistrer = async () => { const { id, created_at, updated_at, ...d } = f; if (id) await P.update(id, d); else { const r = await P.add(d); setF({ ...f, id: r?.id }); } toast("Enregistré : l'IA écrira comme vous"); };
  return html`<${ui.Page} titre="Mon style" sous="Ce que l'IA sait de vous pour écrire avec votre voix, pas une voix de robot." actions=${html`<${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
    <div class="grid lg:grid-cols-2 gap-4">
      <${ui.Card} titre="À propos de vous"><div class="space-y-3"><${ui.Textarea} label="Qui vous êtes, ce que vous faites, pour qui" value=${f.a_propos} onInput=${(v) => setF({ ...f, a_propos: v })} rows="5" placeholder="Ex. : consultante RH depuis 8 ans, j'accompagne les PME lyonnaises…"/><div class="grid sm:grid-cols-2 gap-3"><${ui.Select} label="Votre par défaut" value=${f.ton} onChange=${(v) => setF({ ...f, ton: v })} options=${(V.tons ?? []).map((t) => [t, t])}/><${ui.Select} label="Langue" value=${f.langue} onChange=${(v) => setF({ ...f, langue: v })} options=${[["français", "Français"], ["anglais", "Anglais"], ["espagnol", "Espagnol"]]}/></div></div></${ui.Card}>
      <${ui.Card} titre="Un exemple de votre écriture"><${ui.Textarea} value=${f.exemples} onInput=${(v) => setF({ ...f, exemples: v })} rows="9" placeholder="Collez un texte que vous avez écrit et que vous aimez : l'IA s'en inspire pour votre style (sans le recopier)."/></${ui.Card}>
    </div>
  </${ui.Page}>`;
}
