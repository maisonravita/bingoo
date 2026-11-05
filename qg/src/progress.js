// L'écran de chargement de la carte : le logo, l'étape en cours et un pourcentage qui monte jusqu'à 100.
// Les étapes poussent le pourcentage (jamais en arrière) ; pendant une attente longue (première visite d'une ville),
// il avance doucement vers un plafond, et saute au bon niveau dès que l'étape se termine.
let el = null, shown = 0, target = 0, creepTo = 0, creepRate = 0, raf = 0, finish = null;
const $ = (s) => el?.querySelector(s);

function mount() {
  if (el) return;
  el = document.createElement('div');
  el.id = 'bq-load';
  el.setAttribute('role', 'progressbar');
  el.setAttribute('aria-valuemin', '0');
  el.setAttribute('aria-valuemax', '100');
  el.innerHTML = `<div class="bl-card">
    <img src="${import.meta.env.BASE_URL}logo.png" alt="Bingoo!" width="132">
    <p class="bl-step">Ton équipe arrive…</p>
    <div class="bl-bar"><i></i></div>
    <p class="bl-pct"><b>0</b> %</p>
    <p class="bl-hint"></p>
  </div>`;
  document.getElementById('qg').append(el);
}
let last = 0;
function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (creepRate && target < creepTo) target = Math.min(creepTo, target + (creepTo - target) * creepRate * dt);
  shown += (target - shown) * Math.min(1, dt * 7);
  if (target - shown < 0.3) shown = target;
  const v = Math.floor(shown);
  $('.bl-bar i').style.width = `${shown}%`;
  $('.bl-pct b').textContent = String(v);
  el.setAttribute('aria-valuenow', String(v));
  if (finish && shown >= 100) { const f = finish; finish = null; el.classList.add('out'); setTimeout(() => { el.hidden = true; el.classList.remove('out'); f(); }, 380); cancelAnimationFrame(raf); raf = 0; return; }
  raf = requestAnimationFrame(tick);
}
function run() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }

/** Une étape : le pourcentage atteint au moins `pct`, avec son texte. */
export function step(pct, texte, hint = '') {
  mount();
  el.hidden = false;
  run();
  target = Math.max(target, Math.min(99, pct));
  creepRate = 0;
  if (texte) $('.bl-step').textContent = texte;
  $('.bl-hint').textContent = hint;
}
/** Une attente dont on ne connaît pas la durée : on avance doucement vers `vers` (sans jamais l'atteindre). */
export function creep(vers, secondes = 30) {
  mount();
  creepTo = Math.min(99, vers);
  creepRate = 2.2 / Math.max(1, secondes);
  run();
}
/** Fin : la barre file à 100 %, puis l'écran s'efface. */
export function done() {
  mount();
  target = 100; creepRate = 0;
  $('.bl-step').textContent = 'C’est prêt !';
  $('.bl-hint').textContent = '';
  return new Promise((res) => { finish = res; run(); });
}
export function fail() { if (el) el.hidden = true; cancelAnimationFrame(raf); raf = 0; }
