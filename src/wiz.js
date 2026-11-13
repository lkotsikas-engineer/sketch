// ---------- Οδηγός: η αποτύπωση σε απλές καρτέλες, μία δουλειά ανά καρτέλα ----------
// Μπαίνει μέσα στο app.js (build.py) πριν από το «start». Ζωγραφίζει στο ίδιο πλάι (side) με τα άλλα πάνελ.
// «Ελεύθερη σχεδίαση» = η πλήρης οθόνη της Κάτοψης· «Οδηγός →» γυρίζει εκεί που ήσουν.
const WZKEY = STORE + '.wz';
let WZ = (()=>{ try{ const o=JSON.parse(localStorage.getItem(WZKEY)); if(o&&o.step) return Object.assign({on:true,free:false,hist:[]},o); }catch(e){} return {on:true,free:false,step:'start',hist:[]}; })();
let wzLayout = null;
function wzSave(){ try{ localStorage.setItem(WZKEY, JSON.stringify({on:WZ.on,free:WZ.free,step:WZ.step,hist:WZ.hist.slice(-40),room:WZ.room,side:WZ.side})); }catch(e){} }
const wzActive = () => WZ.on && !WZ.free;
const wzPhase = {A:'Έργο', B:'Χώρος', C:'Οικία', D:'Παράδοση'};
const wzShapes = id => roomItems(id).filter(isShape);
const wzPen = id => wzShapes(id).find(i=>i.src&&i.src.k==='pen'&&!i.sub) || null;
function wzRoomState(id){ const sh=wzShapes(id); if(!sh.length) return 'empty'; const room=roomById(id); if(room&&room.wz) return 'done';
  const p=wzPen(id); if(p){ const g=penSolve(p.src.sides); if(g.unk>2||g.kind.includes('x')) return 'sketch'; } return 'shape'; }
const WZ_ST = {empty:'○ χωρίς σχήμα', sketch:'✎ σκίτσο, θέλει μήκη', shape:'◐ έχει σχήμα', done:'✓ έτοιμος'};

function wzGo(step, opt){ if(WZ.step&&WZ.step!==step&&!(opt&&opt.noHist)) WZ.hist.push(WZ.step); WZ.step=step; WZ.side=0; wzSave(); wzEnter(); renderSide(); }
function wzBack(){ const p=WZ.hist.pop(); if(!p) return; WZ.step=p; wzSave(); wzEnter(); renderSide(); }
function wzFree(msg){ WZ.free=true; wzSave(); wzLayoutSet(null); tool=null; markTool(); renderSide(); render(); wzHeader(); if(msg) toast(msg); }
function wzResume(){ WZ.free=false; WZ.on=true; tool=null; sel=null; splitting=null; selWall=null; consEdit=null; penEdit=null; markTool(); wzSave(); wzHeader(); wzEnter(); renderSide(); }

// διάταξη: 'full' = μόνο η καρτέλα, 'draw' = κάτοψη + καρτέλα στο πλάι
function wzLayoutSet(l){ const b=document.body; b.classList.toggle('wz', !!l); b.classList.toggle('wzfull', l==='full');
  if(l!==wzLayout){ const was=wzLayout; wzLayout=l; if(l!=='full') requestAnimationFrame(()=>{ render(); if(was==='full'||was===null) fit(mode==='room'?cur:undefined); }); } }
function wzMode(m){ if(mode!==m){ mode=m; sel=null; selWall=null; consEdit=null; splitting=null; if(m==='house') { tool=null; markTool(); } markMode(); render(); } }
// τι χρειάζεται κάθε βήμα όταν μπαίνεις
function wzEnter(){ const st=WZ_STEPS[WZ.step]; if(!st) return;
  if(st.room && WZ.room!=null && roomById(WZ.room)) cur=WZ.room;
  if(st.mode) wzMode(st.mode);
  tool=st.tool||null; if(st.tool==='pen'){ penOpt.op=st.penOp||'new'; showOthers=true; } markTool();
  if(st.enter) st.enter(); }

function wzHeader(){ let b=$('bWiz'); if(!b){ b=document.createElement('button'); b.id='bWiz'; b.className='btn'; const hd=document.querySelector('header'); hd.insertBefore(b, $('bUndo')); b.onclick=()=>{ if(wzActive()) wzFree('Ελεύθερη σχεδίαση. Πάτα «Οδηγός →» για να συνεχίσεις από εκεί που ήσουν.'); else wzResume(); }; }
  b.textContent = wzActive()? 'Ελεύθερη σχεδίαση' : 'Οδηγός →'; b.classList.toggle('primary', !wzActive()); }

// ---- κέλυφος καρτέλας ----
function wzCard(st, body, foot){
  const room=roomById(cur), ph=st.phase;
  const crumb=[esc(S.name), esc(FL().name)].concat(st.room&&room?['<b>'+esc(room.name)+'</b>']:[]).join(' › ');
  const dots=Object.keys(wzPhase).map(k=>`<span class="wz-ph ${k===ph?'on':''}">${k==='C'?'Γ':k==='D'?'Δ':k} ${wzPhase[k]}</span>`).join('');
  return `<div class="wz"><div class="wz-top"><div class="wz-dots">${dots}</div><div class="wz-crumb">${crumb}</div></div>
  <div class="wz-body">${st.n?`<div class="eyebrow">Καρτέλα ${st.n}</div>`:''}<h2 class="wz-h">${st.title()}</h2>${body}</div>
  <div class="wz-foot">${WZ.hist.length?'<button class="btn" id="wzBack">← Πίσω</button>':'<span></span>'}${foot||''}</div></div>`; }
function wzRender(){ const st=WZ_STEPS[WZ.step]||WZ_STEPS.start; if(!WZ_STEPS[WZ.step]) WZ.step='start';
  if(st.room && !roomById(cur)) { WZ.step='rooms'; return wzRender(); }
  wzLayoutSet(st.full?'full':'draw');
  const nx=st.next? st.next() : null;
  const foot = nx? `<button class="btn primary" id="wzNext">${nx.label||'Επόμενο →'}</button>` : '';
  h(wzCard(st, st.body(), foot)); side.classList.remove('idle');
  if($('wzBack')) $('wzBack').onclick=wzBack;
  if(nx&&$('wzNext')) $('wzNext').onclick=()=>{ if(nx.go) nx.go(); else wzGo(nx.to); };
  if(st.bind) st.bind();
  side.scrollTop=0; }

