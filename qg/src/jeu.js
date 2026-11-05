// Le mode « Jouer » : tu marches dans ta ville avec ton propre personnage (flèches, ZQSD ou le joystick sur téléphone).
// Les entreprises qui attendent quelque chose de toi portent un bloc « ? » : tu t'approches, Espace (ou A), et sa fiche s'ouvre.
// Chaque vraie action (message envoyé, réponse envoyée, invitation validée) rapporte des pièces ; quand tout est fait :
// « Niveau terminé ». Rien n'est inventé : le niveau, ce sont tes vraies tâches du jour dans Bingoo!.
import { supabase } from '../../src/lib/supabase.js';
import { son } from './sons.js';
import { AREA } from './ville.js';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const PIECES = { message: 10, reponse: 10, linkedin: 5, traitee: 3, ecarte: 2 };
const TACHES = [['message', 'Messages à valider'], ['reponse', 'Réponses à traiter'], ['linkedin', 'Invitations LinkedIn']];
const jour = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

export function createJeu({ root, getWorld, cam, getDirector, fiche, ws, bilan }) {
  let active = false, player = null, near = null, guide = null, finished = false;
  let pending = new Map(); // prospect → [types]
  let total = { message: 0, reponse: 0, linkedin: 0 }, start = null;
  const keys = new Set();
  const joy = { x: 0, y: 0 };
  const KEY = `bingoo-qg-jeu-${ws.id}`;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } };
  const saveW = (w) => { try { localStorage.setItem(KEY, JSON.stringify(w)); } catch { /* stockage indisponible */ } };
  let wallet = { pieces: 0, jours: [], ...load() };
  const serie = () => { let n = 0; const d = new Date(); for (;;) { if (!wallet.jours.includes(jour(d))) break; n++; d.setDate(d.getDate() - 1); } return n; };

  /* ---------- l'interface : le niveau, les pièces, la série, les commandes */
  const hud = Object.assign(document.createElement('section'), { className: 'jeu-hud', hidden: true });
  const tip = Object.assign(document.createElement('div'), { className: 'jeu-tip', hidden: true });
  const pad = Object.assign(document.createElement('div'), { className: 'jeu-pad', hidden: true });
  pad.innerHTML = '<div class="jeu-joy"><i></i></div><button type="button" class="jeu-a" aria-label="Ouvrir la fiche">A</button>';
  const end = Object.assign(document.createElement('div'), { className: 'bq-modal jeu-end', hidden: true });
  root.append(hud, tip, pad, end);

  async function refresh() {
    const [m, r, l] = await Promise.all([
      supabase.from('messages').select('prospect_id').eq('workspace_id', ws.id).eq('status', 'brouillon').limit(300),
      supabase.from('replies').select('prospect_id').eq('workspace_id', ws.id).eq('handled', false).limit(300),
      supabase.from('prospects').select('id').eq('workspace_id', ws.id).eq('linkedin_status', '').neq('linkedin_note', '').neq('status', 'ignore').limit(300),
    ]);
    pending = new Map();
    const add = (id, k) => { if (!id) return; const a = pending.get(id) ?? []; if (!a.includes(k)) a.push(k); pending.set(id, a); };
    for (const x of m.data ?? []) add(x.prospect_id, 'message');
    for (const x of r.data ?? []) add(x.prospect_id, 'reponse');
    for (const x of l.data ?? []) add(x.id, 'linkedin');
    total = { message: (m.data ?? []).length, reponse: (r.data ?? []).length, linkedin: (l.data ?? []).length };
    start ??= { ...total };
    paint();
  }
  const pid = (q) => q.data?.prospect_id ?? q.id;
  const onMap = (k) => [...(getWorld()?.places.values() ?? [])].filter((q) => q.state !== 'cache' && (pending.get(pid(q)) ?? []).includes(k));

  function paint() {
    const reste = total.message + total.reponse + total.linkedin;
    const depart = start ? start.message + start.reponse + start.linkedin : reste;
    const s = serie();
    hud.innerHTML = `<div class="jh-top"><span class="jh-coin" aria-hidden="true"></span><b>${wallet.pieces}</b><span class="jh-l">pièces</span>${s ? `<span class="jh-fire" title="Jours d'affilée avec au moins une action">${s} jour${s > 1 ? 's' : ''} d'affilée</span>` : ''}<button type="button" class="jh-x" data-quit>Quitter</button></div>
      <h3>Niveau du jour <small>${depart ? `${Math.max(0, depart - reste)} / ${depart}` : ''}</small></h3>
      ${depart ? `<div class="jh-bar"><i style="width:${depart ? Math.round(((depart - reste) / depart) * 100) : 0}%"></i></div>` : ''}
      <ul>${TACHES.map(([k, l]) => { const n = total[k], here = onMap(k); return `<li class="${n ? '' : 'ok'}"><span>${l}</span><b>${n || '✓'}</b>${n ? here.length ? `<button type="button" class="jh-go" data-go="${k}">Y aller</button>` : `<a class="jh-go" href="${k === 'message' ? '/#/valider' : k === 'reponse' ? '/#/reponses' : '/#/linkedin'}">Dans Bingoo!</a>` : ''}</li>`; }).join('')}</ul>
      ${reste ? '' : '<p class="jh-ok">Tout est à jour. Promène-toi : clique un commerce pour le découvrir.</p>'}
      <p class="jh-keys">${matchMedia('(pointer: coarse)').matches ? 'Joystick pour marcher, A pour ouvrir.' : 'Flèches ou ZQSD pour marcher, Maj pour courir, Espace pour ouvrir, Échap pour quitter.'}</p>
      <div class="jh-row"><button type="button" class="jh-btn" data-son>${son.on ? 'Son : oui' : 'Son : non'}</button><button type="button" class="jh-btn" data-quit>Quitter le jeu</button></div>`;
  }
  hud.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) { const list = onMap(go.dataset.go); if (list.length && player) { list.sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y)); guide = list[0]; } return; }
    if (e.target.closest('[data-son]')) { son.toggle(); paint(); return; }
    if (e.target.closest('[data-quit]')) off();
    if (e.target.closest('h3, .jh-bar')) hud.classList.toggle('open');
  });

  /* ---------- les commandes */
  const typing = (e) => e.target.closest?.('input, textarea, select, [contenteditable]');
  const DIRS = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', z: 'u', w: 'u', s: 'd', q: 'l', a: 'l', d: 'r' };
  window.addEventListener('keydown', (e) => {
    if (!active || typing(e)) return;
    const k = DIRS[e.key] ?? DIRS[e.key.toLowerCase?.()];
    if (k) { keys.add(k); e.preventDefault(); return; }
    if (e.key === 'Shift') keys.add('run');
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); act(); }
    if (e.key === 'Escape' && !document.body.classList.contains('has-fiche')) off();
  }, true);
  window.addEventListener('keyup', (e) => { const k = DIRS[e.key] ?? DIRS[e.key.toLowerCase?.()]; if (k) keys.delete(k); if (e.key === 'Shift') keys.delete('run'); });
  window.addEventListener('blur', () => keys.clear());
  // le joystick (téléphone)
  const base = pad.querySelector('.jeu-joy'), knob = base.querySelector('i');
  let jid = null;
  const jmove = (e) => { const r = base.getBoundingClientRect(); let x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2); const m = Math.hypot(x, y), R = r.width / 2; if (m > R) { x *= R / m; y *= R / m; } joy.x = x / R; joy.y = y / R; knob.style.transform = `translate(${x}px, ${y}px)`; };
  base.addEventListener('pointerdown', (e) => { jid = e.pointerId; base.setPointerCapture(jid); jmove(e); });
  base.addEventListener('pointermove', (e) => { if (e.pointerId === jid) jmove(e); });
  const jend = () => { jid = null; joy.x = 0; joy.y = 0; knob.style.transform = ''; };
  base.addEventListener('pointerup', jend); base.addEventListener('pointercancel', jend);
  pad.querySelector('.jeu-a').addEventListener('click', () => act());

  /* ---------- marcher */
  function free(x, y) {
    const c = getWorld()?.city;
    if (!c) return false;
    const b = c.bounds;
    if (x < b.minx + 4 || x > b.maxx - 4 || y < b.miny + 4 || y > b.maxy - 4) return false;
    if (c.buildingAt(x, y)) return false;
    const a = c.areaAt(x, y);
    return a !== AREA.water && a !== AREA.pool;
  }
  function spawn() {
    const w = getWorld();
    const x0 = w.qg.x, y0 = (w.qg.door?.[1] ?? w.qg.y) + 4;
    for (let r = 0; r < 80; r += 2) for (let k = 0; k < 16; k++) { const x = x0 + Math.cos((k / 16) * 2 * Math.PI) * r, y = y0 + Math.sin((k / 16) * 2 * Math.PI) * r; if (free(x, y)) return { x, y }; }
    return { x: x0, y: y0 };
  }

  function update(dt) {
    if (!active || !player) return;
    const w = getWorld();
    let vx = joy.x + (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0), vy = joy.y + (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0);
    const m = Math.hypot(vx, vy);
    if (m > 1) { vx /= m; vy /= m; }
    const sp = (keys.has('run') || m > 0.95 && matchMedia('(pointer: coarse)').matches ? 62 : 34);
    if (m > 0.08 && !document.body.classList.contains('has-fiche')) {
      const nx = player.x + vx * sp * dt, ny = player.y + vy * sp * dt;
      if (free(nx, ny)) { player.x = nx; player.y = ny; } else if (free(nx, player.y)) player.x = nx; else if (free(player.x, ny)) player.y = ny;
      player.pose = 'walk';
      player.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
      player.frame = Math.floor(w.time * 9) % 4;
      player.speed = sp > 50 ? 80 : 30;
    } else { player.pose = 'idle'; player.frame = 0; player.speed = 0; }
    // la caméra suit, sans à-coups
    cam.x += (player.x - cam.x) * Math.min(1, dt * 5);
    cam.y += (player.y - cam.y) * Math.min(1, dt * 5);
    // l'entreprise la plus proche (celles qui attendent quelque chose d'abord)
    near = null;
    let best = Infinity;
    for (const q of w.places.values()) {
      if (q.state === 'cache') continue;
      const d = Math.hypot(q.x - player.x, q.y - player.y) - ((pending.get(pid(q)) ?? []).length ? 8 : 0);
      if (d < 24 && d < best) { best = d; near = q; }
    }
    if (guide && Math.hypot(guide.x - player.x, guide.y - player.y) < 20) guide = null;
    tip.hidden = !near || document.body.classList.contains('has-fiche');
    if (near) {
      const t = pending.get(pid(near)) ?? [];
      const label = matchMedia('(pointer: coarse)').matches ? 'A' : 'Espace';
      tip.innerHTML = `<b>${esc(near.name)}</b>${t.length ? `<span>${t.map((k) => ({ message: 'message à valider', reponse: 'réponse à traiter', linkedin: 'invitation à valider' })[k]).join(' · ')}</span>` : ''}<em>${label} : ouvrir</em>`;
    }
    pad.querySelector('.jeu-a').classList.toggle('on', Boolean(near));
    // les lieux apparaissent au fil de la nuit rejouée : « Y aller » se met à jour quand l'un d'eux arrive sur la carte
    const sig = TACHES.map(([k]) => onMap(k).length).join(',');
    if (sig !== lastSig) { lastSig = sig; paint(); }
  }
  let lastSig = '';

  function act() {
    if (!near) return;
    near.bump = getWorld().time;
    son.bloc();
    fiche.open(near);
  }

  /** Une vraie action faite dans la fiche : des pièces, un son, et le niveau se met à jour. */
  async function reward(kind, q) {
    const n = PIECES[kind] ?? 0;
    if (!n) return;
    wallet = { ...wallet, ...load() };
    wallet.pieces = (wallet.pieces ?? 0) + n;
    if (!wallet.jours.includes(jour())) wallet.jours = [...wallet.jours, jour()].slice(-60);
    saveW(wallet);
    const w = getWorld();
    if (w && q) for (let i = 0; i < Math.min(5, Math.ceil(n / 3)); i++) w.fx.push({ kind: 'coin', x: q.x + (i - 2) * 3, y: q.y, t0: w.time + i * 0.08, dur: 0.9 });
    son.piece();
    await refresh();
    const reste = total.message + total.reponse + total.linkedin;
    const depart = start.message + start.reponse + start.linkedin;
    if (!reste && depart && !finished) { finished = true; setTimeout(niveau, 900); }
  }

  function niveau() {
    son.niveau();
    const s = serie();
    const b = bilan ?? {};
    end.innerHTML = `<div class="bq-card jeu-card" role="dialog" aria-label="Niveau terminé">
      <p class="je-k">Niveau du jour</p><h2>Niveau terminé !</h2>
      <p class="je-coins"><span class="jh-coin" aria-hidden="true"></span><b>${wallet.pieces}</b> pièces${s > 1 ? ` · ${s} jours d'affilée` : ''}</p>
      <p>Tout ce qui t'attendait ce matin est fait.${b.reponses ? ` Cette nuit : ${b.reponses} réponse${b.reponses > 1 ? 's' : ''}${b.rdv ? `, ${b.rdv} rendez-vous` : ''}.` : ''} Ton équipe reprend cette nuit.</p>
      <div class="bq-row"><button type="button" class="bq-btn" data-c>Continuer à explorer</button><a class="bq-btn ghost" href="/#/">Retour à Bingoo!</a></div></div>`;
    end.hidden = false;
    end.querySelector('[data-c]').onclick = () => { end.hidden = true; };
  }

  function on() {
    const w = getWorld();
    if (!w || active) return;
    active = true;
    player = { id: 'joueur', ...spawn(), dir: 'down', pose: 'idle', frame: 0, eyes: 'open', alpha: 1, alt: 0, speed: 0 };
    const d = getDirector(); if (d) d.manualUntil = 1e12;
    cam.z = Math.max(cam.z, 2.6);
    document.body.classList.add('jeu');
    hud.hidden = false;
    pad.hidden = !matchMedia('(pointer: coarse)').matches;
    son.bloc();
    refresh();
  }
  function off() {
    if (!active) return;
    active = false; player = null; near = null; guide = null; keys.clear();
    const d = getDirector(); if (d) d.manualUntil = 0;
    document.body.classList.remove('jeu');
    hud.hidden = true; tip.hidden = true; pad.hidden = true;
  }

  /** Ce que le rendu dessine en plus : le personnage, les blocs « ? », le guide. */
  function scene() {
    if (!active) return null;
    const w = getWorld();
    const blocks = [];
    for (const q of w.places.values()) if (q.state !== 'cache' && (pending.get(pid(q)) ?? []).length) blocks.push({ x: q.x, y: q.y, bump: q.bump ?? -9, near: q === near });
    return { player, blocks, guide };
  }
  /** La bulle « Espace : ouvrir » suit le personnage à l'écran. */
  function place(W, H, DPR) {
    if (!active || !player || tip.hidden) return;
    const x = ((player.x - cam.x) * cam.z + W / 2) / DPR, y = ((player.y - cam.y) * cam.z + H / 2) / DPR;
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y - 70)}px) translate(-50%, -100%)`;
  }

  return { on, off, update, reward, scene, place, get active() { return active; } };
}
