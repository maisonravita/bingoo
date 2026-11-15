// Sauvegarde de secours (sans mot de passe de base) : chaque table du schéma public, ligne par ligne en JSON,
// lue par l'API d'administration Supabase. Sert quand pg_dump ne peut pas se connecter.
// Sortie : un fichier par table dans ./sauvegarde/<table>.ndjson + schema.sql (définitions des tables et fonctions).
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
const REF = "fbsjbnnmzazylmquzryo", TOK = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOK) { console.log("SUPABASE_ACCESS_TOKEN absent"); process.exit(1); }
async function q(sql, essai = 0) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOK}`, "Content-Type": "application/json", "User-Agent": "bingoo-ci" }, body: JSON.stringify({ query: sql }) });
  if (r.status === 429 || r.status >= 500) { if (essai > 5) throw new Error(`API ${r.status}`); await new Promise((s) => setTimeout(s, 3000 * (essai + 1))); return q(sql, essai + 1); }
  if (!r.ok) throw new Error(`API ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}
mkdirSync("sauvegarde", { recursive: true });
const tables = (await q("select tablename t from pg_tables where schemaname = 'public' order by 1")).map((x) => x.t);
let total = 0;
for (const t of tables) {
  const f = `sauvegarde/${t}.ndjson`; writeFileSync(f, "");
  let n = 0;
  // Pages de 2 000 lignes, dans l'ordre physique (stable pendant la lecture)
  for (let k = 0; ; k++) {
    const rows = await q(`select row_to_json(x)::text j from (select * from public."${t.replace(/"/g, '""')}" order by ctid limit 2000 offset ${k * 2000}) x`);
    if (!rows.length) break;
    appendFileSync(f, rows.map((r) => r.j).join("\n") + "\n"); n += rows.length;
    if (rows.length < 2000) break;
  }
  total += n; console.log(`${t} : ${n}`);
}
const fns = await q("select string_agg(pg_get_functiondef(p.oid), E';\\n\\n') d from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'");
writeFileSync("sauvegarde/fonctions.sql", fns[0]?.d ?? "");
console.log(`\n${tables.length} tables, ${total} lignes`);
