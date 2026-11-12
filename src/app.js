(function(){
'use strict';
const PC = window.polygonClipping;
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
// μέσα στο Pythagoras (Android): η κάτοψη ανήκει σε ένα έργο (?case=…)
const PYQ = new URLSearchParams(location.search), PYCASE = window.PYC ? PYQ.get('case') : null;
const NB = PYCASE ? (window.R2P || null) : null;
function pyCase(){ if(!PYCASE) return null; const s=PYC.load(); return s.cases.find(c=>c.id===PYCASE)||null; }
const STORE = PYCASE ? 'pythagoras.katopsi.'+PYCASE : 'pythagoras.katopsi.v2';

// ---------- furniture library (sizes in m) ----------
const FURN = {
  bed2:{n:'Διπλό κρεβάτι',w:1.60,h:2.00}, bed1:{n:'Μονό κρεβάτι',w:0.90,h:2.00},
  ward:{n:'Ντουλάπα',w:1.20,h:0.60}, sofa:{n:'Καναπές',w:2.00,h:0.90},
  arm:{n:'Πολυθρόνα',w:0.85,h:0.85}, table:{n:'Τραπέζι',w:1.60,h:0.90},
  rtable:{n:'Στρογγυλό τραπέζι',w:1.00,h:1.00}, chair:{n:'Καρέκλα',w:0.45,h:0.45},
  desk:{n:'Γραφείο',w:1.40,h:0.70}, counter:{n:'Πάγκος κουζίνας',w:2.40,h:0.60},
  stove:{n:'Κουζίνα (εστίες)',w:0.60,h:0.60}, fridge:{n:'Ψυγείο',w:0.60,h:0.65},
  wc:{n:'Λεκάνη WC',w:0.40,h:0.70}, basin:{n:'Νιπτήρας',w:0.60,h:0.45},
  bath:{n:'Μπανιέρα',w:1.70,h:0.75}, shower:{n:'Ντουζιέρα',w:0.90,h:0.90},
  fire:{n:'Τζάκι',w:1.00,h:0.50}, stair:{n:'Σκάλα',w:1.00,h:3.00}
};

// ---------- state ----------
let S = null, undoS = [], redoS = [], sel = null, selRoom = null, tool = null, showDims = true;
let mode = 'house', cur = 1, showOthers = false;           // mode: 'room' (edit one room) | 'house' (place rooms)
let view = {s:60, ox:0, oy:0};
let OL = {};                           // roomId -> {polys, edges, area}
let HOUSE = {foot:[], footArea:0, net:0, walls:[]};
let snapMark = null;
let showThick = false, selWall = null, consEdit = null;   // selWall: {room, k} (τοπικές συντεταγμένες του χώρου)
let splitting = null;   // {room, dir:'v'|'h', d, t}
let GHOST = {below:[],chims:[],stairs:[]}, CHP = [];   // από άλλους ορόφους· CHP: περιγράμματα καμινάδων αυτού του ορόφου

function example(){
  const R=(id,room,x,y,w,h,extra)=>Object.assign({id,room,t:'rect',x,y,w,h,rot:0,sub:false},extra||{});
  return {name:'Παράδειγμα κατοικίας', next:40, ext:0.50, int:0.20, topo:null,
    rooms:[{id:1,name:'Καθιστικό – κουζίνα'},{id:2,name:'Υπνοδωμάτιο'},{id:3,name:'Λουτρό'},{id:4,name:'Αποθήκη'}],
    items:[
      R(1,1,2.5,2,5,4), R(2,2,7.0,2,3.6,4), R(3,3,1.1,5.2,2.2,2), R(4,4,3.7,5.2,2.6,2),
      {id:5,room:4,t:'poly',x:5,y:4.2,rot:0,sub:false,src:{k:'tri',a:2,b:2,c:2.8284},pts:[[0,0],[2,0],[0,2]]},
      {id:6,room:1,t:'door',x:0,y:3.2,w:1.0,leaves:1,flip:false,hinge:false,spec:{mat:'Ξύλο',op:'Ανοιγόμενη',prot:'Καμία',pmat:'',note:'εξώπορτα'}},
      {id:7,room:1,t:'window',x:1.2,y:0,w:1.2,sill:0.9,spec:{leaves:2,mat:'Ξύλο',op:'Ανοιγόμενο',prot:'Παντζούρια',pmat:'Ξύλο',note:''}},
      {id:8,room:2,t:'door',x:5.2,y:3.3,w:0.8,leaves:1,flip:false,hinge:true},
      {id:9,room:2,t:'window',x:7.0,y:0,w:1.2,sill:0.9,spec:{leaves:2,mat:'Ξύλο',op:'Ανοιγόμενο',prot:'Παντζούρια',pmat:'Ξύλο',note:''}},
      {id:10,room:3,t:'door',x:1.4,y:4.2,w:0.7,leaves:1,flip:false,hinge:false},
      {id:11,room:4,t:'door',x:3.3,y:4.2,w:0.8,leaves:1,flip:false,hinge:false},
      {id:12,room:1,t:'col',x:4.85,y:0.15,w:0.3,h:0.3,rot:0,round:false},
      {id:13,room:1,t:'furn',k:'counter',x:3.45,y:0.3,w:2.4,h:0.6,rot:0},
      {id:14,room:1,t:'furn',k:'table',x:1.7,y:1.9,w:1.4,h:0.8,rot:0},
      {id:15,room:1,t:'furn',k:'sofa',x:3.4,y:3.55,w:2.0,h:0.9,rot:180},
      {id:16,room:2,t:'furn',k:'bed2',x:6.9,y:1.0,w:1.6,h:2.0,rot:0},
      {id:17,room:2,t:'furn',k:'ward',x:8.5,y:2.9,w:1.2,h:0.6,rot:90},
      {id:18,room:3,t:'furn',k:'wc',x:0.5,y:5.85,w:0.4,h:0.7,rot:180},
      {id:19,room:3,t:'furn',k:'basin',x:1.6,y:5.975,w:0.6,h:0.45,rot:180}
    ]};
}
function migrate(o){
  if(!o || !Array.isArray(o.items)) return null;
  if(!Array.isArray(o.rooms) || !o.rooms.length){ o.rooms=[{id:1,name:o.name||'Χώρος 1'}]; o.items.forEach(i=>i.room=1); }
  if(o.ext==null) o.ext=0.5; if(o.int==null) o.int=0.2; if(o.topo===undefined) o.topo=null;
  if(!Array.isArray(o.cons)||!o.cons.length) o.cons=consLib(); if(o.extC===undefined) o.extC=null; if(!(o.tol>0)) o.tol=0.03;
  if(!Array.isArray(o.floors)||!o.floors.length){ o.floors=[{id:1,name:'Ισόγειο',h:3.00}]; o.fl=1; }
  if(!o.floors.some(f=>f.id===o.fl)) o.fl=o.floors[0].id;
  return o;
}
function load(){
  try{ const j=localStorage.getItem(STORE); if(j){ const o=migrate(JSON.parse(j)); if(o) return o; } }catch(e){}
  if(PYCASE){ const c=pyCase(); return migrate({name:'Κάτοψη '+(c?PYC.label(c):''), next:1, ext:0.5, int:0.2, topo:null, rooms:[{id:1,name:'Χώρος 1'}], items:[]}); }
  try{ const j=localStorage.getItem('pythagoras.katopsi.v1'); if(j){ const o=migrate(JSON.parse(j)); if(o) return o; } }catch(e){}
  return migrate(example());
}
function save(){ pySaveFile(); try{ localStorage.setItem(STORE, JSON.stringify(S)); if(window.R2PStateChanged) window.R2PStateChanged(); }catch(e){ toast('Δεν χωράει στη μνήμη του φυλλομετρητή. Το DXF βγαίνει κανονικά.'); } }
const snapStr = () => JSON.stringify(Object.assign({}, S, {topo:null}));
function restore(str){ const topo=S.topo; S=JSON.parse(str); S.topo=topo; }
function snap(){ undoS.push(snapStr()); if(undoS.length>80) undoS.shift(); redoS=[]; updUndo(); }
function commit(){ compute(); save(); render(); renderSide(); }
function updUndo(){ $('bUndo').disabled=!undoS.length; $('bRedo').disabled=!redoS.length; }
const roomById = id => S.rooms.find(r=>r.id===id);
const roomItems = id => S.items.filter(i=>i.room===id);
const roomNo = id => S.rooms.findIndex(r=>r.id===id)+1;
// ---------- όροφοι: ο τρέχων όροφος ζει στα S.rooms / S.items, οι άλλοι στα S.floors[k].rooms / items ----------
const FL = () => S.floors.find(f=>f.id===S.fl)||S.floors[0];
const flIdx = id => S.floors.findIndex(f=>f.id===id);
const flById = id => S.floors.find(f=>f.id===id)||null;
function floorData(f){ return f.id===S.fl? {rooms:S.rooms,items:S.items} : {rooms:f.rooms||[],items:f.items||[]}; }
function allRooms(){ return S.floors.flatMap(f=>floorData(f).rooms); }
function newRoomId(){ return Math.max(0,...allRooms().map(r=>r.id))+1; }
function withFloor(id,fn){ if(id===S.fl) return fn(); const c=FL(), keep={fl:S.fl,rooms:S.rooms,items:S.items}, t=flById(id); c.rooms=S.rooms; c.items=S.items;
  S.fl=id; S.rooms=t.rooms||[]; S.items=t.items||[]; try{ return fn(); } finally { S.fl=keep.fl; S.rooms=keep.rooms; S.items=keep.items; delete c.rooms; delete c.items; } }
function switchFloor(id){ if(id===S.fl||!flById(id)) return; const c=FL(), t=flById(id); c.rooms=S.rooms; c.items=S.items;
  const nid=newRoomId(); S.fl=id; S.rooms=t.rooms&&t.rooms.length?t.rooms:[{id:nid,name:'Χώρος 1'}]; S.items=t.items||[]; delete t.rooms; delete t.items;
  cur=S.rooms[0].id; sel=null; selRoom=null; selWall=null; splitting=null; consEdit=null; tool=null; markTool(); compute(); save(); render(); renderSide(); fit(); toast('Όροφος: '+t.name); }
function floorName(up){ const i=up?S.floors.length-1:0, f=S.floors[i]; if(up){ if(/Ισόγειο/.test(f.name)) return '1ος όροφος'; const m=f.name.match(/^(\d+)ος/); return m?(+m[1]+1)+'ος όροφος':'Νέος όροφος'; }
  return S.floors.some(x=>/^Υπόγειο/.test(x.name))?'Υπόγειο '+(S.floors.filter(x=>/^Υπόγειο/.test(x.name)).length+1):'Υπόγειο'; }
function addFloor(up){ snap(); const id=Math.max(...S.floors.map(f=>f.id))+1, f={id,name:floorName(up),h:up?FL().h:2.80,rooms:[],items:[]}; if(up) S.floors.push(f); else S.floors.unshift(f); switchFloor(id); }
function floorStats(){ const r=S.floors.map(f=>withFloor(f.id,()=>{ compute(); return {f,net:HOUSE.net,foot:HOUSE.footArea,use:Object.assign({},HOUSE.use),n:S.items.filter(isShape).length}; })); compute(); return r; }
function updFloorSel(){ const el=$('flSel'); if(!el||!S) return; el.innerHTML=S.floors.slice().reverse().map(f=>`<option value="${f.id}" ${f.id===S.fl?'selected':''}>${esc(f.name)}</option>`).join('')+'<option value="+up">+ Όροφος από πάνω</option><option value="+down">+ Υπόγειο</option>'; }
const openH = it => it.hgt!=null? it.hgt : (it.t==='door'?2.10:1.20);
// ---------- frames library (κουφώματα) ----------
const MATS=['Ξύλο','Αλουμίνιο','PVC','Σίδηρο','Ξύλο-αλουμίνιο','Άλλο'];
const OPS_W=['Ανοιγόμενο','Ανακλινόμενο','Ανοιγόμενο-ανακλινόμενο','Συρόμενο','Σταθερό'];
const OPS_D=['Ανοιγόμενη','Συρόμενη','Ανασυρόμενη','Χωρίς φύλλο'];
const PROTS=['Καμία','Παντζούρια','Ρολό','Σίτα','Κάγκελα'];
const PMATS=['Ξύλο','Αλουμίνιο','PVC','Σίδηρο'];
const LEAVES_W=[['1','Ένα'],['2','Δύο'],['3','Τρία'],['4','Τέσσερα'],['0','Σταθερό']];
const LIBKEY='pythagoras.koufomata.v1';
const LIB_DEFAULT=[
  {name:'Ξύλινο δίφυλλο με ξύλινα παντζούρια',kind:'window',leaves:2,mat:'Ξύλο',op:'Ανοιγόμενο',prot:'Παντζούρια',pmat:'Ξύλο'},
  {name:'Ξύλινο μονόφυλλο με ξύλινα παντζούρια',kind:'window',leaves:1,mat:'Ξύλο',op:'Ανοιγόμενο',prot:'Παντζούρια',pmat:'Ξύλο'},
  {name:'Αλουμινίου δίφυλλο με παντζούρια αλουμινίου',kind:'window',leaves:2,mat:'Αλουμίνιο',op:'Ανοιγόμενο',prot:'Παντζούρια',pmat:'Αλουμίνιο'},
  {name:'Αλουμινίου συρόμενο με ρολό',kind:'window',leaves:2,mat:'Αλουμίνιο',op:'Συρόμενο',prot:'Ρολό',pmat:'Αλουμίνιο'},
  {name:'PVC ανοιγόμενο-ανακλινόμενο με ρολό',kind:'window',leaves:1,mat:'PVC',op:'Ανοιγόμενο-ανακλινόμενο',prot:'Ρολό',pmat:'PVC'},
  {name:'Σταθερός φεγγίτης',kind:'window',leaves:0,mat:'Ξύλο',op:'Σταθερό',prot:'Καμία',pmat:''},
  {name:'Ξύλινη ταμπλαδωτή πόρτα',kind:'door',mat:'Ξύλο',op:'Ανοιγόμενη',prot:'Καμία',pmat:''},
  {name:'Πόρτα ασφαλείας',kind:'door',mat:'Σίδηρο',op:'Ανοιγόμενη',prot:'Καμία',pmat:''},
  {name:'Μπαλκονόπορτα αλουμινίου με ρολό',kind:'door',mat:'Αλουμίνιο',op:'Συρόμενη',prot:'Ρολό',pmat:'Αλουμίνιο'},
  {name:'Ξύλινη μπαλκονόπορτα με παντζούρια',kind:'door',mat:'Ξύλο',op:'Ανοιγόμενη',prot:'Παντζούρια',pmat:'Ξύλο'}];
let LIB=(()=>{ try{ const j=JSON.parse(localStorage.getItem(LIBKEY)); if(Array.isArray(j)&&j.length) return j; }catch(e){} return LIB_DEFAULT.map(x=>Object.assign({},x)); })();
function saveLib(){ try{ localStorage.setItem(LIBKEY,JSON.stringify(LIB)); }catch(e){} }
const lastSpec={window:{leaves:2,mat:'Ξύλο',op:'Ανοιγόμενο',prot:'Παντζούρια',pmat:'Ξύλο',note:''},door:{mat:'Ξύλο',op:'Ανοιγόμενη',prot:'Καμία',pmat:'',note:''}};
function sel_(id,label,opts,val){ return `<label class="f">${label}<select id="${id}">${opts.map(o=>{ const [v,t]=Array.isArray(o)?o:[o,o]; return `<option value="${esc(v)}" ${String(v)===String(val)?'selected':''}>${esc(t)}</option>`; }).join('')}</select></label>`; }
function specUI(p,spec,isDoor){ spec=spec||{}; const kind=isDoor?'door':'window';
  return `<div class="eyebrow" style="margin-top:6px">Κούφωμα</div>
  <label class="f">Από τη βιβλιοθήκη<select id="${p}Lib"><option value="">— διάλεξε έτοιμο τύπο —</option>${LIB.map((l,i)=>l.kind===kind?`<option value="${i}">${esc(l.name)}</option>`:'').join('')}</select></label>
  <div class="row">${isDoor?'':sel_(p+'Lv','Φύλλα',LEAVES_W,spec.leaves!=null?spec.leaves:2)}${sel_(p+'Mt','Υλικό',MATS,spec.mat||'Ξύλο')}${isDoor?sel_(p+'Op','Λειτουργία',OPS_D,spec.op||'Ανοιγόμενη'):''}</div>
  ${isDoor?'':`<div class="row">${sel_(p+'Op','Λειτουργία',OPS_W,spec.op||'Ανοιγόμενο')}</div>`}
  <div class="row">${sel_(p+'Pr','Παντζούρια / ρολά',PROTS,spec.prot||'Καμία')}${sel_(p+'Pm','Υλικό τους',PMATS,spec.pmat||'Ξύλο')}</div>
  <label class="f">Σημείωση<input id="${p}Nt" value="${esc(spec.note||'')}" autocomplete="off" placeholder="π.χ. με κάσα πέτρινη, παλιό"></label>`; }
function readSpec(p,isDoor){ const v=id=>$(p+id)?$(p+id).value:''; const s={mat:v('Mt'),op:v('Op'),prot:v('Pr'),pmat:v('Pr')==='Καμία'?'':v('Pm'),note:v('Nt').trim()}; if(!isDoor) s.leaves=+v('Lv'); return s; }
function bindSpec(p,isDoor,onChange){ const tog=()=>{ const pm=$(p+'Pm'); if(pm) pm.disabled=$(p+'Pr').value==='Καμία'; }; tog();
  ['Lv','Mt','Op','Pr','Pm'].forEach(k=>{ const el=$(p+k); if(el) el.addEventListener('change',()=>{ tog(); onChange&&onChange(); }); });
  const nt=$(p+'Nt'); if(nt) nt.addEventListener('change',()=>onChange&&onChange());
  $(p+'Lib').onchange=()=>{ const l=LIB[+$(p+'Lib').value]; if(!l) return; const set=(k,v)=>{ if($(p+k)&&v!=null) $(p+k).value=String(v); }; set('Lv',l.leaves); set('Mt',l.mat); set('Op',l.op); set('Pr',l.prot); if(l.pmat) set('Pm',l.pmat); tog(); onChange&&onChange(); }; }
const LV={0:'σταθερό',1:'μονόφυλλο',2:'δίφυλλο',3:'τρίφυλλο',4:'τετράφυλλο'};
function descOf(it){ const s=it.spec; if(!s) return it.desc||'';
  const parts=[]; if(it.t==='door'){ parts.push((s.mat||'')+(it.leaves===2?', δίφυλλη':it.leaves===1?', μονόφυλλη':'')+(s.op&&s.op!=='Ανοιγόμενη'?' '+s.op.toLowerCase():'')); }
  else parts.push((s.mat||'')+', '+(LV[s.leaves]||'')+(s.op&&s.op!=='Σταθερό'?' '+s.op.toLowerCase():''));
  if(s.prot&&s.prot!=='Καμία') parts.push(s.prot.toLowerCase()+(s.pmat?' από '+s.pmat.toLowerCase():''));
  if(s.note) parts.push(s.note); return parts.join(', '); }
function openCode(it){ const L=it.t==='door'?'Θ':'Π'; let k=0; for(const o of S.items){ if(o.room===it.room&&o.t===it.t) k++; if(o===it) break; } return L+roomNo(it.room)+'.'+k; }
function openSize(it,g){ const W=g?2*g.hw:it.w; return fmt(W)+'×'+fmt(openH(it))+(it.t==='window'?' ποδ. '+fmt(it.sill||0):''); }
function tagUp(e){ const a=angleOf(e); return [Math.sin(a),-Math.cos(a)]; }   // «πάνω» για το κείμενο, ίδια φορά στην οθόνη και στο DXF
function openDesc(it,g){ const W=g?2*g.hw:it.w; return openCode(it)+' '+fmt(W)+'×'+fmt(openH(it))+(it.t==='window'?' ποδ. '+fmt(it.sill||0):''); }

// ---------- τοίχοι: υλικά, κατασκευές, χρήσεις χώρων ----------
// k: core = φέρων/κύριος τοίχος, pl = σοβάς/επίχρισμα, ins = μόνωση, clad = επένδυση
const MATL={
  sovas:{n:'Σοβάς',t:0.025,k:'pl'}, thin:{n:'Επίχρισμα μόνωσης',t:0.01,k:'pl'}, gyps:{n:'Γυψοσανίδα',t:0.0125,k:'pl'},
  lith:{n:'Λιθοδομή',t:0.45,k:'core'}, mpat:{n:'Οπτοπλινθοδομή μπατική',t:0.20,k:'core'}, drom:{n:'Οπτοπλινθοδομή δρομική',t:0.10,k:'core'},
  skyr:{n:'Σκυρόδεμα (τοιχίο)',t:0.25,k:'core'}, tsat:{n:'Τσατμάς',t:0.12,k:'core'}, plin:{n:'Ωμόπλινθοι',t:0.40,k:'core'},
  eps:{n:'Θερμομόνωση EPS/XPS',t:0.10,k:'ins'}, petrov:{n:'Πετροβάμβακας',t:0.05,k:'ins'},
  petra:{n:'Πέτρινη επένδυση',t:0.05,k:'clad'}, xylo:{n:'Ξύλινη επένδυση',t:0.02,k:'clad'}, plak:{n:'Πλακίδια με κόλλα',t:0.015,k:'clad'},
  allo:{n:'Άλλο',t:0.05,k:'core'} };
const L_=(m,t)=>({m,t:t!=null?t:MATL[m].t});
const CONS_DEFAULT=[
  {id:'c1',kind:'ext',name:'Λιθοδομή 50',layers:[L_('sovas'),L_('lith'),L_('sovas')]},
  {id:'c2',kind:'ext',name:'Λιθοδομή με εξωτ. μόνωση',layers:[L_('sovas'),L_('lith'),L_('eps'),L_('thin')]},
  {id:'c3',kind:'ext',name:'Μπατική 25',layers:[L_('sovas'),L_('mpat'),L_('sovas')]},
  {id:'c4',kind:'ext',name:'Μπατική με εξωτ. μόνωση',layers:[L_('sovas'),L_('mpat'),L_('eps',0.08),L_('thin')]},
  {id:'c5',kind:'int',name:'Δρομική 15',layers:[L_('sovas'),L_('drom'),L_('sovas')]},
  {id:'c6',kind:'int',name:'Μπατική 25 (εσωτ.)',layers:[L_('sovas'),L_('mpat'),L_('sovas')]},
  {id:'c7',kind:'int',name:'Τσατμάς 15',layers:[L_('sovas',0.015),L_('tsat'),L_('sovas',0.015)]},
  {id:'c8',kind:'int',name:'Γυψοσανίδα 10',layers:[L_('gyps'),L_('petrov',0.075),L_('gyps')]},
  {id:'c9',kind:'int',name:'Λιθοδομή 40 (φέρων εσωτ.)',layers:[L_('sovas'),L_('lith',0.35),L_('sovas')]} ];
const CONSKEY='pythagoras.toixoi.v1';
function consLib(){ try{ const j=JSON.parse(localStorage.getItem(CONSKEY)); if(Array.isArray(j)&&j.length) return j; }catch(e){} return JSON.parse(JSON.stringify(CONS_DEFAULT)); }
function saveConsLib(){ try{ localStorage.setItem(CONSKEY,JSON.stringify(S.cons)); }catch(e){} }
const consById = id => (S.cons||[]).find(c=>c.id===id)||null;
const consT = c => r4(c.layers.reduce((s,l)=>s+(+l.t||0),0));
const matOf = l => MATL[l.m]||MATL.allo;
const layerName = l => l.n || matOf(l).n;
// ζώνες μιας κατασκευής από μέσα προς τα έξω: [{k:'ins'|'clad', pos:'in'|'out', a, b}]
function consBands(c){ const L=c.layers; let f=-1,la=-1; L.forEach((l,i)=>{ if(matOf(l).k==='core'){ if(f<0) f=i; la=i; } });
  const out=[]; let s=0; L.forEach((l,i)=>{ const k=matOf(l).k, e=s+(+l.t||0); if(k==='ins'||k==='clad'){ const pos= f<0? (i<L.length/2?'in':'out') : i<f?'in':i>la?'out':'mid'; if(pos!=='mid') out.push({k,pos,a:s,b:e}); } s=e; }); return out; }
// πάχος από την εξωτερική μόνωση και έξω (δεν μετράει στο μικτό)
function consInsOut(c){ const b=consBands(c).filter(x=>x.k==='ins'&&x.pos==='out'); if(!b.length) return 0; return r4(consT(c)-Math.min(...b.map(x=>x.a))); }
function consDesc(c){ return c.layers.map(l=>layerName(l).toLowerCase()+' '+cm(l.t)).join(' + ')+' = '+cm(consT(c))+' εκ.'; }
function cm(v){ const x=Math.round(v*1000)/10; return (Math.abs(x-Math.round(x))<1e-9? Math.round(x) : x.toFixed(1)).toString(); }
const USES={kyr:'Κύριος',voith:'Βοηθητικός',imiy:'Ημιυπαίθριος',exo:'Εξώστης'};
const USES_S={kyr:'κύρ.',voith:'βοηθ.',imiy:'ημιυπ.',exo:'εξώστ.'};
function useDefault(name){ const t=String(name||'').replace(/\s*\d+$/,''); if(['Αποθήκη','Λεβητοστάσιο','Πλυσταριό','Κατώι'].includes(t)) return 'voith'; if(['Βεράντα','Ημιυπαίθριος'].includes(t)) return 'imiy'; if(t==='Εξώστης') return 'exo'; return 'kyr'; }
const useOf = r => r.use || useDefault(r.name);
const isOpen = r => { const u=useOf(r); return u==='imiy'||u==='exo'; };
const GR='ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ';
const corner = i => GR[i%GR.length]+(i>=GR.length?"'":'');

// ---------- geometry ----------
const rad = d => d*Math.PI/180;
const r4 = v => Math.round(v*10000)/10000;
function rotP(x,y,deg){ const c=Math.cos(rad(deg)), s=Math.sin(rad(deg)); return [x*c-y*s, x*s+y*c]; }
function boxPts(it){ const w=it.w/2,h=it.h/2; return [[-w,-h],[w,-h],[w,h],[-w,h]].map(p=>{const q=rotP(p[0],p[1],it.rot||0);return [r4(q[0]+it.x),r4(q[1]+it.y)];}); }
function itemPts(it){
  if(it.t==='rect'||it.t==='col'||it.t==='furn'||it.t==='chim') return boxPts(it);
  if(it.t==='stair') return stairGeo(it).polys.flat();
  if(it.t==='poly') return it.pts.map(p=>{const q=rotP(p[0],p[1],it.rot||0);return [r4(q[0]+it.x),r4(q[1]+it.y)];});
  return [];
}
const isShape = it => it.t==='rect'||it.t==='poly';

// ---------- Γραφίδα: σκίτσο που ισιώνει σε πλευρές, μετρήσεις που κλείνουν το σχήμα ----------
let penStroke=null, penSeen=false, penEdit=null, penOpt={op:null,only90:false};
// κατευθύνσεις + μήκη -> κλειστό σχήμα. Μετρημένες σταθερές, αμέτρητες προσαρμόζονται (ελάχιστα τετράγωνα).
function penSolve(sd){
  const n=sd.length, d=sd.map(q=>[Math.cos(q.a),Math.sin(q.a)]);
  let ms=0,ss=0; sd.forEach(q=>{ if(q.m!=null){ms+=q.m;ss+=q.sk;} });
  const sc=ss>1e-9?ms/ss:1, L0=sd.map(q=>q.m!=null?q.m:q.sk*sc), w=sd.map((q,i)=>q.m!=null?0:Math.max(Math.abs(L0[i]),0.05));
  let rx=0,ry=0; L0.forEach((l,i)=>{rx+=l*d[i][0];ry+=l*d[i][1];});
  let a=0,b=0,c=0; w.forEach((wi,i)=>{a+=wi*d[i][0]*d[i][0];b+=wi*d[i][0]*d[i][1];c+=wi*d[i][1]*d[i][1];});
  const tr=a+c, det=a*c-b*b, disc=Math.sqrt(Math.max(0,tr*tr/4-det)), e1=tr/2+disc, e2=tr/2-disc;
  let v1; if(Math.abs(b)>1e-12){ v1=[b,e1-a]; const hh=Math.hypot(v1[0],v1[1]); v1=[v1[0]/hh,v1[1]/hh]; } else v1=a>=c?[1,0]:[0,1];
  const v2=[-v1[1],v1[0]], tol=1e-7*Math.max(1,tr); let lx=0,ly=0;
  for(const [e,v] of [[e1,v1],[e2,v2]]) if(e>tol){ const k=(v[0]*rx+v[1]*ry)/e; lx+=k*v[0]; ly+=k*v[1]; }
  const L=L0.map((l,i)=>l-w[i]*(d[i][0]*lx+d[i][1]*ly));
  const pts=[[0,0]]; for(let i=0;i<n;i++){ const p=pts[i]; pts.push([p[0]+L[i]*d[i][0],p[1]+L[i]*d[i][1]]); }
  const gap=Math.hypot(pts[n][0],pts[n][1]), unk=sd.filter(q=>q.m==null).length;
  const kind=sd.map((q,i)=> L[i]<0.005?'x' : q.m!=null?'m' : (unk<=2&&gap<0.0005&&sd.some(z=>z.m!=null))?'c':'s');
  let ar=0; for(let i=0;i<n;i++){ const p=pts[i],q=pts[(i+1)%n]; ar+=p[0]*q[1]-q[0]*p[1]; }
  return {pts,L,kind,gap,area:Math.abs(ar)/2,signed:ar/2,unk};
}
function penRdp(P,eps){
  const keep=new Uint8Array(P.length); keep[0]=keep[P.length-1]=1; const st=[[0,P.length-1]];
  while(st.length){ const [i,j]=st.pop(); const A=P[i],B=P[j]; const dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy); let mx=-1,mi=-1;
    for(let k=i+1;k<j;k++){ const p=P[k]; const dd=L<1e-9?Math.hypot(p[0]-A[0],p[1]-A[1]):Math.abs(dy*(p[0]-A[0])-dx*(p[1]-A[1]))/L; if(dd>mx){mx=dd;mi=k;} }
    if(mx>eps){ keep[mi]=1; st.push([i,mi],[mi,j]); } }
  return P.filter((_,k)=>keep[k]);
}
function penSnapA(a,only90){ const PI=Math.PI, deg=a*180/PI, n90=Math.round(deg/90)*90;
  if(only90||Math.abs(deg-n90)<=22) return n90*PI/180;
  const n45=Math.round(deg/45)*45; if(Math.abs(deg-n45)<=14) return n45*PI/180;
  return Math.round(deg/5)*5*PI/180; }
const penAngDiff=(a,b)=>{ const PI=Math.PI; let d=(a-b)%(2*PI); if(d>PI)d-=2*PI; if(d<-PI)d+=2*PI; return d; };
function penStraighten(raw,only90){
  const PI=Math.PI; if(raw.length<6) return null;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; for(const p of raw){x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);}
  const diag=Math.hypot(x1-x0,y1-y0); if(diag<0.3||diag*view.s<40) return null;
  const ring=raw.slice(); ring.push(raw[0]);
  const v=penRdp(ring,Math.max(diag*0.035,5/view.s));
  let seg=[]; for(let i=0;i<v.length-1;i++){ const dx=v[i+1][0]-v[i][0],dy=v[i+1][1]-v[i][1],l=Math.hypot(dx,dy); if(l<diag*0.04) continue; seg.push({a:penSnapA(Math.atan2(dy,dx),only90),l}); }
  let ch=true; while(ch&&seg.length>2){ ch=false;
    for(let i=0;i<seg.length&&seg.length>2;i++){ const j=(i+1)%seg.length, A=seg[i],B=seg[j], df=Math.abs(penAngDiff(A.a,B.a));
      if(df<1e-6){ A.l+=B.l; seg.splice(j,1); ch=true; break; }
      if(Math.abs(df-PI)<1e-6){ A.l-=B.l; if(A.l<0){A.l=-A.l;A.a+=PI;} seg.splice(j,1); ch=true; break; } }
    seg=seg.filter(s=>s.l>diag*0.02); }
  if(seg.length<3) return null;
  let sides=seg.map(s=>({a:s.a,sk:s.l,m:null})), g=penSolve(sides);
  if(g.signed<0){ sides=sides.reverse().map(s=>({a:s.a+PI,sk:s.sk,m:null})); g=penSolve(sides); }
  let st=0; g.pts.slice(0,-1).forEach((p,i)=>{ const q=g.pts[st]; if(p[1]<q[1]-1e-6||(Math.abs(p[1]-q[1])<1e-6&&p[0]<q[0])) st=i; });
  sides=sides.slice(st).concat(sides.slice(0,st)).map(s=>({a:((s.a%(2*PI))+2*PI)%(2*PI),sk:r4(s.sk),m:null}));
  g=penSolve(sides);
  const cr=centroid(raw), cp=centroid(g.pts.slice(0,-1));
  return {sides,o:[cr[0]-cp[0],cr[1]-cp[1]]};
}
// τα σημεία του σχήματος από τις πλευρές· η γωνία Α μένει στη θέση της
function penApply(it){ const g=penSolve(it.src.sides); it.pts=g.pts.slice(0,-1).map(p=>[r4(p[0]),r4(p[1])]); return g; }
function finishPen(raw){
  const r=penStraighten(raw,penOpt.only90);
  if(r&&typeof wzSketchHook==='function'&&wzSketchHook(r)) return;
  if(!r){ toast('Ζωγράφισε ολόκληρο το περίγραμμα με μία γραμμή, με τουλάχιστον τρεις πλευρές'); render(); return; }
  const op=penOp(); snap();
  if(op==='new') S.items=S.items.filter(i=>!(i.room===cur&&isShape(i)));
  const it={id:S.next++,room:cur,t:'poly',x:r4(r.o[0]),y:r4(r.o[1]),rot:0,sub:op==='sub',pts:[],src:{k:'pen',sides:r.sides}};
  penApply(it); S.items.push(it); sel=it.id; penEdit={id:it.id,active:0,dirty:true}; tool=null; markTool(); commit();
  if(S.items.filter(i=>i.room===cur&&isShape(i)).length===1) fit(cur);
  toast('Έγιναν '+r.sides.length+' πλευρές. Γράψε ή μέτρησε με το DISTO την πλευρά ΑΒ.');
  setTimeout(()=>{ const el=$('pm0'); if(el) el.focus(); },50);
}
function penOp(){ return penOpt.op || (roomItems(cur).some(isShape)?'add':'new'); }
function penToolPanel(){ const op=penOp(), has=roomItems(cur).some(isShape);
  h(`<div class="eyebrow">Γραφίδα · ${esc(roomById(cur).name)}</div><h2>Σχεδίασε με τη γραφίδα</h2>
  <p>Ζωγράφισε το περίγραμμα με μία γραμμή, χωρίς να σηκώσεις τη γραφίδα. Οι πλευρές ισιώνουν μόνες τους και οι γωνίες κουμπώνουν σε 90° ή 45°. Μετά γράφεις τα μήκη ή τα μετράς με το DISTO.</p>
  <div class="seg" role="group" aria-label="Τι κάνει το σκίτσο"><button data-pop="new" class="${op==='new'?'on':''}">Νέο σχήμα</button><button data-pop="add" class="${op==='add'?'on':''}" ${has?'':'disabled'}>Πρόσθεσε</button><button data-pop="sub" class="${op==='sub'?'on':''}" ${has?'':'disabled'}>Αφαίρεσε</button></div>
  <p style="font-size:13px">${op==='new'?(has?'Το σκίτσο αντικαθιστά το σχήμα του χώρου (οι πόρτες και τα έπιπλα μένουν).':'Το σκίτσο γίνεται το σχήμα του χώρου.'):op==='add'?'Ζωγράφισε το κομμάτι που λείπει, π.χ. μια εσοχή ή ένα σαλονάκι. Ενώνεται με τον χώρο.':'Ζωγράφισε το κομμάτι που φεύγει, π.χ. μια γωνία ή μια καμινάδα. Κόβεται από τον χώρο.'}</p>
  <label class="f"><span><input type="checkbox" id="penO90" ${penOpt.only90?'checked':''}> Μόνο ορθές γωνίες</span></label>
  <div class="note">Με γραφίδα, το δάχτυλο μετακινεί την κάτοψη. Δύο δάχτυλα για ζουμ.</div>
  <div class="actions"><button class="btn" id="penNo">Άκυρο</button></div>`);
  side.querySelectorAll('[data-pop]').forEach(b=>b.onclick=()=>{ penOpt.op=b.dataset.pop; penToolPanel(); });
  $('penO90').onchange=()=>{ penOpt.only90=$('penO90').checked; };
  $('penNo').onclick=()=>{ tool=null; markTool(); renderSide(); render(); }; }
