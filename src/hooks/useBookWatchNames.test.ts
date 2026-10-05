import { describe, expect, it } from 'vitest'
import type { IbPositionRow } from '@/types/monitor'
import { bookWatchNames } from './useBookWatchNames'

const pos = (symbol: string, position: number, secType = 'STK') => ({ symbol, position, secType }) as IbPositionRow

describe('bookWatchNames', () => {
  it('holds every name with an open position, shares or legs, and watches only the rest', () => {
    const names = bookWatchNames(
      [{ positions: [pos('zzz', 100), pos('YYY', -1, 'OPT'), pos('XXX', 0)] }, { positions: [pos('ZZZ', 5)] }],
      [{ symbol: 'ZZZ' }, { symbol: 'www' }, { symbol: 'XXX' }, { symbol: '' }],
    )
    expect(names.book).toEqual(['YYY', 'ZZZ'])
    expect(names.watch).toEqual(['WWW', 'XXX'])
    expect(names.all).toEqual(['WWW', 'XXX', 'YYY', 'ZZZ'])
  })
})
