import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { useToast } from "../components/ui";
import { demanderCompte, estInvite } from "../lib/invite";
import { cx } from "../lib/utils";

// « Construire avec mon IA » : Bingoo! branché sur le Claude ou le ChatGPT du membre (serveur MCP).
// Un parcours en 3 étapes qui se cochent : créer son adresse, la brancher sur son IA, lui demander.
const HF = { fontFamily: "var(--font-titre)" };

const IAS = [
  { id: "claude", nom: "Claude", note: "Site ou application", etapes: ["Ouvre Plug-ins dans le menu de gauche (ou Paramètres, puis Connecteurs).", "Clique sur « Ajouter », puis « Ajouter un connecteur personnalisé ».", "Nomme-le Bingoo! et colle ton adresse.", "Dans une conversation, active Bingoo! dans le menu des outils."] },
  { id: "chatgpt", nom: "ChatGPT", note: "Site ou application", etapes: ["Ouvre Paramètres, puis Applications et connecteurs.", "Active le mode développeur dans les paramètres avancés.", "Crée un connecteur, colle ton adresse, sans authentification.", "Choisis Bingoo! dans les outils d'une conversation."] },
  { id: "code", nom: "Claude Code", note: "Ou tout client MCP", etapes: ["Dans ton terminal, ajoute Bingoo! comme serveur MCP :"], commande: true },
];
const EXEMPLES = [
  ["Trouver", "Trouve-moi 3 SaaS de facturation qui grandissent en ce moment, avec leur revenu vérifié"],
  ["Construire", "Construis ma version d'un outil de prise de notes, avec un assistant IA intégré"],
  ["Améliorer", "Ajoute un tableau de bord des ventes à mon SaaS et publie la nouvelle version"],
  ["Valider", "Donne-moi la fiche de url2pin.com et dis-moi si je peux lancer ma version"],
];

