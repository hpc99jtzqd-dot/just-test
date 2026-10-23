
/* ───── 수업 날 (월~목) ───── */
/* 집을 나서는 시각(분). study_os.cpp의 LEAVE_AT 한 줄에서 빌드 때 가져온다: [월,화,수,목] */
const LEAVE_AT = __LEAVE__;
const LEAVE_OF = d=>LEAVE_AT[d-1];
const leaveText = ()=>(LEAVE_AT[0]===LEAVE_AT[2]&&LEAVE_AT[1]===LEAVE_AT[3])
  ? "월·수 "+hhmmLabel(LEAVE_AT[0])+", 화·목 "+hhmmLabel(LEAVE_AT[1])
  : ["월","화","수","목"].map((n,i)=>n+" "+hhmmLabel(LEAVE_AT[i])).join(", ");
const SCHOOL = `상수 통학 ← 1시간
상수 수업[월~목] ← 시간표        ▷ 월·수: 프언론 → 알골 → 게임 (월 저녁 기창특) / 화·목: 시소프 → 미적2 → 공수1
상수 저녁초점[월~목] ← [프언론 · 알골 훑기, 시소프 · 미적2 · 공수1, 알골 · 프언론 · 게임, 미적2 · 공수1 · 시소프]

절차 수업날(요일, 일어난시각)
    집을 나설 시각 ← ${leaveText()}
    남은 시간 ← 집을 나설 시각 − 일어난시각
    만약 남은 시간 > 1시간 이면                               ▷ 큰길: 여유 아침
        약 → 씻기 → 밥 차려 먹기 → 약 → 도시락 싸기
        예습거리 하나, 클로드와 이야기
        머리 → 화장품 → 옷
    아니고 만약 남은 시간 > 0 이면                            ▷ 샛길: 빠듯한 아침
        약 → 씻기 → 아침밥 → 약 → 머리 → 화장품 → 옷
    아니면                                                    ▷ 오솔길: 출발 시각이 지났다
        첫 수업은 놓쳐도 나머지 수업은 간다
        저녁 블록 ← [최소 기준선]
    끝
    통학 중: 카드와 변형 노트를 넘겨 본다                      ▷ 서서 가니까 읽기만
    수업[요일]의 각 c 에 대해
        c 를 듣는다, 떠오른 생각은 주차장에 한 줄
        다음 수업까지 2시간쯤 비면 점심 + 공강 블록 50분        ▷ 방금 들은 c 리뷰
    반복 끝
    점심 뒤: 수학 문제 1개                                    ▷ 습관 신호
    귀가 통학 1시간: 카드만 넘겨 본다
    도착 ← 마지막 수업이 끝난 시각 + 통학
    만약 요일 = 월 이면
        도착~23:00 저녁 블록 ← 저녁초점[월] 1블록             ▷ 21:30 도착이라 짧다
    아니면
        도착~23:00 저녁 블록 ← 1블록 → 저녁밥 → 2·3블록 → 취미 30~60분
    끝
    23:00: 화면 끄기, 내일 옷·가방 챙기기, 내일 할 일 5분 적기
    잠                                                        ▷ 자정 전
    다음 기상 ← 기상시각                                      ▷ 수업 없는 날도 그대로
절차 끝`.split("\n");
SRC.school = {lines:SCHOOL, name:"수업 날"};

const MINIMUM_SCHOOL = (when,extra)=>({id:"minimum", short:"최소 기준선", name:"최소 기준선 · 수업 날", fixed:true,
  story:"크게 늦은 날엔 오솔길로. 첫 수업은 놓쳐도 나머지 수업은 가고, 저녁엔 이것만 한다.",
  when, lines:[3], only3:true,
  todo:["첫 수업은 놓쳐도 나머지 수업은 간다","집에 오면 수학 5문제 + 그날 리뷰 20분"].concat(extra||[]),
  pseudo:[{src:"school",from:5,to:34,hl:R(14,16)}],
  cpp:[["school.route","planSchoolDay() · 오늘의 길 고르기"],["school.minimum","planSchoolDay() · 3선이면 최소 기준선만"]]});

