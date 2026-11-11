/* ───── 책상: 블록 쪼개기 · 지금 조각 · 주차장 ─────
   시간 블록(칸)을 민이 원하는 단위의 '조각'으로 나눠 적고, 지금 조각의 남은 시간을 보며 그것만 한다.
   - 조각: {m 분, t 무엇을, n 공부 사항·메모, d 했음, r 쉼}. 블록마다 시작 시각 s(분)에서 차례로 이어 붙인다.
     칸이 진행 중일 때 처음 나누면 s는 '지금'이다(남은 시간만 나눈다). 아니면 칸의 시작 시각.
   - 주차장: 공부 중 떠오른 딴생각을 한 줄 적고 돌아가는 곳(루틴의 '주차장 종이'를 화면 안으로).
   - 저장: JOURNEY.savePlan(날짜, {b:{칸id:{s,p:[조각]}}, park:[{t,d}]}) → 이 기기 + db(기기 간 이어짐).
     판정(1·2·3선, 모자·트램펄린)과는 무관하다. 같은 날을 두 기기에서 고치면 나중에 저장한 쪽이 남는다.
   - 이 파일은 map.js보다 먼저 온다(showInfo가 DESK.sync를 부른다). map.js의 것(state, sel, byId, selectedDate …)은
     부를 때만 쓰므로 순서가 맞다.
   - 초 단위로 바뀌는 것은 책상 안의 시계 글자뿐이다. 안내판은 분이 바뀔 때만 다시 쓴다(함정 8: 계속 도는 것 금지). */
