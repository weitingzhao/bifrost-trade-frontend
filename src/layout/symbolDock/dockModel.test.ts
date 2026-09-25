import { describe, expect, it } from 'vitest'
import type { ListKey } from './dockState'
import {
  agoLabel,
  buildGroups,
  daysTo,
  defaultSel,
  expLabel,
  fmtChg,
  fmtChgStrip,
  fmtLast,
  fmtLastStrip,
  fmtShares,
  fmtSignedUsd,
  posLine,
  toggleSel,
  walkOrder,
  type DockListIn,
  type DockRowIn,
} from './dockModel'

function list(key: ListKey, rows: DockRowIn[], extra: Partial<DockListIn> = {}): DockListIn {
  return { key, title: key.toUpperCase(), tag: key, sub: '', head: 'H', rows, empty: rows.length ? null : 'none', loading: false, ...extra }
}

const EMPTY = (k: ListKey) => list(k, [])

function lists(over: Partial<Record<ListKey, DockListIn>>): Record<ListKey, DockListIn> {
  return {
    source: EMPTY('source'),
    watch: EMPTY('watch'),
    port: EMPTY('port'),
    obj: EMPTY('obj'),
    recent: EMPTY('recent'),
    alerts: EMPTY('alerts'),
    ...over,
  }
}

const L = lists({
  watch: list('watch', [
    { symbol: 'NVDA', third: '62' },
    { symbol: 'PLTR', third: '71' },
  ]),
  port: list('port', [
    {
      symbol: 'PLTR',
      third: '+3,120',
      held: true,
      contracts: [{ id: 'a|1', expiry: '20261017', label: '165 C · short ×2', mark: 3.1, chgPct: -6.2, third: '+212' }],
    },
    { symbol: 'AAPL', third: '+12,480', held: true },
  ]),
})

const CHG: Record<string, number> = { NVDA: 1.12, PLTR: 3.4, AAPL: 0.21 }
const chgOf = (s: string) => CHG[s] ?? null

describe('buildGroups', () => {
  it('By list keeps each list whole and repeats a name per list', () => {
    const g = buildGroups({ lists: L, shown: ['watch', 'port'], sort: 1, chgOf, todayEt: '2026-09-25' })
    expect(g.map((x) => x.key)).toEqual(['watch', 'port'])
    expect(g[0].rows.map((r) => r.sym)).toEqual(['NVDA', 'PLTR'])
    expect(g[1].rows.map((r) => r.sym)).toEqual(['PLTR', 'AAPL'])
    // Portfolio's contracts show without asking; the head is the list's own.
    expect(g[1].rows[0].optDefaultOpen).toBe(true)
    expect(g[0].head).toBe('H')
  })

  it('merged modes print one row per name, and In names the lists', () => {
    const g = buildGroups({ lists: L, shown: ['watch', 'port'], sort: 2, chgOf, todayEt: '2026-09-25' })
    expect(g).toHaveLength(1)
    expect(g[0].title).toBe('2 lists merged')
    expect(g[0].head).toBe('In')
    expect(g[0].rows.map((r) => [r.sym, r.third])).toEqual([
      ['AAPL', 'P'],
      ['NVDA', 'W'],
      ['PLTR', 'W P'],
    ])
    // Held carries over from the list that knows it.
    expect(g[0].rows.find((r) => r.sym === 'PLTR')?.held).toBe(true)
    // A name Portfolio holds folds its contracts under Portfolio's key.
    expect(g[0].rows.find((r) => r.sym === 'PLTR')?.optKey).toBe('port:PLTR')
  })

  it('Movers puts the unknown change last in both directions', () => {
    const withUnknown = lists({ ...L, recent: list('recent', [{ symbol: 'ZZZ', third: 'now' }]) })
    const up = buildGroups({ lists: withUnknown, shown: ['watch', 'port', 'recent'], sort: 4, chgOf, todayEt: '' })
    expect(up[0].rows.map((r) => r.sym)).toEqual(['PLTR', 'NVDA', 'AAPL', 'ZZZ'])
    const down = buildGroups({ lists: withUnknown, shown: ['watch', 'port', 'recent'], sort: 5, chgOf, todayEt: '' })
    expect(down[0].rows.map((r) => r.sym)).toEqual(['AAPL', 'NVDA', 'PLTR', 'ZZZ'])
  })

  it('Held first splits held from not held', () => {
    const g = buildGroups({ lists: L, shown: ['watch', 'port'], sort: 6, chgOf, todayEt: '' })
    expect(g.map((x) => [x.title, x.rows.map((r) => r.sym)])).toEqual([
      ['Held', ['AAPL', 'PLTR']],
      ['Not held', ['NVDA']],
    ])
  })

  it('By expiry lists contracts only, nearest first, with days to go', () => {
    const g = buildGroups({ lists: L, shown: ['watch', 'port'], sort: 7, chgOf, todayEt: '2026-09-25' })
    expect(g.map((x) => x.title)).toEqual(['17OCT · 22d'])
    expect(g[0].rows.map((r) => r.sym)).toEqual(['PLTR'])
    expect(g[0].rows[0].optDefaultOpen).toBe(true)
  })

  it('By expiry with no contracts says so rather than drawing nothing', () => {
    const g = buildGroups({ lists: L, shown: ['watch'], sort: 7, chgOf, todayEt: '2026-09-25' })
    expect(g).toHaveLength(1)
    expect(g[0].rows).toHaveLength(0)
    expect(g[0].empty).toMatch(/contract/)
  })

  it('an empty list keeps its group and its reason', () => {
    const g = buildGroups({ lists: L, shown: ['alerts'], sort: 1, chgOf, todayEt: '' })
    expect(g[0].rows).toHaveLength(0)
    expect(g[0].empty).toBe('none')
  })
})

