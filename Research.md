# PetHolo (마이펫홈) — 코드 기반 리서치 보고서

> 작성일: 2026-03-06
> 방법론: 사용자가 지정한 22+ 핵심 파일을 순서대로 읽고, 문서 vs 코드 교차 검증

---

## 1. 현재 제품/기능 상태

반려동물 추모 홀로그램 서비스. 아크릴 프리즘에 반려동물 영상을 재생하고, AI 메신저로 소통.

### 구현 완료된 기능
- **인증**: 이메일 회원가입/로그인, Google OAuth (백엔드만), Cafe24 OAuth (프론트+백엔드)
- **반려동물 관리**: 등록(사진 2장 업로드), 수정, 삭제, 목록 조회
- **프로필 시스템**: STANDING/SITTING 프로필 생성, 프로필당 베이스 영상 최대 3개, 모션 최대 12개
- **AI 파이프라인**: Gemini 스타트프레임 이미지 생성 → Kling 영상 생성 → FFmpeg GIF 변환
- **홀로그램 플레이어**: 다크테마 전용, 모션 탭/잠금, 영상 재생
- **AI 메신저**: PET_AI 지연 응답(5~30분), 채팅방 자동 생성
- **크레딧 시스템**: SPEND/EARN/REFUND 트랜잭션, 상품코드 등록
- **휴지통**: 30일 소프트 삭제, 복구/영구삭제
- **관리자**: 대시보드, 사용자 관리, 감사 로그
- **분석**: 이벤트 추적, 재생 세션, 일별 통계
- **스토어 페이지**: 카페24 자사몰 연결 (하드코딩 데모 상품 목록)
- **PWA**: manifest.json, sw.js, apple-touch-icon

### 미완성/예정
- Cafe24 자사몰 앱 등록 및 실제 연동 (OAuth 키 미설정)
- Google OAuth 프론트엔드 UI (백엔드 엔드포인트만 존재)
- 프로덕션 배포 환경변수 (.env.production)

---

## 2. 실제 아키텍처 요약

```
pnpm 모노레포
├── apps/web/          Next.js 16 + React 19 + Tailwind 4 + Zustand 5
│   ├── src/app/       16개 페이지 (모두 'use client' CSR)
│   ├── src/components/ UI 컴포넌트 15개 + layout 3개 + dev inspector
│   ├── src/stores/    useAuthStore.ts, useDevStore.ts (2개)
│   └── src/lib/       api.ts (Axios), analytics.ts
├── apps/api/          Express 5 + TypeScript + Firebase Admin SDK
│   ├── src/routes/    13개 라우트 모듈
│   ├── src/controllers/ 컨트롤러 (라우트당 1:1)
│   ├── src/services/  12개 서비스
│   ├── src/middleware/ auth, auditLog, errorHandler, rateLimiter, validate
│   ├── src/config/    env.ts, firebase.ts, database.ts
│   ├── src/types/     schema.types.ts (16 컬렉션)
│   └── database/      schema.types.ts (13 컬렉션, pending-updates 부분 반영)
└── packages/shared/   공용 타입 정의 (프론트엔드에서 미사용)
```

### 핵심 데이터 흐름
```
프론트엔드 → Axios (JWT 자동 첨부) → Express API → Firestore
                                    ↓
                              Gemini SDK → 스타트프레임 이미지
                              Kling API → 영상 생성 (폴링)
                              FFmpeg → GIF 변환
```

### 인증 흐름
```
JWT Access Token (15분) + Refresh Token (7일, httpOnly 쿠키 + localStorage 병행)
로그인 → accessToken을 localStorage 저장 → Axios interceptor가 자동 첨부
401 응답 → interceptor가 refresh 시도 → 실패시 로그아웃 + 홈 리다이렉트
데모 모드: user.id.startsWith('demo-') → 토큰 검증 건너뜀
```

---

## 3. 카페24 관련 현재 구현 상태

