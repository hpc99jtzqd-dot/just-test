# RALPLAN: 오이포리온 · 난쟁이의 한 주 여정 (v0.6)

- 입력 명세: `.omc/specs/deep-interview-oiphorion-weekly-journey.md` (모호도 16%, PASSED)
- 모드: omc-plan `--consensus --direct` · RALPLAN-DR short
- 상태: **pending approval** (실행 승인 전에는 소스 수정 없음)
- 판: 최종(합의) — v3 + 3회차 검토 개선 반영. Architect: APPROVE(조건 N1–N4 반영) · Critic: ACCEPT-WITH-RESERVATIONS(m1–m5 반영). 합의 3회차, 끝의 ADR과 변경 기록 참고
- 초안 내력: `.omc/drafts/ralplan-oiphorion-weekly-journey-v1.md` ~ `-v3.md`

## 1. 요구사항 요약

하루 지도(v0.5)를 "한 주 = 한 판"으로 넓힌다. 매일 처음 넣은 '일어난 시각'이 그날 갈림길(1·2·3선)로 db에 기록되고(그날 자정까지 고칠 수 있고, 지나면 굳는다), 빈 날은 3선이 된다. 2선은 그날 모자를, 주(월~토) 안의 3선 1번 또는 2선 2번은 그 주 트램펄린을 앗아 간다. 월~토를 트램펄린과 함께 버틴 주만 일요일 산 정상에서 뛰어 다음 맵(5개, 풍경만 다름)으로 간다. 5번째 맵을 넘으면 하얀 문 엔딩 후 2회차. 11월 2일(월) 전은 연습 주. 하루 보기 ↔ 한 주 보기를 오간다. 기록은 아티팩트 `db`의 사람별 비공개 영역. C++는 범위 밖.

## 2. 명세를 코드·API에 대 보며 찾은 사실

| # | 명세의 가정 | 실제 | 계획의 처리 |
|---|---|---|---|
| F1 | 하루 문서 `data/users/<id>/days/<YYYY-MM-DD>` | 5조각 = 컬렉션 경로(`db.d.ts` 200–212행) | `data/users/<id>/journey`(4조각 문서)의 하위 컬렉션: `.../journey/days/<날짜>`(6조각) |
| F2 | 자정이 지나면 굳는다 | 서버 시각·트랜잭션 없음, last-writer-wins, `set`은 통째 교체(`db.d.ts` 343–365행) | 굳음은 **각 기기 시계를 믿는 페이지 규칙**으로 명시적으로 받아들인다(혼자 쓰는 앱). 참값은 사실(days)에서 매번 접어 계산한다 |
| F3 | 빈 날을 3선으로 기록 | 타이머로 시계 값을 쓰지 말 것(348–355행), get-then-set은 경쟁(370–388행) | 실제 열기 때만, `acquire → get(fromCache=false) → 의미 있는 본문이 없을 때만 set`(F12). 열린 탭의 날짜 넘김은 다시 계산해 **표시만** |
| F12 | "없을 때만 쓰기" | 자리 잡기 절차는 "없거나 **본문에 주인이 없을 때**"만 쓰라고 한다(370–388행). `acquire`의 `data`는 본문에 합쳐지고(315행), 성공하면 문서 `version`이 생긴다(321–322행) → `acquire`가 빈 문서를 만들 수 있다고 읽힌다(실측 전엔 불확실) | "없음"은 `exists`가 아니라 **필수 필드가 없음**으로 판정: days `typeof line!=="number"`, journey `!startedOn`, weeks `typeof kept!=="boolean"`. 읽을 때도 `line` 없는 days 문서는 기록 없음으로 본다. P4.5에서 실측 |
| F4 | 고정 기상 시각 | `localStorage dw.wake`(map.js 5–7, 698행). 기기마다 다르면 판정이 갈린다 | `data/users/<id>/settings` 문서로. 하루 기록에 당시 `wake`와 `line`을 함께 남긴다 |
| F5 | 3선 날 모자 | v0.5는 3선도 잃음(map.js 544행). 명세 규칙 4는 2선만 | 명세대로 2선만(Q1) |
| F6 | 참고 그림 4장 | `refs/`에 없음(ref1, ref2, current-desktop, current-phone뿐) | 맵 2~5 풍경(P5)만 그림을 기다린다. 엔딩·규칙·한 주 보기는 그림 없이 진행 |
| F7 | `uDw3` 네 번째 성분 | 비어 있음(map.js 562행 `...,0)`) | 트램펄린 있음 플래그. 유니폼 추가 없음 |
| F8 | 로컬 `dist/index.html` | `window.claude` 없음. `claude.use()`는 비동기, 응답 없으면 10초 뒤 null(`claude.d.ts` 24–30행) | db 없음 = "기록 안 됨" 상태. 시험은 가짜 `claude.use` 주입 |
| F9 | '오늘 일어난 시각' 칸 | `value="07:30"` 기본값(body.html 10행) + 날짜 없는 `dw.woke` 복원(map.js 7행). 07:30에 일어나면 `change`가 안 나서 기록이 안 생긴다 | 기본값과 복원을 없앤다. 오늘(서울) 기록이 있으면 그 값, 없으면 빈 칸 + '아직 안 적음' 상태 |
| F10 | 기능 시작 시점 | 오늘은 10/22(목). 이번 주 월~수를 빈 날로 보면 첫날부터 트램펄린을 잃는다 | `journey.startedOn`(첫 열기 날) 이전 날은 '시작 전': 판정에서 빼고 쓰지 않는다 |
| F11 | SVG 대체 난쟁이 | `#dwarf` SVG의 트램펄린(body.html 35–41행)·모자(52–54행)에 상태 연결이 없다(v0.5부터) | 클래스와 `data-*` 속성으로 셰이더와 같은 상태를 보이게 한다. 그림은 **인라인 그대로**(`<use>` 그림자 트리에는 바깥 선택자가 닿지 않고, map.js 612행 `.body` 조회가 null이 된다) |

## 3. RALPLAN-DR 요약

### 원칙 (Principles)
1. **규칙은 순수 함수 하나에서 나온다.** `JR`(journey.js)이 사실(하루 기록, 시작일)만 받아 모든 상태를 결정적으로 계산한다. 화면·저장·연출은 그 결과만 읽는다.
2. **저장은 사실과 쓰기-한-번 기록뿐.** 카운터나 덮어쓰는 진행 문서를 두지 않는다. 같은 입력이면 어느 기기가 써도 같은 본문이다.
3. **db가 확정해 주지 않으면 확정하지 않는다.** 자동 3선·주 기록은 `fromCache===false`인 읽기 뒤에만 쓴다. db가 없으면 아무것도 확정하지 않는다.
4. **렌더 예산과 대체 경로를 지킨다.** 풍경 한 번 그리기 + 난쟁이 부분 다시 그리기 구조를 유지한다. WebGL·움직임 줄이기 없이도 하루 보기와 한 주 보기의 규칙 표시가 같다.
5. **한 걸음마다 볼 수 있는 결과.** 단계마다 그대로 돌아가는 시험·스크린샷으로 끊고, 연습 주가 쌓이도록 11/02 전에 한 번 게시한다.

### 결정 동인 (Decision Drivers)
1. 기기 간 같은 주, 같은 맵 — 정확성
2. WebGL 없음·움직임 줄이기에서도 동작 — 대체 경로
3. 혼자 유지보수하는 한 장짜리 빌드(외부 라이브러리 없음, 전역 이어 붙이기 함정) — 단순성

### 선택지 (Viable Options)

