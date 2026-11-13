const { chromium } = require('playwright');
const D=process.argv[2];
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage({viewport:{width:1366,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/googleapis|gstatic/,r=>r.abort());
await pg.goto('file://'+D+'/katopsi_dokimi.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(600); await pg.evaluate(()=>{ const e=document.getElementById('erga'); if(e) e.hidden=true; });
const b=await pg.$('text=Ελεύθερη σχεδίαση'); if(b){ await b.click(); await pg.waitForTimeout(400);}
await pg.evaluate(()=>window.__wm.wmEnsure());
const A=()=>pg.evaluate(()=>window.__S().rooms.map(r=>r.name.slice(0,6)+' '+window.__wm.OL(r.id).area.toFixed(2)).join(' | ')+' || '+JSON.stringify(window.__wm.walls().map(w=>[w.id,w.a,w.b,w.t,w.fa,w.fb])));
const tot=()=>pg.evaluate(()=>document.body.innerText.match(/Μικτό\s*([\d.]+)/)[1]);
console.log('start', await A(), await tot());
// γραμμή κατά μήκος (δεν κόβει)
console.log('along', await pg.evaluate(()=>window.__wm.split([[5.1,1],[5.1,1.5]])));
// κάθετη γραμμή στον τοίχο 1 (x=5.1) στο y=2
console.log('split', await pg.evaluate(()=>window.__wm.split([[4.8,2],[5.0,2.02],[5.4,2]])), await pg.textContent('#toast'));
console.log('after', await A(), await tot());
const ids=await pg.evaluate(()=>window.__wm.walls().map(w=>w.id)); const nid=ids[ids.length-1];
console.log('setT', await pg.evaluate(id=>window.__wm.setT(id,0.35),nid));
console.log('thick', await A(), await tot());
await pg.evaluate(()=>window.__api.setMode('house')); await pg.waitForTimeout(300); await pg.screenshot({path:D+'/split.png'});
console.log(errs); await br.close(); })();
