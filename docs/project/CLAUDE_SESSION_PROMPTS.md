# PetHolo용 Claude Code 세션 프롬프트

이 문서는 `petholo` 저장소에서 새 Claude Code 세션을 시작할 때 그대로 붙여 넣을 수 있는 프롬프트 초안이다.

## 왜 이 버전으로 맞췄는가

- 이 저장소는 `pnpm workspace` 모노레포이며 핵심은 `apps/web`, `apps/api`, `packages/shared`, `docs`다.
- 문서와 실제 코드가 일부 어긋난다.
  - `docs/project/PROGRESS.md`는 카페24 연동이 보류라고 적지만, 실제 코드에는 이미 카페24 인증 페이지와 백엔드 서비스가 존재한다.
  - `docs/session-logs/2026-03-05-session3.md`에는 `.claude/plans/structured-strolling-conway.md`가 언급되지만 현재 실제 파일은 없다.
- 그래서 새 세션은 문서 요약을 그대로 믿게 하면 안 되고, 실제 파일 존재 여부와 현재 코드를 먼저 검증하게 해야 한다.

## 권장 운용 원칙

- 내가 `구현 승인`이라고 말하기 전까지 절대 코드를 수정하거나 생성하지 마라.
- 리서치 단계에서는 채팅 요약만 하지 말고 반드시 프로젝트 내부 산출물 파일을 남겨라.
- 문서보다 실제 코드를 우선하되, 문서와 코드가 어긋나면 불일치 목록을 별도 섹션으로 정리하라.
- 존재한다고 적힌 파일이 실제로 없으면 추정하지 말고 없다고 명시하라.

## 1. 첫 메시지: 리서치 전용

아래 문장을 새 Claude Code 세션의 첫 메시지로 쓰면 된다.

```text
이 세션에서는 내가 명시적으로 구현 승인하기 전까지 절대 코드를 쓰지 마라. 지금은 오직 리서치만 해라.

/Users/ferion/Desktop/petholo 저장소를 깊이 읽고, 매우 상세하게, 실제 코드 기준으로 현재 상태를 파악해라. 문서 요약만 하지 말고 실제 소스와 문서를 교차검증해라.

반드시 다음 순서로 읽어라.
1. /Users/ferion/Desktop/petholo/docs/project/ONBOARDING.md
2. /Users/ferion/Desktop/petholo/docs/project/PROGRESS.md
3. /Users/ferion/Desktop/petholo/docs/database/CLAUDE.md
4. /Users/ferion/Desktop/petholo/docs/session-logs/2026-03-05-session3.md
5. /Users/ferion/Desktop/petholo/docs/session-logs/2026-03-06-session6.md
6. /Users/ferion/Desktop/petholo/apps/web/src/app/store/page.tsx
7. /Users/ferion/Desktop/petholo/apps/web/src/app/cafe24/auth/page.tsx
8. /Users/ferion/Desktop/petholo/apps/web/src/app/cafe24/callback/page.tsx
9. /Users/ferion/Desktop/petholo/apps/api/src/routes/auth.routes.ts
10. /Users/ferion/Desktop/petholo/apps/api/src/controllers/auth.controller.ts
11. /Users/ferion/Desktop/petholo/apps/api/src/services/cafe24.service.ts
12. /Users/ferion/Desktop/petholo/apps/api/src/services/auth.service.ts
13. /Users/ferion/Desktop/petholo/apps/api/src/services/webhook.service.ts
14. /Users/ferion/Desktop/petholo/apps/web/src/lib/api.ts

위 파일을 읽는 동안 문서에 적힌 경로나 기능이 실제로 존재하는지도 검증해라. 문서에 언급됐지만 실제로 없는 파일은 추정하지 말고 "없음"으로 기록해라.

리서치가 끝나면 /Users/ferion/Desktop/petholo/Research.md 를 작성해라. 채팅창에 긴 요약을 쓰지 말고 파일로 남겨라.

Research.md에는 반드시 다음 섹션을 포함해라.
- 현재 제품/기능 상태
- 실제 아키텍처 요약
- 카페24 관련 현재 구현 상태
- 문서와 코드의 불일치 목록
- 이미 구현된 것 / 아직 덜 구현된 것
- 수정 시 건드리면 위험한 레이어
- 다음 계획 단계에서 꼭 다뤄야 할 질문
- 읽은 핵심 파일 목록

중요:
- 아직 Plan.md를 쓰지 마라.
- 아직 구현하지 마라.
- 추정으로 빈칸을 채우지 마라.
```

