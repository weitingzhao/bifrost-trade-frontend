/**
 * The one line that explains an option face full of empty readings on a name
 * whose chain lists only adjusted contracts (`adjustedListing.ts`). Grey, not
 * amber: nothing failed and nothing is owed — Research leaves adjusted
 * contracts out by rule, so the readings are empty by design (§11.3.1).
 */
import { ViewState } from '@bifrost/ui'
import { useAdjustedOnlyListing } from './useAdjustedOnlyListing'

export function SymbolAdjustedOnlyNote({ symbol }: { symbol: string }) {
  const listing = useAdjustedOnlyListing(symbol)
  if (!listing) return null
  const roots = listing.adjustedRoots.join(', ')
  return (
    <ViewState
      kind="empty"
      layout="strip"
      title="Only adjusted contracts are listed — options metrics exclude them"
      detail={`${symbol}’s nearest expiry lists ${roots} contracts only — what a corporate action leaves behind: the deliverable is no longer 100 shares, so Research leaves them out of max pain, ATM IV, GEX, flow and PCR. Those readings stay empty by rule, not for want of data.`}
    />
  )
}
