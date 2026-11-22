function Ecran() {
  const D = useCollection("documents"), P = useCollection("profil");
  const types = V.types ?? [], tons = V.tons ?? [];
  const [t, setT] = useState(types[0]?.id), [liste, setListe] = useState("tous"), [ton, setTon] = useState(null), [jours, setJours] = useState(30);
  const mots = (s) => (String(s ?? "").trim().match(/\S+/g) ?? []).length;
  if (D.loading || P.loading) return html`<${ui.Loading}/>`;
  const prof = P.rows[0] ?? {}, tonVu = ton ?? prof.ton ?? tons[0] ?? "Professionnel";
  const type = types.find((x) => x.id === t) ?? types[0];
  const nomType = (id) => types.find((x) => x.id === id)?.nom ?? "Texte";
  const tries = [...D.rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const vus = (liste === "favoris" ? tries.filter((d) => d.favori) : liste === "recents" ? tries.filter((d) => String(d.created_at).slice(0, 10) >= decale(-7)) : tries).slice(0, 5);
  // Indicateurs de la période, comparés à la période d'avant
  const debut = decale(-jours), avant = decale(-2 * jours), jourDe = (d) => String(d.created_at).slice(0, 10);
  const per = D.rows.filter((d) => jourDe(d) >= debut), prec = D.rows.filter((d) => jourDe(d) >= avant && jourDe(d) < debut);
  const motsDe = (L) => L.reduce((a, d) => a + (Number(d.mots) || mots(d.contenu)), 0);
  const mP = motsDe(per), mA = motsDe(prec), minutes = Math.round(mP / 25); // ~25 mots écrits à la main par minute
  const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const parJour = JOURS.map((label, i) => ({ label, valeur: per.filter((d) => (new Date(d.created_at).getDay() + 6) % 7 === i).length }));
  const APERCU = { professionnel: "Un ton professionnel pour des communications claires et efficaces.", inspirant: "Un ton inspirant qui donne envie d'agir et de vous suivre.", bienveillant: "Un ton bienveillant, chaleureux et rassurant.", direct: "Un ton direct : des phrases courtes, droit au but.", créatif: "Un ton créatif qui surprend et marque les esprits.", éducatif: "Un ton pédagogue qui explique simplement.", chaleureux: "Un ton chaleureux et proche de vos lecteurs.", "décontracté": "Un ton décontracté, comme une conversation." };
  const apercu = APERCU[String(tonVu).toLowerCase()] ?? "Un ton « " + tonVu + " » pour tous vos contenus.";
  const garderStyle = async () => { if (prof.id) await P.update(prof.id, { ton: tonVu }); else await P.add({ ton: tonVu, langue: "français", a_propos: "", exemples: "" }); toast("Style enregistré : vos prochains textes seront écrits sur ce ton"); };
  const POINTS = ["bg-violet-500", "bg-teal-500", "bg-orange-400", "bg-sky-500", "bg-rose-500"];
  return html`<div class="anim">
    <${Entete} titre=${"Bonjour" + (user?.nom ? " " + String(user.nom).split(" ")[0] : "")} sous="Que voulez-vous écrire aujourd'hui ?"/>
    <div class="grid gap-4 lg:grid-cols-2">
      <${Carte}>
        <${TitreCarte} icone="crayon" titre="Créer" sous="Commencez avec une nouvelle création."/>
        ${types.length > 1 && html`<${Onglets} valeur=${type?.id} onChange=${setT} options=${types.slice(0, 4).map((x) => [x.id, x.nom])}/>`}
        ${type && html`<button onClick=${() => go("creer", { type: type.id })} class="mt-4 flex w-full items-center gap-3 rounded-xl bg-[var(--c)]/5 p-3 text-left hover:bg-[var(--c)]/10"><span class="grid w-7 h-7 shrink-0 place-items-center rounded-full border border-[var(--c)]/40 text-xs font-bold text-[var(--c)]">i</span><span class="min-w-0 flex-1"><span class="block text-sm font-semibold">${type.nom}</span><span class="block text-xs text-slate-500 line-clamp-2">${type.description}</span></span><span class="text-[var(--c)]">→</span></button>`}
        <p class="mt-4 text-sm font-semibold">Résultat</p>
        <div class="mt-1.5 h-28 rounded-xl border border-slate-200 p-3 text-sm text-slate-500">Votre texte apparaîtra ici…</div>
        <button onClick=${() => go("creer", { type: type?.id })} class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--c)] py-3 font-semibold text-white shadow-sm hover:brightness-110">✦ Créer mon texte</button>
      </${Carte}>
      <${Carte}>
        <${TitreCarte} icone="fichier" titre="Textes" sous="Gérez vos textes et modèles."><button onClick=${() => go("documents")} class="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">Tout voir →</button></${TitreCarte}>
        <${Onglets} valeur=${liste} onChange=${setListe} options=${[["tous", "Mes textes"], ["favoris", "Favoris (" + D.rows.filter((d) => d.favori).length + ")"], ["recents", "Récents"]]}/>
        ${vus.length ? html`<div class="mt-2 divide-y divide-slate-100">${vus.map((d) => html`<div class="flex items-center gap-3 py-2.5"><span class="grid w-9 h-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500"><${Icone} nom="fichier" class="w-4 h-4"/></span><button onClick=${() => go("documents", { ouvrir: d.id })} class="min-w-0 flex-1 text-left"><p class="truncate text-sm font-semibold">${d.titre || nomType(d.type)}</p><p class="truncate text-xs text-slate-500">${String(d.contenu ?? "").slice(0, 70)}</p></button><span class="shrink-0 text-xs text-slate-500">${fmt.date(d.created_at)}</span><${Menu} actions=${[["Ouvrir", () => go("documents", { ouvrir: d.id })], [d.favori ? "Retirer des favoris" : "Ajouter aux favoris", () => D.update(d.id, { favori: !d.favori })], ["Supprimer", async () => { if (await demander("Supprimer ce texte ?", { ok: "Supprimer", danger: true })) D.remove(d.id); }, true]]}/></div>`)}</div>` : html`<p class="py-8 text-center text-sm text-slate-500">${liste === "favoris" ? "Aucun favori pour l'instant." : "Votre premier texte vous attend."}</p>`}
        <div class="mt-3 text-center"><button onClick=${() => go("creer")} class="inline-flex items-center gap-2 rounded-xl bg-[var(--c)] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110">+ Nouveau texte</button></div>
      </${Carte}>
      <${Carte}>
        <${TitreCarte} icone="etoile" titre="Mon style" sous="Personnalisez votre style d'écriture."/>
        <p class="text-sm text-slate-600">Choisissez un ton pour vos contenus.</p>
        <div class="mt-3 flex flex-wrap gap-2">${tons.map((x) => html`<button aria-pressed=${x === tonVu ? "true" : "false"} onClick=${() => setTon(x)} class=${"rounded-full border px-3.5 py-1.5 text-sm transition " + (x === tonVu ? "border-[var(--c)] bg-[var(--c)] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")}>${x}</button>`)}</div>
        <div class="mt-4 rounded-xl bg-slate-50 p-4"><p class="text-sm font-semibold">Aperçu</p><p class="mt-1 text-sm italic text-slate-600">${apercu}</p></div>
        <div class="mt-4 flex gap-2"><button onClick=${garderStyle} class="flex-1 rounded-xl border-2 border-[var(--c)] py-2.5 text-sm font-semibold text-[var(--c)] hover:bg-[var(--c)]/5">✦ Enregistrer le style</button><button onClick=${() => go("profil")} class="rounded-xl border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50">Plus de réglages</button></div>
      </${Carte}>
      <${Carte}>
        <${TitreCarte} icone="graphique" titre="Tableau de bord" sous="Suivez vos performances en temps réel."><select value=${jours} onChange=${(e) => setJours(Number(e.target.value))} class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm"><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option></select></${TitreCarte}>
        <div class="grid grid-cols-2 gap-3">
          <${Kpi} icone="fichier" label="Contenus créés" valeur=${per.length} tendance=${evol(per.length, prec.length)}/>
          <${Kpi} icone="message" label="Mots écrits" valeur=${fmt.num(mP)} tendance=${evol(mP, mA)}/>
          <${Kpi} icone="etoile" label="Favoris" valeur=${D.rows.filter((d) => d.favori).length}/>
          <${Kpi} icone="horloge" label="Temps gagné" valeur=${Math.floor(minutes / 60) + " h " + String(minutes % 60).padStart(2, "0")}/>
        </div>
        <p class="mt-5 mb-2 font-semibold">Vos performances</p>
        <${ui.Bar} donnees=${parJour}/>
        <div class="mt-5 mb-2 flex items-center justify-between"><p class="font-semibold">Dernières actions</p><button onClick=${() => go("documents")} class="text-sm font-medium text-[var(--c)]">Voir tout →</button></div>
        ${tries.length ? html`<div class="divide-y divide-slate-100 rounded-xl border border-slate-100">${tries.slice(0, 3).map((d, i) => html`<div class="flex items-center gap-3 px-3 py-2.5 text-sm"><span class=${"w-2 h-2 shrink-0 rounded-full " + POINTS[i % POINTS.length]}></span><span class="min-w-0 flex-1 truncate">${d.favori ? "Ajouté aux favoris" : "Texte enregistré"} : « ${d.titre || nomType(d.type)} »</span><span class="shrink-0 text-xs text-slate-500">${ilya(d.created_at)}</span></div>`)}</div>` : html`<p class="text-sm text-slate-500">Rien pour l'instant.</p>`}
      </${Carte}>
    </div>
  </div>`;
}
