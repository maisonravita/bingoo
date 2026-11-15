// Musique des vidéos pub : composée dans le navigateur (Web Audio), donc libre de droits par construction.
// Trois ambiances, calées sur la durée de la vidéo, avec un fondu à la fin.

export const AMBIANCES = { energique: "Énergique", douce: "Douce", tech: "Tech" };

// Suite d'accords (la mineur, fa, do, sol) : notes MIDI des accords et des basses
const ACCORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const BASSES = [45, 41, 48, 43];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function bruit(ac) {
  const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/** Programme la musique sur `sortie` à partir de `debut` (secondes du contexte audio), pour `duree` secondes. */
export function jouerMusique(ac, sortie, ambiance, duree, debut = ac.currentTime + 0.05, graine = 0) {
  // Chaque SaaS a sa musique : tonalité, suite d'accords, motif d'arpège et tempo tirés de sa graine
  const tr = (graine % 7) - 3;
  const SUITES = [[0, 1, 2, 3], [2, 3, 0, 1], [0, 3, 1, 2], [1, 2, 3, 0]], suite = SUITES[(graine >>> 3) % 4];
  const MOTIFS = [[0, 1, 2, 1, 0, 2, 1, 2], [0, 2, 1, 2, 0, 1, 2, 1], [2, 1, 0, 1, 2, 0, 1, 0]], motifArp = MOTIFS[(graine >>> 5) % 3];
  const master = ac.createGain(); master.connect(sortie);
  master.gain.setValueAtTime(0, debut);
  master.gain.linearRampToValueAtTime(0.7, debut + 0.6);
  master.gain.setValueAtTime(0.7, debut + duree - 1.6);
  master.gain.linearRampToValueAtTime(0, debut + duree);
  const B = bruit(ac);
  const bpm = (ambiance === "douce" ? 88 : ambiance === "tech" ? 112 : 124) + ((graine >>> 8) % 5) - 2, temps = 60 / bpm, mesure = temps * 4;
  const fin = debut + duree;

  const note = (type, f, t, d, g, { a = 0.01, filtre = 0, q = 0.7, detune = 0 } = {}) => {
    if (t >= fin) return;
    const o = ac.createOscillator(), e = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.setValueAtTime(detune, t);
    e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + a); e.gain.exponentialRampToValueAtTime(0.0001, t + d);
    let n = o;
    if (filtre) { const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(filtre, t); lp.Q.value = q; o.connect(lp); n = lp; }
    n.connect(e); e.connect(master); o.start(t); o.stop(t + d + 0.05);
  };
  const grosseCaisse = (t, g = 0.9) => {
    if (t >= fin) return;
    const o = ac.createOscillator(), e = ac.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.13);
    e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(e); e.connect(master); o.start(t); o.stop(t + 0.35);
  };
  const souffle = (t, d, g, f, type = "highpass") => {
    if (t >= fin) return;
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), e = ac.createGain();
    s.buffer = B; fl.type = type; fl.frequency.value = f; e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl); fl.connect(e); e.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
  };

  for (let m = 0, t0 = debut; t0 < fin; m++, t0 += mesure) {
    const k = suite[m % 4], acc = ACCORDS[k].map((n) => n + tr);
    // Nappe : deux scies désaccordées, filtrées
    for (const n of acc) for (const dt of [-7, 7]) note("sawtooth", hz(n), t0, mesure * 0.98, ambiance === "douce" ? 0.035 : 0.022, { a: ambiance === "douce" ? 0.5 : 0.08, filtre: ambiance === "tech" ? 700 : 1300, detune: dt });
    if (ambiance === "douce") {
      // Arpège doux en notes longues, léger frottement
      for (let i = 0; i < 8; i++) note("triangle", hz(acc[i % 3] + 12), t0 + i * temps / 2, temps * 1.6, 0.06, { a: 0.02, filtre: 2600 });
      for (let i = 0; i < 4; i++) souffle(t0 + i * temps + temps / 2, 0.06, 0.03, 6000);
      note("sine", hz(BASSES[k] + tr), t0, mesure * 0.95, 0.12, { a: 0.2 });
      continue;
    }
    for (let i = 0; i < 4; i++) {
      const tb = t0 + i * temps;
      if (ambiance === "energique" || i % 2 === 0) grosseCaisse(tb);
      if (ambiance === "tech" && i % 2 === 1) souffle(tb, 0.12, 0.25, 1500, "bandpass");
      // Charleston sur les contretemps (et en doubles croches pour « tech »)
      souffle(tb + temps / 2, 0.05, 0.12, 8000);
      if (ambiance === "tech") souffle(tb + temps / 4, 0.03, 0.05, 9000), souffle(tb + 3 * temps / 4, 0.03, 0.05, 9000);
      // Basse en croches, coupée au moment de la grosse caisse (effet « pompe »)
      for (const x of [0, 0.5]) note(ambiance === "tech" ? "sawtooth" : "square", hz(BASSES[k] + tr), tb + x * temps + 0.03, temps * 0.42, ambiance === "tech" ? 0.09 : 0.07, { filtre: ambiance === "tech" ? 420 : 600 });
    }
    if (ambiance === "energique") {
      // Arpège brillant en doubles croches
      for (let i = 0; i < 16; i++) note("square", hz(acc[motifArp[i % 8]] + 12), t0 + i * temps / 4, temps / 4 * 0.9, 0.035, { a: 0.005, filtre: 3200 });
    }
  }
  return () => { try { master.disconnect(); } catch { /* déjà arrêtée */ } };
}

/** Écoute directe (aperçu) : renvoie une fonction pour arrêter. */
export function ecouterMusique(ambiance, duree, graine = 0) {
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const stop = jouerMusique(ac, ac.destination, ambiance, duree, ac.currentTime + 0.05, graine);
  return () => { stop(); ac.close().catch(() => {}); };
}
