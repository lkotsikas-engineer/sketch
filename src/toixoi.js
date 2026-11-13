// ---------- Χωριστοί τοίχοι (μόνο στο αντίγραφο δοκιμής) ----------
// Ο εξωτερικός τοίχος είναι ένα κομμάτι: το περίγραμμα (ορόφου / κτιρίου / τοπογράφου) με πάχος προς τα μέσα.
// Οι εσωτερικοί τοίχοι είναι γραμμές (άξονας a-b) με πάχος t. Οι χώροι βγαίνουν μόνοι τους: ό,τι μένει ανάμεσα στους τοίχους.
// FL().wm = {walls:[{id,a,b,t,fa,fb}], et:{i:t}, sig}
//   fa/fb: τι κάνει το άκρο — null: φτάνει ως τον πρώτο τοίχο, 'j': σταθερό σημείο γωνίας Γ (γεμίζει τη γωνία), 'c': σταθερό, σταματά ακριβώς εκεί.
//   et: πάχος εξωτερικού ανά πλευρά του περιγράμματος (αλλιώς το πάχος εξωτερικών όλου του σπιτιού).
function wmOn(){ return (S&&FL()&&FL().wm)||null; }
function wmShell(){ const B=bldInfo(); return FL().ol||(S.bld&&S.bld.ring)||(B&&B.rings.length?B.rings.reduce((a,r)=>Math.abs(areaRing(r))>Math.abs(areaRing(a))?r:a):null); }
function wmExtT(){ return S.extC&&consById(S.extC)?consT(consById(S.extC)):S.ext; }
function wmEdgeT(i){ const W=wmOn(); return W&&W.et&&W.et[i]!=null? W.et[i] : wmExtT(); }
// μετατόπιση κάθε πλευράς κατά d[i] προς τα μέσα (τομή διαδοχικών παράλληλων)
function wmInset(r,d){ const n=r.length, N=ringNormals(r), out=[];
  for(let i=0;i<n;i++){ const j=(i-1+n)%n, p=r[i], n1=N[j], n2=N[i];
    const A=[p[0]-n1[0]*d[j],p[1]-n1[1]*d[j]], B=[p[0]-n2[0]*d[i],p[1]-n2[1]*d[i]], t1=[-n1[1],n1[0]], t2=[-n2[1],n2[0]], den=t1[0]*t2[1]-t1[1]*t2[0];
    if(Math.abs(den)<1e-6){ out.push(A); continue; } const k=((B[0]-A[0])*t2[1]-(B[1]-A[1])*t2[0])/den; out.push([A[0]+t1[0]*k,A[1]+t1[1]*k]); }
  return out.map(p=>[r4(p[0]),r4(p[1])]); }
function wmInner(){ const r=wmShell(); if(!r) return null; return wmInset(r,r.map((_,i)=>wmEdgeT(i))); }
function wmSig(){ const r=wmShell(), W=wmOn(); return JSON.stringify([r,wmExtT(),W&&W.et||{}]); }
const wmU=w=>{ const L=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1])||1; return [(w.b[0]-w.a[0])/L,(w.b[1]-w.a[1])/L,L]; };
function wmStrip(a,b,t,ea,eb){ const L=Math.hypot(b[0]-a[0],b[1]-a[1])||1, u=[(b[0]-a[0])/L,(b[1]-a[1])/L], n=[-u[1]*t/2,u[0]*t/2];
  const A=[a[0]-u[0]*ea,a[1]-u[1]*ea], B=[b[0]+u[0]*eb,b[1]+u[1]*eb];
  return [[A[0]+n[0],A[1]+n[1]],[B[0]+n[0],B[1]+n[1]],[B[0]-n[0],B[1]-n[1]],[A[0]-n[0],A[1]-n[1]]]; }
function wmSegsOf(r){ const s=[]; for(let i=0;i<r.length;i++) s.push([r[i],r[(i+1)%r.length]]); return s; }
// πρώτη τομή της ακτίνας p+s·u (s>eps) με τα τμήματα
function wmCast(p,u,segs){ let best=Infinity; for(const [a,b] of segs){ const ex=b[0]-a[0], ey=b[1]-a[1], den=u[0]*ey-u[1]*ex; if(Math.abs(den)<1e-12) continue;
    const wx=a[0]-p[0], wy=a[1]-p[1], s=(wx*ey-wy*ex)/den, k=(wx*u[1]-wy*u[0])/den; if(s>1e-6&&k>=-1e-9&&k<=1+1e-9&&s<best) best=s; } return best; }
// πραγματικά άκρα κάθε τοίχου: τα ελεύθερα φτάνουν ως τον πρώτο τοίχο (ή γυρνούν πίσω ως την παρειά, αν μπήκαν μέσα σε τοίχο)
function wmEff(W,inner){ const ws=W.walls; let strips=new Map(ws.map(w=>[w.id,wmStrip(w.a,w.b,w.t,w.fa==='j'?w.t/2:0,w.fb==='j'?w.t/2:0)])); let eff=new Map();
  for(let it=0;it<3;it++){ eff=new Map();
    for(const w of ws){ const [ux,uy]=wmU(w), segs=wmSegsOf(inner); const others=[];
      for(const o of ws) if(o!==w){ const st=strips.get(o.id); others.push(st); segs.push(...wmSegsOf(st)); }
      const blocked=p=>!inRing(p,inner)||others.some(st=>inRing(p,st));
      const end=(p,dir,f)=>{ if(f==='j') return [p,w.t/2]; if(f==='c') return [p,0];
        if(!blocked(p)){ const s=wmCast(p,dir,segs); return [s<200?[p[0]+dir[0]*s,p[1]+dir[1]*s]:p,0.004]; }
        const s=wmCast(p,[-dir[0],-dir[1]],segs); return [s<200?[p[0]-dir[0]*s,p[1]-dir[1]*s]:p,0.004]; };
      const A=end(w.a,[-ux,-uy],w.fa), B=end(w.b,[ux,uy],w.fb); eff.set(w.id,{a:A[0],b:B[0],ea:A[1],eb:B[1]}); }
    strips=new Map(ws.map(w=>{ const e=eff.get(w.id); return [w.id,wmStrip(e.a,e.b,w.t,e.ea,e.eb)]; })); }
  return {eff,strips}; }
