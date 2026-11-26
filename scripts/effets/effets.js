// Effets des sites construits par Bingoo! (26/11) : un seul fichier chargé par la page publique, jamais écrit par l'IA.
// Bibliothèques (licences dans vendor/effets/) : Lenis (MIT, darkroom.engineering) pour le défilement doux,
// anime.js (MIT, Julian Garnier) pour les mots qui montent et les compteurs, OGL (Unlicense) pour l'ondulation des grandes photos.
// Tout est coupé si l'appareil demande moins d'animations ; sans WebGL, la photo reste simplement affichée.
import Lenis from "lenis";
import { animate, stagger } from "animejs";
import { Renderer, Program, Mesh, Triangle, Texture } from "ogl";

const calme = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------- Défilement doux
let lenis = null;
function defilement() {
  if (lenis || calme()) return;
  lenis = new Lenis({ autoRaf: true, lerp: 0.11, smoothWheel: true, anchors: true });
}

// ---------------------------------------------------------------- Mots qui montent (titres des sections signatures)
function decouper(h) {
  if (h.dataset.mots) return [...h.querySelectorAll(".bg-mot > span")];
  h.dataset.mots = "1";
  const marche = (n) => {
    for (const k of [...n.childNodes]) {
      if (k.nodeType === 3) {
        const f = document.createDocumentFragment();
        k.textContent.split(/(\s+)/).forEach((m) => {
          if (!m) return;
          if (/^\s+$/.test(m)) { f.appendChild(document.createTextNode(m)); return; }
          const o = document.createElement("span"); o.className = "bg-mot"; o.style.cssText = "display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.08em;margin-bottom:-.08em";
          const i = document.createElement("span"); i.style.cssText = "display:inline-block;will-change:transform"; i.textContent = m; o.appendChild(i); f.appendChild(o);
        });
        k.replaceWith(f);
      } else if (k.nodeType === 1 && !/^(BR|SVG|IMG)$/.test(k.tagName)) marche(k);
    }
  };
  marche(h);
  return [...h.querySelectorAll(".bg-mot > span")];
}
function motsQuiMontent(racine) {
  const titres = [...racine.querySelectorAll(".s-manifeste h2, .s-recit h2, .s-liste__tete h2, .s-duo h2, .s-etapes h2")];
  if (!titres.length) return;
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    animate(decouper(e.target), { translateY: ["105%", "0%"], duration: 900, delay: stagger(45), ease: "outExpo" });
  }), { threshold: 0.25 });
  titres.forEach((h) => { decouper(h).forEach((m) => { m.style.transform = "translateY(105%)"; }); io.observe(h); });
}

// ---------------------------------------------------------------- Compteurs (valeurs chiffrées des maquettes)
function compteurs(racine) {
  const els = [...racine.querySelectorAll(".widget__valeur, .ecran__kpi strong")].filter((el) => /^\s*\d[\d\s.,]*/.test(el.firstChild?.textContent ?? ""));
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    const n = e.target.firstChild, brut = n.textContent, m = brut.match(/\d[\d\s.,]*/); if (!m) return;
    const chiffres = m[0].replace(/\s/g, ""), dec = (chiffres.split(/[.,]/)[1] ?? "").length, sep = chiffres.includes(",") ? "," : ".";
    const cible = parseFloat(chiffres.replace(",", ".")); if (!isFinite(cible) || cible > 1e7) return;
    const o = { v: 0 };
    animate(o, { v: cible, duration: 1400, ease: "outQuart", onUpdate: () => { const t = o.v.toFixed(dec).replace(".", sep).replace(/\B(?=(\d{3})+(?!\d))/g, m[0].includes(" ") ? " " : ""); n.textContent = brut.replace(m[0], t + (m[0].endsWith(" ") ? " " : "")); }, onComplete: () => { n.textContent = brut; } });
  }), { threshold: 0.4 });
  els.forEach((el) => io.observe(el));
}

