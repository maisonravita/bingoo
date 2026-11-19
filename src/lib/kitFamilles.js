// Briques propres à certaines familles de logiciels, ajoutées au kit des SaaS livrés (ui.*) :
// - ui.Editeur : éditeur de documents en blocs (prise de notes, wiki, documents) — titres, listes, cases, citations, menu « / », raccourcis Markdown
// - ui.Chat : conversation avec l'IA (assistants, coachs, outils conversationnels)
// Écrit sans gabarit ni « dollar-accolade » : ce code est inséré tel quel dans la coque (src/lib/appShell.js), elle-même un gabarit.
export const CODE_KIT_FAMILLES = String.raw`
const NL = String.fromCharCode(10);
const BLOCS = [["p", "Texte", "¶"], ["h1", "Grand titre", "H1"], ["h2", "Titre", "H2"], ["h3", "Sous-titre", "H3"], ["ul", "Liste à puces", "•"], ["ol", "Liste numérotée", "1."], ["todo", "Case à cocher", "☐"], ["quote", "Citation", "❝"], ["code", "Code", "</>"], ["hr", "Séparateur", "—"]];
const STYLE_BLOC = { p: "text-[15px] leading-7", h1: "text-3xl font-bold tracking-tight leading-tight mt-4", h2: "text-2xl font-semibold tracking-tight mt-3", h3: "text-lg font-semibold mt-2", ul: "text-[15px] leading-7", ol: "text-[15px] leading-7", todo: "text-[15px] leading-7", quote: "text-[15px] leading-7 italic text-slate-600", code: "font-mono text-[13px] leading-6" };
const nid = () => Math.random().toString(36).slice(2, 10);
const versBlocs = (v) => Array.isArray(v) && v.length ? v.map((b) => ({ id: b.id || nid(), type: BLOCS.some((x) => x[0] === b.type) ? b.type : "p", texte: String(b.texte ?? b.text ?? ""), fait: !!b.fait }))
  : typeof v === "string" && v.trim() ? v.split(NL).map((t) => ({ id: nid(), type: "p", texte: t, fait: false })) : [{ id: nid(), type: "p", texte: "", fait: false }];
const empreinteBlocs = (v) => JSON.stringify(versBlocs(v).map((b) => [b.type, b.texte, !!b.fait]));
const RACCOURCIS = [["# ", "h1"], ["## ", "h2"], ["### ", "h3"], ["- ", "ul"], ["* ", "ul"], ["1. ", "ol"], ["[] ", "todo"], ["[ ] ", "todo"], ["> ", "quote"]];
const ajuster = (el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } };
ui.Editeur = ({ value, onChange, placeholder = "Écrivez, ou tapez « / » pour insérer un bloc…", lectureSeule }) => {
  const [blocs, setBlocs] = useState(() => versBlocs(value));
  const [menu, setMenu] = useState(null), [poignee, setPoignee] = useState(null);
  const refs = useRef({}), focus = useRef(null), minuteur = useRef(null), courant = useRef(blocs);
  courant.current = blocs;
  // La valeur revient de la base (champs réordonnés, identifiants ajoutés) : on ne recharge que si le CONTENU a vraiment changé ailleurs
  useEffect(() => { if (empreinteBlocs(value) !== empreinteBlocs(courant.current)) setBlocs(versBlocs(value)); }, [JSON.stringify(value ?? null)]);
  // Le curseur va au bon bloc au moment même où il s'affiche (sinon une frappe rapide part dans le bloc d'avant)
  const placer = (id, el) => { if (!el) { delete refs.current[id]; return; } refs.current[id] = el; ajuster(el); if (focus.current && focus.current[0] === id) { const pos = focus.current[1]; focus.current = null; el.focus(); const q = pos === "fin" ? el.value.length : Math.min(pos, el.value.length); el.setSelectionRange(q, q); } };
  useEffect(() => { Object.values(refs.current).forEach(ajuster); });
  const publier = (bs) => { setBlocs(bs); courant.current = bs; clearTimeout(minuteur.current); minuteur.current = setTimeout(() => onChange?.(courant.current.map(({ id, type, texte, fait }) => ({ id, type, texte, fait }))), 400); };
  const maj = (i, d) => publier(blocs.map((b, k) => k === i ? { ...b, ...d } : b));
  const inserer = (i, b) => { const n = { id: nid(), type: "p", texte: "", fait: false, ...b }; const bs = [...blocs.slice(0, i + 1), n, ...blocs.slice(i + 1)]; focus.current = [n.id, 0]; publier(bs); };
  const retirer = (i) => { if (blocs.length === 1) { publier([{ ...blocs[0], type: "p", texte: "" }]); return; } const prec = blocs[Math.max(0, i - 1)]; focus.current = [prec.id, "fin"]; publier(blocs.filter((_, k) => k !== i)); };
  const deplacer = (i, d) => { const j = i + d; if (j < 0 || j >= blocs.length) return; const bs = [...blocs]; const [x] = bs.splice(i, 1); bs.splice(j, 0, x); focus.current = [x.id, "fin"]; publier(bs); setPoignee(null); };
  const saisie = (i, t) => {
    const b = blocs[i];
    if (b.type === "p") { const r = RACCOURCIS.find(([m]) => t.startsWith(m)); if (r) { focus.current = [b.id, 0]; maj(i, { type: r[1], texte: t.slice(r[0].length) }); return; } if (t === "---") { const bs = blocs.map((x, k) => k === i ? { ...x, type: "hr", texte: "" } : x); const n = { id: nid(), type: "p", texte: "", fait: false }; bs.splice(i + 1, 0, n); focus.current = [n.id, 0]; publier(bs); return; } }
    setMenu(t.startsWith("/") && !t.includes(" ") ? { i, filtre: t.slice(1).toLowerCase(), sel: 0 } : null);
    maj(i, { texte: t });
  };
  const choix = menu ? BLOCS.filter((x) => (x[1] + " " + x[0]).toLowerCase().includes(menu.filtre)) : [];
  const appliquer = (type) => { const i = menu.i, b = blocs[i]; setMenu(null); if (type === "hr") { const bs = blocs.map((x, k) => k === i ? { ...x, type: "hr", texte: "" } : x); const n = { id: nid(), type: "p", texte: "", fait: false }; bs.splice(i + 1, 0, n); focus.current = [n.id, 0]; publier(bs); return; } focus.current = [b.id, 0]; maj(i, { type, texte: "" }); };
  const touche = (i, e) => {
    const b = blocs[i], el = e.target;
    if (menu && menu.i === i && choix.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMenu({ ...menu, sel: (menu.sel + 1) % choix.length }); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMenu({ ...menu, sel: (menu.sel - 1 + choix.length) % choix.length }); return; }
      if (e.key === "Enter") { e.preventDefault(); appliquer(choix[Math.min(menu.sel, choix.length - 1)][0]); return; }
      if (e.key === "Escape") { setMenu(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey && b.type !== "code") {
      e.preventDefault();
      if (["ul", "ol", "todo", "quote"].includes(b.type) && !b.texte) { maj(i, { type: "p" }); return; }
      const avant = b.texte.slice(0, el.selectionStart), apres = b.texte.slice(el.selectionEnd);
      const suite = ["ul", "ol", "todo"].includes(b.type) ? b.type : "p";
      const n = { id: nid(), type: suite, texte: apres, fait: false };
      const bs = blocs.map((x, k) => k === i ? { ...x, texte: avant } : x); bs.splice(i + 1, 0, n); focus.current = [n.id, 0]; publier(bs); return;
    }
    if (e.key === "Backspace" && el.selectionStart === 0 && el.selectionEnd === 0) {
      if (b.type !== "p") { e.preventDefault(); maj(i, { type: "p" }); return; }
      if (i > 0) { e.preventDefault(); const prec = blocs[i - 1]; if (prec.type === "hr") { publier(blocs.filter((_, k) => k !== i - 1)); return; } focus.current = [prec.id, prec.texte.length]; publier(blocs.map((x, k) => k === i - 1 ? { ...x, texte: x.texte + b.texte } : x).filter((_, k) => k !== i)); return; }
    }
    if (e.key === "ArrowUp" && el.selectionStart === 0 && i > 0) { const p = blocs.slice(0, i).reverse().find((x) => x.type !== "hr"); if (p) { e.preventDefault(); const el2 = refs.current[p.id]; if (el2) { el2.focus(); el2.setSelectionRange(el2.value.length, el2.value.length); } } }
    if (e.key === "ArrowDown" && el.selectionEnd === b.texte.length && i < blocs.length - 1) { const s = blocs.slice(i + 1).find((x) => x.type !== "hr"); if (s) { e.preventDefault(); const el2 = refs.current[s.id]; if (el2) { el2.focus(); el2.setSelectionRange(0, 0); } } }
  };
  let num = 0;
  return h("div", { class: "bq-editeur relative pb-24", onClick: (e) => { if (e.target === e.currentTarget && !lectureSeule) { const d = blocs[blocs.length - 1]; if (d.type === "p" && !d.texte) refs.current[d.id]?.focus(); else inserer(blocs.length - 1, {}); } } },
    blocs.map((b, i) => {
      num = b.type === "ol" ? num + 1 : 0;
      if (b.type === "hr") return h("div", { key: b.id, class: "group relative py-3" }, h("hr", { class: "border-slate-200" }), !lectureSeule && h("button", { class: "absolute -left-7 top-1.5 hidden group-hover:block text-slate-300 hover:text-red-500 text-sm", title: "Retirer", onClick: () => retirer(i) }, "×"));
      const marque = b.type === "ul" ? h("span", { class: "select-none w-6 shrink-0 text-center text-slate-400 leading-7" }, "•")
        : b.type === "ol" ? h("span", { class: "select-none w-6 shrink-0 text-right pr-1.5 text-slate-400 leading-7 tabular-nums" }, num + ".")
        : b.type === "todo" ? h("input", { type: "checkbox", checked: b.fait, disabled: lectureSeule, onChange: () => maj(i, { fait: !b.fait }), class: "mt-1.5 mr-2 w-4 h-4 shrink-0 accent-[var(--c)] cursor-pointer" }) : null;
      return h("div", { key: b.id, class: cls("group relative flex items-start rounded-md", b.type === "quote" && "border-l-4 border-[var(--c)]/40 pl-3", b.type === "code" && "bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 my-1") },
        !lectureSeule && h("button", { class: "absolute -left-7 top-1 hidden group-hover:grid w-5 h-6 place-items-center rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 text-xs", title: "Options du bloc", onClick: () => setPoignee(poignee === i ? null : i) }, "⋮⋮"),
        marque,
        h("textarea", { ref: (el) => placer(b.id, el), rows: 1, readOnly: lectureSeule, value: b.texte, placeholder: i === 0 && blocs.length === 1 ? placeholder : b.type === "h1" ? "Grand titre" : b.type === "h2" ? "Titre" : b.type === "h3" ? "Sous-titre" : "",
          spellcheck: b.type !== "code",
          class: cls("w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-slate-300", STYLE_BLOC[b.type], b.type === "todo" && b.fait && "line-through text-slate-400"),
          onInput: (e) => { ajuster(e.target); saisie(i, e.target.value); }, onKeyDown: (e) => touche(i, e), onBlur: () => setTimeout(() => setMenu((m) => m && m.i === i ? null : m), 150) }),
        poignee === i && h("div", { class: "absolute -left-7 top-7 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg text-sm" },
          [["Monter", () => deplacer(i, -1)], ["Descendre", () => deplacer(i, 1)], ["Dupliquer", () => { setPoignee(null); inserer(i, { type: b.type, texte: b.texte }); }], ["Supprimer", () => { setPoignee(null); retirer(i); }]].map(([l, f]) => h("button", { key: l, class: cls("block w-full text-left rounded-lg px-2.5 py-1.5 hover:bg-slate-50", l === "Supprimer" && "text-red-600"), onClick: f }, l)),
          h("p", { class: "px-2.5 pt-2 pb-1 text-xs text-slate-400" }, "Transformer en"),
          h("div", { class: "grid grid-cols-5 gap-1 px-1 pb-1" }, BLOCS.filter((x) => x[0] !== "hr").map(([t, l, ic]) => h("button", { key: t, title: l, class: cls("rounded-md py-1 text-xs hover:bg-slate-100", b.type === t && "bg-slate-100 font-semibold"), onClick: () => { setPoignee(null); focus.current = [b.id, "fin"]; maj(i, { type: t }); } }, ic)))),
        menu && menu.i === i && choix.length > 0 && h("div", { class: "absolute left-6 top-8 z-30 w-60 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg" },
          h("p", { class: "px-2.5 pt-1.5 pb-1 text-xs text-slate-400" }, "Insérer un bloc"),
          choix.map(([t, l, ic], k) => h("button", { key: t, onMouseDown: (e) => { e.preventDefault(); appliquer(t); }, class: cls("flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm", k === menu.sel ? "bg-slate-100" : "hover:bg-slate-50") }, h("span", { class: "grid w-8 h-8 place-items-center rounded-lg border border-slate-200 text-xs font-semibold text-slate-500" }, ic), l))));
    }));
};
// Texte du document (pour une recherche, un résumé IA, un export PDF ou une copie)
ui.texteDe = (blocs) => versBlocs(blocs).map((b) => b.type === "hr" ? "—" : (b.type === "ul" ? "• " : b.type === "todo" ? (b.fait ? "☑ " : "☐ ") : b.type === "h1" || b.type === "h2" ? "" : "") + b.texte).join(NL);

// Conversation avec l'IA : bulles, suggestions de départ, saisie (Entrée envoie, Maj+Entrée va à la ligne), indicateur d'écriture, copier
const rendreTexte = (t) => String(t ?? "").split(NL).map((l, k) => { const s = l.trim(); if (s.startsWith("- ") || s.startsWith("• ") || s.startsWith("* ")) return h("p", { key: k, class: "pl-4 -indent-3" }, "• " + s.slice(2)); if (s.startsWith("### ") || s.startsWith("## ")) return h("p", { key: k, class: "font-semibold mt-1" }, s.replace(/^#+ /, "")); return s ? h("p", { key: k }, l) : h("div", { key: k, class: "h-2" }); });
ui.Chat = ({ messages = [], onEnvoyer, enCours, suggestions = [], placeholder = "Écrivez votre message…", accueil, nomIA = "Assistant" }) => {
  const [t, setT] = useState(""), fin = useRef(null), zone = useRef(null);
  useEffect(() => { fin.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [messages.length, enCours]);
  const envoyer = async (x) => { const m = String(x ?? t).trim(); if (!m || enCours) return; setT(""); if (zone.current) zone.current.style.height = "auto"; await onEnvoyer?.(m); };
  return h("div", { class: "flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden", style: "height:min(72vh,720px)" },
    h("div", { class: "flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4" },
      !messages.length && h("div", { class: "h-full grid place-items-center text-center" }, h("div", { class: "max-w-md" },
        h("div", { class: "mx-auto mb-3 grid w-12 h-12 place-items-center rounded-2xl bg-[var(--c)]/10 text-[var(--c)] text-xl" }, "✦"),
        h("p", { class: "text-lg font-semibold" }, accueil || "Comment puis-je vous aider ?"),
        suggestions.length > 0 && h("div", { class: "mt-4 flex flex-wrap justify-center gap-2" }, suggestions.slice(0, 4).map((s) => h("button", { key: s, onClick: () => envoyer(s), class: "rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-[var(--c)] hover:text-[var(--c)]" }, s))))),
      messages.map((m, k) => m.role === "user"
        ? h("div", { key: k, class: "flex justify-end" }, h("div", { class: "max-w-[80%] rounded-2xl rounded-br-md bg-[var(--c)] px-4 py-2.5 text-[15px] leading-6 text-white whitespace-pre-wrap" }, m.texte))
        : h("div", { key: k, class: "group flex gap-3" }, h("div", { class: "mt-0.5 grid w-7 h-7 shrink-0 place-items-center rounded-full bg-[var(--c)]/10 text-[var(--c)] text-xs" }, "✦"),
            h("div", { class: "min-w-0 flex-1" }, h("p", { class: "text-xs font-medium text-slate-400 mb-0.5" }, nomIA), h("div", { class: "text-[15px] leading-7 text-slate-800 space-y-0.5" }, rendreTexte(m.texte)),
              h("button", { class: "mt-1 hidden group-hover:inline text-xs text-slate-400 hover:text-slate-700", onClick: () => { navigator.clipboard?.writeText(m.texte); toast("Copié"); } }, "Copier")))),
      enCours && h("div", { class: "flex gap-3" }, h("div", { class: "grid w-7 h-7 place-items-center rounded-full bg-[var(--c)]/10 text-[var(--c)] text-xs" }, "✦"), h("div", { class: "flex items-center gap-1 pt-2" }, [0, 1, 2].map((d) => h("span", { key: d, class: "w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce", style: "animation-delay:" + d * 0.15 + "s" })))),
      h("div", { ref: fin })),
    h("div", { class: "border-t border-slate-100 p-3" }, h("div", { class: "flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-[var(--c)]" },
      h("textarea", { ref: zone, rows: 1, value: t, placeholder, class: "flex-1 resize-none bg-transparent text-[15px] leading-6 outline-none max-h-40", onInput: (e) => { setT(e.target.value); ajuster(e.target); }, onKeyDown: (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } } }),
      h("button", { onClick: () => envoyer(), disabled: !t.trim() || enCours, class: "grid w-9 h-9 shrink-0 place-items-center rounded-xl bg-[var(--c)] text-white disabled:opacity-40", title: "Envoyer" }, "↑"))));
};

// Formulaires interactifs : le constructeur (questions, types, options, obligatoire, ordre) et le lecteur une question à la fois
const TYPES_Q = [["texte", "Réponse courte"], ["long", "Paragraphe"], ["choix", "Choix unique"], ["multiple", "Choix multiples"], ["note", "Note de 1 à 5"], ["nps", "Recommandation de 0 à 10"], ["oui_non", "Oui ou non"], ["email", "E-mail"], ["nombre", "Nombre"], ["date", "Date"]];
const versQuestions = (v) => (Array.isArray(v) ? v : []).map((q, k) => ({ id: q.id || "q" + (k + 1), type: TYPES_Q.some((t) => t[0] === q.type) ? q.type : "texte", titre: String(q.titre ?? q.label ?? ""), aide: String(q.aide ?? ""), options: Array.isArray(q.options) ? q.options.map(String) : [], obligatoire: !!q.obligatoire }));
ui.ConstructeurFormulaire = ({ value, onChange }) => {
  const qs = versQuestions(value), [ouv, setOuv] = useState(qs[0]?.id ?? null);
  const pub = (n) => onChange?.(n);
  const maj = (i, d) => pub(qs.map((q, k) => k === i ? { ...q, ...d } : q));
  const ajouter = (type) => { const q = { id: nid(), type, titre: "", aide: "", options: ["choix", "multiple"].includes(type) ? ["Option 1", "Option 2"] : [], obligatoire: false }; pub([...qs, q]); setOuv(q.id); };
  const bouger = (i, d) => { const j = i + d; if (j < 0 || j >= qs.length) return; const n = [...qs]; const [x] = n.splice(i, 1); n.splice(j, 0, x); pub(n); };
  return h("div", { class: "space-y-3" },
    qs.map((q, i) => h("div", { key: q.id, class: cls("rounded-2xl border bg-white", ouv === q.id ? "border-[var(--c)] ring-2 ring-[var(--c)]/15" : "border-slate-200") },
      h("button", { class: "flex w-full items-center gap-3 px-4 py-3 text-left", onClick: () => setOuv(ouv === q.id ? null : q.id) },
        h("span", { class: "grid w-7 h-7 shrink-0 place-items-center rounded-lg bg-[var(--c)]/10 text-[var(--c)] text-xs font-bold" }, i + 1),
        h("span", { class: "flex-1 min-w-0" }, h("span", { class: "block truncate font-medium" }, q.titre || "Question sans titre"), h("span", { class: "block text-xs text-slate-400" }, (TYPES_Q.find((t) => t[0] === q.type) || [])[1] + (q.obligatoire ? " · obligatoire" : ""))),
        h("span", { class: "text-slate-300" }, ouv === q.id ? "▴" : "▾")),
      ouv === q.id && h("div", { class: "space-y-3 border-t border-slate-100 px-4 py-4" },
        h(ui.Input, { label: "Question", value: q.titre, placeholder: "Ex. Comment avez-vous connu notre service ?", onInput: (v) => maj(i, { titre: v }) }),
        h(ui.Input, { label: "Aide (facultatif)", value: q.aide, onInput: (v) => maj(i, { aide: v }) }),
        h("div", { class: "grid sm:grid-cols-2 gap-3" }, h(ui.Select, { label: "Type de réponse", value: q.type, options: TYPES_Q, onChange: (v) => maj(i, { type: v, options: ["choix", "multiple"].includes(v) && !q.options.length ? ["Option 1", "Option 2"] : q.options }) }),
          h("label", { class: "flex items-center gap-2 self-end pb-2 text-sm" }, h("input", { type: "checkbox", checked: q.obligatoire, onChange: () => maj(i, { obligatoire: !q.obligatoire }), class: "accent-[var(--c)] w-4 h-4" }), "Réponse obligatoire")),
        ["choix", "multiple"].includes(q.type) && h("div", { class: "space-y-2" }, h("p", { class: "text-xs font-medium text-slate-500" }, "Options"),
          q.options.map((o, k) => h("div", { key: k, class: "flex gap-2" }, h("input", { class: champ, value: o, onInput: (e) => maj(i, { options: q.options.map((x, j) => j === k ? e.target.value : x) }) }), h("button", { class: "px-2 text-slate-400 hover:text-red-600", title: "Retirer", onClick: () => maj(i, { options: q.options.filter((_, j) => j !== k) }) }, "×"))),
          h(ui.Button, { variant: "ghost", onClick: () => maj(i, { options: [...q.options, "Option " + (q.options.length + 1)] }) }, "+ Ajouter une option")),
        h("div", { class: "flex flex-wrap gap-2 pt-1" }, h(ui.Button, { variant: "secondary", onClick: () => bouger(i, -1), disabled: i === 0 }, "Monter"), h(ui.Button, { variant: "secondary", onClick: () => bouger(i, 1), disabled: i === qs.length - 1 }, "Descendre"), h(ui.Button, { variant: "secondary", onClick: () => { const c = { ...q, id: nid() }; pub([...qs.slice(0, i + 1), c, ...qs.slice(i + 1)]); setOuv(c.id); } }, "Dupliquer"), h(ui.Button, { variant: "danger", onClick: () => pub(qs.filter((_, k) => k !== i)) }, "Supprimer"))))),
    h("div", { class: "rounded-2xl border border-dashed border-slate-300 p-4" }, h("p", { class: "text-sm font-medium mb-2" }, "Ajouter une question"),
      h("div", { class: "flex flex-wrap gap-2" }, TYPES_Q.map(([t, l]) => h("button", { key: t, onClick: () => ajouter(t), class: "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm hover:border-[var(--c)] hover:text-[var(--c)]" }, l)))));
};
ui.Questionnaire = ({ questions, onTerminer, titre, intro, merci = "Merci, vos réponses sont bien envoyées.", apercu }) => {
  const qs = versQuestions(questions), [i, setI] = useState(-1), [rep, setRep] = useState({}), [fini, setFini] = useState(false), [busy, setBusy] = useState(false);
  const q = qs[i], v = q ? rep[q.id] : null;
  const valide = (q, v) => !q.obligatoire || (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== "");
  const ok = q ? valide(q, v) && (q.type !== "email" || !v || (String(v).includes("@") && String(v).includes("."))) : true;
  const suivant = async () => { if (!ok) { toast(q.type === "email" && v ? "Adresse e-mail invalide" : "Cette réponse est obligatoire", "bad"); return; } if (i < qs.length - 1) { setI(i + 1); return; } if (apercu) { setFini(true); return; } setBusy(true); try { await onTerminer?.(qs.map((x) => ({ id: x.id, question: x.titre, type: x.type, reponse: rep[x.id] ?? null })), rep); setFini(true); } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); } };
  const poser = (val, auto) => { setRep({ ...rep, [q.id]: val }); if (auto) setTimeout(() => setI((k) => k < qs.length - 1 ? k + 1 : k), 260); };
  if (!qs.length) return h(ui.Empty, { texte: "Ce formulaire n'a pas encore de question." });
  if (fini) return h("div", { class: "max-w-xl mx-auto py-20 text-center" }, h("div", { class: "mx-auto grid w-14 h-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 text-2xl" }, "✓"), h("p", { class: "mt-4 text-2xl font-bold" }, merci));
  if (i < 0) return h("div", { class: "max-w-xl mx-auto py-16" }, h("h1", { class: "text-3xl sm:text-4xl font-bold tracking-tight" }, titre || "Quelques questions"), intro && h("p", { class: "mt-3 text-lg text-slate-500" }, intro), h("p", { class: "mt-2 text-sm text-slate-400" }, qs.length + " question" + (qs.length > 1 ? "s" : "") + " · moins de " + Math.max(1, Math.ceil(qs.length / 3)) + " min"), h("div", { class: "mt-8" }, h(ui.Button, { onClick: () => setI(0) }, "Commencer")));
  const bouton = (actif, contenu, onClick, k) => h("button", { key: k, onClick, class: cls("rounded-xl border-2 px-4 py-3 text-left text-[15px] transition", actif ? "border-[var(--c)] bg-[var(--c)]/10 font-medium" : "border-slate-200 bg-white hover:border-slate-300") }, contenu);
  const champQ = q.type === "long" ? h("textarea", { class: champ + " text-lg", rows: 4, value: v ?? "", onInput: (e) => setRep({ ...rep, [q.id]: e.target.value }) })
    : q.type === "choix" ? h("div", { class: "grid gap-2" }, q.options.map((o, k) => bouton(v === o, h("span", null, h("span", { class: "mr-3 inline-grid w-6 h-6 place-items-center rounded-md border border-slate-300 text-xs" }, String.fromCharCode(65 + k)), o), () => poser(o, true), k)))
    : q.type === "multiple" ? h("div", { class: "grid gap-2" }, q.options.map((o, k) => { const l = Array.isArray(v) ? v : []; return bouton(l.includes(o), (l.includes(o) ? "☑ " : "☐ ") + o, () => poser(l.includes(o) ? l.filter((x) => x !== o) : [...l, o]), k); }))
    : q.type === "oui_non" ? h("div", { class: "flex gap-3" }, ["Oui", "Non"].map((o) => bouton(v === o, o, () => poser(o, true), o)))
    : q.type === "note" ? h("div", { class: "flex gap-2" }, [1, 2, 3, 4, 5].map((n) => h("button", { key: n, onClick: () => poser(n, true), class: cls("text-4xl transition", (v ?? 0) >= n ? "text-amber-400" : "text-slate-200 hover:text-amber-200") }, "★")))
    : q.type === "nps" ? h("div", null, h("div", { class: "grid grid-cols-11 gap-1.5" }, Array.from({ length: 11 }, (_, n) => h("button", { key: n, onClick: () => poser(n, true), class: cls("rounded-lg border-2 py-2.5 text-sm font-semibold", v === n ? "border-[var(--c)] bg-[var(--c)] text-white" : "border-slate-200 bg-white hover:border-slate-300") }, n))), h("div", { class: "mt-2 flex justify-between text-xs text-slate-400" }, h("span", null, "Pas du tout probable"), h("span", null, "Très probable")))
    : h("input", { class: champ + " text-lg", type: q.type === "email" ? "email" : q.type === "nombre" ? "number" : q.type === "date" ? "date" : "text", value: v ?? "", onInput: (e) => setRep({ ...rep, [q.id]: e.target.value }), onKeyDown: (e) => { if (e.key === "Enter") suivant(); } });
  return h("div", { class: "max-w-xl mx-auto py-10 min-h-[60vh] flex flex-col" },
    h("div", { class: "h-1.5 rounded-full bg-slate-100 overflow-hidden" }, h("div", { class: "h-full bg-[var(--c)] transition-all", style: "width:" + Math.round(((i + 1) / qs.length) * 100) + "%" })),
    h("div", { key: q.id, class: "anim flex-1 pt-12" }, h("p", { class: "text-sm font-semibold text-[var(--c)]" }, (i + 1) + " → " + qs.length), h("h2", { class: "mt-2 text-2xl sm:text-3xl font-bold tracking-tight" }, q.titre || "Question", q.obligatoire && h("span", { class: "text-[var(--c)]" }, " *")), q.aide && h("p", { class: "mt-2 text-slate-500" }, q.aide), h("div", { class: "mt-6" }, champQ)),
    h("div", { class: "mt-8 flex items-center gap-3" }, h(ui.Button, { onClick: suivant, disabled: busy }, busy ? "Envoi…" : i === qs.length - 1 ? "Envoyer" : "OK →"), i > 0 && h("button", { class: "text-sm text-slate-400 hover:text-slate-700", onClick: () => setI(i - 1) }, "← Précédente")));
};
`;
