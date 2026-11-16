// Explorer – applis mobiles : collecte sans IA des applis de l'App Store (données publiques d'Apple).
// 1. Classements publics par catégorie et par pays (gratuites, payantes, meilleures recettes) → identifiants d'applis
//    et meilleur rang « recettes » (le seul signal de revenu public : Apple ne publie aucun chiffre).
// 2. Recherche publique par mots-clés pour aller au-delà des classements.
// 3. Fiche détaillée (nom, éditeur, note, avis, prix, description) par lots de 150, puis écriture dans saas_mobiles.
// Les jeux sont écartés, ainsi que les applis avec moins de 5 avis (souvent abandonnées).
const TOK = process.env.SUPABASE_ACCESS_TOKEN, REF = "fbsjbnnmzazylmquzryo";
const FIN = Date.now() + Number(process.env.MINUTES || 300) * 60_000;
const PAYS = (process.env.PAYS || "us,gb,fr,de,ca,au,es,it,nl,br,mx,jp,kr,in,se,ch,be,at,ie,nz,sg,dk,no,fi,pl,pt").split(",");
const GENRES = { 6000: "Économie et entreprise", 6001: "Météo", 6002: "Utilitaires", 6003: "Voyages", 6004: "Sports", 6005: "Réseaux sociaux", 6006: "Référence", 6007: "Productivité", 6008: "Photo et vidéo", 6009: "Actualités", 6010: "Navigation", 6011: "Musique", 6012: "Style de vie", 6013: "Forme et santé", 6015: "Finance", 6016: "Divertissement", 6017: "Éducation", 6018: "Livres", 6020: "Médecine", 6023: "Cuisine et boissons", 6024: "Shopping", 6026: "Outils de développement", 6027: "Graphisme et design" };
const MOTS = (process.env.MOTS || `ai assistant,ai photo,ai video,ai writer,ai chat,calorie counter,habit tracker,budget,expense tracker,invoice,scanner,pdf,notes,todo,planner,calendar,reminder,journal,meditation,sleep,fasting,workout,running,yoga,pilates,step counter,water tracker,period tracker,pregnancy,baby,parenting,language learning,flashcards,math solver,homework,translator,vpn,password manager,cleaner,storage,photo editor,video editor,collage,background remover,face swap,filters,fonts,keyboard,widgets,wallpaper,qr code,receipt,crm,time tracker,timesheet,shift,payroll,booking,appointment,salon,restaurant,recipe,meal planner,grocery list,diet,keto,weight loss,blood pressure,glucose,symptoms,therapy,mood tracker,dating,friends,community,podcast,audiobook,reading,bible,prayer,astrology,horoscope,tarot,manifestation,affirmations,plant identifier,bird identifier,coin identifier,rock identifier,car,parking,ev charging,fuel,flight tracker,trip planner,packing,currency converter,stocks,crypto,investing,tax,credit score,bank,ai headshot,resume,cover letter,job search,interview,email,signature,fax,phone number,call recorder,voice recorder,transcription,dictation,teleprompter,subtitles,logo maker,poster maker,invitation,thumbnail,reels,tiktok,instagram,followers,analytics,seo,website builder,store,inventory,barcode,pos,delivery,real estate,home design,interior design,paint,measure,ruler,level,flashlight,compass,weather radar,golf,tennis,fishing,hunting,hiking,cycling,ski,surf,music maker,piano,guitar tuner,metronome,drum,dj,karaoke,ringtones,sound,white noise,baby monitor,pet,dog training,cat,horse,family locator,kids,chores,allowance,school,study timer,pomodoro,focus,screen time,blocker,parental control,security camera,smart home,remote,tv,printer,ocr,translator camera,sign language,hearing,vision,accessibility,senior,medication reminder,doctor,pharmacy,fitness coach,personal trainer,bodybuilding,gym log,boxing,dance,stretching,posture,skin care,hair,makeup,nails,tattoo,outfit,fashion,thrift,resell,coupons,cashback,loyalty,gift,wedding,event,ticket,movie,anime,comics,manga,news,newsletter,rss,bookmark,read later,mind map,whiteboard,drawing,sketch,3d,ar,scanner 3d,cad,architecture,construction,field service,inspection,checklist,forms,survey,quiz,trivia,brain training,puzzle,chess coach,crossword helper,typing,coding,python,terminal,ssh,server,developer,github,api,database,spreadsheet,docs,slides,presentation,teleconference,meeting notes,team chat,project management,kanban,okr,habit,goal,streak,challenge,bet,social fitness,charity,volunteer,church,mosque,synagogue,quran,islam,hindu,buddhist,stoic,philosophy,history,museum,art,photography,camera,film camera,vintage,retro,lomo,polaroid,slow shutter,long exposure,night mode,astrophotography,stargazing,moon,tides,surf forecast,snow forecast,air quality,pollen,uv index,earthquake,storm,hurricane,emergency,first aid,survival,self defense,safety,walk home,sos,gps tracker,fleet,trucking,logistics,shipping,package tracker,mail,courier`).split(",");

