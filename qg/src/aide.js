// L'aide de « Ton équipe cette nuit » : une petite notice sur chaque endroit qu'on peut survoler ou cliquer,
// la légende complète (bouton « ? ») et une visite guidée en 4 étapes à la première ouverture.
import { badgeSprite, signSprite } from './sprites.js';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Ce que veut dire chaque bulle (repris dans la carte, la légende et les notices). */
export const ETATS = {
  trouve: ['Repérée', "L'équipe l'a trouvée dans les registres, elle ne l'a pas encore étudiée."],
  lecture: ['En cours', 'Un membre de l’équipe l’étudie en ce moment.'],
  retenu: ['Client potentiel', 'Contact vérifié : on peut lui écrire.'],
  ecarte: ['À compléter', "Pas encore d'e-mail vérifié. Ce n'est pas un refus : lance « Chercher son e-mail » dans la fiche."],
  ecriture: ['Message en cours', 'Hugo ou Inès écrit le message.'],
  pret: ['Message prêt', 'Il attend ta validation. Rien ne part sans toi.'],
  envoye: ['E-mail envoyé', "Le premier e-mail ou une relance est parti."],
  repondu: ['A répondu', 'Inès a lu sa réponse. Ouvre la fiche pour la voir.'],
  li: ['LinkedIn', 'Lina a fait une action LinkedIn : invitation, acceptation ou message.'],
  rdv: ['Rendez-vous', 'Un rendez-vous dans les prochaines 24 heures. Paul a préparé la fiche.'],
  valide: ['Envoyé depuis la carte', 'Tu as envoyé ce message depuis sa fiche.'],
  opp: ['Opportunité du Radar', 'Un signal qui dit que c’est le bon moment : appel d’offres, levée, recrutement…'],
  rival: ['Concurrent (Espion)', 'Oscar surveille ce concurrent et dit ce qui a changé.'],
};
const ECRITEAUX = {
  prospect: ['Mallette orange', 'Une entreprise (un prospect).'],
  opp: ['Étoile dorée', 'Une opportunité du Radar, placée au siège de l’entreprise.'],
  rival: ['Drapeau rouge', 'Un concurrent suivi par l’Espion, placé à son siège.'],
};
export const MEMBRES = {
  Iris: 'Stratège. Elle lance la nuit et envoie l’équipe.',
  'Léo': 'Chercheur. Il survole la ville et repère les entreprises dans les registres.',
  Sam: 'Enquêteur contacts. Il cherche et vérifie les e-mails.',
  Max: 'Analyste. Il étudie les signaux et va voir les opportunités du Radar.',
  Lina: 'Réseaux professionnels. Elle étudie les entreprises et fait LinkedIn.',
  Hugo: 'Campagnes. Il écrit les messages, envoie les e-mails et les relances.',
  'Inès': 'Relation prospects. Elle écrit des messages et lit les réponses.',
  Paul: 'Assistant commercial. Il prépare les rendez-vous.',
  Oscar: 'Veilleur marché. Il surveille tes concurrents (Espion).',
};

/* ------------------------------------------------------------------ la notice qui suit la souris */
let bulle = null;
function show(el, text) {
  if (!bulle) { bulle = Object.assign(document.createElement('div'), { className: 'aide' }); document.getElementById('qg').append(bulle); }
  bulle.innerHTML = text;
  bulle.hidden = false;
  const r = el.getBoundingClientRect(), b = bulle.getBoundingClientRect();
  let x = r.left + r.width / 2 - b.width / 2, y = r.bottom + 8;
  if (y + b.height > innerHeight - 8) y = r.top - b.height - 8;
  x = Math.max(8, Math.min(innerWidth - b.width - 8, x));
  bulle.style.transform = `translate(${Math.round(x)}px, ${Math.round(Math.max(8, y))}px)`;
}
const hide = () => { if (bulle) bulle.hidden = true; };
/** Une notice à un point précis de l'écran (pour la carte). */
export function aideAt(x, y, html) {
  if (!html) return hide();
  show({ getBoundingClientRect: () => ({ left: x, top: y - 10, width: 0, height: 20, bottom: y + 10 }) }, html);
}
export const aideHide = hide;

