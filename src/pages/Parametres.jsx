import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { useToast } from "../components/ui";
import { LANGUES, langueActuelle, choisirLangue } from "../lib/langue";
import { Bouton, Carte, Tete } from "./MonSaas";

const CHAMP = "w-full rounded-lg border border-[#8A8A8A]/50 bg-white px-3 py-2 text-[13.5px] outline-none focus:border-[#303030] focus:ring-2 focus:ring-[#303030]/10";

// Paramètres du compte : ton profil, ta connexion, ta langue. Les réglages de ton SaaS sont dans « Réglages du SaaS ».
export default function Parametres() {
  const { ws, session } = useWs();
  const toast = useToast();
  const [nom, setNom] = useState(ws.profile?.nom ?? ws.name ?? "");
  const [mdp, setMdp] = useState("");
  const [occupe, setOccupe] = useState("");
  useEffect(() => setNom(ws.profile?.nom ?? ws.name ?? ""), [ws.id]);

  const enregistrerNom = async () => {
    if (!nom.trim()) return;
    setOccupe("nom");
    const { error } = await supabase.from("workspaces").update({ name: nom.trim(), profile: { ...(ws.profile ?? {}), nom: nom.trim() } }).eq("id", ws.id);
    setOccupe("");
    if (error) return toast("Enregistrement impossible, réessaie dans un instant.", "bad");
    toast("C'est enregistré.", "good");
    window.dispatchEvent(new Event("kairo:refresh"));
  };
  const changerMdp = async () => {
    if (mdp.length < 8) return toast("Ton mot de passe doit faire au moins 8 caractères.", "bad");
    setOccupe("mdp");
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setOccupe("");
    if (error) return toast("Changement impossible : " + error.message, "bad");
    setMdp(""); toast("Ton mot de passe est changé.", "good");
  };

  return (
    <div className="mx-auto max-w-[760px] px-4 py-6 sm:px-6">
      <Tete titre="Paramètres" sous="Ton compte Bingoo!. Les réglages de ton SaaS (nom, couleurs, paiement, domaine) sont dans Réglages du SaaS." />
      <div className="flex flex-col gap-4">
        <Carte titre="Ton espace" sous="Le nom affiché en haut de Bingoo!.">
          <div className="flex gap-2"><input className={CHAMP} value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80} /><Bouton principal disabled={occupe === "nom"} onClick={enregistrerNom}>Enregistrer</Bouton></div>
        </Carte>
        <Carte titre="Connexion" sous={<>Tu te connectes avec <b className="text-[#303030]">{session?.user?.email}</b>.</>}>
          <label className="block text-[13px] font-medium text-[#303030]">Nouveau mot de passe</label>
          <div className="mt-1 flex gap-2"><input type="password" autoComplete="new-password" className={CHAMP} value={mdp} onChange={(e) => setMdp(e.target.value)} placeholder="8 caractères minimum" /><Bouton disabled={occupe === "mdp" || !mdp} onClick={changerMdp}>Changer</Bouton></div>
        </Carte>
        <Carte titre="Langue">
          <select aria-label="Langue du site" value={langueActuelle()} onChange={(e) => choisirLangue(e.target.value)} className={CHAMP}>{LANGUES.map(([code, n]) => <option key={code} value={code}>{n}</option>)}</select>
        </Carte>
        <Carte titre="Raccourcis">
          <div className="flex flex-wrap gap-2">
            <Link to="/explorer/reglages-saas"><Bouton>Réglages du SaaS</Bouton></Link>
            <Link to="/abonnement"><Bouton>Abonnement et crédits</Bouton></Link>
            <Link to="/aide"><Bouton>Aide</Bouton></Link>
          </div>
        </Carte>
        <div><Bouton onClick={() => supabase.auth.signOut()}>Se déconnecter</Bouton></div>
      </div>
    </div>
  );
}
