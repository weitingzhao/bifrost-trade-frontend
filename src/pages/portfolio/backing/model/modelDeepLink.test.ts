import { describe, it, expect } from 'vitest'
import { UNTOUCHED_MODEL_TABLE, modelTableState, resolveModelSymbol } from './modelDeepLink'

const entries = [{ symbol: 'NVDA' }, { symbol: 'GOOG' }, { symbol: 'GOOGL' }, { symbol: 'DDOG' }]

describe('resolveModelSymbol', () => {
  it('an exact match wins, whatever the case, even when it is a prefix of another entry', () => {
    expect(resolveModelSymbol(entries, 'goog')).toBe('GOOG')
    expect(resolveModelSymbol(entries, ' NVDA ')).toBe('NVDA')
  })
  it('a substring resolves only when it names one entry', () => {
    expect(resolveModelSymbol(entries, 'NV')).toBe('NVDA')
    expect(resolveModelSymbol(entries, 'OG')).toBeNull()
    expect(resolveModelSymbol(entries, 'GOOGLE')).toBeNull()
  })
  it('nothing to open without a filter or without entries', () => {
    expect(resolveModelSymbol(entries, '')).toBeNull()
    expect(resolveModelSymbol([], 'NVDA')).toBeNull()
  })
})

describe('modelTableState', () => {
  it('starts collapsed with no deep link and nothing clicked', () => {
    expect(modelTableState(null, UNTOUCHED_MODEL_TABLE)).toEqual({ open: false, expandedSymbol: null })
  })
  it('a deep link opens the table on its row', () => {
    expect(modelTableState('NVDA', UNTOUCHED_MODEL_TABLE)).toEqual({ open: true, expandedSymbol: 'NVDA' })
  })
  it('a click under the deep link wins over it: collapsing the table, or collapsing the row', () => {
    expect(modelTableState('NVDA', { open: false, expandedSymbol: 'NVDA', steeredBy: 'NVDA' })).toEqual({
      open: false,
      expandedSymbol: 'NVDA',
    })
    expect(modelTableState('NVDA', { open: null, expandedSymbol: null, steeredBy: 'NVDA' })).toEqual({
      open: true,
      expandedSymbol: null,
    })
    expect(modelTableState('NVDA', { open: null, expandedSymbol: 'GOOG', steeredBy: 'NVDA' })).toEqual({
      open: true,
      expandedSymbol: 'GOOG',
    })
  })
  it('a new deep link steers again, whatever was clicked under the old one', () => {
    const collapsedUnderNvda = { open: false, expandedSymbol: null, steeredBy: 'NVDA' }
    expect(modelTableState('GOOG', collapsedUnderNvda)).toEqual({ open: true, expandedSymbol: 'GOOG' })
    expect(modelTableState(null, collapsedUnderNvda)).toEqual({ open: false, expandedSymbol: null })
  })
  it('a click made without a deep link is kept while there is none', () => {
    expect(modelTableState(null, { open: true, expandedSymbol: 'DDOG', steeredBy: null })).toEqual({
      open: true,
      expandedSymbol: 'DDOG',
    })
  })
})
