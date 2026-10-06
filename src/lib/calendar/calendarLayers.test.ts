import { describe, expect, it } from 'vitest'
import type { AiDraft } from '@/api/researchDrafts'
import type { Hypothesis } from '@/api/researchHypothesis'
import type { ResearchCandidate } from '@/api/research/candidates'
import type { JournalNote } from '@/api/research/journal'
import type { EventRadarRow } from '@/api/researchEngine'
import type { Execution } from '@/types/positions'
import type { DayData } from '@/utils/ledger/performanceDayCells'
import type { ExpiryGroup, ExpiryLeg } from '@/utils/expiryLegs'
import { HttpError } from '@/lib/http'
import { layerStateOf } from './calendarLayers'
import { pnlDays } from './pnlLayer'
import { fillItems } from './fillsLayer'
import { decisionItems, nyDayOf } from './decisionsLayer'
import { noteItems } from './notesLayer'
import { earningsItems, macroItems, opexItems, pastEarningsItems } from './eventsLayer'
import { cashDay, dividendItems } from './dividendsLayer'
import type { AccountTransaction } from '@/types/trading'
import { expiryItems } from './expiriesLayer'
import { corpActionItems } from './corpActionsLayer'
import { holidayDays } from './holidaysLayer'
import { draftExpiryItems } from './draftExpiryLayer'
import { horizonItems } from './horizonsLayer'

// Every name, id, date and figure below is invented.

describe('layerStateOf', () => {
  const q = (o: Partial<{ isPending: boolean; isError: boolean; error: unknown; data: unknown }>) => ({
    isPending: false,
    isError: false,
    error: null,
    data: {},
    ...o,
  })
  it('reads a 401 as signed out, not as failed or empty', () => {
    expect(layerStateOf([q({ isError: true, error: new HttpError(401, 'x'), data: undefined })])).toBe('signed-out')
  })
  it('reads any other failure with nothing in hand as failed, and waits on a pending read', () => {
    expect(layerStateOf([q({ isError: true, error: new Error('x'), data: undefined }), q({})])).toBe('failed')
    expect(layerStateOf([q({ isPending: true, data: undefined }), q({})])).toBe('loading')
    expect(layerStateOf([q({})])).toBe('ready')
  })
})

describe('P&L — Performance’s cells, R and U kept apart', () => {
  const cell = (realized: number, unrealized = 0): DayData => ({ realized, unrealized, fillCount: 0, notional: 0 })
  it('sums R across the tabs, carries options U beside it, and drops days with nothing', () => {
    const days = pnlDays({
      options: new Map([['2026-09-04', cell(100, -20)], ['2026-09-05', cell(0, 0)]]),
      stocks: new Map([['2026-09-04', cell(5)]]),
      fixed_income: new Map([['2026-09-03', cell(-2)]]),
      cash_like: new Map(),
    })
    expect(days.map((d) => d.d)).toEqual(['2026-09-03', '2026-09-04'])
    expect(days[1]).toMatchObject({ realized: 105, optionsUnrealized: -20 })
    expect(days[1].byTab.cash_like).toBeNull()
  })
})

describe('Fills — Fills’ rows on their trade date', () => {
  const ex = (o: Partial<Execution>): Execution =>
    ({
      account_executions_id: 1,
      exec_id: 'e',
      account_id: 'U0000001',
      contract_key: 'ZZZ  261120P00040000|OPT|20261120|40.0|P',
      symbol: 'ZZZ  261120P00040000',
      sec_type: 'OPT',
      side: 'SLD',
      quantity: -2,
      price: 1,
      time: 1_790_000_000,
      trade_date: '2026-09-22',
      source: 'flex_trades',
      ...o,
    }) as Execution
  it('files an option under its root, opens its Trade when one claims it, else Fills narrowed to the name', () => {
    const items = fillItems([ex({ exec_id: 'a', trade_id: 7 }), ex({ exec_id: 'b', trade_id: null, account_executions_id: 2 })])
    expect(items.map((i) => i.syms)).toEqual([['ZZZ'], ['ZZZ']])
    expect(items.map((i) => i.to).sort()).toEqual(['/trade/7', '/trade/fills?symbol=ZZZ'])
    expect(items[0].text).toContain('×2')
  })
  it('falls back to the execution time in New York when the source sent no trade date', () => {
    // 1_790_000_000 s = 2026-09-21 14:13 UTC — the 21st in New York.
    const [item] = fillItems([ex({ trade_date: null })])
    expect(item.d).toBe('2026-09-21')
  })
})

