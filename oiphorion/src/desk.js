/* ───── 책상: 블록 쪼개기 · 지금 조각 · 주차장 ─────
   시간 블록(칸)을 민이 원하는 단위의 '조각'으로 나눠 적고, 지금 조각의 남은 시간을 보며 그것만 한다.
   - 조각: {m 분, t 무엇을, n 공부 사항·메모, d 했음, r 쉼}. 블록마다 시작 시각 s(분)에서 차례로 이어 붙인다.
     칸이 진행 중일 때 처음 나누면 s는 '지금'이다(남은 시간만 나눈다). 아니면 칸의 시작 시각.
   - 주차장: 공부 중 떠오른 딴생각을 한 줄 적고 돌아가는 곳(루틴의 '주차장 종이'를 화면 안으로).
   - 저장: JOURNEY.savePlan(날짜, {b:{칸id:{s,p:[조각]}}, park:[{t,d}]}) → 이 기기 + db(기기 간 이어짐).
     판정(1·2·3선, 모자·트램펄린)과는 무관하다. 같은 날을 두 기기에서 고치면 나중에 저장한 쪽이 남는다.
   - 이 파일은 map.js보다 먼저 온다(showInfo가 DESK.sync를 부른다). map.js의 것(state, sel, byId, selectedDate …)은
     부를 때만 쓰므로 순서가 맞다.
   - 초 단위로 바뀌는 것은 책상 안의 시계 글자뿐이다. 안내판은 분이 바뀔 때만 다시 쓴다(함정 8: 계속 도는 것 금지).
   - 멈춤과 판정(민이 준 「Nov 16th」 정제본, 2026-11-16): '끝'을 셋으로 나눈다.
     ① 오늘 앉을 시각이 끝나는 것은 시각으로: 조각 시간이 다 되면 "정해 둔 시각이다. 여기서 멈춘다." 늘리는 단추(+5분)는 없다.
     ② 조각이 쓸 만한지는 기능으로: 다음 날 아침 파일을 열기 전에 세 가지(제 기능 · 독립 · 들어갈 자리)를 판정. 셋 다 예여야 '쓸 수 있는 조각'.
     ③ 전체의 방향은 따로: 채석장의 '다시 볼 날'(quarry.js).
     조각이 끝나면 마침 기록: 부담 0~10, 다음에 열 파일과 첫 행동 한 줄, 수면·본업 침범. 부담이 두 번 연속 8 이상이거나
     침범이 일주일에 두 번이면 쉬어 가라고 알린다(꾸짖지 않는다). 조각 필드: f 기록함 · b 부담(-1 없음) · nx 첫 행동 · sl 침범 ·
     j 판정("110" 꼴, 빈 문자열이면 아직) · pl 들어간 자리 · x 실험 회차(-1 아님) · ph 실험 단계 */
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
  const nameOf=x=>x.t||(x.r?"쉼":"이름 없는 조각");
  const round5=m=>Math.round(m/5)*5;   // 시각은 5분 단위로 맞춘다(19:52보다 19:50이 한눈에 읽힌다)

  /* 자료 */
  function clean(p){
    const out={b:{},park:[]}, num=(v,d)=>Number.isFinite(+v)?+v:d;
    if(p&&p.b&&typeof p.b==="object") for(const [id,v] of Object.entries(p.b)){
      if(!v||!Array.isArray(v.p)||!v.p.length) continue;
      out.b[id]={s:Number.isFinite(v.s)?v.s:null,p:v.p.filter(x=>x&&typeof x==="object").map(x=>(
        {m:Math.max(1,Math.min(600,Math.round(num(x.m,25)))),t:String(x.t||"").slice(0,120),n:String(x.n||"").slice(0,2000),d:x.d?1:0,r:x.r?1:0,c:x.c?1:0,   // c: 이번 주 덩이 조각(quarry.js)
         f:x.f?1:0,b:Number.isInteger(x.b)&&x.b>=0&&x.b<=10?x.b:-1,nx:String(x.nx||"").slice(0,160),sl:x.sl?1:0,j:/^[01]{3}$/.test(x.j||"")?x.j:"",pl:String(x.pl||"").slice(0,80),
         x:Number.isInteger(x.x)&&x.x>=0?x.x:-1,ph:String(x.ph||"").slice(0,8)}))};
    }
    if(p&&Array.isArray(p.park)) out.park=p.park.filter(x=>x&&typeof x==="object"&&x.t).map(x=>({t:String(x.t).slice(0,200),d:x.d?1:0}));
    return out;
  }
  function doSave(){ saveT=0; const {date,plan}=cur; if(!date) return;
    for(const id of Object.keys(plan.b)) if(!plan.b[id].p.length) delete plan.b[id];
    Promise.resolve(JOURNEY.savePlan(date,{b:plan.b,park:plan.park})).catch(e=>console.error(e));
    QUARRY.sync(); if(dk) cutLine(); }   // 덩이의 진행은 저장된 계획에서 센다
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
    if(!bp){ const w=win(b); let s=w[0]; if(today()){ const n=round5(nowFor(w)/60); if(n>w[0]&&n<w[1]) s=n; } bp=cur.plan.b[b.id]={s,p:[]}; }
    return bp;
  }
  /* 다른 날의 계획 고치기(어제 조각 판정). 보고 있는 날이면 작업본을 고친다 */
  function editPlan(date,fn){
    if(date===cur.date){ fn(cur.plan); dirty(); flush(); return; }
    const p=clean(JOURNEY.plan(date)); fn(p); Promise.resolve(JOURNEY.savePlan(date,{b:p.b,park:p.park})).catch(e=>console.error(e));
  }
  /* 읽어 둔 날들(지난 7일~이번 주)의 공부 조각을 시간 순서로: 부담 흐름 · 지난번 첫 행동 · 판정할 조각 */
  function history(){
    const out=[], t=JOURNEY.todayKey();
    for(let i=-8;i<=0;i++){ const date=new Date(Date.parse(t+"T00:00:00Z")+i*864e5).toISOString().slice(0,10);
      const plan=date===cur.date?cur.plan:clean(JOURNEY.plan(date));
      for(const [id,bp] of Object.entries(plan.b)){ let t0=bp.s??0; bp.p.forEach((x,k)=>{ if(!x.r) out.push({date,id,i:k,x,t0,t1:t0+x.m}); t0+=x.m; }); } }
    return out.sort((a,b)=>a.date.localeCompare(b.date)||a.t0-b.t0);
  }
  /* 쉬어 가라는 알림(실험 기록도 함께 센다) */
  function restWarn(){
    const h=history().filter(e=>e.x.f), ex=(typeof EXPER!=="undefined"?EXPER.records():[]);
    const seq=[...h.filter(e=>e.x.b>=0).map(e=>({k:e.date+String(e.t1).padStart(5,"0"),b:e.x.b})),...ex.filter(r=>r.burden>=0).map(r=>({k:r.date+"99999",b:r.burden}))].sort((a,b)=>a.k.localeCompare(b.k));
    const week=new Date(Date.parse(JOURNEY.todayKey()+"T00:00:00Z")-6*864e5).toISOString().slice(0,10);
    const intr=h.filter(e=>e.x.sl&&e.date>=week).length+ex.filter(r=>r.sleep&&r.date>=week).length;
    const msg=[]; if(seq.length>=2&&seq[seq.length-1].b>=8&&seq[seq.length-2].b>=8) msg.push("부담이 두 번 연속 8 이상이다. 다음 회차를 줄이거나 하루 쉬어 간다.");
    if(intr>=2) msg.push("이번 주에 수면이나 본업을 "+intr+"번 침범했다. 앉는 횟수를 줄인다.");
    return msg.join(" ");
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
        return '<li class="'+(i===a?"now ":"")+(x.d?"done ":"")+(x.c?"cut ":"")+(x.r?"rest":"")+'"><label><input type="checkbox" data-i="'+i+'"'+(x.d?" checked":"")+' aria-label="'+esc(nameOf(x))+' 했음">'+
          '<span class="tm">'+hhmm(r.t0)+'</span><span class="tt">'+esc(nameOf(x))+'</span><span class="mm">'+(i===a?Math.ceil((r.t1*60-nowFor(w))/60)+"분 남음":x.m+"분")+'</span></label></li>'; }).join("")+'</ol>';
    }
    const bits=[]; if(n) bits.push("조각 "+work.filter(x=>x.d).length+"/"+work.length+(n>3?" · 전체 "+n+"개":"")); if(park) bits.push("주차장 "+park);
    const jn=toJudge().length; if(jn&&isToday()) bits.unshift("어제 조각 판정 "+jn+"개");
    h+='<div class="dk-mini-foot"><button type="button" class="dk-open">'+(n?"책상 펴기 · 집중":"✂ 블록 쪼개기")+'</button><span>'+(bits.join(" · ")||"이 칸을 내 단위로 나눠 적는다")+'</span></div>';
    sec.innerHTML=h;
  }
  $("iDesk").addEventListener("click",e=>{ if(e.target.closest(".dk-open")) openDesk(sel); });
  $("iDesk").addEventListener("change",e=>{ const box=e.target.closest("input[data-i]"); if(!box) return;
    const bp=cur.plan.b[sel]; if(!bp||!bp.p[+box.dataset.i]) return; bp.p[+box.dataset.i].d=box.checked?1:0; dirty(); sync(); decorate(); });

  /* ── 책상(집중 화면) ── */
  const block=()=>byId(dk.id);
  /* 한 줄 = 평소엔 시간표처럼 읽히는 요약(했음 · 시작 시각 · 할 일 · 길이). 누른 줄만 고치는 칸이 펼쳐진다(한 번에 하나).
     입력칸·단추를 줄마다 늘어놓으면 표가 아니라 양식으로 보여 한눈에 안 읽힌다(민 피드백 2026-11-11). */
  let openRow=-1;
  function rowHTML(x,i){
    const open=i===openRow, n=i+1;
    return '<li class="dk-row'+(x.d?" done":"")+(x.r?" rest":"")+(x.c?" cut":"")+(open?" open":"")+'" data-i="'+i+'">'+
      '<label class="dk-chk"><input type="checkbox"'+(x.d?" checked":"")+' aria-label="'+n+'번 조각 했음"><i aria-hidden="true">✓</i></label>'+
      '<button type="button" class="dk-sum" aria-expanded="'+open+'"><span class="dk-time"></span><span class="dk-what"><span class="dk-name"></span><span class="dk-memo"></span></span><span class="dk-len"></span></button>'+
      (open?'<div class="dk-edit">'+
        '<div class="dk-edit-top"><input class="dk-title" type="text" maxlength="120" value="'+esc(x.t)+'" placeholder="'+(x.r?"쉼":"무엇을 할까")+'" aria-label="'+n+'번 조각 할 일" enterkeyhint="next">'+
        '<label class="dk-minw"><input class="dk-min" type="number" inputmode="numeric" min="1" max="600" step="5" value="'+x.m+'" aria-label="'+n+'번 조각 길이(분)"><span>분</span></label></div>'+
        '<textarea class="dk-note" rows="1" maxlength="2000" placeholder="메모 (쪽수, 막힌 곳, 다음에 이어갈 곳)" aria-label="'+n+'번 조각 메모">'+esc(x.n)+'</textarea>'+
        (dkCut||x.c?'<label class="dk-cuttog"><input type="checkbox" data-cut="1"'+(x.c?" checked":"")+'> 이번 주 덩이 조각'+(dkCut?' <small>'+esc(dkCut.t)+'</small>':"")+'</label>':"")+
        '<div class="dk-tools"><button type="button" data-act="split">반으로 쪼개기</button><button type="button" data-act="up"'+(i?"":" disabled")+'>위로</button>'+
        '<button type="button" data-act="del">지우기</button><button type="button" data-act="close" class="dk-ok">됐음</button></div></div>':"")+
      '</li>';
  }
  const grow=ta=>{ ta.style.height="auto"; ta.style.height=Math.min(ta.scrollHeight+2,220)+"px"; };
  /* open: 펼칠 줄(없으면 다 접는다). 펼친 줄의 할 일 칸에 커서를 둔다 */
  /* 이번 주에 열린 덩이가 있으면 책상에서 조각에 '덩이 조각' 표시를 할 수 있다. 진행 한 줄과 '+ 덩이 조각' 단추 */
  let dkCut=null;
  function cutLine(){
    dkCut=QUARRY.openCutFor(dk.date);
    $("dkAddCut").hidden=!dkCut; const el=$("dkCutLine"); el.hidden=!dkCut; if(!dkCut) return;
    const over=dkCut.n>dkCut.est; el.classList.toggle("over",over);
    put(el,"◆ 이번 주 덩이 · "+dkCut.t+" · 조각 "+dkCut.k+"/"+dkCut.est+(over?" · 세 번 앉을 크기를 넘는다. 늘리지 말고 더 자른다.":""));
  }
  function renderList(open){
    const bp=cur.plan.b[dk.id], p=bp?bp.p:[]; cutLine(); renderJudge();
    openRow=open!=null&&open>=0&&open<p.length?open:-1;
    list.innerHTML=p.map(rowHTML).join(""); list.hidden=!p.length;
    list.querySelectorAll(".dk-note").forEach(grow);
    paint();
    if(openRow>=0){ const li=list.children[openRow]; li.querySelector(".dk-title").focus({preventScroll:true}); li.scrollIntoView({block:"nearest"}); }
  }
  function renderPark(){
    const pk=cur.plan.park;
    parkList.innerHTML=pk.map((x,i)=>'<li class="'+(x.d?"done":"")+'"><label><input type="checkbox" data-i="'+i+'"'+(x.d?" checked":"")+'><span>'+esc(x.t)+'</span></label><button type="button" data-del="'+i+'" aria-label="'+esc(x.t)+' 지우기">×</button></li>').join("");
  }
  /* 글자만 바꾼다(목록을 다시 만들지 않는다): 시각 표, 남은 시간, 지금 조각 */
  const put=(el,t)=>{ if(el.textContent!==t) el.textContent=t; };   // 같은 글자는 다시 쓰지 않는다(초마다 불린다)
  function paint(){
    if(!dk) return;
    const b=block(), L=layout(b), a=active(L), isT=today(), n=isT?nowFor(L.w):0, st=stat();
    [...list.children].forEach((li,i)=>{ const r=L.rows[i], x=L.p[i]; if(!r) return;
      put(li.querySelector(".dk-time"),hhmm(r.t0));
      const nm=li.querySelector(".dk-name"); put(nm,nameOf(x)); nm.classList.toggle("blank",!x.t&&!x.r);
      put(li.querySelector(".dk-memo"),x.n.split("\n")[0]);
      put(li.querySelector(".dk-len"),i===a?Math.ceil((r.t1*60-n)/60)+"분 남음":dur(x.m));
      li.classList.toggle("now",i===a); li.classList.toggle("over",r.t1>L.w[1]); });
    // 시간표의 마지막 줄: 칸이 언제 끝나는지, 비었는지 넘쳤는지
    const free=L.p.length?L.left:L.w[1]-freshStart(b), tail=$("dkTail"); tail.classList.toggle("over",L.left<0);
    put(tail,!L.p.length?"아직 조각이 없다. 아래에서 "+dur(free)+"을 나누거나 하나씩 더한다."
      :L.left>0?hhmm(L.end)+"부터 "+dur(L.left)+" 비어 있음 · 칸 끝 "+hhmm(L.w[1])
      :L.left===0?hhmm(L.w[1])+" 칸 끝":hhmm(L.end)+" 끝 · 칸 끝 "+hhmm(L.w[1])+"을 "+dur(-L.left)+" 넘김");
    const startEl=$("dkStart"); if(document.activeElement!==startEl) startEl.value=hhmm(L.p.length?L.s:freshStart(b));
    $("dkFill").hidden=free<10; put($("dkFillCap"),(L.p.length?"남은 ":"")+dur(Math.max(0,free))+"을");
    put($("dkMeta"),DAY_NAMES[dayIdx]+"요일 "+hhmm(L.w[0])+" – "+hhmm(L.w[1])+(st.n?" · 오늘 한 조각 "+st.k+"/"+st.n+(st.m?" ("+dur(st.m)+")":""):""));
    // 지금 조각
    const cap=$("dkCap"), curEl=$("dkCur"), clk=$("dkClock"), bar=$("dkBar"), nx=$("dkNext"), warn=$("dkWarn");
    let frac=0, canDone=false; warn.hidden=true; warn.textContent="";
    if(!L.p.length){ cap.textContent=isT?"이 칸":"계획"; curEl.textContent="이 칸을 내 단위로 나눠 보자"; clk.textContent=dur(Math.max(0,free)); nx.textContent="조각마다 할 일을 한 줄씩 적으면, 그 조각 동안은 그것만 한다."; }
    else if(!isT){ cap.textContent="계획"; curEl.textContent=DAY_NAMES[dayIdx]+"요일 계획을 세우는 중"; clk.textContent=dur(L.end-L.s); nx.textContent="그날이 되면 여기에 지금 조각과 남은 시간이 나온다."; }
    else if(a>=0){ const r=L.rows[a], x=L.p[a]; cap.textContent=x.r?"지금 · 쉼":"지금"; curEl.textContent=nameOf(x);
      clk.textContent=clock(r.t1*60-n); frac=(n-r.t0*60)/((r.t1-r.t0)*60); canDone=true;
      const y=L.p[a+1]; nx.textContent=hhmm(r.t1)+"까지"+(y?" · 다음은 "+nameOf(y)+" "+dur(y.m):" · 마지막 조각");
      const late=L.p.slice(0,a).filter(q=>!q.d&&!q.r).length; if(late){ warn.hidden=false; warn.textContent="앞 조각 "+late+"개가 아직 안 끝났다. 밀렸으면 '지금부터 다시'."; } }
    else if(n<L.s*60){ cap.textContent="곧 시작"; curEl.textContent=nameOf(L.p[0]); clk.textContent=clock(L.s*60-n); nx.textContent=hhmm(L.s)+"에 첫 조각이 시작된다."; }
    else { const undone=L.p.filter(q=>!q.d&&!q.r).length; cap.textContent="조각 끝"; curEl.textContent=undone?"못 끝낸 조각 "+undone+"개":"이 칸의 조각을 다 했다";
      clk.textContent=n<L.w[1]*60?clock(L.w[1]*60-n):"0:00"; nx.textContent=n<L.w[1]*60?"칸 끝까지 남은 시간이다. 조각을 더하거나 '지금부터 다시'.":"칸이 끝났다. 다음 칸으로."; canDone=undone>0; }
    clk.classList.toggle("words",!/^[\d:]+$/.test(clk.textContent));   // 숫자 시계가 아닌 글(3시간 10분)은 작게
    // 마침 기록: 시간이 다 됐거나 '했음'을 누른 공부 조각 가운데 아직 적지 않은 것
    const fi=isT?L.p.findIndex((q,i)=>!q.r&&!q.f&&q.x<0&&!later.has(dk.id+"|"+i)&&(q.d||L.rows[i].t1*60<=n)):-1;
    const xs=isT?L.p.findIndex((q,i)=>q.x>=0&&q.ph==="log"&&(q.d||L.rows[i].t1*60<=n)&&typeof EXPER!=="undefined"&&EXPER.needsRecord(q.x)):-1;
    finIdx=fi; const fin=$("dkFin");
    if(fi>=0){ if(fin.hidden||fin.dataset.i!==String(fi)){ fin.dataset.i=fi; fin.hidden=false; fin.reset(); burdenPick=-1; paintBurden();
        put($("dkFinHead"),(L.p[fi].d&&L.rows[fi].t1*60>n?"끝냈다 · ":"정해 둔 시각이다. 여기서 멈춘다 · ")+nameOf(L.p[fi])); } }
    else fin.hidden=true;
    document.querySelector(".dk-focus").classList.toggle("finning",fi>=0);   // 기록하는 동안에는 시계·안내를 접는다
    const back=$("dkBack"); back.hidden=fi>=0||Date.now()>backUntil;
    if(xs>=0&&fi<0){ back.hidden=false; back.innerHTML='실험 '+(L.p[xs].x+1)+'회차의 시간이 끝났다. <button type="button" class="dk-btn" data-xa="open">실험 기록하기</button>'; }
    else if(!back.hidden) back.textContent="한 걸음 물러난다. 바로 다음 것을 얹지 말고, 방금 조각이 전체의 어디에 놓일지 한 번 본다. 쓸 만한지는 내일 아침 파일을 열기 전에 판정한다.";
    const firstEl=$("dkFirst"), last=isT?history().filter(e=>e.x.f&&e.x.nx&&!(e.date===cur.date&&e.id===dk.id&&e.i===a)).pop():null;
    firstEl.hidden=!last||fi>=0; if(last) put(firstEl,"지난번 적어 둔 첫 행동 · "+last.x.nx);
    const rw=isT?restWarn():""; if(rw){ warn.hidden=false; warn.textContent=(warn.textContent&&!warn.hidden?warn.textContent+" ":"")+rw; }
    document.querySelector(".dk-acts").hidden=!L.p.length||fi>=0;
    bar.style.transform="scaleX("+Math.max(0,Math.min(1,frac)).toFixed(4)+")";
    // 지금부터 다시: 밀린 조각이나 다음 조각을 지금 시작하게 민다. 지금 하고 있는(안 끝낸) 조각을 늘리는 데는 쓰지 않는다
    const k0=L.p.findIndex(q=>!q.d);
    $("dkDone").disabled=!canDone; $("dkResync").disabled=!isT||k0<0||k0===a;
    const title=isT&&a>=0?clock(L.rows[a].t1*60-n)+" · "+nameOf(L.p[a])+" · 오이포리온":"오이포리온"; if(document.title!==title) document.title=title;
  }
  const freshStart=b=>{ const w=win(b); if(today()){ const n=round5(nowFor(w)/60); if(n>w[0]&&n<w[1]) return n; } return w[0]; };

  function openDesk(id,quiet){
    const b=byId(id); if(!win(b)) return;
    load(selectedDate()); dk={date:cur.date,id}; clearArm=0; store.set("oi.desk","1");
    $("dkTitle").textContent=b.name; $("dkChime").checked=store.get("oi.chime")!=="0"; $("dkParkDate").value=plusDays(7); $("dkParkDate").min=plusDays(1);
    ov.hidden=false; ov.scrollTop=0; renderList(); renderPark(); if(!quiet) prime(); lockScreen();
    $("dkClose").focus({preventScroll:true});
  }
  function closeDesk(){
    if(!dk) return; flush(); dk=null; ov.hidden=true; unlock(); document.title="오이포리온"; store.set("oi.desk","0");
    sync(); decorate(); document.querySelector("#iDesk .dk-open")?.focus({preventScroll:true});
  }
  $("dkClose").addEventListener("click",closeDesk);
  ov.addEventListener("click",e=>{ if(e.target===ov) closeDesk(); else prime(); });
  document.addEventListener("keydown",e=>{ if(dk&&e.key==="Escape") closeDesk(); });

  /* 조각 고치기: 타자 중에는 목록을 다시 만들지 않는다(요약 글자만 따라 바뀐다) */
  list.addEventListener("input",e=>{
    const li=e.target.closest(".dk-row"); if(!li) return; const x=cur.plan.b[dk.id].p[+li.dataset.i]; if(!x) return;
    if(e.target.classList.contains("dk-min")){ const v=Math.round(+e.target.value); if(Number.isFinite(v)&&v>=1) x.m=Math.min(600,v); }
    else if(e.target.classList.contains("dk-title")) x.t=e.target.value;
    else if(e.target.classList.contains("dk-note")){ x.n=e.target.value; grow(e.target); }
    else return;
    dirty(); paint();
  });
  list.addEventListener("change",e=>{
    const li=e.target.closest(".dk-row"); if(!li||e.target.type!=="checkbox") return; const x=cur.plan.b[dk.id].p[+li.dataset.i];
    if(e.target.dataset.cut){ x.c=e.target.checked?1:0; li.classList.toggle("cut",e.target.checked); dirty(); flush(); return; }
    x.d=e.target.checked?1:0; li.classList.toggle("done",e.target.checked); dirty(); paint(); if(x.c) flush();
  });
  list.addEventListener("click",e=>{
    const li=e.target.closest(".dk-row"); if(!li) return; const i=+li.dataset.i;
    if(e.target.closest(".dk-sum")){ renderList(i===openRow?-1:i); return; }   // 줄을 누르면 펼치고, 다시 누르면 접는다
    const btn=e.target.closest("[data-act]"); if(!btn) return;
    const p=cur.plan.b[dk.id].p, x=p[i], act=btn.dataset.act; let open=-1;
    if(act==="split"){ if(x.m<2) return; const a=x.m>=10?Math.max(5,round5(x.m/2)):Math.ceil(x.m/2); p.splice(i,1,{...x,m:a},{...x,m:x.m-a,n:"",d:0}); open=i+1; }
    else if(act==="up"){ if(!i) return; [p[i-1],p[i]]=[p[i],p[i-1]]; open=i-1; }
    else if(act==="del"){ p.splice(i,1); if(!p.length) delete cur.plan.b[dk.id]; }
    else if(act!=="close") return;
    dirty(); renderList(open);
  });
  list.addEventListener("keydown",e=>{   // 할 일 칸에서 Enter: 다음 이름 없는 조각으로 넘어간다(없으면 접는다)
    if(e.key!=="Enter"||e.isComposing||!e.target.classList.contains("dk-title")) return; e.preventDefault();
    const p=cur.plan.b[dk.id].p, i=+e.target.closest(".dk-row").dataset.i; renderList(p.findIndex((x,k)=>k>i&&!x.t&&!x.r));
  });
  $("dkStart").addEventListener("input",e=>{ const v=toMin(e.target.value); if(v==null) return; const b=block(), w=win(b);
    ensure(b).s=w[1]>1440&&v<w[0]-720?v+1440:v; dirty(); paint(); });
  /* 조각 더하기 · 빠르게 나누기(남은 시간을 채운다). 새 조각의 할 일 칸을 바로 펼친다 */
  $("dkQuick").addEventListener("click",e=>{
    const q=e.target.closest("[data-q]"); if(!q) return; const b=block(), kind=q.dataset.q;
    const bp=ensure(b), L=layout(b), at0=bp.p.length; let left=L.left;
    const push=(m,r)=>bp.p.push({m,t:r?"쉼":"",n:"",d:0,r:r?1:0,c:0,x:-1});
    if(kind==="add") push(left>=5&&left<25?left:25);
    else if(kind==="cut"){ if(!dkCut) return; bp.p.push({m:25,t:dkCut.t,n:"",d:0,r:0,c:1,x:-1}); }   // 덩이 제목이 채워진 25분 조각
    else if(kind==="copy") bp.p.push({m:15,t:"옮겨 적기: 이미 쓴 대목을 깨끗이 옮겨 적는다",n:"",d:0,r:0,c:0,x:-1});   // 막혔을 때의 기본 행동
    else if(kind==="rest") push(10,1);
    else if(/^n\d$/.test(kind)){ const k=+kind[1]; if(left<10) return; const base=Math.max(5,Math.floor(left/k/5)*5); for(let i=0;i<k-1;i++) push(base); push(Math.max(1,left-base*(k-1))); }
    else { const work=+kind, rest=work>=50?10:5, tail=work>=50?15:10; if(left<10) return;   // 공부 work분 + 쉼 rest분을 되풀이
      while(left>=10){ let m=Math.min(work,left); if(left-m>0&&left-m<tail) m=left; push(m); left-=m; if(left>=rest+tail){ push(rest,1); left-=rest; } } }
    dirty(); if(kind==="cut") flush(); renderList(bp.p.findIndex((x,i)=>i>=at0&&!x.r));
  });
  $("dkClear").addEventListener("click",e=>{ const q=e.currentTarget;   // 두 번 눌러야 지운다
    if(clearArm&&Date.now()-clearArm<4000){ delete cur.plan.b[dk.id]; clearArm=0; q.textContent="조각 전부 지우기"; dirty(); renderList(); }
    else { clearArm=Date.now(); q.textContent="정말 지울까? 한 번 더 누르기"; setTimeout(()=>{ if(clearArm&&Date.now()-clearArm>=3900){ clearArm=0; q.textContent="조각 전부 지우기"; } },4000); } });
  /* 지금 조각 단추 */
  $("dkDone").addEventListener("click",()=>{
    const b=block(), L=layout(b), a=active(L), p=L.p;
    if(a>=0) p[a].d=1;   // 일찍 끝내도 시간표는 그대로 둔다: 남은 시간은 물러나 보는 시간이다. 다음으로 바로 가려면 '지금부터 다시'
    else { const x=p.find(q=>!q.d&&!q.r); if(x) x.d=1; }
    dirty(); renderList();
  });
  /* 마침 기록 */
  let finIdx=-1, burdenPick=-1, backUntil=0; const later=new Set();
  const burdenEl=$("dkBurden");
  burdenEl.innerHTML=Array.from({length:11},(_,k)=>'<button type="button" data-b="'+k+'" aria-pressed="false">'+k+'</button>').join("");
  function paintBurden(){ burdenEl.querySelectorAll("[data-b]").forEach(b=>{ const on=+b.dataset.b===burdenPick; b.setAttribute("aria-pressed",String(on)); b.classList.toggle("hi",+b.dataset.b>=8); }); }
  burdenEl.addEventListener("click",e=>{ const b=e.target.closest("[data-b]"); if(!b) return; burdenPick=+b.dataset.b; paintBurden(); });
  $("dkFin").addEventListener("submit",e=>{ e.preventDefault(); const x=cur.plan.b[dk.id]&&cur.plan.b[dk.id].p[finIdx]; if(!x) return;
    Object.assign(x,{f:1,b:burdenPick,nx:$("dkFinNext").value.trim().slice(0,160),sl:$("dkFinSleep").checked?1:0});
    backUntil=Date.now()+5*60e3; $("dkFin").hidden=true; dirty(); flush(); renderList(); });
  $("dkFinLater").addEventListener("click",()=>{ later.add(dk.id+"|"+finIdx); $("dkFin").hidden=true; paint(); });

  /* 어제 조각 판정: 다음 날 아침, 파일을 열기 전에. 셋 다 예여야 쓸 수 있는 조각이다 */
  function toJudge(){ const t=JOURNEY.todayKey(); return history().filter(e=>e.date<t&&e.x.f&&!e.x.j&&e.x.x<0); }
  const Q3=[["제 기능을 하는가","미리 정한 완료 조건을 채웠다"],["혼자 성립하는가","덧붙이는 설명 없이도 읽히거나 들린다"],["들어갈 자리가 있는가","전체 목차나 곡 구성에서 놓일 곳을 짚을 수 있다"]];
  function renderJudge(){
    const el=$("dkJudge"), items=today()?toJudge():[];
    el.hidden=!items.length; if(!items.length){ el.innerHTML=""; return; }
    const usable=history().filter(e=>e.x.j==="111").length;
    el.innerHTML='<h3>어제 조각 판정 <small>파일을 열기 전에 · 세 가지가 모두 예여야 쓸 수 있는 조각이다'+(usable?' · 이번 주 쓸 수 있는 조각 '+usable+'개':'')+'</small></h3>'+
      items.map((e,n)=>{ const q=e.x.c&&typeof QUARRY!=="undefined"?QUARRY.quarryOfDate(e.date):null, slots=q&&q.outline?q.outline.split("\n").map(v=>v.trim()).filter(Boolean):[];
        return '<form class="dk-jrow" data-date="'+e.date+'" data-id="'+e.id+'" data-i="'+e.i+'"><p class="dk-jname"><b>'+esc(nameOf(e.x))+'</b> <small>'+(+e.date.slice(5,7))+'/'+(+e.date.slice(8))+' '+hhmm(e.t0)+'</small></p>'+
          Q3.map(([qq,hint],k)=>'<fieldset class="dk-q"><legend>'+(k+1)+'. '+qq+' <small>'+hint+'</small></legend>'+
            (k===2&&slots.length?'<select name="q2" aria-label="들어갈 자리"><option value="">고른다</option>'+slots.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join("")+'<option value="-">자리가 없다</option></select>'
              :'<label><input type="radio" name="q'+k+'" value="1" required><span>예</span></label><label><input type="radio" name="q'+k+'" value="0"><span>아니오</span></label>')+'</fieldset>').join("")+
          '<div class="dk-acts"><button type="submit" class="dk-btn dk-go">판정 저장</button></div></form>'; }).join("");
  }
  $("dkJudge").addEventListener("submit",e=>{ e.preventDefault(); const f=e.target, d=new FormData(f), date=f.dataset.date, id=f.dataset.id, i=+f.dataset.i;
    const sel3=f.querySelector('select[name="q2"]'), v2=d.get("q2"), slot=sel3&&v2&&v2!=="-"?String(v2):"";
    const ans=[d.get("q0"),d.get("q1"),sel3?(v2?(v2==="-"?"0":"1"):null):v2];
    if(ans.some(v=>v==null||v==="")){ (sel3&&!v2?sel3:f.querySelector("input:invalid"))?.focus(); return; }   // 셋 다 골라야 저장된다
    let title="";
    editPlan(date,plan=>{ const x=plan.b[id]&&plan.b[id].p[i]; if(!x) return; x.j=ans.join(""); x.pl=slot; title=nameOf(x); });
    if(slot&&typeof QUARRY!=="undefined") QUARRY.place(date,slot,title,ans.join("")==="111");
    renderJudge(); paint(); });
  $("dkResync").addEventListener("click",()=>{   // 아직 안 한 첫 조각이 지금 시작되게 시작 시각을 민다
    const b=block(), L=layout(b), k=L.p.findIndex(q=>!q.d); if(k<0||!today()) return;
    cur.plan.b[dk.id].s=round5(nowFor(L.w)/60)-L.p.slice(0,k).reduce((s,q)=>s+q.m,0); dirty(); paint();
  });
  $("dkChime").addEventListener("change",e=>{ store.set("oi.chime",e.target.checked?"1":"0"); if(e.target.checked){ prime(); beep(); } });
  /* 주차장 */
  $("dkParkForm").addEventListener("submit",e=>{ e.preventDefault(); const inp=$("dkParkIn"), t=inp.value.trim(); if(!t) return;
    if($("dkParkReview").checked){   // 목적 자체가 의심되면 여기서 풀지 않고 다시 볼 날로 미룬다(채석장 화면에 그날 뜬다)
      const day=$("dkParkDate").value||plusDays(7);
      Promise.resolve(JOURNEY.saveReviews([...JOURNEY.reviews(),{t:t.slice(0,200),date:day,from:JOURNEY.todayKey()}])).catch(err=>console.error(err));
      $("dkParkReview").checked=false; inp.value=""; renderPark(); const toast=$("dkToast"); toast.textContent=(+day.slice(5,7))+"/"+(+day.slice(8))+"에 다시 본다. 지금은 조각으로 돌아간다."; toast.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>{ toast.hidden=true; },8000); return; }
    cur.plan.park.push({t:t.slice(0,200),d:0}); inp.value=""; dirty(); renderPark(); inp.focus(); });
  const plusDays=n=>new Date(Date.parse(JOURNEY.todayKey()+"T00:00:00Z")+n*864e5).toISOString().slice(0,10);
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
        const t=$("dkToast"); t.textContent="정해 둔 시각이다. 여기서 멈춘다. ("+prevPiece.name+")"+(np?" 다음은 "+np.name:""); t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>{ t.hidden=true; },20000); } }
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
    /* 실험 회차를 오늘 지금 칸(없으면 고른 칸)에 올리고 책상을 편다. 못 올리면 이유를 돌려준다 */
    addPieces(pieces){
      if(!isToday()) return "요일 단추에서 오늘을 먼저 고른다.";
      const id=nowId()||sel, b=byId(id); if(!win(b)) return "지금 칸에 시간이 없다. 공부 칸을 골라 다시 올린다.";
      load(JOURNEY.todayKey()); const bp=ensure(b); bp.p.push(...pieces.map(x=>Object.assign({n:"",d:0,r:0,c:0,f:0,b:-1,nx:"",sl:0,j:"",pl:""},x)));
      dirty(); flush(); openDesk(id); return ""; },
    history:()=>history(),
    /* 책상을 편 채 페이지를 떠났고 지금 조각이 진행 중이면, 다시 열었을 때 책상부터 보인다 */
    restore(){ if(store.get("oi.desk")!=="1"||dk) return; load(selectedDate()); const np=sceneMode==="day"&&nowPiece();
      if(np) openDesk(np.key.split("|")[0],true); else store.set("oi.desk","0"); },
    /* 칸의 조각(쉼 빼고)을 다 했는가: 일정 카드의 ✓ */
    allDone(id){ load(selectedDate()); const bp=cur.plan.b[id]; if(!bp) return false; const work=bp.p.filter(x=>!x.r); return work.length>0&&work.every(x=>x.d); },
  };
})();