const PEN_K={m:'μετρημένη',c:'υπολογίστηκε',s:'από το σκίτσο',x:'λάθος σχήμα'};
function penInfo(it){ const g=penSolve(it.src.sides), n=it.src.sides.length; let msg, cls='note';
  if(g.kind.includes('x')){ msg='Κάποια πλευρά βγαίνει μηδέν ή αρνητική. Έλεγξε τις μετρήσεις ή ξανασχεδίασε.'; cls='note warn'; }
  else if(g.unk===0){ if(g.gap<0.01){ msg='Όλες οι πλευρές μετρήθηκαν και το σχήμα κλείνει (διαφορά '+cm(g.gap)+' εκ.).'; cls='note ok'; } else { msg='Όλες μετρήθηκαν, αλλά το σχήμα δεν κλείνει κατά '+cm(g.gap)+' εκ. Ξαναμέτρησε κάποια πλευρά ή άφησε μία κενή.'; cls='note warn'; } }
  else if(g.unk<=2&&g.kind.includes('c')){ msg='Οι πλευρές '+it.src.sides.map((s,i)=>g.kind[i]==='c'?corner(i)+corner((i+1)%n):null).filter(Boolean).join(', ')+' υπολογίστηκαν για να κλείσει το σχήμα. Αν τις μετρήσεις, γίνονται έλεγχος.'; cls='note ok'; }
  else if(g.unk<=2){ msg='Το σχήμα δεν κλείνει κατά '+cm(g.gap)+' εκ. Έλεγξε τις μετρήσεις ή άφησε κενή μία πλευρά που δεν είναι παράλληλη με τις άλλες κενές.'; cls='note warn'; }
  else msg='Μέτρησε ακόμα '+(g.unk-2)+(g.unk-2===1?' πλευρά':' πλευρές')+'. Οι δύο τελευταίες μπορούν να υπολογιστούν.';
  return `<div class="${cls}">${esc(msg)}</div><dl class="sum"><dt>Εμβαδόν</dt><dd>${fmt(g.area)} m²</dd></dl>`; }
function penPanel(it){ const n=it.src.sides.length, g=penSolve(it.src.sides);
  const rows=it.src.sides.map((s,i)=>`<div class="side-row" style="grid-template-columns:34px 1fr 1fr"><span class="n">${corner(i)}${corner((i+1)%n)}</span>${field('pm'+i,i?'':'Μήκος (m)',s.m!=null?fmt(s.m):'','placeholder="'+fmt(g.L[i])+'"')}<span class="n" id="pk${i}" style="font-family:var(--font);font-size:12px">${PEN_K[g.kind[i]]}</span></div>`).join('');
  h(`<div class="eyebrow">Γραφίδα · ${esc(roomById(cur).name)}${it.sub?' · αφαίρεση':''}</div><h2>Μήκη πλευρών</h2>
  <p>Ξεκίνα από την ΑΒ και προχώρα με τη φορά του ρολογιού. Με το DISTO, κάθε μέτρηση πάει στην επόμενη πλευρά. Όσες δεν μετρήσεις παίρνουν μήκος από το σκίτσο.</p>
  <div class="form"><div class="sides">${rows}</div><div id="penI">${penInfo(it)}</div>
  <div class="actions"><button class="btn primary" id="penOk">Τέλος</button><button class="btn" id="penRe">Ξανασχεδίασε</button></div></div>`);
  const ids=it.src.sides.map((_,i)=>'pm'+i);
  ids.forEach((id,i)=>{ const el=$(id);
    el.addEventListener('focus',()=>{ penEdit.active=i; render(); });
    el.addEventListener('input',()=>{ const v=String(el.value).trim(); const x=v===''?null:num(v);
      if(v!==''&&!(x>0)) return; if(!penEdit.dirty){ snap(); penEdit.dirty=true; }
      it.src.sides[i].m=x==null?null:r4(x); const g2=penApply(it); compute(); render();
      it.src.sides.forEach((_,k)=>{ const e2=$('pm'+k); if(e2) e2.placeholder=fmt(g2.L[k]); const t=$('pk'+k); if(t) t.textContent=PEN_K[g2.kind[k]]; });
      $('penI').innerHTML=penInfo(it); save(); }); });
  enterChain(ids,()=>$('penOk').click());
  $('penOk').onclick=()=>{ penEdit=null; commit(); };
  $('penRe').onclick=()=>{ penEdit=null; sel=null; penOpt.op=it.sub?'sub':(roomItems(cur).filter(isShape).length>1?'add':'new');
    if(penOpt.op!=='new'){ snap(); S.items=S.items.filter(x=>x!==it); compute(); save(); }
    tool='pen'; markTool(); render(); penToolPanel(); }; }
function areaRing(r){ let a=0; for(let i=0;i<r.length;i++){const p=r[i],q=r[(i+1)%r.length]; a+=p[0]*q[1]-q[0]*p[1];} return a/2; }
function centroid(r){ let a=0,cx=0,cy=0; for(let i=0;i<r.length;i++){const p=r[i],q=r[(i+1)%r.length],f=p[0]*q[1]-q[0]*p[1]; a+=f; cx+=(p[0]+q[0])*f; cy+=(p[1]+q[1])*f;} a/=2; return a? [cx/(6*a),cy/(6*a)] : r[0]; }
function inRing(p,r){ let c=false; for(let i=0,j=r.length-1;i<r.length;j=i++){ const a=r[i],b=r[j]; if(((a[1]>p[1])!==(b[1]>p[1])) && p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) c=!c; } return c; }
function inPolys(p,polys){ for(const poly of polys){ let c=false; for(const r of poly) if(inRing(p,r)) c=!c; if(c) return true; } return false; }
function cleanRing(r){
  let pts=r.slice(); if(pts.length>1){const a=pts[0],b=pts[pts.length-1]; if(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-6) pts.pop();}
  let changed=true;
  while(changed && pts.length>3){ changed=false;
    for(let i=0;i<pts.length;i++){ const a=pts[(i-1+pts.length)%pts.length], b=pts[i], c=pts[(i+1)%pts.length];
      const cr=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
      const l1=Math.hypot(b[0]-a[0],b[1]-a[1]), l2=Math.hypot(c[0]-b[0],c[1]-b[1]);
      if(l1<1e-5||l2<1e-5||Math.abs(cr)/(l1*l2)<1e-6){ pts.splice(i,1); changed=true; break; } } }
  return pts;
}
function edgesOf(polys){
  const edges=[];
  polys.forEach((poly,pi)=>poly.forEach((r,ri)=>{ for(let i=0;i<r.length;i++){ const a=r[i], b=r[(i+1)%r.length], L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L<1e-6) continue;
    edges.push({a,b,L,ux:(b[0]-a[0])/L,uy:(b[1]-a[1])/L,pi,ri,i,nx:0,ny:0}); } }));
  for(const e of edges){ let nx=-e.uy, ny=e.ux; const m=[(e.a[0]+e.b[0])/2+nx*0.01,(e.a[1]+e.b[1])/2+ny*0.01]; if(!inPolys(m,polys)){nx=-nx;ny=-ny;} e.nx=nx; e.ny=ny; }
  return edges;
}
// corners of a room's outline (biggest piece), screen-clockwise, starting top-left
function roomCorners(id){ const o=OL[id]; if(!o||!o.polys.length) return [];
  let best=o.polys[0]; for(const p of o.polys) if(p.area>best.area) best=p; let R=best[0].slice(); if(areaRing(R)<0) R.reverse();
  let k=0; R.forEach((q,i)=>{ if(q[0]+q[1]<R[k][0]+R[k][1]-1e-6) k=i; }); return R.slice(k).concat(R.slice(0,k)); }
let rotPiv=null; // {room, p:[x,y]} or null = centre
function pivIdx(id){ if(!rotPiv||rotPiv.room!==id) return -1; const C=roomCorners(id); let k=-1,d=0.05; C.forEach((q,i)=>{ const e=Math.hypot(q[0]-rotPiv.p[0],q[1]-rotPiv.p[1]); if(e<d){d=e;k=i;} }); return k; }
function computeRoom(id){
  const adds=[], subs=[];
  for(const it of S.items) if(it.room===id && isShape(it)){ const p=itemPts(it); if(p.length>=3) (it.sub?subs:adds).push([p]); }
  let res=[];
  try{ if(adds.length) res=PC.union(...adds); if(subs.length&&res.length) res=PC.difference(res,...subs); if(CHP.length&&res.length) res=PC.difference(res,...CHP); }catch(e){ console.warn(e); res=adds; }
  const polys=res.map(poly=>poly.map(cleanRing).filter(r=>r.length>=3)).filter(p=>p.length);
  let area=0; for(const poly of polys){ let a=Math.abs(areaRing(poly[0])); for(let i=1;i<poly.length;i++) a-=Math.abs(areaRing(poly[i])); poly.area=a; area+=a; }
  let P=0; const edges=edgesOf(polys); for(const e of edges) P+=e.L;
  OL[id]={polys,edges,area,per:P};
}
// outward miter offset of one ring
function offsetRing(r,d){
  const n=r.length, ccw=areaRing(r)>0, out=[];
  const N=(a,b)=>{ const L=Math.hypot(b[0]-a[0],b[1]-a[1])||1, ux=(b[0]-a[0])/L, uy=(b[1]-a[1])/L; return ccw? [uy,-ux] : [-uy,ux]; };
  for(let i=0;i<n;i++){
    const p=r[(i-1+n)%n], c=r[i], q=r[(i+1)%n], n1=N(p,c), n2=N(c,q);
    const bx=n1[0]+n2[0], by=n1[1]+n2[1], bl=Math.hypot(bx,by);
    if(bl<1e-6){ out.push([c[0]+n1[0]*d,c[1]+n1[1]*d]); continue; }
    const cosH=(n1[0]*bx+n1[1]*by)/bl, m=d/Math.max(cosH,1e-6);
    if(Math.abs(m)>Math.abs(d)*3){ out.push([c[0]+n1[0]*d,c[1]+n1[1]*d]); out.push([c[0]+n2[0]*d,c[1]+n2[1]*d]); }
    else out.push([c[0]+bx/bl*m, c[1]+by/bl*m]);
  }
  return out.map(p=>[r4(p[0]),r4(p[1])]);
}
// δακτύλιος με εξωτερικό κάθετο για κάθε πλευρά i (από r[i] στο r[i+1])
function ringNormals(r){ const ccw=areaRing(r)>0; return r.map((a,i)=>{ const b=r[(i+1)%r.length], L=Math.hypot(b[0]-a[0],b[1]-a[1])||1, ux=(b[0]-a[0])/L, uy=(b[1]-a[1])/L; return ccw? [uy,-ux] : [-uy,ux]; }); }
// μετατόπιση προς τα έξω με διαφορετική απόσταση ανά πλευρά
function varOffset(r,d){
  const n=r.length, N=ringNormals(r), out=[]; const dm=Math.max(0.01,...d);
  for(let i=0;i<n;i++){ const j=(i-1+n)%n, p=r[i], n1=N[j], n2=N[i], d1=d[j], d2=d[i];
    const A=[p[0]+n1[0]*d1,p[1]+n1[1]*d1], B=[p[0]+n2[0]*d2,p[1]+n2[1]*d2];
    const t1=[-n1[1],n1[0]], t2=[-n2[1],n2[0]], den=t1[0]*t2[1]-t1[1]*t2[0];
    if(Math.abs(den)<1e-6){ out.push(A); if(Math.hypot(A[0]-B[0],A[1]-B[1])>1e-6) out.push(B); continue; }
    const k=((B[0]-A[0])*t2[1]-(B[1]-A[1])*t2[0])/den, X=[A[0]+t1[0]*k,A[1]+t1[1]*k];
    if(Math.hypot(X[0]-p[0],X[1]-p[1])>dm*3+0.05){ out.push(A,B); } else out.push(X); }
  return out.map(p=>[r4(p[0]),r4(p[1])]);
}
// ακτίνα από p προς dir: πόσο μακριά μπαίνει σε άλλον (κλειστό) χώρο
function rayHit(p,dir,maxD,except){ let best=null;
  for(const r of S.rooms){ if(r.id===except||isOpen(r)) continue; const o=OL[r.id]; if(!o||!o.polys.length) continue;
    for(const e of o.edges){ const ex=e.b[0]-e.a[0], ey=e.b[1]-e.a[1], den=dir[0]*ey-dir[1]*ex; if(Math.abs(den)<1e-9) continue;
      const wx=e.a[0]-p[0], wy=e.a[1]-p[1], t=(wx*ey-wy*ex)/den, u=(wx*dir[1]-wy*dir[0])/den;
      if(t>1e-4&&t<=maxD&&u>=-1e-6&&u<=1+1e-6&&(!best||t<best.d)) best={d:t,room:r.id}; } }
  return best; }
// τοπικές συντεταγμένες χώρου (ως προς το πρώτο του σχήμα), για να «θυμάται» ο τοίχος την επιλογή του όταν ο χώρος μετακινείται
function roomAnchor(id){ const it=S.items.find(i=>i.room===id&&isShape(i)); return it? {x:it.x,y:it.y,rot:it.rot||0} : {x:0,y:0,rot:0}; }
function toLocal(id,p){ const a=roomAnchor(id); return rotP(p[0]-a.x,p[1]-a.y,-a.rot); }
function wallKey(id,a,b){ const A=toLocal(id,a), B=toLocal(id,b); return [r4(A[0]),r4(A[1]),r4(B[0]),r4(B[1])]; }
function findOverride(room,a,b){ if(!room.walls||!room.walls.length) return null; const A=toLocal(room.id,a), B=toLocal(room.id,b), m=[(A[0]+B[0])/2,(A[1]+B[1])/2];
  const L=Math.hypot(B[0]-A[0],B[1]-A[1])||1, ux=(B[0]-A[0])/L, uy=(B[1]-A[1])/L;
  for(const w of room.walls){ const k=w.k, wl=Math.hypot(k[2]-k[0],k[3]-k[1])||1, wx=(k[2]-k[0])/wl, wy=(k[3]-k[1])/wl;
    if(Math.abs(ux*wy-uy*wx)>0.02) continue; const q=segNear(m,[k[0],k[1]],[k[2],k[3]]); if(Math.hypot(q[0]-m[0],q[1]-m[1])<0.08) return w; }
  return null; }
function extSpec(room,a,b){ const ov=findOverride(room,a,b);
  if(ov&&ov.c&&consById(ov.c)) return {c:consById(ov.c),src:'wall',ov}; if(ov&&ov.t>0) return {t:ov.t,src:'wall',ov};
  if(room.extC&&consById(room.extC)) return {c:consById(room.extC),src:'room',ov};
  if(S.extC&&consById(S.extC)) return {c:consById(S.extC),src:'house',ov};
  return {t:S.ext,src:'house',ov}; }
let WALLS=[];
function compute(){
  GHOST=floorGhost(); CHP=S.items.filter(i=>i.t==='chim').map(i=>[boxPts(i)]).concat(GHOST.chims.map(g=>[boxPts(g.it)]));
  OL={}; for(const r of S.rooms) computeRoom(r.id);
  WALLS=[]; const rings=[], ringsNI=[], closed=[], opens=[], bands={ins:[],clad:[]};
  let maxT=S.ext; for(const c of S.cons||[]) if(c.kind!=='int') maxT=Math.max(maxT,consT(c));
  const probeMax=Math.max(maxT,S.int,0.8)+0.05;
  for(const room of S.rooms){ const ol=OL[room.id]; if(!ol) continue;
    if(isOpen(room)){ for(const poly of ol.polys) opens.push(poly.map(x=>x.slice())); continue; }
    ol.polys.forEach((poly,pi)=>{ closed.push(poly.map(x=>x.slice())); const r=poly[0], N=ringNormals(r), n=r.length, d=[], dNI=[], bIns=[[],[]], bClad=[[],[]];
      for(let i=0;i<n;i++){ const a=r[i], b=r[(i+1)%n], L=Math.hypot(b[0]-a[0],b[1]-a[1]), ux=(b[0]-a[0])/(L||1), uy=(b[1]-a[1])/(L||1), on=N[i];
        let hits=0, gmin=1e9, nb=null; const fr=[0.12,0.3,0.5,0.7,0.88];
        for(const f of fr){ const p=[a[0]+(b[0]-a[0])*f+on[0]*1e-4, a[1]+(b[1]-a[1])*f+on[1]*1e-4]; const h=rayHit(p,on,probeMax,room.id); if(h){ hits++; if(h.d<gmin){gmin=h.d;} if(f===0.5||!nb) nb=h.room; } }
        const W={room:room.id,pi,i,a,b,L,ux,uy,on,ext:hits<fr.length,part:hits>0&&hits<fr.length,gap:hits?r4(gmin):0,nb:hits?nb:null,bands:[]};
        if(W.ext){ const sp=extSpec(room,a,b); W.c=sp.c||null; W.src=sp.src; W.T=sp.c?consT(sp.c):sp.t; W.insOut=sp.c?consInsOut(sp.c):0; W.bands=sp.c?consBands(sp.c):[]; W.d=Math.max(W.T, W.part?W.gap:0); }
        else { W.T=W.gap; W.d=W.gap; const ov=findOverride(room,a,b); W.c=ov&&ov.c?consById(ov.c):null; W.src=W.c?'wall':'gap'; W.insOut=0; }
        d.push(W.d); dNI.push(W.ext? Math.max(0.0,W.d-W.insOut) : W.d);
        for(const [k,arr] of [['ins',bIns],['clad',bClad]]){ const bs=W.bands.filter(x=>x.k===k); if(bs.length&&W.ext){ arr[0].push(Math.min(...bs.map(x=>x.a))); arr[1].push(Math.max(...bs.map(x=>x.b))); } else { arr[0].push(W.d); arr[1].push(W.d); } }
        WALLS.push(W); }
      rings.push([varOffset(r,d)]); ringsNI.push([varOffset(r,dNI)]);
      for(const [k,arr] of [['ins',bIns],['clad',bClad]]) if(arr[1].some((v,i)=>v-arr[0][i]>1e-4)){ try{ const bd=PC.difference([varOffset(r,arr[1])],[varOffset(r,arr[0])]); bands[k].push(...bd); }catch(e){} } }); }
  let foot=[], walls=[], footNI=[];
  try{ if(rings.length){ foot=PC.union(...rings); if(opens.length) foot=PC.difference(foot,...opens); walls=closed.length? PC.difference(foot,...closed) : foot; footNI=PC.union(...ringsNI); if(opens.length) footNI=PC.difference(footNI,...opens); } }catch(e){ console.warn(e); }
  const clean=P=>P.map(poly=>poly.map(cleanRing).filter(r=>r.length>=3)).filter(p=>p.length);
  foot=clean(foot); footNI=clean(footNI);
  const areaOf=P=>{ let fa=0; for(const poly of P){ let a=Math.abs(areaRing(poly[0])); for(let i=1;i<poly.length;i++) a-=Math.abs(areaRing(poly[i])); fa+=a; } return fa; };
  const fa=areaOf(foot), use={kyr:0,voith:0,imiy:0,exo:0};
  for(const r of S.rooms) use[useOf(r)]+=OL[r.id].area;
  const net=use.kyr+use.voith;
  const clip=P=>{ try{ return P.length&&walls.length? PC.intersection(P,walls) : []; }catch(e){ return P; } };
  HOUSE={foot,footArea:fa,footNI:areaOf(footNI),net,use,walls,footEdges:edgesOf(foot),ins:clip(bands.ins),clad:clip(bands.clad)};
  updStats(); updFloorSel();
}
function updStats(){
  if(mode==='room'){ const o=OL[cur]||{area:0,per:0}; $('stLbl').textContent='Ε'; $('stArea').textContent=fmt(o.area); $('stPerL').textContent='Π'; $('stPer').textContent=fmt(o.per); }
  else { $('stLbl').textContent='Καθαρό'; $('stArea').textContent=fmt(HOUSE.net); $('stPerL').textContent='Μικτό'; $('stPer').textContent=fmt(HOUSE.footArea); $('stPerU').textContent='m²'; return; }
  $('stPerU').textContent='m';
}
function nearestEdge(p,edges,wantLen){
  let best=null;
  for(const e of edges){ if(wantLen&&e.L<wantLen) continue;
    let t=(p[0]-e.a[0])*e.ux+(p[1]-e.a[1])*e.uy; t=Math.max(0,Math.min(e.L,t));
    const q=[e.a[0]+e.ux*t,e.a[1]+e.uy*t], d=Math.hypot(p[0]-q[0],p[1]-q[1]);
    if(!best||d<best.d) best={e,t,d,q}; }
  if(!best&&wantLen) return nearestEdge(p,edges,0);
  return best;
}
function wallAt(roomId,c){ let best=null,bd=0.02; for(const w of WALLS){ if(w.room!==roomId) continue; const q=segNear(c,w.a,w.b), d=Math.hypot(q[0]-c[0],q[1]-c[1]); if(d<bd){bd=d;best=w;} } return best; }
function wallDepth(c,e,roomId){ const w=roomId!=null?wallAt(roomId,c):null; if(w) return Math.max(0.05,w.d);
  const out=[-e.nx,-e.ny];
  for(let d=0.04; d<=S.ext+0.05; d+=0.02){ const p=[c[0]+out[0]*d,c[1]+out[1]*d]; for(const r of S.rooms){ const o=OL[r.id]; if(o&&o.polys.length&&inPolys(p,o.polys)&&!o.edges.includes(e)) return Math.max(0.05,d-0.02); } }
  return S.ext;
}
function openingGeo(it){
  const o=OL[it.room]; if(!o) return null;
  const ne=nearestEdge([it.x,it.y],o.edges,it.w); if(!ne) return null;
  const e=ne.e, hw=Math.min(it.w/2,e.L/2), t=Math.max(hw,Math.min(e.L-hw,ne.t));
  const c=[e.a[0]+e.ux*t,e.a[1]+e.uy*t];
  return {e,t,c,p0:[c[0]-e.ux*hw,c[1]-e.uy*hw],p1:[c[0]+e.ux*hw,c[1]+e.uy*hw],hw,left:t-hw,right:e.L-t-hw,depth:wallDepth(c,e,it.room),room:it.room};
}
function doorPrims(it,g){
  const sgn=it.flip?-1:1, nx=g.e.nx*sgn, ny=g.e.ny*sgn, out={lines:[],arcs:[]};
  const base=(p)=> it.flip? [p[0]+nx*g.depth,p[1]+ny*g.depth] : p;   // door opening outward hinges on the outer face
  const leaf=(h,o,len)=>{ h=base(h); o=base(o); const tip=[h[0]+nx*len,h[1]+ny*len]; out.lines.push([h,tip]);
    out.arcs.push({c:h,r:len,a0:Math.atan2(tip[1]-h[1],tip[0]-h[0]),a1:Math.atan2(o[1]-h[1],o[0]-h[0])}); };
  const W=2*g.hw;
  if(it.leaves===2){ leaf(g.p0,g.c,W/2); leaf(g.p1,g.c,W/2); }
  else if(it.leaves===1){ const h=it.hinge?g.p1:g.p0, o=it.hinge?g.p0:g.p1; leaf(h,o,W); }
  return out;
}
function jambPrims(g){ const ox=-g.e.nx*g.depth, oy=-g.e.ny*g.depth; return [[g.p0,[g.p0[0]+ox,g.p0[1]+oy]],[g.p1,[g.p1[0]+ox,g.p1[1]+oy]]]; }
function windowPrims(it,g){ const ox=-g.e.nx, oy=-g.e.ny, d=g.depth; const P=(p,k)=>[p[0]+ox*k,p[1]+oy*k];
  return [[P(g.p0,0),P(g.p1,0)],[P(g.p0,d*0.5),P(g.p1,d*0.5)],[P(g.p0,d),P(g.p1,d)]]; }
function openingHole(g){ const ox=-g.e.nx, oy=-g.e.ny, d=g.depth+0.02, ix=g.e.nx*0.02, iy=g.e.ny*0.02;
  return [[g.p0[0]+ix,g.p0[1]+iy],[g.p1[0]+ix,g.p1[1]+iy],[g.p1[0]+ox*d,g.p1[1]+oy*d],[g.p0[0]+ox*d,g.p0[1]+oy*d]]; }

