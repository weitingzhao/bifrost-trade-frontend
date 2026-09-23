/**
 * The four structures the design draws, with its two lines per card: how the
 * trade is put on, and what it needs.
 *
 * Only the cash-secured put is screened by the engine. The design itself marks
 * one of its four as "not enabled in the engine yet"; here three are, and each
 * says so on the line the design uses for the constraint, rather than being
 * hidden — a structure missing from the picker reads as one nobody trades.
 */
export interface StructureOption {
  value: string
  label: string
  /** How it is put on — the design's `sub`. */
  sub: string
  /** What it needs, or why the engine refuses it. */
  needs: string
  enabled: boolean
}

export const STRUCTURE_TYPES: readonly StructureOption[] = [
  {
    value: 'cash_secured_put',
    label: 'Cash-secured put',
    sub: 'STO put',
    needs: 'cash = strike × 100 · Δ −.15 to −.35',
    enabled: true,
  },
  {
    value: 'covered_call',
    label: 'Covered call',
    sub: 'STO call vs shares',
    needs: 'needs 100 sh per contract · not screened by the engine yet',
    enabled: false,
  },
  {
    value: 'bull_put_spread',
    label: 'Bull put spread',
    sub: 'STO put · BTO lower put',
    needs: 'defined risk · two legs priced together, which the engine does not do yet',
    enabled: false,
  },
  {
    value: 'bear_call_spread',
    label: 'Bear call spread',
    sub: 'STO call · BTO higher call',
    needs: 'not enabled in the engine yet',
    enabled: false,
  },
]

export const STRUCTURE_LABEL: Record<string, string> = Object.fromEntries(
  STRUCTURE_TYPES.map(({ value, label }) => [value, label]),
)
