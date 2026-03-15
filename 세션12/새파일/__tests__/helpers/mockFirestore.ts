import { vi } from 'vitest';

interface MockDoc {
  id: string;
  data: Record<string, unknown>;
}

export function createMockFirestore(initialDocs: Record<string, MockDoc[]> = {}) {
  const collections: Record<string, MockDoc[]> = { ...initialDocs };

  const mockDocRef = (id: string, collectionName: string) => ({
    id,
    get: vi.fn(async () => {
      const docs = collections[collectionName] || [];
      const doc = docs.find((d) => d.id === id);
      return {
        exists: !!doc,
        id,
        data: () => doc?.data || null,
        ref: mockDocRef(id, collectionName),
      };
    }),
    set: vi.fn(async (data: Record<string, unknown>) => {
      if (!collections[collectionName]) collections[collectionName] = [];
      collections[collectionName].push({ id, data });
    }),
    update: vi.fn(async (data: Record<string, unknown>) => {
      const docs = collections[collectionName] || [];
      const doc = docs.find((d) => d.id === id);
      if (doc) Object.assign(doc.data, data);
    }),
  });

  const mockQuery = (collectionName: string, docs: MockDoc[]) => ({
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn(async () => ({
      empty: docs.length === 0,
      docs: docs.map((d) => ({
        id: d.id,
        data: () => d.data,
        ref: mockDocRef(d.id, collectionName),
      })),
    })),
  });

  let docCounter = 0;

  const mockCollection = (name: string) => {
    const docs = collections[name] || [];
    const query = mockQuery(name, docs);
    return {
      doc: vi.fn((id?: string) => {
        const docId = id || `auto-${++docCounter}`;
        return mockDocRef(docId, name);
      }),
      where: vi.fn((_field: string, _op: string, value: unknown) => {
        const filtered = docs.filter((d) => {
          return Object.values(d.data).includes(value);
        });
        return mockQuery(name, filtered);
      }),
      add: vi.fn(async (data: Record<string, unknown>) => {
        const id = `auto-${++docCounter}`;
        if (!collections[name]) collections[name] = [];
        collections[name].push({ id, data });
        return mockDocRef(id, name);
      }),
      limit: query.limit,
      get: query.get,
    };
  };

  return {
    db: {
      collection: vi.fn((name: string) => mockCollection(name)),
    },
    collections,
    reset: () => {
      Object.keys(collections).forEach((k) => delete collections[k]);
      docCounter = 0;
    },
  };
}

/** firebase-admin FieldValue mock */
export const mockFieldValue = {
  serverTimestamp: vi.fn(() => new Date()),
  increment: vi.fn((n: number) => n),
};
