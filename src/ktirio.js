// ---------- Κτίριο: δέντρο (Κτίριο > Όροφοι > Ομάδες > Χώροι), περιγράμματα ορόφου / κτιρίου, αποστάσεις αντικειμένων ----------
// Μπαίνει μέσα στο app.js (build.py) πριν από το «start», ΜΟΝΟ στο αντίγραφο δοκιμής. Άγκιστρα στο app.js με typeof.
// Δεδομένα: FL().ol = περίγραμμα ορόφου [[x,y]…] (αν λείπει, το μικτό βγαίνει από τους χώρους) · S.bld={ring} = περίγραμμα κτιρίου
// (αν λείπει, του τοπογράφου) · room.grp = ομάδα χώρων μέσα στον όροφο (π.χ. «Διαμέρισμα Α1»).
let KO = null;   // επεξεργασία περιγράμματος: {k:'floor'|'bld', act}
let KD = null;   // σύρσιμο γωνίας: {i, pre, moved, sx, sy}
const KTKEY = STORE + '.tree';
const KT = (()=>{ try{ const o=JSON.parse(localStorage.getItem(KTKEY)); if(o) return {open:o.open!==false, min:!!o.min, pos:o.pos||null, shut:new Set(o.shut||[])}; }catch(e){} return {open:innerWidth>700, min:false, pos:null, shut:new Set()}; })();
function ktSave(){ try{ localStorage.setItem(KTKEY, JSON.stringify({open:KT.open, min:KT.min, pos:KT.pos, shut:[...KT.shut]})); }catch(e){} }

// ---- περιγράμματα ----
const KNAME = {floor:'Περίγραμμα ορόφου', bld:'Περίγραμμα κτιρίου'};
function ktRing(k){ return k==='floor'? (FL().ol||null) : (S.bld&&S.bld.ring||null); }
function ktSetRing(k,r){ if(k==='floor'){ if(r) FL().ol=r; else delete FL().ol; } else { if(r) S.bld={ring:r}; else delete S.bld; } }
function ktRings(){ return [FL().ol, S.bld&&S.bld.ring].filter(r=>r&&r.length>=3); }
function ktStat(r){ let per=0; for(let i=0;i<r.length;i++){ const a=r[i], b=r[(i+1)%r.length]; per+=Math.hypot(b[0]-a[0],b[1]-a[1]); } return {area:Math.abs(areaRing(r)), per}; }
function ktBig(P){ let best=null, ba=0; for(const poly of P){ const a=Math.abs(areaRing(poly[0])); if(a>ba){ ba=a; best=poly[0]; } } return best; }
const ktR4 = r => r.map(p=>[r4(p[0]),r4(p[1])]);
function ktRect(){ if(S.items.some(isShape)){ const b=bbox(); return [[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]]]; }
  const c=S2W(cv.clientWidth/2,cv.clientHeight/2); return ktR4([[c[0]-5,c[1]-4],[c[0]+5,c[1]-4],[c[0]+5,c[1]+4],[c[0]-5,c[1]+4]]); }
function ktFromRooms(){ compute(); const r=ktBig(HOUSE.foot); return r? ktR4(cleanRing(r)) : null; }
function ktFromTopo(){ const T=S.topo; if(!T||!T.bld||!(T.bldRings||[]).length) return null; let r=T.bldRings[0]; for(const q of T.bldRings) if(Math.abs(areaRing(q))>Math.abs(areaRing(r))) r=q; return ktR4(r); }
function ktDefault(k){ if(k==='floor') return ktFromRooms()||ktRect(); return ktFromTopo()||(FL().ol?ktR4(FL().ol):null)||ktFromRooms()||ktRect(); }
function ktEdit(k){ if(typeof wzActive==='function'&&wzActive()) wzFree();
  if(mode!=='house'){ mode='house'; markMode(); }
  sel=null; tool=null; markTool(); selRoom=null; selWall=null; consEdit=null; splitting=null;
  if(!ktRing(k)){ snap(); ktSetRing(k,ktDefault(k)); save(); }
  KO={k, act:-1}; compute(); render(); renderSide(); fit(); }
function ktEsc(){ KO=null; KD=null; }
// αλλαγή μήκους πλευράς i: η τελική γωνία (και η επόμενη, ώστε η επόμενη πλευρά να μένει παράλληλη) πάει κατά μήκος της πλευράς
function ktSetLen(r,i,L){ const n=r.length, a=r[i], b=r[(i+1)%n], L0=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L0<1e-6) return;
  const d=L-L0, ux=(b[0]-a[0])/L0, uy=(b[1]-a[1])/L0;
  for(const j of (n>3?[(i+1)%n,(i+2)%n]:[(i+1)%n])) r[j]=[r4(r[j][0]+ux*d), r4(r[j][1]+uy*d)]; }
function ktAngle(r,i){ const n=r.length, p=r[(i-1+n)%n], c=r[i], q=r[(i+1)%n];
  const a1=Math.atan2(p[1]-c[1],p[0]-c[0]), a2=Math.atan2(q[1]-c[1],q[0]-c[0]); let d=Math.abs(a1-a2)*180/Math.PI; if(d>180) d=360-d;
  // εσωτερική ή εξωτερική γωνία: κοίτα αν η διχοτόμος πέφτει μέσα
  const bx=Math.cos(a1)+Math.cos(a2), by=Math.sin(a1)+Math.sin(a2), L=Math.hypot(bx,by)||1, t=[c[0]+bx/L*0.01,c[1]+by/L*0.01];
  return inRing(t,r)? d : 360-d; }
