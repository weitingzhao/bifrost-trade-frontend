/**
 * Facts the judgment strip and the model-assumptions table quote. Nothing here
 * recomputes pool / used / gate — those come from deriveBackingJudgment.
 */
import { HOUSE_GATE_PCT, type BackingJudgment } from '@/utils/backingJudgment'

export interface BackingAssumptionRow {
  key: string
  value: string
  source: string
  /** Grey lamp: not computed, not a fault. */
  unknown?: boolean
}

export function backingAssumptionRows(input: {
  judgment: BackingJudgment
  /** 1 − Cushion ceiling on Room to add (Owner, adjustable). */
  pressureCeiling: number
}): readonly BackingAssumptionRow[] {
  const gatePct = Math.round(HOUSE_GATE_PCT * 100)
  const pressurePct = Math.round(input.pressureCeiling * 100)
  const usedShare =
    input.judgment.usedPct == null
      ? 'unknown'
      : `${Math.round(input.judgment.usedPct * 100)}% of pool`
  return [
    {
      key: 'Pool definition',
      value: 'Stocks + cash/SGOV + income ETFs. Income counts via buying power, not as cash.',
      source: 'Backing pool ring · same slices',
    },
    {
      key: 'Used',
      value: `Stock backing short calls + cash/SGOV backing short puts (${usedShare}). Not broker maintenance.`,
      source: 'coverByAccountSymbol + put cash need',
    },
    {
      key: 'House gate',
      value: `${gatePct}% of pool — auto-derisk line`,
      source: 'House line on this page. Rules does not read it yet.',
    },
    {
      key: 'Pressure ceiling',
      value: `${pressurePct}% of 1 − Cushion, adjustable on Room to add`,
      source: 'Different quantity from the house gate. Broker Cushion, not pool usage.',
    },
    {
      key: 'Gate hit point',
      value: 'Not computed',
      source: 'No backing-usage path under a spot shock yet. Cited as unknown, not guessed.',
      unknown: true,
    },
    {
      key: 'Plan reserves',
      value: 'None — no structured plans',
      source: 'Intent, not a broker number. Empty until Trade Plans exists as storage.',
      unknown: true,
    },
    {
      key: 'Maintenance basis',
      value: 'Account-level Cushion / ExcessLiquidity, read from the broker. Not per position.',
      source: 'Margin by account strip',
    },
  ]
}
