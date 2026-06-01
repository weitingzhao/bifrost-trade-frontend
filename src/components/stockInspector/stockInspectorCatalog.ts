import {
  EXT_GROUP_LABELS,
  SEPA_COND_CATALOG,
  TECH_COND_CATALOG,
} from '@/constants/stockScreenerCatalog'

export const SEPA_FUND_ORDER = SEPA_COND_CATALOG.map((c) => ({ id: c.id, label: c.label }))
export const SEPA_TECH_ORDER = TECH_COND_CATALOG.map((c) => ({ id: c.id, label: c.label }))

export const FUND_EXT_GROUP_ORDER = Object.entries(EXT_GROUP_LABELS).map(([key, label]) => ({
  key,
  label,
}))
