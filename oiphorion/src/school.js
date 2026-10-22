
/* ───── 수업 날 (월~목) ───── */
const SCHOOL = `상수 통학 ← 1시간
상수 수업[월~목] ← 시간표        ▷ 월·수: 프언론 → 알골 → 게임 (월 저녁 기창특) / 화·목: 시소프 → 미적2 → 공수1
상수 저녁초점[월~목] ← [프언론 · 알골 훑기, 시소프 · 미적2 · 공수1, 알골 · 프언론 · 게임, 미적2 · 공수1 · 시소프]

절차 수업날(요일, 일어난시각)
    집을 나설 시각 ← 월·수 09:30, 화·목 10:00
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
  cpp:[[319,327,"planSchoolDay() · 오늘의 길 고르기"],[342,343,"planSchoolDay() · 3선이면 최소 기준선만"]]});

const DAWN_SCHOOL = leave=>({id:"dawn", short:"출발", name:"출발 · 등교 준비", fixed:true,
  story:"집을 나서기까지 한 시간 넘게 남았으면 여유 있는 아침, 아니면 빠듯한 아침.",
  when:W=>[W,Math.max(leave,W+20)],
  todo:["약 → 씻기 → 밥 차려 먹기 → 약","도시락 싸기","예습거리 하나 · 클로드와 이야기","머리 → 화장품 → 옷 → "+hhmmLabel(leave)+" 출발"],
  todoBy:{
    1:["약 → 씻기 → 밥 차려 먹기 → 약","도시락 싸기","예습거리 하나 · 클로드와 이야기","머리 → 화장품 → 옷 → "+hhmmLabel(leave)+" 출발"],
    2:["약 → 씻기 → 아침밥 → 약","머리 → 화장품 → 옷",hhmmLabel(leave)+" 출발"],
    3:["바로 준비해서 나간다","첫 수업은 놓쳐도 나머지 수업은 간다"]},
  pseudo:[{src:"school",from:5,to:34,hl:R(5,17)}],
  cpp:[[314,327,"planSchoolDay() · 남은 시간으로 아침 고르기"],[283,283,"LEAVE_AT · 월·수 09:30, 화·목 10:00"]]});
function hhmmLabel(m){ return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0"); }

const CAMP_SCHOOL = {id:"camp", short:"야영", name:"야영", fixed:true,
  story:"자정 전에 짐을 푼다. 내일도 같은 땅에서 다시 출발한다.",
  when:W=>[1440,1440+W], todo:["잠","내일 기상도 같은 시각"],
  pseudo:[{src:"school",from:5,to:34,hl:[32,33,34]}],
  cpp:[[349,350,"planSchoolDay() · 마지막 안내"],[354,372,"main() · 메뉴 7) 수업 날 계획"]]};

const CLOSE_SCHOOL = {id:"closing", short:"잘 준비", name:"잘 준비", fixed:true,
  story:"불빛을 줄이고, 내일 아침에 쫓기지 않게 옷과 가방을 미리 꺼내 둔다.",
  when:()=>[1380,1440],
  todo:["화면 끄기","내일 옷·가방 챙기기","내일 할 일 5분 적기"],
  pseudo:[{src:"school",from:5,to:34,hl:[31]}],
  cpp:[[349,350,"planSchoolDay() · 23:00 마감 안내"],[259,274,"endOfDay() · 못 푼 건 내일로 넘긴다"]]};

function eveningBlock(focus, dayName, start){ return {id:"hobby", short:"저녁 블록", name:"저녁 블록 · "+dayName, fixed:true,
  story:"집에 도착하자마자 한 블록. 밥 먹고 두 블록 더, 그다음 취미. 50분 걷고 10분 쉰다.",
  when:()=>[start,1380], lines:[1,2],
  todo:["도착하자마자 1블록 → 저녁밥 → 2·3블록 → 취미 30~60분"].concat(focus),
  pseudo:[{src:"school",from:1,to:34,hl:[3,25,26,28,29,30]},{src:"math",from:20,to:31,hl:R(20,31)}],
  cpp:[[290,295,"EVENING_FOCUS · 요일별 저녁 초점"],[340,348,"planSchoolDay() · 도착한 시각부터 저녁 블록"],[206,234,"mixedSet() · 섞어서 풀기"]]}; }

function homeBlock(s){ return {id:"evening", short:"귀가", name:"귀가 통학", fixed:true,
  story:"서서 오는 1시간은 읽기만. 도착하는 순간이 저녁 블록의 시작이다.",
  when:()=>[s,s+60],
  todo:["카드와 변형 노트 넘겨 보기","서서 가니까 읽기만"],
  pseudo:[{src:"school",from:5,to:34,hl:[24,25]}],
  cpp:[[340,341,"planSchoolDay() · 귀가 통학과 도착 시각"]]}; }

function makeTT(dayName, focus){ return [
  DAWN_SCHOOL(600),
  {id:"morning", short:"시소프", name:"시스템소프트웨어", fixed:true, story:"서서 가는 통학길엔 카드만 넘긴다. 수업 중 떠오른 생각은 주차장에.",
   when:()=>[600,720], lines:[1,2], todo:["10:00 시소프 수업","떠오른 생각은 주차장에 한 줄"],
   pseudo:[{src:"school",from:5,to:34,hl:[18,19,20,22]}], cpp:[[329,337,"planSchoolDay() · 수업과 공강"],[284,289,"TIMETABLE · 월~목 시간표"]]},
  {id:"lunch", short:"공강", name:"공강 · 점심 · 한 문제", fixed:true, story:"두 시간 공강. 밥 먹고 수학 한 문제, 그리고 방금 들은 시소프를 50분 되짚는다.",
   when:()=>[720,840], todo:["점심 → 수학 문제 1개","공강 블록 50분: 시소프 리뷰"],
   pseudo:[{src:"school",from:5,to:34,hl:[21,23]}], cpp:[[330,338,"planSchoolDay() · 공강 블록과 습관 신호"]]},
  {id:"afternoon", short:"미적2 · 공수1", name:"미적2 · 공수1", fixed:true, story:"수학 두 과목을 연달아. 막힌 곳은 표시만 해 두고 저녁에 푼다.",
   when:()=>[840,1020], todo:["14:00 미적2 · 15:30 공수1","막힌 곳은 표시만, 저녁에 푼다"],
   pseudo:[{src:"school",from:5,to:34,hl:[19,20,22]}], cpp:[[329,337,"planSchoolDay() · 수업과 공강"],[284,289,"TIMETABLE · 월~목 시간표"]]},
  homeBlock(1020),
  eveningBlock(focus, dayName, 1080),
  CLOSE_SCHOOL, CAMP_SCHOOL,
  MINIMUM_SCHOOL(()=>[1080,1380]),
]; }

const PLAN_MON = [
  DAWN_SCHOOL(570),
  {id:"morning", short:"프언론", name:"프로그래밍언어론", fixed:true, story:"통학길엔 카드만 넘긴다. 첫 수업은 10:30.",
   when:()=>[630,720], lines:[1,2], todo:["10:30 프언론 수업","떠오른 생각은 주차장에 한 줄"],
   pseudo:[{src:"school",from:5,to:34,hl:[18,19,20,22]}], cpp:[[329,337,"planSchoolDay() · 수업과 공강"],[285,285,"TIMETABLE · 월"]]},
  {id:"lunch", short:"점심", name:"점심 · 한 문제", fixed:true, story:"한 시간 공강. 밥 먹고 수학 한 문제면 충분하다.",
   when:()=>[720,780], todo:["점심","수학 문제 1개"],
   pseudo:[{src:"school",from:5,to:34,hl:[21,23]}], cpp:[[330,338,"planSchoolDay() · 공강과 습관 신호"]]},
  {id:"afternoon", short:"알골 · 게임", name:"알골 · 게임프로그래밍", fixed:true, story:"알골 두 시간, 게임프로그래밍 두 시간.",
   when:()=>[780,1020], todo:["13:00 알골 · 15:00 게임프로그래밍","막힌 곳은 표시만"],
   pseudo:[{src:"school",from:5,to:34,hl:[19,20,22]}], cpp:[[329,337,"planSchoolDay() · 수업과 공강"],[285,285,"TIMETABLE · 월"]]},
  {id:"evening", short:"저녁밥", name:"공강 · 저녁밥", fixed:true, story:"기창특 전 한 시간. 저녁은 여기서 먹는다.",
   when:()=>[1020,1080], todo:["저녁밥","짧게 쉬기"],
   pseudo:[{src:"school",from:5,to:34,hl:[21]}], cpp:[[330,337,"planSchoolDay() · 17시 공강은 저녁밥"]]},
  {id:"hobby", short:"기창특", name:"기술창조와특허", fixed:true, story:"월요일 마지막 수업. 20:30까지.",
   when:()=>[1080,1230], todo:["18:00 기술창조와특허","떠오른 생각은 주차장에"],
   pseudo:[{src:"school",from:5,to:34,hl:[2,19,20]}], cpp:[[285,285,"TIMETABLE · 월"],[329,337,"planSchoolDay() · 수업과 공강"]]},
  {id:"closing", short:"귀가 · 저녁 블록", name:"귀가 · 저녁 블록 · 월요일", fixed:true, story:"21:30에 도착하는 짧은 날. 한 블록만 하고 23시에 화면을 끈다.",
   when:()=>[1230,1440], lines:[1,2], todo:["귀가 통학: 카드만 넘겨 보기","21:30 도착 → 1블록: 오늘 들은 프언론 · 알골 훑기","23:00 화면 끄기 · 내일 옷·가방 · 할 일 5분"],
   pseudo:[{src:"school",from:5,to:34,hl:[24,25,26,27,30,31]}], cpp:[[340,345,"planSchoolDay() · 월요일은 짧은 저녁 블록"],[291,291,"EVENING_FOCUS · 월"]]},
  CAMP_SCHOOL,
  MINIMUM_SCHOOL(()=>[1290,1380]),
];

const PLAN_WED = [
  DAWN_SCHOOL(570),
  {id:"morning", short:"프언론", name:"프로그래밍언어론", fixed:true, story:"통학길엔 카드만 넘긴다. 첫 수업은 10:30.",
   when:()=>[630,720], lines:[1,2], todo:["10:30 프언론 수업","떠오른 생각은 주차장에 한 줄"],
   pseudo:[{src:"school",from:5,to:34,hl:[18,19,20,22]}], cpp:[[329,337,"planSchoolDay() · 수업과 공강"],[287,287,"TIMETABLE · 수"]]},
  {id:"lunch", short:"점심", name:"점심 · 한 문제", fixed:true, story:"한 시간 반 공강. 밥 먹고 수학 한 문제.",
   when:()=>[720,810], todo:["점심","수학 문제 1개"],
   pseudo:[{src:"school",from:5,to:34,hl:[21,23]}], cpp:[[330,338,"planSchoolDay() · 공강과 습관 신호"]]},
  {id:"afternoon", short:"알골 · 게임", name:"알골 · 게임프로그래밍", fixed:true, story:"알골 두 시간, 게임프로그래밍 두 시간.",
   when:()=>[810,1050], todo:["13:30 알골 · 15:30 게임프로그래밍","막힌 곳은 표시만, 저녁에"],
   pseudo:[{src:"school",from:5,to:34,hl:[19,20,22]}], cpp:[[329,337,"planSchoolDay() · 수업과 공강"],[287,287,"TIMETABLE · 수"]]},
  homeBlock(1050),
  eveningBlock(["알골 리뷰 1블록","프언론 리뷰 1블록","게임프로그래밍 과제 1블록"],"수요일",1110),
  CLOSE_SCHOOL, CAMP_SCHOOL,
  MINIMUM_SCHOOL(()=>[1110,1380]),
];

PLAN_MON.leave=570; PLAN_WED.leave=570;
const PLANS = {
  free: BLOCKS,
  1: PLAN_MON,
  2: Object.assign(makeTT("화요일",["시소프 리뷰 1블록","미적2 · 공수1 새 문제 2블록"]),{leave:600}),
  3: PLAN_WED,
  4: Object.assign(makeTT("목요일",["미적2 · 공수1 섞어서 풀기 2블록","시소프 프리뷰 1블록"]),{leave:600}),
};
const DAY_NAMES=["일","월","화","수","목","금","토"];
