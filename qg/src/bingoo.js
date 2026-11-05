// Les commandes Bingoo! autour de la ville : changer de ville, partager sa nuit (image pour LinkedIn), le direct.
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const plural = (n, a, b) => `${n} ${n > 1 ? b : a}`;
const SITE = 'https://kairo.maisonravita.fr';

/** Ce que l'équipe a fait, compté sur la carte. */
export function bilan(world) {
  const ps = [...(world?.places?.values() ?? [])].filter((q) => q.state !== 'cache');
  const n = (f) => ps.filter(f).length;
  return {
    entreprises: n((q) => (q.data?.kind ?? 'prospect') === 'prospect'),
    contacts: n((q) => q.email || ['retenu', 'ecriture', 'pret', 'valide', 'envoye'].includes(q.state)),
    messages: n((q) => q.mail),
    envois: n((q) => q.state === 'envoye'),
    reponses: n((q) => q.state === 'repondu'),
    opps: n((q) => q.state === 'opp'),
    rivaux: n((q) => q.state === 'rival'),
    linkedin: n((q) => q.state === 'li'),
  };
}
export function phrases(b) {
  return [
    b.entreprises && plural(b.entreprises, 'entreprise repérée', 'entreprises repérées'),
    b.contacts && plural(b.contacts, 'contact vérifié', 'contacts vérifiés'),
    b.messages && plural(b.messages, 'message préparé', 'messages préparés'),
    b.envois && plural(b.envois, 'e-mail envoyé', 'e-mails envoyés'),
    b.reponses && plural(b.reponses, 'réponse lue', 'réponses lues'),
    b.linkedin && plural(b.linkedin, 'action LinkedIn', 'actions LinkedIn'),
    b.opps && plural(b.opps, 'opportunité repérée', 'opportunités repérées'),
    b.rivaux && plural(b.rivaux, 'concurrent surveillé', 'concurrents surveillés'),
  ].filter(Boolean);
}

