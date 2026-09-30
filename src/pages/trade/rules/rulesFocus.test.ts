import { describe, expect, it } from 'vitest'
import type { ChainData } from '@/hooks/useRulesChain'
import type { InstanceReading } from '@/utils/strategyInstances'
import type { StrategyAllocation, StrategyOpportunity } from '@/types/strategy'
import {
  allSymbols,
  focusKey,
  focusLineage,
  focusOfKey,
  focusSearch,
  oppsForSym,
  parseFocus,
  stepTrail,
  symbolBoard,
  tally,
  touches,
} from './rulesFocus'

// Invented fixtures — never copied from a live book.
const opp = (id: number, symbols: string[], structure = 1): StrategyOpportunity =>
  ({ strategy_opportunity_id: id, name: `O${id}`, strategy_structure_id: structure, symbols }) as StrategyOpportunity

const reading = (
  id: number,
  oppId: number,
  sym: string,
  closed: boolean,
  realised: number | null = null,
): InstanceReading => ({
  id,
  label: `#${id}`,
  symbolish: sym,
  opportunityId: oppId,
  opportunityName: `O${oppId}`,
  structureId: 1,
  structureName: 'S1',
  openedOn: '2026-01-05',
  fills: 2,
  closed,
  realised,
})

const DATA: ChainData = {
  structures: [],
  opportunities: [opp(1, ['ZZTM', 'QQXX']), opp(2, ['QQXX'], 2), opp(3, ['WWVY'], 3)],
  allocations: [
    { strategy_allocation_id: 9, strategy_opportunity_ids: [1] } as unknown as StrategyAllocation,
  ],
  gates: [],
  instances: [
    reading(10, 1, 'ZZTM', true, 300),
    reading(11, 1, 'ZZTM', true, -100),
    reading(12, 1, 'ZZTM', false),
    reading(13, 2, 'QQXX', true, 50),
    // ran on a ticker its opportunity does not name
    reading(14, 3, 'PPLN +1', true, -20),
  ],
}

describe('focus in the URL', () => {
  it('round-trips pick and sym, and drops an empty or dash symbol', () => {
    const f = parseFocus(new URLSearchParams('pick=opportunity:1&sym=zztm'))
    expect(f).toEqual({ pick: { kind: 'opportunity', id: 1 }, sym: 'ZZTM' })
    // Written as the top bar's `symbol` (Rev .120); the old `sym` still reads.
    expect(focusSearch(f)).toBe('?pick=opportunity%3A1&symbol=ZZTM')
    expect(parseFocus(new URLSearchParams('symbol=zztm')).sym).toBe('ZZTM')
    expect(parseFocus(new URLSearchParams('sym=—')).sym).toBeNull()
    expect(focusSearch({ pick: null, sym: null })).toBe('')
  })

  it('a key maps back to its focus', () => {
    const f = { pick: { kind: 'allocation' as const, id: 9 }, sym: 'QQXX' }
    expect(focusOfKey(focusKey(f))).toEqual(f)
  })
})

describe('the path never loops', () => {
  it('appends what was left, and truncates when arriving on the path', () => {
    let t: string[] = []
    t = stepTrail(t, 'A', 'B') // A → B
    t = stepTrail(t, 'B', 'C') // → C
    expect(t).toEqual(['A', 'B'])
    t = stepTrail(t, 'C', 'A') // back onto the path at A
    expect(t).toEqual([])
    expect(stepTrail(['A'], 'B', 'B')).toEqual(['A'])
  })
})

describe('the symbol cuts across the chain', () => {
  it('finds rules by scope and by what ran', () => {
    expect(oppsForSym('QQXX', DATA).sort()).toEqual([1, 2])
    expect(oppsForSym('PPLN', DATA)).toEqual([3])
  })

  it('meets a pick with a symbol', () => {
    const lit = focusLineage({ pick: { kind: 'opportunity', id: 1 }, sym: 'ZZTM' }, DATA)!
    expect([...lit.opportunity]).toEqual([1])
    expect([...lit.instance].sort()).toEqual([10, 11, 12])
    expect(focusLineage({ pick: null, sym: null }, DATA)).toBeNull()
  })

  it('keeps a symbol only when the pick can act on it', () => {
    expect(touches({ kind: 'opportunity', id: 2 }, 'QQXX', DATA)).toBe(true)
    expect(touches({ kind: 'opportunity', id: 2 }, 'ZZTM', DATA)).toBe(false)
    expect(touches({ kind: 'instance', id: 10 }, 'ZZTM', DATA)).toBe(false)
  })

  it('lists every focusable ticker once', () => {
    expect(allSymbols(DATA)).toEqual(['PPLN', 'QQXX', 'WWVY', 'ZZTM'])
  })
})

describe('tallies and the scope board', () => {
  it('realised and won count closed instances only', () => {
    const t = tally(DATA.instances.filter((i) => i.opportunityId === 1))
    expect(t).toEqual({ n: 3, open: 1, closed: 2, realised: 200, won: 1 })
  })

  it('shows named symbols that never ran, and ran symbols off the scope', () => {
    const own = DATA.instances.filter((i) => i.opportunityId === 1)
    const tiles = symbolBoard(['ZZTM', 'QQXX'], own, 'pnl')
    expect(tiles.map((t) => [t.sym, t.tally.n, t.offScope])).toEqual([
      ['ZZTM', 3, false],
      ['QQXX', 0, false],
    ])
    const off = symbolBoard(['WWVY'], DATA.instances.filter((i) => i.opportunityId === 3), 'az')
    expect(off.map((t) => [t.sym, t.offScope])).toEqual([
      ['PPLN', true],
      ['WWVY', false],
    ])
  })
})
