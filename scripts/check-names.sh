#!/usr/bin/env bash
# Noms non définis dans les fonctions serveur (ex. une fonction utilisée sans être importée) :
# ce genre d'erreur ne se voit qu'à l'exécution, donc on la bloque avant tout déploiement.
set -uo pipefail
cd supabase/functions
out=$(npx -y -p typescript@5.6.3 tsc --noEmit --allowImportingTsExtensions --target es2022 --module esnext \
  --moduleResolution bundler --skipLibCheck --lib es2022,dom */index.ts _shared/*.ts 2>&1 | grep -E "TS2304|TS2552" | grep -v "'Deno'")
if [ -n "$out" ]; then echo "Noms non définis :"; echo "$out"; exit 1; fi
echo "Aucun nom non défini"