**결정 A. 한 주 보기를 무엇으로 그리나**
- **A1. HTML/SVG 띠 + 하루 보기 캔버스 한 장 배경(권장, A3 흡수)** — 6구간 길 + 일요일 정상을 SVG로. 머리 배경은 `preserveDrawingBuffer`(map.js 438행) 덕에, 띠 렌더가 끝난 뒤(`raster.done`) 하루 보기 캔버스를 1/4 크기 2D 캔버스에 `drawImage`로 한 번 떠서 흐리게 쓴다(셰이더 렌더 없음, 작은 복사 한 번). 난쟁이는 `#dwarf` 그림을 `cloneNode`로 재사용.
  - 장점: WebGL 없음이 기본 경로. 셰이더·예산 무변경. 접근성·휴대폰 배치 자유.
  - 단점: 3D와 그림체가 갈린다. 민은 2D를 "조악하다"고 거부한 적이 있다(CLAUDE.md 디자인 내력 3차) → 캔버스 배경·같은 색 토큰·같은 난쟁이 그림으로 잇고, P3 끝에 스크린샷으로 민의 판단을 받는다(그림체가 거부되면 A2를 다시 연다).
- **A2. 같은 셰이더로 한 주 지형을 다시 그림** — 카메라를 길 전체로, 6구간 표식·모자·망가진 트램펄린을 유니폼 배열로.
  - 장점: 그림체 하나, "지도 위 여정" 느낌이 가장 강하다.
  - 단점: 전환마다 전체 다시 그리기(띠 렌더 수 초). GLSL ES 1.0 루프·유니폼 부담. WebGL 없음 대체를 결국 SVG로 따로 만들어야 해서 A1 작업을 포함한다.
- 판단: A2는 동인 2·3, 원칙 4와 부딪히고 A1을 포함한다. 단, 그림체 위험은 실재하므로 P3에 민 확인 관문을 둔다.

**결정 B. 규칙 엔진의 자리**
- **B1. `src/journey.js`, 전역 `JR` 하나(권장)** — `JR`은 `LEAVE_AT`과 자체 `toMin`·`decideLine`만 쓴다(`PLANS`·`BLOCKS`에 기대지 않음). 시험은 build.py가 만든 치환된 묶음을 읽는다.
  - 장점: 진짜 순수 → Node 단위 시험. 원칙 1을 구조로 보장.
  - 단점: 파일·도구 증가, 전역 이름 주의.
- **B2. map.js 안 함수(지금 `decideLine`·`computeLine`처럼, map.js 8–13행)**
  - 장점: 파일 수 그대로.
  - 단점: map.js 723행에 DOM·WebGL이 섞여 Node 시험 불가. 정산·회차 규칙이 연출과 엉킨다.

**결정 C. 빈 날과 주 결과를 어떻게 남기나**
- **C1′. 사실 + 접기 계산 + 쓰기-한-번 기록(권장)** — 참값은 `JR`이 `startedOn`부터 days를 접어 매번 계산. db에는 (a) 입력한 하루 기록, (b) 지난 빈 날의 `auto` 3선(의미 있는 본문이 없을 때만, 잠금 후), (c) 지난 주 결과 `weeks/<월요일>`(같은 조건, 본문은 결정적)을 남긴다. (b)·(c) 쓰기는 **판정 경로와 완전히 떨어져** 있고 기능 플래그 `ST.RECORD`로 켜고 끈다.
  - 장점: 기록이 늦게 써지거나 겹쳐도, 아예 안 써져도 판정은 같다. 명세 R10·AC2("3선으로 기록돼 있다")와 AC9("맵·회차 db 저장")를 글자 그대로 지킨다.
  - 단점: 쓰기 경로가 셋, 의미가 실측 전엔 불확실한 `acquire`(F12)에 기댄다 → `acquire`는 **(b)·(c) 전용**으로만 쓰고(사용자 입력과 `startedOn`은 `acquire` 없이 씀), P4.5 실측이 나쁘면 `ST.RECORD=false`로 정확히 C3까지 내려간다(화면·판정 변화 없음, AC2·AC9 문구 준수만 포기하고 민에게 알린다).
- **C3. 빈 날·주 결과를 쓰지 않고 늘 계산만**
  - 장점: 경쟁이 원천적으로 없다. 가장 단순하다.
  - 단점: AC2·AC9의 "db에 기록/저장"을 어긴다. Claude가 db만 읽어 기록을 확인할 수 없다.
- **C4. 진행 문서 하나(`journey {map, lap, weekStart, last}`)를 열 때 갱신(v1안)**
  - 기각: `set` 통째 교체로 `seen`이 되살아나고(명세 "한 번" 위반), `map+1`은 db가 금지하는 read-modify-write 카운터다(`db.d.ts` 362–364행). 두 기기가 동시에 열면 깨진다.
- **C2. 자정 타이머 쓰기** — 기각: 탭이 닫혀 있으면 무의미하고 시계 값 타이머 쓰기는 db 지침 위반.
- 판단: C1′은 C3의 정확성(참값 = 계산)을 그대로 갖고, 명세가 요구하는 기록만 쓰기-한-번으로 더한다.

## 4. 데이터 모델

```
data/users/<uid>/settings                 { v:1, wake:"07:30" }
data/users/<uid>/journey                  { v:1, startedOn:"YYYY-MM-DD" }         ← 처음 한 번만 씀
data/users/<uid>/journey/days/<날짜>       { date, woke:"07:40"|null, wake, line:1|2|3, auto:bool, savedAt }
data/users/<uid>/journey/weeks/<월요일>    { monday, practice, kept, trampLostOn|null,
                                            fromMap, fromLap, toMap, toLap, ending }  ← 지난 주마다 한 번, 결정적 본문
data/users/<uid>/journey/seen/<월요일>     { at }                                  ← 점프를 본 주
```
- `<uid>` = `await (await claude.use("user")).id()`. null이면 db 기능 끔.
- 선언: `capabilities: {db:{}, user:{}}`. 기본 규칙에서 `data/users/{self}`는 본인만 읽고 쓴다(소유자 민은 모든 등급 충족).
- 읽기: 첫 열기 `days` 컬렉션 전체 `get()`(1년 365개 이하, 문서 id 오름차순). 이후 이번 주는 `where("date","in",[월~일 7개])` 구독 한 번. `weeks`·`seen`도 컬렉션 `get()` 한 번.
- 현재 맵·회차 = `JR.fold(...)`의 결과. `weeks` 문서는 그 결과의 기록이자 확인용(서로 다르면 계산이 이긴다 → 콘솔 경고).
- 읽은 days 문서 중 `typeof line!=="number"`인 것(잠금만 남은 빈 문서 등)은 기록 없음으로 취급한다(F12). weeks 문서 중 `typeof kept!=="boolean"`인 것은 계산과의 비교에서 뺀다.
- 브라우저 저장소 `dw.cache` = 마지막 `{date, line, hat, tramp, map, lap, week}`. 첫 렌더 값과 db 없을 때 읽기 전용 표시에만 쓴다. 선·모자·트램펄린은 `cache.date===오늘`일 때만 쓰고, 아니면 `pending`으로 그린다(맵·회차는 날짜와 무관하게 쓴다).

## 5. 규칙 엔진 `JR` (`src/journey.js`)

날짜는 모두 서울 기준 문자열(`Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'})`).
- 시각: `JR.seoulNow(ms)` → `{date, dow, min}`. `JR.mondayOf(date)`, `JR.addDays(date,n)`.
- 주 번호: `JR.weekNo(monday)` = (monday − 2026-11-02)/7 + 1. 0 이하 = 연습 주. 10 초과도 그대로 센다(Q2: 표시는 'N주째', 10 이하일 때만 '/ 10주').
- 판정: `JR.lineFor(dow, wokeMin, wakeMin)` — 월~목은 `LEAVE_AT`으로 남은 시간(map.js 13행 규칙), 그 밖은 `decideLine`(map.js 8행). map.js의 `computeLine`·`decideLine`은 `JR`을 부르게 바뀐다.
- 한 주: `JR.week(monday, daysByDate, now, startedOn)` → **월~토 6개만** `perDay[]`. 각 칸의 상태:
  - `before`(startedOn 이전) · `future`(오늘 이후) · `pending`(오늘·기록 없음) · `recorded{line, auto}` · `missed`(지난 날·기록 없음 → line 3, 아직 auto 미기록).
  - 차례로 접으며: 2선이면 `hat:false`. 2선 누계 2 또는 3선 1이 되는 날 = `trampLostOn`.
  - 그날의 트램펄린: 잃은 날 전 = `back`. **2선으로 잃은 날 = `none`(그날부터 없음)**. **3선으로 잃은 날 = `feet`(발밑으로 튀고 그날로 망가짐)**. 잃은 뒤 = `none`(3선이어도 걷는다).
  - `pending`과 `future`는 접기에 넣지 않는다(오늘 미입력이면 어제까지의 상태를 보여 준다).
  - 일요일 문서는 판정에 쓰지 않는다. 일요일 하루 보기의 모자는 그날 선으로만 정한다(Q4). 일요일 트램펄린은 **그 주 토요일까지의 마지막 상태**(`back` 또는 `none`)이고 3선이어도 `feet`가 되지 않는다(점프 연출과 맞춤).
