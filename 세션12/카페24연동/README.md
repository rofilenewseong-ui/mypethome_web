# Cafe24 자사몰 연동 (PetHolo)

카페24 자사몰(coreflow5103)과 PetHolo 웹앱을 연동하는 전체 코드입니다.

---

## 기능 요약

| 기능 | 설명 |
|------|------|
| **Cafe24 OAuth 로그인** | 자사몰 회원이 PetHolo에 바로 로그인 |
| **Google 로그인** | Google 계정으로 간편 로그인 (이메일 매칭) |
| **아크릴세트 구매 검증** | 주문 내역 조회 → 풀세트 구매 시 120C 자동 지급 |
| **Webhook 자동 충전** | 카페24 주문 완료 → HMAC 검증 → 크레딧 자동 충전 |
| **상품코드 발급** | 주문별 고유 상품코드 생성 (중복 방지) |
| **PC 접속 차단** | 일반 유저는 모바일만, 관리자(ADMIN)는 PC도 허용 |

---

## 파일 구조

```
카페24연동/
├── README.md                         ← 이 파일
├── backend/
│   ├── services/
│   │   ├── cafe24.service.ts         ← Cafe24 OAuth + 주문조회 핵심
│   │   ├── auth.service.ts           ← 회원가입/로그인/Cafe24 인증 처리
│   │   └── webhook.service.ts        ← 주문 완료 Webhook 처리
│   ├── controllers/
│   │   ├── auth.controller.ts        ← 인증 API 엔드포인트
│   │   └── webhook.controller.ts     ← Webhook 수신 엔드포인트
│   ├── routes/
│   │   ├── auth.routes.ts            ← /auth/* 라우트 정의
│   │   └── webhook.routes.ts         ← /webhook/* 라우트 정의
│   └── schemas/
│       ├── auth.schema.ts            ← 인증 요청 검증 (Zod)
│       └── webhook.schema.ts         ← Webhook 요청 검증 (Zod)
├── frontend/
│   ├── middleware.ts                 ← PC 접속 차단 미들웨어
│   ├── mobile-only/page.tsx          ← "모바일에서 접속해주세요" 안내 페이지
│   └── cafe24/
│       ├── auth/page.tsx             ← 로그인 페이지 (Cafe24 + Google + Dev)
│       └── callback/page.tsx         ← OAuth 콜백 처리 페이지
└── docs/
    ├── cafe24_스킨_가이드.md          ← 자사몰 스킨에 배너 설치 방법
    └── 09_store_cafe24.html          ← UI 목업 (브라우저에서 열기)
```

---

## 실제 프로젝트 배치 위치

```
apps/api/src/services/cafe24.service.ts
apps/api/src/services/auth.service.ts
apps/api/src/services/webhook.service.ts
apps/api/src/controllers/auth.controller.ts
apps/api/src/controllers/webhook.controller.ts
apps/api/src/routes/auth.routes.ts
apps/api/src/routes/webhook.routes.ts
apps/api/src/schemas/auth.schema.ts
apps/api/src/schemas/webhook.schema.ts
apps/web/src/app/cafe24/auth/page.tsx
apps/web/src/app/cafe24/callback/page.tsx
apps/web/src/app/mobile-only/page.tsx
apps/web/src/middleware.ts
```

---

## 환경변수 설정

### 백엔드 (`apps/api/.env`)

```env
# Cafe24 OAuth (카페24 개발자센터에서 발급)
CAFE24_MALL_ID=coreflow5103
CAFE24_CLIENT_ID=여기에_클라이언트ID
CAFE24_CLIENT_SECRET=여기에_시크릿
CAFE24_REDIRECT_URI=https://배포URL/cafe24/callback

# Cafe24 Webhook 보안 (카페24 관리자에서 설정)
CAFE24_WEBHOOK_SECRET=여기에_웹훅시크릿

# Google OAuth (선택 — Google 로그인 사용 시)
GOOGLE_CLIENT_ID=여기에_구글클라이언트ID
```

### 프론트엔드 (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=여기에_구글클라이언트ID
```

---

## Cafe24 개발자센터 설정 방법

### 1단계: 앱 생성
1. [Cafe24 개발자센터](https://developers.cafe24.com) 로그인
2. **앱 관리** → **앱 생성**
3. 앱 이름: `PetHolo` 입력
4. Redirect URI: `https://배포URL/cafe24/callback` 입력

### 2단계: 권한 설정
필요 스코프:
- `mall.read_personal` — 회원 정보 조회
- `mall.read_order` — 주문 내역 조회

### 3단계: Client ID / Secret 복사
- 발급된 Client ID → `.env`의 `CAFE24_CLIENT_ID`에 입력
- 발급된 Client Secret → `.env`의 `CAFE24_CLIENT_SECRET`에 입력

