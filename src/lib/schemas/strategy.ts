import { z } from 'zod'
import type { GateSafetyGates } from '@/types/strategy'

/**
 * `/api/strategy` response models (api 0.3.1, TD-24 batch 3c-1) — mirrored from
 * `bifrost_api/strategy/schemas/responses.py`, and the source of the FE types
 * (`z.infer`; `@/types/strategy` re-exports them under their old names).
 *
 * The rules the API states for these models, kept here one for one:
 *
 * - A field with no `?` is always in the answer; `.nullable()` where the model
 *   says `|null`. A `?` field (`.optional()`) is absent when the reader did not
 *   send it — never added as null (`response_model_exclude_unset`).
 * - `extra="allow"`: a field the reader adds before the model declares it still
 *   goes out, so every object here is `.passthrough()` — the page gets it too.
 * - Timestamps are ISO 8601 strings (`2031-03-04T14:30:00Z`), dates
 *   `YYYY-MM-DD`; plan `numeric` columns are decimal strings (`apiNumeric` in
 *   `./strategyPlan`).
 *
 * Plans live in `./strategyPlan`. Structures, templates and dims have no
 * response model yet and are not described here.
 */

const int = z.number().int()
/** ISO 8601 on the wire (`datetime` in the model). */
const timestamp = z.string()

// ── Allocations ──────────────────────────────────────────────────────────────

/** The limits that are set; a key is absent when its column is null. */
export const AllocationLimitsSchema = z
  .object({
    max_positions: int.optional(),
    /** A share: 0.25 = 25%. */
    max_bp_pct: z.number().optional(),
  })
  .passthrough()

/** `AllocationRow` — list items, GET / PATCH `/strategies/allocations/{id}`. */
export const StrategyAllocationSchema = z
  .object({
    strategy_allocation_id: int,
    name: z.string(),
    gate_safety_strategy_id: int.nullable(),
    gate_safety_name: z.string().nullable(),
    max_positions: int.nullable(),
    /** A share: 0.25 = 25%. */
    max_bp_pct: z.number().nullable(),
    /** Null when neither limit is set. */
    allocation_limits: AllocationLimitsSchema.nullable(),
    /** In the allocation's order; `[]` when it has none. */
    strategy_opportunity_ids: z.array(int),
    is_active: z.boolean(),
    created_at: timestamp,
    updated_at: timestamp,
  })
  .passthrough()

/** `AllocationList` — GET `/strategies/allocations`. */
export const AllocationsResponseSchema = z
  .object({ items: z.array(StrategyAllocationSchema), count: int })
  .passthrough()

// ── Opportunities ────────────────────────────────────────────────────────────

export const EntryConditionSchema = z
  .object({
    condition_type: z.string().nullable(),
    value_text: z.string().nullable(),
    value_numeric: z.number().nullable(),
  })
  .passthrough()

/** `OpportunityRow` — GET `/strategies/opportunities` items. */
export const StrategyOpportunitySchema = z
  .object({
    strategy_opportunity_id: int,
    name: z.string(),
    strategy_structure_id: int,
    structure_name: z.string().nullable(),
    default_gate_safety_strategy_id: int.nullable(),
    gate_safety_name: z.string().nullable(),
    scope_type: z.string().nullable(),
    /** The list sends null for an opportunity without symbols (the detail sends `[]`). */
    symbols: z.array(z.string()).nullable(),
    is_active: z.boolean(),
    created_at: timestamp,
    updated_at: timestamp,
  })
  .passthrough()

/** `OpportunityDetail` — GET / PATCH `/strategies/opportunities/{id}`: `symbols` always an array. */
export const StrategyOpportunityDetailSchema = StrategyOpportunitySchema.extend({
  symbols: z.array(z.string()),
  entry_conditions: z.array(EntryConditionSchema),
}).passthrough()

/** `OpportunityList` — GET `/strategies/opportunities`. */
export const OpportunitiesResponseSchema = z
  .object({ items: z.array(StrategyOpportunitySchema), count: int })
  .passthrough()

// ── Gate safety ──────────────────────────────────────────────────────────────

