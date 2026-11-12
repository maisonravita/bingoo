// Traduction du site dans toutes les langues, sans coût : le traducteur gratuit de Google, chargé seulement
// quand quelqu'un choisit une autre langue que le français. Le choix est retenu (cookie googtrans).
export const LANGUES = [["fr", "Français"], ["en", "English"], ["es", "Español"], ["de", "Deutsch"], ["it", "Italiano"], ["pt", "Português"], ["nl", "Nederlands"], ["pl", "Polski"], ["tr", "Türkçe"], ["ar", "العربية"], ["ru", "Русский"], ["uk", "Українська"], ["hi", "हिन्दी"], ["zh-CN", "中文"], ["ja", "日本語"], ["ko", "한국어"], ["id", "Bahasa Indonesia"], ["vi", "Tiếng Việt"], ["ro", "Română"], ["sv", "Svenska"]];

export const langueActuelle = () => { try { return decodeURIComponent(document.cookie).match(/googtrans=\/fr\/([^;]+)/)?.[1] ?? "fr"; } catch { return "fr"; } };

// React et le traducteur modifient tous les deux le texte de la page : sans ce garde-fou, React plante
// quand il retire un nœud que le traducteur a remplacé (problème connu).
function proteger() {
  if (window.__bingooTrad) return; window.__bingooTrad = true;
  const retirer = Node.prototype.removeChild;
  Node.prototype.removeChild = function (enfant) { if (enfant.parentNode !== this) return enfant; return retirer.call(this, enfant); };
  const inserer = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (n, ref) { if (ref && ref.parentNode !== this) return inserer.call(this, n, null); return inserer.call(this, n, ref); };
}

export function chargerTraducteur() {
  if (langueActuelle() === "fr" || document.getElementById("gt-script")) return;
  proteger();
  const div = document.createElement("div"); div.id = "google_translate_element"; div.style.display = "none"; document.body.appendChild(div);
  window.googleTranslateElementInit = () => { /* global google */ new window.google.translate.TranslateElement({ pageLanguage: "fr", autoDisplay: false }, "google_translate_element"); };
  const s = document.createElement("script"); s.id = "gt-script"; s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"; document.body.appendChild(s);
}

export function choisirLangue(code) {
  const hote = window.location.hostname;
  const expire = code === "fr" ? "expires=Thu, 01 Jan 1970 00:00:00 GMT;" : "";
  for (const dom of ["", `domain=${hote};`, `domain=.${hote.split(".").slice(-2).join(".")};`]) document.cookie = `googtrans=${code === "fr" ? "" : `/fr/${code}`};path=/;${dom}${expire}`;
  window.location.reload();
}
