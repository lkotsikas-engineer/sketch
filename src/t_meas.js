const { chromium } = require('playwright');
const D=process.argv[2];
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage({viewport:{width:1366,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/googleapis|gstatic/,r=>r.abort());
await pg.goto('file://'+D+'/katopsi_dokimi.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(600); await pg.evaluate(()=>{ const e=document.getElementById('erga'); if(e) e.hidden=true; });
const b=await pg.$('text=Ελεύθερη σχεδίαση'); if(b){ await b.click(); await pg.waitForTimeout(400);}
console.log('ensure', await pg.evaluate(()=>window.__wm.wmEnsure()));
const info=()=>pg.evaluate(()=>window.__S().rooms.map(r=>r.id+':'+r.name+(r.wz?'*':'')+' '+window.__wm.wmSides(r.id).map(s=>s.L.toFixed(3)).join(',')+' A='+window.__wm.OL(r.id).area.toFixed(3)).join('\n')+'\nwalls '+JSON.stringify(window.__wm.walls().map(w=>[w.id,w.t])));
const tot=()=>pg.evaluate(()=>document.body.innerText.match(/Μικτό\s*([\d.]+)/)[1]);
console.log(await info(), '| μικτό', await tot());
const R=await pg.evaluate(()=>window.__S().rooms.map(r=>r.id));
// μέτρησε κάθε πλευρά του πρώτου χώρου +8 εκ.
for(let i=0;i<4;i++){ const r=await pg.evaluate(([id,i])=>{ const s=window.__wm.wmSides(id)[i]; return [s.L, window.__wm.wmMeasure(id,i,s.L+0.08)]; },[R[0],i]); console.log('A side',i,JSON.stringify(r)); }
console.log(await info(), '| μικτό', await tot());
console.log('checks', JSON.stringify(await pg.evaluate(id=>window.__wm.wmChecks(id).map(c=>[c.lbl,c.meas,+c.calc.toFixed(3),c.lvl]),R[0])));
// κλείδωσε τον πρώτο, μέτρα τον δεύτερο
await pg.evaluate(id=>{ window.__S().rooms.find(r=>r.id===id).wz=1; },R[0]);
for(let i=0;i<4;i++){ const r=await pg.evaluate(([id,i])=>{ const s=window.__wm.wmSides(id)[i]; return [s.L, window.__wm.wmMeasure(id,i,s.L-0.03)]; },[R[1],i]); console.log('B side',i,JSON.stringify(r)); }
console.log(await info(), '| μικτό', await tot());
// wizard UI
await pg.evaluate(id=>window.__wm.wzGo('wsides',id),R[2]); await pg.waitForTimeout(300);
console.log('ui', (await pg.textContent('#side')).replace(/\s+/g,' ').slice(0,300));
await pg.fill('#wzM','3'); await pg.press('#wzM','Enter'); await pg.waitForTimeout(300);
console.log('toast', await pg.textContent('#toast'));
console.log('ui2', (await pg.textContent('#side')).replace(/\s+/g,' ').slice(0,200));
await pg.screenshot({path:D+'/meas.png'});
console.log(errs); await br.close(); })();
