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

/** Durée d'un temps (secondes) de la musique tirée pour cette graine : les scènes s'y calent. */
export const tempoMusique = (ambiance, graine = 0) => (AMBIANCES[ambiance] ? 60 / ((ambiance === "douce" ? 88 : ambiance === "tech" ? 112 : 124) + ((graine >>> 8) % 5) - 2) : 0);

/** Programme la musique sur `sortie` à partir de `debut` (secondes du contexte audio), pour `duree` secondes.
 * `coupes` (facultatif) : changements de scène { t, type, vague } qui reçoivent un son de transition. */
export function jouerMusique(ac, sortie, ambiance, duree, debut = ac.currentTime + 0.05, graine = 0, coupes = []) {
  // Chaque SaaS a sa musique : tonalité, suite d'accords, motif d'arpège et tempo tirés de sa graine
  const tr = (graine % 7) - 3;
  const SUITES = [[0, 1, 2, 3], [2, 3, 0, 1], [0, 3, 1, 2], [1, 2, 3, 0]], suite = SUITES[(graine >>> 3) % 4];
  const MOTIFS = [[0, 1, 2, 1, 0, 2, 1, 2], [0, 2, 1, 2, 0, 1, 2, 1], [2, 1, 0, 1, 2, 0, 1, 0]], motifArp = MOTIFS[(graine >>> 5) % 3];
  // Vidéo à bruitages : ils passent devant, la musique se fait plus discrète
  const bruits = Array.isArray(coupes?.sons) && coupes.sons.length ? jouerBruitages(ac, sortie, coupes.sons, debut) : null;
  const master = ac.createGain(); master.connect(sortie);
  master.gain.setValueAtTime(0, debut);
  master.gain.linearRampToValueAtTime(bruits ? 0.4 : 0.7, debut + 0.6);
  master.gain.setValueAtTime(bruits ? 0.4 : 0.7, debut + duree - 1.6);
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

  // Bruitages de transition, synthétisés : souffle qui monte jusqu'à la coupe, coup sourd sur le logo final
  const sfx = ac.createGain(); sfx.gain.value = ambiance === "douce" ? 0.6 : 1; sfx.connect(master);
  for (const c of coupes ?? []) {
    const tc = debut + c.t;
    if (c.t > 0.1 && tc < fin) {
      const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), e = ac.createGain(), d = c.vague ? 0.42 : 0.26;
      s.buffer = B; bp.type = "bandpass"; bp.Q.value = 1.2; bp.frequency.setValueAtTime(500, tc - d); bp.frequency.exponentialRampToValueAtTime(5000, tc);
      e.gain.setValueAtTime(0.0001, tc - d); e.gain.exponentialRampToValueAtTime(c.vague ? 0.22 : 0.12, tc - 0.02); e.gain.exponentialRampToValueAtTime(0.0001, tc + 0.08);
      s.connect(bp); bp.connect(e); e.connect(sfx); s.start(tc - d, 0.1); s.stop(tc + 0.1);
    }
    if (c.type === "logo" || c.type === "impact") {
      const o = ac.createOscillator(), e = ac.createGain(); o.frequency.setValueAtTime(110, tc); o.frequency.exponentialRampToValueAtTime(38, tc + 0.4);
      e.gain.setValueAtTime(0.5, tc); e.gain.exponentialRampToValueAtTime(0.0001, tc + 0.6); o.connect(e); e.connect(sfx); o.start(tc); o.stop(tc + 0.65);
    }
  }

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
  return () => { try { master.disconnect(); bruits?.disconnect(); } catch { /* déjà arrêtée */ } };
}

/** Bruitages calés sur l'image (allure « film ») : frappes de clavier, clic de souris, souffles, coups, cloches.
 * `sons` : [{ t, son, f, g, d, monte }] ; tout est fabriqué ici, sans aucun enregistrement. */
