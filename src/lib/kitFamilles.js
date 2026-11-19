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

// Vitrine de créateur (page de liens, boutique, profil) : l'affichage public et son éditeur avec aperçu en direct sur téléphone
const TYPES_V = [["lien", "Lien"], ["produit", "Produit ou offre"], ["titre", "Titre de section"], ["texte", "Texte"], ["video", "Vidéo (lien)"]];
const versVitrine = (v) => { const x = v && typeof v === "object" ? v : {}; return { profil: { nom: "", bio: "", photo: null, emoji: "✨", ...(x.profil || {}) }, theme: ["clair", "sombre", "couleur"].includes(x.theme) ? x.theme : "clair", blocs: (Array.isArray(x.blocs) ? x.blocs : []).map((b, k) => ({ id: b.id || "b" + (k + 1), type: TYPES_V.some((t) => t[0] === b.type) ? b.type : "lien", titre: String(b.titre ?? ""), texte: String(b.texte ?? ""), url: String(b.url ?? ""), prix: b.prix ?? "", image: b.image || null, actif: b.actif !== false })) }; };
ui.Vitrine = ({ value, onAcheter, onClic }) => {
  const v = versVitrine(value), sombre = v.theme === "sombre", coul = v.theme === "couleur";
  const fond = sombre ? "bg-slate-950 text-white" : coul ? "bg-[var(--c)] text-white" : "bg-slate-50 text-slate-900";
  const carte = sombre ? "bg-white/10 hover:bg-white/15" : coul ? "bg-white/15 hover:bg-white/25" : "bg-white hover:shadow-md border border-slate-200";
  const ouvrir = (b) => { onClic?.(b); if (b.url) window.open(b.url, "_blank", "noopener"); };
  return h("div", { class: cls("min-h-full px-5 py-10", fond) }, h("div", { class: "mx-auto max-w-md text-center" },
    v.profil.photo?.url ? h("img", { src: v.profil.photo.url, class: "mx-auto w-24 h-24 rounded-full object-cover ring-4 ring-white/30" }) : h("div", { class: cls("mx-auto grid w-24 h-24 place-items-center rounded-full text-4xl", sombre || coul ? "bg-white/15" : "bg-[var(--c)]/10") }, v.profil.emoji || "✨"),
    h("h1", { class: "mt-4 text-2xl font-bold tracking-tight" }, v.profil.nom || "Votre nom"), v.profil.bio && h("p", { class: cls("mt-2 text-[15px] leading-6", sombre || coul ? "text-white/80" : "text-slate-600") }, v.profil.bio),
    h("div", { class: "mt-8 space-y-3 text-left" }, v.blocs.filter((b) => b.actif).map((b) =>
      b.type === "titre" ? h("p", { key: b.id, class: cls("pt-4 text-xs font-semibold uppercase tracking-widest text-center", sombre || coul ? "text-white/70" : "text-slate-500") }, b.titre)
      : b.type === "texte" ? h("p", { key: b.id, class: cls("text-center text-[15px] leading-6", sombre || coul ? "text-white/85" : "text-slate-600") }, b.texte)
      : b.type === "produit" ? h("div", { key: b.id, class: cls("overflow-hidden rounded-2xl transition", carte) }, b.image?.url && h("img", { src: b.image.url, class: "w-full aspect-[16/9] object-cover" }), h("div", { class: "p-4" }, h("div", { class: "flex items-start justify-between gap-3" }, h("p", { class: "font-semibold" }, b.titre || "Produit"), b.prix !== "" && h("p", { class: "font-bold tabular-nums shrink-0" }, fmt.eur(Number(b.prix) || 0))), b.texte && h("p", { class: cls("mt-1 text-sm", sombre || coul ? "text-white/75" : "text-slate-500") }, b.texte), h("button", { onClick: () => onAcheter ? onAcheter(b) : ouvrir(b), class: cls("mt-3 w-full rounded-xl py-2.5 text-sm font-semibold", sombre || coul ? "bg-white text-slate-900" : "bg-[var(--c)] text-white") }, Number(b.prix) ? "Acheter" : "Je veux")))
      : h("button", { key: b.id, onClick: () => ouvrir(b), class: cls("flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[15px] font-semibold transition", carte) }, b.type === "video" ? "▶ " : "", b.titre || b.url || "Lien"))),
    h("p", { class: cls("mt-10 text-xs", sombre || coul ? "text-white/50" : "text-slate-400") }, "Fait avec " + (S?.nom || "nous"))));
};
ui.EditeurVitrine = ({ value, onChange }) => {
  const v = versVitrine(value), [ouv, setOuv] = useState(null);
  const pub = (n) => onChange?.({ ...v, ...n });
  const maj = (i, d) => pub({ blocs: v.blocs.map((b, k) => k === i ? { ...b, ...d } : b) });
  const ajouter = (type) => { const b = { id: nid(), type, titre: type === "titre" ? "Nouvelle section" : "", texte: "", url: "", prix: type === "produit" ? 19 : "", image: null, actif: true }; pub({ blocs: [...v.blocs, b] }); setOuv(b.id); };
  const bouger = (i, d) => { const j = i + d; if (j < 0 || j >= v.blocs.length) return; const n = [...v.blocs]; const [x] = n.splice(i, 1); n.splice(j, 0, x); pub({ blocs: n }); };
  return h("div", { class: "grid lg:grid-cols-[1fr_380px] gap-6 items-start" },
    h("div", { class: "space-y-4" },
      h(ui.Card, { titre: "Profil" }, h("div", { class: "grid sm:grid-cols-[80px_1fr] gap-3" }, h(ui.Input, { label: "Emoji", value: v.profil.emoji, onInput: (x) => pub({ profil: { ...v.profil, emoji: x } }) }), h(ui.Input, { label: "Nom affiché", value: v.profil.nom, onInput: (x) => pub({ profil: { ...v.profil, nom: x } }) })),
        h("div", { class: "mt-3 space-y-3" }, h(ui.Textarea, { label: "Présentation", rows: 2, value: v.profil.bio, onInput: (x) => pub({ profil: { ...v.profil, bio: x } }) }), h(ui.Fichier, { label: "Photo", accept: "image/*", value: v.profil.photo, onChange: (f) => pub({ profil: { ...v.profil, photo: f } }) }),
          h("div", null, h("p", { class: "text-xs font-medium text-slate-500 mb-1" }, "Thème"), h(ui.Tabs, { valeur: v.theme, onChange: (t) => pub({ theme: t }), onglets: [["clair", "Clair"], ["sombre", "Sombre"], ["couleur", "Couleur"]] })))),
      h("div", { class: "space-y-2" }, v.blocs.map((b, i) => h("div", { key: b.id, class: cls("rounded-2xl border bg-white", ouv === b.id ? "border-[var(--c)]" : "border-slate-200", !b.actif && "opacity-60") },
        h("div", { class: "flex items-center gap-3 px-4 py-3" }, h("button", { class: "flex-1 min-w-0 text-left", onClick: () => setOuv(ouv === b.id ? null : b.id) }, h("span", { class: "block truncate font-medium" }, b.titre || b.texte || (TYPES_V.find((t) => t[0] === b.type) || [])[1]), h("span", { class: "block text-xs text-slate-400" }, (TYPES_V.find((t) => t[0] === b.type) || [])[1] + (b.type === "produit" && b.prix !== "" ? " · " + fmt.eur(Number(b.prix) || 0) : ""))),
          h("button", { class: "text-slate-400 hover:text-slate-700 px-1", title: "Monter", onClick: () => bouger(i, -1) }, "↑"), h("button", { class: "text-slate-400 hover:text-slate-700 px-1", title: "Descendre", onClick: () => bouger(i, 1) }, "↓"),
          h("label", { class: "flex items-center gap-1 text-xs text-slate-500" }, h("input", { type: "checkbox", checked: b.actif, onChange: () => maj(i, { actif: !b.actif }), class: "accent-[var(--c)]" }), "Visible")),
        ouv === b.id && h("div", { class: "space-y-3 border-t border-slate-100 px-4 py-4" },
          b.type !== "texte" && h(ui.Input, { label: b.type === "titre" ? "Titre de la section" : "Titre", value: b.titre, onInput: (x) => maj(i, { titre: x }) }),
          ["texte", "produit"].includes(b.type) && h(ui.Textarea, { label: b.type === "produit" ? "Description" : "Texte", rows: 2, value: b.texte, onInput: (x) => maj(i, { texte: x }) }),
          b.type === "produit" && h("div", { class: "grid sm:grid-cols-2 gap-3" }, h(ui.Input, { label: "Prix (€)", type: "number", value: b.prix, onInput: (x) => maj(i, { prix: x }) }), h(ui.Fichier, { label: "Image", accept: "image/*", value: b.image, onChange: (f) => maj(i, { image: f }) })),
          ["lien", "video", "produit"].includes(b.type) && h(ui.Input, { label: b.type === "produit" ? "Lien de paiement ou de commande" : "Adresse (https://…)", value: b.url, onInput: (x) => maj(i, { url: x }) }),
          h("div", { class: "flex justify-end" }, h(ui.Button, { variant: "danger", onClick: () => pub({ blocs: v.blocs.filter((_, k) => k !== i) }) }, "Retirer")))))),
      h("div", { class: "rounded-2xl border border-dashed border-slate-300 p-4" }, h("p", { class: "text-sm font-medium mb-2" }, "Ajouter"), h("div", { class: "flex flex-wrap gap-2" }, TYPES_V.map(([t, l]) => h("button", { key: t, onClick: () => ajouter(t), class: "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm hover:border-[var(--c)] hover:text-[var(--c)]" }, "+ " + l))))),
    h("div", { class: "lg:sticky lg:top-6" }, h("p", { class: "mb-2 text-center text-xs font-medium text-slate-500" }, "Aperçu en direct"), h("div", { class: "mx-auto w-[340px] h-[640px] overflow-y-auto rounded-[2.5rem] border-[10px] border-slate-900 shadow-xl bg-white" }, h(ui.Vitrine, { value: v }))));
};

