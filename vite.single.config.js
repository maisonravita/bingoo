import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { viteBrand } from "./scripts/brand.mjs";

// Build en un seul fichier HTML (routes en #) pour la version hébergée. Le nom de marque vient de brand.json.
export default defineConfig({ plugins: [viteBrand(), react(), viteSingleFile()], build: { outDir: "dist-single" } });
