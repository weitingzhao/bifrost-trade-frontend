import { Input } from '@/components/ui/input'
import { segmentGroupClass, segmentButtonClass } from '@/components/data-display'

export interface AccountFilter {
  host: boolean
  secondary: boolean
}

interface Props {
  filterSymbol: string
  onFilterSymbolChange: (v: string) => void
  filterExpiry: string
  onFilterExpiryChange: (v: string) => void
  hostAccountId?: string
  secondaryAccountId?: string
  accountFilter?: AccountFilter
  onAccountFilterChange?: (f: AccountFilter) => void
}

export function PositionsFilterBar({
  filterSymbol,
  onFilterSymbolChange,
  filterExpiry,
  onFilterExpiryChange,
  hostAccountId,
  secondaryAccountId,
  accountFilter,
  onAccountFilterChange,
}: Props) {
  const showAccountBubbles = !!(hostAccountId || secondaryAccountId) && accountFilter && onAccountFilterChange

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Input
        placeholder="Symbol"
        value={filterSymbol}
        onChange={(e) => onFilterSymbolChange(e.target.value)}
        className="h-8 w-28 text-sm font-mono"
      />
      <Input
        placeholder="YYYYMMDD"
        value={filterExpiry}
        onChange={(e) => onFilterExpiryChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
        className="h-8 w-28 text-sm font-mono"
        maxLength={8}
        title="Option expiry filter (YYYYMMDD prefix match)"
      />

      {showAccountBubbles && (
        <div className={segmentGroupClass('sm')} role="group" aria-label="Account filter">
          {hostAccountId && (
            <button
              type="button"
              onClick={() => onAccountFilterChange({ ...accountFilter, host: !accountFilter.host })}
              className={segmentButtonClass(accountFilter.host, 'sm')}
              title={`Host account: ${hostAccountId}`}
              aria-pressed={accountFilter.host}
            >
              Host
            </button>
          )}
          {secondaryAccountId && secondaryAccountId !== hostAccountId && (
            <button
              type="button"
              onClick={() => onAccountFilterChange({ ...accountFilter, secondary: !accountFilter.secondary })}
              className={segmentButtonClass(accountFilter.secondary, 'sm')}
              title={`Secondary account: ${secondaryAccountId}`}
              aria-pressed={accountFilter.secondary}
            >
              Secondary
            </button>
          )}
        </div>
      )}
    </div>
  )
}
