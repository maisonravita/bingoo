"""Précalcul des systèmes de design (UI UX Pro Max, licence MIT, vendor/ui-ux-pro-max).

Les fonctions de Bingoo! tournent sous Deno : pas de Python à la construction. On exécute donc le générateur
une fois ici, pour chacune des catégories de products.csv, et on garde 3 variantes par catégorie
(style, palette et polices tirés parmi les meilleurs candidats du générateur). Résultat :
supabase/functions/_shared/design-systemes.json, lu à la construction (tirage parmi les 3, sans IA).

Usage : python3 scripts/design/precalcul.py
"""
import csv, json, os, sys
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(RACINE, "vendor", "ui-ux-pro-max", "scripts")
sys.path.insert(0, SRC)
os.chdir(SRC)
import design_system as ds  # noqa: E402

gen = ds.DesignSystemGenerator()

def variantes(requete):
    pr = ds.search(requete, "product", 1).get("results", [])
    categorie = pr[0].get("Product Type", "General") if pr else "General"
    reasoning = gen._apply_reasoning(categorie, requete)
    prio = reasoning.get("style_priority", [])
    res = gen._multi_domain_search(requete, categorie, reasoning, prio)
    styles = gen._extract_results(res.get("style", {}))
    couleurs = gen._extract_results(res.get("color", {}))
    polices = gen._extract_results(res.get("typography", {}))
    landings = gen._extract_results(res.get("landing", {}))
    meilleur = gen._select_best_match(styles, prio)
    ordre_styles = [meilleur] + [s for s in styles if s is not meilleur]
    landing = next((l for l in landings if l.get("Pattern Name") == reasoning.get("pattern")), landings[0] if landings else {})
    out, vus = [], set()
    for k in range(6):
        if len(out) == 3:
            break
        st = ordre_styles[k % max(1, len(ordre_styles))] if ordre_styles else {}
        mode = reasoning.get("preferred_mode") or ds._resolve_color_mode(requete, st)
        compatibles = [c for c in couleurs if c] or [{}]
        # palettes dans l'ordre du générateur, celle du mode d'abord
        premiere = ds._select_palette_for_mode(compatibles, mode, categorie) if compatibles != [{}] else {}
        palettes = [premiere] + [c for c in compatibles if c is not premiere]
        pal = palettes[k % len(palettes)]
        typo = polices[k % len(polices)] if polices else {}
        cle = (st.get("Style Category"), pal.get("Primary"), typo.get("Heading Font"))
        if cle in vus:
            continue
        vus.add(cle)
        g = lambda d, c, defaut="": (d.get(c) or defaut).strip()
        # Le mode vient de la palette réellement retenue (un fond noir est sombre, quel que soit le style)
        fond = g(pal, "Background")
        mode = "dark" if fond and ds._relative_luminance(fond) is not None and ds._relative_luminance(fond) < 0.2 else "light"
        out.append({
            "style": g(st, "Style Category", "Minimalism"),
            "mots": g(st, "Keywords")[:160],
            "effets": g(st, "Effects & Animation")[:220],
            "mode": mode,
            "couleurs": {k2: g(pal, c2) for k2, c2 in [
                ("primary", "Primary"), ("on_primary", "On Primary"), ("secondary", "Secondary"), ("accent", "Accent"),
                ("on_accent", "On Accent"), ("background", "Background"), ("foreground", "Foreground"), ("card", "Card"),
                ("muted", "Muted"), ("muted_foreground", "Muted Foreground"), ("border", "Border"), ("ring", "Ring")]},
            "palette_note": g(pal, "Notes")[:120],
            "polices": {"titres": g(typo, "Heading Font", "Inter"), "texte": g(typo, "Body Font", "Inter"), "humeur": g(typo, "Mood/Style Keywords")[:120]},
        })
    for v in out:
        c = v["couleurs"]
        fonds = [c["background"], c.get("card") or c["background"], c.get("muted") or c["background"]]
        avant = c["primary"]
        c["primary"] = texte_sur(fonds, avant)
        if c["primary"] != avant:
            c["primary_origine"] = avant
        # Texte posé sur la couleur principale : blanc ou noir, celui qui contraste le plus (4,5:1 au moins)
        c["on_primary"] = "#FFFFFF" if _ratio("#FFFFFF", c["primary"]) >= _ratio("#000000", c["primary"]) else "#000000"
        c["ring"] = c["primary"]
    return {
        "categorie": categorie,
        "motif": {"nom": g(landing, "Pattern Name"), "sections": g(landing, "Section Order"), "cta": g(landing, "Primary CTA Placement")},
        "eviter": [a.strip() for a in ds._filter_anti_patterns_for_mode(reasoning.get("anti_patterns", ""), out[0]["mode"] if out else "light").split("+") if a.strip()][:6],
        "variantes": out,
    }

def g(d, c, defaut=""):
    return (d.get(c) or defaut).strip()

def _hex(c):
    c = c.lstrip("#"); return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))
def _vers_hex(t):
    return "#" + "".join(f"{max(0, min(255, round(x))):02X}" for x in t)
def _ratio(a, b):
    la, lb = ds._relative_luminance(a), ds._relative_luminance(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
def texte_sur(fonds, couleur, cible=4.5):
    """La couleur principale sert aussi de couleur de texte (liens, prix) sur le fond et les cartes : on l'assombrit
    (ou l'éclaircit en mode sombre) en gardant sa teinte, jusqu'à 4,5:1 sur chacun d'eux."""
    sombre = ds._relative_luminance(fonds[0]) < 0.2
    c = _hex(couleur)
    for _ in range(40):
        if all(_ratio(_vers_hex(c), f) >= cible for f in fonds if f):
            return _vers_hex(c)
        c = tuple(x + (255 - x) * 0.08 for x in c) if sombre else tuple(x * 0.92 for x in c)
    return _vers_hex(c)

produits = list(csv.DictReader(open(os.path.join(RACINE, "vendor", "ui-ux-pro-max", "data", "products.csv"), encoding="utf-8")))
resultat = {}
for p in produits:
    nom = p["Product Type"].strip()
    v = variantes(f'{nom} {p.get("Keywords", "")}')
    v["categorie"] = nom
    v["mots_cles"] = p.get("Keywords", "")[:200]
    resultat[nom] = v
dest = os.path.join(RACINE, "supabase", "functions", "_shared", "design-systemes.json")
json.dump(resultat, open(dest, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
n3 = sum(1 for v in resultat.values() if len(v["variantes"]) == 3)
print(f"{len(resultat)} catégories, {n3} avec 3 variantes, {os.path.getsize(dest) // 1024} Ko → {dest}")
