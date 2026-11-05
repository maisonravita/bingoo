import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// « Ton équipe cette nuit » : la ville en pixel art (moteur du QG des agents, licence MIT), servie à part sous /qg/.
const root = fileURLToPath(new URL("./qg", import.meta.url));
export default defineConfig({
  root,
  base: "/qg/",
  envDir: fileURLToPath(new URL(".", import.meta.url)),
  build: { outDir: fileURLToPath(new URL("./dist-single/qg", import.meta.url)), emptyOutDir: true, assetsInlineLimit: 0, chunkSizeWarningLimit: 2000 },
});
