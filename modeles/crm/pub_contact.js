function Ecran(props) {
  const [f, setF] = useState({ nom: "", email: "", telephone: "", entreprise: "", message: "" }), [ok, setOk] = useState(false), [busy, setBusy] = useState(false);
  const envoyer = async (e) => { e.preventDefault(); if (!f.nom || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) || !f.message) { toast("Indiquez votre nom, une adresse e-mail valide et votre message", "bad"); return; } setBusy(true); try {
    await db.add("contacts", { nom: f.nom, email: f.email, telephone: f.telephone, entreprise: f.entreprise, statut: "prospect", source: "Formulaire en ligne", notes: f.message, derniere_action: new Date().toISOString().slice(0, 10) }, { confirmation: { sujet: "Nous avons bien reçu votre message", texte: "Bonjour " + f.nom.split(" ")[0] + ",\n\nMerci pour votre message, nous l'avons bien reçu.\nNous revenons vers vous très vite.\n\nÀ bientôt !" } });
    setOk(true); } catch (x) { toast(x.message, "bad"); } finally { setBusy(false); } };
  if (ok) return html`<div class="max-w-lg mx-auto text-center py-16 px-4"><span class="mx-auto grid w-14 h-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 text-2xl">✓</span><h1 class="mt-4 text-2xl font-bold">Message envoyé</h1><p class="mt-2 text-slate-500">Merci ! Un e-mail de confirmation vient de vous être envoyé, et nous revenons vers vous très vite.</p></div>`;
  return html`<div class="max-w-xl mx-auto py-10 px-4">
    <h1 class="text-3xl font-bold tracking-tight">Contactez-nous</h1><p class="mt-2 text-slate-500">${props.espace ? props.espace + " vous répond" : "Nous vous répondons"} rapidement. Laissez vos coordonnées et quelques mots sur votre besoin.</p>
    <form onSubmit=${envoyer} class="mt-8 space-y-4">
      <div class="grid sm:grid-cols-2 gap-3"><${ui.Input} label="Nom" required value=${f.nom} onInput=${(v) => setF({ ...f, nom: v })}/><${ui.Input} label="Entreprise (facultatif)" value=${f.entreprise} onInput=${(v) => setF({ ...f, entreprise: v })}/><${ui.Input} label="E-mail" type="email" required value=${f.email} onInput=${(v) => setF({ ...f, email: v })}/><${ui.Input} label="Téléphone (facultatif)" value=${f.telephone} onInput=${(v) => setF({ ...f, telephone: v })}/></div>
      <${ui.Textarea} label="Votre message" rows=${5} value=${f.message} onInput=${(v) => setF({ ...f, message: v })}/>
      <${ui.Button} type="submit" disabled=${busy}>${busy ? "Envoi en cours…" : "Envoyer"}</${ui.Button}>
    </form>
  </div>`;
}
