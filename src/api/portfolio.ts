import type {
  PositionCategoriesResponse,
  TagPositionRequest,
} from '@/types/portfolio'
import { withValidation } from '@/lib/apiValidation'
import { PositionCategoriesResponseSchema } from '@/lib/schemas/portfolio'

const BASE = import.meta.env.VITE_API_PORTFOLIO as string

const validateCategories = withValidation<PositionCategoriesResponse>(
  PositionCategoriesResponseSchema, 'portfolio/position-categories'
)

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
