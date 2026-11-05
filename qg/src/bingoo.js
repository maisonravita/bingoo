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

export function bingooUi({ night, world, canvas, play }) {
  const root = document.getElementById('qg');
  const bar = document.createElement('div');
  bar.className = 'bq-bar';
  const clusters = night.clusters ?? [];
  bar.innerHTML = `
    ${clusters.length > 1 ? `<label class="bq-ville"><span>Ville</span><select id="bq-ville">${clusters.map((c, i) => `<option value="${i}" ${i === night.zone ? 'selected' : ''}>${esc(c.ville || `Zone ${i + 1}`)} (${c.n})</option>`).join('')}</select></label>` : ''}
    <button type="button" class="bq-btn" id="bq-share">Partager ma nuit</button>`;
  root.append(bar);
  const live = document.createElement('p');
  live.className = 'bq-live';
  live.innerHTML = '<i></i>En direct : les nouvelles actions arrivent toutes seules';
  root.append(live);

  // sur téléphone : les visages de l'équipe ; celui qui travaille est entouré d'orange
  const team = document.createElement('div');
  team.className = 'bq-team';
  const PH = { chef: 'iris', eclaireur: 'leo', 'lecteur-1': 'sam', 'lecteur-2': 'max', 'lecteur-3': 'lina', 'redacteur-1': 'hugo', 'redacteur-2': 'ines', paul: 'paul', oscar: 'oscar' };
  team.innerHTML = Object.entries(PH).map(([id, n]) => `<img data-id="${id}" src="/salaries/${n}.png" alt="">`).join('');
  root.append(team);
  setInterval(() => { const w = world(); if (!w) return; for (const img of team.children) { const a = w.actors.get(img.dataset.id); img.classList.toggle('on', Boolean(a && (a.target || a.busy) && a.alpha > 0.5)); } }, 500);
  bar.querySelector('#bq-ville')?.addEventListener('change', (e) => {
    const u = new URL(location.href); u.searchParams.set('zone', e.target.value); u.searchParams.delete('premiere'); location.href = u.toString();
  });
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
  // la toute première mission : à la fin, un pas vers la suite
  if (new URLSearchParams(location.search).has('premiere')) {
    world()?.on((type) => {
      if (type !== 'end' || document.getElementById('bq-first')) return;
      const b = bilan(world());
      const box = Object.assign(document.createElement('div'), { id: 'bq-first', className: 'bq-modal' });
      box.innerHTML = `<div class="bq-card"><p style="font-size:18px;font-weight:700">Ta première mission est terminée.</p>
        <p>${esc(phrases(b).join(', ') || 'Ton équipe a commencé à travailler')}. Elle continue chaque nuit : demain matin, tout sera prêt dans Aujourd’hui.</p>
        <div class="bq-row"><a class="bq-btn" href="/#/">Voir mes prospects</a><button type="button" class="bq-btn ghost" id="bq-stay">Rester sur la carte</button></div></div>`;
      root.append(box);
      box.querySelector('#bq-stay').onclick = () => box.remove();
    });
  }
  void play;
}
