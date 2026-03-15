# firestore.indexes.json 변경사항

## productCodes 중복 방지 인덱스 추가

`indexes` 배열에 추가:

```json
{
  "collectionGroup": "productCodes",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "cafe24OrderId", "order": "ASCENDING" },
    { "fieldPath": "cafe24ProductId", "order": "ASCENDING" }
  ]
}
```
