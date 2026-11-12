import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useWs } from "./ws";
import { cx } from "./utils";

// « Commencer » sans compte : connexion anonyme Supabase. Le visiteur explore tout Bingoo! ;
// ce qui coûte de l'IA, envoie un message ou touche au paiement lui demande de créer son compte (le serveur refuse aussi).
export const estInvite = (session) => session?.user?.is_anonymous === true;
export const COMPTE_REQUIS = /^Crée ton compte gratuit/;
export const demanderCompte = (raison) => window.dispatchEvent(new CustomEvent("bingoo-compte", { detail: raison ?? null }));

export async function commencer(nav) {
  try { localStorage.setItem("bingoo-guide", "en_cours"); } catch { /* stockage indisponible */ }
  const { error } = await supabase.auth.signInAnonymously();
  // Connexion sans compte désactivée côté Supabase : on retombe sur l'inscription classique
  if (error) nav("/connexion");
  else nav("/explorer/trouver");
}

const champ = "w-full rounded-xl border border-line bg-white px-3.5 py-3 text-[15px] outline-none focus:border-accent focus:ring-4 focus:ring-accent/15";
const HF = { fontFamily: "var(--font-titre)" };

// Fenêtre « Crée ton compte » : rattache une adresse au visiteur, tout ce qu'il a fait est conservé
export function CompteModal() {
  const [ouvert, setOuvert] = useState(false);
  const [raison, setRaison] = useState(null);
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [etat, setEtat] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const f = (e) => { setRaison(e.detail); setEtat(null); setOuvert(true); };
    window.addEventListener("bingoo-compte", f);
    return () => window.removeEventListener("bingoo-compte", f);
  }, []);
  if (!ouvert) return null;
  const envoyer = async (e) => {
    e.preventDefault(); setBusy(true); setEtat(null);
    const retour = window.location.href.split("#")[0];
    const { error } = await supabase.auth.updateUser({ email: email.trim(), data: { mdp_a_definir: true } }, { emailRedirectTo: retour });
    if (error) { setBusy(false); setEtat({ ko: /already|registered|exists/i.test(error.message) ? "Cette adresse a déjà un compte : connecte-toi plutôt (menu, puis Se déconnecter, puis Se connecter)." : error.message }); return; }
    // Si l'adresse est validée tout de suite, on enregistre le mot de passe dans la foulée ; sinon après le clic dans l'e-mail
    const r = await supabase.auth.updateUser({ password: mdp, data: { mdp_a_definir: false } });
    setBusy(false);
    setEtat(r.error ? { mail: true } : { ok: true });
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4" onClick={() => setOuvert(false)}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {etat?.ok ? (
          <><h2 className="text-[24px] font-black" style={HF}>C'est fait.</h2><p className="mt-2 text-ink-soft">Ton compte est créé et tout ce que tu as fait est gardé. Tu peux continuer.</p><button onClick={() => window.location.reload()} className="mt-5 w-full rounded-xl bg-accent text-white py-3 font-bold">Continuer</button></>
        ) : etat?.mail ? (
          <><h2 className="text-[24px] font-black" style={HF}>Regarde tes e-mails</h2><p className="mt-2 text-ink-soft">Bingoo! vient d'envoyer un lien à <b className="text-ink">{email}</b>. Clique dessus pour valider ton adresse : tu reviendras ici, avec tout ce que tu as fait, et tu choisiras ton mot de passe.</p><button onClick={() => setOuvert(false)} className="mt-5 w-full rounded-xl border border-line py-3 font-semibold">Fermer</button></>
        ) : (
          <form onSubmit={envoyer}>
            <h2 className="text-[24px] font-black leading-tight" style={HF}>Crée ton compte gratuit</h2>
            <p className="mt-1.5 text-[14.5px] text-ink-soft">{raison ?? "Pour aller plus loin, il faut un compte."} Tes réponses et tes SaaS sont gardés.</p>
            <label className="mt-5 block text-[13.5px] font-semibold">Ton adresse e-mail</label>
            <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={cx(champ, "mt-1")} />
            <label className="mt-3 block text-[13.5px] font-semibold">Choisis un mot de passe</label>
            <input type="password" required minLength={8} value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="new-password" className={cx(champ, "mt-1")} />
            <p className="mt-1 text-[12.5px] text-ink-faint">8 caractères minimum.</p>
            {etat?.ko && <p className="mt-3 rounded-xl bg-[#FDF0EC] px-3 py-2 text-[13.5px] text-[#9A3412]">{etat.ko}</p>}
            <button disabled={busy} className="mt-5 w-full rounded-xl bg-accent text-white py-3 font-bold disabled:opacity-60">{busy ? "Création…" : "Créer mon compte"}</button>
            <button type="button" onClick={() => setOuvert(false)} className="mt-2 w-full py-2 text-[14px] text-ink-soft hover:text-ink">Plus tard</button>
          </form>
        )}
      </div>
    </div>
  );
}

// Retour du lien de validation : l'adresse est confirmée, on demande le mot de passe s'il manque
export function MotDePasseManquant() {
  const { session } = useWs();
  const [mdp, setMdp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fait, setFait] = useState(false);
  const u = session?.user;
  if (fait || !u || u.is_anonymous || !u.user_metadata?.mdp_a_definir) return null;
  const valider = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await supabase.auth.updateUser({ password: mdp, data: { mdp_a_definir: false } });
    setBusy(false);
    if (error) setErr(error.message); else setFait(true);
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4">
      <form onSubmit={valider} className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-xl">
        <h2 className="text-[24px] font-black" style={HF}>Adresse validée</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-soft">Dernière étape : choisis ton mot de passe pour te reconnecter plus tard.</p>
        <input type="password" required minLength={8} autoFocus value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="new-password" className={cx(champ, "mt-4")} />
        {err && <p className="mt-2 text-[13.5px] text-[#9A3412]">{err}</p>}
        <button disabled={busy} className="mt-4 w-full rounded-xl bg-accent text-white py-3 font-bold disabled:opacity-60">{busy ? "Enregistrement…" : "Enregistrer"}</button>
      </form>
    </div>
  );
}

// Premier passage d'un visiteur sans compte : son espace Bingoo! est créé tout seul, en mode Explorer
export function EspaceInvite() {
  const { ws, create, reload } = useWs();
  const [err, setErr] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const id = ws?.id ?? (await create("", ""));
        await supabase.from("workspaces").update({ onboarded: true, profile: { ...(ws?.profile ?? {}), mode: "explorer", type: "saas", invite: true } }).eq("id", id);
        await reload();
        if (!/explorer/.test(window.location.hash + window.location.pathname)) window.location.hash = "#/explorer/trouver";
      } catch (x) { setErr(x.message || "Erreur"); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="min-h-screen grid place-items-center bg-paper text-ink-soft text-[15px]">{err ? <p>{err} <button onClick={() => window.location.reload()} className="underline">Réessayer</button></p> : "Bingoo! prépare ton espace…"}</div>;
}
