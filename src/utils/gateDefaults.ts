import type { DimsGroupedResponse, StrategyDimRow } from '@/types/strategy'

export const DIM_TYPES = [
  'dim_direction',
  'dim_structure',
  'dim_coverage',
  'dim_risk',
  'dim_volatility',
  'dim_time',
] as const

export type DimFieldName = (typeof DIM_TYPES)[number]

/**
 * `dim_direction` → `direction`. The gate API takes the payload field name,
 * while `GET /strategies/dims` keys `by_type` by the bare dim type — reading the
 * catalog with the field name finds nothing, so every dim offered only "Any".
 */
export function dimCatalogType(field: DimFieldName): string {
  return field.slice('dim_'.length)
}

/**
 * The codes a gate / template field may take: `by_column[field]` (api 0.6.7, TD-57), which
 * is keyed by the field name itself, else `by_type` under the bare type for an older API.
 */
export function dimOptions(
  dims: Pick<DimsGroupedResponse, 'by_type' | 'by_column'> | null | undefined,
  field: DimFieldName,
): StrategyDimRow[] {
  return dims?.by_column?.[field] ?? dims?.by_type[dimCatalogType(field)] ?? []
}

export const DIM_LABELS: Record<DimFieldName, string> = {
  dim_direction: 'Direction',
  dim_structure: 'Structure',
  dim_coverage: 'Coverage',
  dim_risk: 'Risk',
  dim_volatility: 'Volatility',
  dim_time: 'Time',
}
