import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useToast } from "./ui";

const MVJ_WORKSPACE = "4e9c20f1-84bb-4854-aca7-adcdc2bc8bfd";
const SEGMENTS = [
  ["proprietaire_mise_en_location", "Souhaite mettre son logement en location"],
  ["demande_gestion", "Recherche une conciergerie"],
  ["airbnb_existant", "Location courte durée déjà active"],
  ["partenaire_prescripteur", "Partenaire immobilier"],
  ["sci_proprietaire", "SCI propriétaire de logements"],
];
// Par défaut : le type qui correspond au signal (une SCI du fichier des impôts n'a pas « annoncé » vouloir louer)
const parDefaut = (o) => o.outreach_segment || (o.kind === "patrimoine" || o.kind === "creation" ? "sci_proprietaire" : "proprietaire_mise_en_location");

/**
 * Prépare un brouillon commercial pour les opportunités sourcées de l'espace MVJ.
 * Aucun message n'est envoyé depuis cette interface.
 */
export default function AttreyOutreach({ opportunity, workspaceId, onChange }) {
  const toast = useToast();
  const [segment, setSegment] = useState(parDefaut(opportunity));
  const [need, setNeed] = useState("");
  const [draft, setDraft] = useState(opportunity.outreach_draft || "");
  const [status, setStatus] = useState(opportunity.outreach_review_status || "non_prepare");
  const [busy, setBusy] = useState(false);
  const eligible = workspaceId === MVJ_WORKSPACE;
  const source = opportunity.url || opportunity.listing_url;
  const canPrepare = !!source && !!opportunity.city;

  useEffect(() => {
    setSegment(parDefaut(opportunity));
    setDraft(opportunity.outreach_draft || "");
    setStatus(opportunity.outreach_review_status || "non_prepare");
    setNeed("");
  }, [opportunity.id]);

  if (!eligible) return null;

  const prepare = async () => {
    if (!canPrepare) return toast("Vérifie d'abord la source et la ville.", "bad");
    if (segment === "demande_gestion" && !need.trim()) return toast("Précise le besoin exprimé dans l'annonce.", "bad");
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("attrey_prepare_outreach", {
        p_opportunity_id: opportunity.id,
        p_segment: segment,
        p_verified_need: segment === "demande_gestion" ? need.trim() : null,
      });
      if (error) throw error;
      setDraft(data.draft);
      setStatus("a_valider");
      onChange({ ...opportunity, outreach_segment: segment, outreach_draft: data.draft, outreach_review_status: "a_valider" });
      toast("Brouillon Attrey enregistré — aucun message envoyé", "good");
    } catch (e) {
      toast(e.message || "Impossible de préparer le brouillon", "bad");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      toast("Brouillon copié. Vérifie le canal et le destinataire avant tout contact.", "good");
    } catch {
      toast("Copie non disponible sur ce navigateur.", "bad");
    }
  };

  const photos = Array.isArray(opportunity.property_photo_urls) ? opportunity.property_photo_urls.filter((u) => /^https:\/\//i.test(u)) : [];
  return (
    <section className="mt-6 rounded-2xl border border-line bg-[#FCFAF6] p-4 space-y-3" aria-label="Attrey Real Estate — préparation du message">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-[15px]">Attrey Real Estate</h3>
        <span className="text-[11px] font-medium rounded-full px-2.5 py-1 bg-white border border-line">{status === "a_valider" ? "À valider" : "Prospection"}</span>
      </div>
      <p className="text-[12px] text-ink-soft">Messages commerciaux préparés pour MVJ. Aucune prise de contact automatique.</p>
      {(opportunity.contact_first_name || opportunity.contact_last_name || opportunity.contact_business_name) && (
        <p className="text-sm"><b>Contact public professionnel : </b>{[opportunity.contact_first_name, opportunity.contact_last_name].filter(Boolean).join(" ") || opportunity.contact_business_name}</p>
      )}
      {(opportunity.contact_professional_email || opportunity.contact_professional_phone) && (
        <div className="text-xs text-ink-soft space-y-1">
          {opportunity.contact_professional_email && <p>E-mail professionnel : {opportunity.contact_professional_email}</p>}
          {opportunity.contact_professional_phone && <p>Téléphone professionnel : {opportunity.contact_professional_phone}</p>}
        </div>
      )}
      {photos.length > 0 && <div><p className="text-xs text-ink-soft mb-1">Photos du bien (liens sources autorisés)</p><div className="flex gap-2 flex-wrap">{photos.slice(0,4).map((u,i) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="text-xs underline text-accent">Photo {i+1}</a>)}</div></div>}
      <label className="block text-xs font-semibold">Type de prospect
        <select className="mt-1 block w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-normal" value={segment} onChange={(e) => setSegment(e.target.value)}>
          {SEGMENTS.map(([v,label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </label>
      {segment === "demande_gestion" && <label className="block text-xs font-semibold">Besoin réellement exprimé
        <input value={need} maxLength={220} onChange={(e) => setNeed(e.target.value)} placeholder="Ex. ménage entre deux séjours" className="mt-1 w-full border border-line rounded-xl px-3 py-2 text-sm font-normal bg-white"/>
      </label>}
      {!canPrepare && <p className="text-xs text-bad">L'opportunité doit avoir une URL source et une ville vérifiée.</p>}
      <button type="button" onClick={prepare} disabled={busy || !canPrepare} className="w-full rounded-xl px-4 py-2.5 bg-ink text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90">
        {busy ? "Préparation…" : "Préparer le message Attrey"}
      </button>
      {draft && <div className="space-y-2"><label className="block text-xs font-semibold">Message prêt à relire
        <textarea readOnly rows={9} value={draft} className="mt-1 w-full rounded-xl border border-line bg-white p-3 text-sm resize-y font-normal"/>
      </label>
      <button type="button" onClick={copy} className="w-full rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold hover:bg-paper">Copier le brouillon</button>
      <p className="text-[11px] text-ink-faint">Avant d'utiliser ce texte, vérifie les conditions de contact de la plateforme et l'identité du destinataire. Aucune messagerie n'est sollicitée ici.</p>
      </div>}
    </section>
  );
}
