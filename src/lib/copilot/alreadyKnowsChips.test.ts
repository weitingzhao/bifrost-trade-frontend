import { describe, expect, it } from 'vitest'
import { alreadyKnowsChips } from './alreadyKnowsChips'

describe('alreadyKnowsChips', () => {
  it('is empty when the view is missing or suppressed, not a guessed page', () => {
    expect(alreadyKnowsChips(null, false)).toEqual([])
    expect(
      alreadyKnowsChips(
        { originPage: '/portfolio/positions', originLabel: 'Positions', symbol: 'NVDA' },
        true,
      ),
    ).toEqual([])
  })

  it('lists page / symbol / date from the registered view', () => {
    expect(
      alreadyKnowsChips(
        {
          originPage: '/portfolio/positions',
          originLabel: 'Positions',
          symbol: 'NVDA',
          date: '2026-09-14',
        },
        false,
      ),
    ).toEqual([
      { k: 'page', v: 'Positions' },
      { k: 'symbol', v: 'NVDA' },
      { k: 'asof', v: '2026-09-14' },
    ])
  })
})
