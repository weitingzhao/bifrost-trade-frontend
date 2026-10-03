import type { PositionTagBody } from './requestBodies'

export interface PositionCategory {
  /** The path's and every referencing column's name for the category id (api 0.6.7,
   *  TD-57); the row's `id` goes next release. */
  category_id: number
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