function ktSnap(p,i){ const r=ktRing(KO.k), n=r.length, tol=12/view.s; let best=null, bd=tol;
  const C=[]; for(const room of S.rooms){ const o=OL[room.id]; if(o) for(const e of o.edges) C.push(e.a); }
  for(const poly of HOUSE.foot) for(const q of poly[0]) C.push(q);
  if(S.topo) for(const e of S.topo.ents) if(S.topo.layers[e.l]!==false) for(const q of e.pts) C.push(q);
  const other=KO.k==='floor'?(S.bld&&S.bld.ring):FL().ol; if(other) C.push(...other);
  for(const q of C){ const d=Math.hypot(q[0]-p[0],q[1]-p[1]); if(d<bd){ bd=d; best=q; } }
  if(best){ snapMark=best; return [r4(best[0]),r4(best[1])]; }
  snapMark=null; let x=Math.round(p[0]*100)/100, y=Math.round(p[1]*100)/100;
  for(const q of [r[(i-1+n)%n], r[(i+1)%n]]){ if(Math.abs(q[0]-p[0])<tol) x=q[0]; if(Math.abs(q[1]-p[1])<tol) y=q[1]; }
  return [r4(x),r4(y)]; }
function ktSnapEdges(){ const E=[]; for(const r of ktRings()) for(let i=0;i<r.length;i++){ const a=r[i], b=r[(i+1)%r.length], L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L<0.05) continue; E.push({a,b,L,ux:(b[0]-a[0])/L,uy:(b[1]-a[1])/L}); } return E; }

// ---- δείκτης (ποντίκι / δάχτυλο / γραφίδα) ----
function ktDown(x,y,e){ if(!KO||mode!=='house') return false; const r=ktRing(KO.k); if(!r) return false; const n=r.length;
  for(let i=0;i<n;i++){ const s=W2S(r[i]); if(Math.hypot(s[0]-x,s[1]-y)<14){ KD={i,pre:snapStr(),moved:false,sx:x,sy:y}; if(KO.act!==i){ KO.act=i; renderSide(); } render(); return true; } }
  for(let i=0;i<n;i++){ const a=r[i], b=r[(i+1)%n], s=W2S([(a[0]+b[0])/2,(a[1]+b[1])/2]); if(Math.hypot(s[0]-x,s[1]-y)<12){ const pre=snapStr();
      r.splice(i+1,0,[r4((a[0]+b[0])/2),r4((a[1]+b[1])/2)]); KD={i:i+1,pre,moved:true,sx:x,sy:y}; KO.act=i+1; render(); return true; } }
  drag={pan:true,sx:x,sy:y,ox:view.ox,oy:view.oy}; return true; }
function ktMove(x,y){ if(!KD||!KO) return false; if(!KD.moved&&Math.hypot(x-KD.sx,y-KD.sy)<4) return true; KD.moved=true;
  const r=ktRing(KO.k); if(!r) return true; r[KD.i]=ktSnap(S2W(x,y),KD.i); render(); return true; }
function ktUp(){ if(!KD) return false; const m=KD.moved; if(m){ undoS.push(KD.pre); redoS=[]; updUndo(); } KD=null; snapMark=null; if(m) commit(); else render(); return true; }

// ---- σχεδίαση ----
function ktDim(a,b,v,col){ const sa=W2S(a), sb=W2S(b), L=Math.hypot(sb[0]-sa[0],sb[1]-sa[1]); if(L<2) return; const ux=(sb[0]-sa[0])/L, uy=(sb[1]-sa[1])/L, nx=-uy*5, ny=ux*5;
  ctx.save(); ctx.strokeStyle=col; ctx.lineWidth=1.3; ctx.beginPath(); ctx.moveTo(sa[0],sa[1]); ctx.lineTo(sb[0],sb[1]);
  for(const s of [sa,sb]){ ctx.moveTo(s[0]-nx,s[1]-ny); ctx.lineTo(s[0]+nx,s[1]+ny); ctx.moveTo(s[0]-ux*4-nx*0.8,s[1]-uy*4-ny*0.8); ctx.lineTo(s[0]+ux*4+nx*0.8,s[1]+uy*4+ny*0.8); }
  ctx.stroke(); ctx.restore();
  text(fmt(v), [(sa[0]+sb[0])/2,(sa[1]+sb[1])/2], 12, col, Math.atan2(uy,ux), '700', true); }
function ktDrawRing(k){ const r=ktRing(k); if(!r||r.length<2) return; const ed=KO&&KO.k===k, col=k==='bld'?colors.topo:colors.accent; ctx.save();
  if(k==='bld'){ ctx.fillStyle=col; ctx.globalAlpha=0.07; pathPts(r); ctx.fill(); ctx.globalAlpha=1; }
  ctx.strokeStyle=col; ctx.lineWidth=ed?3:2; ctx.setLineDash(k==='floor'?[10,5]:[]); pathPts(r); ctx.stroke(); ctx.setLineDash([]);
  if(ed){ const n=r.length, c=centroid(r), sc=W2S(c);
    for(let i=0;i<n;i++){ const a=r[i], b=r[(i+1)%n], L=Math.hypot(b[0]-a[0],b[1]-a[1]), sm=W2S([(a[0]+b[0])/2,(a[1]+b[1])/2]); let dx=sm[0]-sc[0], dy=sm[1]-sc[1]; const D=Math.hypot(dx,dy)||1;
      // το μήκος έξω από την πλευρά, το «+» πάνω της
      const sa=W2S(a), sb=W2S(b); let ox=-(sb[1]-sa[1]), oy=sb[0]-sa[0]; const OL_=Math.hypot(ox,oy)||1; ox/=OL_; oy/=OL_; if(ox*dx+oy*dy<0){ ox=-ox; oy=-oy; }
      text(corner(i)+corner((i+1)%n)+' '+fmt(L),[sm[0]+ox*20,sm[1]+oy*20],12,col,Math.atan2(b[1]-a[1],b[0]-a[0]),'700',true);
      ctx.fillStyle=colors.sheet; ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(sm[0],sm[1],7,0,7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sm[0]-4,sm[1]); ctx.lineTo(sm[0]+4,sm[1]); ctx.moveTo(sm[0],sm[1]-4); ctx.lineTo(sm[0],sm[1]+4); ctx.stroke(); }
    for(let i=0;i<n;i++){ const s=W2S(r[i]), act=i===KO.act; let dx=s[0]-sc[0], dy=s[1]-sc[1]; const D=Math.hypot(dx,dy)||1;
      ctx.fillStyle=act?colors.sub:col; ctx.beginPath(); ctx.arc(s[0],s[1],act?8:6,0,7); ctx.fill();
      text(corner(i),[s[0]+dx/D*18,s[1]+dy/D*18],13,act?colors.sub:col,0,'700'); } }
  ctx.restore(); }
