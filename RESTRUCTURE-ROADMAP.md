# PetHolo 재구조화 실행 로드맵

> **작성일**: 2026-03-06
> **방법론**: "기획과 코딩의 분리" — 리서치→기획→주석루프→구현 파이프라인
> **핵심 원칙**: Plan을 검토·승인하기 전까지 코드를 절대 쓰지 않는다

---

## 현재 상황 진단

### 지금까지 한 것
- 6개 세션에 걸쳐 목업 HTML 12개 기반으로 프론트엔드/백엔드 코드 작성
- 155개 파일, 39,892줄 코드가 쌓여 있음
- GitHub `main` 브랜치에 푸시 완료

### 근본적 문제
| 문제 | 설명 |
|------|------|
| 껍데기 코드 | API 호출이 실패하면 localStorage 폴백으로 데모 데이터 표시 — 실제 동작이 아님 |
| 하드코딩 데모 | `page.tsx`에 `tier: 'SILVER', credits: 120` 직접 삽입 |
| 인증 미구현 | Cafe24 OAuth 계획만 있고 동작하는 코드 없음 |
| 스키마 불일치 | 문서(14개 컬렉션) vs 실제 코드(13개) 불일치, pending-updates 미반영 |
| 기술 부채 | any 타입, 중복 로직, emoji 잔재, Supabase 흔적 |
| 목업 주도 개발 | HTML 목업을 보고 UI를 먼저 만들었기 때문에, 데이터 흐름이 역방향 |

### 목표
**목업 기반으로 쌓은 코드를 리서치→기획→구현 파이프라인으로 재구조화하여, 실제 동작하는 서비스로 만든다.**

---

## 실행 단계

### 🔴 사전 준비 (시작 전)

```bash
cd /Users/ferion/Desktop/petholo
git add -A && git commit -m "snapshot: before restructure"
git checkout -b restructure
```

- `restructure` 브랜치에서 작업 — main은 안전하게 보존
- 잘못되면 언제든 `git checkout main`으로 복귀 가능

---

### STEP 1: 리서치 — `Research.md` 산출

**목표**: 현재 코드베이스의 실체를 낱낱이 파악. 뭐가 진짜 동작하고 뭐가 껍데기인지 구분.

**내가 할 것**:
1. `apps/web/` — 모든 페이지, 컴포넌트, 스토어, 훅, 라이브러리 전수 분석
2. `apps/api/` — 모든 라우트, 컨트롤러, 서비스, 미들웨어, 타입 전수 분석
3. `packages/shared/` — 공유 타입/유틸 분석
4. 설정 파일 — package.json, tsconfig, tailwind, next.config 등
5. DB 문서 — `database/` 폴더의 스키마, 룰, 인덱스, pending-updates
6. 문서 — `docs/` 전체 (목업, 전략, 세션로그)

**Research.md 포함 항목**:
| # | 항목 | 설명 |
|---|------|------|
| 1 | 프로젝트 구조 | 모노레포 구조, 각 폴더 역할, 의존성 |
| 2 | 실제 동작 vs 껍데기 | 각 페이지/API가 진짜 데이터를 주고받는지 판별 |
| 3 | 데이터 흐름 | 프론트→백→DB 연결 상태, 폴백 위치, 실패 지점 |
| 4 | DB 스키마 현황 | Firestore 컬렉션별 타입 정의 vs 문서 정의 비교 |
| 5 | 인증 흐름 | Cafe24 OAuth 구현 상태 |
| 6 | AI 파이프라인 | 이미지→영상→GIF 흐름에서 실제 연동 vs 스텁 |
| 7 | 결제/크레딧 | 크레딧 시스템 구현 범위 |
| 8 | 기술 부채 목록 | any 타입, 하드코딩, 중복, 불일치 |
| 9 | 빌드/테스트 | pnpm build, pnpm test 결과 |

**산출물**: `Research.md` (프로젝트 루트)

**⚠️ 이 단계에서는 아무것도 수정하지 않음**

**당신의 역할**:
- Research.md를 읽고 틀린 부분에 주석을 단다
- 예: `<!-- 이건 Kling API야, OpenAI 아님 -->`, `<!-- Supabase 아니고 Firestore야 -->`
- 주석을 달면 내가 반영해서 업데이트

---

### STEP 2: 기획 — `Plan.md` 산출

**목표**: Research.md 기반으로 실제 코드 변경 계획 수립

**Plan.md 구조**:

```
A. 아키텍처 재설계
   - 폴더 구조 변경안 (현재 → 제안)
   - API 레이어: 라우트→컨트롤러→서비스→리포지토리
   - 프론트 상태관리: Zustand 스토어 구조
   - 공통 타입: packages/shared

B. DB 스키마 확정
   - Firestore 컬렉션별 최종 필드 정의
   - 인덱스, 보안 규칙

C. 인증 흐름 구현
   - Cafe24 OAuth 전체 플로우 (코드 스니펫)
   - JWT 토큰 관리, 미들웨어 체인

D. 핵심 기능별 구현 순서
   1. 인증 + 사용자 관리
   2. 펫 CRUD
   3. 프로필 CRUD
   4. AI 이미지/영상 (Kling 연동)
   5. 크레딧 시스템 (Cafe24 웹훅)
   6. 홀로그램 플레이어
   7. AI 메신저
   8. 휴지통
   9. 관리자 대시보드

E. 각 기능별 상세
   - 수정될 파일 경로
   - 변경 전/후 코드 스니펫
   - 의존성, 트레이드오프

F. 제거할 것
   - localStorage 폴백
   - 데모 유저 하드코딩
   - 죽은 코드
```

