/* ───── 2주 실험: 구간을 미리 정하는 방식(B)이 평소 방식(A)보다 나에게 맞는지 직접 시험한다 ─────
   바탕: 민이 준 「Nov 16th」 정제본의 마지막 절. 이 절차는 연구가 검증한 프로그램이 아니라 내 작업에서 확인하는 시험이다.
   - 진행 중인 작업 하나(채석장 하나)를 골라 2주에 여덟 번 앉는다. 1회 50분(버거우면 시작 전에 30분으로, 여덟 번 모두 같게).
   - 난도가 비슷한 과제 둘을 한 쌍으로 묶어 네 쌍. 쌍마다 A·B 순서는 동전 던지기(Math.random)로 정한다. 같은 쌍은 이어진 날 비슷한 시각에.
   - 시간 배분: A = 45분 작업 + 5분 저장·기록 / B = 5분 범위·완료 조건 + 35분 작업 + 5분 완료 조건 점검 + 5분 저장·기록
     (30분이면 A 25+5, B 3+19+3+5). '책상에 올리기'가 오늘 지금 칸에 이 조각들을 올린다(조각 x = 회차, ph = 단계).
   - 끝나면 기록: 약속 시각에 앉았나 · 중단된 분 · 부담 0~10 · 수면·본업 침범 · 다음에 열 파일과 첫 행동 · 메모. 건너뛴 회차도 지우지 않는다.
   - 다음 날 아침 파일을 열기 전에 판정: 제 기능 · 혼자 성립 · 들어갈 자리(셋 다 예여야 쓸 수 있는 조각). 판정 목록엔 A·B를 가린다.
   - 네 번째 회차 뒤 20분 배치 점검. 도중에 시간·규칙을 바꾸면 적어 두고, 결과는 바꾸기 전과 뒤를 나눠 본다.
   - 멈춤: 부담이 두 회차 연속 8 이상이거나 수면·본업을 두 번 이상 침범하면 즉시 중단을 권한다. 다시 시작할 땐 바뀐 조건을 적는다.
   - 결과: 쓸 수 있는 조각 수(A·B 각 0~4, 쌍별 승패) · 실제로 결합한 조각 수와 수정량 · 다시 앉는 지속력(부담 중앙값, 제때 앉은 횟수).
     채택 기준은 첫날 적어 둔 것과 나란히 보이고, 결과에 따른 다음 행동 다섯 갈래 가운데 하나를 고른다.
   저장: JOURNEY.saveExperiment(meta/experiment). 1·2·3선 판정과 무관하다. 클래스 이름은 ex-로 시작한다. */