function ktCast(p,d){ let best=null; for(const room of S.rooms){ const o=OL[room.id]; if(!o) continue;
    for(const e of o.edges){ const ex=e.b[0]-e.a[0], ey=e.b[1]-e.a[1], den=d[0]*ey-d[1]*ex; if(Math.abs(den)<1e-9) continue;
      const wx=e.a[0]-p[0], wy=e.a[1]-p[1], t=(wx*ey-wy*ex)/den, s=(wx*d[1]-wy*d[0])/den;
      if(t>-1e-4&&t<40&&s>=-1e-6&&s<=1+1e-6&&(best==null||t<best)) best=t; } }
  return best; }
const KDIRS = [['Αριστερά',-1,0],['Δεξιά',1,0],['Πάνω',0,-1],['Κάτω',0,1]];
// αποστάσεις από τα 4 πλευρά του αντικειμένου ως τον πρώτο τοίχο, κατά τους άξονες του αντικειμένου
function ktRays(it){ if(!['col','furn','chim','stair'].includes(it.t)) return [];
  const ro=rad(it.rot||0), u=[Math.cos(ro),Math.sin(ro)], v=[-Math.sin(ro),Math.cos(ro)], c=[it.x,it.y];
  let mnU,mxU,mnV,mxV;
  if(it.t==='col'&&it.round){ mnU=mnV=-it.w/2; mxU=mxV=it.w/2; }
  else { const P=it.t==='stair'? stairGeo(it).polys.flat() : boxPts(it); if(!P.length) return [];
    const pu=P.map(p=>(p[0]-c[0])*u[0]+(p[1]-c[1])*u[1]), pv=P.map(p=>(p[0]-c[0])*v[0]+(p[1]-c[1])*v[1]);
    mnU=Math.min(...pu); mxU=Math.max(...pu); mnV=Math.min(...pv); mxV=Math.max(...pv); }
  const cu=(mnU+mxU)/2, cvv=(mnV+mxV)/2, at=(a,b)=>[c[0]+u[0]*a+v[0]*b, c[1]+u[1]*a+v[1]*b];
  return KDIRS.map(([lab,du,dv],k)=>{ const dir=[u[0]*du+v[0]*dv, u[1]*du+v[1]*dv];
    const a= du? at(du<0?mnU:mxU, cvv) : at(cu, dv<0?mnV:mxV); const d=ktCast(a,dir);
    return {k,lab,dir,a,d,b:d!=null?[a[0]+dir[0]*d,a[1]+dir[1]*d]:null}; }).filter(x=>x.d!=null); }
function ktDrawDist(){ const it=byId(sel); if(!it||it.room!==cur) return; const col=colors.sub;
  if(it.t==='door'||it.t==='window'){ const g=openingGeo(it); if(!g) return; const k=Math.max(0.22,22/view.s), off=p=>[p[0]+g.e.nx*k,p[1]+g.e.ny*k];
    if(g.left>0.004) ktDim(off(g.e.a),off(g.p0),g.left,col); if(g.right>0.004) ktDim(off(g.p1),off(g.e.b),g.right,col);
    ctx.save(); ctx.strokeStyle=col; ctx.globalAlpha=0.5; ctx.lineWidth=1; ctx.setLineDash([3,3]); for(const p of [g.e.a,g.p0,g.p1,g.e.b]) line(p,off(p)); ctx.restore(); return; }
  for(const x of ktRays(it)) if(x.d>0.004) ktDim(x.a,x.b,x.d,col); }
function ktDrawOver(){ if(mode==='house'){ ktDrawE9(); ktDrawRing('bld'); ktDrawRing('floor'); } else ktDrawDist(); }

