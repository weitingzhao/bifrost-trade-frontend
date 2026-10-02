import type {
  PositionCategoriesResponse,
  TagPositionRequest,
} from '@/types/portfolio'
import type { ModelAnalysisResponse } from '@/types/modelAnalysis'
import type { InstrumentClassBody, PositionCategoryBody, SymbolOrderBody } from '@/types/requestBodies'
import { withValidation } from '@/lib/apiValidation'
import { PositionCategoriesResponseSchema } from '@/lib/schemas/portfolio'
import { ModelAnalysisResponseSchema } from '@/lib/schemas/modelAnalysis'
import { portfolioUrl } from '@/lib/devApiUrl'
import { tradeFetch } from '@/lib/tradeFetch'
import { HttpError, listItems, requestDelete, requestJson, type DeleteOutcome } from '@/lib/http'

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
  const body: PositionCategoryBody = { name, ...(sort_order != null ? { sort_order } : {}) }
  return requestJson(portfolioUrl('/position-categories'), { method: 'POST', body })
}

export function updatePositionCategory(id: number, name: string): Promise<{ ok: boolean; error?: string }> {
  return patchPositionCategory(id, { name })
}

/**
 * Change the fields sent (api 0.3.0): `name` is required (never null),
 * `description` / `sort_order` take `null` to clear, a blank text is 400 and
 * `sort_order` must be an integer. A missing category is 404. The answer keeps
 * `ok: true` for one release beside the row.
 */
export function patchPositionCategory(
  id: number,
  patch: { name?: string; description?: string | null; sort_order?: number | null },
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
  const body: SymbolOrderBody = { category_name, symbols }
  return requestJson(portfolioUrl('/position-categories/symbol-order'), { method: 'PUT', body })
}

/** A category already gone resolves as `deleted: 'gone'` (`ok` is not in that answer). */
export async function deletePositionCategory(id: number): Promise<{ ok: boolean; error?: string } & DeleteOutcome> {
  return { ok: true, ...(await requestDelete(portfolioUrl(`/position-categories/${id}`))) }
}

/**
 * Register an instrument's class (core 0.27.0, design Rev .119) — stock, fixed
 * income or cash-like, once per instrument, every account at once. `null`
 * drops the registration and the instrument reads as a stock again.
 *
 * api 0.3.0 (TD-15): a change to a registered instrument is a PATCH of the
 * class alone, so the stored note is kept; PATCH never inserts, so the first
 * registration stays on PUT — and so does a change the page thought was
 * registered but the server answers 404 for (another tab dropped it). A drop
 * of a class that is already gone resolves `ok`.
 */
export async function setInstrumentClass(
  contractKey: string,
  instrumentClass: 'stock' | 'fixed_income' | 'cash_like' | null,
  registered: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const url = portfolioUrl(`/instrument-classes/${encodeURIComponent(contractKey)}`)
  if (instrumentClass == null) {
    await requestDelete(url)
    return { ok: true }
  }
  const body: InstrumentClassBody = { instrument_class: instrumentClass }
  if (registered) {
    try {
      await requestJson(url, { method: 'PATCH', body })
      return { ok: true }
    } catch (e) {
      if (!(e instanceof HttpError && e.status === 404)) throw e
    }
  }
  return requestJson(url, { method: 'PUT', body })
}

export function tagPosition(req: TagPositionRequest): Promise<{ ok: boolean; error?: string }> {
  return requestJson(portfolioUrl('/position-categories/tag'), { method: 'PUT', body: req })
}
