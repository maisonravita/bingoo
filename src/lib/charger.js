// Chargement d'un morceau du site à la demande. Après une mise en ligne, un onglet resté ouvert peut demander un morceau
// qui n'existe plus : on recharge alors la page une fois (version à jour) au lieu d'afficher une erreur.
export function charger(importer) {
  return importer().then((m) => { try { sessionStorage.removeItem("bingoo-recharge"); } catch { /* */ } return m; }, (e) => {
    let deja = false;
    try { deja = sessionStorage.getItem("bingoo-recharge") === "1"; sessionStorage.setItem("bingoo-recharge", "1"); } catch { /* */ }
    if (!deja) { window.location.reload(); return new Promise(() => {}); }
    throw e;
  });
}