const DAWN_SCHOOL = leave=>({id:"dawn", short:"출발", name:"출발 · 등교 준비", fixed:true,
  story:"집을 나서기까지 한 시간 넘게 남았으면 여유 있는 아침, 아니면 빠듯한 아침.",
  when:W=>[W,Math.max(leave,W+20)],
  todo:["약 → 씻기 → 밥 차려 먹기 → 약","도시락 싸기","예습거리 하나 · 클로드와 이야기","머리 → 화장품 → 옷 → "+hhmmLabel(leave)+" 출발"],
  todoBy:{
    1:["약 → 씻기 → 밥 차려 먹기 → 약","도시락 싸기","예습거리 하나 · 클로드와 이야기","머리 → 화장품 → 옷 → "+hhmmLabel(leave)+" 출발"],
    2:["약 → 씻기 → 아침밥 → 약","머리 → 화장품 → 옷",hhmmLabel(leave)+" 출발"],
    3:["바로 준비해서 나간다","첫 수업은 놓쳐도 나머지 수업은 간다"]},
  pseudo:[{src:"school",from:5,to:34,hl:R(5,17)}],
  cpp:[["school.morning","planSchoolDay() · 남은 시간으로 아침 고르기"],["LEAVE_AT","LEAVE_AT · "+leaveText()]]});
