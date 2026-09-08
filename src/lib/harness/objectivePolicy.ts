/**
 * The objective's policy as a form, not as JSON.
 *
 * An objective is the core object of the trading system: what the autopilot
 * hunts, how many it may propose, who judges, how tight the leash is. It was
 * configured by a thin dialog at birth and never again — every later change
 * went through a model's suggestion or a hand-edited JSON. This module names
 * each knob the Owner may turn, says what it means and what leaving it unset
 * does, and turns a set of edits into the nested patch the policy-suggestion
 * endpoint accepts. It never decides a value: defaults mirror
 * `copilot/harness/policy_schema.py` and are shown as such.
 */
import { OWNER_POLICY_KEYS, POLICY_FIELD_HELP } from '@/lib/harness/harnessDraftHelpers'

/** Re-exported: the list lives beside the model's, which it extends. */
export { OWNER_POLICY_KEYS }

export type PolicyFieldKind = 'text' | 'number' | 'bool' | 'select' | 'symbols' | 'stages'

export interface PolicyField {
  /** Dotted path into policy_json, e.g. `layers.sepa.min_score`. */
  path: string
  label: string
  kind: PolicyFieldKind
  help: string
  /** What the runtime uses when the key is absent; undefined = truly optional. */
  defaultValue?: unknown
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  step?: number
  placeholder?: string
  /** Show only when the policy is in a mode where the knob does anything. */
  when?: (policy: Record<string, unknown>) => boolean
}

export interface PolicySection {
  id: string
  title: string
  lead: string
  fields: PolicyField[]
}

export const UNIVERSE_MODES = [
  { value: 'stock_composite', label: 'Stock composite — SEPA · momentum · events funnel' },
  { value: 'sepa', label: 'SEPA only' },
  { value: 'momentum', label: 'Momentum only' },
  { value: 'events', label: 'Events only' },
  { value: 'scan_legacy', label: 'Option scan snapshot' },
]

export const PRESETS = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'mean_revert', label: 'Mean revert' },
  { value: 'adaptive_30d', label: 'Adaptive 30d' },
]

export const SCHEDULES = [
  { value: 'adhoc', label: 'Adhoc — Run now only' },
  { value: 'daily_open', label: 'Daily at open — weekdays 13:30 UTC' },
  { value: 'daily_eod', label: 'Daily at close' },
  { value: 'weekly', label: 'Weekly' },
]

export const PERSONAS = [
  { value: 'loop_curator', label: 'Loop Curator — explains and curates runs' },
  { value: 'curator', label: 'Curator' },
  { value: 'verdict', label: 'Verdict' },
  { value: 'discovery', label: 'Discovery' },
]

const isStockMode = (p: Record<string, unknown>) =>
  ['stock_composite', 'sepa', 'momentum', 'events'].includes(String(p.universe_mode ?? 'scan_legacy'))
const isComposite = (p: Record<string, unknown>) => String(p.universe_mode ?? '') === 'stock_composite'
const overlayOn = (p: Record<string, unknown>) => {
  const o = p.option_overlay
  return Boolean(o && typeof o === 'object' && (o as Record<string, unknown>).enabled === true)
}