const EXPER=(()=>{
  const $=id=>document.getElementById(id);
  const ov=$("expOv"), box=$("exBody");
  const h=v=>esc(String(v??""));
  const today=()=>JOURNEY.todayKey();
  const md=k=>(+k.slice(5,7))+"/"+(+k.slice(8));
  const plus=(k,n)=>new Date(Date.parse(k+"T00:00:00Z")+n*864e5).toISOString().slice(0,10);
  const SPLIT={50:{A:[[45,"work"],[5,"log"]],B:[[5,"set"],[35,"work"],[5,"check"],[5,"log"]]},30:{A:[[25,"work"],[5,"log"]],B:[[3,"set"],[19,"work"],[3,"check"],[5,"log"]]}};
  const PH={set:"범위·완료 조건 정하기",check:"완료 조건 점검",log:"저장하고 기록"};
  const Q3=[["제 기능을 하는가","미리 정한 완료 조건을 채웠다"],["혼자 성립하는가","덧붙이는 설명 없이도 읽히거나 들린다"],["들어갈 자리가 있는가","전체 목차나 곡 구성에서 놓일 곳을 짚을 수 있다"]];
  const NEXT=[["more","조각 수도 늘고 전체와 연결도 잘된다","같은 방식으로 한 주 더 이어 간다"],
    ["link","조각은 늘었지만 전체 구조에 붙지 않는다","다음 회차는 새 조각 대신 조각 사이 연결에 쓴다"],
    ["short","매번 시간이 모자라 미완으로 끝난다","한 구간에 요구하는 기능을 하나로 줄인다"],
    ["search","자료를 찾고 확인하다 시간이 다 간다","자료 조사 회차를 쓰는 회차와 따로 둔다"],
    ["none","A·B 차이가 없거나 부담만 커진다","방식 채택을 미루고, 부담이 컸다면 주당 회차를 줄인다"]];
  let msg="", armed="", origin=null, recOpen=-1;   // recOpen: 기록 양식을 펼친 회차(화면 상태라 저장하지 않는다)

  const get=()=>JOURNEY.experiment();
  const put=x=>Promise.resolve(JOURNEY.saveExperiment(x)).catch(e=>console.error(e));
  const recorded=x=>x.s.filter(v=>v.rec||v.skip).length;
  const current=x=>x.s.findIndex(v=>!v.rec&&!v.skip);
  const toJudge=x=>x.s.map((v,i)=>({v,i})).filter(({v})=>v.rec&&!v.skip&&!v.judge&&v.date<today());
  const median=a=>{ if(!a.length) return null; const s=[...a].sort((p,q)=>p-q), m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; };
  /* 멈춤 규칙: 부담 두 회차 연속 8 이상, 또는 수면·본업 침범 두 번 */
  function stopReason(x){
    const r=x.s.filter(v=>v.rec&&!v.skip).map(v=>v.rec).sort((a,b)=>a.at-b.at), last2=r.slice(-2);
    if(last2.length===2&&last2.every(v=>v.burden>=8)) return "부담이 두 회차 연속 8 이상이었다.";
    const sl=r.filter(v=>v.sleep).length; if(sl>=2) return "수면이나 본업 시간을 "+sl+"번 침범했다.";
    return "";
  }
  const qName=id=>(JOURNEY.quarries().find(q=>q.id===id)||{}).name||"";
  const slotsOf=x=>{ const q=JOURNEY.quarries().find(v=>v.id===x.q); return q&&q.outline?q.outline.split("\n").map(v=>v.trim()).filter(Boolean):[]; };
  const btn=(label,act,value,cls)=>'<button type="button" class="dk-btn'+(cls?" "+cls:"")+'" data-xa="'+act+'" data-value="'+h(value??"")+'">'+label+'</button>';

  /* ── 시작 전: 준비 ── */
  function setupForm(){
    const qs=JOURNEY.quarries().filter(q=>!q.rest), diffs=["쉬움","보통","어려움"];
    return '<p class="qr-lead">지금 붙든 작업 하나로 2주 동안 여덟 번 앉는다. 쌍마다 한 번은 평소대로(A), 한 번은 구간과 완료 조건을 먼저 정하고(B) 한다.</p>'+
      '<p class="qr-soft">재료는 서로 기대지 않는 단위 여덟 개로 고른다. 예: 한 글에 들어갈 사례 단락 여덟 개, 한 곡에 시도할 독립된 구간 여덟 개. 앞 과제를 끝내야 다음으로 갈 수 있는 묶음은 피한다.</p>'+
      '<form id="exSetup" class="qr-form">'+
      '<div class="qr-two"><label>어느 채석장의 작업인가<select name="q"><option value="">채석장 없이</option>'+qs.map(q=>'<option value="'+h(q.id)+'">'+h(q.name)+'</option>').join("")+'</select></label>'+
      '<label>한 번 앉는 시간<select name="unit"><option value="50">50분</option><option value="30">30분 (50분이 버거우면 지금 정한다)</option></select></label></div>'+
      '<label>전체의 목적 <small>A·B에 똑같이 적용한다</small><input name="goal" required maxlength="160" placeholder="예: 한 선율이 반복되다 변주되는 짧은 곡"></label>'+
      [0,1,2,3].map(k=>'<fieldset class="ex-pair"><legend>'+(k+1)+'쌍 <small>난도가 비슷한 두 과제</small></legend>'+[0,1].map(j=>{ const n=k*2+j;
        return '<div class="ex-task"><input name="t'+n+'" required maxlength="90" placeholder="과제 '+(n+1)+'" aria-label="과제 '+(n+1)+'"><select name="d'+n+'" aria-label="과제 '+(n+1)+' 예상 난도">'+diffs.map(d=>'<option'+(d==="보통"?" selected":"")+'>'+d+'</option>').join("")+'</select></div>'; }).join("")+'</fieldset>').join("")+
      '<label>채택 기준 <small>오늘 적고 바꾸지 않는다. 더 나은 결과를 위해 감수할 비용의 상한이다</small><textarea name="rule" rows="2" maxlength="300" required>B 방식에서 쓸 수 있는 조각이 1개 이상 더 나오고, 부담 중앙값 상승 폭이 2점 미만이면 다음 주에도 B 방식을 유지한다.</textarea></label>'+
      '<p class="qr-soft">참고 자료는 시작 전에 열어 두고, 다른 사람의 피드백은 여덟 번 비교가 끝난 뒤에 받는다.</p>'+
      '<div class="qr-actions"><button type="submit" class="dk-btn dk-go">동전 던져 순서 정하고 시작</button></div></form>';
  }
  /* ── 진행 중 ── */
  function sessionRow(x,v,i,cur){
    const st=v.skip?"건너뜀":v.rec?(v.judge?(v.judge==="111"?"쓸 수 있는 조각":"판정 "+v.judge.split("").map(c=>c==="1"?"○":"×").join("")):v.date<today()?"판정 기다림":"내일 아침 판정"):i===cur?"다음 차례":"";
    return '<li class="ex-row'+(i===cur?" now":"")+(v.judge==="111"?" ok":"")+'"><span class="ex-n">'+(i+1)+'</span><span class="ex-pairn">'+(v.pair+1)+'쌍</span>'+
      '<span class="ex-m" data-m="'+v.m+'">'+v.m+'</span><span class="ex-task-t">'+h(x.tasks[v.task].t)+' <small>'+h(x.tasks[v.task].d)+'</small></span><span class="ex-st">'+(v.date?md(v.date)+' · ':"")+st+'</span></li>';
  }
  function curCard(x,i){
    const v=x.s[i], t=x.tasks[v.task], split=SPLIT[x.unit][v.m];
    let s='<div class="qr-cut ex-cur"><h4>'+(i+1)+'회차 · '+(v.pair+1)+'쌍 · '+v.m+' 방식 · '+h(t.t)+'</h4>'+
      '<p class="qr-meta">'+split.map(([m,ph])=>m+'분 '+(ph==="work"?"작업":PH[ph])).join(" → ")+'</p>';
    if(v.m==="B") s+='<form class="qr-form ex-plan" data-i="'+i+'"><p class="qr-soft">성벽에서 이번에 쌓을 구간을 정한다. 전체의 목적 · '+h(x.goal)+'</p>'+
      '<label>이번 구간<input name="part" required maxlength="140" value="'+h(v.plan&&v.plan.part||"")+'" placeholder="예: 같은 선율이 한 번 변주되는 60초"></label>'+
      '<label>완료 조건 <small>무엇이 있으면 끝인가</small><input name="cond" required maxlength="140" value="'+h(v.plan&&v.plan.cond||"")+'" placeholder="예: 도입·변화·마무리가 들리는 오디오 파일 1개"></label>'+
      '<div class="qr-actions"><button type="submit" class="dk-btn">구간 저장</button></div></form>';
    else s+='<p class="qr-soft">평소대로 한다. 끝에 남길 최소 결과물의 기준은 B와 같다 · '+h(x.goal)+'</p>';
    const ready=v.m==="A"||(v.plan&&v.plan.part&&v.plan.cond);
    s+='<div class="qr-actions">'+(ready?btn("책상에 올리기","desk",i,"dk-go"):'<span class="qr-soft">B 방식은 구간과 완료 조건을 먼저 저장한다.</span>')+btn("기록하기","rec",i)+btn("건너뛴 회차로 남기기","skip",i,"qr-small")+'</div>';
    return s+(recOpen===i?recForm(i):"")+'</div>';
  }
  function recForm(i){
    return '<form class="qr-form ex-rec" data-i="'+i+'"><p class="qr-soft">약속한 시간이 되면 미완성이어도 그대로 저장하고 손을 뗀다. 그다음 적는다.</p>'+
      '<fieldset class="qr-est"><legend>약속한 시각에 앉았나</legend><label><input type="radio" name="ontime" value="1" required><span>예</span></label><label><input type="radio" name="ontime" value="0"><span>아니오</span></label></fieldset>'+
      '<fieldset class="dk-burden"><legend>지금 느끼는 부담 <small>0 전혀 없음 · 10 다시 앉기 어려울 만큼 소진</small></legend><div class="dk-burden-row">'+
        Array.from({length:11},(_,k)=>'<label class="ex-b'+(k>=8?" hi":"")+'"><input type="radio" name="burden" value="'+k+'" required><span>'+k+'</span></label>').join("")+'</div></fieldset>'+
      '<div class="qr-two"><label>중단된 시간(분)<input name="intr" type="number" min="0" max="120" value="0"></label><label class="dk-fin-chk ex-sleep"><input type="checkbox" name="sleep"> 수면이나 본업 시간을 침범했다</label></div>'+
      '<label>다음에 열 파일과 첫 행동 한 줄<input name="next" required maxlength="160" placeholder="예: 내일 같은 시각, 3번 단락 파일을 열어 첫 예시의 출처를 확인한다"></label>'+
      '<label>메모 <small>저장 경로, 남은 연결 과제, 보류한 질문</small><input name="note" maxlength="200"></label>'+
      '<div class="qr-actions"><button type="submit" class="dk-btn dk-go">기록 저장</button>'+btn("취소","recclose",i)+'</div></form>';
  }
  function judgeCards(x){
    const items=toJudge(x); if(!items.length) return "";
    const slots=slotsOf(x);
    return '<section><h3>다음 날 아침 판정 <small>파일에 손대기 전에 · 어느 방식이었는지는 가렸다</small></h3>'+items.map(({v,i})=>
      '<form class="qr-form ex-judge" data-i="'+i+'"><p><b>'+h(x.tasks[v.task].t)+'</b> <small>'+md(v.date)+'</small>'+(v.plan&&v.plan.cond?'<br><small>완료 조건 · '+h(v.plan.cond)+'</small>':"")+'</p>'+
        Q3.map(([q,hint],k)=>'<fieldset class="qr-est"><legend>'+(k+1)+'. '+q+' <small>'+hint+'</small></legend>'+
          (k===2&&slots.length?'<select name="q2" required aria-label="들어갈 자리"><option value="">고른다</option>'+slots.map(sl=>'<option value="'+h(sl)+'">'+h(sl)+'</option>').join("")+'<option value="-">자리가 없다</option></select>'
            :'<label><input type="radio" name="q'+k+'" value="1" required><span>예</span></label><label><input type="radio" name="q'+k+'" value="0"><span>아니오</span></label>')+'</fieldset>').join("")+
        '<div class="qr-actions"><button type="submit" class="dk-btn dk-go">판정 저장</button></div></form>').join("")+
      '<p class="qr-soft">다른 사람에게 판정을 부탁할 때도 A·B를 가리고 보여 준다.</p></section>';
  }
  /* ── 결과 ── */
  function results(x){
    const cut=(x.changes||[]).length?x.changes[0].at:null;   // 처음 바꾼 때 앞뒤를 나눈다
    const part=(from,to)=>{ const ss=x.s.filter(v=>v.rec&&!v.skip&&(cut==null||(v.rec.at>=from&&v.rec.at<to)));
      const by=m=>{ const a=ss.filter(v=>v.m===m); return {n:a.length,ok:a.filter(v=>v.judge==="111").length,judged:a.filter(v=>v.judge).length,
        med:median(a.map(v=>v.rec.burden)),on:a.filter(v=>v.rec.ontime).length,intr:a.reduce((t,v)=>t+(v.rec.intr||0),0)}; };
      return {A:by("A"),B:by("B"),ss}; };
    const table=(R,cap)=>'<table class="ex-tab"><caption>'+cap+'</caption><thead><tr><th></th><th>A 평소</th><th>B 구간 정하기</th></tr></thead><tbody>'+
      '<tr><th>쓸 수 있는 조각</th><td>'+R.A.ok+' <small>/ 판정 '+R.A.judged+'</small></td><td>'+R.B.ok+' <small>/ 판정 '+R.B.judged+'</small></td></tr>'+
      '<tr><th>부담 중앙값</th><td>'+(R.A.med??"–")+'</td><td>'+(R.B.med??"–")+'</td></tr>'+
      '<tr><th>제때 앉은 횟수</th><td>'+R.A.on+' <small>/ '+R.A.n+'</small></td><td>'+R.B.on+' <small>/ '+R.B.n+'</small></td></tr>'+
      '<tr><th>중단된 시간</th><td>'+R.A.intr+'분</td><td>'+R.B.intr+'분</td></tr></tbody></table>';
    const all=part(0,99);
    let s=cut==null?table(all,"여덟 회차 비교"):table(part(0,cut),"바꾸기 전 "+cut+"회차")+table(part(cut,99),"바꾼 뒤");
    const pairs=[0,1,2,3].map(k=>{ const ps=x.s.filter(v=>v.pair===k&&v.judge); if(ps.length<2) return "–"; const a=ps.find(v=>v.m==="A"), b=ps.find(v=>v.m==="B");
      const ua=a&&a.judge==="111"?1:0, ub=b&&b.judge==="111"?1:0; return ua===ub?"같음":ub>ua?"B":"A"; });
    s+='<p class="ex-pairs">쌍별 승패 · '+pairs.map((w,k)=>(k+1)+'쌍 <b>'+w+'</b>').join(" · ")+'</p>';
    s+='<form class="qr-form ex-comb"><div class="qr-two"><label>실제로 결합한 조각 · A<input name="ca" type="number" min="0" max="4" value="'+h(x.comb&&x.comb.A)+'"></label>'+
      '<label>실제로 결합한 조각 · B<input name="cb" type="number" min="0" max="4" value="'+h(x.comb&&x.comb.B)+'"></label></div>'+
      '<label>연결하면서 더한 수정량 <small>전체 구조에 배치해 보고 적는다</small><input name="fix" maxlength="200" value="'+h(x.comb&&x.comb.fix)+'"></label>'+
      '<div class="qr-actions"><button type="submit" class="dk-btn">저장</button></div></form>';
    s+='<p class="ex-rule"><b>첫날 적은 채택 기준</b><br>'+h(x.rule)+'</p>';
    s+='<fieldset class="ex-next"><legend>결과에 따라 다음 행동을 고른다</legend>'+NEXT.map(([k,cond,act])=>'<label><input type="radio" name="next" value="'+k+'"'+(x.choice===k?" checked":"")+'><span><b>'+cond+'</b><br>→ '+act+'</span></label>').join("")+'</fieldset>';
    return s;
  }
  function render(){
    const x=get();
    if(!x){ box.innerHTML='<p class="qr-msg" id="exMsg" role="status" tabindex="-1">'+h(msg)+'</p>'+setupForm(); return; }
    const cur=current(x), rec=recorded(x), why=stopReason(x), finished=cur<0;
    let s='<p class="qr-msg" id="exMsg" role="status" tabindex="-1">'+h(msg)+'</p>'+
      '<p class="qr-meta">'+(x.q?h(qName(x.q))+' · ':"")+x.unit+'분 · '+md(x.start)+' 시작 · 전체의 목적: '+h(x.goal)+'</p>';
    if(x.state==="stop") s+='<section class="ex-stop"><h3>실험을 멈췄다</h3><p>'+h(x.stopWhy||"")+'</p><p class="qr-soft">시간 단위나 구간 크기를 고쳐 다시 시작할 수 있다. 바뀐 조건을 새로 적는다.</p>'+restartForm()+'</section>';
    else if(why) s+='<section class="ex-stop"><h3>즉시 멈춘다</h3><p>'+h(why)+' 이대로 계속하지 않는다.</p><div class="qr-actions">'+btn("실험 멈추기","stop",why,"dk-go")+'</div></section>';
    s+='<section><h3>여덟 회차 <small>'+rec+'/8 · 같은 쌍은 이어진 날 비슷한 시각에</small></h3><ol class="ex-list">'+x.s.map((v,i)=>sessionRow(x,v,i,x.state==="stop"?-1:cur)).join("")+'</ol></section>';
    if(x.state!=="stop"&&!why&&cur>=0) s+='<section><h3>다음 회차</h3>'+curCard(x,cur)+'</section>';
    s+=judgeCards(x);
    if(rec>=4&&!(x.mid&&x.mid.done)) s+='<section class="ex-mid"><h3>네 번째 회차 뒤 · 20분 배치 점검</h3><p class="qr-soft">지금까지 만든 조각을 전체 목차나 곡의 흐름 위에 놓아 본다. 어디에 빈틈이 남았는지, 새 조각보다 잇는 일이 급한지 본다.</p>'+
      '<form class="qr-form ex-midf"><label>본 것<textarea name="note" rows="2" maxlength="400" required placeholder="예: 2·3번 단락 사이가 끊긴다. 다음 두 회차는 연결에 쓴다."></textarea></label><div class="qr-actions"><button type="submit" class="dk-btn">점검했다</button></div></form></section>';
    if(x.mid&&x.mid.done) s+='<p class="qr-soft">배치 점검 · '+h(x.mid.note)+'</p>';
    if(rec) s+='<section><h3>'+(finished?"결과":"지금까지")+' <small>세 지표를 하나로 합치지 않는다</small></h3>'+results(x)+'</section>';
    if(finished&&x.state!=="stop") s+='<p class="qr-soft">다음 단계에서는 구간 크기와 시간을 그대로 두고, 미리 동의한 한 사람에게 정해진 날마다 결과물을 보내는 것과 혼자 저장하는 것을 비교한다. 받는 사람에게는 세 가지 판정(기능 · 독립 · 자리)으로만 짧게 답해 달라고 한다.</p>';
    s+='<section><h3>바꾼 것 <small>시간이나 규칙을 바꾸면 적어 둔다. 앞의 기록은 그대로 둔다</small></h3>'+((x.changes||[]).length?'<ul class="ex-changes">'+x.changes.map(c=>'<li>'+md(c.date)+' · '+c.at+'회차 뒤 · '+h(c.t)+'</li>').join("")+'</ul>':"")+
      '<form class="qr-form ex-chg"><label class="ex-inline">바꾼 것<input name="t" required maxlength="160" placeholder="예: 5회차부터 30분으로 줄였다"></label><button type="submit" class="dk-btn qr-small">적기</button></form></section>';
    s+='<div class="qr-actions ex-end">'+btn(armed==="del"?"정말 지울까? 한 번 더":"실험 지우기","del","","qr-small")+'</div>';
    box.innerHTML=s;
  }
  function restartForm(){ return '<form class="qr-form ex-restart"><label>바뀐 조건<input name="t" required maxlength="160" placeholder="예: 30분 단위, 쌍마다 과제 크기를 반으로"></label><div class="qr-actions"><button type="submit" class="dk-btn">새 조건으로 다시 시작</button></div></form>'; }

  function open(trigger){ origin=trigger||null; msg=""; armed=""; if(!$("quarryOv").hidden) $("quarryOv").hidden=true; ov.hidden=false; ov.scrollTop=0; render(); $("exClose").focus({preventScroll:true}); }
  function close(){ if(ov.hidden) return; ov.hidden=true; if(origin&&origin.isConnected) origin.focus({preventScroll:true}); }
  function done(text,x){ msg=text; armed=""; if(x!==undefined) put(x); render(); $("exMsg").focus({preventScroll:true}); if(typeof QUARRY!=="undefined") QUARRY.sync(); }

  document.addEventListener("click",e=>{
    const b=e.target.closest("[data-xa]"); if(!b) return; const a=b.dataset.xa, v=b.dataset.value, x=get();
    if(a==="open") return open(b);
    if(a==="close") return close();
    if(!x) return;
    const i=+v, ss=x.s[i];
    if(a==="desk"&&ss){ const split=SPLIT[x.unit][ss.m], t=x.tasks[ss.task].t;
      const why=DESK.addPieces(split.map(([m,ph])=>({m,t:(i+1)+"회차 "+ss.m+" · "+(ph==="work"?t:PH[ph]),x:i,ph})));
      if(why) return done(why); ss.date=today(); put(x); return close(); }
    if(a==="rec"&&ss){ recOpen=i; msg=""; render(); return box.querySelector(".ex-rec input")?.focus(); }
    if(a==="recclose"){ recOpen=-1; return render(); }
    if(a==="skip"&&ss){ if(armed!=="skip"+i){ armed="skip"+i; b.textContent="건너뜀으로 남길까? 한 번 더"; return; }
      Object.assign(ss,{skip:1,date:today()}); return done((i+1)+"회차를 건너뛴 회차로 남겼다. 지우지 않는다.",x); }
    if(a==="stop"){ Object.assign(x,{state:"stop",stopWhy:v}); return done("실험을 멈췄다. 기록은 그대로 남는다.",x); }
    if(a==="del"){ if(armed!=="del"){ armed="del"; return render(); } armed=""; msg="실험을 지웠다."; put(null); return render(); }
  });
  ov.addEventListener("click",e=>{ if(e.target===ov) close(); });
  document.addEventListener("keydown",e=>{ if(!ov.hidden&&e.key==="Escape") close(); });
  box.addEventListener("change",e=>{ if(!e.target.closest(".ex-next")) return; const x=get(); if(!x) return; x.choice=e.target.value; put(x); });   // 결과의 다음 행동만(기록 양식의 '다음 첫 행동'과 섞지 않는다)
  box.addEventListener("submit",e=>{
    e.preventDefault(); const f=e.target, d=new FormData(f), text=n=>String(d.get(n)??"").trim(), x=get();
    if(f.id==="exSetup"){
      const tasks=Array.from({length:8},(_,n)=>({t:text("t"+n),d:text("d"+n)||"보통"}));
      if(tasks.some(t=>!t.t)||!text("goal")||!text("rule")) return done("여덟 과제와 전체의 목적, 채택 기준을 모두 적는다.");
      const order=[0,1,2,3].map(()=>Math.random()<.5?"AB":"BA"), s=[];
      order.forEach((o,k)=>[0,1].forEach(j=>s.push({pair:k,task:k*2+j,m:o[j],date:""})));
      return done("동전을 던졌다. "+order.map((o,k)=>(k+1)+"쌍 "+o[0]+"→"+o[1]).join(" · ")+". 같은 쌍은 이어진 날 비슷한 시각에 한다.",
        {v:1,q:text("q"),unit:+text("unit")===30?30:50,goal:text("goal"),tasks,order,rule:text("rule"),start:today(),state:"run",s,changes:[],mid:null,comb:null,choice:""});
    }
    if(!x) return;
    const i=+f.dataset.i, ss=x.s[i];
    if(f.classList.contains("ex-plan")&&ss){ ss.plan={part:text("part"),cond:text("cond")}; return done("구간과 완료 조건을 적었다. 이제 책상에 올린다.",x); }
    if(f.classList.contains("ex-rec")&&ss){
      ss.rec={at:recorded(x)+1,ontime:text("ontime")==="1"?1:0,burden:+text("burden"),intr:Math.max(0,Math.min(120,+text("intr")||0)),sleep:d.get("sleep")?1:0,next:text("next"),note:text("note")};
      ss.date=ss.date||today(); recOpen=-1;
      const why=stopReason(x);
      return done(why?why+" 즉시 멈춘다.":(i+1)+"회차를 기록했다. 쓸 만한지는 내일 아침 파일을 열기 전에 판정한다.",x);
    }
    if(f.classList.contains("ex-judge")&&ss){
      const sel3=f.querySelector('select[name="q2"]'), v2=text("q2"), ans=[text("q0"),text("q1"),sel3?(v2==="-"?"0":v2?"1":""):v2];
      if(ans.some(v=>!v)) return;
      ss.judge=ans.join(""); ss.jd=today(); if(sel3&&v2&&v2!=="-"){ ss.slot=v2; if(typeof QUARRY!=="undefined") QUARRY.place(ss.date,v2,x.tasks[ss.task].t,ss.judge==="111",x.q); }
      return done(ss.judge==="111"?"쓸 수 있는 조각 하나.":"판정을 적었다.",x);
    }
    if(f.classList.contains("ex-midf")){ x.mid={done:1,note:text("note"),date:today()}; return done("배치 점검을 적었다.",x); }
    if(f.classList.contains("ex-chg")){ x.changes=[...(x.changes||[]),{at:recorded(x),t:text("t"),date:today()}]; return done("바꾼 것을 적었다. 결과는 바꾸기 전과 뒤를 나눠 본다.",x); }
    if(f.classList.contains("ex-comb")){ x.comb={A:text("ca"),B:text("cb"),fix:text("fix")}; return done("결합한 조각을 적었다.",x); }
    if(f.classList.contains("ex-restart")){
      const s=x.s.map(v=>({pair:v.pair,task:v.task,m:v.m,date:""}));
      return done("새 조건으로 다시 시작했다. 앞의 기록은 바뀐 것에 남겼다.",
        Object.assign(x,{state:"run",stopWhy:"",s,start:today(),mid:null,comb:null,choice:"",changes:[...(x.changes||[]),{at:0,t:"중단 뒤 다시 시작 · "+text("t"),date:today(),prev:x.s.filter(v=>v.rec).length}]}));
    }
  });
  JOURNEY.onChange(()=>{ if(!ov.hidden) render(); });

  return {
    open,
    /* 책상이 묻는다: 이 회차를 아직 기록하지 않았나 */
    needsRecord(i){ const x=get(); return !!(x&&x.state==="run"&&x.s[i]&&!x.s[i].rec&&!x.s[i].skip); },
    /* 책상의 쉬어 가기 알림이 함께 센다 */
    records(){ const x=get(); return x?x.s.filter(v=>v.rec&&!v.skip).map(v=>({date:v.date,burden:v.rec.burden,sleep:v.rec.sleep})):[]; },
    /* 머리말의 덩이 띠 옆 한 줄 */
    stripText(){ const x=get(); if(!x||x.state!=="run") return ""; const j=toJudge(x).length, c=current(x);
      return j?"실험 판정 "+j+"개":c>=0?"실험 "+(c+1)+"/8 · "+x.tasks[x.s[c].task].t+" ("+x.s[c].m+")":"실험 결과 보기"; },
    /* 채석장 화면의 실험 칸 */
    card(){ const x=get();
      if(!x) return '<p class="qr-soft">한 작업을 골라 2주에 여덟 번 앉는다. 쌍마다 평소 방식(A)과 구간을 먼저 정하는 방식(B)을 번갈아 하고, 쓸 수 있는 조각 · 결합한 조각 · 다시 앉는 지속력을 따로 비교한다.</p><div class="qr-actions">'+btn("실험 준비하기","open","","dk-go")+'</div>';
      return '<p>'+(x.state==="stop"?"멈춘 실험":current(x)<0?"여덟 회차를 마쳤다":"진행 중 · "+recorded(x)+"/8")+' · '+h(x.goal)+'</p><div class="qr-actions">'+btn("실험 열기","open","","dk-go")+'</div>'; },
  };
})();
