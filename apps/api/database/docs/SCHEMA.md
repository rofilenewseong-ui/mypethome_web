# PetHolo Database Schema Reference

**Database:** Firebase Firestore (NoSQL)
**Collections:** 14
**Last updated:** 2026-03-05

---

## 1. users

사용자 계정 및 인증 정보.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string | auto | — | Firestore document ID |
| email | string | YES | — | 이메일 (unique) |
| passwordHash | string | NO | — | bcrypt(12) 해시. Google/Cafe24 사용자는 null |
| name | string | YES | — | 사용자 이름 |
| googleId | string | NO | — | Google OAuth ID (unique) |
| cafe24MemberId | string | NO | — | Cafe24 자사몰 회원 ID (unique) |
| phone | string | NO | — | 전화번호 |
| role | enum | YES | `USER` | `USER` \| `ADMIN` |
| tier | enum | YES | `BRONZE` | `BRONZE` \| `SILVER` |
| credits | number | YES | `0` | 보유 크레딧 (음수 불가) |
| isVerified | boolean | YES | `false` | 인증 여부 |
| createdAt | timestamp | YES | serverTimestamp | 가입일 |
| updatedAt | timestamp | YES | serverTimestamp | 최종 수정일 |

**Queries:**
- `WHERE email == ?` (로그인, 중복 체크)
- `WHERE googleId == ?` (Google 로그인)
- `WHERE cafe24MemberId == ?` (Cafe24 인증)
- `doc(userId)` (프로필 조회, 크레딧 확인)

**Estimated rows:** ~1,000 (초기 서비스)

---

## 2. pets

반려동물 프로필 (추모 대상).

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string | auto | — | Firestore document ID |
| userId | string | YES | — | FK → users |
| name | string | YES | — | 반려동물 이름 |
| species | enum | NO | null | `DOG` \| `CAT` \| `OTHER` (반려동물 종류) |
| breed | string | NO | null | 품종 (예: 포메라니안, 페르시안) |
| gender | enum | NO | null | `MALE` \| `FEMALE` \| `UNKNOWN` (성별) |
| emoji | string | NO | `''` | 대표 이모지 |
| frontPhoto | string | YES | — | 정면 사진 URL (Firebase Storage) |
| sidePhoto | string | YES | — | 측면 사진 URL (Firebase Storage) |
| birthday | timestamp | NO | null | 생일 |
| memorialDay | timestamp | NO | null | 기일 |
| favoriteSnack | string | NO | null | 좋아하는 간식 |
| walkingPlace | string | NO | null | 산책 장소 |
| memo | string | NO | null | 보호자 메모 (기억하고 싶은 것들) |
| createdAt | timestamp | YES | serverTimestamp | 등록일 |
| updatedAt | timestamp | YES | serverTimestamp | 최종 수정일 |

**Queries:**
- `WHERE userId == ? ORDER BY createdAt DESC` (내 반려동물 목록)
- `doc(petId)` (상세 조회)

**Estimated rows:** ~2,000

---

## 3. profiles

홀로그램 디스플레이 프로필. 하나의 pet에 여러 profiles 가능.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string | auto | — | Firestore document ID |
| petId | string | YES | — | FK → pets |
| userId | string | YES | — | FK → users (접근 제어용) |
| name | string | YES | — | 프로필 이름 |
| type | enum | YES | — | `STANDING` \| `SITTING` |
| createdAt | timestamp | YES | serverTimestamp | 생성일 |
| updatedAt | timestamp | YES | serverTimestamp | 최종 수정일 |

**Queries:**
- `WHERE userId == ? ORDER BY createdAt DESC` (내 프로필 목록)
- `WHERE petId == ?` (pet별 프로필)
- `doc(profileId)` (상세 조회)

**Estimated rows:** ~5,000

---

## 4. baseVideos

홀로그램 기본 영상. Kling AI로 생성.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string | auto | — | Firestore document ID |
| profileId | string | YES | — | FK → profiles |
| isActive | boolean | YES | `false` | 현재 활성 영상 여부 (프로필당 1개만 true) |
| status | enum | YES | `PENDING` | `PENDING` \| `PROCESSING` \| `COMPLETED` \| `FAILED` |
| videoUrl | string | NO | null | 영상 URL |
| gifUrl | string | NO | null | GIF 미리보기 URL |
| klingJobId | string | NO | null | Kling API task ID |
| klingTaskStatus | string | NO | null | Kling 내부 상태 |
| duration | string | NO | null | 영상 길이 |
| error | string | NO | null | 실패 시 에러 메시지 |
| deletedAt | timestamp | NO | null | Soft delete 시점 (null = 활성) |
| createdAt | timestamp | YES | serverTimestamp | 생성일 |
| updatedAt | timestamp | YES | serverTimestamp | 최종 수정일 |