### 백엔드 (완전 구현)
| 파일 | 상태 | 내용 |
|------|------|------|
| `cafe24.service.ts` | ✅ 완전 구현 | OAuth 토큰 교환, 고객 정보 조회, 주문 내역 조회, 아크릴세트 판별 |
| `auth.service.ts` > `cafe24Auth()` | ✅ 완전 구현 | cafe24MemberId 검색 → 이메일 검색 → 신규생성, 아크릴세트 구매시 SILVER 업그레이드 |
| `webhook.service.ts` | ✅ 완전 구현 | HMAC-SHA256 서명 검증, 주문 웹훅→상품코드 자동 발급, 중복 방지 |
| `auth.routes.ts` | ✅ 완전 구현 | GET /cafe24/url, POST /cafe24 |
| `webhook.routes.ts` | ✅ 구현됨 | POST /webhooks/cafe24/order |

### 프론트엔드 (완전 구현)
| 파일 | 상태 | 내용 |
|------|------|------|
| `cafe24/auth/page.tsx` | ✅ 완전 구현 | OAuth URL 요청 → 카페24 인증 페이지 리다이렉트 |
| `cafe24/callback/page.tsx` | ✅ 완전 구현 | code+state 수신 → CSRF 검증 → 로그인 처리 → /home 이동 |
| `store/page.tsx` | ⚠️ 데모 | 하드코딩 상품 목록, 카페24 자사몰 외부 링크 |

### 미설정
- `CAFE24_MALL_ID`, `CAFE24_CLIENT_ID`, `CAFE24_CLIENT_SECRET`, `CAFE24_REDIRECT_URI` 환경변수 미설정
- `cafe24Service.isConfigured()` → false → 503 응답
- 카페24 앱 미등록 (자사몰 대시보드에서 앱 생성 필요)

---

## 4. 문서와 코드의 불일치 목록

### 심각도: 높음
| # | 문서 | 코드 실제 | 위치 |
|---|------|-----------|------|
| 1 | ONBOARDING.md: "11개 route 모듈" | **13개** 라우트 파일 (auth, pet, profile, baseVideo, motion, credit, trash, messenger, ai, webhook, admin, analytics, dev) | `apps/api/src/routes/` |
| 2 | ONBOARDING.md: "12개 controller" | 실제로 라우트당 1:1 컨트롤러 → **13+개** | `apps/api/src/controllers/` |
| 3 | PROGRESS.md: "9/9 서비스 완성" | **12개** 서비스 파일 (auth, pet, profile, credit, trash, messenger, ai, cafe24, webhook, gif, analytics, admin) | `apps/api/src/services/` |
| 4 | CLAUDE.md (docs/database): "14개 컬렉션" | `src/types/schema.types.ts`는 **16개** (analyticsEvents, playbackSessions, dailyStats 추가), `database/schema.types.ts`는 **13개** (analytics 미포함) | 두 schema.types.ts 불일치 |
| 5 | session6.md: "OpenAI API (이미지 생성)" | 실제는 **Google Gemini** (`@google/genai` SDK) | `ai.service.ts` |

### 심각도: 중간
| # | 문서 | 코드 실제 | 위치 |
|---|------|-----------|------|
| 6 | UserDoc 타입: `role: 'USER' \| 'ADMIN'` | `useAuthStore.ts` User 인터페이스: `role: 'user' \| 'admin' \| 'USER' \| 'ADMIN'` (4가지 허용) | 프론트엔드 store |
| 7 | `database/schema.types.ts` PetDoc: species/breed/gender/memo 필드 있음 | `src/types/schema.types.ts` PetDoc: species/breed/gender/memo **없음** | 두 파일 동기화 안됨 |
| 8 | UserDoc 타입에 `lastLoginAt` 없음 | `auth.service.ts`에서 `lastLoginAt` 필드를 실제 사용 중 (login, googleAuth, cafe24Auth) | schema.types.ts |
| 9 | `@petholo/shared` 패키지의 타입 정의 | 프론트엔드에서 **한 번도 import 하지 않음** (`from '@petholo/shared'` 0건) | packages/shared |
| 10 | shared CreditTransactionType: 'CODE_REDEEM' 등 | 백엔드 CreditType: 'SPEND' \| 'EARN' \| 'REFUND' \| 'CAFE24_ACRYLIC_SET' (완전 다른 enum) | 타입 불일치 |
| 11 | shared TrashItemType: 'BASE_VIDEO' \| 'MOTION' \| 'PET' \| 'PROFILE' | 백엔드 TrashItemType: 'BASE_VIDEO' \| 'MOTION' (PET/PROFILE 없음) | packages/shared vs schema.types.ts |
| 12 | shared UserTier: 'BRONZE' \| 'SILVER' \| 'GOLD' | 백엔드 UserTier: 'BRONZE' \| 'SILVER' (GOLD 없음) | packages/shared vs schema.types.ts |

