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
import { DiscoveryStrikeLadderTable } from './DiscoveryStrikeLadderTable'

export interface StrikeOiPair {
  c: number | null
  p: number | null
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
      <DiscoveryStrikeLadderTable
        ariaLabel={ariaLabel}
        strikes={strikes}
        rowClassName={rowClassName}
        multiSelectStrikes={multiSelectStrikes}
        setMultiSelectStrikes={setMultiSelectStrikes}
        showOi={showOi}
        oiMax={oiMax}
        oiByStrike={oiByStrike}
      />
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
