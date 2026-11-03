import logo from "../assets/logo-mono-white.png";

/** Écran de chargement Bingoo! : fond orange, logo blanc, ondes de radar. Même rendu que celui de index.html (avant le démarrage). */
export default function Splash() {
  return (
    <div className="bingoo-splash" role="status" aria-label="Chargement de Bingoo!">
      <div className="bingoo-splash-waves" aria-hidden><span /><span /><span /></div>
      <img src={logo} alt="Bingoo!" className="bingoo-splash-logo" draggable={false} />
      <div className="bingoo-splash-dots" aria-hidden><span /><span /><span /></div>
    </div>
  );
}
