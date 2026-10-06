/**
 * The one line that explains an option face full of empty readings on a name
 * whose chain lists only adjusted contracts — CUE after its 1:30 reverse split
 * lists only `CUE1`. Research counts them for the Dossier batch
 * (`option_listing`, research 0.193.0, TD-159) by the same rule that leaves
 * them out of max pain, ATM IV, GEX, flow and PCR, so this page does not test
 * tickers itself. Grey, not amber: nothing failed and nothing is owed — the
 * readings are empty by rule (§11.3.1).
 */
import { ViewState } from '@bifrost/ui'
import { adjustedOnlyListing } from '@/api/research/exhibit'
import { useDossier } from '@/hooks/useDossier'

export function SymbolAdjustedOnlyNote({ symbol }: { symbol: string }) {
  const { optionListing } = useDossier(symbol)
  if (!adjustedOnlyListing(optionListing)) return null
  const roots = optionListing.adjusted_roots.join(', ') || 'adjusted'
  return (
    <ViewState
      kind="empty"
      layout="strip"
      title="Only adjusted contracts are listed — options metrics exclude them"
      detail={`${symbol} lists ${optionListing.adjusted_contracts} ${roots} contracts and no standard series (open interest ${optionListing.as_of ?? '—'}) — what a corporate action leaves behind: the deliverable is no longer 100 shares, so Research leaves them out of max pain, ATM IV, GEX, flow and PCR. Those readings stay empty by rule, not for want of data.`}
    />
  )
}
