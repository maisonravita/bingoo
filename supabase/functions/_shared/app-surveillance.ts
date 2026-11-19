// Surveillance de pages web pour les SaaS construits (veille de prix, de concurrents, d'offres, de disponibilité, de mises à jour).
// Convention : un élément d'une collection qui a un champ « url_surveillee » est visité régulièrement (« frequence » : "heure" ou "jour").
// Bingoo! remplit tout seul : derniere_verif, dernier_changement, statut_surveillance ("ok" | "change" | "erreur"), extrait (le nouveau texte),
// nb_changements ; et prévient par e-mail « email_alerte » à chaque changement. Respecte robots.txt ; une page lue au plus par heure.
import { admin } from "./core.ts";
import { fetchHtml, textOf } from "./analyze.ts";
import { robots } from "./marche-saas.ts";

const normal = (t: string) => t.replace(/\s+/g, " ").trim();
const phrases = (t: string) => new Set(t.split(/(?<=[.!?])\s+|\s{2,}|\n/).map((x) => normal(x)).filter((x) => x.length >= 12));
async function empreinte(t: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, "0")).join("");
}
const autorise = (interdit: string[], u: string) => { const p = new URL(u).pathname; return !interdit.some((r) => r !== "/" ? p.startsWith(r) : true); };

export async function surveillanceCron(max = 120) {
  const { data } = await admin.from("saas_app_rows").select("id, app_id, espace_id, data")
    .not("data->>url_surveillee", "is", null).order("maj", { ascending: true }).limit(max * 3);
  const maintenant = Date.now();
  const aFaire = ((data ?? []) as any[]).filter((r) => {
    const u = String(r.data?.url_surveillee ?? "").trim();
    if (!/^https?:\/\/[^\s]+\.[^\s]+/.test(u)) return false;
    const der = Date.parse(r.data?.derniere_verif ?? "") || 0;
    const delai = r.data?.frequence === "heure" ? 55 * 60e3 : 23 * 3600e3;
    return maintenant - der >= delai;
  }).slice(0, max);
  const robotsDe = new Map<string, string[]>();
  let lues = 0, changees = 0, erreurs = 0;
  for (const r of aFaire) {
    const d = { ...(r.data ?? {}) };
    const url = String(d.url_surveillee).trim();
    const maj: Record<string, unknown> = { derniere_verif: new Date().toISOString() };
    try {
      const origine = new URL(url).origin;
      if (!robotsDe.has(origine)) robotsDe.set(origine, await robots(origine).catch(() => []));
      if (!autorise(robotsDe.get(origine)!, url)) throw new Error("Ce site interdit la lecture automatique de cette page");
      const texte = normal(textOf((await fetchHtml(url)).slice(0, 600_000))).slice(0, 8000);
      if (texte.length < 30) throw new Error("Page vide ou illisible sans navigateur");
      const emp = await empreinte(texte);
      lues++;
      if (!d._surv_empreinte) Object.assign(maj, { statut_surveillance: "ok", _surv_empreinte: emp, _surv_texte: texte });
      else if (d._surv_empreinte !== emp) {
        const avant = phrases(String(d._surv_texte ?? ""));
        const nouveau = [...phrases(texte)].filter((x) => !avant.has(x)).join(" · ").slice(0, 600);
        Object.assign(maj, { statut_surveillance: "change", dernier_changement: new Date().toISOString(), extrait: nouveau || "La page a changé.", nb_changements: Number(d.nb_changements ?? 0) + 1, _surv_empreinte: emp, _surv_texte: texte });
        changees++;
        const a = String(d.email_alerte ?? "").trim();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a)) {
          const nom = String(d.nom ?? d.titre ?? url).slice(0, 80);
          await admin.from("saas_app_envois").insert({ app_id: r.app_id, espace_id: r.espace_id, a, sujet: `Changement détecté : ${nom}`, quand: new Date().toISOString(),
            payload: { texte: `La page que vous surveillez a changé :\n${url}\n\nCe qui est nouveau :\n${nouveau || "(mise en page modifiée)"}`, bouton: "Voir la page", lien: url } });
        }
      } else Object.assign(maj, { statut_surveillance: "ok" });
    } catch (e) {
      erreurs++;
      Object.assign(maj, { statut_surveillance: "erreur", erreur_surveillance: String((e as Error)?.message ?? e).slice(0, 160) });
    }
    await admin.from("saas_app_rows").update({ data: { ...d, ...maj }, maj: new Date().toISOString() }).eq("id", r.id);
  }
  return { a_faire: aFaire.length, lues, changees, erreurs };
}