function wmInPt(r){ const c=centroid(r); if(inRing(c,r)) return c; let y0=1e9,y1=-1e9; for(const p of r){ y0=Math.min(y0,p[1]); y1=Math.max(y1,p[1]); }
  for(const f of [0.5,0.3,0.7,0.15,0.85]){ const y=y0+(y1-y0)*f, xs=[]; for(let i=0;i<r.length;i++){ const a=r[i], b=r[(i+1)%r.length]; if((a[1]>y)!==(b[1]>y)) xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1])); }
    xs.sort((p,q)=>p-q); for(let k=0;k+1<xs.length;k+=2){ if(xs[k+1]-xs[k]>0.02) return [(xs[k]+xs[k+1])/2,y]; } } return c; }
// ξαναφτιάχνει τους χώρους από τους τοίχους. Γυρνά τον αριθμό των χώρων ή null αν δεν γίνεται.
function wmRegen(){ const W=wmOn(); if(!W) return null; const inner=wmInner(); if(!inner||inner.length<3) return null;
  compute(); const old=S.rooms.map(r=>({r,polys:OL[r.id]?OL[r.id].polys:[]}));
  const {strips}=wmEff(W,inner); let mp;
  try{ mp=strips.size? PC.difference([[inner.concat([inner[0]])]],...[...strips.values()].map(s=>[[s.concat([s[0]])]])) : [[inner.concat([inner[0]])]]; }catch(e){ return null; }
  const pieces=mp.map(poly=>cleanRing(poly[0].map(p=>[r4(p[0]),r4(p[1])]))).filter(r=>r.length>=3&&Math.abs(areaRing(r))>0.05);
  const taken=new Map(), keep=[];
  for(const o of old){ const r=o.r; const seed=r.seed||(o.polys.length?wmInPt(o.polys[0][0]):null); if(!seed) continue;
    const k=pieces.findIndex((pc,i)=>!taken.has(i)&&inRing(seed,pc)); if(k>=0){ taken.set(k,r); keep.push(r); } }
  // κομμάτια χωρίς χώρο: νέος χώρος, με την ομάδα και το όνομα του χώρου όπου ήταν
  pieces.forEach((pc,i)=>{ if(taken.has(i)) return; const ip=wmInPt(pc); const was=old.find(o=>o.polys.length&&inPolys(ip,o.polys));
    const base=was? was.r.name.replace(/\s*\d+$/,'') : 'Χώρος'; const id=newRoomId(); const nr={id,name:base+' '+nextNo(base)}; if(was&&was.r.grp) nr.grp=was.r.grp; if(was&&was.r.use) nr.use=was.r.use;
    S.rooms.push(nr); taken.set(i,nr); keep.push(nr); });
  const gone=S.rooms.filter(r=>!keep.includes(r));
  for(const [i,r] of taken){ ktRoomRings(r.id,[pieces[i]]); r.seed=wmInPt(pieces[i]).map(r4); delete r.walls; }
  if(gone.length){ S.items=S.items.filter(it=>!(gone.some(g=>g.id===it.room)&&isShape(it))); S.rooms=S.rooms.filter(r=>!gone.includes(r)); }
  compute();
  // πόρτες, παράθυρα κ.λπ.: στον χώρο όπου βρίσκονται
  const dOf=(it,id)=>{ const ol=OL[id]; if(!ol) return 1e9; const p=[it.x,it.y]; return (it.t==='door'||it.t==='window')? ((nearestEdge(p,ol.edges)||{d:1e9}).d) : (inPolys(p,ol.polys)?0:(nearestEdge(p,ol.edges)||{d:1e9}).d); };
  for(const it of S.items){ if(isShape(it)) continue; let best=it.room, bd=dOf(it,it.room);
    for(const r of S.rooms){ const d=dOf(it,r.id); if(d<bd-0.01){ bd=d; best=r.id; } } it.room=best; }
  // ιεραρχία: ο εξωτερικός τοίχος φτάνει ΠΑΝΤΑ ως την εξωτερική παρειά του περιγράμματος (ποτέ εσοχή),
  // όποιο κι αν είναι το πάχος του εσωτερικού δίπλα του. Πάχος = απόσταση της πλευράς του χώρου ως το περίγραμμα.
  const outer=wmSegsOf(wmShell()), T=wmExtT();
  for(const Wl of WALLS){ if(!Wl.ext||Wl.part) continue; const room=roomById(Wl.room); if(!room) continue;
    const m=[(Wl.a[0]+Wl.b[0])/2,(Wl.a[1]+Wl.b[1])/2], D=wmCast(m,Wl.on,outer);
    if(D<5&&Math.abs(D-T)>0.004) upsertOverride(room,Wl.a,Wl.b,{t:r4(D)}); }
  W.sig=wmSig(); compute(); return pieces.length; }
