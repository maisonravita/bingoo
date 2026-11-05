// Petits sons 8-bit, fabriqués à la volée (aucun fichier) : pièce, ouverture d'une fiche, niveau terminé, refus.
// Coupables d'un clic ; le choix est gardé dans le navigateur. Rien ne sonne avant un premier geste de la personne.
let ctx = null;
let on = (() => { try { return localStorage.getItem('bingoo-qg-son') !== '0'; } catch { return true; } })();

function ac() {
  if (!on) return null;
  try { ctx ??= new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
/** Une note carrée (fréquence en Hz, début et durée en secondes). */
function note(c, f, t, d, vol = 0.07, type = 'square') {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, c.currentTime + t);
  g.gain.setValueAtTime(vol, c.currentTime + t);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + d);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + t); o.stop(c.currentTime + t + d + 0.02);
}

export const son = {
  get on() { return on; },
  toggle() { on = !on; try { localStorage.setItem('bingoo-qg-son', on ? '1' : '0'); } catch { /* rien */ } if (on) son.piece(); return on; },
  piece() { const c = ac(); if (!c) return; note(c, 988, 0, 0.08); note(c, 1319, 0.08, 0.32); },
  bloc() { const c = ac(); if (!c) return; note(c, 196, 0, 0.06, 0.09); note(c, 262, 0.05, 0.1, 0.07); },
  pas() { const c = ac(); if (!c) return; note(c, 110, 0, 0.03, 0.02, 'triangle'); },
  non() { const c = ac(); if (!c) return; note(c, 220, 0, 0.12, 0.06); note(c, 165, 0.12, 0.2, 0.06); },
  niveau() {
    const c = ac(); if (!c) return;
    [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [784, 0.52], [1047, 0.64]].forEach(([f, t]) => note(c, f, t, 0.14, 0.06));
    note(c, 1319, 0.8, 0.6, 0.06);
  },
};
