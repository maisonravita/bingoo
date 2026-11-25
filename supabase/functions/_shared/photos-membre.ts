// Les photos du membre dans sa page de site, sans IA ni coût : la première devient le fond du premier écran, les suivantes
// une bande d'images posée avant la fin de page. Tout est marqué (data-bingoo-membre) : reposer ou retirer les photos
// remet la page exactement comme avant. Rien n'est inventé : seules les photos déposées par le membre sont montrées.
const attr = (s: string) => String(s ?? "").replace(/[<>"]/g, "").slice(0, 120);

export function photosValides(liste: unknown, prefixe: string): string[] {
  return (Array.isArray(liste) ? liste : []).map((u) => String(u ?? "")).filter((u) => u.startsWith(prefixe) && /\.(jpg|png|webp)$/.test(u) && !/["<>\s]/.test(u)).slice(0, 6);
}

export function poserPhotos(page: any, urls: string[], nom: string) {
  if (!page || !Array.isArray(page.sections)) return page;
  let sections = page.sections
    .filter((s: any) => s.id !== "photos-membre")
    .map((s: any) => ({ ...s, html: String(s.html ?? "").replace(/<img\b[^>]*data-bingoo-membre[^>]*>/g, "") }));
  if (!urls.length) return { ...page, sections };
  // 1. Le premier écran : la photo en fond, seulement s'il n'a pas déjà une image
  const iHero = sections.findIndex((s: any) => /<section\b[^>]*class="[^"]*\bhero\b/.test(s.html));
  let reste = urls;
  if (iHero >= 0 && !/<img\b/.test(sections[iHero].html)) {
    const img = `<img data-bingoo-membre alt="${attr(nom)}" src="${urls[0]}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0">`;
    sections[iHero] = { ...sections[iHero], html: sections[iHero].html.replace(/(<section\b[^>]*>)/, `$1\n${img}`) };
    reste = urls.slice(1);
  }
  // 2. Les autres : une bande d'images avant la dernière section
  if (reste.length) {
    const bande = { id: "photos-membre", html: `<section class="section" id="photos-membre" aria-label="${attr(nom)} en images"><div class="wrap"><div class="pm pm-${reste.length}">${reste.map((u, i) => `<img data-bingoo-membre loading="lazy" alt="${attr(nom)}, photo ${i + 1}" src="${u}">`).join("")}</div></div></section>` };
    const fin = Math.max(1, sections.length - 1);
    sections = [...sections.slice(0, fin), bande, ...sections.slice(fin)];
  }
  return { ...page, sections };
}