describe('walk and position', () => {
  it('walks the display order with each name once', () => {
    const g = buildGroups({ lists: L, shown: ['watch', 'port'], sort: 1, chgOf, todayEt: '' })
    const walk = walkOrder(g)
    expect(walk).toEqual(['NVDA', 'PLTR', 'AAPL'])
    expect(posLine(walk, 'PLTR')).toBe('2 of 3 · PLTR')
    expect(posLine(walk, 'TSLA')).toBe('3 names')
  })
})

describe('tags', () => {
  it('defaults to Watch + Port, Source first when a page handed one over', () => {
    expect(defaultSel(false)).toEqual(['watch', 'port'])
    expect(defaultSel(true)).toEqual(['source', 'watch', 'port'])
  })

  it('toggles in tag order, ⌥ keeps only one, and never leaves nothing', () => {
    expect(toggleSel(['port'], 'watch', false)).toEqual(['watch', 'port'])
    expect(toggleSel(['watch', 'port'], 'watch', false)).toEqual(['port'])
    expect(toggleSel(['watch', 'port'], 'obj', true)).toEqual(['obj'])
    expect(toggleSel(['port'], 'port', false)).toBeNull()
  })
})

describe('formats', () => {
  it('prints the design’s figures', () => {
    expect(fmtLast(1210.4)).toBe('1,210.40')
    expect(fmtLast(41.2)).toBe('41.20')
    expect(fmtLastStrip(1210.4)).toBe('1,210')
    expect(fmtLastStrip(156.9)).toBe('156.9')
    expect(fmtLastStrip(41.2)).toBe('41.20')
    expect(fmtChg(-0.84)).toBe('−0.84%')
    expect(fmtChgStrip(3.4)).toBe('+3.4%')
    expect(fmtChgStrip(-12.4)).toBe('−12%')
    expect(fmtSignedUsd(3120.4)).toBe('+3,120')
    expect(fmtSignedUsd(-540)).toBe('−540')
    expect(fmtLast(null)).toBe('—')
    expect(fmtChg(-0.001)).toBe('0.00%')
    expect(fmtShares(2103.632)).toBe('2,103.63')
  })

  it('names expiries and counts days to them', () => {
    expect(expLabel('20261017')).toBe('17OCT')
    expect(daysTo('2026-09-25', '20261017')).toBe(22)
    expect(daysTo('bad', '20261017')).toBeNull()
  })

  it('says how long ago', () => {
    const now = 1_000_000_000_000
    expect(agoLabel(now - 20_000, now)).toBe('now')
    expect(agoLabel(now - 4 * 60_000, now)).toBe('4m')
    expect(agoLabel(now - 2 * 3_600_000, now)).toBe('2h')
    expect(agoLabel(now - 30 * 3_600_000, now)).toBe('y’day')
    expect(agoLabel(now - 3 * 86_400_000, now)).toBe('3d')
  })
})
