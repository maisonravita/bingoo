// La fiche d'un commerce, au clic : ce qui lui manque (ce que l'équipe a vu sur son site), ses contacts, le mail préparé
// (qu'on peut corriger, valider ou refuser : rien ne part sans toi) et sa fiche Google Maps.
import { badgeSprite } from './sprites.js';
import { qfetch } from './api.js';
import { fn, supabase } from '../../src/lib/supabase.js';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const host = (url) => { try { return new URL(url).host.replace(/^www\./, ''); } catch { return ''; } };
const STATE = {
  trouve: 'Repéré, pas encore lu', lecture: 'En lecture…', retenu: 'Client potentiel', ecarte: 'À compléter : pas encore d’e-mail vérifié', ecriture: 'Mail en cours…',
  pret: 'Message prêt · en attente de ta validation', valide: 'Envoyé', refuse: 'Refusé', saute: 'Pas lu : l’objectif de mails était atteint',
  opp: 'Opportunité du Radar', rival: 'Concurrent surveillé (Espion)', repondu: 'A répondu', rdv: 'Rendez-vous à venir', li: 'LinkedIn en cours', envoye: 'E-mail envoyé',
};
const LINKS = { opp: ['/#/radar', 'Voir dans le Radar'], rival: ['/#/espion', 'Voir dans Concurrents'], repondu: ['/#/reponses', 'Lire et répondre'], rdv: ['/#/agenda', 'Ouvrir l’agenda'], li: ['/#/linkedin', 'Voir LinkedIn'] };

const TYPES = {
  restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', pub: 'Bar', fast_food: 'Restauration rapide', bakery: 'Boulangerie', hairdresser: 'Coiffeur',
  beauty: 'Institut de beauté', clothes: 'Vêtements', clothing_store: 'Vêtements', florist: 'Fleuriste', optician: 'Opticien', pharmacy: 'Pharmacie',
  fitness_centre: 'Salle de sport', sports_centre: 'Centre sportif', lodging: 'Hôtel', hotel: 'Hôtel', grocery: 'Épicerie', supermarket: 'Supermarché',
  shop: 'Boutique', books: 'Librairie', jewelry: 'Bijouterie', shoes: 'Chaussures', dentist: 'Dentiste', doctors: 'Médecin', veterinary: 'Vétérinaire',
  car_repair: 'Garage', ice_cream: 'Glacier', butcher: 'Boucherie', wine: 'Caviste', alcohol_shop: 'Caviste', cinema: 'Cinéma', theatre: 'Théâtre',
};

/** Ce qui manque au commerce (et ce qu'il a déjà), d'après ce que le lecteur a relevé sur son site. */
export function bilan(q) {
  const s = q.signals ?? {};
  if (s.bingoo) return s.bingoo;
  const out = [];
  const site = q.data?.website;
  if (!site) out.push([false, 'Pas de site internet']);
  else if (s.site === false) out.push([false, 'Site illisible ou en panne']);
  if (s.site) {
    out.push(s.reservation_en_ligne ? [true, `Réservation en ligne (${s.reservation_en_ligne})`] : [false, 'Pas de réservation en ligne']);
    out.push(s.discussion ? [true, `Quelqu'un répond sur le site (${s.discussion})`] : [false, 'Personne pour répondre sur le site']);
    out.push(s.whatsapp ? [true, 'WhatsApp'] : [false, 'Pas de WhatsApp']);
    if (s.mobile === false) out.push([false, 'Site pas adapté au téléphone']);
    if (s.https === false) out.push([false, 'Site non sécurisé (http)']);
    if (s.annee && s.annee < 2023) out.push([false, `Site pas mis à jour depuis ${s.annee}`]);
    if (s.instagram) out.push([true, `Instagram @${s.instagram}`]);
  }
  return out.sort((a, b) => Number(a[0]) - Number(b[0]));
}

function icon(state) {
  const b = badgeSprite(state);
  const c = document.createElement('canvas');
  c.width = b.c.width * 3; c.height = b.c.height * 3;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(b.c, 0, 0, c.width, c.height);
  return c;
}