function wzRoomTo(id){ cur=id; WZ.room=id; sel=null; selRoom=null; }
function wzAfterName(){ if(typeof wmRoomOk==='function'&&wmRoomOk(cur)) return 'wsides'; const s=wzRoomState(cur); if(s==='empty') return 'shape'; if(s==='sketch') return 'sides'; return 'check'; }
function wzNextRoom(){ const r=S.rooms.find(x=>x.id!==cur&&wzRoomState(x.id)!=='done'); return r||null; }
function wzNewRoom(){ snap(); const empty=S.rooms.find(r=>!roomItems(r.id).length&&!r.wz);
  const id= empty? empty.id : newRoomId(); if(!empty) S.rooms.push({id,name:'Χώρος '+id}); wzRoomTo(id); commit(); return id; }

// ---- σκίτσο ορόφου: κάθε κλειστή γραμμή γίνεται νέος χώρος ----
function wzSketchRoom(r){ snap();
  const empty=S.rooms.find(x=>!roomItems(x.id).length); const id=empty?empty.id:newRoomId();
  if(!empty) S.rooms.push({id,name:'Χώρος '+id});
  const it={id:S.next++,room:id,t:'poly',x:r4(r.o[0]),y:r4(r.o[1]),rot:0,sub:false,pts:[],src:{k:'pen',sides:r.sides}};
  penApply(it); S.items.push(it); cur=id; commit();
  toast('Χώρος '+S.rooms.filter(x=>roomItems(x.id).length).length+': '+r.sides.length+' πλευρές. Ζωγράφισε τον επόμενο ή πάτα «Επόμενο».'); }

// ---- μέτρηση πλευρών μία-μία (σκίτσο με γραφίδα) ----
// η πρώτη μέτρηση του ορόφου δίνει την κλίμακα του σκίτσου: όλα τα σκίτσα μεγαλώνουν μαζί και κρατούν τις θέσεις τους
function wzScaleSketch(k){ for(const it of S.items){ if(!(it.src&&it.src.k==='pen')) continue; if(it.src.sides.some(q=>q.m!=null)) continue;
    it.x=r4(it.x*k); it.y=r4(it.y*k); it.src.sides.forEach(q=>q.sk=r4(q.sk*k)); penApply(it); } FL().skK=r4(k); }
function wzSideSet(it,i,v){ if(!penEdit||penEdit.id!==it.id) penEdit={id:it.id,active:i,dirty:false};
  if(!penEdit.dirty){ snap(); penEdit.dirty=true; }
  const q=it.src.sides[i]; if(v!=null&&!FL().skK&&q.sk>0){ const k=v/q.sk; if(k>0.1&&k<30&&Math.abs(k-1)>0.03){ wzScaleSketch(k); toast('Η κλίμακα του σκίτσου διορθώθηκε από αυτή τη μέτρηση. Οι άλλοι χώροι μεγάλωσαν μαζί.'); } else FL().skK=1; }
  q.m=v==null?null:r4(v); penApply(it); compute(); save(); }