const DESK=(()=>{
  const $=id=>document.getElementById(id);
  const ov=$("deskOv"), list=$("dkList"), parkList=$("dkParkList");
  let cur={date:null,plan:{b:{},park:[]}};   // 보고 있는 날의 작업본
  let dk=null;                                // 열린 책상 {date,id}
  let saveT=0, lastMin=-1, lastInfoH=0, prevPiece=null, audio=null, wake=null, clearArm=0, toastT=0;

  /* 시각 */
  const nowSec=()=>{ const d=new Date(Date.now()+9*36e5); return d.getUTCHours()*3600+d.getUTCMinutes()*60+d.getUTCSeconds(); };
  const win=b=>{ if(!b||!b.when) return null; const [s,e]=b.when(state.W); return e>s?[s,e]:null; };
  const nowFor=w=>{ let n=nowSec(); if(n+86400<w[1]*60) n+=86400; return n; };   // 자정을 넘는 칸(야영)
  const dur=m=>m>=60?Math.floor(m/60)+"시간"+(m%60?" "+(m%60)+"분":""):m+"분";
  const clock=s=>{ s=Math.max(0,Math.floor(s)); const h=Math.floor(s/3600), m=Math.floor(s%3600/60); return (h?h+":"+String(m).padStart(2,"0"):m)+":"+String(s%60).padStart(2,"0"); };
  const nameOf=x=>x.t||(x.r?"쉼":"(이름 없는 조각)");

  /* 자료 */
  function clean(p){
    const out={b:{},park:[]}, num=(v,d)=>Number.isFinite(+v)?+v:d;
    if(p&&p.b&&typeof p.b==="object") for(const [id,v] of Object.entries(p.b)){
      if(!v||!Array.isArray(v.p)||!v.p.length) continue;
      out.b[id]={s:Number.isFinite(v.s)?v.s:null,p:v.p.filter(x=>x&&typeof x==="object").map(x=>(
        {m:Math.max(1,Math.min(600,Math.round(num(x.m,25)))),t:String(x.t||"").slice(0,120),n:String(x.n||"").slice(0,2000),d:x.d?1:0,r:x.r?1:0}))};
    }
    if(p&&Array.isArray(p.park)) out.park=p.park.filter(x=>x&&typeof x==="object"&&x.t).map(x=>({t:String(x.t).slice(0,200),d:x.d?1:0}));
    return out;
  }
  function doSave(){ saveT=0; const {date,plan}=cur; if(!date) return;
    for(const id of Object.keys(plan.b)) if(!plan.b[id].p.length) delete plan.b[id];
    Promise.resolve(JOURNEY.savePlan(date,{b:plan.b,park:plan.park})).catch(e=>console.error(e)); }
  const dirty=()=>{ clearTimeout(saveT); saveT=setTimeout(doSave,700); };
  const flush=()=>{ if(saveT){ clearTimeout(saveT); doSave(); } };
  function load(date){ if(cur.date!==date){ flush(); cur={date,plan:clean(JOURNEY.plan(date))}; } return cur.plan; }
  const today=()=>cur.date===JOURNEY.todayKey();
  /* 칸의 조각을 시작 시각부터 이어 붙인 시간표 */
  function layout(b){
    const w=win(b), bp=cur.plan.b[b.id], p=bp?bp.p:[], s=bp&&bp.s!=null?bp.s:w[0];
    let t=s; const rows=p.map(x=>{ const r={t0:t,t1:t+x.m}; t+=x.m; return r; });
    return {w,s,p,rows,end:t,left:w[1]-t};
  }
  const active=L=>{ if(!today()) return -1; const n=nowFor(L.w); return L.rows.findIndex(r=>n>=r.t0*60&&n<r.t1*60); };
  /* 처음 나눌 때: 칸이 진행 중이면 지금부터, 아니면 칸 시작부터 */
  function ensure(b){
    let bp=cur.plan.b[b.id];
    if(!bp){ const w=win(b); let s=w[0]; if(today()){ const n=Math.floor(nowFor(w)/60); if(n>w[0]&&n<w[1]) s=n; } bp=cur.plan.b[b.id]={s,p:[]}; }
    return bp;
  }
  function stat(){ let n=0,k=0,m=0; for(const bp of Object.values(cur.plan.b)) for(const x of bp.p){ if(x.r) continue; n++; if(x.d){ k++; m+=x.m; } } return {n,k,m}; }

  /* ── 안내판의 작은 조각 목록 ── */
  /* 맨 위 '지금' 띠: 오늘, 진행 중인 칸이 있을 때. 지금 조각(없으면 칸)과 남은 시간, 책상 여는 단추 */
  function strip(){
    const el=$("nowStrip"), id=today()&&sceneMode==="day"?nowId():null, b=id&&byId(id), w=win(b);
    if(!w){ el.hidden=true; return; }
    const L=layout(b), a=active(L), n=nowFor(w);
    el.hidden=false; el.dataset.id=id;
    el.innerHTML=a>=0
      ?'<span class="ns-cap">지금 조각</span><span class="ns-what">'+esc(nameOf(L.p[a]))+'</span><span class="ns-left">'+Math.ceil((L.rows[a].t1*60-n)/60)+'분 남음</span><button type="button">책상 펴기</button>'
      :'<span class="ns-cap">지금 칸</span><span class="ns-what">'+esc(b.name)+'</span><span class="ns-left">끝까지 '+dur(Math.max(1,Math.ceil((w[1]*60-n)/60)))+'</span><button type="button">'+(L.p.length?"책상 펴기":"✂ 쪼개기")+'</button>';
  }
  $("nowStrip").addEventListener("click",e=>{ if(e.target.closest("button")) openDesk($("nowStrip").dataset.id); });
  function sync(){
    load(selectedDate()); strip(); mini();
    // 안내판·머리말 높이가 바뀌면 장소 표지가 그 밑에 깔리지 않게 다시 놓는다
    const hgt=$("info").offsetHeight+$("nowStrip").offsetHeight;
    if(hgt!==lastInfoH){ const first=!lastInfoH; lastInfoH=hgt; if(!first&&sceneMode==="day"){ buildOverlay(); decorate(); } }
  }
  function mini(){
    const sec=$("iDesk"), b=byId(sel), w=win(b);
    if(!w){ sec.hidden=true; sec.innerHTML=""; return; }
    sec.hidden=false;
    const L=layout(b), a=active(L), n=L.p.length, work=L.p.filter(x=>!x.r), park=cur.plan.park.filter(x=>!x.d).length;
    let h="";
    if(n){
      let from=a>=0?a:Math.max(0,L.p.findIndex(x=>!x.d)); from=Math.max(0,Math.min(from,n-3));
      h+='<ol class="dk-mini">'+L.p.slice(from,from+3).map((x,k)=>{ const i=from+k, r=L.rows[i];
        return '<li class="'+(i===a?"now ":"")+(x.d?"done ":"")+(x.r?"rest":"")+'"><label><input type="checkbox" data-i="'+i+'"'+(x.d?" checked":"")+' aria-label="'+esc(nameOf(x))+' 했음">'+
          '<span class="tm">'+hhmm(r.t0)+'</span><span class="tt">'+esc(nameOf(x))+'</span><span class="mm">'+(i===a?Math.ceil((r.t1*60-nowFor(w))/60)+"분 남음":x.m+"분")+'</span></label></li>'; }).join("")+'</ol>';
    }
    const bits=[]; if(n) bits.push("조각 "+work.filter(x=>x.d).length+"/"+work.length+(n>3?" · 전체 "+n+"개":"")); if(park) bits.push("주차장 "+park);
    h+='<div class="dk-mini-foot"><button type="button" class="dk-open">'+(n?"책상 펴기 · 집중":"✂ 블록 쪼개기")+'</button><span>'+(bits.join(" · ")||"이 칸을 내 단위로 나눠 적는다")+'</span></div>';
    sec.innerHTML=h;
  }
  $("iDesk").addEventListener("click",e=>{ if(e.target.closest(".dk-open")) openDesk(sel); });
  $("iDesk").addEventListener("change",e=>{ const box=e.target.closest("input[data-i]"); if(!box) return;
    const bp=cur.plan.b[sel]; if(!bp||!bp.p[+box.dataset.i]) return; bp.p[+box.dataset.i].d=box.checked?1:0; dirty(); sync(); decorate(); });

  /* ── 책상(집중 화면) ── */
  const block=()=>byId(dk.id);
  function rowHTML(x,i){
    return '<li class="dk-row'+(x.d?" done":"")+(x.r?" rest":"")+'" data-i="'+i+'">'+
      '<span class="dk-time"></span>'+
      '<label class="dk-minw"><input class="dk-min" type="number" inputmode="numeric" min="1" max="600" step="5" value="'+x.m+'" aria-label="'+(i+1)+'번 조각 길이(분)"><span>분</span></label>'+
      '<input class="dk-title" type="text" maxlength="120" value="'+esc(x.t)+'" placeholder="'+(x.r?"쉼":"무엇을 할까 (예: 미적 3.2 예제 4~9)")+'" aria-label="'+(i+1)+'번 조각 할 일">'+
      '<span class="dk-tools"><label class="dk-chk" title="했음"><input type="checkbox"'+(x.d?" checked":"")+' aria-label="'+(i+1)+'번 조각 했음"><i aria-hidden="true">✓</i></label>'+
      '<button type="button" data-act="split" title="반으로 쪼개기" aria-label="'+(i+1)+'번 조각을 반으로 쪼개기">÷</button>'+
      '<button type="button" data-act="up" title="위로" aria-label="'+(i+1)+'번 조각을 위로"'+(i?"":" disabled")+'>↑</button>'+
      '<button type="button" data-act="del" title="지우기" aria-label="'+(i+1)+'번 조각 지우기">×</button></span>'+
      '<textarea class="dk-note" rows="1" maxlength="2000" placeholder="공부 사항 · 메모 (쪽수, 막힌 곳, 다음에 이어갈 곳)" aria-label="'+(i+1)+'번 조각 메모">'+esc(x.n)+'</textarea></li>';
  }
  const grow=ta=>{ ta.style.height="auto"; ta.style.height=Math.min(ta.scrollHeight+2,220)+"px"; };
  function renderList(focus){
    const bp=cur.plan.b[dk.id], p=bp?bp.p:[];
    list.innerHTML=p.map(rowHTML).join("")||'<li class="dk-empty">아직 조각이 없다. 아래 단추로 남은 시간을 나누거나 조각을 하나씩 더한다.</li>';
    list.querySelectorAll(".dk-note").forEach(grow);
    if(focus!=null) list.children[focus]?.querySelector(".dk-title")?.focus({preventScroll:false});
    paint();
  }
  function renderPark(){
    const pk=cur.plan.park;
    parkList.innerHTML=pk.map((x,i)=>'<li class="'+(x.d?"done":"")+'"><label><input type="checkbox" data-i="'+i+'"'+(x.d?" checked":"")+'><span>'+esc(x.t)+'</span></label><button type="button" data-del="'+i+'" aria-label="'+esc(x.t)+' 지우기">×</button></li>').join("");
    $("dkParkHint").hidden=pk.length>0;
  }
  /* 글자만 바꾼다(목록을 다시 만들지 않는다): 시각 표, 남은 시간, 지금 조각 */
  const put=(el,t)=>{ if(el.textContent!==t) el.textContent=t; };   // 같은 글자는 다시 쓰지 않는다(초마다 불린다)
  function paint(){
    if(!dk) return;
    const b=block(), L=layout(b), a=active(L), isT=today(), n=isT?nowFor(L.w):0, st=stat();
    [...list.children].forEach((li,i)=>{ const r=L.rows[i]; if(!r) return;
      put(li.querySelector(".dk-time"),hhmm(r.t0)+"–"+hhmm(r.t1));
      li.classList.toggle("now",i===a); li.classList.toggle("over",r.t1>L.w[1]); });
    const left=$("dkLeft"); left.classList.toggle("over",L.left<0);
    put(left,!L.p.length?"칸 "+dur(L.w[1]-L.w[0]):L.left>0?"남은 시간 "+dur(L.left):L.left===0?"칸에 딱 맞음":dur(-L.left)+" 넘침");
    const startEl=$("dkStart"); if(document.activeElement!==startEl) startEl.value=hhmm(L.s);
    document.querySelectorAll("#dkQuick [data-q^='n'],#dkQuick [data-q='50'],#dkQuick [data-q='25']").forEach(q=>q.disabled=(L.p.length?L.left:L.w[1]-freshStart(b))<10);
    put($("dkMeta"),DAY_NAMES[dayIdx]+"요일 · "+hhmm(L.w[0])+" – "+hhmm(L.w[1])+(st.n?" · 오늘 조각 "+st.k+"/"+st.n+(st.m?" · 한 시간 "+dur(st.m):""):""));
    // 지금 조각
    const cap=$("dkCap"), curEl=$("dkCur"), clk=$("dkClock"), bar=$("dkBar"), nx=$("dkNext"), warn=$("dkWarn");
    let frac=0, canDone=false; warn.hidden=true;
    if(!L.p.length){ cap.textContent=isT?"이 칸":"계획"; curEl.textContent="이 칸을 내 단위로 나눠 보자"; clk.textContent=dur(L.w[1]-L.w[0]); nx.textContent="조각마다 할 일을 한 줄씩 적으면, 그 조각 동안은 그것만 한다."; }
    else if(!isT){ cap.textContent="계획"; curEl.textContent=DAY_NAMES[dayIdx]+"요일 계획을 세우는 중"; clk.textContent=dur(L.end-L.s); nx.textContent="그날이 되면 여기에 지금 조각과 남은 시간이 나온다."; }
    else if(a>=0){ const r=L.rows[a], x=L.p[a]; cap.textContent=x.r?"지금 · 쉼":"지금"; curEl.textContent=nameOf(x);
      clk.textContent=clock(r.t1*60-n); frac=(n-r.t0*60)/((r.t1-r.t0)*60); canDone=true;
      const y=L.p[a+1]; nx.textContent=y?"다음 · "+hhmm(L.rows[a+1].t0)+" "+nameOf(y)+" "+y.m+"분":"마지막 조각이다. 끝나면 칸 끝까지 "+dur(Math.max(0,L.w[1]-r.t1))+" 남는다.";
      const late=L.p.slice(0,a).filter(q=>!q.d&&!q.r).length; if(late){ warn.hidden=false; warn.textContent="앞 조각 "+late+"개가 아직 안 끝났다. 밀렸으면 '지금부터 다시 맞추기'."; } }
    else if(n<L.s*60){ cap.textContent="곧 시작"; curEl.textContent=nameOf(L.p[0]); clk.textContent=clock(L.s*60-n); nx.textContent=hhmm(L.s)+"에 첫 조각이 시작된다."; }
    else { const undone=L.p.filter(q=>!q.d&&!q.r).length; cap.textContent="조각 끝"; curEl.textContent=undone?"못 끝낸 조각 "+undone+"개":"이 칸의 조각을 다 했다";
      clk.textContent=n<L.w[1]*60?clock(L.w[1]*60-n):"0:00"; nx.textContent=n<L.w[1]*60?"칸 끝까지 남은 시간이다. 조각을 더하거나 '지금부터 다시 맞추기'.":"칸이 끝났다. 다음 칸으로."; canDone=undone>0; }
    bar.style.transform="scaleX("+Math.max(0,Math.min(1,frac)).toFixed(4)+")";
    $("dkDone").disabled=!canDone; $("dkPlus5").disabled=a<0; $("dkResync").disabled=!isT||!L.p.some(q=>!q.d);
    const title=isT&&a>=0?clock(L.rows[a].t1*60-n)+" · "+nameOf(L.p[a])+" · 오이포리온":"오이포리온"; if(document.title!==title) document.title=title;
  }
  const freshStart=b=>{ const w=win(b); if(today()){ const n=Math.floor(nowFor(w)/60); if(n>w[0]&&n<w[1]) return n; } return w[0]; };

  function openDesk(id){
    const b=byId(id); if(!win(b)) return;
    load(selectedDate()); dk={date:cur.date,id}; clearArm=0;
    $("dkTitle").textContent=b.name; $("dkChime").checked=store.get("oi.chime")!=="0";
    ov.hidden=false; ov.scrollTop=0; renderList(); renderPark(); prime(); lockScreen();
    $("dkClose").focus({preventScroll:true});
  }
  function closeDesk(){
    if(!dk) return; flush(); dk=null; ov.hidden=true; unlock(); document.title="오이포리온";
    sync(); decorate(); document.querySelector("#iDesk .dk-open")?.focus({preventScroll:true});
  }
  $("dkClose").addEventListener("click",closeDesk);
  ov.addEventListener("click",e=>{ if(e.target===ov) closeDesk(); });
  document.addEventListener("keydown",e=>{ if(dk&&e.key==="Escape") closeDesk(); });

  /* 조각 고치기: 타자 중에는 목록을 다시 만들지 않는다 */
  list.addEventListener("input",e=>{
    const li=e.target.closest(".dk-row"); if(!li) return; const x=cur.plan.b[dk.id].p[+li.dataset.i]; if(!x) return;
    if(e.target.classList.contains("dk-min")){ const v=Math.round(+e.target.value); if(Number.isFinite(v)&&v>=1) x.m=Math.min(600,v); }
    else if(e.target.classList.contains("dk-title")) x.t=e.target.value;
    else if(e.target.classList.contains("dk-note")){ x.n=e.target.value; grow(e.target); }
    else return;
    dirty(); paint();
  });
  list.addEventListener("change",e=>{
    const li=e.target.closest(".dk-row"); if(!li||e.target.type!=="checkbox") return;
    cur.plan.b[dk.id].p[+li.dataset.i].d=e.target.checked?1:0; li.classList.toggle("done",e.target.checked); dirty(); paint();
  });
  list.addEventListener("click",e=>{
    const btn=e.target.closest("[data-act]"), li=btn&&btn.closest(".dk-row"); if(!li) return;
    const p=cur.plan.b[dk.id].p, i=+li.dataset.i, x=p[i]; let focus=null;
    if(btn.dataset.act==="split"){ if(x.m<2) return; const a=x.m>=10?Math.max(5,Math.round(x.m/10)*5):Math.ceil(x.m/2); p.splice(i,1,{...x,m:a},{...x,m:x.m-a,n:"",d:0}); focus=i+1; }
    else if(btn.dataset.act==="up"){ if(!i) return; [p[i-1],p[i]]=[p[i],p[i-1]]; focus=i-1; }
    else if(btn.dataset.act==="del"){ p.splice(i,1); if(!p.length) delete cur.plan.b[dk.id]; }
    dirty(); renderList(focus);
  });
  $("dkStart").addEventListener("input",e=>{ const v=toMin(e.target.value); if(v==null) return; const b=block(), w=win(b);
    ensure(b).s=w[1]>1440&&v<w[0]-720?v+1440:v; dirty(); paint(); });
  /* 빠르게 나누기: 남은 시간을 채운다 */
  $("dkQuick").addEventListener("click",e=>{
    const q=e.target.closest("[data-q]"); if(!q) return; const b=block(), kind=q.dataset.q;
    if(kind==="clear"){ if(clearArm&&Date.now()-clearArm<4000){ delete cur.plan.b[dk.id]; clearArm=0; q.textContent="전부 지우기"; dirty(); renderList(); }
      else { clearArm=Date.now(); q.textContent="정말 지울까? 한 번 더"; setTimeout(()=>{ if(clearArm&&Date.now()-clearArm>=3900){ clearArm=0; q.textContent="전부 지우기"; } },4000); } return; }
    const bp=ensure(b), L=layout(b), at0=bp.p.length; let left=L.left;
    const push=(m,r)=>bp.p.push({m,t:r?"쉼":"",n:"",d:0,r:r?1:0});
    if(kind==="add") push(left>=5&&left<25?left:25);
    else if(kind==="rest") push(10,1);
    else if(/^n\d$/.test(kind)){ const k=+kind[1]; if(left<10) return; const base=Math.max(5,Math.floor(left/k/5)*5); for(let i=0;i<k-1;i++) push(base); push(Math.max(1,left-base*(k-1))); }
    else { const work=+kind, rest=work>=50?10:5, tail=work>=50?15:10; if(left<10) return;   // 공부 work분 + 쉼 rest분을 되풀이
      while(left>=10){ let m=Math.min(work,left); if(left-m>0&&left-m<tail) m=left; push(m); left-=m; if(left>=rest+tail){ push(rest,1); left-=rest; } } }
    dirty(); renderList(at0<bp.p.length?at0:null);
  });
  /* 지금 조각 단추 */
  $("dkDone").addEventListener("click",()=>{
    const b=block(), L=layout(b), a=active(L), p=L.p;
    if(a>=0){ const x=p[a]; x.d=1;   // 일찍 끝냈으면 실제 걸린 시간으로 줄여, 다음 조각이 지금 시작되게 한다
      const el=Math.max(1,Math.ceil((nowFor(L.w)-L.rows[a].t0*60)/60)); if(el<x.m) x.m=el; }
    else { const x=p.find(q=>!q.d&&!q.r); if(x) x.d=1; }
    dirty(); renderList();
  });
  $("dkPlus5").addEventListener("click",()=>{ const b=block(), L=layout(b), a=active(L); if(a<0) return; L.p[a].m+=5; dirty(); renderList(); });
  $("dkResync").addEventListener("click",()=>{   // 아직 안 한 첫 조각이 지금 시작되게 시작 시각을 민다
    const b=block(), L=layout(b), k=L.p.findIndex(q=>!q.d); if(k<0||!today()) return;
    cur.plan.b[dk.id].s=Math.floor(nowFor(L.w)/60)-L.p.slice(0,k).reduce((s,q)=>s+q.m,0); dirty(); paint();
  });
  $("dkChime").addEventListener("change",e=>{ store.set("oi.chime",e.target.checked?"1":"0"); if(e.target.checked){ prime(); beep(); } });
  /* 주차장 */
  $("dkParkForm").addEventListener("submit",e=>{ e.preventDefault(); const inp=$("dkParkIn"), t=inp.value.trim(); if(!t) return;
    cur.plan.park.push({t:t.slice(0,200),d:0}); inp.value=""; dirty(); renderPark(); inp.focus(); });
  parkList.addEventListener("change",e=>{ const box=e.target.closest("input[data-i]"); if(!box) return; cur.plan.park[+box.dataset.i].d=box.checked?1:0; dirty(); renderPark(); });
  parkList.addEventListener("click",e=>{ const del=e.target.closest("[data-del]"); if(!del) return; cur.plan.park.splice(+del.dataset.del,1); dirty(); renderPark(); });

  /* 조각이 끝날 때 알림: 소리 두 음과 책상 안 한 줄. 화면을 보고 있지 않아도 들린다 */
  function prime(){ try{ audio=audio||new (window.AudioContext||window.webkitAudioContext)(); if(audio.state==="suspended") audio.resume(); }catch(e){} }
  function beep(){ if(!audio) return; try{ const t=audio.currentTime;
    [[660,0],[880,.2]].forEach(([f,d])=>{ const o=audio.createOscillator(), g=audio.createGain(); o.type="sine"; o.frequency.value=f;
      g.gain.setValueAtTime(.0001,t+d); g.gain.exponentialRampToValueAtTime(.2,t+d+.02); g.gain.exponentialRampToValueAtTime(.0001,t+d+.55);
      o.connect(g); g.connect(audio.destination); o.start(t+d); o.stop(t+d+.6); }); }catch(e){} }
  function nowPiece(){
    if(!today()) return null;
    for(const id of Object.keys(cur.plan.b)){ const b=byId(id), w=win(b); if(!w) continue; const L=layout(b), a=active(L);
      if(a>=0) return {key:id+"|"+a+"|"+L.rows[a].t1,t1:L.rows[a].t1,w,name:nameOf(L.p[a])}; }
    return null;
  }
  function tick(){
    if(cur.date==null) return;
    const np=nowPiece();
    if(prevPiece&&(!np||np.key!==prevPiece.key)){ const n=nowFor(prevPiece.w);   // 시간이 흘러 끝난 것만(고쳐서 바뀐 것은 아님)
      if(n>=prevPiece.t1*60&&n<prevPiece.t1*60+90){ if(store.get("oi.chime")!=="0") beep();
        const t=$("dkToast"); t.textContent="조각 끝: "+prevPiece.name+(np?" → 다음: "+np.name:""); t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>{ t.hidden=true; },20000); } }
    prevPiece=np;
    if(dk) paint();
    else { const m=Math.floor(nowSec()/60); if(m!==lastMin){ lastMin=m; if(!walking) sync(); } }
  }
  setInterval(tick,1000);
  /* 책상을 편 동안에는 화면이 꺼지지 않게(되는 기기에서만) */
  async function lockScreen(){ try{ if(navigator.wakeLock&&!wake) wake=await navigator.wakeLock.request("screen"); }catch(e){ wake=null; } }
  function unlock(){ try{ if(wake) wake.release(); }catch(e){} wake=null; }
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){ flush(); return; }
    if(dk){ wake=null; lockScreen(); return; }
    // 다른 기기에서 고친 계획 받기(이 기기에서 고치는 중이 아닐 때만)
    const date=cur.date; if(!date||saveT) return;
    Promise.resolve(JOURNEY.refreshPlan(date)).then(ch=>{ if(ch&&!dk&&!saveT&&cur.date===date){ cur.date=null; sync(); decorate(); } }).catch(()=>{});
  });
  window.addEventListener("pagehide",flush);
  JOURNEY.onChange(()=>{ if(!saveT&&!dk) cur.date=null; });   // db에서 계획이 새로 왔을 수 있다. 다음 sync가 다시 읽는다

  return {
    sync,
    open:openDesk,
    /* 칸의 조각(쉼 빼고)을 다 했는가: 일정 카드의 ✓ */
    allDone(id){ load(selectedDate()); const bp=cur.plan.b[id]; if(!bp) return false; const work=bp.p.filter(x=>!x.r); return work.length>0&&work.every(x=>x.d); },
  };
})();
