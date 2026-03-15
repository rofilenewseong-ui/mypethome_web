# PetHolo 데이터베이스 구축 가이드

**초보자를 위한 쉬운 설명서**
**작성일:** 2026-03-05

---

## 데이터베이스가 뭐야?

앱에서 사용하는 모든 정보를 저장하는 **창고**예요.
- 사용자 정보 (이메일, 이름, 등급)
- 반려동물 정보 (이름, 사진, 생일)
- 영상, 메시지, 결제 기록 등등

PetHolo는 **Firebase Firestore**라는 데이터베이스를 사용해요.
일반 데이터베이스(MySQL 같은)와 다르게 **테이블 대신 컬렉션**, **행 대신 문서**라는 용어를 써요.

---

## 내가 만든 것들 (총 6단계)

### 1단계: 스키마 설계 (설계도)

> "집을 짓기 전에 설계도를 그리는 것"

**만든 파일:**
- `apps/api/database/docs/SCHEMA.md` — 모든 데이터의 상세 명세서
- `apps/api/database/docs/ERD.md` — 데이터 관계도 (그림)

**뭘 했는지:** PetHolo에서 사용하는 14개 데이터 묶음(컬렉션)의 구조를 정리했어요.

```
예시: users 컬렉션 (사용자 정보)
┌──────────────┬──────────┬────────────────┐
│ 필드         │ 타입     │ 설명           │
├──────────────┼──────────┼────────────────┤
│ email        │ 문자열   │ 이메일 주소    │
│ name         │ 문자열   │ 사용자 이름    │
│ tier         │ 선택형   │ BRONZE / SILVER│
│ credits      │ 숫자     │ 보유 크레딧    │
│ createdAt    │ 시간     │ 가입일         │
└──────────────┴──────────┴────────────────┘
```

이런 식으로 14개 컬렉션 전부 정리한 거예요.

---

### 2단계: 타입 정의 (TypeScript 안전장치)

> "데이터에 이름표를 붙여서 실수를 방지하는 것"

**만든 파일:**
- `apps/api/src/types/schema.types.ts`

**뭘 했는지:** 코드에서 데이터를 다룰 때 "이 데이터는 이런 형태여야 해!" 라고 미리 정해둔 거예요.

```typescript
// 예: 사용자 데이터는 반드시 이런 형태
interface UserDoc {
  email: string;      // 반드시 문자열
  credits: number;    // 반드시 숫자
  tier: 'BRONZE' | 'SILVER';  // 이 둘 중 하나만
}
```

이렇게 해두면 실수로 `credits`에 문자를 넣으면 **빨간줄이 그어져서** 에러를 미리 잡아줘요.

---

### 3단계: 인덱스 설정 (검색 속도 UP)

> "책의 목차 같은 것. 목차가 없으면 처음부터 끝까지 다 뒤져야 함"

**만든 파일:**
- `apps/api/database/firestore.indexes.json`

**뭘 했는지:** "이 데이터는 이런 조합으로 자주 검색하니까 미리 정리해놔" 라고 Firestore에 알려주는 거예요.

```
예: "특정 사용자의 반려동물을 최신순으로 보여줘"
→ userId + createdAt 조합으로 인덱스 생성

인덱스가 없으면: 전체 데이터를 다 뒤짐 (느림)
인덱스가 있으면: 바로 해당 데이터로 점프 (빠름)
```

총 13개 복합 인덱스 + 5개 단일 필드 인덱스를 설정했어요.

---

### 4단계: 보안 규칙 (데이터 보호)

> "내 데이터는 나만 볼 수 있게 자물쇠를 거는 것"

**만든 파일:**
- `apps/api/database/firestore.rules` — 데이터 접근 규칙
- `apps/api/database/storage.rules` — 파일(사진) 접근 규칙

**뭘 했는지:**
```
기본: 모든 접근 차단!

예외:
- 내 사용자 정보 → 나만 읽기 가능
- 내 반려동물 정보 → 나만 읽기 가능
- 상품 코드 → 서버만 접근 가능 (해킹 방지)
- 감사 로그 → 서버만 접근 가능
```

---

### 5단계: 데이터 검증 (입력값 체크)

> "회원가입 할 때 이메일 형식이 맞는지, 비밀번호가 8자 이상인지 체크하는 것"

**만든 파일 (새로 추가):**
- `apps/api/src/schemas/messenger.schema.ts` — 메시지 검증
- `apps/api/src/schemas/trash.schema.ts` — 휴지통 검증
- `apps/api/src/schemas/webhook.schema.ts` — 외부 연동 검증

**기존에 있던 것:**
- `auth.schema.ts` — 로그인/회원가입 검증
- `pet.schema.ts` — 반려동물 등록 검증
- `profile.schema.ts` — 프로필 생성 검증
- `credit.schema.ts` — 크레딧 코드 검증

```
예: 메시지 보내기
- 내용이 비어있으면? → "메시지를 입력해주세요" 에러
- 500자 넘으면? → "500자 이내로 입력해주세요" 에러
- 펫 ID가 없으면? → "펫 ID가 필요합니다" 에러
```

---