async function q(sql, n = 0) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOK}`, "Content-Type": "application/json", "User-Agent": "bingoo-ci" }, body: JSON.stringify({ query: sql }) });
  if ((r.status === 429 || r.status >= 500) && n < 6) { await dormir(5000 * (n + 1)); return q(sql, n + 1); }
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}
const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));
// Arrêt automatique : base gratuite Supabase limitée à 500 Mo (arrêt à 470 Mo) et objectif de 80 000 SaaS et applis (PLAFOND)
let pleine = false, vuTaille = 0;
async function basePleine() {
  if (pleine || Date.now() - vuTaille < 120_000) return pleine;
  vuTaille = Date.now();
  const r = await q(`select pg_database_size(current_database()) / 1048576 as mo,
    (select count(*) from public.saas where statut = 'ok') + (select count(*) from public.saas_mobiles) as total`).catch(() => null);
  const plafond = Number(process.env.PLAFOND || 80000);
  if (r?.[0]?.mo > 470) { pleine = true; console.log("Base presque pleine (", r[0].mo, "Mo) : collecte arrêtée"); }
  if (process.env.ETAPE !== "captures" && r?.[0]?.total >= plafond) { pleine = true; console.log("Objectif atteint (", r[0].total, "SaaS et applis) : collecte arrêtée"); }
  return pleine;
}
const lit = (v) => (v == null || v === "" ? "null" : "'" + String(v).replace(/'/g, "''") + "'");
// Apple limite à environ 20 appels par minute : une pause régulière, plus longue si Apple répond « trop d'appels »
let dernier = 0;
async function apple(url, n = 0) {
  const attente = 3200 - (Date.now() - dernier); if (attente > 0) await dormir(attente);
  dernier = Date.now();
  try {
    const r = await fetch(url, { headers: { "user-agent": "BingooBot/1.0 (+https://kairo.maisonravita.fr/#/retrait)" }, signal: AbortSignal.timeout(20000) });
    if ((r.status === 403 || r.status === 429) && n < 4) { await dormir(60_000 * (n + 1)); return apple(url, n + 1); }
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

const ids = new Map(); // id → { rang, pays, cat }
const noter = (id, rang, pays, cat) => {
  const x = ids.get(id);
  if (!x) ids.set(id, rang ? { rang, pays, cat } : {});
  else if (rang && (!x.rang || rang < x.rang)) Object.assign(x, { rang, pays, cat });
};

async function classements() {
  for (const pays of PAYS) for (const [g, cat] of Object.entries(GENRES)) for (const type of ["topgrossingapplications", "topfreeapplications", "toppaidapplications"]) {
    if (Date.now() > FIN - 20 * 60_000) return; // garder 20 minutes pour les dernières fiches
    await fiches();
    const j = await apple(`https://itunes.apple.com/${pays}/rss/${type}/limit=200/genre=${g}/json`);
    const e = j?.feed?.entry ?? [];
    e.forEach((x, k) => { const id = Number(x?.id?.attributes?.["im:id"]); if (id) noter(id, type === "topgrossingapplications" ? k + 1 : null, pays, cat); });
  }
}
async function recherches() {
  // Boule de neige : en plus de la liste, les mots les plus fréquents dans les noms d'applis déjà relevées
  const extra = await q(`select w from (select lower(regexp_replace(unnest(regexp_split_to_array(nom, '[^A-Za-zÀ-ÿ]+')), '^$', '')) w from public.saas_mobiles) x
    where length(w) between 4 and 20 and w not in ('with','your','pour','app','apps','the','and','free','pro','plus','lite','tracker','maker','editor','official')
    group by w having count(*) >= 3 order by count(*) desc limit 1500`).catch(() => []);
  const PART = Number(process.env.PART || 0), PARTS = Number(process.env.PARTS || 1);
  const mots = [...new Set([...MOTS, ...extra.map((x) => x.w)])].filter((_, k) => k % PARTS === PART);
  console.log("mots de recherche :", mots.length);
  for (const mot of mots) for (const pays of ["us", "fr", "gb", "de", "br"]) {
    if (Date.now() > FIN - 20 * 60_000) return;
    await fiches();
    const j = await apple(`https://itunes.apple.com/search?term=${encodeURIComponent(mot)}&entity=software&limit=200&country=${pays}`);
    for (const r of j?.results ?? []) if (r.trackId) noter(r.trackId, null, null, null);
  }
}

