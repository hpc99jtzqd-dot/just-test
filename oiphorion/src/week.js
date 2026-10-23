/* ───── 한 주 보기와 일요일 점프 (worker-3) ─────
   다른 파일이 기대는 계약:
   WEEK.show() / WEEK.hide()   한 주 보기 열기/닫기 (하루 보기 ↔ 한 주 보기)
   WEEK.playJump()             일요일 정상 점프 연출. 결과는 JOURNEY.week()/progress()에서 읽는다
*/
const WEEK = (() => {
  const $ = id => document.getElementById(id);
  const panel = $("wkPanel"), svg = $("wkSvg"), daysEl = $("wkDays"), jumpEl = $("wkJump");
  const NAMES = ["일","월","화","수","목","금","토"];
  const LINE_NAME = {1:"1선 큰길", 2:"2선 들꽃 샛길", 3:"3선 오솔길"};
  const LINE_COLOR = {1:"#ddd9c9", 2:"#6cbf42", 3:"#d9a441"};
  // 월~토 구간의 끝점. 마지막은 일요일 산꼭대기
  const P = [[24,274],[120,250],[50,214],[170,190],[80,150],[210,128],[290,66]];
  let open = false, playing = null;

  const dowOf = key => key ? new Date(key + "T00:00:00Z").getUTCDay() : -1;
  const isSunday = () => dowOf(JOURNEY.todayKey()) === 0;
  const seg = i => { const a = P[i], b = P[i+1], mx = (a[0]+b[0])/2;
    return `M${a[0]} ${a[1]} C${mx} ${a[1]} ${mx} ${b[1]} ${b[0]} ${b[1]}`; };
  const mid = i => { const a = P[i], b = P[i+1]; return [(a[0]+b[0])/2, (a[1]+b[1])/2]; };

  const HAT_D = "M-9 -3 Q-11 -8 -6 -11 Q0 -15 6 -11 Q10 -9 8 -5 L6 -3 Q10 -3 11 0 Q5 2 -1 0 L-7 1 Z";
  const hatSvg = (x, y, rot) => `<g class="wk-hat" transform="translate(${x} ${y}) rotate(${rot})"><path d="${HAT_D}" fill="#588fab" stroke="#315570" stroke-width="1"/></g>`;
  const trampBroken = (x, y) => `<g transform="translate(${x} ${y}) rotate(-18)"><ellipse rx="13" ry="6" fill="#121c3c" stroke="#2ec4ef" stroke-width="3"/><path d="M-3 -6 L1 -1 L-2 2 L3 6" stroke="#fff" stroke-width="1.8" fill="none"/></g>`;
  const chipHat = `<svg viewBox="-10 -20 20 24" aria-hidden="true"><path d="${HAT_D}" fill="#d42e22" stroke="#7c120c" stroke-width="1"/></svg>`;
  const chipTramp = `<svg viewBox="-16 -9 32 18" aria-hidden="true"><ellipse rx="13" ry="6" fill="#121c3c" stroke="#0b6d9c" stroke-width="3"/><path d="M-3 -6 L1 -1 L-2 2 L3 6" stroke="#ffd23a" stroke-width="2" fill="none"/></svg>`;

  function weekDays(w) {
    const real = (w.days || []).filter(d => d.dow !== 0).slice(0, 6);
    return Array.from({length: 6}, (_, i) => real.find(d => d.dow === i + 1) || real[i] || {dow: i+1, future: true});
  }

  function displayState(d) {
    let since=null;try{since=JSON.parse(store.get("oi.journey.since"));}catch(e){}
    return d.future?"future":d.inferred?"inferred":d.line?"recorded":d.key===JOURNEY.todayKey()?"pending":JOURNEY.online&&since&&d.key<since?"before":"unknown";
  }
  const EMPTY_LABEL={future:"아직",inferred:"기록 없음",pending:"오늘 · 미입력",before:"기록 시작 전",unknown:"기록 확인 불가"};

  function render() {
    const w = JOURNEY.week(), pr = JOURNEY.progress(), days = weekDays(w), sun = isSunday();
    $("wkTitle").innerHTML = w.practice ? "연습 주" : `${w.weekNo}주째 <small>/ 10주</small>`;
    $("wkOffline").hidden = !!JOURNEY.online;
    $("wkPending").hidden = !pr.pendingJump;
    const lostOn = w.trampolineLostOn || "", theme=MAPS[pr.map-1];
    svg.style.background=`linear-gradient(#c9e0e9,${theme.color}55)`;
    let g = `<path d="M-10 220 L85 132 L128 160 L205 70 L243 111 L302 51 L380 170 L400 300 L-10 300Z" fill="#9bb4c1" opacity=".65"/>
      <path d="M-10 300 L126 162 L211 91 L235 48 L242 105 L266 64 L276 117 L295 81 L339 166 L400 218 L400 300Z" fill="#8c979b"/>
      <path d="M126 162 L235 48 L220 112 L180 156 L193 129Z M242 105 L266 64 L260 109 L276 117 L254 121Z" fill="#edf2f3"/>
      <path d="M-10 300 L-10 260 Q87 222 126 162 Q183 185 211 144 Q272 162 339 213 L400 265 L400 300Z" fill="${theme.color}"/>
      <path d="M-10 300 L-10 272 Q96 256 143 204 Q214 246 274 235 L400 300Z" fill="#86a557" opacity=".85"/>`;
    // 길: 바깥 윤곽 + 색 선. 미래는 점선
    days.forEach((d, i) => {
      const dd = seg(i);
      if (d.future) { g += `<path d="${dd}" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="2 9" stroke-linecap="round"/>`; return; }
      const wd = d.line === 1 ? 11 : d.line === 2 ? 8 : 5, gone = lostOn && d.key > lostOn;
      g += `<path d="${dd}" fill="none" stroke="rgba(16,36,63,.45)" stroke-width="${wd+3}" stroke-linecap="round"/>` +
           `<path d="${dd}" fill="none" stroke="${d.inferred ? "#b9c4cf" : LINE_COLOR[d.line] || "#b9c4cf"}" stroke-width="${wd}" stroke-linecap="round"${d.line === 3 ? ' stroke-dasharray="10 5"' : ""}${gone ? ' opacity=".6"' : ""}/>`;
    });
    days.forEach((d, i) => {
      const [x, y] = mid(i);
      g += `<circle cx="${x}" cy="${y-14}" r="11" fill="#fff" stroke="#10243f" stroke-width="1.5"/><text x="${x}" y="${y-9}" text-anchor="middle" font-size="14" fill="#10243f">${NAMES[(i+1)%7]}</text>`;
      if (d.hatLost) g += hatSvg(x + 16, y + 10, 38);
      if (d.trampolineBreaks) g += trampBroken(x - 14, y + 16);
    });
    const sx = P[6][0], sy = P[6][1], label = sun ? "일요일 점프 보기" : "일요일 꼭대기";
    g += `<g class="wk-summit${sun ? " on" : ""}" id="wkSummit" ${sun ? 'role="button" tabindex="0"' : 'role="img"'} aria-label="${label}">` +
         `<rect x="${sx-34}" y="${sy-52}" width="68" height="62" fill="transparent"/>` +
         `<line x1="${sx}" y1="${sy}" x2="${sx}" y2="${sy-34}" stroke="#10243f" stroke-width="2.5"/>` +
         `<path class="wk-flag" d="M${sx} ${sy-34} L${sx+22} ${sy-27} L${sx} ${sy-19} Z" fill="#ff5a4a" stroke="#a8231a" stroke-width="1.2"/>` +
         `<text x="${sx}" y="${sy+24}" text-anchor="middle" font-size="13" fill="#10243f" stroke="#fff" stroke-width="3" paint-order="stroke">${sun ? "일요일 · 눌러서 점프" : "일요일"}</text></g>`;
    // 표지 내용: 두 줄 카드(폰) 또는 한 줄 알약(넓은 화면). 모자·트램펄린 그림은 오른쪽 끝.
    const mapLabel=(b,title,word,d)=>`<rect width="${b.w}" height="${b.h}" rx="9" fill="#fffbee" fill-opacity=".96" stroke="#6c8064"/>`+
      (b.h<40?`<text x="10" y="21" font-size="13" fill="#243e33">${title} <tspan fill="#41523a" font-size="11">${word}</tspan></text>`+(d.hatLost?hatSvg(b.w-14,b.h/2+4,20):'')+(d.trampolineBreaks?trampBroken(b.w-38,b.h/2+5):'')
      :`<text x="10" y="20" fill="#243e33" font-size="14">${title}</text><text x="10" y="42" fill="#41523a" font-size="11">${word}</text>`+(d.hatLost?hatSvg(b.w-16,43,25):'')+(d.trampolineBreaks?trampBroken(b.w-43,43):''));
    panel.classList.toggle("wk-3d",MAP_VIEW.is3D);
    if(MAP_VIEW.is3D){
      svg.setAttribute("viewBox",`0 0 ${VW.W} ${VW.H}`);svg.style.background="none";
      const sections=MAP_VIEW.sections(), anchors=[MAP_VIEW.summit(),...sections.map(s=>s.screen)],boxes=MAP_SCENES.labels(anchors,VW.W,VW.H);g="";
      sections.forEach((section,i)=>{
        const d=days[i], [x,y]=section.screen, line=d.line, label=EMPTY_LABEL[displayState(d)]||(line+'선');
        const path="M"+section.points.map(p=>p.slice(0,2).join(" ")).join(" L");
        const b=boxes[i+1],cx=b.x+b.w/2,cy=b.y+b.h/2;
        g+=`<path data-week-section="${d.key}" d="${path}" fill="none" stroke="${LINE_COLOR[line]||'#e5e7e4'}" stroke-width="${line===1?6:line===2?4:2.5}" ${d.future||!line||line===3?'stroke-dasharray="4 7"':''} opacity=".9"/>
          <path d="M${x} ${y} L${cx} ${cy}" stroke="#53674e" stroke-width="1" fill="none"/><circle cx="${x}" cy="${y}" r="3" fill="#fff9db"/>
          <g class="wk-map-label" data-state="${displayState(d)}" data-key="${d.key}" ${line?'data-line="'+line+'"':''} transform="translate(${b.x} ${b.y})">${mapLabel(b,NAMES[i+1]+(line?' · '+line+'선':''),EMPTY_LABEL[displayState(d)]||({1:'큰길',2:'들꽃',3:'오솔길'})[line]||'—',d)}</g>`;
      });
      const [x,y]=MAP_VIEW.summit(),b=boxes[0];g+=`<path d="M${x} ${y} L${b.x+b.w/2} ${b.y+b.h}" stroke="#977846" fill="none"/><g id="wkSummit" class="wk-summit wk-map-label${sun?' on':''}" role="${sun?'button':'img'}" ${sun?'tabindex="0"':''} aria-label="${label}" transform="translate(${b.x} ${b.y})"><rect width="${b.w}" height="${b.h}" rx="12" fill="#fff8d9" stroke="#977846"/>${b.h<40?`<text x="10" y="21" fill="#3c4935" font-size="13">⚑ 일요일 · ${sun?'눌러서 점프':'정상'}</text>`:`<text x="10" y="23" fill="#3c4935" font-size="14">⚑ 일요일 · 정상</text><text x="10" y="43" fill="#3c4935" font-size="11">${sun?'눌러서 점프':'한 주의 도착점'}</text>`}</g>`;
      const current=Math.max(0,Math.min(5,(dowOf(JOURNEY.todayKey())+6)%7)), pos=sun?MAP_VIEW.summit():sections[current].screen;
      let today=days[current];if(sun){let record=null;try{record=JSON.parse(store.get("oi.journey.days")||"{}")[JOURNEY.todayKey()];}catch(e){}today={line:record?.line,hatLost:record?.line===2};}
      const mode=JOURNEY.trampolineFor(JOURNEY.todayKey()), tramp=mode==='gone'?'none':today?.line===3?'feet':'back';
      g+=`<svg class="wk-dwarf" data-hat="${today?.hatLost?'0':'1'}" data-tramp="${tramp}" x="${pos[0]-15}" y="${pos[1]-6}" width="30" height="40" viewBox="0 0 40 54">${document.getElementById('dwarf').innerHTML}</svg>`;
    }else svg.setAttribute("viewBox","0 0 400 310");
    svg.innerHTML = g;

    daysEl.innerHTML = days.map((d, i) => {
      const nm = NAMES[(i+1)%7], gone = lostOn && d.key && d.key > lostOn && !d.future;
      const status=displayState(d), empty=EMPTY_LABEL;
      const notes=[d.hatLost?'<span class="wk-hat">'+chipHat+' 모자 잃음</span>':"",d.trampolineBreaks?'<span class="wk-broken">'+chipTramp+' 트램펄린 부서짐</span>':"",gone?"트램펄린 없음":""].filter(Boolean).join("<br>");
      return `<li class="wk-d${d.future?' wk-future':''}${d.inferred?' wk-none':''}${!d.line||d.inferred?' wk-empty':''}${gone?' wk-gone':''}" data-state="${status}" ${d.line?'data-line="'+d.line+'"':''}><b>${nm}</b>${empty[status]?'<i>'+empty[status]+'</i>':''}<span>${LINE_NAME[d.line]||''}</span><span>${notes}</span></li>`;
    }).join("");

    $("wkStatus").innerHTML = `잃은 모자 <b>${w.hatsLost}</b>개 · 트램펄린 <b>${w.trampolineAlive ? "멀쩡함" : "잃음"}</b> · 지금 <b>${pr.map}</b>번 맵 (5개 중) · ${theme.name} · <b>${pr.round}</b>회차`;
    stageEl.style.marginBottom=MAP_VIEW.is3D&&VW.W<900?($("wkRecords").offsetHeight+20)+"px":"";
    const s = $("wkSummit");
    if (s && sun) {
      s.addEventListener("click", () => playJump());
      s.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); playJump(); } });
    }
  }

  function show() {
    open = true; panel.hidden = false; document.body.classList.add("wk-on");
    $("wkDay").setAttribute("aria-pressed", "false"); $("wkWeek").setAttribute("aria-pressed", "true");
    MAP_VIEW.showWeek(); render();
  }
  function hide() {
    open = false; panel.hidden = true; document.body.classList.remove("wk-on");
    stageEl.style.marginBottom="";
    $("wkDay").setAttribute("aria-pressed", "true"); $("wkWeek").setAttribute("aria-pressed", "false");
    endJump(false); MAP_VIEW.showDay();
  }

  function endJump(markSeen) {
    if (!playing) return;
    clearTimeout(playing.t); jumpEl.hidden = true; jumpEl.className = "wk-jump";
    const fromPending = playing.fromPending; playing = null;
    if (fromPending && markSeen) JOURNEY.markJumpSeen();
  }

  function playJump(pj) {
    if (playing) return;
    if (!open) show();
    const w = JOURNEY.week(), pr = JOURNEY.progress();
    const alive = pj ? pj.result === "advance" : w.trampolineAlive;
    const ending = pj ? !!pj.ending : (alive && pr.map === 5);
    $("wkJumpText").textContent = !alive ? "이번 주는 같은 맵에서 다시" : ending ? "하얀 문 너머로 — 2회차 시작" : `다음 맵으로! · ${MAPS[Math.min(pr.map,4)].name}`;
    jumpEl.className = "wk-jump" + (alive ? "" : " stay") + (alive && ending ? " ending" : "");
    jumpEl.hidden = false;
    void jumpEl.offsetWidth; jumpEl.classList.add("go");
    const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
    playing = {fromPending: !!pj, t: setTimeout(() => endJump(true), reduce ? 2200 : 3200)};
  }

  $("wkWeek").addEventListener("click", show);
  $("wkDay").addEventListener("click", hide);
  $("wkJumpSkip").addEventListener("click", () => endJump(true));
  $("wkPending").addEventListener("click", () => { const pj = JOURNEY.progress().pendingJump; if (pj) playJump(pj); });
  JOURNEY.onChange(() => { if (open) render(); else $("wkPending").hidden = !JOURNEY.progress().pendingJump; });
  JOURNEY.ready.then(() => { $("wkPending").hidden = !JOURNEY.progress().pendingJump; if (open) render(); });
  window.addEventListener("resize",()=>{if(open)setTimeout(render,240);});
  return { show, hide, playJump };
})();