// ---- πλαϊνό πάνελ: επεξεργασία περιγράμματος ----
function ktSide(){ if(!KO||mode!=='house') return false; const k=KO.k, r=ktRing(k); if(!r){ KO=null; return false; }
  const n=r.length, st=ktStat(r), sg=v=>(v>0?'+':'')+fmt(v);
  let cmp='';
  if(k==='floor'){ const fa=HOUSE.footArea; if(fa>0.01) cmp=`<dt>Μικτό από τους χώρους</dt><dd>${fmt(fa)} m²</dd><dt>Διαφορά</dt><dd>${sg(st.area-fa)} m²</dd>`; }
  else { const t=ktFromTopo(); if(t){ const ta=Math.abs(areaRing(t)); cmp+=`<dt>Κτίριο τοπογράφου</dt><dd>${fmt(ta)} m²</dd><dt>Διαφορά</dt><dd>${sg(st.area-ta)} m²</dd>`; }
    const fa=FL().ol?ktStat(FL().ol).area:HOUSE.footArea; if(fa>0.01) cmp+=`<dt>Μικτό «${esc(FL().name)}»</dt><dd>${fmt(fa)} m²</dd>`; }
  const rows=r.map((a,i)=>{ const b=r[(i+1)%n], L=Math.hypot(b[0]-a[0],b[1]-a[1]);
    return `<tr class="${i===KO.act?'cur':''}"><td><b>${corner(i)}${corner((i+1)%n)}</b></td><td><input class="kL" data-i="${i}" inputmode="decimal" autocomplete="off" value="${fmt(L)}" style="width:6.5em"></td><td style="color:var(--ink-2);white-space:nowrap">${Math.round(ktAngle(r,i)*10)/10}°</td><td style="white-space:nowrap"><button class="kbtn kAdd" data-i="${i}" title="Νέα γωνία στη μέση της πλευράς ${corner(i)}${corner((i+1)%n)}">+</button>${n>3?` <button class="kbtn kDel" data-i="${i}" title="Σβήσε τη γωνία ${corner(i)}">✕</button>`:''}</td></tr>`; }).join('');
  const what=k==='floor'?`του ορόφου «${esc(FL().name)}»`:'του κτιρίου';
  h(`<div class="eyebrow">${KNAME[k]}</div><h2>Περίγραμμα ${what}</h2>
  <p>Σύρε μια γωνία στην κάτοψη, ή γράψε το μήκος μιας πλευράς και πάτα Enter. Το <b>+</b> στη μέση μιας πλευράς βάζει νέα γωνία. Κουμπώνει σε γωνίες χώρων, τοπογράφου και στο άλλο περίγραμμα.</p>
  <dl class="sum"><dt>Εμβαδόν</dt><dd>${fmt(st.area)} m²</dd><dt>Περίμετρος</dt><dd>${fmt(st.per)} m</dd>${cmp}</dl>
  <div class="tbl"><table><thead><tr><th>Πλευρά</th><th>Μήκος (m)</th><th>Γωνία αρχής</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
  <p style="font-size:13px;color:var(--ink-2)">Το <b>+</b> στον πίνακα βάζει γωνία στη μέση της πλευράς, το <b>✕</b> σβήνει τη γωνία αρχής της. Όταν αλλάζεις μήκος, η επόμενη πλευρά μετακινείται παράλληλα, οπότε ένα ορθογώνιο μένει ορθογώνιο.</p>
  <div class="form"><div class="row">${field('kOff','Μεγάλωσε όλο κατά (m), − για μίκρυνση','0.00')}<div class="actions" style="align-items:end"><button class="btn" id="kOffGo">Εφάρμοσε</button></div></div></div>
  <div class="actions">${k==='floor'?'<button class="btn" id="kRe">Ξανά από τους χώρους</button>':''}${k==='bld'&&ktFromTopo()?'<button class="btn" id="kTopo">Ξανά από τον τοπογράφο</button>':''}${k==='bld'&&FL().ol?'<button class="btn" id="kFromF">Ίδιο με τον όροφο</button>':''}<button class="btn danger" id="kClr">Σβήσε το περίγραμμα</button></div>
  <div class="actions" style="margin-top:12px"><button class="btn primary" id="kOk">Τέλος</button></div>`);
  const ch=fn=>{ snap(); fn(); commit(); };
  side.querySelectorAll('.kL').forEach(el=>{ el.addEventListener('focus',()=>{ el.select(); if(KO.act!==+el.dataset.i){ KO.act=+el.dataset.i; render(); } });
    el.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); el.blur(); } });
    el.addEventListener('change',()=>{ const v=num(el.value); if(!(v>0.01)) return toast('Γράψε μήκος σε μέτρα'); const i=+el.dataset.i; ch(()=>ktSetLen(ktRing(k),i,v));
      const nx=side.querySelector(`.kL[data-i="${(i+1)%n}"]`); if(nx){ nx.focus(); } }); });
  side.querySelectorAll('.kAdd').forEach(b=>b.onclick=()=>{ const i=+b.dataset.i; ch(()=>{ const R=ktRing(k), a=R[i], c=R[(i+1)%R.length]; R.splice(i+1,0,[r4((a[0]+c[0])/2),r4((a[1]+c[1])/2)]); KO.act=i+1; }); });
  side.querySelectorAll('.kDel').forEach(b=>b.onclick=()=>{ const i=+b.dataset.i; ch(()=>{ ktRing(k).splice(i,1); KO.act=-1; }); });
  enterChain(['kOff'],()=>$('kOffGo').click());
  $('kOffGo').onclick=()=>{ const v=parseFloat(String($('kOff').value).replace(',','.')); if(!isFinite(v)||!v) return; const R=cleanRing(offsetRing(ktRing(k),v)); if(R.length<3||Math.abs(areaRing(R))<0.5) return toast('Πολύ μικρό περίγραμμα'); ch(()=>ktSetRing(k,ktR4(R))); };
  if($('kRe')) $('kRe').onclick=()=>{ const R=ktFromRooms(); if(!R) return toast('Δεν υπάρχουν χώροι στον όροφο'); ch(()=>ktSetRing(k,R)); };
  if($('kTopo')) $('kTopo').onclick=()=>ch(()=>ktSetRing(k,ktFromTopo()));
  if($('kFromF')) $('kFromF').onclick=()=>ch(()=>ktSetRing(k,ktR4(FL().ol)));
  armConfirm('kClr',()=>{ snap(); ktSetRing(k,null); KO=null; commit(); toast(k==='floor'?'Σβήστηκε. Το μικτό βγαίνει πάλι από τους χώρους.':'Σβήστηκε το περίγραμμα κτιρίου.'); });
  $('kOk').onclick=()=>{ KO=null; render(); renderSide(); };
  return true; }
function ktHouseBox(){ const fo=FL().ol, B=bldInfo();
  return `<div class="eyebrow" style="margin-top:14px">Περιγράμματα</div>
  <div class="tbl"><table><tbody><tr><td>Περίγραμμα ορόφου «${esc(FL().name)}»</td><td>${fo?fmt(ktStat(fo).area)+' m²':'από τους χώρους'}</td></tr>
  <tr><td>Περίγραμμα κτιρίου${S.bld?'':S.topo&&S.topo.bld?' (τοπογράφου)':''}</td><td>${B&&B.rings.length?fmt(B.area)+' m²':'—'}</td></tr></tbody></table></div>
  <div class="actions"><button class="btn" id="ktEF">Άλλαξε περίγραμμα ορόφου</button><button class="btn" id="ktEB">Άλλαξε περίγραμμα κτιρίου</button></div>${ktE9Box()}`; }
