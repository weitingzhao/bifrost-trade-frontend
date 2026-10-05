/**
 * The Calendar's own rules: which layers a preset is, the cell cap, the
 * today boundary (Owner #19), the symbol scope and the chip counts.
 * Every name, date and figure is invented.
 */
import { describe, expect, it } from 'vitest'
import type { CalendarItem, CalendarLayerId } from '@/lib/calendar/calendarLayers'
import type { CalendarPnlDay } from '@/lib/calendar/pnlLayer'
import {
  CALENDAR_PRESETS,
  capLines,
  cellLines,
  chipCountText,
  chipStateWords,
  dayGroups,
  hasRealized,
  hiddenOnDay,
  inTense,
  layerMonthCount,
  layerParamOf,
  matchesSymbol,
  monthDates,
  parseLayerParam,
  pnlOfDay,
  presetOfLayers,
  visibleItems,
} from './calendarModel'
import { textBesideSymbol } from './calendarUi'

const TODAY = '2031-03-12' // a Wednesday

function item(d: string, layer: CalendarLayerId, over: Partial<CalendarItem> = {}): CalendarItem {
  return { key: `${layer}:${d}:${over.text ?? ''}`, d, layer, cell: over.cell ?? '', text: 'x', syms: [], ink: 'soft', to: '/', ...over }
}

const pnlDay = (d: string, realized: number, u = 0): CalendarPnlDay =>
  ({ d, realized, optionsUnrealized: u, byTab: {} }) as unknown as CalendarPnlDay

describe('presets and Custom', () => {
  it('names a preset only when the set is exactly it', () => {
    expect(presetOfLayers(new Set(CALENDAR_PRESETS.trading))).toBe('trading')
    expect(presetOfLayers(new Set(CALENDAR_PRESETS.review))).toBe('review')
    expect(presetOfLayers(new Set([...CALENDAR_PRESETS.research, 'fills'] as CalendarLayerId[]))).toBe('custom')
    expect(presetOfLayers(new Set())).toBe('custom')
  })

  it('round-trips the layers through the URL in the prototype order, dropping unknowns', () => {
    const on = parseLayerParam('corp,bogus,pnl')!
    expect([...on].sort()).toEqual(['corp', 'pnl'])
    expect(layerParamOf(on)).toBe('pnl,corp')
    expect(parseLayerParam(null)).toBeNull()
    expect(parseLayerParam('')!.size).toBe(0)
  })
})

describe('the today boundary (Owner #19)', () => {
  it('shows past layers up to and including today, coming layers from today on', () => {
    expect(inTense(item('2031-03-11', 'fills'), TODAY)).toBe(true)
    expect(inTense(item(TODAY, 'fills'), TODAY)).toBe(true)
    expect(inTense(item('2031-03-13', 'fills'), TODAY)).toBe(false)
    expect(inTense(item('2031-03-11', 'events'), TODAY)).toBe(false)
    expect(inTense(item(TODAY, 'events'), TODAY)).toBe(true)
    expect(inTense(item('2031-03-13', 'expiry'), TODAY)).toBe(true)
  })

  it('puts today’s fills and today’s events in the same cell', () => {
    const all = [item(TODAY, 'fills'), item(TODAY, 'fills'), item(TODAY, 'events', { cell: 'CPI', ink: 'macro' })]
    const vis = visibleItems(all, { on: new Set(['fills', 'events']), sym: '', today: TODAY })
    expect(cellLines(vis).map((l) => l.text)).toEqual(['2 fills', 'CPI'])
  })

  it('prints P&L for today and before, never ahead, and not under a symbol', () => {
    const pnl = new Map([[TODAY, pnlDay(TODAY, 12)], ['2031-03-13', pnlDay('2031-03-13', 5)]])
    const v = { on: new Set<CalendarLayerId>(['pnl']), sym: '', today: TODAY }
    expect(pnlOfDay(pnl, TODAY, v)?.realized).toBe(12)
    expect(pnlOfDay(pnl, '2031-03-13', v)).toBeNull()
    expect(pnlOfDay(pnl, TODAY, { ...v, sym: 'ZZZ' })).toBeNull()
    expect(pnlOfDay(pnl, TODAY, { ...v, on: new Set() })).toBeNull()
  })
})

