// Bingoo! — actions LinkedIn jouées dans l'onglet du profil, avec la session LinkedIn du client.
// Lu par l'extension (chrome.scripting) : définit window.__bingooLi(action) → { resultat, detail }.
// Prudence : on lit le texte visible plutôt que des classes CSS, on tape comme un humain et on s'arrête au moindre signal de LinkedIn.
(() => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = (a, b) => sleep(a + Math.random() * (b - a));
  const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const label = (el) => norm(`${el.getAttribute("aria-label") ?? ""} ${el.innerText ?? el.textContent ?? ""}`);

  const LIMIT = /limite (hebdomadaire|d'invitations)|weekly invitation limit|invitation limit|vous avez atteint la limite|reached the (weekly )?limit/i;
  const WARN = /activité inhabituelle|unusual activity|compte (a été )?restreint|account (has been )?restricted|temporairement restreint|vérifi(ez|cation) (que vous|de sécurité)|security verification|captcha|let'?s do a quick security check/i;
  const MISSING = /cette page n'existe pas|page (introuvable|not found)|this page doesn'?t exist|profil (n'est )?pas disponible|profile (is )?not available/i;

  /** Bloc du haut du profil (nom, boutons) ; à défaut, la page entière. */
  function topCard() {
    const h1 = [...document.querySelectorAll("main h1")].find(visible);
    let el = h1;
    for (let i = 0; el && i < 8; i++, el = el.parentElement) if (el.querySelectorAll("button").length >= 2) return el;
    return document.querySelector("main") ?? document.body;
  }
  const buttons = (root) => [...root.querySelectorAll("button, a[role='button'], div[role='button'], a[href*='/messaging/']")].filter(visible);
  const find = (root, re) => buttons(root).find((b) => re.test(label(b)));

  function alertText() {
    const zones = [...document.querySelectorAll("[role='dialog'], [role='alert'], .artdeco-modal, .artdeco-toast-item")].filter(visible);
    return zones.map((z) => z.innerText).join(" ");
  }
  function danger() {
    const t = `${alertText()} ${document.title}`;
    if (LIMIT.test(t)) return { resultat: "limite", detail: "LinkedIn signale une limite d'invitations" };
    if (WARN.test(t) || /checkpoint|challenge|authwall|login/.test(location.pathname)) return { resultat: "avertissement", detail: "LinkedIn demande une vérification" };
    return null;
  }
  async function waitFor(fn, ms = 12000) {
    const end = Date.now() + ms;
    while (Date.now() < end) { const v = fn(); if (v) return v; await sleep(300); }
    return null;
  }
  async function click(el) { el.scrollIntoView?.({ block: "center" }); await jitter(500, 1300); el.click(); await jitter(900, 1800); }
  async function typeInto(el, text) {
    el.focus();
    if (el.isContentEditable) {
      for (const part of text.match(/[\s\S]{1,12}/g) ?? []) { document.execCommand("insertText", false, part); await jitter(40, 160); }
    } else {
      const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
      let v = "";
      for (const part of text.match(/[\s\S]{1,8}/g) ?? []) { v += part; set ? set.call(el, v) : (el.value = v); el.dispatchEvent(new Event("input", { bubbles: true })); await jitter(40, 160); }
    }
    await jitter(600, 1400);
  }

  /** Lien de la personne : 1er niveau (connectée), invitation en attente, ou rien. */
  function relation(card) {
    if (find(card, /^(en attente|pending)\b|retirer l'invitation|withdraw/)) return "en_attente";
    // Badge de relation « · 1er » (ou « Relation de 1er niveau ») lu élément par élément
    const first = [...card.querySelectorAll("span, div, li")].some((el) => {
      const t = norm(el.textContent);
      return (t.length < 40 && /^(·\s*)?(1er|1st)\b/.test(t)) || /relation de 1er niveau|1st degree/.test(norm(el.getAttribute("aria-label")));
    });
    if (first) return "connecte";
    return "aucune";
  }

  async function invitation(card, note) {
    const rel = relation(card);
    if (rel === "en_attente") return { resultat: "deja_invite" };
    if (rel === "connecte") return { resultat: "deja_connecte" };
    let btn = find(card, /^(se connecter|connect)\b|inviter .* à rejoindre|invite .* to connect/);
    if (!btn) {
      const more = find(card, /^(plus|more)\b|plus d'actions|more actions/);
      if (more) { await click(more); btn = await waitFor(() => buttons(document).find((b) => /(se connecter|connect)\b|inviter .* à rejoindre|invite .* to connect/.test(label(b)) && !/déconnect|disconnect/.test(label(b))), 4000); }
    }
    if (!btn) return { resultat: "erreur", detail: "Bouton « Se connecter » introuvable" };
    await click(btn);
    const d = danger(); if (d) return d;
    const dialog = await waitFor(() => [...document.querySelectorAll("[role='dialog'], .artdeco-modal")].find(visible), 6000);
    if (!dialog) return { resultat: "erreur", detail: "Fenêtre d'invitation absente" };
    if (note) {
      const add = find(dialog, /ajouter une note|add a note/);
      if (add) await click(add);
      const area = await waitFor(() => dialog.querySelector("textarea") ?? document.querySelector("[role='dialog'] textarea"), 4000);
      if (!area) return { resultat: "erreur", detail: "Champ de note introuvable, rien n'a été envoyé" };
      await typeInto(area, note.slice(0, 300));
    }
    // Avec une note : le bouton « Envoyer » de la note, jamais « Envoyer sans note »
    const sendRe = note ? /^(envoyer|send)( l'invitation| invitation| now)?$/ : /^(envoyer|send)\b/;
    const send = await waitFor(() => buttons(dialog).find((b) => sendRe.test(label(b)) && !/sans note|without a note/.test(label(b))), 4000)
      ?? (!note ? await waitFor(() => find(dialog, /envoyer sans note|send without a note/), 2000) : null);
    if (!send || send.disabled) return { resultat: "erreur", detail: "Bouton « Envoyer » indisponible" };
    await click(send);
    await jitter(1500, 2500);
    return danger() ?? { resultat: "ok" };
  }

  /** La personne a-t-elle déjà répondu dans la conversation ouverte ? */
  function replied(scope, firstName) {
    if (scope.querySelector(".msg-s-event-listitem--other")) return true;
    const fn = norm(firstName);
    return !!fn && [...scope.querySelectorAll(".msg-s-message-group__name, .msg-s-message-group__profile-link")].some((n) => norm(n.textContent).startsWith(fn));
  }

  async function message(card, text, relance = false, firstName = "") {
    // Jamais d'InMail : on n'écrit qu'aux personnes déjà connectées (1er niveau)
    if (relation(card) !== "connecte") return { resultat: "en_attente", detail: "Pas encore connecté" };
    const btn = find(card, /^message\b|envoyer un message/);
    if (!btn) return { resultat: "erreur", detail: "Bouton « Message » introuvable" };
    await click(btn);
    const box = await waitFor(() => [...document.querySelectorAll("[contenteditable='true'][role='textbox'], .msg-form__contenteditable, form textarea")].filter(visible).pop(), 8000);
    if (!box) return danger() ?? { resultat: "erreur", detail: "Zone de message absente" };
    const form = box.closest("form") ?? box.closest("[role='dialog']") ?? document;
    if (relance) {
      // Relance seulement sans réponse : on lit d'abord la conversation
      await jitter(1200, 2500);
      const convo = box.closest(".msg-overlay-conversation-bubble, .msg-convo-wrapper, [role='dialog']") ?? document;
      if (replied(convo, firstName)) return { resultat: "repondu" };
    }
    if (norm(box.innerText || box.value)) return { resultat: "erreur", detail: "Un brouillon existe déjà, rien n'a été envoyé" };
    await typeInto(box, text);
    const send = await waitFor(() => buttons(form).find((b) => /^(envoyer|send)$/.test(label(b)) && !b.disabled), 4000);
    if (!send) return { resultat: "erreur", detail: "Bouton « Envoyer » indisponible" };
    await click(send);
    return danger() ?? { resultat: "ok" };
  }

  window.__bingooLi = async (action) => {
    try {
      await jitter(2000, 4000); // lecture de la page, comme une personne
      const early = danger(); if (early) return early;
      if (MISSING.test(document.body.innerText.slice(0, 3000))) return { resultat: "introuvable" };
      const ready = await waitFor(() => [...document.querySelectorAll("main h1")].find(visible), 15000);
      if (!ready) return danger() ?? { resultat: "erreur", detail: "Profil non chargé" };
      window.scrollBy(0, 200 + Math.random() * 300); await jitter(800, 1600); window.scrollTo(0, 0); await jitter(400, 900);
      const card = topCard();
      if (action.type === "invitation") return await invitation(card, action.note);
      if (action.type === "verifier") { const r = relation(card); return { resultat: r === "connecte" ? "connecte" : "en_attente" }; }
      if (action.type === "message") return await message(card, action.message);
      if (action.type === "relance") return await message(card, action.message, true, String(action.personne ?? "").split(/\s+/)[0]);
      return { resultat: "erreur", detail: "Action inconnue" };
    } catch (e) {
      return { resultat: "erreur", detail: String(e?.message ?? e).slice(0, 200) };
    }
  };
})();