function ktHouseBind(){ ktE9Bind(); if($('ktEF')) $('ktEF').onclick=()=>ktEdit('floor'); if($('ktEB')) $('ktEB').onclick=()=>ktEdit('bld'); }

// ---- αποστάσεις στο πάνελ του αντικειμένου ----
function ktDistUI(it){ const R=ktRays(it); if(!R.length) return '';
  return `<div class="eyebrow" style="margin-top:10px">Απόσταση από τους τοίχους (m)</div><div class="row">${R.map(x=>field('kd'+x.k,x.lab,fmt(x.d))).join('')}</div>${it.rot?'<p style="font-size:12px;color:var(--ink-2)">Κατά τη στροφή του αντικειμένου.</p>':''}`; }
function ktDistBind(it,ch){ for(const x of ktRays(it)){ const el=$('kd'+x.k); if(!el) continue;
  el.addEventListener('focus',()=>el.select()); el.addEventListener('keydown',e=>{ if(e.key==='Enter') el.blur(); });
  el.addEventListener('change',()=>{ const v=num(el.value); if(!(v>=0)) return; const dd=x.d-v; ch(()=>{ it.x=r4(it.x+x.dir[0]*dd); it.y=r4(it.y+x.dir[1]*dd); }); }); } }

// ---- ομάδες χώρων (ενδιάμεσο επίπεδο, π.χ. διαμέρισμα) ----
function ktGroups(){ const s=new Set(); for(const f of S.floors) for(const r of floorData(f).rooms) if(r.grp) s.add(r.grp); return [...s]; }
function ktGrpUI(room){ return `<label class="f">Ανήκει σε (προαιρετικό, π.χ. Διαμέρισμα Α1)<input id="rGrp" list="ktGrpL" value="${esc(room.grp||'')}" autocomplete="off" placeholder="κατευθείαν στον όροφο"><datalist id="ktGrpL">${ktGroups().map(g=>`<option value="${esc(g)}">`).join('')}</datalist></label>`; }
function ktGrpBind(room){ const el=$('rGrp'); if(!el) return; el.addEventListener('keydown',e=>{ if(e.key==='Enter') el.blur(); });
  el.addEventListener('change',()=>{ const v=el.value.trim(); if((room.grp||'')===v) return; snap(); if(v) room.grp=v; else delete room.grp; commit(); }); }

// ---- δέντρο κτιρίου ----
function ktStats(){ const out=S.floors.map(f=>withFloor(f.id,()=>{ compute();
    const e9=ktE9(); return {f, e9:e9.T, net:HOUSE.net, foot:f.ol?ktStat(f.ol).area:HOUSE.footArea, rooms:S.rooms.map((r,i)=>({r,no:i+1,a:OL[r.id]?OL[r.id].area:0}))}; }));
  compute(); return out; }
function ktTreeEl(){ let el=$('ktTree'); if(el) return el;
  const st=document.createElement('style'); st.textContent=`
#ktTree{left:12px;top:44px;flex-direction:column;gap:0;width:270px;max-width:calc(100% - 24px);max-height:calc(100% - 110px);background:color-mix(in srgb,var(--sheet) 96%,transparent);border:1px solid var(--line);border-radius:8px;box-shadow:0 4px 18px rgba(0,0,0,.12);font-size:13px;z-index:3}
#ktTree .kt-h{display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--line);font-weight:600}
#ktTree .kt-h span{flex:1}
#ktTree .kt-b{overflow:auto;padding:4px 0}
#ktTree ul{list-style:none;margin:0;padding:0 0 0 14px}
#ktTree>.kt-b>ul{padding-left:4px}
#ktTree li>div{display:flex;align-items:center;gap:4px;padding:2px 4px;border-radius:5px;min-height:26px}
#ktTree li>div.act{background:var(--accent-soft);color:var(--accent);font-weight:600}
#ktTree .kt-tg{width:18px;text-align:center;cursor:pointer;color:var(--ink-2);flex:none;user-select:none}
#ktTree .kt-n{flex:1;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#ktTree .kt-n:hover{text-decoration:underline}
#ktTree .kt-a{font-family:var(--mono);font-size:12px;color:var(--ink-2);flex:none}
#ktTree .kt-e{border:1px solid var(--line);background:var(--sheet);border-radius:5px;cursor:pointer;font-size:12px;padding:1px 6px;color:var(--ink);flex:none}
#ktTree .kt-f{display:flex;gap:6px;padding:6px 8px;border-top:1px solid var(--line)}
#ktTree .kt-f .btn,#ktTree .kt-h .btn{padding:3px 8px;min-height:0;font-size:12px}
#ktTree .kt-k{font-size:11px;color:var(--ink-2);flex:none}
body.wzfull #ktTree{display:none}
#ktTree .kt-h{cursor:move;touch-action:none}
#ktTree.min .kt-b,#ktTree.min .kt-f{display:none}
.kbtn{border:1px solid var(--line);background:var(--sheet);color:var(--ink);border-radius:6px;min-width:34px;min-height:34px;font-size:16px;cursor:pointer}
.kbtn.kDel{color:var(--sub)}`;
  document.head.appendChild(st);
  el=document.createElement('div'); el.id='ktTree'; el.className='float'; $('board').appendChild(el);
  el.addEventListener('pointerdown',e=>e.stopPropagation());
  const b=document.createElement('button'); b.className='btn'; b.id='bTree'; b.textContent='Δέντρο'; b.title='Δέντρο κτιρίου: όροφοι και χώροι';
  const hd=document.querySelector('header'); hd.insertBefore(b,$('bUndo')); b.onclick=()=>{ KT.open=!KT.open; ktSave(); ktTree(); };
  return el; }
