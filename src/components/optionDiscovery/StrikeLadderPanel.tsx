import type { Dispatch, Ref, SetStateAction } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/lib/format'
import {
  STRIKE_COUNT_OPTIONS,
  STD_DEV_OPTIONS,
  type StrikeCountOption,
  type StdDevOption,
} from '@/utils/optionDiscovery/strikePresets'
import { DiscoveryHint } from './DiscoveryHint'
import { DiscoveryIconButton } from './DiscoveryIconButton'
import { DiscoveryScrollArea } from './DiscoveryScrollArea'
import { DiscoverySideToggle, type StrikeSideMode } from './DiscoverySideToggle'

export interface StrikeOiPair {
  c: number | null
  p: number | null
}

function fmtOiCompact(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 100_000) return `${Math.round(n / 1000)}k`
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(2)}k`
  return String(Math.round(n))
}

function StrikeOiBar({ widthPct, variant }: { widthPct: number; variant: 'call' | 'put' }) {
  return (
    <div className="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-muted/50">
      <div
        className={cn(
          'h-full rounded-sm transition-[width]',
          variant === 'call' ? 'bg-green-500/70' : 'bg-destructive/70',
        )}
        style={{ width: `${widthPct}%` }}
      />
    </div>
  )
}

function StrikeLadderOiStrikeCell({
  strike,
  oiMax,
  oiByStrike,
  showOi,
}: {
  strike: number
  oiMax: number
  oiByStrike: Map<number, StrikeOiPair>
  showOi: boolean
}) {
  if (!showOi) {
    return (
      <TableCell className="py-1 font-mono text-xs tabular-nums">{strike.toFixed(1)}</TableCell>
    )
  }
  const o = oiByStrike.get(strike)
  const c = o?.c ?? null
  const p = o?.p ?? null
  const denom = oiMax > 0 ? oiMax : 1
  const cw = c != null ? Math.min(100, (c / denom) * 100) : 0
  const pw = p != null ? Math.min(100, (p / denom) * 100) : 0
  return (
    <TableCell className="py-1 align-top">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="text-center font-mono text-xs font-semibold tabular-nums">{strike.toFixed(1)}</div>
        <div className="flex items-center gap-0.5" aria-hidden>
          <StrikeOiBar widthPct={cw} variant="call" />
          <div className="w-px shrink-0 self-stretch bg-border" />
          <StrikeOiBar widthPct={pw} variant="put" />
        </div>
        <div
          className="flex justify-between text-[0.62rem] text-muted-foreground tabular-nums"
          aria-label={`Call OI ${fmtOiCompact(c)}, Put OI ${fmtOiCompact(p)}`}
        >
          <span className="text-green-600 dark:text-green-500">C {fmtOiCompact(c)}</span>
          <span className="text-destructive">P {fmtOiCompact(p)}</span>
        </div>
      </div>
    </TableCell>
  )
}

function StrikeLadderTable({
  ariaLabel,
  strikes,
  rowClassName,
  multiSelectStrikes,
  setMultiSelectStrikes,
  showOi,
  oiMax,
  oiByStrike,
}: {
  ariaLabel: string
  strikes: number[]
  rowClassName?: (strike: number) => string
  multiSelectStrikes: number[]
  setMultiSelectStrikes: Dispatch<SetStateAction<number[]>>
  showOi: boolean
  oiMax: number
  oiByStrike: Map<number, StrikeOiPair>
}) {
  return (
    <DiscoveryScrollArea className="rounded-md border border-border/60">
      <Table className="text-xs" role="grid" aria-label={ariaLabel}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-7 w-12 px-2 text-[0.65rem] font-semibold uppercase tracking-wide">
              Select
            </TableHead>
            <TableHead className="h-7 px-2 text-[0.65rem] font-semibold uppercase tracking-wide">
              {showOi ? 'Strike / OI' : 'Strike'}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {strikes.map(s => (
            <TableRow
              key={s}
              className={cn('cursor-default', rowClassName?.(s))}
            >
              <TableCell className="w-12 px-2 py-1">
                <Checkbox
                  checked={multiSelectStrikes.includes(s)}
                  onCheckedChange={checked => {
                    if (checked === true) {
                      setMultiSelectStrikes(prev => [...prev, s].sort((a, b) => a - b))
                    } else {
                      setMultiSelectStrikes(prev => prev.filter(x => x !== s))
                    }
                  }}
                  aria-label={`Select strike ${s}`}
                />
              </TableCell>
              <StrikeLadderOiStrikeCell
                strike={s}
                oiMax={oiMax}
                oiByStrike={oiByStrike}
                showOi={showOi}
              />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DiscoveryScrollArea>
  )
}

export function StrikeLadderPanel({
  strikesLoading,
  computedStrikes,
  effectiveStrikes,
  multiSelectStrikes,
  setMultiSelectStrikes,
  stockDayLastPrice,
  strikeCountOption,
  setStrikeCountOption,
  stdDevOption,
  setStdDevOption,
  customStdDev,
  setCustomStdDev,
  strikeSideMode,
  setStrikeSideMode,
  strikeLadderShowOi,
  ladderOiMax,
  strikeOiByStrike,
  strikesAvailable,
  otmCallWrapRef,
}: {
  strikesLoading: boolean
  computedStrikes: number[]
  effectiveStrikes: number[]
  multiSelectStrikes: number[]
  setMultiSelectStrikes: Dispatch<SetStateAction<number[]>>
  stockDayLastPrice: number | null
  strikeCountOption: StrikeCountOption
  setStrikeCountOption: (v: StrikeCountOption) => void
  stdDevOption: StdDevOption
  setStdDevOption: (v: StdDevOption) => void
  customStdDev: string
  setCustomStdDev: (v: string) => void
  strikeSideMode: StrikeSideMode
  setStrikeSideMode: (v: StrikeSideMode) => void
  strikeLadderShowOi: boolean
  ladderOiMax: number
  strikeOiByStrike: Map<number, StrikeOiPair>
  strikesAvailable: boolean
  otmCallWrapRef?: Ref<HTMLDivElement>
}) {
  const showCallSide = strikeSideMode === 'all' || strikeSideMode === 'call'
  const showPutSide = strikeSideMode === 'all' || strikeSideMode === 'put'

  if (strikesLoading) {
    return (
      <DiscoveryHint className="mt-1">Loading strikes for selected expiration…</DiscoveryHint>
    )
  }

  if (computedStrikes.length === 0) {
    return (
      <DiscoveryHint className="mt-1">
        {strikesAvailable
          ? 'Select symbol with daily data or adjust count/std dev.'
          : 'Select symbol and expiration to see strikes.'}
      </DiscoveryHint>
    )
  }

  const spot = stockDayLastPrice ?? undefined
  const below = spot != null ? computedStrikes.filter(s => s < spot).sort((a, b) => b - a) : []
  const at = spot != null ? computedStrikes.filter(s => s === spot) : []
  const above = spot != null ? computedStrikes.filter(s => s > spot).sort((a, b) => a - b) : []
  const aboveReversed = [...above].sort((a, b) => b - a)
  const hasZones = below.length > 0 || at.length > 0 || above.length > 0

  const toggleAll = (strikes: number[], checked: boolean) => {
    if (checked) {
      setMultiSelectStrikes(prev => [...new Set([...prev, ...strikes])].sort((a, b) => a - b))
    } else {
      const set = new Set(strikes)
      setMultiSelectStrikes(prev => prev.filter(x => !set.has(x)))
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap gap-3">
        <div className="w-full min-w-[10rem] shrink-0 rounded-lg border border-border bg-secondary/40 p-2 sm:max-w-[11rem]">
          <div className="mb-2 text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">
            Strikes Range
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex flex-col gap-1">
              <label htmlFor="option-discovery-strike-count" className="text-xs text-muted-foreground">
                Count
              </label>
              <Select
                value={String(strikeCountOption)}
                onValueChange={v =>
                  setStrikeCountOption(v === 'all' ? 'all' : (Number(v) as StrikeCountOption))
                }
              >
                <SelectTrigger id="option-discovery-strike-count" size="sm" className="w-full" aria-label="Strike count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRIKE_COUNT_OPTIONS.map(c => (
                    <SelectItem key={String(c)} value={String(c)}>
                      {String(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="option-discovery-std-dev" className="text-xs text-muted-foreground">
                Std dev
              </label>
              <Select
                value={String(stdDevOption)}
                onValueChange={v =>
                  setStdDevOption(v === 'custom' ? 'custom' : (Number(v) as StdDevOption))
                }
              >
                <SelectTrigger id="option-discovery-std-dev" size="sm" className="w-full" aria-label="Standard deviations">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STD_DEV_OPTIONS.map(d => (
                    <SelectItem key={String(d)} value={String(d)}>
                      {String(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {stdDevOption === 'custom' && (
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  className="h-7 text-xs"
                  value={customStdDev}
                  onChange={e => setCustomStdDev(e.target.value)}
                  aria-label="Custom std dev"
                />
              )}
            </div>
            {spot != null && (below.length > 0 || above.length > 0 || at.length > 0) && (
              <p className="text-xs text-muted-foreground">Current price: {fmtUsd(spot)}</p>
            )}
            <div className="flex gap-1">
              <DiscoveryIconButton
                onClick={() => setMultiSelectStrikes([...computedStrikes])}
                aria-label="Select all"
                title="Select all strikes in range"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 12l2 2 4-4" />
                  <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9" />
                </svg>
              </DiscoveryIconButton>
              <DiscoveryIconButton
                onClick={() => setMultiSelectStrikes([])}
                aria-label="Clear"
                title="Clear selected strikes"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                </svg>
              </DiscoveryIconButton>
            </div>
            <div className="space-y-0.5 text-xs text-muted-foreground tabular-nums">
              <div>
                {effectiveStrikes.length} selected{multiSelectStrikes.length > 0 ? ' (custom)' : ' (preset)'}
              </div>
              <div>{computedStrikes.length} in range</div>
            </div>
            <div className="flex flex-col gap-1.5 pt-1">
              <span
                className="text-xs text-muted-foreground"
                id="option-discovery-strike-sides-label"
              >
                Sides
              </span>
              <DiscoverySideToggle
                value={strikeSideMode}
                onChange={setStrikeSideMode}
                aria-labelledby="option-discovery-strike-sides-label"
              />
            </div>
          </div>
        </div>

        {hasZones ? (
          <div
            className={cn(
              'grid min-w-0 flex-1 gap-3',
              strikeSideMode !== 'all' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
            )}
          >
            {showCallSide && (
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center gap-2 border-b border-green-500/30 pb-1">
                  <Checkbox
                    id="od-ladder-check-all-call"
                    checked={
                      aboveReversed.length + at.length > 0 &&
                      [...aboveReversed, ...at].every(s => multiSelectStrikes.includes(s))
                    }
                    onCheckedChange={c => toggleAll([...aboveReversed, ...at], c === true)}
                    aria-label="Check all OTM Call"
                  />
                  <label htmlFor="od-ladder-check-all-call" className="text-sm font-semibold text-green-600 dark:text-green-500">
                    OTM Call
                  </label>
                </div>
                <div ref={otmCallWrapRef}>
                  <StrikeLadderTable
                    ariaLabel="OTM Call strikes"
                    strikes={[...aboveReversed, ...at]}
                    rowClassName={s =>
                      at.includes(s)
                        ? 'bg-accent/15 ring-1 ring-inset ring-primary/40'
                        : 'hover:bg-green-500/5'
                    }
                    multiSelectStrikes={multiSelectStrikes}
                    setMultiSelectStrikes={setMultiSelectStrikes}
                    showOi={strikeLadderShowOi}
                    oiMax={ladderOiMax}
                    oiByStrike={strikeOiByStrike}
                  />
                </div>
              </div>
            )}
            {showPutSide && (
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center gap-2 border-b border-destructive/30 pb-1">
                  <Checkbox
                    id="od-ladder-check-all-put"
                    checked={below.length > 0 && below.every(s => multiSelectStrikes.includes(s))}
                    onCheckedChange={c => toggleAll(below, c === true)}
                    aria-label="Check all OTM Put"
                  />
                  <label htmlFor="od-ladder-check-all-put" className="text-sm font-semibold text-destructive">
                    OTM Put
                  </label>
                </div>
                <StrikeLadderTable
                  ariaLabel="OTM Put strikes"
                  strikes={below}
                  rowClassName={() => 'hover:bg-destructive/5'}
                  multiSelectStrikes={multiSelectStrikes}
                  setMultiSelectStrikes={setMultiSelectStrikes}
                  showOi={strikeLadderShowOi}
                  oiMax={ladderOiMax}
                  oiByStrike={strikeOiByStrike}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <StrikeLadderTable
              ariaLabel="Strikes"
              strikes={[...computedStrikes].sort((a, b) => a - b)}
              multiSelectStrikes={multiSelectStrikes}
              setMultiSelectStrikes={setMultiSelectStrikes}
              showOi={strikeLadderShowOi}
              oiMax={ladderOiMax}
              oiByStrike={strikeOiByStrike}
            />
          </div>
        )}
      </div>
    </div>
  )
}