// αλλαγή πάχους εξωτερικών: κρατά το εξωτερικό, ξαναβγάζει τους χώρους
function wmExtChange(apply){ const W=wmOn(); snap(); apply(); compute();
  const sh=wmInner(); W.et=W.et||{}; const T=wmExtT();
  // ό,τι άλλαξε σε έναν εξωτερικό τοίχο (πάχος/κατασκευή) πάει στην πλευρά του περιγράμματος
  if(sh) for(const Wl of WALLS){ if(!Wl.ext||Wl.part||Wl.src!=='wall') continue; const m=[(Wl.a[0]+Wl.b[0])/2,(Wl.a[1]+Wl.b[1])/2];
    for(let i=0;i<sh.length;i++){ const a=sh[i], b=sh[(i+1)%sh.length], L=Math.hypot(b[0]-a[0],b[1]-a[1])||1, ux=(b[0]-a[0])/L, uy=(b[1]-a[1])/L;
      if(Math.abs(ux*Wl.uy-uy*Wl.ux)>0.01||Math.abs((m[0]-a[0])*uy-(m[1]-a[1])*ux)>0.02) continue; if(Math.abs(Wl.T-T)>1e-4) W.et[i]=r4(Wl.T); else delete W.et[i]; break; } }
  // «σε όλο το σπίτι»: δεν έμεινε καμία ρύθμιση ανά τοίχο
  if(!S.rooms.some(r=>(r.walls||[]).length)) W.et={};
  wmRegen(); commit(); toast('Άλλαξε το πάχος από μέσα. Το εξωτερικό περίγραμμα έμεινε ίδιο.'); return true; }
// μετατροπή υπάρχουσας κάτοψης (χώροι με κενά) σε τοίχους
function wmFromRooms(){ const sh=wmShell(); if(!sh) return false; compute();
  const fa=HOUSE.footArea, sa=Math.abs(areaRing(sh)); if(S.rooms.some(r=>OL[r.id]&&OL[r.id].area>0.05)&&Math.abs(fa-sa)>Math.max(0.5,sa*0.02)) return false;
  const segs=[]; for(const Wl of WALLS){ if(Wl.ext||Wl.nb==null||!(Wl.gap>0.01)) continue; const h=Wl.gap/2; segs.push({a:[Wl.a[0]+Wl.on[0]*h,Wl.a[1]+Wl.on[1]*h],b:[Wl.b[0]+Wl.on[0]*h,Wl.b[1]+Wl.on[1]*h],t:Wl.gap}); }
  // ενοποίηση: τμήματα στην ίδια ευθεία με ίδιο πάχος που επικαλύπτονται → ένας τοίχος
  const out=[]; for(const s of segs){ let ang=Math.atan2(s.b[1]-s.a[1],s.b[0]-s.a[0]); if(ang<0) ang+=Math.PI; if(ang>=Math.PI-1e-6) ang-=Math.PI; const u=[Math.cos(ang),Math.sin(ang)], n=[-u[1],u[0]];
    const off=s.a[0]*n[0]+s.a[1]*n[1], t1=s.a[0]*u[0]+s.a[1]*u[1], t2=s.b[0]*u[0]+s.b[1]*u[1]; out.push({ang,u,n,off,lo:Math.min(t1,t2),hi:Math.max(t1,t2),t:s.t}); }
  const used=new Array(out.length).fill(false), walls=[]; let id=1;
  for(let i=0;i<out.length;i++){ if(used[i]) continue; const g=out[i]; used[i]=true; let lo=g.lo, hi=g.hi, t=g.t, grow=true;
    while(grow){ grow=false; for(let j=0;j<out.length;j++){ if(used[j]) continue; const o=out[j]; if(Math.abs(o.ang-g.ang)>0.01||Math.abs(o.off-g.off)>0.02||Math.abs(o.t-t)>0.02) continue; if(o.hi<lo-0.05||o.lo>hi+0.05) continue; used[j]=true; lo=Math.min(lo,o.lo); hi=Math.max(hi,o.hi); grow=true; } }
    const P=k=>[r4(g.u[0]*k+g.n[0]*g.off),r4(g.u[1]*k+g.n[1]*g.off)]; walls.push({id:id++,a:P(lo),b:P(hi),t:r4(t),fa:null,fb:null}); }
  for(const r of S.rooms) if(OL[r.id]&&OL[r.id].polys.length) r.seed=wmInPt(OL[r.id].polys[0][0]).map(r4);
  FL().wm={walls,et:{},next:id}; return true; }
// ξεκίνημα (από το «Χώρισε με τη γραφίδα»): κάτοψη από περίγραμμα → τοίχοι
function wmEnsure(){ if(wmOn()) return true; const pre=snapStr();
  // χωρίς περίγραμμα: το περίγραμμα ορόφου γίνεται το εξωτερικό των χώρων που υπάρχουν
  if(!wmShell()){ const R=typeof ktFromRooms==='function'?ktFromRooms():null; if(!R||Math.abs(areaRing(R))<1) return false; FL().ol=R; }
  if(!wmFromRooms()){ restore(pre); compute(); return false; }
  const n=wmRegen(); if(n==null){ restore(pre); compute(); return false; } undoS.push(pre); redoS=[]; updUndo(); commit(); return true; }
function wmHit(p){ const W=wmOn(), inner=wmInner(); if(!W||!inner) return null; const {strips}=wmEff(W,inner); for(const w of W.walls){ const st=strips.get(w.id); if(st&&inRing(p,st)) return w; } return null; }
function wmAxisOf(w){ const [ux,uy,L]=wmU(w); return {ux,uy,L,n:[-uy,ux]}; }
// μετακίνηση τοίχου κατά d κάθετα (θετικό = προς το n του τοίχου) — μαζί και ό,τι ακουμπά πάνω του
function wmCarry(W,w,d){ const {ux,uy,L,n}=wmAxisOf(w); const off=q=>(q[0]-w.a[0])*n[0]+(q[1]-w.a[1])*n[1], al=q=>(q[0]-w.a[0])*ux+(q[1]-w.a[1])*uy;
  for(const o of W.walls){ if(o===w) continue; for(const k of ['a','b']){ const p=o[k], f=o['f'+k];
      if(Math.abs(off(p))<=w.t/2+0.02&&al(p)>-w.t-0.05&&al(p)<L+w.t+0.05&&(f==='j'||!f)){ o[k]=[r4(p[0]+n[0]*d),r4(p[1]+n[1]*d)]; } } } }
