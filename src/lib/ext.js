// Extension Chrome Bingoo! : identifiants autorisés à recevoir un accès, et page du Chrome Web Store.
// Ajouter ici l'identifiant attribué par le Chrome Web Store dès la première publication.
export const EXT_IDS = ["flmpgnmgiohdoogpcdcnpknlgdndfdoh", "jifppeppkaecacmobfgbeapadmmpcnll"];
export const STORE_URL = ""; // ex. https://chromewebstore.google.com/detail/bingoo/<id>

/** Demande à l'extension si elle est installée et reliée. null = pas installée (ou pas Chrome). */
export function pingExtension(id) {
  return new Promise((resolve) => {
    const rt = window.chrome?.runtime;
    if (!rt?.sendMessage || !EXT_IDS.includes(id)) return resolve(null);
    const t = setTimeout(() => resolve(null), 1500);
    try { rt.sendMessage(id, { type: "bingoo-ping" }, (r) => { clearTimeout(t); resolve(rt.lastError ? null : r ?? null); }); }
    catch { clearTimeout(t); resolve(null); }
  });
}
export function sendKey(id, key) {
  return new Promise((resolve) => {
    const rt = window.chrome?.runtime;
    if (!rt?.sendMessage || !EXT_IDS.includes(id)) return resolve(false);
    rt.sendMessage(id, { type: "bingoo-key", key }, (r) => resolve(!rt.lastError && !!r?.ok));
  });
}