/** Les notices des éléments de l'interface (ajoutées aussi aux éléments créés plus tard : fiche, lettres…). */
const REGLES = [
  ['#h-quest', 'La mission de la nuit : la ville, la période montrée et ce qui est ailleurs. La barre avance avec la nuit.'],
  ['.res [data-k="trouves"]', 'Entreprises repérées : tous les lieux posés sur la carte cette nuit.'],
  ['.res [data-k="lus"]', 'Fiches lues : les entreprises que l’équipe a étudiées (signaux, décideur, e-mail).'],
  ['.res [data-k="retenus"]', 'Clients potentiels : les entreprises avec un contact vérifié.'],
  ['.res [data-k="prets"]', 'Messages prêts : ils attendent ta validation. Rien ne part sans toi.'],
  ['#h-inbox', 'Les derniers messages préparés. Clique l’entreprise sur la carte pour lire, modifier ou envoyer.'],
  ['.letter', 'Un message prêt. L’adresse est masquée ici ; elle est en entier dans la fiche.'],
  ['#bq-share', 'Crée une image de ta nuit et un texte, à publier sur LinkedIn.'],
  ['.bq-ville', 'Ton activité est dans plusieurs zones : choisis celle à montrer.'],
  ['#btn-carte', 'Rejoue la nuit depuis le début. Rien n’est refait en vrai.'],
  ['.qg-back', 'Revenir à Bingoo!.'],
  ['.bq-now', 'En ce moment : ce que ton équipe fait vraiment, en direct (rafraîchi toutes les 20 secondes). Clique pour tout voir.'],
  ['#bq-bilan', 'Le bilan chiffré de la nuit : réponses, rendez-vous, travail fait et temps gagné.'],
  ['#bq-aide', 'La légende : chaque repère, chaque membre, chaque geste. Et la visite guidée.'],
  ['.radio', 'La radio : quelqu’un parle hors de l’écran.'],
  ['.scorecard', 'La priorité de cette entreprise, et ce qui la fait monter.'],
  ['.f-state', 'Où en est cette entreprise. Le nombre est sa priorité sur 100.'],
  ['.f-prio summary', 'Le détail des points : une règle simple, la même pour toutes les entreprises.'],
  ['.f-x', 'Fermer la fiche (touche Échap).'],
  ['[data-act="send-ask"]', 'Envoyer ce message maintenant, depuis ta boîte connectée. Une confirmation te sera demandée.'],
  ['[data-act="send"]', 'Confirme : le message part vraiment.'],
  ['[data-act="save"]', 'Enregistrer tes modifications sans envoyer.'],
  ['[data-act="enrich"]', 'Sam cherche un e-mail vérifié. Utilise une recherche de contact de ta formule.'],
  ['[data-g]', 'Ouvrir l’entreprise dans Google Maps.'],
  ['.f-links a[href^="/#/"]', 'Ouvrir la bonne page de Bingoo! pour cette entreprise.'],
  ['.f-dec a[href="/#/valider"]', 'Valider ce message dans Bingoo!.'],
  ['.f-obj', 'L’objet du message. Tu peux le modifier tant qu’il n’est pas envoyé.'],
  ['.f-body', 'Le texte du message. Tu peux le modifier tant qu’il n’est pas envoyé.'],
  ['.f-log', 'Chaque geste de l’équipe sur cette entreprise, dans l’ordre.'],
  ['.f-quote', 'Ce que l’équipe a relevé : sa réponse ou l’opportunité.'],
];
const H3 = {
  'Pourquoi lui, maintenant': 'En orange, le signal d’achat. Dessous, ce que l’équipe a relevé.',
  'Contacts': 'Décideur, site, e-mail vérifié et téléphone, quand ils sont connus.',
  'Le message préparé': 'Le premier message ou la relance, écrit par Hugo ou Inès.',
  'Ce que l’équipe a fait': 'Chaque geste de l’équipe sur cette entreprise, dans l’ordre.',
  'Sa réponse': 'Le résumé de sa réponse, lu par Inès.',
  'L’opportunité': 'Le signal repéré par le Radar, avec sa source.',
};
const DT = { 'Décideur': 'La personne à contacter, d’après les registres.', Site: 'Son site internet.', 'E-mail': 'Seulement une adresse vérifiée, jamais devinée.', 'Téléphone': 'Le numéro affiché sur son site ou dans les registres.' };

