import B from "../assets/splash/B.png";
import i from "../assets/splash/i.png";
import n from "../assets/splash/n.png";
import g from "../assets/splash/g.png";
import o1 from "../assets/splash/o1.png";
import o2 from "../assets/splash/o2.png";
import sparks from "../assets/splash/sparks.png";
import bang from "../assets/splash/bang.png";

// Le vrai logo découpé (mêmes formes, même police) : lettres, 3 traits au-dessus des deux « o », « ! »
const PIECES = [
  ["B", B, 0, 80],
  ["i", i, 81, 110],
  ["n", n, 111, 179],
  ["g", g, 180, 250],
  ["o1", o1, 251, 315],
  ["o2", o2, 316, 379],
  ["sparks", sparks, 250, 360],
  ["bang", bang, 380, 419],
];
const pct = (v) => `${(v / 420) * 100}%`;

/** Écran de chargement Bingoo! : lettres une par une, les 3 traits sur les « oo », le « ! » qui surgit et vibre. Même rendu que index.html. */
export default function Splash() {
  // Déjà joué au démarrage : les lettres restent en place, seuls les traits et le « ! » restent animés
  const played = performance.now() > 5000;
  return (
    <div className={`bingoo-splash${played ? " bingoo-splash-played" : ""}`} role="status" aria-label="Chargement de Bingoo!">
      <div className="bingoo-splash-waves" aria-hidden><span /><span /><span /></div>
      <div className="bingoo-splash-word" role="img" aria-label="Bingoo!">
        {PIECES.map(([n, src, a, b], i) => <img key={n} src={src} alt="" draggable={false} className={n === "sparks" ? "bsp" : n === "bang" ? "bbg" : "bl"} style={{ left: pct(a), width: pct(b - a + 1), animationDelay: n === "sparks" || n === "bang" ? undefined : `${i * 0.15}s` }} />)}
      </div>
      <div className="bingoo-splash-dots" aria-hidden><span /><span /><span /></div>
    </div>
  );
}