// Toile de création (visuels, posts, affiches, bannières) : textes, formes, images ; sélectionner, déplacer, redimensionner, calques, export PNG
const FORMATS = [["post", "Post carré", 1080, 1080], ["story", "Story", 1080, 1920], ["affiche", "Affiche A4", 1240, 1754], ["banniere", "Bannière", 1500, 500], ["presentation", "Diapositive", 1920, 1080]];
const POLICES = [["Inter, system-ui, sans-serif", "Moderne"], ["Georgia, serif", "Élégante"], ["'Courier New', monospace", "Machine"], ["Impact, 'Arial Black', sans-serif", "Impact"]];
const TEINTES_T = ["#0f172a", "#ffffff", "#ef4444", "#f97316", "#eab308", "#22c55e", "#0ea5e9", "#6366f1", "#a855f7", "#ec4899", "#94a3b8"];
const versToile = (v) => { const x = v && typeof v === "object" ? v : {}; return { largeur: Number(x.largeur) || 1080, hauteur: Number(x.hauteur) || 1080, fond: x.fond || "#ffffff", elements: (Array.isArray(x.elements) ? x.elements : []).map((e, k) => ({ id: e.id || "e" + (k + 1), type: ["texte", "rect", "cercle", "image"].includes(e.type) ? e.type : "texte", x: Number(e.x) || 0, y: Number(e.y) || 0, w: Number(e.w) || 300, h: Number(e.h) || 120, couleur: e.couleur || "#0f172a", texte: String(e.texte ?? ""), taille: Number(e.taille) || 64, police: e.police || POLICES[0][0], gras: !!e.gras, align: ["left", "center", "right"].includes(e.align) ? e.align : "center", src: e.src || "", opacite: e.opacite == null ? 1 : Number(e.opacite), arrondi: Number(e.arrondi) || 0 })) }; };
const televerser = async (f) => { if (f.size > 4.5e6) throw new Error("Image trop lourde (4,5 Mo au plus)"); const data = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(f); }); return await call("upload", { nom: f.name, type: f.type, data }); };
const lignesTexte = (ctx, t, w) => { const out = []; String(t).split(NL).forEach((par) => { let l = ""; par.split(" ").forEach((m) => { const essai = l ? l + " " + m : m; if (ctx.measureText(essai).width > w && l) { out.push(l); l = m; } else l = essai; }); out.push(l); }); return out; };
ui.Toile = ({ value, onChange, nomFichier = "visuel" }) => {
  const [t, setT] = useState(() => versToile(value)), [sel, setSel] = useState(null), [edit, setEdit] = useState(null);
  const zone = useRef(null), geste = useRef(null), minuteur = useRef(null), courant = useRef(t);
  courant.current = t;
  useEffect(() => { const v = versToile(value); if (JSON.stringify(v) !== JSON.stringify(courant.current) && !geste.current) setT(v); }, [JSON.stringify(value ?? null)]);
  const pub = (n, tout) => { const x = { ...courant.current, ...n }; setT(x); courant.current = x; clearTimeout(minuteur.current); minuteur.current = setTimeout(() => onChange?.(courant.current), tout ? 0 : 350); };
  const majE = (id, d) => pub({ elements: courant.current.elements.map((e) => e.id === id ? { ...e, ...d } : e) });
  const el = t.elements.find((e) => e.id === sel);
  const ajouter = (type, extra) => { const W = t.largeur, H = t.hauteur; const e = { id: nid(), type, x: W * 0.2, y: H * 0.35, w: W * 0.6, h: type === "texte" ? H * 0.12 : H * 0.3, couleur: type === "texte" ? "#0f172a" : TEINTES_T[6], texte: type === "texte" ? "Votre texte" : "", taille: Math.round(W / 14), police: POLICES[0][0], gras: type === "texte", align: "center", src: "", opacite: 1, arrondi: type === "rect" ? 24 : 0, ...(extra || {}) }; if (type === "cercle") { e.w = e.h = Math.min(W, H) * 0.35; e.x = (W - e.w) / 2; } pub({ elements: [...t.elements, e] }); setSel(e.id); };
  const echelle = () => { const r = zone.current?.getBoundingClientRect(); return r ? t.largeur / r.width : 1; };
  const debut = (e, id, mode) => { e.stopPropagation(); e.preventDefault(); setSel(id); setEdit(null); const x = t.elements.find((k) => k.id === id); geste.current = { id, mode, sx: e.clientX, sy: e.clientY, o: { ...x }, k: echelle() }; window.addEventListener("pointermove", bouge); window.addEventListener("pointerup", fin, { once: true }); };
  const bouge = (e) => { const g = geste.current; if (!g) return; const dx = (e.clientX - g.sx) * g.k, dy = (e.clientY - g.sy) * g.k; if (g.mode === "deplacer") majE(g.id, { x: Math.round(g.o.x + dx), y: Math.round(g.o.y + dy) }); else { const w = Math.max(20, Math.round(g.o.w + dx)), hh = Math.max(20, Math.round(g.o.h + dy)); majE(g.id, g.o.type === "cercle" ? { w, h: w } : { w, h: hh }); } };
  const fin = () => { window.removeEventListener("pointermove", bouge); geste.current = null; onChange?.(courant.current); };
  const calque = (d) => { const i = t.elements.findIndex((e) => e.id === sel); const j = i + d; if (i < 0 || j < 0 || j >= t.elements.length) return; const n = [...t.elements]; const [x] = n.splice(i, 1); n.splice(j, 0, x); pub({ elements: n }); };
  const exporter = async () => {
    const c = document.createElement("canvas"); c.width = t.largeur; c.height = t.hauteur; const ctx = c.getContext("2d");
    ctx.fillStyle = t.fond; ctx.fillRect(0, 0, c.width, c.height);
    for (const e of t.elements) {
      ctx.save(); ctx.globalAlpha = e.opacite;
      if (e.type === "rect") { ctx.fillStyle = e.couleur; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(e.x, e.y, e.w, e.h, e.arrondi); else ctx.rect(e.x, e.y, e.w, e.h); ctx.fill(); }
      else if (e.type === "cercle") { ctx.fillStyle = e.couleur; ctx.beginPath(); ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2); ctx.fill(); }
      else if (e.type === "image" && e.src) { await new Promise((ok) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => { const r = Math.max(e.w / im.width, e.h / im.height), sw = e.w / r, sh = e.h / r; ctx.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, e.x, e.y, e.w, e.h); ok(); }; im.onerror = ok; im.src = e.src; }); }
      else if (e.type === "texte") { ctx.fillStyle = e.couleur; ctx.font = (e.gras ? "700 " : "400 ") + e.taille + "px " + e.police; ctx.textBaseline = "top"; ctx.textAlign = e.align; const ax = e.align === "center" ? e.x + e.w / 2 : e.align === "right" ? e.x + e.w : e.x; lignesTexte(ctx, e.texte, e.w).forEach((l, k) => ctx.fillText(l, ax, e.y + k * e.taille * 1.2)); }
      ctx.restore();
    }
    try { const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = nomFichier + ".png"; a.click(); toast("Image téléchargée"); } catch (x) { toast("Une image empêche l'export : remplacez-la par une image envoyée depuis votre ordinateur", "bad"); }
  };
  const k = 100 / t.largeur;
  const style = (e) => "left:" + e.x * k + "%;top:" + (e.y / t.hauteur) * 100 + "%;width:" + e.w * k + "%;height:" + (e.h / t.hauteur) * 100 + "%;opacity:" + e.opacite;
  const bouton = (l, f, actif, titre) => h("button", { onClick: f, title: titre || l, class: cls("rounded-lg px-2.5 py-1.5 text-sm", actif ? "bg-slate-900 text-white" : "hover:bg-slate-100") }, l);
  return h("div", { class: "space-y-3" },
    h("div", { class: "flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5" },
      bouton("T Texte", () => ajouter("texte")), bouton("▭ Forme", () => ajouter("rect")), bouton("● Cercle", () => ajouter("cercle")),
      h("label", { class: "rounded-lg px-2.5 py-1.5 text-sm hover:bg-slate-100 cursor-pointer" }, "🖼 Image", h("input", { type: "file", accept: "image/*", class: "hidden", onChange: async (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; try { const r = await televerser(f); ajouter("image", { src: r.url, couleur: "#000000" }); } catch (x) { toast(x.message, "bad"); } e.target.value = ""; } })),
      h("span", { class: "mx-1 h-6 w-px bg-slate-200" }),
      h("select", { class: "rounded-lg border-0 bg-transparent text-sm py-1.5", value: (FORMATS.find((f) => f[2] === t.largeur && f[3] === t.hauteur) || [""])[0], onChange: (e) => { const f = FORMATS.find((x) => x[0] === e.target.value); if (f) pub({ largeur: f[2], hauteur: f[3] }, true); } }, h("option", { value: "" }, t.largeur + " × " + t.hauteur), FORMATS.map(([id, l, w, hh]) => h("option", { key: id, value: id }, l + " (" + w + " × " + hh + ")"))),
      h("label", { class: "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 cursor-pointer" }, "Fond", h("input", { type: "color", value: t.fond, onInput: (e) => pub({ fond: e.target.value }), class: "w-6 h-6 rounded border-0 bg-transparent p-0" })),
      h("span", { class: "flex-1" }), h(ui.Button, { onClick: exporter }, "Télécharger en PNG")),
    el && h("div", { class: "flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5" },
      h("div", { class: "flex gap-1 px-1" }, TEINTES_T.map((c) => h("button", { key: c, onClick: () => majE(el.id, { couleur: c }), class: cls("w-6 h-6 rounded-full border", el.couleur === c ? "ring-2 ring-offset-1 ring-slate-900" : "border-slate-200"), style: "background:" + c, title: c })), h("input", { type: "color", value: el.couleur, onInput: (e) => majE(el.id, { couleur: e.target.value }), class: "w-6 h-6 rounded border-0 bg-transparent p-0", title: "Autre couleur" })),
      el.type === "texte" && h(Fragment, null, h("span", { class: "mx-1 h-6 w-px bg-slate-200" }), h("select", { class: "rounded-lg border-0 bg-transparent text-sm py-1.5", value: el.police, onChange: (e) => majE(el.id, { police: e.target.value }) }, POLICES.map(([v, l]) => h("option", { key: l, value: v }, l))),
        h("input", { type: "number", min: 8, max: 600, value: el.taille, onInput: (e) => majE(el.id, { taille: Number(e.target.value) || 12 }), class: "w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm", title: "Taille" }),
        bouton("G", () => majE(el.id, { gras: !el.gras }), el.gras, "Gras"), ["left", "center", "right"].map((a) => bouton(a === "left" ? "⟸" : a === "center" ? "≡" : "⟹", () => majE(el.id, { align: a }), el.align === a, "Alignement")), bouton("Modifier le texte", () => setEdit(el.id))),
      el.type === "rect" && h("label", { class: "flex items-center gap-1 px-2 text-sm text-slate-500" }, "Arrondi", h("input", { type: "range", min: 0, max: Math.round(Math.min(el.w, el.h) / 2), value: el.arrondi, onInput: (e) => majE(el.id, { arrondi: Number(e.target.value) }) })),
      h("label", { class: "flex items-center gap-1 px-2 text-sm text-slate-500" }, "Opacité", h("input", { type: "range", min: 10, max: 100, value: Math.round(el.opacite * 100), onInput: (e) => majE(el.id, { opacite: Number(e.target.value) / 100 }) })),
      h("span", { class: "flex-1" }), bouton("Avancer", () => calque(1), false, "Passer devant"), bouton("Reculer", () => calque(-1), false, "Passer derrière"),
      bouton("Dupliquer", () => { const c = { ...el, id: nid(), x: el.x + 30, y: el.y + 30 }; pub({ elements: [...t.elements, c] }); setSel(c.id); }), h("button", { class: "rounded-lg px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-50", onClick: () => { pub({ elements: t.elements.filter((e) => e.id !== el.id) }); setSel(null); } }, "Supprimer")),
    h("div", { class: "rounded-2xl bg-slate-100 p-4 sm:p-8 grid place-items-center", onPointerDown: () => { setSel(null); setEdit(null); } },
      h("div", { ref: zone, class: "relative w-full shadow-lg overflow-hidden select-none", style: "max-width:" + Math.round(t.largeur >= t.hauteur ? 760 : Math.max(280, 620 * t.largeur / t.hauteur)) + "px;aspect-ratio:" + t.largeur + "/" + t.hauteur + ";background:" + t.fond + ";container-type:inline-size" },
        t.elements.map((e) => h("div", { key: e.id, onPointerDown: (ev) => debut(ev, e.id, "deplacer"), onDblClick: () => e.type === "texte" && setEdit(e.id), class: cls("absolute cursor-move", sel === e.id && "outline outline-2 outline-sky-500"), style: style(e) },
          e.type === "rect" ? h("div", { class: "w-full h-full", style: "background:" + e.couleur + ";border-radius:" + (e.arrondi * k) + "cqw" })
          : e.type === "cercle" ? h("div", { class: "w-full h-full rounded-full", style: "background:" + e.couleur })
          : e.type === "image" ? (e.src ? h("img", { src: e.src, draggable: false, class: "w-full h-full object-cover pointer-events-none" }) : h("div", { class: "w-full h-full bg-slate-200" }))
          : edit === e.id ? h("textarea", { ref: (n) => { if (n && document.activeElement !== n) { n.focus(); n.select(); } }, value: e.texte, onPointerDown: (ev) => ev.stopPropagation(), onInput: (ev) => majE(e.id, { texte: ev.target.value }), onBlur: () => setEdit(null), class: "w-full h-full resize-none bg-white/70 outline-none", style: "color:" + e.couleur + ";font-family:" + e.police + ";font-weight:" + (e.gras ? 700 : 400) + ";font-size:" + e.taille * k + "cqw;line-height:1.2;text-align:" + e.align })
          : h("div", { class: "w-full h-full whitespace-pre-wrap break-words", style: "color:" + e.couleur + ";font-family:" + e.police + ";font-weight:" + (e.gras ? 700 : 400) + ";font-size:" + e.taille * k + "cqw;line-height:1.2;text-align:" + e.align }, e.texte),
          sel === e.id && h("div", { onPointerDown: (ev) => debut(ev, e.id, "taille"), class: "absolute -right-2 -bottom-2 w-4 h-4 rounded-full bg-white border-2 border-sky-500 cursor-nwse-resize", title: "Redimensionner" })))),
      !t.elements.length && h("p", { class: "mt-4 text-sm text-slate-500" }, "Ajoutez un texte, une forme ou une image avec la barre ci-dessus.")),
    h("p", { class: "text-xs text-slate-400" }, "Glissez pour déplacer, tirez le rond bleu pour redimensionner, double-cliquez un texte pour l'écrire."));
};

