# Découpe un source JS en segments « texte » (contenu des chaînes et des parties fixes des gabarits `...`) et « code ».
def segments(src):
    out=[]; i=0; n=len(src); buf=''
    def flush_code():
        nonlocal buf
        if buf: out.append(('code',buf)); buf=''
    while i<n:
        c=src[i]
        if c=='/' and i+1<n and src[i+1]=='/':
            j=src.find('\n',i); j=n if j<0 else j; buf+=src[i:j]; i=j; continue
        if c=='/' and i+1<n and src[i+1]=='*':
            j=src.find('*/',i+2); j=n if j<0 else j+2; buf+=src[i:j]; i=j; continue
        if c in '"\'':
            flush_code(); j=i+1
            while j<n and src[j]!=c:
                if src[j]=='\\': j+=1
                if src[j]=='\n': break
                j+=1
            out.append(('quote',c)); out.append(('text',src[i+1:j])); out.append(('quote',c)); i=j+1; continue
        if c=='`':
            flush_code(); out.append(('quote','`')); i+=1; t=''
            while i<n and src[i]!='`':
                if src[i]=='\\': t+=src[i:i+2]; i+=2; continue
                if src[i]=='$' and i+1<n and src[i+1]=='{':
                    out.append(('text',t)); t=''; depth=1; j=i+2
                    # code imbriqué : on le traite récursivement
                    k=j
                    while k<n and depth:
                        if src[k]=='{': depth+=1
                        elif src[k]=='}': depth-=1
                        elif src[k] in '"\'`':
                            q=src[k]; k+=1
                            while k<n and src[k]!=q:
                                if src[k]=='\\': k+=1
                                k+=1
                        k+=1
                    inner=src[j:k-1]
                    out.append(('code','${')); out.extend(segments(inner)); out.append(('code','}')); i=k; continue
                t+=src[i]; i+=1
            out.append(('text',t)); out.append(('quote','`')); i+=1; continue
        buf+=c; i+=1
    flush_code(); return out
def join(segs): return ''.join(s for _,s in segs)
