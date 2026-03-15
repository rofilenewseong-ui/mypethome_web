# PetHolo 문서 센터

> **마이펫홈 — 반려동물 추모 홀로그램 서비스**
> 최종 업데이트: 2026-03-05

---

## 📁 폴더 구조

```
docs/
├── README.md                  ← 이 파일 (문서 목차)
│
├── project/                   📋 프로젝트 관리
│   ├── PROGRESS.md            — 개발 진행 현황 (~93%)
│   ├── CHANGELOG.md           — 버전 히스토리 (v0.7.0 → v0.9.0)
│   └── ONBOARDING.md          — 개발자 온보딩 가이드
│
├── strategy/                  🎯 마이펫홈 성공전략
│   ├── 01_프로젝트_전체_구조도.md
│   ├── 02_용어사전_이것만_알면_된다.md
│   ├── 03_버전1_MVP_이렇게_동작한다.md
│   ├── 04_버전2_V1_이렇게_동작한다.md
│   ├── 05_버전3_petmorial_이렇게_동작한다.md
│   ├── 06_서버_API_주문서_모음.md
│   └── 07_AI_연동_이렇게_돌아간다.md
│
├── database/                  🗄️ 데이터베이스
│   ├── CLAUDE.md              — AI 어시스턴트용 프로젝트 개요
│   ├── petholo-components.md  — UI 컴포넌트 시스템 (14개)
│   ├── petholo-database-guide.md   — DB 구축 가이드 (초보자용)
│   └── petholo-database-summary.md — DB 구축 요약 (스킬/파일 목록)
│
├── brand/                     🎨 브랜드
│   └── 마이펫홈_브랜드보이스_지침서.md — 브랜드 보이스 & 톤 지침
│
├── mockup/                    🖼️ UI 목업
│   ├── index.html             — 목업 인덱스
│   ├── common.css             — 공통 스타일
│   ├── 01_login.html          — 로그인
│   ├── 02_home.html           — 홈 대시보드
│   ├── 03_pet_register.html   — 펫 등록
│   ├── 04_messenger.html      — 메신저
│   ├── 05_hologram_player.html — 홀로그램 플레이어
│   ├── 06_credits_settings.html — 크레딧/설정
│   ├── 07_trash.html          — 휴지통
│   ├── 08_admin.html          — 관리자
│   ├── 09_store_cafe24.html   — 스토어 (카페24)
│   ├── 10_integrated_settings.html — 통합 설정
│   ├── 11_backend_api.html    — 백엔드 API
│   └── 12_deployment_guide.html — 배포 가이드
│
└── session-logs/              📝 개발 세션 로그
    ├── 2026-03-05-session3.md          — 세션 3 작업 요약
    └── 2026-03-05-conversation-full.md — 전체 대화 기록
```

---

## 🔗 관련 리소스 (다른 위치)

| 위치 | 내용 |
|------|------|
| `apps/api/database/` | Firestore 스키마 원본 (SCHEMA.md, ERD.md, schema.types.ts, indexes, rules) |
| `apps/api/database/pending-updates/` | 스키마 변경 대기 패치 (lastLoginAt, cafe24 추적 필드) |
| `.claude/plans/` | 구현 계획 파일 (카페24 OAuth 등) |
| `.agents/skills/` | Claude 스킬 (database-schema-design, firebase-ai-logic 등) |

---

## 📖 빠른 시작

### 처음 프로젝트 파악하려면
1. `project/ONBOARDING.md` — 기술 스택, 환경 세팅, 실행 방법
2. `project/PROGRESS.md` — 현재 완성도와 남은 작업
3. `strategy/01_프로젝트_전체_구조도.md` — 전체 그림

### 비즈니스 이해하려면
1. `strategy/02_용어사전_이것만_알면_된다.md` — 핵심 용어
2. `brand/마이펫홈_브랜드보이스_지침서.md` — 브랜드 톤 & 매너

### 기술 구현 파악하려면
1. `strategy/06_서버_API_주문서_모음.md` — API 명세
2. `strategy/07_AI_연동_이렇게_돌아간다.md` — AI 파이프라인
3. `database/petholo-database-guide.md` — DB 구조

### 버전별 기능 이해하려면
1. `strategy/03_버전1_MVP_이렇게_동작한다.md`
2. `strategy/04_버전2_V1_이렇게_동작한다.md`
3. `strategy/05_버전3_petmorial_이렇게_동작한다.md`

### 개발 히스토리 보려면
1. `project/CHANGELOG.md` — 버전별 변경사항
2. `session-logs/` — 클로드 세션별 작업 기록
