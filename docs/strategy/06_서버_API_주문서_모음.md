# 서버 API = 주문서 모음
> 화면(손님)이 서버(주방)에 보내는 주문서 전체 목록

---

## 이해하기: API가 뭔가?

```
카페 비유:

손님(화면)이 카운터(API)에서 주문
  → "아메리카노 주세요" = 요청(Request)
  → 바리스타(서버)가 만들어서
  → "여기 있습니다" = 응답(Response)

GET  = "이거 보여주세요" (정보 가져오기)
POST = "이거 해주세요" (새로운 것 만들기/변경)
PUT  = "이거 바꿔주세요" (수정)
```

---

## 버전1 (MVP) 서버 주문서 - 포트 5050

### 인증
```
📌 Google 로그인
   POST /api/auth/google
   보내는 것: { credential: "Google이 준 토큰" }
   받는 것:   { token: "출입증", user: { 이름, 이메일, 크레딧 } }

📌 내 정보 확인
   GET /api/auth/me
   필요한 것: 출입증 (Authorization 헤더)
   받는 것:   { user: {...}, videos: [...], jobs: [...] }
```

### 구매 인증
```
📌 주문번호 인증
   POST /api/orders/verify
   보내는 것: { orderId: "ORDER-1001" }
   일어나는 일: 크레딧 120 충전
   받는 것:     { message: "인증 완료", user: {...} }

   ⚠️ 등록된 번호만 가능! (.env에 목록 있음)
   ⚠️ 한 번 쓴 번호는 다른 사람 못 씀
```

### 영상
```
📌 영상 만들기
   POST /api/videos/generate
   보내는 것: 사진 파일들 + 동물종류 + 분위기설명
   비용:     크레딧 20
   일어나는 일:
     1. 사진 서버에 저장
     2. AI에 영상 생성 요청 (또는 사진 그대로 사용)
     3. 크레딧 차감
   받는 것: { video: {...}, jobs: [...] }
```

### 채팅
```
📌 채팅 답장
   POST /api/chat/reply
   보내는 것: { text: "보고싶어" }
   받는 것:   { reply: "🐶💛✨" }  (랜덤 이모지)
```

---

## 버전3 (petmorial) 서버 주문서 - 포트 3001

### 인증 관련
```
📌 로그인
   POST /api/auth/google
   보내는 것: { email: "user@gmail.com" }
   받는 것:   { token: "출입증(30일)", user: { id, 이메일, 크레딧 } }

📌 내 정보
   GET /api/auth/me
   받는 것: { id, email, credits_balance, nickname }
```

### 구매코드 관련
```
📌 코드 인증 (크레딧 충전)
   POST /api/codes/redeem
   보내는 것: { code: "ABCD-1234" }
   확인 사항:
     - 이 코드가 존재하는지?
     - 이미 사용된 건 아닌지?
     - 구매자 이메일과 내 이메일이 같은지?
   일어나는 일: 크레딧 120 충전!
   받는 것: { success: true, credits_balance: 120 }

📌 내 코드 확인
   GET /api/codes/check
   받는 것: { available: true/false, codes: [...] }
```

### 펫 관련
```
📌 내 펫 목록
   GET /api/pets
   받는 것: [{ id, name, avatar_image_url, ... }]

📌 펫 등록
   POST /api/pets
   보내는 것: 이름 + 생일 + 기일 + 좋아한것(JSON) + 사진
   일어나는 일:
     - 펫 정보 저장
     - 사진 서버에 저장
     - 채팅방 자동 생성!

📌 펫 상세
   GET /api/pets/펫ID
   받는 것: { 펫 정보 전체 }

📌 펫 수정
   PATCH /api/pets/펫ID
   보내는 것: 바꾸고 싶은 정보만
```

### 영상 관련
```
📌 영상용 사진 업로드
   POST /api/pets/펫ID/photos
   보내는 것: 사진 최대 4장
   일어나는 일: 서버에 사진 저장

📌 영상 생성 요청
   POST /api/pets/펫ID/video-jobs
   비용: 30 크레딧 x 요청개수 (기본 3개 = 90 크레딧)
   일어나는 일:
     1. 크레딧 차감
     2. 작업 생성 (대기중)
     3. 영상 3개 빈 껍데기 생성
     4. 3~8초 후 Mock 영상 완성

📌 작업 상태 확인
   GET /api/video-jobs/작업ID
   받는 것: { 상태, videos: [...] }

📌 펫의 영상 목록
   GET /api/pets/펫ID/videos
   받는 것: [{ url, 길이, ... }]
```

### 재생 설정
```
📌 재생 설정 조회
   GET /api/pets/펫ID/playback
   받는 것: {
     base_video: 기본 영상,
     left_video: 좌측 터치 영상,
     right_video: 우측 터치 영상
   }

📌 재생 설정 변경
   PUT /api/pets/펫ID/playback
   보내는 것: { 기본영상ID, 좌측영상ID, 우측영상ID }
```

### 채팅 관련
```
📌 채팅방 목록
   GET /api/chat/threads
   받는 것: [{ 펫이름, 펫사진, 마지막메시지, 안읽은수 }]

📌 메시지 목록
   GET /api/chat/threads/펫ID/messages
   받는 것: { messages: [...], is_typing: true/false }
   ↑ is_typing = 펫이 답장 준비 중이면 true!

📌 메시지 보내기
   POST /api/chat/threads/펫ID/messages
   보내는 것: { text: "보고싶어" }
   일어나는 일:
     1. 내 메시지 저장
     2. 5~30초 후 펫 이모지 답장 예약!
   받는 것: { 보낸 메시지 정보 }

📌 읽음 처리
   POST /api/chat/threads/펫ID/read
   일어나는 일: 안읽은 수 → 0

📌 안읽은 메시지 수
   GET /api/chat/unread-count
   받는 것: { count: 3 }
```

### 관리자 전용
```
📌 구매코드 엑셀 업로드
   POST /api/admin/purchases/import
   보내는 것: 엑셀 파일 (buyer_email, code 컬럼)
   일어나는 일: 엑셀의 코드들이 DB에 등록됨
   ⚠️ 현재 관리자 인증 없음 (나중에 추가 필요!)

📌 등록된 코드 목록
   GET /api/admin/codes
   받는 것: 최근 200개 코드

📌 코드 검색
   GET /api/admin/codes/search?q=검색어
```

**메모:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
