import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { cn } from '@/lib/utils'
import type { OptionsFocusTableId } from '@/utils/dataOverview/optionFocusDataset'
import type { WatchlistStocksTableId } from '@/utils/dataOverview/stockFocusDataset'
import type { WatchlistTableSelection, WatchlistUnifiedDataset } from '@/utils/dataOverview/watchlistUnifiedFocus'

function TableChip({
  label,
  title,
  selected,
  onSelect,
}: {
  label: string
  title: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs transition-colors',
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground hover:bg-muted/50',
      )}
      title={title}
      aria-pressed={selected}
      onClick={onSelect}
    >
      {label}
    </button>
  )
}

export function WatchlistCoverageFocusChips({
  value,
  onChange,
}: {
  value: WatchlistUnifiedDataset
  onChange: (next: WatchlistTableSelection) => void
}) {
  const pick = (id: WatchlistTableSelection) => () => onChange(id)

  const optionChip = (id: OptionsFocusTableId, title: string) => (
    <TableChip
      key={id}
      label={id}
      title={title}
      selected={value === id}
      onSelect={pick(id)}
    />
  )

  const stockChip = (id: WatchlistStocksTableId) => (
    <TableChip
      key={id}
      label={id}
      title={id}
      selected={value === id}
      onSelect={pick(id)}
    />
  )

  return (
    <fieldset className="space-y-3">
      <legend className="inline-flex items-center gap-1.5 text-sm font-medium">
        Table focus
        <InfoTooltip text="Pick one table — watchlist coverage loads when you select a chip. FDN / SNP / STG / RPT groupings match Legacy Data Overview Detail." />
      </legend>

      <div className="grid gap-3 sm:grid-cols-[3rem_1fr] items-start">
        <span className="text-xs font-semibold text-muted-foreground pt-1" title="Fundamental">
          FDN
        </span>
        <div className="flex flex-wrap gap-2">
          {stockChip('stock_day')}
          {optionChip('option_day', 'Daily option bars')}
          {optionChip('option_contracts', 'Reference / contract definitions')}
          {stockChip('stock_min')}
          {optionChip('option_min', 'Minute option bars')}
        </div>

        <span className="text-xs font-semibold text-muted-foreground pt-1" title="Snapshots">
          SNP
        </span>
        <div className="flex flex-wrap gap-2">
          {optionChip('option_snapshots', 'Chain & intraday greeks')}
          <span
            className="inline-flex items-center rounded-md border border-dashed px-2 py-1 font-mono text-xs text-muted-foreground"
            title="Planned: stock_snapshots — not in PostgreSQL yet"
          >
            stock_snapshots
          </span>
        </div>

        <span className="text-xs font-semibold text-muted-foreground pt-1" title="Staging">
          STG
        </span>
        <div className="flex flex-wrap gap-2">
          {optionChip('option_snapshots_with_underlying_day', 'SQL view joined to stock_day')}
          {optionChip('option_expiration_cache', 'Expiration cache')}
          {optionChip('option_open_interest_daily', 'EOD open interest')}
        </div>

        <span className="text-xs font-semibold text-muted-foreground pt-1" title="Reports">
          RPT
        </span>
        <div className="flex flex-wrap gap-2">
          {optionChip('report_option_atm_iv_daily', 'ATM IV daily')}
          {optionChip('report_option_max_pain_daily', 'Max pain daily')}
        </div>
      </div>
    </fieldset>
  )
}
