# ERD.md 변경사항

## 1. users 엔티티 — lastLoginAt 추가

`bool isVerified` 아래, `timestamp createdAt` 위에 추가:

```
        timestamp lastLoginAt
```

## 2. productCodes 엔티티 — Cafe24 추적 필드 추가

`timestamp usedAt` 아래, `timestamp createdAt` 위에 추가:

```
        string cafe24OrderId
        string cafe24ProductId
        string cafe24BuyerEmail
```