function wmShift(w,d){ const {n}=wmAxisOf(w); w.a=[r4(w.a[0]+n[0]*d),r4(w.a[1]+n[1]*d)]; w.b=[r4(w.b[0]+n[0]*d),r4(w.b[1]+n[1]*d)]; }
function wmMove(w,d){ const W=wmOn(); const pre=snapStr(), before=S.rooms.length;
  wmCarry(W,w,d); wmShift(w,d);
  const c=wmRegenL(); if(c==null||c<before){ restore(pre); compute(); render(); renderSide(); return toast('Δεν χωράει εκεί: θα χανόταν χώρος. Μετακίνησέ τον λιγότερο.'); }
  undoS.push(pre); if(undoS.length>80) undoS.shift(); redoS=[]; updUndo(); commit(); toast('Ο τοίχος μετακινήθηκε '+cm(Math.abs(d))+' εκ.'); }
// γραμμή της γραφίδας → τοίχοι (ίσιωμα ως προς τον τοίχο από τον οποίο ξεκινά)
function wmNearDir(p){ const W=wmOn(), inner=wmInner(); let best=null, bd=1e9; const test=(a,b)=>{ const q=segNear(p,a,b), d=Math.hypot(q[0]-p[0],q[1]-p[1]); if(d<bd){ bd=d; best=Math.atan2(b[1]-a[1],b[0]-a[0]); } };
  if(inner) for(const [a,b] of wmSegsOf(inner)) test(a,b); return best==null?0:best; }
function wmCutFinish(raw){ const W=wmOn(), t=KT.cut.t; let P=penRdp(raw,Math.max(0.12,10/view.s)); if(P.length<2) return;
  const snapped=P.map(p=>{ const c=ktNearCorner(p,26); return c?c.slice():null; }); P=P.map((p,i)=>snapped[i]||p);
  if(!snapped[0]&&snapped[P.length-1]){ P.reverse(); snapped.reverse(); }
  if(Math.hypot(P[P.length-1][0]-P[0][0],P[P.length-1][1]-P[0][1])<0.3&&P.length<3) return toast('Πολύ μικρή γραμμή');
  const ax=wmNearDir(P[0]);
  const Q=[P[0].slice()]; for(let i=1;i<P.length;i++){ const a=Q[Q.length-1], b=P[i]; let ang=Math.atan2(b[1]-a[1],b[0]-a[0]); if(Math.hypot(b[0]-a[0],b[1]-a[1])<0.05) continue;
    const st=KT.cut.o90?Math.PI/2:Math.PI/4; ang=ax+Math.round((ang-ax)/st)*st;
    const L=(b[0]-a[0])*Math.cos(ang)+(b[1]-a[1])*Math.sin(ang); Q.push([a[0]+Math.cos(ang)*L,a[1]+Math.sin(ang)*L]); }
  const R=[Q[0]]; for(let i=1;i<Q.length;i++){ if(R.length>=2){ const a=R[R.length-2], b=R[R.length-1], c=Q[i]; if(Math.abs((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]))<1e-6){ R[R.length-1]=c; continue; } } R.push(Q[i]); }
  if(R.length<2) return;
  // άκρο σε γωνία: η παρειά του τοίχου συνεχίζει την πλευρά της γωνίας
  const flush=(i0,i1)=>{ const a=R[i0], b=R[i1], L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L<1e-4) return; const e=ktFaceAt(a,[(b[0]-a[0])/L,(b[1]-a[1])/L]); if(!e) return; const v=[e.nx*t/2,e.ny*t/2]; for(const k of [i0,i1]) R[k]=[R[k][0]+v[0],R[k][1]+v[1]]; };
  if(snapped[0]) flush(0,1); if(snapped[snapped.length-1]&&R.length>2) flush(R.length-1,R.length-2);
  compute(); const preTiny=S.rooms.filter(r=>OL[r.id]&&OL[r.id].area<0.8).length; const pre=snapStr(), before=S.rooms.length; W.next=W.next||(Math.max(0,...W.walls.map(w=>w.id))+1);
  for(let i=0;i+1<R.length;i++){ W.walls.push({id:W.next++,a:R[i].map(r4),b:R[i+1].map(r4),t:r4(t),fa:i>0?'j':(snapped[0]?'c':null),fb:i+2<R.length?'j':(snapped[snapped.length-1]?'c':null)}); }
  const c=wmRegenL(); if(c==null){ restore(pre); compute(); render(); return toast('Δεν μπόρεσα να φτιάξω τον τοίχο'); }
  if(c<=before){ restore(pre); compute(); render(); renderSide(); return toast('Η γραμμή δεν χωρίζει κανέναν χώρο. Τράβηξέ τη από τοίχο σε τοίχο, μέσα στον χώρο.'); }
  const tiny=S.rooms.filter(r=>OL[r.id]&&OL[r.id].area<0.8);
  if(tiny.length&&tiny.length>preTiny){ restore(pre); compute(); render(); renderSide(); return toast('Η γραμμή θα έφτιαχνε πολύ μικρό χώρο ('+fmt(Math.min(...tiny.map(r=>OL[r.id].area)))+' m²). Τράβηξέ τη ξανά, πιο ίσια, από τοίχο σε τοίχο.'); }
  undoS.push(pre); if(undoS.length>80) undoS.shift(); redoS=[]; updUndo(); selRoom=null; commit();
  toast(c>before? 'Μπήκε τοίχος '+cm(t)+' εκ.: '+c+' χώροι.' : 'Μπήκε τοίχος '+cm(t)+' εκ. Δεν χώρισε χώρο: τράβηξέ τον από τοίχο σε τοίχο.'); }
