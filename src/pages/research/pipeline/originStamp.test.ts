/**
 * The join between what the write side stamps and what the census reads.
 *
 * It lives here rather than beside `LANE_ORIGIN` because the shared layer may
 * not import from `pages/` (module placement, enforced by check:legacy-css),
 * and because the contract is the census's: a stamp is only worth writing if
 * a row counts it.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LANE_ORIGIN } from '@/components/research/discoveryLanes'
import { originDest } from '../loop/hypothesisBoardModel'
import { CENSUS_ROUTES, NOT_A_STATION, censusRowFor } from './pipelineModel'
import { ROUTES } from '@/layout/routeTable'

const LANES = Object.entries(LANE_ORIGIN)

describe('LANE_ORIGIN', () => {
  it('stamps a row the Pipeline census counts', () => {
    // The stamp and the census used to live in different files with nothing
    // to fail when they drifted, and that is how `Moved on` came to read zero
    // on every row: the buttons wrote a container page, the census keyed by
    // station, and no gate compared them.
    for (const [lane, path] of LANES) {
      expect(CENSUS_ROUTES, lane).toContain(path)
    }
  })

  it('never stamps the page the list is rendered on', () => {
    // `/research` is Research Home, which carries this list. A lane pointing
    // back at it is the original defect returning.
    for (const [lane, path] of LANES) {
      expect(path, lane).not.toBe('/research')
      expect(path.startsWith('/'), lane).toBe(true)
    }
  })

  it('links a card back to its birthplace wherever that page is built', () => {
    // Every lane's page is built. The sentiment lane was the exception until
    // 2026-09-23, stamped Narrative on a mislabel; it is order flow, and it
    // lands on Symbol's flow face. `originDest` still answers null for a page
    // that is not built, so a card never offers a route to nothing.
    const built = new Set(ROUTES.map((r) => r.path))
    for (const [lane, path] of LANES) {
      if (built.has(path)) expect(originDest(path), lane).toMatchObject({ to: path })
      else expect(originDest(path), lane).toBeNull()
    }
    expect(LANES.filter(([, p]) => !built.has(p)).map(([l]) => l)).toEqual([])
    expect(originDest('/research/narrative')).toBeNull()
  })
})

/** Every `originPage="…"` literal on a Save button, with the file it is in. */
function savedStamps(): { token: string; file: string }[] {
  const out: { token: string; file: string }[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(path)
        continue
      }
      if (!entry.name.endsWith('.tsx') || entry.name.includes('.test.')) continue
      const src = readFileSync(path, 'utf8')
      for (const m of src.matchAll(/originPage="([^"]+)"/g)) {
        const head = src.lastIndexOf('<', m.index)
        const tag = /^<([A-Za-z0-9_]+)/.exec(src.slice(head))
        if (tag?.[1] === 'SaveAsHypothesisButton') out.push({ token: m[1], file: path })
      }
    }
  }
  walk('src')
  return out
}

describe('the stamps the app writes', () => {
  it('finds the Save buttons at all, so a silent zero is not a pass', () => {
    // Without this the sweep below passes on an empty list — which is exactly
    // the shape of the bug it exists to catch.
    expect(savedStamps().length).toBeGreaterThan(10)
  })

  it('leaves no stamp the census cannot place or excuse', () => {
    // The defect this gate replaces: 19 write sites stamped a vocabulary the
    // reading side never learned, so `Moved on` counted nothing and looked
    // like a finding about the pipeline rather than about the join. A new
    // token is fine — it just has to say here whether it is a station.
    for (const { token, file } of savedStamps()) {
      const placed = censusRowFor(token) != null || token in NOT_A_STATION
      expect(placed, `${token} (${file}) — add it to STAMP_ROW or NOT_A_STATION`).toBe(true)
    }
  })

  it('places the stamps already on file, and excuses the rest by name', () => {
    // Measured on DEV 2026-09-21: these four are every stamp the store holds.
    // None is a station, and each says why rather than reading as a gap.
    for (const token of ['candidate_batch_approve', 'copilot-loop', 'research-home', 'candidate-pool']) {
      expect(censusRowFor(token), token).toBeNull()
      expect(NOT_A_STATION[token], token).toBeTruthy()
    }
  })

  it('reads a token, an address, and refuses anything it cannot place', () => {
    expect(censusRowFor('analyze-scan')).toBe('/research/scan')
    expect(censusRowFor('sepa-daily-core')).toBe('/research/ratings/stocks')
    // The Symbol page absorbed six pages; its tabs' tokens are Symbol's.
    expect(censusRowFor('order-sentiment')).toBe('/research/symbol')
    expect(censusRowFor('/research/backtest')).toBe('/research/backtest')
    // An address that is not on this bench is not a row — the Hypothesis
    // Board may still link it, but the census may not count it.
    expect(censusRowFor('/research/daily-brief')).toBeNull()
    expect(censusRowFor('no-such-token')).toBeNull()
    expect(censusRowFor(null)).toBeNull()
  })

  it('never places two stations on the one token', () => {
    // `sepa` was the Stock screener's stamp by mistake and SEPA's by name.
    // The token keeps the meaning the rows on file were written under; the
    // page that writes new ones says `stock-screener`.
    expect(censusRowFor('sepa')).toBe('/research/ratings/stocks')
    expect(censusRowFor('stock-screener')).toBe('/research/screener')
    expect(savedStamps().some((s) => s.token === 'sepa')).toBe(false)
  })
})
