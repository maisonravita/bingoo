import { Component } from "react";
import { supabase } from "../lib/supabase";

/** Filet de sécurité : une erreur d'affichage ne laisse jamais une page blanche, et elle est signalée (alerte quotidienne). */
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    try {
      supabase.from("client_errors").insert({ page: String(window.location.hash || window.location.pathname).slice(0, 300), message: String(error?.message ?? error).slice(0, 500), stack: String(info?.componentStack ?? error?.stack ?? "").slice(0, 4000) }).then(() => {}, () => {});
    } catch { /* signalement impossible : on affiche quand même l'écran de secours */ }
  }
  componentDidUpdate(prev) { if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="font-serif text-3xl">Oups, cette page a eu un souci.</p>
          <p className="text-ink-soft mt-3">L'erreur nous a été signalée automatiquement. Recharge la page ; si le problème revient, écris-nous via le bouton d'avis.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => window.location.reload()} className="rounded-full bg-ink text-white px-5 py-2.5 text-sm font-semibold">Recharger la page</button>
            <a href="#/" onClick={() => this.setState({ error: null })} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold">Retour à l'accueil</a>
          </div>
        </div>
      </div>
    );
  }
}
