import { describe, expect, it } from 'vitest'
import type { ReviewInstance } from '@/utils/reviewInstances'
import type { TradeOrigin } from '@/utils/tradeOrigin'
import { lensRows, sourceRows } from './originCut'

// Invented trades and plans.
const t = (tradeId: number, realised: number) => ({ tradeId, realised }) as ReviewInstance
const o = (sourceKind: TradeOrigin['sourceKind']) => ({ sourceKind }) as TradeOrigin

describe('Record · By source and By lens (Rev .112)', () => {
  it('rows every server source, then the trades no plan names', () => {
    const rows = sourceRows([t(1, 100), t(2, -40), t(3, 10)], new Map([[1, o('hypothesis')], [2, o('hypothesis')]]))
    expect(rows.map((r) => r.name)).toEqual(['Manual', 'Symbol', 'Hypothesis', 'Inbox draft', 'Roll', 'No plan'])
    const hyp = rows.find((r) => r.key === 'hypothesis')!
    expect([hyp.n, hyp.wins, hyp.realised, hyp.worst, hyp.hitRate, hyp.vsBacktest]).toEqual([2, 1, 60, -40, null, null])
    expect(rows.find((r) => r.key === 'none')?.n).toBe(1)
    expect(rows.find((r) => r.key === 'manual')).toMatchObject({ n: 0, avg: null, worst: null })
  })

  it('rates a source only from the floor up', () => {
    const many = Array.from({ length: 20 }, (_, i) => t(i + 1, i % 4 === 0 ? -1 : 1))
    const none = sourceRows(many, new Map()).find((r) => r.key === 'none')!
    expect(none.hitRate).toBe(0.75)
    expect(none.thin).toBe(false)
  })

  it('reads lens as one unrecorded row over every closed trade', () => {
    expect(lensRows([t(1, 5), t(2, 6)]).map((r) => [r.name, r.n])).toEqual([['no lens recorded', 2]])
  })
})