function annoter(root) {
  for (const [sel, text] of REGLES) for (const el of root.querySelectorAll(sel)) if (!el.dataset.aide) el.dataset.aide = text;
  for (const el of root.querySelectorAll('.pf')) { const n = el.querySelector('b')?.textContent; if (n && MEMBRES[n] && !el.dataset.aide) el.dataset.aide = MEMBRES[n] + ' La ligne grise dit ce qu’il fait en ce moment.'; }
  for (const el of root.querySelectorAll('.fiche h3')) { const t = H3[el.textContent.trim()]; if (t && !el.dataset.aide) { el.dataset.aide = t; el.tabIndex = 0; } }
  for (const el of root.querySelectorAll('.f-kv dt')) { const t = DT[el.textContent.trim()]; if (t && !el.dataset.aide) { el.dataset.aide = t; el.tabIndex = 0; } }
  for (const el of root.querySelectorAll('.bq-team img')) if (!el.dataset.aide) { const n = { chef: 'Iris', eclaireur: 'Léo', 'lecteur-1': 'Sam', 'lecteur-2': 'Max', 'lecteur-3': 'Lina', 'redacteur-1': 'Hugo', 'redacteur-2': 'Inès', paul: 'Paul', oscar: 'Oscar' }[el.dataset.id]; el.dataset.aide = `${n} : ${MEMBRES[n]}`; }
}

/* ------------------------------------------------------------------ la légende */
function sprite(c, k = 3) { const out = document.createElement('canvas'); out.width = c.width * k; out.height = c.height * k; const g = out.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, out.width, out.height); return out; }
function legende(root, onTour) {
  const box = Object.assign(document.createElement('div'), { className: 'bq-modal', id: 'bq-legende' });
  box.innerHTML = `<div class="bq-card aide-card" role="dialog" aria-label="Légende">
    <div class="aide-head"><h2>Comment lire la carte</h2><button type="button" class="f-x" data-x aria-label="Fermer">×</button></div>
    <h3>Les écriteaux : ce qu’est le lieu</h3><ul class="aide-list" data-e></ul>
    <h3>Les bulles : où il en est</h3><ul class="aide-list" data-b></ul>
    <h3>L’équipe</h3><ul class="aide-list aide-team">${Object.entries(MEMBRES).map(([n, t]) => `<li><img src="/salaries/${{ 'Léo': 'leo', 'Inès': 'ines' }[n] ?? n.toLowerCase()}.png" alt=""><span><b>${esc(n)}</b> ${esc(t)}</span></li>`).join('')}</ul>
    <h3>Les gestes</h3>
    <ul class="aide-plain"><li><b>Clic</b> sur un repère ou un bâtiment : sa fiche.</li><li><b>Survol</b> de n’importe quoi : une petite notice.</li><li><b>Molette</b> : zoomer. <b>Glisser</b> : déplacer la carte (la caméra reprend la main après 6 s).</li><li><b>N</b> : Bingoo!, soir ou nuit. <b>R</b> : rejouer. <b>C</b> : rendre la caméra. <b>Échap</b> : fermer.</li><li>Sur téléphone : un doigt pour déplacer, toucher un repère pour sa fiche, le bouton « ? » pour cette légende.</li></ul>
    <div class="bq-row"><button type="button" class="bq-btn" data-tour>Revoir la visite guidée</button><button type="button" class="bq-btn ghost" data-x>Fermer</button></div>
  </div>`;
  const ul = box.querySelector('[data-e]');
  for (const [k, [t, d]] of Object.entries(ECRITEAUX)) { const li = document.createElement('li'); li.append(sprite(signSprite(k).c)); li.insertAdjacentHTML('beforeend', `<span><b>${esc(t)}</b> ${esc(d)}</span>`); ul.append(li); }
  const ub = box.querySelector('[data-b]');
  for (const [k, [t, d]] of Object.entries(ETATS)) { const li = document.createElement('li'); li.append(sprite(badgeSprite(k).c, 2)); li.insertAdjacentHTML('beforeend', `<span><b>${esc(t)}</b> ${esc(d)}</span>`); ub.append(li); }
  box.addEventListener('click', (e) => {
    if (e.target === box || e.target.closest('[data-x]')) box.remove();
    if (e.target.closest('[data-tour]')) { box.remove(); onTour(); }
  });
  root.append(box);
}

