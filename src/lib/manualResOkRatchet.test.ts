/**
 * TD-50: requests go through the shared client (`src/lib/http.ts`), which reads a failure
 * in the server's own words. This counts the hand-written `res.ok` checks left elsewhere
 * and fails if the count grows. Lower BASELINE as batches land; never raise it — a new
 * call site uses `requestJson` / `requestDelete` instead. Health probes that read the
 * status on purpose are among what is left and may stay.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'

const BASELINE = 87 // 127 before batch 1 (2026-10-03)

const SRC = resolve(__dirname, '..')
const MANUAL = /\b(res|r|resp|response)\.ok\b/g

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return files(p)
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !p.endsWith(join('lib', 'http.ts')) ? [p] : []
  })
}

it('hand-written res.ok checks only go down', () => {
  const count = files(SRC).reduce((n, p) => n + (readFileSync(p, 'utf8').match(MANUAL)?.length ?? 0), 0)
  expect(count).toBeLessThanOrEqual(BASELINE)
})
