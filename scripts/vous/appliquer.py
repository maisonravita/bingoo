# Passe au vouvoiement les textes des SaaS déjà livrés (écrans écrits par l'IA, titres et sous-titres des écrans).
# Lancé par le workflow « Vouvoiement des SaaS livrés » (clé de l'API Supabase en secret). Chaque écran converti est
# vérifié (syntaxe JavaScript) avant d'être enregistré ; en cas de doute, l'écran n'est pas touché.
import json, os, subprocess, sys, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from conv import texte, convertir
from segments import segments, join
REF = "fbsjbnnmzazylmquzryo"; TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
def q(sql):
    r = urllib.request.Request(f"https://api.supabase.com/v1/projects/{REF}/database/query", data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": f"Bearer {TOK}", "Content-Type": "application/json", "User-Agent": "bingoo-ci"})
    return json.loads(urllib.request.urlopen(r, timeout=120).read())
def syntaxe_ok(code):
    p = subprocess.run(["node", "-e", "new Function(require('fs').readFileSync(0,'utf8'))"], input=code, text=True, capture_output=True)
    return p.returncode == 0
lit = lambda s: "$v$" + s + "$v$"
apps = q("select id, slug from saas_apps where statut in ('pret','en_cours') order by slug")
total = 0
for a in apps:
    ecrans = q(f"select jsonb_agg(e) e from saas_apps, jsonb_array_elements(spec->'ecrans') e where id = '{a['id']}'")[0]["e"] or []
    nouveaux, change = [], 0
    for e in ecrans:
        e2 = dict(e)
        for k in ("titre", "but"):
            if isinstance(e.get(k), str): e2[k] = texte(e[k])
        if isinstance(e.get("fonctions"), list): e2["fonctions"] = [texte(x) if isinstance(x, str) else x for x in e["fonctions"]]
        code = e.get("code")
        if isinstance(code, str) and code.strip() and join(segments(code)) == code:
            c2 = convertir(code)
            if c2 != code:
                if syntaxe_ok(c2): e2["code"] = c2
                else: print(f"  {a['slug']}/{e.get('id')} : conversion refusée (syntaxe)")
        if e2 != e: change += 1
        nouveaux.append(e2)
    if change:
        js = json.dumps(nouveaux, ensure_ascii=False)
        assert "$v$" not in js
        q(f"update saas_apps set spec = jsonb_set(spec, '{{ecrans}}', {lit(js)}::jsonb), version = version + 1 where id = '{a['id']}'")
        total += change
    print(f"{a['slug']} : {change} écran(s) mis au vouvoiement")
print("Total :", total)
