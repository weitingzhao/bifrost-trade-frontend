import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  APP_PLAN_STATES,
  COLOUR_CHANNELS,
  KIT_ORDER_STATES,
  KIT_PRIMITIVES,
  MIN_EVENTS,
  THIN_BELOW,
  UI_VERSION_NOW,
  confidenceReading,
  kitStanding,
  orderVocabularyGap,
} from './kitInventory'

/**
 * The page claims, of eight primitives, that this app already renders them
 * somewhere. A claim like that is worth what it costs to notice when it stops
 * being true — so every path is checked against the disk, not trusted.
 */
describe('what the app already answers', () => {
  it('every named source is a real file', () => {
    for (const p of KIT_PRIMITIVES) {
      if (!p.here) continue
      expect(existsSync(p.here.path), `${p.name} → ${p.here.path}`).toBe(true)
    }
  })

  it('names the export it points at, not just the file', () => {
    for (const p of KIT_PRIMITIVES) {
      if (!p.here) continue
      expect(p.here.what.trim().length, p.name).toBeGreaterThan(0)
    }
  })

  it('the standing adds up and splits by the spec\'s four directories', () => {
    const s = kitStanding()
    expect(s.total).toBe(KIT_PRIMITIVES.length)
    expect(s.here + s.owed).toBe(s.total)
    expect(s.byGroup.map(g => g.group)).toEqual(['finance', 'quant', 'trading', 'layout'])
    expect(s.byGroup.reduce((n, g) => n + g.total, 0)).toBe(s.total)
    // layout is one primitive and it has an answer here; quant is the emptiest.
    expect(s.byGroup.find(g => g.group === 'layout')?.total).toBe(1)
  })

  it('every primitive carries a signature and a kit path', () => {
    for (const p of KIT_PRIMITIVES) {
      expect(p.signature, p.name).toContain('(')
      expect(p.kitPath, p.name).toMatch(/^src\/(finance|quant|trading|layout)\//)
    }
  })
})

/**
 * The version is the reason the page is a join rather than a gallery. If
 * `@bifrost/ui` ships the kit, this fails and the page has to be re-walked —
 * which is the correct outcome, not an annoyance.
 */
describe('the standing that decides how this page is built', () => {
  it('matches the @bifrost/ui the app actually builds against', () => {
    const pkg = 'node_modules/@bifrost/ui/package.json'
    if (!existsSync(pkg)) return
    const installed = JSON.parse(readFileSync(pkg, 'utf8')).version as string
    expect(installed).toBe(UI_VERSION_NOW)
  })
})

describe('a rate without its sample size is not a reading', () => {
  it('withholds colour below the minimum, and says so', () => {
    const r = confidenceReading(MIN_EVENTS - 1)
    expect(r.level).toBe('noise')
    expect(r.colours).toBe(false)
    expect(r.variant).toBe('danger')
    expect(r.label).toContain('noise')
  })

  it('colours from the minimum up', () => {
    expect(confidenceReading(MIN_EVENTS).level).toBe('thin')
    expect(confidenceReading(MIN_EVENTS).colours).toBe(true)
  })

  it('crosses to usable exactly at the thin boundary', () => {
    expect(confidenceReading(THIN_BELOW - 1).level).toBe('thin')
    expect(confidenceReading(THIN_BELOW).level).toBe('usable')
    expect(confidenceReading(THIN_BELOW).variant).toBe('success')
  })

  it('carries the count and the unit into the label', () => {
    expect(confidenceReading(212).label).toBe('212 events · usable')
    expect(confidenceReading(7, 'trades').label).toBe('7 trades · thin')
  })

  it('takes its thresholds as arguments — the chain and Plans may disagree', () => {
    expect(confidenceReading(7, 'events', 10, 40).level).toBe('noise')
    expect(confidenceReading(35, 'events', 10, 40).level).toBe('thin')
  })
})

describe('the order vocabulary, both sides', () => {
  it('is the app plus four and minus one', () => {
    const gap = orderVocabularyGap()
    expect(gap.onlyKit).toEqual(['blocked', 'placed_by_hand', 'linked', 'orphan'])
    expect(gap.onlyApp).toEqual(['cancelled'])
  })

  it('reads the app states off the schema this app actually validates with', () => {
    const src = readFileSync('src/lib/schemas/strategyPlan.ts', 'utf8')
    for (const state of APP_PLAN_STATES) {
      expect(src, state).toContain(`'${state}'`)
    }
  })

  it('never gives a broker state a word — the boundary the spec draws', () => {
    const kit = KIT_ORDER_STATES.map(s => s.state as string)
    for (const broker of ['working', 'submitted', 'rejected']) {
      expect(kit).not.toContain(broker)
    }
  })
})

describe('the six colour channels', () => {
  it('are six, each saying what it is for and what it is never for', () => {
    expect(COLOUR_CHANNELS).toHaveLength(6)
    for (const c of COLOUR_CHANNELS) {
      expect(c.swatches.length, c.name).toBeGreaterThan(0)
      expect(c.on.length, c.name).toBeGreaterThan(0)
      expect(c.never.length, c.name).toBeGreaterThan(0)
    }
  })

  it('reads a live variable wherever one exists, and spells a literal only when it does not', () => {
    // The app's own tokens, plus the colour values it takes from @bifrost/ui.
    const css =
      readFileSync('src/index.css', 'utf8') +
      readFileSync('node_modules/@bifrost/ui/src/styles/semantic.css', 'utf8')
    for (const c of COLOUR_CHANNELS) {
      for (const s of c.swatches) {
        if (s.varName) expect(css, `${c.name} → ${s.varName}`).toContain(`${s.varName}:`)
        else expect(s.color, `${c.name} → ${s.token}`).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })
})
