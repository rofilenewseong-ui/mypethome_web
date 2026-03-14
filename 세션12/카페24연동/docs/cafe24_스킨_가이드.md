# Cafe24 자사몰 스킨 — 마이펫홈 바로가기 설치 가이드

## 사전 준비
- Cafe24 관리자 계정 (coreflow5103)
- PetHolo 배포 URL (Vercel 등)

---

## 설치 순서

### 1. Cafe24 관리자 로그인
- URL: https://coreflow5103.cafe24.com/disp/admin

### 2. 디자인 편집 이동
- 좌측 메뉴: **디자인** > **디자인 편집**
- 현재 스킨: **skin7** 선택

### 3. 메인 페이지 HTML에 아래 코드 추가

원하는 위치(보통 메인 배너 아래, 상품 목록 위)에 삽입:

```html
<!-- PetHolo 바로가기 배너 -->
<a href="https://PetHolo배포URL/entry" target="_blank"
   style="display:block; max-width:430px; margin:20px auto; padding:20px;
          background:linear-gradient(135deg,#6B8E5E,#4A6741);
          border-radius:16px; text-align:center; text-decoration:none;">
  <div style="font-size:32px; margin-bottom:8px;">🐾</div>
  <div style="color:#fff; font-size:16px; font-weight:bold;">마이펫홈 바로가기</div>
  <div style="color:rgba(255,255,255,0.7); font-size:12px; margin-top:4px;">
    반려동물 홀로그램 영상 만들기
  </div>
</a>
```

### 4. URL 교체
- `PetHolo배포URL` → 실제 배포 URL로 교체 (예: `mypethome.vercel.app`)

### 5. 동작 확인
- `/entry` 페이지가 자동 분기:
  - **미인증** → `/cafe24/auth` (Google/Cafe24 로그인)
  - **인증됨** → `/home` (바로 홈)

---

## 연동 구조

```
Cafe24 자사몰 (coreflow5103.cafe24.com)
  ├── 상품 구매 (아크릴세트 등)
  ├── Google 로그인 (동일 이메일)
  └── '마이펫홈 바로가기' 배너 → PetHolo /entry

PetHolo 웹앱
  ├── Google 로그인 → 이메일 매칭으로 Cafe24 회원과 자동 연동
  ├── Cafe24 OAuth 로그인 → 직접 연동
  └── 아크릴세트 구매자 → 120C 크레딧 자동 지급
```

---

## 주의사항
- 배너 HTML은 인라인 스타일만 사용 (Cafe24 스킨에서 외부 CSS 로딩 불필요)
- 모바일 430px에 맞게 max-width 설정됨
- target="_blank"으로 새 탭에서 PetHolo 열림
