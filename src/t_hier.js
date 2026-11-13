const { chromium } = require('playwright');
const D=process.argv[2];
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage({viewport:{width:1366,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/googleapis|gstatic/,r=>r.abort());
await pg.goto('file://'+D+'/katopsi_dokimi.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(600); await pg.evaluate(()=>{ const e=document.getElementById('erga'); if(e) e.hidden=true; });
const b=await pg.$('text=Ελεύθερη σχεδίαση'); if(b){ await b.click(); await pg.waitForTimeout(400);}
await pg.evaluate(()=>window.__api.setMode('house')); await pg.waitForTimeout(300);
const openAll=()=>pg.evaluate(()=>document.querySelectorAll('details.grp').forEach(d=>d.open=true));
const tot=()=>pg.evaluate(()=>document.body.innerText.match(/Καθαρό\s*([\d.]+)\s*m²\s*Μικτό\s*([\d.]+)/).slice(1).join(' / '));
const sc=async p=>pg.evaluate(p=>{ const r=document.getElementById('cv').getBoundingClientRect(); const q=window.__api.w2s(p); return [q[0]+r.left,q[1]+r.top]; },p);
const st=async l=>console.log('--',l,'|',await pg.textContent('#toast'),'|',await tot(),'| wm',await pg.evaluate(()=>{ const w=window.__S().floors[0].wm; return w?w.walls.map(x=>x.t).join(','):'όχι'; }));
await st('example');
// βρες ένα εσωτερικό κενό: ανάμεσα σε δύο χώρους — δοκίμασε σημεία στον κάνναβο
const pts=await pg.evaluate(()=>{ const S=window.__S(); const P=S.items.filter(i=>i.t==='rect'||i.t==='poly').map(o=>[o.x,o.y]); return P; });
console.log('shape anchors', JSON.stringify(pts).slice(0,200));
for(const x of [5.05,5.1,5.15]){ const w=await sc([x,1.0]); await pg.mouse.click(w[0],w[1]); await pg.waitForTimeout(300); const t=(await pg.textContent('#side')).replace(/\s+/g,' ').slice(0,60); console.log('click',x,t); if(t.includes('Εσωτερικός τοίχος')) break; await pg.keyboard.press('Escape'); await pg.evaluate(()=>window.__api.setMode('house')); }
await st('after convert');
await pg.fill('#wmT','0.40'); await pg.click('#wmTGo'); await pg.waitForTimeout(400); await st('int 0.40');
await pg.keyboard.press('Escape'); await pg.evaluate(()=>window.__api.setMode('house')); await openAll();
await pg.fill('#wInt','0.25'); await pg.click('#wmIntAll'); await pg.waitForTimeout(400); await st('all int 0.25');
await pg.screenshot({path:D+'/h1.png'});
console.log(errs); await br.close(); })();
