/**
 * A real `Storage`, because the ambient one is not.
 *
 * Node 25 defines a `localStorage` global that is inert without
 * `--localstorage-file` — an object with no methods — and it **shadows
 * jsdom's**. Code under test reaches for the global and gets that, so anything
 * storage-backed silently does nothing in a test run and the assertions end up
 * being about the environment rather than about the code.
 *
 * Two test files had grown their own copy of this by 2026-09-22 and a third
 * was about to; it lives here now, where the next one can find it.
 */
export function memoryStorage(): Storage {
  let map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => {
      map = new Map()
    },
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
  }
}