describe('Decisions — verdicts and hypotheses on the New York day they were written', () => {
  const draft = (o: Partial<AiDraft>): AiDraft =>
    ({ id: 'd', kind: 'candidate_batch', payload: { title: 'Pool +2' }, scope: 'global', status: 'approved', generated_by: 'loop', linked_action_id: null, created_at: '2026-09-10T15:00:00Z', expires_at: null, ...o }) as AiDraft
  it('keeps approved and dismissed, leaves pending out, and dates by New York', () => {
    const items = decisionItems(
      [draft({ id: 'a' }), draft({ id: 'b', status: 'dismissed', created_at: '2026-09-11T02:30:00Z' }), draft({ id: 'c', status: 'pending' })],
      [],
    )
    expect(items.map((i) => [i.key, i.d])).toEqual([
      ['decisions:draft:a', '2026-09-10'],
      // 02:30 UTC on the 11th is the evening of the 10th in New York.
      ['decisions:draft:b', '2026-09-10'],
    ])
    expect(items[0].to).toBe('/research/journal?view=day&day=2026-09-10')
  })
  it('counts a hypothesis opened as a decision', () => {
    const h = { id: 'h1', title: 'ZZZ holds', symbols: ['zzz'], created_at: '2026-09-12T14:00:00Z' } as Hypothesis
    expect(decisionItems([], [h])[0]).toMatchObject({ d: '2026-09-12', text: 'hypothesis opened · ZZZ holds', syms: ['ZZZ'] })
  })
  it('nyDayOf reads an instant in New York', () => {
    expect(nyDayOf('2026-09-11T03:59:00Z')).toBe('2026-09-10')
    expect(nyDayOf(null)).toBeNull()
  })
})

describe('Notes', () => {
  it('places a note on its New York day with its first line and its symbol refs', () => {
    const n = { id: 'n1', body_md: '# Trim before IV builds\nmore', refs: [{ type: 'sym', id: 'zzz' }, { type: 'trade', id: '9' }], created_at: '2026-09-03T13:00:00Z' } as JournalNote
    expect(noteItems([n])[0]).toMatchObject({ d: '2026-09-03', text: 'Trim before IV builds', syms: ['ZZZ'], to: '/research/journal?view=notes' })
  })
})

describe('Events — macro, earnings est., OPEX', () => {
  it('keeps the radar rows tied to no name, with the first word as the cell', () => {
    const rows = [
      { event_id: 'm', event_date: '2026-10-14', affected_symbols: '', event_summary: '2026-10-14 CPI release for September', subject: '' },
      { event_id: 'd', event_date: '2026-10-08', affected_symbols: 'ZZZ', event_summary: 'dividend', subject: '' },
    ] as EventRadarRow[]
    expect(macroItems(rows)).toEqual([expect.objectContaining({ d: '2026-10-14', cell: 'CPI', text: 'CPI release for September', ink: 'macro' })])
  })
  it('marks an estimate est., leaves a late print off, and files a held name under the book', () => {
    const next = (date: string, daysAway: number) => ({ kind: 'expected' as const, next: { date, daysAway, track: { n: 4, medianMissDays: 1, maxMissDays: 2 }, lastResult: null } })
    const items = earningsItems({ book: ['AAA', 'LATE'], watch: ['BBB'] }, { AAA: next('2026-10-21', 17), LATE: next('2026-09-30', -4), BBB: next('2026-11-02', 29) })
    expect(items.map((i) => [i.d, i.cell, i.est])).toEqual([
      ['2026-10-21', 'AAA earnings (est.)', true],
      ['2026-11-02', 'BBB earnings (est.)', true],
    ])
    expect(items[0].text).toContain('book')
    expect(items[1].text).toContain('watchlist')
    expect(items[0].to).toBe('/research/symbol?symbol=AAA')
  })
  it('puts each results 8-K on the day it was filed, in the past tense, a held name under the book', () => {
    const items = pastEarningsItems({ book: ['AAA'], watch: ['AAA', 'BBB', 'ETF'] }, { AAA: ['2026-05-20', '2026-08-26'], BBB: ['2026-07-30'], ETF: [] })
    expect(items.map((i) => [i.key, i.d, i.cell, i.past])).toEqual([
      ['events:reported:AAA:2026-05-20', '2026-05-20', 'AAA earnings', true],
      ['events:reported:AAA:2026-08-26', '2026-08-26', 'AAA earnings', true],
      ['events:reported:BBB:2026-07-30', '2026-07-30', 'BBB earnings', true],
    ])
    expect(items[0].text).toContain('book')
    expect(items[2].text).toContain('watchlist')
    expect(items[0].to).toBe('/research/symbol?symbol=AAA')
  })
  it('OPEX is every third Friday', () => {
    const opex = opexItems(2026, 1)
    expect(opex).toHaveLength(12)
    expect(opex[9]).toMatchObject({ d: '2026-10-16', cell: 'OPEX', ink: 'contract' })
  })
})

