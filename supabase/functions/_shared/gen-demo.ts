// Données d'exemple d'un SaaS : couverture garantie, quoi qu'ait écrit l'IA.
// Un écran « Retards à relancer », « Passages du jour » ou « Terminées » restait vide au premier test parce que les
// exemples ne contenaient aucun élément de ce statut ou de cette période. Ici, on s'assure que chaque valeur d'un champ
// « choix », chaque période d'un champ date (passé, aujourd'hui, à venir) et chaque côté d'un booléen sont représentés.
// Fonction pure : testée sans base ni réseau.

type Champ = { nom: string; type: string; valeurs?: string[] };
type Collection = { nom: string; champs?: Champ[] };

const JOUR = /^(\d{4}-\d{2}-\d{2})/;
/** L'utilisateur connecté dans l'aperçu et pendant les tests (appShell : mode essai et vérification) */
export const MOI = { nom: "Camille Martin", email: "camille@exemple.fr" };

function decaler(jour: string, n: number): string {
  const d = new Date(jour + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Remplace la partie « jour » d'une date en gardant l'heure éventuelle (2026-11-21T08:30 → 2026-11-22T08:30). */
function avecJour(v: unknown, jour: string): string {
  const s = String(v ?? "");
  return JOUR.test(s) ? jour + s.slice(10) : jour;
}

/** Les éléments à modifier en priorité : ceux dont la valeur est la plus répandue (on ne retire jamais la dernière d'une valeur). */
function donneurs<T>(xs: any[], cle: (x: any) => T): number[] {
  const compte = new Map<T, number>();
  xs.forEach((x) => compte.set(cle(x), (compte.get(cle(x)) ?? 0) + 1));
  return xs.map((x, i) => [i, compte.get(cle(x)) ?? 0] as const).sort((a, b) => b[1] - a[1]).map(([i]) => i);
}

export function couvrirDemo(demo: Record<string, any>, collections: Collection[], aujourdhui: string): { demo: Record<string, any>; changements: number } {
  let changements = 0;
  const d: Record<string, any> = { ...demo };
  for (const c of collections ?? []) {
    const xs: any[] = Array.isArray(d[c.nom]) ? d[c.nom].map((x: any) => (x && typeof x === "object" ? { ...x } : x)) : [];
    if (xs.length < 3) continue;
    const pris = new Set<string>(); // une même ligne n'est modifiée qu'une fois par champ
    for (const ch of c.champs ?? []) {
      pris.clear();
      if (ch.type === "choix" && Array.isArray(ch.valeurs) && ch.valeurs.length > 1 && ch.valeurs.length <= xs.length) {
        for (const v of ch.valeurs) {
          if (xs.some((x) => x?.[ch.nom] === v)) continue;
          const compte = (val: unknown) => xs.filter((x) => x?.[ch.nom] === val).length;
          const i = donneurs(xs, (x) => x?.[ch.nom]).find((k) => !pris.has(String(k)) && compte(xs[k]?.[ch.nom]) > 1);
          if (i == null) break;
          xs[i][ch.nom] = v; pris.add(String(i)); changements++;
        }
      } else if (ch.type === "date" || ch.type === "datetime") {
        const periode = (x: any) => { const m = JOUR.exec(String(x?.[ch.nom] ?? "")); return !m ? "vide" : m[1] < aujourdhui ? "passe" : m[1] === aujourdhui ? "jour" : "futur"; };
        const voulu = xs.length >= 8 ? 2 : 1;
        for (const [p, jour] of [["jour", aujourdhui], ["passe", decaler(aujourdhui, -3)], ["futur", decaler(aujourdhui, 2)]] as const) {
          let manque = voulu - xs.filter((x) => periode(x) === p).length;
          while (manque > 0) {
            const compte = (q: string) => xs.filter((x) => periode(x) === q).length;
            const i = donneurs(xs, periode).find((k) => !pris.has(String(k)) && periode(xs[k]) !== p && (periode(xs[k]) === "vide" || compte(periode(xs[k])) > voulu));
            if (i == null) break;
            xs[i][ch.nom] = avecJour(xs[i][ch.nom], jour); pris.add(String(i)); changements++; manque--;
          }
        }
      } else if (ch.type === "booleen") {
        for (const v of [true, false]) {
          if (xs.some((x) => Boolean(x?.[ch.nom]) === v)) continue;
          const i = xs.findIndex((_, k) => !pris.has(String(k)));
          if (i < 0) break;
          xs[i][ch.nom] = v; pris.add(String(i)); changements++;
        }
      }
    }
    // Écrans « Mes demandes », « Mon profil » : ils cherchent l'utilisateur connecté par son e-mail. L'aperçu et le robot
    // se connectent en tant que Camille Martin (camille@exemple.fr) : deux éléments lui appartiennent, sinon ces blocs restent vides
    const champsMail = (c.champs ?? []).filter((ch) => ch.type === "email" || /(^|_)e?mail$/i.test(ch.nom));
    if (champsMail.length && !xs.some((x) => champsMail.some((ch) => String(x?.[ch.nom] ?? "").toLowerCase() === MOI.email))) {
      const personnes = /profil|utilisateur|membre|compte|famille|eleve|élève|adherent|adhérent|salarie|salarié|employe|candidat|client/i.test(c.nom);
      for (const k of personnes ? [0] : [0, 1]) {
        for (const ch of champsMail) xs[k][ch.nom] = MOI.email;
        if (personnes && "nom" in (xs[k] ?? {})) xs[k].nom = MOI.nom;
        changements++;
      }
    }
    d[c.nom] = xs;
  }
  return { demo: d, changements };
}