function ell(cx,cy,rx,ry,n){ const p=[]; for(let i=0;i<n;i++){const a=i/n*Math.PI*2;p.push([cx+rx*Math.cos(a),cy+ry*Math.sin(a)]);} return {pl:p,c:1}; }
function rr(x0,y0,x1,y1){ return {pl:[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],c:1}; }
function furnPrims(k,w,h){
  const W=w/2,H=h/2, P=[rr(-W,-H,W,H)];
  switch(k){
    case 'bed2': P.push(rr(-W+0.08,-H+0.08,-0.04,-H+0.42), rr(0.04,-H+0.08,W-0.08,-H+0.42), {l:[-W,-H+0.6,W,-H+0.6]}); break;
    case 'bed1': P.push(rr(-W+0.1,-H+0.08,W-0.1,-H+0.42), {l:[-W,-H+0.6,W,-H+0.6]}); break;
    case 'ward': P.push({l:[-W,-H,W,H]}, {l:[0,-H,0,H]}); break;
    case 'sofa': P.push(rr(-W,-H,W,-H+0.22), rr(-W,-H+0.22,-W+0.2,H), rr(W-0.2,-H+0.22,W,H), {l:[0,-H+0.22,0,H]}); break;
    case 'arm': P.push(rr(-W,-H,W,-H+0.2), rr(-W,-H+0.2,-W+0.16,H), rr(W-0.16,-H+0.2,W,H)); break;
    case 'rtable': P.length=0; P.push({ci:[0,0,Math.min(W,H)]}); break;
    case 'chair': P.push({l:[-W,-H+0.08,W,-H+0.08]}); break;
    case 'desk': P.push(rr(W-0.45,-H+0.04,W-0.04,H-0.04)); break;
    case 'counter': P.push(rr(-0.35,-H+0.08,0.35,H-0.12), {ci:[0,0,0.16]}); break;
    case 'stove': { const a=W*0.5,b=H*0.5,r=Math.min(W,H)*0.3; P.push({ci:[-a,-b,r]},{ci:[a,-b,r]},{ci:[-a,b,r]},{ci:[a,b,r]}); break; }
    case 'fridge': P.push({l:[-W,-H,W,H]},{l:[W,-H,-W,H]}); break;
    case 'wc': P.length=0; P.push(rr(-W,-H,W,-H+0.18), ell(0,-H+0.18+0.26,W*0.85,0.26,24)); break;
    case 'basin': P.push(ell(0,0.03,W*0.7,H*0.6,24)); break;
    case 'bath': P.push(rr(-W+0.07,-H+0.07,W-0.07,H-0.07), {ci:[W-0.25,0,0.04]}); break;
    case 'shower': P.push({l:[-W,-H,W,H]},{l:[W,-H,-W,H]},{ci:[0,0,0.05]}); break;
    case 'fire': P.push({pl:[[-W+0.15,-H],[W-0.15,-H],[W*0.45,H-0.08],[-W*0.45,H-0.08]],c:1}); break;
    case 'stair': { const n=Math.max(2,Math.round(h/0.28)); for(let i=1;i<n;i++){const y=-H+i*h/n; P.push({l:[-W,y,W,y]});} P.push({l:[0,H-0.15,0,-H+0.3]},{l:[0,-H+0.3,-0.12,-H+0.48]},{l:[0,-H+0.3,0.12,-H+0.48]}); break; }
  }
  return P;
}
function toWorld(it){ return (x,y)=>{ const q=rotP(x,y,it.rot||0); return [q[0]+it.x,q[1]+it.y]; }; }
// ---------- καμινάδες και σκάλες ----------
function chimTop(it,k){ const t=it.to!=null?flIdx(it.to):-1; return t>=k? t : S.floors.length-1; }
function floorGhost(){ const i=flIdx(S.fl), G={below:[],chims:[],stairs:[]};
  S.floors.forEach((f,k)=>{ if(k===i) return; const d=floorData(f);
    if(k===i-1){ for(const r of d.rooms){ const adds=[],subs=[]; for(const it of d.items) if(it.room===r.id&&isShape(it)){ const p=itemPts(it); if(p.length>=3)(it.sub?subs:adds).push([p]); }
        try{ let res=adds.length?PC.union(...adds):[]; if(subs.length&&res.length) res=PC.difference(res,...subs); G.below.push(...res); }catch(e){} }
      for(const it of d.items) if(it.t==='stair') G.stairs.push(it); }
    if(k<i) for(const it of d.items) if(it.t==='chim'&&chimTop(it,k)>=i) G.chims.push({it,from:f}); });
  return G; }
function chimPrims(it){ const n=Math.max(1,it.n||1), fw=it.fw||0.20, fh=Math.min(it.fh||0.20,it.h-0.04), gap=(it.w-n*fw)/(n+1), P=[];
  for(let k=0;k<n;k++){ const x0=-it.w/2+gap*(k+1)+fw*k; P.push({pl:[[x0,-fh/2],[x0+fw,-fh/2],[x0+fw,fh/2],[x0,fh/2]]}); } return P; }
const TURNS={S:'Ίσια',R:'Στρίβει δεξιά',L:'Στρίβει αριστερά',UR:'Πίσω, από δεξιά',UL:'Πίσω, από αριστερά'};
function stairH(it){ return it.H>0? it.H : FL().h; }
function stairGeo(it){ const w=it.w||1, tr=it.tread||0.28, gap=it.gap!=null?it.gap:0.10, tw=toWorld(it);
  const add=(p,v,k)=>[p[0]+v[0]*k,p[1]+v[1]*k], right=d=>[-d[1],d[0]];
  const box=(P,d,s,len,a0,a1)=>[add(add(P,s,a0),d,0),add(add(P,s,a0),d,len),add(add(P,s,a1),d,len),add(add(P,s,a1),d,0)];
  let P=[0,0], d=[1,0]; const polys=[], risers=[], path=[[0,0]]; let N=0;
  for(const sg of it.segs||[]){
    if(sg.t==='run'){ const n=Math.max(2,sg.n|0), len=(n-1)*tr, s=right(d); polys.push(box(P,d,s,len,-w/2,w/2));
      for(let k=0;k<n;k++){ const q=add(P,d,k*tr); risers.push({a:add(q,s,-w/2),b:add(q,s,w/2),i:N+k+1}); } N+=n; P=add(P,d,len); path.push(P); }
    else { const L=sg.L>0?sg.L:w, t=sg.turn||'S';
      if(t==='S'){ polys.push(box(P,d,right(d),L,-w/2,w/2)); P=add(P,d,L); path.push(P); }
      else if(t==='R'||t==='L'){ const s=right(d).map(v=>v*(t==='R'?1:-1)); polys.push(box(P,d,s,L,-w/2,w/2)); const m=add(P,d,L-w/2); path.push(m); P=add(m,s,w/2); d=s; path.push(P); }
      else { const s=right(d).map(v=>v*(t==='UR'?1:-1)); polys.push(box(P,d,s,L,-w/2,w+gap+w/2)); const m=add(P,d,L/2); path.push(m); const m2=add(m,s,w+gap); path.push(m2); P=add(P,s,w+gap); d=[-d[0],-d[1]]; path.push(P); } } }
  const H=stairH(it), rh=N?H/N:0, cut=N? Math.min(N,Math.ceil(1.20/(rh||1))) : 0;
  const W=p=>tw(p[0],p[1]);
  return {polys:polys.map(q=>q.map(W)), risers:risers.map(r=>({a:W(r.a),b:W(r.b),i:r.i})), path:path.map(W), N, rh, rule:2*rh+tr, cut, H}; }
function stairCheck(g,it){ const tr=it.tread||0.28; if(!g.N) return {lvl:'bad',msg:'Βάλε σκέλος με σκαλιά'}; const rule=g.rule;
  const lvl= g.rh>0.19||g.rh<0.14||rule<0.59||rule>0.66 ? 'warn' : 'ok';
  return {lvl,msg:`${g.N} ρίχτια × ${cm(g.rh)} εκ., πάτημα ${cm(tr)} εκ. · 2ρ+π = ${cm(rule)} εκ. ${lvl==='ok'?'✓':'(καλό είναι 60–65 εκ., ρίχτι έως 19 εκ.)'}`}; }
function stairPreset(k,N,w){ const a=Math.ceil(N/2), b=Math.max(2,N-a);
  if(k==='I') return [{t:'run',n:N}];
  if(k==='IL') return [{t:'run',n:a},{t:'land',L:w,turn:'S'},{t:'run',n:b}];
  if(k==='GR'||k==='GL') return [{t:'run',n:a},{t:'land',L:w,turn:k==='GR'?'R':'L'},{t:'run',n:b}];
  if(k==='P') return [{t:'run',n:a},{t:'land',L:w,turn:'UR'},{t:'run',n:b}];
  return [{t:'run',n:Math.ceil(N/3)},{t:'land',L:w,turn:'R'},{t:'run',n:Math.ceil(N/3)},{t:'land',L:w,turn:'R'},{t:'run',n:Math.max(2,N-2*Math.ceil(N/3))}]; }
function drawStair(it,ghost){ const g=stairGeo(it), hot=!ghost&&it.id===sel; ctx.save(); ctx.lineWidth=hot?2:1.2; ctx.strokeStyle=hot?colors.accent:colors.ink;
  if(ghost){ ctx.setLineDash([6,4]); ctx.globalAlpha*=0.6; for(const q of g.polys){ pathPts(q); ctx.stroke(); } ctx.restore(); return; }
  for(const q of g.polys){ ctx.fillStyle=colors.fill; pathPts(q); ctx.fill(); ctx.stroke(); }
  ctx.lineWidth=hot?1.4:0.9; for(const r of g.risers){ ctx.setLineDash(r.i>g.cut?[4,3]:[]); line(r.a,r.b); } ctx.setLineDash([]);
  const cr=g.risers.find(r=>r.i===g.cut); if(cr&&g.cut<g.N){ const nx=g.risers.find(r=>r.i===g.cut+1)||cr, a=cr.a, b=nx.b; ctx.lineWidth=1.4; line(a,b); }
  if(g.path.length>1){ ctx.lineWidth=1; ctx.strokeStyle=hot?colors.accent:colors['ink-2']; ctx.beginPath(); g.path.forEach((p,i)=>{ const s=W2S(p); i?ctx.lineTo(s[0],s[1]):ctx.moveTo(s[0],s[1]); }); ctx.stroke();
    const e=g.path[g.path.length-1], f=g.path[g.path.length-2], an=Math.atan2(e[1]-f[1],e[0]-f[0]), E=W2S(e); ctx.beginPath(); ctx.moveTo(E[0]-10*Math.cos(an-0.4),E[1]-10*Math.sin(an-0.4)); ctx.lineTo(E[0],E[1]); ctx.lineTo(E[0]-10*Math.cos(an+0.4),E[1]-10*Math.sin(an+0.4)); ctx.stroke();
    const s0=W2S(g.path[0]); ctx.beginPath(); ctx.arc(s0[0],s0[1],3,0,7); ctx.fillStyle=ctx.strokeStyle; ctx.fill();
    if(view.s>25){ const a1=g.path[1], an1=Math.atan2(a1[1]-g.path[0][1],a1[0]-g.path[0][0]), q=[g.path[0][0]+Math.cos(an1)*0.35,g.path[0][1]+Math.sin(an1)*0.35]; text('ΑΝ',W2S(q),11,hot?colors.accent:colors.ink,0,'700'); } }
  ctx.restore(); }
function drawChim(it,ghost){ const hot=!ghost&&it.id===sel; ctx.save(); ctx.fillStyle=colors.wall; ctx.strokeStyle=hot?colors.accent:colors.ink; ctx.lineWidth=hot?2.5:1.4; if(ghost) ctx.globalAlpha*=0.85;
  pathPts(boxPts(it)); ctx.fill(); ctx.stroke(); ctx.fillStyle=colors.paper; ctx.lineWidth=1; for(const p of chimPrims(it)){ pathPts(p.pl.map(q=>toWorld(it)(q[0],q[1]))); ctx.fill(); ctx.stroke(); }
  ctx.restore(); }


// ---------- interior wall that splits a room ----------
function roomAxis(id){ let best=null,ba=-1; for(const it of roomItems(id)) if(isShape(it)&&!it.sub){ const a=Math.abs(areaRing(itemPts(it))); if(a>ba){ba=a;best=it;} } return best? (best.rot||0) : 0; }
function splitFrame(sp){ const ang=rad(roomAxis(sp.room)); const u=[Math.cos(ang),Math.sin(ang)], v=[-Math.sin(ang),Math.cos(ang)];
  const n= sp.dir==='v'? u : v, w= sp.dir==='v'? v : u; const o=OL[sp.room]; let mn=1e9,mx=-1e9,wm=1e9,wM=-1e9;
  for(const poly of o.polys) for(const p of poly[0]){ const k=p[0]*n[0]+p[1]*n[1], j=p[0]*w[0]+p[1]*w[1]; mn=Math.min(mn,k); mx=Math.max(mx,k); wm=Math.min(wm,j); wM=Math.max(wM,j); }
  return {n,w,mn,mx,wm,wM}; }
function splitStrip(sp){ const f=splitFrame(sp), k0=f.mn+sp.d, k1=k0+sp.t, j0=f.wm-1, j1=f.wM+1;
  const P=(k,j)=>[r4(f.n[0]*k+f.w[0]*j), r4(f.n[1]*k+f.w[1]*j)]; return [P(k0,j0),P(k1,j0),P(k1,j1),P(k0,j1)]; }
function doSplit(sp){
  const o=OL[sp.room]; if(!o||!o.polys.length) return toast('Ο χώρος δεν έχει σχήμα');
  let pieces; try{ pieces=PC.difference(o.polys.map(p=>p.map(r=>r.slice())), [splitStrip(sp)]); }catch(e){ return toast('Δεν μπόρεσα να χωρίσω τον χώρο'); }
  pieces=pieces.map(p=>cleanRing(p[0])).filter(r=>r.length>=3&&Math.abs(areaRing(r))>0.05);
  if(pieces.length<2) return toast('Ο τοίχος δεν κόβει τον χώρο στα δύο. Άλλαξε την απόσταση.');
  snap(); const room=roomById(sp.room), base=room.name; const ids=[];
  const others=roomItems(sp.room).filter(i=>!isShape(i));
  S.items=S.items.filter(i=>!(i.room===sp.room&&isShape(i)));
  pieces.sort((A,B)=>{ const ca=centroid(A), cb=centroid(B), f=splitFrame(sp); return (ca[0]*f.n[0]+ca[1]*f.n[1])-(cb[0]*f.n[0]+cb[1]*f.n[1]); });
  pieces.forEach((ring,k)=>{ let id=sp.room; if(k===0){ room.name=base+' 1'; } else { id=newRoomId(); S.rooms.push({id,name:base+' '+(k+1)}); }
    ids.push(id); const c=centroid(ring); S.items.push({id:S.next++,room:id,t:'poly',x:r4(c[0]),y:r4(c[1]),rot:0,sub:false,pts:ring.map(p=>[r4(p[0]-c[0]),r4(p[1]-c[1])]),src:{k:'split'}}); });
  compute();
  for(const it of others){ const p=[it.x,it.y]; let best=ids[0],bd=1e9;
    for(const id of ids){ const ol=OL[id]; if(!ol) continue; let d;
      if(it.t==='door'||it.t==='window'){ const ne=nearestEdge(p,ol.edges); d=ne?ne.d:1e9; } else d= inPolys(p,ol.polys)?0:(nearestEdge(p,ol.edges)||{d:1e9}).d;
      if(d<bd){bd=d;best=id;} }
    it.room=best; }
  splitting=null; selRoom=null; commit(); toast('Έγινε: '+pieces.length+' χώροι. Άλλαξε τα ονόματα πατώντας πάνω τους.'); }

// ---------- view ----------
const W2S = p => [p[0]*view.s+view.ox, p[1]*view.s+view.oy];
const S2W = (x,y) => [(x-view.ox)/view.s, (y-view.oy)/view.s];
function bbox(only){ let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; const add=p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);};
  for(const it of S.items){ if(only!=null&&it.room!==only) continue; const pts=itemPts(it); if(pts.length) pts.forEach(add); else add([it.x,it.y]); }
  if(only==null){ for(const poly of HOUSE.foot) poly[0].forEach(add); if(typeof ktRings==='function') for(const r of ktRings()) r.forEach(add); if(S.topo) for(const e of S.topo.ents) if(S.topo.layers[e.l]!==false) e.pts.forEach(add); }
  return x0>x1? [0,0,6,4] : [x0,y0,x1,y1]; }
function fit(only){ const b=bbox(only), r=cv.getBoundingClientRect(), pad=Math.min(70,0.12*Math.min(r.width,r.height)+20); const w=Math.max(1,b[2]-b[0]), h=Math.max(1,b[3]-b[1]);
  view.s=Math.max(2,Math.min(400,Math.min((r.width-pad*2)/w,(r.height-pad*2)/h)));
  view.ox=r.width/2-(b[0]+b[2])/2*view.s; view.oy=r.height/2-(b[1]+b[3])/2*view.s; render(); }
function zoomAt(f,sx,sy){ const w=S2W(sx,sy); view.s=Math.max(2,Math.min(600,view.s*f)); view.ox=sx-w[0]*view.s; view.oy=sy-w[1]*view.s; render(); }

// ---------- render ----------
let colors={};
function readColors(){ const cs=getComputedStyle(document.documentElement); for(const k of ['paper','sheet','ink','ink-2','line','accent','sub','fill','grid','grid-major','furn','col','ok','warn','wall','topo','ins','clad','fill-v','fill-e']) colors[k]=cs.getPropertyValue('--'+k).trim(); }
function fmt(v){ return (Math.round(v*100)/100).toFixed(2); }
function polyPath(polys){ ctx.beginPath(); for(const poly of polys) for(const ring of poly){ ring.forEach((p,i)=>{const s=W2S(p); i?ctx.lineTo(s[0],s[1]):ctx.moveTo(s[0],s[1]);}); ctx.closePath(); } }
function keyMatch(roomId,k,a,b){ const A=toLocal(roomId,a), B=toLocal(roomId,b), m=[(A[0]+B[0])/2,(A[1]+B[1])/2];
  const L=Math.hypot(B[0]-A[0],B[1]-A[1])||1, wl=Math.hypot(k[2]-k[0],k[3]-k[1])||1;
  if(Math.abs((B[0]-A[0])/L*(k[3]-k[1])/wl-(B[1]-A[1])/L*(k[2]-k[0])/wl)>0.02) return 1e9;
  const q=segNear(m,[k[0],k[1]],[k[2],k[3]]); return Math.hypot(q[0]-m[0],q[1]-m[1]); }
function selWallInfo(){ if(!selWall) return null; let best=null,bd=0.1; for(const w of WALLS){ if(w.room!==selWall.room) continue; const d=keyMatch(w.room,selWall.k,w.a,w.b); if(d<bd){bd=d;best=w;} } return best; }
function wallQuad(w){ const d=Math.max(w.d,0.02); return [w.a,w.b,[w.b[0]+w.on[0]*d,w.b[1]+w.on[1]*d],[w.a[0]+w.on[0]*d,w.a[1]+w.on[1]*d]]; }
function wallLabel(w){ if(!w.ext) return cm(w.gap); let s=cm(w.T); if(w.c){ const b=consBands(w.c); if(b.some(x=>x.k==='ins')) s+='·Μ'; if(b.some(x=>x.k==='clad')) s+='·Ε'; } return s; }
function drawThick(){ const placed=[];
  for(const w of WALLS){ if(w.L*view.s<28||w.d<=0) continue; const m=[(w.a[0]+w.b[0])/2+w.on[0]*w.d/2,(w.a[1]+w.b[1])/2+w.on[1]*w.d/2];
    if(placed.some(p=>Math.hypot(p[0]-m[0],p[1]-m[1])<0.35)) continue; placed.push(m);
    const col= w.src==='wall'?colors.accent : w.ext?colors.ink:colors['ink-2'];
    text(wallLabel(w), W2S(m), 11, col, Math.atan2(w.uy,w.ux), '600', true); } }
// ---------- έλεγχος κλεισίματος ----------
// πλευρές s[0..n-1] (ΑΒ, ΒΓ, …, τελευταία προς Α) και διαγώνιοι από το Α προς τις κορυφές 2..n-2
function diagSolve(sides,diags){ const n=sides.length; if(n<3) return {err:'Χρειάζονται τουλάχιστον 3 πλευρές'};
  const V=[[0,0],[sides[0],0]];
  for(let k=2;k<n;k++){ const P=V[k-1], a=Math.hypot(P[0],P[1]), b=k===n-1? sides[n-1] : diags[k-2], c=sides[k-1];
    if(!(b>0&&c>0)) return {err:'Λείπει '+(k===n-1?'η πλευρά '+corner(n-1)+'Α':(!(b>0)?'η διαγώνιος Α'+corner(k):'η πλευρά '+corner(k-1)+corner(k)))};
    const def=Math.max(a-(b+c), b-(a+c), c-(a+b)); if(def>0) return {err:'Το τρίγωνο Α'+corner(k-1)+corner(k)+' δεν κλείνει: λείπουν '+cm(def)+' εκ. Έλεγξε τις μετρήσεις του.', bad:def};
    const cos=Math.max(-1,Math.min(1,(a*a+b*b-c*c)/(2*a*b))), th=Math.acos(cos), ux=P[0]/a, uy=P[1]/a;
    V.push([b*(ux*Math.cos(th)-uy*Math.sin(th)), b*(ux*Math.sin(th)+uy*Math.cos(th))]); }
  return {pts:V}; }
function lvlOf(diff){ const t=S.tol||0.03; return diff<=t+1e-9?'ok':diff<=0.10+1e-9?'warn':'bad'; }
// έλεγχοι ενός σχήματος: [{lbl, meas, calc, diff, lvl}]
function shapeChecks(it){ const out=[]; const src=it.src||{};
  const add=(lbl,meas,calc)=>{ const diff=Math.abs(meas-calc); out.push({lbl,meas,calc,diff,lvl:lvlOf(diff)}); };
  if(it.t==='rect'&&it.chk){ const D=Math.hypot(it.w,it.h); it.chk.forEach((v,i)=>{ if(v>0) add(i?'ΒΔ':'ΑΓ',v,D); }); }
  if(it.t==='poly'&&src.k==='diag'){ const r=diagSolve(src.sides,src.diags); if(r.err) out.push({lbl:'σχήμα',err:r.err,diff:r.bad||1,lvl:'bad'});
    else for(const c of src.checks||[]){ const A=r.pts[c[0]], B=r.pts[c[1]]; if(A&&B&&c[2]>0) add(corner(c[0])+corner(c[1]),c[2],Math.hypot(B[0]-A[0],B[1]-A[1])); } }
  if(it.t==='poly'&&src.k==='sides'&&src.close>0){ const pts=walkRows(src.rows), e=pts[pts.length-1]; add('τελευταία πλευρά',src.close,Math.hypot(e[0],e[1])); }
  return out; }
function walkRows(rows){ let x=0,y=0,dir=0; const pts=[[0,0]]; for(const r of rows){ x+=r[0]*Math.cos(rad(dir)); y+=r[0]*Math.sin(rad(dir)); pts.push([x,y]); dir+=180-r[1]; } return pts; }
function roomCheck(id){ let n=0,worst=0,lvl='ok'; const rank={ok:0,warn:1,bad:2};
  for(const it of roomItems(id)) if(isShape(it)) for(const c of shapeChecks(it)){ n++; if(c.diff>worst) worst=c.diff; if(rank[c.lvl]>rank[lvl]) lvl=c.lvl; }
  return {n,worst,lvl}; }
