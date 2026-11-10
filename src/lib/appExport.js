// Téléchargement du code d'un SaaS construit par Bingoo! : un dossier .zip que le créateur peut héberger où il veut,
// lire, modifier, ou confier à un développeur.
import { strToU8, zipSync } from "fflate";
import { appHtml } from "./appShell.js";

const TYPES_SQL = { texte: "text", nombre: "numeric", montant: "numeric(12,2)", date: "date", choix: "text", booleen: "boolean", email: "text", telephone: "text", lien: "text" };
const ident = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^([0-9])/, "_$1").slice(0, 50) || "champ";

function schemaSql(spec) {
  const lignes = [
    `-- ${spec.nom} : schéma PostgreSQL équivalent aux données de l'application (pour passer sur ta propre base, Supabase par exemple)`,
    `-- Chaque compte ne voit que ses propres lignes : colonne owner_id + règles de sécurité (RLS).`,
    "",
  ];
  for (const c of spec.collections ?? []) {
    const t = ident(c.nom);
    lignes.push(`create table public.${t} (`, "  id uuid primary key default gen_random_uuid(),", "  owner_id uuid not null default auth.uid(),");
    for (const f of c.champs ?? []) {
      const n = ident(f.nom);
      if (["id", "owner_id", "created_at", "updated_at"].includes(n)) continue;
      const type = /_id$/.test(n) ? "uuid" : TYPES_SQL[f.type] ?? "text";
      const chk = f.type === "choix" && f.valeurs?.length ? ` check (${n} in (${f.valeurs.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(", ")}))` : "";
      lignes.push(`  ${n} ${type}${chk},`);
    }
    lignes.push("  created_at timestamptz not null default now(),", "  updated_at timestamptz not null default now()", ");",
      `alter table public.${t} enable row level security;`,
      `create policy ${t}_proprietaire on public.${t} for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());`, "");
  }
  return lignes.join("\n");
}

function readme(spec, slug, api, lien) {
  return `# ${spec.nom}

${spec.pitch ?? ""}

Application construite par Bingoo! (version en ligne : ${lien}).

## Ce que contient ce dossier

- \`index.html\` : l'application complète (site public, création de compte, écrans, abonnement). Elle fonctionne telle quelle :
  ouvre-la avec n'importe quel hébergement de site statique (Vercel, Netlify, Cloudflare Pages, OVH…).
- \`ecrans/\` : le code de chaque écran (Preact + htm, sans étape de compilation). C'est le même code que dans \`index.html\`.
- \`donnees/spec.json\` : la description de l'application (couleur, textes, formules, types de données, données d'exemple).
- \`donnees/schema.sql\` : les mêmes données sous forme de tables PostgreSQL, si tu veux passer sur ta propre base.

## Comment ça marche

- Interface : Preact 10 et htm chargés depuis esm.sh, Tailwind CSS 4 chargé depuis jsDelivr.
- Données et comptes : par défaut, l'application utilise le serveur de Bingoo! (\`${api}/${slug}\`).
  Chaque compte ne voit que ses propres données. Tant que ton abonnement Bingoo! est actif, ce serveur reste à ta disposition.
- Abonnements : encaissés sur ton compte Stripe, si tu l'as branché dans Bingoo!.

## Passer sur ton propre serveur

Tout l'accès aux données passe par la fonction \`call(action, body)\` en haut du script principal de \`index.html\`
(actions : signup, login, me, logout, list, get, add, update, remove, checkout, portail).
Remplace-la par des appels à ta propre base (par exemple Supabase avec \`donnees/schema.sql\`) : les écrans n'ont pas à changer,
ils n'utilisent que \`useCollection\` et \`db\`.
`;
}

export function telechargerCode({ spec, slug, api, lien, paiement }) {
  const html = appHtml({ spec, slug, api, paiement });
  const files = {
    "index.html": strToU8(html),
    "README.md": strToU8(readme(spec, slug, api, lien)),
    "donnees/spec.json": strToU8(JSON.stringify({ ...spec, ecrans: (spec.ecrans ?? []).map(({ code, ...e }) => ({ ...e, fichier: code ? `ecrans/${e.id}.js` : null })) }, null, 2)),
    "donnees/schema.sql": strToU8(schemaSql(spec)),
  };
  for (const e of spec.ecrans ?? []) if (e.code) files[`ecrans/${e.id}.js`] = strToU8(`// Écran « ${e.titre} » : ${e.but ?? ""}\n${e.code}\n`);
  const nom = (slug.replace(/-[a-z0-9]{4}$/, "") || "mon-saas");
  const blob = new Blob([zipSync({ [nom]: files })], { type: "application/zip" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${nom}.zip` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
