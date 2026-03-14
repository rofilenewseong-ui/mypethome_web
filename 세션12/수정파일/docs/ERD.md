# PetHolo Database Schema — ERD

## Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ pets : "registers"
    users ||--o{ profiles : "owns"
    users ||--o{ chatRooms : "participates"
    users ||--o{ creditTransactions : "has"
    users ||--o{ trashItems : "deletes"
    users ||--o{ auditLogs : "generates"
    users ||--o{ startFrameJobs : "requests"
    users ||--o{ analyticsEvents : "tracks"
    users ||--o{ playbackSessions : "records"

    pets ||--o{ profiles : "has"
    pets ||--|| chatRooms : "has"

    profiles ||--o{ baseVideos : "contains"
    profiles ||--o{ motions : "contains"
    profiles ||--o{ startFrameJobs : "generates"
    profiles ||--o{ playbackSessions : "tracked in"

    chatRooms ||--o{ chatMessages : "contains"

    productCodes ||--o| users : "redeemed by"

    users {
        string id PK
        string email UK
        string passwordHash
        string name
        string googleId UK
        string cafe24MemberId UK
        string phone
        enum role "USER | ADMIN"
        enum tier "BRONZE | SILVER"
        int credits
        bool isVerified
        timestamp createdAt
        timestamp updatedAt
    }

    pets {
        string id PK
        string userId FK
        string name
        enum species "DOG | CAT | OTHER"
        string breed
        enum gender "MALE | FEMALE | UNKNOWN"
        string emoji
        string frontPhoto
        string sidePhoto
        timestamp birthday
        timestamp memorialDay
        string favoriteSnack
        string walkingPlace
        string memo
        timestamp createdAt
        timestamp updatedAt
    }

    profiles {
        string id PK
        string petId FK
        string userId FK
        string name
        string petName "denormalized"
        enum type "STANDING | SITTING"
        string selectedStartFrameUrl
        timestamp createdAt
        timestamp updatedAt
    }

    baseVideos {
        string id PK
        string profileId FK
        bool isActive
        enum status "PENDING | PROCESSING | COMPLETED | FAILED"
        string videoUrl
        string gifUrl
        string klingJobId
        string klingTaskStatus
        string duration
        string error
        timestamp deletedAt
        timestamp createdAt
        timestamp updatedAt
    }

    motions {
        string id PK
        string profileId FK
        string name
        string gifUrl
        string videoUrl
        enum position "LEFT | RIGHT | NONE"
        enum status "PENDING | PROCESSING | COMPLETED | FAILED"
        timestamp deletedAt
        timestamp createdAt
        timestamp updatedAt
    }

    chatRooms {
        string id PK
        string userId FK
        string petId FK
        string petName "denormalized"
        string petEmoji "denormalized"
        string petFrontPhoto "denormalized"
        timestamp lastMessageAt
        string lastMessageContent "denormalized"
        enum lastMessageSenderType "denormalized"
        timestamp createdAt
    }

    chatMessages {
        string id PK
        string chatRoomId FK
        enum senderType "USER | PET_AI"
        string content
        bool isRead
        timestamp scheduledAt
        timestamp createdAt
    }

    creditTransactions {
        string id PK
        string userId FK
        enum type "SPEND | EARN | REFUND | CAFE24_ACRYLIC_SET"
        int amount
        string description
        string relatedEntityType
        string relatedEntityId
        timestamp createdAt
    }

    trashItems {
        string id PK
        string userId FK
        enum itemType "BASE_VIDEO | MOTION"
        string itemId
        int refundedCredits
        timestamp deletedAt
        timestamp expiresAt
        timestamp createdAt
    }

    productCodes {
        string id PK
        string code UK
        enum productType "FULL_SET | CREDIT_120 | CREDIT_40"
        bool isUsed
        string usedByUserId FK
        timestamp usedAt
        string cafe24OrderId
        string cafe24ProductId
        string cafe24BuyerEmail
        timestamp createdAt
    }

    auditLogs {
        string id PK
        string userId FK
        string action
        string details
        string ipAddress
        timestamp createdAt
    }

    startFrameJobs {
        string id PK
        string profileId FK
        string userId FK
        enum status "PROCESSING | COMPLETED | FAILED"
        enum promptType "BARE | OUTFIT"
        int refCount
        string images
        string selectedImageUrl
        string error
        timestamp expiresAt
        timestamp createdAt
        timestamp updatedAt
    }

    nanoBananaJobs {
        string id PK
        string status
        string images
        string error
        timestamp expiresAt
    }

    analyticsEvents {
        string id PK
        string userId FK
        string sessionId
        string event
        map properties
        string page
        map deviceInfo
        timestamp createdAt
    }

    playbackSessions {
        string id PK
        string userId FK
        string profileId FK
        string petId FK
        timestamp startedAt
        timestamp endedAt
        int duration
        int motionTaps
        int motionLocks
        array motionDetails
        map deviceInfo
    }

    dailyStats {
        string id PK "YYYY-MM-DD"
        int totalUsers
        int newUsers
        int activeUsers
        int totalPageViews
        int totalPlaybackMinutes
        float avgPlaybackMinutes
        int totalMotionTaps
        int totalMessagesSent
        int totalMessagesReceived
        int totalCreditsSpent
        int totalCreditsEarned
        int newPets
        int newProfiles
        int newBaseVideos
        int newMotions
        array topPages
        timestamp updatedAt
    }
```

## Relationship Summary

| Parent | Child | Cardinality | Description |
|--------|-------|-------------|-------------|
| users | pets | 1:N | 사용자는 여러 반려동물 등록 |
| users | profiles | 1:N | 사용자가 프로필 소유 (userId로 접근 제어) |
| pets | profiles | 1:N | 한 반려동물에 여러 홀로그램 프로필 |
| pets | chatRooms | 1:1 | 반려동물 등록 시 자동 생성 |
| users | chatRooms | 1:N | 사용자별 채팅방 |
| profiles | baseVideos | 1:N (max 3) | 프로필당 최대 3개 베이스 영상 |
| profiles | motions | 1:N (max 12) | 프로필당 최대 12개 모션 |
| chatRooms | chatMessages | 1:N | 채팅방 내 메시지들 |
| users | creditTransactions | 1:N | 크레딧 사용/획득 이력 |
| users | trashItems | 1:N | 삭제된 항목 (30일 복구 가능) |
| users | auditLogs | 1:N | API 사용 감사 로그 |
| profiles | startFrameJobs | 1:N | AI 이미지 생성 작업 |
| productCodes | users | N:1 | 상품 코드 사용자 연결 |
| users | analyticsEvents | 1:N | 사용자 이벤트 트래킹 |
| users | playbackSessions | 1:N | 재생 세션 기록 |
| profiles | playbackSessions | 1:N | 프로필별 재생 세션 |

## Business Constraints

- `baseVideos`: 프로필당 최대 3개 (deletedAt == null 기준)
- `motions`: 프로필당 최대 12개 (deletedAt == null 기준)
- `motions.position`: LEFT/RIGHT 각각 프로필당 1개만 할당 가능
- `baseVideos.isActive`: 프로필당 1개만 true
- `trashItems.expiresAt`: 삭제 후 30일 뒤 영구 삭제
- `startFrameJobs.expiresAt`: 생성 후 30분 내 선택 필요
- `users.credits`: 음수 불가 (spend 시 트랜잭션으로 확인)
- `chatMessages`: PET_AI 메시지는 scheduledAt 이후에만 표시

## Denormalization Strategy

| Source | Target | Fields | Sync Trigger |
|--------|--------|--------|-------------|
| pets | chatRooms | petName, petEmoji, petFrontPhoto | pet 업데이트 시 |
| pets | profiles | petName | pet 업데이트 시 |
| chatMessages | chatRooms | lastMessageContent, lastMessageSenderType | 메시지 발송 시 |

## Composite Indexes

| Collection | Fields | Purpose |
|------------|--------|---------|
| chatRooms | userId ASC, lastMessageAt DESC | 채팅방 목록 정렬 |
| chatMessages | chatRoomId ASC, createdAt DESC | 메시지 서버사이드 페이지네이션 |
| creditTransactions | userId ASC, createdAt DESC | 크레딧 이력 서버사이드 페이지네이션 |
| trashItems | userId ASC, deletedAt DESC | 휴지통 목록 정렬 |
