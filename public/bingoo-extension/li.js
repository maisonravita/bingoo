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
      // Compte gratuit : LinkedIn limite les notes personnalisées par mois et propose Premium à la place
      if (!area && /premium|invitations? personnalis[ée]es|personalized invitations?/i.test(alertText())) return { resultat: "limite", detail: "Quota mensuel de notes personnalisées atteint (compte LinkedIn gratuit)" };
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

  /** Visite du profil, la veille de l'invitation : on le lit tranquillement, comme une personne (rien n'est envoyé). */
  async function visite(card) {
    const rel = relation(card);
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) { window.scrollBy(0, 350 + Math.random() * 450); await jitter(1800, 3800); }
    window.scrollTo(0, 0); await jitter(600, 1200);
    return danger() ?? { resultat: rel === "connecte" ? "deja_connecte" : rel === "en_attente" ? "deja_invite" : "ok" };
  }

  /** Retrait d'une invitation restée sans réponse : bouton « En attente » (ou menu « Plus »), puis « Retirer ». */
  async function retirer(card) {
    const rel = relation(card);
    if (rel === "connecte") return { resultat: "connecte" };
    let btn = find(card, /^(en attente|pending)\b/);
    if (!btn) {
      const more = find(card, /^(plus|more)\b|plus d'actions|more actions/);
      if (more) { await click(more); btn = await waitFor(() => buttons(document).find((b) => /retirer l'invitation|withdraw invitation|^(en attente|pending)\b/.test(label(b))), 4000); }
    }
    if (!btn) return rel === "aucune" ? { resultat: "ok", detail: "Plus d'invitation en attente" } : { resultat: "erreur", detail: "Invitation en attente introuvable" };
    await click(btn);
    const dialog = await waitFor(() => [...document.querySelectorAll("[role='alertdialog'], [role='dialog'], .artdeco-modal")].find(visible), 6000);
    if (!dialog) return danger() ?? { resultat: "erreur", detail: "Fenêtre de retrait absente" };
    const ok = buttons(dialog).find((b) => /^(retirer|withdraw)$/.test(label(b)));
    if (!ok) return { resultat: "erreur", detail: "Bouton « Retirer » introuvable" };
    await click(ok);
    await jitter(1200, 2200);
    return danger() ?? { resultat: "ok" };
  }

  /** Recherche du profil d'un décideur (nom + entreprise) : on ne garde un profil que si le nom ET l'entreprise correspondent,
   *  et s'il n'y en a qu'un. Au moindre doute, rien n'est enregistré. Lecture seule : aucun clic sur un profil. */
  const plain = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const STOP = new Set(["sas", "sasu", "sarl", "eurl", "sa", "sci", "snc", "selarl", "scop", "groupe", "group", "france", "holding", "societe", "la", "le", "les", "de", "des", "du", "et", "the", "and", "cie", "co"]);
  async function trouver(action) {
    const COMMERCIAL = /limite d'utilisation commerciale|commercial use limit/i;
    const got = await waitFor(() => {
      const t = document.body.innerText.slice(0, 4000);
      if (COMMERCIAL.test(t)) return "limite";
      if (/aucun résultat|no results found/i.test(t)) return "vide";
      return [...document.querySelectorAll("main a[href*='/in/']")].some(visible) ? "ok" : null;
    }, 15000);
    if (got === "limite") return { resultat: "limite", detail: "Limite d'utilisation commerciale des recherches LinkedIn" };
    if (got !== "ok") return danger() ?? { resultat: "introuvable", detail: got === "vide" ? "Aucun résultat" : "Résultats non chargés" };
    await jitter(1500, 3000);
    const want = plain(action.personne).split(" ").filter((w) => w.length > 1);
    const firm = plain(action.entreprise).split(" ").filter((w) => w.length > 1 && !STOP.has(w));
    if (want.length < 2 || !firm.length) return { resultat: "introuvable", detail: "Nom ou entreprise trop court pour être sûr" };
    const key = firm.slice().sort((a, b) => b.length - a.length)[0];
    const hits = new Map();
    for (const a of document.querySelectorAll("main a[href*='/in/']")) {
      const slug = a.href.match(/linkedin\.com\/in\/([^/?#]{2,100})/)?.[1];
      if (!slug || !visible(a)) continue;
      const name = plain(a.querySelector("span[aria-hidden='true']")?.textContent || (a.innerText || "").split("\n")[0]);
      if (!name) continue;
      const words = name.split(" ");
      if (!want.every((w) => words.includes(w))) continue;
      const box = a.closest("li") ?? a.parentElement?.parentElement?.parentElement ?? a;
      const text = ` ${plain(box.innerText)} `;
      const compact = text.replace(/ /g, "");
      if (!(text.includes(` ${key} `) || (firm.join("").length >= 5 && compact.includes(firm.join(""))))) continue;
      hits.set(slug, name);
    }
    if (hits.size === 1) { const [slug] = hits.keys(); return { resultat: "ok", profil: `https://www.linkedin.com/in/${slug}`, detail: "Nom et entreprise vérifiés" }; }
    return { resultat: "introuvable", detail: hits.size > 1 ? "Plusieurs profils possibles, aucun enregistré" : "Pas de profil avec ce nom dans cette entreprise" };
  }

  /** Fiche Sales Navigator : on cherche le lien vers le profil LinkedIn classique, où se font les invitations. */
  async function salesRedirect() {
    const direct = () => [...document.querySelectorAll("a[href*='linkedin.com/in/'], a[href^='/in/']")].map((a) => a.href).find((h) => /\/in\/[^/?#]{2,}/.test(h));
    let href = await waitFor(direct, 4000);
    if (!href) {
      const more = buttons(document).find((b) => /plus d'actions|more actions|^\.\.\.$|ouvrir le menu|overflow/i.test(label(b)));
      if (more) { await click(more); href = await waitFor(direct, 4000); }
    }
    return href ? { redirect: href.split("?")[0] } : { resultat: "erreur", detail: "Lien vers le profil LinkedIn introuvable sur la fiche Sales Navigator" };
  }

  /** Messagerie : nom, extrait du dernier message et qui l'a écrit, pour chaque conversation visible (lecture seule). */
  window.__bingooInbox = async () => {
    await jitter(2500, 4500);
    const items = [...document.querySelectorAll(".msg-conversation-listitem, li.msg-conversations-container__convo-item, [data-view-name*='conversation'] li")].slice(0, 40);
    return items.map((li) => {
      const nom = norm(li.querySelector(".msg-conversation-listitem__participant-names, .msg-conversation-card__participant-names, h3")?.textContent ?? "");
      const snip = (li.querySelector(".msg-conversation-card__message-snippet, .msg-conversation-card__message-snippet-body, p")?.textContent ?? "").replace(/\s+/g, " ").trim();
      const de_moi = /^(vous|you)\s*:/i.test(snip);
      const lien = li.querySelector("a[href*='/messaging/thread/']")?.href ?? "";
      return { nom: (li.querySelector(".msg-conversation-listitem__participant-names, .msg-conversation-card__participant-names, h3")?.textContent ?? "").replace(/\s+/g, " ").trim(), extrait: snip.replace(/^[^:]{1,40}:\s*/, ""), de_moi, lien, _n: nom };
    }).filter((t) => t.nom && t.extrait).map(({ _n, ...t }) => t);
  };

  window.__bingooLi = async (action) => {
    try {
      await jitter(2000, 4000); // lecture de la page, comme une personne
      if (/\/sales\//.test(location.pathname)) return await salesRedirect();
      const early = danger(); if (early) return early;
      if (action.type === "trouver") return await trouver(action);
      if (MISSING.test(document.body.innerText.slice(0, 3000))) return { resultat: "introuvable" };
      const ready = await waitFor(() => [...document.querySelectorAll("main h1")].find(visible), 15000);
      if (!ready) return danger() ?? { resultat: "erreur", detail: "Profil non chargé" };
      window.scrollBy(0, 200 + Math.random() * 300); await jitter(800, 1600); window.scrollTo(0, 0); await jitter(400, 900);
      const card = topCard();
      if (action.type === "invitation") return await invitation(card, action.note);
      if (action.type === "visite") return await visite(card);
      if (action.type === "retirer") return await retirer(card);
      if (action.type === "verifier") { const r = relation(card); return { resultat: r === "connecte" ? "connecte" : "en_attente" }; }
      if (action.type === "message") return await message(card, action.message);
      if (action.type === "relance") return await message(card, action.message, true, String(action.personne ?? "").split(/\s+/)[0]);
      return { resultat: "erreur", detail: "Action inconnue" };
    } catch (e) {
      return { resultat: "erreur", detail: String(e?.message ?? e).slice(0, 200) };
    }
  };
})();
