// Images générées du moteur de pages (fal.ai, choix du 21/11) : décor et ambiance seulement, jamais à la place du travail
// réel du membre (ni ses plats, ni ses produits, ni son lieu, ni des visages). Le membre peut remplacer chaque image dans
// l'atelier ; ses propres photos passent toujours avant. Sans la clé FAL_KEY, la page se fait sans image.
// Coût noté par image (ai_usage, modèle = l'adresse fal) ; prix par image réglable par le secret FAL_PRIX_USD.
import { admin } from "./core.ts";
/** Restauration et métiers de bouche : AUCUNE image inventée (générée ou photo libre). Un plat, une salle ou une vitrine
 *  qui ne sont pas les siens tromperaient ses clients ; la page attend ses vraies photos (choix de Jean du 23/11). */
export const estAlimentaire = (t: unknown) => /\b(restaurants?|resto|brasseries?|bistrots?|bistros?|pizzerias?|traiteurs?|boulangeries?|p[aâ]tisseries?|caf[ée]s?|bars?|sushis?|kebabs?|burgers?|cr[eê]peries?|glaciers?|chocolatiers?|[ée]piceries?|food ?trucks?|cantines?|gastronomi\w*|cuisines? (japonaise|italienne|indienne|libanaise|thai|chinoise|fran[cç]aise|du monde)|plats?|recettes?|cuisiniers?|boucheries?|fromageries?|cavistes?|salons? de th[ée]|coffee|bakery|restaurant|food|recipes?|dishes|meals?)\b/i.test(String(t ?? ""));
import { aiCtx } from "./ai-ctx.ts";

const MODELE_BASE = () => Deno.env.get("FAL_MODELE") ?? "fal-ai/flux-2-pro";
const PRIX_BASE_EUR = () => (Number(Deno.env.get("FAL_PRIX_USD") ?? "0.03") || 0.03) * (Number(Deno.env.get("USD_EUR") ?? "0.92") || 0.92);
const GARDE_FOU = ", editorial photograph, natural light, no people, no faces, no text, no letters, no logo, no watermark";
const GARDE_FOU_APERCU = ", realistic photograph, natural light, no text, no letters, no logo, no watermark";

// Aperçus d'idée : modèle rapide et bon marché (une image par élément montré), prix noté à part
export const MODELE_APERCU = () => Deno.env.get("FAL_MODELE_APERCU") ?? "fal-ai/flux/schnell";
const PRIX_APERCU_EUR = () => (Number(Deno.env.get("FAL_PRIX_APERCU_USD") ?? "0.003") || 0.003) * (Number(Deno.env.get("USD_EUR") ?? "0.92") || 0.92);

export async function imagesPage(demandes: { id: string; pour: string; prompt: string }[], budgetEur: number, o: { apercu?: boolean } = {}) {
  const MODELE = o.apercu ? MODELE_APERCU : MODELE_BASE, PRIX_EUR = o.apercu ? PRIX_APERCU_EUR : PRIX_BASE_EUR;
  const cle = Deno.env.get("FAL_KEY");
  const images: Record<string, { url: string; prompt: string }> = {};
  let cout = 0;
  if (!cle) return { images, cout };
  const ctx = aiCtx.getStore() ?? {};
  await Promise.all(demandes.slice(0, Math.max(0, Math.floor(budgetEur / PRIX_EUR()))).map(async (d) => {
    const id = o.apercu || /^IMG_\d$/.test(d.id) ? d.id : `IMG_${Object.keys(images).length + 1}`;
    const r = await fetch(`https://fal.run/${MODELE()}`, {
      method: "POST", headers: { authorization: `Key ${cle}`, "content-type": "application/json" },
      body: JSON.stringify({ prompt: String(d.prompt).slice(0, 900) + (o.apercu ? GARDE_FOU_APERCU : GARDE_FOU), image_size: o.apercu ? "landscape_4_3" : "landscape_16_9", num_images: 1, enable_safety_checker: true, ...(o.apercu ? { num_inference_steps: 4 } : {}) }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) throw new Error(`fal ${r.status} : ${(await r.text()).slice(0, 160)}`);
    const url = (await r.json())?.images?.[0]?.url;
    if (!url) return;
    // Copie chez Bingoo! (l'adresse fal est temporaire)
    const bin = new Uint8Array(await (await fetch(url, { signal: AbortSignal.timeout(30_000) })).arrayBuffer());
    const chemin = `gen/${crypto.randomUUID()}.jpg`;
    const { error } = await admin.storage.from("apps").upload(chemin, bin, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (error) throw new Error(`Stockage : ${error.message}`);
    images[id] = { url: admin.storage.from("apps").getPublicUrl(chemin).data.publicUrl, prompt: d.prompt };
    cout += PRIX_EUR();
    await admin.from("ai_usage").insert({ workspace_id: ctx.ws ?? null, feature: o.apercu ? "idee/images" : "construire/images", model: MODELE(), input_tokens: 0, output_tokens: 0, searches: 0, cost_eur: PRIX_EUR() }).then(() => null, () => null);
  }));
  return { images, cout };
}
