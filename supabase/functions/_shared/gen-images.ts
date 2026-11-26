// Images générées du moteur de pages (fal.ai, choix du 21/11) : décor et ambiance seulement, jamais à la place du travail
// réel du membre (ni ses plats, ni ses produits, ni son lieu, ni des visages). Le membre peut remplacer chaque image dans
// l'atelier ; ses propres photos passent toujours avant. Sans la clé FAL_KEY, la page se fait sans image.
// Coût noté par image (ai_usage, modèle = l'adresse fal) ; prix par image réglable par le secret FAL_PRIX_USD.
import { admin } from "./core.ts";
/** Restauration et métiers de bouche : AUCUNE image inventée (générée ou photo libre). Un plat, une salle ou une vitrine
 *  qui ne sont pas les siens tromperaient ses clients ; la page attend ses vraies photos (choix de Jean du 23/11). */
export const estAlimentaire = (t: unknown) => /\b(restaurants?|resto|brasseries?|bistrots?|bistros?|pizzerias?|traiteurs?|boulangeries?|p[aâ]tisseries?|caf[ée]s?|bars?|sushis?|kebabs?|burgers?|cr[eê]peries?|artisans? glaciers?|ma[iî]tres? glaciers?|glaces artisanales|cr[eè]mes glac[ée]es|chocolatiers?|[ée]piceries?|food ?trucks?|cantines?|gastronomi\w*|cuisines? (japonaise|italienne|indienne|libanaise|thai|chinoise|fran[cç]aise|du monde)|plats?|recettes?|cuisiniers?|boucheries?|fromageries?|cavistes?|salons? de th[ée]|coffee|bakery|restaurant|food|recipes?|dishes|meals?)\b/i.test(String(t ?? ""));
import { aiCtx } from "./ai-ctx.ts";

const MODELE_BASE = () => Deno.env.get("FAL_MODELE") ?? "fal-ai/flux-2-pro";
const PRIX_BASE_EUR = () => (Number(Deno.env.get("FAL_PRIX_USD") ?? "0.03") || 0.03) * (Number(Deno.env.get("USD_EUR") ?? "0.92") || 0.92);
const GARDE_FOU = ", editorial photograph, natural light, no people, no faces, no text, no letters, no logo, no watermark";
const GARDE_FOU_APERCU = ", realistic photograph, natural light, no text, no letters, no logo, no watermark";

// Aperçus d'idée : modèle rapide et bon marché (une image par élément montré), prix noté à part
export const MODELE_APERCU = () => Deno.env.get("FAL_MODELE_APERCU") ?? "fal-ai/flux/schnell";
const PRIX_APERCU_EUR = () => (Number(Deno.env.get("FAL_PRIX_APERCU_USD") ?? "0.003") || 0.003) * (Number(Deno.env.get("USD_EUR") ?? "0.92") || 0.92);

