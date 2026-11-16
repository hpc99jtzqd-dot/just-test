---
version: alpha
name: Euphorion
description: 오이포리온(Euphorion)은 하루를 햇살 든 들판의 산책으로, 한 주를 정상으로 가는 등정으로 보여 주는 공부 운영체제다. 화면은 세 가지 재질로 나뉜다. 3D 들판 위에 떠 있는 하늘 유리판, 집중할 때 지도를 덮는 흰 종이 책상, 코드를 펼쳐 읽는 두루마리 종이다. 행동은 물빛 하나({colors.primary})로, 시작과 완료는 잎빛 하나({colors.go})로만 칠한다.

colors:
  primary: "#0b6d9c"
  primary-bright: "#12a6d6"
  on-primary: "#ffffff"
  go: "#23700f"
  go-bright: "#4fb22c"
  on-go: "#ffffff"
  ink: "#10243f"
  ink-soft: "#31475f"
  ink-mute: "#566679"
  surface: "#ffffff"
  surface-sheet: "#f4f8fc"
  surface-selected: "#e6f5fc"
  surface-glass: "#f2f8fe"
  hairline: "#dde2e8"
  hairline-strong: "#bcc4ce"
  focus-surface: "#0b2a4f"
  focus-surface-top: "#143f6e"
  on-focus: "#ffffff"
  on-focus-soft: "#d7ebff"
  on-focus-accent: "#9fd4ff"
  on-focus-warn: "#ffd9a0"
  stone: "#74602c"
  stone-tint: "#dfe7d6"
  stone-line: "#6f8068"
  danger: "#b8301f"
  danger-tint: "#fff1ee"
  warn: "#7a2a12"
  warn-tint: "#fff3e2"
  warn-line: "#f0b678"
  scrim: "#0c1e40"
  sky: "#1f56d6"
  on-sky: "#ffffff"
  on-sky-soft: "#eef5ff"
  meadow: "#fffce8"
  on-meadow: "#29422c"
  paper: "#dddbd5"
  paper-ink: "#24221f"
  paper-ink-soft: "#5a564e"
  paper-red: "#7b3322"
  paper-blue: "#2c4862"

typography:
  display:
    fontFamily: Seoul Alrim
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.05
  title-lg:
    fontFamily: Seoul Alrim
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.15
  title-md:
    fontFamily: Seoul Alrim
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.2
  title-sm:
    fontFamily: Seoul Alrim
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.3
  clock:
    fontFamily: Seoul Alrim
    fontSize: 84px
    fontWeight: 700
    lineHeight: 1
    fontFeature: '"tnum" 1'
  body-lg:
    fontFamily: Pretendard
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: Pretendard
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Pretendard
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  caption:
    fontFamily: Pretendard
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  eyebrow:
    fontFamily: Pretendard
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.14em
  button:
    fontFamily: Pretendard
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.2
  button-sm:
    fontFamily: Pretendard
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.2
  code:
    fontFamily: Nanum Gothic Coding
    fontSize: 14px
    fontWeight: 400
    lineHeight: 24px
  hand:
    fontFamily: BM Euljiro
    fontSize: 22px
    fontWeight: 400
    lineHeight: 1.3