function checkNotes(list){ return list.map(c=>`<div class="note ${c.lvl==='ok'?'ok':'warn'}" ${c.lvl==='bad'?'style="color:var(--sub)"':''}>${c.err? esc(c.err) : `${c.lvl==='ok'?'✓':'⚠'} ${esc(c.lbl)}: μέτρησες ${fmt(c.meas)}, το σχήμα δίνει ${fmt(c.calc)} · διαφορά ${cm(c.diff)} εκ.${c.lvl==='ok'?'':c.lvl==='warn'?' Έλεγξε τη μέτρηση.':' Πιθανό λάθος: ξαναμέτρησε.'}`}</div>`).join(''); }
function render(){
  if(!S) return;
  const dpr=window.devicePixelRatio||1, r=cv.getBoundingClientRect();
  if(cv.width!==Math.round(r.width*dpr)||cv.height!==Math.round(r.height*dpr)){ cv.width=Math.round(r.width*dpr); cv.height=Math.round(r.height*dpr); }
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle=colors.paper; ctx.fillRect(0,0,r.width,r.height);
  // grid
  const step=view.s>=90?0.1:view.s>=25?0.5:view.s>=6?1:5;
  const w0=S2W(0,0), w1=S2W(r.width,r.height); ctx.lineWidth=1;
  for(let x=Math.floor(w0[0]/step)*step;x<=w1[0];x+=step){ const sx=Math.round(x*view.s+view.ox)+.5, major=Math.abs(x/ (step<1?1:5) -Math.round(x/(step<1?1:5)))<1e-6; ctx.strokeStyle=major?colors['grid-major']:colors.grid; ctx.beginPath(); ctx.moveTo(sx,0); ctx.lineTo(sx,r.height); ctx.stroke(); }
  for(let y=Math.floor(w0[1]/step)*step;y<=w1[1];y+=step){ const sy=Math.round(y*view.s+view.oy)+.5, major=Math.abs(y/(step<1?1:5)-Math.round(y/(step<1?1:5)))<1e-6; ctx.strokeStyle=major?colors['grid-major']:colors.grid; ctx.beginPath(); ctx.moveTo(0,sy); ctx.lineTo(r.width,sy); ctx.stroke(); }
  // topographer outline
  if(S.topo&&mode==='house'){ ctx.strokeStyle=colors.topo; ctx.lineWidth=1.5; ctx.setLineDash([8,4]);
    for(const e of S.topo.ents){ if(S.topo.layers[e.l]===false||e.l===S.topo.bld) continue; ctx.beginPath(); e.pts.forEach((p,i)=>{const s=W2S(p); i?ctx.lineTo(s[0],s[1]):ctx.moveTo(s[0],s[1]);}); if(e.c) ctx.closePath(); ctx.stroke(); }
    ctx.setLineDash([]);
    const BR=S.topo.bld&&S.topo.layers[S.topo.bld]!==false?S.topo.bldRings||[]:[];
    if(S.topo.bld&&S.topo.layers[S.topo.bld]!==false&&S.bld){ ctx.save(); ctx.strokeStyle=colors.topo; ctx.globalAlpha=0.55; ctx.lineWidth=1; ctx.setLineDash([3,3]); for(const r of BR){ pathPts(r); ctx.stroke(); } ctx.restore(); }
    else if(S.topo.bld&&S.topo.layers[S.topo.bld]!==false){ ctx.save(); ctx.fillStyle=colors.topo; ctx.globalAlpha=0.10; ctx.beginPath(); for(const r of BR) r.forEach((p,i)=>{const q=W2S(p); i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]); if(i===r.length-1) ctx.closePath();}); ctx.fill('evenodd'); ctx.restore();
      ctx.strokeStyle=colors.topo; ctx.lineWidth=2.5; for(const e of S.topo.ents){ if(e.l!==S.topo.bld) continue; ctx.beginPath(); e.pts.forEach((p,i)=>{const q=W2S(p); i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);}); if(e.c) ctx.closePath(); ctx.stroke(); } }
  }
  // floor below, faint
  if(GHOST.below.length){ ctx.save(); ctx.strokeStyle=colors['ink-2']; ctx.globalAlpha=0.45; ctx.lineWidth=1; ctx.setLineDash([3,4]); for(const poly of GHOST.below) for(const ring of poly){ pathPts(ring); ctx.stroke(); } ctx.restore(); }
  // walls
  if(HOUSE.walls.length&&mode==='house'){ ctx.fillStyle=colors.wall; polyPath(HOUSE.walls); ctx.fill('evenodd');
    if(HOUSE.ins.length){ ctx.fillStyle=colors.ins; polyPath(HOUSE.ins); ctx.fill('evenodd'); }
    if(HOUSE.clad.length){ ctx.fillStyle=colors.clad; polyPath(HOUSE.clad); ctx.fill('evenodd'); }
    if(selWall){ const w=selWallInfo(); if(w){ ctx.fillStyle=colors.accent; ctx.globalAlpha=0.45; pathPts(wallQuad(w)); ctx.fill(); ctx.globalAlpha=1; } } }
  // rooms
  for(const room of S.rooms){ const o=OL[room.id]; if(!o||!o.polys.length) continue;
    const dim = mode==='room' && room.id!==cur; if(dim&&!showOthers) continue;
    const u=useOf(room); ctx.globalAlpha= dim?0.4:1; ctx.fillStyle=u==='voith'?colors['fill-v']:u==='exo'?colors['fill-e']:colors.fill; polyPath(o.polys); ctx.fill('evenodd');
    if(u==='imiy'){ ctx.save(); polyPath(o.polys); ctx.clip('evenodd'); ctx.strokeStyle=colors['ink-2']; ctx.globalAlpha*=0.35; ctx.lineWidth=1; const b=bbox(room.id), A=W2S([b[0],b[1]]), B=W2S([b[2],b[3]]); for(let x=A[0]-(B[1]-A[1]);x<B[0];x+=12){ ctx.beginPath(); ctx.moveTo(x,B[1]); ctx.lineTo(x+(B[1]-A[1]),A[1]); ctx.stroke(); } ctx.restore(); }
    ctx.globalAlpha=1; }
  // construction shapes of the edited room
  if(mode==='room'){ ctx.setLineDash([5,4]); ctx.lineWidth=1;
    for(const it of S.items) if(it.room===cur&&isShape(it)){ ctx.strokeStyle=it.sub?colors.sub:colors['ink-2']; ctx.globalAlpha=it.id===sel?1:0.45; pathPts(itemPts(it)); ctx.stroke(); }
    ctx.globalAlpha=1; ctx.setLineDash([]); }
  // measured diagonals of the selected shape
  if(mode==='room'){ const it=byId(sel); if(it&&it.t==='poly'&&it.src&&it.src.k==='diag'&&it.room===cur){ const V=itemPts(it); ctx.save(); ctx.setLineDash([6,4]); ctx.strokeStyle=colors.accent; ctx.lineWidth=1;
      const dl=(i,j,lab)=>{ const A=V[i],B=V[j]; if(!A||!B) return; line(A,B); text(lab,W2S([(A[0]+B[0])/2,(A[1]+B[1])/2]),11,colors.accent,Math.atan2(B[1]-A[1],B[0]-A[0]),'600'); };
      it.src.diags.forEach((v,k)=>dl(0,k+2,'Α'+corner(k+2)+' '+fmt(v))); for(const c of it.src.checks||[]) dl(c[0],c[1],corner(c[0])+corner(c[1])+' '+fmt(c[2])); ctx.restore(); } }
  // house mode: corner letters of the selected room, and the rotation pivot
  if(mode==='house'&&selRoom!=null){ const C=roomCorners(selRoom); if(C.length>=3){ const c=centroid(C), pk=pivIdx(selRoom);
      C.forEach((p,i)=>{ const s0=W2S(p), sc=W2S(c); let dx=s0[0]-sc[0], dy=s0[1]-sc[1]; const L=Math.hypot(dx,dy)||1; text(corner(i),[s0[0]+dx/L*14,s0[1]+dy/L*14],12,i===pk?colors.sub:colors.accent,0,'700');
        if(i===pk){ ctx.save(); ctx.fillStyle=colors.sub; ctx.beginPath(); ctx.arc(s0[0],s0[1],5,0,Math.PI*2); ctx.fill(); ctx.restore(); } }); } }
  // corner letters Α Β Γ Δ … so the user knows which corners a diagonal joins
  if(mode==='room'){ for(const it of S.items) if(it.room===cur&&isShape(it)){ const P=itemPts(it); if(P.length<3) continue; const c=centroid(P), hot=it.id===sel;
      if(!hot&&S.items.filter(i=>i.room===cur&&isShape(i)).length>1&&!(it.chk||(it.src&&(it.src.k==='diag'||it.src.k==='sides'||it.src.k==='pen')))) continue;
      P.forEach((p,i)=>{ const s0=W2S(p), sc=W2S(c); let dx=s0[0]-sc[0], dy=s0[1]-sc[1]; const L=Math.hypot(dx,dy)||1; text(corner(i),[s0[0]+dx/L*13,s0[1]+dy/L*13],12,hot?colors.accent:colors['ink-2'],0,'700'); }); } }
  // outlines
  ctx.lineJoin='miter';
  for(const room of S.rooms){ const o=OL[room.id]; if(!o) continue; const dim=mode==='room'&&room.id!==cur; if(dim&&!showOthers) continue;
    ctx.strokeStyle= (mode==='house'&&room.id===selRoom)?colors.accent:colors.ink; ctx.lineWidth=(mode==='house'&&room.id===selRoom)?3:(dim?1.2:2); ctx.globalAlpha=dim?0.5:1;
    if(isOpen(room)) ctx.setLineDash([7,4]); for(const poly of o.polys) for(const ring of poly){ pathPts(ring); ctx.stroke(); } ctx.setLineDash([]); ctx.globalAlpha=1; }
  if(HOUSE.foot.length&&mode==='house'){ ctx.strokeStyle=colors.ink; ctx.lineWidth=2.5; for(const poly of HOUSE.foot) for(const ring of poly){ pathPts(ring); ctx.stroke(); } }
  // openings
  for(const it of S.items) if(it.t==='door'||it.t==='window'){
    let g=openingGeo(it); if(!g) continue; if(mode==='room') g=Object.assign({},g,{depth:Math.min(g.depth,0.12)}); const dim=mode==='room'&&it.room!==cur; if(dim&&!showOthers) continue; ctx.globalAlpha=dim?0.45:1;
    ctx.fillStyle=colors.fill; pathPts(openingHole(g)); ctx.fill();
    const hot=it.id===sel; ctx.strokeStyle=hot?colors.accent:colors.ink; ctx.lineWidth=hot?2:1.3;
    for(const l of jambPrims(g)) line(l[0],l[1]);
    if(it.t==='door'){ const d=doorPrims(it,g); for(const l of d.lines) line(l[0],l[1]);
      ctx.lineWidth=hot?1.5:0.9; for(const ar of d.arcs){ const c=W2S(ar.c); let da=ar.a1-ar.a0; while(da>Math.PI) da-=2*Math.PI; while(da<-Math.PI) da+=2*Math.PI; ctx.beginPath(); ctx.arc(c[0],c[1],ar.r*view.s,ar.a0,ar.a0+da,da<0); ctx.stroke(); } }
    else for(const l of windowPrims(it,g)) line(l[0],l[1]);
    if(showDims&&mode==='room'&&it.room===cur){ const k=0.3+14/view.s, m=W2S([g.c[0]+g.e.nx*k,g.c[1]+g.e.ny*k]), u=tagUp(g.e);
      text(openCode(it), [m[0]+u[0]*7,m[1]+u[1]*7], 11, colors.accent, angleOf(g.e),'700'); text(openSize(it,g), [m[0]-u[0]*7,m[1]-u[1]*7], 11, colors.accent, angleOf(g.e)); }
    else if(mode==='house'&&view.s>35){ const two=view.s>50, k=g.depth+0.18+(two?8/view.s:0), m=W2S([g.c[0]-g.e.nx*k,g.c[1]-g.e.ny*k]), u=tagUp(g.e);
      if(two){ text(openCode(it), [m[0]+u[0]*6.5,m[1]+u[1]*6.5], 10, colors.accent, angleOf(g.e),'600'); text(openSize(it,g), [m[0]-u[0]*6.5,m[1]-u[1]*6.5], 10, colors.accent, angleOf(g.e)); }
      else text(openCode(it), m, 10, colors.accent, angleOf(g.e),'600'); }
    ctx.globalAlpha=1; }
  // furniture & columns
  for(const it of S.items){ const dim=mode==='room'&&it.room!==cur; if(dim&&!showOthers) continue; ctx.globalAlpha=dim?0.45:1;
    if(it.t==='furn'){ ctx.strokeStyle=it.id===sel?colors.accent:colors.furn; ctx.lineWidth=it.id===sel?2:1.1; drawPrims(furnPrims(it.k,it.w,it.h),toWorld(it)); }
    if(it.t==='stair') drawStair(it,false);
    if(it.t==='chim') drawChim(it,false);
    if(it.t==='col'){ ctx.fillStyle=colors.col; ctx.strokeStyle=it.id===sel?colors.accent:colors.col; ctx.lineWidth=it.id===sel?3:1;
      if(it.round){ const c=W2S([it.x,it.y]); ctx.beginPath(); ctx.arc(c[0],c[1],it.w/2*view.s,0,Math.PI*2); ctx.fill(); ctx.stroke(); } else { pathPts(itemPts(it)); ctx.fill(); ctx.stroke(); } }
  } ctx.globalAlpha=1;
  for(const g of GHOST.chims) drawChim(g.it,true);
  for(const st of GHOST.stairs) drawStair(st,true);
  // dims on the edited room's walls
  if(showDims&&mode==='room'){ const o=OL[cur]; if(o) for(const e of o.edges){ if(e.L*view.s<26) continue; const off=Math.max(0.2,16/view.s); const m=[(e.a[0]+e.b[0])/2-e.nx*off,(e.a[1]+e.b[1])/2-e.ny*off]; text(fmt(e.L),W2S(m),12,colors.ink,angleOf(e),'600'); } }
  if(showThick&&mode==='house') drawThick();
  if(showDims&&mode==='house'){ for(const e of HOUSE.footEdges){ if(e.L*view.s<30) continue; const m=[(e.a[0]+e.b[0])/2-e.nx*0.25,(e.a[1]+e.b[1])/2-e.ny*0.25]; text(fmt(e.L),W2S(m),12,colors['ink-2'],angleOf(e)); } }
  // room names and areas
  for(const room of S.rooms){ const o=OL[room.id]; if(!o||!o.polys.length) continue; const dim=mode==='room'&&room.id!==cur; if(dim&&!showOthers) continue;
    let big=o.polys[0]; for(const p of o.polys) if(p.area>big.area) big=p; let c=centroid(big[0]); if(!inPolys(c,o.polys)) c=big[0][0]; const s=W2S(c);
    ctx.globalAlpha=dim?0.6:1; text(roomNo(room.id)+'. '+room.name, [s[0],s[1]-9], 13, colors.ink, 0, '600'); text('Ε = '+fmt(o.area)+' m²'+(useOf(room)!=='kyr'?' · '+USES[useOf(room)].toLowerCase():''), [s[0],s[1]+9], 12, colors['ink-2'], 0);
    const st=roomCheck(room.id); if(st.n){ const col=st.lvl==='ok'?colors.ok:st.lvl==='warn'?colors.warn:colors.sub; text(st.lvl==='ok'?'✓ κλείνει':'⚠ '+cm(st.worst)+' εκ.', [s[0],s[1]+25], 11, col, 0, '600'); }
    ctx.globalAlpha=1; }
  for(const it of S.items) if(it.t==='label'&&(mode==='house'||it.room===cur)){ text(it.text||'—',W2S([it.x,it.y]),14,it.id===sel?colors.accent:colors.ink,0,'600'); }
  if(mode==='room') for(const it of S.items) if(it.t==='furn'&&it.room===cur&&Math.min(it.w,it.h)*view.s>44){ const s=W2S([it.x,it.y]); text(FURN[it.k]?FURN[it.k].n:'',[s[0],s[1]+(it.k==='bed2'||it.k==='bed1'?16:0)],10,colors.furn,0); }
  // selection
  const it=byId(sel);
  if(it&&mode==='room'){ ctx.strokeStyle=colors.accent; ctx.lineWidth=2;
    if(isShape(it)){ pathPts(itemPts(it)); ctx.stroke(); ctx.fillStyle=colors.accent; for(const p of itemPts(it)){ const s=W2S(p); ctx.beginPath(); ctx.arc(s[0],s[1],4,0,7); ctx.fill(); }
      if(showDims&&!(penEdit&&penEdit.id===it.id)){ const pts=itemPts(it); for(let i=0;i<pts.length;i++){ const a=pts[i],b=pts[(i+1)%pts.length], L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L*view.s<30) continue; const s=W2S([(a[0]+b[0])/2,(a[1]+b[1])/2]); text(fmt(L),s,11,colors.accent,Math.atan2(b[1]-a[1],b[0]-a[0]),'600',true); } } }
    if(it.t==='label'){ const s=W2S([it.x,it.y]); ctx.strokeRect(s[0]-60,s[1]-13,120,26); } }
  if(splitting&&OL[splitting.room]){ ctx.save(); ctx.fillStyle=colors.accent; ctx.globalAlpha=0.35; polyPath([[splitStrip(splitting)]]); ctx.save(); polyPath(OL[splitting.room].polys); ctx.clip('evenodd'); ctx.globalAlpha=0.5; polyPath([[splitStrip(splitting)]]); ctx.fill(); ctx.restore(); ctx.restore(); }
  if(snapMark){ const s=W2S(snapMark); ctx.strokeStyle=colors.ok; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(s[0],s[1],8,0,7); ctx.stroke(); }
  // γραφίδα: η γραμμή που ζωγραφίζεται, και οι πλευρές του σχήματος που μετριέται
  if(penStroke&&penStroke.pts.length>1){ ctx.save(); ctx.strokeStyle=colors.sub; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.beginPath(); penStroke.pts.forEach((p,i)=>{ const s=W2S(p); i?ctx.lineTo(s[0],s[1]):ctx.moveTo(s[0],s[1]); }); ctx.stroke(); ctx.restore(); }
  if(penEdit&&mode==='room'){ const it=byId(penEdit.id); if(it){ const P=itemPts(it), n=P.length, g=penSolve(it.src.sides), c=centroid(P); ctx.save();
    for(let i=0;i<n;i++){ const a=P[i], b=P[(i+1)%n], act=i===penEdit.active, k=g.kind[i]; ctx.strokeStyle=act?colors.sub:k==='m'?colors.ok:k==='c'?colors.accent:colors['ink-2']; ctx.lineWidth=act?5:3; ctx.setLineDash(k==='s'?[7,5]:[]); line(a,b);
      const m=[(a[0]+b[0])/2,(a[1]+b[1])/2], sm=W2S(m), sc=W2S(c); let dx=sm[0]-sc[0], dy=sm[1]-sc[1]; const L=Math.hypot(dx,dy)||1;
      text(corner(i)+corner((i+1)%n)+' '+fmt(g.L[i]),[sm[0]+dx/L*20,sm[1]+dy/L*20],act?13:11,act?colors.sub:colors.ink,0,act?'700':'600',true); }
    ctx.restore(); } }
  if(typeof ktDrawOver==='function') ktDrawOver();
  // scale bar
  const sb=view.s>=120?0.5:view.s>=40?1:view.s>=15?2:view.s>=5?5:20; ctx.strokeStyle=colors.ink; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(16,18); ctx.lineTo(16+sb*view.s,18); ctx.moveTo(16,13); ctx.lineTo(16,23); ctx.moveTo(16+sb*view.s,13); ctx.lineTo(16+sb*view.s,23); ctx.stroke(); text(sb+' m',[16+sb*view.s/2,32],11,colors.ink,0);
}
function pathPts(pts){ ctx.beginPath(); pts.forEach((p,i)=>{const s=W2S(p); i?ctx.lineTo(s[0],s[1]):ctx.moveTo(s[0],s[1]);}); ctx.closePath(); }
function line(a,b){ const s=W2S(a), t=W2S(b); ctx.beginPath(); ctx.moveTo(s[0],s[1]); ctx.lineTo(t[0],t[1]); ctx.stroke(); }
function drawPrims(P,tw){ for(const p of P){
  if(p.l) line(tw(p.l[0],p.l[1]),tw(p.l[2],p.l[3]));
  else if(p.pl){ pathPts(p.pl.map(q=>tw(q[0],q[1]))); ctx.stroke(); }
  else if(p.ci){ const c=W2S(tw(p.ci[0],p.ci[1])); ctx.beginPath(); ctx.arc(c[0],c[1],p.ci[2]*view.s,0,Math.PI*2); ctx.stroke(); } } }
function angleOf(e){ let a=Math.atan2(e.uy,e.ux); if(a>Math.PI/2) a-=Math.PI; if(a<=-Math.PI/2) a+=Math.PI; return a; }
function text(s,p,size,color,ang,weight,boxed){
  ctx.save(); ctx.translate(p[0],p[1]); let a=ang||0; if(a>Math.PI/2) a-=Math.PI; if(a<=-Math.PI/2) a+=Math.PI; ctx.rotate(a);
  ctx.font=(weight||'500')+' '+size+'px '+getComputedStyle(document.body).fontFamily; ctx.textAlign='center'; ctx.textBaseline='middle';
  const w=ctx.measureText(s).width; ctx.fillStyle=colors.paper; ctx.globalAlpha*=0.85; ctx.fillRect(-w/2-3,-size/2-2,w+6,size+4); ctx.globalAlpha/=0.85;
  if(boxed){ ctx.strokeStyle=color; ctx.lineWidth=1; ctx.strokeRect(-w/2-3,-size/2-2,w+6,size+4); }
  ctx.fillStyle=color; ctx.fillText(s,0,0); ctx.restore(); }

// ---------- hit test ----------
const byId = id => S.items.find(i=>i.id===id);
function hit(sx,sy){
  const p=S2W(sx,sy), tol=14/view.s; let best=null, bd=1e9;
  const items=S.items.filter(i=>i.room===cur).reverse();
  for(const it of items){ if(it.t==='label'){ const s=W2S([it.x,it.y]); if(Math.abs(s[0]-sx)<60&&Math.abs(s[1]-sy)<14) return it; } }
  for(const it of items){ if(it.t==='door'||it.t==='window'){ const g=openingGeo(it); if(!g) continue; const d=Math.hypot(p[0]-g.c[0],p[1]-g.c[1]); if(d<Math.max(g.hw,tol)+tol&&d<bd){bd=d;best=it;} } }
  if(best) return best;
  for(const it of items){ if(it.t==='stair'&&stairGeo(it).polys.some(q=>inRing(p,q))) return it; if(it.t==='col'||it.t==='furn'||it.t==='chim'){ const loc=rotP(p[0]-it.x,p[1]-it.y,-(it.rot||0)); if(Math.abs(loc[0])<=it.w/2+tol*0.3&&Math.abs(loc[1])<=it.h/2+tol*0.3) return it; } }
  let sm=null, sa=1e9;
  for(const it of items){ if(isShape(it)){ const pts=itemPts(it); if(inRing(p,pts)){ const a=Math.abs(areaRing(pts)); if(a<sa){sa=a;sm=it;} } } }
  return sm;
}
function hitWall(p){ if(!inPolys(p,HOUSE.walls)) return null; let best=null,bd=1e9;
  for(const w of WALLS){ const vx=p[0]-w.a[0], vy=p[1]-w.a[1], t=vx*w.ux+vy*w.uy, d=vx*w.on[0]+vy*w.on[1];
    if(t<-0.02||t>w.L+0.02||d<-0.02||d>w.d+0.03) continue; const sc=d+(w.ext?0:0.001); if(sc<bd){bd=sc;best=w;} }
  return best; }
function hitRoom(sx,sy){ const p=S2W(sx,sy); for(const r of S.rooms.slice().reverse()){ const o=OL[r.id]; if(o&&inPolys(p,o.polys)) return r; }
  const tol=12/view.s; let best=null,bd=tol; for(const r of S.rooms){ const o=OL[r.id]; if(!o) continue; const ne=nearestEdge(p,o.edges); if(ne&&ne.d<bd){bd=ne.d;best=r;} } return best; }

// ---------- snapping ----------
function segNear(p,a,b){ const dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy; let t=L2?((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L2:0; t=Math.max(0,Math.min(1,t)); return [a[0]+dx*t,a[1]+dy*t]; }
function snapMove(it){
  const tol=24/view.s, mine=itemPts(it); let bv=null; const targetsV=[], targetsE=[];
  for(const o of S.items){ if(o.id===it.id||o.room!==it.room) continue; if(isShape(o)||(!isShape(it)&&(o.t==='furn'||o.t==='col'))){ const q=itemPts(o); q.forEach((v,i)=>{targetsV.push(v); targetsE.push([v,q[(i+1)%q.length]]);}); } }
  if(!isShape(it)&&OL[it.room]) for(const e of OL[it.room].edges){ targetsV.push(e.a); targetsE.push([e.a,e.b]); }
  for(const m of mine) for(const v of targetsV){ const d=Math.hypot(m[0]-v[0],m[1]-v[1]); if(d<tol&&(!bv||d<bv.d)) bv={d,dx:v[0]-m[0],dy:v[1]-m[1],at:v}; }
  if(!bv) for(const m of mine) for(const e of targetsE){ const q=segNear(m,e[0],e[1]); const d=Math.hypot(m[0]-q[0],m[1]-q[1]); if(d<tol*0.8&&(!bv||d<bv.d)) bv={d,dx:q[0]-m[0],dy:q[1]-m[1],at:q}; }
  if(bv){ it.x=r4(it.x+bv.dx); it.y=r4(it.y+bv.dy); snapMark=bv.at; }
  else { const g=0.05, m=mine[0]; it.x=r4(it.x+Math.round(m[0]/g)*g-m[0]); it.y=r4(it.y+Math.round(m[1]/g)*g-m[1]); snapMark=null; }
}
// room placement: keep a wall thickness to neighbour rooms, the exterior wall thickness to the topographer line
function roomSnapDelta(edges0, dx, dy, roomId, tolM, touch, onlyRoom){
  const tol=tolM||22/view.s; const mv=edges0.map(e=>({a:[e.a[0]+dx,e.a[1]+dy],b:[e.b[0]+dx,e.b[1]+dy],ux:e.ux,uy:e.uy}));
  const targets=[];
  for(const r of S.rooms){ if(r.id===roomId||(onlyRoom!=null&&r.id!==onlyRoom)) continue; const o=OL[r.id]; if(o) for(const e of o.edges) targets.push({e,gap:touch?0:S.int,room:true}); }
  if(S.topo&&!touch) for(const t of S.topo.edges) if(S.topo.layers[t.l]!==false) targets.push({e:t,gap:S.ext});
  if(!touch&&typeof ktSnapEdges==='function') for(const t of ktSnapEdges()) targets.push({e:t,gap:S.ext});
  const tryAxis=(skipDir)=>{ let best=null;
    for(const m of mv) for(const {e,gap,room} of targets){
      if(Math.abs(m.ux*e.uy-m.uy*e.ux)>0.03) continue; if(skipDir&&Math.abs(skipDir[0]*e.uy-skipDir[1]*e.ux)<0.03) continue;
      const nx=-e.uy, ny=e.ux; const d=(m.a[0]-e.a[0])*nx+(m.a[1]-e.a[1])*ny;
      const t0=(m.a[0]-e.a[0])*e.ux+(m.a[1]-e.a[1])*e.uy, t1=(m.b[0]-e.a[0])*e.ux+(m.b[1]-e.a[1])*e.uy;
      const overlap=!(Math.max(t0,t1)<-tol||Math.min(t0,t1)>e.L+tol);
      // facing walls: keep the wall thickness · walls in a row (same line): line them up
      const wants = overlap? (gap?[gap,-gap]:[0]) : (room&&Math.min(Math.abs(Math.min(t0,t1)-e.L),Math.abs(Math.max(t0,t1)))<6? [0] : []);
      for(const want of wants){ const err=want-d; if(Math.abs(err)<tol&&(!best||Math.abs(err)<Math.abs(best.err)-1e-9)) best={err,nx,ny,dir:[e.ux,e.uy],at:[m.a[0]+nx*err,m.a[1]+ny*err]}; } }
    return best; };
  let ddx=0, ddy=0; const b1=tryAxis(null); if(b1){ ddx+=b1.nx*b1.err; ddy+=b1.ny*b1.err; mv.forEach(m=>{m.a[0]+=ddx;m.a[1]+=ddy;m.b[0]+=ddx;m.b[1]+=ddy;});
    const b2=tryAxis(b1.dir); if(b2){ ddx+=b2.nx*b2.err; ddy+=b2.ny*b2.err; }
    else { let ba=null; for(const m of mv) for(const {e} of targets) for(const v of [e.a,e.b]) for(const w of [m.a,m.b]){ const along=(v[0]-w[0])*b1.dir[0]+(v[1]-w[1])*b1.dir[1]; if(Math.abs(along)<tol*0.6&&(ba==null||Math.abs(along)<Math.abs(ba))) ba=along; }
      if(ba!=null){ ddx+=b1.dir[0]*ba; ddy+=b1.dir[1]*ba; } }
    snapMark=b1.at; return [ddx,ddy]; }
  snapMark=null; return null;
}
function edgesCopy(id){ return OL[id].edges.map(e=>({a:e.a.slice(),b:e.b.slice(),ux:e.ux,uy:e.uy})); }
function alignRoom(id){ compute(); const sd=roomSnapDelta(edgesCopy(id),0,0,id,0.35); snapMark=null; if(!sd||Math.hypot(sd[0],sd[1])<1e-4) return toast('Δεν βρήκα γειτονικό τοίχο σε απόσταση έως 35 εκ.');
  snap(); for(const it of roomItems(id)){ it.x=r4(it.x+sd[0]); it.y=r4(it.y+sd[1]); } commit(); toast('Μετακινήθηκε '+fmt(Math.hypot(sd[0],sd[1])*100/100)+' m και ευθυγραμμίστηκε.'); }
function mergeRooms(into,from){
  snap(); const other=roomItems(from);
  // pull the second piece so that it touches the first one, when they are close
  compute(); const sd=OL[from]&&OL[from].edges.length? roomSnapDelta(edgesCopy(from),0,0,from,0.6,true,into) : null; snapMark=null;
  // only consider the room we merge into
  for(const it of other){ it.room=into; if(sd){ it.x=r4(it.x+sd[0]); it.y=r4(it.y+sd[1]); } }
  S.rooms=S.rooms.filter(r=>r.id!==from); if(cur===from) cur=into; selRoom=into; commit();
  const o=OL[into]; toast(o.polys.length>1? 'Ενώθηκαν στον ίδιο χώρο, αλλά δεν ακουμπούν. Σύρε το ένα κομμάτι πάνω στο άλλο στο «Χώρος».' : 'Έγιναν ένας χώρος: Ε = '+fmt(o.area)+' m²'); }

// ---------- pointer input ----------
const ptrs=new Map(); let drag=null, pinch=null;
cv.addEventListener('pointerdown',e=>{
  cv.setPointerCapture(e.pointerId); const r=cv.getBoundingClientRect(); const x=e.clientX-r.left,y=e.clientY-r.top;
  ptrs.set(e.pointerId,{x,y});
  if(ptrs.size===2){ drag=null; if(penStroke){ penStroke=null; render(); } const [a,b]=[...ptrs.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y),cx:(a.x+b.x)/2,cy:(a.y+b.y)/2}; return; }
  if(typeof ktDown==='function'&&ktDown(x,y,e)) return;
  if(mode==='house'&&splitting){ const f=splitFrame(splitting), w=S2W(x,y); splitting.d=Math.max(0,r4(Math.round(((w[0]*f.n[0]+w[1]*f.n[1])-f.mn-splitting.t/2)*100)/100)); const el=$('spD'); if(el) el.value=fmt(splitting.d); render(); return; }
  if(mode==='house'){ const pw=S2W(x,y); let rm=S.rooms.slice().reverse().find(r=>OL[r.id]&&inPolys(pw,OL[r.id].polys))||null;
    if(!rm){ const w=hitWall(pw); if(w){ selWall={room:w.room,k:wallKey(w.room,w.a,w.b)}; selRoom=null; renderSide(); drag={pan:true,sx:x,sy:y,ox:view.ox,oy:view.oy}; render(); return; } rm=hitRoom(x,y); }
    if(selWall){ selWall=null; if(!rm) renderSide(); }
    if(rm){ if(selRoom!==rm.id){ selRoom=rm.id; renderSide(); }
      const its=roomItems(rm.id); drag={room:rm.id,sx:x,sy:y,orig:its.map(i=>[i,i.x,i.y]),edges0:OL[rm.id].edges.map(e=>({a:e.a.slice(),b:e.b.slice(),ux:e.ux,uy:e.uy})),moved:false,pre:snapStr()}; }
    else { if(selRoom!==null){ selRoom=null; renderSide(); } drag={pan:true,sx:x,sy:y,ox:view.ox,oy:view.oy}; }
    render(); return; }
  if(tool==='pen'){ if(e.pointerType==='pen') penSeen=true;
    if(!(penSeen&&e.pointerType==='touch')){ penStroke={id:e.pointerId,pts:[S2W(x,y)]}; render(); return; }
    drag={pan:true,sx:x,sy:y,ox:view.ox,oy:view.oy}; return; }
  const it=hit(x,y);
  if(it){ if(sel!==it.id){ sel=it.id; tool=null; markTool(); renderSide(); } drag={it,sx:x,sy:y,ox:it.x,oy:it.y,moved:false,pre:snapStr()}; }
  else { if(sel!==null){ sel=null; renderSide(); } drag={pan:true,sx:x,sy:y,ox:view.ox,oy:view.oy}; }
  render();
});
cv.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId)) return; const r=cv.getBoundingClientRect(); const x=e.clientX-r.left,y=e.clientY-r.top; ptrs.set(e.pointerId,{x,y});
  if(pinch&&ptrs.size>=2){ const [a,b]=[...ptrs.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y), cx=(a.x+b.x)/2, cy=(a.y+b.y)/2;
    view.ox+=cx-pinch.cx; view.oy+=cy-pinch.cy; zoomAt(d/pinch.d,cx,cy); pinch={d,cx,cy}; return; }
  if(penStroke&&penStroke.id===e.pointerId){ const p=S2W(x,y), q=penStroke.pts[penStroke.pts.length-1]; if(Math.hypot(p[0]-q[0],p[1]-q[1])*view.s>=3){ penStroke.pts.push(p); render(); } return; }
  if(typeof ktMove==='function'&&ktMove(x,y)) return;
  if(!drag) return;
  if(drag.pan){ view.ox=drag.ox+x-drag.sx; view.oy=drag.oy+y-drag.sy; render(); return; }
  if(!drag.moved&&Math.hypot(x-drag.sx,y-drag.sy)<6) return; drag.moved=true;
  if(drag.room){ let dx=(x-drag.sx)/view.s, dy=(y-drag.sy)/view.s; const sd=roomSnapDelta(drag.edges0,dx,dy,drag.room);
    if(sd){ dx+=sd[0]; dy+=sd[1]; } else { const g=0.05; dx=Math.round(dx/g)*g; dy=Math.round(dy/g)*g; }
    for(const [i,ox,oy] of drag.orig){ i.x=r4(ox+dx); i.y=r4(oy+dy); } compute(); render(); return; }
  const it=drag.it; it.x=drag.ox+(x-drag.sx)/view.s; it.y=drag.oy+(y-drag.sy)/view.s;
  if(it.t==='door'||it.t==='window'||it.t==='label'){ snapMark=null; if(it.t==='label'){it.x=r4(it.x);it.y=r4(it.y);} }
  else snapMove(it);
  if(isShape(it)) compute(); render();
});
function endPtr(e){
  if(penStroke&&penStroke.id===e.pointerId){ const raw=penStroke.pts; penStroke=null; ptrs.delete(e.pointerId); if(ptrs.size<2) pinch=null; if(e.type==='pointerup') finishPen(raw); else render(); return; }
  ptrs.delete(e.pointerId); if(ptrs.size<2) pinch=null; if(ptrs.size===0){
  if(typeof ktUp==='function'&&ktUp()){ drag=null; return; }
  if(drag&&(drag.it||drag.room)&&drag.moved){ const it=drag.it;
    if(it&&(it.t==='door'||it.t==='window')){ const g=openingGeo(it); if(g){ it.x=r4(g.c[0]); it.y=r4(g.c[1]); } }
    undoS.push(drag.pre); redoS=[]; updUndo(); snapMark=null; commit(); }
  drag=null; } }
cv.addEventListener('pointerup',endPtr); cv.addEventListener('pointercancel',endPtr);
cv.addEventListener('wheel',e=>{ e.preventDefault(); const r=cv.getBoundingClientRect(); zoomAt(e.deltaY<0?1.15:1/1.15,e.clientX-r.left,e.clientY-r.top); },{passive:false});

// ---------- side panel ----------
const side=$('side');
function num(v){ if(v==null) return NaN; let s=String(v).trim().replace(',','.').replace(/[^0-9.\-]/g,''); let n=parseFloat(s); if(isFinite(n)&&n>50){ toast('Το '+s+' το πήρα ως εκατοστά: '+fmt(n/100)+' m'); n=n/100; } return n; }
function h(html,idle){ side.innerHTML=html; side.classList.toggle('idle',!!idle); }
function field(id,label,val,extra){ return `<label class="f">${label}<input id="${id}" inputmode="decimal" autocomplete="off" value="${val}" ${extra||''}></label>`; }
function enterChain(ids,onLast){ ids.forEach((id,i)=>{ const el=$(id); if(!el) return; el.addEventListener('keydown',e=>{ if(e.key==='Enter'||(e.key==='Tab'&&!e.shiftKey&&i<ids.length-1)){ e.preventDefault(); if(i<ids.length-1){ $(ids[i+1]).focus(); $(ids[i+1]).select(); } else onLast(); } }); el.addEventListener('focus',()=>el.select()); }); }
let polyRows=[[5,90],[3,90],[2,270],[2,90],[3,90]];
let triMode='sss', polyMode='ang', polyClose=0, polyEdit=null, polyDiag={sides:[5,4,5,4],diags:[6.4],checks:[]};
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function armConfirm(id,fn){ const b=$(id); if(!b) return; let armed=false,t; b.onclick=()=>{ if(armed){clearTimeout(t); fn(); return;} armed=true; const old=b.textContent; b.textContent='Σίγουρα; Πάτα ξανά'; t=setTimeout(()=>{armed=false;b.textContent=old;},3000); }; }

