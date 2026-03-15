# 데이터베이스 스키마 변경사항 (pending)

> 이 폴더는 다른 클로드 세션이 database/ 파일을 작업 중이어서,
> 충돌 방지를 위해 별도 폴더에 변경사항을 정리한 것입니다.
> 작업 완료 후 원본 파일에 머지해주세요.

## 변경 요약

### 1. users 컬렉션 — `lastLoginAt` 필드 추가
- **목적:** 사용자의 마지막 로그인 시각 추적
- **적용 위치:** auth.service.ts의 login, googleAuth, cafe24Auth 메서드에서 업데이트
- **관련 파일:** `schema.types.ts`, `SCHEMA.md`, `ERD.md`

### 2. productCodes 컬렉션 — Cafe24 추적 필드 3개 추가
- **목적:** 웹훅 중복 방지 + 주문 추적
- **필드:** `cafe24OrderId`, `cafe24ProductId`, `cafe24BuyerEmail`
- **적용 위치:** webhook.service.ts에서 코드 생성 시 저장 + 중복 체크
- **관련 파일:** `schema.types.ts`, `SCHEMA.md`, `ERD.md`

### 3. CLAUDE.md — 컬렉션 수 수정
- **현재:** "14개 컬렉션"
- **수정:** "13개 컬렉션" (nanoBananaJobs 레거시 포함 시 13개가 맞음)

---

## 적용 방법

각 파일의 구체적인 변경 내용은 아래 파일들을 참고:
- `schema.types.patch.ts` — TypeScript 타입 변경
- `SCHEMA.patch.md` — SCHEMA.md 변경
- `ERD.patch.md` — ERD.md 변경
