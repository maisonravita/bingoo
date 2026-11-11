// Icône PNG d'une app construite par Bingoo! : carré arrondi à sa couleur, initiale en blanc (rendu dans le navigateur).
export function iconePng(nom, couleur, taille) {
  const c = document.createElement("canvas");
  c.width = c.height = taille;
  const x = c.getContext("2d");
  const r = taille * 0.22;
  x.fillStyle = /^#[0-9a-f]{6}$/i.test(couleur ?? "") ? couleur : "#4F46E5";
  x.beginPath(); x.roundRect(0, 0, taille, taille, r); x.fill();
  x.fillStyle = "#fff";
  x.font = `800 ${Math.round(taille * 0.56)}px Inter, "Plus Jakarta Sans", Arial, sans-serif`;
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(String(nom ?? "S").trim().slice(0, 1).toUpperCase(), taille / 2, taille * 0.54);
  return c.toDataURL("image/png");
}
/** Clé courte : l'icône n'est refaite que si le nom ou la couleur changent. */
export const cleIcone = (nom, couleur) => [...`${nom}|${couleur}`].reduce((h, ch) => ((h * 31 + ch.charCodeAt(0)) >>> 0), 7).toString(36);