export function createFiche(root, { getRunId, onClose, onDone }) {
  let cur = null;
  root.className = 'fiche';
  root.hidden = true;
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !cur) return;
    const act = b.dataset.act;
    if (act === 'close') return close();
    const d = cur.data ?? {};
    if (act === 'save' || act === 'send-ask' || act === 'send') {
      const id = d.message_id;
      const objet = root.querySelector('.f-obj')?.value ?? '', mail = root.querySelector('.f-body')?.value ?? '';
      const note = root.querySelector('.f-act-note');
      b.disabled = true;
      try {
        if (act === 'send-ask') { root.querySelector('.f-confirm').hidden = false; return; }
        if (objet !== cur.objet || mail !== cur.mail) {
          const { error } = await supabase.from('messages').update({ subject: objet, body: mail }).eq('id', id).eq('status', 'brouillon');
          if (error) throw new Error(error.message);
          cur.objet = objet; cur.mail = mail;
        }
        if (act === 'save') { note.textContent = 'Modifications enregistrées.'; return; }
        const r = await fn('m/send', { workspace_id: d.ws_id, message_id: id });
        if (r.skipped) { note.textContent = `Non envoyé : ${r.skipped}`; return; }
        cur.state = 'valide'; cur.stateAt = cur.stateAt ?? 0; render();
        root.querySelector('.f-act-note').textContent = `Envoyé à ${cur.to ?? ''}.`;
        onDone?.('message', cur);
      } catch (err) { if (note) note.textContent = err.message; } finally { b.disabled = false; }
      return;
    }
    if (act === 'send-cancel') { root.querySelector('.f-confirm').hidden = true; return; }
    if (act === 'enrich') {
      const note = root.querySelector('.f-act-note');
      b.disabled = true; b.textContent = 'Sam cherche…';
      try {
        const r = await fn('m/enrich', { workspace_id: d.ws_id, count: 1, ids: [d.prospect_id] });
        const { data: p } = await supabase.from('prospects').select('email, phone, contact_name, contact_role').eq('id', d.prospect_id).single();
        if (p?.email) { cur.email = p.email; cur.state = 'retenu'; (cur.journal ??= []).push(`E-mail vérifié : ${p.email}`); render(); root.querySelector('.f-act-note').textContent = 'Sam a trouvé un e-mail vérifié.'; }
        else { (cur.journal ??= []).push('Recherche faite : pas d’e-mail vérifiable pour l’instant'); render(); root.querySelector('.f-act-note').textContent = r?.done ? 'Sam n’a pas trouvé d’e-mail vérifiable pour l’instant.' : 'Cette entreprise a déjà été recherchée.'; }
      } catch (err) { note.textContent = err.message; b.disabled = false; b.textContent = 'Chercher son e-mail'; }
      return;
    }
    if (act.startsWith('x-')) return actions(act, b);
    if (act === 'valide' || act === 'refuse') {
      const run = getRunId();
      const objet = root.querySelector('.f-obj')?.value, mail = root.querySelector('.f-body')?.value;
      b.disabled = true;
      try {
        const r = await qfetch(`/api/runs/${run}/places/${encodeURIComponent(cur.id)}/decision`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: act, objet, mail }),
        });
        if (r.ok) { cur.state = act; cur.objet = objet; cur.mail = mail; render(); }
      } finally { b.disabled = false; }
    }
  });

  /* ---------- agir depuis la carte : répondre, valider LinkedIn, écarter, ouvrir la fiche complète (toujours sur l'état réel) */
  let live = null;
  async function loadActions(q) {
    const d = q.data ?? {};
    const box = root.querySelector('[data-acts]');
    const [{ data: p }, { data: rs }] = await Promise.all([
      supabase.from('prospects').select('id, status, linkedin_status, linkedin_note, linkedin_url').eq('id', d.prospect_id).maybeSingle(),
      supabase.from('replies').select('id, summary, class, reply_subject, reply_body, handled, from_email').eq('prospect_id', d.prospect_id).eq('handled', false).order('created_at', { ascending: false }).limit(1),
    ]);
    if (cur !== q || !box) return;
    live = { p, r: rs?.[0] ?? null };
    const r = live.r;
    const liTodo = p && !p.linkedin_status && p.linkedin_note;
    box.innerHTML = `<h3>Agir</h3>
      ${r ? `<div class="f-reply"><h4>Ta réponse à ${esc(r.from_email ?? '')}</h4>${r.reply_body ? '' : '<p class="f-note">Pas de brouillon préparé : écris ta réponse.</p>'}
        <label>Objet</label><input class="f-r-obj" value="${esc(r.reply_subject ?? '')}">
        <label>Message</label><textarea class="f-r-body" rows="7">${esc(r.reply_body ?? '')}</textarea>
        <div class="f-dec"><button type="button" class="f-btn" data-act="x-reply-ask">Envoyer la réponse</button><button type="button" class="f-btn ghost" data-act="x-handled">Marquer comme traitée</button></div>
        <div class="f-confirm" data-c="reply" hidden><p>Envoyer cette réponse maintenant ?</p><div class="f-dec"><button type="button" class="f-btn" data-act="x-reply">Oui, envoyer</button><button type="button" class="f-btn ghost" data-act="x-cancel">Annuler</button></div></div></div>` : ''}
      ${liTodo ? `<div class="f-li"><h4>Invitation LinkedIn à valider</h4><textarea class="f-li-note" rows="3" maxlength="200">${esc(p.linkedin_note)}</textarea>
        <div class="f-dec"><button type="button" class="f-btn" data-act="x-li">Valider l’invitation</button>${p.linkedin_url ? `<a class="f-btn ghost" href="${esc(p.linkedin_url)}" target="_blank" rel="noopener">Voir le profil</a>` : ''}</div>
        <p class="f-note">Le pilote l’enverra aux heures de bureau, avec une visite du profil la veille.</p></div>` : ''}
      <div class="f-dec">
        <a class="f-btn ghost" href="/#/prospects?id=${encodeURIComponent(d.prospect_id)}">Ouvrir la fiche complète</a>
        ${p && p.status !== 'ignore' ? '<button type="button" class="f-btn ghost" data-act="x-ignore-ask">Écarter ce prospect</button>' : p ? '<button type="button" class="f-btn ghost" data-act="x-unignore">Remettre dans la prospection</button>' : ''}
      </div>
      <div class="f-confirm" data-c="ignore" hidden><p>Écarter ${esc(q.name)} ? L’équipe ne le contactera plus (tu pourras le remettre).</p><div class="f-dec"><button type="button" class="f-btn" data-act="x-ignore">Oui, écarter</button><button type="button" class="f-btn ghost" data-act="x-cancel">Annuler</button></div></div>`;
  }
  async function actions(act, b) {
    const d = cur.data ?? {}, note = root.querySelector('.f-act-note');
    const show = (c, on = true) => { const el = root.querySelector(`[data-c="${c}"]`); if (el) el.hidden = !on; };
    if (act === 'x-cancel') { root.querySelectorAll('[data-acts] .f-confirm').forEach((x) => { x.hidden = true; }); return; }
    if (act === 'x-reply-ask') return show('reply');
    if (act === 'x-ignore-ask') return show('ignore');
    b.disabled = true;
    try {
      if (act === 'x-reply') {
        const subject = root.querySelector('.f-r-obj').value, body = root.querySelector('.f-r-body').value;
        if (body.trim().length < 5) throw new Error('Écris ta réponse avant de l’envoyer.');
        await fn('reply-send', { workspace_id: d.ws_id, reply_id: live.r.id, subject, body });
        note.textContent = 'Réponse envoyée.';
        onDone?.('reponse', cur);
      } else if (act === 'x-handled') {
        const { error } = await supabase.from('replies').update({ handled: true }).eq('id', live.r.id); if (error) throw error;
        note.textContent = 'Réponse marquée comme traitée.';
        onDone?.('traitee', cur);
      } else if (act === 'x-li') {
        const txt = root.querySelector('.f-li-note').value.trim();
        if (!txt) throw new Error('La note est vide.');
        const { error } = await supabase.from('prospects').update({ linkedin_note: txt.slice(0, 200), linkedin_status: 'a_envoyer' }).eq('id', d.prospect_id); if (error) throw error;
        note.textContent = 'Invitation validée : Lina s’en occupe.';
        onDone?.('linkedin', cur);
      } else if (act === 'x-ignore' || act === 'x-unignore') {
        const to = act === 'x-ignore' ? 'ignore' : 'nouveau';
        const { error } = await supabase.from('prospects').update({ status: to }).eq('id', d.prospect_id); if (error) throw error;
        note.textContent = to === 'ignore' ? 'Prospect écarté. L’équipe ne le contactera plus.' : 'Prospect remis dans la prospection.';
        if (to === 'ignore') onDone?.('ecarte', cur);
      }
      await loadActions(cur);
    } catch (err) { note.textContent = err.message ?? String(err); b.disabled = false; }
  }

  async function googleLink(q) {
    const name = `${q.name} ${q.data?.address && q.data.address !== 'Lyon' ? q.data.address : ''}`.trim();
    let url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}`)}`;
    const run = getRunId();
    if (run) {
      try {
        const r = await qfetch(`/api/runs/${run}/places/${encodeURIComponent(q.id)}/google`).then((x) => x.json());
        if (r.gid) url += `&query_place_id=${encodeURIComponent(r.gid)}`;
      } catch {}
    }
    return url;
  }

  function render() {
    const q = cur;
    const d = q.data ?? {};
    const lu = q.read;
    const items = lu ? bilan(q) : [];
    const manque = items.filter(([ok]) => !ok), deja = items.filter(([ok]) => ok);
    const tel = (t) => { const x = String(t).replace(/[^\d+]/g, '').replace(/^\+33/, '0').replace(/^0033/, '0'); return /^0\d{9}$/.test(x) ? x.replace(/(\d{2})(?=\d)/g, '$1 ') : t; };
    const phones = [...new Set([...(q.telephones ?? []), d.phone].filter(Boolean).map(tel))];
    const email = q.email ?? q.to ?? null;
    root.innerHTML = `
      <div class="f-head">
        <span class="f-ic"></span>
        <div class="f-title"><h2>${esc(q.name)}</h2><p>${esc([d.type, d.address].filter(Boolean).join(' · '))}</p></div>
        <button type="button" class="f-x" data-act="close" aria-label="Fermer">×</button>
      </div>
      <div class="f-state" data-s="${esc(q.state)}"><span>${esc(STATE[q.state] ?? '')}</span>${q.score != null ? `<b>${q.score}<i>/100</i></b>` : ''}</div>
      ${q.score != null && q.raisons?.length ? `<details class="f-prio"><summary>Pourquoi cette priorité ?</summary><ul>${q.raisons.map((r) => `<li><b>${r.pts > 0 ? '+' : ''}${r.pts}</b> ${esc(r.texte)}</li>`).join('')}</ul><p>Départ à 30 points. Une règle simple, la même pour tous tes prospects.</p></details>` : ''}
      ${q.reponse ? `<section><h3>Sa réponse</h3><p class="f-quote">${esc(q.reponse.resume || 'Réponse reçue')}</p></section>` : ''}
      ${q.opp ? `<section><h3>L’opportunité</h3><p class="f-quote">${esc(q.opp.titre ?? '')}</p>${q.opp.url ? `<p><a href="${esc(q.opp.url)}" target="_blank" rel="noopener">Voir la source</a></p>` : ''}</section>` : ''}
      ${lu ? `<section><h3>${q.signals?.bingoo ? 'Pourquoi lui, maintenant' : 'Ce qui lui manque'}</h3>
        ${manque.length ? `<ul class="f-list">${manque.map(([, t]) => `<li class="${q.signals?.bingoo ? 'ok hot' : 'no'}"><i></i>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${deja.length ? `<h4>${q.signals?.bingoo ? 'Ce que l’équipe a relevé' : 'Ce qu’il a déjà'}</h4><ul class="f-list">${deja.map(([, t]) => `<li class="ok"><i></i>${esc(t)}</li>`).join('')}</ul>` : ''}
      </section>` : `<section><p class="f-empty">${q.state === 'lecture' ? 'Un lecteur est sur son site en ce moment…' : 'Pas encore lu : un lecteur va passer.'}</p></section>`}
      <section><h3>Contacts</h3><dl class="f-kv">
        ${d.decideur ? `<dt>Décideur</dt><dd>${esc(d.decideur)}</dd>` : ''}
        ${d.website ? `<dt>Site</dt><dd><a href="${esc(d.website)}" target="_blank" rel="noopener">${esc(host(d.website))}</a></dd>` : ''}
        <dt>E-mail</dt><dd>${email ? `${esc(email)}${q.email_source ? `<small>trouvé sur ${esc(q.email_source)}</small>` : ''}` : lu ? '<em>aucun affiché</em>' : '<em>pas encore lu</em>'}</dd>
        <dt>Téléphone</dt><dd>${phones.length ? phones.map(esc).join('<br>') : '<em>aucun</em>'}</dd>
        ${d.horaires ? `<dt>Horaires</dt><dd>${esc(d.horaires)}</dd>` : ''}
      </dl>
      <div class="f-links">${LINKS[q.state] ? `<a class="f-btn" href="${LINKS[q.state][0]}">${LINKS[q.state][1]}</a>` : (d.kind ?? 'prospect') === 'prospect' ? '<a class="f-btn" href="/#/prospects">Ouvrir dans Bingoo!</a>' : ''}${!email && (d.kind ?? 'prospect') === 'prospect' && d.prospect_id && lu ? '<button type="button" class="f-btn" data-act="enrich">Chercher son e-mail</button>' : ''}<a class="f-btn ghost" data-g href="#" target="_blank" rel="noopener">Google Maps</a></div></section>
      ${q.mail ? `<section class="f-mail"><h3>Le message préparé</h3>
        <label>Objet</label><input class="f-obj" ${q.state === 'pret' && d.message_id ? '' : 'readonly'} value="${esc(q.objet ?? '')}">
        <label>Message</label><textarea class="f-body" rows="9" ${q.state === 'pret' && d.message_id ? '' : 'readonly'}>${esc(q.mail)}</textarea>
        <p class="f-to">À : ${esc(q.to ?? email ?? '')}</p>
        ${q.state === 'pret' && d.message_id ? `<div class="f-dec"><button type="button" class="f-btn" data-act="send-ask">Envoyer</button><button type="button" class="f-btn ghost" data-act="save">Enregistrer</button></div>
        <div class="f-confirm" hidden><p>Envoyer ce message maintenant à ${esc(q.to ?? email ?? '')} ?</p><div class="f-dec"><button type="button" class="f-btn" data-act="send">Oui, envoyer</button><button type="button" class="f-btn ghost" data-act="send-cancel">Annuler</button></div></div>
        <p class="f-note">Rien ne part sans toi.</p>` : q.state === 'pret' ? '<div class="f-dec"><a class="f-btn" href="/#/valider">Valider dans Bingoo!</a></div>' : ''}
      </section>` : ''}
      ${d.prospect_id ? '<section class="f-actions" data-acts><h3>Agir</h3><p class="f-empty">Chargement…</p></section>' : ''}
      <p class="f-act-note" role="status"></p>
      ${q.journal?.length ? `<section><h3>Ce que l’équipe a fait</h3><ol class="f-log">${q.journal.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></section>` : ''}`;
    root.querySelector('.f-ic').append(icon(q.state));
    if (d.prospect_id) loadActions(q);
    const g = root.querySelector('[data-g]');
    googleLink(q).then((u) => { if (g) g.href = u; });
  }

  function open(q) { cur = q; root.hidden = false; document.body.classList.add('has-fiche'); render(); root.classList.remove('in'); void root.offsetWidth; root.classList.add('in'); }

  /** Un commerce de la carte que l'équipe n'a pas (encore) vu : son nom, Google Maps, et un lecteur à envoyer. */
  function openPoi(poi, { ville, onSend }) {
    cur = { id: null, poi };
    root.hidden = false;
    document.body.classList.add('has-fiche');
    const type = TYPES[poi.sub] ?? TYPES[poi.cls] ?? poi.sub ?? poi.cls ?? 'commerce';
    const gm = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${poi.name} ${ville ?? ''}`.trim())}`;
    root.innerHTML = `
      <div class="f-head"><div class="f-title"><h2>${esc(poi.name)}</h2><p>${esc(type)}${ville ? ` · ${esc(ville)}` : ''}</p></div>
        <button type="button" class="f-x" data-act="close" aria-label="Fermer">×</button></div>
      <div class="f-state"><span>Pas encore vu par l'équipe</span></div>
      <section><p class="f-empty">Envoie un lecteur : il trouve son site, le lit, relève ce qui lui manque, ses contacts, et prépare un mail s'il est intéressant.</p>
        <div class="f-links"><button type="button" class="f-btn" data-send>Envoyer un lecteur</button><a class="f-btn ghost" href="${esc(gm)}" target="_blank" rel="noopener">Voir sur Google Maps</a></div>
        <p class="f-note" data-msg hidden></p></section>`;
    root.querySelector('[data-send]').addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      const msg = root.querySelector('[data-msg]');
      try { await onSend(poi); msg.textContent = 'Un lecteur est en route.'; } catch (err) { msg.textContent = err.message; }
      msg.hidden = false;
    });
    root.classList.remove('in'); void root.offsetWidth; root.classList.add('in');
  }
  function close() { cur = null; root.hidden = true; document.body.classList.remove('has-fiche'); onClose?.(); }
  function refresh(q) { if (cur && q && cur.id === q.id && !root.contains(document.activeElement)) render(); }
  return { open, openPoi, close, refresh, get current() { return cur; } };
}
