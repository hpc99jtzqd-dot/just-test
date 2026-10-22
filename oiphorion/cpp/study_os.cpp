// study_os.cpp — 민의 공부 운영체제 v0.3 (C++17)
// 빌드: g++ -std=c++17 -O2 -o study_os study_os.cpp
// 실행: ./study_os            (데이터는 같은 폴더의 study_os.dat에 저장)

#include <algorithm>
#include <fstream>
#include <iostream>
#include <random>
#include <sstream>
#include <string>
#include <vector>

using namespace std;

// ───────────────────────── 설정 ─────────────────────────
const int LATE_LIMIT_MIN = 120;              // 기상 + 2시간까지는 2선
const vector<int> REDO_AFTER_DAYS = {1, 3, 7};  // 간격 반복
const int VARIANT_REDO_DAYS = 3;
const string DATA_FILE = "study_os.dat";

// ───────────────────────── 자료형 ─────────────────────────
enum class Line { Normal, Late, Minimum };
enum class Gap { UnknownTool, WrongChoice, StepError };

struct Variant {
    string difference;  // 원형과 무엇이 다른가
    string signal;      // 그 차이를 알려준 단서
    string key;         // 풀 수 있게 해 준 열쇠
};

struct Card {
    string name, signal, key, tools, steps, mistakes;
    vector<Variant> variants;
};

struct Redo {
    string problem;
    int dueDay;
};

struct State {
    int today = 0;        // 0일차부터 센다
    int wakeMin = -1;     // 고정 기상 시각(분), -1 = 아직 안 정함
    vector<Card> cards;
    vector<Redo> redos;
};

// ───────────────────────── 입출력 도우미 ─────────────────────────
string ask(const string& prompt) {
    cout << prompt;
    string s;
    getline(cin, s);
    replace(s.begin(), s.end(), '|', '/');  // 저장 구분자 보호
    return s;
}

bool askYes(const string& prompt) {
    string s = ask(prompt + " (y/n): ");
    return !s.empty() && (s[0] == 'y' || s[0] == 'Y');
}

int parseHHMM(const string& s) {  // "07:30" -> 450, 실패하면 -1
    int h, m;
    char c;
    stringstream ss(s);
    if (ss >> h >> c >> m && c == ':' && h >= 0 && h < 24 && m >= 0 && m < 60)
        return h * 60 + m;
    return -1;
}

string toHHMM(int minutes) {
    int h = (minutes / 60) % 24, m = minutes % 60;
    return (h < 10 ? "0" : "") + to_string(h) + ":" + (m < 10 ? "0" : "") + to_string(m);
}

vector<string> split(const string& line, char sep) {
    vector<string> out;
    string cur;
    stringstream ss(line);
    while (getline(ss, cur, sep)) out.push_back(cur);
    return out;
}

// ───────────────────────── 저장 / 불러오기 ─────────────────────────
void save(const State& st) {
    ofstream f(DATA_FILE);
    f << "CONFIG|" << st.today << '|' << st.wakeMin << '\n';
    for (size_t i = 0; i < st.cards.size(); ++i) {
        const Card& c = st.cards[i];
        f << "CARD|" << c.name << '|' << c.signal << '|' << c.key << '|' << c.tools
          << '|' << c.steps << '|' << c.mistakes << '\n';
        for (const Variant& v : c.variants)
            f << "VAR|" << i << '|' << v.difference << '|' << v.signal << '|' << v.key << '\n';
    }
    for (const Redo& r : st.redos) f << "REDO|" << r.problem << '|' << r.dueDay << '\n';
}

State load() {
    State st;
    ifstream f(DATA_FILE);
    string line;
    while (getline(f, line)) {
        vector<string> p = split(line, '|');
        if (p.empty()) continue;
        if (p[0] == "CONFIG" && p.size() >= 3) {
            st.today = stoi(p[1]);
            st.wakeMin = stoi(p[2]);
        } else if (p[0] == "CARD" && p.size() >= 7) {
            st.cards.push_back({p[1], p[2], p[3], p[4], p[5], p[6], {}});
        } else if (p[0] == "VAR" && p.size() >= 5) {
            size_t i = stoul(p[1]);
            if (i < st.cards.size()) st.cards[i].variants.push_back({p[2], p[3], p[4]});
        } else if (p[0] == "REDO" && p.size() >= 3) {
            st.redos.push_back({p[1], stoi(p[2])});
        }
    }
    return st;
}