- 주 결과: `JR.result(week, from)` → `{kept, practice, toMap, toLap, ending}`. `kept && !practice`면 `map+1`, 5에서 넘으면 `map=1, lap+1, ending:true`. 연습 주는 맵 그대로.
- 전체: `JR.fold(days, startedOn, now)` → startedOn의 주부터 지난 주까지 차례로 `result`를 이어 현재 `{map, lap}`와 주별 결과 목록을 낸다. 같은 입력 → 같은 출력.

## 6. 구현 단계 (단계마다 그대로 돌아가는 확인 명령으로 끊는다)

**P0. 규칙 엔진과 시험** (화면 변화 없음)
- 새 `src/journey.js`: §5. 전역은 `const JR = (()=>{ … return {...}; })();` 하나. 주석에 `__CPP__`·`__LEAVE__`·`__ANCHORS__` 문자열을 쓰지 않는다(build.py 45–46행이 js 전체를 치환).
- map.js 8행 `decideLine`, 13행 `computeLine`은 `JR` 호출로 바꾼다.
- `build.py` 44행 목록에 `journey.js`를 `school.js` 뒤에 넣는다(이 단계에선 이것만). 그리고 `--test-bundle` 옵션: data.js·school.js·journey.js를 같은 치환을 거쳐 `dist/test-bundle.js`로 쓴다(치환 규칙을 한 곳에만 둔다).
- 새 `tools/journey.test.cjs`(CommonJS, `node:test`): `dist/test-bundle.js`를 `vm`의 한 맥락에서 실행하고 `vm.runInContext("JR", ctx)`로 꺼낸다(최상위 `const`는 맥락 객체 속성이 아니다). 시험 U1~U18(§7).

**P1. 저장 어댑터 `ST` (`src/store.js`)**
- build.py 44행 목록에 `store.js`를 `journey.js` 뒤에 넣는다(최상위 동기 코드는 map.js의 `const`를 건드리지 않는다).
- `ST.init()`: `typeof claude==="undefined"` 또는 `use("db")`/`use("user")`가 null → `ST.mode="off"`. 아니면 uid로 경로 준비. 기다리는 동안 `ST.mode="loading"`.
- **잠금(`acquire`)은 자동 3선과 `weeks` 기록 전용**이고 그 경로 전체가 `ST.RECORD` 뒤에 있다. 계약: `holder` = 탭마다 한 번 만드는 무작위 id(`crypto.randomUUID()`), `ttlMs` = 4000, `data`는 쓰지 않는다. `{acquired:false}`면 그 문서를 건너뛰고 다음 열기로 미룬다.
- **"없음" 판정(F12):** 모든 쓰기-한-번은 `exists`가 아니라 필수 필드로 판정한다 — journey `!data()?.startedOn`, days `typeof data()?.line!=="number"`, weeks `typeof data()?.kept!=="boolean"`.
- 첫 열기: `journey`에 `startedOn`이 없으면 `get`(fromCache=false) → 여전히 없으면 `{v:1, startedOn: 오늘}`을 일반 `set`(잠금 없음 — 같은 날 어느 기기가 써도 같은 본문).
- **문서별 마지막 값 줄:** `ST.queue(path, body)` — 문서마다 쓰기는 한 번에 하나(`db.d.ts` 348–350행). 앞 쓰기가 진행 중이면 대기 중인 본문만 **마지막 값으로 갈아 끼운다**(입력이 몰려도 쓰기는 진행 중 1 + 대기 1, 352–353행 "한 번에 몰아 쓰기" 준수, 타이머 없음). `saveToday`·`setWake`·finalize 모두 이 줄을 탄다.
- `ST.saveToday(dateAtInput, wokeStr)`: 키는 **그 입력 묶음의 첫 `change` 순간의 서울 날짜**(Chromium `type=time`은 키보드로 "0840"을 치면 `change`가 4번 난다 — 실측: `''`→`08:30`→`08:04`→`08:40`). 빈 값(`''`)이면 쓰지 않는다(지운 칸이 1선으로 기록되지 않게). 잠금 판정도 입력 순간 기준: 입력한 순간 그 날짜가 오늘이었으면, 쓰기가 자정 뒤에 도착해도 받아들인다. 이미 지난 날짜를 보여 주는 칸은 처음부터 disabled라 입력이 생기지 않는다. 잠금 없이 줄에 넣는다(자동 3선과의 경쟁은 아래 finalize의 자정 유예로 시간상 분리). 본문에 `date` 필드 포함.
- `ST.setWake(w)`: settings 저장. 오늘 기록이 있으면 오늘 문서의 `wake`·`line`만 다시 쓴다(지난 날은 그대로, 같은 줄).
- `ST.finalize()` (실제 열기와 `visibilitychange`→보임일 때만, 타이머 없음, `ST.RECORD`가 꺼져 있으면 1단계만):
  1. `days`·`weeks` 컬렉션 `get()` — `metadata.fromCache===true`면 여기서 멈춘다.
  2. `[startedOn, 어제]`의 월~토 중 기록 없는 날마다 차례로(단 '어제'는 서울 00:01 이후에만 — 자정 직전 입력의 쓰기가 도착할 유예): `acquire` → `get()`(fromCache=false) → 숫자 `line`이 없을 때만 `{date, line:3, auto:true, woke:null, wake, savedAt}` `set`. `resource_exhausted`면 1초·2초 쉬고 다음 열기로 미룬다.
  3. `JR.fold` 결과의 지난 주마다 `weeks/<월요일>`에 `kept`가 없으면 `acquire` → `get` → 여전히 없을 때만 결정적 본문 `set`.
- **열린 탭의 날짜 넘김:** 기존 1분 `setInterval`(map.js 713행)과 `visibilitychange`에서 서울 날짜를 비교한다. 바뀌었으면 다시 계산해 표시하고 `#woke`가 가리키는 날짜를 새 날로 바꾼다(쓰기 없음). 월요일이 바뀌었으면 이번 주 `in` 구독을 끊고 새 주로 한 번 다시 만든다.
- 오류 코드: `unavailable` 한 번 재시도(동사) / 구독 오류 콜백의 `unavailable`은 새 `onSnapshot` 한 번으로 다시 구독(`db.d.ts` 158–165행) · `invalid_argument` → 그 방문 동안 읽기 전용 · `resource_exhausted` → 미룸 · `quota_exceeded` → 배너 문구 · `revoked`/`not_granted`/`capability_disabled`/`capability_removed`/모르는 코드 → `off`.
- 저장 상태 칩 `#saveState`(갈림길 패널 안, body.html 8–15행): 불러오는 중 / 저장됨 / 저장 중 / 기록 안 됨.
- 같은 이번 주 구독은 `onSnapshot` 한 번(다른 기기 입력이 실시간으로 보인다).

**P2. 하루 보기를 새 규칙에 맞춤** (map.js, body.html, nodes.css)
- 입력 칸: body.html 10행 `value="07:30"` 제거, map.js 7행의 `dw.woke` 복원 제거, 698행 `input` 처리기는 `change` → `ST.saveToday`로. 고정 기상(`#wake`)은 `ST.setWake`(db 없으면 지금처럼 localStorage).
- db 없음(`off`): `#woke`는 입력할 수 있고, 넣은 값으로 **그날 하루 보기를 미리 계산해 보여 주기만** 한다(저장·판정 없음, 칩 '기록 안 됨'). 그래서 기존 `node tools/shot.js 400 820 phone.png 11:00`(CLAUDE.md 명령)이 지금처럼 동작한다.
- 모자 되찾기 제거:
  - 지울 것: `HAT.back`(540행의 `back`), `ORDER`(541), `hatHome`(543), `reached`(545), `hatRect`·`pickHatRedraw`(552–555), `arrive`(637–640).
  - 호출 지점: `render()` 끝 `if(HAT.dirty) pickHatRedraw();`(499), `arrive(id)`(651, 666), `showInfo`의 `HAT.back` 분기(680, 682), `refresh`의 `HAT.key` 줄(693).
  - 남길 것: `hatSpot`(542), `feetMode`·`sideOpen`·`hatPos`·`worldUniforms`(546–550).
