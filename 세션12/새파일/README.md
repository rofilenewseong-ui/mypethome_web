# 새 파일 (3개)

이 폴더의 파일들은 **새로 만든 파일**입니다. 프로젝트에 아직 없는 파일이므로 지정된 위치에 복사하면 됩니다.

---

## 1. `firestore-helpers.ts`
**위치:** `apps/api/src/utils/firestore-helpers.ts`

### 뭘 하는 파일인가?
Firestore(Google 클라우드 DB)에서 데이터를 효율적으로 가져오는 헬퍼 함수 2개를 제공합니다.

### 함수 설명

#### `batchInQuery(collection, field, values, additionalFilters?)`
- **문제:** Firestore의 `in` 쿼리는 한번에 최대 30개까지만 검색 가능
- **해결:** 30개씩 자동으로 나눠서 실행하고 결과를 합침
- **예시:** 펫 50마리의 프로필을 한번에 가져올 때, 내부적으로 2번(30개+20개) 쿼리 실행

#### `groupBy(items, keyFn)`
- **역할:** 배열을 특정 키 기준으로 그룹핑
- **예시:** 프로필 10개를 펫별로 묶기 → `Map { petId1: [profile1, profile2], petId2: [profile3] }`

---

## 2. `sanitize.ts`
**위치:** `apps/api/src/utils/sanitize.ts`

### 뭘 하는 파일인가?
사용자 입력값에서 **HTML 태그를 제거**하는 보안 유틸리티입니다.

### 왜 필요한가?
사용자가 펫 이름에 `<script>alert('해킹')</script>` 같은 코드를 입력하면 위험합니다.
이 함수가 태그를 제거하여 `alert('해킹')` 같은 안전한 텍스트만 남깁니다.

---

## 3. `migrate-denormalize.ts`
**위치:** `apps/api/database/migrate-denormalize.ts`

### 뭘 하는 파일인가?
기존 DB 데이터에 **새로운 필드를 추가**하는 일회성 마이그레이션 스크립트입니다.

### 왜 필요한가?
이번 최적화에서 채팅방(chatRooms)에 펫 이름, 마지막 메시지 등을 직접 저장하도록 변경했습니다.
기존에 만들어진 채팅방에는 이 필드들이 없으므로, 이 스크립트로 한번 실행하여 채워넣어야 합니다.

### 실행 방법
```bash
cd apps/api
npx tsx database/migrate-denormalize.ts
```

> **주의:** 한번만 실행하면 됩니다. 이미 실행한 데이터는 건너뜁니다.
