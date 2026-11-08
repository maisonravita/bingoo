# Charge sci_idf.csv dans public.dgfip_sci par l'API de gestion Supabase (paquets de 1500 lignes).
import csv, json, os, sys, urllib.request
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]; REF = "fbsjbnnmzazylmquzryo"
def q(sql):
    req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{REF}/database/query", data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": f"Bearer {TOK}", "Content-Type": "application/json", "User-Agent": "bingoo-ci"})
    return urllib.request.urlopen(req, timeout=120).read().decode()
lit = lambda v: "'" + str(v).replace("'", "''") + "'"
rows = list(csv.DictReader(open("sci_idf.csv", encoding="utf-8")))
for i in range(0, len(rows), 1500):
    vals = ",".join(f"({lit(r['siren'])},{lit(r['denomination'])},{lit(r['forme'])},{lit(r['dep'])},{int(r['nb_locaux'])},{int(r['nb_niveau_porte'])},{lit(r['communes'])},{lit(r['adresse'])})" for r in rows[i:i+1500])
    q(f"insert into public.dgfip_sci (siren, denomination, forme, dep, nb_locaux, nb_etage, communes, adresse) values {vals} on conflict (siren) do update set denomination=excluded.denomination, nb_locaux=excluded.nb_locaux, nb_etage=excluded.nb_etage, communes=excluded.communes, adresse=excluded.adresse, maj=now()")
    print("chargé", min(i + 1500, len(rows)), "/", len(rows), flush=True)
print(q("select count(*) from public.dgfip_sci"))