// ───────────────────────── 하루: 저지선 판단 ─────────────────────────
Line decideLine(int wokeAt, int wake) {
    if (wokeAt <= wake) return Line::Normal;
    if (wokeAt <= wake + LATE_LIMIT_MIN) return Line::Late;
    return Line::Minimum;
}

void planToday(State& st) {
    if (st.wakeMin < 0) {
        int w = -1;
        while (w < 0) w = parseHHMM(ask("고정 기상 시각을 정하세요 (예: 07:30): "));
        st.wakeMin = w;
    }
    int woke = -1;
    while (woke < 0) woke = parseHHMM(ask("오늘 일어난 시각 (예: 08:10): "));

    cout << "\n고정 기상 " << toHHMM(st.wakeMin) << " / 오늘 기상 " << toHHMM(woke) << "\n";
    cout << "먼저: 불 켜기, 창문 열기, 찬물 세수, 쉬운 문제 1개.\n\n";

    switch (decideLine(woke, st.wakeMin)) {
        case Line::Normal:
            cout << "[1선 · 정상] 오전 · 오후 · 저녁 블록\n";
            break;
        case Line::Late:
            cout << "[2선 · 늦잠] 오전 블록은 지우고 점심 뒤부터 오후 · 저녁 블록\n"
                 << "  오전 블록의 핵심 30분은 저녁 블록 끝에 붙인다\n";
            break;
        case Line::Minimum:
            cout << "[3선 · 크게 늦음] 최소 기준선만: 수학 5문제 + 그날 리뷰 20분\n"
                 << "  이것만 해도 '3선에서 막아 낸 날'이다\n";
            break;
    }
    cout << "\n항상:\n"
         << "  - 블록은 50분 공부 / 10분 휴식(휴대폰 없이)\n"
         << "  - 점심 뒤 수학 1문제 (습관 신호)\n"
         << "  - 떠오른 생각은 주차장 종이에 한 줄\n"
         << "  - 취미 30~60분, 자정 전까지만\n"
         << "  - 자기 전 5분 내일 할 일 적기\n"
         << "  - 내일 기상도 " << toHHMM(st.wakeMin) << "\n\n";
}

// ───────────────────────── 수학: 새 문제 풀기 ─────────────────────────
void scheduleRedos(State& st, const string& problem, const vector<int>& afterDays) {
    for (int d : afterDays) st.redos.push_back({problem, st.today + d});
}

Card makeCard() {
    Card c;
    c.name = ask("  유형 이름: ");
    c.signal = ask("  신호(이 유형임을 알려 주는 단서): ");
    c.key = ask("  열쇠(핵심 아이디어 한 줄): ");
    c.tools = ask("  연장(개념·공식·정리): ");
    c.steps = ask("  과정(단계 순서): ");
    c.mistakes = ask("  자주 하는 실수: ");
    return c;
}

void solveNew(State& st) {
    string problem = ask("문제 이름(교재·번호): ");
    cout << "1. 설계: 15분 안에 필요한 연장과 과정을 먼저 적으세요.\n";
    ask("  (적었으면 Enter) ");

    if (askYes("2. 시도: 풀었나요?")) {
        cout << "  검토: 더 빠른 길은 없었는지 보세요.\n";
    } else {
        cout << "3. 풀이를 보고 내 설계와 대조하세요. 어디서 갈렸나요?\n"
             << "  1) 연장을 몰랐다  2) 연장은 알았는데 고르지 못했다  3) 과정에서 틀렸다\n";
        string g = ask("  번호: ");
        if (g == "1") {
            cout << "  → 구멍 지도에 추가. 그 개념의 앞 개념부터 메우세요.\n";
        } else if (g == "2") {
            cout << "  → 이 연장을 불러왔어야 할 신호를 적어 두세요.\n";
        } else {
            cout << "  → 어느 단계에서, 왜 틀렸는지 적어 두세요.\n";
        }
        cout << "  풀이를 덮고 처음부터 혼자 다시 푸세요.\n";
    }

    scheduleRedos(st, problem, REDO_AFTER_DAYS);
    cout << "4. 다시 풀기 예약: ";
    for (int d : REDO_AFTER_DAYS) cout << st.today + d << "일차 ";
    cout << "\n";

    if (askYes("5. 대표 예제 카드로 정리할까요?")) st.cards.push_back(makeCard());
}

