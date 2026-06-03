import { describe, expect, it } from 'vitest'
import {
  optionsFocusDatasetToUnified,
  unifiedFocusToOptions,
  watchlistUnifiedShowsOptionsMatrix,
  watchlistUnifiedShowsStocksMatrix,
} from '@/utils/dataOverview/watchlistUnifiedFocus'

describe('watchlistUnifiedFocus', () => {
  it('shows options matrix for option_snapshots chip', () => {
    expect(watchlistUnifiedShowsOptionsMatrix('option_snapshots')).toBe(true)
    expect(watchlistUnifiedShowsStocksMatrix('option_snapshots')).toBe(false)
  })

  it('shows stocks matrix for stock_day chip', () => {
    expect(watchlistUnifiedShowsStocksMatrix('stock_day')).toBe(true)
    expect(watchlistUnifiedShowsOptionsMatrix('stock_day')).toBe(false)
  })

  it('maps unified focus to single-table options focus', () => {
    expect(unifiedFocusToOptions('option_snapshots')).toBe('option_snapshots')
    expect(optionsFocusDatasetToUnified('option_snapshots')).toBe('option_snapshots')
  })
})