// πάνελ εσωτερικού τοίχου (όταν πατάς πάνω του)
let wmSelId=null;
function wmWallOf(Wl){ const W=wmOn(); if(!W||Wl.ext) return null; const h=Wl.gap/2, m=[(Wl.a[0]+Wl.b[0])/2+Wl.on[0]*h,(Wl.a[1]+Wl.b[1])/2+Wl.on[1]*h]; return wmHit(m); }
function wmWallPanel(Wl){ if(!wmOn()&&!wmEnsure()) return false; const w=wmWallOf(Wl); if(!w) return false; const W=wmOn(); const {n}=wmAxisOf(w);
  const room=roomById(Wl.room), nb=Wl.nb!=null?roomById(Wl.nb):null, s=Wl.on[0]*n[0]+Wl.on[1]*n[1];   // s>0: ο «room» είναι προς το -n
  h(`<div class="eyebrow">Εσωτερικός τοίχος</div><h2>${esc(room?room.name:'')}${nb?' · '+esc(nb.name):''}</h2>
  <dl class="sum"><dt>Μήκος άξονα</dt><dd>${fmt(wmU(w)[2])} m</dd><dt>Πάχος</dt><dd>${fmt(w.t)} m</dd></dl>
  <div class="form"><div class="row">${field('wmT','Πάχος (m)',fmt(w.t))}<div class="actions" style="align-items:end"><button class="btn primary" id="wmTGo">Άλλαξε</button></div></div>
  <label class="f">Όταν αλλάζει το πάχος, μένει<select id="wmKeep"><option value="c">ο άξονας (αλλάζουν και οι δύο χώροι)</option>${room?`<option value="r">η παρειά προς «${esc(room.name)}»</option>`:''}${nb?`<option value="n">η παρειά προς «${esc(nb.name)}»</option>`:''}</select></label></div>
  <p style="font-size:13px;color:var(--ink-2)">Για να τον μετακινήσεις: «Χώρισε με τη γραφίδα» › «Μετακίνησε».</p>
  <div class="actions" style="margin-top:12px"><button class="btn danger" id="wmDel">Σβήσε τον τοίχο</button><button class="btn" id="wmOk">Τέλος</button></div>`);
  const go=()=>{ const v=num($('wmT').value); if(!(v>0.02&&v<1.5)) return toast('Γράψε πάχος σε μέτρα, π.χ. 0.20'); const k=$('wmKeep').value, dt=v-w.t;
    // μένει η παρειά: ο άξονας πάει μισή διαφορά προς την άλλη πλευρά
    let sh=0; if(k==='r') sh=(s>0?1:-1)*dt/2; else if(k==='n') sh=(s>0?-1:1)*dt/2;
    const pre=snapStr(); w.t=r4(v); if(sh){ w.a=[r4(w.a[0]+n[0]*sh),r4(w.a[1]+n[1]*sh)]; w.b=[r4(w.b[0]+n[0]*sh),r4(w.b[1]+n[1]*sh)]; }
    if(wmRegenL()==null){ restore(pre); compute(); return toast('Δεν γίνεται'); } undoS.push(pre); redoS=[]; updUndo(); selWall=null; commit(); toast('Ο τοίχος έγινε '+cm(v)+' εκ.'); };
  $('wmTGo').onclick=go; enterChain(['wmT'],go);
  armConfirm('wmDel',()=>{ const pre=snapStr(); W.walls=W.walls.filter(x=>x!==w); if(wmRegenL()==null){ restore(pre); compute(); return; } undoS.push(pre); redoS=[]; updUndo(); selWall=null; commit(); toast('Ο τοίχος σβήστηκε· οι δύο χώροι έγιναν ένας.'); });
  $('wmOk').onclick=()=>{ selWall=null; render(); renderSide(); };
  return true; }
// ο εξωτερικός ή το περίγραμμα άλλαξε από αλλού (π.χ. «Άλλαξε περίγραμμα ορόφου»): ξαναβγάλε τους χώρους
function wmSync(){ const W=wmOn(); if(!W||W.sig===wmSig()) return; if(wmRegen()!=null){ save(); render(); } }
function wmOffUI(){ const W=wmOn(); if(!W) return ''; const B=bldInfo(), fo=FL().ol, ba=B&&B.rings.length?B.area:0, fa=fo?Math.abs(areaRing(fo)):0;
  const warn=fo&&ba&&Math.abs(fa-ba)>Math.max(1,ba*0.05);
  return `<div class="note">Χωριστοί τοίχοι: ο εξωτερικός μένει στο ${fo?'περίγραμμα ορόφου ('+fmt(fa)+' m²)':'περίγραμμα κτιρίου ('+fmt(ba)+' m²)'}, οι χώροι βγαίνουν από τους εσωτερικούς τοίχους (${W.walls.length}). <button class="kbtn" id="wmStop" style="font-size:13px">Σταμάτα τους χωριστούς τοίχους</button></div>
  ${warn?`<div class="note warn">Το περίγραμμα ορόφου (${fmt(fa)} m²) δεν είναι ίδιο με το περίγραμμα κτιρίου (${fmt(ba)} m²). Αν θέλεις το κτίριο: «Νέα κάτοψη από τον τοπογράφο» (στο «Αρχείο κάτοψης») ή «Άλλαξε περίγραμμα ορόφου» › «Ίδιο με το κτίριο».</div>`:''}`; }
function wmOffBind(){ if($('wmIntAll')){ $('wmIntAll').onmousedown=e=>e.preventDefault(); $('wmIntAll').onclick=wmIntAll; } if($('wmStop')) armConfirm('wmStop',()=>{ snap(); delete FL().wm; for(const r of S.rooms) delete r.seed; commit(); toast('Οι χώροι μένουν όπως είναι, χωρίς χωριστούς τοίχους.'); }); }

