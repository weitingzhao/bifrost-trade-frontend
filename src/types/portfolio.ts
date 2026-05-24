export interface PositionCategory {
  id: number
  name: string
  description: string | null
  sort_order: number | null
}

export interface PositionCategoriesResponse {
  ok: boolean
  items: PositionCategory[]
}

export interface TagPositionRequest {
  account_id: string
  contract_key: string
  category_id: number | null
}
