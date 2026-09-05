/**
 * The scope bar: the one row that decides what the whole page is about.
 *
 * Accounts, symbol, expiry — and the tightness threshold, which is a setting
 * the Owner asked to keep visible rather than a filter. Everything that only
 * changes the grid (contract type, opportunity, attribution, detail mode) lives
 * on the grid's own toolbar, so a filter there never quietly re-grades the
 * cockpit above it. The removable chips on the right say what is in force.
 */
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { DenseTagButton, segmentGroupClass, segmentButtonClass } from '@/components/data-display'
import type { AccountFilter } from '@/utils/positionsGrouping'

export type { AccountFilter }

interface Props {
  filterSymbol: string
  onFilterSymbolChange: (v: string) => void
  filterExpiry: string
  onFilterExpiryChange: (v: string) => void
  hostAccountId?: string
  secondaryAccountId?: string
  accountFilter: AccountFilter
  onAccountFilterChange: (f: AccountFilter) => void
  /** Cushion warning line, as a fraction of strike. Persisted per browser. */
  cushionTightPct: number
  onCushionTightPctChange: (pct: number) => void
  /** Positions inside the current scope; the header badge uses the same number. */
  scopedCount: number
}

export function PositionsOpenControls({
  filterSymbol,
  onFilterSymbolChange,
  filterExpiry,
  onFilterExpiryChange,
  hostAccountId,
  secondaryAccountId,
  accountFilter,
  onAccountFilterChange,
  cushionTightPct,
  onCushionTightPctChange,
  scopedCount,
}: Props) {
  const showAccountBubbles = !!(hostAccountId || secondaryAccountId)
  const symbolChip = filterSymbol.trim().toUpperCase()
  const expiryChip = filterExpiry.trim()

  return (
    <div
      className="mb-2 flex min-w-0 flex-nowrap items-center gap-x-2 gap-y-1.5 dense-scroll-x border-b border-border/60 py-1.5"
      role="toolbar"
      aria-label="Page scope"
    >
      {showAccountBubbles && (
        <div className={cn(segmentGroupClass(), 'shrink-0 flex-nowrap')} aria-label="Accounts in scope">
          {hostAccountId && (
            <button
              type="button"
              onClick={() => onAccountFilterChange({ ...accountFilter, host: !accountFilter.host })}
              className={segmentButtonClass(accountFilter.host)}
              aria-pressed={accountFilter.host}
            >
              HOST
            </button>
          )}
          {secondaryAccountId && secondaryAccountId !== hostAccountId && (
            <button
              type="button"
              onClick={() =>
                onAccountFilterChange({ ...accountFilter, secondary: !accountFilter.secondary })
              }
              className={segmentButtonClass(accountFilter.secondary)}
              aria-pressed={accountFilter.secondary}
            >
              Secondary
            </button>
          )}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1.5" aria-label="Symbol and expiry scope">
        <Input
          placeholder="Symbol"
          value={filterSymbol}
          onChange={(e) => onFilterSymbolChange(e.target.value)}
          className="h-8 w-32 min-w-[6.5rem] max-w-40 shrink-0 font-mono text-sm"
        />
        <Input
          placeholder="YYYYMMDD"
          value={filterExpiry}
          onChange={(e) => onFilterExpiryChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
          className="h-8 w-[7.5rem] max-w-36 shrink-0 font-mono text-sm"
          maxLength={8}
          title="Option expiry filter (YYYYMMDD prefix match)"
          aria-label="Filter by option expiry YYYYMMDD"
        />
      </div>

      {/* A setting, not a filter: it changes what counts as tight everywhere
          cushion is drawn (cockpit, risk map, grid, ladder), never which rows exist. */}
      <label
        className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-border bg-card px-1.5"
        title="Short-leg cushion below this is shown as tight. In the money is always shown as breached, whatever this is set to."
      >
        <span className="text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
          Tight
        </span>
        <input
          type="number"
          min={0}
          max={50}
          step={0.5}
          value={Number((cushionTightPct * 100).toFixed(2))}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n)) onCushionTightPctChange(n / 100)
          }}
          className="w-11 bg-transparent text-right font-mono text-sm tabular-nums outline-none"
          aria-label="Cushion warning threshold, percent of strike"
        />
        <span className="text-sm text-muted-foreground">%</span>
      </label>

      <span className="ml-auto flex shrink-0 items-center gap-1" aria-label="Scope in force">
        {symbolChip ? (
          <DenseTagButton
            variant="category"
            size="cell"
            title="Symbol scope — click to clear"
            onClick={() => onFilterSymbolChange('')}
          >
            {symbolChip} ×
          </DenseTagButton>
        ) : null}
        {expiryChip ? (
          <DenseTagButton
            variant="category"
            size="cell"
            title="Expiry scope — click to clear"
            onClick={() => onFilterExpiryChange('')}
          >
            {expiryChip} ×
          </DenseTagButton>
        ) : null}
        <span className="font-mono text-dense-caption tabular-nums text-muted-foreground">
          {scopedCount} in scope
        </span>
      </span>
    </div>
  )
}
