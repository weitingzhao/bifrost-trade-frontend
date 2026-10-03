/**
 * Request bodies of the POST / PUT writes the API types since 0.3.1 (TD-24,
 * batch 3c-1) — mirrored from `bifrost_api/{strategy,portfolio,trading,market}/
 * schemas/requests.py`, field for field.
 *
 * What the API does with them:
 *
 * - **Strict types**: `"5"` is not a number, `1` is not `true`, `3.0` is not an
 *   integer. A wrong type is 422 and nothing is written. An integer is a number.
 * - **Unknown fields**: ignored and logged in 0.3.1; **422 from 0.3.2**
 *   (`extra="forbid"`). The FE must send no field that is not declared here.
 * - Presence: every field is optional at the model; the route's or core's 400
 *   names the ones a write needs (`name is required.` …). A field that is not
 *   optional below (`legs`, `items`, `category_id`, `symbols`, `contract_key`,
 *   `quantity`, `price`, `batches`) is one the route refuses without.
 *
 * The FE payload types (`StructurePayload`, `CreateExecutionBody`, …) are built
 * from these, and `requestBodies.test.ts` checks at compile time that each
 * sends only declared fields of the declared types.
 *
 * Not here: the opportunity / allocation / instance / plan / review bodies
 * (core's models) and every PATCH body (TD-15, 3b-2).
 */

/** A free-form JSON object (`Dict[str, Any]` in the model). */
type JsonObject = object

// ── Strategy (`/api/strategy`) ───────────────────────────────────────────────

/** POST `/strategies/templates` (core 400 without a snake_case `template_code`). */
export interface TemplateBody {
  template_code?: string
  display_name?: string
  dim_direction?: string | null
  dim_structure?: string | null
  dim_coverage?: string | null
  dim_risk?: string | null
  dim_volatility?: string | null
  dim_time?: string | null
  explanation?: string | null
  typical_use?: string | null
  example?: string | null
  nature?: string | null
  sort_order?: number
  is_active?: boolean
}

export interface TemplateLegItem {
  role?: string | null
  direction?: string | null
  /** `""` for a leg without a right (the stock leg) is accepted. */
  option_right?: string | null
  quantity_default?: number
  /** Read when `quantity_default` is absent. */
  quantity?: number
  /** Ignored: core numbers the legs by their position. */
  sort_order?: number
}

/** PUT `/strategies/templates/{id}/legs` — replaces the legs. */
export interface TemplateLegsBody {
  legs: TemplateLegItem[]
}

export interface TemplateParamItem {
  meta_key?: string
  display_label?: string | null
  /** Lenient: a row stored before types were checked may hold a number. The FE sends strings. */
  default_value_text?: string | number | null
  param_kind?: string
  sort_order?: number
}

/** PUT `/strategies/templates/{id}/params` — replaces the parameters. */
export interface TemplateParamsBody {
  items: TemplateParamItem[]
}

/** PUT `/strategies/templates/{id}/characteristics` — null or absent clears. */
export interface TemplateCharacteristicsBody {
  items?: string[] | null
}

/** Checked for type, not stored: core takes a structure's legs from its template. */
export interface StructureLegItem {
  role?: string | null
  direction?: string | null
  option_right?: string | null
  /** A number, not an integer: legs migrated in wave 9 may carry `1.0`. */
  quantity?: number
  strike?: number | null
  expiration?: string | null
}

export interface StructureMetaItem {
  meta_key?: string
  /** Lenient like `default_value_text`; the FE sends strings. */
  meta_value_text?: string | number | null
}

/** POST `/strategies/structures`, PUT `/strategies/structures/{id}` (a full replace). */
export interface StructureBody {
  name?: string
  strategy_template_id?: number
  structure_type?: string
  legs?: StructureLegItem[]
  version?: number
  is_active?: boolean
  notes?: string | null
  meta?: StructureMetaItem[]
}

/** POST `/gate-sets`, PUT `/gate-sets/{id}` (a full replace; `/strategies/gate-safety` until api R4). */
export interface GateSetBody {
  name?: string
  version?: number
  dim_direction?: string | null
  dim_structure?: string | null
  dim_coverage?: string | null
  dim_risk?: string | null
  dim_volatility?: string | null
  dim_time?: string | null
  is_active?: boolean
  /** Core `GateParams` (400 with the reason); no `strategy.earnings.dates` inside. */
  gates?: JsonObject
  /** YYYY-MM-DD; a `""` entry is dropped by core. */
  earnings_dates?: string[]
}