// Tableau de projets (façon tableau de cartes) : colonnes personnalisables, cartes glissées d'une colonne à l'autre, détail de carte
// (description, responsable, échéance, étiquettes, liste de cases, commentaires), filtres et recherche. Tout le tableau tient dans une valeur.
const ETIQ = [["rouge", "#ef4444"], ["orange", "#f97316"], ["jaune", "#eab308"], ["vert", "#22c55e"], ["bleu", "#3b82f6"], ["violet", "#a855f7"]];
const versTableau = (v) => { const x = v && typeof v === "object" ? v : {}; const colonnes = (Array.isArray(x.colonnes) && x.colonnes.length ? x.colonnes : [{ nom: "À faire" }, { nom: "En cours" }, { nom: "Terminé" }]).map((c, k) => ({ id: c.id || "c" + (k + 1), nom: String(c.nom ?? "Colonne") }));
  return { colonnes, cartes: (Array.isArray(x.cartes) ? x.cartes : []).map((c, k) => ({ id: c.id || "k" + (k + 1), colonne: colonnes.some((o) => o.id === c.colonne) ? c.colonne : colonnes[0].id, titre: String(c.titre ?? ""), description: String(c.description ?? ""), responsable: String(c.responsable ?? ""), echeance: c.echeance || "", etiquettes: Array.isArray(c.etiquettes) ? c.etiquettes : [], cases: Array.isArray(c.cases) ? c.cases : [], commentaires: Array.isArray(c.commentaires) ? c.commentaires : [] })) }; };