// επίπεδο 2: όλοι οι εσωτερικοί τοίχοι μαζί (ο άξονας μένει, ο εξωτερικός δεν αλλάζει)
function wmIntUI(){ return `<div class="actions"><button class="btn" id="wmIntAll">Βάλε το πάχος σε όλους τους εσωτερικούς</button></div>`; }
function wmIntAll(){ const v=num($('wInt')?$('wInt').value:S.int); if(!(v>0.02&&v<1.5)) return toast('Γράψε πάχος σε μέτρα, π.χ. 0.20');
  if(document.activeElement&&document.activeElement.blur) document.activeElement.blur();
  if(!wmOn()&&!wmEnsure()) return toast('Χρειάζεται περίγραμμα ή χώροι'); const W=wmOn(), pre=snapStr(), before=S.rooms.length;
  S.int=r4(v); for(const w of W.walls) w.t=r4(v); const c=wmRegenL(); if(c==null||c<before){ restore(pre); compute(); render(); renderSide(); return toast('Δεν χωράει: κάποιος χώρος θα χανόταν.'); }
  undoS.push(pre); redoS=[]; updUndo(); commit(); toast('Όλοι οι εσωτερικοί τοίχοι: '+cm(v)+' εκ. Ο εξωτερικός έμεινε ίδιος.'); }
function wmHierUI(){ return `<div class="note"><b>Σειρά:</b> 1) εξωτερικός τοίχος, πάνω στο περίγραμμα, δεν αλλάζει από τα άλλα · 2) εσωτερικοί τοίχοι · 3) χώροι, βγαίνουν μόνοι τους ανάμεσα στους τοίχους.</div>`; }

// ---------- μέτρηση χώρου → εσωτερικοί τοίχοι (ιεραρχία: εξωτερικός > έτοιμοι χώροι > τοίχοι) ----------
const WM_DT=0.05, WM_TMIN=0.08, WM_TMAX=0.60;
function wmRoomOk(id){ return !!wmOn()&&roomItems(id).some(i=>isShape(i)&&i.src&&i.src.k==='walls'); }
function wmSides(id){ const C=roomCorners(id), n=C.length; return C.map((p,i)=>{ const q=C[(i+1)%n], L=Math.hypot(q[0]-p[0],q[1]-p[1])||1; return {a:p,b:q,L,u:[(q[0]-p[0])/L,(q[1]-p[1])/L],m:[(p[0]+q[0])/2,(p[1]+q[1])/2]}; }); }
function wmOutN(id,s){ let n=[-s.u[1],s.u[0]]; if(inPolys([s.m[0]+n[0]*0.01,s.m[1]+n[1]*0.01],OL[id].polys)) n=[-n[0],-n[1]]; return n; }
function wmMatch(sides,ms){ let best=-1, bd=1e9; sides.forEach((s,i)=>{ if(Math.abs(s.u[0]*ms.u[1]-s.u[1]*ms.u[0])>0.01) return;
    if(Math.abs((ms.p[0]-s.a[0])*s.u[1]-(ms.p[1]-s.a[1])*s.u[0])>0.03) return; const t=(ms.p[0]-s.a[0])*s.u[0]+(ms.p[1]-s.a[1])*s.u[1], d=t<0?-t:t>s.L?t-s.L:0; if(d<bd){ bd=d; best=i; } }); return best; }
function wmMeasMap(id){ const room=roomById(id), Sd=wmSides(id), out={}; for(const ms of (room&&room.ms)||[]){ const i=wmMatch(Sd,ms); if(i>=0) out[i]=ms.m; } return out; }
function wmChecks(id){ if(!wmRoomOk(id)) return []; const Sd=wmSides(id), M=wmMeasMap(id), n=Sd.length;
  return Object.keys(M).map(i=>{ i=+i; const diff=Math.abs(M[i]-Sd[i].L); return {lbl:'Πλευρά '+corner(i)+corner((i+1)%n),meas:M[i],calc:Sd[i].L,diff,lvl:lvlOf(diff)}; }).filter(c=>c.lvl!=='ok'); }
// δοκιμάζει: ολόκληρος ο τοίχος στην άκρη της πλευράς μετακινείται (ο διπλανός χώρος αλλάζει),
// αλλιώς μόνο η παρειά του (αλλάζει το πάχος, έως ±5 εκ.). Ποτέ ο εξωτερικός, ποτέ έτοιμος χώρος, ποτέ άλλη μετρημένη πλευρά.
function wmMeasure(id,i,v){ const Sd=wmSides(id), n=Sd.length, s=Sd[i]; if(!s) return {ok:false};
  const room0=roomById(id), msOld=((room0&&room0.ms)||[]).filter(ms=>wmMatch(Sd,ms)!==i), prev=((room0&&room0.ms)||[]).find(ms=>wmMatch(Sd,ms)===i), today=new Date().toISOString().slice(0,10),
    rec={p:s.m.map(r4),u:s.u.map(x=>r4(x)),m:r4(v),d:today,h:prev?(prev.h||[]).concat(Math.abs(prev.m-v)>1e-4?[{m:prev.m,d:prev.d||''}]:[]):[]};
  const pre=snapStr(), finish=(ok,how)=>{ const r=roomById(id); r.ms=msOld.concat([rec]); if(ok) { undoS.push(pre); if(undoS.length>80) undoS.shift(); redoS=[]; updUndo(); } commit(); return {ok,how,diff:v-wmSides(id)[i].L}; };
  const delta=v-s.L; if(Math.abs(delta)<0.003){ snap(); return finish(true,'same'); }
  const before=S.rooms.length, locked=S.rooms.filter(r=>r.id!==id&&wmLocked(r)).map(r=>[r.id,OL[r.id]?OL[r.id].area:0]);
  const cands=[]; let ext=0, lockHit=0;
  for(const j of [(i+1)%n,(i-1+n)%n]){ const e=Sd[j], o=wmOutN(id,e), w=wmHit([e.m[0]+o[0]*0.02,e.m[1]+o[1]*0.02]); if(!w){ ext++; continue; }
    const sin=Math.abs(s.u[0]*e.u[1]-s.u[1]*e.u[0]); if(sin<0.2) continue; cands.push({id:w.id,o,d:delta*sin,face:false},{id:w.id,o,d:delta*sin,face:true}); }
  const good=()=>{ compute(); if(S.rooms.length<before) return false; for(const [rid,a] of locked){ if(!OL[rid]||Math.abs(OL[rid].area-a)>0.003){ lockHit++; return false; } }
    const Sd2=wmSides(id); for(const ms of msOld){ const k=wmMatch(Sd2,ms); if(k>=0&&Math.abs(Sd2[k].L-ms.m)>0.004) return false; }
    const k=wmMatch(Sd2,{p:s.m,u:s.u}); return k>=0&&Math.abs(Sd2[k].L-v)<0.01; };
  for(const c of cands) for(const sg of [1,-1]){ restore(pre); compute(); const W=wmOn(), w=W.walls.find(x=>x.id===c.id); if(!w) continue; const {n:wn}=wmAxisOf(w), dir=(c.o[0]*wn[0]+c.o[1]*wn[1])>0?1:-1, d=c.d*sg;
    if(c.face){ const t=r4(w.t-d), t0=w.t0!=null?w.t0:w.t; if(Math.abs(t-t0)>WM_DT+1e-6||t<WM_TMIN||t>WM_TMAX) continue; if(w.t0==null) w.t0=w.t; wmCarry(W,w,dir*d/2); wmShift(w,dir*d/2); w.t=t; }
    else { wmCarry(W,w,dir*d); wmShift(w,dir*d); }
    WM_FREE=id; const rg=wmRegenL(); WM_FREE=null; if(rg==null) continue; if(good()) return finish(true,c.face?'face':'wall'); }
  restore(pre); compute(); return finish(false, ext>=2?'ext':lockHit?'locked':'none'); }