- 하루 상태 `TODAY = {hat, tramp:"back"|"none"|"feet", line, pending, readOnly}`를 `JR.week`에서 얻는다. (**`DAY`라는 이름은 쓸 수 없다**: data.js 4행 `const DAY`(수도코드 문자열)와 겹쳐 스크립트 전체가 문법 오류로 죽는다.)
  - `hatLost = ()=>!TODAY.hat` (544행 대체).
  - `feetMode = ()=>TODAY.tramp==="feet"` (546행).
  - `dwarfUniforms`(562행): `uDw3.w = TODAY.tramp==="none"?0:1`.
  - 셰이더 `dwarf()`(204–212행)의 `if(fm<.5){…}else{…}` 전체를 `if(uDw3.w>.5){…}`로 감싼다. `shadow()`(250–253행) 루프에 `if(i==3&&uDw3.w<.5) continue;`. 재질 25(353행)는 그대로.
- SVG 대체(F11): body.html 35–41행 `<g>`에 `class="dw-tramp"`, 52–54행에 `class="dw-hat"`, 발밑 트램펄린 타원 묶음 `class="dw-feet"`(기본 숨김) 추가. 그림은 `#dwarf` 안에 **인라인 그대로** 둔다(`.body`·`.wob`, map.js 612행과 nodes.css 32–34행이 그대로 산다).
  - 속성 값은 `DAY`와 같은 체계: `data-hat="1"|"0"`, `data-tramp="back"|"none"|"feet"`.
  - 갱신은 `placeDwarfSVG`(WebGL 없을 때만 불림, map.js 592행)가 아니라 **`refresh()`에서 늘** 한다(P4 점프는 WebGL 모드에서도 `#dwarf`를 쓴다).
  - nodes.css: `.dwarf[data-hat="0"] .dw-hat{display:none}`, `.dwarf[data-tramp="none"] .dw-tramp,.dwarf[data-tramp="feet"] .dw-tramp{display:none}`, `.dwarf[data-tramp="feet"] .dw-feet{display:inline}`.
- 요일 버튼: 초기 `dayIdx`는 서울 요일(map.js 20행). `nowId`(25–28행)도 `JR.seoulNow()`의 요일·분을 쓴다. 이번 주 날짜 = `JR.mondayOf(오늘)+offset`(일=+6).
  - 오늘: 입력 가능. 지난 요일: 그날 기록의 선을 읽기 전용(`#woke` disabled, 값 = 그날 기록). 미래 요일: 계획 미리 보기('미리 보기' 칩, 지금 상태의 트램펄린, 저장 안 함).
  - `refresh()`(691행)는 `#woke` 대신 `TODAY.line`(오늘 미입력이면 `pending` → 길 칩 '아직 안 적음', 노드는 1선 계획을 흐리게).
  - 다시 그리기 판단(691·696행 `changed`)의 비교 키를 `line|hat|tramp|pending`으로 넓힌다. 선이 바뀌면 `render()`, 모자·트램펄린만 바뀌면 `drawDwarf()` 한 번(움직임 줄이기에선 `breathe`가 그려 주지 않으므로 필수, map.js 601행). 모자 자리 풀밭(`uHat`)이 바뀌면 그 자리만 부분 다시 그리기.
  - 날짜가 넘어가면(P1) `dayIdx`·`nowId`의 오늘도 새 날로.
- 안내판 문구(`showInfo` 679–684행): "모자는 오늘 하루 없다" / "트램펄린은 이번 주엔 없다(○요일에 잃음)" / "3선이라 트램펄린을 발밑에 깔았다. 오늘로 망가진다" / "아직 오늘을 적지 않았다".
- 시험 훅: `window.__dw = { get hat(){…}, get tramp(){…}, get feet(){…}, get walking(){…}, get hop(){…}, get maxHop(){…} }`(읽기 전용; `maxHop`은 마지막 걷기 동안의 최대 `DW.hop`), `window.__journeyReady`.
- 렌더 생명주기: 첫 렌더는 `dw.cache`의 선(날짜가 오늘일 때만)·맵으로. db 결과가 다를 때만 `render()` 한 번 더(map.js 696행 `changed` 분기 재사용). `__journeyReady`는 db 처리(또는 `off` 확정)가 끝나고 **그 뒤 필요한 마지막 렌더가 끝난 다음**에 true가 된다(off 모드에서도).

**P3. 한 주 보기 (A1)**
- 새 `src/week.js`(전역 `WK` 하나), `src/week.css`. week.js는 map.js 뒤에 붙으므로 map.js의 동기 초기화(`init()`→`layoutAll`→`refresh`, 706–714행)에서 `WK`를 직접 부르지 않는다: map.js는 `const onDayChange=[]` 훅 배열만 두고, week.js가 자기 갱신 함수를 등록한다(함정 7). head.html 102행과 103행 사이에 `/*@WEEK_CSS@*/`, build.py 40–43행에 `.replace("/*@WEEK_CSS@*/", read("week.css"))`, 44행 목록 끝에 `week.js`(map.js 뒤). CSS 클래스는 모두 `wk-` 접두어(함정 2).
- 난쟁이 그림: body.html의 **그라디언트 `<defs>`(26–31행)만** 늘 렌더되는 0×0 SVG(`#dwDefs`, `position:absolute`)로 옮긴다(WebGL 모드에서 `#dwarf`가 `hidden`이어도 그라디언트가 산다, map.js 476행). 몸 그림(33–55행)은 `#dwarf`에 그대로 두고, 한 주 보기는 그 `<svg>`를 `cloneNode(true)`로 복제한다(그림에 id가 없어 중복 없음). 모자·트램펄린 변형은 복제본 감싸개의 `data-hat`·`data-tramp` + P2와 같은 CSS(`.dwarf`와 `.wk-dwarf` 둘 다에 걸리게 선택자를 쓴다).
- 전환 버튼 `#viewToggle`(하루 ↔ 한 주, `aria-pressed`). `#week`는 `#stage`의 **형제**로 두고 같은 자리에 겹친다(자식이면 `inert`·`visibility`를 물려받아 한 주 보기가 죽는다). `#stage`는 `visibility:hidden` + `inert`(크기 유지 → resize 다시 그리기 없음, map.js 701·712행). `breathe`(601행)는 `WK.open`이면 쉰다.
- 머리 배경: WebGL이 있으면 캔버스 축소 복사, 없으면(`.nogl`) 머리말과 같은 하늘 그라디언트 토큰(`--sky-*`).
- 복제한 난쟁이(`.wk-dwarf`)에도 크기·`transform-origin` 규칙이 걸리도록 nodes.css 30–34행의 `.dwarf svg`·`.body`·`.wob` 선택자를 `.dwarf, .wk-dwarf` 둘 다로 넓힌다.
- 내용: 6구간 길(구간 `data-line`), 2선 구간 `.wk-hat`(떨어진 모자), 잃은 날 구간 `.wk-broken`, `before`·`future` 구간 `.wk-empty`, `pending` 구간 `.wk-pending`, 일요일 정상 칸 `.wk-summit`. 머리: '연습 주' 또는 'N주째 / 10주', '맵 k · m회차'.
- 휴대폰(<900px) 세로 띠, 데스크톱 가로 띠. 버튼 24px 이상.
- **관문:** 데스크톱·휴대폰 스크린샷을 민에게 보여 그림체 승인을 받는다(A1 위험).

