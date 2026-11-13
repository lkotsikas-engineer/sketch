const { chromium } = require('playwright');
const D=process.argv[2];
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage({viewport:{width:1366,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/googleapis|gstatic/,r=>r.abort());
await pg.goto('file://'+D+'/katopsi_dokimi.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(600); await pg.evaluate(()=>{ const e=document.getElementById('erga'); if(e) e.hidden=true; });
const b=await pg.$('text=Ελεύθερη σχεδίαση'); if(b){ await b.click(); await pg.waitForTimeout(400);}
await pg.evaluate(()=>window.__wm.wmEnsure());
const A=()=>pg.evaluate(()=>window.__S().rooms.map(r=>r.name.slice(0,6)+(window.__wm.wmLocked(r)?'🔒':'')+' '+window.__wm.OL(r.id).area.toFixed(2)).join(' | '));
console.log('start', await A());
// κλείδωσε τον 2ο με το κουμπί στο πάνελ χώρου
const id2=await pg.evaluate(()=>window.__S().rooms[1].id);
await pg.evaluate(id=>{ const btn=document.createElement('button'); btn.dataset.lock=id; document.body.appendChild(btn); btn.click(); btn.remove(); },id2); await pg.waitForTimeout(200);
console.log('locked', await A(), '|', await pg.textContent('#toast'));
await pg.evaluate(()=>window.__wm.move(1,0.2)); await pg.waitForTimeout(200);
console.log('move wall1', await A()); await pg.waitForTimeout(100); console.log('toast', await pg.textContent('#toast'));
await pg.evaluate(()=>window.__wm.move(3,0.2)); await pg.waitForTimeout(200);
console.log('move wall3', await A(), '|', await pg.textContent('#toast'));
await pg.evaluate(()=>window.__api.setMode('house')); await pg.waitForTimeout(300); await pg.screenshot({path:D+'/lock.png'});
console.log(errs); await br.close(); })();
