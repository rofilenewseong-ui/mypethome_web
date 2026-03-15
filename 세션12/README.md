# 세션 12: 데이터베이스 최적화 + 배포 전 최종 점검

## 이 세션에서 한 일

PetHolo API의 **데이터베이스 쿼리 성능** 개선 + **배포 전 보안/테스트/CI 최종 점검**을 완료했습니다.

### 문제점 (Before)
- 펫 5마리 조회 시 **DB 호출 11번** 발생 (N+1 쿼리 문제)
- 메신저 채팅방 목록에서 **방 하나당 3번 추가 쿼리**
- 모든 목록 조회에서 **전체 데이터를 불러온 후 JS로 정렬** (느림)
- 입력값 검증 누락 (보안 취약점)

### 해결 (After)
- 펫 조회 **11번 → 3번**으로 감소
- 채팅방 목록 **1번 쿼리로 해결** (비정규화)
- **서버사이드 정렬 + 페이지네이션** 적용
- 모든 API에 **입력값 검증** 추가

---

## 폴더 구조

```
세션12/
├── README.md              ← 지금 보고 있는 파일
├── 새파일/                 ← 새로 만든 파일 3개
│   ├── firestore-helpers.ts    (DB 쿼리 헬퍼 함수)
│   ├── sanitize.ts             (보안: 입력값 정리)
│   └── migrate-denormalize.ts  (기존 데이터 마이그레이션)
├── 수정파일/               ← 기존 파일 수정본 18개
│   ├── services/          (핵심 비즈니스 로직)
│   ├── controllers/       (요청 처리)
│   ├── routes/            (API 경로 + 검증)
│   ├── schemas/           (입력값 검증 규칙)
│   ├── types/             (타입 정의)
│   └── docs/              (문서)
└── 파일배치_가이드.md       ← 어디에 넣어야 하는지 안내
```

---

## 적용 방법

### 1단계: 파일 복사
`파일배치_가이드.md`를 참고하여 각 파일을 프로젝트의 올바른 위치에 복사합니다.

### 2단계: 빌드 확인
```bash
cd apps/api
pnpm run build
```

### 3단계: Firestore 인덱스 배포
```bash
firebase deploy --only firestore:indexes --project mypethome-e117c
```

### 4단계: 기존 데이터 마이그레이션
```bash
cd apps/api
npx tsx database/migrate-denormalize.ts
```

---

## 성능 개선 요약

| 기능 | Before (DB 호출) | After (DB 호출) | 개선율 |
|------|:-:|:-:|:-:|
| 펫 목록 조회 | 11회 | 3회 | **73% 감소** |
| 펫 상세 조회 | 8회 | 4회 | **50% 감소** |
| 프로필 목록 | 10회 | 4회 | **60% 감소** |
| 채팅방 목록 | 3N+1회 | 1회 | **97% 감소** |
| 휴지통 목록 | N+1회 | 3회 | **대폭 감소** |

> N = 데이터 개수. 예: 펫 10마리면 Before는 31회, After는 1회

---

## 배포 전 최종 점검 (Phase 2)

### 보안 수정 (8개)
1. **빈 이메일 충돌 방지** — `auth.service.ts`: 빈/공백 이메일일 때 이메일 lookup 스킵
2. **상품ID 기반 판별** — `cafe24.service.ts`: product_no 우선, 이름 fallback
3. **Webhook 상품 매핑** — `webhook.service.ts`: CAFE24_PRODUCT_MAP으로 ID→타입 매핑
4. **Google dev fallback 강화** — `auth.controller.ts`: isDev + USE_MOCK_AI 이중 가드
5. **CORS 프로덕션 검증** — `env.ts`: localhost 사용 시 에러
6. **요청 로깅 위치** — `app.ts`: 라우트 전으로 이동
7. **필수 환경변수 검증** — `env.ts`: 프로덕션 시 9개 env var 누락 즉시 에러
8. **console.log → logger** — `ai.service.ts`: 7개 console.log를 logger.info로 교체

### 코드 일관성 (2개)
1. **refreshToken 응답 통일** — 모든 인증 응답에 `{ accessToken, refreshToken, user }` 포함
2. **Rate limiter** — `NODE_ENV === 'development'`에서만 비활성화 (staging/test는 적용)

### 테스트 (3파일 + 1헬퍼)
- `auth.service.test.ts` — 5개 테스트 (빈 이메일, 크레딧 중복방지, 새유저 보상)
- `webhook.service.test.ts` — 8개 테스트 (HMAC, 중복주문, 상품ID매핑)
- `cafe24.service.test.ts` — 7개 테스트 (상품ID판별, 이름fallback)
- `helpers/mockFirestore.ts` — Firestore mock 헬퍼

### CI/CD
- `.github/workflows/ci.yml` — push to main 시 install → type-check → test
- `.env.example` — 새 환경변수 문서화

### 수정/신규 파일 목록

| # | 위치 | 파일 | 변경 |
|---|------|------|------|
| 1 | 수정파일/config/ | `env.ts` | 환경변수 추가 + 프로덕션 검증 |
| 2 | 수정파일/services/ | `auth.service.ts` | 빈 이메일 가드 |
| 3 | 수정파일/services/ | `cafe24.service.ts` | 상품ID 기반 판별 |
| 4 | 수정파일/services/ | `webhook.service.ts` | 상품ID 매핑 |
| 5 | 수정파일/services/ | `ai.service.ts` | console.log → logger |
| 6 | 수정파일/controllers/ | `auth.controller.ts` | dev fallback + refreshToken 통일 |
| 7 | 수정파일/middleware/ | `rateLimiter.ts` | dev 판정 수정 |
| 8 | 수정파일/ | `app.ts` | 로깅 위치 이동 |
| 9 | 수정파일/ | `vitest.config.ts` | dist 제외 |
| 10 | 새파일/__tests__/ | `auth.service.test.ts` | 인증 테스트 5개 |
| 11 | 새파일/__tests__/ | `webhook.service.test.ts` | 웹훅 테스트 8개 |
| 12 | 새파일/__tests__/ | `cafe24.service.test.ts` | 카페24 테스트 7개 |
| 13 | 새파일/__tests__/helpers/ | `mockFirestore.ts` | 테스트 헬퍼 |
| 14 | 새파일/.github/workflows/ | `ci.yml` | CI 파이프라인 |
| 15 | 새파일/ | `.env.example` | 환경변수 문서 |
