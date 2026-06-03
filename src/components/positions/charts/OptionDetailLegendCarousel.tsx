import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Hourglass } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import type { ChartDonutSegment } from '@/utils/positionsCharts'
import { pnlColorClass } from '@/utils/positions'
import styles from './departBoardCarousel.module.css'

const VISIBLE_COUNT = 4
/** Seconds each 4-row window stays before the top row rolls off */
const DWELL_SECONDS = 7
const ANIM_MS = 420

interface Props {
  segments: ChartDonutSegment[]
  total: number
  mode: 'pct' | 'usd'
  activeLabel?: string | null
  onSegmentClick?: (label: string) => void
}

export function OptionDetailLegendCarousel({
  segments,
  total,
  mode,
  activeLabel,
  onSegmentClick,
}: Props) {
  const count = segments.length
  const shouldScroll = count > VISIBLE_COUNT
  const [offset, setOffset] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'animating'>('idle')
  const [secondsLeft, setSecondsLeft] = useState(DWELL_SECONDS)
  const [paused, setPaused] = useState(false)
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const advance = useCallback(() => {
    if (phase === 'animating') return
    setPhase('animating')
    if (animTimerRef.current) clearTimeout(animTimerRef.current)
    animTimerRef.current = setTimeout(() => {
      setOffset((o) => (o + 1) % count)
      setPhase('idle')
      animTimerRef.current = null
    }, ANIM_MS)
  }, [phase, count])

  useEffect(() => () => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current)
  }, [])

  useEffect(() => {
    if (!shouldScroll || paused || reducedMotion) return
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          advance()
          return DWELL_SECONDS
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [shouldScroll, paused, reducedMotion, count, advance])

  const slots = useMemo(
    () =>
      Array.from({ length: Math.min(VISIBLE_COUNT, count) }, (_, slot) => ({
        slot,
        seg: segments[(offset + slot) % count],
      })),
    [count, offset, segments],
  )

  const incomingSeg = shouldScroll ? segments[(offset + VISIBLE_COUNT) % count] : null
  const staticMode = !shouldScroll || reducedMotion

  return (
    <div
      className={cn('min-w-0 flex-1', styles.optionDetailCarousel)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false)
        if (shouldScroll && !reducedMotion) setSecondsLeft(DWELL_SECONDS)
      }}
    >
      <div
        className={cn(styles.departBoardViewport, styles.optionDetailCarouselViewport)}
        aria-live={shouldScroll && !paused && !reducedMotion ? 'polite' : 'off'}
        aria-label={
          shouldScroll
            ? `Option detail legend, ${count} contracts, ${VISIBLE_COUNT} visible, single-row roll`
            : 'Option detail legend'
        }
      >
        <div className={styles.departBoardSlots}>
          {slots.map(({ slot, seg }) => (
            <OptionDetailLegendRow
              key={`${offset}-${slot}-${seg.label}`}
              seg={seg}
              pct={total > 0 ? (seg.value / total) * 100 : 0}
              mode={mode}
              isActive={activeLabel === seg.label}
              onSegmentClick={onSegmentClick}
              slot={slot}
              phase={staticMode ? 'idle' : phase}
              countdown={
                shouldScroll && !reducedMotion && !paused && slot === 0 && phase === 'idle'
                  ? secondsLeft
                  : null
              }
            />
          ))}
          {!staticMode && phase === 'animating' && incomingSeg ? (
            <OptionDetailLegendRow
              key={`incoming-${offset}-${incomingSeg.label}`}
              seg={incomingSeg}
              pct={total > 0 ? (incomingSeg.value / total) * 100 : 0}
              mode={mode}
              isActive={activeLabel === incomingSeg.label}
              onSegmentClick={onSegmentClick}
              slot={VISIBLE_COUNT - 1}
              phase="entering"
              countdown={null}
            />
          ) : null}
        </div>
      </div>
      {shouldScroll && reducedMotion ? (
        <p className={styles.optionDetailCarouselHint}>
          {count} contracts — showing first {VISIBLE_COUNT}. Enable motion for single-row roll.
        </p>
      ) : null}
    </div>
  )
}

function OptionDetailLegendRow({
  seg,
  pct,
  mode,
  isActive,
  onSegmentClick,
  slot,
  phase,
  countdown,
}: {
  seg: ChartDonutSegment
  pct: number
  mode: 'pct' | 'usd'
  isActive: boolean
  onSegmentClick?: (label: string) => void
  slot: number
  phase: 'idle' | 'animating' | 'entering'
  countdown: number | null
}) {
  return (
    <div
      className={cn(
        styles.departBoardRow,
        styles.optionDetailCarouselRow,
        phase === 'entering' && styles.departBoardRowEntering,
        onSegmentClick && 'cursor-pointer hover:bg-muted/50',
        isActive && 'bg-muted',
      )}
      data-slot={slot}
      data-phase={phase}
      style={{ ['--slot' as string]: slot }}
      onClick={onSegmentClick ? () => onSegmentClick(seg.label) : undefined}
      title={seg.marketValueTooltip}
    >
      <div className="grid w-full grid-cols-[1.1rem_10px_minmax(0,1fr)_auto] items-center gap-x-1.5 text-sm leading-snug">
        <RollCountdownIndicator secondsLeft={countdown} />
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: seg.color }}
        />
        <span className="min-w-0 truncate font-medium text-foreground/90">{seg.label}</span>
        {mode === 'pct' ? (
          <span className="min-w-[2.75rem] shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-muted-foreground">
            {pct.toFixed(1)}%
          </span>
        ) : (
          <span className="min-w-[3.5rem] shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-foreground">
            {fmtMvAbbrev(seg.value)}
          </span>
        )}
      </div>
      {seg.optionDetailFoot ? (
        <div className="mt-0.5 pl-[1.85rem] text-[10px] leading-tight text-muted-foreground">
          {seg.optionDetailFoot.kind === 'stock' ? (
            <>
              Stock cost{' '}
              <span className={cn('font-mono', footToneClass(seg.optionDetailFoot.tone))}>
                {seg.optionDetailFoot.costFmt}
              </span>
              {' · MV '}
              <span className={cn('font-mono', footToneClass(seg.optionDetailFoot.tone))}>
                {seg.optionDetailFoot.mvFmt}
              </span>
            </>
          ) : (
            <span className={cn('font-mono', footToneClass(seg.optionDetailFoot.tone))}>
              {seg.optionDetailFoot.text}
            </span>
          )}
        </div>
      ) : null}
    </div>
  )
}

function RollCountdownIndicator({ secondsLeft }: { secondsLeft: number | null }) {
  if (secondsLeft == null) {
    return <span className={styles.departBoardHourglassSpacer} aria-hidden />
  }
  return (
    <span
      className={styles.departBoardHourglass}
      title={`Next row in ${secondsLeft}s`}
      aria-label={`Next row in ${secondsLeft} seconds`}
    >
      <Hourglass className="size-2.5 shrink-0" strokeWidth={2.25} aria-hidden />
    </span>
  )
}

function footToneClass(tone: 'profit' | 'loss' | 'flat'): string {
  if (tone === 'profit') return pnlColorClass(1)
  if (tone === 'loss') return pnlColorClass(-1)
  return 'text-muted-foreground'
}