export async function imagesPage(demandes: { id: string; pour: string; prompt: string; taille?: string | { width: number; height: number } }[], budgetEur: number, o: { apercu?: boolean; taille?: string } = {}) {
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
      body: JSON.stringify({ prompt: String(d.prompt).slice(0, 900) + (o.apercu ? GARDE_FOU_APERCU : GARDE_FOU), image_size: d.taille ?? o.taille ?? (o.apercu ? "landscape_4_3" : "landscape_16_9"), num_images: 1, enable_safety_checker: true, ...(o.apercu ? { num_inference_steps: 4 } : {}) }),
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

// Détourage (26/11) : le sujet d'une photo sans son fond (PNG transparent), pour poser un mot géant DERRIÈRE lui
export const MODELE_DETOURAGE = () => Deno.env.get("FAL_MODELE_DETOURAGE") ?? "fal-ai/birefnet/v2";
const PRIX_DETOURAGE_EUR = () => (Number(Deno.env.get("FAL_PRIX_DETOURAGE_USD") ?? "0.005") || 0.005) * (Number(Deno.env.get("USD_EUR") ?? "0.92") || 0.92);
export async function detourer(image: string): Promise<{ url: string; cout: number } | null> {
  const cle = Deno.env.get("FAL_KEY"); if (!cle || !/^https:\/\//.test(image)) return null;
  const r = await fetch(`https://fal.run/${MODELE_DETOURAGE()}`, {
    method: "POST", headers: { authorization: `Key ${cle}`, "content-type": "application/json" },
    body: JSON.stringify({ image_url: image, model: "General Use (Heavy)", operating_resolution: "2048x2048", output_format: "png", refine_foreground: true }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) throw new Error(`fal détourage ${r.status} : ${(await r.text()).slice(0, 160)}`);
  const url = (await r.json())?.image?.url; if (!url) return null;
  const bin = new Uint8Array(await (await fetch(url, { signal: AbortSignal.timeout(30_000) })).arrayBuffer());
  const chemin = `gen/${crypto.randomUUID()}.png`;
  const { error } = await admin.storage.from("apps").upload(chemin, bin, { contentType: "image/png", cacheControl: "31536000" });
  if (error) throw new Error(`Stockage : ${error.message}`);
  const ctx = aiCtx.getStore() ?? {};
  await admin.from("ai_usage").insert({ workspace_id: ctx.ws ?? null, feature: "construire/detourage", model: MODELE_DETOURAGE(), input_tokens: 0, output_tokens: 0, searches: 0, cost_eur: PRIX_DETOURAGE_EUR() }).then(() => null, () => null);
  return { url: admin.storage.from("apps").getPublicUrl(chemin).data.publicUrl, cout: PRIX_DETOURAGE_EUR() };
}

// Clips animés (essai du 25/11) : une image de départ devient un clip de 5 s où l'objet bouge vraiment (un verre qui se remplit).
// La création prend une à trois minutes : on la lance dans la file de fal, puis on revient voir où elle en est.
export const MODELE_CLIP = () => Deno.env.get("FAL_MODELE_CLIP") ?? "fal-ai/kling-video/v3/pro/image-to-video";
const PRIX_CLIP_EUR = () => 5 * (Number(Deno.env.get("FAL_PRIX_CLIP_USD_S") ?? "0.112") || 0.112) * (Number(Deno.env.get("USD_EUR") ?? "0.92") || 0.92);
const FILE_FAL = /^https:\/\/queue\.fal\.run\/[a-z0-9\/._-]+$/i;
export async function clipLancer(image: string, mouvement: string) {
  const cle = Deno.env.get("FAL_KEY"); if (!cle) throw new Error("Clé d'images absente");
  const r = await fetch(`https://queue.fal.run/${MODELE_CLIP()}`, {
    method: "POST", headers: { authorization: `Key ${cle}`, "content-type": "application/json" },
    body: JSON.stringify({ prompt: String(mouvement).slice(0, 600) + ". Static camera, plain background, no people, no hands, no text, no logo.", start_image_url: image, duration: "5", generate_audio: false }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`fal ${r.status} : ${(await r.text()).slice(0, 160)}`);
  const j = await r.json();
  if (!FILE_FAL.test(j?.status_url ?? "") || !FILE_FAL.test(j?.response_url ?? "")) throw new Error("Réponse inattendue de la file");
  return { suivi: j.status_url as string, resultat: j.response_url as string };
}
export async function clipEtat(suivi: string, resultat: string): Promise<{ etat: "en_cours" | "pret" | "echec"; url?: string; cout?: number; detail?: string }> {
  const cle = Deno.env.get("FAL_KEY"); if (!cle || !FILE_FAL.test(suivi) || !FILE_FAL.test(resultat)) throw new Error("Suivi de clip invalide");
  const h = { authorization: `Key ${cle}` };
  const e = await (await fetch(suivi, { headers: h, signal: AbortSignal.timeout(20_000) })).json();
  if (e?.status === "IN_QUEUE" || e?.status === "IN_PROGRESS") return { etat: "en_cours" };
  if (e?.status !== "COMPLETED") return { etat: "echec", detail: String(e?.status ?? e?.detail ?? "").slice(0, 120) };
  const rr = await fetch(resultat, { headers: h, signal: AbortSignal.timeout(20_000) }); const j = await rr.json();
  const url = j?.video?.url; if (!url) return { etat: "echec", detail: `${rr.status} ${JSON.stringify(j?.detail ?? "").slice(0, 120)}` };
  const bin = new Uint8Array(await (await fetch(url, { signal: AbortSignal.timeout(60_000) })).arrayBuffer());
  const chemin = `gen/${crypto.randomUUID()}.mp4`;
  const { error } = await admin.storage.from("apps").upload(chemin, bin, { contentType: "video/mp4", cacheControl: "31536000" });
  if (error) throw new Error(`Stockage : ${error.message}`);
  const ctx = aiCtx.getStore() ?? {};
  await admin.from("ai_usage").insert({ workspace_id: ctx.ws ?? null, feature: "video/clip", model: MODELE_CLIP(), input_tokens: 0, output_tokens: 0, searches: 0, cost_eur: PRIX_CLIP_EUR() }).then(() => null, () => null);
  return { etat: "pret", url: admin.storage.from("apps").getPublicUrl(chemin).data.publicUrl, cout: PRIX_CLIP_EUR() };
}
