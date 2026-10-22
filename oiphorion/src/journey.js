/* ───── 한 주 여정: 기록과 판정 (worker-1이 채운다) ─────
   명세: .omc/specs/deep-interview-oiphorion-weekly-journey.md
   다른 파일이 기대는 계약(이름과 모양을 바꾸지 말 것):

   JOURNEY.ready                      Promise. db 로드(또는 실패) 후 resolve
   JOURNEY.online                     boolean. 아티팩트 db를 쓸 수 있으면 true
   JOURNEY.todayKey()                 "YYYY-MM-DD" (Asia/Seoul)
   JOURNEY.recordToday(woke, line)    오늘 기록 저장/갱신. woke "HH:MM", line 1|2|3. Promise
   JOURNEY.week(key?)                 key가 든 주(월요일 시작)의 판정 객체:
     { monday, practice, weekNo, days:[{key, dow, line, inferred, future, hatLost, trampolineBreaks}],
       hatsLost, trampolineLostOn, trampolineAlive, result: "pending"|"advance"|"stay" }
   JOURNEY.trampolineFor(key?)        "intact" | "breaks-today" | "gone"
   JOURNEY.progress()                 { map: 1..5, round: 1.., pendingJump: {monday, result, ending} | null }
   JOURNEY.markJumpSeen()             Promise. pendingJump를 본 것으로
   JOURNEY.onChange(fn)               기록이나 진행이 바뀌면 fn() 호출
*/
const JOURNEY = {
  ready: Promise.resolve(), online: false,
  todayKey(){ return new Date().toISOString().slice(0,10); },
  recordToday(){ return Promise.resolve(); },
  week(){ return {monday:"",practice:true,weekNo:null,days:[],hatsLost:0,trampolineLostOn:null,trampolineAlive:true,result:"pending"}; },
  trampolineFor(){ return "intact"; },
  progress(){ return {map:1,round:1,pendingJump:null}; },
  markJumpSeen(){ return Promise.resolve(); },
  onChange(){},
};