### 6단계: 시드 데이터 (테스트용 초기 데이터)

> "빈 가게에 진열 샘플을 놓는 것"

**만든 파일:**
- `apps/api/database/seed.ts`

**뭘 했는지:** 개발할 때 바로 테스트할 수 있도록 가짜 데이터를 넣어주는 스크립트를 만들었어요.

```
테스트 계정:
- silver@test.com / test1234 → Silver 등급, 120 크레딧
- bronze@test.com / test1234 → Bronze 등급, 0 크레딧
- admin@test.com  / test1234 → 관리자

테스트 데이터:
- 반려동물 "초코" 🐕
- 홀로그램 프로필 1개
- 베이스 영상 1개
- 상품코드 1개 (TEST-1234-5678-ABCD)
```

---

## 전체 파일 구조

```
apps/api/
├── database/                          ← 데이터베이스 관련 파일 모음
│   ├── docs/
│   │   ├── ERD.md                     ← 관계도 (그림)
│   │   └── SCHEMA.md                  ← 전체 스키마 명세서
│   ├── firestore.indexes.json         ← 검색 속도 최적화 설정
│   ├── firestore.rules                ← 데이터 보안 규칙
│   ├── storage.rules                  ← 파일 보안 규칙
│   ├── schema.types.ts                ← TypeScript 타입 (원본)
│   └── seed.ts                        ← 테스트 데이터 스크립트
├── src/
│   ├── types/
│   │   └── schema.types.ts            ← TypeScript 타입 (빌드용 복사본)
│   ├── schemas/                       ← 입력값 검증 (Zod)
│   │   ├── auth.schema.ts             ← 로그인/회원가입
│   │   ├── pet.schema.ts              ← 반려동물
│   │   ├── profile.schema.ts          ← 프로필
│   │   ├── credit.schema.ts           ← 크레딧
│   │   ├── messenger.schema.ts        ← 메시지 (새로 추가)
│   │   ├── trash.schema.ts            ← 휴지통 (새로 추가)
│   │   └── webhook.schema.ts          ← 외부 연동 (새로 추가)
│   └── config/
│       └── database.ts                ← 타입 안전한 DB 헬퍼 (업그레이드)

루트/
├── firebase.json                      ← Firebase 프로젝트 설정
└── .firebaserc                        ← Firebase 프로젝트 연결
```

---

## 어떻게 배포해? (나중에 할 일)

### 1. Firebase CLI 설치
```bash
npm install -g firebase-tools
```

### 2. Firebase 로그인
```bash
firebase login
```

### 3. 인덱스 배포 (검색 최적화)
```bash
firebase deploy --only firestore:indexes
```

### 4. 보안 규칙 배포
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

### 5. 테스트 데이터 넣기
```bash
npx tsx apps/api/database/seed.ts
```

---

## 14개 컬렉션을 쉽게 이해하기

```
🏠 사용자 (users)
 └── 🐕 반려동물 (pets)  ← 사용자 1명이 여러 마리 등록 가능
      ├── 🎬 프로필 (profiles)  ← 1마리에 여러 홀로그램 가능
      │    ├── 📹 베이스 영상 (baseVideos)  ← 프로필당 최대 3개
      │    └── 💃 모션 (motions)  ← 프로필당 최대 12개
      └── 💬 채팅방 (chatRooms)  ← 등록하면 자동 생성
           └── 💌 메시지 (chatMessages)  ← 5~30분 뒤 AI 답장

💰 크레딧 거래 (creditTransactions)  ← 돈처럼 쓰고 벌고 기록
🗑️ 휴지통 (trashItems)  ← 삭제해도 30일간 복구 가능
🎟️ 상품 코드 (productCodes)  ← 카페24에서 사면 자동 생성
📋 감사 로그 (auditLogs)  ← 누가 뭘 했는지 기록
🎨 AI 작업 (startFrameJobs)  ← Gemini로 이미지 만들기
```

---

## 설치한 스킬 3개

| 스킬 | 출처 | 용도 |
|------|------|------|
| database-schema-design | supercent-io | 스키마 설계 방법론 |
| firebase-ai-logic | supercent-io | Firebase + AI 통합 가이드 |
| sql-optimization-patterns | wshobson | 쿼리 최적화 패턴 |

이 스킬들은 `.agents/skills/` 폴더에 저장되어 있어서, 클로드코드가 자동으로 참고해요.

---

## 크레딧 시스템 요약

```
Silver 가입 시:  +120C 지급
영상/모션 만들기:  -40C 차감
삭제 시:          +20C 환불
복구 시:          -20C 차감

상품 코드:
- FULL_SET:   +120C + Silver 업그레이드
- CREDIT_120: +120C
- CREDIT_40:  +40C
```

---

## 다음에 할 수 있는 것들

1. **Firebase 프로젝트 생성** — console.firebase.google.com에서
2. **인덱스/규칙 배포** — `firebase deploy` 명령어
3. **시드 데이터 실행** — 테스트 계정 생성
4. **서비스에 타입 적용** — `getCollection()` 헬퍼 활용
5. **pets 컬렉션 확장** — species, breed, gender, memo 필드 추가 (스키마에 이미 반영됨)