ui.Tableau = ({ value, onChange, membres = [] }) => {
  const [t, setT] = useState(() => versTableau(value)), [ouv, setOuv] = useState(null), [ajout, setAjout] = useState(null), [filtre, setFiltre] = useState({ q: "", etiq: "", resp: "", retard: false }), [glisse, setGlisse] = useState(null), [nouvCol, setNouvCol] = useState(""), [com, setCom] = useState("");
  const courant = useRef(t); courant.current = t;
  useEffect(() => { const v = versTableau(value); if (JSON.stringify(v) !== JSON.stringify(courant.current)) setT(v); }, [JSON.stringify(value ?? null)]);
  const pub = (n) => { const x = { ...courant.current, ...n }; setT(x); courant.current = x; onChange?.(x); };
  const majC = (id, d) => pub({ cartes: courant.current.cartes.map((c) => c.id === id ? { ...c, ...d } : c) });
  const auj = new Date().toISOString().slice(0, 10);
  const visibles = (col) => t.cartes.filter((c) => c.colonne === col && (!filtre.q || (c.titre + " " + c.description).toLowerCase().includes(filtre.q.toLowerCase())) && (!filtre.etiq || c.etiquettes.includes(filtre.etiq)) && (!filtre.resp || c.responsable === filtre.resp) && (!filtre.retard || (c.echeance && c.echeance < auj)));
  const deposer = (col, avantId) => { if (!glisse) return; const reste = t.cartes.filter((c) => c.id !== glisse); const c = { ...t.cartes.find((x) => x.id === glisse), colonne: col }; const i = avantId ? reste.findIndex((x) => x.id === avantId) : -1; if (i < 0) reste.push(c); else reste.splice(i, 0, c); setGlisse(null); pub({ cartes: reste }); };
  const resp = [...new Set([...membres, ...t.cartes.map((c) => c.responsable).filter(Boolean)])];
  const carte = t.cartes.find((c) => c.id === ouv);
  const pastille = (actif, l, f) => h("button", { onClick: f, class: cls("rounded-full px-3 py-1 text-xs font-medium border", actif ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300") }, l);
  return h("div", { class: "space-y-3" },
    h("div", { class: "flex flex-wrap items-center gap-2" },
      h("input", { class: "rounded-full border border-slate-200 bg-white px-3 py-1 text-sm outline-none focus:border-[var(--c)] w-44", placeholder: "Rechercher une carte", value: filtre.q, onInput: (e) => setFiltre({ ...filtre, q: e.target.value }) }),
      ETIQ.map(([n, c]) => h("button", { key: n, title: "Étiquette " + n, onClick: () => setFiltre({ ...filtre, etiq: filtre.etiq === n ? "" : n }), class: cls("w-6 h-4 rounded", filtre.etiq === n && "ring-2 ring-offset-1 ring-slate-900"), style: "background:" + c })),
      resp.map((r) => pastille(filtre.resp === r, r, () => setFiltre({ ...filtre, resp: filtre.resp === r ? "" : r }))),
      pastille(filtre.retard, "En retard", () => setFiltre({ ...filtre, retard: !filtre.retard }))),
    h("div", { class: "flex gap-3 overflow-x-auto pb-3 items-start" },
      t.colonnes.map((col, ci) => { const cs = visibles(col.id); return h("div", { key: col.id, class: "w-72 shrink-0 rounded-2xl bg-slate-100 p-2", onDragOver: (e) => e.preventDefault(), onDrop: () => deposer(col.id) },
        h("div", { class: "group flex items-center gap-1 px-1 pb-2" },
          h("input", { class: "flex-1 min-w-0 bg-transparent font-semibold text-sm outline-none rounded px-1 focus:bg-white", value: col.nom, onInput: (e) => pub({ colonnes: t.colonnes.map((x) => x.id === col.id ? { ...x, nom: e.target.value } : x) }) }),
          h("span", { class: "text-xs text-slate-400 px-1" }, t.cartes.filter((c) => c.colonne === col.id).length),
          h("button", { class: "hidden group-hover:block text-slate-400 hover:text-slate-700 text-xs px-1", title: "Déplacer à gauche", onClick: () => { if (!ci) return; const n = [...t.colonnes]; [n[ci - 1], n[ci]] = [n[ci], n[ci - 1]]; pub({ colonnes: n }); } }, "←"),
          h("button", { class: "hidden group-hover:block text-slate-400 hover:text-red-600 text-xs px-1", title: "Supprimer la colonne", onClick: async () => { if (t.colonnes.length < 2) return; const n = t.cartes.filter((c) => c.colonne === col.id).length; if (n && !(await demander("Supprimer « " + col.nom + " » et ses " + n + " cartes ?", { ok: "Supprimer", danger: true }))) return; pub({ colonnes: t.colonnes.filter((x) => x.id !== col.id), cartes: t.cartes.filter((c) => c.colonne !== col.id) }); } }, "×")),
        h("div", { class: "space-y-2 min-h-[8px]" }, cs.map((c) => { const faits = c.cases.filter((x) => x.fait).length; return h("div", { key: c.id, draggable: true, onDragStart: () => setGlisse(c.id), onDragEnd: () => setGlisse(null), onDrop: (e) => { e.stopPropagation(); deposer(col.id, c.id); }, onClick: () => setOuv(c.id), class: cls("cursor-pointer rounded-xl bg-white p-3 shadow-sm border border-slate-200 hover:border-slate-300", glisse === c.id && "opacity-40") },
          c.etiquettes.length > 0 && h("div", { class: "flex gap-1 mb-1.5" }, c.etiquettes.map((n) => h("span", { key: n, class: "h-1.5 w-8 rounded-full", style: "background:" + ((ETIQ.find((x) => x[0] === n) || [0, "#94a3b8"])[1]) }))),
          h("p", { class: "text-sm font-medium leading-snug" }, c.titre),
          !!(c.echeance || c.cases.length || c.responsable || c.description || c.commentaires.length) && h("div", { class: "mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500" },
            c.echeance && h("span", { class: cls("rounded px-1.5 py-0.5", c.echeance < auj && faits < c.cases.length + 1 ? "bg-red-100 text-red-700" : "bg-slate-100") }, "⏱ " + fmt.date(c.echeance)),
            c.cases.length > 0 && h("span", { class: cls("rounded px-1.5 py-0.5", faits === c.cases.length ? "bg-emerald-100 text-emerald-700" : "bg-slate-100") }, "☑ " + faits + "/" + c.cases.length),
            c.description && h("span", null, "≡"), c.commentaires.length > 0 && h("span", null, "💬 " + c.commentaires.length),
            c.responsable && h("span", { class: "ml-auto grid w-6 h-6 place-items-center rounded-full bg-[var(--c)] text-white text-[10px] font-bold", title: c.responsable }, c.responsable.split(" ").map((m) => m[0]).join("").slice(0, 2).toUpperCase()))); })),
        ajout === col.id ? h("div", { class: "mt-2" }, h("textarea", { class: champ, rows: 2, placeholder: "Titre de la carte", ref: (n) => n && document.activeElement !== n && n.focus(), onKeyDown: (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const v = e.target.value.trim(); if (v) { pub({ cartes: [...t.cartes, versTableau({ colonnes: t.colonnes, cartes: [{ id: nid(), colonne: col.id, titre: v }] }).cartes[0]] }); e.target.value = ""; } } if (e.key === "Escape") setAjout(null); } }), h("div", { class: "mt-1 flex gap-2" }, h("button", { class: "text-xs text-slate-500 hover:text-slate-800", onClick: () => setAjout(null) }, "Fermer (Entrée pour ajouter)")))
          : h("button", { class: "mt-2 w-full rounded-lg px-2 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-200", onClick: () => setAjout(col.id) }, "+ Ajouter une carte")); }),
      h("div", { class: "w-64 shrink-0 rounded-2xl border-2 border-dashed border-slate-200 p-2" }, h("input", { class: champ, placeholder: "+ Nouvelle colonne", value: nouvCol, onInput: (e) => setNouvCol(e.target.value), onKeyDown: (e) => { if (e.key === "Enter" && nouvCol.trim()) { pub({ colonnes: [...t.colonnes, { id: nid(), nom: nouvCol.trim() }] }); setNouvCol(""); } } }))),
    h(ui.Modal, { open: !!carte, onClose: () => setOuv(null), titre: carte ? carte.titre || "Carte" : "", actions: carte && h(Fragment, null, h(ui.Button, { variant: "danger", onClick: () => { pub({ cartes: t.cartes.filter((c) => c.id !== carte.id) }); setOuv(null); } }, "Supprimer"), h(ui.Button, { onClick: () => setOuv(null) }, "Fermer")) },
      carte && h("div", { class: "space-y-4" },
        h(ui.Input, { label: "Titre", value: carte.titre, onInput: (v) => majC(carte.id, { titre: v }) }),
        h("div", { class: "grid sm:grid-cols-3 gap-3" }, h(ui.Select, { label: "Colonne", value: carte.colonne, options: t.colonnes.map((c) => [c.id, c.nom]), onChange: (v) => majC(carte.id, { colonne: v }) }), h(ui.Input, { label: "Responsable", value: carte.responsable, onInput: (v) => majC(carte.id, { responsable: v }) }), h(ui.Input, { label: "Échéance", type: "date", value: carte.echeance, onInput: (v) => majC(carte.id, { echeance: v }) })),
        h("div", null, h("p", { class: "text-xs font-medium text-slate-500 mb-1" }, "Étiquettes"), h("div", { class: "flex gap-1.5" }, ETIQ.map(([n, c]) => h("button", { key: n, title: n, onClick: () => majC(carte.id, { etiquettes: carte.etiquettes.includes(n) ? carte.etiquettes.filter((x) => x !== n) : [...carte.etiquettes, n] }), class: cls("w-10 h-6 rounded", carte.etiquettes.includes(n) ? "ring-2 ring-offset-1 ring-slate-900" : "opacity-50"), style: "background:" + c })))),
        h(ui.Textarea, { label: "Description", rows: 3, value: carte.description, onInput: (v) => majC(carte.id, { description: v }) }),
        h("div", null, h("div", { class: "flex items-center justify-between mb-1" }, h("p", { class: "text-xs font-medium text-slate-500" }, "Liste de tâches"), carte.cases.length > 0 && h("span", { class: "text-xs text-slate-400" }, Math.round(carte.cases.filter((x) => x.fait).length / carte.cases.length * 100) + " %")),
          carte.cases.length > 0 && h("div", { class: "h-1.5 rounded-full bg-slate-100 mb-2 overflow-hidden" }, h("div", { class: "h-full bg-[var(--c)]", style: "width:" + (carte.cases.filter((x) => x.fait).length / carte.cases.length * 100) + "%" })),
          carte.cases.map((x, k) => h("label", { key: k, class: "flex items-center gap-2 py-1 text-sm" }, h("input", { type: "checkbox", checked: !!x.fait, class: "accent-[var(--c)] w-4 h-4", onChange: () => majC(carte.id, { cases: carte.cases.map((y, j) => j === k ? { ...y, fait: !y.fait } : y) }) }), h("span", { class: cls("flex-1", x.fait && "line-through text-slate-400") }, x.texte), h("button", { class: "text-slate-300 hover:text-red-500", onClick: (e) => { e.preventDefault(); majC(carte.id, { cases: carte.cases.filter((_, j) => j !== k) }); } }, "×"))),
          h("input", { class: champ + " mt-1", placeholder: "+ Ajouter une tâche (Entrée)", onKeyDown: (e) => { if (e.key === "Enter" && e.target.value.trim()) { majC(carte.id, { cases: [...carte.cases, { texte: e.target.value.trim(), fait: false }] }); e.target.value = ""; } } })),
        h("div", null, h("p", { class: "text-xs font-medium text-slate-500 mb-1" }, "Commentaires"), carte.commentaires.map((m, k) => h("div", { key: k, class: "mb-2 rounded-xl bg-slate-50 px-3 py-2 text-sm" }, h("p", { class: "text-xs text-slate-400" }, (m.auteur || "Vous") + " · " + fmt.dateHeure(m.at)), h("p", null, m.texte))),
          h("div", { class: "flex gap-2" }, h("input", { class: champ, placeholder: "Écrire un commentaire", value: com, onInput: (e) => setCom(e.target.value) }), h(ui.Button, { onClick: () => { if (!com.trim()) return; majC(carte.id, { commentaires: [...carte.commentaires, { texte: com.trim(), auteur: (typeof user !== "undefined" && user?.nom) || "Vous", at: new Date().toISOString() }] }); setCom(""); } }, "Envoyer"))))));
};
`;
