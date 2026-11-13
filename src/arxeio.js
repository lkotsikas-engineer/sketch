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
