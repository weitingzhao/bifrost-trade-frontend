import { describe, expect, it } from 'vitest'
import type { ReviewInstance } from '@/utils/reviewInstances'
import type { MarkPath } from '@/utils/reviewMarkPath'
import { landed, median, normalised, peerPool, peerReading } from './peersModel'

const inst = (key: string, over: Partial<ReviewInstance>): ReviewInstance =>
  ({ contractKey: key, underlying: 'ZZZ', play: 'Wheel', open: false, openedOn: '2026-01-01', entryPremium: 100, dteAtEntry: 10, ...over }) as ReviewInstance

describe('Compared with (Rev .104)', () => {
  const self = inst('s', { openedOn: '2026-03-01', open: true })
  const all = [
    self,
    inst('a', { openedOn: '2026-02-01' }),
    inst('b', { openedOn: '2026-01-01', play: 'Other' }),
    inst('c', { openedOn: '2026-04-01' }),
    inst('d', { openedOn: '2026-02-15', open: true }),
    inst('e', { openedOn: '2026-01-15', underlying: 'YYY' }),
  ]

  it('picks closed peers by symbol, rule or structure, earlier only unless asked, newest first', () => {
    expect(peerPool(all, self, 'sym', 'before', () => null).map((x) => x.contractKey)).toEqual(['a', 'b'])
    expect(peerPool(all, self, 'sym', 'all', () => null).map((x) => x.contractKey)).toEqual(['c', 'a', 'b'])
    expect(peerPool(all, self, 'rule', 'before', () => null).map((x) => x.contractKey)).toEqual(['a', 'e'])
    expect(peerPool(all, self, 'struct', 'before', () => null)).toEqual([])
  })

  it('normalises to the life to expiry and the premium, and reads landed only for a winner', () => {
    const path = { held: [{ date: '2026-01-01', pl: 0 }, { date: '2026-01-06', pl: 50 }], best: 80 } as MarkPath
    expect(normalised(all[2], path)).toEqual([{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }])
    expect(landed(40, path)).toBe(0.5)
    expect(landed(-10, path)).toBeNull()
    expect(median([3, null, 1, 2])).toBe(2)
  })

  it('reads rank and landed, and flags an open one as provisional', () => {
    const s = peerReading({
      selfLabel: '#9',
      selfOpen: true,
      selfPerDay: 10,
      selfLanded: null,
      peerPerDays: [5, 20],
      peerLandeds: [0.5, 0.7],
      fmtMoney: (v) => `$${v}`,
    })
    expect(s).toBe('#9 makes $10 a day against a peer median of $12.5 — number 2 of 3. Provisional: this one is still open, the peers are settled.')
  })
})