/** L'image à partager (1200 × 627, le format des liens LinkedIn) : la ville telle qu'elle est à l'écran, et le bilan. */
async function shareImage(canvas, night, world) {
  const W = 1200, H = 627;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const k = Math.max(W / canvas.width, H / canvas.height);
  g.drawImage(canvas, (W - canvas.width * k) / 2, (H - canvas.height * k) / 2, canvas.width * k, canvas.height * k);
  const gr = g.createLinearGradient(0, H * 0.35, 0, H);
  gr.addColorStop(0, 'rgba(11,9,16,0)'); gr.addColorStop(1, 'rgba(11,9,16,0.94)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const logo = new Image(); logo.src = import.meta.env.BASE_URL + 'logo-white.png';
  await logo.decode().catch(() => {});
  if (logo.naturalWidth) g.drawImage(logo, 48, H - 210, 200, 200 * logo.naturalHeight / logo.naturalWidth);
  g.fillStyle = '#ffffff';
  g.font = '700 38px system-ui, -apple-system, Segoe UI, sans-serif';
  const run = night.state.run;
  g.fillText(`Cette nuit à ${run.ville}, mon équipe a travaillé pour moi.`, 48, H - 104);
  g.font = '500 26px system-ui, -apple-system, Segoe UI, sans-serif';
  g.fillStyle = '#ffd7c2';
  g.fillText(phrases(bilan(world)).slice(0, 3).join(' · '), 48, H - 60);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

import { initAide } from './aide.js';
import { maintenant } from './data.js';
import { fn } from '../../src/lib/supabase.js';

const hm = (m) => (m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)} h${Math.round(m % 60) ? ` ${String(Math.round(m % 60)).padStart(2, '0')}` : ''}`);
const ago = (d) => { const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000)); return m < 1 ? 'à l’instant' : m < 60 ? `il y a ${m} min` : `il y a ${Math.floor(m / 60)} h`; };
const PH = { chef: 'iris', eclaireur: 'leo', 'lecteur-1': 'sam', 'lecteur-2': 'max', 'lecteur-3': 'lina', 'redacteur-1': 'hugo', 'redacteur-2': 'ines', paul: 'paul', oscar: 'oscar' };

/** Le bilan chiffré : ce qui compte (réponses, rendez-vous), puis le travail fait, puis le temps gagné. */
function bilanCard(b, recent) {
  if (!b) return '';
  const head = [b.reponses ? `${plural(b.reponses, 'réponse', 'réponses')}${b.positives ? ` dont ${b.positives} positive${b.positives > 1 ? 's' : ''}` : ''}` : '', b.rdv ? plural(b.rdv, 'rendez-vous', 'rendez-vous') : ''].filter(Boolean).join(', ');
  const cells = [[b.trouves, 'entreprises trouvées'], [b.emails, 'e-mails vérifiés'], [b.prets, 'messages prêts'], [b.envoyes, 'e-mails envoyés'], [b.linkedin, 'actions LinkedIn'], [b.profils, 'profils LinkedIn trouvés'], [b.opps, 'opportunités'], [b.reponses, 'réponses'], [b.rdv, 'rendez-vous']].filter(([n]) => n > 0);
  return `<div class="bq-card bq-bilan" role="dialog" aria-label="Bilan de la nuit">
    <p class="bq-k">${recent ? 'Ta nuit en chiffres' : 'Ta dernière nuit de travail en chiffres'}</p>
    <p class="bq-big">${head ? esc(head) : 'Pas encore de réponse cette nuit'}</p>
    ${cells.length ? `<div class="bq-grid">${cells.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div>` : '<p>Ton équipe n’a rien fait de visible cette nuit.</p>'}
    ${b.minutes ? `<p class="bq-time">Temps gagné : environ <b>${hm(b.minutes)}</b> de travail que tu n’as pas eu à faire.</p>` : ''}
    <div class="bq-row">${b.reponses ? '<a class="bq-btn" href="/#/reponses">Lire les réponses</a>' : b.prets ? '<a class="bq-btn" href="/#/valider">Valider les messages</a>' : '<a class="bq-btn" href="/#/">Ouvrir Bingoo!</a>'}<button type="button" class="bq-btn ghost" data-close>Rester sur la carte</button></div></div>`;
}

export function bingooUi({ night, world, canvas, play, jeu }) {
  const root = document.getElementById('qg');
  const bar = document.createElement('div');
  bar.className = 'bq-bar';
  const clusters = night.clusters ?? [];
  bar.innerHTML = `
    ${clusters.length > 1 ? `<label class="bq-ville"><span>Ville</span><select id="bq-ville">${clusters.map((c, i) => `<option value="${i}" ${i === night.zone ? 'selected' : ''}>${esc(c.ville || `Zone ${i + 1}`)} (${c.n})</option>`).join('')}</select></label>` : ''}
    <button type="button" class="bq-btn jouer" id="bq-jouer">Jouer</button>
    <button type="button" class="bq-btn ghost" id="bq-bilan">Bilan</button>
    <button type="button" class="bq-btn" id="bq-share">Partager ma nuit</button>`;
  root.append(bar);
  // Ton terrain : la ville affichée comme un territoire à prendre, et l'objectif de la semaine
  const T = night.terrain ?? [];
  if (T.length) {
    const n = (e) => T.filter((p) => p.etat === e).length;
    const g = n('gagne'), di = n('discussion'), co = n('contacte'), ap = n('a_prendre');
    const pris = T.length - ap, pct = Math.round((pris / T.length) * 100);
    const w = (x) => `${(x / T.length) * 100}%`;
    const box = document.createElement('section');
    box.className = 'bq-terrain';
    box.setAttribute('aria-label', 'Ton terrain');
    box.innerHTML = `<div class="bt-head"><h3>Ton terrain</h3><button type="button" class="bt-eye" aria-pressed="true">Masquer</button></div>
      <p class="bt-big"><b>${pct} %</b> de ta ville prise <span>· ${T.length} entreprises</span></p>
      <div class="bt-bar" aria-hidden="true"><i style="width:${w(g)};background:#22c55e"></i><i style="width:${w(di)};background:#3b82f6"></i><i style="width:${w(co)};background:#facc15"></i></div>
      <ul class="bt-leg"><li><i style="background:#22c55e"></i>${g} gagnée${g > 1 ? 's' : ''}</li><li><i style="background:#3b82f6"></i>${di} en discussion</li><li><i style="background:#facc15"></i>${co} contactée${co > 1 ? 's' : ''}</li><li><i class="ap"></i>${ap} à prendre</li></ul>
      <p class="bt-obj" hidden></p>`;
    root.append(box);
    // sous le panneau « En attente de ta validation », quelle que soit sa hauteur
    const place = () => { if (matchMedia('(max-width: 640px)').matches) { box.style.top = ''; return; } const ib = document.querySelector('.inbox'); const r = ib && ib.offsetParent ? ib.getBoundingClientRect() : null; box.style.top = `${Math.round(r && r.height ? r.bottom + 12 : 96)}px`; };
    place(); setInterval(place, 800);
    box.querySelector('.bt-eye').addEventListener('click', (e) => {
      const W = world(); if (!W) return;
      W.showTerrain = W.showTerrain === false;
      e.currentTarget.textContent = W.showTerrain ? 'Masquer' : 'Afficher';
      e.currentTarget.setAttribute('aria-pressed', String(W.showTerrain));
    });
    fn('m/pilotage', { workspace_id: night.ws.id }).then((d) => {
      const o = box.querySelector('.bt-obj');
      o.innerHTML = `Cette semaine : <b>${d.rdv} rendez-vous sur ${d.objectif}</b>${d.rdv < d.objectif && d.semaine.jour > 1 ? ` · à ce rythme ${d.prevision} vendredi` : ''}`;
      o.hidden = false;
    }).catch(() => {});
  }

  // En ce moment : ce que l'équipe fait vraiment, rafraîchi toutes les 20 secondes
  const now = document.createElement('section');
  now.className = 'bq-now';
  now.setAttribute('aria-live', 'polite');
  now.innerHTML = '<h3><i></i>En ce moment</h3><ul><li class="bq-quiet">Lecture…</li></ul>';
  root.append(now);
  const paint = async () => {
    if (document.hidden) return;
    const list = await maintenant().catch(() => null);
    if (!list) return;
    const ul = now.querySelector('ul');
    now.classList.toggle('on', list.some((x) => x.encours || Date.now() - new Date(x.at).getTime() < 5 * 60000));
    ul.innerHTML = list.length ? list.map((x) => `<li${x.encours ? ' class="run"' : ''}><img src="/salaries/${x.id}.png" alt=""><p><b>${esc(x.nom)}</b> ${esc(x.texte)}<small>${x.encours ? 'en cours' : ago(x.at)}</small></p></li>`).join('')
      : '<li class="bq-quiet">Ton équipe se repose. Elle se remet au travail cette nuit, et chaque action apparaîtra ici en direct.</li>';
  };
  paint(); setInterval(paint, 20000);
  now.addEventListener('click', (e) => { if (!e.target.closest('a')) now.classList.toggle('open'); });

  // sur téléphone : les visages de l'équipe ; celui qui travaille est entouré d'orange
  const team = document.createElement('div');
  team.className = 'bq-team';
  team.innerHTML = Object.entries(PH).map(([id, n]) => `<img data-id="${id}" src="/salaries/${n}.png" alt="">`).join('');
  root.append(team);
  setInterval(() => { const w = world(); if (!w) return; for (const img of team.children) { const a = w.actors.get(img.dataset.id); img.classList.toggle('on', Boolean(a && (a.target || a.busy) && a.alpha > 0.5)); } }, 500);
  bar.querySelector('#bq-ville')?.addEventListener('change', (e) => {
    const u = new URL(location.href); u.searchParams.set('zone', e.target.value); u.searchParams.delete('premiere'); location.href = u.toString();
  });
  const showBilan = () => {
    const box = document.getElementById('bq-modal') ?? Object.assign(document.createElement('div'), { id: 'bq-modal', className: 'bq-modal' });
    root.append(box);
    box.innerHTML = bilanCard(night.bilan, night.recent);
    box.hidden = false;
    box.querySelector('[data-close]')?.addEventListener('click', () => { box.hidden = true; });
  };
  bar.querySelector('#bq-bilan').addEventListener('click', showBilan);
  bar.querySelector('#bq-jouer').addEventListener('click', () => { document.getElementById('bq-modal')?.setAttribute('hidden', ''); jeu?.on(); });
  // à la fin de la nuit rejouée : le bilan (sauf la toute première mission, qui a sa propre fin)
  if (!new URLSearchParams(location.search).has('premiere') && !document.body.classList.contains('cinema')) {
    let shown = false;
    const later = () => (document.querySelector('.aide-tour, #bq-modal:not([hidden]), body.has-fiche, body.jeu') ? setTimeout(later, 4000) : showBilan());
    world()?.on((type) => { if (type === 'end' && !shown) { shown = true; setTimeout(later, 1200); } });
  }
  bar.querySelector('#bq-share').addEventListener('click', async () => {
    const box = document.getElementById('bq-modal') ?? Object.assign(document.createElement('div'), { id: 'bq-modal', className: 'bq-modal' });
    root.append(box);
    box.innerHTML = '<div class="bq-card"><p>Préparation de l’image…</p></div>';
    box.hidden = false;
    const blob = await shareImage(canvas, night, world());
    const url = URL.createObjectURL(blob);
    const text = `Cette nuit, mon équipe Bingoo! a travaillé pour moi à ${night.state.run.ville} : ${phrases(bilan(world())).slice(0, 3).join(', ')}. ${SITE}`;
    box.innerHTML = `<div class="bq-card" role="dialog" aria-label="Partager ma nuit">
      <img src="${url}" alt="Ta nuit Bingoo!, prête à partager">
      <p>Télécharge l’image, puis ajoute-la à ton post LinkedIn. Elle reprend la carte telle qu’elle est à l’écran : vérifie-la avant de publier.</p>
      <textarea id="bq-text" rows="3">${esc(text)}</textarea>
      <div class="bq-row">
        <a class="bq-btn" href="${url}" download="ma-nuit-bingoo.png">Télécharger l’image</a>
        <button type="button" class="bq-btn ghost" id="bq-copy">Copier le texte</button>
        <a class="bq-btn ghost" href="https://www.linkedin.com/feed/?shareActive=true" target="_blank" rel="noopener">Ouvrir LinkedIn</a>
        <button type="button" class="bq-btn ghost" id="bq-close">Fermer</button>
      </div></div>`;
    box.querySelector('#bq-copy').onclick = async (e) => { try { await navigator.clipboard.writeText(box.querySelector('#bq-text').value); e.target.textContent = 'Texte copié'; } catch { box.querySelector('#bq-text').select(); } };
    box.querySelector('#bq-close').onclick = () => { box.hidden = true; URL.revokeObjectURL(url); };
  });
  initAide();
  // la toute première mission : à la fin, un pas vers la suite
  if (new URLSearchParams(location.search).has('premiere')) {
    world()?.on((type) => {
      if (type !== 'end' || document.getElementById('bq-first')) return;
      const b = bilan(world());
      const w = night.ws ?? {};
      const connected = w.domain_status === 'verified' || !!w.integrations?.mailbox?.ok;
      const box = Object.assign(document.createElement('div'), { id: 'bq-first', className: 'bq-modal' });
      box.innerHTML = `<div class="bq-card"><p style="font-size:18px;font-weight:700">Ta première mission est terminée.</p>
        <p>${esc(phrases(b).join(', ') || 'Ton équipe a commencé à travailler')}. Elle continue chaque nuit : demain matin, tout sera prêt dans Aujourd’hui.</p>
        ${connected ? '' : '<p><b>Dernière étape :</b> connecte ta boîte mail (2 minutes) pour envoyer ton premier message depuis ta propre adresse.</p>'}
        <div class="bq-row">${connected ? '<a class="bq-btn" href="/#/">Voir mes prospects</a>' : '<a class="bq-btn" href="/#/connexions">Connecter ma boîte mail</a><a class="bq-btn ghost" href="/#/">Voir mes prospects</a>'}<button type="button" class="bq-btn ghost" id="bq-stay">Rester sur la carte</button></div></div>`;
      root.append(box);
      box.querySelector('#bq-stay').onclick = () => box.remove();
    });
  }
  void play;
}
