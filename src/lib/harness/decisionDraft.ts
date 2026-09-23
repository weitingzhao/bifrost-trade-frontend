/**
 * A decision draft, in the shape a reader can act on.
 *
 * `research.loop.draft_decision` (bifrost-research `mcp/tools/write_loop.py`)
 * takes a verdict, a rationale and two free-form dicts — `risk_hint` and
 * `sizing_hint` — and the curator fills them differently every time: fourteen
 * pending on DEV (2026-09-13) used seven key sets for risk and five for sizing.
 * The Inbox rendered only the rationale, so the verdict ("avoid"), the stop and
 * what would prove it wrong never reached the card.
 *
 * So the keys that recur get a place and a label, and every other key is still
 * shown under its own name — a field the curator took the trouble to write is
 * not dropped because this file has not met it before.
 */
type Rec = Record<string, unknown>

const isRec = (v: unknown): v is Rec => v != null && typeof v === 'object' && !Array.isArray(v)
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const texts = (v: unknown): string[] =>
  Array.isArray(v) ? v.flatMap((x) => (typeof x === 'string' && x.trim() ? [x.trim()] : typeof x === 'number' ? [String(x)] : [])) : []

/** `early_trigger` → `early trigger`. */
export function hintLabel(key: string): string {
  return key.replace(/_/g, ' ')
}

/** A hint value as one line: scalars as they are, lists joined, objects as `key value` pairs. */
export function hintValue(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(hintValue).join(' / ')
  if (isRec(value)) return Object.entries(value).map(([k, v]) => `${hintLabel(k)} ${hintValue(v)}`).join(' · ')
  return String(value)
}

export interface HintLine {
  label: string
  value: string
}

/**
 * What each verdict means, from the design's own table (Rev 2026-09-22.7).
 *
 * The verdict is not coloured by strength, and this is why: it is a word on
 * two axes — an action and a condition — so a strength ramp would read
 * `avoid_watch_only` as worse than `watch_only_no_entry` when neither writes
 * anything and the difference is what to do, not how bad it is. The slug says
 * the action; the gloss says the condition.
 */
export const VERDICT_GLOSS: Readonly<Record<string, string>> = {
  no_new_action: 'nothing to do today; the hypothesis stays open',
  watch_only_no_entry: 'watch it; do not enter',
  watch_defined_risk_only: 'watch it; if entered, defined risk only',
  avoid_watch_only: 'avoid; keep watching',
  avoid_at_current_price_pullback_watch: 'avoid at this price; watch for a pullback',
}

/** The three walls, in the design's order, on one line beside each other. */
const WALLS: readonly (readonly [string, string])[] = [
  ['put_wall', 'PUT WALL'],
  ['zero_gamma', 'ZERO Γ'],
  ['call_wall', 'CALL WALL'],
]

export interface DecisionDraftView {
  verdict: string | null
  /** One sentence for what the verdict asks, or null for a slug we do not know. */
  verdictGloss: string | null
  /** `PUT WALL 170 · ZERO Γ 176.5 · CALL WALL 185`, or `not stated`. */
  levelsLine: string
  /** The single risk sentence, or `not stated`. */
  keyRisk: string
  hypothesisId: string | null
  rationale: string | null
  /** Stop, targets, levels and early trigger — the numbers, on one line. */
  levels: HintLine[]
  invalidation: string[]
  caveats: string[]
  riskOther: HintLine[]
  sizingHeadline: string | null
  sizing: HintLine[]
}

const RISK_KNOWN = new Set(['stop', 'targets', 'levels', 'reference_levels', 'early_trigger', 'invalidation', 'caveats'])
const SIZING_HEADLINE = ['recommended', 'action', 'sizing'] as const
const SIZING_ORDER = ['conditional', 'tranche', 'max_risk_pct_netliq', 'instrument', 'notional_note', 'notional', 'note']

export function decisionDraftView(payload: Rec): DecisionDraftView {
  const risk = isRec(payload.risk_hint) ? payload.risk_hint : {}
  const sizing = isRec(payload.sizing_hint) ? payload.sizing_hint : {}

  // DEV writes the walls under `reference_levels`; the design's fixture calls
  // the same object `levels`. Read both — one of them is the one this payload
  // used, and guessing wrong printed `not stated` beside three walls that were
  // right there.
  const walls = isRec(risk.reference_levels) ? risk.reference_levels : isRec(risk.levels) ? risk.levels : {}
  const wallParts = WALLS.filter(([k]) => walls[k] != null).map(([k, label]) => `${label} ${hintValue(walls[k])}`)

  const levels: HintLine[] = []
  if (risk.stop != null) levels.push({ label: 'stop', value: hintValue(risk.stop) })
  if (Array.isArray(risk.targets) && risk.targets.length > 0) levels.push({ label: 'targets', value: hintValue(risk.targets) })
  // The three walls have their own line; anything else `levels` carries keeps
  // the label/value list, so a key the design did not name is not dropped.
  for (const [k, v] of Object.entries(walls)) {
    if (WALLS.some(([wall]) => wall === k)) continue
    levels.push({ label: hintLabel(k), value: hintValue(v) })
  }
  if (text(risk.early_trigger)) levels.push({ label: 'early trigger', value: text(risk.early_trigger)! })

  const riskOther = Object.entries(risk)
    .filter(([k]) => !RISK_KNOWN.has(k) && k !== 'key_risk')
    .map(([k, v]) => ({ label: hintLabel(k), value: hintValue(v) }))

  const headlineKey = SIZING_HEADLINE.find((k) => text(sizing[k]))
  const sizingLines: HintLine[] = []
  const seen = new Set<string>(headlineKey ? [headlineKey] : [])
  for (const k of SIZING_ORDER) {
    if (sizing[k] == null || seen.has(k)) continue
    seen.add(k)
    sizingLines.push(
      k === 'max_risk_pct_netliq' && typeof sizing[k] === 'number'
        ? { label: 'max risk', value: `${sizing[k]}% of NetLiq` }
        : { label: hintLabel(k), value: hintValue(sizing[k]) },
    )
  }
  for (const [k, v] of Object.entries(sizing)) {
    // 0 here is "size not decided", not a zero position, and a row reading
    // `delta 0` says the opposite of what the curator meant.
    if ((k === 'delta' || k === 'add_size') && v === 0) continue
    if (!seen.has(k)) sizingLines.push({ label: hintLabel(k), value: hintValue(v) })
  }

  const verdict = text(payload.verdict)
  return {
    verdict,
    verdictGloss: (verdict && VERDICT_GLOSS[verdict]) || null,
    levelsLine: wallParts.length > 0 ? wallParts.join(' · ') : 'not stated',
    keyRisk: text(risk.key_risk) ?? 'not stated',
    hypothesisId: text(payload.hypothesis_id),
    rationale: text(payload.rationale),
    levels,
    invalidation: texts(risk.invalidation),
    caveats: texts(risk.caveats),
    riskOther,
    sizingHeadline: headlineKey ? text(sizing[headlineKey]) : null,
    sizing: sizingLines,
  }
}
