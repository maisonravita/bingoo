import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Button, Card, Spinner, useToast } from "../components/ui";
import { cx, fmtTime } from "../lib/utils";

const TYPES = [
  ["social", "Publication", "Réseaux sociaux", "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17.5 6.5h0"],
  ["video", "Vidéo courte", "TikTok, Reels, Shorts", "M8 5v14l11-7z"],
  ["pub", "Publicité", "Images et textes", "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a3 3 0 0 1 0 6M18 6a7 7 0 0 1 0 12"],
  ["article", "Article SEO", "Blog", "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6"],
  ["email", "Email marketing", "", "M4 6h16v12H4zM4 7l8 6 8-6"],
  ["page", "Page de vente", "", "M4 5h16v14H4zM4 9h16M8 13h5M8 16h3"],
  ["script", "Script vidéo", "", "M4 7h16v12H4zM4 7l3-4h10l3 4M10 11l4 2.5-4 2.5z"],
  ["autre", "Autre", "", "M6 12h.01M12 12h.01M18 12h.01"],
];
const FILTERS = [["all", "Tous"], ["social", "Réseaux sociaux"], ["pub", "Publicités"], ["video", "Vidéos"], ["article", "Articles SEO"], ["email", "Emails"], ["page", "Pages de vente"]];
const TONS = ["Professionnel et engageant", "Chaleureux et proche", "Expert et pédagogue", "Direct et percutant", "Premium et sobre", "Décalé et drôle"];
const LANGS = ["Français", "Anglais", "Espagnol", "Allemand", "Italien"];
const GOALS = ["Obtenir des leads", "Gagner en visibilité", "Promouvoir une offre", "Éduquer", "Fidéliser"];
const NETS = ["Instagram", "LinkedIn", "Facebook", "TikTok", "X"];
const EXAMPLES = { social: "Une publication pour présenter notre service à des dirigeants de PME", video: "Une vidéo de 30 secondes qui montre le problème que nous résolvons", pub: "Une publicité pour obtenir des demandes de devis", article: "Un article de blog sur la question que nos clients nous posent le plus", email: "Un e-mail pour relancer nos anciens clients avec notre nouvelle offre", page: "Une page de vente pour notre offre principale", script: "Le script d'une vidéo de présentation de 1 minute", autre: "" };

const Ico = ({ d, className = "h-6 w-6" }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={d} /></svg>;
const Sel = ({ label, value, onChange, options }) => (
  <label className="block text-sm"><span className="font-medium">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 outline-none focus:border-accent">{options.map((o) => <option key={o}>{o}</option>)}</select>
  </label>
);
const Step = ({ n, title, children }) => (
  <Card className="p-5 sm:p-6">
    <div className="flex items-center gap-3 mb-4"><span className="grid place-items-center h-7 w-7 rounded-full bg-accent-soft text-accent text-sm font-semibold">{n}</span><h3 className="font-semibold text-lg">{title}</h3></div>
    {children}
  </Card>
);

/** Visuel carré aux couleurs de la marque. Aucune image inventée : fond graphique, ou ta propre photo. */
function Visual({ v, brand, photo, nodeRef }) {
  return (
    <div ref={nodeRef} className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#FBF7F1]" style={{ fontFamily: "Geist, system-ui, sans-serif" }}>
      {photo ? <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
        <>
          <div className="absolute -right-[18%] -top-[12%] h-[70%] aspect-square rounded-full bg-[#FCE7DC]" />
          <div className="absolute right-[8%] bottom-[18%] h-[34%] aspect-square rounded-full border-[10px] border-[#F26B2A]/15" />
          <div className="absolute -left-[10%] -bottom-[16%] h-[42%] aspect-square rounded-full bg-[#F26B2A]/10" />
        </>
      )}
      {photo && <div className="absolute inset-0 bg-gradient-to-r from-[#FBF7F1] via-[#FBF7F1]/85 to-transparent" />}
      <div className="relative h-full flex flex-col p-[6.5%]">
        <p className="text-[clamp(14px,3.4cqw,22px)] font-bold tracking-tight text-[#15161A]">{brand}<span className="text-[#F26B2A]">.</span></p>
        <div className="mt-auto max-w-[78%]">
          {v?.surtitre && <span className="inline-block rounded-md bg-[#FCE7DC] px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#BF4314]">{v.surtitre}</span>}
          <p className="mt-3 font-extrabold leading-[1.02] tracking-tight text-[#15161A]" style={{ fontSize: "clamp(17px, 6.6cqw, 46px)" }}>{v?.titre}</p>
          {v?.points?.filter(Boolean).length > 0 && (
            <div className="mt-[4%] flex flex-wrap gap-x-4 gap-y-1.5">{v.points.filter(Boolean).slice(0, 3).map((p) => <span key={p} className="flex items-center gap-1.5 text-[12px] font-medium text-[#3A3C42]"><span className="h-1.5 w-1.5 rounded-full bg-[#F26B2A]" />{p}</span>)}</div>
          )}
          {v?.bouton && <span className="mt-[5%] inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-[#F26B2A] px-4 py-2.5 text-[13px] font-semibold text-white">{v.bouton} →</span>}
        </div>
      </div>
      <style>{`[data-cq]{container-type:inline-size}`}</style>
    </div>
  );
}

