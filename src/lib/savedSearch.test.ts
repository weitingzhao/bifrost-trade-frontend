import { describe, expect, it } from 'vitest'
import type { SavedSearch } from '@/lib/schemas/savedSearch'
import { matchSavedSearch, savedSearchTo, scopeSearch } from './savedSearch'

const S = (id: number, route: string, search: string): SavedSearch => ({
  preference_saved_search_id: id,
  route,
  label: `s${id}`,
  state_json: { search },
})

describe('saved searches (Rev .139)', () => {
  it('compares scopes, not order, and ignores the open row', () => {
    expect(scopeSearch('?status=all&q=sym%3AAMD&plan=12')).toBe(scopeSearch('q=sym%3AAMD&status=all'))
    expect(scopeSearch('?plan=12&new=1')).toBe('')
  })

  it('opens the page with its scope', () => {
    expect(savedSearchTo(S(1, '/trade/plans', 'status=all'))).toBe('/trade/plans?status=all')
    expect(savedSearchTo(S(2, '/trade/plans', ''))).toBe('/trade/plans')
  })

  it('finds the one the page is on, and none for an unfiltered page', () => {
    const list = [S(1, '/trade/plans', 'status=all&q=sym%3AAMD'), S(2, '/trade/plans', 'status=all')]
    expect(matchSavedSearch(list, '/trade/plans', '?q=sym%3AAMD&status=all&plan=3')?.preference_saved_search_id).toBe(1)
    expect(matchSavedSearch(list, '/trade/plans', '?status=draft')).toBeNull()
    expect(matchSavedSearch(list, '/trade/plans', '')).toBeNull()
    expect(matchSavedSearch(list, '/review', '?status=all')).toBeNull()
  })
})
