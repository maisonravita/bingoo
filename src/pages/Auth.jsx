import { LegalLinks } from "./Legal";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Button, Field, Input } from "../components/ui";
import Logo from "../components/Logo";

export default function Auth({ invited = false }) {
  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.href.split("#")[0] } });
        if (error) throw error;
        if (!data.session) setMsg({ tone: "good", text: "Compte créé. Clique sur le lien reçu par e-mail pour le confirmer, puis connecte-toi." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message === "Invalid login credentials" ? "E-mail ou mot de passe incorrect" : error.message);
      }
    } catch (err) {
      setMsg({ tone: "bad", text: err.message });
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-full grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-ink text-white p-12">
        <Logo inverse height={32} />
        <div>
          <p className="font-serif text-6xl leading-[0.95] tracking-tight">Donne ton site.<br /><span className="italic text-accent">On te ramène des clients.</span></p>
          <ul className="mt-10 space-y-3 text-white/75 text-[15px] max-w-md">
            <li>— L'IA comprend ce que tu vends et à qui.</li>
            <li>— Elle trouve les entreprises dans le registre officiel, avec leurs coordonnées.</li>
            <li>— Elle écrit à chacune un message qui parle de son métier.</li>
            <li>— Tu valides d'un geste. Elle relance. Tu signes.</li>
          </ul>
        </div>
        <p className="text-white/40 text-sm">Pour toutes les entreprises et startups en France.</p>
      </div>
      <div className="flex flex-col justify-center px-6 py-12 sm:px-16">
        <div className="w-full max-w-sm mx-auto">
          <Logo className="lg:hidden mb-10" />
          <h1 className="font-serif text-4xl tracking-tight">{invited ? "Rejoins ton équipe" : mode === "signup" ? "Lance ta machine" : "Bon retour"}</h1>
          <p className="text-ink-soft mt-2">{invited ? "Crée ton compte (ou connecte-toi) pour rejoindre l'espace auquel tu as été invité." : mode === "signup" ? "Essai gratuit de 14 jours, sans carte bancaire." : "Connecte-toi à ton espace."}</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="E-mail professionnel"><Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Mot de passe" hint={mode === "signup" ? "8 caractères minimum" : undefined}>
              <Input type="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {msg && <p className={`text-sm rounded-xl px-3 py-2 ${msg.tone === "bad" ? "bg-bad-soft text-bad" : "bg-good-soft text-good"}`}>{msg.text}</p>}
            <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>{mode === "signup" ? "Créer mon compte" : "Se connecter"}</Button>
          </form>
          <button className="mt-6 text-sm text-ink-soft hover:text-ink" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMsg(null); }}>
            {mode === "signup" ? "J'ai déjà un compte" : "Créer un compte"}
          </button>
          <LegalLinks className="mt-8 justify-center" />
        </div>
      </div>
    </div>
  );
}