**산출물**: `Plan.md` (프로젝트 루트)

**⚠️ 이 단계에서도 아직 구현하지 않음**

---

### STEP 3: 주석 루프 (가장 중요한 단계)

**목표**: Plan.md를 완벽하게 다듬는다. 만족할 때까지 반복.

**프로세스**:
```
Claude → Plan.md 작성
  ↓
당신 → 에디터에서 인라인 주석 추가
  ↓
Claude → 주석 반영해서 Plan.md 업데이트 (구현 X)
  ↓
반복 (보통 3~5회)
  ↓
TODO 체크리스트가 명확해지면 → STEP 4로
```

**주석 예시**:
```markdown
<!-- 아니, 이건 PUT이 아니라 PATCH야 -->
<!-- Toss Payments 아직 안 넣을 거야. 크레딧 충전은 카페24 웹훅으로만 -->
<!-- AI는 Kling만 쓸 거야. OpenAI 이미지 생성은 NanoBanana로 대체 -->
<!-- 프론트 라우팅 이렇게 가야 해: /home, /pets, /pets/register, ... -->
```

**반드시 넣는 문장**: "아직 구현하지 마."

---

### STEP 4: 구현

**목표**: Plan.md의 TODO를 기계적으로 실행

**규칙**:
- 단계 완료 시 Plan.md에서 해당 TODO에 `[x]` 완료 표시
- `any` 같은 느슨한 타입 금지
- 모든 작업 완료까지 멈추지 않음
- `pnpm build`로 타입체크 수시 확인
- 기존 테스트 깨뜨리지 않음

**구현 중 커뮤니케이션**:
- 짧게 지시: "이 API 응답에 gifUrl 빠졌잖아. 추가해."
- UI 문제: 스크린샷 첨부
- 방향 수정: "이 부분은 이렇게 바꿔."

---

### STEP 5: 실패 대응

**원칙**: 잘못된 방향이면 패치하지 말고 되돌린다.

```bash
git reset --hard HEAD~1   # 마지막 커밋 되돌리기
```

그리고 범위를 좁혀서 다시:
```
"이제 [구체적 범위만] 다시 해. 그것 외엔 아무것도 건드리지 마."
```

---

## 전체 타임라인 (예상)

| 단계 | 소요 | 산출물 | 누가 |
|------|------|--------|------|
| 사전 준비 | 1분 | restructure 브랜치 | Claude |
| STEP 1 | 20~30분 | Research.md | Claude 작성 → 당신 검토 |
| STEP 2 | 20~30분 | Plan.md | Claude 작성 → 당신 검토 |
| STEP 3 | 30분~1시간 | Plan.md (확정) | 당신 주석 → Claude 반영 (3~5회) |
| STEP 4 | 2~4시간 | 구현된 코드 | Claude 구현 → 당신 감독 |
| 마무리 | 10분 | merge to main | Claude |

---

## 기술 스택 (확정 — 재구조화 시 기준)

| 영역 | 기술 | 비고 |
|------|------|------|
| Frontend | Next.js 16, React 19, Tailwind v4, Zustand | Turbopack 사용 |
| Backend | Express 5, TypeScript, Zod | 라우트→컨트롤러→서비스→리포지토리 |
| DB | Firebase Firestore | NoSQL, 9개 컬렉션 |
| Storage | Firebase Storage | 사진, 영상, GIF |
| AI 영상 | Kling (Kuaishou) API | 이미지→영상 변환 |
| AI 이미지 | NanoBanana 등 | 펫 사진→AI 초상화 |
| 인증 | Cafe24 OAuth → JWT | access/refresh 토큰 |
| 결제 | Cafe24 웹훅 기반 크레딧 충전 | Toss Payments는 추후 |
| GIF | ffmpeg 2-pass 팔레트 | 서버사이드 변환 |
| 모바일 프레임 | max-width 430px | 데스크톱에서도 모바일 뷰 |

---

## 핵심 사용자 흐름 (재구조화 기준)

```
카페24 자사몰 방문
  → Cafe24 OAuth 로그인
  → 홈 (펫 목록 + 프로필 카드)
  → 펫 등록 (3단계 위자드)
  → 프로필 생성 (사진 업로드)
  → AI 이미지 생성 (크레딧 차감)
  → 후보 선택
  → Kling 영상 생성 (크레딧 차감)
  → GIF 미리보기
  → 홀로그램 플레이어 (좌우반전, 가로모드)
  → AI 메신저 (펫과 대화)
```

---

## 다음 행동

**당신이 "시작해"라고 하면:**
1. `restructure` 브랜치 생성
2. STEP 1 실행 — 코드베이스 전체를 깊이 읽고 `Research.md` 작성
3. Research.md를 당신에게 전달 — 검토/주석 요청

**⚠️ 당신이 승인하기 전까지 코드는 한 줄도 수정하지 않습니다.**