### 4단계: Webhook 설정 (자동 충전용)
1. Cafe24 관리자 → **앱 설정** → **Webhook**
2. 이벤트: `주문 완료 (order.completed)`
3. URL: `https://배포URL/api/webhook/cafe24/order-complete`
4. Shared Secret 설정 → `.env`의 `CAFE24_WEBHOOK_SECRET`에 입력

---

## 인증 흐름도

```
[사용자]
   │
   ├── [Cafe24 로그인 버튼 클릭]
   │     │
   │     ├── GET /auth/cafe24/url → OAuth URL 생성
   │     ├── → 카페24 로그인 페이지로 리다이렉트
   │     ├── → 사용자가 로그인 + 동의
   │     ├── → /cafe24/callback?code=xxx&state=yyy
   │     ├── POST /auth/cafe24 { code } → 토큰 교환 → 고객정보 → 주문조회
   │     └── → JWT 발급 + 아크릴세트 구매 시 120C 지급
   │
   ├── [Google 로그인 버튼 클릭]
   │     │
   │     ├── Google implicit flow → access_token
   │     ├── POST /auth/google { idToken } → UserInfo API 검증
   │     └── → JWT 발급 (이메일로 Cafe24 회원 자동 매칭)
   │
   └── [개발 모드 로그인] (NODE_ENV=development만)
         │
         ├── POST /auth/dev-login → 테스트 계정 생성/재사용
         └── → 1000C 크레딧 지급
```

---

## Webhook 자동 충전 흐름

```
카페24 자사몰 구매 완료
    │
    ▼
POST /api/webhook/cafe24/order-complete
    │
    ├── 1. HMAC-SHA256 서명 검증 (X-Cafe24-Signature 헤더)
    ├── 2. 중복 주문 체크 (같은 orderId+productId면 스킵)
    ├── 3. 상품명으로 타입 판별:
    │     ├── "풀 세트" / "full" → FULL_SET (120C + Silver)
    │     ├── "120" 포함 → CREDIT_120
    │     └── "40" 포함 → CREDIT_40
    ├── 4. 상품코드 생성 + Firestore 저장
    └── 5. 응답: { code, productType }
```

---

## API 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/auth/cafe24/url` | Cafe24 OAuth 인증 URL 생성 |
| `POST` | `/auth/cafe24` | Cafe24 인증 코드로 로그인 |
| `POST` | `/auth/google` | Google 토큰으로 로그인 |
| `POST` | `/auth/dev-login` | 개발 모드 로그인 |
| `POST` | `/webhook/cafe24/order-complete` | 주문 완료 Webhook 수신 |

---

## 필수 npm 패키지

```bash
# 백엔드
npm install axios bcryptjs firebase-admin zod

# 프론트엔드
npm install @react-oauth/google
```

---

## 로컬 테스트 방법

```bash
# 1. 백엔드 실행
cd apps/api
cp .env.example .env   # 환경변수 채우기
npm run dev

# 2. 프론트엔드 실행
cd apps/web
cp .env.local.example .env.local   # 환경변수 채우기
npm run dev

# 3. 브라우저에서 확인
# http://localhost:3000/cafe24/auth → 로그인 페이지
# 개발 모드 로그인 버튼으로 테스트 가능 (1000C 지급)
```

---

## 자사몰 스킨 배너 설치

자세한 방법: [docs/cafe24_스킨_가이드.md](docs/cafe24_스킨_가이드.md)

카페24 자사몰 메인 페이지에 "마이펫홈 바로가기" 배너를 추가하여
사용자를 PetHolo `/entry` 페이지로 유도합니다.

---

## PC 접속 차단 (모바일 전용)

### 동작 방식

```
사용자 접속
    │
    ▼
Next.js middleware.ts (서버에서 실행)
    │
    ├── User-Agent → 모바일 → ✅ 통과
    │
    └── User-Agent → PC:
          ├── petholo_role 쿠키 = 'admin' → ✅ 통과 (관리자)
          └── 쿠키 없음 또는 'user' → ❌ /mobile-only 리다이렉트
```

### 관리자 PC 접속 허용 방법

1. Firestore에서 해당 유저의 `role` 필드를 `'ADMIN'`으로 변경
2. 해당 유저가 모바일에서 로그인 (쿠키 자동 설정)
3. 이후 PC에서도 접속 가능

### 파일 배치

```
apps/web/src/middleware.ts              ← 새 파일
apps/web/src/app/mobile-only/page.tsx   ← 새 파일
```

### 보안 참고

- PC 차단은 **UX 제어**이며 보안 경계가 아닙니다
- 실제 API 보안은 JWT 토큰으로 처리됩니다
- `petholo_role` 쿠키는 클라이언트에서 설정되므로 우회 가능하지만, 일반 사용자가 의도적으로 우회할 가능성은 낮습니다
