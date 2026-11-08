# Fichier DGFiP des locaux des personnes morales : garde les SCI propriétaires de locaux en Île-de-France,
# regroupées par SIREN (nombre de locaux, communes, une adresse). Sortie : sci_idf.csv
import csv, io, sys, zipfile, collections, re
DEPTS = {"75","77","78","91","92","93","94","95"}
def norm(s): return re.sub(r"[^a-z0-9]", "", s.lower().replace("é","e").replace("è","e").replace("°",""))
agg = {}
def lire(z, chemin=""):
    for n in z.namelist():
        if n.lower().endswith(".zip"):
            lire(zipfile.ZipFile(io.BytesIO(z.read(n))), chemin + n + "/"); continue
        if not re.search(r"\.(csv|txt)$", n, re.I): continue
        raw = z.open(n)
        head = raw.read(4000); raw.close()
        enc = "utf-8"
        try: head.decode("utf-8")
        except UnicodeDecodeError: enc = "latin-1"
        txt = io.TextIOWrapper(z.open(n), encoding=enc, errors="replace", newline="")
        r = csv.reader(txt, delimiter=";")
        h = [norm(x) for x in next(r)]
        def col(*keys):
            for k in keys:
                for i, x in enumerate(h):
                    if k in x: return i
            return None
        c = dict(dep=col("departement"), com=col("nomdelacommune", "nomcommune"), cp=col("codecommune"), niv=col("niveau"), porte=col("porte"),
                 num=col("nvoirie","numerovoirie"), nat=col("naturevoie"), voie=col("nomvoie"), droit=col("codedroit"),
                 siren=col("siren"), fj=col("formejuridiqueabregee"), den=col("denomination"))
        print(chemin + n, enc, {k: v for k, v in c.items()}, file=sys.stderr)
        if c["siren"] is None or c["dep"] is None: continue
        c["com"] = col("nomcommune", "commune") if c["com"] is None else c["com"]
        c["fjc"] = col("formejuridique")
        g = lambda row, k: (row[c[k]].strip() if c[k] is not None and c[k] < len(row) else "")
        lus = gard = 0
        idf = re.search(r"_(75|77|78|91|92|93|94|95)0\.", n)
        if idf: print("  entête", h, file=sys.stderr)
        for row in r:
            lus += 1
            if idf and lus <= 1: print("  ex", row, file=sys.stderr)
            dep = g(row, "dep").zfill(2)[:2]
            if dep not in DEPTS: continue
            fj = g(row, "fj").upper()
            if not (fj.startswith("SCI") or g(row, "fjc") == "6540" or re.match(r"(SCI|SOCIETE CIVILE IMMOBILIERE)\b", g(row, "den").upper())): continue
            if c["droit"] is not None and not (g(row, "droit").startswith("P") or g(row, "droit") == ""): continue
            s = g(row, "siren")
            if not re.fullmatch(r"\d{9}", s): continue
            gard += 1
            a = agg.setdefault(s, dict(den=g(row, "den"), fj=fj, n=0, appart=0, communes=collections.Counter(), dep=dep, adresse=""))
            a["n"] += 1
            if g(row, "niv") not in ("", "00", "0"): a["appart"] += 1
            a["communes"][g(row, "com")] += 1
            if not a["adresse"]: a["adresse"] = " ".join(x for x in [g(row, "num").lstrip("0"), g(row, "nat"), g(row, "voie")] if x) + ", " + g(row, "com")
        print("  lignes", lus, "gardées", gard, file=sys.stderr)
lire(zipfile.ZipFile(sys.argv[1]))
with open("sci_idf.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["siren", "denomination", "forme", "dep", "nb_locaux", "nb_niveau_porte", "communes", "adresse"])
    for s, a in agg.items():
        w.writerow([s, a["den"], a["fj"], a["dep"], a["n"], a["appart"], " | ".join(f"{k} ({v})" for k, v in a["communes"].most_common(3)), a["adresse"]])
print("SCI IdF :", len(agg), file=sys.stderr)