// ───────────────────────── 수학: 섞어서 풀기 ─────────────────────────
void mixedSet(State& st) {
    if (st.cards.empty()) {
        cout << "아직 카드가 없어요. 먼저 새 문제를 풀고 카드를 만드세요.\n";
        return;
    }
    vector<size_t> order(st.cards.size());
    for (size_t i = 0; i < order.size(); ++i) order[i] = i;
    shuffle(order.begin(), order.end(), mt19937{random_device{}()});
    if (order.size() > 10) order.resize(10);

    cout << "6. 섞인 세트: 각 문제의 유형을 먼저 판정한 뒤 푸세요.\n";
    for (size_t idx : order) {
        Card& c = st.cards[idx];
        string problem = ask("\n[" + c.name + "] 계열 문제 이름: ");
        if (askYes("  풀었나요?")) continue;
        if (askYes("  대표 예제의 변형이었나요?")) {
            cout << "7. 변형 노트\n";
            Variant v;
            v.difference = ask("  원형과 무엇이 다른가: ");
            v.signal = ask("  그 차이를 알려 준 단서: ");
            v.key = ask("  풀 수 있게 해 준 열쇠: ");
            c.variants.push_back(v);
            scheduleRedos(st, problem, {VARIANT_REDO_DAYS});
        } else {
            cout << "  처음 보는 유형이면 '새 문제 풀기'로 1단계부터.\n";
        }
    }
}

// ───────────────────────── 조회 ─────────────────────────
void showDue(const State& st) {
    cout << st.today << "일차에 다시 풀 문제:\n";
    int n = 0;
    for (const Redo& r : st.redos) {
        if (r.dueDay <= st.today) {
            cout << "  - " << r.problem << " (" << r.dueDay << "일차)\n";
            ++n;
        }
    }
    if (n == 0) cout << "  없음\n";
}

void showCards(const State& st) {
    if (st.cards.empty()) cout << "카드가 없어요.\n";
    for (const Card& c : st.cards) {
        cout << "\n[" << c.name << "]\n  신호: " << c.signal << "\n  열쇠: " << c.key
             << "\n  연장: " << c.tools << "\n  과정: " << c.steps << "\n  실수: " << c.mistakes << "\n";
        for (const Variant& v : c.variants)
            cout << "  변형: " << v.difference << " / 단서: " << v.signal << " / 열쇠: " << v.key << "\n";
    }
}

void endOfDay(State& st) {
    // 오늘 다시 풀 문제: 풀었으면 지우고, 못 풀었으면 내일로 넘긴다(버리지 않는다)
    vector<Redo> kept;
    for (Redo& r : st.redos) {
        if (r.dueDay > st.today) {
            kept.push_back(r);
        } else if (!askYes("  '" + r.problem + "' 다시 풀었나요?")) {
            r.dueDay = st.today + 1;
            kept.push_back(r);
        }
    }
    st.redos = kept;
    ++st.today;
    cout << "하루 마감. 내일은 " << st.today << "일차, 기상 "
         << (st.wakeMin < 0 ? "미정" : toHHMM(st.wakeMin)) << ".\n";
}

// ───────────────────────── 수업 날 (월~목) ─────────────────────────
struct Lecture {
    string name;
    int start, end;  // 분
};

const int COMMUTE_MIN = 60;  // 집 ↔ 강의실
const vector<int> LEAVE_AT = {570, 600, 570, 600};  // 집을 나서는 시각: 월·수 09:30, 화·목 10:00
const vector<vector<Lecture>> TIMETABLE = {  // 0=월 1=화 2=수 3=목
    {{"프로그래밍언어론", 630, 720}, {"알고리즘", 780, 900}, {"게임프로그래밍", 900, 1020}, {"기술창조와특허", 1080, 1230}},
    {{"시스템소프트웨어", 600, 720}, {"미적분학및연습2", 840, 930}, {"공학수학1", 930, 1020}},
    {{"프로그래밍언어론", 630, 720}, {"알고리즘", 810, 930}, {"게임프로그래밍", 930, 1050}},
    {{"시스템소프트웨어", 600, 720}, {"미적분학및연습2", 840, 930}, {"공학수학1", 930, 1020}},
};
const vector<string> EVENING_FOCUS = {
    "오늘 들은 프언론 · 알골 훑기 1블록",  // 월: 21:30 도착이라 짧다
    "시소프 리뷰 1블록 · 미적2/공수1 새 문제 2블록",
    "알골 리뷰 1블록 · 프언론 리뷰 1블록 · 게임프로그래밍 과제 1블록",
    "미적2/공수1 섞어서 풀기 2블록 · 시소프 프리뷰 1블록",
};
const int CURFEW_PREP = 1380;  // 23:00 화면 끄기

