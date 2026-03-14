import { db } from '../config/firebase';

/**
 * Firestore `in` 쿼리를 30개 단위로 청크하여 실행.
 * Firestore `in` 연산자는 한 번에 최대 30개 값만 허용.
 */
export async function batchInQuery(
  collection: string,
  field: string,
  values: string[],
  additionalFilters?: Array<{ field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }>
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  if (values.length === 0) return [];

  const unique = [...new Set(values)];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 30) {
    chunks.push(unique.slice(i, i + 30));
  }

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      let query: FirebaseFirestore.Query = db.collection(collection)
        .where(field, 'in', chunk);

      if (additionalFilters) {
        for (const f of additionalFilters) {
          query = query.where(f.field, f.op, f.value);
        }
      }

      const snap = await query.get();
      return snap.docs;
    })
  );

  return results.flat();
}

/**
 * 문서 배열을 키 함수 기준으로 Map<string, T[]>으로 그룹핑.
 */
export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const arr = map.get(key);
    if (arr) {
      arr.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}
