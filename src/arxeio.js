// ---------- Αρχείο κάτοψης (Google Drive, tablet, υπολογιστής) — μόνο στο αντίγραφο δοκιμής ----------
// «Σώσε την κάτοψη»: ένα αρχείο <όνομα>.katopsi.json με όλη την κάτοψη (και το τοπογραφικό).
//   tablet/κινητό: παράθυρο κοινοποίησης → «Αποθήκευση στο Drive» · υπολογιστής: διαλέγεις φάκελο (π.χ. Google Drive) και μετά σώζεται μόνο του εκεί.
// «Άνοιξε κάτοψη από αρχείο»: διαλέγεις το αρχείο (και από το Drive) και ο Οδηγός πάει κατευθείαν στην αποτύπωση (λίστα χώρων).
const KAT={h:null,t:null,name:''};
function katName(){ return (S.name||'katopsi').replace(/[\\/:*?"<>|]+/g,'_').trim()+'.katopsi.json'; }
function katText(){ return JSON.stringify({app:'katopsi',v:1,saved:new Date().toISOString(),plan:S}); }
const katMobile=()=>/Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);
async function katSave(){ const name=katName(), txt=katText(), blob=new Blob([txt],{type:'application/json'});
  try{
    if(katMobile()&&navigator.canShare){ const file=new File([blob],name,{type:'application/json'}); if(navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:name}); toast('Διάλεξε «Drive» για να σωθεί εκεί.'); return; } }
    if(window.showSaveFilePicker){ const h=await window.showSaveFilePicker({suggestedName:name,types:[{description:'Κάτοψη',accept:{'application/json':['.json']}}]});
      const w=await h.createWritable(); await w.write(blob); await w.close(); KAT.h=h; KAT.name=h.name; renderSide(); toast('Σώθηκε: '+h.name+'. Από τώρα σώζεται μόνο του εκεί.'); return; }
  }catch(e){ if(e&&e.name==='AbortError') return; }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500);
  toast('Κατέβηκε το «'+name+'». Ανέβασέ το στο Drive.'); }
// αυτόματο σώσιμο στο ίδιο αρχείο (όταν το διάλεξες στον υπολογιστή)
function katAuto(){ if(!KAT.h) return; clearTimeout(KAT.t); KAT.t=setTimeout(async()=>{ try{ const w=await KAT.h.createWritable(); await w.write(new Blob([katText()],{type:'application/json'})); await w.close(); }catch(e){ KAT.h=null; toast('Δεν σώθηκε στο αρχείο. Πάτα ξανά «Σώσε την κάτοψη».'); } },1500); }
function katOpen(){ let inp=$('katIn'); if(!inp){ inp=document.createElement('input'); inp.type='file'; inp.id='katIn'; inp.accept='.json,application/json,text/plain'; inp.style.display='none'; document.body.appendChild(inp);
    inp.onchange=()=>{ const f=inp.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>katLoad(String(rd.result),f.name); rd.onerror=()=>toast('Δεν διαβάστηκε το αρχείο'); rd.readAsText(f); }; }
  inp.value=''; inp.click(); }
function katLoad(txt,file){ let j=null; try{ j=JSON.parse(txt); }catch(e){}
  const o=j? migrate(j.plan||j) : null; if(!o) return toast('Το «'+file+'» δεν είναι αρχείο κάτοψης.');
  snap(); S=o; KAT.h=null; cur=S.rooms[0].id; sel=null; selRoom=null; selWall=null; consEdit=null; splitting=null; fixRefs(); compute(); save(); render(); fit();
  const nR=S.rooms.length;
  // η αποτύπωση ξεκινά: ο Οδηγός στη λίστα χώρων του ορόφου
  if(typeof wzResume==='function'){ WZ.hist=[]; WZ.step='rooms'; wzResume(); } else { mode='house'; markMode(); renderSide(); }
  toast('Άνοιξε η κάτοψη «'+S.name+'» ('+nR+(nR===1?' χώρος':' χώροι')+'). Πάτα έναν χώρο για να τον μετρήσεις.'); }