function ktPlace(el){ if(!KT.pos) return; const bd=$('board').getBoundingClientRect(), w=el.offsetWidth||270;
  const x=Math.max(0,Math.min(bd.width-Math.min(w,120),KT.pos[0])), y=Math.max(0,Math.min(bd.height-40,KT.pos[1])); el.style.left=x+'px'; el.style.top=y+'px'; }
function ktGoFloor(fid){ if(typeof wzActive==='function'&&wzActive()) wzFree(); KO=null; if(fid!==S.fl) switchFloor(fid); }
function ktTree(){ if(!S) return; const el=ktTreeEl(); $('bTree').classList.toggle('on',KT.open); el.hidden=!KT.open; el.style.display=KT.open?'':'none'; if(!KT.open) return;
  const st=ktStats(), tot=st.reduce((a,x)=>({net:a.net+x.net,foot:a.foot+x.foot}),{net:0,foot:0}), B=bldInfo();
  const tg=key=>`<span class="kt-tg" data-tg="${key}">${KT.shut.has(key)?'▸':'▾'}</span>`, sub=(key,html)=>KT.shut.has(key)?'':`<ul>${html}</ul>`;
  const actR=id=>mode==='room'? id===cur : id===selRoom;
  const roomLi=(x,fid)=>`<li><div class="${fid===S.fl&&actR(x.r.id)?'act':''}"><span class="kt-tg"></span><span class="kt-n" data-n="r:${fid}:${x.r.id}" title="Πάτα για επιλογή, διπλό πάτημα για επεξεργασία">${x.no}. ${esc(x.r.name)}</span><span class="kt-a">${fmt(x.a)}</span></div></li>`;
  const floors=st.slice().reverse().map(x=>{ const f=x.f, fk='f'+f.id, grps=[...new Set(x.rooms.filter(y=>y.r.grp).map(y=>y.r.grp))];
    const gl=grps.map(g=>{ const rs=x.rooms.filter(y=>y.r.grp===g), gk='g'+f.id+':'+g;
      return `<li><div>${tg(gk)}<span class="kt-n" data-n="f:${f.id}" title="Καθαρό της ομάδας">▤ ${esc(g)}</span><span class="kt-a">${fmt(rs.reduce((s,y)=>s+y.a,0))}</span></div>${sub(gk,rs.map(y=>roomLi(y,f.id)).join(''))}</li>`; }).join('');
    const rl=x.rooms.filter(y=>!y.r.grp).map(y=>roomLi(y,f.id)).join('');
    const fa=f.id===S.fl&&mode==='house'&&selRoom==null&&!(KO&&KO.k==='bld');
    return `<li><div class="${fa?'act':''}">${tg(fk)}<span class="kt-n" data-n="f:${f.id}" title="${f.ol?'Μικτό από το περίγραμμα ορόφου':'Μικτό από τους χώρους'}">▭ ${esc(f.name)}</span><span class="kt-a">${fmt(x.foot)}</span><button class="kt-e" data-e="f:${f.id}" title="Άλλαξε περίγραμμα ορόφου">✎</button></div>${x.e9.kyr+x.e9.voith>0?`<div style="padding:0 4px 2px 40px;font-size:11px;color:var(--ink-2);min-height:0">ΚΧ ${fmt(x.e9.kyr)} · ΒΧ ${fmt(x.e9.voith)}</div>`:''}${sub(fk,gl+rl)}</li>`; }).join('');
  el.innerHTML=`<div class="kt-h" title="Σύρε από εδώ για να το μετακινήσεις"><span>Δέντρο κτιρίου</span><button class="btn" id="ktM" title="${KT.min?'Άνοιγμα':'Μάζεμα'}">${KT.min?'▾':'▴'}</button><button class="btn" id="ktX" title="Κλείσιμο">✕</button></div>
  <div class="kt-b"><ul><li><div class="${KO&&KO.k==='bld'?'act':''}">${tg('b')}<span class="kt-n" data-n="b" title="Όλο το κτίριο">⌂ ${esc(S.name||'Κτίριο')}</span><span class="kt-a" title="Μικτό όλων των ορόφων">${fmt(tot.foot)}</span><button class="kt-e" data-e="b" title="Άλλαξε περίγραμμα κτιρίου">✎</button></div>
  ${sub('b',floors)}</li></ul>
  <div style="padding:2px 10px 4px;font-size:11px;color:var(--ink-2)">${B&&B.rings.length?'Περίγραμμα κτιρίου '+fmt(B.area)+' m² · ':''}m² μικτό ανά όροφο, καθαρό ανά χώρο</div></div>
  <div class="kt-f"><button class="btn" id="ktAF">+ Όροφος</button><button class="btn" id="ktAR">+ Χώρος</button></div>`;
  $('ktX').onclick=()=>{ KT.open=false; ktSave(); ktTree(); };
  $('ktM').onclick=()=>{ KT.min=!KT.min; ktSave(); ktTree(); };
  el.classList.toggle('min',KT.min); ktPlace(el);
  const hd=el.querySelector('.kt-h'); hd.onpointerdown=e=>{ if(e.target.closest('button')) return; e.preventDefault(); hd.setPointerCapture(e.pointerId); const r0=el.getBoundingClientRect(), bd=$('board').getBoundingClientRect(), dx=e.clientX-r0.left, dy=e.clientY-r0.top;
    hd.onpointermove=ev=>{ KT.pos=[ev.clientX-bd.left-dx, ev.clientY-bd.top-dy]; ktPlace(el); };
    hd.onpointerup=hd.onpointercancel=()=>{ hd.onpointermove=null; ktSave(); }; };
  el.querySelectorAll('[data-tg]').forEach(s=>s.onclick=()=>{ const k=s.dataset.tg; if(KT.shut.has(k)) KT.shut.delete(k); else KT.shut.add(k); ktSave(); ktTree(); });
  el.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{ const v=b.dataset.e; if(v==='b') return ktEdit('bld'); ktGoFloor(+v.slice(2)); ktEdit('floor'); });
  el.querySelectorAll('[data-n]').forEach(s=>{ const v=s.dataset.n.split(':');
    s.onclick=()=>{ if(v[0]==='b'){ if(typeof wzActive==='function'&&wzActive()) wzFree(); KO=null; if(mode!=='house') setMode('house'); else { selRoom=null; render(); renderSide(); } fit(); return; }
      const fid=+v[1]; ktGoFloor(fid);
      if(v[0]==='f'){ if(mode!=='house') setMode('house'); else { selRoom=null; render(); renderSide(); } return; }
      const rid=+v[2]; if(!roomById(rid)) return;
      if(mode==='room'){ cur=rid; sel=null; tool=null; markTool(); compute(); render(); renderSide(); fit(cur); }
      else { selRoom=rid; render(); renderSide(); } };
    if(v[0]==='r') s.ondblclick=()=>{ const rid=+v[2]; ktGoFloor(+v[1]); if(!roomById(rid)) return; selRoom=rid; setMode('room'); fit(cur); }; });
  $('ktAF').onclick=()=>{ if(typeof wzActive==='function'&&wzActive()) wzFree(); KO=null; addFloor(true); if(mode!=='house') setMode('house'); };
  $('ktAR').onclick=()=>{ if(typeof wzActive==='function'&&wzActive()) wzFree(); KO=null; newRoom(); };
}
function ktDXF(PLINE,TEXT){ const fo=FL().ol;
  if(fo){ PLINE('FLOOR-OUTLINE',fo,true); const ed=edgesOf([[fo]]); for(const e of ed){ const m=[(e.a[0]+e.b[0])/2-e.nx*0.45,(e.a[1]+e.b[1])/2-e.ny*0.45]; TEXT('FLOOR-OUTLINE',m,0.12,fmt(e.L),Math.atan2(e.uy,e.ux)); } }
  if(S.bld&&S.bld.ring) PLINE('BUILDING',S.bld.ring,true);
  for(const x of ktE9().rooms){ if(x.u!=='kyr'&&x.u!=='voith') continue; for(const poly of x.polys) for(const r of poly) PLINE('E9',r,true); } }
