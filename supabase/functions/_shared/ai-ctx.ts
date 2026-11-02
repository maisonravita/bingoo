// Contexte de la requête en cours : à quel espace et à quelle fonction imputer chaque appel IA (suivi des coûts, budgets).
import { AsyncLocalStorage } from "node:async_hooks";

// essential : traitement des réponses de prospects, jamais bloqué par un budget
export type AiCtx = { ws?: string | null; feature?: string; essential?: boolean };
export const aiCtx = new AsyncLocalStorage<AiCtx>();

/** Précise l'espace (ou la fonction) pour la suite de la requête. Les boucles des tâches planifiées l'appellent à chaque espace. */
export function setAi(p: Partial<AiCtx>) {
  const s = aiCtx.getStore();
  if (s) Object.assign(s, p);
}
