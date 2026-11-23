// Le logo de l'espace : envoyé une fois, repris partout (site, SaaS, vidéos).
import { fn } from "./supabase";

/** Réduit le logo dans le navigateur (transparence gardée), relève sa couleur dominante et l'envoie. → { url, couleur } */
export async function envoyerLogo(ws, f) {
  if (!f || !/^image\/(png|jpeg|webp)$/.test(f.type)) throw new Error("Logo en PNG, JPG ou WebP.");
  const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = URL.createObjectURL(f); });
  const k = Math.min(1, 600 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const g = c.getContext("2d"); g.drawImage(img, 0, 0, c.width, c.height);
  // Couleur dominante parmi les pixels colorés (ni blanc, ni noir, ni transparent)
  const d = g.getImageData(0, 0, c.width, c.height).data, seaux = {};
  for (let i = 0; i < d.length; i += 16) { const [r, v, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]]; const mx = Math.max(r, v, b), mn = Math.min(r, v, b); if (a < 200 || mx - mn < 60 || mx < 50) continue; const cle = `${r >> 4},${v >> 4},${b >> 4}`; (seaux[cle] ??= [0, 0, 0, 0]); seaux[cle][0] += r; seaux[cle][1] += v; seaux[cle][2] += b; seaux[cle][3]++; }
  const top = Object.values(seaux).sort((a, b) => b[3] - a[3])[0];
  const couleur = top ? "#" + top.slice(0, 3).map((x) => Math.round(x / top[3]).toString(16).padStart(2, "0")).join("") : null;
  const r = await fn("r/saas-logo", { workspace_id: ws.id, image: c.toDataURL("image/png") });
  return { url: r.url, couleur };
}
export const lireLogoEspace = async (ws) => { try { return (await fn("r/espace-logo", { workspace_id: ws.id }))?.logo ?? null; } catch { return null; } };
/** Devient le logo de l'espace ; appliquer : posé aussi sur ses SaaS et sites qui n'en ont pas ; forcer : sur tous. */
export const poserLogoEspace = (ws, l, opts = {}) => fn("r/espace-logo", { workspace_id: ws.id, logo: l, ...opts });
