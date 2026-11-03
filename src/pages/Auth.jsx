import { LegalLinks, legalReady } from "./Legal";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Logo from "../components/Logo";
import { cx } from "../lib/utils";

// Écran de connexion / inscription classique : carte centrée, onglets, e-mail + mot de passe, mot de passe oublié.
const field = "w-full rounded-xl border border-line bg-white px-3.5 py-3 text-[15px] outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15";

function Eye({ off }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12" /><circle cx="12" cy="12" r="3" />{off && <path d="M3 3l18 18" />}
    </svg>
  );
}

function Password({ value, onChange, autoComplete, id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? "text" : "password"} required minLength={8} autoComplete={autoComplete} value={value} onChange={onChange} className={cx(field, "pr-12")} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-faint hover:text-ink">
        <Eye off={show} />
      </button>
    </div>
  );
}

export default function Auth({ invited = false }) {
  const [mode, setMode] = useState(() => (/mode=login/.test(window.location.hash + window.location.search) ? "login" : "signup"));
  const [email, setEmail] = useState(() => { try { const v = sessionStorage.getItem("bingoo-email") ?? ""; sessionStorage.removeItem("bingoo-email"); return v; } catch { return ""; } });
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => { setMsg(null); }, [mode]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.href.split("#")[0] });
        if (error) throw error;
        setMsg({ tone: "good", text: "Si un compte existe avec cette adresse, tu vas recevoir un e-mail pour choisir un nouveau mot de passe." });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.href.split("#")[0] } });
        if (error) throw error;
        if (!data.session) setMsg({ tone: "good", text: "Compte créé. Clique sur le lien reçu par e-mail pour le confirmer, puis connecte-toi." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error(error.message === "Invalid login credentials" ? "E-mail ou mot de passe incorrect." : error.message === "Email not confirmed" ? "Confirme d'abord ton adresse : clique sur le lien reçu par e-mail." : error.message);
      }
    } catch (err) {
      setMsg({ tone: "bad", text: /already registered/i.test(err.message) ? "Un compte existe déjà avec cette adresse : connecte-toi." : err.message });
    } finally { setBusy(false); }
  };

  const title = invited ? "Rejoins ton équipe" : mode === "signup" ? "Crée ton compte" : mode === "reset" ? "Mot de passe oublié" : "Connecte-toi";
  const sub = invited ? "Crée ton compte ou connecte-toi pour rejoindre l'espace auquel tu as été invité."
    : mode === "signup" ? "14 jours gratuits, sans carte bancaire." : mode === "reset" ? "Indique ton e-mail : on t'envoie un lien pour en choisir un nouveau." : "Content de te revoir.";

  return (
    <div className="min-h-full flex flex-col" style={{ background: "radial-gradient(ellipse at 50% 0%, #FFF1E6 0%, #FAF9F6 60%)" }}>
      <header className="px-5 sm:px-8 py-5 flex items-center justify-between">
        <a href="#/accueil" aria-label="Accueil Bingoo!"><Logo height={30} /></a>
        <a href="#/accueil" className="text-[14px] font-semibold text-ink-soft hover:text-ink">← Retour au site</a>
      </header>

      <main className="flex-1 grid place-items-center px-4 py-8">
        <div className="w-full max-w-[420px]">
          <div className="rounded-3xl bg-white border border-line shadow-[0_24px_60px_-34px_rgba(21,22,26,.35)] p-6 sm:p-8">
            {mode !== "reset" && (
              <div className="grid grid-cols-2 rounded-full bg-paper border border-line p-1 mb-7" role="tablist">
                {[["login", "Se connecter"], ["signup", "Créer un compte"]].map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
                    className={cx("rounded-full py-2 text-[14px] font-semibold transition", mode === k ? "bg-white shadow-sm text-ink" : "text-ink-soft hover:text-ink")}>{l}</button>
                ))}
              </div>
            )}
            <h1 className="text-[26px] font-bold tracking-tight">{title}</h1>
            <p className="text-ink-soft mt-1.5 text-[15px]">{sub}</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block">
                <span className="block text-[13px] font-semibold mb-1.5">E-mail professionnel</span>
                <input type="email" required autoComplete="email" placeholder="prenom@entreprise.fr" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
              </label>
              {mode !== "reset" && (
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <label htmlFor="pwd" className="text-[13px] font-semibold">Mot de passe</label>
                    {mode === "login" && <button type="button" onClick={() => setMode("reset")} className="text-[13px] font-semibold text-accent-dark hover:underline">Mot de passe oublié ?</button>}
                  </div>
                  <Password id="pwd" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                  {mode === "signup" && <p className="text-xs text-ink-soft mt-1.5">8 caractères minimum.</p>}
                </div>
              )}
              {msg && <p className={cx("text-sm rounded-xl px-3.5 py-2.5", msg.tone === "bad" ? "bg-bad-soft text-bad" : "bg-good-soft text-good")}>{msg.text}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-full bg-accent text-white py-3.5 text-[15.5px] font-bold hover:bg-accent-dark active:scale-[0.98] transition disabled:opacity-60">
                {busy ? "Un instant…" : mode === "signup" ? "Créer mon compte" : mode === "reset" ? "Recevoir le lien" : "Se connecter"}
              </button>
              {mode === "signup" && legalReady && (
                <p className="text-[12.5px] text-ink-faint text-center">En créant un compte, tu acceptes les <a href="#/conditions" className="underline hover:text-ink">conditions d'utilisation</a> et la <a href="#/confidentialite" className="underline hover:text-ink">politique de confidentialité</a>.</p>
              )}
            </form>

            <p className="mt-6 text-center text-[14px] text-ink-soft">
              {mode === "signup" ? <>Déjà un compte ? <button type="button" onClick={() => setMode("login")} className="font-semibold text-ink hover:underline">Se connecter</button></>
                : mode === "reset" ? <button type="button" onClick={() => setMode("login")} className="font-semibold text-ink hover:underline">← Retour à la connexion</button>
                : <>Pas encore de compte ? <button type="button" onClick={() => setMode("signup")} className="font-semibold text-ink hover:underline">Créer un compte</button></>}
            </p>
          </div>
          <LegalLinks className="mt-6 justify-center" />
        </div>
      </main>
    </div>
  );
}

/** Choix d'un nouveau mot de passe après le lien « mot de passe oublié ». */
export function PasswordRecovery({ onDone }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setMsg(error.message); else onDone();
  };
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-ink/40 px-4">
      <form onSubmit={submit} className="w-full max-w-[400px] rounded-3xl bg-white p-6 sm:p-8 shadow-xl space-y-4">
        <Logo height={28} />
        <h1 className="text-[24px] font-bold">Nouveau mot de passe</h1>
        <p className="text-ink-soft text-[15px]">Choisis ton nouveau mot de passe (8 caractères minimum).</p>
        <Password id="newpwd" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        {msg && <p className="text-sm rounded-xl px-3.5 py-2.5 bg-bad-soft text-bad">{msg}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-full bg-accent text-white py-3.5 font-bold hover:bg-accent-dark disabled:opacity-60">{busy ? "Un instant…" : "Enregistrer"}</button>
      </form>
    </div>
  );
}
