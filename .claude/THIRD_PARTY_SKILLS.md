# 외부에서 가져온 스킬

`.claude/skills/` 아래 스킬은 다음 두 저장소에서 그대로 복사했다(2026-10-22). 둘 다 MIT 라이선스이고, 원문은 `.claude/licenses/`에 있다.

| 출처 | 커밋 | 스킬 |
|---|---|---|
| https://github.com/emilkowalski/skills | `2d22863` | animate animate-expo animation-performance animation-vocabulary apple-design ask-sonner break-ui emil-design-eng find-animation-opportunities improve-animations mobile-native pick-ui-library prototype review-animations write-swift  |
| https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | `623a9a9` | banner-design brand design design-system slides ui-styling ui-ux-pro-max  |
| https://github.com/yeachan-heo/oh-my-claudecode | `skills-lock.json` 해시 참고 | deep-interview (`npx skills add … --skill deep-interview`로 설치) |

주의
- `design/scripts/logo/generate.py`는 외부 이미지 생성 API(atlascloud, muapi)를 부른다. API 키가 있어야 하고, 실행하지 않으면 아무 일도 하지 않는다.
- `ui-ux-pro-max/scripts/`는 파이썬 표준 라이브러리만 쓰고 `data/`의 CSV를 로컬에서 검색한다.
- `deep-interview`는 oh-my-claudecode 전용 도구(state_write, omc-plan)를 전제로 쓰인 부분이 있다. 이 저장소에는 그 도구가 없어서, 질문 흐름만 참고해서 쓴다.
- 원본을 갱신하려면 위 저장소에서 다시 복사한다. 여기서 고친 내용은 없다.
