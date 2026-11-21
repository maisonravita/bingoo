// Photos libres de droits (Wikimedia Commons) quand le membre n'a pas encore les siennes. Repris de photos.mjs de
// Taste Skill (licence MIT) : licences libres seulement (CC0, CC BY, CC BY-SA, domaine public ; jamais NC ni ND),
// vraies photographies (pas de peinture, dessin, carte), une seule photo par série, auteur et licence gardés pour la
// ligne de crédits obligatoire en pied de page. Elles servent d'ambiance (en-tête), jamais de « réalisations » du membre.

export type PhotoLibre = { url: string; alt: string; auteur: string; licence: string; page: string; largeur: number; hauteur: number };

const LICENCE_OK = /^(cc0|cc[ -]by(-sa)?[ -]\d|public domain|pd\b|pdm)/i;
const PAS_UNE_PHOTO = /\b(painting|drawing|engraving|illustration|lithograph|poster|map|logo|icon|diagram|chart|scan|plan|coat of arms|flag|stamp|banknote|coin)\b/i;
const sansHtml = (s: unknown) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

// Mots qui décrivent l'activité, pas ce qu'on photographie (Commons cherche des fichiers qui contiennent TOUS les mots)
const MOTS_VIDES = new Set(["portfolio", "app", "application", "service", "services", "home", "business", "online", "platform", "website", "site", "booking", "management", "software", "saas", "tool", "local", "small", "professional", "studio", "and", "for", "the"]);

/** Recherche élargie pas à pas : tous les mots utiles, puis les 3 premiers, les 2 premiers, enfin chaque paire. */
export async function photosLibres(requete: string, nombre = 4, min = 1600): Promise<PhotoLibre[]> {
  const mots = String(requete ?? "").toLowerCase().replace(/[^\p{L}\p{N} -]/gu, " ").split(/\s+/).filter((m) => m.length > 2 && !MOTS_VIDES.has(m)).slice(0, 5);
  if (!mots.length) return [];
  const essais = [...new Set([mots.join(" "), mots.slice(0, 3).join(" "), mots.slice(0, 2).join(" "), ...mots.slice(1).map((m) => `${mots[0]} ${m}`), mots[0]])];
  const out: PhotoLibre[] = [], vus = new Set<string>();
  for (const q of essais) {
    for (const ph of await rechercheCommons(q, nombre, min)) if (!vus.has(ph.page)) { vus.add(ph.page); out.push(ph); }
    if (out.length >= nombre) break;
  }
  return out.slice(0, nombre);
}

async function rechercheCommons(q: string, nombre: number, min: number): Promise<PhotoLibre[]> {
  const u = "https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({
    action: "query", format: "json", formatversion: "2", generator: "search", gsrnamespace: "6", gsrlimit: "40",
    gsrsearch: q + " filetype:bitmap -painting -paintings -drawing -engraving -illustration -lithograph -poster -map",
    prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "1280",
    iiextmetadatafilter: "LicenseShortName|Artist|ObjectName|Restrictions",
  });
  let data: any = null;
  for (let essai = 0; essai < 3 && !data; essai++) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "Bingoo/1.0 (https://www.bingoo.fr; contact@bingoo.fr)", Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
      if (r.status === 429 || r.status >= 500) { await new Promise((ok) => setTimeout(ok, 1500 * (essai + 1))); continue; }
      if (!r.ok) break;
      data = await r.json();
    } catch { await new Promise((ok) => setTimeout(ok, 800)); }
  }
  const pages = ((data?.query?.pages ?? []) as any[]).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const out: PhotoLibre[] = [], series = new Set<string>();
  for (const pg of pages) {
    const ii = pg.imageinfo?.[0]; if (!ii) continue;
    const md = ii.extmetadata ?? {}, val = (k: string) => sansHtml(md[k]?.value);
    const titre = String(pg.title ?? "").replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ");
    const licence = val("LicenseShortName");
    if (ii.mime !== "image/jpeg" || ii.width < min || ii.height < 700 || !LICENCE_OK.test(licence) || /\b(nc|nd)\b/i.test(licence)) continue;
    if (/personality|trademark|insignia/i.test(val("Restrictions")) || PAS_UNE_PHOTO.test(titre)) continue;
    const serie = titre.toLowerCase().replace(/[\d()[\]_.,-]+/g, " ").split(/\s+/).filter(Boolean).slice(0, 3).join(" ");
    if (series.has(serie)) continue;
    series.add(serie);
    out.push({ url: String(ii.thumburl ?? ii.url).split("?")[0], alt: (val("ObjectName") || titre).slice(0, 120), auteur: (val("Artist") || "Auteur inconnu").slice(0, 80), licence: licence.slice(0, 40), page: String(ii.descriptionurl ?? "").split("?")[0], largeur: ii.width, hauteur: ii.height });
    if (out.length >= nombre) break;
  }
  return out;
}