---

## 5. 이미 구현된 것 / 아직 덜 구현된 것

### ✅ 완전 구현
| 기능 | 백엔드 | 프론트엔드 | 비고 |
|------|--------|-----------|------|
| 이메일 회원가입/로그인 | ✅ | ✅ | bcrypt + JWT |
| 반려동물 CRUD | ✅ | ✅ | 사진 업로드 포함 |
| 프로필 생성/수정 | ✅ | ✅ | STANDING/SITTING |
| 베이스 영상 관리 | ✅ | ✅ | 활성화/비활성화/삭제 |
| 모션 관리 | ✅ | ✅ | LEFT/RIGHT 배치 |
| 크레딧 조회/사용/적립/환불 | ✅ | ✅ | Firestore 트랜잭션 |
| 상품코드 등록 | ✅ | ✅ | FULL_SET → SILVER 업그레이드 |
| 휴지통 | ✅ | ✅ | 30일 복구/영구삭제 |
| AI 메신저 | ✅ | ✅ | 지연 응답 |
| 홀로그램 플레이어 | ✅ | ✅ | 다크테마 전용 |
| 관리자 대시보드 | ✅ | ✅ | 사용자/로그 관리 |
| 분석 이벤트 추적 | ✅ | ✅ | AnalyticsProvider |
| Cafe24 OAuth 플로우 | ✅ | ✅ | 환경변수 미설정일 뿐 |
| Cafe24 웹훅 처리 | ✅ | N/A | 상품코드 자동 발급 |
| PWA 기본 | N/A | ✅ | manifest + sw.js |
| Gemini 스타트프레임 생성 | ✅ | ✅ | 3장 생성→선택 |
| Kling 영상 생성 + 폴링 | ✅ | ✅ | 30초×60회 = 30분 |
| GIF 변환 (FFmpeg) | ✅ | N/A | gif.service.ts |

### ⚠️ 부분 구현
| 기능 | 상태 | 내용 |
|------|------|------|
| Google OAuth | 백엔드만 구현 | 프론트엔드 로그인 UI에 Google 버튼 없음 (또는 미연결) |
| 스토어 페이지 | 데모 데이터 | 하드코딩 상품 목록, 실제 카페24 API 연동 안됨 |
| Dev Inspector | 구현됨 | 개발 환경 전용, 프로덕션에서 자동 비활성화 |

### ❌ 미구현
| 기능 | 내용 |
|------|------|
| 카페24 앱 등록 | 자사몰 대시보드에서 앱 생성 필요 |
| 프로덕션 배포 | 환경변수 설정, 도메인 연결 |
| 푸시 알림 | sw.js 존재하나 push notification 미구현 |

---

## 6. 프론트엔드 API 연동 상태

### 실제 API 호출 방식
- 모든 페이지는 `api.ts`의 Axios 인스턴스 사용
- JWT 토큰은 `localStorage.getItem('accessToken')`에서 자동 첨부
- 401 응답 시 refresh token으로 자동 갱신 시도