void planSchoolDay(State& st) {
    if (st.wakeMin < 0) {
        int w = -1;
        while (w < 0) w = parseHHMM(ask("고정 기상 시각을 정하세요 (예: 07:30): "));
        st.wakeMin = w;
    }
    const vector<string> names = {"월", "화", "수", "목"};
    int day = -1;
    while (day < 0) {
        string d = ask("요일 (월/화/수/목): ");
        for (int i = 0; i < 4; ++i)
            if (d == names[i]) day = i;
    }
    int woke = -1;
    while (woke < 0) woke = parseHHMM(ask("오늘 일어난 시각 (예: 08:10): "));

    const vector<Lecture>& lec = TIMETABLE[day];
    int leave = LEAVE_AT[day];
    int margin = leave - woke;  // 집을 나서기까지 남은 시간
    bool late = margin <= 0;

    cout << "\n[" << names[day] << "요일] 기상 " << toHHMM(woke) << " → 집을 나설 시각 " << toHHMM(leave) << "\n";
    if (margin > 60) {
        cout << "[큰길 · 여유 아침] 약 → 씻기 → 밥 차려 먹기 → 약 → 도시락 싸기\n"
             << "  예습거리 하나, 클로드와 이야기 → 머리 → 화장품 → 옷\n";
    } else if (!late) {
        cout << "[샛길 · 빠듯한 아침] 약 → 씻기 → 아침밥 → 약 → 머리 → 화장품 → 옷\n";
    } else {
        cout << "[오솔길 · 출발 시각이 지났다] 첫 수업은 놓쳐도 나머지 수업은 간다. 저녁은 최소 기준선만\n";
    }

    cout << "통학 중: 카드와 변형 노트 넘겨 보기 (서서 가니까 읽기만)\n";
    for (size_t i = 0; i < lec.size(); ++i) {
        cout << "  " << toHHMM(lec[i].start) << "–" << toHHMM(lec[i].end) << " " << lec[i].name << "\n";
        int gap = (i + 1 < lec.size()) ? lec[i + 1].start - lec[i].end : 0;
        if (gap >= 110)
            cout << "    공강: 점심, 그리고 블록 50분으로 방금 들은 " << lec[i].name << " 리뷰\n";
        else if (gap >= 60)
            cout << "    공강: " << (lec[i].end >= 1020 ? "저녁밥" : "점심") << "\n";
    }
    cout << "점심 뒤 수학 1문제 (습관 신호)\n";

    int home = lec.back().end + COMMUTE_MIN;  // 저녁 블록은 집에 도착한 시각부터
    cout << "귀가 통학 " << toHHMM(lec.back().end) << "–" << toHHMM(home) << ": 카드만 넘겨 보기\n";
    if (late)
        cout << toHHMM(home) << "– 최소 기준선: 수학 5문제 + 리뷰 20분\n";
    else if (day == 0)
        cout << toHHMM(home) << "–" << toHHMM(CURFEW_PREP) << " 저녁 블록: " << EVENING_FOCUS[day] << "\n";
    else
        cout << toHHMM(home) << "–" << toHHMM(CURFEW_PREP) << " 저녁 블록: 도착하자마자 1블록 → 저녁밥 → 2·3블록 → 취미 30~60분\n"
             << "  초점: " << EVENING_FOCUS[day] << "\n";
    cout << toHHMM(CURFEW_PREP) << " 화면 끄기, 내일 옷·가방 챙기기, 내일 할 일 5분 적기\n"
         << "내일 기상도 " << toHHMM(st.wakeMin) << "\n\n";
}

// ───────────────────────── 메인 루프 ─────────────────────────
int main() {
    State st = load();
    while (true) {
        cout << "\n=== 공부 운영체제 · " << st.today << "일차 ===\n"
             << "1) 오늘 계획(수업 없는 날)  7) 수업 날 계획(월~목)\n"
             << "2) 새 문제 풀기  3) 섞어서 풀기  4) 오늘 다시 풀 문제\n"
             << "5) 카드 보기  6) 하루 마감  0) 저장 후 종료\n";
        string m = ask("> ");
        if (m == "1") planToday(st);
        else if (m == "2") solveNew(st);
        else if (m == "3") mixedSet(st);
        else if (m == "4") showDue(st);
        else if (m == "5") showCards(st);
        else if (m == "6") endOfDay(st);
        else if (m == "7") planSchoolDay(st);
        else if (m == "0" || !cin) { save(st); cout << "저장했어요.\n"; break; }
        save(st);  // 메뉴마다 자동 저장
    }
}
