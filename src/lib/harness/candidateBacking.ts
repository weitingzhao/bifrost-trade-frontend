/**
 * What each account could still back for a candidate (design Rev 2026-09-22.7).
 *
 * The prototype reads `HOST 1 · SEC 5 at 300P`: per account, how many more
 * contracts the shares on hand would cover. Like `Rule that fits` this is a
 * front-end join by the design's ruling — it is a fact about the book, not
 * about the batch, and it moves when a position does rather than when the run
 * does.
 *
 * `moreCalls` is the reading, not `spare`: spare is shares and the question is
 * contracts, and a row saying 250 spare shares next to a candidate asks the
 * reader to divide. Extracted from the same cover rows Backing & Model reads
 * (§14.2), so the two pages cannot answer this differently.
 */
export interface BackingCoverRow {
  accountId: string
  symbol: string
  moreCalls: number
}

export interface CandidateBacking {
  /** What the cell prints, e.g. `HOST 1 · SEC 5`. */
  label: string
  /** True when at least one account could back a contract. */
  any: boolean
  title: string | null
}

const NOTHING: CandidateBacking = {
  label: 'none',
  any: false,
  title: 'No account holds shares that would back a contract in this name.',
}

export function candidateBacking(
  symbol: string,
  rows: readonly BackingCoverRow[] | undefined,
  labelFor: (accountId: string) => string,
): CandidateBacking {
  const key = symbol.trim().toUpperCase()
  if (!key || !rows?.length) return NOTHING

  const mine = rows.filter((r) => r.symbol.trim().toUpperCase() === key && r.moreCalls > 0)
  if (mine.length === 0) return NOTHING

  // Biggest first: the account that could actually take the trade leads.
  const sorted = [...mine].sort((a, b) => b.moreCalls - a.moreCalls)
  return {
    label: sorted.map((r) => `${labelFor(r.accountId)} ${r.moreCalls}`).join(' · '),
    any: true,
    title: `Contracts the shares on hand would back, per account. Position sizing lives on Backing & Model; this is what the book could carry, not what it should.`,
  }
}