const NOMS_PAYS = { us: "États-Unis", gb: "Royaume-Uni", fr: "France", de: "Allemagne", ca: "Canada", au: "Australie", es: "Espagne", it: "Italie", nl: "Pays-Bas", br: "Brésil", mx: "Mexique", jp: "Japon", kr: "Corée du Sud", in: "Inde", se: "Suède", ch: "Suisse", be: "Belgique", at: "Autriche", ie: "Irlande", nz: "Nouvelle-Zélande", sg: "Singapour", dk: "Danemark", no: "Norvège", fi: "Finlande", pl: "Pologne", pt: "Portugal" };
const GENRE_FR = Object.fromEntries(Object.entries({ Business: 6000, Weather: 6001, Utilities: 6002, Travel: 6003, Sports: 6004, "Social Networking": 6005, Reference: 6006, Productivity: 6007, "Photo & Video": 6008, News: 6009, Navigation: 6010, Music: 6011, Lifestyle: 6012, "Health & Fitness": 6013, Finance: 6015, Entertainment: 6016, Education: 6017, Books: 6018, Medical: 6020, "Food & Drink": 6023, Shopping: 6024, "Developer Tools": 6026, "Graphics & Design": 6027 }).map(([k, v]) => [k, GENRES[v]]));

let deja = null, faits = new Set(), gardees = 0;
async function fiches(force = false) {
  if (!deja) deja = new Set((await q(`select id from public.saas_mobiles where vu_at > now() - interval '7 days'`)).map((x) => Number(x.id)));
  const tous = [...ids.keys()].filter((id) => !faits.has(id) && (!deja.has(id) || ids.get(id).rang));
  if (!force && tous.length < 3000) return;
  tous.forEach((id) => faits.add(id));
  console.log("fiches à lire :", tous.length, "(", ids.size, "repérées )");
  for (let i = 0; i < tous.length; i += 150) {
    if (Date.now() > FIN || await basePleine()) break;
    const j = await apple(`https://itunes.apple.com/lookup?id=${tous.slice(i, i + 150).join(",")}&country=us`);
    const lignes = [];
    for (const r of j?.results ?? []) {
      if (!r.trackId || r.kind !== "software") continue;
      if ((r.genreIds ?? []).includes("6014") || r.primaryGenreName === "Games") continue;
      if ((r.userRatingCount ?? 0) < 5) continue;
      const d = String(r.description ?? "");
      const abo = /subscription|subscribe|auto-renew|premium|pro version|unlock all|free trial|abonnement/i.test(d) || /\bpro\b|premium|plus\b/i.test(String(r.trackName ?? ""));
      const x = ids.get(r.trackId) ?? {};
      lignes.push(`(${r.trackId}, ${lit(String(r.trackName).slice(0, 120))}, ${lit(String(r.sellerName ?? r.artistName ?? "").slice(0, 120))}, ${lit(GENRE_FR[r.primaryGenreName] ?? r.primaryGenreName)},
        ${lit(d.replace(/\s+/g, " ").slice(0, 320))}, ${r.averageUserRating != null ? Number(r.averageUserRating).toFixed(2) : "null"}, ${Number(r.userRatingCount) || 0},
        ${r.price != null ? Number(r.price) : "null"}, ${lit(r.currency)}, ${abo}, ${lit(r.artworkUrl100)}, ${lit(String(r.trackViewUrl ?? "").split("?")[0])}, ${lit(r.sellerUrl)},
        ${lit(String(r.releaseDate ?? "").slice(0, 10))}, ${lit(String(r.currentVersionReleaseDate ?? "").slice(0, 10))}, ${x.rang ?? "null"}, ${lit(x.pays ? NOMS_PAYS[x.pays] : null)}, ${lit(x.cat)}, ${lit((r.screenshotUrls ?? [])[0] ?? (r.ipadScreenshotUrls ?? [])[0] ?? null)})`);
    }
    if (lignes.length) {
      await q(`insert into public.saas_mobiles (id, nom, editeur, categorie, description, note, avis, prix, devise, abonnement, icone, url, site, sortie, maj, rang_revenus, rang_pays, rang_categorie, capture)
        values ${lignes.join(",")}
        on conflict (id) do update set nom = excluded.nom, editeur = excluded.editeur, categorie = excluded.categorie, description = excluded.description, note = excluded.note, avis = excluded.avis,
          prix = excluded.prix, devise = excluded.devise, abonnement = excluded.abonnement, icone = excluded.icone, url = excluded.url, site = excluded.site, maj = excluded.maj, vu_at = now(), capture = coalesce(excluded.capture, saas_mobiles.capture),
          rang_revenus = coalesce(excluded.rang_revenus, saas_mobiles.rang_revenus), rang_pays = coalesce(excluded.rang_pays, saas_mobiles.rang_pays), rang_categorie = coalesce(excluded.rang_categorie, saas_mobiles.rang_categorie)`)
        .then(() => (gardees += lignes.length)).catch((e) => console.error("écriture", e.message));
    }
  }
  console.log("applis gardées jusqu'ici :", gardees);
}

