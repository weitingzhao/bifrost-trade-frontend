/**
 * TD-50: requests go through the shared client (`src/lib/http.ts` — `requestJson`,
 * `requestDelete`, `readJsonResponse`), which reads a failure in the server's own words.
 * This counts the calls that still go around it — `fetch(` / `tradeFetch(` anywhere but
 * the client itself — and fails if the count grows. Lower BASELINE as batches land;
 * never raise it: a new call site uses the client. What may stay: the health probes
 * (they read the status on purpose) and streams.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'

const BASELINE = 95 // 147 before batch 1, 107 after it, 95 after batch 2 (2026-10-03)

const SRC = resolve(__dirname, '..')
const CLIENT = [join('lib', 'http.ts'), join('lib', 'tradeFetch.ts')]
const DIRECT = /(?<![\w.])(tradeFetch|fetch)\(/g

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return files(p)
    if (!/\.(ts|tsx)$/.test(name) || /\.test\.tsx?$/.test(name)) return []
    return CLIENT.some((c) => p.endsWith(c)) ? [] : [p]
  })
}

function directFetchCount(): number {
  return files(SRC).reduce((n, p) => n + (readFileSync(p, 'utf8').match(DIRECT)?.length ?? 0), 0)
}

it('calls around the shared HTTP client only go down', () => {
  expect(directFetchCount()).toBeLessThanOrEqual(BASELINE)
})