### API 함수 목록 (api.ts)
| 그룹 | 함수 | 엔드포인트 |
|------|------|-----------|
| authApi | register, login, googleAuth, refresh, logout, getMe, cafe24AuthUrl, cafe24Auth | /auth/* |
| petsApi | list, create, get, update, delete | /pets/* |
| profilesApi | listAll, list, create, get, update | /profiles/* |
| baseVideosApi | list, add, activate, delete | /profiles/:id/base-videos/* |
| motionsApi | list, create, assign, delete | /profiles/:id/motions/* |
| aiApi | generateStartFrame, selectStartFrame, generateVideo, getJobStatus | /ai/* |
| creditsApi | balance, history, redeemCode | /credits/* |
| messengerApi | getRooms, getMessages, sendMessage | /messenger/* |
| trashApi | list, restore, permanentDelete | /trash/* |
| adminApi | dashboard, users, getUser, updateUser, logs | /admin/* |
| analyticsApi | dashboard, events, playback, userAnalytics, messenger, pets | /analytics/* |

### localStorage 폴백 사용 위치
| 파일 | 키 | 용도 |
|------|-----|------|
| `useAuthStore.ts` | `accessToken` | JWT 토큰 저장 |
| `useAuthStore.ts` | `petholo_user` | 유저 정보 캐시 (hydrate 시 로컬 먼저 사용 → 백그라운드 서버 검증) |
| `pets/register/page.tsx` | `petholo_pet_${petId}` | 펫 사진 URL 임시 저장 (프로필 생성 위자드용) |
| `pets/register/page.tsx` | `petholo_has_pet` | 첫 펫 등록 여부 |
| `pets/[id]/profiles/new/page.tsx` | `petholo_pet_${petId}` | 저장된 펫 사진 읽기 (Gemini ref 이미지로 사용) |
| `cafe24/auth/page.tsx` | `cafe24_oauth_state` (sessionStorage) | CSRF state 검증 |

### 데모 모드 동작
- `useAuthStore.hydrate()`: `user.id.startsWith('demo-')` → 토큰 없이도 인증 상태 유지
- 백엔드: 데모 사용자는 실제 Firestore 접근 없이 하드코딩 데이터 반환 (일부 컨트롤러)

---

## 7. AI 서비스 파이프라인 현황

### Gemini 스타트프레임 (이미지 생성)
| 단계 | 구현율 | 내용 |
|------|--------|------|
| 프롬프트 로드 | ✅ 100% | `prompts.secret.json`에서 로드 (캐싱, 리로드 지원) |
| ref 이미지 처리 | ✅ 100% | URL→base64 변환, 순서 엄수 (얼굴→전신→옷) |
| BARE/OUTFIT 자동 선택 | ✅ 100% | ref 2장→BARE, 3장→OUTFIT |
| 3장 동시 생성 | ✅ 100% | 동일 프롬프트 3회 호출, 개별 실패 허용 |
| 이미지 저장 | ✅ 100% | uploads/generated/ 로컬 저장 |
| 작업 상태 관리 | ✅ 100% | startFrameJobs 컬렉션, PENDING→PROCESSING→COMPLETED/FAILED |
| 30분 만료 | ✅ 100% | expiresAt 체크 |
| 사용자 선택 | ✅ 100% | selectStartFrameImage() |

### Kling 영상 생성 (Image to Video)
| 단계 | 구현율 | 내용 |
|------|--------|------|
| JWT 토큰 생성 | ✅ 100% | HS256, 30분 유효 |
| 영상 생성 요청 | ✅ 100% | image2video API, 프롬프트는 prompts.secret.json |
| 비동기 폴링 | ✅ 100% | 30초 간격, 최대 30분 (60회) |
| GIF 변환 | ✅ 100% | gifService.generateFromVideo(), FFmpeg 사용 |
| 에러 핸들링 | ✅ 100% | FAILED 상태 저장, 에러 메시지 기록 |
| 타임아웃 처리 | ✅ 100% | 30분 초과 시 FAILED |

### `any` 타입 사용 (ai.service.ts)
| 줄 | 코드 | 사유 |
|-----|------|------|
| 142 | `const contents: any[]` | Gemini SDK contents 배열 타입 미지원 |
| 158 | `responseModalities: [...] as any` | SDK 타입에 IMAGE 미포함 |
| 163 | `imageConfig: { ... } as any` | SDK 타입에 imageConfig 미포함 |
| 168 | `(response as any).candidates` | SDK 응답 타입 불완전 |
| 228 | `await response.json() as any` | Kling API 응답 타입 미정의 |
| 264 | `await response.json() as any` | Kling 상태 조회 응답 |

### 비AI 파일의 any
| 파일 | 줄 | 코드 |
|------|-----|------|
| `middleware/validate.ts` | 15 | `error.issues.map((e: any)` — Zod 에러 타입 |

---

## 8. 모바일 대응 현황

### Viewport 설정 (layout.tsx)
```
width: device-width
initialScale: 1, maximumScale: 1, userScalable: false
viewportFit: "cover"
themeColor: "#F5F1EA"
```

### PWA 설정
- `manifest.json`: ✅ 존재 (public/)
- `sw.js`: ✅ 존재 (ServiceWorkerRegister 컴포넌트)
- `apple-touch-icon.png`: ✅ 존재
- `appleWebApp.capable`: ✅ true
- 푸시 알림: ❌ 미구현

### 모바일 프레임
- `<div className="mobile-frame">` — 430px max-width 중앙 프레임
- Safe area inset: CSS 변수 `--safe-area-top`, `--safe-area-bottom` 사용
- TopBar: 상단 안전영역 패딩
- BottomNav: 하단 안전영역 패딩
- iOS 입력 줌 방지: input font-size 16px
- 당겨서 새로고침 방지: overscroll-behavior-y: contain

### Vercel 배포 설정
- `apps/web/vercel.json`: ✅ 존재
  - framework: nextjs
  - buildCommand: pnpm build
  - outputDirectory: .next

---

## 9. pending-updates/ 미반영 타입 불일치 목록

`apps/api/database/pending-updates/README.md`에 3개 변경사항 기록됨:

### 9-1. users.lastLoginAt
- **pending-updates 상태**: 코드에 이미 적용됨 (`auth.service.ts` login/googleAuth/cafe24Auth에서 lastLoginAt 업데이트)
- **schema.types.ts 반영 여부**: ❌ 두 파일 모두 UserDoc에 `lastLoginAt` 필드 없음
- **영향**: 런타임에는 문제 없음 (Firestore는 스키마리스), 타입 안전성만 누락

### 9-2. productCodes cafe24 추적 필드
- **pending-updates 상태**: `webhook.service.ts`에서 `cafe24OrderId`, `cafe24ProductId`, `cafe24BuyerEmail` 필드 이미 사용
- **schema.types.ts 반영 여부**: ❌ 두 파일 모두 ProductCodeDoc에 해당 필드 없음
- **영향**: 런타임 정상, 타입 불일치

### 9-3. CLAUDE.md 컬렉션 수 수정
- **pending-updates 상태**: 13개로 수정하라고 기록
- **실제 현황**: `docs/database/CLAUDE.md`는 13개 나열 (nanoBananaJobs 포함), `src/types/schema.types.ts`는 16개 (analytics 3개 포함)
- **영향**: 문서 정확성 문제

### 두 schema.types.ts 파일 비교

| 항목 | `database/schema.types.ts` | `src/types/schema.types.ts` |
|------|---------------------------|----------------------------|
| 위치 | `apps/api/database/` | `apps/api/src/types/` |
| 서비스에서 import | ❌ (미사용) | ✅ (analytics.service, database.ts) |
| 컬렉션 수 | 13개 | 16개 |
| PetDoc species/breed/gender/memo | ✅ 있음 | ❌ 없음 |
| analyticsEvents/playbackSessions/dailyStats | ❌ 없음 | ✅ 있음 |
| **결론** | session3 pending-updates 부분 반영 | analytics 추가됨, PetDoc 미반영 |

→ **`src/types/schema.types.ts`에 PetDoc의 species/breed/gender/memo 필드를 추가해야 함**

---

## 10. any 타입 사용 위치 목록

총 **7개** (6개 ai.service.ts + 1개 validate.ts)

| # | 파일 | 줄 | 코드 | eslint 억제 |
|---|------|----|------|------------|
| 1 | ai.service.ts | 142 | `const contents: any[]` | ✅ eslint-disable 주석 |
| 2 | ai.service.ts | 158 | `responseModalities: [...] as any` | ✅ |
| 3 | ai.service.ts | 163 | `} as any` (imageConfig) | implicit |
| 4 | ai.service.ts | 168 | `(response as any).candidates` | implicit |
| 5 | ai.service.ts | 228 | `await response.json() as any` | ✅ eslint-disable 주석 |
| 6 | ai.service.ts | 264 | `await response.json() as any` | implicit |
| 7 | validate.ts | 15 | `error.issues.map((e: any)` | implicit |

---

## 11. 수정 시 건드리면 위험한 레이어

### 절대 건드리지 말 것 (CLAUDE.md 명시 + 검증)
| 대상 | 이유 |
|------|------|
| `player/[profileId]` 페이지 | 다크테마 전용 홀로그램 플레이어, 도메인 특화 UI |
| `profiles/[id]/settings` 페이지 | 3분할 프리뷰 등 특수 UI |
| MobileLayout, TopBar, BottomNav | 레이아웃 안정적, safe area 처리 완료 |
| Button, Card, Modal 컴포넌트 | 전체 앱에서 사용, 변경 시 사이드이펙트 큼 |

### 주의해서 수정
| 대상 | 이유 |
|------|------|
| `useAuthStore.ts` | 10개 파일에서 import, 인증 상태 관리 핵심 |
| `api.ts` (Axios instance) | 모든 API 호출의 단일 진입점, interceptor 로직 |
| `firebase.ts` | DB 초기화 + graceful fallback, 잘못 수정하면 전체 API 다운 |
| `auth.service.ts` | 4가지 인증 방식 (이메일/Google/Cafe24/refresh) 통합 |
| `credit.service.ts` | Firestore 트랜잭션 사용, 크레딧 정합성 핵심 |
| `ai.service.ts` | 비동기 처리 + 폴링 + 외부 API 의존, 프롬프트는 secret 파일 |
| `prompts.secret.json` | AI 프롬프트 보안 파일, .gitignore됨 |
| `globals.css` | CSS 변수 + Tailwind @theme, 디자인 토큰 전체에 영향 |

---

## 12. 다음 계획 단계에서 꼭 다뤄야 할 질문

### 타입 동기화
1. `database/schema.types.ts`와 `src/types/schema.types.ts` 중 어느 것을 canonical로 할 것인가?
2. `@petholo/shared` 패키지를 프론트엔드에서 실제 사용할 것인가? (현재 미사용)
3. shared의 CreditTransactionType과 백엔드 CreditType이 완전히 다른데, 통일할 것인가?
4. shared의 GOLD 티어, PET/PROFILE TrashItemType은 실제 쓸 것인가?

### 인증 & 역할
5. role 케이싱: 백엔드 'USER'/'ADMIN' vs 프론트엔드 'user'/'admin' — 어디서 정규화할 것인가?
6. Google OAuth 프론트엔드 UI를 만들 것인가?
7. `lastLoginAt`을 UserDoc 타입에 공식 추가할 것인가?

### 카페24 연동
8. 카페24 앱 등록 절차와 환경변수 세팅 순서는?
9. 스토어 페이지를 카페24 API 연동으로 바꿀 것인가, 현재 외부 링크 방식 유지인가?
10. webhook secret 관리 (현재 dev 모드에서 서명 검증 스킵)

### 배포
11. Vercel(프론트) + 어디(백엔드) 배포 전략?
12. Firebase 프로젝트 프로덕션 환경 분리?
13. prompts.secret.json 프로덕션 배포 방법?

### AI 파이프라인
14. Gemini any 타입 — SDK 업데이트로 해결 가능한가, 커스텀 타입 정의 필요한가?
15. Kling API 응답 타입 인터페이스를 정의할 것인가?

---

## 13. 읽은 핵심 파일 목록

### 1차: 문서 교차 검증 (5개)
| # | 파일 | 핵심 발견 |
|---|------|-----------|
| 1 | `docs/project/ONBOARDING.md` | 라우트/컨트롤러/서비스 수 불일치 |
| 2 | `docs/project/PROGRESS.md` | 93% 완성 주장, 서비스 수 불일치 |
| 3 | `docs/database/CLAUDE.md` | 컬렉션 수 불일치, 건드리지 않는 것 목록 |
| 4 | `docs/session-logs/2026-03-05-session3.md` | pending-updates 생성 배경 |
| 5 | `docs/session-logs/2026-03-06-session6.md` | OpenAI→Gemini 문서 오류, 430px 프레임 |

### 2차: 백엔드 코어 (11개)
| # | 파일 | 핵심 발견 |
|---|------|-----------|
| 6 | `apps/api/src/app.ts` | 13개 라우트, dev routes 미들웨어 순서 |
| 7 | `apps/api/src/config/firebase.ts` | graceful fallback (db=null as Firestore) |
| 8 | `apps/api/database/pending-updates/README.md` | 3개 미반영 변경사항 |
| 9 | `apps/api/database/schema.types.ts` | 13 컬렉션, PetDoc에 species/breed 있음 |
| 10 | `apps/api/src/types/schema.types.ts` | 16 컬렉션, PetDoc에 species/breed 없음 |
| 11 | `apps/api/src/routes/auth.routes.ts` | 8개 엔드포인트, Zod validation |
| 12 | `apps/api/src/controllers/auth.controller.ts` | Google OAuth fallback (dev용), Cafe24 동적 import |
| 13 | `apps/api/src/services/auth.service.ts` | 4가지 인증, lastLoginAt 사용, upgradeTierToSilver |
| 14 | `apps/api/src/services/cafe24.service.ts` | 전체 OAuth 플로우, 아크릴세트 판별 로직 |
| 15 | `apps/api/src/services/webhook.service.ts` | HMAC 검증, 중복 방지, 상품코드 발급 |
| 16 | `apps/api/src/services/credit.service.ts` | Firestore 트랜잭션, spend/earn/refund/redeemCode |
| 17 | `apps/api/src/services/ai.service.ts` | Gemini+Kling 전체 파이프라인, 7개 any 중 6개 |

### 3차: 프론트엔드 코어 (5개)
| # | 파일 | 핵심 발견 |
|---|------|-----------|
| 18 | `apps/web/src/app/layout.tsx` | AuthHydrator, AnalyticsProvider, mobile-frame div |
| 19 | `apps/web/src/lib/api.ts` | Axios 인스턴스, JWT interceptor, 모든 API 함수 정의 |
| 20 | `apps/web/src/app/store/page.tsx` | 하드코딩 데모 상품, 카페24 외부 링크 |
| 21 | `apps/web/src/app/cafe24/auth/page.tsx` | OAuth 시작, CSRF state 저장 |
| 22 | `apps/web/src/app/cafe24/callback/page.tsx` | OAuth 콜백, CSRF 검증, loginWithToken |

### 4차: 공유 패키지 + 스토어 (3개)
| # | 파일 | 핵심 발견 |
|---|------|-----------|
| 23 | `packages/shared/src/index.ts` | 프론트엔드에서 미사용, 백엔드 타입과 불일치 |
| 24 | `apps/web/src/stores/useAuthStore.ts` | role 케이싱 4가지 허용, 데모모드 지원, localStorage 캐시 |
| 25 | `apps/web/src/stores/useDevStore.ts` | Dev Inspector 전용 상태관리 |

### 추가 검증
| # | 파일/검색 | 핵심 발견 |
|---|-----------|-----------|
| 26 | `apps/web/vercel.json` | ✅ 존재 (ONBOARDING.md 언급과 일치) |
| 27 | any 타입 전수 검색 | 7개 (ai.service.ts 6개 + validate.ts 1개) |
| 28 | collection() 전수 검색 | 코드에서 실제 사용하는 컬렉션: users, pets, profiles, baseVideos, motions, chatRooms, chatMessages, creditTransactions, trashItems, productCodes, auditLogs, startFrameJobs, nanoBananaJobs + analytics 3개 |
| 29 | `@petholo/shared` import 검색 | 프론트엔드: 0건, 완전 미사용 |

---

## 빌드/테스트 상태 (이전 세션 검증)

| 명령 | 결과 |
|------|------|
| `pnpm --filter @petholo/shared build` | ✅ 성공 |
| `pnpm --filter @petholo/api test` | ✅ 25/25 테스트 통과 |
| CI 파이프라인 | test → build-web + build-api (병렬) |