/** The api's old name of `GateSetBody` (api 0.7.0 keeps it as an alias until R4). */
export type GateSafetyBody = GateSetBody

/** POST `/preferences/saved-searches` (`/strategies/saved-searches` until api R4). */
export interface SavedSearchBody {
  route?: string
  label?: string
  /** The read name (api 0.6.7, TD-57); `state` still works one release and loses to it. */
  state_json?: JsonObject
  /** @deprecated api 0.6.7: send `state_json`. Goes next api release. */
  state?: JsonObject
}

// ── Portfolio (`/api/portfolio`) ─────────────────────────────────────────────

/** POST `/position-categories`. */
export interface PositionCategoryBody {
  name?: string
  description?: string | null
  sort_order?: number
}

/** PUT `/position-categories/tag`: an integer tags, `null` clears; left out is 400. */
export interface PositionTagBody {
  account_id?: string
  contract_key?: string
  category_id: number | null
}

/** PUT `/position-categories/symbol-order` — replaces one category's order. */
export interface SymbolOrderBody {
  category_name?: string
  symbols: string[]
}

/** PUT `/instrument-classes/{contract_key}`. */
export interface InstrumentClassBody {
  instrument_class?: string
  note?: string | null
}

// ── Trading (`/api/trading`) ─────────────────────────────────────────────────

/** One split of a fill across trades, old names (api 0.7.0 reads them until R4). */
export interface InstanceAllocationItem {
  strategy_instance_id?: number
  allocated_quantity?: number
}

/** One split of a fill across trades; the splits sum to the fill's quantity (core, 400). api 0.7.0. */
export interface FillSplitItem {
  trade_id?: number
  quantity?: number
}

interface ExecutionFields {
  account_id?: string
  symbol?: string
  sec_type?: string
  side?: string
  /** Signed: sells negative. */
  quantity?: number
  price?: number
  /** `manual` (default) | `journal_closed`. */
  source?: string
  expiry?: string
  strike?: number
  option_right?: string
  contract_key?: string
  exchange?: string
  order_id?: number
  cum_qty?: number
  commission?: number
  realized_pnl?: number
  currency?: string
  strategy_opportunity_id?: number | null
  /** api 0.7.0 names (naming R1); the old two below lose when both are sent. Callers switch in R2. */
  trade_id?: number | null
  fill_splits?: FillSplitItem[]
  strategy_instance_id?: number | null
  instance_allocations?: InstanceAllocationItem[]
}

/** POST `/executions`: `quantity` and `price` are required (400). */
export interface ExecutionCreateBody extends ExecutionFields {
  quantity: number
  price: number
  /** Unix seconds; now when absent. */
  time?: number
  exec_id?: string
  raw_extra?: unknown
}

/** PUT `/executions/{id}`: changes the fields sent. */
export interface ExecutionUpdateBody extends ExecutionFields {
  /** Unix seconds; `time` is read when `exec_time` is absent. */
  exec_time?: number
  time?: number
}

/** POST `/executions/option-stock-links`. */
export interface OptionStockLinkBody {
  account_id?: string
  option_account_executions_id?: number
  stock_account_executions_id?: number
  /** `exercise` | `assignment`. */
  role?: string | null
  note?: string | null
}

export interface OptionStockLinkBatchItem {
  account_id?: string
  option_account_executions_ids?: number[]
}

/** POST `/executions/option-stock-links/query`. */
export interface OptionStockLinksQueryBody {
  batches: OptionStockLinkBatchItem[]
}

// ── Market (`/api/market`) ───────────────────────────────────────────────────

/** POST `/watchlist`: an explicit null clears (`category_id: null` = the None list). */
export interface WatchlistBody {
  contract_key: string
  symbol?: string | null
  sec_type?: string | null
  expiry?: string | null
  strike?: number | null
  option_right?: string | null
  display_label?: string | null
  source?: string | null
  category_id?: number | null
  /** `null` counts as not sent. */
  optionable?: boolean | null
}
