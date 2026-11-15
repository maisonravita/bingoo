// Petit serveur local du site construit (dist-single) pour les contrôles dans le navigateur :
// le site est découpé en morceaux chargés à la demande, ce qui ne marche pas en file://.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp", ".json": "application/json", ".mp4": "video/mp4", ".woff2": "font/woff2" };
export async function servirDist(dossier = "dist-single") {
  const racine = join(process.cwd(), dossier);
  const srv = createServer(async (req, res) => {
    const chemin = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    try { const f = join(racine, chemin === "/" ? "index.html" : chemin); res.writeHead(200, { "content-type": TYPES[extname(f)] ?? "application/octet-stream" }); res.end(await readFile(f)); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${srv.address().port}`, fermer: () => srv.close() };
}
