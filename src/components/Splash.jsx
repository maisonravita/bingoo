/** Écran de chargement Bingoo! : « Bingoo » lettre par lettre, les 3 traits sur le dernier « o », le « ! » qui surgit et vibre. Même rendu que index.html. */
export default function Splash() {
  // Déjà joué au démarrage : on ne rejoue pas l'apparition des lettres, seuls les traits et le « ! » restent animés
  const played = performance.now() > 5000;
  return (
    <div className={`bingoo-splash${played ? " bingoo-splash-played" : ""}`} role="status" aria-label="Chargement de Bingoo!">
      <div className="bingoo-splash-waves" aria-hidden><span /><span /><span /></div>
      <div className="bingoo-splash-word" aria-label="Bingoo!">
        {"Bingoo".split("").map((c, i) => i === 5
          ? <span key={i} className="bl bo" style={{ animationDelay: `${i * 0.15}s` }}>o<span className="bx-sparks" aria-hidden><i /><i /><i /></span></span>
          : <span key={i} className="bl" style={{ animationDelay: `${i * 0.15}s` }}>{c}</span>)}
        <span className="bx"><span className="bx-bang">!</span></span>
      </div>
      <div className="bingoo-splash-dots" aria-hidden><span /><span /><span /></div>
    </div>
  );
}
