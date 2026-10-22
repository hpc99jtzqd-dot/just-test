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
  const LINE_COLOR = {1:"#eeb69c", 2:"#6cbf42", 3:"#d9a441"};
  // 월~토 구간의 끝점. 마지막은 일요일 산꼭대기
  const P = [[24,274],[120,250],[50,214],[170,190],[80,150],[210,128],[290,66]];
  let open = false, playing = null;

  const dowOf = key => key ? new Date(key + "T00:00:00Z").getUTCDay() : -1;
  const isSunday = () => dowOf(JOURNEY.todayKey()) === 0;
  const seg = i => { const a = P[i], b = P[i+1], mx = (a[0]+b[0])/2;
    return `M${a[0]} ${a[1]} C${mx} ${a[1]} ${mx} ${b[1]} ${b[0]} ${b[1]}`; };
  const mid = i => { const a = P[i], b = P[i+1]; return [(a[0]+b[0])/2, (a[1]+b[1])/2]; };

  const HAT_D = "M-8 4 Q0 0 8 4 L2 -14 Q0 -20 -6 -17 Q-1 -12 -3 -6 Z";
  const hatSvg = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="${HAT_D}" fill="#d42e22" stroke="#7c120c" stroke-width="1"/><circle cx="-6" cy="-17" r="2" fill="#fff6e0"/></g>`;
  const trampBroken = (x, y) => `<g transform="translate(${x} ${y}) rotate(-18)"><ellipse rx="13" ry="6" fill="#121c3c" stroke="#2ec4ef" stroke-width="3"/><path d="M-3 -6 L1 -1 L-2 2 L3 6" stroke="#fff" stroke-width="1.8" fill="none"/></g>`;
  const chipHat = `<svg viewBox="-10 -20 20 24" aria-hidden="true"><path d="${HAT_D}" fill="#d42e22" stroke="#7c120c" stroke-width="1"/></svg>`;
  const chipTramp = `<svg viewBox="-16 -9 32 18" aria-hidden="true"><ellipse rx="13" ry="6" fill="#121c3c" stroke="#0b6d9c" stroke-width="3"/><path d="M-3 -6 L1 -1 L-2 2 L3 6" stroke="#ffd23a" stroke-width="2" fill="none"/></svg>`;

  function weekDays(w) {
    const real = (w.days || []).filter(d => d.dow !== 0).slice(0, 6);
    return Array.from({length: 6}, (_, i) => real.find(d => d.dow === i + 1) || real[i] || {dow: i+1, future: true});
  }

  function render() {
    const w = JOURNEY.week(), pr = JOURNEY.progress(), days = weekDays(w), sun = isSunday();
    $("wkTitle").innerHTML = w.practice ? "연습 주" : `${w.weekNo}주째 <small>/ 10주</small>`;
    $("wkOffline").hidden = !!JOURNEY.online;
    $("wkPending").hidden = !pr.pendingJump;
    const lostOn = w.trampolineLostOn || "";
    let g = `<path d="M-10 300 L200 150 Q290 40 380 150 L400 300 Z" fill="#cfe6ff" opacity=".9"/><path d="M196 154 L290 52 L360 154 Z" fill="#fff" opacity=".85"/>`;
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
    svg.innerHTML = g;

    daysEl.innerHTML = days.map((d, i) => {
      const nm = NAMES[(i+1)%7], gone = lostOn && d.key && d.key > lostOn && !d.future;
      if (d.future) return `<li class="wk-d wk-future"><b>${nm}</b><i>아직</i></li>`;
      if (d.inferred) return `<li class="wk-d wk-none${gone ? " wk-gone" : ""}" data-line="${d.line || ""}"><b>${nm}</b><i>기록 없음</i><i>${LINE_NAME[d.line] || ""}</i></li>`;
      const notes = [d.hatLost ? chipHat + " 모자 잃음" : "", d.trampolineBreaks ? chipTramp + " 트램펄린 부서짐" : "", gone ? "트램펄린 없음" : ""].filter(Boolean).join("<br>");
      return `<li class="wk-d${gone ? " wk-gone" : ""}" data-line="${d.line}"><b>${nm}</b><span>${LINE_NAME[d.line] || ""}</span><span>${notes}</span></li>`;
    }).join("");

    $("wkStatus").innerHTML = `잃은 모자 <b>${w.hatsLost}</b>개 · 트램펄린 <b>${w.trampolineAlive ? "멀쩡함" : "잃음"}</b> · 지금 <b>${pr.map}</b>번 맵 (5개 중) · <b>${pr.round}</b>회차`;
    const s = $("wkSummit");
    if (s && sun) {
      s.addEventListener("click", () => playJump());
      s.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); playJump(); } });
    }
  }

  function show() {
    open = true; panel.hidden = false; document.body.classList.add("wk-on");
    $("wkDay").setAttribute("aria-pressed", "false"); $("wkWeek").setAttribute("aria-pressed", "true");
    render();
  }
  function hide() {
    open = false; panel.hidden = true; document.body.classList.remove("wk-on");
    $("wkDay").setAttribute("aria-pressed", "true"); $("wkWeek").setAttribute("aria-pressed", "false");
    endJump(false);
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
    $("wkJumpText").textContent = !alive ? "이번 주는 같은 맵에서 다시" : ending ? "하얀 문 너머로 — 2회차 시작" : "다음 맵으로!";
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
  return { show, hide, playJump };
})();