function renderSide(){ renderSide0(); if(typeof ktTree==='function') ktTree(); }
function renderSide0(){
  if(typeof wzActive==='function'&&wzActive()) return wzRender();
  if(typeof ktSide==='function'&&ktSide()) return;
  if(mode==='house'&&splitting&&roomById(splitting.room)) return splitPanel();
  if(mode==='house'&&selWall&&selWallInfo()) return wallPanel(selWallInfo());
  if(mode==='house'&&consEdit&&consById(consEdit)) return consPanel(consById(consEdit));
  if(mode==='house') return selRoom!=null&&roomById(selRoom)? roomPanel(roomById(selRoom)) : housePanel();
  if(penEdit){ const pi=byId(penEdit.id); if(pi&&pi.room===cur&&mode==='room') return penPanel(pi); penEdit=null; }
  const it=byId(sel); if(it&&it.room===cur) return propPanel(it);
  if(tool) return toolPanel(tool);
  const room=roomById(cur), o=OL[cur]||{area:0,per:0,polys:[]};
  h(`<div class="more"><div class="eyebrow">Χώρος</div>
  <div class="form" style="margin-top:6px"><label class="f">Χώρος που σχεδιάζεις<select id="rPick">${S.rooms.map(r=>`<option value="${r.id}" ${r.id===cur?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label>
  ${nameUI(room)}</div>
  <dl class="sum"><dt>Εμβαδόν</dt><dd>${fmt(o.area)} m²</dd><dt>Περίμετρος</dt><dd>${fmt(o.per)} m</dd></dl>
  ${checkNotes(roomItems(cur).filter(isShape).flatMap(shapeChecks))}
  ${openTable(cur)}
  <p>Φτιάξε το σχήμα με <b>Ορθογώνιο</b>, <b>Τρίγωνο</b> ή <b>Από πλευρές</b>. Όσα ακουμπούν ενώνονται σε ένα περίγραμμα. Ένα σχήμα με «Αφαίρεση» κόβει κομμάτι.</p>
  <p>Πάτα ένα αντικείμενο για να αλλάξεις διαστάσεις ή να το στρίψεις. Σύρε το για να το μετακινήσεις. Οι αριθμοί είναι σε μέτρα· το DISTO γράφει στα κουτάκια και το Enter πάει στο επόμενο.</p></div>
  <div class="actions"><button class="btn" id="rNew">+ Νέος χώρος</button><button class="btn primary" id="toHouse">Δες όλη την οικία</button></div>`, true);
  $('rPick').onchange=()=>{ cur=+$('rPick').value; sel=null; compute(); render(); renderSide(); fit(cur); };
  bindName(room); side.querySelectorAll('[data-o]').forEach(tr=>tr.onclick=()=>{ sel=+tr.dataset.o; render(); renderSide(); });
  $('rNew').onclick=newRoom; $('toHouse').onclick=()=>setMode('house');
}
const ROOM_TYPES=['Υπνοδωμάτιο','Κουζίνα','Σαλόνι','Καθιστικό','Τραπεζαρία','Λουτρό','WC','Κλιμακοστάσιο','Διάδρομος','Χολ','Είσοδος','Αποθήκη','Γραφείο','Λεβητοστάσιο','Πλυσταριό','Σοφάς','Οντάς','Κατώι','Βεράντα','Ημιυπαίθριος','Εξώστης','Χώρος'];
function nextNo(type,except){ let n=0; for(const r of S.rooms){ if(r.id===except) continue; const m=r.name.match(/^(.*?)\s*(\d+)$/); if(m&&m[1]===type) n=Math.max(n,+m[2]); else if(r.name===type) n=Math.max(n,1); } return n+1; }
function nameUI(room){ const m=room.name.match(/^(.*?)\s*(\d+)$/); const type=m&&ROOM_TYPES.includes(m[1])?m[1]:(ROOM_TYPES.includes(room.name)?room.name:''); const no=m?m[2]:'';
  return `<div class="row"><label class="f">Είδος χώρου<select id="rType"><option value="">— διάλεξε —</option>${ROOM_TYPES.map(t=>`<option ${t===type?'selected':''}>${t}</option>`).join('')}</select></label>${field('rNo','Αύξων αριθμός',no)}</div>
  <div class="row"><label class="f">Όνομα<input id="rName" value="${esc(room.name)}" autocomplete="off"></label><label class="f">Χρήση<select id="rUse">${Object.entries(USES).map(([k,v])=>`<option value="${k}" ${useOf(room)===k?'selected':''}>${v}</option>`).join('')}</select></label></div>`; }
function bindName(room){
  const setN=n=>{ if(!n||n===room.name) return; snap(); room.name=n; $('rName').value=n; compute(); save(); render(); if(mode==='house'){ const sc=side.scrollTop; renderSide(); side.scrollTop=sc; } };
  $('rType').onchange=()=>{ const t=$('rType').value; if(!t) return; const n=nextNo(t,room.id); $('rNo').value=n; setN(t+' '+n); };
  $('rNo').addEventListener('change',()=>{ const t=$('rType').value; const v=$('rNo').value.trim(); if(t) setN(v?t+' '+v:t); });
  $('rName').addEventListener('change',()=>setN($('rName').value.trim()||room.name));
  $('rUse').onchange=()=>{ snap(); const v=$('rUse').value; if(v===useDefault(room.name)) delete room.use; else room.use=v; commit(); toast(v==='imiy'||v==='exo'?'Ο χώρος δεν παίρνει δικούς του τοίχους και γράφεται χωριστά στα εμβαδά.':'Χρήση: '+USES[v]); }; }
function openTable(id){ const ops=roomItems(id).filter(i=>i.t==='door'||i.t==='window'); if(!ops.length) return '';
  return `<div class="tbl"><table><thead><tr><th>Άνοιγμα</th><th>Π × Υ</th><th>Ποδιά</th></tr></thead><tbody>${ops.map(i=>{ const g=openingGeo(i); return `<tr data-o="${i.id}"><td>${openCode(i)}</td><td>${fmt(g?2*g.hw:i.w)} × ${fmt(openH(i))}</td><td>${i.t==='window'?fmt(i.sill||0):'—'}</td></tr>${descOf(i)?`<tr data-o="${i.id}" class="sub"><td colspan="3">${esc(descOf(i))}</td></tr>`:''}`; }).join('')}</tbody></table></div>`; }
function newRoom(){ snap(); const id=newRoomId(); S.rooms.push({id,name:'Χώρος '+id}); cur=id; sel=null; selRoom=null; mode='room'; markMode(); tool='rect'; markTool(); commit(); toast('Νέος χώρος. Φτιάξε το σχήμα του. Το όνομα το διαλέγεις από τη λίστα όταν πατήσεις «Τέλος».'); }
function floorsUI(){ const st=floorStats(), multi=S.floors.length>1, f=FL(), empty=!S.items.some(isShape);
  const tot=st.reduce((a,x)=>({net:a.net+x.net,foot:a.foot+x.foot}),{net:0,foot:0});
  const others=S.floors.filter(x=>x.id!==S.fl&&floorData(x).items.some(isShape));
  return `<div class="eyebrow" style="margin-top:14px">Όροφοι</div>
  ${multi?`<div class="tbl"><table><thead><tr><th>Όροφος</th><th>Ύψος</th><th>Καθαρό</th><th>Μικτό</th></tr></thead><tbody>${st.slice().reverse().map(x=>`<tr data-f="${x.f.id}" class="${x.f.id===S.fl?'cur':''}"><td>${esc(x.f.name)}</td><td>${fmt(x.f.h)}</td><td>${fmt(x.net)}</td><td>${fmt(x.foot)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Σύνολο</td><td></td><td>${fmt(tot.net)}</td><td>${fmt(tot.foot)}</td></tr></tfoot></table></div><p>Πάτα έναν όροφο για να πας σε αυτόν, ή διάλεξέ τον πάνω από την κάτοψη.</p>`:'<p>Η κάτοψη έχει έναν όροφο. Πρόσθεσε όροφο από πάνω ή υπόγειο· ο όροφος από κάτω φαίνεται αχνός για να βάλεις τους χώρους από πάνω του.</p>'}
  <div class="form"><div class="row"><label class="f">Όνομα ορόφου<input id="fN" value="${esc(f.name)}" autocomplete="off"></label>${field('fH','Ύψος ορόφου, πλάκα σε πλάκα (m)',fmt(f.h))}</div>
  ${empty&&others.length?`<div class="row"><label class="f">Ο όροφος είναι άδειος. Πάρε τους χώρους από<select id="fCopy">${others.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label><div class="actions" style="align-items:end"><button class="btn" id="fCopyGo">Αντέγραψε τους χώρους</button></div></div>`:''}</div>
  <div class="actions"><button class="btn" id="fUp">+ Όροφος από πάνω</button><button class="btn" id="fDown">+ Υπόγειο</button>${multi?'<button class="btn danger" id="fDel">Διαγραφή ορόφου</button>':''}</div>`; }
function bindFloors(){
  side.querySelectorAll('[data-f]').forEach(tr=>tr.onclick=()=>switchFloor(+tr.dataset.f));
  const n=$('fN'); n.addEventListener('focus',()=>n.select()); n.addEventListener('keydown',e=>{ if(e.key==='Enter') n.blur(); }); n.addEventListener('change',()=>{ const v=n.value.trim(); if(v){ snap(); FL().name=v; commit(); } });
  const hh=$('fH'); hh.addEventListener('focus',()=>hh.select()); hh.addEventListener('keydown',e=>{ if(e.key==='Enter') hh.blur(); }); hh.addEventListener('change',()=>{ const v=num(hh.value); if(v>1.5&&v<10){ snap(); FL().h=r4(v); commit(); } });
  $('fUp').onclick=()=>addFloor(true); $('fDown').onclick=()=>addFloor(false);
  if($('fCopyGo')) $('fCopyGo').onclick=()=>{ const src=floorData(flById(+$('fCopy').value)); snap(); const map={}; let nid=newRoomId();
    S.rooms=src.rooms.filter(r=>src.items.some(i=>i.room===r.id&&isShape(i))).map(r=>{ const c=JSON.parse(JSON.stringify(r)); map[r.id]=nid; c.id=nid++; return c; });
    S.items=src.items.filter(i=>map[i.room]&&(isShape(i)||i.t==='col')).map(i=>{ const c=JSON.parse(JSON.stringify(i)); c.id=S.next++; c.room=map[i.room]; return c; });
    if(!S.rooms.length) S.rooms=[{id:nid,name:'Χώρος 1'}]; cur=S.rooms[0].id; selRoom=null; commit(); toast('Μπήκαν '+S.rooms.length+' χώροι. Άλλαξε ονόματα και ό,τι διαφέρει.'); };
  armConfirm('fDel',()=>{ snap(); const k=flIdx(S.fl), t=S.floors[k+1]||S.floors[k-1]; S.floors.splice(k,1); S.fl=t.id; S.rooms=t.rooms&&t.rooms.length?t.rooms:[{id:newRoomId(),name:'Χώρος 1'}]; S.items=t.items||[]; delete t.rooms; delete t.items;
    cur=S.rooms[0].id; sel=null; selRoom=null; commit(); fit(); toast('Σβήστηκε ο όροφος. Αναίρεση αν έγινε κατά λάθος.'); });
}
function housePanel(){
  const badge=id=>{ const st=roomCheck(id); return st.n? `<span class="chk" style="color:var(--${st.lvl==='ok'?'ok':st.lvl==='warn'?'warn':'sub'})" title="${st.lvl==='ok'?'Κλείνει':'Διαφορά '+cm(st.worst)+' εκ.'}">${st.lvl==='ok'?'✓':'⚠'}</span>` : ''; };
  const rows=S.rooms.map(r=>`<tr data-r="${r.id}"><td>${roomNo(r.id)}. ${esc(r.name)} ${badge(r.id)}</td><td>${USES_S[useOf(r)]}</td><td>${fmt(OL[r.id]?OL[r.id].area:0)}</td></tr>`).join('');
  const U=HOUSE.use||{}, uRow=(k,l)=>U[k]>0?`<tr><td>${l}</td><td></td><td>${fmt(U[k])}</td></tr>`:'';
  const bad=S.rooms.filter(r=>roomCheck(r.id).lvl!=='ok');
  const t=S.topo;
  h(`<div class="more"><div class="eyebrow">Οικία</div><h2>${esc(S.name)}</h2>
  <p>Σύρε κάθε χώρο στη θέση του, ή πάτα έναν χώρο και «Χώρισε με εσωτερικό τοίχο» για να τον κόψεις σε δύο. Κουμπώνει με κενό όσο ο εσωτερικός τοίχος από τους άλλους χώρους, και όσο ο εξωτερικός τοίχος από τη γραμμή του τοπογράφου.</p>
  ${PYCASE?pyUnplaced():''}
  <div class="tbl"><table><thead><tr><th>Χώρος</th><th>Χρήση</th><th>Ε (m²)</th></tr></thead><tbody>${rows}</tbody>
  <tfoot>${uRow('kyr','Κύριοι χώροι (καθαρό)')}${uRow('voith','Βοηθητικοί (καθαρό)')}<tr><td>Καθαρό κλειστών χώρων</td><td></td><td>${fmt(HOUSE.net)}</td></tr><tr><td>Τοίχοι</td><td></td><td>${fmt(HOUSE.footArea-HOUSE.net)}</td></tr><tr><td>Μικτό (με τοίχους)</td><td></td><td>${fmt(HOUSE.footArea)}</td></tr>${HOUSE.footArea-HOUSE.footNI>0.005?`<tr><td>Μικτό χωρίς εξωτ. μόνωση</td><td></td><td>${fmt(HOUSE.footNI)}</td></tr>`:''}${uRow('imiy','Ημιυπαίθριοι')}${uRow('exo','Εξώστες')}</tfoot></table></div>
  ${bad.length?`<div class="note warn">Ξαναμέτρησε: ${bad.map(r=>esc(r.name)+' ('+cm(roomCheck(r.id).worst)+' εκ.)').join(', ')}</div>`:''}
  ${floorsUI()}
  ${typeof ktHouseBox==='function'?ktHouseBox():''}
  <div class="eyebrow" style="margin-top:14px">Τοίχοι</div>
  <p>Πάτα πάνω σε έναν τοίχο για να αλλάξεις το πάχος ή την κατασκευή του. Το κουμπί «Πάχη» γράφει το πάχος πάνω σε κάθε τοίχο.</p>
  <div class="form"><label class="f">Εξωτερικοί τοίχοι του σπιτιού<select id="wExtC"><option value="">— μόνο πάχος —</option>${consOpts(S.extC,'ext')}</select></label>
  <div class="row">${S.extC&&consById(S.extC)?`<label class="f">Πάχος εξωτερικών (m)<input value="${fmt(consT(consById(S.extC)))}" disabled></label>`:field('wExt','Πάχος εξωτερικών (m)',fmt(S.ext))}${field('wInt','Εσωτερικοί, για νέους χώρους (m)',fmt(S.int))}</div>
  <div class="row">${field('wTol','Ανοχή κλεισίματος (εκ.)',cm(S.tol||0.03))}${typeof ktWallDirUI==='function'?ktWallDirUI():''}</div></div>
  <div class="eyebrow" style="margin-top:14px">Κατασκευές τοίχων</div>
  <div class="tbl"><table><tbody>${(S.cons||[]).map(c=>`<tr data-c="${c.id}"><td>${esc(c.name)} <span style="color:var(--ink-2);font-size:12px">${c.kind==='int'?'εσωτ.':'εξωτ.'}</span></td><td>${cm(consT(c))} εκ.</td></tr>`).join('')}</tbody></table></div>
  <div class="actions"><button class="btn" id="cNew">+ Νέα κατασκευή</button></div></div>
  <div class="actions" style="margin-top:12px"><button class="btn" id="rNew">+ Νέος χώρος</button><button class="btn" id="rImp">Χώρος από DXF</button></div>
  <div class="more"><div class="eyebrow" style="margin-top:16px">Περίγραμμα τοπογράφου</div>
  ${t? `${bldBox()}<p>${esc(t.file)} · ${t.ents.length} γραμμές. Το DXF της οικίας βγαίνει στις συντεταγμένες του.</p><div class="layers">${Object.keys(t.layers).map(l=>`<label><input type="checkbox" data-l="${esc(l)}" ${t.layers[l]!==false?'checked':''}> ${esc(l)} <span>${t.count[l]||0}</span></label>`).join('')}</div>
     <div class="actions">${t.bld?`<button class="btn" id="tOnly">Μόνο το κτίριο</button>`:''}${t.bld&&(t.bldRings||[]).length?`<button class="btn" id="tRoom">Χώρος από το περίγραμμα</button>`:''}<button class="btn" id="tAgain">Άλλο DXF</button><button class="btn danger" id="tDel">Αφαίρεση</button></div>`
   : `<p>Φόρτωσε το DXF του τοπογράφου για να βάλεις τους χώρους πάνω στο περίγραμμα. Αν έχει layer «lk.4495.buliding.area», το περίγραμμα του κτιρίου ξεχωρίζει μόνο του και βλέπεις το εμβαδόν του δίπλα στο μικτό της κάτοψης.</p><div class="actions"><button class="btn" id="tAgain">Φόρτωσε DXF τοπογράφου</button></div>`}
  </div>
  <div class="actions" style="margin-top:16px"><button class="btn danger" id="bNew">Νέα κενή κάτοψη</button><button class="btn" id="bEx">Ξανά το παράδειγμα</button></div>`);
  side.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>pyPlace(b.dataset.place));
  bindFloors(); if(typeof ktHouseBind==='function') ktHouseBind();
  side.querySelectorAll('[data-r]').forEach(tr=>tr.onclick=()=>{ selRoom=+tr.dataset.r; render(); renderSide(); });
  const wb=(id,k)=>{ const el=$(id); el.addEventListener('change',()=>{ const v=num(el.value); if(v>=0&&v<3){ if(k==='ext'&&typeof ktWallsIn==='function'&&ktWallsIn(()=>{ S[k]=v; })) return; snap(); S[k]=v; commit(); } }); el.addEventListener('keydown',e=>{ if(e.key==='Enter') el.blur(); }); el.addEventListener('focus',()=>el.select()); };
  if($('wExt')) wb('wExt','ext'); wb('wInt','int');
  $('wExtC').onchange=()=>{ const v=$('wExtC').value||null; if(typeof ktWallsIn==='function'&&ktWallsIn(()=>{ S.extC=v; })) return; snap(); S.extC=v; commit(); };
  const tl=$('wTol'); tl.addEventListener('focus',()=>tl.select()); tl.addEventListener('change',()=>{ const v=parseFloat(String(tl.value).replace(',','.')); if(v>0&&v<50){ snap(); S.tol=r4(v/100); commit(); } });
  side.querySelectorAll('[data-c]').forEach(tr=>tr.onclick=()=>{ consEdit=tr.dataset.c; renderSide(); });
  $('cNew').onclick=()=>{ snap(); const n={id:'c'+Date.now().toString(36),kind:'ext',name:'Νέα κατασκευή',layers:[L_('sovas'),L_('lith'),L_('sovas')]}; S.cons.push(n); saveConsLib(); consEdit=n.id; commit(); };
  $('rNew').onclick=newRoom; $('rImp').onclick=()=>pickFile('room');
  $('tAgain').onclick=()=>pickFile('topo');
  if($('tDel')) armConfirm('tDel',()=>{ S.topo=null; commit(); });
  if($('tOnly')) $('tOnly').onclick=()=>{ for(const l in S.topo.layers) S.topo.layers[l]=(l===S.topo.bld); save(); render(); renderSide(); fit(); };
  if($('tRoom')) $('tRoom').onclick=bldRoom;
  side.querySelectorAll('[data-l]').forEach(cb=>cb.onchange=()=>{ S.topo.layers[cb.dataset.l]=cb.checked; save(); render(); });
  armConfirm('bNew',()=>{ snap(); S=migrate({name:'Νέα κάτοψη',next:1,ext:S.ext,int:S.int,extC:S.extC,cons:S.cons,tol:S.tol,topo:S.topo,rooms:[{id:1,name:'Χώρος 1'}],items:[]}); cur=1; sel=null; selRoom=null; $('planName').value=S.name; mode='room'; markMode(); commit(); fit(); });
  armConfirm('bEx',()=>{ snap(); S=migrate(example()); cur=1; sel=null; selRoom=null; $('planName').value=S.name; commit(); fit(); });
}
function roomPanel(room){
  const o=OL[room.id]||{area:0,per:0};
  h(`<div class="eyebrow">Χώρος στην οικία</div>
  <div class="form" style="margin-top:6px">${nameUI(room)}${typeof ktGrpUI==='function'?ktGrpUI(room):''}</div>
  <dl class="sum"><dt>Εμβαδόν</dt><dd>${fmt(o.area)} m²</dd><dt>Περίμετρος</dt><dd>${fmt(o.per)} m</dd></dl>
  <div class="form"><div class="row">${field('rRot','Στρίψε κατά (°)','90')}<label class="f">Γύρω από<select id="rPiv"><option value="">το κέντρο</option>${roomCorners(room.id).map((q,i)=>`<option value="${i}" ${i===pivIdx(room.id)?'selected':''}>τη γωνία ${corner(i)}</option>`).join('')}</select></label></div>
  <div class="actions"><button class="btn" id="rRotGo">Στρίψε</button><span style="align-self:center;font-size:12px;color:var(--ink-2)">+ δεξιόστροφα, − αριστερόστροφα</span></div>
  <div class="actions"><button class="btn primary" id="rAlign">Ευθυγράμμισε με τους διπλανούς</button></div>
  <label class="f">Ένωσε σε έναν χώρο με…<select id="rMerge"><option value="">— διάλεξε χώρο —</option>${S.rooms.filter(r=>r.id!==room.id).map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></label>
  <div class="actions"><button class="btn" id="rSplit">Χώρισε με εσωτερικό τοίχο</button><button class="btn" id="rMirror">Καθρέφτης</button></div>
  ${isOpen(room)?'':`<label class="f">Εξωτερικοί τοίχοι του χώρου<select id="rExtC"><option value="">— όπως όλο το σπίτι —</option>${consOpts(room.extC,'ext')}</select></label>`}
  ${checkNotes(roomItems(room.id).filter(isShape).flatMap(shapeChecks))}</div>
  ${PYCASE?pyRoomBox(room):''}<div class="actions" style="margin-top:12px"><button class="btn primary" id="rEdit">Επεξεργασία χώρου</button><button class="btn" id="rDup">Διπλότυπο</button><button class="btn danger" id="rDel">Διαγραφή</button><button class="btn" id="rOk">Τέλος</button></div>`);
  bindName(room); if(typeof ktGrpBind==='function') ktGrpBind(room);
  if($('rExtC')) $('rExtC').onchange=()=>{ snap(); const v=$('rExtC').value; stripExtOverrides(room.id); if(v) room.extC=v; else delete room.extC; commit(); };
  $('rAlign').onclick=()=>alignRoom(room.id); if($('rLaser')) $('rLaser').onclick=()=>pyMeasure(room);
  $('rMerge').onchange=()=>{ const v=+$('rMerge').value; if(v) mergeRooms(room.id,v); };
  $('rPiv').onchange=()=>{ const v=$('rPiv').value, C=roomCorners(room.id); rotPiv= v===''?null:{room:room.id,p:C[+v].slice()}; render(); };
  const rot=(deg)=>{ snap(); const b=bbox(room.id), pk=pivIdx(room.id), c= pk>=0? rotPiv.p : [(b[0]+b[2])/2,(b[1]+b[3])/2];
    for(const it of roomItems(room.id)){ const q=rotP(it.x-c[0],it.y-c[1],deg); it.x=r4(c[0]+q[0]); it.y=r4(c[1]+q[1]); if(it.rot!=null||isShape(it)||it.t==='furn'||it.t==='col') it.rot=r4(((it.rot||0)+deg)%360); }
    commit(); };
  $('rSplit').onclick=()=>{ const f0={room:room.id,dir:'v',d:0,t:S.int}; const f=splitFrame(f0); f0.d=r4(Math.max(0,Math.round(((f.mx-f.mn)/2-S.int/2)*100)/100)); splitting=f0; render(); renderSide(); };
  $('rRotGo').onclick=()=>{ const v=parseFloat(String($('rRot').value).replace(',','.')); if(isFinite(v)) rot(v); };
  enterChain(['rRot'],()=>$('rRotGo').click());
  $('rMirror').onclick=()=>{ snap(); const b=bbox(room.id), cx=(b[0]+b[2])/2;
    for(const it of roomItems(room.id)){ it.x=r4(2*cx-it.x); if(it.t==='poly'){ it.pts=it.pts.map(p=>[-p[0],p[1]]).reverse(); it.rot=-(it.rot||0); } else if(it.rot!=null) it.rot=-(it.rot||0); if(it.t==='door') it.hinge=!it.hinge; }
    commit(); };
  $('rEdit').onclick=()=>{ cur=room.id; selRoom=null; setMode('room'); fit(cur); };
  $('rDup').onclick=()=>{ snap(); const id=newRoomId(); S.rooms.push({id,name:room.name+' (2)'}); for(const it of roomItems(room.id)){ const c=JSON.parse(JSON.stringify(it)); c.id=S.next++; c.room=id; c.x=r4(c.x+1); c.y=r4(c.y+1); S.items.push(c); } selRoom=id; commit(); };
  armConfirm('rDel',()=>{ snap(); S.items=S.items.filter(i=>i.room!==room.id); S.rooms=S.rooms.filter(r=>r!==room); if(!S.rooms.length) S.rooms.push({id:1,name:'Χώρος 1'}); if(!roomById(cur)) cur=S.rooms[0].id; selRoom=null; commit(); });
  $('rOk').onclick=()=>{ selRoom=null; render(); renderSide(); };
}

// ---------- τοίχος: πάχος και κατασκευή ----------
function consOpts(sel,kind){ const L=(S.cons||[]).slice().sort((a,b)=>(a.kind===kind?0:1)-(b.kind===kind?0:1));
  return L.map(c=>`<option value="${c.id}" ${sel===c.id?'selected':''}>${esc(c.name)} · ${cm(consT(c))} εκ.${c.kind!==kind?' ('+(c.kind==='int'?'εσωτ.':'εξωτ.')+')':''}</option>`).join(''); }
function upsertOverride(room,a,b,val){ room.walls=room.walls||[]; const ov=findOverride(room,a,b); const o={k:wallKey(room.id,a,b)}; Object.assign(o,val); if(ov) room.walls[room.walls.indexOf(ov)]=o; else room.walls.push(o); }
function stripExtOverrides(roomId){ const room=roomById(roomId); if(!room||!room.walls) return; room.walls=room.walls.filter(o=>!WALLS.some(W=>W.room===roomId&&W.ext&&keyMatch(roomId,o.k,W.a,W.b)<0.08)); }
function moveRoom(id,dx,dy){ for(const it of roomItems(id)){ it.x=r4(it.x+dx); it.y=r4(it.y+dy); } }
// who: 'nb' μετακινείται ο διπλανός, 'self' μετακινείται ο ίδιος ο χώρος
function setWallT(w,v,who,noSnap){ if(!(v>0&&v<3)) return toast('Γράψε πάχος σε μέτρα, π.χ. 0.20');
  const room=roomById(w.room); if(!noSnap) snap();
  if(w.ext){ upsertOverride(room,w.a,w.b,{t:r4(v)}); commit(); return toast('Ο τοίχος έγινε '+cm(v)+' εκ. Ο χώρος έμεινε ίδιος.'); }
  const delta=v-w.gap; if(who==='self') moveRoom(w.room,-w.on[0]*delta,-w.on[1]*delta); else if(w.nb!=null) moveRoom(w.nb,w.on[0]*delta,w.on[1]*delta);
  commit(); const mv=roomById(who==='self'?w.room:w.nb); toast('Ο τοίχος έγινε '+cm(v)+' εκ. Μετακινήθηκε '+(delta>0?'':'πίσω ')+'ο «'+(mv?mv.name:'')+'» κατά '+cm(Math.abs(delta))+' εκ.'); }
let wallWho='nb';
function wallPanel(w){
  const room=roomById(w.room), nb=w.nb!=null?roomById(w.nb):null;
  const srcTxt={wall:'μόνο αυτός ο τοίχος',room:'όλοι οι εξωτερικοί του χώρου',house:'όλο το σπίτι',gap:'το κενό ανάμεσα στους χώρους'}[w.src]||'';
  h(`<div class="eyebrow">Τοίχος · ${esc(room.name)}${nb&&!w.ext?' και '+esc(nb.name):''}</div><h2>${w.ext?'Εξωτερικός τοίχος':'Εσωτερικός τοίχος'}</h2>
  <dl class="sum"><dt>Μήκος</dt><dd>${fmt(w.L)} m</dd><dt>Πάχος</dt><dd>${fmt(w.T)} m</dd><dt>Ορίζεται από</dt><dd style="font-family:var(--font)">${srcTxt}</dd>${w.ext&&w.insOut?`<dt>Εξωτ. μόνωση</dt><dd>${fmt(w.insOut)} m</dd>`:''}</dl>
  ${w.part?'<div class="note">Ο τοίχος είναι εν μέρει εσωτερικός (ακουμπά σε άλλον χώρο μόνο σε ένα κομμάτι). Μετράει ως εξωτερικός.</div>':''}
  <div class="form">
    <div class="row">${field('wT','Πάχος (m)',fmt(w.T))}<div class="actions" style="align-items:end"><button class="btn primary" id="wTGo">Άλλαξε</button></div></div>
    ${!w.ext&&nb?`<div class="seg"><button id="wMvN" class="${wallWho==='nb'?'on':''}">Μετακινείται: ${esc(nb.name)}</button><button id="wMvS" class="${wallWho==='self'?'on':''}">${esc(room.name)}</button></div>
      <div class="note">Οι χώροι κρατούν τις διαστάσεις που μέτρησες. Αλλάζει μόνο το κενό ανάμεσά τους.</div>`:''}
    <label class="f">Κατασκευή<select id="wC"><option value="">— μόνο πάχος —</option>${consOpts(w.c&&w.c.id,w.ext?'ext':'int')}</select></label>
    ${w.c?`<div class="note">${esc(consDesc(w.c))}</div><div class="actions"><button class="btn" id="wEdit">Άλλαξε τις στρώσεις</button></div>`:''}
    ${w.ext?`<div class="eyebrow" style="margin-top:6px">Βάλε ${w.c?'την κατασκευή':'αυτό το πάχος'}</div><div class="actions">${w.c?'<button class="btn" id="wApR">Σε όλους τους εξωτερικούς του χώρου</button>':''}<button class="btn" id="wApH">Σε όλο το σπίτι</button></div>`:''}
  </div>
  <div class="actions" style="margin-top:12px"><button class="btn" id="wOk">Τέλος</button></div>`);
  const go=()=>{ const v=num($('wT').value); setWallT(w,v,wallWho); };
  $('wTGo').onclick=go; enterChain(['wT'],go);
  if($('wMvN')){ $('wMvN').onclick=()=>{ wallWho='nb'; renderSide(); }; $('wMvS').onclick=()=>{ wallWho='self'; renderSide(); }; }
  $('wC').onchange=()=>{ const c=consById($('wC').value);
    if(w.ext){ snap(); upsertOverride(room,w.a,w.b,c?{c:c.id}:{t:w.T}); commit(); return; }
    if(c){ snap(); upsertOverride(room,w.a,w.b,{c:c.id}); setWallT(w,consT(c),wallWho,true); } else { snap(); upsertOverride(room,w.a,w.b,{}); commit(); } };
  if($('wEdit')) $('wEdit').onclick=()=>{ consEdit=w.c.id; selWall=null; renderSide(); render(); };
  if($('wApR')) $('wApR').onclick=()=>{ snap(); stripExtOverrides(room.id); room.extC=w.c.id; commit(); toast('Όλοι οι εξωτερικοί τοίχοι του «'+room.name+'»: '+w.c.name); };
  if($('wApH')) $('wApH').onclick=()=>{ snap(); for(const r of S.rooms){ stripExtOverrides(r.id); delete r.extC; } if(w.c) S.extC=w.c.id; else { S.extC=null; S.ext=w.T; } commit(); toast('Όλοι οι εξωτερικοί τοίχοι του σπιτιού: '+(w.c?w.c.name:cm(w.T)+' εκ.')); };
  $('wOk').onclick=()=>{ selWall=null; render(); renderSide(); };
}
function consPanel(c){
  const used=WALLS.filter(w=>w.c===c).length;
  const rows=c.layers.map((l,i)=>`<div class="lay-row"><select data-lm="${i}" aria-label="Υλικό">${Object.entries(MATL).map(([k,m])=>`<option value="${k}" ${k===l.m?'selected':''}>${m.n}</option>`).join('')}</select><input data-lt="${i}" inputmode="decimal" value="${cm(l.t)}" aria-label="Πάχος σε εκ."><span>εκ.</span><button data-lu="${i}" aria-label="Πιο μέσα" ${i?'':'disabled'}>↑</button><button data-ld="${i}" aria-label="Σβήσε στρώση">×</button></div>`).join('');
  h(`<div class="eyebrow">Κατασκευή τοίχου</div><h2>${esc(c.name)}</h2>
  <div class="form"><label class="f">Όνομα<input id="cN" value="${esc(c.name)}" autocomplete="off"></label>
  <div class="seg"><button id="cKe" class="${c.kind!=='int'?'on':''}">Εξωτερικός</button><button id="cKi" class="${c.kind==='int'?'on':''}">Εσωτερικός</button></div>
  <p>Στρώσεις από μέσα (χώρος) προς τα έξω. Πάχη σε εκατοστά.</p>
  <div class="sides">${rows}</div>
  <label class="f">+ Στρώση από βιβλιοθήκη<select id="cAdd"><option value="">— διάλεξε υλικό —</option>${Object.entries(MATL).map(([k,m])=>`<option value="${k}">${m.n} · ${cm(m.t)} εκ.</option>`).join('')}</select></label>
  <div class="note"><b>Σύνολο ${cm(consT(c))} εκ.</b> · ${used? 'τη χρησιμοποιούν '+used+' τοίχοι' : 'δεν τη χρησιμοποιεί κανένας τοίχος ακόμα'}${consInsOut(c)?' · η εξωτερική μόνωση ('+cm(consInsOut(c))+' εκ.) γράφεται χωριστά στο μικτό':''}</div>
  <div class="actions"><button class="btn" id="cDup">Αντίγραφο</button><button class="btn danger" id="cDel">Διαγραφή</button><button class="btn primary" id="cOk">Τέλος</button></div></div>`);
  const ch=fn=>{ snap(); fn(); saveConsLib(); commit(); };
  $('cN').addEventListener('change',()=>ch(()=>{ c.name=$('cN').value.trim()||c.name; }));
  $('cKe').onclick=()=>ch(()=>{ c.kind='ext'; }); $('cKi').onclick=()=>ch(()=>{ c.kind='int'; });
  side.querySelectorAll('[data-lm]').forEach(el=>el.onchange=()=>ch(()=>{ const l=c.layers[+el.dataset.lm]; l.m=el.value; l.t=MATL[l.m].t; }));
  side.querySelectorAll('[data-lt]').forEach(el=>{ el.addEventListener('focus',()=>el.select()); el.addEventListener('keydown',e=>{ if(e.key==='Enter') el.blur(); });
    el.addEventListener('change',()=>{ const v=parseFloat(String(el.value).replace(',','.')); if(!(v>0&&v<300)) return toast('Γράψε το πάχος σε εκατοστά, π.χ. 2.5'); ch(()=>{ c.layers[+el.dataset.lt].t=r4(v/100); }); }); });
  side.querySelectorAll('[data-ld]').forEach(b=>b.onclick=()=>{ if(c.layers.length<2) return toast('Χρειάζεται τουλάχιστον μία στρώση'); ch(()=>{ c.layers.splice(+b.dataset.ld,1); }); });
  side.querySelectorAll('[data-lu]').forEach(b=>b.onclick=()=>ch(()=>{ const i=+b.dataset.lu; const t=c.layers[i]; c.layers[i]=c.layers[i-1]; c.layers[i-1]=t; }));
  $('cAdd').onchange=()=>{ const k=$('cAdd').value; if(!k) return; ch(()=>{ c.layers.push(L_(k)); }); };
  $('cDup').onclick=()=>ch(()=>{ const n=JSON.parse(JSON.stringify(c)); n.id='c'+Date.now().toString(36); n.name=c.name+' (2)'; S.cons.push(n); consEdit=n.id; });
  armConfirm('cDel',()=>ch(()=>{ S.cons=S.cons.filter(x=>x!==c); if(S.extC===c.id) S.extC=null; for(const r of S.rooms){ if(r.extC===c.id) delete r.extC; if(r.walls) r.walls=r.walls.filter(o=>o.c!==c.id); } consEdit=null; }));
  $('cOk').onclick=()=>{ consEdit=null; renderSide(); };
}
function splitPanel(){
  const sp=splitting, room=roomById(sp.room), f=splitFrame(sp);
  h(`<div class="eyebrow">Εσωτερική τοιχοποιία · ${esc(room.name)}</div><h2>Χώρισε με τοίχο</h2>
  <p>Ο τοίχος κόβει τον χώρο σε δύο. Πάτα πάνω στο σχέδιο για να τον βάλεις εκεί, ή γράψε την απόσταση.</p>
  <div class="seg" style="margin-top:8px"><button id="spV" class="${sp.dir==='v'?'on':''}">Κατακόρυφος</button><button id="spH" class="${sp.dir==='h'?'on':''}">Οριζόντιος</button></div>
  <div class="form"><div class="row">${field('spD',sp.dir==='v'?'Από τον αριστερό τοίχο (m)':'Από τον πάνω τοίχο (m)',fmt(sp.d))}${field('spT','Πάχος τοίχου (m)',fmt(sp.t))}</div>
  <div class="note">Ο χώρος έχει ${fmt(f.mx-f.mn)} m σε αυτή τη διεύθυνση. Μένουν ${fmt(Math.max(0,f.mx-f.mn-sp.d-sp.t))} m από την άλλη μεριά.</div>
  <div class="actions"><button class="btn primary" id="spGo">Χώρισε</button><button class="btn" id="spNo">Άκυρο</button></div></div>`);
  $('spV').onclick=()=>{ sp.dir='v'; render(); renderSide(); }; $('spH').onclick=()=>{ sp.dir='h'; render(); renderSide(); };
  const upd=()=>{ const d=num($('spD').value), t=num($('spT').value); if(d>=0) sp.d=d; if(t>0) sp.t=t; render(); };
  $('spD').addEventListener('input',upd); $('spT').addEventListener('input',upd);
  $('spD').addEventListener('change',()=>{ upd(); renderSide(); }); $('spT').addEventListener('change',()=>{ upd(); renderSide(); });
  enterChain(['spD','spT'],()=>{ upd(); doSplit(sp); });
  $('spGo').onclick=()=>{ upd(); doSplit(sp); }; $('spNo').onclick=()=>{ splitting=null; render(); renderSide(); };
}
function toolPanel(t){
  if(t==='pen') return penToolPanel();
  if(t==='rect'){ h(`<div class="eyebrow">Νέο σχήμα · ${esc(roomById(cur).name)}</div><h2>Ορθογώνιο</h2><p>Αν έχεις διαλέξει σχήμα, το νέο μπαίνει κολλητά στα δεξιά του. Μετά το σέρνεις όπου θες.</p>
    <div class="form"><div class="row">${field('tW','Πλάτος ΑΒ (m)','4.00')}${field('tH','Μήκος ΒΓ (m)','3.00')}</div>
    <div class="row">${field('tD','Διαγώνιος ΑΓ (αν τη μέτρησες)','')}${field('tD2','Διαγώνιος ΒΔ (έλεγχος)','')}</div>
    <div id="rInfo" class="note">Α πάνω αριστερά, Β πάνω δεξιά, Γ κάτω δεξιά, Δ κάτω αριστερά.</div>
    <label class="f"><span><input type="checkbox" id="tSub"> Αφαίρεση (κόβει από το περίγραμμα)</span></label>
    <div class="actions"><button class="btn primary" id="tGo">Βάλε το</button></div></div>`);
    const calc=()=>{ const w=num($('tW').value), hh=num($('tH').value), d1=num($('tD').value)||0, d2=num($('tD2').value)||0; if(!(w>0&&hh>0)) return null;
      const D=Math.hypot(w,hh); if(d1>0&&Math.abs(d1-D)>0.005){ const src={k:'diag',sides:[w,hh,w,hh],diags:[d1],checks:d2>0?[[1,3,d2]]:[]}; const r=diagSolve(src.sides,src.diags); return {w,hh,D,src,r,poly:true}; }
      return {w,hh,D,chk:[d1,d2]}; };
    const info=()=>{ const c=calc(), el=$('rInfo'); if(!c) return; let t='Ορθογώνιο: διαγώνιος '+fmt(c.D)+' m.';
      if(c.poly){ if(c.r.err){ el.innerHTML=checkNotes([{err:c.r.err,lvl:'bad'}]); return; } const V=c.r.pts, a=Math.atan2(V[3][1],V[3][0])*180/Math.PI;
        t='Μέτρησες ΑΓ '+fmt(c.src.diags[0])+' αντί για '+fmt(c.D)+': ο χώρος θα μπει πλάγιος, γωνία Α = '+a.toFixed(1)+'°.'; el.className='note'; el.innerHTML=esc(t)+checkNotes(shapeChecks({t:'poly',src:c.src})); return; }
      el.className='note'; el.innerHTML=esc(t)+checkNotes(shapeChecks({t:'rect',w:c.w,h:c.hh,chk:c.chk})); };
    ['tW','tH','tD','tD2'].forEach(i=>$(i).addEventListener('input',info));
    const go=()=>{ const c=calc(); if(!c) return toast('Γράψε πλάτος και μήκος σε μέτρα');
      if(c.poly){ if(c.r.err) return toast(c.r.err); const pts=c.r.pts.map(p=>[r4(p[0]),r4(p[1])]); return addShape({t:'poly',rot:0,sub:$('tSub').checked,pts,src:c.src}); }
      const it={t:'rect',w:c.w,h:c.hh,rot:0,sub:$('tSub').checked}; if(c.chk.some(v=>v>0)) it.chk=c.chk; addShape(it); };
    enterChain(['tW','tH','tD','tD2'],go); $('tGo').onclick=go; $('tW').focus(); }
  if(t==='tri'){ h(`<div class="eyebrow">Νέο σχήμα · ${esc(roomById(cur).name)}</div><h2>Τρίγωνο</h2>
    <div class="seg" style="margin-top:10px"><button id="mS" class="${triMode==='sss'?'on':''}">3 πλευρές</button><button id="mR" class="${triMode==='right'?'on':''}">Ορθή γωνία</button></div>
    <div class="form">${triMode==='sss'? `<div class="row3">${field('ta','Βάση α','3.00')}${field('tb','Πλευρά β','4.00')}${field('tc','Πλευρά γ','5.00')}</div><p>Η βάση α μπαίνει οριζόντια. Η β ξεκινά από το αριστερό άκρο της βάσης.</p>`
      : `<div class="row">${field('ta','Οριζόντια κάθετη','3.00')}${field('tb','Κατακόρυφη κάθετη','4.00')}</div>`}
    <div id="triInfo" class="note"></div>
    <label class="f"><span><input type="checkbox" id="tSub"> Αφαίρεση (κόβει από το περίγραμμα)</span></label>
    <div class="actions"><button class="btn primary" id="tGo">Βάλε το</button></div></div>`);
    $('mS').onclick=()=>{triMode='sss';renderSide();}; $('mR').onclick=()=>{triMode='right';renderSide();};
    const calc=()=>{ const a=num($('ta').value), b=num($('tb').value); let c=triMode==='sss'?num($('tc').value):Math.hypot(a,b);
      if(!(a>0&&b>0&&c>0)) return null; if(a+b<=c||a+c<=b||b+c<=a) return {err:'Δεν κλείνει τρίγωνο με αυτές τις πλευρές'};
      const x=(a*a+b*b-c*c)/(2*a), y=-Math.sqrt(Math.max(0,b*b-x*x)); const ang=Math.acos(Math.max(-1,Math.min(1,x/b)))*180/Math.PI;
      return {pts:[[0,0],[a,0],[r4(x),r4(y)]],a,b,c,ang,E:a*Math.abs(y)/2}; };
    const info=()=>{ const r=calc(), el=$('triInfo'); if(!r){el.textContent='';return;} if(r.err){el.className='note warn';el.textContent=r.err;return;} el.className='note'; el.textContent=(triMode==='right'?'Υποτείνουσα '+fmt(r.c)+' m · ':'Γωνία στη βάση '+r.ang.toFixed(1)+'° · ')+'Ε = '+fmt(r.E)+' m²'; };
    ['ta','tb','tc'].forEach(i=>$(i)&&$(i).addEventListener('input',info)); info();
    const go=()=>{ const r=calc(); if(!r||r.err) return toast(r&&r.err||'Γράψε τις πλευρές'); addShape({t:'poly',rot:0,sub:$('tSub').checked,pts:r.pts,src:{k:'tri',a:r.a,b:r.b,c:r.c}}); };
    enterChain(triMode==='sss'?['ta','tb','tc']:['ta','tb'],go); $('tGo').onclick=go; $('ta').focus(); }
  if(t==='poly'){ const ed=polyEdit&&byId(polyEdit)?byId(polyEdit):null; if(!ed) polyEdit=null;
    const head=`<div class="eyebrow">${ed?'Αλλαγή μετρήσεων':'Νέο σχήμα'} · ${esc(roomById(cur).name)}</div><h2>Από πλευρές</h2>
    <div class="seg" style="margin-top:8px"><button id="pmA" class="${polyMode==='ang'?'on':''}">Με γωνίες</button><button id="pmD" class="${polyMode==='diag'?'on':''}">Με διαγώνιους</button></div>`;
    const goBtn=`<div class="actions"><button class="btn primary" id="tGo">${ed?'Άλλαξε το σχήμα':'Βάλε το'}</button>${ed?'<button class="btn" id="tNo">Άκυρο</button>':''}</div>`;
    const place=(pts,src)=>{ const clean=cleanRing(pts.map(p=>[r4(p[0]),r4(p[1])])); if(clean.length<3) return toast('Χρειάζονται τουλάχιστον 3 γωνίες'); if(areaRing(clean)<0) clean.reverse();
      if(ed){ snap(); ed.pts=clean; ed.src=src; polyEdit=null; tool=null; markTool(); sel=ed.id; commit(); return toast('Το σχήμα άλλαξε'); }
      addShape({t:'poly',rot:0,sub:false,pts:clean,src}); };
    if(polyMode==='diag'){ const P=polyDiag, n=P.sides.length; while(P.diags.length<n-3) P.diags.push(0); P.diags.length=Math.max(0,n-3);
      const sideRows=P.sides.map((v,i)=>`<div class="side-row"><span class="n">${corner(i)}${corner((i+1)%n)}</span>${field('ds'+i,i?'':'Πλευρά (m)',v?fmt(v):'')}<span></span><button aria-label="Σβήσε πλευρά" data-dd="${i}">×</button></div>`).join('');
      const diagRows=P.diags.map((v,k)=>`<div class="side-row"><span class="n">Α${corner(k+2)}</span>${field('dg'+k,k?'':'Διαγώνιος (m)',v?fmt(v):'')}<span></span><span></span></div>`).join('');
      const opt=(sel)=>P.sides.map((_,i)=>`<option value="${i}" ${i===sel?'selected':''}>${corner(i)}</option>`).join('');
      const chkRows=P.checks.map((c,k)=>`<div class="chk-row"><select data-ca="${k}">${opt(c[0])}</select><select data-cb="${k}">${opt(c[1])}</select>${field('dc'+k,'',c[2]?fmt(c[2]):'')}<button aria-label="Σβήσε" data-cx="${k}">×</button></div>`).join('');
      h(`${head}<p>Ξεκίνα από τη γωνία Α και περπάτα γύρω από τον χώρο με τη φορά του ρολογιού. Γράψε όλες τις πλευρές και μετά τις διαγώνιους από το Α. Για χώρο με εσοχή (γωνία πάνω από 180°) διάλεξε «Με γωνίες».</p>
      <div class="form"><div class="sides">${sideRows}</div><div class="actions"><button class="btn" id="dAdd">+ Πλευρά</button></div>
      ${n>3?`<div class="eyebrow">Διαγώνιοι από το Α (χρειάζονται ${n-3})</div><div class="sides">${diagRows}</div>`:''}
      <div class="eyebrow">Διαγώνιοι ελέγχου (προαιρετικά)</div>${chkRows}<div class="actions"><button class="btn" id="cAddK">+ Διαγώνιος ελέγχου</button></div>
      <div id="pInfo"></div>${goBtn}</div>`);
      const read=()=>{ P.sides=P.sides.map((_,i)=>num($('ds'+i).value)||0); P.diags=P.diags.map((_,k)=>num($('dg'+k).value)||0);
        P.checks=P.checks.map((c,k)=>[+side.querySelector(`[data-ca="${k}"]`).value,+side.querySelector(`[data-cb="${k}"]`).value,num($('dc'+k).value)||0]); };
      const info=()=>{ read(); const src={k:'diag',sides:P.sides.slice(),diags:P.diags.slice(),checks:P.checks.map(c=>c.slice())}; const r=diagSolve(src.sides,src.diags);
        const el=$('pInfo'); if(r.err){ el.innerHTML=checkNotes([{err:r.err,lvl:'bad'}]); return null; }
        let E=Math.abs(areaRing(r.pts)); el.innerHTML=`<div class="note">Ε = ${fmt(E)} m²</div>`+checkNotes(shapeChecks({t:'poly',src})); return {r,src}; };
      side.querySelectorAll('input,select').forEach(el=>{ el.addEventListener('input',info); el.addEventListener('change',info); });
      side.querySelectorAll('[data-dd]').forEach(b=>b.onclick=()=>{ read(); if(P.sides.length<=3) return toast('Χρειάζονται τουλάχιστον 3 πλευρές'); P.sides.splice(+b.dataset.dd,1); P.checks=P.checks.filter(c=>c[0]<P.sides.length&&c[1]<P.sides.length); renderSide(); });
      side.querySelectorAll('[data-cx]').forEach(b=>b.onclick=()=>{ read(); P.checks.splice(+b.dataset.cx,1); renderSide(); });
      $('dAdd').onclick=()=>{ read(); P.sides.push(0); renderSide(); $('ds'+(P.sides.length-1)).focus(); };
      $('cAddK').onclick=()=>{ read(); P.checks.push([1,Math.min(3,P.sides.length-1),0]); renderSide(); $('dc'+(P.checks.length-1)).focus(); };
      info();
      const ids=[]; P.sides.forEach((_,i)=>ids.push('ds'+i)); P.diags.forEach((_,k)=>ids.push('dg'+k)); P.checks.forEach((_,k)=>ids.push('dc'+k));
      const go=()=>{ const x=info(); if(!x) return toast('Το σχήμα δεν κλείνει. Δες τις μετρήσεις.'); place(x.r.pts,x.src); };
      enterChain(ids,go); $('tGo').onclick=go;
    } else {
      const rows=polyRows.map((r,i)=>`<div class="side-row"><span class="n">${i+1}</span>${field('pl'+i,i?'':'Μήκος (m)',fmt(r[0]))}${field('pa'+i,i?'':'Γωνία μετά (°)',r[1])}<button aria-label="Σβήσε πλευρά" data-del="${i}">×</button></div>`).join('');
      h(`${head}<p>Περπάτα γύρω από τον χώρο με τη φορά του ρολογιού. Γράψε κάθε πλευρά και την εσωτερική γωνία στο τέλος της (90 για κανονική γωνία, 270 για εσοχή). Η τελευταία πλευρά κλείνει μόνη της.</p>
      <div class="form"><div class="sides">${rows}</div><div class="actions"><button class="btn" id="pAdd">+ Πλευρά</button></div>
      ${field('pCl','Τελευταία πλευρά, αν τη μέτρησες (m)',polyClose?fmt(polyClose):'')}<div id="pInfo"></div>${goBtn}</div>`);
      const read=()=>{ polyRows=polyRows.map((r,i)=>[num($('pl'+i).value)||0, parseFloat(String($('pa'+i).value).replace(',','.'))||90]); polyClose=num($('pCl').value)||0; };
      const info=()=>{ read(); const n=polyRows.length, pts=walkRows(polyRows), e=pts[pts.length-1], c=Math.hypot(e[0],e[1]), el=$('pInfo');
        if(n<2){ el.innerHTML='<div class="note">Χρειάζονται τουλάχιστον 2 πλευρές.</div>'; return pts; }
        el.innerHTML=`<div class="note">Η τελευταία πλευρά (από το τέλος στην αρχή) βγαίνει ${fmt(c)} m.</div>`+(polyClose>0?checkNotes(shapeChecks({t:'poly',src:{k:'sides',rows:polyRows,close:polyClose}})):''); return pts; };
      polyRows.forEach((r,i)=>{ ['pl','pa'].forEach(p=>$(p+i).addEventListener('input',info)); }); $('pCl').addEventListener('input',info);
      side.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ read(); polyRows.splice(+b.dataset.del,1); renderSide(); });
      $('pAdd').onclick=()=>{ read(); polyRows.push([2,90]); renderSide(); $('pl'+(polyRows.length-1)).focus(); };
      info();
      const ids=[]; polyRows.forEach((r,i)=>ids.push('pl'+i,'pa'+i));
      const go=()=>{ const pts=info(); pts.pop(); const src={k:'sides',rows:polyRows.map(r=>r.slice())}; if(polyClose>0) src.close=polyClose; place(pts,src); };
      enterChain(ids,()=>{ read(); polyRows.push([0,90]); renderSide(); $('pl'+(polyRows.length-1)).focus(); });
      $('tGo').onclick=go; }
    $('pmA').onclick=()=>{ polyMode='ang'; renderSide(); }; $('pmD').onclick=()=>{ polyMode='diag'; renderSide(); };
    if($('tNo')) $('tNo').onclick=()=>{ polyEdit=null; tool=null; markTool(); renderSide(); };
    const f=side.querySelector('.sides input'); if(f) f.focus(); }
  if(t==='door'||t==='window'){ const d=t==='door';
    h(`<div class="eyebrow">Άνοιγμα · ${esc(roomById(cur).name)}</div><h2>${d?'Πόρτα':'Παράθυρο'}</h2><p>Μπαίνει στον πιο κοντινό τοίχο του χώρου, στη μέση της οθόνης. Μετά τη σέρνεις κατά μήκος του τοίχου ή γράφεις την απόσταση από τη γωνία.</p>
    <div class="form"><div class="row">${field('oW','Πλάτος (m)',d?'0.90':'1.20')}${field('oH','Ύψος (m)',d?'2.10':'1.20')}</div><div class="row">${d?`<label class="f">Φύλλα<select id="oL"><option value="1">Ένα</option><option value="2">Δύο</option><option value="0">Χωρίς φύλλο</option></select></label>`:field('oS','Ποδιά (m)','0.90')}</div>${specUI('o',lastSpec[d?'door':'window'],d)}
    <div class="actions"><button class="btn primary" id="tGo">Βάλε την</button></div></div>`);
    const go=()=>{ const w=num($('oW').value); if(!(w>0)) return toast('Γράψε πλάτος'); const o=OL[cur]; if(!o||!o.edges.length) return toast('Φτιάξε πρώτα το σχήμα του χώρου');
      const c=S2W(cv.clientWidth/2,cv.clientHeight/2); const ne=nearestEdge(c,o.edges,w); const hg=num($('oH').value); const it=d?{t:'door',w,leaves:+$('oL').value,flip:false,hinge:false}:{t:'window',w,sill:num($('oS').value)||0}; if(hg>0) it.hgt=hg; it.spec=readSpec('o',d); lastSpec[d?'door':'window']=Object.assign({},it.spec); if(d&&it.spec.op==='Χωρίς φύλλο') it.leaves=0;
      it.x=r4(ne.q[0]); it.y=r4(ne.q[1]); addItem(it); };
    enterChain(d?['oW','oH']:['oW','oH','oS'],go); bindSpec('o',d); $('tGo').onclick=go; $('oW').focus(); }
  if(t==='col'){ h(`<div class="eyebrow">Φέρων οργανισμός</div><h2>Υποστύλωμα</h2>
    <div class="form"><div class="row">${field('cW','Πλάτος (m)','0.30')}${field('cH','Μήκος (m)','0.30')}</div>
    <label class="f"><span><input type="checkbox" id="cR"> Κυκλικό (διάμετρος = πλάτος)</span></label>
    <div class="actions"><button class="btn primary" id="tGo">Βάλε το</button></div><p>Σύρε το σε γωνία ή τοίχο. Κουμπώνει πάνω τους.</p></div>`);
    const go=()=>{ const w=num($('cW').value), hh=num($('cH').value); if(!(w>0)) return toast('Γράψε διαστάσεις'); const r=$('cR').checked; const c=S2W(cv.clientWidth/2,cv.clientHeight/2); addItem({t:'col',x:r4(c[0]),y:r4(c[1]),w,h:r?w:(hh||w),rot:0,round:r}); };
    enterChain(['cW','cH'],go); $('tGo').onclick=go; $('cW').focus(); }
  if(t==='stair'){ const H=FL().h;
    h(`<div class="eyebrow">Νέα σκάλα · ${esc(roomById(cur).name)}</div><h2>Σκάλα</h2><p>Διάλεξε μορφή. Μετά αλλάζεις σκαλιά, πλατύσκαλα και στροφές, και τη σέρνεις στη θέση της. Η τελεία δείχνει πού ξεκινά, το βέλος πού ανεβαίνει.</p>
    <div class="form"><div class="row3">${field('sW','Πλάτος (m)','1.00')}${field('sT','Πάτημα (m)','0.28')}${field('sH','Ύψος ορόφου (m)',fmt(H))}</div>
    <div class="lib">${[['I','Ευθεία'],['IL','Ευθεία με πλατύσκαλο'],['GR','Γ (στρίβει δεξιά)'],['GL','Γ (στρίβει αριστερά)'],['P','Π (γυρνά πίσω)'],['UU','Τρία σκέλη']].map(([k,n])=>`<button data-sp="${k}">${n}</button>`).join('')}</div></div>`);
    enterChain(['sW','sT','sH'],()=>{});
    side.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>{ const w=num($('sW').value)||1, tr=num($('sT').value)||0.28, HH=num($('sH').value)||H; const N=Math.max(2,Math.round(HH/0.175)), c=S2W(cv.clientWidth/2,cv.clientHeight/2);
      const it={t:'stair',x:r4(c[0]),y:r4(c[1]),rot:0,w,tread:tr,segs:stairPreset(b.dataset.sp,N,w)}; if(Math.abs(HH-H)>0.005) it.H=HH; addItem(it); }); }
  if(t==='chim'){ h(`<div class="eyebrow">Νέα καμινάδα · ${esc(roomById(cur).name)}</div><h2>Καμινάδα</h2><p>Μπαίνει σε αυτόν τον όροφο και φαίνεται σε όλους τους από πάνω. Το εμβαδόν της βγαίνει από τους χώρους που πατάει.</p>
    <div class="form"><div class="row">${field('kW','Πλάτος (m)','0.50')}${field('kH','Βάθος (m)','0.40')}</div>
    <div class="row">${field('kN','Αγωγοί','1')}${field('kF','Αγωγός (m)','0.20')}</div>
    <div class="actions"><button class="btn primary" id="tGo">Βάλε την</button></div><p>Σύρε την σε γωνία ή τοίχο. Κουμπώνει πάνω τους.</p></div>`);
    const go=()=>{ const w=num($('kW').value), hh=num($('kH').value), n=Math.max(1,Math.min(6,parseInt($('kN').value)||1)), fw=num($('kF').value)||0.20; if(!(w>0&&hh>0)) return toast('Γράψε διαστάσεις'); const c=S2W(cv.clientWidth/2,cv.clientHeight/2); addItem({t:'chim',x:r4(c[0]),y:r4(c[1]),w,h:hh,rot:0,n,fw,fh:fw,to:null}); };
    enterChain(['kW','kH','kN','kF'],go); $('tGo').onclick=go; $('kW').focus(); }
  if(t==='furn'){ h(`<div class="eyebrow">Εξοπλισμός</div><h2>Έπιπλο</h2><p>Πάτα ένα για να μπει στη μέση της οθόνης. Οι διαστάσεις αλλάζουν μετά.</p>
    <div class="lib">${Object.entries(FURN).map(([k,f])=>`<button data-k="${k}">${f.n}<span>${fmt(f.w)} × ${fmt(f.h)}</span></button>`).join('')}</div>`);
    side.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ const f=FURN[b.dataset.k], c=S2W(cv.clientWidth/2,cv.clientHeight/2); addItem({t:'furn',k:b.dataset.k,x:r4(c[0]),y:r4(c[1]),w:f.w,h:f.h,rot:0}); }); }
  if(t==='label'){ h(`<div class="eyebrow">Κείμενο</div><h2>Ετικέτα</h2><div class="form"><label class="f">Κείμενο<input id="lT" value="Σημείωση" autocomplete="off"></label><div class="actions"><button class="btn primary" id="tGo">Βάλε την</button></div></div>`);
    const go=()=>{ const c=S2W(cv.clientWidth/2,cv.clientHeight/2); addItem({t:'label',x:r4(c[0]),y:r4(c[1]),text:$('lT').value||'Σημείωση'}); };
    enterChain(['lT'],go); $('tGo').onclick=go; $('lT').focus(); }
}
function addShape(it){
  const cs=byId(sel); it.id=S.next++; it.room=cur;
  const pts0=it.t==='rect'?[[-it.w/2,-it.h/2],[it.w/2,it.h/2]]:it.pts;
  const minx=Math.min(...pts0.map(p=>p[0])), miny=Math.min(...pts0.map(p=>p[1]));
  if(cs&&isShape(cs)&&cs.room===cur){ const b=itemPts(cs); const mx=Math.max(...b.map(p=>p[0])), my=Math.min(...b.map(p=>p[1])); it.x=r4(mx-minx); it.y=r4(my-miny); }
  else if(!S.items.some(isShape)){ it.x=r4(-minx); it.y=r4(-miny); }
  else { const c=S2W(cv.clientWidth/2,cv.clientHeight/2); it.x=r4(Math.round(c[0]*20)/20); it.y=r4(Math.round(c[1]*20)/20); }
  snap(); S.items.push(it); sel=it.id; tool=null; markTool(); compute(); save();
  if(S.items.filter(isShape).length===1) fit(); render(); renderSide(); toast('Μπήκε. Σύρε το για να το βάλεις στη θέση του.'); }
