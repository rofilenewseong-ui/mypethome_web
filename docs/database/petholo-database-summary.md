# PetHolo 데이터베이스 구축 요약

**작성일:** 2026-03-05

---

## 설치한 스킬 (3개)

| 스킬 | 출처 | 용도 |
|------|------|------|
| database-schema-design | supercent-io | 스키마 설계 방법론 |
| firebase-ai-logic | supercent-io | Firebase + AI 통합 |
| sql-optimization-patterns | wshobson | 쿼리 최적화 패턴 |

---

## 만든 파일 (11개)

| 파일 | 뭐하는 건지 |
|------|------------|
| `database/docs/ERD.md` | 데이터 관계도 (그림) |
| `database/docs/SCHEMA.md` | 14개 컬렉션 상세 명세서 |
| `database/firestore.indexes.json` | 검색 속도 최적화 설정 (인덱스 18개) |
| `database/firestore.rules` | 데이터 보안 규칙 |
| `database/storage.rules` | 파일(사진) 보안 규칙 |
| `database/schema.types.ts` | TypeScript 타입 정의 |
| `database/seed.ts` | 테스트용 초기 데이터 |
| `schemas/messenger.schema.ts` | 메시지 입력 검증 (새로 추가) |
| `schemas/trash.schema.ts` | 휴지통 입력 검증 (새로 추가) |
| `schemas/webhook.schema.ts` | 외부 연동 검증 (새로 추가) |
| `config/database.ts` | 타입 안전한 DB 헬퍼 (업그레이드) |

---

## 바탕화면에 저장된 참고 파일

| 파일 | 내용 |
|------|------|
| `petholo-components.md` | UI 컴포넌트 시스템 레퍼런스 (14개) |
| `petholo-database-guide.md` | 데이터베이스 초보자 가이드 (6단계 설명) |
| `petholo-database-summary.md` | 이 파일 (구축 요약) |

---

## 6단계 구축 과정

### 1단계: 스키마 설계 (설계도)
집 짓기 전에 설계도를 그리는 것.
14개 컬렉션의 모든 필드, 타입, 관계를 정의함.

### 2단계: 타입 정의 (안전장치)
코드에서 데이터를 다룰 때 실수하면 빨간줄로 알려주는 것.
모든 컬렉션에 TypeScript 타입을 적용함.

### 3단계: 인덱스 설정 (검색 속도)
책의 목차처럼 자주 찾는 데이터를 빨리 찾게 해주는 것.
13개 복합 인덱스 + 5개 단일 필드 인덱스 설정.

### 4단계: 보안 규칙 (자물쇠)
내 데이터는 나만 볼 수 있게 접근 제한을 거는 것.
Firestore + Storage 보안 규칙 작성.

### 5단계: 데이터 검증 (입력 체크)
이메일 형식, 비밀번호 길이 등 잘못된 입력을 걸러내는 것.
메시지, 휴지통, 웹훅 3개 검증 스키마 추가.

### 6단계: 시드 데이터 (테스트 준비)
개발할 때 바로 쓸 수 있는 가짜 데이터를 넣는 것.
테스트 계정 3개 + 반려동물 + 영상 + 상품코드.

---

## 배포 명령어 (나중에 할 일)

```bash
# 1. Firebase CLI 설치
npm install -g firebase-tools

# 2. 로그인
firebase login

# 3. 인덱스 배포
firebase deploy --only firestore:indexes

# 4. 보안 규칙 배포
firebase deploy --only firestore:rules
firebase deploy --only storage

# 5. 테스트 데이터 넣기
npx tsx apps/api/database/seed.ts
```

---

## 테스트 계정

| 이메일 | 비밀번호 | 등급 | 크레딧 |
|--------|---------|------|--------|
| silver@test.com | test1234 | Silver | 120C |
| bronze@test.com | test1234 | Bronze | 0C |
| admin@test.com | test1234 | Admin | 9999C |

**상품코드:** TEST-1234-5678-ABCD (40C)