function katUI(){ return `<div class="actions"><button class="btn primary" id="katSave">Σώσε την κάτοψη (Drive)</button><button class="btn" id="katOpen">Άνοιξε κάτοψη από αρχείο</button></div>
  <p style="font-size:13px;color:var(--ink-2)">${KAT.h?'Σώζεται μόνο του στο «'+esc(KAT.name)+'».':'Στο tablet διάλεξε «Drive» στο παράθυρο που ανοίγει. Στο άνοιγμα, το Drive φαίνεται στη λίστα αρχείων.'}</p>`; }
function katBind(){ if($('katSave')) $('katSave').onclick=katSave; if($('katOpen')) $('katOpen').onclick=katOpen; }
{ const s0=save; save=function(){ s0(); katAuto(); }; }

// ---------- Αρχική οθόνη «Έργα» ----------
// Κάθε έργο = μία κάτοψη. Λίστα στο localStorage (katErga), οι κατόψεις στο IndexedDB (χωράνε και μεγάλα τοπογραφικά).
const ERGA={cur:null,t:null};
function ergaIdx(){ try{ return JSON.parse(localStorage.getItem('katErga'))||[]; }catch(e){ return []; } }
function ergaIdxSet(a){ try{ localStorage.setItem('katErga',JSON.stringify(a)); }catch(e){} }
function ergaDB(){ return new Promise((ok,no)=>{ const rq=indexedDB.open('katopsiErga',1); rq.onupgradeneeded=()=>rq.result.createObjectStore('plans'); rq.onsuccess=()=>ok(rq.result); rq.onerror=()=>no(rq.error); }); }
async function ergaPut(id,txt){ const db=await ergaDB(); return new Promise((ok,no)=>{ const tx=db.transaction('plans','readwrite'); tx.objectStore('plans').put(txt,id); tx.oncomplete=()=>ok(); tx.onerror=()=>no(tx.error); }); }
async function ergaGet(id){ const db=await ergaDB(); return new Promise((ok,no)=>{ const rq=db.transaction('plans').objectStore('plans').get(id); rq.onsuccess=()=>ok(rq.result); rq.onerror=()=>no(rq.error); }); }
async function ergaDel(id){ const db=await ergaDB(); return new Promise(ok=>{ const tx=db.transaction('plans','readwrite'); tx.objectStore('plans').delete(id); tx.oncomplete=()=>ok(); tx.onerror=()=>ok(); }); }
function ergaMeta(){ let rooms=0, area=0; for(const f of S.floors){ const d=floorData(f); rooms+=new Set(d.items.filter(isShape).map(i=>i.room)).size; } try{ area=HOUSE.footArea||0; }catch(e){}
  return {name:S.name||'Κάτοψη',updated:Date.now(),floors:S.floors.length,rooms,area:r4(area),topo:S.topo?S.topo.file:''}; }
