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
  // πάχος εξωτερικού ανά πλευρά του περιγράμματος
  const sh=inner, T=wmExtT();
  for(const Wl of WALLS){ if(!Wl.ext) continue; const m=[(Wl.a[0]+Wl.b[0])/2,(Wl.a[1]+Wl.b[1])/2];
    for(let i=0;i<sh.length;i++){ const a=sh[i], b=sh[(i+1)%sh.length], L=Math.hypot(b[0]-a[0],b[1]-a[1])||1, ux=(b[0]-a[0])/L, uy=(b[1]-a[1])/L;
      if(Math.abs(ux*Wl.uy-uy*Wl.ux)>0.01) continue; if(Math.abs((m[0]-a[0])*uy-(m[1]-a[1])*ux)>0.01) continue; const tt=(m[0]-a[0])*ux+(m[1]-a[1])*uy; if(tt<-0.01||tt>L+0.01) continue;
      const want=wmEdgeT(i); if(Math.abs(want-T)>1e-4){ const room=roomById(Wl.room); if(room) upsertOverride(room,Wl.a,Wl.b,{t:r4(want)}); } break; } }
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
function wmEnsure(){ if(wmOn()) return true; if(!wmShell()) return false; const pre=snapStr(); if(!wmFromRooms()) return false;
  const n=wmRegen(); if(n==null){ restore(pre); compute(); return false; } undoS.push(pre); redoS=[]; updUndo(); commit(); return true; }
function wmHit(p){ const W=wmOn(), inner=wmInner(); if(!W||!inner) return null; const {strips}=wmEff(W,inner); for(const w of W.walls){ const st=strips.get(w.id); if(st&&inRing(p,st)) return w; } return null; }
function wmAxisOf(w){ const [ux,uy,L]=wmU(w); return {ux,uy,L,n:[-uy,ux]}; }
// μετακίνηση τοίχου κατά d κάθετα (θετικό = προς το n του τοίχου) — μαζί και ό,τι ακουμπά πάνω του
function wmMove(w,d){ const W=wmOn(); const {ux,uy,L,n}=wmAxisOf(w); const off=q=>(q[0]-w.a[0])*n[0]+(q[1]-w.a[1])*n[1], al=q=>(q[0]-w.a[0])*ux+(q[1]-w.a[1])*uy;
  const pre=snapStr(), before=S.rooms.length;
  for(const o of W.walls){ if(o===w) continue; for(const k of ['a','b']){ const p=o[k], f=o['f'+k];
      if(Math.abs(off(p))<=w.t/2+0.02&&al(p)>-w.t-0.05&&al(p)<L+w.t+0.05&&(f==='j'||!f)){ o[k]=[r4(p[0]+n[0]*d),r4(p[1]+n[1]*d)]; } } }
  w.a=[r4(w.a[0]+n[0]*d),r4(w.a[1]+n[1]*d)]; w.b=[r4(w.b[0]+n[0]*d),r4(w.b[1]+n[1]*d)];
  const c=wmRegen(); if(c==null||c<before){ restore(pre); compute(); render(); renderSide(); return toast('Δεν χωράει εκεί: θα χανόταν χώρος. Μετακίνησέ τον λιγότερο.'); }
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
  const c=wmRegen(); if(c==null){ restore(pre); compute(); render(); return toast('Δεν μπόρεσα να φτιάξω τον τοίχο'); }
  if(c<=before){ restore(pre); compute(); render(); renderSide(); return toast('Η γραμμή δεν χωρίζει κανέναν χώρο. Τράβηξέ τη από τοίχο σε τοίχο, μέσα στον χώρο.'); }
  const tiny=S.rooms.filter(r=>OL[r.id]&&OL[r.id].area<0.8);
  if(tiny.length&&tiny.length>preTiny){ restore(pre); compute(); render(); renderSide(); return toast('Η γραμμή θα έφτιαχνε πολύ μικρό χώρο ('+fmt(Math.min(...tiny.map(r=>OL[r.id].area)))+' m²). Τράβηξέ τη ξανά, πιο ίσια, από τοίχο σε τοίχο.'); }
  undoS.push(pre); if(undoS.length>80) undoS.shift(); redoS=[]; updUndo(); selRoom=null; commit();
  toast(c>before? 'Μπήκε τοίχος '+cm(t)+' εκ.: '+c+' χώροι.' : 'Μπήκε τοίχος '+cm(t)+' εκ. Δεν χώρισε χώρο: τράβηξέ τον από τοίχο σε τοίχο.'); }
