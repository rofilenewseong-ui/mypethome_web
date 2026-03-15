# MY PET HOME (petholo) - 개발 진행 현황

> 최종 업데이트: 2026-03-05

## 전체 완성도: ~93%

카페24 스토어 연동만 남은 상태

---

## 프론트엔드 (apps/web)

| 페이지 | UI | API 연동 | 데모 폴백 | 상태 |
|--------|:--:|:--------:|:---------:|------|
| `/` 랜딩 | ✅ | ✅ | ✅ | 완료 |
| `/auth` 로그인/회원가입 | ✅ | ✅ | ✅ | 완료 |
| `/home` 홈 대시보드 | ✅ | ✅ | ✅ | 완료 |
| `/pets/manage` 펫 관리 | ✅ | ✅ | ✅ | 완료 |
| `/pets/register` 펫 등록 | ✅ | ✅ | - | 완료 |
| `/pets/[id]` 펫 상세 | ✅ | ✅ | ✅ | 완료 |
| `/pets/[id]/profiles/new` 영상 생성 위자드 | ✅ | ✅ | ✅ | 완료 |
| `/profiles` 프로필 목록 | ✅ | ✅ | ✅ | 완료 |
| `/profiles/[id]/settings` 프로필 설정 | ✅ | ✅ | ✅ | 완료 |
| `/player/[profileId]` 영상 플레이어 | ✅ | ✅ | ✅ | 완료 |
| `/messenger` 메신저 | ✅ | ✅ | ✅ | 완료 |
| `/settings` 크레딧/설정 | ✅ | ✅ | ✅ | 완료 |
| `/store` 스토어 | ✅ | ⚠️ | ✅ | **카페24 보류** |
| `/trash` 휴지통 | ✅ | ✅ | ✅ | 완료 |
| `/admin` 관리자 | ✅ | ✅ | ✅ | 완료 |

> **프론트엔드: 14/15 완료 (93%)** — 스토어만 카페24 앱 생성 대기

### 공통 컴포넌트

| 컴포넌트 | 파일 | 상태 |
|----------|------|------|
| Button | `components/ui/Button.tsx` | ✅ variants, sizes, loading |
| Card | `components/ui/Card.tsx` | ✅ clickable/non-clickable |
| Modal | `components/ui/Modal.tsx` | ✅ title, close |
| MobileLayout | `components/layout/MobileLayout.tsx` | ✅ TopBar + BottomNav |
| TopBar | `components/layout/TopBar.tsx` | ✅ 헤더 네비게이션 |
| BottomNav | `components/layout/BottomNav.tsx` | ✅ 하단 탭 |
| AuthHydrator | `components/layout/AuthHydrator.tsx` | ✅ 인증 상태 초기화 |

### 상태 관리 (Zustand)

| 스토어 | 기능 | 상태 |
|--------|------|------|
| `useAuthStore` | 로그인, JWT 토큰, 데모 모드, 서버 검증 | ✅ 완료 |

### API 클라이언트 (`lib/api.ts`)

| API 그룹 | 메서드 수 | 상태 |
|----------|:--------:|------|
| authApi | 6 | ✅ register, login, googleAuth, refresh, logout, getMe |
| petsApi | 5 | ✅ list, create, get, update, delete |
| profilesApi | 5 | ✅ listAll, list, create, get, update |
| baseVideosApi | 4 | ✅ list, add, activate, delete |
| motionsApi | 4 | ✅ list, create, assign, delete |
| aiApi | 4 | ✅ generateStartFrame, selectStartFrame, generateVideo, getJobStatus |
| creditsApi | 3 | ✅ balance, history, redeemCode |
| messengerApi | 3 | ✅ getRooms, getMessages, sendMessage |
| trashApi | 3 | ✅ list, restore, permanentDelete |
| adminApi | 5 | ✅ dashboard, users, getUser, updateUser, logs |

---

## 백엔드 (apps/api)