export const POLICY_SECTIONS: PolicySection[] = [
  {
    id: 'universe',
    title: 'Universe',
    lead: 'Where a run looks, and how many names it may bring back.',
    fields: [
      {
        path: 'universe_mode',
        label: 'Universe mode',
        kind: 'select',
        options: UNIVERSE_MODES,
        defaultValue: 'scan_legacy',
        help: POLICY_FIELD_HELP.universe_mode,
      },
      {
        path: 'max_candidates',
        label: 'Max candidates per run',
        kind: 'number',
        min: 1,
        max: 50,
        step: 1,
        defaultValue: 3,
        help: POLICY_FIELD_HELP.max_candidates,
      },
      {
        path: 'seed_symbols',
        label: 'Seed symbols',
        kind: 'symbols',
        placeholder: 'NVDA, AMD …',
        defaultValue: [],
        help: 'Names the heuristic plan falls back to when the scan yields nothing. Empty = no fallback; a run with an empty funnel proposes nobody.',
      },
      {
        path: 'preset',
        label: 'Scan preset',
        kind: 'select',
        options: PRESETS,
        defaultValue: 'neutral',
        help: POLICY_FIELD_HELP.preset,
      },
      {
        path: 'flag_filter',
        label: 'Flag filter',
        kind: 'text',
        placeholder: 'e.g. iv_hot,skew_hot',
        help: POLICY_FIELD_HELP.flag_filter,
      },
      {
        path: 'min_composite_score',
        label: 'Min composite score',
        kind: 'number',
        min: 0,
        max: 100,
        step: 1,
        help: POLICY_FIELD_HELP.min_composite_score,
      },
      {
        path: 'min_hit_rate',
        label: 'Min lens hit rate',
        kind: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        help: POLICY_FIELD_HELP.min_hit_rate,
      },
    ],
  },
  {
    id: 'layers',
    title: 'Screening layers',
    lead: 'The stock-first funnel. A layer that is not required only ranks; it never cuts.',
    fields: [
      {
        path: 'layers.sepa.stage',
        label: 'SEPA stages',
        kind: 'stages',
        defaultValue: ['SETUP', 'PIVOT'],
        placeholder: 'SETUP, PIVOT',
        help: 'Which SEPA stages qualify. Names outside these stages are dropped when the layer is required.',
        when: isStockMode,
      },
      {
        path: 'layers.sepa.min_score',
        label: 'SEPA min score',
        kind: 'number',
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 70,
        help: 'Floor on the SEPA composite (0–100).',
        when: isStockMode,
      },
      {
        path: 'layers.sepa.required',
        label: 'SEPA required',
        kind: 'bool',
        defaultValue: true,
        help: 'When on, a name that fails the SEPA layer is out. Off = SEPA only orders the list.',
        when: isStockMode,
      },
      {
        path: 'layers.momentum.min_score',
        label: 'Momentum min score',
        kind: 'number',
        min: 0,
        max: 100,
        step: 1,
        help: 'Floor on the momentum score. Not set = no floor.',
        when: isComposite,
      },
      {
        path: 'layers.momentum.required',
        label: 'Momentum required',
        kind: 'bool',
        defaultValue: false,
        help: 'When on, the momentum layer can reject.',
        when: isComposite,
      },
      {
        path: 'layers.events.min_importance',
        label: 'Event importance ≥',
        kind: 'number',
        min: 1,
        max: 3,
        step: 1,
        defaultValue: 2,
        help: 'Events layer: minimum importance (1–3) of an upcoming event to count.',
        when: isComposite,
      },
      {
        path: 'layers.events.within_days',
        label: 'Event within days',
        kind: 'number',
        min: 1,
        max: 60,
        step: 1,
        defaultValue: 5,
        help: 'Events layer: how far ahead an event may be.',
        when: isComposite,
      },
      {
        path: 'layers.events.required',
        label: 'Events required',
        kind: 'bool',
        defaultValue: false,
        help: 'When on, only names with a qualifying event survive.',
        when: isComposite,
      },
    ],
  },
  {
    id: 'overlay',
    title: 'Option overlay',
    lead: 'A second pass over the survivors using option flags.',
    fields: [
      {
        path: 'option_overlay.enabled',
        label: 'Overlay enabled',
        kind: 'bool',
        defaultValue: false,
        help: POLICY_FIELD_HELP.option_overlay,
        when: isStockMode,
      },
      {
        path: 'option_overlay.required',
        label: 'Overlay required',
        kind: 'bool',
        defaultValue: false,
        help: 'When on, a name without option coverage is dropped rather than passed through.',
        when: (p) => isStockMode(p) && overlayOn(p),
      },
      {
        path: 'option_overlay.flag_filter',
        label: 'Overlay flag filter',
        kind: 'text',
        placeholder: 'iv_hot',
        help: 'Option flags a survivor must carry.',
        when: (p) => isStockMode(p) && overlayOn(p),
      },
      {
        path: 'option_overlay.min_composite',
        label: 'Overlay min composite',
        kind: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        help: 'Floor on the option composite (0–1). Not set = no floor.',
        when: (p) => isStockMode(p) && overlayOn(p),
      },
      {
        path: 'option_overlay.scan_preset',
        label: 'Overlay preset',
        kind: 'select',
        options: PRESETS,
        defaultValue: 'neutral',
        help: 'Scoring weights for the overlay pass.',
        when: (p) => isStockMode(p) && overlayOn(p),
      },
    ],
  },
  {
    id: 'judging',
    title: 'Triage and judges',
    lead: 'The cheap pass that ranks, and the expensive one that judges. This is where the run spends.',
    fields: [
      {
        path: 'triage.enabled',
        label: 'Triage',
        kind: 'bool',
        defaultValue: true,
        help: 'A small model ranks the proposed names before the judges see them (≈ $0.0002 a run).',
      },
      {
        path: 'triage.deep_judge_top_n',
        label: 'Judge only the top N',
        kind: 'number',
        min: 0,
        max: 50,
        step: 1,
        defaultValue: 0,
        help: '0 = every proposed name reaches the judges. Set it and the rest are held: they carry no verdict, so the leash cannot accept them.',
      },
      {
        path: 'triage.model',
        label: 'Triage model',
        kind: 'text',
        placeholder: 'default — cheapest configured',
        help: 'Override the triage model. Leave unset for the cheapest configured chat endpoint.',
      },
      {
        path: 'persona_evaluate',
        label: 'Judges',
        kind: 'bool',
        defaultValue: true,
        help: 'The persona judges evaluate each candidate (≈ $0.08 a name with two models). Off = candidates go to the Inbox unjudged and the leash accepts nothing.',
      },
      {
        path: 'require_validate_pass',
        label: 'Validate can block',
        kind: 'bool',
        defaultValue: true,
        help: POLICY_FIELD_HELP.require_validate_pass,
      },
      {
        path: 'discovery_assist.enabled',
        label: 'Discovery assist',
        kind: 'bool',
        defaultValue: false,
        help: POLICY_FIELD_HELP.discovery_assist,
      },
    ],
  },
  {
    id: 'leash',
    title: 'Leash and resolution',
    lead: 'What an unattended run may accept on its own, and how a pick is settled without a click.',
    fields: [
      {
        path: 'min_source_hit_rate',
        label: 'Source hit-rate floor',
        kind: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.45,
        help: POLICY_FIELD_HELP.min_source_hit_rate,
      },
      {
        path: 'resolution.enabled',
        label: 'Auto-resolve',
        kind: 'bool',
        defaultValue: true,
        help: POLICY_FIELD_HELP.resolution,
      },
      {
        path: 'resolution.horizon_days',
        label: 'Horizon (sessions)',
        kind: 'number',
        min: 1,
        max: 60,
        step: 1,
        defaultValue: 20,
        help: 'Sessions after the pick at which the outcome is judged. Must be one the settlement engine writes: 1, 5 or 20.',
      },
      {
        path: 'resolution.validate_excess',
        label: 'Validate at excess ≥',
        kind: 'number',
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.03,
        help: 'Excess return over the benchmark (fraction; 0.03 = 3%) that validates the hypothesis.',
      },
      {
        path: 'resolution.reject_excess',
        label: 'Reject at excess ≤',
        kind: 'number',
        min: -1,
        max: 0,
        step: 0.01,
        defaultValue: -0.03,
        help: 'Excess return at or below which the hypothesis is rejected.',
      },
      {
        path: 'resolution.benchmark',
        label: 'Benchmark',
        kind: 'text',
        defaultValue: 'SPY',
        help: 'The symbol excess return is measured against.',
      },
    ],
  },
  {
    id: 'decline',
    title: 'Declined names',
    lead: 'A name you refused comes back only when something about it got better.',
    fields: [
      {
        path: 'decline_memory.enabled',
        label: 'Remember refusals',
        kind: 'bool',
        defaultValue: true,
        help: 'On: a dismissed name is proposed again only when its reading improved, and the card says what changed. Off: every run re-proposes it. This is why the same eleven symbols arrived two mornings running.',
      },
      {
        path: 'decline_memory.lookback_days',
        label: 'Remember for (days)',
        kind: 'number',
        min: 1,
        max: 365,
        step: 1,
        defaultValue: 90,
        help: 'How far back a refusal is remembered. Not a cooldown — nothing is re-proposed because time passed. Past this the run simply has no record of the decline.',
      },
      {
        path: 'decline_memory.min_score_delta',
        label: 'Score move that counts',
        kind: 'number',
        min: 0,
        max: 100,
        step: 0.5,
        defaultValue: 5,
        help: 'How far the score must rise before a refused name is worth showing again. A fall never counts. The other triggers — path advancing, grade up a notch, a new qualifying event, a regime flip — are definitions, not thresholds, so they are not editable here.',
      },
    ],
  },
  {
    id: 'planner',
    title: 'Planner',
    lead: 'Whether a model writes the run plan, or the fixed heuristic does.',
    fields: [
      {
        path: 'use_llm_plan',
        label: 'LLM plan',
        kind: 'bool',
        help: 'Not set = follow the pod default (BIFROST_HARNESS_LLM_PLAN). On = deepseek-chat → gpt-4o-mini → heuristic, each attempt recorded.',
      },
      {
        path: 'llm_model',
        label: 'Planner model',
        kind: 'text',
        placeholder: 'deepseek-chat',
        help: 'Override the first planner model.',
      },
    ],
  },
]

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