// κάθε σώσιμο γράφει και στο έργο που είναι ανοιχτό
function ergaAuto(){ if(!ERGA.cur) return; clearTimeout(ERGA.t); ERGA.t=setTimeout(()=>{ const id=ERGA.cur; ergaPut(id,JSON.stringify(S)).catch(()=>{});
  const a=ergaIdx(), k=a.findIndex(x=>x.id===id); const m=Object.assign({id},ergaMeta()); if(k>=0) a[k]=Object.assign(a[k],m); else a.unshift(m); ergaIdxSet(a); },600); }
{ const s1=save; save=function(){ s1(); ergaAuto(); }; }
function ergaNewId(){ return 'e'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function ergaUse(o,id){ snap(); S=o; undoS.length=0; redoS=[]; updUndo(); KAT.h=null; ERGA.cur=id; try{ localStorage.setItem('katCur',id); }catch(e){}
  cur=S.rooms[0].id; sel=null; selRoom=null; selWall=null; consEdit=null; splitting=null; fixRefs(); compute(); save(); render(); fit(); }
async function ergaOpen(id){ let txt=null; try{ txt=await ergaGet(id); }catch(e){} const o=txt? migrate(JSON.parse(txt)) : null; if(!o) return toast('Δεν βρέθηκε η κάτοψη του έργου');
  ergaUse(o,id); ergaHide(); if(typeof wzResume==='function'){ WZ.hist=[]; WZ.step=S.items.some(isShape)?'rooms':'start'; wzResume(); } else renderSide();
  toast('Έργο «'+S.name+'»'); }
function ergaNew(){ const name=($('ergaNm')&&$('ergaNm').value.trim())||'Νέο έργο'; const o=migrate({name,next:1,ext:S.ext,int:S.int,extC:S.extC,cons:S.cons,tol:S.tol,topo:null,rooms:[{id:1,name:'Χώρος 1'}],items:[]});
  const id=ergaNewId(); ergaUse(o,id); $('planName').value=S.name; ergaAuto(); ergaHide(); if(typeof wzResume==='function'){ WZ.hist=[]; WZ.step='start'; WZ.room=1; wzResume(); } else renderSide(); }
// άνοιγμα αρχείου (και από το Drive) → νέο έργο
function ergaFromFile(){ ERGA.fromFile=true; katOpen(); }
{ const kl=katLoad; katLoad=function(txt,file){ let j=null; try{ j=JSON.parse(txt); }catch(e){} const o=j? migrate(j.plan||j) : null;
    if(!PYCASE){ ERGA.fromFile=false; if(!o) return toast('Το «'+file+'» δεν είναι αρχείο κάτοψης.'); const id=ergaNewId(); ergaUse(o,id); ergaAuto(); ergaHide();
      if(typeof wzResume==='function'){ WZ.hist=[]; WZ.step='rooms'; wzResume(); } else renderSide();
      return toast('Άνοιξε το έργο «'+S.name+'» ('+S.rooms.length+(S.rooms.length===1?' χώρος':' χώροι')+'). Πάτα έναν χώρο για να τον μετρήσεις.'); }
    return kl(txt,file); }; }
function ergaHide(){ const el=$('erga'); if(el) el.hidden=true; document.body.classList.remove('erga-on'); }
function ergaShow(){ if(ERGA.cur) { clearTimeout(ERGA.t); ergaPut(ERGA.cur,JSON.stringify(S)).catch(()=>{}); const a=ergaIdx(), k=a.findIndex(x=>x.id===ERGA.cur); if(k>=0){ a[k]=Object.assign(a[k],ergaMeta()); ergaIdxSet(a); } }
  let el=$('erga'); if(!el){ el=document.createElement('div'); el.id='erga'; document.body.appendChild(el);
    const css=document.createElement('style'); css.textContent=`#erga{position:fixed;inset:0;z-index:200;background:var(--paper);overflow:auto;padding:24px 16px}
#erga .in{max-width:760px;margin:0 auto}
#erga h1{font-size:26px;margin:4px 0 2px}
#erga .sub{color:var(--ink-2);margin:0 0 18px}
#erga .new{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
#erga .new input{flex:1;min-width:180px;min-height:44px;font-size:16px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:var(--sheet);color:var(--ink)}
#erga .list{display:grid;gap:10px}
#erga .pj{display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:10px;background:var(--sheet);padding:12px 14px}
#erga .pj button.go{flex:1;text-align:left;background:none;border:0;padding:0;color:var(--ink);cursor:pointer;min-height:44px}
#erga .pj b{display:block;font-size:17px}
#erga .pj span{font-size:13px;color:var(--ink-2);font-family:var(--mono)}
#erga .pj.on{border-color:var(--accent)}
#erga .empty{color:var(--ink-2);padding:20px;border:1px dashed var(--line);border-radius:10px;text-align:center}`; document.head.appendChild(css); }
  const a=ergaIdx().sort((p,q)=>q.updated-p.updated), d=t=>new Date(t).toLocaleString('el-GR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  el.innerHTML=`<div class="in"><div class="eyebrow">Κάτοψη · Pythagoras</div><h1>Έργα</h1><p class="sub">Διάλεξε έργο για να συνεχίσεις την αποτύπωση, ή ξεκίνα καινούργιο.</p>
  <div class="new"><input id="ergaNm" placeholder="Όνομα νέου έργου, π.χ. Οικία Παπαδόπουλου" autocomplete="off"><button class="btn primary" id="ergaNew">+ Νέο έργο</button><button class="btn" id="ergaFile">Άνοιξε από αρχείο (Drive)</button></div>
  <div class="list">${a.length? a.map(p=>`<div class="pj ${p.id===ERGA.cur?'on':''}"><button class="go" data-eo="${p.id}"><b>${esc(p.name)}</b><span>${d(p.updated)} · ${p.floors||1} ${p.floors>1?'όροφοι':'όροφος'} · ${p.rooms||0} ${p.rooms===1?'χώρος':'χώροι'}${p.area?' · '+fmt(p.area)+' m²':''}${p.topo?' · '+esc(p.topo):''}</span></button><button class="btn danger" data-ed="${p.id}" style="min-height:40px">Σβήσε</button></div>`).join('')
    : '<div class="empty">Δεν υπάρχει ακόμα έργο. Γράψε όνομα και πάτα «+ Νέο έργο», ή άνοιξε ένα αρχείο κάτοψης από το Drive.</div>'}</div>
  ${ERGA.cur?'<div class="actions" style="margin-top:18px"><button class="btn" id="ergaBack">← Πίσω στο ανοιχτό έργο</button></div>':''}</div>`;
  el.hidden=false; document.body.classList.add('erga-on');
  $('ergaNew').onclick=ergaNew; $('ergaNm').addEventListener('keydown',e=>{ if(e.key==='Enter') ergaNew(); }); $('ergaFile').onclick=ergaFromFile; if($('ergaBack')) $('ergaBack').onclick=ergaHide;
  el.querySelectorAll('[data-eo]').forEach(b=>b.onclick=()=>ergaOpen(b.dataset.eo));
  el.querySelectorAll('[data-ed]').forEach(b=>{ const id=b.dataset.ed; armConfirm2(b,async()=>{ await ergaDel(id); ergaIdxSet(ergaIdx().filter(x=>x.id!==id)); if(ERGA.cur===id){ ERGA.cur=null; try{ localStorage.removeItem('katCur'); }catch(e){} } ergaShow(); }); }); }
function armConfirm2(b,fn){ let armed=false,t; b.onclick=()=>{ if(armed){ clearTimeout(t); fn(); return; } armed=true; const old=b.textContent; b.textContent='Σίγουρα;'; t=setTimeout(()=>{ armed=false; b.textContent=old; },3000); }; }
function ergaInit(){ if(PYCASE) return;
  let a=ergaIdx(); try{ ERGA.cur=localStorage.getItem('katCur')||null; }catch(e){}
  if(ERGA.cur&&!a.some(x=>x.id===ERGA.cur)) ERGA.cur=null;
  // πρώτη φορά: η κάτοψη που υπάρχει ήδη γίνεται το πρώτο έργο
  if(!a.length&&S.items.some(isShape)&&S.name!=='Παράδειγμα κατοικίας'){ const id=ergaNewId(); ERGA.cur=id; try{ localStorage.setItem('katCur',id); }catch(e){} ergaAuto(); clearTimeout(ERGA.t); ergaPut(id,JSON.stringify(S)).catch(()=>{}); a=[Object.assign({id},ergaMeta())]; ergaIdxSet(a); }
  const hd=document.querySelector('header'); if(hd&&!$('bErga')){ const b=document.createElement('button'); b.id='bErga'; b.className='btn'; b.textContent='Έργα'; b.title='Αρχική οθόνη με τα έργα'; hd.insertBefore(b,hd.children[1]||null); b.onclick=ergaShow; }
  ergaShow(); }
setTimeout(ergaInit,0);