const WZ_STEPS = {
  // ---------- Α. Έργο ----------
  start:{ phase:'A', n:'1', full:true, mode:'house',
    title:()=> PYCASE? 'Κάτοψη του έργου' : 'Αποτύπωση',
    body:()=>{ const has=S.items.some(isShape), nR=allRooms().filter(r=>S.floors.some(f=>floorData(f).items.some(i=>i.room===r.id&&isShape(i)))).length;
      return `<p class="wz-lead">Θα πάμε βήμα βήμα: έργο, χώροι, οικία, DXF. Σε κάθε καρτέλα κάνεις ένα πράγμα. Όλα σώζονται μόνα τους.</p>
      <label class="f">Όνομα κάτοψης<input id="wzName" value="${esc(S.name)}" autocomplete="off"></label>
      ${has?`<div class="note">Υπάρχει ήδη κάτοψη με ${nR} ${nR===1?'χώρο':'χώρους'} σε ${S.floors.length} ${S.floors.length===1?'όροφο':'ορόφους'}.</div>
      <div class="wz-big"><button class="wz-opt" id="wzCont"><b>Συνέχισε αυτή την κάτοψη</b><span>Πας στη λίστα χώρων του ορόφου.</span></button>
      <button class="wz-opt" id="wzFresh"><b>Ξεκίνα νέα κάτοψη</b><span>Η τωρινή σβήνεται (με Αναίρεση γυρίζει πίσω).</span></button></div>`:''}
      ${typeof katOpen==='function'?`<div class="wz-big"><button class="wz-opt" id="wzKat"><b>Άνοιξε κάτοψη από αρχείο</b><span>Από το Google Drive ή το tablet (.katopsi.json). Ξεκινάς αμέσως την αποτύπωση.</span></button></div>`:''}`; },
    bind:()=>{ const n=$('wzName'); n.addEventListener('change',()=>{ snap(); S.name=n.value.trim()||'Κάτοψη'; $('planName').value=S.name; save(); });
      if($('wzCont')) $('wzCont').onclick=()=>wzGo('rooms'); if($('wzKat')) $('wzKat').onclick=katOpen;
      if($('wzFresh')) armConfirm('wzFresh',()=>{ snap(); S=migrate({name:$('wzName').value.trim()||'Νέα κάτοψη',next:1,ext:S.ext,int:S.int,extC:S.extC,cons:S.cons,tol:S.tol,topo:S.topo,rooms:[{id:1,name:'Χώρος 1'}],items:[]}); cur=1; WZ.room=1; $('planName').value=S.name; commit(); wzGo('topo'); }); },
    next:()=> S.items.some(isShape)? null : {to:'topo'} },
  topo:{ phase:'A', n:'3', full:true, mode:'house',
    title:()=>'Τοπογραφικό',
    body:()=>{ const t=S.topo; return t? `<p class="wz-lead">Φορτώθηκε το «${esc(t.file)}».</p>${bldBox()}<div class="actions"><button class="btn" id="wzTopo">Άλλο DXF</button></div>`
      : `<p class="wz-lead">Αν έχεις το DXF του τοπογράφου, φόρτωσέ το. Βρίσκω μόνος μου το περίγραμμα του κτιρίου (layer lk.4495.building.area) και στο τέλος συγκρίνω τα εμβαδά.</p>
      <div class="wz-big"><button class="wz-opt" id="wzTopo"><b>Φόρτωσε DXF τοπογράφου</b><span>Αρχείο .dxf από τον υπολογιστή ή το tablet.</span></button></div>`; },
    bind:()=>{ $('wzTopo').onclick=()=>pickFile('topo'); },
    next:()=>({to:'floors', label: S.topo?'Επόμενο →':'Παράλειψη →'}) },
  floors:{ phase:'A', n:'4', full:true, mode:'house',
    title:()=>'Όροφοι',
    body:()=>`<p class="wz-lead">Ποιοι όροφοι υπάρχουν; Ξεκινάμε από τον όροφο που φαίνεται με έντονα. Τους άλλους τους κάνεις μετά.</p>
      <div class="wz-list">${S.floors.slice().reverse().map(f=>`<button class="wz-row ${f.id===S.fl?'on':''}" data-wf="${f.id}"><b>${esc(f.name)}</b><span>ύψος ${fmt(f.h)} m · ${floorData(f).items.filter(isShape).length?'έχει χώρους':'άδειος'}</span></button>`).join('')}</div>
      <div class="row">${field('wzFH','Ύψος ορόφου, πλάκα σε πλάκα (m)',fmt(FL().h))}<label class="f">Όνομα<input id="wzFN" value="${esc(FL().name)}" autocomplete="off"></label></div>
      <div class="actions"><button class="btn" id="wzUp">+ Όροφος από πάνω</button><button class="btn" id="wzDown">+ Υπόγειο</button></div>`,
    bind:()=>{ side.querySelectorAll('[data-wf]').forEach(b=>b.onclick=()=>switchFloor(+b.dataset.wf));
      $('wzUp').onclick=()=>addFloor(true); $('wzDown').onclick=()=>addFloor(false);
      const hh=$('wzFH'); hh.addEventListener('change',()=>{ const v=num(hh.value); if(v>1.5&&v<10){ snap(); FL().h=r4(v); commit(); } });
      const fn=$('wzFN'); fn.addEventListener('change',()=>{ const v=fn.value.trim(); if(v){ snap(); FL().name=v; commit(); } }); },
    next:()=>({to:'source'}) },
  source:{ phase:'A', n:'3β', full:true, mode:'house',
    title:()=>'Από πού ξεκινάς;',
    body:()=>{ const has=S.items.some(isShape);
      return `<p class="wz-lead">${has?'Ο όροφος έχει ήδη χώρους. Μπορείς να προσθέσεις κι άλλους με σκίτσο ή να πας στη λίστα.':'Διάλεξε πώς θα μπουν οι χώροι του ορόφου «'+esc(FL().name)+'».'}</p>
      <div class="wz-big"><button class="wz-opt" id="wzSk"><b>Σκίτσο όλου του ορόφου με γραφίδα</b><span>Ζωγραφίζεις πρόχειρα κάθε χώρο. Ισιώνει μόνο του. Μετά μετράς τα μήκη χώρο-χώρο.</span></button>
      <button class="wz-opt" id="wzOne"><b>Χώρο-χώρο από την αρχή</b><span>Φτιάχνεις και μετράς κάθε χώρο ξεχωριστά.</span></button>
      ${S.topo&&S.topo.bld&&(S.topo.bldRings||[]).length?`<button class="wz-opt" id="wzBld"><b>Από το περίγραμμα του τοπογράφου</b><span>Ένας χώρος μέσα στο περίγραμμα, μείον τον εξωτερικό τοίχο. Τον χωρίζεις μετά.</span></button>`:''}
      <button class="wz-opt" disabled><b>DXF κάτοψης ή εικόνα / PDF</b><span>Έρχεται σε επόμενη έκδοση.</span></button></div>`; },
    bind:()=>{ $('wzSk').onclick=()=>wzGo('fsketch'); $('wzOne').onclick=()=>wzGo('rooms'); if($('wzBld')) $('wzBld').onclick=()=>{ bldRoom(); wzGo('rooms'); }; } },
  fsketch:{ phase:'A', n:'3β', mode:'room', tool:'pen', penOp:'new',
    enter:()=>{ if(!S.items.some(isShape)){ const r=cv.getBoundingClientRect(); view.s=Math.max(20,Math.min(r.width,r.height)/14); view.ox=r.width*0.15; view.oy=r.height*0.15; render(); } },
    title:()=>'Σκίτσο ορόφου',
    body:()=>{ const n=S.rooms.filter(r=>wzShapes(r.id).length).length;
      return `<p class="wz-lead">Ζωγράφισε κάθε χώρο με <b>μία γραμμή</b>, χωρίς να σηκώσεις τη γραφίδα. Κάθε κλειστό σχήμα γίνεται χώρος. Το μέγεθος δεν πειράζει, τα μήκη τα μετράς μετά.</p>
      <label class="f"><span><input type="checkbox" id="wzO90" ${penOpt.only90?'checked':''}> Μόνο ορθές γωνίες</span></label>
      <div class="note">${n? `Χώροι στο σκίτσο: <b>${n}</b>`:'Ακόμα κανένας χώρος.'} Η κλίμακα διορθώνεται μόνη της με την πρώτη μέτρηση.</div>
      <div class="note">Με γραφίδα, το δάχτυλο μετακινεί την κάτοψη. Λάθος γραμμή; Πάτα «Αναίρεση».</div>`; },
    bind:()=>{ $('wzO90').onchange=()=>{ penOpt.only90=$('wzO90').checked; }; },
    next:()=>({to:'rooms', label:'Τελείωσα το σκίτσο →'}) },
  // ---------- Β. Κάθε χώρος ----------
  rooms:{ phase:'B', n:'5', full:true, mode:'house',
    title:()=>'Χώροι · '+esc(FL().name),
    body:()=>{ const rs=S.rooms.filter(r=>wzShapes(r.id).length||S.rooms.length===1||r.id===WZ.room);
      return `<p class="wz-lead">Πάτα έναν χώρο για να τον μετρήσεις.</p>
      <div class="wz-list">${rs.map(r=>{ const s=wzRoomState(r.id); return `<button class="wz-row st-${s}" data-wr="${r.id}"><b>${esc(r.name)}</b><span>${WZ_ST[s]}${OL[r.id]&&OL[r.id].area?' · '+fmt(OL[r.id].area)+' m²':''}</span></button>`; }).join('')}</div>
      <div class="actions"><button class="btn" id="wzNewR">+ Νέος χώρος</button><button class="btn" id="wzSk2">Σκίτσο κι άλλων χώρων</button></div>`; },
    bind:()=>{ side.querySelectorAll('[data-wr]').forEach(b=>b.onclick=()=>{ wzRoomTo(+b.dataset.wr); wzGo('rname'); });
      $('wzNewR').onclick=()=>{ wzNewRoom(); wzGo('rname'); }; $('wzSk2').onclick=()=>wzGo('fsketch'); },
    next:()=> S.items.some(isShape)? {to:'place', label:'Τέλος ορόφου →'} : null },
  rname:{ phase:'B', n:'6', full:true, room:true, mode:'room',
    title:()=>'Τι χώρος είναι;',
    body:()=>`<div class="form">${nameUI(roomById(cur))}</div><p>Η χρήση μετράει στα εμβαδά: κύριοι, βοηθητικοί, ημιυπαίθριοι, εξώστες.</p>`,
    bind:()=>bindName(roomById(cur)),
    next:()=>({to:wzAfterName()}) },
  shape:{ phase:'B', n:'7', full:true, room:true, mode:'room',
    title:()=>'Σχήμα χώρου',
    body:()=>`<p class="wz-lead">Τι σχήμα έχει ο χώρος;</p><div class="wz-big">
      <button class="wz-opt" id="wzRect"><b>Ορθογώνιο</b><span>Μετράς δύο μήκη.</span></button>
      <button class="wz-opt" id="wzPen"><b>Γραφίδα</b><span>Ζωγραφίζεις το σχήμα (Γ, Π, λοξό). Ισιώνει μόνο του.</span></button>
      ${PYCASE?`<button class="wz-opt" id="wzLaser"><b>Μέτρηση με στάσεις (Pythagoras)</b><span>1 ή 2 στάσεις. Το σχήμα γυρίζει μόνο του εδώ.</span></button>`:''}
      <button class="wz-opt" id="wzPoly"><b>Από πλευρές ή τρίγωνο</b><span>Στην ελεύθερη σχεδίαση, με γωνίες ή διαγώνιους.</span></button></div>
      ${wzShapes(cur).length?'<div class="note ok">Ο χώρος έχει ήδη σχήμα. Πάτα «Επόμενο» για τον έλεγχο ή διάλεξε άλλο σχήμα.</div>':''}`,
    next:()=> wzShapes(cur).length? {to: ['sides','wsides'].includes(wzAfterName())?wzAfterName():'check'} : null,
    bind:()=>{ $('wzRect').onclick=()=>wzGo('rect'); $('wzPen').onclick=()=>wzGo('rpen');
      if($('wzLaser')) $('wzLaser').onclick=()=>pyMeasure(roomById(cur));
      $('wzPoly').onclick=()=>{ wzFree('Φτιάξε το σχήμα με «Από πλευρές» ή «Τρίγωνο» και πάτα «Οδηγός →».'); tool='poly'; markTool(); toolPanel('poly'); }; } },
  rect:{ phase:'B', n:'9α', full:true, room:true, mode:'room',
    title:()=>'Ορθογώνιο: δύο μήκη',
    body:()=>`<p class="wz-lead">Μέτρησε με το DISTO. Κάθε μέτρηση πάει στο επόμενο κουτάκι.</p>
      <div class="wz-meas">${field('wzW','Πλευρά ΑΒ, οριζόντια (m)','','placeholder="π.χ. 4,35"')}${field('wzH','Πλευρά ΒΓ, κάθετη (m)','','placeholder="π.χ. 3,20"')}</div>
      <div class="note" id="wzRI">Α πάνω αριστερά, Β πάνω δεξιά, Γ κάτω δεξιά.</div>`,
    bind:()=>{ const go=()=>{ const w=num($('wzW').value), hh=num($('wzH').value); if(!(w>0&&hh>0)) return toast('Γράψε και τα δύο μήκη');
        snap(); S.items=S.items.filter(i=>!(i.room===cur&&isShape(i))); let x=w/2, y=hh/2;
        const others=S.items.filter(isShape); if(others.length){ const b=bbox(); x=b[2]+S.ext*2+w/2+1; y=b[1]+hh/2; }
        S.items.push({id:S.next++,room:cur,t:'rect',x:r4(x),y:r4(y),w:r4(w),h:r4(hh),rot:0,sub:false}); commit(); wzGo('check'); };
      enterChain(['wzW','wzH'],go); $('wzW').focus(); WZ._rect=go; },
    next:()=>({go:()=>WZ._rect&&WZ._rect(), label:'Βάλε το →'}) },
  rpen:{ phase:'B', n:'7', room:true, mode:'room', tool:'pen', penOp:'new',
    enter:()=>{ requestAnimationFrame(()=>fit(cur)); },
    title:()=>'Ζωγράφισε τον χώρο',
    body:()=>`<p class="wz-lead">Ζωγράφισε το περίγραμμα με μία γραμμή. Οι πλευρές ισιώνουν και οι γωνίες κουμπώνουν σε 90° ή 45°.</p>
      <label class="f"><span><input type="checkbox" id="wzO90" ${penOpt.only90?'checked':''}> Μόνο ορθές γωνίες</span></label>
      ${wzPen(cur)?'<div class="note ok">Το σχήμα μπήκε. Πάτα «Επόμενο» για τα μήκη ή ζωγράφισε ξανά.</div>':''}`,
    bind:()=>{ $('wzO90').onchange=()=>{ penOpt.only90=$('wzO90').checked; }; },
    next:()=> wzPen(cur)? {to:'sides'} : null },
  sides:{ phase:'B', n:'9α', room:true, mode:'room',
    enter:()=>{ const it=wzPen(cur); if(it){ penEdit={id:it.id,active:WZ.side||0,dirty:false}; sel=it.id; } requestAnimationFrame(()=>fit(cur)); },
    title:()=>'Μέτρηση πλευρών',
    body:()=>{ const it=wzPen(cur); if(!it) return '<p>Ο χώρος δεν έχει σκίτσο.</p>';
      const n=it.src.sides.length, i=Math.min(WZ.side||0,n-1), g=penSolve(it.src.sides), s=it.src.sides[i];
      return `<div class="wz-side"><span class="wz-q">Μέτρησε την πλευρά</span><span class="wz-letter">${corner(i)}${corner((i+1)%n)}</span><span class="wz-of">${i+1} από ${n}</span></div>
      <label class="f wz-in">Μήκος (m)<input id="wzM" inputmode="decimal" autocomplete="off" value="${s.m!=null?fmt(s.m):''}" placeholder="${fmt(g.L[i])}"></label>
      <div class="wz-chips">${it.src.sides.map((q,k)=>`<button class="wz-chip k-${g.kind[k]} ${k===i?'on':''}" data-ws="${k}">${corner(k)}${corner((k+1)%n)}<small>${q.m!=null?fmt(q.m):g.kind[k]==='c'?'≈'+fmt(g.L[k]):'—'}</small></button>`).join('')}</div>
      <div id="wzPI">${penInfo(it)}</div>
      <div class="actions"><button class="btn" id="wzSkip">Δεν μετριέται, επόμενη</button></div>`; },
    bind:()=>{ const it=wzPen(cur); if(!it) return; const n=it.src.sides.length; const el=$('wzM'); penEdit=penEdit&&penEdit.id===it.id?penEdit:{id:it.id,active:0,dirty:false}; penEdit.active=Math.min(WZ.side||0,n-1); render();
      const idx=WZ.side||0; let done=false;
      const adv=()=>{ if((WZ.side||0)<n-1){ WZ.side=(WZ.side||0)+1; wzSave(); penEdit.active=WZ.side; render(); renderSide(); } else wzGo('check'); };
      el.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); const v=String(el.value).trim(); if(v===''){ done=true; adv(); return; } const x=num(v); if(!(x>0)) return toast('Γράψε μήκος σε μέτρα');
        done=true; wzSideSet(it,idx,x); fit(cur); adv(); } });
      el.addEventListener('change',()=>{ if(done||!el.isConnected) return; const v=String(el.value).trim(); const x=v===''?null:num(v); if(v!==''&&!(x>0)) return; wzSideSet(it,idx,x); render(); const pi=$('wzPI'); if(pi) pi.innerHTML=penInfo(it); });
      side.querySelectorAll('[data-ws]').forEach(b=>b.onclick=()=>{ WZ.side=+b.dataset.ws; wzSave(); penEdit.active=WZ.side; render(); renderSide(); });
      $('wzSkip').onclick=()=>{ if(it.src.sides[WZ.side||0].m!=null) wzSideSet(it,WZ.side||0,null); adv(); };
      setTimeout(()=>{ el.focus(); el.select(); },30); },
    next:()=>({to:'check', label:'Τέλος μετρήσεων →'}) },
  wsides:{ phase:'B', n:'9α', room:true, mode:'room',
    enter:()=>{ penEdit=null; sel=null; requestAnimationFrame(()=>fit(cur)); },
    title:()=>'Μέτρηση πλευρών',
    body:()=>{ if(!wmRoomOk(cur)) return '<p>Ο χώρος δεν βγαίνει από τοίχους.</p>'; const Sd=wmSides(cur), n=Sd.length; if(!n) return '<p>Ο χώρος δεν έχει σχήμα.</p>';
      const i=Math.min(WZ.side||0,n-1), M=wmMeasMap(cur);
      return `<div class="wz-side"><span class="wz-q">Μέτρησε την πλευρά</span><span class="wz-letter">${corner(i)}${corner((i+1)%n)}</span><span class="wz-of">${i+1} από ${n}</span></div>
      <label class="f wz-in">Μήκος (m)<input id="wzM" inputmode="decimal" autocomplete="off" value="${M[i]!=null?fmt(M[i]):''}" placeholder="${fmt(Sd[i].L)}"></label>
      <div class="wz-chips">${Sd.map((q,k)=>`<button class="wz-chip ${M[k]!=null?'k-m':'k-s'} ${k===i?'on':''}" data-ws="${k}">${corner(k)}${corner((k+1)%n)}<small>${M[k]!=null?fmt(M[k]):'≈'+fmt(q.L)}</small></button>`).join('')}</div>
      <div class="note">Η μέτρηση μετακινεί τον εσωτερικό τοίχο στην άκρη της πλευράς. Ο εξωτερικός τοίχος και οι έτοιμοι χώροι δεν αλλάζουν. Αν δεν γίνεται, η διαφορά φαίνεται στον έλεγχο.</div>
      <div class="actions"><button class="btn" id="wzSkip">Δεν μετριέται, επόμενη</button></div>`; },
    bind:()=>{ if(!wmRoomOk(cur)) return; const n=wmSides(cur).length, el=$('wzM'); if(!el) return; const idx=Math.min(WZ.side||0,n-1); let done=false;
      const adv=()=>{ if(idx<n-1){ WZ.side=idx+1; wzSave(); renderSide(); } else wzGo('check'); };
      const put=x=>{ const r=wmMeasure(cur,idx,x); toast(wmMeasMsg(r,'Πλευρά '+corner(idx)+corner((idx+1)%n))); render(); };
      el.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); const v=String(el.value).trim(); if(v===''){ done=true; adv(); return; } const x=num(v); if(!(x>0)) return toast('Γράψε μήκος σε μέτρα'); done=true; put(x); adv(); } });
      el.addEventListener('change',()=>{ if(done||!el.isConnected) return; const v=String(el.value).trim(); const x=num(v); if(v===''||!(x>0)) return; done=true; put(x); renderSide(); });
      side.querySelectorAll('[data-ws]').forEach(b=>b.onclick=()=>{ WZ.side=+b.dataset.ws; wzSave(); renderSide(); });
      $('wzSkip').onclick=adv; setTimeout(()=>{ el.focus(); el.select(); },30); },
    next:()=>({to:'check', label:'Τέλος μετρήσεων →'}) },
  check:{ phase:'B', n:'10', room:true, mode:'room',
    enter:()=>{ penEdit=null; sel=null; requestAnimationFrame(()=>fit(cur)); },
    title:()=>'Έλεγχος κλεισίματος',
    body:()=>{ const it=wzPen(cur), o=OL[cur]||{area:0,per:0}, chk=wzShapes(cur).flatMap(shapeChecks).concat(typeof wmChecks==='function'?wmChecks(cur):[]), wmR=typeof wmRoomOk==='function'&&wmRoomOk(cur);
      return `${it?penInfo(it):''}${checkNotes(chk)}${!it&&!chk.length?'<div class="note ok">✓ Το σχήμα είναι κλειστό.</div>':''}
      <dl class="sum">${it?'':`<dt>Εμβαδόν</dt><dd>${fmt(o.area)} m²</dd>`}<dt>Περίμετρος</dt><dd>${fmt(o.per)} m</dd></dl>
      <div class="actions">${it||wmR?'<button class="btn" id="wzRe">Ξαναμέτρα πλευρά</button>':''}<button class="btn" id="wzDiag">+ Διαγώνιος ελέγχου</button></div>`; },
    bind:()=>{ if($('wzRe')) $('wzRe').onclick=()=>wzGo(typeof wmRoomOk==='function'&&wmRoomOk(cur)?'wsides':'sides');
      $('wzDiag').onclick=()=>{ const s=wzShapes(cur)[0]; wzFree('Η διαγώνιος μπαίνει από τις ιδιότητες του σχήματος. Μετά πάτα «Οδηγός →».'); if(s){ sel=s.id; render(); renderSide(); } }; },
    next:()=>({to:'open'}) },
  open:{ phase:'B', n:'11', room:true, mode:'room',
    enter:()=>{ requestAnimationFrame(()=>fit(cur)); },
    title:()=>'Πόρτες και παράθυρα',
    body:()=>{ const ops=roomItems(cur).filter(i=>i.t==='door'||i.t==='window');
      return `<p class="wz-lead">${ops.length?'Ανοίγματα του χώρου:':'Ο χώρος δεν έχει ακόμα ανοίγματα.'}</p>${openTable(cur)}
      <div class="wz-big two"><button class="wz-opt" id="wzDoor"><b>+ Πόρτα</b><span>Πάτα στον τοίχο που είναι.</span></button><button class="wz-opt" id="wzWin"><b>+ Παράθυρο</b><span>Πάτα στον τοίχο που είναι.</span></button></div>`; },
    bind:()=>{ const add=t=>{ wzFree(t==='door'?'Βάλε την πόρτα στον τοίχο. Μετά πάτα «Οδηγός →».':'Βάλε το παράθυρο στον τοίχο. Μετά πάτα «Οδηγός →».'); tool=t; markTool(); toolPanel(t); render(); };
      $('wzDoor').onclick=()=>add('door'); $('wzWin').onclick=()=>add('window');
      side.querySelectorAll('[data-o]').forEach(tr=>tr.onclick=()=>{ wzFree('Άλλαξε το άνοιγμα και πάτα «Οδηγός →».'); sel=+tr.dataset.o; render(); renderSide(); }); },
    next:()=>({to:'rdone', label: roomItems(cur).some(i=>i.t==='door'||i.t==='window')?'Επόμενο →':'Κανένα άνοιγμα →'}) },
  rdone:{ phase:'B', n:'13', room:true, mode:'room',
    enter:()=>{ const r=roomById(cur); if(r&&!r.wz){ r.wz=1; save(); } requestAnimationFrame(()=>fit(cur)); },
    title:()=>'Τέλος χώρου',
    body:()=>{ const o=OL[cur]||{area:0,per:0}, ops=roomItems(cur).filter(i=>i.t==='door'||i.t==='window'), nx=wzNextRoom();
      return `<div class="note ok">✓ Ο χώρος «${esc(roomById(cur).name)}» είναι έτοιμος.</div>
      <dl class="sum"><dt>Χρήση</dt><dd>${USES[useOf(roomById(cur))]}</dd><dt>Εμβαδόν</dt><dd>${fmt(o.area)} m²</dd><dt>Περίμετρος</dt><dd>${fmt(o.per)} m</dd><dt>Ανοίγματα</dt><dd>${ops.length}</dd></dl>
      <div class="wz-big"><button class="wz-opt" id="wzNR"><b>${nx?'Επόμενος χώρος: '+esc(nx.name):'Νέος χώρος'}</b><span>${nx?WZ_ST[wzRoomState(nx.id)]:'Φτιάχνεις και μετράς τον επόμενο.'}</span></button>
      <button class="wz-opt" id="wzAll"><b>Όλοι οι χώροι</b><span>Η λίστα του ορόφου.</span></button></div>`; },
    bind:()=>{ $('wzNR').onclick=()=>{ const nx=wzNextRoom(); if(nx) wzRoomTo(nx.id); else wzNewRoom(); wzGo('rname'); }; $('wzAll').onclick=()=>wzGo('rooms'); },
    next:()=>({to:'place', label:'Τέλος ορόφου →'}) },
  // ---------- Γ. Οικία ----------
  place:{ phase:'C', n:'14', mode:'house',
    enter:()=>{ selRoom=null; requestAnimationFrame(()=>fit()); },
    title:()=>'Βάλε τους χώρους στη θέση τους',
    body:()=>{ const r=selRoom!=null?roomById(selRoom):null;
      return `<p class="wz-lead">Σύρε κάθε χώρο δίπλα στον άλλο. Κουμπώνει με κενό όσο ο εσωτερικός τοίχος.</p>
      ${r?`<div class="wz-sel"><b>${esc(r.name)}</b><div class="actions"><button class="btn primary" id="wzAl">Ευθυγράμμισε με τους διπλανούς</button><button class="btn" id="wzR90">↻ 90°</button><button class="btn" id="wzRm90">↺ 90°</button></div></div>`
        :'<div class="note">Πάτα έναν χώρο για να τον στρίψεις ή να τον ευθυγραμμίσεις.</div>'}
      <div class="actions"><button class="btn" id="wzAlAll">Ευθυγράμμισε όλους</button></div>
      ${PYCASE?pyUnplaced():''}`; },
    bind:()=>{ side.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>pyPlace(b.dataset.place));
      $('wzAlAll').onclick=()=>{ for(const r of S.rooms) if(wzShapes(r.id).length) alignRoom(r.id); toast('Έγινε ευθυγράμμιση όπου υπήρχε γειτονικός τοίχος ως 35 εκ.'); };
      if(!$('wzAl')) return; const id=selRoom; $('wzAl').onclick=()=>alignRoom(id);
      const rot=deg=>{ snap(); const b=bbox(id), c=[(b[0]+b[2])/2,(b[1]+b[3])/2];
        for(const it of roomItems(id)){ const q=rotP(it.x-c[0],it.y-c[1],deg); it.x=r4(c[0]+q[0]); it.y=r4(c[1]+q[1]); if(it.rot!=null||isShape(it)||it.t==='furn'||it.t==='col') it.rot=r4(((it.rot||0)+deg)%360); } commit(); };
      $('wzR90').onclick=()=>rot(90); $('wzRm90').onclick=()=>rot(-90); },
    next:()=>({to:'extras'}) },
  extras:{ phase:'C', n:'15', mode:'house',
    title:()=>'Σκάλα, καμινάδα, υποστυλώματα',
    body:()=>{ const c=t=>S.items.filter(i=>i.t===t).length;
      return `<p class="wz-lead">Υπάρχει κάτι από αυτά στον όροφο;</p><div class="wz-big">
      <button class="wz-opt" data-wt="stair"><b>Σκάλα</b><span>${c('stair')?c('stair')+' στον όροφο':'Έτοιμες μορφές: ευθεία, Γ, Π.'}</span></button>
      <button class="wz-opt" data-wt="chim"><b>Καμινάδα</b><span>${c('chim')?c('chim')+' στον όροφο':'Αφαιρείται από το εμβαδόν.'}</span></button>
      <button class="wz-opt" data-wt="col"><b>Υποστύλωμα</b><span>${c('col')?c('col')+' στον όροφο':'Κολόνα μέσα σε χώρο.'}</span></button></div>`; },
    bind:()=>{ side.querySelectorAll('[data-wt]').forEach(b=>b.onclick=()=>{ const t=b.dataset.wt; wzFree('Βάλε το στοιχείο και πάτα «Οδηγός →».'); if(selRoom!=null) cur=selRoom; mode='room'; markMode(); tool=t; markTool(); toolPanel(t); render(); }); },
    next:()=>({to:'walls', label: S.items.some(i=>['stair','chim','col'].includes(i.t))?'Επόμενο →':'Τίποτα από αυτά →'}) },
  walls:{ phase:'C', n:'12', full:true, mode:'house',
    title:()=>'Τοίχοι',
    body:()=>`<p class="wz-lead">Πάχος τοίχων για όλο το σπίτι. Ξεχωριστό τοίχο τον αλλάζεις στην ελεύθερη σχεδίαση, πατώντας πάνω του.</p>
      <div class="form"><label class="f">Εξωτερικοί τοίχοι<select id="wzExtC"><option value="">— μόνο πάχος —</option>${consOpts(S.extC,'ext')}</select></label>
      <div class="row">${S.extC&&consById(S.extC)?`<label class="f">Πάχος εξωτερικών (m)<input value="${fmt(consT(consById(S.extC)))}" disabled></label>`:field('wzExt','Πάχος εξωτερικών (m)',fmt(S.ext))}${field('wzInt','Εσωτερικοί (m)',fmt(S.int))}</div></div>`,
    bind:()=>{ $('wzExtC').onchange=()=>{ const v=$('wzExtC').value||null; extCh(()=>{ S.extC=v; }); };
      const wb=(id,k)=>{ const el=$(id); if(!el) return; el.addEventListener('change',()=>{ const v=num(el.value); if(v>=0&&v<3){ if(k==='ext') extCh(()=>{ S[k]=v; }); else { snap(); S[k]=v; commit(); } } }); el.addEventListener('keydown',e=>{ if(e.key==='Enter') el.blur(); }); };
      wb('wzExt','ext'); wb('wzInt','int'); },
    next:()=>({to: S.topo&&S.topo.bld?'topocmp':'areas'}) },
  topocmp:{ phase:'C', n:'16', mode:'house',
    enter:()=>{ requestAnimationFrame(()=>fit()); },
    title:()=>'Σύγκριση με τοπογραφικό',
    body:()=>`<p class="wz-lead">Μικτό εμβαδόν του ορόφου απέναντι στο περίγραμμα του τοπογράφου.</p>${bldBox()}`,
    next:()=>({to:'areas'}) },
  areas:{ phase:'C', n:'17', full:true, mode:'house',
    title:()=>'Εμβαδά',
    body:()=>{ const U=HOUSE.use||{}, uRow=(k,l)=>U[k]>0?`<tr><td>${l}</td><td>${fmt(U[k])}</td></tr>`:'';
      const st=S.floors.length>1?floorStats():null, tot=st?st.reduce((a,x)=>({net:a.net+x.net,foot:a.foot+x.foot}),{net:0,foot:0}):null;
      return `<div class="tbl"><table><thead><tr><th>${esc(FL().name)}</th><th>m²</th></tr></thead><tbody>
      ${S.rooms.filter(r=>OL[r.id]&&OL[r.id].area).map(r=>`<tr class="nohov"><td>${esc(r.name)} <span style="color:var(--ink-2);font-size:12px">${USES_S[useOf(r)]}</span></td><td>${fmt(OL[r.id].area)}</td></tr>`).join('')}</tbody>
      <tfoot>${uRow('kyr','Κύριοι χώροι (καθαρό)')}${uRow('voith','Βοηθητικοί (καθαρό)')}<tr><td>Τοίχοι</td><td>${fmt(HOUSE.footArea-HOUSE.net)}</td></tr><tr><td>Μικτό ορόφου</td><td>${fmt(HOUSE.footArea)}</td></tr>${uRow('imiy','Ημιυπαίθριοι')}${uRow('exo','Εξώστες')}</tfoot></table></div>
      ${st?`<div class="tbl"><table><thead><tr><th>Όροφος</th><th>Καθαρό</th><th>Μικτό</th></tr></thead><tbody>${st.slice().reverse().map(x=>`<tr class="nohov"><td>${esc(x.f.name)}</td><td>${fmt(x.net)}</td><td>${fmt(x.foot)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Σύνολο</td><td>${fmt(tot.net)}</td><td>${fmt(tot.foot)}</td></tr></tfoot></table></div>`:''}`; },
    next:()=>({to:'export'}) },
  // ---------- Δ. Παράδοση ----------
  export:{ phase:'D', n:'18', full:true, mode:'house',
    title:()=>'Εξαγωγή',
    body:()=>{ const empty=S.floors.filter(f=>f.id!==S.fl&&!floorData(f).items.some(isShape));
      return `<p class="wz-lead">${PYCASE?'Το DXF σώζεται στον φάκελο DXF του έργου.':'Το DXF κατεβαίνει ως .zip.'} Ένα αρχείο ανά όροφο.</p>
      <div class="wz-big"><button class="wz-opt" id="wzDxf"><b>DXF εξαγωγή · ${esc(FL().name)}</b><span>Layers: περίγραμμα, τοίχοι, μήκη, χώροι, ανοίγματα.</span></button>
      ${empty.length?`<button class="wz-opt" id="wzNF"><b>Επόμενος όροφος: ${esc(empty[0].name)}</b><span>Ξεκινάς τους χώρους του.</span></button>`:''}
      <button class="wz-opt" id="wzUpF"><b>+ Όροφος από πάνω</b><span>Και συνεχίζεις με σκίτσο ή χώρο-χώρο.</span></button>
      ${typeof katSave==='function'?`<button class="wz-opt" id="wzKatS"><b>Σώσε την κάτοψη (Drive)</b><span>Ένα αρχείο .katopsi.json που το ανοίγεις ξανά για αποτύπωση.</span></button>`:''}</div>`; },
    bind:()=>{ $('wzDxf').onclick=()=>$('bDxf').click();
      if($('wzNF')) $('wzNF').onclick=()=>{ const f=S.floors.find(f=>f.id!==S.fl&&!floorData(f).items.some(isShape)); switchFloor(f.id); wzGo('source'); };
      $('wzUpF').onclick=()=>{ addFloor(true); wzGo('source'); }; if($('wzKatS')) $('wzKatS').onclick=katSave; } }
};

function wzSketchHook(r){ if(wzActive()&&WZ.step==='fsketch'){ wzSketchRoom(r); return true; } return false; }
function wzStart(){
  const css=document.createElement('style'); css.textContent=`
body.wz nav#rail, body.wz .seg.mode, body.wz #flSel, body.wz #bThick, body.wz #bDims, body.wz #bDxf, body.wz #bOthers{display:none}
body.wz #app{grid-template-columns:1fr 390px;grid-template-areas:"top top" "board side"}
body.wzfull #app{grid-template-columns:1fr;grid-template-areas:"top" "side"}
body.wzfull main#board{display:none}
body.wzfull aside#side{border-left:none;background:var(--paper);padding:20px max(16px,env(safe-area-inset-left,0px)) 24px}
.wz{display:flex;flex-direction:column;gap:14px;min-height:100%}
body.wzfull .wz{max-width:640px;margin:0 auto;min-height:0;background:var(--sheet);border:1px solid var(--line);border-radius:14px;padding:18px 18px 0}
.wz-top{display:flex;flex-direction:column;gap:6px}
.wz-dots{display:flex;gap:4px;flex-wrap:wrap}
.wz-ph{font-size:11px;font-weight:600;letter-spacing:.04em;padding:3px 8px;border-radius:999px;background:var(--paper);color:var(--ink-2)}
.wz-ph.on{background:var(--accent);color:var(--sheet)}
.wz-crumb{font-size:13px;color:var(--ink-2)} .wz-crumb b{color:var(--ink)}
.wz-body{display:flex;flex-direction:column;gap:12px;flex:1}
aside .wz-h{font-size:24px;margin:0;line-height:1.2}
aside p.wz-lead{font-size:15.5px;color:var(--ink);margin:0}
.wz-big{display:grid;gap:8px} .wz-big.two{grid-template-columns:1fr 1fr}
.wz-opt{display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;border:1.5px solid var(--line);background:var(--sheet);border-radius:12px;padding:14px;min-height:64px;cursor:pointer}
.wz-opt b{font-size:16px} .wz-opt span{font-size:13px;color:var(--ink-2)}
.wz-opt:hover{border-color:var(--accent)} .wz-opt:disabled{opacity:.45;cursor:default}
.wz-list{display:grid;gap:6px}
.wz-row{display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:left;border:1px solid var(--line);background:var(--sheet);border-radius:10px;padding:12px 14px;cursor:pointer;min-height:52px}
.wz-row b{font-size:15.5px} .wz-row span{font-size:13px;color:var(--ink-2);text-align:right}
.wz-row.on{border-color:var(--accent);background:var(--accent-soft)}
.wz-row.st-done span{color:var(--ok)} .wz-row.st-sketch span{color:var(--warn)}
.wz-foot{position:sticky;bottom:0;display:flex;justify-content:space-between;gap:8px;padding:12px 0 calc(12px + env(safe-area-inset-bottom,0px));background:var(--sheet);border-top:1px solid var(--line);margin-top:auto}
.wz-foot .btn{min-height:48px;padding:10px 18px;font-size:16px}
.wz-side{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 0}
.wz-q{font-size:14px;color:var(--ink-2)}
.wz-letter{font-family:var(--mono);font-size:56px;font-weight:600;color:var(--sub);line-height:1.05}
.wz-of{font-size:12px;color:var(--ink-2)}
label.f.wz-in input{font-size:30px;padding:10px 12px;text-align:center}
.wz-meas{display:grid;gap:10px} .wz-meas input{font-size:24px!important}
.wz-chips{display:flex;flex-wrap:wrap;gap:6px}
.wz-chip{display:flex;flex-direction:column;align-items:center;border:1px solid var(--line);background:var(--paper);border-radius:8px;padding:4px 8px;min-width:54px;font-family:var(--mono);font-size:13px;cursor:pointer}
.wz-chip small{font-size:11px;color:var(--ink-2)} .wz-chip.k-m small{color:var(--ok)} .wz-chip.k-c small{color:var(--accent)} .wz-chip.k-x small{color:var(--sub)}
.wz-chip.on{border-color:var(--sub);background:var(--sheet);box-shadow:0 0 0 1px var(--sub)}
.wz label.f:has(input[type=checkbox]){display:block;font-size:14px;color:var(--ink)} .wz label.f input[type=checkbox]{width:auto;margin-right:6px;vertical-align:-2px}
.wz-sel{border:1px solid var(--accent);border-radius:10px;padding:10px 12px;display:grid;gap:8px}
@media (max-width:820px){
  body.wz #app{grid-template-columns:1fr;grid-template-rows:auto 1fr auto;grid-template-areas:"top" "board" "side"}
  body.wz aside#side{max-height:52vh}
  body.wzfull #app{grid-template-rows:auto 1fr;grid-template-areas:"top" "side"}
  body.wzfull aside#side{max-height:none}
  .wz-big.two{grid-template-columns:1fr}
  .wz-letter{font-size:44px}
}`; document.head.appendChild(css);
  wzHeader(); if(wzActive()) wzEnter(); }