/* ------------------------------------------------------------------ la visite guidée */
const ETAPES = [
  [null, 'Bienvenue dans ta ville', 'Chaque matin, ton équipe Bingoo! te rejoue sa nuit ici, dans les vraies rues. Tu regardes, puis tu cliques ce qui t’intéresse.'],
  ['#world', 'La carte', 'Chaque repère est un lieu : mallette = entreprise, étoile = opportunité du Radar, drapeau = concurrent. La bulle au-dessus dit où il en est. Clique pour ouvrir sa fiche.'],
  ['#h-party', 'Ton équipe', 'Les neuf membres et ce qu’ils font en ce moment. Survole un nom pour savoir qui fait quoi.'],
  ['.res', 'Le bilan de la nuit', 'Combien d’entreprises, de contacts vérifiés et de messages prêts. Les messages t’attendent : rien ne part sans toi.'],
  ['.bq-now', 'En ce moment', 'Ce que ton équipe fait vraiment, en direct : « Lina cherche le profil de… ». Le bouton « Bilan » donne les chiffres de la nuit.'],
  ['#bq-aide', 'Besoin d’aide ?', 'Survole n’importe quel élément pour une petite notice. Le bouton « ? » ouvre la légende complète.'],
];
function tour(root) {
  let i = 0;
  const box = Object.assign(document.createElement('div'), { className: 'aide-tour' });
  const ring = Object.assign(document.createElement('div'), { className: 'aide-ring' });
  root.append(ring, box);
  const step = () => {
    const [sel, h, t] = ETAPES[i];
    const el = sel ? document.querySelector(sel) : null;
    const r = el && el.offsetParent !== null ? el.getBoundingClientRect() : null;
    ring.hidden = !r || sel === '#world';
    if (r && sel !== '#world') Object.assign(ring.style, { left: `${r.left - 6}px`, top: `${r.top - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px` });
    box.innerHTML = `<p class="aide-n">${i + 1} / ${ETAPES.length}</p><h2>${esc(h)}</h2><p>${esc(t)}</p><div class="bq-row"><button type="button" class="bq-btn" data-next>${i < ETAPES.length - 1 ? 'Suivant' : 'C’est parti'}</button>${i < ETAPES.length - 1 ? '<button type="button" class="bq-btn ghost" data-skip>Passer</button>' : ''}</div>`;
    box.querySelector('[data-next]').focus();
  };
  const end = () => { ring.remove(); box.remove(); try { localStorage.setItem('bingoo-qg-visite', '1'); } catch { /* stockage indisponible */ } };
  box.addEventListener('click', (e) => { if (e.target.closest('[data-skip]')) end(); if (e.target.closest('[data-next]')) { if (++i >= ETAPES.length) end(); else step(); } });
  step();
}

export function initAide() {
  const root = document.getElementById('qg');
  // le bouton « ? » à côté des commandes
  const bar = document.querySelector('.bq-bar');
  const q = Object.assign(document.createElement('button'), { type: 'button', id: 'bq-aide', className: 'bq-btn ghost', textContent: '?' });
  q.setAttribute('aria-label', 'Légende et aide');
  bar?.prepend(q);
  q.addEventListener('click', () => legende(root, () => tour(root)));
  // les notices au survol et au clavier
  annoter(root);
  new MutationObserver(() => annoter(root)).observe(root, { childList: true, subtree: true });
  let on = null;
  root.addEventListener('mouseover', (e) => { const el = e.target.closest('[data-aide]'); if (el === on) return; on = el; if (el) show(el, esc(el.dataset.aide)); else if (!e.target.closest('#world')) hide(); });
  root.addEventListener('focusin', (e) => { const el = e.target.closest('[data-aide]'); if (el) show(el, esc(el.dataset.aide)); });
  root.addEventListener('focusout', hide);
  // sur téléphone : un appui long sur un élément affiche sa notice
  let t = null;
  root.addEventListener('touchstart', (e) => { const el = e.target.closest('[data-aide]'); clearTimeout(t); if (el) t = setTimeout(() => { show(el, esc(el.dataset.aide)); setTimeout(hide, 3500); }, 450); }, { passive: true });
  root.addEventListener('touchend', () => clearTimeout(t));
  // la visite guidée, une fois, quand la ville est prête
  let vu = false;
  try { vu = localStorage.getItem('bingoo-qg-visite') === '1'; } catch { /* stockage indisponible */ }
  if (!vu && !document.body.classList.contains('cinema')) setTimeout(() => tour(root), 2500);
}
