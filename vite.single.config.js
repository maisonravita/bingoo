import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteBrand } from "./scripts/brand.mjs";

// Build de la version hébergée (routes en #). Le site est découpé : la page d'accueil ne télécharge que ce qu'elle affiche,
// le reste (gabarit des applications, pages secondaires) se charge quand on l'ouvre. Le nom de marque vient de brand.json.
export default defineConfig({ plugins: [viteBrand(), react()], build: { outDir: "dist-single", chunkSizeWarningLimit: 1500 } });
