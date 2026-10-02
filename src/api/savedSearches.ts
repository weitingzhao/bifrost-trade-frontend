/**
 * Saved searches — `/api/strategy/strategies/saved-searches` (api 0.1.9).
 * The Finder's smart folders (design Rev .139): a page's filters under a
 * name, kept server-side for the one operator (Owner 2026-10-01).
 */
import { withValidation } from '@/lib/apiValidation'
import { strategyUrl } from '@/lib/devApiUrl'
import { SavedSearchesResponseSchema, type SavedSearchesResponse } from '@/lib/schemas/savedSearch'
import { requestJson, type RequestJsonOptions } from '@/lib/http'

const validate = withValidation<SavedSearchesResponse>(SavedSearchesResponseSchema, 'strategy/saved-searches')

function request<T>(path: string, init: RequestJsonOptions<T> = {}): Promise<T> {
  return requestJson<T>(strategyUrl(path), init)
}

export async function fetchSavedSearches(): Promise<SavedSearchesResponse> {
  return validate(await request('/strategies/saved-searches'))
}

export async function createSavedSearch(body: {
  route: string
  label: string
  state: { search: string }
}): Promise<{ preference_saved_search_id: number }> {
  return request('/strategies/saved-searches', { method: 'POST', body })
}

export async function deleteSavedSearch(id: number): Promise<{ ok: boolean }> {
  return request(`/strategies/saved-searches/${id}`, { method: 'DELETE' })
}
