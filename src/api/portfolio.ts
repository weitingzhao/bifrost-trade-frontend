import type {
  PositionCategoriesResponse,
  TagPositionRequest,
} from '@/types/portfolio'
import type { ModelAnalysisResponse } from '@/types/modelAnalysis'
import { withValidation } from '@/lib/apiValidation'
import { PositionCategoriesResponseSchema } from '@/lib/schemas/portfolio'
import { ModelAnalysisResponseSchema } from '@/lib/schemas/modelAnalysis'
import { portfolioUrl } from '@/lib/devApiUrl'
import { tradeFetch } from '@/lib/tradeFetch'
import { listItems, requestJson } from '@/lib/http'

const validateCategories = withValidation<PositionCategoriesResponse>(
  PositionCategoriesResponseSchema, 'portfolio/position-categories'
)

const validateModelAnalysis = withValidation<ModelAnalysisResponse>(
  ModelAnalysisResponseSchema, 'portfolio/model-analysis'
)

export async function fetchModelAnalysis(accountId: string): Promise<ModelAnalysisResponse> {
  const params = new URLSearchParams({ account_id: accountId })
  const res = await tradeFetch(portfolioUrl(`/portfolio/model-analysis?${params}`))
  if (!res.ok) throw new Error(`Portfolio /portfolio/model-analysis: ${res.status}`)
  return validateModelAnalysis(await res.json())
}

/**
 * Every write below throws `HttpError` with the server's reason. From api
 * 0.2.2 a refusal is a real status with `detail`; 0.2.1 answered 200
 * `{ ok: false, error }`, which `requestJson` throws the same way.
 */
export async function fetchPositionCategories(): Promise<PositionCategoriesResponse> {
  const raw = await requestJson<Record<string, unknown>>(portfolioUrl('/position-categories'))
  return validateCategories({ ...raw, items: listItems(raw) })
}

export function createPositionCategory(
  name: string,
  sort_order?: number,
): Promise<{ ok: boolean; id: number | null; error?: string }> {
  return requestJson(portfolioUrl('/position-categories'), {
    method: 'POST',
    body: { name, ...(sort_order != null ? { sort_order } : {}) },
  })
}

export function updatePositionCategory(id: number, name: string): Promise<{ ok: boolean; error?: string }> {
  return patchPositionCategory(id, { name })
}

export function patchPositionCategory(
  id: number,
  patch: { name?: string; description?: string; sort_order?: number },
): Promise<{ ok: boolean; error?: string }> {
  return requestJson(portfolioUrl(`/position-categories/${id}`), { method: 'PATCH', body: patch })
}

export async function fetchMarketStreamsSymbolOrder(): Promise<{
  ok: boolean
  order?: Record<string, string[]>
}> {
  const res = await tradeFetch(portfolioUrl('/position-categories/symbol-order'))
  if (!res.ok) return { ok: false }
  const j = await res.json()
  return { ok: j.ok === true, order: j.order ?? {} }
}

export function putMarketStreamsSymbolOrder(
  category_name: string,
  symbols: string[],
): Promise<{ ok: boolean; error?: string }> {
  return requestJson(portfolioUrl('/position-categories/symbol-order'), {
    method: 'PUT',
    body: { category_name, symbols },
  })
}

export function deletePositionCategory(id: number): Promise<{ ok: boolean; error?: string }> {
  return requestJson(portfolioUrl(`/position-categories/${id}`), { method: 'DELETE' })
}

/**
 * Register an instrument's class (core 0.27.0, design Rev .119) — stock, fixed
 * income or cash-like, once per instrument, every account at once. `null`
 * drops the registration and the instrument reads as a stock again.
 */
export function setInstrumentClass(
  contractKey: string,
  instrumentClass: 'stock' | 'fixed_income' | 'cash_like' | null,
): Promise<{ ok: boolean; error?: string }> {
  const url = portfolioUrl(`/instrument-classes/${encodeURIComponent(contractKey)}`)
  return instrumentClass == null
    ? requestJson(url, { method: 'DELETE' })
    : requestJson(url, { method: 'PUT', body: { instrument_class: instrumentClass } })
}

export function tagPosition(req: TagPositionRequest): Promise<{ ok: boolean; error?: string }> {
  return requestJson(portfolioUrl('/position-categories/tag'), { method: 'PUT', body: req })
}