describe('the cell', () => {
  it('counts past layers and lists coming items by their short label', () => {
    const lines = cellLines([
      item('2031-03-10', 'notes'),
      item('2031-03-10', 'fills'),
      item('2031-03-10', 'decisions'),
      item('2031-03-10', 'decisions'),
      item('2031-03-10', 'expiry', { cell: 'ZZZ 2 legs', text: '−2 40P · +1 45C', ink: 'contract' }),
    ])
    expect(lines.map((l) => l.text)).toEqual(['1 fill', '2 decisions', '1 note', 'ZZZ 2 legs'])
    expect(lines[lines.length - 1]?.ink).toBe('contract')
  })

  it('caps the lines and says how many more', () => {
    const lines = cellLines(['A', 'B', 'C', 'D', 'E'].map((c) => item('2031-03-20', 'events', { cell: c, text: c })))
    expect(capLines(lines, 3)).toMatchObject({ more: 2 })
    expect(capLines(lines, 3).shown.map((l) => l.text)).toEqual(['A', 'B', 'C'])
    expect(capLines([...lines, ...lines], 9).shown).toHaveLength(6) // the prototype's range is 2–6
    expect(capLines(lines.slice(0, 2), 3).more).toBe(0)
  })
})

describe('layers on and off, and the symbol scope', () => {
  const all = [
    item('2031-03-10', 'fills', { syms: ['ZZZ'] }),
    item('2031-03-10', 'decisions'),
    item('2031-03-20', 'events', { cell: 'FOMC' }),
    item('2031-03-20', 'events', { cell: 'YYY earnings (est.)', syms: ['YYY'], est: true }),
    item('2031-03-20', 'corp', { syms: ['ZZZ'] }),
  ]

  it('draws only the layers that are on', () => {
    const v = { on: new Set<CalendarLayerId>(['events']), sym: '', today: TODAY }
    expect(visibleItems(all, v).map((i) => i.layer)).toEqual(['events', 'events'])
    expect(hiddenOnDay(all, '2031-03-20', v)).toBe(1)
    expect(dayGroups(visibleItems(all, { ...v, on: new Set(['events', 'corp']) })).map((g) => g.layer.id)).toEqual([
      'events',
      'corp',
    ])
  })

  it('keeps the name’s items and the macro events under a symbol', () => {
    const v = { on: new Set<CalendarLayerId>(['fills', 'decisions', 'events', 'corp']), sym: 'ZZZ', today: TODAY }
    expect(visibleItems(all, v).map((i) => `${i.layer}:${i.cell}`)).toEqual(['fills:', 'events:FOMC', 'corp:'])
    expect(matchesSymbol(item('2031-03-20', 'decisions'), 'ZZZ')).toBe(false)
  })

  it('counts a chip for the month as the grid would draw it, on or off', () => {
    const pnl = new Map([
      ['2031-03-10', pnlDay('2031-03-10', 40)],
      ['2031-03-11', pnlDay('2031-03-11', 0, -7)], // U alone: no realized figure
    ])
    const v = { sym: '', today: TODAY }
    expect(layerMonthCount('events', all, pnl, '2031-03', v)).toBe(2)
    expect(layerMonthCount('pnl', all, pnl, '2031-03', v)).toBe(1)
    expect(layerMonthCount('pnl', all, pnl, '2031-03', { ...v, sym: 'ZZZ' })).toBe(0)
    expect(layerMonthCount('corp', all, pnl, '2031-04', v)).toBe(0)
    expect(hasRealized(pnl.get('2031-03-11'))).toBe(false)
  })
})

describe('a chip that is not a count', () => {
  it('reads 401 as unread, not zero; a capped read as at least', () => {
    expect(chipCountText(0, { state: 'signed-out' })).toBe('—')
    expect(chipStateWords({ state: 'signed-out' })).toBe('not read — Research user not set')
    expect(chipCountText(0, { state: 'unprovided' })).toBe('—')
    expect(chipCountText(4, { state: 'ready', floor: true })).toBe('≥ 4')
    expect(chipCountText(4, { state: 'ready' })).toBe('4')
    expect(chipCountText(4, { state: 'loading' })).toBe('…')
  })
})

describe('helpers', () => {
  it('lists a month’s dates', () => {
    expect(monthDates('2031-02')).toHaveLength(28)
    expect(monthDates('2031-03')[30]).toBe('2031-03-31')
  })

  it('takes the name off a line that sits beside its symbol button', () => {
    expect(textBesideSymbol('BUY ZZZ 18DEC31 40C ×5', 'ZZZ')).toBe('BUY 18DEC31 40C ×5')
    expect(textBesideSymbol('ZZZ ex-div', 'ZZZ')).toBe('ex-div')
    expect(textBesideSymbol('dividend · book', 'ZZZ')).toBe('dividend · book')
  })
})