/** `GateSafetyRow` — GET `/strategies/gate-safety` items. */
export const GateSafetyItemSchema = z
  .object({
    gate_safety_strategy_id: int,
    name: z.string(),
    version: int,
    dim_direction: z.string().nullable(),
    dim_structure: z.string().nullable(),
    dim_coverage: z.string().nullable(),
    dim_risk: z.string().nullable(),
    dim_volatility: z.string().nullable(),
    dim_time: z.string().nullable(),
    is_active: z.boolean(),
    /** Always null: a gate set has no structure type of its own (kept for old readers). */
    structure_type: z.null(),
  })
  .passthrough()

/**
 * `gates` is a free-form object in the model (core's `GateParams`: strategy /
 * state / intent / guard, without `strategy.earnings.dates`). It is checked as
 * an object and typed with the FE's reading of GateParams, `GateSafetyGates` —
 * the model does not declare the families, so a schema for them here would be
 * the FE's invention, not the contract.
 */
const GatesObjectSchema = z.custom<GateSafetyGates>(
  (v) => v != null && typeof v === 'object' && !Array.isArray(v),
  { message: 'expected an object' },
)

/** `GateSafetyDetail` — GET / PATCH `/strategies/gate-safety/{id}`. */
export const GateSafetyFullSchema = GateSafetyItemSchema.extend({
  gates: GatesObjectSchema,
  /** YYYY-MM-DD. */
  earnings_dates: z.array(z.string()),
}).passthrough()

/** `GateSafetyList` — GET `/strategies/gate-safety`. */
export const GateSafetyResponseSchema = z
  .object({ items: z.array(GateSafetyItemSchema), count: int })
  .passthrough()

// ── Instances ────────────────────────────────────────────────────────────────

/** `InstanceRow` — list items, GET / PATCH `/strategies/instances/{id}`. */
export const StrategyInstanceSchema = z
  .object({
    strategy_instance_id: int,
    strategy_opportunity_id: int,
    strategy_opportunity_name: z.string().nullable(),
    strategy_structure_id: int.nullable(),
    strategy_structure_name: z.string().nullable(),
    account_id: z.string(),
    opened_at: timestamp,
    label: z.string().nullable(),
    notes: z.string().nullable(),
    created_at: timestamp,
    updated_at: timestamp,
    /** Unix seconds of `opened_at` / `created_at`, sent whenever those are. */
    opened_at_epoch: z.number().optional(),
    created_at_epoch: z.number().optional(),
    /**
     * The list only: fills attributed or split-allocated to the instance.
     * GET / PATCH `/instances/{id}` never send it — a reader of one instance
     * that needs the count takes it from the instance's executions.
     */
    executions_count: int.optional(),
    /**
     * The list only (core 0.41.0, TD-43): where the instance stands by its own
     * option fills — the one open / closed rule every page reads. `expired` (every
     * open leg past expiry, no closing fill) counts as closed.
     */
    state: z.enum(['no_fills', 'open', 'expired', 'closed']).optional(),
    /** YYYY-MM-DD the instance closed (last flat day, or last expiry); null unless closed / expired. */
    closed_on: z.string().nullable().optional(),
  })
  .passthrough()

/** `InstanceList` — GET `/strategies/instances`. */
export const StrategyInstancesResponseSchema = z
  .object({ items: z.array(StrategyInstanceSchema), count: int })
  .passthrough()

/** GET / PATCH `/strategies/instances/{id}` answer the same `InstanceRow`, without `executions_count`. */
export const StrategyInstanceDetailSchema = StrategyInstanceSchema

/**
 * `GET /strategies/gate-safety/defaults`. Parsed strictly (not `withValidation`):
 * a new gate set is seeded from this, so an answer without the four families
 * is an error the sheet shows, never a half-seeded form.
 */
const GateFamilySchema = z.object({}).passthrough()
export const GateSafetyDefaultsResponseSchema = z.object({
  gates: z.object({
    strategy: GateFamilySchema,
    state: GateFamilySchema,
    intent: GateFamilySchema,
    guard: GateFamilySchema,
  }).passthrough(),
}).passthrough()