rounded:
  xs: 6px
  sm: 10px
  md: 14px
  lg: 22px
  xl: 26px
  full: 999px

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  gutter: 16px
  panel-pad: 18px
  sheet-pad: 24px
  control-h: 40px
  control-h-sm: 34px
  row-h: 54px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 0 18px
  button-go:
    backgroundColor: "{colors.go}"
    textColor: "{colors.on-go}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 0 20px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 0 14px
  button-secondary-small:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.full}"
    height: 34px
    padding: 0 12px
  button-on-focus:
    backgroundColor: "{colors.focus-surface}"
    textColor: "{colors.on-focus}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 40px
  button-quiet:
    backgroundColor: "{colors.surface-sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    height: 34px
    padding: 0 11px
  chip-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    height: 36px
  chip-now:
    backgroundColor: "{colors.go}"
    textColor: "{colors.on-go}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 2px 9px
  panel-glass:
    backgroundColor: "{colors.surface-glass}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 18px
  sheet:
    backgroundColor: "{colors.surface-sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 24px
    width: 600px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 12px 14px
  card-selected:
    backgroundColor: "{colors.surface-selected}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  card-warn:
    backgroundColor: "{colors.warn-tint}"
    textColor: "{colors.warn}"
    rounded: "{rounded.md}"
  card-stop:
    backgroundColor: "{colors.danger-tint}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
  stone-filled:
    backgroundColor: "{colors.stone-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  focus-card:
    backgroundColor: "{colors.focus-surface}"
    textColor: "{colors.on-focus}"
    rounded: "{rounded.lg}"
    padding: 18px 20px
  now-strip:
    backgroundColor: "{colors.focus-surface}"
    textColor: "{colors.on-focus}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.sm}"
    height: 40px
    padding: 8px 10px
  list-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    height: 54px
  list-row-now:
    backgroundColor: "{colors.surface-selected}"
    textColor: "{colors.ink}"
  map-tag:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
  place-card:
    backgroundColor: "{colors.meadow}"
    textColor: "{colors.on-meadow}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
  scroll-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xs}"
  scroll-hand:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-ink-soft}"
    typography: "{typography.hand}"
  scroll-link:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-blue}"
    typography: "{typography.body-sm}"
  scroll-seal:
    backgroundColor: "{colors.paper-red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    size: 38px
  text-meta:
    backgroundColor: "{colors.surface-sheet}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.body-sm}"
  text-done:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-mute}"
    typography: "{typography.body-lg}"
  divider:
    backgroundColor: "{colors.hairline}"
    height: 1px
  input-border:
    backgroundColor: "{colors.hairline-strong}"
    height: 1px
  focus-card-top:
    backgroundColor: "{colors.focus-surface-top}"
    textColor: "{colors.on-focus-soft}"
    typography: "{typography.body-md}"
  focus-cap:
    backgroundColor: "{colors.focus-surface}"
    textColor: "{colors.on-focus-accent}"
    typography: "{typography.label}"
  focus-warn:
    backgroundColor: "{colors.focus-surface}"
    textColor: "{colors.on-focus-warn}"
    typography: "{typography.body-sm}"
  stone-edge:
    backgroundColor: "{colors.stone-line}"
    width: 1px
  warn-edge:
    backgroundColor: "{colors.warn-line}"
    width: 1px
  overlay-scrim:
    backgroundColor: "{colors.scrim}"
    textColor: "{colors.on-focus}"
  sky-head:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.on-sky}"
    typography: "{typography.display}"
  sky-lead:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.on-sky-soft}"
    typography: "{typography.body-sm}"
---

# Euphorion — DESIGN.md

이 파일은 오이포리온 화면의 디자인 규칙이다. 위의 YAML이 정답 값이고, 아래 글은 그 값을 언제 어떻게 쓰는지 설명한다.
CSS에서는 `src/head.html`의 `:root`에 같은 이름의 변수로 들어 있다(`--c-*` 색, `--fs-*` 글자 크기, `--r-*` 모서리, `--s-*` 간격, `--e-*` 그림자).
새 화면이나 부품을 만들 때는 여기 없는 값을 새로 지어내지 않는다. 꼭 필요하면 이 파일에 먼저 토큰을 더하고 이유를 적는다.

## Overview

**한 줄 성격: 햇살 든 들판 위의 유리판, 그리고 집중할 때 펼치는 흰 종이.**

이 페이지를 여는 사람은 공부하려는 사람이다. 화면이 해야 할 일은 하나, 지금 할 것을 가장 먼저 보여 주고 다른 데로 눈이 새지 않게 하는 것이다.
3D 들판(WebGL)은 하루가 어디쯤인지 알려 주는 배경이고, 글을 읽는 곳은 언제나 불투명에 가까운 판 위다.

화면은 세 가지 재질로 나뉜다. 섞지 않는다.

1. **하늘 유리판(Sky Glass)**: 들판 위에 떠 있는 머리말, 안내판, 한 주 기록 칸. 거의 불투명한 흰 유리, 위쪽에 얇은 반사광, 아래로 넓은 푸른 그림자를 둔다. 반짝이는 물방울 단추와 비눗방울이 있는, 2000년대 맑은 유리 감성이다.
2. **책상 종이(Desk Sheet)**: 책상·채석장·2주 실험처럼 집중하거나 기록하는 화면. 지도를 짙은 남색 막({colors.scrim}, 78%)으로 덮고 그 위에 차분한 흰 종이({colors.surface-sheet}) 한 장을 둔다. 여기서는 유리 효과와 광택을 쓰지 않는다. 지금 할 것만 짙은 남색 판({colors.focus-surface})으로 띄운다.
3. **두루마리 종이(Scroll Paper)**: 두루마리 펼치기에서만 쓰는 회색 한지. 손글씨({typography.hand})와 코드({typography.code})가 이 재질에서만 나온다.

