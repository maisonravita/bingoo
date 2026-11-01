import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fn } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Button, Card, Spinner } from "../components/ui";
import Logo from "../components/Logo";

export const JOIN_KEY = "kairo-join";

/** Rejoint l'espace d'une équipe à partir du lien d'invitation. */
export default function Join({ token }) {
  const { select, reload } = useWs();
  const nav = useNavigate();
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    fn("team-join", { token })
      .then(async (r) => {
        try { localStorage.removeItem(JOIN_KEY); } catch { /* stockage indisponible */ }
        select(r.workspace_id); await reload();
        if (alive) nav("/", { replace: true });
      })
      .catch((e) => { try { localStorage.removeItem(JOIN_KEY); } catch { /* stockage indisponible */ } if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [token]);
  return (
    <div className="min-h-full grid place-items-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <Logo className="block mx-auto mb-6" />
        {err ? (
          <>
            <p className="font-serif text-2xl">Invitation impossible</p>
            <p className="text-ink-soft mt-2 text-sm">{err}</p>
            <Button className="mt-6" onClick={() => nav("/", { replace: true })}>Continuer</Button>
          </>
        ) : (
          <><Spinner /><p className="text-ink-soft mt-3 text-sm">Tu rejoins l'équipe…</p></>
        )}
      </Card>
    </div>
  );
}
