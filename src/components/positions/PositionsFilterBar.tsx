import { Input } from '@/components/ui/input'

interface Props {
  filterSymbol: string
  onFilterSymbolChange: (v: string) => void
  filterExpiry: string
  onFilterExpiryChange: (v: string) => void
}

export function PositionsFilterBar({
  filterSymbol,
  onFilterSymbolChange,
  filterExpiry,
  onFilterExpiryChange,
}: Props) {
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
    </div>
  )
}