export function getPath(obj: Record<string, unknown>, path: string): unknown {
  let cur: unknown = obj
  for (const seg of path.split('.')) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return undefined
    cur = (cur as Record<string, unknown>)[seg]
  }
  return cur
}

/** Immutable set; creates the nested objects the path needs. */
export function setPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const [head, ...rest] = path.split('.')
  if (rest.length === 0) return { ...obj, [head]: value }
  return { ...obj, [head]: setPath(rec(obj[head]), rest.join('.'), value) }
}

/**
 * The default the runtime will apply for a field.
 *
 * Prefers the server's own normalisation over the constant in this file: the
 * constants are a copy of `policy_schema.py` and a copy is a drift waiting to
 * happen. They stand in when the backend cannot be reached.
 */
export function defaultFor(
  field: PolicyField,
  serverDefaults?: Record<string, unknown> | null,
): unknown {
  if (serverDefaults) {
    const fromServer = getPath(serverDefaults, field.path)
    if (fromServer !== undefined) return fromServer
  }
  return field.defaultValue
}

/** The value the runtime will use: the stored one, else the default. */
export function effectiveValue(
  policy: Record<string, unknown>,
  field: PolicyField,
  serverDefaults?: Record<string, unknown> | null,
): unknown {
  const v = getPath(policy, field.path)
  return v === undefined || v === null ? defaultFor(field, serverDefaults) : v
}