function TextOut({ t, o }) {
  const toast = useToast();
  const copy = (s) => navigator.clipboard?.writeText(s).then(() => toast("Copié", "good"), () => toast("Copie impossible", "bad"));
  const Block = ({ label, value }) => value ? (
    <div className="mt-4 first:mt-0"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</p><button onClick={() => copy(value)} className="text-xs font-semibold text-accent">Copier</button></div>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{value}</p></div>
  ) : null;
  return (
    <div className="max-h-[520px] overflow-y-auto pr-1">
      <Block label="Objet" value={o.objet} /><Block label="Pré-en-tête" value={o.preheader} />
      <Block label="Titre" value={o.titre} /><Block label="Méta-description" value={o.meta} /><Block label="Mot-clé visé" value={o.mot_cle} />
      <Block label="Accroche" value={o.accroche} />
      {o.scenes?.length > 0 && <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Déroulé</p>{o.scenes.map((s, i) => <div key={i} className="mt-2 rounded-xl border border-line p-3 text-sm"><p className="font-semibold">{s.temps}</p><p>🎬 {s.image}</p>{s.texte_ecran && <p>🅣 {s.texte_ecran}</p>}{s.voix && <p>🎙 {s.voix}</p>}</div>)}</div>}
      <Block label={t === "article" || t === "page" ? "Contenu" : t === "email" ? "Corps" : "Texte"} value={o.texte} />
      {o.titres?.length > 0 && <Block label="Titres" value={o.titres.join("\n")} />}
      {o.descriptions?.length > 0 && <Block label="Descriptions" value={o.descriptions.join("\n")} />}
      {o.hashtags?.length > 0 && <Block label="Hashtags" value={o.hashtags.join(" ")} />}
    </div>
  );
}