function ktDXFRows(row){ const E=ktE9(); if(E.sum>0){ row('Ε9 (με ½ εσωτερικών και όλους τους εξωτερικούς τοίχους): ΚΧ '+fmt(E.T.kyr)+' m², ΒΧ '+fmt(E.T.voith)+' m²',0.15);
    const grps=[...new Set(E.rooms.map(x=>x.room.grp).filter(Boolean))]; for(const g of grps){ const t={kyr:0,voith:0}; for(const x of E.rooms) if(x.room.grp===g&&t[x.u]!=null) t[x.u]+=x.e9; row('  '+g+': ΚΧ '+fmt(t.kyr)+' m², ΒΧ '+fmt(t.voith)+' m²',0.12); } }
  if(FL().ol) row('Μικτό από το περίγραμμα ορόφου: '+fmt(ktStat(FL().ol).area)+' m²',0.15); if(S.bld&&S.bld.ring) row('Περίγραμμα κτιρίου: '+fmt(ktStat(S.bld.ring).area)+' m²',0.15); }

// ---------- Ε9: κύριοι (ΚΧ) / βοηθητικοί (ΒΧ) χώροι με τοίχους ----------
// Κάθε κλειστός χώρος παίρνει το μισό πάχος των εσωτερικών τοίχων του και όλο το πάχος των εξωτερικών.
// Ημιυπαίθριοι / εξώστες μένουν με το καθαρό τους. Τρέχων όροφος (S.rooms, OL, WALLS, HOUSE από το compute).
const E9U = {kyr:'ΚΧ', voith:'ΒΧ', imiy:'Ημιυπ.', exo:'Εξώστ.'};
function ktPolyArea(P){ let a=0; for(const poly of P){ a+=Math.abs(areaRing(poly[0])); for(let i=1;i<poly.length;i++) a-=Math.abs(areaRing(poly[i])); } return a; }
function ktE9(){ const out=[], closed=[];
  for(const room of S.rooms){ const o=OL[room.id]; if(!o||!o.polys.length) continue; const u=useOf(room);
    if(isOpen(room)){ out.push({room,u,net:o.area,e9:o.area,polys:o.polys}); continue; }
    // 1) μισό εσωτερικό, όλο το εξωτερικό· όπου ο τοίχος είναι μισός εξωτερικός, πρώτα μόνο το μισό του κενού
    let P=o.polys.map((poly,pi)=>{ const r=poly[0], d=r.map((a,i)=>{ const W=WALLS.find(w=>w.room===room.id&&w.pi===pi&&w.i===i); return !W?0 : W.ext&&!W.part? W.d : W.gap/2; });
      return [varOffset(r,d)].concat(poly.slice(1)); });
    try{ if(HOUSE.foot.length) P=PC.intersection(P,HOUSE.foot); }catch(e){}
    const x={room,u,net:o.area,polys:P}; out.push(x); closed.push(x); }
  // 2) καμία επικάλυψη: ό,τι πήρε ήδη ένας χώρος δεν το ξαναπαίρνει άλλος
  let taken=[]; for(const x of closed){ try{ if(taken.length) x.polys=PC.difference(x.polys,taken); taken=taken.length?PC.union(taken,x.polys):x.polys; }catch(e){} }
  // 3) ό,τι περίσσεψε από το μικτό (εξωτερικός τοίχος σε μισό-εξωτερικές πλευρές, γωνίες) πάει στον χώρο που ακουμπά
  try{ if(HOUSE.foot.length&&closed.length){ const rest=taken.length?PC.difference(HOUSE.foot,taken):HOUSE.foot;
    for(const piece of rest){ if(Math.abs(areaRing(piece[0]))<1e-5) continue; let best=null, bd=1e9;
      for(const x of closed){ let d=0; for(const p of piece[0]){ let m=1e9; for(const poly of x.polys) for(const r of poly) for(let i=0;i<r.length;i++){ const q=segNear(p,r[i],r[(i+1)%r.length]); m=Math.min(m,Math.hypot(q[0]-p[0],q[1]-p[1])); } d+=m; } d/=piece[0].length; if(d<bd){ bd=d; best=x; } }
      if(best) best.polys=PC.union(best.polys,[piece]); } } }catch(e){}
  for(const x of closed) x.e9=ktPolyArea(x.polys);
  const T={kyr:0,voith:0,imiy:0,exo:0}; for(const x of out) T[x.u]+=x.e9;
  return {rooms:out, T, sum:T.kyr+T.voith, foot:HOUSE.footArea}; }
