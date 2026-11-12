# Χτίζει katopsi.html (Spiti) και katopsi_dokimi.html από τα src. Χρήση: python3 build.py <φάκελος src> <φάκελος εξόδου> <polygon-clipping.umd.min.js>
import json,re,sys,os
src,out,libp=sys.argv[1],sys.argv[2],sys.argv[3]
lib=re.sub(r'//# sourceMappingURL=.*','',open(libp,encoding='utf-8').read())
tpl=open(os.path.join(src,'tpl.dxf'),encoding='utf-8').read().replace('\r\n','\n')
html=open(os.path.join(src,'head.html'),encoding='utf-8').read()+open(os.path.join(src,'body.html'),encoding='utf-8').read()
html+='<script>/* polygon-clipping 0.15.7, MIT, Mike Fogel */\n'+lib+'</script>\n'
html+='<script>window.DXF_TPL='+json.dumps(tpl)+';</script>\n'
html+='<script>\n'+open(os.path.join(src,'app.js'),encoding='utf-8').read()+'</script>\n'
open(os.path.join(out,'katopsi.html'),'w',encoding='utf-8').write(html)
# ο Οδηγός (wiz.js) μπαίνει ΜΟΝΟ στο αντίγραφο δοκιμής, πριν από το «start» του app.js
app=open(os.path.join(src,'app.js'),encoding='utf-8').read()
# το ίδιο και το ktirio.js (δέντρο κτιρίου, περιγράμματα ορόφου/κτιρίου, αποστάσεις αντικειμένων)
M='// ---------- start ----------'
extra=''.join(open(os.path.join(src,f),encoding='utf-8').read()+'\n' for f in ('wiz.js','ktirio.js') if os.path.exists(os.path.join(src,f)))
if extra:
    html=html.replace(app,app.replace(M,extra+M,1),1)
d=html.replace('<title>Spiti</title>','<title>Κάτοψη δοκιμή</title>',1)
d=d.replace('Κάτοψη <small>Pythagoras · δοκιμή</small>','Κάτοψη <small>ΑΝΤΙΓΡΑΦΟ ΔΟΚΙΜΗΣ</small>',1)
open(os.path.join(out,'katopsi_dokimi.html'),'w',encoding='utf-8').write(d)
print(len(html))