// πάνελ εσωτερικού τοίχου (όταν πατάς πάνω του)
let wmSelId=null;
function wmWallOf(Wl){ const W=wmOn(); if(!W||Wl.ext) return null; const h=Wl.gap/2, m=[(Wl.a[0]+Wl.b[0])/2+Wl.on[0]*h,(Wl.a[1]+Wl.b[1])/2+Wl.on[1]*h]; return wmHit(m); }
function wmWallPanel(Wl){ const w=wmWallOf(Wl); if(!w) return false; const W=wmOn(); const {n}=wmAxisOf(w);
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
    if(wmRegen()==null){ restore(pre); compute(); return toast('Δεν γίνεται'); } undoS.push(pre); redoS=[]; updUndo(); selWall=null; commit(); toast('Ο τοίχος έγινε '+cm(v)+' εκ.'); };
  $('wmTGo').onclick=go; enterChain(['wmT'],go);
  armConfirm('wmDel',()=>{ const pre=snapStr(); W.walls=W.walls.filter(x=>x!==w); if(wmRegen()==null){ restore(pre); compute(); return; } undoS.push(pre); redoS=[]; updUndo(); selWall=null; commit(); toast('Ο τοίχος σβήστηκε· οι δύο χώροι έγιναν ένας.'); });
  $('wmOk').onclick=()=>{ selWall=null; render(); renderSide(); };
  return true; }
// ο εξωτερικός ή το περίγραμμα άλλαξε από αλλού (π.χ. «Άλλαξε περίγραμμα ορόφου»): ξαναβγάλε τους χώρους
function wmSync(){ const W=wmOn(); if(!W||W.sig===wmSig()) return; if(wmRegen()!=null){ save(); render(); } }
function wmOffUI(){ const W=wmOn(); if(!W) return ''; const B=bldInfo(), fo=FL().ol, ba=B&&B.rings.length?B.area:0, fa=fo?Math.abs(areaRing(fo)):0;
  const warn=fo&&ba&&Math.abs(fa-ba)>Math.max(1,ba*0.05);
  return `<div class="note">Χωριστοί τοίχοι: ο εξωτερικός μένει στο ${fo?'περίγραμμα ορόφου ('+fmt(fa)+' m²)':'περίγραμμα κτιρίου ('+fmt(ba)+' m²)'}, οι χώροι βγαίνουν από τους εσωτερικούς τοίχους (${W.walls.length}). <button class="kbtn" id="wmStop" style="font-size:13px">Σταμάτα τους χωριστούς τοίχους</button></div>
  ${warn?`<div class="note warn">Το περίγραμμα ορόφου (${fmt(fa)} m²) δεν είναι ίδιο με το περίγραμμα κτιρίου (${fmt(ba)} m²). Αν θέλεις το κτίριο: «Νέα κάτοψη από τον τοπογράφο» (στο «Αρχείο κάτοψης») ή «Άλλαξε περίγραμμα ορόφου» › «Ίδιο με το κτίριο».</div>`:''}`; }
function wmOffBind(){ if($('wmStop')) armConfirm('wmStop',()=>{ snap(); delete FL().wm; for(const r of S.rooms) delete r.seed; commit(); toast('Οι χώροι μένουν όπως είναι, χωρίς χωριστούς τοίχους.'); }); }
