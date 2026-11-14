function Ecran() {
  const D = useCollection("documents"), P = useCollection("profil");
  const types = V.types ?? [];
  const [t, setT] = useState(params?.type ?? types[0]?.id), [f, setF] = useState({}), [ton, setTon] = useState(null), [res, setRes] = useState(""), [busy, setBusy] = useState(""), [titre, setTitre] = useState(""), [id, setId] = useState(null);
  const type = types.find((x) => x.id === t) ?? types[0];
  const prof = P.rows[0] ?? {};
  const tonChoisi = ton ?? prof.ton ?? V.tons?.[0] ?? "Professionnel";
  const manque = (type?.champs ?? []).filter((c) => c.requis !== false && !String(f[c.nom] ?? "").trim()).map((c) => c.label);
  const consigne = () => type.consigne + "\n\nInformations données par l'utilisateur :\n" + (type.champs ?? []).map((c) => "- " + c.label + " : " + (f[c.nom] || "(non précisé)")).join("\n") + "\n\nTon : " + tonChoisi + "." + (prof.a_propos ? "\nÀ propos de l'auteur (à utiliser si utile) : " + prof.a_propos : "") + (prof.exemples ? "\nImite le style de cet exemple écrit par l'auteur, sans le recopier :\n" + prof.exemples : "") + "\nÉcris en " + (prof.langue || "français") + ". Rends uniquement le texte final, prêt à copier, sans commentaire ni titre en trop.";
  const generer = async () => { if (manque.length) { toast("À remplir : " + manque.join(", "), "bad"); return; } setBusy("gen"); try { const r = await ia(consigne()); setRes(String(r ?? "")); setId(null); setTitre((type.champs?.[0] && String(f[type.champs[0].nom] ?? "").slice(0, 60)) || type.nom); } catch (e) { toast(e.message, "bad"); } finally { setBusy(""); } };
  const retoucher = async (q) => { setBusy(q); try { const r = await ia(q + " Garde le sens, rends uniquement le nouveau texte.", { texte: res }); setRes(String(r ?? res)); } catch (e) { toast(e.message, "bad"); } finally { setBusy(""); } };
  const mots = (s) => (String(s).trim().match(/\S+/g) ?? []).length;
  const enregistrer = async () => { const d = { titre: titre || type.nom, type: type.id, entrees: f, contenu: res, ton: tonChoisi, mots: mots(res), favori: false }; if (id) await D.update(id, d); else { const r = await D.add(d); setId(r?.id); } toast("Enregistré dans " + V.docs.toLowerCase()); };
  const copier = () => { try { navigator.clipboard.writeText(res); toast("Copié"); } catch (e) { toast("Copie impossible", "bad"); } };
  if (!type) return html`<${ui.Empty} texte="Aucun type de document configuré."/>`;
  return html`<${ui.Page} titre="Créer" sous="Choisis ce que tu veux écrire, remplis l'essentiel : l'IA écrit, tu ajustes en un clic.">
    ${types.length > 1 ? html`<div class="mb-4 grid sm:grid-cols-2 lg:grid-cols-${Math.min(4, types.length)} gap-3">${types.map((x) => html`<button onClick=${() => { setT(x.id); setF({}); setRes(""); }} class=${"text-left rounded-2xl border p-4 transition " + (x.id === type.id ? "border-[var(--c)] ring-2 ring-[var(--c)]/20 bg-[var(--c)]/5" : "border-slate-200 bg-white hover:border-slate-300")}><p class="font-semibold">${x.nom}</p><p class="text-sm text-slate-500 line-clamp-2">${x.description}</p></button>`)}</div>` : null}
    <div class="grid lg:grid-cols-5 gap-4">
      <${ui.Card} class="lg:col-span-2" titre=${type.nom}><div class="space-y-3">
        ${(type.champs ?? []).map((c) => c.type === "choix" ? html`<${ui.Select} label=${c.label} value=${f[c.nom] ?? ""} onChange=${(v) => setF({ ...f, [c.nom]: v })} options=${[["", "Choisir…"], ...(c.options ?? []).map((o) => [o, o])]}/>` : c.type === "long" ? html`<${ui.Textarea} label=${c.label} value=${f[c.nom] ?? ""} onInput=${(v) => setF({ ...f, [c.nom]: v })} rows="4" placeholder=${c.placeholder ?? ""}/>` : html`<${ui.Input} label=${c.label} value=${f[c.nom] ?? ""} onInput=${(v) => setF({ ...f, [c.nom]: v })} placeholder=${c.placeholder ?? ""}/>`)}
        <div><p class="text-sm font-medium text-slate-700 mb-1.5">Ton</p><div class="flex flex-wrap gap-2">${(V.tons ?? []).map((x) => html`<button onClick=${() => setTon(x)} class=${"rounded-full px-3 py-1 text-sm border " + (x === tonChoisi ? "border-[var(--c)] bg-[var(--c)] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")}>${x}</button>`)}</div></div>
        <${ui.Button} class="w-full py-3" disabled=${!!busy} onClick=${generer}>${busy === "gen" ? "Écriture en cours…" : res ? "Réécrire" : "Écrire avec l'IA"}</${ui.Button}>
      </div></${ui.Card}>
      <${ui.Card} class="lg:col-span-3" titre="Résultat" actions=${res ? html`<span class="text-xs text-slate-400">${mots(res)} mots</span>` : null}>
        ${res ? html`<div class="space-y-3">
          <${ui.Input} label="Titre" value=${titre} onInput=${setTitre}/>
          <textarea class="w-full min-h-[340px] rounded-xl border border-slate-200 p-4 text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--c)]/30" value=${res} onInput=${(e) => setRes(e.target.value)}/>
          <div class="flex flex-wrap gap-2">${[["Raccourcis ce texte d'environ un tiers.", "Plus court"], ["Rends ce texte plus percutant et plus concret.", "Plus percutant"], ["Rends ce texte plus simple et plus chaleureux.", "Plus simple"], ["Traduis ce texte en anglais.", "En anglais"]].map(([q, l]) => html`<${ui.Button} variant="secondary" disabled=${!!busy} onClick=${() => retoucher(q)}>${busy === q ? "…" : l}</${ui.Button}>`)}</div>
          <div class="flex flex-wrap gap-2 border-t border-slate-100 pt-3"><${ui.Button} onClick=${enregistrer}>${id ? "Enregistrer les changements" : "Enregistrer"}</${ui.Button}><${ui.Button} variant="secondary" onClick=${copier}>Copier</${ui.Button}><${ui.Button} variant="secondary" icone="fichier" onClick=${() => pdf({ titre: titre || type.nom, paragraphes: res.split(/\n{2,}/), nomFichier: titre || type.nom })}>PDF</${ui.Button}></div>
        </div>` : html`<div class="grid place-items-center text-center py-16 text-slate-500"><div><span class="mx-auto mb-3 grid w-12 h-12 place-items-center rounded-2xl bg-[var(--c)]/10 text-[var(--c)]"><${Icone} nom="message"/></span><p>Ton texte apparaîtra ici.</p><p class="text-sm">Plus tu donnes de détails, plus il te ressemble.</p></div></div>`}
      </${ui.Card}>
    </div>
  </${ui.Page}>`;
}