export function fieldText(field: PolicyField, value: unknown): string {
  if (value === undefined || value === null) return 'not set'
  if (Array.isArray(value)) return value.length ? value.map(String).join(', ') : '(none)'
  if (typeof value === 'boolean') return value ? 'on' : 'off'
  if (field.kind === 'select') {
    const opt = field.options?.find((o) => o.value === String(value))
    return opt ? opt.label.split(' — ')[0] : String(value)
  }
  return String(value)
}

export type ParsedInput = { ok: true; value: unknown } | { ok: false; error: string }

/** Turn what was typed into the value the field stores; empty clears the key. */
export function parseFieldInput(field: PolicyField, raw: string): ParsedInput {
  const s = raw.trim()
  switch (field.kind) {
    case 'number': {
      if (!s) return { ok: true, value: null }
      const n = Number(s)
      if (!Number.isFinite(n)) return { ok: false, error: 'Not a number' }
      if (field.min != null && n < field.min) return { ok: false, error: `Below ${field.min}` }
      if (field.max != null && n > field.max) return { ok: false, error: `Above ${field.max}` }
      if (field.step === 1 && !Number.isInteger(n)) return { ok: false, error: 'Whole number' }
      return { ok: true, value: n }
    }
    case 'symbols':
      return {
        ok: true,
        value: s
          .split(/[\s,]+/)
          .map((x) => x.trim().toUpperCase())
          .filter(Boolean),
      }
    case 'stages': {
      const stages = s
        .split(/[\s,]+/)
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean)
      if (!stages.length) return { ok: false, error: 'At least one stage' }
      return { ok: true, value: stages }
    }
    case 'text':
    case 'select':
      return { ok: true, value: s || null }
    case 'bool':
      return { ok: true, value: s === 'true' }
  }
}

export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return a == null && b == null
  if (typeof a !== typeof b) return false
  if (typeof a === 'object') return JSON.stringify(a) === JSON.stringify(b)
  return false
}

/**
 * The patch to propose. Nested keys carry only the sub-keys that changed —
 * the server deep-merges `layers`, `option_overlay`, `discovery_assist`,
 * `resolution` and `triage`, so the ledger records the change, not the whole
 * object. Refuses a top-level key the Owner path does not accept.
 */
export function buildSuggestion(edits: Record<string, unknown>): Record<string, unknown> {
  let patch: Record<string, unknown> = {}
  for (const [path, value] of Object.entries(edits)) {
    const top = path.split('.')[0]
    if (!(OWNER_POLICY_KEYS as readonly string[]).includes(top))
      throw new Error(`${top} is not an Owner-editable policy key`)
    patch = setPath(patch, path, value)
  }
  return patch
}

/** "max_candidates 3 → 8 · triage.deep_judge_top_n 0 → 5" */
export function describeEdits(policy: Record<string, unknown>, edits: Record<string, unknown>): string {
  return Object.entries(edits)
    .map(([path, next]) => {
      const field = POLICY_SECTIONS.flatMap((s) => s.fields).find((f) => f.path === path)
      const prev = getPath(policy, path)
      const show = (v: unknown) => (field ? fieldText(field, v) : v == null ? 'not set' : JSON.stringify(v))
      return `${path} ${show(prev)} → ${show(next)}`
    })
    .join(' · ')
}

export function objectivePath(objectiveId: string): string {
  return `/research/loop/objectives/${encodeURIComponent(objectiveId)}`
}
