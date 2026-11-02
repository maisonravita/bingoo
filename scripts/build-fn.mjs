import { build } from "esbuild";
import { esbuildBrand } from "./brand.mjs";
// Usage : node scripts/build-fn.mjs m  → bundles/m.js (minifié, prêt à déployer)
const fn = process.argv[2];
await build({
  entryPoints: [`supabase/functions/${fn}/index.ts`], bundle: true, format: "esm", platform: "neutral", target: "es2022",
  external: ["npm:*", "node:*"], charset: "utf8", legalComments: "none", minify: true, outfile: `bundles/${fn}.js`, plugins: [esbuildBrand],
});
console.log(`bundles/${fn}.js`);