// ---------------------------------------------------------------- Ondulation des grandes photos (WebGL, ordinateur seulement)
const VERT = `attribute vec2 uv; attribute vec2 position; varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 0., 1.); }`;
const FRAG = `precision highp float; uniform sampler2D tMap; uniform float uTemps; uniform vec2 uSouris; uniform float uForce; uniform vec2 uEchelle; varying vec2 vUv;
void main(){
  vec2 uv = (vUv - .5) * uEchelle + .5;
  float d = distance(vUv, uSouris);
  float onde = sin(d * 28. - uTemps * 2.2) * .0045 * uForce * smoothstep(.45, 0., d);
  float houle = sin(uv.y * 6. + uTemps * .35) * .0016;
  uv += normalize(vUv - uSouris + 1e-4) * onde + vec2(houle, 0.);
  gl_FragColor = texture2D(tMap, uv);
}`;
function ondes(img) {
  if (img.dataset.ondes) return; img.dataset.ondes = "1";
  const parent = img.parentElement; if (!parent) return;
  let renderer; try { renderer = new Renderer({ dpr: Math.min(devicePixelRatio, 2), alpha: false }); } catch { return; }
  const gl = renderer.gl; if (!gl) return;
  const c = gl.canvas; c.setAttribute("aria-hidden", "true");
  c.style.cssText = getComputedStyle(img).position === "absolute" ? "position:absolute;inset:0;width:100%;height:100%;z-index:" + (getComputedStyle(img).zIndex === "auto" ? "0" : getComputedStyle(img).zIndex) + ";pointer-events:none;opacity:0;transition:opacity .8s" : "display:block;width:100%;height:100%;opacity:0;transition:opacity .8s";
  const tex = new Texture(gl, { generateMipmaps: false });
  const program = new Program(gl, { vertex: VERT, fragment: FRAG, uniforms: { tMap: { value: tex }, uTemps: { value: 0 }, uSouris: { value: [0.5, 0.5] }, uForce: { value: 0 }, uEchelle: { value: [1, 1] } } });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
  const source = new Image(); source.crossOrigin = "anonymous";
  const taille = () => {
    const r = parent.getBoundingClientRect(); renderer.setSize(r.width, r.height);
    if (!source.naturalWidth) return;
    const ri = source.naturalWidth / source.naturalHeight, rc = r.width / Math.max(1, r.height);
    program.uniforms.uEchelle.value = ri > rc ? [rc / ri, 1] : [1, ri / rc];
  };
  let cible = [0.5, 0.5], force = 0, vivant = true, visible = true;
  source.onload = () => { tex.image = source; taille(); c.style.opacity = "1"; img.style.visibility = "hidden"; };
  source.onerror = () => { vivant = false; c.remove(); };
  source.src = img.currentSrc || img.src;
  img.insertAdjacentElement("afterend", c);
  addEventListener("resize", taille);
  parent.addEventListener("pointermove", (e) => { const r = parent.getBoundingClientRect(); cible = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]; force = 1; });
  parent.addEventListener("pointerleave", () => { force = 0; });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(parent);
  const t0 = performance.now();
  const boucle = (t) => {
    if (!vivant) return; requestAnimationFrame(boucle); if (!visible || !tex.image) return;
    const u = program.uniforms; u.uTemps.value = (t - t0) / 1000;
    u.uSouris.value = [u.uSouris.value[0] + (cible[0] - u.uSouris.value[0]) * 0.08, u.uSouris.value[1] + (cible[1] - u.uSouris.value[1]) * 0.08];
    u.uForce.value += (force - u.uForce.value) * 0.05;
    renderer.render({ scene: mesh });
  };
  requestAnimationFrame(boucle);
}

// ---------------------------------------------------------------- Entrée
export function init(racine = document) {
  if (calme()) return;
  defilement();
  motsQuiMontent(racine);
  compteurs(racine);
  // L'ondulation : grandes photos plein cadre (cinéma, récit), seulement à la souris (pas sur téléphone, pas pour la photo détourée)
  if (matchMedia("(pointer: fine)").matches) racine.querySelectorAll(".hero-cine__fond, .s-recit > img").forEach(ondes);
}
if (typeof window !== "undefined") window.BingooEffets = { init };
