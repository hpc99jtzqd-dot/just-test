/* ───── 한 주 여정: 기록과 판정 ─────
   명세: .omc/specs/deep-interview-oiphorion-weekly-journey.md
   다른 파일이 기대는 계약(이름과 모양을 바꾸지 말 것):

   JOURNEY.ready                      Promise. db 로드(또는 실패) 후 resolve
   JOURNEY.online                     boolean. 아티팩트 db를 쓸 수 있으면 true
   JOURNEY.todayKey()                 "YYYY-MM-DD" (Asia/Seoul)
   JOURNEY.recordToday(woke, line)    오늘 기록 저장/갱신. woke "HH:MM", line 1|2|3. Promise
   JOURNEY.week(key?)                 key가 든 주(월요일 시작)의 판정 객체:
     { monday, practice, weekNo, days:[{key, dow, line, inferred, future, hatLost, trampolineBreaks}],
       hatsLost, trampolineLostOn, trampolineAlive, result: "pending"|"advance"|"stay" }
     dow는 JS getDay 규칙(월 1 … 토 6). days는 월~토 6개
   JOURNEY.trampolineFor(key?)        "intact" | "breaks-today" | "gone"
   JOURNEY.progress()                 { map: 1..5, round: 1.., pendingJump: {monday, result, ending} | null }
   JOURNEY.markJumpSeen()             Promise. pendingJump를 본 것으로
   JOURNEY.onChange(fn)               기록이나 진행이 바뀌면 fn() 호출

   저장(문서 경로는 짝수 칸): data/users/<id>/journey/days/<YYYY-MM-DD> = {woke, line, savedAt}
                              data/users/<id>/journey/meta/since      = {day}     처음 연 날
                              data/users/<id>/journey/meta/jumpSeen   = {monday}  본 점프의 월요일
   맵·회차는 저장하지 않고 열 때마다 하루 기록에서 다시 센다(기기 둘이 덮어써도 되돌아가지 않게).
   빈 날 3선도 쓰지 않고 읽을 때 계산한다. since 전의 빈 날은 3선으로 치지 않는다.
*/
const JOURNEY = (() => {
  const DAY_MS = 864e5, KST_MS = 9 * 36e5;
  const WEEK1 = "2026-11-02", MAPS = 5, LS = "oi.journey.";

  /* 날짜: 모두 한국 시간 "YYYY-MM-DD" 문자열로 다룬다(문자열 비교 = 날짜 비교) */
  const keyOf = ms => new Date(ms + KST_MS).toISOString().slice(0, 10);
  const msOf = key => Date.parse(key + "T00:00:00Z");
  const addDays = (key, n) => new Date(msOf(key) + n * DAY_MS).toISOString().slice(0, 10);
  const mondayOf = key => addDays(key, -((new Date(msOf(key)).getUTCDay() + 6) % 7));
  const todayKey = () => keyOf(Date.now());

  /* 보조 캐시(localStorage). 막혀 있어도 페이지는 돈다 */
  const cacheGet = (k, d) => { try { return JSON.parse(localStorage.getItem(LS + k)) ?? d; } catch (e) { return d; } };
  const cacheSet = (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) {} };

  let days = cacheGet("days", {});
  let since = cacheGet("since", null), jumpSeen = cacheGet("jumpSeen", null);
  let prog = Object.assign({ map: 1, round: 1 }, cacheGet("progress", {}), { pendingJump: null });
  let db = null, base = "", gaveUp = false;
  const fns = [];
  const emit = () => fns.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  const hasLine = rec => rec != null && typeof rec.line === "number";

  /* db 어댑터: get()이 스냅숏(data())이든 평범한 객체든 받아 준다 */
  const ref = path => {
    if (typeof db.doc === "function") return db.doc(path);
    const i = path.lastIndexOf("/");
    return db.collection(path.slice(0, i)).doc(path.slice(i + 1));
  };
  const dget = async path => {
    const s = await ref(path).get();
    if (s == null || s.exists === false) return null;
    if (typeof s.data === "function") return s.data() ?? null;
    return s.data && typeof s.data === "object" ? s.data : s;
  };
  const dset = (path, v) => ref(path).set(v);

  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error("timeout")), ms))]);

  async function connect() {
    const c = window.claude;
    if (!c || typeof c.use !== "function") return;
    const d = await c.use("db"), user = await c.use("user");
    if (!d || !user) return;
    const id = typeof user.id === "function" ? await user.id() : user.id;
    if (!id) return;
    db = d; base = "data/users/" + id + "/journey/";
    const today = todayKey();
    const [s, j] = await Promise.all([dget(base + "meta/since"), dget(base + "meta/jumpSeen")]);
    const dbSince = s && s.day, newSince = !dbSince;
    const sinceNow = dbSince || (since && since < today ? since : today);
    // 맵을 세려면 처음 연 주(1주차보다 이르면 1주차)부터, 점프 보기를 위해 지난주부터는 꼭 읽는다
    let from = mondayOf(sinceNow);
    if (from < WEEK1) from = WEEK1;
    const lastMon = addDays(mondayOf(today), -7);
    if (lastMon < from) from = lastMon;
    const keys = [];
    for (let k = from; k <= today; k = addDays(k, 1)) keys.push(k);
    const got = await Promise.all(keys.map(k => dget(base + "days/" + k)));
    if (gaveUp) return;   // 5초를 넘겼으면 오프라인으로 남는다
    const cachedToday = days[today];
    days = {};
    keys.forEach((k, i) => { if (hasLine(got[i])) days[k] = got[i]; });
    since = sinceNow; jumpSeen = (j && j.monday) || null;
    api.online = true;
    if (newSince) await dset(base + "meta/since", { day: since });
    // 오프라인으로 넣어 둔 오늘 기록이 db에 없으면 올린다(지난 날은 건드리지 않는다)
    if (hasLine(cachedToday) && !days[today]) { days[today] = cachedToday; await dset(base + "days/" + today, cachedToday); }
    cacheSet("days", days); cacheSet("since", since); cacheSet("jumpSeen", jumpSeen);
  }

  /* 맵·회차: 처음 연 주부터 끝난 주를 차례로 세어 다시 만든다. 온라인일 때만(오프라인은 캐시 값) */
  function derive() {
    if (!api.online || !since) { prog.pendingJump = null; return; }
    const thisMon = mondayOf(todayKey()), lastMon = addDays(thisMon, -7);
    let map = 1, round = 1, last = null;
    for (let mon = mondayOf(since); mon < thisMon; mon = addDays(mon, 7)) {
      const w = api.week(mon);
      let ending = false;
      if (!w.practice && w.result === "advance") {
        map++;
        if (map > MAPS) { map = 1; round++; ending = true; }
      }
      if (mon === lastMon) last = { monday: mon, result: w.result, ending };
    }
    prog = { map, round, pendingJump: last && jumpSeen !== last.monday ? last : null };
    cacheSet("progress", { map, round });
  }

  const api = {
    ready: null,
    online: false,
    todayKey,

    async recordToday(woke, line) {
      const k = todayKey();   // 누른 순간의 한국 날짜. 쓰기가 자정을 넘겨 끝나도 이 날로 간다
      line = Number(line);
      if (![1, 2, 3].includes(line)) throw new Error("line은 1|2|3");
      const rec = { woke: String(woke), line, savedAt: Date.now() };
      days[k] = rec;
      cacheSet("days", days);
      emit();
      if (api.online) await dset(base + "days/" + k, rec);
    },

    week(key) {
      const today = todayKey(), monday = mondayOf(key || today);
      let c2 = 0, c3 = 0, hatsLost = 0, lostOn = null, missing = false;
      const list = [];
      for (let i = 0; i < 6; i++) {   // 월~토만 판정. 일요일 기록은 결과에 들어가지 않는다
        const k = addDays(monday, i), rec = days[k], future = k > today;
        let line = hasLine(rec) && !future ? rec.line : null, inferred = false;
        // 빈 날 = 3선. db로 확인할 수 있을 때만, 처음 연 날 이후만
        if (line == null && k < today) {
          if (api.online && since && k >= since) { line = 3; inferred = true; }
          else if (!api.online) missing = true;
        }
        if (line === 2) { c2++; hatsLost++; }
        if (line === 3) c3++;
        const trampolineBreaks = lostOn == null && (c3 >= 1 || c2 >= 2);
        if (trampolineBreaks) lostOn = k;
        list.push({ key: k, dow: i + 1, line, inferred, future, hatLost: line === 2, trampolineBreaks });
      }
      const practice = monday < WEEK1;
      const finished = today >= addDays(monday, 6);
      return {
        monday, practice,
        weekNo: practice ? null : Math.floor((msOf(monday) - msOf(WEEK1)) / (7 * DAY_MS)) + 1,
        days: list, hatsLost,
        trampolineLostOn: lostOn, trampolineAlive: lostOn == null,
        result: !finished || missing ? "pending" : lostOn == null ? "advance" : "stay",
      };
    },

    trampolineFor(key) {
      key = key || todayKey();
      const lost = api.week(key).trampolineLostOn;
      return lost == null || key < lost ? "intact" : key === lost ? "breaks-today" : "gone";
    },

    progress() {
      derive();
      return { map: prog.map, round: prog.round, pendingJump: prog.pendingJump ? Object.assign({}, prog.pendingJump) : null };
    },

    async markJumpSeen() {
      // 일요일에 눌러 본 점프면 다음 월요일에 다시 띄우지 않는다
      const today = todayKey(), pj = api.progress().pendingJump;
      jumpSeen = pj ? pj.monday : new Date(msOf(today)).getUTCDay() === 0 ? mondayOf(today) : jumpSeen;
      cacheSet("jumpSeen", jumpSeen);
      emit();
      if (api.online && jumpSeen) await dset(base + "meta/jumpSeen", { monday: jumpSeen });
    },

    onChange(fn) { fns.push(fn); },
  };

  api.ready = withTimeout(connect(), 5000)
    .catch(() => { gaveUp = true; api.online = false; db = null; })
    .then(emit);

  return api;
})();
