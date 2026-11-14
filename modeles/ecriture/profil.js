function Ecran() {
  const P = useCollection("profil");
  const [f, setF] = useState(null);
  useEffect(() => { if (!P.loading && !f) setF({ a_propos: "", ton: V.tons?.[0] ?? "", langue: "français", exemples: "", ...(P.rows[0] ?? {}) }); }, [P.loading]);
  if (P.loading || !f) return html`<${ui.Loading}/>`;
  const enregistrer = async () => { const { id, created_at, updated_at, ...d } = f; if (id) await P.update(id, d); else { const r = await P.add(d); setF({ ...f, id: r?.id }); } toast("Enregistré : l'IA écrira comme toi"); };
  return html`<${ui.Page} titre="Mon style" sous="Ce que l'IA sait de toi pour écrire avec ta voix, pas une voix de robot." actions=${html`<${ui.Button} onClick=${enregistrer}>Enregistrer</${ui.Button}>`}>
    <div class="grid lg:grid-cols-2 gap-4">
      <${ui.Card} titre="À propos de toi"><div class="space-y-3"><${ui.Textarea} label="Qui tu es, ce que tu fais, pour qui" value=${f.a_propos} onInput=${(v) => setF({ ...f, a_propos: v })} rows="5" placeholder="Ex. : consultante RH depuis 8 ans, j'accompagne les PME lyonnaises…"/><div class="grid sm:grid-cols-2 gap-3"><${ui.Select} label="Ton par défaut" value=${f.ton} onChange=${(v) => setF({ ...f, ton: v })} options=${(V.tons ?? []).map((t) => [t, t])}/><${ui.Select} label="Langue" value=${f.langue} onChange=${(v) => setF({ ...f, langue: v })} options=${[["français", "Français"], ["anglais", "Anglais"], ["espagnol", "Espagnol"]]}/></div></div></${ui.Card}>
      <${ui.Card} titre="Un exemple de ton écriture"><${ui.Textarea} value=${f.exemples} onInput=${(v) => setF({ ...f, exemples: v })} rows="9" placeholder="Colle un texte que tu as écrit et que tu aimes : l'IA s'en inspire pour ton style (sans le recopier)."/></${ui.Card}>
    </div>
  </${ui.Page}>`;
}
