## Handoff: team-plan → team-exec (weekly-journey)

- **Decided**: 파일 단위로 3명에게 나눔. worker-1 = src/journey.js(기록·판정·db). worker-2 = src/map.js(하루 보기 규칙, JOURNEY 연결, 5개 맵 풍경, 일요일 칸 → WEEK.playJump). worker-3 = src/week.js, src/week.css, src/body.html(한 주 보기, 전환 버튼, 점프·엔딩 연출). 파일 간 계약은 journey.js·week.js 머리 주석(커밋 c4271f2).
- **Rejected**: 셰이더로 한 주 보기 그리기(map.js 충돌, 비용) → DOM/SVG로. Codex tmux 작업자(이 Windows에 tmux 없음).
- **Risks**: 아티팩트 db API 정확한 시그니처를 로컬에서 확인 못 함 → journey.js는 `claude.use("db")`가 null이거나 예외여도 동작하게 방어. 빌드는 `py build.py`(python은 WindowsApps 스텁).
- **Files**: build.py(연결 완료), src/journey.js, src/week.js, src/week.css, src/map.js, src/body.html
- **Remaining**: 구현 후 lead가 빌드·브라우저 확인, 게시(capabilities {db:{}, user:{}}).
