/**
 * TD-232: "today" built as the UTC date (`new Date().toISOString().slice(0, 10)`
 * and its split / substring forms) reads tomorrow from 20:00 ET until midnight.
 * Today is `etTodayIso()` — New York's session day, `@/lib/freshness` — or,
 * for the ledger's own calendar, `chicagoTodayDateStr()`. The ESLint rule
 * (eslint.config.js, no-restricted-syntax) stops new sites; this scan also
 * catches the `new Date(Date.now())` spelling and holds the allowlist: a site
 * may stay only when it is UTC on purpose and says so in its name (`todayUtc`).
 * The allowlist may only shrink.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { etTodayIso } from '@/lib/freshness'
import { chicagoTodayDateStr } from '@/utils/ledger/optAsOfPnL'

const SRC = resolve(__dirname, '..')

/** file (relative to src) → sites allowed there. Lower as sites go; never raise. */
const ALLOWLIST: Record<string, number> = {
  // Compared with the Flex run's UTC stamp, both sides UTC; named todayUtc.
  'pages/trade/fills/FillsPage.tsx': 1,
}

/** The date part of a UTC "now": slice / substring / substr from 0, or split. A UTC clock (`slice(11, 16)`) is not a day. */
const UTC_TODAY =
  /new Date\(\s*(?:Date\.now\(\)\s*)?\)\s*\.\s*(?:toISOString|toJSON)\(\)\s*\.\s*(?:(?:slice|substring|substr)\(\s*0\s*,|split\()/g

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return files(p)
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : []
  })
}

describe('UTC "today" ratchet', () => {
  it('builds no UTC today outside the allowlist, and the allowlist only shrinks', () => {
    const found: Record<string, number> = {}
    for (const p of files(SRC)) {
      const n = readFileSync(p, 'utf8').match(UTC_TODAY)?.length ?? 0
      if (n > 0) found[relative(SRC, p).split('\\').join('/')] = n
    }
    const over = Object.entries(found).filter(([f, n]) => n > (ALLOWLIST[f] ?? 0))
    expect(over, 'use etTodayIso() / chicagoTodayDateStr() — see this file’s header').toEqual([])
    // A cleared allowlist entry is removed, so the count cannot creep back.
    const stale = Object.entries(ALLOWLIST).filter(([f, n]) => (found[f] ?? 0) < n)
    expect(stale, 'lower ALLOWLIST to what is left').toEqual([])
  })

  it('keeps each allowed site named as UTC', () => {
    for (const f of Object.keys(ALLOWLIST)) {
      const lines = readFileSync(join(SRC, f), 'utf8').split('\n')
      for (const line of lines.filter((l) => l.match(UTC_TODAY))) expect(line).toMatch(/todayUtc/)
    }
  })
})

describe('the session-day helpers between 20:00 ET and midnight', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    ['20:00 ET', '2026-10-06T00:00:00Z'],
    ['23:30 ET', '2026-10-06T03:30:00Z'],
  ])('etTodayIso stays on the New York day at %s', (_l, now) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(now))
    expect(etTodayIso()).toBe('2026-10-05')
    expect(chicagoTodayDateStr()).toBe('2026-10-05')
  })

  it('both roll at their own midnight, in winter too', () => {
    expect(etTodayIso(Date.parse('2026-12-01T04:59:00Z'))).toBe('2026-11-30') // 23:59 EST
    expect(etTodayIso(Date.parse('2026-12-01T05:00:00Z'))).toBe('2026-12-01')
    expect(chicagoTodayDateStr(Date.parse('2026-12-01T05:59:00Z'))).toBe('2026-11-30') // 23:59 CST
  })
})
