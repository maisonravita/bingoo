function Ecran(props) {
  const F = useCollection("formulaires");
  const [choix, setChoix] = useState(null);
  const ouverts = F.rows.filter((f) => f.ouvert !== false);
  const f = choix ?? (ouverts.length === 1 ? ouverts[0] : null);
  const envoyer = async (liste) => { const mail = liste.find((x) => x.type === "email" && x.reponse)?.reponse; await db.add("reponses", { formulaire_id: f.id, formulaire_titre: f.titre, reponses: liste, email: mail ?? "" }, mail ? { confirmation: { sujet: "Merci pour vos réponses", texte: "Bonjour,\n\nNous avons bien reçu vos réponses au formulaire « " + f.titre + " ».\n\nMerci !" } } : {}); };
  if (F.loading) return html`<${ui.Loading}/>`;
  if (f) return html`<div class="min-h-[70vh] px-4 py-10"><div class="mx-auto max-w-2xl">${ouverts.length > 1 && html`<button onClick=${() => setChoix(null)} class="mb-6 text-sm font-medium text-[var(--c)]">← Tous les formulaires</button>`}<p class="text-4xl">${f.emoji || "📝"}</p><${ui.Questionnaire} questions=${qsDe(f)} titre=${f.titre} intro=${f.intro} merci=${f.merci || "Merci, vos réponses sont bien envoyées."} onTerminer=${envoyer}/></div></div>`;
  return html`<div class="max-w-3xl mx-auto px-4 py-12"><h1 class="text-3xl font-bold tracking-tight">${props?.espace ? props.espace : "Formulaires"}</h1><p class="mt-2 text-slate-500">Choisissez le formulaire à remplir.</p>
    ${ouverts.length ? html`<div class="mt-8 grid gap-3 sm:grid-cols-2">${ouverts.map((x) => html`<button onClick=${() => setChoix(x)} class="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-[var(--c)] hover:shadow-md"><span class="text-3xl">${x.emoji || "📝"}</span><span class="min-w-0"><span class="block font-semibold">${x.titre}</span><span class="block text-sm text-slate-500 line-clamp-2">${x.intro}</span></span></button>`)}</div>` : html`<p class="mt-8 text-slate-500">Aucun formulaire n'est ouvert pour le moment.</p>`}</div>`;
}
