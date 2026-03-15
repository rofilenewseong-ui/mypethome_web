# SCHEMA.md 변경사항

## 1. users 컬렉션 — lastLoginAt 추가

`isVerified` 행 아래, `createdAt` 행 위에 추가:

```
| lastLoginAt | timestamp | NO | null | 마지막 로그인 시각 |
```

## 2. productCodes 컬렉션 — Cafe24 추적 필드 추가

`usedAt` 행 아래, `createdAt` 행 위에 추가:

```
| cafe24OrderId | string | NO | null | 카페24 주문 ID (웹훅 중복 방지용) |
| cafe24ProductId | string | NO | null | 카페24 상품 ID |
| cafe24BuyerEmail | string | NO | null | 구매자 이메일 |
```

productCodes Queries 섹션에 추가:

```
- `WHERE cafe24OrderId == ? AND cafe24ProductId == ?` (웹훅 중복 방지)
```
