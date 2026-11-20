function Ecran() {
  const H = useCollection("horaires"), I = useCollection("infos");
  const [f, setF] = useState(null), [busy, setBusy] = useState(false);
  if (H.loading || I.loading) return html`<${ui.Loading}/>`;
  const inf = I.rows[0] ?? {};
  const forme = f ?? { telephone: inf.telephone ?? "", email: inf.email ?? "", adresse: inf.adresse ?? "", zone: inf.zone ?? "", instagram: inf.instagram ?? "", facebook: inf.facebook ?? "" };
  const jours = [1, 2, 3, 4, 5, 6, 7].map((j) => H.rows.find((h) => Number(h.jour) === j) ?? { jour: j, ouvert: false, debut: "09:00", fin: "18:00" });
  const changerJour = async (h, d) => { if (h.id) await H.update(h.id, d); else await H.add({ jour: h.jour, ouvert: h.ouvert, debut: h.debut, fin: h.fin, ...d }); };
  const enregistrer = async () => {
    if (forme.email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(forme.email)) { toast("Adresse e-mail invalide", "bad"); return; }
    setBusy(true);
    try { if (inf.id) await I.update(inf.id, forme); else await I.add(forme); setF(null); toast("Coordonnées à jour sur votre site"); } finally { setBusy(false); }
  };
  const champ = (k, label, ph) => html`<${ui.Input} label=${label} value=${forme[k]} placeholder=${ph} onInput=${(v) => setF({ ...forme, [k]: v })}/>`;
  return html`<div class="anim">
    <${Entete} titre=${V.horaires === false ? "Contact" : "Horaires et contact"} sous=${V.horaires === false ? "Vos coordonnées et vos réseaux, affichés sur votre site." : "Ce que vos visiteurs voient dans « Infos pratiques » et en bas de votre site."}/>
    <div class=${"grid gap-4 " + (V.horaires === false ? "max-w-2xl" : "lg:grid-cols-2")}>
      ${V.horaires !== false && html`<${Carte} titre="Horaires d'ouverture">
        <div class="divide-y divide-slate-100">${jours.map((h) => html`<div class="flex flex-wrap items-center gap-3 py-2.5">
          <label class="flex w-32 items-center gap-2 text-sm font-medium"><input type="checkbox" checked=${!!h.ouvert} onChange=${(e) => changerJour(h, { ouvert: e.target.checked })}/>${JOURS[h.jour]}</label>
          ${h.ouvert ? html`<div class="flex items-center gap-2 text-sm"><input type="time" aria-label=${"Ouverture le " + JOURS[h.jour]} value=${h.debut || "09:00"} onChange=${(e) => changerJour(h, { debut: e.target.value })} class="rounded-lg border border-slate-200 px-2 py-1"/><span class="text-slate-400">à</span><input type="time" aria-label=${"Fermeture le " + JOURS[h.jour]} value=${h.fin || "18:00"} onChange=${(e) => changerJour(h, { fin: e.target.value })} class="rounded-lg border border-slate-200 px-2 py-1"/></div>` : html`<span class="text-sm text-slate-400">Fermé</span>`}
        </div>`)}</div>
      </${Carte}>`}
      <${Carte} titre="Coordonnées">
        <div class="grid gap-3 sm:grid-cols-2">${champ("telephone", "Téléphone", "06 12 34 56 78")}${champ("email", "E-mail de contact", "contact@exemple.fr")}<div class="sm:col-span-2">${champ("adresse", "Adresse (si vous recevez vos clients)", "12 rue de la Paix, 69002 Lyon")}</div><div class="sm:col-span-2">${champ("zone", "Zone d'intervention ou quartier", "Lyon et 15 km autour")}</div>${champ("instagram", "Instagram (lien)", "https://instagram.com/…")}${champ("facebook", "Facebook (lien)", "https://facebook.com/…")}</div>
        <div class="mt-4 flex items-center gap-3"><${Bouton} disabled=${busy || !f} onClick=${enregistrer}>${busy ? "Enregistrement…" : "Enregistrer"}</${Bouton}>${f && html`<button onClick=${() => setF(null)} class="text-sm text-slate-500 hover:text-slate-800">Annuler</button>`}</div>
      </${Carte}>
    </div>
  </div>`;
}