export function jouerBruitages(ac, sortie, sons, debut) {
  const bus = ac.createGain(); bus.gain.value = 0.62; bus.connect(sortie); const blanc = bruit(ac);
  const env = (t, pic, att, dec) => { const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pic), t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec); g.connect(bus); return g; };
  const souffleBruit = (t, d, pic, type, f0, f1, Q = 0.8, att = 0.002) => { const src = ac.createBufferSource(); src.buffer = blanc; src.loop = true; const fl = ac.createBiquadFilter(); fl.type = type; fl.Q.value = Q; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + d); src.connect(fl); fl.connect(env(t, pic, att, d)); src.start(t, Math.random() * 0.8); src.stop(t + att + d + 0.05); };
  const sinus = (t, f0, f1, d, pic, att = 0.002, type = "sine") => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + Math.min(d, 0.08)); o.connect(env(t, pic, att, d)); o.start(t); o.stop(t + att + d + 0.05); };
  for (const x of sons) {
    const t = debut + Math.max(0, x.t), g = x.g ?? 1;
    if (x.son === "touche" || x.son === "espace" || x.son === "entree") { // un clic aigu, un « toc » grave, puis la touche qui remonte
      const k = x.son === "entree" ? 1.5 : x.son === "espace" ? 1.15 : 1, grave = x.son === "entree" ? 105 : x.son === "espace" ? 120 : 170 + Math.random() * 60;
      souffleBruit(t, 0.012, 0.22 * g * k, "bandpass", 3200 + Math.random() * 900, 2600, 1.2); sinus(t, grave * 1.6, grave, x.son === "touche" ? 0.03 : 0.055, 0.2 * g * k); souffleBruit(t, 0.025, 0.1 * g * k, "bandpass", 900, 700, 0.9); souffleBruit(t + 0.055 + Math.random() * 0.02, 0.008, 0.07 * g * k, "highpass", 3500, 3500);
    } else if (x.son === "clic") { souffleBruit(t, 0.008, 0.3, "bandpass", 3400, 3000, 1.5); sinus(t, 900, 900, 0.008, 0.1); souffleBruit(t + 0.11, 0.008, 0.2, "bandpass", 2600, 2400, 1.5); }
    else if (x.son === "pop") sinus(t, (x.f ?? 600) * 1.5, x.f ?? 600, 0.06, 0.5 * g);
    else if (x.son === "tic") sinus(t, x.f ?? 2400, x.f ?? 2400, 0.012, 0.5 * g);
    else if (x.son === "note") sinus(t, x.f ?? 880, x.f ?? 880, 0.3, 0.6 * g, 0.005, "triangle");
    else if (x.son === "coup") { sinus(t, (x.f ?? 50) * 2.6, x.f ?? 50, 0.42, 0.7 * g); souffleBruit(t, 0.03, 0.12 * g, "lowpass", 1800, 400); }
    else if (x.son === "bois") { sinus(t, 820, 820, 0.035, 0.5 * g); souffleBruit(t, 0.01, 0.18 * g, "bandpass", 2500, 2200, 1.2); }
    else if (x.son === "cloche") [[1, 1, 0.35], [2.01, 0.5, 0.22], [3.02, 0.25, 0.14], [4.2, 0.12, 0.08]].forEach(([r, a, dd]) => sinus(t, (x.f ?? 880) * r, (x.f ?? 880) * r, (x.d ?? 1.4) * dd * 2.2, 0.9 * g * a, 0.004));
    else if (x.son === "sifflet") { const o = ac.createOscillator(); o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(380, t + (x.d ?? 0.4)); const e = ac.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.5 * g, t + (x.d ?? 0.4)); e.gain.linearRampToValueAtTime(0.0001, t + (x.d ?? 0.4) + 0.02); o.connect(e); e.connect(bus); o.start(t); o.stop(t + (x.d ?? 0.4) + 0.05); }
    else if (x.son === "souffle") { const d = x.d ?? 0.5; if (x.monte) souffleBruit(t, 0.02, 1.4 * g, "lowpass", 300, 7000, 0.7, d); else souffleBruit(t, d * 0.55, 1.2 * g, "lowpass", 2600, 500, 0.7, d * 0.45); }
  }
  return bus;
}

/** Écoute directe (aperçu) : renvoie une fonction pour arrêter. */
export function ecouterMusique(ambiance, duree, graine = 0, coupes = []) {
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const stop = jouerMusique(ac, ac.destination, ambiance, duree, ac.currentTime + 0.05, graine, coupes);
  return () => { stop(); ac.close().catch(() => {}); };
}