**P4. 일요일 점프 · 정산 연출 · 하얀 문 엔딩** (그림 없이 가능)
- 점프 입력은 하나의 처리기 `WK.jump()`, 입구 둘: 한 주 보기 `.wk-summit` 칸, 하루 보기 안내판의 '정상에서 뛰기' 버튼(`sel==="sunday"`일 때만 보임). **서울 오늘이 일요일이고 그 주가 이번 주일 때만** 켜진다(요일 버튼 미리 보기에선 꺼짐). 같은 칸 다시 누름 = 두루마리(map.js 686–687행)는 그대로.
- 연출은 늘 하루 보기 위에서 한다: 한 주 보기에서 눌렀으면 먼저 하루 보기로 전환하고, 난쟁이가 정상(`sunday`)에 없으면 `walkTo("sunday")`로 걸어간 뒤(움직임 줄이기면 바로 놓고) 시작한다.
- 연출은 SVG로(셰이더 다시 그리기 없음): 셰이더 난쟁이를 `uDw2.z=0`으로 한 번 지우고(부분 다시 그리기 1회), `#dwarf` SVG를 `project()`로 위치시켜 튀어 오른다.
  - 결과 카드는 하루 보기 위 공용 겹 `#jumpCard` 하나에 뜬다(문구·그림 모두 여기).
  - 트램펄린 있음: 높이 뛰어 화면 밖 → `#jumpCard`에 '다음 주 맵' 카드(맵 표의 색으로 만든 정지 그림). 연습 주는 "연습 주라 맵은 그대로".
  - 없음: 정상에서 발만 구르고 "같은 맵에서 다시".
  - 5번째 맵을 넘는 주: 정상 → `DOOR`(map.js 95행) 쪽으로 포물선을 그리며 문으로 들어가는 엔딩.
- 본 표시: 일요일에 점프를 보면 `seen/<그 주 월요일>`을 쓴다. 버튼 대상은 **가장 최근에 끝난 주부터 거꾸로 이어진, `seen`이 없는 주들**뿐이다(그보다 앞에 `seen`이 있는 주가 나오면 멈춘다 → 오래된 연습 주가 다시 뜨지 않음). 그런 주가 있으면 '지난 일요일 점프 보기' 버튼. 여러 주면 엔딩 > 성공 > 실패 순으로 가장 중요한 것을 보여 주고, 본 뒤(또는 일요일에 점프한 뒤) 그 주와 그 이전의 `seen` 없는 주를 모두 `seen`.
- 움직임 줄이기: 이동 없이 결과 그림과 문장(motion.css에 `.wk-*` 규칙).
- 세로 카메라(map.js 123행)에서 DOOR가 화면 밖이면 엔딩은 화면 가장자리로 빠져나가는 그림으로 대신한다(P4 시작 때 세 카메라에서 `project(DOOR)` 확인).

