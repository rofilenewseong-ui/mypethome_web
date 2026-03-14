# 수정 파일 (18개)

이 폴더의 파일들은 **기존 파일의 수정본**입니다. 프로젝트의 해당 위치에 있는 파일을 이 파일로 교체하면 됩니다.

---

## services/ (7개) — 핵심 비즈니스 로직

서비스는 **실제 DB 조회/저장을 담당**하는 핵심 파일입니다.

| 파일 | 한줄 요약 |
|------|----------|
| `pet.service.ts` | 펫 CRUD. 11번 쿼리 → 3번으로 줄임 |
| `profile.service.ts` | 프로필 CRUD. 10번 쿼리 → 4번으로 줄임 |
| `messenger.service.ts` | 채팅 기능. 채팅방 목록 1번 쿼리로 해결 |
| `credit.service.ts` | 크레딧 관리. 서버사이드 페이지네이션 적용 |
| `trash.service.ts` | 휴지통. N+1 쿼리 제거 |
| `gif.service.ts` | GIF 생성. 보안 강화 (타임아웃, URL 검증) |
| `ai.service.ts` | AI 서비스. 기존 변경사항 유지 |

### 주요 최적화 기법

1. **배치 쿼리**: 개별 조회 대신 `batchInQuery()`로 한번에 가져옴
2. **병렬 실행**: `Promise.all()`로 독립적인 쿼리를 동시에 실행
3. **서버사이드 정렬**: JS `.sort()` 대신 Firestore `orderBy` 사용
4. **비정규화**: 자주 같이 조회되는 데이터를 미리 복사해둠

---

## controllers/ (2개) — 요청 처리

컨트롤러는 **HTTP 요청을 받아서 서비스에 전달**하는 역할입니다.

| 파일 | 한줄 요약 |
|------|----------|
| `messenger.controller.ts` | page, limit 값을 안전한 범위로 제한 |
| `credit.controller.ts` | page, limit 값을 안전한 범위로 제한 |

### 변경 내용
- `page`: 최소 1, 최대 1000
- `limit`: 최소 1, 최대 100
- 잘못된 값(음수, 너무 큰 수)이 들어와도 자동으로 보정

---

## routes/ (4개) — API 경로 + 입력 검증

라우트는 **어떤 URL로 요청이 오면 어떤 컨트롤러를 실행할지** 정의합니다.

| 파일 | 한줄 요약 |
|------|----------|
| `profile.routes.ts` | 프로필 수정 시 입력값 검증 추가 |
| `messenger.routes.ts` | 메시지 전송/조회 시 입력값 검증 추가 |
| `motion.routes.ts` | 모션 할당 시 입력값 검증 추가 |
| `credit.routes.ts` | 크레딧 조회/사용 시 입력값 검증 추가 |

### 왜 검증이 필요한가?
- 검증 없이는 빈 값, 이상한 타입, 악의적 데이터가 그대로 DB에 저장될 수 있음
- `validate()` 미들웨어가 요청 데이터를 체크하고, 문제가 있으면 400 에러 반환

---

## schemas/ (2개) — 입력값 검증 규칙

스키마는 **"이 API에는 이런 형태의 데이터가 와야 한다"**를 정의합니다. Zod 라이브러리 사용.

| 파일 | 한줄 요약 |
|------|----------|
| `profile.schema.ts` | 프로필 수정 검증 규칙 추가 |
| `credit.schema.ts` | 크레딧 조회/사용 검증 규칙 추가 |

---

## types/ (1개) — 타입 정의

| 파일 | 한줄 요약 |
|------|----------|
| `schema.types.ts` | UserTier 타입 추가, ChatRoomDoc에 비정규화 필드 추가 |

### 추가된 타입
- `UserTier`: 'BRONZE' | 'SILVER' (사용자 등급)
- `ChatRoomDoc`: `petName`, `petEmoji`, `petFrontPhoto`, `lastMessageContent`, `lastMessageSenderType` 필드 추가

---

## docs/ (2개) — 문서

| 파일 | 한줄 요약 |
|------|----------|
| `SCHEMA.md` | DB 스키마 문서 — 누락 필드 + 애널리틱스 추가 |
| `ERD.md` | 엔티티 관계도 — 누락 필드 + 비정규화 전략 문서화 |
