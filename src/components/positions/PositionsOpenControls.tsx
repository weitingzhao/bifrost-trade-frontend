/**
 * The scope bar: the one row that decides what the whole page is about.
 *
 * Accounts, symbol (the top bar's, Rev .120), expiry — and the tightness threshold, which is a setting
 * the Owner asked to keep visible rather than a filter. Everything that only
 * changes the grid (contract type, opportunity, attribution, detail mode) lives
 * on the grid's own toolbar, so a filter there never quietly re-grades the
 * cockpit above it. The scope is in the URL; the link copies it.
 */
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { ToolbarClear } from '@bifrost/ui'
import { DenseTagButton } from '@/components/data-display'
import type { AccountFilter } from '@/utils/positionsGrouping'
import { SymbolScopeChip } from '@/components/symbol/SymbolScopeChip'
import { positionsUi } from './positionsUi'

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
  /** Positions inside the current scope; the header count uses the same number. */
  scopedCount: number
  /** Holdings on no strategy — Positions shows the way to them when both accounts are in scope. */
  offTrack?: { count: number; onOpen: () => void } | null
  /** The axes narrowing the book right now (accounts · type · symbol · expiry), for Clear N (§17.3). */
  scopeOn?: readonly string[]
  /**
   * Positions only (Rev .116): which of the page's two bands are in scope —
   * Options (the option lines) and Shares. At least one stays on.
   */
  types?: { opt: boolean; sh: boolean }
  onTypesChange?: (t: { opt: boolean; sh: boolean }) => void
  onClearScope?: () => void
}

function AccountToggle({ label, on, onClick, title }: { label: string; on: boolean; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={title ?? `${on ? 'In scope — click to drop' : 'Out of scope — click to add'} ${label}. Margin follows scope; the two are never mixed.`}
      className={cn(
        'h-5.5 cursor-pointer border-0 px-2.5 text-dense-meta font-semibold',
        // Rev .86: an account in scope is the accent, mixed — not the surface token.
        on
          ? 'bg-[color-mix(in_srgb,var(--sk-accent)_14%,transparent)] text-primary'
          : 'bg-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
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
  offTrack,
  scopeOn = [],
  onClearScope,
  types,
  onTypesChange,
}: Props) {
  const showAccountToggles = !!(hostAccountId || secondaryAccountId)
  const expiryChip = filterExpiry.trim()
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(t)
  }, [copied])

  return (
    // §17.3: the toolbar container and its words come from `styles/patterns`.
    <div data-sr-toolbar="" className="leading-normal" role="toolbar" aria-label="Page scope">
      <span data-sr-tb="label">Scope</span>
      {showAccountToggles && (
        <span
          className="inline-flex overflow-hidden rounded-full border border-border"
          aria-label="Accounts in scope"
        >
          {hostAccountId && (
            <AccountToggle
              label="Host"
              on={accountFilter.host}
              onClick={() => onAccountFilterChange({ ...accountFilter, host: !accountFilter.host })}
            />
          )}
          {secondaryAccountId && secondaryAccountId !== hostAccountId && (
            <AccountToggle
              label="Secondary"
              on={accountFilter.secondary}
              onClick={() => onAccountFilterChange({ ...accountFilter, secondary: !accountFilter.secondary })}
            />
          )}
        </span>
      )}

      {types && onTypesChange ? (
        <span className="inline-flex overflow-hidden rounded-full border border-border" aria-label="Holding types in scope">
          {(
            [
              ['opt', 'Options', 'the option lines · the expiry filter applies here only'],
              ['sh', 'Shares', 'stocks, fixed income, cash-like'],
            ] as const
          ).map(([k, label, what]) => (
            <AccountToggle
              key={k}
              label={label}
              on={types[k]}
              title={`${types[k] ? 'Showing' : 'Hidden — click to show'} ${what}`}
              onClick={() => {
                const next = { ...types, [k]: !types[k] }
                // At least one stays on: hiding both would read as an empty book.
                if (next.opt || next.sh) onTypesChange(next)
              }}
            />
          ))}
        </span>
      ) : null}

      {/* Rev .120: no Symbol box — the page reads the top bar's symbol. */}
      <SymbolScopeChip symbol={filterSymbol} onClear={() => onFilterSymbolChange('')} />
      <input
        placeholder="YYYYMMDD"
        value={filterExpiry}
        onChange={(e) => onFilterExpiryChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
        className={cn(positionsUi.input, 'w-26')}
        maxLength={8}
        title="Option expiry filter (YYYYMMDD prefix match)"
        aria-label="Filter by option expiry YYYYMMDD"
      />

      {/* A setting, not a filter: it changes what counts as tight everywhere
          cushion is drawn (cockpit, risk map, grid, ladder), never which rows exist. */}
      <label
        className="inline-flex items-center gap-1.25 text-dense-meta text-muted-foreground"
        title="Short-leg cushion below this is shown as tight. In the money is always shown as breached, whatever this is set to."
      >
        TIGHT
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
          className={cn(positionsUi.input, 'w-13 text-right')}
          aria-label="Cushion warning threshold, percent of strike"
        />
        <span className={positionsUi.cap}>%</span>
      </label>

      <button
        type="button"
        className={positionsUi.link}
        onClick={() => {
          void navigator.clipboard?.writeText(window.location.href).then(() => setCopied(true))
        }}
        title="The accounts, symbol and expiry are in the URL — the link opens this same scope"
      >
        {copied ? 'link copied · scope is in the URL' : 'copy link · scope is in the URL'}
      </button>

      <span className="ml-auto flex flex-wrap items-center gap-2.5" aria-label="Scope in force">
        {expiryChip ? (
          <DenseTagButton variant="category" size="cell" title="Expiry scope — click to clear" onClick={() => onFilterExpiryChange('')}>
            {expiryChip} ×
          </DenseTagButton>
        ) : null}
        {offTrack && offTrack.count > 0 ? (
          <button
            type="button"
            className={positionsUi.link}
            onClick={offTrack.onOpen}
            title="Holdings that are in the broker but not on any strategy — only shown when both accounts are in scope"
          >
            {offTrack.count} off-track {offTrack.count === 1 ? 'holding' : 'holdings'} →
          </button>
        ) : null}
        <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>{scopedCount} in scope</span>
        {onClearScope ? <ToolbarClear resets={scopeOn} onClear={onClearScope} /> : null}
      </span>
    </div>
  )
}
