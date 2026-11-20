// Gestes d'un vrai utilisateur, joués par le robot avant livraison sur chaque écran d'un SaaS livré (mode vérification,
// données d'exemple en mémoire). Idée reprise de Craft Anything (parcours scriptés), réécrite pour la coque Bingoo! :
// on ne se contente plus de voir l'écran rempli, on vérifie qu'il marche quand on clique.
// - « Ajouter / Nouveau / Créer… » : le bouton réagit, le formulaire se remplit et l'enregistrement a bien lieu ;
// - les autres boutons d'action font quelque chose (pas de bouton décoratif) ;
// - aucune erreur ne survient pendant ces gestes.
// Injecté tel quel dans la coque (String.raw : ni accent grave ni dollar-accolade dans ce code).
export const CODE_VERIF_GESTES = String.raw`
const VAPPELS = { add: 0, update: 0, remove: 0, autre: 0 };
const gPause = (ms) => new Promise((r) => setTimeout(r, ms));
const gVisible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; };
const gLibelle = (el) => String(el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "").replace(/\s+/g, " ").trim().slice(0, 40);
// Jamais cliqués : ce qui détruit, quitte, télécharge, copie, imprime ou ouvre un autre site
const G_EVITER = /supprim|effac|retir|d[ée]connex|quitter|annuler|fermer|r[ée]initialis|recommencer|vider|^[✕×x]$|copier|export|t[ée]l[ée]charg|imprim|partag|pdf|csv|stripe|payer|abonn|google|outlook|ical/i;
const G_CREER = /^\+|^(ajouter|nouveau|nouvelle|cr[ée]er|ajout|r[ée]server|prendre rendez|d[ée]marrer|commencer)/i;
const G_VALIDER = /enregistr|ajouter|cr[ée]er|valider|envoyer|confirmer|r[ée]server|sauvegard|publier|^ok$|terminer|continuer/i;
const G_REFUS = /obligatoire|requis|invalide|renseign|au moins|format/i;

// Ce que voit l'utilisateur : le texte et les valeurs des champs (une valeur changée ne déclenche pas d'observateur)
const gEtat = () => document.body.innerText + "|" + [...document.querySelectorAll("input, textarea, select")].map((x) => x.value).join("|");
// Ferme la fenêtre ouverte par un geste (bouton Fermer / Annuler / ×, sinon Échap), pour que le geste suivant parte d'un écran propre
async function gFermer() {
  const cadres = [...document.querySelectorAll("[role=dialog], [aria-modal=true], .fixed")].filter(gVisible);
  for (const c of cadres.reverse()) {
    const f = [...c.querySelectorAll("button")].find((b) => gVisible(b) && /^(fermer|annuler|×|✕|x)$/i.test(gLibelle(b)));
    if (f) { try { f.click(); } catch (e) {} await gPause(150); return; }
  }
  gEchap(); await gPause(120);
}
async function gCliquer(el, ms) {
  let mut = 0; const e0 = gEtat();
  const obs = new MutationObserver((l) => { mut += l.length; });
  obs.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
  const avant = { ...VAPPELS }, v0 = VERRS.length, h0 = location.hash;
  try { el.click(); } catch (e) { VERRS.push(String(e && e.message || e)); }
  await gPause(ms);
  obs.disconnect();
  const appels = Object.keys(VAPPELS).some((k) => VAPPELS[k] !== avant[k]) || location.hash !== h0 || gEtat() !== e0;
  const erreur = VERRS.length > v0 ? VERRS.splice(v0).join(" ").slice(0, 200) : null;
  return { mut, appels, erreur };
}
function gEchap() { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); }

let gRang = 0;
function gValeur(el) {
  const t = String(el.type || "").toLowerCase(), now = new Date(Date.now() + gRang * 864e5).toISOString();
  gRang++;
  if (el.tagName === "SELECT") { const o = [...el.options].find((o) => o.value && !o.disabled); return o ? o.value : null; }
  if (t === "email") return "essai@exemple.fr";
  if (t === "number") return String(el.min && Number(el.min) > 0 ? el.min : 12);
  if (t === "date") return now.slice(0, 10);
  if (t === "datetime-local") return now.slice(0, 16);
  if (t === "month") return now.slice(0, 7);
  if (t === "time") return String(9 + (gRang % 8)).padStart(2, "0") + ":00";
  if (t === "tel") return "0612345678";
  if (t === "url") return "https://exemple.fr";
  return "Essai Bingoo";
}
async function gRemplir(racine) {
  let n = 0; gRang = 0;
  for (const el of racine.querySelectorAll("input, textarea, select")) {
    const t = String(el.type || "").toLowerCase();
    if (!gVisible(el) || el.disabled || el.readOnly || ["hidden", "file", "checkbox", "radio", "submit", "button", "range", "color", "search"].includes(t)) continue;
    if (el.tagName !== "SELECT" && el.value) continue;
    const v = gValeur(el); if (v == null) continue;
    const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    n++;
    // Laisser l'écran se mettre à jour entre deux champs (sinon un état périmé efface le champ précédent, comme jamais chez un humain)
    await gPause(90);
  }
  await gPause(120);
  return n;
}
// Les boutons groupés par 3 ou plus (onglets, filtres, segments) ne sont pas jugés : celui qui est déjà actif ne change rien, c'est normal
const gGroupe = (b) => { const p = b.parentElement; return !!p && [...p.children].filter((c) => c.tagName === "BUTTON" || c.getAttribute("role") === "button" || c.getAttribute("role") === "tab").length >= 3; };

async function gestesEcran(zone) {
  const pbs = [];
  const boutons = () => [...zone.querySelectorAll("button, [role=button]")].filter((b) => gVisible(b) && !b.disabled && !G_EVITER.test(gLibelle(b)));
  const teste = new Set();

  // 1. Créer quelque chose : le geste principal de presque tous les SaaS
  const creer = boutons().find((b) => G_CREER.test(gLibelle(b)) && !b.closest("form"));
  if (creer) {
    const nom = gLibelle(creer) || "Ajouter"; teste.add(nom);
    const add0 = VAPPELS.add + VAPPELS.update;
    const r = await gCliquer(creer, 550);
    if (r.erreur) pbs.push("Une erreur survient quand on clique sur « " + nom + " » : " + r.erreur);
    else if (!r.mut && !r.appels) pbs.push("Le bouton « " + nom + " » ne fait rien quand on clique dessus.");
    else if (VAPPELS.add + VAPPELS.update === add0) {
      const cadres = [...document.querySelectorAll("form, [role=dialog], [aria-modal=true], .fixed")].filter((f) => gVisible(f) && f.querySelector("input, textarea, select"));
      const racine = cadres.length ? cadres[cadres.length - 1] : zone;
      if (await gRemplir(racine)) {
        const cands = [...racine.querySelectorAll("button, [type=submit]")].filter((b) => gVisible(b) && !b.disabled && !G_EVITER.test(gLibelle(b))).reverse();
        const ok = cands.find((b) => G_VALIDER.test(gLibelle(b))) || cands.find((b) => b.type === "submit" && gLibelle(b).length > 1);
        const form = racine.tagName === "FORM" ? racine : racine.querySelector("form");
        if (ok && !(form && form.checkValidity && !form.checkValidity())) {
          // Refus de l'écran (message en rouge, alerte, mot « obligatoire »…) : nos valeurs d'essai ne conviennent pas, ce n'est pas une panne
          const nRefus = () => (document.body.innerText.match(new RegExp(G_REFUS.source, "gi")) || []).length + document.querySelectorAll(".bg-red-600, .bg-red-500, .text-red-600, .text-red-700, .text-rose-600, [role=alert]").length;
          const refus0 = nRefus();
          const r2 = await gCliquer(ok, 800);
          if (r2.erreur) pbs.push("Le formulaire ouvert par « " + nom + " » renvoie une erreur à l'enregistrement : " + r2.erreur);
          else if (VAPPELS.add + VAPPELS.update === add0 && nRefus() <= refus0) pbs.push("Le formulaire ouvert par « " + nom + " » est rempli puis validé (« " + (gLibelle(ok) || "Enregistrer") + " »), mais rien n'est enregistré.");
        }
      }
    }
    await gFermer();
  }

  // 2. Les autres boutons d'action doivent faire quelque chose (pas de bouton décoratif) ; les champs de l'écran sont d'abord remplis,
  // comme le ferait l'utilisateur avant de cliquer sur « Calculer », « Générer »…
  await gRemplir(zone);
  const morts = [];
  for (const b of boutons().slice(0, 12)) {
    const nom = gLibelle(b);
    if (!nom || teste.has(nom) || gGroupe(b) || b.getAttribute("role") === "tab" || b.closest("form") || b.getAttribute("aria-pressed") === "true" || b.getAttribute("aria-selected") === "true") continue;
    if (!b.isConnected) continue;
    teste.add(nom);
    const r = await gCliquer(b, 350);
    if (r.erreur) pbs.push("Une erreur survient quand on clique sur « " + nom + " » : " + r.erreur);
    else if (!r.mut && !r.appels) morts.push(nom);
    await gFermer();
    if (teste.size >= 8) break;
  }
  if (morts.length) pbs.push("Ces boutons ne font rien quand on clique dessus : « " + morts.slice(0, 4).join(" », « ") + " ». Branche-les sur une vraie action, ou retire-les.");
  return pbs;
}
`;
