// Compteurs du jour des actions IA (mêmes limites que le serveur, multipliées selon la formule).
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export const QUOTA_BASE = {
  analyse: 6, recherche: 60, enquete: 40, enquete_plus: 30, redaction: 80, linkedin: 30, analyse_prospect: 40, brief: 20, script: 40,
  veille: 20, reponse: 60, social: 6, lettre: 40, contacts: 60, intelligence: 6, mission: 20, radar_scan: 4, espion: 20, reco: 30,
};
export const QUOTA_LABEL = {
  analyse: "analyses de site", recherche: "recherches d'entreprises", enquete: "recherches de contact", enquete_plus: "enquêtes approfondies",
  redaction: "rédactions d'e-mails", linkedin: "recherches LinkedIn", analyse_prospect: "analyses de prospect", brief: "fiches de rendez-vous",
  script: "scripts d'appel", veille: "analyses de concurrents", reponse: "analyses de réponse", social: "audits de réseaux", lettre: "lettres",
  contacts: "recherches de décideurs", intelligence: "analyses Intelligence", mission: "plans de mission", radar_scan: "scans Radar",
  espion: "mesures Espion", reco: "recommandations",
};
export const PLAN_FACTOR = { essai: 0.5, solo: 1, pro: 2, equipe: 4, fondateur: 1 };
export const quotaMax = (kind, plan) => Math.max(1, Math.round((QUOTA_BASE[kind] ?? 0) * (PLAN_FACTOR[plan ?? "essai"] ?? 1)));

// Action appelée → compteur consommé
export const QUOTA_OF = {
  analyze: "analyse", search: "recherche", enrich: "enquete", prepare: "enquete", step: "enquete", draft: "redaction", redraft: "redaction",
  linkedin: "linkedin", "reply-paste": "reponse", brief: "brief", "meeting-followup": "brief", insight: "analyse_prospect", "call-script": "script",
  "competitor-check": "veille", "competitor-ads": "veille", "competitor-suggest": "veille", "enrich-deep": "enquete_plus", letter: "lettre",
  "social-audit": "social", intelligence: "intelligence", "knowledge-draft": "intelligence", "mission-plan": "mission", "mission-create": "mission",
  "contacts-find": "contacts", "contacts-import": "contacts", "radar-scan": "radar_scan", "spy-social": "espion", "spy-needs": "espion", "growth-reco": "reco",
};

let state = { ws: null, counts: null, at: 0 };
const subs = new Set();
let loading = null;

async function load(ws) {
  if (loading) return loading;
  loading = (async () => {
    const since = new Date(); since.setUTCHours(0, 0, 0, 0);
    const { data } = await supabase.from("activity").select("kind").eq("workspace_id", ws.id).gte("created_at", since.toISOString()).limit(5000);
    const counts = {};
    for (const r of data ?? []) counts[r.kind] = (counts[r.kind] ?? 0) + 1;
    state = { ws: ws.id, plan: ws.plan, counts, at: Date.now() };
    subs.forEach((f) => f(state));
  })().finally(() => { loading = null; });
  return loading;
}

/** À appeler après chaque action IA réussie : les compteurs affichés se mettent à jour. */
export function refreshQuotas() { state = { ...state, at: 0 }; subs.forEach((f) => f(state)); }

/** { left, max } pour un type d'action, ou null tant que ce n'est pas chargé. */
export function useQuota(ws, kind) {
  const [s, setS] = useState(state);
  useEffect(() => { subs.add(setS); return () => subs.delete(setS); }, []);
  useEffect(() => {
    if (!ws?.id || !kind) return;
    if (s.ws !== ws.id || Date.now() - s.at > 20000) load(ws);
  }, [ws?.id, kind, s.at, s.ws]);
  if (!kind || !ws || s.ws !== ws.id || !s.counts) return null;
  const max = quotaMax(kind, ws.plan);
  return { left: Math.max(0, max - (s.counts[kind] ?? 0)), max, label: QUOTA_LABEL[kind] ?? "actions" };
}