**Queries:**
- `WHERE profileId == ? AND deletedAt == null` (프로필의 활성 영상)
- `WHERE profileId == ? AND deletedAt == null ORDER BY createdAt ASC` (정렬된 목록)
- `WHERE klingJobId == ?` (Kling 상태 조회)
- `doc(videoId)` (단일 조회)

**Constraints:** 프로필당 최대 3개 (deletedAt == null 기준)

**Estimated rows:** ~10,000

---

## 5. motions

홀로그램 모션/애니메이션. LEFT/RIGHT 위치 할당 가능.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string | auto | — | Firestore document ID |
| profileId | string | YES | — | FK → profiles |
| name | string | YES | — | 모션 이름 |
| gifUrl | string | NO | null | GIF 미리보기 URL |
| videoUrl | string | NO | null | 영상 URL |
| position | enum | YES | `NONE` | `LEFT` \| `RIGHT` \| `NONE` |
| status | enum | YES | `PENDING` | `PENDING` \| `PROCESSING` \| `COMPLETED` \| `FAILED` |
| deletedAt | timestamp | NO | null | Soft delete 시점 |
| createdAt | timestamp | YES | serverTimestamp | 생성일 |
| updatedAt | timestamp | YES | serverTimestamp | 최종 수정일 |

**Queries:**
- `WHERE profileId == ? AND deletedAt == null` (프로필의 활성 모션)
- `WHERE profileId == ? AND deletedAt == null ORDER BY createdAt ASC` (정렬된 목록)
- `WHERE profileId == ? AND position == ? AND deletedAt == null` (위치별 모션)
- `doc(motionId)` (단일 조회)

**Constraints:**
- 프로필당 최대 12개 (deletedAt == null 기준)
- LEFT/RIGHT 각각 프로필당 1개만 할당 가능

**Estimated rows:** ~30,000

---

## 6. chatRooms

반려동물 AI 메신저 채팅방. pet 등록 시 자동 생성.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string | auto | — | Firestore document ID |
| userId | string | YES | — | FK → users |
| petId | string | YES | — | FK → pets |
| lastMessageAt | timestamp | YES | serverTimestamp | 마지막 메시지 시각 |
| createdAt | timestamp | YES | serverTimestamp | 생성일 |

**Queries:**
- `WHERE userId == ? ORDER BY lastMessageAt DESC` (내 채팅방 목록)
- `WHERE userId == ? AND petId == ?` (특정 채팅방 조회)

**Estimated rows:** ~2,000 (pets와 1:1)

---

## 7. chatMessages

채팅 메시지. PET_AI 메시지는 scheduledAt 기반 지연 노출.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string | auto | — | Firestore document ID |
| chatRoomId | string | YES | — | FK → chatRooms |
| senderType | enum | YES | — | `USER` \| `PET_AI` |
| content | string | YES | — | 메시지 내용 (이모지 조합) |
| isRead | boolean | YES | — | 읽음 여부 |
| scheduledAt | timestamp | NO | null | PET_AI 메시지 노출 예정 시각 (5~30분 딜레이) |
| createdAt | timestamp | YES | serverTimestamp | 전송 시각 |

**Queries:**
- `WHERE chatRoomId == ? ORDER BY createdAt DESC` (메시지 목록, 페이지네이션)

**Estimated rows:** ~50,000+

---

## 8. creditTransactions

크레딧 사용/충전 원장. 모든 크레딧 이동을 추적.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string | auto | — | Firestore document ID |
| userId | string | YES | — | FK → users |
| type | enum | YES | — | `SPEND` \| `EARN` \| `REFUND` \| `CAFE24_ACRYLIC_SET` |
| amount | number | YES | — | 변동량 (SPEND: 음수, EARN/REFUND: 양수) |
| description | string | YES | — | 변동 사유 |
| relatedEntityType | string | NO | null | 관련 엔티티 타입 (PROFILE, BASE_VIDEO, MOTION, PRODUCT_CODE) |
| relatedEntityId | string | NO | null | 관련 엔티티 ID |
| createdAt | timestamp | YES | serverTimestamp | 거래 시각 |

**Queries:**
- `WHERE userId == ? ORDER BY createdAt DESC` (내 크레딧 이력, 페이지네이션)
- `WHERE userId == ?` (count 집계)

