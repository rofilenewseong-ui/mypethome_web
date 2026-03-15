# MY PET HOME (petholo) - 버전 히스토리

---

## v0.9.0 — 2026-03-05 (세션 2: 통합 & 배포)

### 인증 시스템 완성
- `/auth` 로그인/회원가입 페이지 신규 생성
- `authApi` 확장: register, login, googleAuth, refresh, logout
- `useAuthStore` 전면 재작성: JWT 토큰 기반 인증, localStorage 저장, 백그라운드 서버 검증
- 백엔드 `/auth/refresh` 엔드포인트 추가 (route → controller → service)
- Google OAuth: Firebase Admin `verifyIdToken()` 실제 검증으로 변경
- 랜딩 페이지 "시작하기" 버튼을 `/auth`로 연결 (기존 데모 로그인 대체)

### 영상 생성 플로우 연결
- 프로필 설정 페이지의 베이스 영상/모션 "+" 버튼을 `/pets/[id]/profiles/new` 위자드로 연결
- `petId` 상태 추적 추가

### E2E 테스트 구축
- Vitest + Supertest 설치 및 설정
- `tests/auth.test.ts`: 인증 관련 13개 테스트
- `tests/api.test.ts`: API 관련 12개 테스트
- 전체 25개 테스트 통과

### 배포 인프라
- `apps/api/Dockerfile`: 멀티스테이지 빌드 (deps → build → production)
- `docker-compose.yml`: health check, 볼륨 마운트
- `apps/web/vercel.json`: Vercel 배포 설정
- `.github/workflows/ci.yml`: test → build-web + build-api 파이프라인
- `.dockerignore` 추가

### 변경 파일 목록
```
신규:
  apps/web/src/app/auth/page.tsx
  apps/api/tests/auth.test.ts
  apps/api/tests/api.test.ts
  apps/api/vitest.config.ts
  apps/api/Dockerfile
  apps/web/vercel.json
  docker-compose.yml
  .github/workflows/ci.yml
  .dockerignore

수정:
  apps/api/src/routes/auth.routes.ts
  apps/api/src/controllers/auth.controller.ts
  apps/api/src/services/auth.service.ts
  apps/web/src/lib/api.ts
  apps/web/src/stores/useAuthStore.ts
  apps/web/src/app/page.tsx
  apps/web/src/app/profiles/[id]/settings/page.tsx
  apps/api/package.json
  package.json
```

---

## v0.7.0 — 2026-03-04 (세션 1: 메인 개발)

### 프로젝트 초기 구조
- pnpm 모노레포 구성: `apps/web`, `apps/api`, `packages/shared`
- Next.js 16 + React 19 프론트엔드 세팅
- Express 5 백엔드 세팅
- TypeScript 전체 적용

### 데이터베이스 & 인증
- Firebase Firestore 연동 (프로젝트: mypethome-e117c)
- JWT 인증 구현 (access 15m / refresh 7d)
- bcrypt 비밀번호 해싱
- Google OAuth 기본 구조

### 프론트엔드 15개 페이지 구현
- 랜딩 페이지 (데모 모드 진입)
- 홈 대시보드 (2x2 메뉴 그리드, 펫 카드, 프로필 영상)
- 펫 관리 / 등록 / 상세
- 프로필 목록 / 설정
- 영상 생성 5단계 위자드 (컨셉 → 배경 → 프롬프트 → AI 생성 → 완료)
- 영상 플레이어
- 메신저 (채팅방 + 이모지)
- 크레딧/설정
- 스토어 (데모 전용, 카페24 보류)
- 휴지통 (D-day 컬러 시스템)
- 관리자 대시보드
- 모든 페이지에 API 호출 + 데모 데이터 폴백 패턴 적용

### 백엔드 11개 라우트 모듈 구현
- Auth (6개), Pets (5개), Profiles (4개), BaseVideos (4개)
- Motions (4개), AI (4개), Credits (3개), Messenger (3개)
- Trash (3개), Admin (3개), Webhooks (1개)
- 총 40개 엔드포인트

### 백엔드 9개 서비스 구현
- AI 서비스: Gemini 시작 프레임 생성 (3장 옵션) + Kling 영상 생성 (비동기 폴링)
- 크레딧 시스템: BASE_VIDEO=40C, MOTION=40C, IMAGE_REGEN=10C, 삭제환불=50%
- 티어 시스템: BRONZE (무료 샘플), SILVER (유료, 120C 보너스)
- 프롬프트 보안: `prompts.secret.json` 분리 저장

### 보안 & 미들웨어
- Helmet, CORS, rate limiting, HPP
- 인증 미들웨어 (JWT Bearer / Cookie)
- Silver 티어 전용 미들웨어
- Admin 전용 미들웨어

### 공통 컴포넌트
- Button, Card, Modal (UI)
- MobileLayout, TopBar, BottomNav, AuthHydrator (Layout)

### 상태 관리
- Zustand `useAuthStore` (localStorage 영속화)

### API 클라이언트
- axios 인스턴스 + JWT 인터셉터 + 401 토큰 갱신

### 변경 파일 목록
```
전체 프로젝트 구조 생성 (주요 디렉토리):
  apps/web/src/app/          — 15개 페이지
  apps/web/src/components/   — 7개 컴포넌트
  apps/web/src/stores/       — 1개 스토어
  apps/web/src/lib/          — API 클라이언트
  apps/api/src/routes/       — 11개 라우트
  apps/api/src/controllers/  — 12개 컨트롤러
  apps/api/src/services/     — 9개 서비스
  apps/api/src/middleware/    — 인증/보안 미들웨어
  apps/api/src/config/       — Firebase, 환경변수
  apps/api/src/utils/        — JWT 유틸
  packages/shared/           — 공유 타입
```

---

## 버전 요약

| 버전 | 날짜 | 완성도 | 주요 내용 |
|------|------|:------:|-----------|
| v0.7.0 | 2026-03-04 | ~70% | 프로젝트 구조, 15개 페이지, 11개 라우트, 9개 서비스, AI 파이프라인 |
| v0.9.0 | 2026-03-05 | ~93% | 실제 인증, 영상 플로우 연결, E2E 테스트 25개, 배포 인프라 |
| v1.0.0 | TBD | 100% | 카페24 스토어 연동, 프로덕션 배포 |
