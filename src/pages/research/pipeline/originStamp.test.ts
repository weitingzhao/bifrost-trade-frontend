/**
 * The join between what the write side stamps and what the census reads.
 *
 * It lives here rather than beside `LANE_ORIGIN` because the shared layer may
 * not import from `pages/` (module placement, enforced by check:legacy-css),
 * and because the contract is the census's: a stamp is only worth writing if
 * a row counts it.
 */
import { describe, expect, it } from 'vitest'
import { LANE_ORIGIN } from '@/components/research/discoveryLanes'
import { originDest } from '../loop/hypothesisBoardModel'
import { CENSUS_ROUTES } from './pipelineModel'
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
    // Narrative is the one station the design has and this side has not
    // built, so its stamp is provenance without a link — which is right: a
    // hypothesis still came from that engine, and a card must not offer a
    // route that resolves to nothing.
    const built = new Set(ROUTES.map((r) => r.path))
    for (const [lane, path] of LANES) {
      if (built.has(path)) expect(originDest(path), lane).toMatchObject({ to: path })
      else expect(originDest(path), lane).toBeNull()
    }
    expect(LANES.filter(([, p]) => !built.has(p)).map(([l]) => l)).toEqual(['sentiment'])
  })
})