function addItem(it){ it.id=S.next++; it.room=cur; snap(); S.items.push(it); sel=it.id; tool=null; markTool(); commit(); }

function propPanel(it){
  const T={rect:'Ορθογώνιο',poly:it.src&&it.src.k==='tri'?'Τρίγωνο':'Σχήμα από πλευρές',door:'Πόρτα',window:'Παράθυρο',col:'Υποστύλωμα',stair:'Σκάλα',chim:'Καμινάδα',furn:FURN[it.k]?FURN[it.k].n:'Έπιπλο',label:'Ετικέτα'}[it.t];
  let body='';
  if(it.t==='chim'){ const k=flIdx(S.fl), up=S.floors.slice(k);
    body+=`<div class="row">${field('eW','Πλάτος (m)',fmt(it.w))}${field('eH','Βάθος (m)',fmt(it.h))}</div><div class="row">${field('eKn','Αγωγοί',String(it.n||1))}${field('eKf','Αγωγός (m)',fmt(it.fw||0.2))}</div>
    <label class="f">Ανεβαίνει μέχρι<select id="eKto">${up.map(f=>`<option value="${f.id}" ${(it.to!=null?it.to:S.floors[S.floors.length-1].id)===f.id?'selected':''}>${esc(f.name)}</option>`).join('')}</select></label>
    <p>Φαίνεται και αφαιρείται από το εμβαδόν σε ${chimTop(it,k)-k+1===1?'αυτόν τον όροφο':(chimTop(it,k)-k+1)+' ορόφους'}: ${S.floors.slice(k,chimTop(it,k)+1).map(f=>esc(f.name)).join(', ')}.</p>`; }
  if(it.t==='stair'){ const g=stairGeo(it), ck=stairCheck(g,it); let ri=0;
    body+=`<div class="row3">${field('eW','Πλάτος (m)',fmt(it.w))}${field('eTr','Πάτημα (m)',fmt(it.tread||0.28))}${field('eSH','Ύψος ορόφου (m)',fmt(stairH(it)))}</div>
    <div class="note ${ck.lvl==='ok'?'ok':'warn'}">${ck.msg}</div>
    <div class="eyebrow" style="margin-top:6px">Από κάτω προς τα πάνω</div>
    <div class="segs">${(it.segs||[]).map((sg,k)=>sg.t==='run'
      ? `<div class="sgr"><b>Σκέλος ${++ri}</b><span><input class="sgN" data-k="${k}" inputmode="numeric" value="${sg.n}"> σκαλιά</span><button class="btn" data-x="${k}" aria-label="Βγάλε το">×</button></div>`
      : `<div class="sgr"><b>Πλατύσκαλο</b><span><input class="sgL" data-k="${k}" inputmode="decimal" value="${fmt(sg.L>0?sg.L:it.w)}"> m</span><button class="btn" data-x="${k}" aria-label="Βγάλε το">×</button><select class="sgT" data-k="${k}">${Object.entries(TURNS).map(([v,n])=>`<option value="${v}" ${sg.turn===v?'selected':''}>${n}</option>`).join('')}</select></div>`).join('')}</div>
    <div class="actions"><button class="btn" id="eRun">+ Σκέλος</button><button class="btn" id="eLand">+ Πλατύσκαλο</button><button class="btn" id="eMirS">Καθρέφτης</button></div>
    <p>Σκαλιά = ρίχτια. Η σκάλα φαίνεται με διακεκομμένη γραμμή στον όροφο από πάνω.</p>`; }
  if(it.t==='rect'||it.t==='col'||it.t==='furn') body+= it.round? `<div class="row">${field('eW','Διάμετρος (m)',fmt(it.w))}</div>` : `<div class="row">${field('eW','Πλάτος (m)',fmt(it.w))}${field('eH','Μήκος (m)',fmt(it.h))}</div>`;
  if(it.t==='poly'&&it.src&&it.src.k==='tri') body+=`<div class="row3">${field('ea','Βάση α',fmt(it.src.a))}${field('eb','Πλευρά β',fmt(it.src.b))}${field('ec','Πλευρά γ',fmt(it.src.c))}</div>`;
  if(it.t==='poly'&&it.src&&it.src.k==='pen') body+=`<p>Από τη γραφίδα · ${it.src.sides.length} πλευρές, ${it.src.sides.filter(s=>s.m!=null).length} μετρημένες</p><div class="actions"><button class="btn" id="ePen">Μήκη πλευρών</button></div>`;
  if(it.t==='poly'&&it.src&&it.src.k==='sides') body+=`<p>Πλευρές: ${it.src.rows.map(r=>fmt(r[0])).join(' · ')}</p><div class="actions"><button class="btn" id="eMeas">Άλλαξε τις μετρήσεις</button></div>`;
  if(it.t==='poly'&&it.src&&it.src.k==='diag') body+=`<p>Πλευρές: ${it.src.sides.map((v,i)=>corner(i)+corner((i+1)%it.src.sides.length)+' '+fmt(v)).join(' · ')}${it.src.diags.length?'<br>Διαγώνιοι: '+it.src.diags.map((v,k)=>'Α'+corner(k+2)+' '+fmt(v)).join(' · '):''}</p><div class="actions"><button class="btn" id="eMeas">Άλλαξε τις μετρήσεις</button></div>`;
  if(it.t==='rect') body+=`<div class="row">${field('eD1','Διαγώνιος ΑΓ (έλεγχος)',it.chk&&it.chk[0]?fmt(it.chk[0]):'')}${field('eD2','Διαγώνιος ΒΔ (έλεγχος)',it.chk&&it.chk[1]?fmt(it.chk[1]):'')}</div>`;
  if(isShape(it)) body+=checkNotes(shapeChecks(it));
  if(it.t==='poly'&&it.src&&it.src.k==='split') body+=`<p>Κομμάτι από χώρο που χωρίστηκε με τοίχο.</p>`;
  if(it.t==='poly'&&it.src&&it.src.k==='dxf') body+=`<p>Από DXF: ${esc(it.src.file||'')}</p>`;
  if(it.t==='door'||it.t==='window'){ const g=openingGeo(it);
    body+=`<p><b>${openCode(it)}</b> · αρίθμηση με βάση τον χώρο ${roomNo(it.room)}</p><div class="row">${field('eW','Πλάτος (m)',fmt(it.w))}${field('eHh','Ύψος (m)',fmt(openH(it)))}</div><div class="row">${it.t==='door'?`<label class="f">Φύλλα<select id="eL"><option value="1">Ένα</option><option value="2">Δύο</option><option value="0">Χωρίς φύλλο</option></select></label>`:field('eS','Ποδιά (m)',fmt(it.sill||0))}</div>`;
    body+=specUI('e',it.spec||{note:it.desc||''},it.t==='door')+`<div class="actions"><button class="btn" id="eLibAdd">Βάλε τον τύπο στη βιβλιοθήκη</button></div><div id="eLibBox" hidden><div class="row">${'<label class="f">Όνομα τύπου<input id="eLibName" autocomplete="off"></label>'}<div class="actions" style="align-items:end"><button class="btn primary" id="eLibSave">Αποθήκευση</button></div></div></div>`;
    if(g){ const w=wallAt(it.room,g.c); body+=`<div class="row">${field('eDl','Από τη μία γωνία (m)',fmt(g.left))}${field('eDr','Από την άλλη (m)',fmt(g.right))}</div><div class="row">${field('eTh','Πάχος τοίχου εδώ (m)',fmt(w?w.T:g.depth))}<p style="align-self:end">Τοίχος ${fmt(g.e.L)} m${w?(w.ext?', εξωτερικός':', εσωτερικός'):''}.</p></div>`; }
    if(it.t==='door'&&it.leaves) body+=`<div class="actions"><button class="btn" id="eFlip">Ανοίγει από την άλλη πλευρά</button>${it.leaves===1?'<button class="btn" id="eHinge">Μεντεσές απέναντι</button>':''}</div>`; }
  if(it.t==='label') body+=`<label class="f">Κείμενο<input id="eT" value="${esc(it.text)}" autocomplete="off"></label>`;
  if(it.t!=='door'&&it.t!=='window'&&it.t!=='label') body+=`<div class="row">${field('eR','Στροφή (°)',+(it.rot||0).toFixed(2))}<div class="actions" style="align-items:end"><button class="btn" id="eR90">↻ 90°</button></div></div>`;
  if(isShape(it)) body+=`<div class="seg"><button id="eAdd" class="${it.sub?'':'on'}">Ένωση</button><button id="eSub" class="${it.sub?'on':''}">Αφαίρεση</button></div>`;
  if(it.t==='poly') body+=`<div class="actions"><button class="btn" id="eMir">Καθρέφτης</button></div>`;
  if(typeof ktDistUI==='function') body+=ktDistUI(it);
  h(`<div class="eyebrow">Επιλογή · ${esc(roomById(it.room).name)}</div><h2>${T}</h2><div class="form">${body}
    <div class="actions"><button class="btn" id="eDup">Διπλότυπο</button><button class="btn danger" id="eDel">Διαγραφή</button><button class="btn" id="eOk">Τέλος</button></div></div>`);
  const ch=fn=>{ snap(); fn(); commit(); };
  if(typeof ktDistBind==='function') ktDistBind(it,ch);
  const bindNum=(id,fn)=>{ const el=$(id); if(!el) return; el.addEventListener('change',()=>{ const v=num(el.value); if(!(v>=0)) return; ch(()=>fn(v)); }); el.addEventListener('keydown',e=>{ if(e.key==='Enter') el.blur(); }); el.addEventListener('focus',()=>el.select()); };
  bindNum('eW',v=>{ if(v>0){ it.w=v; if(it.round) it.h=v; } }); bindNum('eH',v=>{ if(v>0) it.h=v; }); bindNum('eS',v=>{ it.sill=v; }); bindNum('eHh',v=>{ if(v>0) it.hgt=v; }); if($('eLib')) { bindSpec('e',it.t==='door',()=>ch(()=>{ it.spec=readSpec('e',it.t==='door'); delete it.desc; if(it.t==='door'&&it.spec.op==='Χωρίς φύλλο') it.leaves=0; })); $('eLibAdd').onclick=()=>{ $('eLibBox').hidden=false; $('eLibName').value=descOf(it); $('eLibName').focus(); }; $('eLibSave').onclick=()=>{ const n=$('eLibName').value.trim(); if(!n) return; const sp=readSpec('e',it.t==='door'); LIB.push(Object.assign({name:n,kind:it.t==='door'?'door':'window'},sp)); saveLib(); toast('Μπήκε στη βιβλιοθήκη: '+n); $('eLibBox').hidden=true; renderSide(); }; }
  if($('eR')){ $('eR').addEventListener('change',()=>{ const v=parseFloat(String($('eR').value).replace(',','.')); if(isFinite(v)) ch(()=>{it.rot=v;}); }); $('eR').addEventListener('keydown',e=>{ if(e.key==='Enter') e.target.blur(); }); }
  const triUpd=()=>{ const a=num($('ea').value),b=num($('eb').value),c=num($('ec').value); if(a+b<=c||a+c<=b||b+c<=a) return toast('Δεν κλείνει τρίγωνο με αυτές τις πλευρές'); const x=(a*a+b*b-c*c)/(2*a), y=-Math.sqrt(Math.max(0,b*b-x*x)); const mir=it.pts[2][1]>0;
    ch(()=>{ it.src={k:'tri',a,b,c}; it.pts=[[0,0],[a,0],[r4(x),r4(mir?-y:y)]]; }); };
  ['ea','eb','ec'].forEach(id=>{ const el=$(id); if(el){ el.addEventListener('change',triUpd); el.addEventListener('keydown',e=>{if(e.key==='Enter')el.blur();}); } });
  if($('eL')){ $('eL').value=String(it.leaves); $('eL').onchange=()=>ch(()=>{it.leaves=+$('eL').value;}); }
  const g=(it.t==='door'||it.t==='window')?openingGeo(it):null;
  if(g){ const place=t=>{ t=Math.max(g.hw,Math.min(g.e.L-g.hw,t)); it.x=r4(g.e.a[0]+g.e.ux*t); it.y=r4(g.e.a[1]+g.e.uy*t); };
    bindNum('eDl',v=>place(v+g.hw)); bindNum('eDr',v=>place(g.e.L-v-g.hw));
    const th=$('eTh'); if(th){ th.addEventListener('focus',()=>th.select()); th.addEventListener('keydown',e=>{ if(e.key==='Enter') th.blur(); }); th.addEventListener('change',()=>{ compute(); const w=wallAt(it.room,g.c); if(!w) return toast('Βάλε πρώτα τον χώρο στη θέση του στην «Οικία»'); setWallT(w,num(th.value),'nb'); }); } }
  if($('eFlip')) $('eFlip').onclick=()=>ch(()=>{it.flip=!it.flip;});
  if($('eHinge')) $('eHinge').onclick=()=>ch(()=>{it.hinge=!it.hinge;});
  if($('eT')) $('eT').addEventListener('change',()=>ch(()=>{it.text=$('eT').value;}));
  if($('eR90')) $('eR90').onclick=()=>ch(()=>{ it.rot=((it.rot||0)+90)%360; });
  if($('eAdd')) $('eAdd').onclick=()=>ch(()=>{it.sub=false;}); if($('eSub')) $('eSub').onclick=()=>ch(()=>{it.sub=true;});
  if($('ePen')) $('ePen').onclick=()=>{ penEdit={id:it.id,active:0}; renderSide(); render(); };
  if($('eMeas')) $('eMeas').onclick=()=>{ const src=it.src; if(src.k==='diag'){ polyMode='diag'; polyDiag={sides:src.sides.slice(),diags:src.diags.slice(),checks:(src.checks||[]).map(c=>c.slice())}; } else { polyMode='ang'; polyRows=src.rows.map(r=>r.slice()); polyClose=src.close||0; }
    polyEdit=it.id; sel=null; tool='poly'; markTool(); render(); toolPanel('poly'); };
  ['eD1','eD2'].forEach((id,k)=>{ const el=$(id); if(!el) return; el.addEventListener('focus',()=>el.select()); el.addEventListener('keydown',e=>{ if(e.key==='Enter') el.blur(); });
    el.addEventListener('change',()=>{ const v=num(el.value)||0; ch(()=>{ it.chk=it.chk||[0,0]; it.chk[k]=v; if(!it.chk.some(x=>x>0)) delete it.chk; }); }); });
  if($('eMir')) $('eMir').onclick=()=>ch(()=>{ it.pts=it.pts.map(p=>[p[0],-p[1]]).reverse(); });
  bindNum('eTr',v=>{ if(v>0.15&&v<0.5) it.tread=v; }); bindNum('eSH',v=>{ if(v>0.5){ if(Math.abs(v-FL().h)<0.005) delete it.H; else it.H=v; } }); bindNum('eKf',v=>{ if(v>0.05&&v<it.w){ it.fw=v; it.fh=v; } });
  if($('eKn')) $('eKn').addEventListener('change',()=>{ const v=parseInt($('eKn').value); if(v>=1&&v<=6) ch(()=>{ it.n=v; }); });
  if($('eKto')) $('eKto').onchange=()=>ch(()=>{ const v=+$('eKto').value; it.to= v===S.floors[S.floors.length-1].id? null : v; });
  side.querySelectorAll('.sgN').forEach(el=>{ el.addEventListener('focus',()=>el.select()); el.addEventListener('keydown',e=>{ if(e.key==='Enter') el.blur(); }); el.addEventListener('change',()=>{ const v=parseInt(el.value); if(v>=2&&v<60) ch(()=>{ it.segs[+el.dataset.k].n=v; }); }); });
  side.querySelectorAll('.sgL').forEach(el=>{ el.addEventListener('focus',()=>el.select()); el.addEventListener('keydown',e=>{ if(e.key==='Enter') el.blur(); }); el.addEventListener('change',()=>{ const v=num(el.value); if(v>0.3&&v<10) ch(()=>{ it.segs[+el.dataset.k].L=v; }); }); });
  side.querySelectorAll('.sgT').forEach(el=>el.onchange=()=>ch(()=>{ it.segs[+el.dataset.k].turn=el.value; }));
  side.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{ if(it.segs.filter(x=>x.t==='run').length<=1&&it.segs[+b.dataset.x].t==='run') return toast('Η σκάλα θέλει τουλάχιστον ένα σκέλος'); ch(()=>{ it.segs.splice(+b.dataset.x,1); }); });
  if($('eRun')) $('eRun').onclick=()=>ch(()=>{ it.segs.push({t:'run',n:8}); });
  if($('eLand')) $('eLand').onclick=()=>ch(()=>{ it.segs.push({t:'land',L:it.w,turn:'R'}); });
  if($('eMirS')) $('eMirS').onclick=()=>ch(()=>{ const m={R:'L',L:'R',UR:'UL',UL:'UR',S:'S'}; for(const sg of it.segs) if(sg.t==='land') sg.turn=m[sg.turn||'S']; });
  $('eDup').onclick=()=>{ const c=JSON.parse(JSON.stringify(it)); c.id=S.next++; c.x=r4(c.x+0.5); c.y=r4(c.y+0.5); snap(); S.items.push(c); sel=c.id; commit(); };
  $('eDel').onclick=()=>{ snap(); S.items=S.items.filter(x=>x!==it); sel=null; commit(); };
  $('eOk').onclick=()=>{ sel=null; render(); renderSide(); };
}

