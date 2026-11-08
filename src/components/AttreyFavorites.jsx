import {useMemo,useState} from "react";
export default function AttreyFavorites({items=[],onRemove,loading=false}){
  const [query,setQuery]=useState("");
  const searched=useMemo(()=>items.filter(x=>
    [x.title,x.source_url,x.kind].join(" ").toLowerCase().includes(query.trim().toLowerCase())),[items,query]);
  return <section id="attrey-favorites" className="rounded-2xl border border-line bg-white p-4 space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 className="text-sm font-semibold">★ Mes favoris</h3>
        <p className="mt-1 text-xs text-ink-soft">Retrouve ici les annonces Airbnb et les pistes sauvegardées. Un favori n'est pas automatiquement un prospect qualifié.</p>
      </div>
      <span className="rounded-full border border-line px-3 py-1 text-xs text-ink-soft">{items.length} favori(s)</span>
    </div>
    {items.length>0&&<label className="block text-xs">Rechercher parmi les favoris
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Logement, source, lien…"
        className="mt-1 block w-full rounded-xl border border-line p-2.5 text-sm" />
    </label>}
    {loading&&<p className="text-xs text-ink-soft">Chargement des favoris…</p>}
    {!loading&&!items.length&&<p className="text-xs text-ink-soft">Pas encore de favoris. Clique sur « ☆ Ajouter aux favoris » depuis une annonce ou une piste.</p>}
    <div className="space-y-2 max-h-[350px] overflow-y-auto">
      {searched.map(x=><article key={x.id} className="rounded-xl border border-line p-3 flex gap-3 justify-between items-start">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold break-words">{x.title||"Lien conservé"}</p>
          <p className="text-[11px] text-ink-soft">{x.kind==="airbnb"?"Airbnb · annonce ou audit":"Piste publique"} · Ajouté le {new Date(x.created_at).toLocaleDateString("fr-FR")}</p>
          <a href={x.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline break-all">Consulter la source</a>
        </div>
        <button type="button" onClick={()=>onRemove(x.source_url)}
          className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs hover:bg-slate-50"
          aria-label={`Retirer ${x.title||"ce lien"} des favoris`}>★ Retirer</button>
      </article>)}
      {!loading&&items.length>0&&searched.length===0&&<p className="text-xs text-ink-soft">Aucun favori ne correspond à cette recherche.</p>}
    </div>
  </section>;
}
