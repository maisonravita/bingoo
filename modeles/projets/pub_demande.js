// Modèle Projets — page publique : un client ou un collègue envoie une demande, sans compte ; elle arrive dans « Demandes ».
function Ecran(props) {
  const [f, setF] = useState({ titre: "", description: "", nom: "", email: "", priorite: "normale" }), [ok, setOk] = useState(false), [busy, setBusy] = useState(false);
  const envoyer = async (e) => {
    e.preventDefault();
    if (!f.titre.trim() || !f.nom.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { toast("Indiquez l'objet de la demande, votre nom et une adresse e-mail valide", "bad"); return; }
    setBusy(true);
    try {
      await db.add("demandes", { titre: f.titre.trim().slice(0, 120), description: f.description.trim(), nom: f.nom.trim(), email: f.email.trim(), priorite: f.priorite, statut: "nouvelle" }, { confirmation: { sujet: "Nous avons bien reçu votre demande", texte: "Bonjour " + f.nom.trim().split(" ")[0] + ",\n\nVotre demande « " + f.titre.trim() + " » est bien arrivée. Nous la regardons et revenons vers vous dès qu'elle est prise en charge.\n\nÀ bientôt !" } });
      setOk(true);
    } catch (x) { toast(x.message, "bad"); } finally { setBusy(false); }
  };
  if (ok) return html`<div class="max-w-lg mx-auto text-center py-16 px-4"><span class="mx-auto grid w-14 h-14 place-items-center rounded-full bg-emerald-100 text-emerald-700 text-2xl">✓</span><h1 class="mt-4 text-2xl font-bold">Demande envoyée</h1><p class="mt-2 text-slate-500">Merci ! Un e-mail de confirmation vient de vous être envoyé. Vous serez prévenu dès que votre demande sera prise en charge.</p><button class="mt-6 text-sm text-[var(--c)] hover:underline" onClick=${() => { setF({ titre: "", description: "", nom: f.nom, email: f.email, priorite: "normale" }); setOk(false); }}>Envoyer une autre demande</button></div>`;
  return html`<div class="max-w-xl mx-auto py-10 px-4">
    <h1 class="text-3xl font-bold tracking-tight">Envoyer une demande</h1>
    <p class="mt-2 text-slate-500">${props.espace ? "L'équipe " + props.espace + " la reçoit" : "L'équipe la reçoit"} directement dans ses projets. Décrivez votre besoin en quelques lignes.</p>
    <form onSubmit=${envoyer} class="mt-8 space-y-4">
      <${ui.Input} label="Objet de la demande" required value=${f.titre} placeholder="Ex. Mettre à jour la page tarifs" onInput=${(v) => setF({ ...f, titre: v })}/>
      <${ui.Textarea} label="Détails" rows=${5} value=${f.description} placeholder="Le contexte, ce que vous attendez, une date si elle compte." onInput=${(v) => setF({ ...f, description: v })}/>
      <div><p class="text-sm font-medium text-slate-700 mb-1.5">Priorité</p><div class="flex gap-2">${[["normale", "Normale"], ["urgente", "Urgente"]].map(([v, l]) => html`<button type="button" onClick=${() => setF({ ...f, priorite: v })} class=${"rounded-full px-4 py-1.5 text-sm font-medium border " + (f.priorite === v ? "bg-[var(--c)] text-white border-[var(--c)]" : "bg-white border-slate-200 text-slate-600")}>${l}</button>`)}</div></div>
      <div class="grid sm:grid-cols-2 gap-3"><${ui.Input} label="Votre nom" required value=${f.nom} onInput=${(v) => setF({ ...f, nom: v })}/><${ui.Input} label="Votre e-mail" type="email" required value=${f.email} onInput=${(v) => setF({ ...f, email: v })}/></div>
      <${ui.Button} type="submit" disabled=${busy}>${busy ? "Envoi en cours…" : "Envoyer la demande"}</${ui.Button}>
    </form>
  </div>`;
}
