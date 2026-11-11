// Chiffres officiels des SaaS français : le SIREN est lu sur les mentions légales du site (pas de rapprochement par le nom,
// qui confond les homonymes), puis l'annuaire public de l'État (recherche-entreprises.api.gouv.fr, gratuit) donne le chiffre
// d'affaires déposé, la tranche d'effectif et la date de création. Sans IA.
// Les entreprises qui s'opposent à la diffusion commerciale de leurs données, ou à diffusion partielle, sont ignorées.
import { admin } from "./core.ts";
import { safeFetchText } from "./safefetch.ts";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const API = "https://recherche-entreprises.api.gouv.fr/search";

// Tranches d'effectif INSEE : [min, max] salariés
const TRANCHES: Record<string, [number, number, string]> = {
  "00": [0, 0, "0 salarié"], "01": [1, 2, "1 à 2 salariés"], "02": [3, 5, "3 à 5 salariés"], "03": [6, 9, "6 à 9 salariés"],
  "11": [10, 19, "10 à 19 salariés"], "12": [20, 49, "20 à 49 salariés"], "21": [50, 99, "50 à 99 salariés"], "22": [100, 199, "100 à 199 salariés"],
  "31": [200, 249, "200 à 249 salariés"], "32": [250, 499, "250 à 499 salariés"], "41": [500, 999, "500 à 999 salariés"], "42": [1000, 1999, "1 000 à 1 999 salariés"],
  "51": [2000, 4999, "2 000 à 4 999 salariés"], "52": [5000, 9999, "5 000 à 9 999 salariés"], "53": [10000, 20000, "10 000 salariés et plus"],
};

/** Contrôle de Luhn du SIREN (évite de prendre un numéro de téléphone ou un capital social). */
function sirenValide(s: string) {
  if (!/^\d{9}$/.test(s) || /^0+$/.test(s)) return false;
  let t = 0;
  for (let i = 0; i < 9; i++) { let d = Number(s[8 - i]); if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; } t += d; }
  return t % 10 === 0;
}

/** SIREN trouvé dans un texte de mentions légales (SIREN, SIRET ou RCS). */
export function sirenDans(texte: string): string | null {
  const t = texte.replace(/&nbsp;| | /g, " ");
  for (const m of t.matchAll(/(?:SIREN|SIRET|R\.?C\.?S\.?|immatricul[ée]+[^0-9]{0,60})[^0-9]{0,40}((?:\d[\s.]?){9,14})/gi)) {
    const chiffres = m[1].replace(/\D/g, "").slice(0, 9);
    if (sirenValide(chiffres)) return chiffres;
  }
  return null;
}

async function page(u: string) {
  try { const r = await safeFetchText(u, { headers: { "user-agent": UA, accept: "text/html", "accept-language": "fr-FR,fr;q=0.9" } }, 800_000, 9000); return r.ok ? r.text : ""; } catch { return ""; }
}
const texte = (h: string) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

/** Cherche le SIREN sur l'accueil puis sur les pages légales liées depuis l'accueil (3 au plus). */
export async function trouverSiren(domaine: string) {
  const base = `https://${domaine}`;
  const accueil = await page(base);
  let s = sirenDans(texte(accueil));
  if (s) return s;
  const liens = [...new Set([...accueil.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => { try { return new URL(m[1], base).href; } catch { return ""; } })
    .filter((u) => u.includes(domaine.replace(/^www\./, "")) && /(mentions?[-_]?l[ée]gales|legal|cgu|cgv|conditions|terms|imprint|a-propos|about|qui-sommes)/i.test(u)))]
    .sort((a, b) => Number(/mentions/i.test(b)) - Number(/mentions/i.test(a))).slice(0, 3);
  for (const u of [...liens, `${base}/mentions-legales`]) {
    s = sirenDans(texte(await page(u)));
    if (s) return s;
  }
  return null;
}

