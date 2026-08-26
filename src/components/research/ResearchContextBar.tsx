import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SymbolPicker } from '@/components/symbol'
import { useResearchContext } from '@/hooks/useResearchContext'

export interface ResearchContextBarProps {
  /** Hide date picker when the page has no date dimension */
  showDate?: boolean
  symbolPlaceholder?: string
  className?: string
}

export function ResearchContextBar({
  showDate = true,
  symbolPlaceholder = 'SPX',
  className,
}: ResearchContextBarProps) {
  const { symbol, dateInput, setSymbol, setDate } = useResearchContext()

  return (
    <Card variant="elevated" className={className}>
      <CardContent className="flex flex-wrap items-center gap-3 px-3 py-2">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">Symbol:</span>
        <SymbolPicker
          value={symbol}
          onSelect={setSymbol}
          className="w-28"
          placeholder={symbolPlaceholder}
          showPin
        />
        {showDate ? (
          <>
            <span className="shrink-0 text-xs font-medium text-muted-foreground">Date:</span>
            <Input
              type="date"
              value={dateInput}
              onChange={(e) => setDate(e.target.value)}
              className="h-7 w-36 font-mono text-sm"
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
