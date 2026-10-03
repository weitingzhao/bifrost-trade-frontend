import type { PositionTagBody } from './requestBodies'

export interface PositionCategory {
  id: number
  name: string
  description: string | null
  sort_order: number | null
}

export interface PositionCategoriesResponse {
  ok?: boolean
  items: PositionCategory[]
}

/** `PositionTagBody`: `category_id` must be sent — an integer tags, `null` clears. */
export interface TagPositionRequest extends PositionTagBody {
  account_id: string
  contract_key: string
  category_id: number | null
}