## 2. 두 번째 메시지: 계획 전용

Research.md를 검토하고 난 뒤에는 아래 문장을 보낸다.

```text
이제 /Users/ferion/Desktop/petholo/Research.md 와 실제 소스를 기준으로 상세 구현 계획을 /Users/ferion/Desktop/petholo/Plan.md 에 작성해라.

중요:
- 아직 구현하지 마라.
- 변경 전 실제 소스 파일을 다시 읽고 계획을 써라.
- Research.md의 불일치 목록을 해소하는 방향으로 계획을 세워라.
- 문서가 아니라 실제 코드 경로 기준으로 써라.

Plan.md에는 반드시 다음을 포함해라.
- 목표와 비목표
- 접근 방식 상세 설명
- 수정될 파일의 절대 경로 목록
- 각 파일에서 무엇을 왜 바꾸는지
- 필요한 API/상태/UI 흐름
- 데이터 구조 또는 스키마 영향
- 위험 요소와 트레이드오프
- 검증 방법
- 순서가 명확한 체크리스트
- 변경 예시 스니펫

주의:
- 존재하지 않는 파일을 계획에 넣지 마라.
- "필요할 듯" 같은 추정형 문장 대신 근거를 적어라.
- 아직 구현하지 마라.
```

## 3. 주석 반영 루프 메시지

Plan.md에 네가 인라인 메모를 단 다음에는 아래 문장을 반복해서 쓰면 된다.

```text
/Users/ferion/Desktop/petholo/Plan.md 에 달린 메모를 반영해서 Plan.md를 업데이트해라.

중요:
- 메모를 임의로 무시하지 마라.
- 잘못된 가정은 바로잡고, 범위가 줄어들면 줄어든 대로 반영해라.
- 실제 코드 기준으로 다시 검증해라.
- 아직 구현하지 마라.
```

## 4. 최종 구현 승인 메시지

계획이 확정됐을 때만 아래 문장을 보낸다.

```text
이제 /Users/ferion/Desktop/petholo/Plan.md 기준으로만 구현해라.

규칙:
- Plan.md 범위를 벗어나지 마라.
- 각 단계가 끝날 때마다 Plan.md 체크리스트를 완료 처리해라.
- any 같은 느슨한 타입은 쓰지 마라.
- 기존 패턴과 충돌하는 임의 구조 변경을 하지 마라.
- 작업 중 지속적으로 빌드/타입체크/관련 테스트를 돌려서 새 문제를 만들지 마라.
- 모든 작업이 끝날 때까지 멈추지 마라.

구현 중 새 이슈를 발견하면:
- 독단적으로 범위를 넓히지 말고
- Plan.md의 리스크/보류 섹션에 기록한 뒤
- 현재 승인된 범위 안에서만 진행해라.
```

## 5. 잘못된 방향일 때 보내는 메시지

```text
방향이 틀어졌다. 지금까지 이번 작업에서 한 변경을 전부 되돌리고, 마지막으로 승인된 범위만 다시 기준으로 삼아라.

중요:
- 잘못된 구현 위에 패치하지 마라.
- 먼저 되돌린 뒤
- 범위를 더 좁혀서 새 Plan.md를 다시 작성해라.
- 아직 구현하지 마라.
```

## 6. 지금 이 저장소에서 특히 추가하면 좋은 한 줄

아래 한 줄은 첫 메시지나 두 번째 메시지 끝에 붙이면 좋다.

```text
문서보다 실제 코드가 우선이며, 문서-코드 불일치가 있으면 구현 전에 반드시 그것부터 드러내라.
```

## 7. 바로 쓰기 좋은 추천 조합

현재 `petholo`는 문서와 코드가 어긋난 흔적이 있으므로, 첫 새 세션에서는 기능 구현 지시보다 아래 순서가 안전하다.

1. 리서치 전용 메시지 전송
2. Research.md 검토
3. 계획 전용 메시지 전송
4. 인라인 메모 반영 루프
5. 구현 승인 메시지 전송

가장 중요한 문장 하나만 꼽으면 이것이다.

```text
아직 구현하지 마라.
```