function wmMeasMsg(r,lbl){ const d=cm(Math.abs(r.diff||0));
  if(r.ok) return r.how==='face'?lbl+': ο διπλανός χώρος είναι έτοιμος, άλλαξε το πάχος του τοίχου.':r.how==='same'?lbl+': ίδιο με το σχέδιο.':lbl+': μετακινήθηκε ο εσωτερικός τοίχος.';
  return lbl+': διαφορά '+d+' εκ. Δεν άλλαξε τίποτα, '+(r.how==='ext'?'γιατί στις άκρες είναι ο εξωτερικός τοίχος.':r.how==='locked'?'γιατί θα άλλαζε έτοιμος χώρος ή ο τοίχος θα έβγαινε πάνω από ±5 εκ.':'γιατί θα άλλαζε άλλη μετρημένη πλευρά.')+' Φαίνεται στον «Έλεγχο κλεισίματος».'; }
// ---------- αρχείο αποτύπωσης: οι μετρήσεις μένουν πάντα, οι διαφορές φαίνονται στην κάτοψη ----------
function wmRec(id){ const room=roomById(id); if(!room||!(room.ms||[]).length||!OL[id]) return []; const Sd=wmSides(id), n=Sd.length;
  return room.ms.map(ms=>{ const i=wmMatch(Sd,ms); const calc=i>=0?Sd[i].L:null, diff=calc==null?null:ms.m-calc;
    return {i, lbl:i>=0?corner(i)+corner((i+1)%n):'—', ms, calc, diff, lvl:diff==null?'bad':lvlOf(Math.abs(diff)), s:i>=0?Sd[i]:null}; }).sort((a,b)=>a.i-b.i); }
function wmRecUI(id){ const R=wmRec(id); if(!R.length) return '';
  const dd=d=>d?d.split('-').reverse().join('/'):'';
  return `<div class="tbl"><table><thead><tr><th>Πλευρά</th><th>Μέτρηση</th><th>Σχέδιο</th><th>Διαφορά</th></tr></thead><tbody>${R.map(r=>`<tr${r.lvl!=='ok'?' style="color:var(--sub)"':''}><td>${r.lbl}</td><td>${fmt(r.ms.m)}${r.ms.d?`<br><small>${dd(r.ms.d)}</small>`:''}${(r.ms.h||[]).length?`<br><small>πριν: ${r.ms.h.map(x=>fmt(x.m)).join(', ')}</small>`:''}</td><td>${r.calc==null?'—':fmt(r.calc)}</td><td>${r.diff==null?'η πλευρά άλλαξε':(r.lvl==='ok'?'✓ ':'⚠ ')+(r.diff>0?'+':'')+cm(r.diff)+' εκ.'}</td></tr>`).join('')}</tbody></table></div>`; }
function wmRecAll(){ const rows=S.rooms.filter(r=>(r.ms||[]).length); if(!rows.length) return '';
  const bad=rows.map(r=>({r,n:wmRec(r.id).filter(x=>x.lvl!=='ok').length})).filter(x=>x.n);
  return `<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:600">Αρχείο αποτύπωσης (${rows.length} ${rows.length===1?'χώρος':'χώροι'}${bad.length?', ⚠ '+bad.length+' με διαφορές':''})</summary>
  <p style="font-size:13px;color:var(--ink-2)">Οι μετρήσεις μένουν όπως τις πήρες. Όπου διαφέρουν από το σχέδιο, η πλευρά σημειώνεται με πορτοκαλί στην κάτοψη.</p>
  ${rows.map(r=>`<h3 style="font-size:14px;margin:10px 0 4px">${wmLocked(r)?'🔒 ':''}${esc(r.name)}</h3>${wmRecUI(r.id)}`).join('')}</details>`; }
