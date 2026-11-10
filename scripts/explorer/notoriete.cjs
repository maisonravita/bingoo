// Explorer – notoriété : rang de chaque SaaS dans le Majestic Million (le million de sites les plus cités par d'autres sites,
// classés par nombre de sous-réseaux qui les citent). Un relevé par jour, pour la courbe de la fiche.
// Source : « Majestic Million CSV by Majestic 12 », licence Creative Commons Attribution 3.0 (attribution affichée dans la fiche).
// Majestic demande de ne pas télécharger plus d'une fois par 24 heures : ce script tourne une fois par jour.
const TOK = process.env.SUPABASE_ACCESS_TOKEN, REF = "fbsjbnnmzazylmquzryo";
async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOK}`, "Content-Type": "application/json", "User-Agent": "bingoo-ci" }, body: JSON.stringify({ query: sql }) });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}
(async () => {
  const saas = await q(`select id, domaine from public.saas where statut in ('ok', 'a_lire')`);
  const parDom = new Map(saas.map((s) => [s.domaine.replace(/^www\./, ""), s.id]));
  console.log("SaaS :", parDom.size);
  const r = await fetch("https://downloads.majestic.com/majestic_million.csv", { headers: { "User-Agent": "BingooBot/1.0 (+https://kairo.maisonravita.fr/#/retrait)" } });
  if (!r.ok) throw new Error(`Majestic ${r.status}`);
  const lignes = (await r.text()).split(/\r?\n/);
  const tete = lignes[0].split(",");
  const iRang = tete.indexOf("GlobalRank"), iDom = tete.indexOf("Domain"), iSub = tete.indexOf("RefSubNets");
  if (iRang < 0 || iDom < 0) throw new Error("Colonnes inattendues : " + lignes[0]);
  const jour = new Date().toISOString().slice(0, 10);
  const vus = [];
  for (let k = 1; k < lignes.length; k++) {
    const c = lignes[k].split(",");
    const id = parDom.get(String(c[iDom] ?? "").toLowerCase().replace(/^www\./, ""));
    if (id) vus.push(`('${id}', '${jour}', ${Number(c[iRang])}, ${Number(c[iSub]) || "null"})`);
  }
  console.log("dans le Majestic Million :", vus.length, "sur", lignes.length - 1, "sites");
  for (let i = 0; i < vus.length; i += 500)
    await q(`insert into public.saas_notoriete (saas_id, jour, rang, sous_reseaux) values ${vus.slice(i, i + 500).join(",")} on conflict (saas_id, jour) do update set rang = excluded.rang, sous_reseaux = excluded.sous_reseaux`);
  console.log("mis à jour :", (await q(`select public.saas_notoriete_maj() n`))[0]?.n);
})().catch((e) => { console.error(e); process.exit(1); });
