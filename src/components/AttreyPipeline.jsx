import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useToast } from "./ui";

const MVJ_WORKSPACE = "4e9c20f1-84bb-4854-aca7-adcdc2bc8bfd";
const CATEGORIES = {
  offre: [
    ["proprietaire_location","Propriétaire qui veut louer","location_longue"],
    ["proprietaire_gestion","Demande de gestion","gestion"],
    ["vendeur","Bien à vendre","vente"],
    ["logement_disponible","Logement disponible","hebergement"],
    ["partenaire","Partenaire / catalogue de biens","partenariat"],
  ],
  demande: [
    ["voyageur","Voyageur / court séjour","hebergement"],
    ["locataire","Locataire / moyenne ou longue durée","location_longue"],
    ["acheteur","Acheteur immobilier","achat"],
    ["entreprise_mobilite","Entreprise / mobilité professionnelle","hebergement"],
    ["investisseur","Investisseur / foncière","investissement"],
  ],
};
const STATES = [
  ["nouveau","Nouveau"],["a_verifier","À vérifier"],["qualifie","Qualifié"],
  ["message_prepare","Message prêt"],["en_discussion","En discussion"],
  ["rendez_vous","Rendez-vous"],["proposition","Proposition"],
  ["converti","Converti"],["ecarte","Écarté"]
];
const matchText = (r) => {
  const city = r.city || "Localisation à préciser";
  const budget = r.budget_max != null ? ` · Budget max ${Number(r.budget_max).toLocaleString("fr-FR")} ${r.currency || "EUR"}${r.budget_period === "nuit" ? "/nuit" : r.budget_period === "mois" ? "/mois" : ""}` : "";
  return city + budget;
};