function Etape({ n, titre, sous, fait, actif, children }) {
  return (
    <section className={cx("relative rounded-3xl border bg-white p-5 sm:p-7 transition", actif ? "border-ink shadow-[0_8px_30px_rgba(17,17,17,.08)]" : "border-line")}>
      <div className="flex items-start gap-4">
        <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-black", fait ? "bg-good text-white" : actif ? "bg-ink text-white" : "bg-paper text-ink-faint")}>{fait ? "✓" : n}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[20px] font-black tracking-tight" style={HF}>{titre}</h2>
          {sous && <p className="mt-0.5 text-[14px] text-ink-soft">{sous}</p>}
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function Connecteur() {
  const { ws, session } = useWs();
  const toast = useToast();
  const nav = useNavigate();
  const [cles, setCles] = useState(null), [nouvelle, setNouvelle] = useState(null), [busy, setBusy] = useState(false), [paye, setPaye] = useState(null);
  const [ia, setIa] = useState("claude"), [branche, setBranche] = useState(() => { try { return localStorage.getItem("bingoo-ia-branchee") === "1"; } catch { return false; } });
  const [cible, setCible] = useState(""), [gerer, setGerer] = useState(false);
  const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/t/mcp`;
  const charger = () => supabase.from("saas_api_cles").select("id, nom, debut, created_at, dernier_usage, appels, revoquee").eq("workspace_id", ws.id).order("created_at", { ascending: false }).then(({ data }) => setCles(data ?? []));
  useEffect(() => { if (ws?.id) charger(); }, [ws?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { supabase.rpc("saas_acces").then(({ data }) => setPaye(!!data)); }, [ws?.id]);

  // Arrivé depuis la fiche d'un SaaS : la demande à coller dans son IA, toute prête
  const [depuis] = useState(() => { try { const q0 = new URLSearchParams(window.location.hash.split("?")[1] ?? ""); if (q0.get("saas") || q0.get("domaine")) { sessionStorage.setItem("bingoo_demande_ia", q0.toString()); return q0; } const s = sessionStorage.getItem("bingoo_demande_ia"); return s ? new URLSearchParams(s) : null; } catch { return null; } });
  const idDepuis = depuis?.get("saas") || depuis?.get("domaine") || "";
  const id = cible.trim().length >= 3 ? cible.trim() : idDepuis;
  const nom = cible.trim().length >= 3 ? cible.trim() : depuis?.get("nom") || idDepuis;
  const demande = id ? `Avec Bingoo!, prépare le SaaS ${id}${nom && nom !== id ? ` (${nom})` : ""} avec preparer_saas, lis guide_construction, puis construis MA propre version : un nom et une identité originaux, mais la même logique, les mêmes parcours et les mêmes interactions que ${nom}. Propose-moi d'abord ta conception (nom, écrans, données), puis crée-la et écris chaque écran jusqu'à la mise en ligne.` : "";

  const actives = (cles ?? []).filter((k) => !k.revoquee);
  const aCle = !!nouvelle || actives.length > 0;
  const utilisee = actives.some((k) => (k.appels ?? 0) > 0);
  const etape = !aCle ? 1 : !(branche || utilisee) ? 2 : 3;

  const creer = async () => {
    if (estInvite(session)) return demanderCompte("Ton adresse de connecteur est rattachée à ton compte.");
    setBusy(true);
    const { data, error } = await supabase.rpc("saas_api_cle_creer", { ws: ws.id, p_nom: "Claude" });
    setBusy(false);
    if (error) return toast(error.message, "bad");
    setNouvelle(`${base}/${data}`); charger();
  };
  const copier = async (t, quoi = "Copié") => { try { await navigator.clipboard.writeText(t); toast(quoi, "good"); } catch { toast("Sélectionne le texte pour le copier"); } };
  const revoquer = async (k) => { await supabase.from("saas_api_cles").update({ revoquee: true }).eq("id", k.id); toast("Adresse révoquée : l'IA qui l'utilisait n'a plus accès", "good"); charger(); };
  const marquerBranche = () => { setBranche(true); try { localStorage.setItem("bingoo-ia-branchee", "1"); } catch { /* stockage indisponible */ } };
  const adresse = nouvelle ?? (actives[0] ? `${base}/${actives[0].debut}…` : "");
  const choix = IAS.find((x) => x.id === ia);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* En-tête : la promesse, et à quoi ça ressemble dans son IA */}
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-[12.5px] font-bold text-accent-dark">✦ Avec Claude ou ChatGPT</span>
          <h1 className="mt-4 text-[38px] sm:text-[52px] font-black leading-[1.02] tracking-tight" style={HF}>Ton IA construit.<br />Bingoo! met en ligne.</h1>
          <p className="mt-4 max-w-xl text-[16.5px] leading-relaxed text-ink-soft">Branche Bingoo! sur ton IA en 2 minutes. Elle trouve un SaaS qui marche déjà, conçoit ta version avec toi, écran par écran, sans limite. Bingoo! l'héberge, la vérifie et la publie.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="#etapes" className="rounded-full bg-ink px-6 py-3 text-[15px] font-bold text-white hover:bg-ink/90">{etape === 1 ? "Commencer" : etape === 2 ? "Continuer à l'étape 2" : "Voir ma demande"}</a>
            <button onClick={() => nav("/explorer/modeles")} className="text-[14px] font-semibold text-ink-soft underline-offset-4 hover:underline">Pas d'IA ? Bingoo! construit seul →</button>
          </div>
        </div>
        <div className="rounded-[28px] border border-line bg-paper p-3 shadow-[0_20px_60px_rgba(17,17,17,.08)]">
          <div className="rounded-[22px] bg-white p-5">
            <div className="flex items-center gap-2 border-b border-line pb-3"><span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" /><span className="ml-2 text-[12.5px] font-semibold text-ink-faint">Ton IA · Bingoo! activé</span></div>
            <div className="mt-4 space-y-3 text-[14px]">
              <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-white">Construis ma version de Calendly pour les coachs sportifs</p>
              <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-paper px-4 py-3">
                <p className="text-[12px] font-bold text-accent-dark">Bingoo! · preparer_saas</p>
                <p className="mt-1">Je te propose <b>Coachéo</b> : réservation de séances, planning, paiement des forfaits et rappels.</p>
                <div className="mt-2.5 grid grid-cols-3 gap-1.5">{["Planning", "Réserver", "Clients"].map((x) => <span key={x} className="rounded-lg bg-white px-2 py-1.5 text-center text-[12px] font-semibold text-ink-soft">{x}</span>)}</div>
              </div>
              <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-paper px-4 py-2.5"><p className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-good text-[11px] text-white">✓</span><b>Coachéo</b> est en ligne, vérifié par le robot.</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Ce qu'on peut lui demander */}
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{EXEMPLES.map(([t, ex]) => (
        <button key={t} onClick={() => copier(ex, "Question copiée")} title="Copier" className="group rounded-2xl border border-line bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-ink">
          <p className="text-[12px] font-bold uppercase tracking-wide text-accent-dark">{t}</p>
          <p className="mt-1.5 text-[14px] leading-snug">« {ex} »</p>
          <p className="mt-2 text-[12px] font-semibold text-ink-faint group-hover:text-ink">Copier</p>
        </button>
      ))}</div>

      {/* Les 3 étapes */}
      <div id="etapes" className="mt-12 scroll-mt-6 space-y-4">
        <Etape n={1} titre="Crée ton adresse personnelle" sous="Elle donne accès à Bingoo! en ton nom. Ne la partage pas, tu peux la révoquer à tout moment." fait={aCle} actif={etape === 1}>
          {nouvelle ? (
            <div>
              <div className="flex flex-col gap-2 sm:flex-row"><input readOnly value={nouvelle} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-3 font-mono text-[13px]" /><button onClick={() => copier(nouvelle, "Adresse copiée")} className="rounded-xl bg-ink px-5 py-3 text-[14px] font-bold text-white">Copier l'adresse</button></div>
              <p className="mt-2 text-[13px] font-semibold text-accent-dark">Copie-la maintenant : pour ta sécurité, Bingoo! ne la réaffichera pas.</p>
            </div>
          ) : actives.length ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-paper px-4 py-3 text-[14px]"><span className="font-mono text-[13px]">{actives[0].debut}…</span><span className="text-ink-soft">active depuis le {new Date(actives[0].created_at).toLocaleDateString("fr-FR")}{actives[0].appels ? ` · ${actives[0].appels} appel${actives[0].appels > 1 ? "s" : ""}` : " · pas encore utilisée"}</span><button onClick={creer} disabled={busy} className="ml-auto text-[13px] font-semibold underline underline-offset-4">{busy ? "Création…" : "Perdue ? En créer une nouvelle"}</button></div>
          ) : (
            <button onClick={creer} disabled={busy} className="rounded-xl bg-ink px-6 py-3 text-[15px] font-bold text-white disabled:opacity-60">{busy ? "Création…" : "Créer mon adresse"}</button>
          )}
          {paye === false && <p className="mt-3 text-[13px] text-ink-soft">Essai gratuit : 20 questions par mois, chiffres masqués. <button onClick={() => nav("/abonnement")} className="font-semibold text-ink underline underline-offset-4">Tout débloquer</button></p>}
          {paye && <p className="mt-3 text-[13px] text-ink-soft">Ton abonnement inclut 5 000 questions par mois, avec tous les chiffres.</p>}
        </Etape>

        <Etape n={2} titre="Branche-la sur ton IA" sous="Une seule fois. Ensuite, Bingoo! est disponible dans toutes tes conversations." fait={aCle && (branche || utilisee)} actif={etape === 2}>
          <div className="inline-flex flex-wrap rounded-2xl bg-paper p-1">{IAS.map((x) => (
            <button key={x.id} onClick={() => setIa(x.id)} aria-pressed={ia === x.id} className={cx("rounded-xl px-4 py-2 text-left transition", ia === x.id ? "bg-white shadow-sm" : "hover:bg-white/60")}>
              <span className="block text-[14px] font-bold">{x.nom}</span><span className="block text-[11.5px] text-ink-faint">{x.note}</span>
            </button>
          ))}</div>
          <ol className="mt-4 space-y-2.5">{choix.etapes.map((t, i) => (
            <li key={t} className="flex gap-3 text-[14.5px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper text-[12px] font-bold">{i + 1}</span><span className="pt-0.5">{t}</span></li>
          ))}</ol>
          {choix.commande && <div className="mt-3 flex flex-col gap-2 sm:flex-row"><code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-xl bg-ink px-4 py-3 font-mono text-[13px] text-white">claude mcp add --transport http bingoo {nouvelle ?? "<ton adresse>"}</code><button onClick={() => copier(`claude mcp add --transport http bingoo ${nouvelle ?? "<ton adresse>"}`, "Commande copiée")} className="rounded-xl border border-line px-4 py-3 text-[14px] font-semibold">Copier</button></div>}
          {nouvelle && !choix.commande && <button onClick={() => copier(nouvelle, "Adresse copiée")} className="mt-4 rounded-xl border border-line px-4 py-2 text-[13.5px] font-semibold hover:border-ink">Copier mon adresse</button>}
          {!(branche || utilisee) && <button onClick={marquerBranche} disabled={!aCle} className={cx("mt-4 rounded-xl bg-ink px-4 py-2 text-[13.5px] font-bold text-white disabled:opacity-40", nouvelle && !choix.commande && "ml-2")}>C'est fait</button>}
          {!adresse && <p className="mt-3 text-[13px] text-ink-faint">Crée d'abord ton adresse à l'étape 1.</p>}
        </Etape>

        <Etape n={3} titre="Demande-lui ton SaaS" sous="Choisis le SaaS qui servira de modèle : Bingoo! écrit la demande parfaite pour ton IA." fait={false} actif={etape === 3}>
          <input value={cible} onChange={(e) => setCible(e.target.value)} placeholder={idDepuis ? `${nom} (ou un autre : calendly.com, notion.so…)` : "Ex. calendly.com, notion.so, Tally…"} className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] outline-none focus:border-ink" />
          {demande ? (
            <div className="mt-3 rounded-2xl bg-paper p-4">
              <p className="text-[12px] font-bold uppercase tracking-wide text-ink-faint">Ta demande pour {nom}</p>
              <p className="mt-1.5 text-[14.5px] leading-relaxed">{demande}</p>
              <button onClick={() => copier(demande, "Demande copiée : colle-la dans ton IA")} className="mt-3 rounded-xl bg-accent px-5 py-2.5 text-[14px] font-bold text-white">Copier la demande</button>
            </div>
          ) : <p className="mt-2 text-[13px] text-ink-faint">Ou pars d'une des questions plus haut : un clic pour la copier.</p>}
          <p className="mt-4 text-[12.5px] text-ink-faint">Construire avec ton IA demande l'abonnement « Lancer » et compte comme une construction du mois. Tes questions passent par ton IA : Bingoo! ne lui donne que les chiffres et les outils.</p>
        </Etape>
      </div>

      {(cles ?? []).length > 0 && (
        <div className="mt-8">
          <button onClick={() => setGerer(!gerer)} className="text-[14px] font-semibold text-ink-soft hover:text-ink">{gerer ? "▾" : "▸"} Gérer mes adresses ({cles.length})</button>
          {gerer && <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white">{cles.map((k) => (
            <div key={k.id} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 text-[14px] last:border-0">
              <span className="font-mono text-[13px]">{k.debut}…</span>
              <span className="text-ink-faint">créée le {new Date(k.created_at).toLocaleDateString("fr-FR")} · {k.appels} appel{k.appels > 1 ? "s" : ""}{k.dernier_usage ? `, dernier le ${new Date(k.dernier_usage).toLocaleDateString("fr-FR")}` : ""}</span>
              {k.revoquee ? <span className="ml-auto font-semibold text-bad">Révoquée</span> : <button onClick={() => revoquer(k)} className="ml-auto rounded-lg border border-line px-3 py-1 text-[13px] font-semibold hover:border-bad hover:text-bad">Révoquer</button>}
            </div>
          ))}</div>}
        </div>
      )}
    </div>
  );
}
