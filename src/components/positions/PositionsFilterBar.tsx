import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

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
        <div className="flex rounded-md border overflow-hidden text-xs ml-2">
          {hostAccountId && (
            <button
              type="button"
              onClick={() => onAccountFilterChange({ ...accountFilter, host: !accountFilter.host })}
              className={cn(
                'px-3 py-1 transition-colors font-medium',
                accountFilter.host ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
              title={`Host account: ${hostAccountId}`}
            >
              HOST
            </button>
          )}
          {secondaryAccountId && secondaryAccountId !== hostAccountId && (
            <button
              type="button"
              onClick={() => onAccountFilterChange({ ...accountFilter, secondary: !accountFilter.secondary })}
              className={cn(
                'px-3 py-1 transition-colors font-medium',
                accountFilter.secondary ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
              title={`Secondary account: ${secondaryAccountId}`}
            >
              Secondary
            </button>
          )}
        </div>
      )}
    </div>
  )
}