// ---------- DXF reading (topographer outline, Pythagoras room) ----------
function parseDXF(txt){
  const L=txt.split(/\r?\n/); const pairs=[]; for(let i=0;i+1<L.length;i+=2) pairs.push([parseInt(L[i],10),L[i+1].trim()]);
  let i=0; while(i<pairs.length&&!(pairs[i][0]===2&&pairs[i][1]==='ENTITIES')) i++;
  const ents=[]; let cur=null, poly=null;
  const flush=()=>{ if(!cur) return; const c=cur; cur=null;
    if(c.type==='LINE'&&c.x!=null&&c.x1!=null) ents.push({l:c.layer,pts:[[c.x,c.y],[c.x1,c.y1]],c:0});
    else if(c.type==='LWPOLYLINE'&&c.v.length>1) ents.push({l:c.layer,pts:c.v,c:(c.flag&1)?1:0});
    else if(c.type==='CIRCLE'&&c.r){ const p=[]; for(let k=0;k<32;k++){const a=k/32*Math.PI*2;p.push([c.x+c.r*Math.cos(a),c.y+c.r*Math.sin(a)]);} ents.push({l:c.layer,pts:p,c:1}); }
    else if(c.type==='ARC'&&c.r){ let a0=c.a0, a1=c.a1; if(a1<a0) a1+=360; const n=Math.max(4,Math.round((a1-a0)/10)); const p=[]; for(let k=0;k<=n;k++){const a=rad(a0+(a1-a0)*k/n);p.push([c.x+c.r*Math.cos(a),c.y+c.r*Math.sin(a)]);} ents.push({l:c.layer,pts:p,c:0}); }
    else if(c.type==='POLYLINE'){ poly={layer:c.layer,flag:c.flag||0,v:[]}; }
    else if(c.type==='VERTEX'&&poly){ if(c.x!=null) poly.v.push([c.x,c.y]); }
    else if(c.type==='SEQEND'&&poly){ if(poly.v.length>1) ents.push({l:poly.layer,pts:poly.v,c:(poly.flag&1)?1:0}); poly=null; } };
  for(i++;i<pairs.length;i++){ const [g,v]=pairs[i];
    if(g===0){ flush(); if(v==='ENDSEC') break; cur={type:v,layer:'0',v:[],flag:0}; continue; }
    if(!cur) continue;
    if(g===8) cur.layer=v; else if(g===10){ cur.x=parseFloat(v); if(cur.type==='LWPOLYLINE') cur.v.push([cur.x,null]); } else if(g===20){ cur.y=parseFloat(v); if(cur.type==='LWPOLYLINE'&&cur.v.length) cur.v[cur.v.length-1][1]=cur.y; }
    else if(g===11) cur.x1=parseFloat(v); else if(g===21) cur.y1=parseFloat(v); else if(g===40) cur.r=parseFloat(v); else if(g===50) cur.a0=parseFloat(v); else if(g===51) cur.a1=parseFloat(v); else if(g===70) cur.flag=parseInt(v,10); }
  flush();
  return ents.filter(e=>e.pts.every(p=>isFinite(p[0])&&isFinite(p[1])));
}
function dxfDecode(s){ return s.replace(/\\U\+([0-9A-Fa-f]{4})/g,(m,h)=>String.fromCharCode(parseInt(h,16))); }
let pickMode=null;
const fileIn=document.createElement('input'); fileIn.type='file'; fileIn.accept='.dxf,.DXF'; fileIn.hidden=true; document.body.appendChild(fileIn);
function pickFile(m){ pickMode=m; fileIn.value=''; fileIn.click(); }
fileIn.onchange=()=>{ const f=fileIn.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ try{ (pickMode==='topo'?loadTopo:loadRoomDXF)(String(rd.result),f.name); }catch(e){ console.error(e); toast('Δεν μπόρεσα να διαβάσω αυτό το DXF. Χρειάζεται DXF σε μορφή κειμένου (ASCII).'); } }; rd.readAsText(f); };
function loadTopo(txt,file){
  const ents=parseDXF(txt); if(!ents.length) return toast('Δεν βρήκα γραμμές στο DXF');
  let x0=1e18,y1=-1e18; for(const e of ents) for(const p of e.pts){ x0=Math.min(x0,p[0]); y1=Math.max(y1,p[1]); }
  const count={}, layers={}; for(const e of ents){ count[e.l]=(count[e.l]||0)+1; layers[e.l]=true; }
  const T={file, X0:x0, Y0:y1, count, layers, ents:ents.map(e=>({l:e.l,c:e.c,pts:e.pts.map(p=>[r4(p[0]-x0),r4(y1-p[1])])}))};
  // place the existing house in the middle of the plot the first time
  const bl=Object.keys(layers).find(isBldLayer), tb=[1e9,1e9,-1e9,-1e9]; for(const e of T.ents) if(!bl||e.l===bl) for(const p of e.pts){ tb[0]=Math.min(tb[0],p[0]); tb[1]=Math.min(tb[1],p[1]); tb[2]=Math.max(tb[2],p[0]); tb[3]=Math.max(tb[3],p[1]); }
  snap();
  if(!S.topo&&S.items.length){ const hb=bbox(); const dx=(tb[0]+tb[2])/2-(hb[0]+hb[2])/2, dy=(tb[1]+tb[3])/2-(hb[1]+hb[3])/2; for(const it of S.items){ it.x=r4(it.x+dx); it.y=r4(it.y+dy); } }
  S.topo=T; topoEdges(); mode='house'; markMode(); selRoom=null; commit(); fit();
  const B=bldInfo();
  if(B&&B.rings.length) toast('Βρήκα το περίγραμμα του κτιρίου ('+bl+'): '+fmt(B.area)+' m². Φορτώθηκαν και τα άλλα '+(Object.keys(layers).length-1)+' layers.');
  else if(B) toast('Βρήκα το layer '+bl+' αλλά όχι κλειστό περίγραμμα. Δες αν ο τοπογράφος το έκλεισε.');
  else toast('Φορτώθηκε: '+ents.length+' γραμμές. Δεν υπάρχει layer lk.4495.buliding.area, κράτα μόνο τα layers που χρειάζεσαι.');
}
// περίγραμμα κτιρίου του τοπογράφου: layer lk.4495.buliding.area (δεκτό και «building», κεφαλαία, _ ή -)
const isBldLayer = l => String(l).toLowerCase().replace(/[^a-z0-9]/g,'').replace('buliding','building')==='lk4495buildingarea';
// ενώνει ανοιχτές γραμμές άκρη με άκρη σε κλειστά περιγράμματα
function chainRings(list){ const segs=list.map(p=>p.slice()), rings=[], eq=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<0.01;
  while(segs.length){ let r=segs.shift(), grew=true;
    while(grew&&!(r.length>2&&eq(r[0],r[r.length-1]))){ grew=false;
      for(let i=0;i<segs.length;i++){ const q=segs[i], end=r[r.length-1];
        if(eq(end,q[0])) r=r.concat(q.slice(1)); else if(eq(end,q[q.length-1])) r=r.concat(q.slice(0,-1).reverse()); else continue;
        segs.splice(i,1); grew=true; break; } }
    if(r.length>3&&eq(r[0],r[r.length-1])){ r.pop(); rings.push(r); } }
  return rings; }
function bldInfo(){ const T=S.topo; const R=S.bld&&S.bld.ring&&S.bld.ring.length>=3? [S.bld.ring] : (T&&T.bld? T.bldRings||[] : null); if(!R) return null; if(!R.length) return {rings:[],area:0,per:0};
  let area=0, per=0; R.forEach((r,i)=>{ const inside=R.some((o,j)=>j!==i&&Math.abs(areaRing(o))>Math.abs(areaRing(r))&&inRing(centroid(r),o)); area+=(inside?-1:1)*Math.abs(areaRing(r)); for(let k=0;k<r.length;k++){ const a=r[k],b=r[(k+1)%r.length]; per+=Math.hypot(b[0]-a[0],b[1]-a[1]); } });
  return {rings:R,area,per}; }
function bldBox(){ const T=S.topo, B=bldInfo();
  if(!B||!T) return `<div class="note">Το DXF δεν έχει layer «lk.4495.buliding.area», οπότε δεν ξεχωρίζω περίγραμμα κτιρίου.</div>`;
  if(!B.rings.length) return `<div class="note warn">Το layer «${esc(T.bld)}» δεν έχει κλειστό περίγραμμα. Ζήτα από τον τοπογράφο κλειστή πολυγραμμή.</div>`;
  const fa=HOUSE.footArea||0, d=fa-B.area, fl=S.floors.length>1?' («'+esc(FL().name)+'»)':'';
  const cmp=fa>0.01?`<tr><td>Μικτό κάτοψης${fl}</td><td>${fmt(fa)}</td></tr><tr><td>Διαφορά</td><td style="color:var(--${Math.abs(d)<=Math.max(0.5,B.area*0.02)?'ok':'warn'})">${d>0?'+':''}${fmt(d)} (${d>0?'+':''}${fmt(d/B.area*100)}%)</td></tr>`:'';
  return `<div class="tbl"><table><tbody><tr><td>${S.bld?'Κτίριο (διορθωμένο)':'Κτίριο τοπογράφου'}${B.rings.length>1?' ('+B.rings.length+' περιγράμματα)':''}</td><td>${fmt(B.area)} m²</td></tr><tr><td>Περίμετρος</td><td>${fmt(B.per)} m</td></tr>${cmp}</tbody></table></div>`; }
// νέος χώρος μέσα στο περίγραμμα του τοπογράφου, μείον τον εξωτερικό τοίχο
function bldRoom(){ const B=bldInfo(); if(!B||!B.rings.length) return;
  let ring=B.rings[0]; for(const r of B.rings) if(Math.abs(areaRing(r))>Math.abs(areaRing(ring))) ring=r;
  const ext=S.extC&&consById(S.extC)?consT(consById(S.extC)):S.ext;
  const inner=cleanRing(offsetRing(ring,-ext)); if(inner.length<3||Math.abs(areaRing(inner))<0.5) return toast('Το περίγραμμα είναι πολύ μικρό για τον εξωτερικό τοίχο');
  const c=centroid(inner); snap();
  const empty=S.rooms.length===1&&!S.items.some(it=>it.room===S.rooms[0].id); const id=empty?S.rooms[0].id:newRoomId();
  if(empty) S.rooms[0].name='Κτίριο τοπογράφου'; else S.rooms.push({id,name:'Κτίριο τοπογράφου'});
  S.items.push({id:S.next++,room:id,t:'poly',x:r4(c[0]),y:r4(c[1]),rot:0,sub:false,pts:inner.map(p=>[r4(p[0]-c[0]),r4(p[1]-c[1])]),src:{k:'topo',file:S.topo.file}});
  selRoom=id; mode='house'; markMode(); commit(); fit();
  toast('Μπήκε χώρος '+fmt(Math.abs(areaRing(inner)))+' m² μέσα στο περίγραμμα, με εξωτερικό τοίχο '+cm(ext)+' εκ. Χώρισέ τον με εσωτερικούς τοίχους.'); }
function topoEdges(){ if(!S.topo) return; const E=[];
  const T=S.topo; T.bld=Object.keys(T.layers).find(isBldLayer)||null;
  const be=T.bld?T.ents.filter(e=>e.l===T.bld):[];
  const rings=be.filter(e=>e.c&&e.pts.length>=3).map(e=>cleanRing(e.pts)).concat(chainRings(be.filter(e=>!e.c).map(e=>e.pts)).map(cleanRing)).filter(r=>r.length>=3&&Math.abs(areaRing(r))>0.5);
  Object.defineProperty(T,'bldRings',{value:rings,enumerable:false,configurable:true,writable:true}); for(const e of S.topo.ents){ const n=e.pts.length; for(let i=0;i<(e.c?n:n-1);i++){ const a=e.pts[i], b=e.pts[(i+1)%n], L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L<0.05) continue; E.push({a,b,L,ux:(b[0]-a[0])/L,uy:(b[1]-a[1])/L,l:e.l}); } }
  Object.defineProperty(S.topo,'edges',{value:E,enumerable:false,configurable:true,writable:true}); }