느낌의 축: 놀이처럼 가볍지만 어수선하지 않다. 정보는 촘촘하되 한 판에 강한 단추는 하나다.

## Colors

색의 역할은 넷이다. 나머지는 모두 중립색이다.

- **물빛 Primary ({colors.primary}, #0b6d9c)**: 행동과 선택. 두루마리 펼치기, 저장, 고른 칩, 지금 줄의 왼쪽 띠. 밝은 물빛({colors.primary-bright})은 빛나는 테두리와 진행 막대에만 쓴다(흰 바탕과 2.8:1이라 글자나 초점 고리로는 모자라다).
- **잎빛 Go ({colors.go}, #23700f)**: 시작과 완료. 책상의 '시작', 실험 준비하기, '지금' 칩, 체크한 원. 한 화면에 잎빛 채운 단추는 하나만 둔다.
- **남색 Focus ({colors.focus-surface}, #0b2a4f)**: '지금'. 머리말의 지금 띠, 책상의 지금 판. 이 판 위의 글은 흰색({colors.on-focus}), 보조는 {colors.on-focus-soft}, 머리표는 {colors.on-focus-accent}, 경고는 {colors.on-focus-warn}.
- **돌빛 Stone ({colors.stone}, #74602c)**: 채석장의 덩이(◆)와 넘긴 돌. 채석장과 덩이 표시에만 쓴다.

중립과 신호:

- 글자: {colors.ink} 본문, {colors.ink-soft} 보조, {colors.ink-mute} 흐린 글(끝낸 조각, 빈칸). ink-mute는 흰 바탕에서 5:1을 넘기도록 잡았다. 이보다 옅은 회색 글은 쓰지 않는다.
- 바탕: {colors.surface} 카드·입력칸, {colors.surface-sheet} 책상 종이, {colors.surface-selected} 고른 줄.
- 선: {colors.hairline} 구분선(실제 CSS는 `rgba(16,36,63,.12)`), {colors.hairline-strong} 입력칸 테두리(`rgba(16,36,63,.22)`). 유리판 위에서도 비치도록 반투명으로 둔다.
- 위험 {colors.danger}: 시간 초과, 그만두기 규칙. 바탕은 {colors.danger-tint}.
- 주의 {colors.warn} on {colors.warn-tint}: 기록 재촉(오늘 일어난 시각을 아직 안 적었다).
- 들판 카드 {colors.meadow} / {colors.on-meadow}: 지도 아래 장소 카드와 한 주 기록 카드.
- 1·2·3선 색(큰길 #c6a574, 들꽃 샛길 #729c46, 오솔길 #ac814a 점선)은 지도의 길 색이므로 길을 가리킬 때만 쓴다.

## Typography

글꼴은 셋, 역할이 겹치지 않는다. 모두 사용자 컴퓨터에 깔린 글꼴을 `local()`로만 부른다(아티팩트 CSP 때문에 원격 글꼴을 받지 않는다).

- **서울알림체(Seoul Alrim) — 이름**: 페이지 제목, 장소 이름, 블록 이름, 화면 제목, 시계. 굵기는 700(제목)과 400(소제목) 둘만. `font-synthesis-weight:none`으로 가짜 굵기를 막는다.
- **Pretendard — 읽고 누르는 모든 것**: 본문, 설명, 입력칸, 단추, 표. 단추 글씨는 Pretendard 600이다. 단추를 서울알림체로 쓰지 않는다.
- **배민 을지로체(BM Euljiro, 페이지 안에서는 "Oi Hand") — 손글씨**: 두루마리의 한 줄 이야기와 계획 목록에서만. 쓰는 글자만 잘라 넣었으니 새 문장을 넣으면 `tools/subset-hand-font.py`를 다시 돌린다.
- **Nanum Gothic Coding — 숫자와 코드**: 시각 입력칸, 지도 표지의 시각, 두루마리 코드.

크기 단계는 아래 아홉 개뿐이다(`--fs-*`). 사이값(13.5px, 14.5px 같은)은 쓰지 않는다.

| 토큰 | 크기 | 쓰는 곳 |
|---|---|---|
| display | clamp(30px, 3.7vw, 54px) | 메인 제목 "Euphorion" 하나 |
| title-lg | 28px | 안내판의 블록 이름, 책상의 지금 할 것 |
| title-md | 24px | 화면(오버레이) 제목 |
| title-sm | 18px | 화면 안의 소제목(h3) |
| body-lg | 16px | 입력칸, 조각 이름, 강조 본문. 폰에서 입력칸이 16px보다 작으면 화면이 확대된다 |
| body-md | 15px | 기본 본문 |
| body-sm | 14px | 보조 설명, 작은 단추, 표 |
| label | 13px | 메타 정보, 칩, 지도 표지 |
| caption | 12px | 머리표(eyebrow, 자간 0.14em), 시각 꼬리표 |

숫자가 바뀌는 곳(시각, 남은 분, 횟수)에는 모두 `font-variant-numeric: tabular-nums`를 건다.

## Layout

간격은 4px 바탕의 여섯 단계다: xs 4, sm 8, md 12, lg 16, xl 24, xxl 32(`--s-*`).

- **데스크톱(900px 이상)**: 들판이 화면 전체. 왼쪽 위에 머리말(최대 560px), 오른쪽 위에 안내판(310px), 오른쪽 아래에 장소 카드 격자(5열). 가운데는 비워 소년과 길이 보이게 한다. 패널이 다음 행선지나 소년을 가리면 패널이 아니라 3D 쪽 배치를 고친다.
- **폰(900px 미만)**: 머리말 → 들판 → 장소 카드(3열) → 안내판 순으로 쌓는다. 좌우 여백은 `max(16px, safe-area)`.
- **책상 종이**: 가운데 한 장, 폭 `min(600px, 100%)`, 안쪽 여백 xl(24px, 폰에서는 16px까지 줄어든다). 구역 사이 xl(24px), 구역 안 sm~md.
- 누르는 것은 최소 34px(작은 단추), 보통 40px, 목록 줄 54px. 손가락(`pointer:coarse`)에서는 칩을 36px로 키운다.

## Elevation & Depth

깊이는 세 단계 그림자만 쓴다(`--e-*`). 모두 푸른 기가 도는 그림자다(검은 그림자 금지).

- **e1** `0 3px 10px rgba(10,40,110,.28)`: 지도 표지, 칩, 물방울 단추.
- **e2** `0 12px 30px rgba(10,40,110,.28)` + 안쪽 위 반사광 `inset 0 1px 0 #fff`: 하늘 유리판.
- **e3** `0 24px 60px rgba(4,14,48,.5)`: 책상 종이(가장 위).

유리판은 그림자에 더해 위쪽 42%에 흰 반사광(`.info::before`)을 둔다. 책상 종이 안에서는 그림자 대신 흰 카드와 얇은 선으로 층을 나눈다.
오버레이 뒤는 흐림(blur 6px)과 남색 막. 오버레이가 열리면 비눗방울을 멈춘다(흐림을 매 프레임 다시 계산하지 않게).

## Shapes

모서리는 둥글다. 단계는 여섯 개뿐이다(`--r-*`).

- **full (999px)**: 모든 단추, 칩, 시각 입력칸, 지도 표지. 단추는 언제나 알약 모양이다.
- **xl (26px)**: 책상 종이.
- **lg (22px)**: 하늘 유리판, 지금 판.
- **md (14px)**: 카드, 띠, 목록 묶음(시트), 경고 상자.
- **sm (10px)**: 입력칸, 조용한 단추, 돌담의 돌, 장소 카드.
- **xs (6px)**: 두루마리 안의 작은 것들, 빵부스러기 단추.

한 화면 안에서 같은 종류의 물건은 같은 모서리를 쓴다. 바깥 판의 모서리가 안쪽 카드보다 항상 크다.

## Components

### 단추 (Buttons)
- **Primary(물빛)** `button-primary`: 하늘 유리판의 주 행동(두루마리 펼치기). 유리 위에서는 광택 그라데이션(`--aqua-btn`)과 안쪽 반사광을 쓴다. 판 하나에 하나.
- **Go(잎빛)** `button-go`: 시작·완료(책상 '시작', 실험 준비하기, 마침 기록). 유리 위에서는 `--leaf-btn` 광택.
- **Secondary(흰 알약)** `button-secondary`: 그 밖의 모든 행동. 흰 바탕, {colors.hairline-strong} 테두리, 글자 {colors.ink}. 작은 것은 `button-secondary-small`(34px, 13px).
- **On-focus**: 남색 판 위의 보조 단추는 반투명 흰 바탕(10%)과 흰 테두리(35%).
- **Quiet**: 줄 안의 도구(쪼개기, 위로, 지우기). 연한 바탕 사각(sm), 테두리 없음.
- 누르면 `scale(.97)`, 0.06초. 마우스를 올리면 밝기만 살짝 올린다. 비활성은 투명도 .4.

### 칩과 띠
- **지금 칩** `chip-now`: 잎빛 알약 안의 흰 12px 글자.
- **고른 칩** `chip-selected`: 요일, 하루/한 주 보기, 어림짐작(1·2·3). 물빛 바탕 흰 글자.
- **지금 띠** `now-strip`: 머리말 안의 남색 띠. "지금 칸 · 블록 이름 · 끝까지 N분 · 쪼개기". 페이지를 열면 이것부터 보인다.

### 판
- **하늘 유리판** `panel-glass`: 머리말 설정판, 안내판. 위쪽 반사광, e2 그림자.
- **책상 종이** `sheet`: 책상·채석장·실험이 모두 같은 틀(`.desk`)을 쓴다. 머리: 제목(title-md) + 메타(body-sm, ink-soft) + 닫기(40px 원).
- **지금 판** `focus-card`: 책상 맨 위. 머리표 → 할 것(title-lg) → 큰 시계(clock) → 진행 막대(6px) → 다음 것.
- **카드** `card`: 흰 바탕, {colors.hairline} 선, md 모서리. 고른 상태는 `card-selected`, 주의는 `card-warn`, 그만두기는 `card-stop`.

### 목록과 입력
- **시간표 줄** `list-row`: 체크 원(26px) · 시작 시각 · 할 일 · 길이. 높이 54px. 지금 줄은 `list-row-now` 바탕 + 왼쪽 4px 물빛 띠. 고치는 칸은 누른 줄에만 펼친다.
- **입력칸** `input`: 흰 바탕, hairline-strong 테두리, sm 모서리, 16px 글자.
- **초점 고리**: 모든 누를 수 있는 것에 `outline: 3px solid {colors.primary}; outline-offset: 2px`(`--focus`, 흰 바탕과 5.6:1). 남색 판 위에서는 흰 고리(`--focus-on-dark`).

### 들판 위의 것
- **지도 표지** `map-tag`: 흰 알약, 장소 이름(서울알림체 13px) + 시각(코딩 글꼴 11px). 고르면 물빛 광택으로 바뀐다.
- **장소 카드** `place-card`: 지도 아래 격자. 들판 크림색, 길 색 아랫줄.

### 두루마리
- 위아래 나무 막대, 회색 한지, 붉은 낙관(닫기). 제목은 서울알림체, 이야기와 계획은 손글씨, 코드는 코딩 글꼴. 두루마리 밖의 화면에 이 재질을 쓰지 않는다.

## Do's and Don'ts

### Do
- 판 하나에 채운 단추(물빛이나 잎빛)는 하나만 둔다. 나머지는 흰 알약.
- 지금 할 것은 남색으로, 언제나 맨 위에 둔다. 페이지를 열면 첫눈에 보여야 한다.
- 크기·모서리·간격·그림자는 `:root`의 토큰만 쓴다. 새 값이 필요하면 이 파일부터 고친다.
- 글자 대비는 WCAG AA(본문 4.5:1)를 지킨다. 흰 글자를 얹는 광택 단추는 글자가 놓이는 가운데 띠가 4.5:1을 넘게 깊게 깐다.
- 입력칸은 16px 이상. 숫자는 tabular-nums.
- 움직임은 transform과 opacity만. `prefers-reduced-motion`에서는 움직임을 빼고 나타남만 남긴다.

### Don't
- 단추를 서울알림체로 쓰지 않는다. 서울알림체는 이름(제목·장소·블록·시계)에만.
- 13.5px, 14.5px 같은 사이 크기를 새로 만들지 않는다.
- 책상 종이 안에 유리 반사광이나 광택 그라데이션을 넣지 않는다(지도를 덮은 이유가 집중이다).
- 흰 바탕에 #6b7c90보다 옅은 회색 글을 쓰지 않는다.
- 3D 들판 위에 반투명이 낮은(80% 미만) 판을 띄워 글을 올리지 않는다. 들판은 밝아서 글이 묻힌다.
- 검은 그림자(rgba(0,0,0,…))로 판을 띄우지 않는다. 그림자는 푸른 남색 계열.
- 손글씨 글꼴을 두루마리 밖에서 쓰지 않는다.
