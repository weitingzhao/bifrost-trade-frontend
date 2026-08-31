import { useQuery } from '@tanstack/react-query'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchSepaPriceGaps, finGapsFetcher } from '@/api/research/stockDataReadiness'
import type { FinDrawerKind, SepaFinGapRow, SepaPriceGapItem } from '@/types/stockDataReadiness'

const FIN_TITLES: Record<FinDrawerKind, string> = {
  income: 'Income statement gaps',
  balance: 'Balance sheet gaps',
  cash: 'Cash flow gaps',
  ratios: 'Ratios gaps',
  sint: 'Short interest gaps',
  svol: 'Short volume gaps',
}

export function PriceGapsSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['research', 'stock-data-readiness', 'price-gaps'],
    queryFn: fetchSepaPriceGaps,
    enabled: open,
    staleTime: 30_000,
  })
  const items: SepaPriceGapItem[] = data?.ok ? data.items ?? [] : []
  const loadError = !data?.ok ? (data?.error ?? (error instanceof Error ? error.message : null)) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Price / stock_day gaps</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {isLoading && <Skeleton className="h-40 w-full" />}
          {loadError && <p className="text-sm text-destructive">{loadError}</p>}
          {!isLoading && !loadError && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Bars</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.slice(0, 200).map(row => (
                    <TableRow key={row.symbol}>
                      <TableCell className="font-mono text-xs">{row.symbol}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">
                        {row.reason}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{row.bar_rows}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {items.length > 200 && (
                <p className="text-xs text-muted-foreground mt-2">Showing first 200 of {items.length} rows.</p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function FinGapsSheet({
  kind,
  open,
  onOpenChange,
}: {
  kind: FinDrawerKind | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['research', 'stock-data-readiness', 'fin-gaps', kind],
    queryFn: () => finGapsFetcher(kind!)(),
    enabled: open && kind != null,
    staleTime: 30_000,
  })
  const items: SepaFinGapRow[] = data?.ok ? data.gaps ?? [] : []
  const loadError = !data?.ok ? (data?.error ?? (error instanceof Error ? error.message : null)) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{kind ? FIN_TITLES[kind] : 'Financial gaps'}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {isLoading && <Skeleton className="h-40 w-full" />}
          {loadError && <p className="text-sm text-destructive">{loadError}</p>}
          {!isLoading && !loadError && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Gap reason</TableHead>
                    <TableHead className="text-right">Q rows</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.slice(0, 200).map(row => (
                    <TableRow key={row.symbol}>
                      <TableCell className="font-mono text-xs">{row.symbol}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">
                        {row.gap_reason ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {row.quarterly_rows ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {items.length > 200 && (
                <p className="text-xs text-muted-foreground mt-2">Showing first 200 of {items.length} rows.</p>
              )}
            </div>
          )}
          <Button variant="outline" size="sm" className="mt-4" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