describe('Expiries — the desk’s legs, one item per name per expiry', () => {
  const leg = (symbol: string, strike: number, qty: number): ExpiryLeg =>
    ({ symbol, strike, qty, right: 'P', expiry: '20261120', contractKey: `${symbol}${strike}` }) as ExpiryLeg
  it('names a single leg, counts several, and opens the desk on that date', () => {
    const g = { expiry: '20261120', dte: 47, legs: [leg('ZZZ', 40, -2), leg('ZZZ', 38, -1), leg('YYY', 90, 1)] } as ExpiryGroup
    const items = expiryItems([g])
    expect(items.map((i) => [i.cell, i.text])).toEqual([
      ['ZZZ 2 legs', '−1 38P · −2 40P'],
      ['YYY 90P', '+1 90P'],
    ])
    expect(items[0]).toMatchObject({ d: '2026-11-20', to: '/trade/expiration?fri=2026-11-20', ink: 'contract' })
  })
})

describe('Corporate actions — the page’s events, by ex-date', () => {
  it('writes them as the page does and opens the page narrowed to the name', () => {
    const rows = [
      { symbol: 'zzz', action_type: 'cash_dividend', ex_date: '2026-10-09', record_date: null, payment_date: null, ratio_from: null, ratio_to: null, amount: 0.06 },
      { symbol: 'YYY', action_type: 'forward_split', ex_date: '2026-10-08', record_date: null, payment_date: null, ratio_from: 1, ratio_to: 2, amount: null },
      { symbol: 'XXX', action_type: 'cash_dividend', ex_date: null, record_date: null, payment_date: null, ratio_from: null, ratio_to: null, amount: 1 },
    ]
    const items = corpActionItems(rows, new Set(['ZZZ']), '2026-10-04')
    expect(items.map((i) => [i.d, i.cell])).toEqual([
      ['2026-10-08', 'YYY split'],
      ['2026-10-09', 'ZZZ ex-div'],
    ])
    expect(items[0].text).toBe('split 1 : 2 · watchlist')
    expect(items[1].text).toBe('dividend · $0.06 / sh · book')
    expect(items[1].to).toBe('/portfolio/corporate-actions?symbol=ZZZ')
  })
})

describe('Holidays', () => {
  it('reads closed days and early closes with the close in New York', () => {
    const days = holidayDays([
      { exchange: 'NYSE', holiday_date: '2026-11-27', label: 'Thanksgiving', status: 'early-close', close_time: '2026-11-27T18:00:00Z' },
      { exchange: 'NYSE', holiday_date: '2026-09-07', label: 'Labor Day', status: 'closed' },
    ])
    expect(days).toEqual([
      { d: '2026-09-07', kind: 'closed', label: 'Labor Day · market closed' },
      { d: '2026-11-27', kind: 'early-close', label: 'Thanksgiving · early close 13:00 ET' },
    ])
  })
})