export default function Studio() {
  const { ws } = useWs();
  const toast = useToast();
  const [type, setType] = useState("social");
  const [brief, setBrief] = useState("");
  const [ton, setTon] = useState(TONS[0]);
  const [langue, setLangue] = useState(LANGS[0]);
  const [reseau, setReseau] = useState(NETS[0]);
  const [goal, setGoal] = useState(GOALS[0]);
  const [busy, setBusy] = useState(false);
  const [item, setItem] = useState(null);
  const [view, setView] = useState("visuel");
  const [edit, setEdit] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [hist, setHist] = useState(null);
  const [filter, setFilter] = useState("all");
  const node = useRef(null);
  const brand = ws.profile?.nom || ws.name;

  const load = useCallback(async () => {
    const { data } = await supabase.from("studio_items").select("*").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(30);
    setHist(data ?? []);
  }, [ws.id]);
  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setBusy(true);
    try {
      const r = await fn("r/studio-generate", { workspace_id: ws.id, type, brief, ton, langue, objectif: goal, reseau: type === "social" ? reseau : "" });
      setItem(r); setView("visuel"); setEdit(false); load();
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const patch = (k, v) => setItem((it) => ({ ...it, output: { ...it.output, visuel: { ...it.output.visuel, [k]: v } } }));
  const save = async () => { await supabase.from("studio_items").update({ output: item.output }).eq("id", item.id); setEdit(false); toast("Modifications enregistrées", "good"); load(); };
  const download = async () => {
    try {
      const url = await toPng(node.current, { pixelRatio: 1080 / node.current.offsetWidth, cacheBust: true });
      const a = document.createElement("a"); a.href = url; a.download = `${brand}-${item.type}.png`.replace(/\s+/g, "-"); a.click();
    } catch { toast("Export impossible dans ce navigateur", "bad"); }
  };
  const o = item?.output ?? {};
  const shown = (hist ?? []).filter((h) => filter === "all" || h.type === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid place-items-center h-14 w-14 rounded-2xl bg-accent-soft text-accent"><Ico d="M4 7h16v12H4zM4 7l3-4h10l3 4M10 11l4 2.5-4 2.5z" className="h-8 w-8" /></span>
          <div><h1 className="font-serif text-4xl leading-none">Kairo Studio</h1><p className="text-ink-soft mt-1.5">Crée des contenus marketing à partir de ce que ton entreprise est vraiment.</p></div>
        </div>
        <Button variant="accent" onClick={() => { setItem(null); setBrief(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>+ Créer un contenu</Button>
      </div>

      <div className="grid xl:grid-cols-[1fr_440px] gap-5 items-start">
        <div className="space-y-4 min-w-0">
          <Step n="1" title="Quel type de contenu veux-tu créer ?">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TYPES.map(([k, l, sub, d]) => (
                <button key={k} onClick={() => setType(k)} className={cx("relative rounded-xl border p-4 text-center transition-colors", type === k ? "border-accent bg-accent-soft/40" : "border-line bg-white hover:border-ink-faint")}>
                  {type === k && <span className="absolute right-2 top-2 grid place-items-center h-5 w-5 rounded-full bg-accent text-white text-[11px]">✓</span>}
                  <span className={cx("inline-block", type === k ? "text-accent" : "text-ink")}><Ico d={d} /></span>
                  <p className="text-sm font-medium mt-2 leading-tight">{l}</p>{sub && <p className="text-xs text-ink-soft mt-0.5">{sub}</p>}
                </button>
              ))}
            </div>
          </Step>
          <Step n="2" title="Décris ton contenu">
            <div className="relative">
              <textarea value={brief} onChange={(e) => setBrief(e.target.value.slice(0, 500))} rows={3} placeholder={EXAMPLES[type] || "Décris le contenu voulu"} className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] outline-none focus:border-accent resize-none" />
              <span className="absolute right-3 bottom-3 text-[11px] text-ink-faint">{brief.length}/500</span>
            </div>
            <div className={cx("grid gap-3 mt-4", type === "social" ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
              <Sel label="Ton de la marque" value={ton} onChange={setTon} options={TONS} />
              {type === "social" && <Sel label="Réseau" value={reseau} onChange={setReseau} options={NETS} />}
              <Sel label="Langue" value={langue} onChange={setLangue} options={LANGS} />
            </div>
          </Step>
          <Step n="3" title="Objectif">
            <div className="flex flex-wrap gap-2">{GOALS.map((g) => <button key={g} onClick={() => setGoal(g)} className={cx("rounded-full border px-4 py-2 text-sm", goal === g ? "border-accent bg-accent-soft/50 text-accent-dark font-medium" : "border-line bg-white hover:border-ink-faint")}>{g}</button>)}</div>
            <Button variant="accent" className="w-full mt-5 py-3.5" loading={busy} disabled={brief.trim().length < 8} onClick={generate}>✦ Générer le contenu →</Button>
            <p className="text-xs text-ink-faint mt-2 text-center">Kairo n'invente ni chiffre, ni client, ni témoignage : ce qui manque est laissé [entre crochets] à compléter.</p>
          </Step>
        </div>

        <Card className="p-5 xl:sticky xl:top-6">
          <h3 className="font-semibold text-lg">Aperçu du contenu généré</h3>
          <div className="mt-3 grid grid-cols-3 rounded-xl bg-paper p-1 text-sm">
            {[["visuel", "Visuel"], ["texte", "Texte"], ["variantes", "Variantes"]].map(([k, l]) => <button key={k} onClick={() => setView(k)} className={cx("rounded-lg py-2 font-medium", view === k ? "bg-white text-accent shadow-sm" : "text-ink-soft")}>{l}</button>)}
          </div>
          <div className="mt-4">
            {busy ? <div className="aspect-square grid place-items-center rounded-2xl bg-paper"><div className="text-center"><Spinner /><p className="text-sm text-ink-soft mt-3">Création en cours…</p></div></div>
              : !item ? <div className="aspect-square grid place-items-center rounded-2xl border border-dashed border-line text-center p-8"><p className="text-sm text-ink-soft">Choisis un format, décris ton idée, et ton contenu apparaîtra ici, prêt à modifier ou télécharger.</p></div>
              : view === "visuel" ? (
                <div data-cq className="[container-type:inline-size]">
                  <Visual v={o.visuel} brand={brand} photo={photo} nodeRef={node} />
                  {edit && (
                    <div className="mt-4 space-y-2 text-sm">
                      {["surtitre", "titre", "bouton"].map((k) => <input key={k} value={o.visuel?.[k] ?? ""} onChange={(e) => patch(k, e.target.value)} placeholder={k} className="w-full rounded-lg border border-line px-3 py-2" />)}
                      <input value={(o.visuel?.points ?? []).join(" · ")} onChange={(e) => patch("points", e.target.value.split("·").map((x) => x.trim()))} placeholder="Bénéfices séparés par ·" className="w-full rounded-lg border border-line px-3 py-2" />
                      <label className="flex items-center gap-2 text-ink-soft cursor-pointer"><input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setPhoto(URL.createObjectURL(e.target.files[0]))} /><span className="underline">Ajouter ta propre photo en fond</span>{photo && <button onClick={(e) => { e.preventDefault(); setPhoto(null); }} className="text-xs">(retirer)</button>}</label>
                    </div>
                  )}
                </div>
              ) : view === "texte" ? <TextOut t={item.type} o={o} />
              : <div className="space-y-2">{(o.variantes ?? []).map((v, i) => <div key={i} className="rounded-xl border border-line p-3 text-sm"><p className="text-xs text-ink-faint mb-1">Variante {i + 1}</p>{v}</div>)}</div>}
          </div>
          {item && !busy && (
            <div className="mt-4 grid grid-cols-[1fr_1fr] gap-2">
              {view === "visuel" ? <Button variant="accent" onClick={download}>↓ Télécharger</Button> : <Button variant="accent" onClick={() => navigator.clipboard?.writeText([o.objet, o.titre, o.accroche, o.texte, (o.hashtags ?? []).join(" ")].filter(Boolean).join("\n\n")).then(() => toast("Texte copié", "good"))}>Copier le texte</Button>}
              {edit ? <Button variant="ghost" onClick={save}>Enregistrer</Button> : <Button variant="ghost" onClick={() => { setView("visuel"); setEdit(true); }}>✎ Modifier</Button>}
            </div>
          )}
          {o.conseil && !busy && <div className="mt-4 rounded-xl bg-accent-soft/50 p-4 text-sm"><p className="font-semibold text-accent">Conseil de Kairo</p><p className="text-ink-soft mt-0.5">{o.conseil}</p></div>}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-lg">Mes contenus</h3>
          <div className="flex gap-1 overflow-x-auto">{FILTERS.map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={cx("shrink-0 rounded-full px-3 py-1.5 text-xs font-medium", filter === k ? "bg-accent-soft text-accent-dark" : "text-ink-soft hover:text-ink")}>{l}</button>)}</div></div>
        {!hist ? <Spinner /> : !shown.length ? <p className="text-sm text-ink-soft mt-3">Aucun contenu pour l'instant.</p> : (
          <ul className="mt-3 divide-y divide-line">
            {shown.map((h) => (
              <li key={h.id}><button onClick={() => { setItem(h); setView("visuel"); setEdit(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="w-full text-left py-3 flex items-center gap-3 hover:bg-paper/60 rounded-lg px-2">
                <span className="text-accent"><Ico d={TYPES.find((t) => t[0] === h.type)?.[3] ?? TYPES[7][3]} className="h-5 w-5" /></span>
                <span className="flex-1 min-w-0"><span className="block text-sm font-medium truncate">{h.output?.visuel?.titre || h.output?.titre || h.output?.objet || h.brief}</span><span className="block text-xs text-ink-faint truncate">{TYPES.find((t) => t[0] === h.type)?.[1]} · {h.brief}</span></span>
                <span className="text-xs text-ink-faint shrink-0">{fmtTime(h.created_at)}</span>
              </button></li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