function ktE9Box(){ const E=ktE9(); if(!E.rooms.length) return '';
  const grps=[...new Set(E.rooms.map(x=>x.room.grp||''))], many=grps.length>1||grps[0]!=='';
  const row=x=>`<tr class="nohov"><td>${roomNo(x.room.id)}. ${esc(x.room.name)}</td><td><button class="kbtn kU" data-u="${x.room.id}" title="Άλλαξε κύριος / βοηθητικός" style="font-size:13px;min-height:30px">${E9U[x.u]}</button></td><td style="padding-left:8px">${fmt(x.net)}</td><td style="padding-left:8px"><b>${fmt(x.e9)}</b></td></tr>`;
  const sub=(g,rs)=>{ const t={kyr:0,voith:0}; for(const x of rs) if(t[x.u]!=null) t[x.u]+=x.e9; return `<tr class="nohov"><td colspan="2" style="text-align:left"><b>${esc(g||'Χωρίς ομάδα')}</b></td><td colspan="2" style="color:var(--ink-2)">ΚΧ ${fmt(t.kyr)} · ΒΧ ${fmt(t.voith)}</td></tr>`; };
  const body=grps.map(g=>{ const rs=E.rooms.filter(x=>(x.room.grp||'')===g); return (many?sub(g,rs):'')+rs.map(row).join(''); }).join('');
  const d=E.sum-E.foot, ok=Math.abs(d)<=Math.max(0.05,E.foot*0.002);
  return `<div class="eyebrow" style="margin-top:14px">Ε9 · κύριοι και βοηθητικοί με τοίχους</div>
  <p>Κάθε χώρος παίρνει το μισό πάχος των εσωτερικών τοίχων και όλο το πάχος των εξωτερικών. Πάτα ΚΧ / ΒΧ για να αλλάξεις τη χρήση.</p>
  <div class="tbl"><table><thead><tr><th>Χώρος</th><th style="padding-left:8px">Χρήση</th><th style="padding-left:8px">Καθαρό</th><th style="padding-left:8px">Ε9</th></tr></thead><tbody>${body}</tbody>
  <tfoot><tr><td>Κύριοι χώροι (ΚΧ)</td><td></td><td></td><td>${fmt(E.T.kyr)}</td></tr><tr><td>Βοηθητικοί χώροι (ΒΧ)</td><td></td><td></td><td>${fmt(E.T.voith)}</td></tr>
  <tr><td>ΚΧ + ΒΧ</td><td></td><td></td><td>${fmt(E.sum)}</td></tr><tr><td>Μικτό ορόφου</td><td></td><td></td><td>${fmt(E.foot)}</td></tr>
  <tr><td>Διαφορά</td><td></td><td></td><td style="color:var(--${ok?'ok':'warn'})">${d>0?'+':''}${fmt(d)}</td></tr>
  ${E.T.imiy>0?`<tr><td>Ημιυπαίθριοι (καθαρό)</td><td></td><td></td><td>${fmt(E.T.imiy)}</td></tr>`:''}${E.T.exo>0?`<tr><td>Εξώστες (καθαρό)</td><td></td><td></td><td>${fmt(E.T.exo)}</td></tr>`:''}</tfoot></table></div>
  ${ok?'':'<p style="font-size:12px;color:var(--warn)">Η διαφορά βγαίνει συνήθως από καμινάδες, κενά ανάμεσα σε χώρους ή τοίχους που δεν ακουμπούν σε χώρο. Δες τα στην κάτοψη.</p>'}
  <div class="actions"><button class="btn ${KT.e9?'on':''}" id="ktE9">${KT.e9?'Κρύψε τα Ε9 από την κάτοψη':'Δείξε τα Ε9 στην κάτοψη'}</button></div>`; }
function ktE9Bind(){ side.querySelectorAll('.kU').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const r=roomById(+b.dataset.u); if(!r) return; snap(); r.use=useOf(r)==='kyr'?'voith':'kyr'; commit(); });
  if($('ktE9')) $('ktE9').onclick=()=>{ KT.e9=!KT.e9; render(); renderSide(); }; }
function ktDrawE9(){ if(!KT.e9) return; const E=ktE9(); ctx.save();
  for(const x of E.rooms){ if(x.u!=='kyr'&&x.u!=='voith') continue; const col=x.u==='kyr'?colors.accent:colors.warn;
    ctx.fillStyle=col; ctx.globalAlpha=0.16; polyPath(x.polys); ctx.fill('evenodd'); ctx.globalAlpha=0.9; ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.setLineDash([6,3]); polyPath(x.polys); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha=1;
    const o=OL[x.room.id]; if(!o||!o.polys.length) continue; let big=o.polys[0]; for(const p of o.polys) if(p.area>big.area) big=p; let c=centroid(big[0]); if(!inPolys(c,o.polys)) c=big[0][0]; const s=W2S(c);
    text(E9U[x.u]+' '+fmt(x.e9)+' m²',[s[0],s[1]+(view.s>35?42:24)],12,col,0,'700',true); }
  ctx.restore(); }