const cleanPlace = (value) => (value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const compatibleSegments = (offer, request) => {
  if (offer.segment === "vendeur") return ["acheteur", "investisseur"].includes(request.segment);
  if (offer.segment === "logement_disponible") return ["voyageur", "locataire", "entreprise_mobilite"].includes(request.segment);
  return false;
};
const potentialMatch = (a, b) => {
  const offer = a.direction === "offre" ? a : b;
  const request = a.direction === "demande" ? a : b;
  if (offer.id === request.id || offer.direction !== "offre" || request.direction !== "demande") return false;
  if (!compatibleSegments(offer, request)) return false;
  // Écarter les localisations floues et éviter de confondre deux villes distinctes.
  if (!cleanPlace(offer.city) || cleanPlace(offer.city) !== cleanPlace(request.city)) return false;
  if (["ecarte", "converti"].includes(offer.status) || ["ecarte", "converti"].includes(request.status)) return false;
  if (offer.budget_max != null && request.budget_max != null
    && offer.budget_period === request.budget_period && offer.currency === request.currency
    && Number(offer.budget_max) > Number(request.budget_max)) return false;
  if (offer.date_start && request.date_end && offer.date_start > request.date_end) return false;
  if (offer.date_end && request.date_start && offer.date_end < request.date_start) return false;
  return true;
};

/**
 * Première brique CRM dédiée à Attrey : deux circuits indépendants,
 * qualification humaine et traçabilité des sources.
 * La découverte automatique de leads et leur rapprochement restent à brancher.
 */
export default function AttreyPipeline({ workspaceId }) {
  const toast = useToast();
  const [direction, setDirection] = useState("offre");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({segment:"proprietaire_location",title:"",city:"",description:"",source_url:"",source_name:"",budget_max:"",budget_period:"total",country_origin:""});
  const active = workspaceId === MVJ_WORKSPACE;

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    const { data, error } = await supabase.from("attrey_leads").select("*")
      .eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(250);
    if (error) toast(error.message, "bad");
    setItems(data || []);
    setLoading(false);
  }, [workspaceId, active, toast]);

  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => items.filter((x) => x.direction === direction), [items,direction]);
  const suggestions = useMemo(() => {
    const lookup = new Map();
    for (const item of items) {
      const candidates = items.filter((other) => potentialMatch(item, other)).slice(0, 3);
      if (candidates.length) lookup.set(item.id, candidates);
    }
    return lookup;
  }, [items]);
  if (!active) return null;

  const selectDirection = (next) => {
    setDirection(next);
    setShowForm(false);
    setForm({segment:CATEGORIES[next][0][0],title:"",city:"",description:"",source_url:"",source_name:"",budget_max:"",budget_period:"total",country_origin:""});
  };
  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast("Indique le besoin exprimé.", "bad");
    if (!/^https:\/\//i.test(form.source_url.trim())) return toast("Ajoute le lien HTTPS exact de la source avant d'enregistrer.", "bad");
    const option = CATEGORIES[direction].find(([s]) => s === form.segment);
    setSaving(true);
    const payload = {
      workspace_id:workspaceId, direction, segment:form.segment, intent:option[2],
      title:form.title.trim(), description:form.description.trim() || null,
      city:form.city.trim() || null, country_origin:form.country_origin.trim() || null,
      source_url:form.source_url.trim(), source_name:form.source_name.trim() || null,
      budget_max:form.budget_max ? Number(form.budget_max) : null, budget_period:form.budget_max ? form.budget_period : null,
      evidence_level:"a_verifier",contact_route:"a_verifier",status:"a_verifier"
    };
    const { error } = await supabase.from("attrey_leads").insert(payload);
    setSaving(false);
    if (error) {
      toast(error.code === "23505" ? "Cette source est déjà enregistrée dans Attrey." : error.message, "bad");
      return;
    }
    toast("Opportunité ajoutée à qualifier", "good");
    setShowForm(false);
    setForm({segment:CATEGORIES[direction][0][0],title:"",city:"",description:"",source_url:"",source_name:"",budget_max:"",budget_period:"total",country_origin:""});
    load();
  };
  const changeStatus = async (item, status) => {
    const { error } = await supabase.from("attrey_leads").update({status,updated_at:new Date().toISOString()})
      .eq("workspace_id",workspaceId).eq("id",item.id);
    if (error) return toast(error.message,"bad");
    setItems((current) => current.map((x) => x.id === item.id ? {...x,status} : x));
  };

  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div><p className="text-[11px] uppercase tracking-widest text-ink-faint font-bold">Attrey Real Estate</p>
          <h2 className="text-xl font-bold mt-1">Acquisition immobilière</h2>
          <p className="text-xs text-ink-soft mt-1">Deux flux distincts : propriétaires et biens d'un côté, voyageurs et acheteurs de l'autre.</p>
        </div>
        <button type="button" onClick={() => setShowForm((s) => !s)} className="rounded-xl bg-ink text-white text-sm font-semibold px-4 py-2.5">{showForm ? "Fermer" : "+ Ajouter une opportunité"}</button>
      </div>
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Type de prospection Attrey">
        {[
          ["offre","Biens & propriétaires"],
          ["demande","Clients & acheteurs"]
        ].map(([key,label]) => <button type="button" key={key} role="tab" aria-selected={direction===key} onClick={() => selectDirection(key)}
          className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold ${direction === key ? "border-ink bg-paper" : "border-line bg-white text-ink-soft"}`}>
          <span className="block">{label}</span><span className="block text-xs font-normal mt-1">{items.filter((x) => x.direction === key).length} opportunité(s)</span>
        </button>)}
      </div>
      {showForm && <form onSubmit={save} className="rounded-xl bg-paper p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <label className="sm:col-span-2 font-semibold">Type de besoin
          <select value={form.segment} onChange={(e)=>setForm({...form,segment:e.target.value})} className="mt-1 w-full border border-line rounded-lg px-3 py-2 bg-white font-normal">
            {CATEGORIES[direction].map(([id,label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="sm:col-span-2 font-semibold">Demande constatée *
          <input required maxLength={240} value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} placeholder="Ex. Recherche appartement meublé à Paris pour 3 mois" className="mt-1 w-full border border-line rounded-lg px-3 py-2 bg-white font-normal"/>
        </label>
        <label className="font-semibold">Ville
          <input value={form.city} onChange={(e)=>setForm({...form,city:e.target.value})} placeholder="Paris, Nice, Cannes…" className="mt-1 w-full border border-line rounded-lg px-3 py-2 bg-white font-normal"/>
        </label>
        <label className="font-semibold">Origine géographique (si publique)
          <input value={form.country_origin} onChange={(e)=>setForm({...form,country_origin:e.target.value})} placeholder="États-Unis…" className="mt-1 w-full border border-line rounded-lg px-3 py-2 bg-white font-normal"/>
        </label>
        <label className="font-semibold">Budget maximum (si indiqué)
          <input type="number" min="0" value={form.budget_max} onChange={(e)=>setForm({...form,budget_max:e.target.value})} placeholder="Ex. 3000" className="mt-1 w-full border border-line rounded-lg px-3 py-2 bg-white font-normal"/>
        </label>
        <label className="font-semibold">Période du budget
          <select value={form.budget_period} onChange={(e)=>setForm({...form,budget_period:e.target.value})} className="mt-1 w-full border border-line rounded-lg px-3 py-2 bg-white font-normal">
            <option value="total">Total</option><option value="mois">Par mois</option><option value="nuit">Par nuit</option><option value="achat">Budget d'achat</option>
          </select>
        </label>
        <label className="font-semibold">Plateforme (si connue)
          <input value={form.source_name} onChange={(e)=>setForm({...form,source_name:e.target.value})} placeholder="Reddit, forum…" className="mt-1 w-full border border-line rounded-lg px-3 py-2 bg-white font-normal"/>
        </label>
        <label className="sm:col-span-2 font-semibold">Lien de la demande publique *
          <input type="url" required value={form.source_url} onChange={(e)=>setForm({...form,source_url:e.target.value})} placeholder="https://…" className="mt-1 w-full border border-line rounded-lg px-3 py-2 bg-white font-normal"/>
        </label>
        <label className="sm:col-span-2 font-semibold">Informations utiles (sans coordonnées privées)
          <textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} rows={3} className="mt-1 w-full border border-line rounded-lg px-3 py-2 bg-white font-normal"/>
        </label>
        <button type="submit" disabled={saving} className="sm:col-span-2 rounded-xl bg-ink text-white py-2.5 font-semibold disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer pour vérification"}</button>
      </form>}
      <div className="space-y-2">
        {loading ? <p className="text-xs text-ink-soft py-6">Chargement des opportunités…</p>
          : !shown.length ? <p className="text-sm text-ink-soft py-6 text-center">Aucune opportunité dans ce flux pour l'instant. Les recherches automatiques ne sont pas encore connectées à cette vue.</p>
          : shown.map((item) => <div key={item.id} className="border border-line rounded-xl p-3 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[190px]"><p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-ink-soft mt-1">{matchText(item)} · {CATEGORIES[direction].find(([v])=>v===item.segment)?.[1] || item.segment}</p>
              {item.source_url && <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Vérifier la source</a>}
              {!!suggestions.get(item.id)?.length && <div className="mt-2 rounded-lg bg-paper p-2">
                <p className="text-xs font-semibold">Pistes de rapprochement à vérifier ({suggestions.get(item.id).length})</p>
                <ul className="mt-1 space-y-1">
                  {suggestions.get(item.id).map((other) => <li key={other.id} className="text-xs text-ink-soft">
                    {other.title} · {other.city}
                    {other.source_url && <a href={other.source_url} target="_blank" rel="noopener noreferrer" className="ml-2 underline text-accent">Source</a>}
                  </li>)}
                </ul>
                <p className="mt-1 text-[11px] text-ink-faint">Compatibilité indicative par ville, catégorie et critères renseignés. Disponibilité, mandat, prix et dates à confirmer.</p>
              </div>}
            </div>
            <select aria-label="Statut commercial" value={item.status} onChange={(e)=>changeStatus(item,e.target.value)} className="rounded-lg border border-line bg-white px-2 py-2 text-xs">
              {STATES.map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </div>)}
      </div>
      <p className="text-[11px] text-ink-faint">Informations issues de sources publiques vérifiables uniquement. Aucun démarchage automatique, aucune annonce de disponibilité ou autorisation de transaction présumée. MVJ reste l'entité de facturation.</p>
    </section>
  );
}
