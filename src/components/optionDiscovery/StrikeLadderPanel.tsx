import type { Dispatch, Ref, SetStateAction } from 'react'
import { fmtUsd } from '@/lib/format'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  STRIKE_COUNT_OPTIONS,
  STD_DEV_OPTIONS,
  type StrikeCountOption,
  type StdDevOption,
} from '@/utils/optionDiscovery/strikePresets'
import { DiscoveryHint } from './DiscoveryHint'
import { DiscoverySideToggle, type StrikeSideMode } from './DiscoverySideToggle'
import { DiscoveryStrikeLadderTable } from './DiscoveryStrikeLadderTable'

export interface StrikeOiPair {
  c: number | null
  p: number | null
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
      <DiscoveryHint className="strike-ladder-hint-below" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
        Loading strikes for selected expiration…
      </DiscoveryHint>
    )
  }

  if (computedStrikes.length === 0) {
    return (
      <DiscoveryHint className="strike-ladder-hint-below" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
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

  return (
    <div className="option-discovery-list-with-header option-discovery-strikes-with-header">
      <div className="strike-ladder-layout">
        <div className="strike-ladder-col strike-ladder-col-range">
          <div className="strike-ladder-col-header">Strikes Range</div>
          <div className="strike-ladder-controls">
            <div className="strike-ladder-controls-row">
              <label htmlFor="option-discovery-strike-count">Count</label>
              <Select
                value={String(strikeCountOption)}
                onValueChange={v =>
                  setStrikeCountOption(
                    v === 'all' ? 'all' : (Number(v) as StrikeCountOption),
                  )
                }
              >
                <SelectTrigger id="option-discovery-strike-count" aria-label="Strike count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRIKE_COUNT_OPTIONS.map(c => (
                    <SelectItem key={String(c)} value={String(c)}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="strike-ladder-controls-row">
              <label htmlFor="option-discovery-std-dev">Std dev</label>
              <Select
                value={String(stdDevOption)}
                onValueChange={v =>
                  setStdDevOption(
                    v === 'custom' ? 'custom' : (Number(v) as StdDevOption),
                  )
                }
              >
                <SelectTrigger id="option-discovery-std-dev" aria-label="Standard deviations">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STD_DEV_OPTIONS.map(d => (
                    <SelectItem key={String(d)} value={String(d)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {stdDevOption === 'custom' && (
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={customStdDev}
                  onChange={e => setCustomStdDev(e.target.value)}
                  aria-label="Custom std dev"
                />
              )}
            </div>
            {spot != null && (below.length > 0 || above.length > 0 || at.length > 0) && (
              <div className="strike-ladder-controls-price">Current price: {fmtUsd(spot)}</div>
            )}
            <div className="strike-ladder-toolbar">
              <button
                type="button"
                className="section-header-icon-btn od-strike-range-icon-btn"
                onClick={() => setMultiSelectStrikes([...computedStrikes])}
                aria-label="Select all"
                title="Select all strikes in range"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M9 12l2 2 4-4" />
                  <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9" />
                </svg>
              </button>
              <button
                type="button"
                className="section-header-icon-btn od-strike-range-icon-btn"
                onClick={() => setMultiSelectStrikes([])}
                aria-label="Clear"
                title="Clear selected strikes"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                </svg>
              </button>
            </div>
            <div className="strike-ladder-controls-summary">
              <div>
                {effectiveStrikes.length} selected
                {multiSelectStrikes.length > 0 ? ' (custom)' : ' (preset)'}
              </div>
              <div>{computedStrikes.length} in range</div>
            </div>
            <div className="strike-ladder-controls-row strike-ladder-side-mode-row">
              <span className="strike-ladder-side-mode-label" id="option-discovery-strike-sides-label">
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
            className={`strike-ladder-two-cols${strikeSideMode !== 'all' ? ' strike-ladder-two-cols--single-side' : ''}`}
          >
            {showCallSide && (
              <div className="strike-ladder-col">
                <div className="strike-ladder-col-header strike-ladder-col-header-call">
                  <label className="strike-ladder-col-header-check">
                    <input
                      type="checkbox"
                      checked={
                        aboveReversed.length + at.length > 0 &&
                        [...aboveReversed, ...at].every(s => multiSelectStrikes.includes(s))
                      }
                      onChange={e => {
                        if (e.target.checked) {
                          setMultiSelectStrikes(prev =>
                            [...new Set([...prev, ...aboveReversed, ...at])].sort((a, b) => a - b),
                          )
                        } else {
                          setMultiSelectStrikes(prev =>
                            prev.filter(x => !aboveReversed.includes(x) && !at.includes(x)),
                          )
                        }
                      }}
                      aria-label="Check all OTM Call"
                    />
                    <span>OTM Call</span>
                  </label>
                </div>
                <DiscoveryStrikeLadderTable
                  ariaLabel="OTM Call strikes"
                  strikes={[...aboveReversed, ...at]}
                  rowClassName={s => (at.includes(s) ? 'strike-ladder-row-atm' : 'strike-ladder-row-otm-call')}
                  multiSelectStrikes={multiSelectStrikes}
                  setMultiSelectStrikes={setMultiSelectStrikes}
                  showOi={strikeLadderShowOi}
                  oiMax={ladderOiMax}
                  oiByStrike={strikeOiByStrike}
                  wrapRef={otmCallWrapRef}
                />
              </div>
            )}
            {showPutSide && (
              <div className="strike-ladder-col">
                <div className="strike-ladder-col-header strike-ladder-col-header-put">
                  <label className="strike-ladder-col-header-check">
                    <input
                      type="checkbox"
                      checked={below.length > 0 && below.every(s => multiSelectStrikes.includes(s))}
                      onChange={e => {
                        if (e.target.checked) {
                          setMultiSelectStrikes(prev =>
                            [...new Set([...prev, ...below])].sort((a, b) => a - b),
                          )
                        } else {
                          setMultiSelectStrikes(prev => prev.filter(x => !below.includes(x)))
                        }
                      }}
                      aria-label="Check all OTM Put"
                    />
                    <span>OTM Put</span>
                  </label>
                </div>
                <DiscoveryStrikeLadderTable
                  ariaLabel="OTM Put strikes"
                  strikes={below}
                  rowClassName={() => 'strike-ladder-row-otm-put'}
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
          <DiscoveryStrikeLadderTable
            ariaLabel="Strikes"
            strikes={[...computedStrikes].sort((a, b) => a - b)}
            multiSelectStrikes={multiSelectStrikes}
            setMultiSelectStrikes={setMultiSelectStrikes}
            showOi={strikeLadderShowOi}
            oiMax={ladderOiMax}
            oiByStrike={strikeOiByStrike}
          />
        )}
      </div>
    </div>
  )
}
