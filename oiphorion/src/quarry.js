/* ───── 채석장: 긴 작업은 닫지 않고 붙들어 둔다. 거기서 한 주에 덩이 하나를 떼어, 날짜가 오면 사람에게 넘긴다 ─────
   바탕 글과 설계: 민이 준 「nov 16th」와 '오이포리온에 채석장 방식 붙이기'(2026-11-16). 카프카·벤야민이 끝나지 않는
   큰 원고에서 끝낸 글을 떼어 냈던 방식이다.

   채석장  몇 달~몇 해 붙드는 긴 작업. 최대 3곳. 완료 단추·진행률·마감이 없다. 보이는 숫자는 '넘긴 덩이의 수' 하나.
   덩이    한 주(월~토)에 하나. 제목 · 끝의 모양(무엇이 있으면 넘길 수 있나) · 받을 사람 · 넘길 날 · 예상 조각 수(1~3).
           닫는 길은 '넘겼음'과 '버렸음'. 토요일까지 못 닫으면 일요일부터 '더 작게 잘라 다음 주로' 아니면 '버렸음'뿐이다
           (같은 크기로 미루는 길은 두지 않는다. 넘치면 늘리지 않고 더 자른다).
   조각    책상의 조각에 '덩이 조각' 표시(c)를 한 것. 덩이의 진행 = 그 주에 표시된 조각 가운데 했음의 수.
   돌담    넘긴 덩이 하나가 돌 하나. 덩이를 안 정했거나 못 닫은 주는 빈 곳(꾸짖지 않는다). 버린 덩이는 세지 않는다.

   지킬 것: 1·2·3선, 모자, 트램펄린, 일요일 점프와 섞지 않는다(덩이를 못 넘겨도 아무것도 잃지 않는다).
            연속 기록(며칠째)을 세지 않는다. 채석장에 진행률을 두지 않는다.
   저장: JOURNEY.saveQuarries / saveCut → 이 기기 + db(meta/quarries, cuts/<월요일>). 나중에 저장한 쪽이 이긴다.
   이 파일은 desk.js 뒤, map.js 앞에 온다. 서로는 부를 때만 쓴다. 클래스 이름은 qr-·cs-로 시작한다. */
