# MY PET HOME (petholo) — 개발자 온보딩 가이드

> 반려동물 추억 홀로그램 영상 플랫폼

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [개발 환경 세팅](#4-개발-환경-세팅)
5. [환경 변수 설정](#5-환경-변수-설정)
6. [실행 방법](#6-실행-방법)
7. [아키텍처 & 핵심 개념](#7-아키텍처--핵심-개념)
8. [API 엔드포인트 맵](#8-api-엔드포인트-맵)
9. [페이지 라우트 맵](#9-페이지-라우트-맵)
10. [AI 파이프라인](#10-ai-파이프라인)
11. [크레딧 & 티어 시스템](#11-크레딧--티어-시스템)
12. [테스트](#12-테스트)
13. [배포](#13-배포)
14. [컨벤션 & 패턴](#14-컨벤션--패턴)
15. [트러블슈팅](#15-트러블슈팅)

---

## 1. 프로젝트 개요

**MY PET HOME**은 반려동물의 사진을 AI로 영상화하여 홀로그램 디바이스에서 재생하는 서비스입니다.

**핵심 흐름:**
```
펫 등록 → 프로필 생성 → AI 시작 프레임 생성 (Gemini)
→ 영상 생성 (Kling AI) → 홀로그램 재생 → 메신저로 소통
```

**주요 기능:**
- 펫 등록 및 관리
- AI 기반 영상 생성 (시작 프레임 3장 옵션 → 영상 변환)
- 프로필별 베이스 영상 + 모션 관리
- 크레딧 기반 과금 시스템
- AI 메신저 (펫 페르소나 채팅)
- 카페24 연동 스토어 (예정)
- 관리자 대시보드

---

## 2. 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| **프론트엔드** | Next.js | 16.1.6 |
| | React | 19.2.3 |
| | TypeScript | 5.9+ |
| | Tailwind CSS | 4 |
| | Zustand | 5.0.11 |
| | Axios | 1.13.6 |
| **백엔드** | Express | 5.2.1 |
| | TypeScript | 5.9+ |
| | Firebase Admin | 13.7.0 |
| **데이터베이스** | Firebase Firestore | - |
| **인증** | JWT + bcrypt | - |
| | Google OAuth (Firebase Auth) | - |
| **AI** | Google Gemini API | 이미지 생성 |
| | Kling AI API | 영상 생성 |
| **스토리지** | AWS S3 / Firebase Storage | - |
| **테스트** | Vitest + Supertest | - |
| **배포** | Docker + Vercel + GitHub Actions | - |
| **패키지 관리** | pnpm workspace (monorepo) | 9+ |

---

## 3. 프로젝트 구조

```
petholo/
├── apps/
│   ├── web/                          # Next.js 프론트엔드
│   │   ├── src/
│   │   │   ├── app/                  # 15개 페이지 (App Router)
│   │   │   │   ├── page.tsx          # 랜딩
│   │   │   │   ├── auth/             # 로그인/회원가입
│   │   │   │   ├── home/             # 대시보드
│   │   │   │   ├── pets/             # 펫 관리/등록/상세
│   │   │   │   │   └── [id]/profiles/new/  # 영상 생성 위자드
│   │   │   │   ├── profiles/         # 프로필 목록/설정
│   │   │   │   ├── player/           # 영상 플레이어
│   │   │   │   ├── messenger/        # 메신저
│   │   │   │   ├── settings/         # 크레딧/설정
│   │   │   │   ├── store/            # 스토어 (카페24)
│   │   │   │   ├── trash/            # 휴지통
│   │   │   │   └── admin/            # 관리자
│   │   │   ├── components/
│   │   │   │   ├── ui/               # Button, Card, Modal
│   │   │   │   └── layout/           # MobileLayout, TopBar, BottomNav
│   │   │   ├── stores/               # Zustand (useAuthStore)
│   │   │   └── lib/                  # api.ts (Axios 클라이언트)
│   │   ├── vercel.json
│   │   └── next.config.ts
│   │
│   └── api/                          # Express 백엔드
│       ├── src/
│       │   ├── server.ts             # 서버 진입점
│       │   ├── app.ts                # Express 앱 설정
│       │   ├── routes/               # 11개 라우트 모듈
│       │   ├── controllers/          # 12개 컨트롤러
│       │   ├── services/             # 9개 서비스
│       │   ├── middleware/            # auth, rateLimiter, errorHandler
│       │   ├── config/               # env.ts, firebase.ts
│       │   └── utils/                # jwt.ts, logger 등
│       ├── tests/                    # Vitest 테스트
│       ├── firebase-service-account.json  # (gitignored)
│       ├── prompts.secret.json       # AI 프롬프트 (gitignored)
│       └── Dockerfile
│
├── packages/
│   └── shared/                       # 공유 TypeScript 타입
│
├── docker-compose.yml
├── .github/workflows/ci.yml
├── pnpm-workspace.yaml
├── PROGRESS.md                       # 진행 현황
├── CHANGELOG.md                      # 버전 히스토리
└── package.json                      # 루트 스크립트
```

---

## 4. 개발 환경 세팅

### 사전 요구사항

| 도구 | 최소 버전 | 설치 |
|------|----------|------|
| Node.js | 18+ | https://nodejs.org |
| pnpm | 9+ | `npm install -g pnpm` |
| Docker (선택) | - | https://docker.com |

### 설치

```bash
# 1. 레포 클론
git clone <repo-url> petholo
cd petholo

# 2. 의존성 설치
pnpm install

# 3. 환경 변수 설정 (다음 섹션 참고)
cp .env.example apps/api/.env

# 4. Firebase 서비스 계정 파일 배치
cp /path/to/firebase-service-account.json apps/api/

# 5. (선택) AI 프롬프트 시크릿 파일
cp /path/to/prompts.secret.json apps/api/
```

---

## 5. 환경 변수 설정

`apps/api/.env` 파일에 다음 변수를 설정합니다.

### 필수 (서버 실행에 반드시 필요)

| 변수 | 설명 | 예시 |
|------|------|------|
| `PORT` | API 서버 포트 | `4000` |
| `NODE_ENV` | 환경 | `development` |
| `JWT_SECRET` | JWT 서명 키 | `your-secret-key` |
| `JWT_REFRESH_SECRET` | 리프레시 토큰 키 | `your-refresh-secret` |
| `FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID | `mypethome-e117c` |
| `FIREBASE_CLIENT_EMAIL` | Firebase 서비스 계정 이메일 | `firebase-adminsdk-xxx@proj.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Firebase 비공개 키 | `"-----BEGIN PRIVATE KEY-----\n..."` |
| `CORS_ORIGIN` | 프론트엔드 URL | `http://localhost:3000` |

### 선택 (기능별 필요시)

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `FIREBASE_SERVICE_ACCOUNT_PATH` | 서비스 계정 JSON 경로 (위 3개 대체) | `./firebase-service-account.json` |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage 버킷 | `petholo-app.appspot.com` |
| `JWT_EXPIRES_IN` | 액세스 토큰 만료 | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | 리프레시 토큰 만료 | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 시크릿 | - |
| `GOOGLE_CALLBACK_URL` | OAuth 콜백 URL | `http://localhost:4000/api/auth/google/callback` |
| `STORAGE_PROVIDER` | 스토리지 제공자 | `firebase` |
| `S3_ENDPOINT` | S3/MinIO 엔드포인트 | `http://localhost:9000` |
| `S3_REGION` | S3 리전 | `us-east-1` |
| `S3_BUCKET` | S3 버킷명 | `petholo-uploads` |
| `S3_ACCESS_KEY` | S3 액세스 키 | - |
| `S3_SECRET_KEY` | S3 시크릿 키 | - |
| `NANOBANANA_API_KEY` | NanoBanana AI 키 | - |
| `KLING_API_KEY` | Kling AI 키 | - |
| `CAFE24_WEBHOOK_SECRET` | 카페24 웹훅 시크릿 | - |

### 프론트엔드 환경 변수

`apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## 6. 실행 방법

### 개발 모드

```bash
# 프론트 + 백엔드 동시 실행
pnpm dev

# 또는 별도 터미널에서 각각 실행
pnpm dev:api      # 백엔드 → http://localhost:4000
pnpm dev:web      # 프론트 → http://localhost:3000
```

### 빌드

```bash
pnpm build        # 전체 빌드
pnpm build:api    # 백엔드만 (TypeScript → dist/)
pnpm build:web    # 프론트만 (Next.js 빌드)
```

### Docker

```bash
docker-compose up --build    # API 서버 컨테이너 실행
```

### 클린

```bash
pnpm clean        # node_modules, dist, .next 전부 삭제
```

---

## 7. 아키텍처 & 핵심 개념

### 모노레포 구조

```
pnpm workspace
├── apps/web   → @petholo/web   (Next.js)
├── apps/api   → @petholo/api   (Express)
└── packages/shared              (공유 타입)
```

### 인증 흐름

```
[회원가입/로그인] → POST /api/auth/login
                  → JWT 발급 (access 15m + refresh 7d)
                  → 프론트: localStorage에 accessToken 저장
                  → 프론트: useAuthStore.loginWithToken()

[자동 갱신]      → 401 응답 시 → POST /api/auth/refresh
                  → 새 토큰 발급 → 원래 요청 재시도

[데모 모드]      → user.id가 'demo-'로 시작 → API 호출 스킵
```

### 하이브리드 API 패턴

모든 프론트엔드 페이지는 동일한 패턴을 따릅니다:

```typescript
// 1. API 호출 시도
try {
  const response = await petsApi.list();
  setPets(response.data.data);
} catch {
  // 2. 실패 시 데모 데이터로 폴백
  setPets(demoPets);
}
```

이 패턴으로 백엔드 없이도 프론트엔드 개발/테스트가 가능합니다.

### 미들웨어 스택

```
요청 → Helmet(보안) → CORS → Rate Limiter → HPP
     → Body Parser(10MB) → Cookie Parser → Compression
     → [auth] → [requireSilver] → [requireAdmin]
     → Controller → Service → Firestore
```

---

## 8. API 엔드포인트 맵

모든 엔드포인트는 `/api` 프리픽스를 사용합니다.

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|:----:|------|
| **Auth** | | | |
| POST | `/auth/register` | - | 회원가입 |
| POST | `/auth/login` | - | 로그인 |
| POST | `/auth/google` | - | Google OAuth |
| POST | `/auth/refresh` | - | 토큰 갱신 |
| POST | `/auth/logout` | - | 로그아웃 |
| GET | `/auth/me` | ✅ | 내 정보 |
| **Pets** | | | |
| GET | `/pets` | ✅ | 펫 목록 |
| POST | `/pets` | ✅ | 펫 등록 (multipart) |
| GET | `/pets/:id` | ✅ | 펫 상세 |
| PUT | `/pets/:id` | ✅ | 펫 수정 |
| DELETE | `/pets/:id` | ✅ | 펫 삭제 |
| **Profiles** | | | |
| GET | `/profiles` | ✅ | 전체 프로필 목록 |
| GET | `/profiles/pet/:petId` | ✅ | 펫별 프로필 |
| POST | `/profiles` | ✅ Silver | 프로필 생성 |
| PUT | `/profiles/:id` | ✅ | 프로필 수정 |
| **Base Videos** | | | |
| GET | `/base-videos/:profileId` | ✅ | 베이스 영상 목록 |
| POST | `/base-videos/:profileId` | ✅ | 영상 추가 |
| PUT | `/base-videos/:id/activate` | ✅ | 영상 활성화 |
| DELETE | `/base-videos/:id` | ✅ | 영상 삭제 |
| **Motions** | | | |
| GET | `/motions/:profileId` | ✅ | 모션 목록 |
| POST | `/motions` | ✅ | 모션 생성 |
| PUT | `/motions/:id/assign` | ✅ | 모션 할당 |
| DELETE | `/motions/:id` | ✅ | 모션 삭제 |
| **AI** | | | |
| POST | `/ai/start-frame` | ✅ Silver | 시작 프레임 생성 |
| POST | `/ai/select-frame` | ✅ Silver | 프레임 선택 |
| POST | `/ai/generate-video` | ✅ Silver | 영상 생성 |
| GET | `/ai/job/:jobId` | ✅ | 작업 상태 확인 |
| **Credits** | | | |
| GET | `/credits/balance` | ✅ | 잔액 조회 |
| GET | `/credits/history` | ✅ | 사용 내역 |
| POST | `/credits/redeem` | ✅ | 코드 리딤 |
| **Messenger** | | | |
| GET | `/messenger/rooms` | ✅ | 채팅방 목록 |
| GET | `/messenger/rooms/:id/messages` | ✅ | 메시지 조회 |
| POST | `/messenger/rooms/:id/messages` | ✅ | 메시지 전송 |
| **Trash** | | | |
| GET | `/trash` | ✅ | 휴지통 목록 |
| POST | `/trash/:id/restore` | ✅ | 복구 |
| DELETE | `/trash/:id` | ✅ | 영구 삭제 |
| **Admin** | | | |
| GET | `/admin/dashboard` | ✅ Admin | 대시보드 통계 |
| GET | `/admin/users` | ✅ Admin | 사용자 목록 |
| GET | `/admin/logs` | ✅ Admin | 시스템 로그 |
| **기타** | | | |
| GET | `/health` | - | 헬스 체크 |
| POST | `/webhooks/cafe24` | - | 카페24 웹훅 |

---

## 9. 페이지 라우트 맵

| 경로 | 컴포넌트 | 인증 | 설명 |
|------|----------|:----:|------|
| `/` | `app/page.tsx` | - | 랜딩 (시작하기 / 둘러보기) |
| `/auth` | `app/auth/page.tsx` | - | 로그인 / 회원가입 |
| `/home` | `app/home/page.tsx` | ✅ | 메인 대시보드 |
| `/pets/manage` | `app/pets/manage/page.tsx` | ✅ | 펫 관리 |
| `/pets/register` | `app/pets/register/page.tsx` | ✅ | 펫 등록 (2단계 폼) |
| `/pets/[id]` | `app/pets/[id]/page.tsx` | ✅ | 펫 상세 |
| `/pets/[id]/profiles/new` | `app/pets/[id]/profiles/new/page.tsx` | ✅ | 영상 생성 5단계 위자드 |
| `/profiles` | `app/profiles/page.tsx` | ✅ | 프로필 목록 |
| `/profiles/[id]/settings` | `app/profiles/[id]/settings/page.tsx` | ✅ | 프로필 설정 |
| `/player/[profileId]` | `app/player/[profileId]/page.tsx` | ✅ | 영상 플레이어 |
| `/messenger` | `app/messenger/page.tsx` | ✅ | AI 메신저 |
| `/settings` | `app/settings/page.tsx` | ✅ | 크레딧 / 알림 설정 |
| `/store` | `app/store/page.tsx` | ✅ | 스토어 (카페24 보류) |
| `/trash` | `app/trash/page.tsx` | ✅ | 휴지통 (D-day 표시) |
| `/admin` | `app/admin/page.tsx` | ✅ Admin | 관리자 대시보드 |

---

## 10. AI 파이프라인

### 영상 생성 5단계 위자드

```
Step 1: 컨셉 선택
  └→ 사용자가 영상 컨셉/테마 선택

Step 2: 배경 선택
  └→ 배경 이미지 또는 색상 선택

Step 3: 프롬프트 입력
  └→ AI 생성에 사용할 설명 입력

Step 4: AI 생성
  ├→ Gemini API: 시작 프레임 이미지 3장 생성 (40C)
  ├→ 사용자가 1장 선택
  ├→ Kling AI: 선택된 이미지 → 영상 변환 (비동기)
  └→ 폴링으로 완료 대기

Step 5: 완료
  └→ 프로필에 베이스 영상으로 저장
```

### 비동기 처리 흐름

```
POST /ai/generate-video → jobId 반환
  → 클라이언트 폴링: GET /ai/job/:jobId
  → status: pending → processing → completed/failed
  → completed 시 영상 URL 반환
```

### 프롬프트 보안

AI 프롬프트는 `apps/api/prompts.secret.json`에 분리 저장되며 Git에 포함되지 않습니다.

---

## 11. 크레딧 & 티어 시스템

### 티어

| 티어 | 가격 | 크레딧 | 기능 |
|------|------|--------|------|
| BRONZE | 무료 | 샘플만 | 기본 기능, AI 생성 불가 |
| SILVER | 유료 | 120C 보너스 | 전체 기능 + AI 영상 생성 |

### 크레딧 소비

| 작업 | 소비 크레딧 |
|------|:-----------:|
| 베이스 영상 생성 (Gemini + Kling) | 40C |
| 모션 생성 | 40C |
| 이미지 재생성 | 10C |
| 삭제 시 환불율 | 50% |

---

## 12. 테스트

```bash
# 전체 테스트 실행
pnpm test

# 워치 모드
pnpm --filter @petholo/api test:watch
```

### 테스트 구성 (25개)

**`tests/auth.test.ts`** — 인증 13개:
- 회원가입 (정상, 중복, 잘못된 이메일, 약한 비밀번호)
- 로그인 (정상, 잘못된 비밀번호)
- 내 정보 조회 (정상, 토큰 없음, 잘못된 토큰)
- 토큰 갱신, 로그아웃, 헬스 체크

**`tests/api.test.ts`** — API 12개:
- 펫 CRUD + 인증 거부
- 크레딧 잔액/내역
- 프로필 목록, 휴지통 목록
- 메신저 채팅방
- 잘못된 JSON 검증, 보안 헤더, 404 처리

---

## 13. 배포

### 프론트엔드 → Vercel

```bash
# Vercel CLI로 배포
vercel --prod

# 환경변수 설정 필요:
# NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
```

### 백엔드 → Docker

```bash
# 빌드 & 실행
docker-compose up --build -d

# 필요 파일:
# - apps/api/.env
# - apps/api/firebase-service-account.json
# - apps/api/prompts.secret.json
```

### CI/CD → GitHub Actions

`.github/workflows/ci.yml`:
```
push/PR → test (25개) → build-web + build-api (병렬)
```

---

## 14. 컨벤션 & 패턴

### 디자인 시스템

- **색상**: 따뜻한 브라운/그린 계열 (`#8B6914`, `#2D5016` 등)
- **레이아웃**: 모바일 퍼스트 (MobileLayout 래퍼)
- **폰트**: 시스템 폰트

### 코드 패턴

**서비스 레이어**: 모든 비즈니스 로직은 서비스에 위치
```
Route → Controller (req/res 처리) → Service (비즈니스 로직) → Firestore
```

**에러 처리**: `AppError` 클래스 사용
```typescript
throw new AppError('메시지', 400);  // → { success: false, error: '메시지' }
```

**API 응답 형식**:
```typescript
// 성공
{ success: true, data: { ... } }

// 실패
{ success: false, error: '에러 메시지' }
```

**프론트엔드 상태**:
```typescript
// Zustand 스토어 패턴
const { user, isAuthenticated } = useAuthStore();
```

### 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일 (컴포넌트) | PascalCase | `MobileLayout.tsx` |
| 파일 (라우트) | kebab-case | `auth.routes.ts` |
| 파일 (서비스) | kebab-case | `ai.service.ts` |
| 함수/변수 | camelCase | `generateStartFrame` |
| 타입/인터페이스 | PascalCase | `AuthUser`, `TokenPayload` |
| API 경로 | kebab-case | `/base-videos`, `/start-frame` |

---

## 15. 트러블슈팅

### Firebase 연결 안됨
```
⚠️ Firebase initialized in limited mode
```
→ `firebase-service-account.json` 파일이 `apps/api/` 경로에 있는지 확인
→ 또는 `.env`에 `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` 설정

### CORS 에러
```
Access-Control-Allow-Origin 에러
```
→ `apps/api/.env`의 `CORS_ORIGIN`이 프론트엔드 URL과 일치하는지 확인 (기본: `http://localhost:3000`)

### 프론트엔드에서 API 호출 실패
→ 데모 데이터로 자동 폴백됨 (정상 동작)
→ 실제 API 연동이 필요하면 백엔드가 실행 중인지 확인: `http://localhost:4000/api/health`

### 빌드 에러
```bash
# 의존성 문제 시
pnpm clean && pnpm install

# TypeScript 에러 시
pnpm build:api 2>&1 | head -50
```

### AI 기능 작동 안됨
→ Silver 티어 이상만 AI 기능 사용 가능
→ `NANOBANANA_API_KEY`, `KLING_API_KEY` 환경변수 확인
→ `prompts.secret.json` 파일 존재 여부 확인

---

> 문서 최종 업데이트: 2026-03-05
