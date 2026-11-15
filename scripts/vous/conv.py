import re,sys
from segments import segments, join
# Formes à remplacer (ordre : expressions longues d'abord). Respecte la majuscule initiale.
EXPR=[
 (r"\btu n'as\b","vous n'avez"),(r"\btu n'es\b","vous n'êtes"),(r"\btu as\b","vous avez"),(r"\btu es\b","vous êtes"),
 (r"\btu peux\b","vous pouvez"),(r"\btu veux\b","vous voulez"),(r"\btu vois\b","vous voyez"),(r"\btu dois\b","vous devez"),
 (r"\btu retrouveras\b","vous retrouverez"),(r"\btu recevras\b","vous recevrez"),(r"\btu pourras\b","vous pourrez"),(r"\btu auras\b","vous aurez"),
 (r"\btu sais\b","vous savez"),(r"\btu fais\b","vous faites"),(r"\btu choisis\b","vous choisissez"),(r"\btu ajoutes\b","vous ajoutez"),
 (r"\btu crées\b","vous créez"),(r"\btu envoies\b","vous envoyez"),(r"\btu reçois\b","vous recevez"),(r"\btu indiques\b","vous indiquez"),
 (r"\btu remplis\b","vous remplissez"),(r"\btu gardes\b","vous gardez"),(r"\btu suis\b","vous suivez"),(r"\btu prends\b","vous prenez"),
 (r"\btu tapes\b","vous tapez"),(r"\btu cliques\b","vous cliquez"),(r"\btu changes\b","vous changez"),(r"\btu en\b","vous en"),
 (r"\bque tu\b","que vous"),(r"\bsi tu\b","si vous"),(r"\bquand tu\b","quand vous"),(r"\btu\b","vous"),
 (r"\bt'a\b","vous a"),(r"\bt'ont\b","vous ont"),(r"\bt'attend\b","vous attend"),(r"\bt'attendent\b","vous attendent"),(r"\bt'([aeéiouyh])","vous \\1"),
 (r"-toi\b","-vous"),(r"\btoi\b","vous"),(r"\bte\b","vous"),
 (r"\bton\b","votre"),(r"\bta\b","votre"),(r"\btes\b","vos"),
]
VERBES={"rejoins":"rejoignez","gère":"gérez","saisis":"saisissez","ajoute":"ajoutez","choisis":"choisissez","crée":"créez","copie":"copiez","indique":"indiquez","colle":"collez","garde":"gardez",
 "partage":"partagez","glisse":"glissez","clique":"cliquez","tape":"tapez","essaie":"essayez","vérifie":"vérifiez","remplace":"remplacez",
 "branche":"branchez","invite":"invitez","exporte":"exportez","importe":"importez","note":"notez","renseigne":"renseignez","remplis":"remplissez",
 "complète":"complétez","modifie":"modifiez","supprime":"supprimez","envoie":"envoyez","reprends":"reprenez","fais":"faites","mets":"mettez",
 "rends":"rendez","prends":"prenez","laisse":"laissez","regarde":"regardez","ouvre":"ouvrez","trouve":"trouvez","imprime":"imprimez",
 "télécharge":"téléchargez","enregistre":"enregistrez","relance":"relancez","encaisse":"encaissez","réserve":"réservez","sélectionne":"sélectionnez",
 "demande":"demandez","reçois":"recevez","suis":"suivez","découvre":"découvrez","lance":"lancez","écris":"écrivez","définis":"définissez",
 "fixe":"fixez","donne":"donnez","passe":"passez","utilise":"utilisez","personnalise":"personnalisez","connecte":"connectez","reconnecte":"reconnectez",
 "génère":"générez","transforme":"transformez","marque":"marquez","pense":"pensez","attends":"attendez","réessaie":"réessayez","recommence":"recommencez","valide":"validez","coche":"cochez","retrouve":"retrouvez","rédige":"rédigez","précise":"précisez","ajuste":"ajustez","décris":"décrivez","explique":"expliquez","sauvegarde":"sauvegardez","programme":"programmez","planifie":"planifiez","accepte":"acceptez","refuse":"refusez","annule":"annulez","confirme":"confirmez","déplace":"déplacez","dépose":"déposez","appelle":"appelez","contacte":"contactez","partage-le":"partagez-le"}
# Verbe à l'impératif : en début de phrase / après « : », « puis », « et », ou suivi d'un complément typique
NOMS_AMBIGUS={"demande","note","relance","programme","marque","passe","réserve","copie","garde","colle","reste","invite","valide","lance","coche"}
def cap(src,dst): return dst[0].upper()+dst[1:] if src[0].isupper() else dst
def texte(t):
    if not re.search(r"[a-zà-ü]",t): return t
    # Une valeur interne (clé, statut, nom de champ) : un seul mot en minuscules, ou un identifiant -> jamais touchée
    if re.fullmatch(r"[a-z0-9_à-ü\-]+", t.strip()) : return t
    t=t.replace("\\n","\x01\n")
    for a,b in EXPR:
        t=re.sub(a,lambda m:cap(m.group(0),m.expand(b)),t,flags=re.I)
    def v(m):
        w=m.group(2); lw=w.lower()
        if lw not in VERBES: return m.group(0)
        suite=t[m.end():]
        if re.match(r"\s*\)|\s+[a-zà-ü]+(é|ée|és|ées)\b",suite): return m.group(0)
        if lw in NOMS_AMBIGUS and not m.group(1).strip() and not re.match(r"\s+(un|une|le|la|les|des|votre|vos|ce|cette|ces|l'|d'|au|à|en|ici|tout|son|sa|ses|-)",t[m.end():]):
            return m.group(0)
        return m.group(1)+cap(w,VERBES[lw])
    t=re.sub(r"((?:^|[.!?»«\"(—–>]\s*|\x01\n|\bpuis\s+)|^)([A-Za-zÀ-ü]+)(?=\b)",v,t)
    # Accord après « vous » : vous aimes -> vous aimez, vous vends -> vous vendez, veux-vous -> voulez-vous
    IRR={"seras":"serez","auras":"aurez","pourras":"pourrez","paies":"payez","essaies":"essayez","envoies":"envoyez","vends":"vendez","veux":"voulez","peux":"pouvez","fais":"faites","dis":"dites","prends":"prenez","mets":"mettez","écris":"écrivez","choisis":"choisissez","remplis":"remplissez","saisis":"saisissez","reçois":"recevez","sais":"savez","dois":"devez","vois":"voyez","vis":"vivez","attends":"attendez","réponds":"répondez","perds":"perdez","as":"avez","es":"êtes"}
    def acc(m):
        w=m.group(2)
        if w in IRR: return m.group(1)+IRR[w]
        if w in ("êtes","faites","dites","vous","votre","vos"): return m.group(0)
        if w.endswith("es") and len(w)>3: return m.group(1)+w[:-2]+"ez"
        return m.group(0)
    t=re.sub(r"(\b[Vv]ous (?:vous |ne |n'|en |y |les |le |la |l')?)([a-zà-ü]+)\b",acc,t)
    t=re.sub(r"\bveux-vous\b","voulez-vous",t); t=re.sub(r"\bpeux-vous\b","pouvez-vous",t)
    t=t.replace("\x01\n","\\n")
    return t
def convertir(src):
    out=[]
    for k,s in segments(src):
        out.append((k, texte(s) if k=='text' else s))
    return join(out)
if __name__=='__main__':
    import difflib
    for p in [x for x in sys.argv[1:] if not x.startswith('--')]:
        a=open(p).read(); b=convertir(a)
        if '--ecrire' in sys.argv: open(p,'w').write(b)
