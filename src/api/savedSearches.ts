/**
 * Saved searches — `/api/strategy/strategies/saved-searches` (api 0.1.9).
 * The Finder's smart folders (design Rev .139): a page's filters under a
 * name, kept server-side for the one operator (Owner 2026-10-01).
 */
import { withValidation } from '@/lib/apiValidation'
import { strategyUrl } from '@/lib/devApiUrl'
import { SavedSearchesResponseSchema, type SavedSearchesResponse } from '@/lib/schemas/savedSearch'
import { tradeFetch } from '@/lib/tradeFetch'

const validate = withValidation<SavedSearchesResponse>(SavedSearchesResponseSchema, 'strategy/saved-searches')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await tradeFetch(strategyUrl(path), init)
  const body = (await res.json().catch(() => ({}))) as { detail?: string }
  if (!res.ok) throw new Error(body.detail ?? `${init?.method ?? 'GET'} ${path}: ${res.status}`)
  return body as T
}

export async function fetchSavedSearches(): Promise<SavedSearchesResponse> {
  return validate(await request('/strategies/saved-searches'))
}

export async function createSavedSearch(body: {
  route: string
  label: string
  state: { search: string }
}): Promise<{ preference_saved_search_id: number }> {
  return request('/strategies/saved-searches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function deleteSavedSearch(id: number): Promise<{ ok: boolean }> {
  return request(`/strategies/saved-searches/${id}`, { method: 'DELETE' })
}