**P4.5. 첫 게시 (11/02 전, 맵 1만)**
- 지금 게시본(https://claude.ai/artifact/5KaMhczA1p4Ro6eNUCojbY)을 `Artifact read`로 끝까지 읽고, 같은 `url`로 `dist/artifact.html` 게시, `capabilities:{db:{},user:{}}`.
- P3 관문에서 그림체가 거부돼도 P4.5는 막지 않는다: 하루 보기 규칙과 단순한 한 주 보기(색 칸 띠)로 먼저 게시하고 그림체는 나중 판에서 바꾼다(11/02 전 연습 주 기록이 우선).
- 게시 뒤 실제 db 확인:
  1. **잠금 실측(F12):** 페이지의 숨은 진단 패널(`#diag`)을 머리말 eyebrow(body.html 5행)를 5번 연달아 눌러 연다(`?diag=1`은 보조 — 아티팩트 iframe에 쿼리가 오는지 불확실). 패널이 `data/users/<uid>/probe`(**4조각 문서**, 5조각 `.../probe/x`는 컬렉션이라 `doc()`이 TypeError)에 `acquire` 후 `get()`해서 `exists`·본문·`version`을 찍는다. 결과를 CLAUDE.md에 적고, 가짜 런타임의 기본 `acquire` 동작을 실측과 같게 맞춘다.
  2. 민이 휴대폰에서 오늘 시각 입력 → 노트북에서 같은 주·같은 기록이 보이는지 민이 확인.
  3. 같은 진단 화면에서 `journey.startedOn`, 이번 주 days 문서들의 본문(`line`, `auto`), (있다면) `weeks` 문서 본문을 확인.
  4. `ArtifactData list`로 `data/users/…/journey/days` 읽기 시도(사람별 영역은 소유자에게도 숨겨질 수 있으니 안 보이면 그렇다고 기록).
  5. 1이나 3이 기대와 다르면 `ST.RECORD=false`로 다시 게시하고(판정·화면 그대로) 민에게 알린다.

**P5. 맵 5개 풍경** (참고 그림 4장을 받은 뒤)
- 맵 표 `MAPS[0..4]`: 하늘·풀·길·구름·꽃 색, 나무 모양 분기 하나(맵 4 침엽수).
- 셰이더에는 유니폼 배열 대신 **맵이 바뀔 때 FS를 다시 컴파일해 상수로 주입**한다(FS가 이미 `${CLOUD_Y}`처럼 JS 상수를 끼운다, map.js 141행). 지금 모듈 상수인 `FS`(132행)를 `makeFS(map)` 함수로 바꾼다. 유니폼 수 그대로, 상수 접기 유지. 대가는 맵이 바뀌는 날(주 1회 이하) 한 번 수백 ms 컴파일 + 전체 다시 그리기.
- `initGL`(437–478행)을 "프로그램 만들기 + attribute 위치(`a`, 446행 `getAttribLocation`·`vertexAttribPointer`) + 유니폼 위치 + 프로그램 상태 유니폼 설정(샘플러 `uniform1i`, 466–475행의 고정 값)"과 "텍스처 만들기·바인딩(컨텍스트 상태)"으로 나눈다. 다시 컴파일 때 텍스처는 재사용, 새 프로그램이 링크에 성공한 뒤에만 이전 프로그램을 `deleteProgram`(실패하면 이전 맵 풍경 그대로 + 콘솔 오류).
- 한 주 보기·다음 맵 카드도 같은 `MAPS` 표의 색을 쓴다.

**P6. 마무리**
- `CLAUDE.md` 갱신(새 파일, 데이터 모델, 규칙, 시험 명령, 함정), 머리말 v0.6(body.html 5행).
- 같은 절차로 다시 게시. 문서 `v` 값이 모르는 값이면 페이지는 읽기 전용 + 배너(되돌림: 이전 아티팩트 버전 재게시, 데이터는 더하기만 했으므로 그대로 호환).

## 7. 수용 기준과 시험

도구: U = `node --test tools/journey.test.cjs`, E = `node tools/journey-e2e.cjs`, S = `node tools/shot.js`. E와 S는 같은 가짜 런타임 `tools/fake-claude.js`를 쓴다.
- 가짜 런타임: `addInitScript`로 `window.claude = {use}` 주입. `db`는 doc/collection/where("in")/get/set/update/delete/acquire/onSnapshot과 `metadata{fromCache,hasPendingWrites}`를 흉내 내고, 저장소는 Node 쪽 객체(`context.exposeBinding`, 페이지 → Node)라 한 브라우저 맥락의 두 페이지가 공유한다. 변경 알림은 Node가 쓰기를 받을 때마다 맥락의 모든 페이지에 `page.evaluate(p=>window.__fakeDbPush(p), path)`로 밀어 넣어 `onSnapshot` 콜백을 부른다(Node → 페이지). `user.id()` = 고정 문자열.
- 스위치: `fromCache:true` 강제, 오류 코드 주입, 쓰기 도착 지연(ms), **`acquireCreates`**(`true`면 `acquire`가 없는 문서를 빈 본문 `{}`으로 만든다, 기본값 `true` = 보수적; P4.5 실측 뒤 실측과 같게 맞춤).
- 가짜 `doc()`/`collection()`은 실제처럼 경로 조각 수가 틀리면 동기 `TypeError`를 던진다. 내 쓰기는 즉시(`hasPendingWrites:true`) 알린다(도착 지연 스위치와 무관). 닫히는 페이지로의 밀어 넣기 실패는 삼킨다.
- 쓰기 판정은 **문서별**(그 문서의 최종 상태와 그 문서 쓰기 횟수)로 센다. fixture의 startedOn이 10/22라 연습 주의 auto·weeks 쓰기가 함께 일어나기 때문.
- 공통 실패 조건: E와 S 모두 `pageerror`나 `console.error`가 하나라도 나면 실패.
- 시계: `page.clock.setFixedTime(…)`(Date만 고정, rAF는 그대로). 열린 탭의 날짜 넘김은 `setFixedTime`으로 시각을 옮긴 뒤 `document.dispatchEvent(new Event('visibilitychange'))`로 알린다.
- 공통 fixture(주 = 2026-11-02 월 시작, 1주차, startedOn 2026-10-22): **F-lose2**: 월 2선, 화 1선, 수 2선, 목~토 1선 → 수요일부터 트램펄린 없음, 모자 잃은 날 월·수, 결과 실패. **F-lose3**: 월 1선, 화 3선, 수 3선 → 화요일 발밑→망가짐, 수요일은 걷기. **F-keep**: 월~토 1선 → 성공, 11/09에 맵 2. **F-run5**: 11/02·11/09·11/16·11/23 네 주 월~토 1선(→ 11/30 주는 맵 5), 11/30 주도 월~토 1선 → 12/07에 맵 1·2회차·엔딩.
- E2·E10·E16은 `acquireCreates`를 `true`와 `false`로 각각 한 번씩 돈다.

| 명세 기준 | 시험 | 판정 조건 |
|---|---|---|
| 첫 입력 = 그날 기록, 당일 수정, 자정 후 불가 | E1 | 11/02 09:00 빈 칸에 07:30 입력 → `days/2026-11-02 {woke:"07:30",line:1}` / 08:40으로 고침 → line 갱신 / `setFixedTime(11/03 00:01)` + `visibilitychange` → `#woke`가 빈 칸(11/03 pending)이 되고, 월요일 버튼을 누르면 `#woke` disabled·값 08:40, 11/02 문서 쓰기 0회 |
| 자정 직전 입력 | E1b | 쓰기 도착 지연 1500ms, `setFixedTime(11/02 23:59:59)`에서 07:30 입력(그날 첫 입력) → 쓰기가 대기 중일 때 `setFixedTime(11/03 00:00:00.5)`로 시계를 옮김 → `days/2026-11-02 {woke:"07:30",line:1,auto:false}`가 생김, `setFixedTime(11/03 00:02)` 뒤 다시 열어도 11/02는 auto 3선이 되지 않음 |
| 키보드 입력 몰림·빈 값 | E1c | 11/02 09:00 `#woke`에 `page.keyboard.type("0840")` → 11/02 문서 쓰기 ≤ 2회, 최종 `{woke:"08:40"}` / 칸을 지움(`''`) → 쓰기 0회, 기록 그대로 |
| 빈 날 = 3선으로 기록 | U3, E2 | 11/03 기록 없이 11/04 열기 → `days/2026-11-03 {line:3,auto:true}` 정확히 1회 set (`acquireCreates` 두 값 모두) |
| 오늘 미입력 상태 | U4, E3 | 11/04 10:00 기록 없음 → `#woke` 빈 칸, 칩 '아직 안 적음', `__dw.hat===true` |
| 2선 날 하루 종일 모자 없음, 다음 날 모자 | U5, E4 | F-lose2 월요일: `__dw.hat===false`, 저녁 칸 클릭 → 이동 끝 → 여전히 `false` / 화요일: `true` |
| 3선 1번 또는 2선 2번 → 그때부터 주 끝까지 없음 | U6, U7, E5 | F-lose2 수요일·목요일: `__dw.tramp==="none"` / F-lose3 수요일: `"none"` |
| 3선 당일 발밑, 한 주 보기 망가짐 | U8, E6 | F-lose3 화요일: `__dw.tramp==="feet"`, `__dw.feet===true`; 한 주 보기 화요일 구간에 `.wk-broken` 1개 |
| 트램펄린 없는 3선 날은 걷는다 | U9, E7 | F-lose3 수요일: `__dw.feet===false`, 오후 칸 클릭 → 걷기 끝 → `__dw.maxHop < 1.0`(걷기 hopH .95, 발밑 2.6, map.js 654행) / 대조: 화요일 같은 동작 → `maxHop > 1.5`(SwiftShader에서 rAF 표본이 성겨도 안정) |
| 전환 버튼 | E8 | `#viewToggle` → `#week` 보임·`#stage` visibility hidden / 다시 → 반대 |
| 한 주 보기 구간 | E9 | F-lose2 목요일 10:00: 구간 `data-line` = [2,1,2,…], 목 `.wk-pending`, 금·토 `.wk-empty`, `.wk-hat` 2개(월·수), `.wk-broken` 1개(수요일 구간, 2선으로 잃은 날) |
| 일요일 점프 성공·실패 | E10, E11 | F-keep 11/08 일요일 `.wk-summit` 클릭 → 하루 보기로 전환, 정상 도착 뒤 `#jumpCard` 문구 '다음 주 맵', `seen/2026-11-02` 생김 / 11/09 열기 → `weeks/2026-11-02 {kept:true,toMap:2}`, 머리 '맵 2' / F-lose2 → `#jumpCard` 문구 '같은 맵에서 다시', 11/09 `toMap:1` |
| 놓친 점프 한 번 | E12 | F-keep, 일요일 안 누름 → 11/09 열기 → '지난 일요일 점프 보기' 보임 → 누름 → `seen` 생김 → 새로 열기 → 안 보임 / 일요일에 눌렀으면 11/09에 처음부터 안 보임 |
| 맵·회차 db 저장, 다음 주 그 풍경 | U10, E13 | E10 뒤 `weeks` 문서 값 확인, P5 이후엔 FS 상수 주입 값이 `MAPS[1]` |
| 5번째 맵 넘으면 엔딩 후 2회차 | U11, E14 | F-run5, 12/07 열기 → `weeks/2026-11-30 {fromMap:5,toMap:1,toLap:2,ending:true}`, '지난 일요일 점프 보기' → 엔딩 요소 `.wk-ending` 1회 표시, 머리 '맵 1 · 2회차' |
| 연습 주, 'N주째 / 10주' | U12, U13, E15 | 10/26 주: 머리 '연습 주', 성공해도 `toMap` 그대로 / 11/02 주: '1주째 / 10주' / 2027-01-11 주: '11주째' |
| 시작 전 날 | U14, E16 | 빈 db로 10/22 첫 열기 → `journey {startedOn:"2026-10-22"}` 생김(`acquireCreates` 두 값 모두), 10/19~21 구간 `.wk-empty`, auto 쓰기 0회, 트램펄린 있음 |
| 일요일 제외 | U15 | 일요일 3선·빈 일요일이 있어도 `kept` 그대로, 일요일 auto 쓰기 없음 |
| 다른 기기 같은 기록 | E17 | 같은 맥락 두 페이지: 페이지 A 입력 → 페이지 B가 `onSnapshot`으로 같은 `data-line` |
| db 없으면 표시, 확정 없음 | E18 | `use("db")→null`: 칩 '기록 안 됨', 쓰기 0회, `__journeyReady===true` / `fromCache:true` 강제: auto 쓰기 0회 |
| 움직임 줄이기·WebGL 없음 | E19, E20 | `emulateMedia({reducedMotion:'reduce'})`: E8·E9·E12 통과, 점프 중 `#dwarf` `transform` 변화 없음 / `--disable-webgl` 실행: `.stage.nogl`, `pageerror` 0, F-lose2 월요일 `getComputedStyle(#dwarf .dw-hat).display==="none"`, 수요일 `.dw-tramp` display none, F-lose3 화요일 `.dw-feet` 보임, 난쟁이 칸 이동 뒤 `.body` transform 갱신됨, E8·E9 통과 |
| 기기 시간대가 서울이 아님 | E21 | `timezoneId:'America/Los_Angeles'` 맥락에서 E1·E9를 다시: 같은 서울 날짜·요일·기대값 |

단위 시험 U1~U18: U1 서울 자정 경계(2026-11-01T15:00Z = 11/02 00:00), U2 월요일·주 번호, U3 빈 날 3선, U4 pending, U5 2선 모자, U6 3선 1번, U7 2선 2번(그날 `none`), U8 3선 당일 `feet`, U9 잃은 뒤 3선 걷기, U10 성공 시 맵 증가, U11 5→1 회차·엔딩, U12 연습 주 맵 고정, U13 11주차 이후 번호, U14 시작 전, U15 일요일 제외, U16 같은 날 수정으로 되찾음(화 3선 → 1선으로 고치면 트램펄린 있음), U17 2선→3선 순서(3선 날 `feet`), U18 2주 공백 → 두 주 모두 실패, 차례로 결과.

## 8. 위험과 대응

| 위험 | 대응 |
|---|---|
| 두 기기가 겹쳐 씀 | 참값은 계산. 기록은 `acquire → get(fromCache=false) → 필수 필드가 없을 때만 set`(쓰기-한-번, 결정적 본문). 카운터 없음. 같은 문서는 직렬 줄 |
| `acquire` 의미가 문서와 다름(빈 문서 생성 등, F12) | 필드 기준 판정 + 가짜 런타임 두 동작 모두 시험 + P4.5 실측. 나쁘면 `ST.RECORD=false`(판정·화면 무변화) |
| 그림자 트리로 SVG 상태가 안 먹음 | `<use>`를 쓰지 않는다. 그림은 인라인, 한 주 보기는 복제. E20이 계산된 `display`로 확인 |
| 기기 시계가 틀림 | 받아들인다(F2). 판정은 서울 날짜로만, 잠금은 페이지 규칙. 혼자 쓰는 앱이라 영향은 본인 기록 하나 |
| db 늦게 도착해 첫 렌더 두 번 | `dw.cache`로 첫 렌더, 다를 때만 한 번 더. 최악(캐시 없음 + 선 다름) 2회 |
| 숨긴 무대가 다시 그리기 유발 | `visibility:hidden`(크기 유지) + `breathe` 정지 |
| 엔딩 포물선 비용 | 셰이더가 아니라 SVG 난쟁이로 |
| 유니폼 상한 | P5는 상수 주입 재컴파일 |
| 전역·CSS 이름 충돌 | 새 전역은 `JR`·`ST`·`WK`·`TODAY`·`onDayChange`만. 이미 있는 `DAY`·`MATH`·`SRC`·`ALL`·`PLAN`·`PLANS`·`BLOCKS`·`WEEKLY`·`R`(data.js·school.js), `store`·`route`·`state`·`svg`·`dw`·`DW`·`HAT`(map.js), `view`(scroll.js)와 겹치지 않음. CSS `wk-` 접두어. 빌드 뒤 E 공통 실패 조건(`pageerror`)이 충돌을 바로 잡는다 |
| `type=time`의 `change` 몰림 | 문서별 마지막 값 줄(타이머 없음), 날짜는 첫 `change` 순간, 빈 값은 쓰지 않음, E1c |
| 진단 경로 실수 | 4조각 `probe` 문서, 가짜 런타임도 조각 수 검사 |
| 참고 그림 없음 | P5만 막힘. P4.5에서 맵 1로 먼저 게시 |
| 한 주 보기 그림체 거부 | P3 끝 민 확인 관문. 거부 시 A2 재검토 |
| 대량 auto 쓰기(긴 공백) | 차례로, `resource_exhausted`면 다음 열기로 미룸. 판정은 쓰기와 무관 |

## 9. 검증 단계 (단계별로 그대로 실행)

```bash
cd oiphorion
python3 build.py && python3 build.py --test-bundle      # P0~: 앵커 점검, dist/test-bundle.js
node --test tools/journey.test.cjs                      # P0~: U1~U18
node tools/journey-e2e.cjs                              # P2~: E1~E21, E1b·E1c 포함 (가짜 런타임, 고정 시계, pageerror = 실패)
node tools/shot.js 1280 800 lose2-mon.png --at=2026-11-02T10:00 --fixture=lose2              # 2선 월: 모자 없음
node tools/shot.js 1280 800 lose3-tue.png --at=2026-11-03T10:00 --fixture=lose3              # 3선 화: 발밑
node tools/shot.js 400 820 week-phone.png --at=2026-11-05T10:00 --fixture=lose2 --view=week  # 한 주 보기 휴대폰
```
- shot.js는 기존 위치 인자(너비 높이 출력 [일어난시각])를 그대로 받고, `--at`·`--fixture`·`--view`가 있으면 `fake-claude.js`와 `setFixedTime`을 쓴다. 기다림은 `__journeyReady && __rendered>=1`.
- e2e·shot은 CommonJS(`require('playwright')`, 전역 설치는 NODE_PATH로 찾음. ESM `import`는 이 환경에서 실패).

## 10. 열린 질문 (기본값으로 진행, 민이 바꿀 수 있음)

- Q1. 3선 날에도 모자를 잃나? 기본: 명세대로 2선만(3선 날은 모자 쓰고 발밑으로 튄다). P2 스크린샷으로 확인.
- Q2. 10주 뒤(1/11~)? 기본: 'N주째'만 계속, 규칙 그대로.
- Q3. 일요일 점프는 미리 보기, 실제 맵 교체는 월요일. 기본: 그대로(R17).
- Q4. 일요일 하루 보기에서 2선이면 모자? 기본: 규칙 4대로 잃는다(그림만, 판정 영향 없음).

## ADR (Architecture Decision Record)

- **Decision:** 하루 보기(셰이더) + 한 주 보기(HTML/SVG 띠)를 오가는 구조로, 규칙은 순수 엔진 `JR`이 사실(하루 기록·시작일)을 접어 매번 계산하고, db(`data/users/<uid>/journey/...`)에는 입력한 하루 기록과 쓰기-한-번 기록(자동 3선·주 결과·본 표시)만 둔다. 쓰기-한-번 기록은 `acquire` + 필수 필드 판정으로 쓰고 `ST.RECORD`로 끌 수 있다. 맵 2~5 풍경은 맵이 바뀔 때 셰이더를 다시 컴파일해 상수로 넣는다.
- **Drivers:** ① 휴대폰·노트북에서 같은 주·같은 맵(정확성) ② WebGL 없음·움직임 줄이기에서도 같은 규칙 표시(대체 경로) ③ 혼자 유지보수하는 외부 라이브러리 없는 한 장짜리 빌드(단순성).
- **Alternatives considered:**
  - A2 셰이더로 한 주 지형 다시 그리기 — 전환마다 전체 렌더, WebGL 없음 대체를 결국 SVG로 따로 만들어야 해 A1을 포함. 그림체 위험 때문에 P3 관문에서 다시 열 수 있게 둠.
  - B2 규칙을 map.js 안에 — Node 시험 불가, 연출과 엉킴.
  - C3 계산만 하고 아무것도 쓰지 않기 — 가장 단순하고 경쟁이 없지만 AC2·AC9 "db에 기록/저장" 문구를 어김. `ST.RECORD=false`로 언제든 정확히 이 상태로 내려갈 수 있게 남김.
  - C4 진행 문서 하나(`journey{map,lap,last}`) 갱신(v1안) — `set` 통째 교체로 `seen`이 되살아나고 `map+1`은 db가 금지하는 카운터.
  - C2 자정 타이머 쓰기 — 탭이 닫히면 무의미, db 지침 위반.
  - 유니폼 팔레트 배열 — 모바일 WebGL1 유니폼 상한 위험.
  - `<symbol>`/`<use>`로 난쟁이 재사용 — 그림자 트리라 상태 CSS와 `.body` 조회가 깨짐.
- **Why chosen:** 판정을 저장과 떼어 놓으니 last-writer-wins·트랜잭션 없음·`acquire` 의미 불확실성이 판정의 정확성에 닿지 않는다. 명세 문구(기록·저장)는 쓰기-한-번으로 지키되, 실측이 나쁘면 화면·판정 변화 없이 C3로 내려갈 수 있다. 한 주 보기를 SVG로 해서 셰이더 예산과 대체 경로가 그대로다.
- **Consequences:**
  - 좋은 점: 두 기기 동시 사용에도 같은 결과, `pageerror`·가짜 런타임·고정 시계로 규칙 전체를 Node·브라우저에서 시험 가능, 11/02 전에 맵 1로 먼저 게시 가능.
  - 대가: 파일 4개(journey.js, store.js, week.js, week.css)와 시험 도구 3개(test-bundle, journey.test.cjs, journey-e2e.cjs + fake-claude.js) 추가. 자정 굳음은 기기 시계를 믿는 페이지 규칙. 한 주 보기는 3D와 그림체가 다르다. P4.5에서 `acquire` 실측 전까지 AC2·AC9 준수는 잠정.
- **Follow-ups:**
  - P4.5 `acquire` 실측 결과를 CLAUDE.md에 기록하고 가짜 런타임 기본값 맞추기(결과에 따라 `ST.RECORD`).
  - 참고 그림 4장 받기(P5).
  - Q1~Q4 민 확인(3선 날 모자, 10주 이후, 일요일 미리 보기, 일요일 모자).
  - 같은 규칙을 C++ `study_os.cpp`에 옮기기(이번 범위 밖, CLAUDE.md "같은 규칙" 원칙).
  - 한 주 보기 그림체가 거부되면 A2 재검토.
  - 수도코드 줄 번호 이름표화(CLAUDE.md 열린 항목, 별개).

## 변경 기록 (v3 → 최종, 3회차 검토 개선 반영)

- 진단 경로를 4조각 `data/users/<uid>/probe`로(5조각은 컬렉션 → TypeError). 진단 패널은 머리말 5번 탭으로 열고 쿼리는 보조. 가짜 런타임도 조각 수 검사(Architect N1·N5, Critic m3 — 양쪽).
- `type=time`의 `change`가 키보드 입력마다 난다는 실측에 맞춰: 문서별 마지막 값 줄(타이머 없음), 날짜는 첫 `change` 순간, 빈 값은 쓰지 않음, E1c 추가(Architect N2, Critic m2 — 양쪽).
- `acquire`는 자동 3선·weeks 전용, `saveToday`·`startedOn`은 잠금 없이 → `ST.RECORD=false`가 정확히 C3. finalize는 '어제'를 00:01 이후에만(Architect N3·종합안, Critic 빠진 것).
- 다시 그리기 비교 키를 `line|hat|tramp|pending`으로, `dw.cache`에 `hat`·`tramp`(Architect N4).
- 하루 상태 이름 `DAY` → `TODAY`(data.js 4행 `const DAY`와 충돌), 이름표 목록 정정(Critic m1).
- 점프 결과는 공용 `#jumpCard`, E10·E11 선택자 정정(Critic m4). '지난 일요일 점프 보기' 대상은 최근 주부터 이어진 `seen` 없는 주만(Critic m5). E1b는 대기 중 시계를 옮김(Critic m6). E7 대조 기준 1.5.
- `WK`는 map.js가 직접 부르지 않고 `onDayChange` 훅으로(Critic m7). weeks 읽기 판정(Critic m8). `#week`는 `#stage`의 형제, WebGL 없음 머리 배경, `.wk-dwarf` 선택자(Critic 빠진 것·모호).
- 구독 `unavailable`은 다시 구독, 쓰기 판정은 문서별, 내 쓰기 즉시 알림(Architect N6·N7). P5 attribute 위치·컴파일 실패 시 이전 프로그램 유지(Architect 권장 7).

## 변경 기록 (v2 → v3)

- `acquire`가 빈 문서를 만들 수 있음(F12): 모든 "없을 때만"을 필수 필드 기준으로, 읽을 때 `line` 없는 days는 기록 없음, 가짜 런타임 `acquireCreates` 스위치로 두 동작 모두 시험, P4.5 잠금 실측과 `ST.RECORD` 내려가기 경로(Architect B2·R1, Critic Major 2 — 양쪽이 따로 찾음).
- `<symbol>`/`<use>` 이동 철회: 그라디언트 `<defs>`만 `#dwDefs`로, 몸 그림은 인라인, 한 주 보기는 `cloneNode`. `data-*` 갱신을 `refresh()`로, 값 체계를 `back|none|feet`로 통일. E20이 계산된 `display`와 `pageerror`로 확인(Architect B1·R2, Critic Major 1·Minor 3 — 양쪽).
- 잠금 계약: 탭별 `holder`, `ttlMs` 4000, `acquired:false` 처리, 문서별 직렬 쓰기 줄에 `setWake` 포함(Architect B3·R3).
- 자정 직전 입력: 800ms 모아 쓰기 제거, 입력 순간 날짜로 받음, E1b 기대값을 "기록됨"으로 뒤집음(Critic Minor 1, Architect m7). 변경 기록과 본문의 모순 해소.
- `dw.cache`에 `date`, `__journeyReady`는 마지막 필요한 렌더 뒤, 열린 탭 날짜 넘김 때 `#woke` 날짜·이번 주 구독 갱신, 일요일 트램펄린은 `feet` 불가, P1에 store.js 빌드 목록 줄(Architect m1·m2·m4·m6·m8, Critic Minor 5·6).
- 시험: `__dw.hop`·`maxHop` 훅과 E7 대조, F-run5 fixture로 E14, 가짜 `onSnapshot` 밀어 넣기, 시계 넘김 절차(`visibilitychange`), 서울 아닌 시간대 E21, 공통 실패 조건(Critic Minor 2·7·8·9, 빠진 것).
- off 모드 `#woke`는 미리 계산만(기존 shot.js 명령 유지), 점프는 하루 보기에서 정상까지 걸어간 뒤, P3 관문 거부가 P4.5를 막지 않음, 캔버스 배경은 렌더 끝난 뒤 1/4 `drawImage`(Critic Minor 4·10·11·12, Architect m3).
- P5: `makeFS(map)`, 프로그램 상태 유니폼 재설정, `deleteProgram`(Architect m5).

## 변경 기록 (v1 → v2)

- 저장 모델: 진행 문서(`journey{map,lap,last}`)를 없애고 사실 + 접기 계산 + 쓰기-한-번 `weeks`·`seen`으로(Architect R1, Critic 대안 지적). 결정 C에 C3·C4를 정식 비교.
- auto 3선·주 기록을 `acquire → get(fromCache=false) → 없을 때만 set`으로, 열린 탭 날짜 넘김은 표시만(Architect R2, F3 모순 해소).
- 쿼리: `date` 필드 추가, `where("in")`과 컬렉션 `get()`으로(양쪽).
- 새 상태: `startedOn`(시작 전), `pending`(오늘 미입력), 일요일 제외, 2선으로 잃은 날 `none`·3선으로 잃은 날 `feet`(양쪽).
- 입력 칸 기본값·`dw.woke` 복원 제거, 자정 직전 입력은 입력 순간 날짜(Critic M1, m7).
- P2 범위를 지울 것·남길 것·호출 지점으로 다시 씀(Architect).
- SVG 대체 난쟁이에 상태 연결, E20에 하루 보기 판정(양쪽).
- 렌더: `dw.cache` 첫 렌더, `visibility:hidden`, `breathe` 정지, 엔딩·미리 보기는 SVG, P5는 상수 주입 재컴파일(Architect).
- 빌드·시험: build.py 목록을 단계별로 늘림, WEEK_CSS 치환 줄, `--test-bundle`, `.cjs` 시험, 가짜 런타임 공용, shot.js 인자(Critic M5, Architect).
- 수용 기준표에 fixture와 판정 조건, `__dw`·`__journeyReady` 훅(Critic M6).
- 점프 입구를 전용 버튼·`.wk-summit`으로, 일요일에 본 점프는 `seen`으로 다시 안 뜸(양쪽, Critic m2·m3).
- 엔딩을 P4로 옮겨 그림 의존 제거, P4.5 첫 게시와 실제 db 확인(Critic m5·m6·M7).
- 오류 코드 처리 보강(양쪽).