// Rattrapage : la première capture d'écran App Store des applis déjà relevées (pour les cartes de l'Explorer)
async function captures() {
  const rows = await q(`select id from public.saas_mobiles where capture is null order by avis desc nulls last limit 100000`);
  console.log("applis sans capture :", rows.length);
  let faites = 0;
  for (let i = 0; i < rows.length; i += 150) {
    if (Date.now() > FIN || await basePleine()) break;
    const j = await apple(`https://itunes.apple.com/lookup?id=${rows.slice(i, i + 150).map((x) => x.id).join(",")}&country=us`);
    const v = (j?.results ?? []).map((r) => [r.trackId, (r.screenshotUrls ?? [])[0] ?? (r.ipadScreenshotUrls ?? [])[0]]).filter(([id, u]) => id && u);
    if (v.length) await q(`update public.saas_mobiles m set capture = v.u from (values ${v.map(([id, u]) => `(${id}::bigint, ${lit(u)})`).join(",")}) v(id, u) where m.id = v.id`).then(() => (faites += v.length)).catch((e) => console.error("capture", e.message));
  }
  console.log("captures ajoutées :", faites);
}

(async () => {
  if (process.env.ETAPE === "captures") return await captures();
  if (process.env.ETAPE !== "recherche") await classements();
  console.log("après classements :", ids.size);
  if (process.env.ETAPE !== "classements") await recherches();
  console.log("après recherches :", ids.size);
  await fiches(true);
})().catch((e) => { console.error(e); process.exit(1); });