function loadRoomDXF(txt,file){
  const ents=parseDXF(txt); const closed=ents.filter(e=>e.c&&e.pts.length>=3);
  let pick=closed.filter(e=>e.l==='OUTLINE-01'); if(!pick.length) pick=closed; if(!pick.length) return toast('Δεν βρήκα κλειστό περίγραμμα στο DXF');
  let best=pick[0]; for(const e of pick) if(Math.abs(areaRing(e.pts))>Math.abs(areaRing(best.pts))) best=e;
  let pts=best.pts.map(p=>[p[0],-p[1]]); const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]); const diag=Math.hypot(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
  const k=diag>3000?0.001:diag>60?0.01:1; pts=pts.map(p=>[p[0]*k,p[1]*k]);
  const c=centroid(pts); pts=cleanRing(pts.map(p=>[r4(p[0]-c[0]),r4(p[1]-c[1])]));
  snap(); const id=newRoomId(); const name=dxfDecode(file.replace(/\.dxf$/i,'').replace(/_/g,' '));
  S.rooms.push({id,name}); const hb=S.items.length?bbox():[0,0,0,0]; const bw=Math.max(...pts.map(p=>p[0]))-Math.min(...pts.map(p=>p[0])); const v=S.items.length?[hb[2]+S.ext*2+bw/2+0.5,(hb[1]+hb[3])/2]:[0,0];
  S.items.push({id:S.next++,room:id,t:'poly',x:r4(v[0]),y:r4(v[1]),rot:0,sub:false,pts,src:{k:'dxf',file}});
  selRoom=id; mode='house'; markMode(); commit(); fit();
  toast('Μπήκε ο χώρος «'+name+'» ('+fmt(Math.abs(areaRing(pts)))+' m²). Σύρε τον στη θέση του.');
}

// ---------- modes / tools / header ----------
function markTool(){ document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('on',b.dataset.tool===tool)); }
function markMode(){ $('mRoom').classList.toggle('on',mode==='room'); $('mHouse').classList.toggle('on',mode==='house'); document.body.classList.toggle('house',mode==='house'); const bo=$('bOthers'); if(bo) bo.hidden=mode!=='room'; updStats(); }
function setMode(m){ if(typeof ktEsc==='function'&&m!=='house') ktEsc(); splitting=null; selWall=null; consEdit=null; mode=m; sel=null; tool=null; if(m==='room'&&selRoom!=null){ cur=selRoom; } selRoom=null; markMode(); markTool(); render(); renderSide(); }
$('mRoom').onclick=()=>setMode('room'); $('mHouse').onclick=()=>setMode('house');
$('flSel').onchange=()=>{ const v=$('flSel').value; if(v==='+up') addFloor(true); else if(v==='+down') addFloor(false); else switchFloor(+v); updFloorSel(); };
document.querySelectorAll('.tool').forEach(b=>b.onclick=()=>{ const t=b.dataset.tool;
  if(mode==='house'){ if(selRoom!=null) cur=selRoom; mode='room'; selRoom=null; markMode(); }
  tool=tool===t?null:t; sel=null; markTool(); render(); if(tool) toolPanel(tool); else renderSide(); });
$('bUndo').onclick=()=>{ if(!undoS.length) return; const f0=S.fl; redoS.push(snapStr()); restore(undoS.pop()); fixRefs(); updUndo(); commit(); if(S.fl!==f0){ fit(); toast('Αναίρεση στον όροφο: '+FL().name); } };
$('bRedo').onclick=()=>{ if(!redoS.length) return; const f0=S.fl; undoS.push(snapStr()); restore(redoS.pop()); fixRefs(); updUndo(); commit(); if(S.fl!==f0){ fit(); toast('Επανάληψη στον όροφο: '+FL().name); } };
function fixRefs(){ if(!byId(sel)) sel=null; if(!roomById(selRoom)) selRoom=null; if(!roomById(cur)) cur=S.rooms[0].id; $('planName').value=S.name; topoEdges(); }
$('bDims').onclick=()=>{ showDims=!showDims; $('bDims').classList.toggle('on',showDims); render(); };
$('bThick').onclick=()=>{ showThick=!showThick; $('bThick').classList.toggle('on',showThick); if(showThick&&mode!=='house') setMode('house'); else render(); if(showThick) toast('Πάχη σε εκατοστά. Μ = με μόνωση, Ε = με επένδυση. Πάτα έναν τοίχο για να τον αλλάξεις.'); };
$('planName').addEventListener('change',()=>{ snap(); S.name=$('planName').value||'Κάτοψη'; save(); renderSide(); });
$('bZoomIn').onclick=()=>zoomAt(1.25,cv.clientWidth/2,cv.clientHeight/2);
$('bZoomOut').onclick=()=>zoomAt(0.8,cv.clientWidth/2,cv.clientHeight/2);
(function(){ const b=document.createElement('button'); b.className='btn'; b.id='bOthers'; b.textContent='Άλλοι χώροι'; b.title='Δείξε ξεθωριασμένους τους άλλους χώρους'; $('zoomBox').prepend(b); b.onclick=()=>{ showOthers=!showOthers; b.classList.toggle('on',showOthers); render(); }; })();
$('bFit').onclick=()=>fit(mode==='room'?cur:undefined);
document.addEventListener('keydown',e=>{ const tag=(e.target.tagName||'').toLowerCase(); if(tag==='input'||tag==='select'||tag==='textarea') return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){ e.preventDefault(); (e.shiftKey?$('bRedo'):$('bUndo')).click(); }
  if((e.key==='Delete'||e.key==='Backspace')&&sel!==null){ const b=$('eDel'); if(b) b.click(); }
  if(e.key==='Escape'){ if(typeof ktEsc==='function') ktEsc(); selWall=null; consEdit=null; splitting=null; sel=null; selRoom=null; tool=null; markTool(); render(); renderSide(); } });
let tt; function toast(m){ const t=$('toast'); t.textContent=m; t.hidden=false; clearTimeout(tt); tt=setTimeout(()=>t.hidden=true,3000); }

// ---------- DXF writing (R12, full header and tables) ----------
const TPL=window.DXF_TPL;
function dxfText(s){ return String(s).replace(/[^\x20-\x7e]/g,ch=>'\\U+'+ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')); }
function buildDXF(){
  compute();
  let X0,Y0;
  if(S.topo){ X0=S.topo.X0; Y0=S.topo.Y0; }
  else { let x0=1e9,y0=1e9; const src=HOUSE.foot.length?HOUSE.foot:[]; for(const p of src) for(const q of p[0]){ x0=Math.min(x0,q[0]); y0=Math.min(y0,q[1]); } if(x0>1e8){x0=0;y0=0;} X0=-x0; Y0=0; /* x from 0 */ var yRef=y0; }
  const X=p=>S.topo? p[0]+X0 : p[0]+X0, Y=p=>S.topo? Y0-p[1] : -(p[1]-yRef);
  const f=v=>(+v).toFixed(4);
  let H=0x200; const o=[]; const g=(...kv)=>{ for(let i=0;i<kv.length;i+=2) o.push(String(kv[i]).padStart(3,' '),String(kv[i+1])); };
  const hd=()=>(H++).toString(16).toUpperCase();
  const LINE=(L,a,c)=>g(0,'LINE',5,hd(),8,L,10,f(X(a)),20,f(Y(a)),30,'0.0',11,f(X(c)),21,f(Y(c)),31,'0.0');
  const PLINE=(L,pts,closed)=>{ g(0,'POLYLINE',5,hd(),8,L,66,1,10,'0.0',20,'0.0',30,'0.0',70,closed?1:0); for(const p of pts) g(0,'VERTEX',5,hd(),8,L,10,f(X(p)),20,f(Y(p)),30,'0.0'); g(0,'SEQEND',5,hd(),8,L); };
  const CIRC=(L,c,r)=>g(0,'CIRCLE',5,hd(),8,L,10,f(X(c)),20,f(Y(c)),30,'0.0',40,f(r));
  const ARC=(L,c,r,a0,a1)=>{ let s=-a0*180/Math.PI, e=-a1*180/Math.PI; let d=e-s; while(d>180)d-=360; while(d<-180)d+=360; if(d<0){ const t=s; s=e; e=t; }
    const n=v=>((v%360)+360)%360; g(0,'ARC',5,hd(),8,L,10,f(X(c)),20,f(Y(c)),30,'0.0',40,f(r),50,f(n(s)),51,f(n(e))); };
  const TEXT=(L,p,hgt,s,angRad,al)=>{ let a=-(angRad||0)*180/Math.PI; if(a>90)a-=180; if(a<=-90)a+=180;
    if(al==='left') g(0,'TEXT',5,hd(),8,L,10,f(X(p)),20,f(Y(p)),30,'0.0',40,f(hgt),1,dxfText(s),50,f(a));
    else g(0,'TEXT',5,hd(),8,L,10,f(X(p)),20,f(Y(p)),30,'0.0',40,f(hgt),1,dxfText(s),50,f(a),72,1,11,f(X(p)),21,f(Y(p)),31,'0.0',73,2); };
  if(S.topo) for(const e of S.topo.ents) if(S.topo.layers[e.l]!==false) PLINE('TOPO',e.pts,e.c);
  for(const it of S.items) if(isShape(it)) PLINE('SHAPES',itemPts(it),true);
  for(const poly of HOUSE.foot) for(const r of poly) PLINE('WALLS',r,true);
  for(const poly of HOUSE.ins||[]) for(const r of poly) PLINE('WALL-MONOSI',r,true);
  for(const poly of HOUSE.clad||[]) for(const r of poly) PLINE('WALL-EPENDYSI',r,true);
  { const placed=[]; for(const w of WALLS){ if(w.d<=0||w.L<0.4) continue; const m=[(w.a[0]+w.b[0])/2+w.on[0]*w.d/2,(w.a[1]+w.b[1])/2+w.on[1]*w.d/2]; if(placed.some(p=>Math.hypot(p[0]-m[0],p[1]-m[1])<0.35)) continue; placed.push(m); TEXT('WALL-THICK',m,0.08,wallLabel(w),Math.atan2(w.uy,w.ux)); } }
  for(const it of S.items) if(it.t==='poly'&&it.src&&it.src.k==='diag'){ const r=diagSolve(it.src.sides,it.src.diags); if(r.err) continue; const tw=toWorld(it), V=r.pts.map(p=>tw(p[0],p[1]));
    it.src.diags.forEach((v,k)=>{ const A=V[0], B=V[k+2]; LINE('DIAGONALS',A,B); TEXT('DIAGONALS',[(A[0]+B[0])/2,(A[1]+B[1])/2],0.08,'Α'+corner(k+2)+' '+fmt(v),Math.atan2(B[1]-A[1],B[0]-A[0])); });
    for(const c of it.src.checks||[]){ const A=V[c[0]], B=V[c[1]]; if(!A||!B) continue; LINE('DIAGONALS',A,B); TEXT('DIAGONALS',[(A[0]+B[0])/2,(A[1]+B[1])/2],0.08,corner(c[0])+corner(c[1])+' '+fmt(c[2])+' (έλεγχος)',Math.atan2(B[1]-A[1],B[0]-A[0])); } }
  for(const room of S.rooms){ const ol=OL[room.id]; if(!ol) continue;
    for(const poly of ol.polys) for(const r of poly) PLINE('OUTLINE-01',r,true);
    for(const e of ol.edges){ const m=[(e.a[0]+e.b[0])/2+e.nx*0.15,(e.a[1]+e.b[1])/2+e.ny*0.15]; TEXT('LENGTHS',m,0.10,fmt(e.L),Math.atan2(e.uy,e.ux)); }
    if(ol.polys.length){ let big=ol.polys[0]; for(const p of ol.polys) if(p.area>big.area) big=p; let c=centroid(big[0]); if(!inPolys(c,ol.polys)) c=big[0][0];
      TEXT('ROOMS',[c[0],c[1]-0.12],0.15,room.name,0); TEXT('ROOMS',[c[0],c[1]+0.12],0.12,'Ε = '+fmt(ol.area)+' m²',0); if(useOf(room)!=='kyr') TEXT('ROOMS',[c[0],c[1]+0.32],0.10,USES[useOf(room)],0); } }
  for(const e of HOUSE.footEdges){ const m=[(e.a[0]+e.b[0])/2-e.nx*0.25,(e.a[1]+e.b[1])/2-e.ny*0.25]; TEXT('LENGTHS',m,0.12,fmt(e.L),Math.atan2(e.uy,e.ux)); }
  for(const it of S.items){
    if(it.t==='door'||it.t==='window'){ const gg=openingGeo(it); if(!gg) continue;
      jambPrims(gg).forEach(l=>LINE('OPENINGS',l[0],l[1]));
      if(it.t==='door'){ const d=doorPrims(it,gg); d.lines.forEach(l=>LINE('OPENINGS',l[0],l[1])); d.arcs.forEach(a=>ARC('OPENINGS',a.c,a.r,a.a0,a.a1)); }
      else windowPrims(it,gg).forEach(l=>LINE('OPENINGS',l[0],l[1]));
      { const u=tagUp(gg.e), m=[gg.c[0]+gg.e.nx*0.38,gg.c[1]+gg.e.ny*0.38]; TEXT('OPENINGS',[m[0]+u[0]*0.065,m[1]+u[1]*0.065],0.08,openCode(it),Math.atan2(gg.e.uy,gg.e.ux)); TEXT('OPENINGS',[m[0]-u[0]*0.065,m[1]-u[1]*0.065],0.08,openSize(it,gg),Math.atan2(gg.e.uy,gg.e.ux)); }
      if(descOf(it)) TEXT('OPENINGS',[gg.c[0]+gg.e.nx*0.58,gg.c[1]+gg.e.ny*0.58],0.07,descOf(it),Math.atan2(gg.e.uy,gg.e.ux)); }
    if(it.t==='col'){ if(it.round) CIRC('COLUMNS',[it.x,it.y],it.w/2); else { const p=itemPts(it); PLINE('COLUMNS',p,true); LINE('COLUMNS',p[0],p[2]); LINE('COLUMNS',p[1],p[3]); } }
    if(it.t==='furn'){ const tw=toWorld(it); for(const p of furnPrims(it.k,it.w,it.h)){ if(p.l) LINE('FURNITURE',tw(p.l[0],p.l[1]),tw(p.l[2],p.l[3])); else if(p.pl) PLINE('FURNITURE',p.pl.map(q=>tw(q[0],q[1])),true); else if(p.ci) CIRC('FURNITURE',tw(p.ci[0],p.ci[1]),p.ci[2]); } }
    if(it.t==='label') TEXT('LABELS',[it.x,it.y],0.18,it.text||'',0);
    if(it.t==='stair'){ const sg=stairGeo(it); for(const q of sg.polys) PLINE('STAIRS',q,true); for(const r of sg.risers) LINE('STAIRS',r.a,r.b);
      if(sg.path.length>1){ PLINE('STAIRS',sg.path,false); const e=sg.path[sg.path.length-1], f2=sg.path[sg.path.length-2], an=Math.atan2(e[1]-f2[1],e[0]-f2[0]); for(const da of [-0.4,0.4]) LINE('STAIRS',e,[e[0]-0.18*Math.cos(an+da),e[1]-0.18*Math.sin(an+da)]);
        const a1=sg.path[1], an1=Math.atan2(a1[1]-sg.path[0][1],a1[0]-sg.path[0][0]); TEXT('STAIRS',[sg.path[0][0]+Math.cos(an1)*0.35,sg.path[0][1]+Math.sin(an1)*0.35],0.10,'ΑΝ',0);
        TEXT('STAIRS',[sg.path[0][0]-Math.cos(an1)*0.25,sg.path[0][1]-Math.sin(an1)*0.25],0.07,sg.N+' ρίχτια '+cm(sg.rh)+'/'+cm(it.tread||0.28),Math.atan2(Math.sin(an1+Math.PI/2),Math.cos(an1+Math.PI/2))); } }
    if(it.t==='chim'){ PLINE('CHIMNEY',boxPts(it),true); for(const p of chimPrims(it)) PLINE('CHIMNEY',p.pl.map(q=>toWorld(it)(q[0],q[1])),true); }
  }
  for(const gc of GHOST.chims){ const it=gc.it; PLINE('CHIMNEY',boxPts(it),true); for(const p of chimPrims(it)) PLINE('CHIMNEY',p.pl.map(q=>toWorld(it)(q[0],q[1])),true); }
  for(const st of GHOST.stairs) for(const q of stairGeo(st).polys) PLINE('STAIRS',q,true);
  if(typeof ktDXF==='function') ktDXF(PLINE,TEXT);
  // areas table next to the plan
  const hb=bbox(); let ty=hb[1], tx=(S.topo? Math.max(hb[2], ...S.topo.ents.flatMap(e=>e.pts.map(p=>p[0]))) : hb[2])+1.5;
  const row=(s,hgt)=>{ TEXT('LABELS',[tx,ty],hgt||0.15,s,0,'left'); ty+=(hgt||0.15)*2; };
  row(S.name+(S.floors.length>1?' · '+FL().name:''),0.22);
  for(const r of S.rooms) row(r.name+(useOf(r)!=='kyr'?' ('+USES[useOf(r)].toLowerCase()+')':'')+': '+fmt(OL[r.id]?OL[r.id].area:0)+' m²');
  const U=HOUSE.use; if(U.kyr>0) row('Κύριοι χώροι (καθαρό): '+fmt(U.kyr)+' m²'); if(U.voith>0) row('Βοηθητικοί χώροι (καθαρό): '+fmt(U.voith)+' m²');
  row('Καθαρό εμβαδόν κλειστών χώρων: '+fmt(HOUSE.net)+' m²'); row('Τοίχοι: '+fmt(HOUSE.footArea-HOUSE.net)+' m²'); row('Μικτό εμβαδόν: '+fmt(HOUSE.footArea)+' m²',0.18);
  if(typeof ktDXFRows==='function') ktDXFRows(row);
  if(HOUSE.footArea-HOUSE.footNI>0.005) row('Μικτό χωρίς εξωτερική θερμομόνωση: '+fmt(HOUSE.footNI)+' m²');
  if(U.imiy>0) row('Ημιυπαίθριοι: '+fmt(U.imiy)+' m²'); if(U.exo>0) row('Εξώστες: '+fmt(U.exo)+' m²');
  const usedC=[...new Set(WALLS.filter(w=>w.c).map(w=>w.c))]; if(usedC.length){ ty+=0.15; row('Κατασκευές τοίχων',0.15); for(const c of usedC) row(c.name+': '+consDesc(c),0.10); }
  if(WALLS.some(w=>w.ext&&!w.c)) row('Εξωτερικοί τοίχοι χωρίς κατασκευή: πάχος '+[...new Set(WALLS.filter(w=>w.ext&&!w.c).map(w=>cm(w.T)))].join(', ')+' εκ.',0.10);
  const ents=o.join('\n');
  const tpl=TPL.replace(/\$HANDSEED\n  5\n[0-9A-F]+/,'$HANDSEED\n  5\n'+H.toString(16).toUpperCase());
  return tpl.replace('ENTITIES\n  0\nENDSEC','ENTITIES\n'+ents+(ents?'\n':'')+'  0\nENDSEC').replace(/\n/g,'\r\n');
}
function crc32(u8){ let c,crc=0xFFFFFFFF; for(let i=0;i<u8.length;i++){ c=(crc^u8[i])&0xFF; for(let k=0;k<8;k++) c=c&1?(c>>>1)^0xEDB88320:c>>>1; crc=(crc>>>8)^c; } return (crc^0xFFFFFFFF)>>>0; }
function zip(name,u8){ const nm=new TextEncoder().encode(name), crc=crc32(u8), n=u8.length;
  const lh=new Uint8Array(30+nm.length), dv=new DataView(lh.buffer); dv.setUint32(0,0x04034b50,true); dv.setUint16(4,20,true); dv.setUint16(12,0x21,true); dv.setUint32(14,crc,true); dv.setUint32(18,n,true); dv.setUint32(22,n,true); dv.setUint16(26,nm.length,true); lh.set(nm,30);
  const ch=new Uint8Array(46+nm.length), dc=new DataView(ch.buffer); dc.setUint32(0,0x02014b50,true); dc.setUint16(4,20,true); dc.setUint16(6,20,true); dc.setUint16(14,0x21,true); dc.setUint32(16,crc,true); dc.setUint32(20,n,true); dc.setUint32(24,n,true); dc.setUint16(28,nm.length,true); ch.set(nm,46);
  const end=new Uint8Array(22), de=new DataView(end.buffer); de.setUint32(0,0x06054b50,true); de.setUint16(8,1,true); de.setUint16(10,1,true); de.setUint32(12,ch.length,true); de.setUint32(16,lh.length+n,true);
  const out=new Uint8Array(lh.length+n+ch.length+22); out.set(lh,0); out.set(u8,lh.length); out.set(ch,lh.length+n); out.set(end,lh.length+n+ch.length); return out; }
function fileBase(){ return slugGr((S.name||'katopsi')+(S.floors.length>1?' '+FL().name:'')); }
function slugGr(str){ const m={α:'a',β:'v',γ:'g',δ:'d',ε:'e',ζ:'z',η:'i',θ:'th',ι:'i',κ:'k',λ:'l',μ:'m',ν:'n',ξ:'x',ο:'o',π:'p',ρ:'r',σ:'s',ς:'s',τ:'t',υ:'y',φ:'f',χ:'ch',ψ:'ps',ω:'o',ά:'a',έ:'e',ή:'i',ί:'i',ό:'o',ύ:'y',ώ:'o',ϊ:'i',ϋ:'y',ΐ:'i',ΰ:'y'};
  const s=String(str).toLowerCase().split('').map(c=>m[c]!==undefined?m[c]:c).join('').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); return s||'katopsi'; }
window.__buildDXF=buildDXF;
$('bDxf').onclick=async()=>{
  const dxf=buildDXF(), base=fileBase();
  if(NB){ const c=pyCase(); try{ const r=JSON.parse(NB.writeFile(PYC.folder(c)+'/'+PYC.SUB.dxf,(S.floors.length>1?'katopsi_'+slugGr(FL().name)+'.dxf':'katopsi_oikia.dxf'),dxf,false)); toast(r.ok?'Σώθηκε: '+r.path:'Δεν σώθηκε: '+r.err); }catch(e){ toast('Δεν σώθηκε το DXF'); } return; }
  let dl=null; try{ if(window.claude&&window.claude.use) dl=await window.claude.use('downloads'); }catch(e){}
  if(dl){ try{ await dl.save({filename:base+'_dxf.zip',data:new Blob([zip(base+'.dxf',new TextEncoder().encode(dxf))],{type:'application/zip'})}); toast('Αποθηκεύτηκε το '+base+'_dxf.zip. Μέσα είναι το '+base+'.dxf'); return; }
    catch(e){ if(e&&e.code==='declined') return; } }
  $('dxfText').value=dxf; $('dxfBox').hidden=false; };
$('bCopy').onclick=()=>{ const t=$('dxfText'); const done=()=>toast('Αντιγράφηκε'); try{ navigator.clipboard.writeText(t.value).then(done,()=>{t.select();toast('Πάτα Ctrl+C');}); }catch(e){ t.select(); toast('Πάτα Ctrl+C'); } };
$('bCloseDxf').onclick=()=>{ $('dxfBox').hidden=true; };

// ---------- Pythagoras: έργο, μέτρηση με laser ----------
let pyT=null;
function pySaveFile(){ if(!NB) return; clearTimeout(pyT); pyT=setTimeout(()=>{ const c=pyCase(); if(!c) return; try{ NB.writeFile(PYC.folder(c)+'/'+PYC.SUB.data,'katopsi.json',JSON.stringify(Object.assign({},S,{topo:S.topo?{file:S.topo.file,X0:S.topo.X0,Y0:S.topo.Y0}:null})),false); }catch(e){} },1500); }
function pyLinked(roomId){ const c=pyCase(); return c? c.rooms.find(r=>r.kat===roomId)||null : null; }
function pyRoomBox(room){ const r=pyLinked(room.id);
  return `<div class="note ${r&&r.outline?'ok':''}" style="margin-top:12px">${r? (r.outline? `Μετρήθηκε με laser (${PYC.method(r)}) · Ε = ${fmt(r.area||0)} m²` : `Συνδεδεμένος με τη μέτρηση «${esc(r.name)}» (${PYC.method(r)}), που δεν έχει ακόμα κλειστό περίγραμμα.`) : 'Ο χώρος δεν έχει μετρηθεί ακόμα με laser.'}</div>
  <div class="actions"><button class="btn primary" id="rLaser">${r?'Άνοιξε τη μέτρηση':'Μέτρησε με laser'}</button></div>`; }
function pyGo(url){ save(); clearTimeout(pyT); pySaveNow(); location.href=url; }
function pySaveNow(){ if(!NB) return; const c=pyCase(); if(!c) return; try{ NB.writeFile(PYC.folder(c)+'/'+PYC.SUB.data,'katopsi.json',JSON.stringify(Object.assign({},S,{topo:S.topo?{file:S.topo.file,X0:S.topo.X0,Y0:S.topo.Y0}:null})),false); }catch(e){} }
function pyMeasure(room){ const r=pyLinked(room.id);
  if(r) return pyGo((r.app==='p1'?'p1.html':'r2p.html')+'?case='+encodeURIComponent(PYCASE)+'&room='+encodeURIComponent(r.id));
  pyGo('index.html?measure='+room.id+'&name='+encodeURIComponent(room.name)+'#'+PYCASE); }
// measured outline (DXF coords, y up) -> poly in this plan, near the draft and turned like it
function pyShapeFrom(outline, roomId){
  let pts=outline.map(p=>[p[0],-p[1]]); const c0=centroid(pts); pts=pts.map(p=>[r4(p[0]-c0[0]),r4(p[1]-c0[1])]); pts=cleanRing(pts); if(areaRing(pts)<0) pts.reverse();
  const old=roomItems(roomId).filter(isShape); let cx, cy, rot=0;
  if(old.length&&OL[roomId]&&OL[roomId].polys.length){ const b=bbox(roomId); cx=(b[0]+b[2])/2; cy=(b[1]+b[3])/2; const dw=b[2]-b[0], dh=b[3]-b[1]; let best=1e9;
    for(const a of [0,90,180,270]){ const q=pts.map(p=>rotP(p[0],p[1],a)); const xs=q.map(p=>p[0]), ys=q.map(p=>p[1]); const w=Math.max(...xs)-Math.min(...xs), hh=Math.max(...ys)-Math.min(...ys); const err=Math.abs(w-dw)+Math.abs(hh-dh)+a*1e-4; if(err<best){best=err;rot=a;} } }
  else { const hb=S.items.length?bbox():[0,0,0,0]; cx=S.items.length?hb[2]+S.ext*2+3:0; cy=S.items.length?(hb[1]+hb[3])/2:0; }
  return {pts,cx,cy,rot}; }
function pyApply(roomId, r){
  const f=pyShapeFrom(r.outline, roomId);
  S.items=S.items.filter(i=>!(i.room===roomId&&isShape(i)));
  S.items.push({id:S.next++,room:roomId,t:'poly',x:r4(f.cx),y:r4(f.cy),rot:f.rot,sub:false,pts:f.pts,src:{k:'laser',sig:pySig(r),file:r.name}});
  const room=roomById(roomId); room.laser=pySig(r); compute(); }
function pySig(r){ return JSON.stringify(r.outline).length+':'+fmt(r.area||0); }
function pySync(){ const c=pyCase(); if(!c) return; const done=[];
  for(const room of S.rooms){ const r=c.rooms.find(x=>x.kat===room.id); if(!r||!r.outline||r.outline.length<3) continue; 
    if(room.laser===pySig(r)) continue;
    if(!done.length) snap(); pyApply(room.id,r); done.push(room.name);
    const sd=roomSnapDelta(edgesCopy(room.id),0,0,room.id,0.35); snapMark=null; if(sd) for(const it of roomItems(room.id)){ it.x=r4(it.x+sd[0]); it.y=r4(it.y+sd[1]); } }
  if(done.length){ commit(); toast('Ήρθε από τη μέτρηση: '+done.join(', ')+'. Έλεγξε τη θέση και τις πόρτες.'); } }
function pyUnplaced(){ const c=pyCase(); if(!c) return ''; const ids=new Set(allRooms().map(r=>r.id)); const list=c.rooms.filter(r=>!(r.kat&&ids.has(r.kat)));
  if(!list.length) return ''; return `<div class="eyebrow" style="margin-top:12px">Μετρημένοι χώροι του έργου</div><div class="sides" style="margin:6px 0 10px">${list.map(r=>`<div class="note" style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span>${esc(r.name)} · ${PYC.method(r)}${r.area?' · '+fmt(r.area)+' m²':''}</span>${r.outline?`<button class="btn" data-place="${r.id}">Βάλε στην κάτοψη</button>`:'<span>χωρίς περίγραμμα</span>'}</div>`).join('')}</div>`; }
function pyPlace(rid){ const s=PYC.load(), c=s.cases.find(x=>x.id===PYCASE), r=c&&c.rooms.find(x=>x.id===rid); if(!r||!r.outline) return;
  snap(); const id=newRoomId(); S.rooms.push({id,name:r.name}); r.kat=id; PYC.save(s); compute(); pyApply(id,r); selRoom=id; commit(); fit(); toast('Μπήκε ο «'+r.name+'». Σύρε τον στη θέση του.'); }
function pyHeader(){ if(!PYCASE) return; const c=pyCase(); const b=document.createElement('button'); b.className='btn'; b.id='bBack'; b.textContent='← '+(c?PYC.label(c):'Έργο'); b.onclick=()=>window.PYBack();
  const hd=document.querySelector('header'); hd.insertBefore(b,hd.firstChild); const sm=document.querySelector('.brand small'); if(sm) sm.textContent='Pythagoras';
  window.PYBack=()=>{ pyGo('index.html#'+PYCASE); return 'ok'; };
  window.addEventListener('pageshow',e=>{ if(e.persisted){ pySync(); renderSide(); } });
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'){ pySync(); renderSide(); } else pySaveNow(); }); }

// ---------- start ----------
function start(){
  S=load(); cur=S.rooms[0].id; topoEdges(); $('planName').value=S.name; readColors(); compute(); pyHeader(); pySync(); markMode(); updUndo(); if(typeof wzStart==='function') wzStart(); renderSide();
  let fitted=false; try{ new ResizeObserver(()=>{ if(!fitted){ fitted=true; fit(); } else render(); }).observe(cv); }catch(e){ window.addEventListener('resize',()=>render()); requestAnimationFrame(()=>fit()); }
  try{ matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{readColors();render();}); }catch(e){}
  new MutationObserver(()=>{readColors();render();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>render());
}
start();
window.__S=()=>S; window.__api={setMode,loadTopo,loadRoomDXF,fit,w2s:W2S,doSplit,alignRoom,mergeRooms};
})();
