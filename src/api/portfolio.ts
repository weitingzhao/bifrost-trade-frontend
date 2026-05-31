import type {
  PositionCategoriesResponse,
  TagPositionRequest,
} from '@/types/portfolio'
import type { ModelAnalysisResponse } from '@/types/modelAnalysis'
import { withValidation } from '@/lib/apiValidation'
import { PositionCategoriesResponseSchema } from '@/lib/schemas/portfolio'
import { ModelAnalysisResponseSchema } from '@/lib/schemas/modelAnalysis'

const BASE = import.meta.env.VITE_API_PORTFOLIO as string

const validateCategories = withValidation<PositionCategoriesResponse>(
  PositionCategoriesResponseSchema, 'portfolio/position-categories'
)

const validateModelAnalysis = withValidation<ModelAnalysisResponse>(
  ModelAnalysisResponseSchema, 'portfolio/model-analysis'
)

export async function fetchModelAnalysis(accountId: string): Promise<ModelAnalysisResponse> {
  const params = new URLSearchParams({ account_id: accountId })
  const res = await fetch(`${BASE}/portfolio/model-analysis?${params}`)
  if (!res.ok) throw new Error(`Portfolio /portfolio/model-analysis: ${res.status}`)
  return validateModelAnalysis(await res.json())
}

export async function fetchPositionCategories(): Promise<PositionCategoriesResponse> {
  const res = await fetch(`${BASE}/position-categories`)
  if (!res.ok) throw new Error(`Portfolio /position-categories: ${res.status}`)
  return validateCategories(await res.json())
}

export async function createPositionCategory(
  name: string,
  sort_order?: number,
): Promise<{ ok: boolean; id: number | null; error?: string }> {
  const res = await fetch(`${BASE}/position-categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, ...(sort_order != null ? { sort_order } : {}) }),
  })
  if (!res.ok) throw new Error(`Create category: ${res.status}`)
  return res.json()
}

export async function updatePositionCategory(
  id: number,
  name: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/position-categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`Update category: ${res.status}`)
  return res.json()
}

export async function patchPositionCategory(
  id: number,
  patch: { name?: string; description?: string; sort_order?: number },
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/position-categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`Patch category: ${res.status}`)
  return res.json()
}

export async function fetchMarketStreamsSymbolOrder(): Promise<{
  ok: boolean
  order?: Record<string, string[]>
}> {
  const res = await fetch(`${BASE}/position-categories/symbol-order`)
  if (!res.ok) return { ok: false }
  const j = await res.json()
  return { ok: j.ok === true, order: j.order ?? {} }
}

export async function putMarketStreamsSymbolOrder(
  category_name: string,
  symbols: string[],
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/position-categories/symbol-order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category_name, symbols }),
  })
  if (!res.ok) throw new Error(`Put symbol order: ${res.status}`)
  return res.json()
}

export async function deletePositionCategory(
  id: number
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/position-categories/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete category: ${res.status}`)
  return res.json()
}

export async function tagPosition(
  req: TagPositionRequest
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/position-categories/tag`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`Tag position: ${res.status}`)
  return res.json()
}