**Estimated rows:** ~100,000+

---

## 9. trashItems

소프트 삭제된 항목. 30일 복구 윈도우.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string | auto | — | Firestore document ID |
| userId | string | YES | — | FK → users |
| itemType | enum | YES | — | `BASE_VIDEO` \| `MOTION` |
| itemId | string | YES | — | 원본 document ID |
| refundedCredits | number | YES | — | 삭제 시 환불된 크레딧 |
| deletedAt | timestamp | YES | — | 삭제 시점 |
| expiresAt | timestamp | YES | — | 영구 삭제 예정일 (deletedAt + 30d) |
| createdAt | timestamp | YES | serverTimestamp | 생성일 |

**Queries:**
- `WHERE userId == ? ORDER BY deletedAt DESC` (내 휴지통)

**Estimated rows:** ~5,000

---

## 10. productCodes

상품 교환 코드. Cafe24 주문 웹훅으로 자동 생성.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string | auto | — | Firestore document ID |
| code | string | YES | — | 교환 코드 (unique) |
| productType | enum | YES | — | `FULL_SET` \| `CREDIT_120` \| `CREDIT_40` |
| isUsed | boolean | YES | `false` | 사용 여부 |
| usedByUserId | string | NO | null | FK → users (사용한 사용자) |
| usedAt | timestamp | NO | null | 사용 시각 |
| createdAt | timestamp | YES | serverTimestamp | 생성일 |

**Queries:**
- `WHERE code == ?` (코드 조회, 트랜잭션 내)

**Estimated rows:** ~5,000

---

## 11. auditLogs

API 사용 감사 로그. 성공 응답(2xx) 시 자동 기록.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string | auto | — | Firestore document ID |
| userId | string | NO | null | FK → users (비인증 요청은 null) |
| action | string | YES | — | 액션명 (라우트에서 정의) |
| details | string | YES | — | JSON 문자열 (method, path, statusCode) |
| ipAddress | string | NO | null | 요청 IP |
| createdAt | timestamp | YES | serverTimestamp | 기록 시각 |

**Queries:**
- 주로 조회/분석용 (admin)

**Estimated rows:** ~500,000+ (빠르게 증가)

---

## 12. startFrameJobs

Gemini AI 스타트 프레임 이미지 생성 작업.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string | auto | — | Firestore document ID |
| profileId | string | YES | — | FK → profiles |
| userId | string | YES | — | FK → users |
| status | enum | YES | `PROCESSING` | `PROCESSING` \| `COMPLETED` \| `FAILED` |
| promptType | enum | YES | — | `BARE` (2장 ref) \| `OUTFIT` (3장 ref) |
| refCount | number | YES | — | 레퍼런스 이미지 수 (2 or 3) |
| images | string | NO | null | JSON 문자열 (생성된 이미지 배열) |
| selectedImageUrl | string | NO | null | 사용자가 선택한 이미지 URL |
| error | string | NO | null | 실패 시 에러 메시지 |
| expiresAt | timestamp | YES | — | 선택 만료 시각 (생성 후 30분) |
| createdAt | timestamp | YES | serverTimestamp | 생성일 |
| updatedAt | timestamp | YES | serverTimestamp | 최종 수정일 |

**Queries:**
- `doc(jobId)` (상태 조회)

**Estimated rows:** ~10,000

---

## 13. nanoBananaJobs (Legacy)

이전 버전 이미지 생성 작업. 호환성 유지용.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string | auto | — | Firestore document ID |
| status | string | YES | — | 작업 상태 |
| images | string | NO | null | JSON 문자열 |
| error | string | NO | null | 에러 메시지 |
| expiresAt | timestamp | NO | null | 만료 시각 |

**Note:** 더 이상 새 문서 생성되지 않음. 기존 데이터 조회용.

---

## Credit Cost Constants

| Action | Cost (C) | Description |
|--------|----------|-------------|
| INITIAL_SILVER | 120 | Silver 등급 초기 크레딧 |
| BASE_VIDEO_CREATE | 40 | 베이스 영상 생성 |
| MOTION_CREATE | 40 | 모션 생성 |
| NANOBANANA_RETRY | 10 | AI 재시도 |
| DELETE_REFUND | 20 | 삭제 시 환불 |
| RESTORE_COST | 20 | 휴지통 복구 비용 |

## Product Credit Mapping

| Product Type | Credits | Tier Change |
|-------------|---------|-------------|
| FULL_SET | 120 | → SILVER |
| CREDIT_120 | 120 | — |
| CREDIT_40 | 40 | — |
