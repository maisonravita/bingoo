// Code d'un projet envoyé sur le dépôt GitHub du membre (sens unique : Bingoo! → GitHub, un commit par envoi).
// Le membre fournit un jeton d'accès limité à UN dépôt (« fine-grained », droit « Contents : lecture et écriture »), jamais son
// mot de passe. Le jeton est rangé côté serveur, n'est jamais renvoyé au navigateur ni écrit dans un journal.
// deno-lint-ignore-file no-explicit-any
const API = "https://api.github.com";
export const depotOk = (x: unknown) => { const d = String(x ?? "").trim().replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, ""); return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/.test(d) ? d : null; };
export const jetonOk = (x: unknown) => { const t = String(x ?? "").trim(); return /^(github_pat_[A-Za-z0-9_]{20,255}|ghp_[A-Za-z0-9]{20,255})$/.test(t) ? t : null; };

async function gh(jeton: string, chemin: string, init: { method?: string; body?: unknown } = {}) {
  const r = await fetch(`${API}${chemin}`, { method: init.method ?? "GET", headers: { authorization: `Bearer ${jeton}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "Bingoo", ...(init.body ? { "content-type": "application/json" } : {}) }, body: init.body ? JSON.stringify(init.body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j: j as any };
}

/** Vérifie que le jeton peut écrire dans ce dépôt. Rend la branche par défaut. */
export async function verifierDepot(jeton: string, depot: string): Promise<{ branche: string; prive: boolean }> {
  const { status, j } = await gh(jeton, `/repos/${depot}`);
  if (status === 401) throw new Error("GitHub refuse ce jeton : vérifie que tu l'as copié en entier et qu'il n'a pas expiré");
  if (status === 404) throw new Error("Dépôt introuvable avec ce jeton : vérifie le nom (compte/depot) et que le jeton donne bien accès à ce dépôt");
  if (status !== 200) throw new Error(`GitHub a répondu ${status}, réessaie dans un instant`);
  if (j.permissions && j.permissions.push !== true) throw new Error("Ce jeton peut lire le dépôt mais pas y écrire : donne-lui le droit « Contents : Read and write »");
  return { branche: String(j.default_branch ?? "main"), prive: j.private === true };
}

/** Un commit avec tous les fichiers du projet. Dépôt vide : un premier fichier le démarre. */
export async function envoyerCode(jeton: string, depot: string, fichiers: Record<string, string>, message: string): Promise<{ commit: string; url: string; fichiers: number }> {
  const { branche } = await verifierDepot(jeton, depot);
  let tete = await gh(jeton, `/repos/${depot}/git/ref/heads/${branche}`);
  if (tete.status === 409 || tete.status === 404) {
    // Dépôt vide : GitHub n'accepte un arbre qu'après un premier commit
    const b64 = btoa(String.fromCharCode(...new TextEncoder().encode("Dépôt créé par Bingoo!\n")));
    const p = await gh(jeton, `/repos/${depot}/contents/.bingoo`, { method: "PUT", body: { message: "Démarrage du dépôt", content: b64 } });
    if (p.status !== 201 && p.status !== 200) throw new Error(p.status === 403 ? "Ce jeton ne peut pas écrire dans ce dépôt (droit « Contents : Read and write »)" : `GitHub a refusé le premier envoi (${p.status})`);
    tete = await gh(jeton, `/repos/${depot}/git/ref/heads/${branche}`);
  }
  if (tete.status !== 200) throw new Error(`Branche ${branche} introuvable sur GitHub (${tete.status})`);
  const parent = String(tete.j.object?.sha ?? "");
  const base = await gh(jeton, `/repos/${depot}/git/commits/${parent}`);
  const tree = Object.entries(fichiers).map(([path, content]) => ({ path, mode: "100644", type: "blob", content }));
  const arbre = await gh(jeton, `/repos/${depot}/git/trees`, { method: "POST", body: { base_tree: base.j.tree?.sha, tree } });
  if (arbre.status !== 201) throw new Error(arbre.status === 403 ? "Ce jeton ne peut pas écrire dans ce dépôt (droit « Contents : Read and write »)" : `GitHub a refusé les fichiers (${arbre.status})`);
  if (arbre.j.sha === base.j.tree?.sha) return { commit: parent, url: `https://github.com/${depot}/commit/${parent}`, fichiers: 0 };
  const commit = await gh(jeton, `/repos/${depot}/git/commits`, { method: "POST", body: { message, tree: arbre.j.sha, parents: [parent] } });
  if (commit.status !== 201) throw new Error(`GitHub a refusé le commit (${commit.status})`);
  const maj = await gh(jeton, `/repos/${depot}/git/refs/heads/${branche}`, { method: "PATCH", body: { sha: commit.j.sha } });
  if (maj.status !== 200) throw new Error(`GitHub a refusé la mise à jour de la branche (${maj.status}) : quelqu'un a peut-être modifié le dépôt entre-temps, réessaie`);
  return { commit: String(commit.j.sha), url: `https://github.com/${depot}/commit/${commit.j.sha}`, fichiers: tree.length };
}