### 라우트 & 컨트롤러

| 모듈 | 엔드포인트 수 | 미들웨어 | 상태 |
|------|:-----------:|----------|------|
| Auth | 6 | rate limiter | ✅ 완료 |
| Pets | 5 | auth, multer | ✅ 완료 |
| Profiles | 4 | auth, silver tier | ✅ 완료 |
| Base Videos | 4 | auth | ✅ 완료 |
| Motions | 4 | auth | ✅ 완료 |
| AI (Gemini+Kling) | 4 | auth, silver tier | ✅ 완료 |
| Credits | 3 | auth | ✅ 완료 |
| Messenger | 3 | auth | ✅ 완료 |
| Trash | 3 | auth | ✅ 완료 |
| Admin | 3 | auth, admin | ✅ 완료 |
| Webhooks | 1 | - | ✅ 완료 |

> **백엔드 라우트: 11/11 완료 (100%)**

### 서비스 레이어

| 서비스 | 코드량 | 핵심 기능 | 상태 |
|--------|:-----:|-----------|------|
| ai.service | 650줄 | Gemini 이미지 생성, Kling 영상 생성, 비동기 폴링 | ✅ 완료 |
| profile.service | 471줄 | CRUD, 베이스영상/모션 관리 | ✅ 완료 |
| pet.service | 237줄 | CRUD, 이미지 업로드 | ✅ 완료 |
| credit.service | 237줄 | 잔액, 히스토리, 코드 리딤 | ✅ 완료 |
| messenger.service | 214줄 | 채팅방, 메시지, AI 응답 | ✅ 완료 |
| auth.service | 147줄 | 가입, 로그인, Google OAuth, 토큰 갱신 | ✅ 완료 |
| trash.service | 140줄 | 목록, 복구, 영구삭제 | ✅ 완료 |
| storage.service | 104줄 | S3 업로드/삭제 | ✅ 완료 |
| webhook.service | 56줄 | 웹훅 핸들링 | ✅ 완료 |

> **백엔드 서비스: 9/9 완료 (100%)**

---

## 인프라 & 기타

| 항목 | 상태 | 비고 |
|------|------|------|
| Firebase Firestore DB | ✅ | 프로젝트: mypethome-e117c |
| JWT 인증 | ✅ | access 15m / refresh 7d |
| Google OAuth | ✅ | Firebase Admin ID 토큰 검증 |
| Gemini AI | ✅ | 시작 프레임 이미지 생성 (3장 옵션) |
| Kling AI | ✅ | 이미지→영상 변환, 비동기 폴링 |
| S3 스토리지 | ✅ | 이미지/영상 저장 |
| E2E 테스트 | ✅ | Vitest + Supertest, 25개 전부 통과 |
| Docker | ✅ | 멀티스테이지 빌드 + docker-compose |
| Vercel 배포 설정 | ✅ | apps/web/vercel.json |
| GitHub Actions CI | ✅ | test → build-web + build-api |
| 카페24 OAuth/스토어 | ⏸️ | 앱 미생성으로 보류 |

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | Next.js 16.1.6, React 19, TypeScript, Tailwind CSS |
| 백엔드 | Express 5.2.1, TypeScript, Firebase Admin 13.7.0 |
| 데이터베이스 | Firebase Firestore |
| 인증 | JWT (jsonwebtoken), bcrypt, Firebase Auth |
| AI | Google Gemini API, Kling AI API |
| 스토리지 | AWS S3 |
| 상태관리 | Zustand |
| 테스트 | Vitest, Supertest |
| 배포 | Docker, Vercel, GitHub Actions |
| 패키지 관리 | pnpm workspace (monorepo) |

---

## 남은 작업

- [ ] 카페24 앱 생성 후 스토어 페이지 OAuth 연동
- [ ] 실제 배포 실행 (Vercel push, Docker 프로덕션)
- [ ] 프로덕션 환경변수 설정
