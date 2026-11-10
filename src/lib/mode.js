// Mode Explorer : les formules de veille (Starter, Pro, Business) et les espaces créés par la nouvelle inscription.
// L'application s'y résume à Explorer ; les écrans de prospection restent pour les anciens espaces.
export const VEILLE = ["explorer", "explorer_pro", "business"];
export const modeExplorer = (ws) => !!ws && (VEILLE.includes(ws.plan) || ws.profile?.mode === "explorer");
