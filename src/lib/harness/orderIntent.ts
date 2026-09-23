/**
 * An order intent, read for the card that draws it.
 *
 * It is the only draft kind carrying a concrete structure, and the only one
 * that must never look like a ticket: `d10` is BLOCKED and `advisory` true on
 * every one of them, so the design's answer (Rev 2026-09-22.7) is a **sketch** —
 * a dashed box, no inputs, no buttons, no exit to Plans.
 *
 * Legs are drawn as received and never corrected. Where the template's name
 * disagrees with them, the card says so and keeps both: what the curator wrote
 * is the fact, and a card that quietly fixed it would hide a real defect.
 */
import { readStr as str } from '@/lib/readUnknown'

export interface IntentLeg {
  side: string | null
  right: string | null
  strike: number | null
  symbol: string | null
  expiry: string | null
  qty: number | null
}

export interface OrderIntentView {
  template: string | null
  legs: IntentLeg[]
  /** True when a `*_spread` template is not drawn with both a buy and a sell. */
  mismatch: boolean
  /** The sentence under the table when it is, naming both halves. */
  mismatchNote: string | null
  /** True for a template that is a condition to watch rather than a structure. */
  noLegs: boolean
}

function isRec(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function orderIntentView(payload: Record<string, unknown>): OrderIntentView {
  const template = str(payload.strategy_template)
  const legs: IntentLeg[] = (Array.isArray(payload.legs) ? payload.legs : []).filter(isRec).map((l) => ({
    side: str(l.side),
    right: str(l.right),
    strike: num(l.strike),
    symbol: str(l.symbol),
    expiry: str(l.expiry),
    qty: num(l.qty_hint),
  }))

  const sides = legs.map((l) => l.side)
  const mismatch =
    /_spread$/.test(template ?? '') && !(sides.includes('buy') && sides.includes('sell'))

  return {
    template,
    legs,
    mismatch,
    mismatchNote: mismatch
      ? `The legs do not read as a ${(template ?? '').replace(/_/g, ' ')}: that needs one buy and one sell, and these are ${
          sides.length > 0 ? `all ${[...new Set(sides)].join(' / ')}` : 'not given'
        }. Drawn as received — raised with Research.`
      : null,
    noLegs: legs.length === 0,
  }
}