const QUARRY=(()=>{
  const $=id=>document.getElementById(id);
  const ov=$("quarryOv"), box=$("qrBody");
  const shift=(date,n)=>new Date(Date.parse(date+"T00:00:00Z")+864e5*n).toISOString().slice(0,10);
  const today=()=>JOURNEY.todayKey();
  const monday=()=>JOURNEY.week().monday;
  const slot=()=>today()===shift(monday(),6)?shift(monday(),7):monday();   // 일요일에는 다음 주 덩이를 뗀다
  const DOW=["일","월","화","수","목","금","토"];
  const dayName=key=>DOW[new Date(key+"T00:00:00Z").getUTCDay()]+"요일";
  const md=key=>(+key.slice(5,7))+"/"+(+key.slice(8));
  const h=v=>esc(String(v??""));
  const late=(week,c)=>c.state==="open"&&today()>shift(week,5);          // 토요일이 지나도록 열려 있다
  const STATE={open:"열림",handed:"넘김",dropped:"버림",smaller:"더 작게 잘라 다음 주로"};
  const quarryName=id=>(JOURNEY.quarries().find(q=>q.id===id)||{}).name||"지운 채석장";
  let selected=null, mode=null, msg="", armed="", lastStripH=-1, origin=null;

  /* 덩이의 진행: 그 주 책상 계획에서 '덩이 조각'으로 표시한 것(n)과 그 가운데 했음(k) */
  function pieces(week){
    let n=0,k=0;
    for(let i=0;i<7;i++){ const p=JOURNEY.plan(shift(week,i)); if(!p||!p.b) continue;
      for(const bp of Object.values(p.b)) for(const x of (bp&&bp.p)||[]) if(x&&x.c){ n++; if(x.d) k++; } }
    return {n,k};
  }
  /* 그 날짜가 든 주의 열린 덩이(책상이 묻는다). 주가 지났으면 없다고 답한다 */
  function openCutFor(date){ const w=JOURNEY.week(date).monday, c=JOURNEY.cut(w); return c&&c.state==="open"&&!late(w,c)?Object.assign(c,{week:w,...pieces(w)}):null; }

  const save=(week,c)=>Promise.resolve(JOURNEY.saveCut(week,c)).catch(e=>console.error(e));
  const saveQs=list=>Promise.resolve(JOURNEY.saveQuarries(list)).catch(e=>console.error(e));

  /* ── 머리말의 덩이 띠 · 한 주 보기의 덩이 카드 ── */
  function summary(){
    const w=monday(), c=JOURNEY.cut(w), sun=slot()!==w, next=sun?JOURNEY.cut(slot()):null, qs=JOURNEY.quarries();
    if(c&&c.state==="open"&&!late(w,c)){ const pr=pieces(w);
      return c.due===today()?{text:"오늘 넘기는 날 · "+c.t+" → "+c.to,act:"hand",week:w,btn:"넘겼음",c,pr}
        :{text:"이번 주 덩이 · "+c.t+" · 조각 "+pr.k+"/"+c.est+" · "+dayName(c.due)+"에 "+c.to,act:"open",btn:"보기",c,pr}; }
    if(c&&c.state==="open") return {text:"열린 채 주가 지난 덩이 · "+c.t,act:"open",btn:"더 자르거나 닫기",c};
    if(sun) return next?{text:"다음 주 덩이 · "+next.t+" · "+dayName(next.due)+"에 "+next.to,act:"open",btn:"보기",c:next}
      :{text:"다음 주 덩이가 아직 없다",act:"open",btn:qs.length?"떼어 내기":"채석장 열기"};
    if(c) return {text:"이번 주 덩이 · "+c.t+" · "+STATE[c.state],act:"open",btn:"돌담 보기",c};
    return {text:"이번 주 덩이가 아직 없다",act:"open",btn:qs.length?"떼어 내기":"채석장 열기"};
  }
  function sync(){
    const s=summary(), strip=$("cutStrip"), cw=JOURNEY.cut(monday());
    strip.innerHTML='<span class="cs-mark" aria-hidden="true">◆</span><span class="cs-text">'+h(s.text)+'</span><button type="button" data-qa="'+s.act+'" data-value="'+h(s.week||"")+'">'+s.btn+'</button>';
    const card=$("wkCut");
    card.innerHTML='<p><span class="cs-mark" aria-hidden="true">◆</span> '+h(s.text)+(s.c&&s.c.state==="open"?'<br><small>끝의 모양 · '+h(s.c.end)+'</small>':"")+'</p>'+
      '<div class="qr-actions">'+(cw&&cw.state==="open"&&!late(monday(),cw)?'<button type="button" class="dk-btn" data-qa="hand" data-value="'+monday()+'">넘겼음</button>':"")+
      '<button type="button" class="dk-btn" data-qa="open">'+(s.c?"덩이 보기":s.btn)+'</button></div>';
    // 띠의 높이가 바뀌면 머리말에 가린 장소 표지를 다시 놓는다
    const hgt=strip.offsetHeight;
    if(hgt!==lastStripH){ const first=lastStripH<0; lastStripH=hgt; if(!first&&sceneMode==="day"){ buildOverlay(); decorate(); } }
  }
  /* 한 주 지도의 토요일 자리에 놓는 돌: 넘겼으면 채운 돌, 열려 있으면 윤곽만 */
  function stoneSvg(x,y){
    const w=monday(), c=JOURNEY.cut(w); if(!c||!(c.state==="handed"||(c.state==="open"&&!late(w,c)))) return "";
    return '<path class="wk-stone" data-state="'+c.state+'" d="M'+(x-9)+' '+(y+5)+' L'+(x-6)+' '+(y-4)+' L'+(x+2)+' '+(y-7)+' L'+(x+9)+' '+(y-1)+' L'+(x+7)+' '+(y+6)+' Z" fill="'+(c.state==="handed"?"#7d8f76":"rgba(255,255,255,.55)")+
      '" stroke="#3c4a3a" stroke-width="1.5" stroke-linejoin="round"'+(c.state==="open"?' stroke-dasharray="3 2"':"")+'><title>'+h(c.state==="handed"?"넘긴 덩이: ":"이번 주 덩이: ")+h(c.t)+'</title></path>';
  }

  /* ── 채석장 화면 ── */
  const btn=(label,act,value,cls)=>'<button type="button" class="dk-btn'+(cls?" "+cls:"")+'" data-qa="'+act+'" data-value="'+h(value??"")+'">'+label+'</button>';
  function cutCard(week){
    const c=JOURNEY.cut(week); if(!c) return '<p class="qr-soft">'+(week===monday()?"이번 주 덩이가 아직 없다.":"아직 떼어 낸 덩이가 없다.")+'</p>';
    const pr=pieces(week);
    let s='<div class="qr-cut" data-state="'+c.state+'"><h4>'+h(c.t)+'</h4>'+
      '<p class="qr-meta">'+h(quarryName(c.q))+' · '+h(c.to)+'에게 '+dayName(c.due)+'('+md(c.due)+') · '+STATE[c.state]+'</p>'+
      '<p>끝의 모양 · '+h(c.end)+'</p>';
    if(c.state!=="open") return s+(c.state==="handed"?'<p class="qr-soft">돌 하나를 쌓았다. 채석장은 그대로다.</p>':"")+'</div>';
    if(late(week,c)) return s+'<p class="qr-soft">주가 지났다. 같은 크기로 미루지 않는다. 더 작게 자르거나 여기서 닫는다.</p>'+
      '<div class="qr-actions">'+btn("더 작게 잘라 다음 주로","shrink",week)+btn(armed==="drop"+week?"정말 닫을까? 한 번 더":"버렸음","drop",week)+'</div></div>';
    s+='<p class="qr-prog"><b>조각 '+pr.k+'/'+c.est+'</b> <span>책상에서 \'덩이 조각\'으로 올린 것 가운데 한 것을 센다.</span></p>';
    if(pr.n>c.est) s+='<p class="qr-warn">세 번 앉을 크기를 넘는다. 늘리지 말고 더 자른다. (올린 조각 '+pr.n+'개 · 예상 '+c.est+'개)</p>';
    if(c.due===today()) s+='<p class="qr-warn">오늘 넘기는 날이다. 다 됐는지는 묻지 않는다.</p>';
    return s+'<div class="qr-actions">'+(week<=monday()?btn("넘겼음","hand",week,"dk-go"):"")+(week===monday()?btn("책상에 조각 올리기","desk",week):"")+btn("고치기","edit",week)+
      btn(armed==="drop"+week?"정말 닫을까? 한 번 더":"버렸음","drop",week)+'</div></div>';
  }
  function form(){
    const {kind,week,previous}=mode, editing=kind==="edit", shrinking=kind==="shrink";
    const old=JOURNEY.cut(shrinking?previous:week), limit=shrinking?Math.max(1,old.est-1):3, est=editing?old.est:shrinking?limit:2;
    const opts=JOURNEY.quarries().filter(q=>!q.rest||(old&&q.id===old.q)).map(q=>'<option value="'+h(q.id)+'"'+(old&&q.id===old.q?" selected":"")+'>'+h(q.name)+'</option>').join("");
    return '<h3>'+(editing?"덩이 고치기":shrinking?"더 작게 잘라 다시 떼기":"덩이 떼기")+' <small>'+md(week)+' 주</small></h3>'+
      (shrinking?'<p class="qr-soft">지난 덩이 · '+h(old.t)+'<br>지난 끝의 모양 · '+h(old.end)+'<br>넘길 것을 더 좁혀 적는다.</p>':"")+
      '<form id="qrCutForm" class="qr-form">'+
      '<label>어느 채석장에서<select name="quarry" required>'+opts+'</select></label>'+
      '<label>덩이 제목<input name="title" required maxlength="90" value="'+h(editing?old.t:"")+'" placeholder="예: 첫 장면 뒤 차 안 문단"></label>'+
      '<label>끝의 모양 <small>무엇이 있으면 넘길 수 있나</small><input name="end" required maxlength="160" value="'+h(editing?old.end:"")+'" placeholder="예: 합평에 낼 수 있는 한 쪽"></label>'+
      '<div class="qr-two"><label>받을 사람<input name="to" required maxlength="60" value="'+h(old?old.to:"")+'" placeholder="예: 합평회"></label>'+
      '<label>넘길 날<input name="due" type="date" required min="'+week+'" max="'+shift(week,5)+'" value="'+(editing?old.due:shift(week,5))+'"></label></div>'+
      '<fieldset class="qr-est"><legend>몇 번 앉을 크기인가 <small>한 번은 25~50분. 세 번을 넘으면 더 자른다</small></legend>'+
      [1,2,3].map(n=>'<label><input type="radio" name="est" value="'+n+'"'+(n===est?" checked":"")+(n>limit?" disabled":"")+'><span>'+n+'번</span></label>').join("")+'</fieldset>'+
      '<div class="qr-actions"><button type="submit" class="dk-btn dk-go">덩이 저장</button>'+btn("취소","cancel")+'</div></form>';
  }
  function wall(){
    const all=JOURNEY.cuts(), cur=monday(), first=Object.keys(all).sort().find(w=>w<=cur);
    if(!first) return '<p class="qr-soft">아직 쌓인 돌이 없다.</p>';
    const cells=[]; let gap=false;
    for(let w=first;w<=cur;w=shift(w,7)){
      const c=all[w]; if(c&&c.state==="dropped") continue;      // 버린 덩이는 돌도 빈 곳도 아니다
      const stone=!!c&&c.state==="handed", open=!!c&&c.state==="open"&&!late(w,c), thisWeek=w===cur&&today()<=shift(cur,5);
      if(!stone&&!open&&!thisWeek) gap=true;
      cells.push('<li data-stone="'+(stone?1:0)+'"'+(open||(!stone&&thisWeek)?' data-open="1"':"")+'><time datetime="'+w+'">'+md(w)+' 주</time>'+
        (stone?'<b>'+h(c.t)+'</b><small>'+h(quarryName(c.q))+'</small>':open?"열린 덩이":thisWeek?"이번 주":"빈 곳")+'</li>');
    }
    return '<ol class="qr-wall">'+cells.join("")+'</ol>'+(gap?'<p class="qr-soft">빈 곳. 장성은 원래 이렇게 쌓는다.</p>':"");
  }
  function render(){
    const cur=monday(), target=slot(), all=JOURNEY.cuts(), qs=JOURNEY.quarries(), active=qs.filter(q=>!q.rest);
    if(!selected) selected=cur;
    const review=Object.keys(all).filter(w=>w!==selected&&late(w,all[w])).sort().reverse();
    const list=qs.map(q=>{ const handed=Object.values(all).filter(c=>c.q===q.id&&c.state==="handed");
      return '<li><div class="qr-qhead"><b>'+h(q.name)+'</b><span>넘긴 덩이 '+handed.length+'개'+(q.rest?" · 쉬는 중":"")+'</span></div>'+
        (q.note?'<p class="qr-soft">'+h(q.note)+'</p>':"")+(handed.length?'<ul class="qr-handed">'+handed.map(c=>'<li>'+h(c.t)+'</li>').join("")+'</ul>':"")+
        '<div class="qr-actions">'+btn(q.rest?"다시 열기":"쉬게 두기","rest",q.id,"qr-small")+btn(armed==="del"+q.id?"정말 지울까? 한 번 더":"지우기","delq",q.id,"qr-small")+'</div></li>'; }).join("");
    box.innerHTML='<p class="qr-lead">여기는 끝내지 않아도 되는 곳이다. 캐낸 것만 센다.</p>'+
      '<p class="qr-msg" id="qrMsg" role="status" tabindex="-1">'+h(msg)+'</p>'+
      '<section>'+(mode?form():'<h3>'+(selected===cur?"이번 주 덩이":"다음 주 덩이")+' <small>'+md(selected)+' 주</small></h3>'+cutCard(selected)+
        '<div class="qr-actions">'+(selected!==cur?btn("이번 주 보기","week",cur):"")+(target!==cur&&selected!==target&&all[target]?btn("다음 주 보기","week",target):"")+
        (!all[target]&&active.length?btn(target===cur?"이번 주 덩이 떼기":"다음 주 덩이 떼기","new",target,"dk-go"):"")+
        (!all[target]&&!active.length?'<span class="qr-soft">덩이를 떼려면 먼저 아래에서 채석장을 하나 연다.</span>':"")+'</div>')+'</section>'+
      (review.length&&!mode?'<section><h3>지난 주 점검</h3>'+review.map(w=>'<p class="qr-meta">'+md(w)+' 주</p>'+cutCard(w)).join("")+'</section>':"")+
      '<section><h3>채석장 <small>몇 달 붙들 긴 작업 · 세 곳까지</small></h3>'+(list?'<ul class="qr-list">'+list+'</ul>':'<p class="qr-soft">끝이 안 보여서 손을 못 대던 것을 하나 적는다. 끝내려고 적는 것이 아니다.</p>')+
        (qs.length<3?'<details class="qr-add"'+(list?"":" open")+'><summary>채석장 더하기</summary><form id="qrQuarryForm" class="qr-form">'+
          '<label>이름<input name="name" required maxlength="60" placeholder="예: 소설, 졸업 프로젝트"></label><label>한 줄 설명<input name="note" maxlength="150" placeholder="안 적어도 된다"></label>'+
          '<div class="qr-actions"><button type="submit" class="dk-btn">채석장 열기</button></div></form></details>':"")+'</section>'+
      '<section><h3>돌담 <small>넘긴 덩이가 쌓인 자리</small></h3>'+wall()+'</section>';
  }
  const say=text=>{ msg=text; const m=$("qrMsg"); if(m){ m.textContent=text; m.focus({preventScroll:true}); } };
  function done(text){ msg=text; mode=null; armed=""; sync(); WEEK.refresh(); if(ov.hidden) return; render(); ov.scrollTop=0; $("qrMsg").focus({preventScroll:true}); }

  function open(trigger){
    origin=trigger||null; selected=slot()!==monday()&&!(JOURNEY.cut(monday())&&late(monday(),JOURNEY.cut(monday())))?slot():monday();
    mode=null; msg=""; armed=""; if(typeof closeScroll==="function"&&!document.getElementById("overlay").hidden) closeScroll();
    ov.hidden=false; ov.scrollTop=0; render(); $("qrClose").focus({preventScroll:true});
  }
  function close(){ if(ov.hidden) return; ov.hidden=true; mode=null; if(origin&&origin.isConnected) origin.focus({preventScroll:true}); }
  function hand(week){
    const c=JOURNEY.cut(week); if(!c||c.state!=="open"||late(week,c)||week>monday()) return;
    save(week,Object.assign(c,{state:"handed",closedAt:today(),used:pieces(week).k})); done("돌 하나를 쌓았다. 채석장은 그대로다.");
  }
  function act(a,value,el){
    if(a==="open") return open(el);
    if(a==="hand") return hand(value);
    if(a==="close") return close();
    if(a==="cancel"||a==="week"){ if(a==="week") selected=value; mode=null; msg=""; armed=""; return render(); }
    const c=JOURNEY.cut(value);
    if(a==="new"){ if(c||!JOURNEY.quarries().some(q=>!q.rest)) return; mode={kind:"new",week:value}; msg=""; render(); return box.querySelector('[name="title"]').focus(); }
    if(a==="edit"){ if(!c||c.state!=="open"||late(value,c)) return; mode={kind:"edit",week:value}; msg=""; render(); return box.querySelector('[name="title"]').focus(); }
    if(a==="shrink"){ if(!c||!late(value,c)) return;
      if(JOURNEY.cut(slot())) return say("받을 주에 이미 덩이가 있다. 지난 덩이는 여기서 닫을 수 있다.");
      if(!JOURNEY.quarries().some(q=>!q.rest)) return say("먼저 채석장을 하나 연다.");
      mode={kind:"shrink",week:slot(),previous:value}; msg=""; render(); return box.querySelector('[name="title"]').focus(); }
    if(a==="drop"){ if(!c||c.state!=="open") return;      // 두 번 눌러야 닫는다(아티팩트에서는 confirm 창이 뜨지 않는다)
      if(armed!=="drop"+value){ armed="drop"+value; return render(); }
      save(value,Object.assign(c,{state:"dropped",closedAt:today(),used:pieces(value).k})); return done("이 덩이는 여기서 닫는다."); }
    if(a==="desk"){ close(); return DESK.open(isToday()&&nowId()?nowId():sel); }
    const qs=JOURNEY.quarries(), q=qs.find(x=>x.id===value);
    if(a==="rest"&&q){ q.rest=q.rest?0:1; saveQs(qs); return done(q.rest?"채석장을 쉬게 두었다.":"채석장을 다시 열었다."); }
    if(a==="delq"&&q){ if(armed!=="del"+value){ armed="del"+value; return render(); }
      saveQs(qs.filter(x=>x.id!==value)); return done("채석장을 지웠다. 쌓은 돌은 돌담에 남는다."); }
  }
  document.addEventListener("click",e=>{
    const b=e.target.closest("[data-qa]"); if(b){ act(b.dataset.qa,b.dataset.value,b); return; }
    const o=e.target.closest("[data-quarry-open]"); if(o) open(o);
  });
  ov.addEventListener("click",e=>{ if(e.target===ov) close(); });
  document.addEventListener("keydown",e=>{ if(!ov.hidden&&e.key==="Escape") close(); });
  box.addEventListener("submit",e=>{
    e.preventDefault(); const f=new FormData(e.target), text=n=>String(f.get(n)??"").trim();
    if(e.target.id==="qrQuarryForm"){
      const qs=JOURNEY.quarries(), name=text("name");
      if(!name||qs.length>=3||qs.some(q=>q.name===name)) return say("서로 다른 이름으로 세 곳까지 둘 수 있다.");
      qs.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),name,note:text("note"),rest:0});
      saveQs(qs); return done("채석장을 열었다. 이제 여기서 덩이를 뗀다.");
    }
    if(e.target.id!=="qrCutForm"||!mode) return;
    const {kind,week,previous}=mode, editing=kind==="edit", shrinking=kind==="shrink", old=JOURNEY.cut(shrinking?previous:week);
    const q=text("quarry"), t=text("title"), end=text("end"), to=text("to"), due=text("due"), est=+text("est");
    if(!JOURNEY.quarries().some(x=>x.id===q)||!t||!end||!to||due<week||due>shift(week,5)||![1,2,3].includes(est)) return say("제목, 끝의 모양, 받을 사람, 넘길 날(그 주 월~토), 앉을 횟수를 확인한다.");
    if(editing?(!old||old.state!=="open"||late(week,old)):(!!JOURNEY.cut(week)||week!==slot())) return say("이 주에는 덩이를 저장할 수 없다.");
    if(shrinking&&(!old||!late(previous,old)||est>Math.max(1,old.est-1)||end===old.end)) return say("지난번보다 좁은 끝의 모양을 적고, 앉을 횟수를 줄인다.");
    if(shrinking) save(previous,Object.assign(old,{state:"smaller",closedAt:today(),used:pieces(previous).k}));
    save(week,{q,t,end,to,due,est,state:"open",closedAt:null});
    selected=week; done(shrinking?"더 작게 잘라 다시 뗐다.":editing?"덩이를 고쳤다.":"덩이를 뗐다. 책상에서 조각을 올리면 진행이 세어진다.");
  });
  JOURNEY.onChange(sync);   // db에서 덩이가 새로 왔을 수 있다

  return { sync, open, openCutFor, stoneSvg, pieces };
})();