function hhmmLabel(m){ return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0"); }

const CAMP_SCHOOL = {id:"camp", short:"야영", name:"야영", fixed:true,
  story:"자정 전에 짐을 푼다. 내일도 같은 땅에서 다시 출발한다.",
  when:W=>[1440,1440+W], todo:["잠","내일 기상도 같은 시각"],
  pseudo:[{src:"school",from:5,to:34,hl:[32,33,34]}],
  cpp:[["school.night","planSchoolDay() · 마지막 안내"],["main","main() · 메뉴 7) 수업 날 계획"]]};

const CLOSE_SCHOOL = {id:"closing", short:"잘 준비", name:"잘 준비", fixed:true,
  story:"불빛을 줄이고, 내일 아침에 쫓기지 않게 옷과 가방을 미리 꺼내 둔다.",
  when:()=>[1380,1440],
  todo:["화면 끄기","내일 옷·가방 챙기기","내일 할 일 5분 적기"],
  pseudo:[{src:"school",from:5,to:34,hl:[31]}],
  cpp:[["school.night","planSchoolDay() · 23:00 마감 안내"],["endOfDay","endOfDay() · 못 푼 건 내일로 넘긴다"]]};

function eveningBlock(focus, dayName, start){ return {id:"hobby", short:"저녁 블록", name:"저녁 블록 · "+dayName, fixed:true,
  story:"집에 도착하자마자 한 블록. 밥 먹고 두 블록 더, 그다음 취미. 50분 걷고 10분 쉰다.",
  when:()=>[start,1380], lines:[1,2],
  todo:["도착하자마자 1블록 → 저녁밥 → 2·3블록 → 취미 30~60분"].concat(focus),
  pseudo:[{src:"school",from:1,to:34,hl:[3,25,26,28,29,30]},{src:"math",from:20,to:31,hl:R(20,31)}],
  cpp:[["EVENING_FOCUS","EVENING_FOCUS · 요일별 저녁 초점"],["school.evening","planSchoolDay() · 도착한 시각부터 저녁 블록"],["mixedSet","mixedSet() · 섞어서 풀기"]]}; }

function homeBlock(s){ return {id:"evening", short:"귀가", name:"귀가 통학", fixed:true,
  story:"서서 오는 1시간은 읽기만. 도착하는 순간이 저녁 블록의 시작이다.",
  when:()=>[s,s+60],
  todo:["카드와 변형 노트 넘겨 보기","서서 가니까 읽기만"],
  pseudo:[{src:"school",from:5,to:34,hl:[24,25]}],
  cpp:[["school.home","planSchoolDay() · 귀가 통학과 도착 시각"]]}; }

function makeTT(d, dayName, focus){ return Object.assign([
  DAWN_SCHOOL(LEAVE_OF(d)),
  {id:"morning", short:"시소프", name:"시스템소프트웨어", fixed:true, story:"서서 가는 통학길엔 카드만 넘긴다. 수업 중 떠오른 생각은 주차장에.",
   when:()=>[600,720], lines:[1,2], todo:["10:00 시소프 수업","떠오른 생각은 주차장에 한 줄"],
   pseudo:[{src:"school",from:5,to:34,hl:[18,19,20,22]}], cpp:[["school.lectures","planSchoolDay() · 수업과 공강"],["TIMETABLE","TIMETABLE · 월~목 시간표"]]},
  {id:"lunch", short:"공강", name:"공강 · 점심 · 한 문제", fixed:true, story:"두 시간 공강. 밥 먹고 수학 한 문제, 그리고 방금 들은 시소프를 50분 되짚는다.",
   when:()=>[720,840], todo:["점심 → 수학 문제 1개","공강 블록 50분: 시소프 리뷰"],
   pseudo:[{src:"school",from:5,to:34,hl:[21,23]}], cpp:[["school.lectures","planSchoolDay() · 공강 블록과 습관 신호"]]},
  {id:"afternoon", short:"미적2 · 공수1", name:"미적2 · 공수1", fixed:true, story:"수학 두 과목을 연달아. 막힌 곳은 표시만 해 두고 저녁에 푼다.",
   when:()=>[840,1020], todo:["14:00 미적2 · 15:30 공수1","막힌 곳은 표시만, 저녁에 푼다"],
   pseudo:[{src:"school",from:5,to:34,hl:[19,20,22]}], cpp:[["school.lectures","planSchoolDay() · 수업과 공강"],["TIMETABLE","TIMETABLE · 월~목 시간표"]]},
  homeBlock(1020),
  eveningBlock(focus, dayName, 1080),
  CLOSE_SCHOOL, CAMP_SCHOOL,
  MINIMUM_SCHOOL(()=>[1080,1380]),
],{leave:LEAVE_OF(d)}); }

const PLAN_MON = [
  DAWN_SCHOOL(LEAVE_OF(1)),
  {id:"morning", short:"프언론", name:"프로그래밍언어론", fixed:true, story:"통학길엔 카드만 넘긴다. 첫 수업은 10:30.",
   when:()=>[630,720], lines:[1,2], todo:["10:30 프언론 수업","떠오른 생각은 주차장에 한 줄"],
   pseudo:[{src:"school",from:5,to:34,hl:[18,19,20,22]}], cpp:[["school.lectures","planSchoolDay() · 수업과 공강"],["TIMETABLE.mon","TIMETABLE · 월"]]},
  {id:"lunch", short:"점심", name:"점심 · 한 문제", fixed:true, story:"한 시간 공강. 밥 먹고 수학 한 문제면 충분하다.",
   when:()=>[720,780], todo:["점심","수학 문제 1개"],
   pseudo:[{src:"school",from:5,to:34,hl:[21,23]}], cpp:[["school.lectures","planSchoolDay() · 공강과 습관 신호"]]},
  {id:"afternoon", short:"알골 · 게임", name:"알골 · 게임프로그래밍", fixed:true, story:"알골 두 시간, 게임프로그래밍 두 시간.",
   when:()=>[780,1020], todo:["13:00 알골 · 15:00 게임프로그래밍","막힌 곳은 표시만"],
   pseudo:[{src:"school",from:5,to:34,hl:[19,20,22]}], cpp:[["school.lectures","planSchoolDay() · 수업과 공강"],["TIMETABLE.mon","TIMETABLE · 월"]]},
  {id:"evening", short:"저녁밥", name:"공강 · 저녁밥", fixed:true, story:"기창특 전 한 시간. 저녁은 여기서 먹는다.",
   when:()=>[1020,1080], todo:["저녁밥","짧게 쉬기"],
   pseudo:[{src:"school",from:5,to:34,hl:[21]}], cpp:[["school.gap","planSchoolDay() · 17시 공강은 저녁밥"]]},
  {id:"hobby", short:"기창특", name:"기술창조와특허", fixed:true, story:"월요일 마지막 수업. 20:30까지.",
   when:()=>[1080,1230], todo:["18:00 기술창조와특허","떠오른 생각은 주차장에"],
   pseudo:[{src:"school",from:5,to:34,hl:[2,19,20]}], cpp:[["TIMETABLE.mon","TIMETABLE · 월"],["school.lectures","planSchoolDay() · 수업과 공강"]]},
  {id:"closing", short:"귀가 · 저녁 블록", name:"귀가 · 저녁 블록 · 월요일", fixed:true, story:"21:30에 도착하는 짧은 날. 한 블록만 하고 23시에 화면을 끈다.",
   when:()=>[1230,1440], lines:[1,2], todo:["귀가 통학: 카드만 넘겨 보기","21:30 도착 → 1블록: 오늘 들은 프언론 · 알골 훑기","23:00 화면 끄기 · 내일 옷·가방 · 할 일 5분"],
   pseudo:[{src:"school",from:5,to:34,hl:[24,25,26,27,30,31]}], cpp:[["school.evening.mon","planSchoolDay() · 월요일은 짧은 저녁 블록"],["EVENING_FOCUS.mon","EVENING_FOCUS · 월"]]},
  CAMP_SCHOOL,
  MINIMUM_SCHOOL(()=>[1290,1380]),
];

const PLAN_WED = [
  DAWN_SCHOOL(LEAVE_OF(3)),
  {id:"morning", short:"프언론", name:"프로그래밍언어론", fixed:true, story:"통학길엔 카드만 넘긴다. 첫 수업은 10:30.",
   when:()=>[630,720], lines:[1,2], todo:["10:30 프언론 수업","떠오른 생각은 주차장에 한 줄"],
   pseudo:[{src:"school",from:5,to:34,hl:[18,19,20,22]}], cpp:[["school.lectures","planSchoolDay() · 수업과 공강"],["TIMETABLE.wed","TIMETABLE · 수"]]},
  {id:"lunch", short:"점심", name:"점심 · 한 문제", fixed:true, story:"한 시간 반 공강. 밥 먹고 수학 한 문제.",
   when:()=>[720,810], todo:["점심","수학 문제 1개"],
   pseudo:[{src:"school",from:5,to:34,hl:[21,23]}], cpp:[["school.lectures","planSchoolDay() · 공강과 습관 신호"]]},
  {id:"afternoon", short:"알골 · 게임", name:"알골 · 게임프로그래밍", fixed:true, story:"알골 두 시간, 게임프로그래밍 두 시간.",
   when:()=>[810,1050], todo:["13:30 알골 · 15:30 게임프로그래밍","막힌 곳은 표시만, 저녁에"],
   pseudo:[{src:"school",from:5,to:34,hl:[19,20,22]}], cpp:[["school.lectures","planSchoolDay() · 수업과 공강"],["TIMETABLE.wed","TIMETABLE · 수"]]},
  homeBlock(1050),
  eveningBlock(["알골 리뷰 1블록","프언론 리뷰 1블록","게임프로그래밍 과제 1블록"],"수요일",1110),
  CLOSE_SCHOOL, CAMP_SCHOOL,
  MINIMUM_SCHOOL(()=>[1110,1380]),
];

PLAN_MON.leave=LEAVE_OF(1); PLAN_WED.leave=LEAVE_OF(3);
const PLANS = {
  free: BLOCKS,
  1: PLAN_MON,
  2: makeTT(2,"화요일",["시소프 리뷰 1블록","미적2 · 공수1 새 문제 2블록"]),
  3: PLAN_WED,
  4: makeTT(4,"목요일",["미적2 · 공수1 섞어서 풀기 2블록","시소프 프리뷰 1블록"]),
};
/* ───── 시험 주말: 날짜를 콕 집어 그날만 계획을 바꾼다 ─────
   2026-10-26(월) 10:30 프언론 시험. 슬라이드 약 250장.
   토: 250장 1회독(오전 1–90 · 오후 91–180 · 저녁 181–250), 모르는 건 질문 목록에.
   일: 백지 복습으로 2회독 → 예상 문제 → A4 한 장 요약. 월 아침엔 그 한 장만 본다.
   시각·길(1·2·3선)·수도코드·C++ 참조는 원래 수업 없는 날 블록을 그대로 쓰고, 이름·할 일만 바꾼다.
   날짜가 지나면 원래 계획으로 돌아간다. */
const examBlock=(id,o)=>Object.assign({},BLOCKS.find(b=>b.id===id),o);
const EXAM_SAT=[
  examBlock("dawn",{name:"출발 · 프언론 1회독 날",story:"월요일 10:30 프언론 시험. 오늘은 슬라이드 250장을 한 번 끝까지 읽는 날이다.",
    todo:["불 켜기 · 창문 열기 · 찬물 세수","250장을 세 덩어리로 나눠 표시: 1–90 · 91–180 · 181–250","질문 목록 종이 한 장 꺼내 두기"],
    todoBy:{2:["찬물 세수","오전이 없으니 두 덩어리로: 1–125 · 126–250","질문 목록 종이 꺼내 두기"],3:["찬물 세수","오늘은 최소 기준선: 250장 제목·정의만 훑기"]}}),
  examBlock("morning",{short:"1–90장",name:"오전 · 프언론 1–90장",story:"50분에 22장쯤. 장마다 '이 장이 묻는 것'을 한 줄로 적는다.",
    todo:["슬라이드 1–90장 (4블록 · 블록당 약 22장)","장마다 '이 장이 묻는 것' 한 줄","모르는 건 붙잡지 말고 질문 목록에"]}),
  examBlock("lunch",{short:"빈칸 1문제",name:"점심 뒤 · 빈칸 한 문제",story:"밥 먹고 고민 없이 한 문제. 오늘은 수학 대신 오전 범위에서 빈칸 문제 하나.",
    todo:["오전 범위에서 빈칸 문제 1개 스스로 내고 풀기"]}),
  examBlock("afternoon",{short:"91–180장",name:"오후 · 프언론 91–180장",story:"오전과 같은 속도. 예제 코드가 나오면 손으로 한 번 따라 쓴다.",
    todo:["슬라이드 91–180장 (4블록 · 블록당 약 22장)","예제 코드는 손으로 한 번 따라 쓰기","질문 목록에 계속 적기"],
    todoBy:{2:["슬라이드 1–125장 빠르게: 정의·그림·예제 위주","블록당 약 25장","질문 목록에 적기"]}}),
  examBlock("evening",{short:"181–250장",name:"저녁 · 프언론 181–250장",story:"마지막 덩어리. 끝나면 질문 목록을 한 번 정리해 둔다.",
    todo:["슬라이드 181–250장 (3블록 · 블록당 약 23장)","질문 목록 정리: 내일 오전에 풀 것"],
    todoBy:{2:["슬라이드 126–250장 빠르게","질문 목록 정리"]},
    extra2:"끝에 30분: 1–60장 제목만 다시 훑기"}),
  examBlock("minimum",{name:"최소 기준선 · 시험 주말",story:"크게 늦은 날에도 250장을 한 번은 넘긴다.",
    todo:["250장 제목·굵은 글씨·정의만 훑기 (약 90분)","예상 문제 5개 만들어 답 적기","이것만 해도 막아 낸 날"]}),
  examBlock("hobby",{name:"취미 · 30분만",todo:["30분, 타이머 맞추고","시험 주말이라 짧게"]}),
  examBlock("closing",{name:"마감 준비",todo:["23:00 화면 끄기","질문 목록 맨 위 3개 표시: 내일 아침 첫 블록","내일 할 일 5분 적기"]}),
  examBlock("camp",{}),
];
const EXAM_SUN=[
  examBlock("dawn",{name:"출발 · 프언론 2회독 날",story:"어제 읽은 250장을 오늘은 덮고 떠올린다. 끝에 남는 건 A4 한 장.",
    todo:["찬물 세수","어제 질문 목록 꺼내기","목표: 백지 복습 2회독 → 예상 문제 → A4 한 장 요약"],
    todoBy:{2:["찬물 세수","오전이 없으니 2회독은 오후에 압축","질문 목록 꺼내기"],3:["찬물 세수","오늘은 최소 기준선: A4 한 장 요약 + 예상 문제 10개"]}}),
  examBlock("morning",{short:"백지 1–125",name:"오전 · 질문 목록 + 1–125장 백지 복습",story:"슬라이드를 덮고 말로 설명해 본다. 막히는 장만 다시 연다.",
    todo:["질문 목록부터 해결 (1블록)","1–125장: 10장씩 덮고 핵심을 백지에 써 보기","막힌 장 번호만 따로 적기"]}),
  examBlock("lunch",{short:"예상 1문제",name:"점심 뒤 · 예상 문제 하나",story:"밥 먹고 바로 한 문제. 오전에 막힌 장에서 하나.",
    todo:["오전에 막힌 장에서 예상 문제 1개 풀기"]}),
  examBlock("afternoon",{short:"백지 126–250",name:"오후 · 126–250장 백지 복습",story:"오전과 같은 방식. 끝나면 막힌 장 목록이 오늘 밤 재료다.",
    todo:["126–250장: 10장씩 덮고 백지에 써 보기","막힌 장 번호 적기"],
    todoBy:{2:["1–250장 백지 복습을 압축해서: 20장씩 덮고 핵심만","막힌 장 번호 적기"]}}),
  examBlock("evening",{short:"예상문제·A4",name:"저녁 · 예상 문제 + A4 한 장",story:"시험지처럼 풀어 보고, 틀린 곳만 모아 한 장으로 줄인다.",
    todo:["예상 문제 20개 만들어 시간 재고 풀기 (1블록)","틀린 문제의 장만 다시 보기 (1블록)","A4 한 장 요약 만들기: 월 아침엔 이것만 본다"],
    todoBy:{2:["예상 문제 10개 풀기","틀린 장 다시 보기","A4 한 장 요약"]},
    extra2:"끝에 30분: 오전 질문 목록 중 못 푼 것 다시"}),
  examBlock("minimum",{name:"최소 기준선 · 시험 전날",story:"크게 늦은 날에도 내일 들고 갈 한 장은 만든다.",
    todo:["A4 한 장 요약 만들기 (제목·정의·예제 위주)","예상 문제 10개 풀기","이것만 해도 막아 낸 날"]}),
  examBlock("hobby",{name:"취미 · 30분만",todo:["30분, 타이머 맞추고","시험 전날이라 짧게"]}),
  examBlock("closing",{name:"마감 준비 · 시험 전날",todo:["23:00 화면 끄기","가방에 A4 요약 · 필기구 · 학생증","월 09:30 출발 · 통학 중 A4 한 장만 보기"]}),
  examBlock("camp",{story:"자정 전에 잔다. 시험 전날 밤샘은 하지 않는다."}),
];
const EXAM_DAYS={"2026-10-24":EXAM_SAT,"2026-10-25":EXAM_SUN};
const DAY_NAMES=["일","월","화","수","목","금","토"];