/** Fiche officielle d'une entreprise (sans données personnelles : pas de dirigeants). */
export async function ficheOfficielle(siren: string) {
  const r = await fetch(`${API}?q=${siren}&per_page=1`, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`annuaire ${r.status}`);
  const j = await r.json();
  const e = (j.results ?? []).find((x: { siren: string }) => x.siren === siren);
  if (!e) return null;
  if (e.opposition_diffusion_commerciale || e.statut_diffusion !== "O") return { siren, refus: true };
  const annees = Object.keys(e.finances ?? {}).sort();
  const derniere = annees.at(-1);
  const fin = derniere ? e.finances[derniere] : null;
  const tr = TRANCHES[e.tranche_effectif_salarie ?? ""] ?? null;
  return {
    siren, nom: e.nom_complet, creation: e.date_creation, categorie: e.categorie_entreprise, naf: e.activite_principale,
    actif: e.etat_administratif === "A",
    ca: fin?.ca ?? null, resultat: fin?.resultat_net ?? null, annee: derniere ?? null,
    effectif: tr ? { min: tr[0], max: tr[1], libelle: tr[2], annee: e.annee_tranche_effectif_salarie } : null,
    source: `https://annuaire-entreprises.data.gouv.fr/entreprise/${siren}`,
  };
}

const meur = (n: number) => n >= 1e9 ? `${(n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md€` : n >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€` : `${Math.round(n / 1e3).toLocaleString("fr-FR")} k€`;
const EUR_USD = 1.08;
// Revenu annuel par salarié d'un éditeur SaaS : de 80 000 € (jeune, en croissance) à 180 000 € (mature)
const PAR_SALARIE: [number, number] = [80_000, 180_000];

/** Traite les prochains SaaS français (15 par passage, l'annuaire limite à 7 requêtes par seconde). */
export async function entreprisesMaj(n = 15, maxMs = 100_000) {
  const t0 = Date.now();
  const { data } = await admin.from("saas").select("id, domaine, succes").eq("statut", "ok").is("entreprise_at", null)
    .or("pays.eq.FR,domaine.like.%.fr").limit(n);
  const out = { traites: 0, siren: 0, ca: 0, effectif: 0 };
  for (const s of data ?? []) {
    if (Date.now() - t0 > maxMs) break;
    out.traites++;
    const at = new Date().toISOString();
    try {
      const siren = await trouverSiren(s.domaine);
      if (!siren) { await admin.from("saas").update({ entreprise_at: at }).eq("id", s.id); continue; }
      out.siren++;
      const f = await ficheOfficielle(siren);
      if (!f || "refus" in f) { await admin.from("saas").update({ entreprise_at: at, entreprise: f ? { siren, refus: true } : { siren } }).eq("id", s.id); continue; }
      const maj: Record<string, unknown> = { entreprise_at: at, entreprise: f };
      if (f.ca && f.ca > 0 && f.actif) {
        out.ca++;
        // Chiffre officiel : devient la preuve, sauf si une preuve vérifiée (Stripe) ou plus récente existe déjà
        if (!s.succes || !["revenu_verifie"].includes(s.succes.type)) {
          maj.succes = { preuve: `${meur(f.ca)} de chiffre d'affaires en ${f.annee} (comptes déposés)`, source: f.source, type: "revenu_officiel", montant: Math.round(f.ca * EUR_USD), annee: f.annee, resultat: f.resultat };
        }
        maj.estimation = null;
      } else if (f.effectif && f.effectif.max > 0 && !s.succes) {
        out.effectif++;
        const bas = f.effectif.min * PAR_SALARIE[0] * EUR_USD / 12, haut = f.effectif.max * PAR_SALARIE[1] * EUR_USD / 12;
        maj.estimation = { bas: Math.round(bas), haut: Math.round(haut), centre: Math.round(Math.sqrt(Math.max(bas, 1) * haut)), methode: "effectif", effectif: f.effectif.libelle, fiabilite: "moyenne", calcule_at: at };
      }
      await admin.from("saas").update(maj).eq("id", s.id);
    } catch {
      await admin.from("saas").update({ entreprise_at: at }).eq("id", s.id);
    }
  }
  return out;
}
