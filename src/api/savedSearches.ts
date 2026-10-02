/**
 * Saved searches — `/api/strategy/strategies/saved-searches` (api 0.1.9).
 * The Finder's smart folders (design Rev .139): a page's filters under a
 * name, kept server-side for the one operator (Owner 2026-10-01).
 */
import { withValidation } from '@/lib/apiValidation'
import { strategyUrl } from '@/lib/devApiUrl'
import { SavedSearchesResponseSchema, type SavedSearchesResponse } from '@/lib/schemas/savedSearch'
import { requestDelete, requestJson, type DeleteOutcome, type RequestJsonOptions } from '@/lib/http'
import type { SavedSearchBody } from '@/types/requestBodies'

/** `SavedSearchBody` as the Finder sends it: a route, a name and the page's search. */
export interface SavedSearchCreate extends SavedSearchBody {
  route: string
  label: string
  state: { search: string }
}

const validate = withValidation<SavedSearchesResponse>(SavedSearchesResponseSchema, 'strategy/saved-searches')

function request<T>(path: string, init: RequestJsonOptions<T> = {}): Promise<T> {
  return requestJson<T>(strategyUrl(path), init)
}

export async function fetchSavedSearches(): Promise<SavedSearchesResponse> {
  return validate(await request('/strategies/saved-searches'))
}

export async function createSavedSearch(body: SavedSearchCreate): Promise<{ preference_saved_search_id: number }> {
  return request('/strategies/saved-searches', { method: 'POST', body })
}

/** A saved search already gone resolves as `deleted: 'gone'`; 503 when the store is unreachable. */
export function deleteSavedSearch(id: number): Promise<DeleteOutcome> {
  return requestDelete(strategyUrl(`/strategies/saved-searches/${id}`))
}
