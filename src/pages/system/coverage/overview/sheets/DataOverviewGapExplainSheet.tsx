import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function DataOverviewGapExplainSheet({
  open,
  onClose,
  variant,
}: {
  open: boolean
  onClose: () => void
  variant: 'contracts' | 'snapshots' | 'option_day_bars' | 'option_min_bars'
}) {
  const title =
    variant === 'snapshots'
      ? 'Gap scope — option_snapshots'
      : variant === 'option_day_bars'
        ? 'Gap scope — option_day'
        : variant === 'option_min_bars'
          ? 'Gap scope — option_min'
          : 'Gap scope — option_contracts'

  const body =
    variant === 'snapshots'
      ? 'Ref counts contracts from Massive GET /v3/snapshot/options/{underlying} per expiry, intersected with option_contracts. Gap compares snapshot coverage vs reference shape. Run Check before Fill row gap.'
      : variant === 'contracts'
        ? 'Ref is the paginated Massive reference contract list per expiry. Row gap is Massive total minus matched PG rows. Cov% is matched PG rows divided by Ref. Column comp is separate from row alignment.'
        : 'Ref is distinct (expiry, strike, right) keys in option_contracts. Covered means at least one bar exists in the focus table for that key.'

  return (
    <Dialog open={open} onOpenChange={next => { if (!next) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{body}</p>
      </DialogContent>
    </Dialog>
  )
}
