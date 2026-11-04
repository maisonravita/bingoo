// Copie l'extension dans public/bingoo-extension/ : le site y lit les fichiers pour fabriquer
// un zip personnel (avec la clé d'accès déjà dedans) au moment du téléchargement.
import { cpSync, readdirSync, rmSync, writeFileSync } from "node:fs";
const src = new URL("../extension/", import.meta.url), dst = new URL("../public/bingoo-extension/", import.meta.url);
rmSync(dst, { recursive: true, force: true });
cpSync(src, dst, { recursive: true });
const files = readdirSync(src).filter((f) => f !== "config.json").sort();
writeFileSync(new URL("files.json", dst), JSON.stringify(files));
console.log(`Extension copiée : ${files.length} fichiers`);
