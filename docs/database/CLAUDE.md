# PetHolo — 반려동물 추모 홀로그램 서비스

## 프로젝트 개요

반려동물을 떠나보낸 보호자를 위한 홀로그램 추모 서비스.
아크릴 프리즘에 반려동물 영상을 재생하고, AI 메신저로 소통할 수 있음.

## 기술 스택

- **모노레포:** pnpm workspace
- **프론트엔드:** Next.js 16 + React 19 + Tailwind CSS 4 + Zustand 5
- **백엔드:** Express 5 + TypeScript + Firebase Admin SDK
- **데이터베이스:** Firebase Firestore (NoSQL)
- **AI:** Google Gemini (스타트프레임 이미지 생성) + Kling AI (영상 생성)
- **스토리지:** Firebase Storage + AWS S3
- **외부 연동:** Cafe24 자사몰 (웹훅 + OAuth)

## 디렉토리 구조

```
apps/
  web/          — Next.js 프론트엔드 (@petholo/web)
    src/app/    — 페이지 (16개)
    src/components/ui/    — 공통 UI 컴포넌트 (15개)
    src/components/layout/ — MobileLayout, TopBar, BottomNav
    src/stores/ — Zustand 스토어
    public/     — PWA 아이콘, manifest, 서비스워커
  api/          — Express 백엔드 (@petholo/api)
    src/services/   — 비즈니스 로직 (10개 서비스)
    src/routes/     — API 라우트
    src/middleware/  — 인증, 감사, 에러 처리
    database/       — 스키마 문서, 인덱스, 타입 정의
```

## 자주 쓰는 명령어

```bash
pnpm run dev          # 프론트+백엔드 동시 실행
pnpm run dev:web      # 프론트엔드만
pnpm run dev:api      # 백엔드만
pnpm run build        # 전체 빌드
pnpm run test         # API 테스트 (vitest)
```

## UI 컴포넌트 시스템

모두 `apps/web/src/components/ui/`에 위치. 배럴 export:

```ts
import { Button, Card, Modal, Skeleton, Badge, Avatar, Alert, ProgressBar,
         EmptyState, TabToggle, FormField, ListItem, Toggle, Stepper } from '@/components/ui';
```

| 컴포넌트 | 핵심 Props |
|---------|-----------|
| Button | variant(primary/secondary/ghost/danger), size(sm/md/lg), fullWidth, loading |
| Card | onClick, hover |
| Modal | isOpen, onClose, title |
| Skeleton | variant(rect/circle), height, width, count |
| Badge | variant(default/status/tier/count/info), color, size, pill |
| Avatar | src, fallback(emoji), size(xs~xl), online |
| Alert | variant(info/success/warning/error), icon |
| ProgressBar | value(0-100), color, showLabel |
| EmptyState | emoji, title, description, action({label,onClick}) |
| TabToggle | tabs([{key,label,count?}]), activeTab, onChange, variant(filled/pill) |
| FormField | label, icon, required, type, value, onChange, multiline, error |
| ListItem | icon, label, description, trailing(ReactNode), onClick |
| Toggle | enabled, onChange, disabled, size(sm/md) |
| Stepper | totalSteps, currentStep, variant(dots/circles), labels |

## 디자인 토큰 (globals.css)

CSS 변수로 정의. Tailwind `@theme inline`에 매핑됨.

- **배경:** bg-warm(#F5F1EA), bg-card, bg-input, bg-white
- **텍스트:** text-primary(#4A342A), text-secondary, text-muted, text-inverse
- **포인트:** accent-warm, accent-green, accent-red, accent-orange, accent-blue
- **테두리:** border-card, border-input, border-hover
- **폰트:** --font-2xs(9px), --font-xs(11px), --font-sm(13px)
- **안전영역:** --safe-area-top, --safe-area-bottom (노치/Dynamic Island 대응)

## 모바일 설정 (중요)

이 앱은 **모바일 전용** 서비스. 모든 UI는 모바일 기준으로 작업.

- `viewport: "cover"` + safe area inset 적용 완료
- TopBar: 상단 안전영역 패딩, BottomNav: 하단 안전영역 패딩
- PWA: manifest.json + sw.js + apple-touch-icon 설정 완료
- iOS 입력 줌 방지: input font-size 16px
- 당겨서 새로고침 방지: overscroll-behavior-y: contain

## 데이터베이스 (Firestore)

14개 컬렉션. 상세 스키마: `apps/api/database/docs/SCHEMA.md`

| 컬렉션 | 용도 |
|--------|------|
| users | 사용자 계정 (이메일/Google/Cafe24 인증) |
| pets | 반려동물 정보 |
| profiles | 홀로그램 프로필 (STANDING/SITTING) |
| baseVideos | 베이스 영상 (Kling AI, 프로필당 최대 3개) |
| motions | 모션 애니메이션 (프로필당 최대 12개) |
| chatRooms | AI 메신저 채팅방 (pet 등록 시 자동 생성) |
| chatMessages | 메시지 (PET_AI는 5~30분 지연 응답) |
| creditTransactions | 크레딧 원장 (SPEND/EARN/REFUND) |
| trashItems | 소프트 삭제 (30일 복구 가능) |
| productCodes | 상품 교환 코드 (Cafe24 웹훅) |
| auditLogs | API 감사 로그 |
| startFrameJobs | Gemini AI 작업 |
| nanoBananaJobs | (레거시) |

TypeScript 타입: `apps/api/database/schema.types.ts`

## 크레딧 시스템

| 액션 | 비용 |
|------|------|
| Silver 초기 지급 | +120C |
| 베이스 영상/모션 생성 | -40C |
| 삭제 환불 | +20C |
| 휴지통 복구 | -20C |

## 건드리지 않는 것

- `player/[profileId]` — 다크테마 전용 홀로그램 플레이어 (특수 UI)
- `profiles/[id]/settings` — 3분할 프리뷰 등 도메인 특화 UI
- MobileLayout, TopBar, BottomNav — 레이아웃 안정적
- Button, Card, Modal — 기존 컴포넌트 안정적

## 코딩 규칙

- 모든 페이지는 `MobileLayout`으로 감싸기
- UI 컴포넌트는 `@/components/ui`에서 import (인라인 스타일 반복 금지)
- 색상은 CSS 변수 사용 (하드코딩 금지)
- 한국어 UI, 코드 주석은 한국어 허용
- `pnpm run build` 에러 없어야 함
