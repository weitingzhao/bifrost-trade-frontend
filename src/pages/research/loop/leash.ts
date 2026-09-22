/**
 * The leash, as the Decision Inbox states it: what an unattended Autopilot run
 * accepts without you, and this deployment's numbers for it.
 *
 * The design's panel ("Leash · What Autopilot decides alone") says it accepts
 * objective status posts, regime notes and repeat batches. That is not what the
 * runtime does. The rules below are `copilot/harness/leash.py`
 * (research-loop-automation D3): a candidate is accepted on its own only when
 * all four hold, and only while the trust matrix grants L0. Everything else
 * waits here, and accepting a candidate opens a hypothesis — never an order.
 */

/** `DEFAULT_MIN_SOURCE_HIT_RATE` in leash.py — the floor when an objective sets none. */
export const DEFAULT_MIN_SOURCE_HIT_RATE = 0.45
/** `MIN_SOURCE_JUDGED` — fewer settled outcomes than this is not a record yet. */
export const MIN_SOURCE_JUDGED = 5

export const LEASH_CONDITIONS: readonly { id: string; text: string }[] = [
  { id: 'agree', text: 'every judge model reached the same stance' },
  { id: 'validate', text: 'validate did not block it, and the net stance is support or caution' },
  { id: 'evidence', text: 'the evidence it was selected on is measured' },
  {
    id: 'record',
    text: `the source's settled hit rate clears the objective's floor, on at least ${MIN_SOURCE_JUDGED} outcomes`,
  },
]

/**
 * A hit rate as the leash prints it — whole percent, no decimal.
 *
 * Three surfaces read this model (the Inbox aside, the Console panel, the
 * objective page) and each had rounded it for itself. A floor and a record
 * compared at different precisions is how "58% clears 45%" and "58% is below
 * 58%" end up on the same screen.
 */
export const leashPct = (x: number) => `${Math.round(x * 100)}%`

export type LeashStanding = 'clears' | 'below' | 'no-record'

export interface ObjectiveLeash {
  id: string
  title: string
  floor: number
  floorIsDefault: boolean
  hitRate: number | null
  judged: number
  horizonDays: number | null
  standing: LeashStanding
}

/**
 * Each active objective's floor against its settled record.
 *
 * The record is the objective's own summary from the Autopilot standing. The
 * runtime judges each candidate against its source's longest judged horizon,
 * so this is the objective-level picture, not a per-candidate verdict — each
 * batch card carries its own gate result.
 */
export function objectiveLeash(
  objectives: readonly { id: string; title: string; policy_json?: Record<string, unknown> | null }[],
  standing: readonly {
    id: string
    track_record?: { hit_rate?: number | null; judged?: number | null; horizon_days?: number | null } | null
  }[],
): ObjectiveLeash[] {
  return objectives.map((o) => {
    const set = o.policy_json?.min_source_hit_rate
    const floorIsDefault = typeof set !== 'number' || !Number.isFinite(set)
    const floor = floorIsDefault ? DEFAULT_MIN_SOURCE_HIT_RATE : (set as number)
    const record = standing.find((s) => s.id === o.id)?.track_record ?? null
    const hitRate = typeof record?.hit_rate === 'number' ? record.hit_rate : null
    const judged = typeof record?.judged === 'number' ? record.judged : 0
    const horizonDays = typeof record?.horizon_days === 'number' ? record.horizon_days : null
    const standingOf: LeashStanding =
      hitRate == null || judged < MIN_SOURCE_JUDGED ? 'no-record' : hitRate >= floor ? 'clears' : 'below'
    return { id: o.id, title: o.title, floor, floorIsDefault, hitRate, judged, horizonDays, standing: standingOf }
  })
}
