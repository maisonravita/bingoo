import { readFileSync } from "node:fs";
// Le code source garde « Kairo » ; à la construction, ce mot est remplacé par le nom défini dans brand.json.
export const BRAND = JSON.parse(readFileSync(new URL("../brand.json", import.meta.url), "utf8")).name;
export const rebrand = (code) => (BRAND === "Kairo" ? code : code.replaceAll("Kairo", BRAND));
export const viteBrand = () => ({
  name: "brand",
  enforce: "pre",
  transform: (code, id) => (/\/src\/.*\.(jsx?|tsx?)$/.test(id) ? rebrand(code) : null),
  transformIndexHtml: (html) => rebrand(html),
});
export const esbuildBrand = {
  name: "brand",
  setup(b) {
    b.onLoad({ filter: /supabase\/functions\/.*\.ts$/ }, (a) => ({ contents: rebrand(readFileSync(a.path, "utf8")), loader: "ts" }));
  },
};