function wmDrawErr(){ wmDrawLocks(); const ids=mode==='house'?S.rooms.map(r=>r.id):[cur]; ctx.save();
  for(const id of ids){ for(const r of wmRec(id)){ if(!r.s||r.lvl==='ok') continue; const s=r.s, o=wmOutN(id,s), k=-6/view.s;
      const A=W2S([s.a[0]+o[0]*k,s.a[1]+o[1]*k]), B=W2S([s.b[0]+o[0]*k,s.b[1]+o[1]*k]);
      ctx.strokeStyle=r.lvl==='bad'?'#b91c1c':'#c2410c'; ctx.lineWidth=4; ctx.setLineDash([10,6]); ctx.beginPath(); ctx.moveTo(A[0],A[1]); ctx.lineTo(B[0],B[1]); ctx.stroke(); ctx.setLineDash([]);
      const k2=-22/view.s, M=W2S([s.m[0]+o[0]*k2,s.m[1]+o[1]*k2]);
      text('⚠ μετρ. '+fmt(r.ms.m)+' · σχ. '+fmt(r.calc)+' ('+(r.diff>0?'+':'')+cm(r.diff)+')',M,12,r.lvl==='bad'?'#b91c1c':'#c2410c',Math.atan2(s.u[1],s.u[0]),'700',true); } }
  ctx.restore(); }
// ---------- κλείδωμα χώρου: κανένας τοίχος/γραμμή/πάχος δεν τον αλλάζει (μόνο ο εξωτερικός, που είναι πάνω στην ιεραρχία) ----------
let WM_FREE=null;
function wmLocked(r){ return r.lock!=null? !!r.lock : !!r.wz; }
function wmRegenL(){ compute(); const L=S.rooms.filter(r=>wmLocked(r)&&r.id!==WM_FREE).map(r=>({r,id:r.id,name:r.name,a:OL[r.id]?OL[r.id].area:0,p:OL[r.id]?OL[r.id].per:0}));
  const c=wmRegen(); if(c==null) return null;
  const hit=L.find(x=>!OL[x.id]||Math.abs(OL[x.id].area-x.a)>0.003||Math.abs(OL[x.id].per-x.p)>0.004);
  if(hit){ setTimeout(()=>toast('🔒 Ο χώρος «'+hit.name+'» είναι κλειδωμένος και θα άλλαζε. Ξεκλείδωσέ τον πρώτα.'),30); return null; } return c; }
function wmLockUI(room){ if(!room) return ''; const on=wmLocked(room);
  return `<div class="actions"><button class="btn${on?' primary':''}" data-lock="${room.id}">${on?'🔒 Κλειδωμένος · Ξεκλείδωσε':'🔓 Κλείδωσε τον χώρο'}</button></div>
  ${on?'<div class="note">Κλειδωμένος: καμία κίνηση ή αλλαγή πάχους εσωτερικού τοίχου δεν τον αλλάζει. Αλλάζει μόνο αν αλλάξεις τον εξωτερικό τοίχο.</div>':''}`; }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-lock]'); if(!b) return; const r=roomById(+b.dataset.lock)||roomById(b.dataset.lock); if(!r) return;
  snap(); r.lock=!wmLocked(r); commit(); toast(r.lock?'🔒 Ο χώρος «'+r.name+'» κλειδώθηκε.':'🔓 Ο χώρος «'+r.name+'» ξεκλειδώθηκε.'); });
function wmDrawLocks(){ if(mode!=='house') return; ctx.save(); for(const r of S.rooms){ if(!wmLocked(r)||!OL[r.id]||!OL[r.id].polys.length) continue; const C=roomCorners(r.id); if(!C.length) continue; const P=W2S(C[0]); text('🔒',[P[0]+14,P[1]+14],13,colors.ink||'#222',0,'500'); } ctx.restore(); }
// DXF: layer APOTYPOSI = για κάθε χώρο οι μετρήσεις όπως πάρθηκαν (πλευρά, μέτρηση, σχέδιο, διαφορά, ημερομηνία)
function wmDXF(PLINE,TEXT){ const dd=d=>d?d.split('-').reverse().join('/'):'';
  for(const room of S.rooms){ const R=wmRec(room.id); if(!R.length) continue; const o=OL[room.id]; if(!o||!o.polys.length) continue;
    const c=wmInPt(o.polys[0][0]); TEXT('APOTYPOSI',[c[0],c[1]+0.45],0.10,'Αποτύπωση'+(wmLocked(room)?' (κλειδωμένος)':'')+(R[0].ms.d?' '+dd(R[0].ms.d):''),0);
    for(const r of R){ if(!r.s) continue; const s=r.s, n=wmOutN(room.id,s), k=-0.12, A=[s.a[0]+n[0]*k,s.a[1]+n[1]*k], B=[s.b[0]+n[0]*k,s.b[1]+n[1]*k];
      PLINE('APOTYPOSI',[A,B],false); const k2=-0.25, M=[s.m[0]+n[0]*k2,s.m[1]+n[1]*k2];
      const t=r.lbl+' μετρ. '+fmt(r.ms.m)+' / σχ. '+fmt(r.calc)+(r.lvl==='ok'?' ΟΚ':' ΔΙΑΦΟΡΑ '+(r.diff>0?'+':'')+cm(r.diff)+' εκ.')+((r.ms.h||[]).length?' (πριν '+r.ms.h.map(x=>fmt(x.m)).join(', ')+')':'');
      TEXT('APOTYPOSI',M,0.08,t,Math.atan2(s.u[1],s.u[0])); } } }
window.__wm={wmLocked:r=>wmLocked(r),move:(id,d)=>{ const w=wmOn().walls.find(x=>x.id===id); wmMove(w,d); },wmRec:id=>wmRec(id),wmMeasure:(...a)=>wmMeasure(...a),wmSides:id=>wmSides(id),wmMeasMap:id=>wmMeasMap(id),wmChecks:id=>wmChecks(id),wmEnsure:()=>wmEnsure(),OL:id=>OL[id],walls:()=>wmOn()&&wmOn().walls,wzGo:(s,id)=>{ if(id!=null){ cur=id; WZ.room=id; } WZ.on=true; WZ.free=false; wzGo(s); }};