describe('Draft expiry — the server’s expires_at and the Pool’s ttl_at, nothing estimated', () => {
  it('places a pending draft only when it carries an expiry, and an open candidate by its ttl', () => {
    const d = (o: Partial<AiDraft>) => ({ id: 'd1', kind: 'decision_draft', payload: { title: 'Call on ZZZ' }, scope: 'h1', status: 'pending', created_at: '2026-10-01T00:00:00Z', expires_at: null, ...o }) as AiDraft
    const c = { id: 'c1', symbol: 'zzz', status: 'open', ttl_at: '2026-10-06T20:00:00Z' } as ResearchCandidate
    const items = draftExpiryItems([d({}), d({ id: 'd2', expires_at: '2026-10-07T21:30:00Z' })], [c, { ...c, id: 'c2', status: 'promoted' }])
    expect(items.map((i) => [i.key, i.d])).toEqual([
      ['drafts:candidate:c1', '2026-10-06'],
      ['drafts:draft:d2', '2026-10-07'],
    ])
    expect(items[1].to).toBe('/research/loop/decisions?card=d2')
  })
})

describe('Hypothesis horizons — Research’s settles_on, never projected here', () => {
  const h = (o: Partial<Hypothesis>) => ({ id: 'h1', title: 'ZZZ pins 40', symbols: ['ZZZ'], ...o }) as Hypothesis
  it('is unprovided while no row carries the field', () => {
    expect(horizonItems([h({}), h({ id: 'h2' })])).toMatchObject({ items: [], provided: 0 })
  })
  it('places a dated row, opens the board on it, and tallies the undated by why', () => {
    const r = horizonItems([
      h({ settles_on: '2026-10-16', settles_basis: { from: 'candidate_trade_date', settled: false, reason: null, horizon_sessions: 20, trade_date: '2026-09-17' } }),
      h({ id: 'h2', settles_on: null, settles_basis: { reason: 'no_candidate_lineage' } }),
      h({ id: 'h3', settles_on: null, settles_basis: { reason: 'no_candidate_lineage' } }),
    ])
    expect(r.provided).toBe(3)
    expect(r.items).toEqual([
      expect.objectContaining({ d: '2026-10-16', cell: 'ZZZ settles', to: '/research/loop/hypotheses?h=h1' }),
    ])
    expect(r.items[0].text).toContain('20 sessions from 2026-09-17')
    expect(r.undated).toEqual([{ reason: 'no candidate behind it — settles by hand', n: 2 }])
  })
})

describe('Dividends — Transfer & Pay’s dividend rows, net of the same-day withholding', () => {
  const tx = (o: Partial<AccountTransaction>): AccountTransaction => ({ account_id: 'A1', ts: '0', amount: 0, type: 'other', ...o })
  // 2026-09-04 00:00 UTC, as the broker stamps a posting date.
  const SEP4 = String(Date.UTC(2026, 8, 4) / 1000)
  it('dates a cash row by its UTC posting date', () => {
    expect(cashDay(`${SEP4}.000000`)).toBe('2026-09-04')
    expect(cashDay('x')).toBeNull()
  })
  it('one item per name per day, payment in lieu folded in, tax netted, other rows left out', () => {
    const items = dividendItems([
      tx({ ts: SEP4, amount: 354.39, type: 'dividend', symbol: 'AAA', description: 'AAA CASH DIVIDEND USD 0.30 PER SHARE' }),
      tx({ ts: SEP4, amount: 0.31, type: 'dividend', symbol: 'AAA', description: 'AAA PAYMENT IN LIEU OF DIVIDEND' }),
      tx({ ts: SEP4, amount: -10.5, type: 'other', symbol: 'AAA', description: 'AAA CASH DIVIDEND USD 0.30 PER SHARE - US TAX' }),
      tx({ ts: SEP4, amount: 12, type: 'dividend', symbol: 'BBB', description: 'BBB CASH DIVIDEND' }),
      tx({ ts: SEP4, amount: -3, type: 'other', symbol: 'CCC', description: 'CCC CASH DIVIDEND - US TAX' }),
      tx({ ts: SEP4, amount: -10, type: 'other', symbol: null, description: 'SNAPSHOT FEE' }),
      tx({ ts: SEP4, amount: 500, type: 'deposit' }),
    ])
    expect(items.map((i) => [i.d, i.syms, i.layer])).toEqual([
      ['2026-09-04', ['AAA'], 'dividends'],
      ['2026-09-04', ['BBB'], 'dividends'],
    ])
    expect(items[0].text).toBe('AAA dividend $354.70 · -$10.50 tax · net $344.20')
    expect(items[1].text).toBe('BBB dividend $12.00')
    expect(items[0].to).toBe('/portfolio/transfer')
  })
})
