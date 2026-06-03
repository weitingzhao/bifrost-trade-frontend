import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Hourglass } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChartDonutSegment } from '@/utils/positionsCharts'
import styles from './departBoardCarousel.module.css'

const VISIBLE_ROWS = 3
const DWELL_SECONDS = 7
const ANIM_MS = 420

interface Props {
  segments: ChartDonutSegment[]
  total: number
  activeLabel?: string | null
  onSegmentClick?: (label: string) => void
  dimmedUnlessActive?: boolean
}

function chunkPairs(segments: ChartDonutSegment[]): ChartDonutSegment[][] {
  const rows: ChartDonutSegment[][] = []
  for (let i = 0; i < segments.length; i += 2) {
    rows.push(segments.slice(i, i + 2))
  }
  return rows
}

export function CategoryDetailStocksCarousel({
  segments,
  total,
  activeLabel,
  onSegmentClick,
  dimmedUnlessActive,
}: Props) {
  const pairs = useMemo(() => chunkPairs(segments), [segments])
  const rowCount = pairs.length
  const shouldScroll = rowCount > VISIBLE_ROWS
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
      setOffset((o) => (o + 1) % rowCount)
      setPhase('idle')
      animTimerRef.current = null
    }, ANIM_MS)
  }, [phase, rowCount])

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
  }, [shouldScroll, paused, reducedMotion, rowCount, advance])

  const slots = useMemo(
    () =>
      Array.from({ length: Math.min(VISIBLE_ROWS, rowCount) }, (_, slot) => ({
        slot,
        pair: pairs[(offset + slot) % rowCount],
      })),
    [offset, pairs, rowCount],
  )

  const incomingPair = shouldScroll ? pairs[(offset + VISIBLE_ROWS) % rowCount] : null
  const staticMode = !shouldScroll || reducedMotion

  if (rowCount === 0) return null

  return (
    <div
      className={cn('min-w-0 flex-1', styles.categoryDetailStocksCarousel)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false)
        if (shouldScroll && !reducedMotion) setSecondsLeft(DWELL_SECONDS)
      }}
    >
      <div
        className={cn(styles.departBoardViewport, styles.categoryDetailStocksViewport)}
        aria-live={shouldScroll && !paused && !reducedMotion ? 'polite' : 'off'}
        aria-label={
          shouldScroll
            ? `Stocks symbols, ${segments.length} items, ${VISIBLE_ROWS} rows visible`
            : 'Stocks symbols'
        }
      >
        <div className={styles.departBoardSlots}>
          {slots.map(({ slot, pair }) => (
            <StocksPairRow
              key={`${offset}-${slot}-${pair.map((s) => s.label).join('/')}`}
              pair={pair}
              total={total}
              activeLabel={activeLabel}
              onSegmentClick={onSegmentClick}
              dimmedUnlessActive={dimmedUnlessActive}
              slot={slot}
              phase={staticMode ? 'idle' : phase}
              countdown={
                shouldScroll && !reducedMotion && !paused && slot === 0 && phase === 'idle'
                  ? secondsLeft
                  : null
              }
            />
          ))}
          {!staticMode && phase === 'animating' && incomingPair ? (
            <StocksPairRow
              key={`incoming-${offset}-${incomingPair.map((s) => s.label).join('/')}`}
              pair={incomingPair}
              total={total}
              activeLabel={activeLabel}
              onSegmentClick={onSegmentClick}
              dimmedUnlessActive={dimmedUnlessActive}
              slot={VISIBLE_ROWS - 1}
              phase="entering"
              countdown={null}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function StocksPairRow({
  pair,
  total,
  activeLabel,
  onSegmentClick,
  dimmedUnlessActive,
  slot,
  phase,
  countdown,
}: {
  pair: ChartDonutSegment[]
  total: number
  activeLabel?: string | null
  onSegmentClick?: (label: string) => void
  dimmedUnlessActive?: boolean
  slot: number
  phase: 'idle' | 'animating' | 'entering'
  countdown: number | null
}) {
  return (
    <div
      className={cn(
        styles.departBoardRow,
        styles.categoryDetailStocksRow,
        phase === 'entering' && styles.departBoardRowEntering,
      )}
      data-slot={slot}
      data-phase={phase}
      style={{ ['--slot' as string]: slot }}
    >
      <RollCountdownIndicator secondsLeft={countdown} />
      <div className={styles.categoryDetailStocksCells}>
        {pair.map((seg) => (
          <SymbolLegendCell
            key={seg.label}
            seg={seg}
            pct={total > 0 ? (seg.value / total) * 100 : 0}
            isActive={activeLabel === seg.label}
            isDimmed={!!(dimmedUnlessActive && activeLabel && activeLabel !== seg.label)}
            onSegmentClick={onSegmentClick}
          />
        ))}
        {pair.length === 1 ? <span className={styles.categoryDetailStocksCellSpacer} aria-hidden /> : null}
      </div>
    </div>
  )
}

function SymbolLegendCell({
  seg,
  pct,
  isActive,
  isDimmed,
  onSegmentClick,
}: {
  seg: ChartDonutSegment
  pct: number
  isActive: boolean
  isDimmed: boolean
  onSegmentClick?: (label: string) => void
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded px-1 py-0.5 transition-opacity',
        onSegmentClick && 'cursor-pointer hover:bg-muted/50',
        isActive && 'bg-muted',
        isDimmed && 'opacity-40',
      )}
      onClick={onSegmentClick ? () => onSegmentClick(seg.label) : undefined}
      title={seg.marketValueTooltip}
    >
      <div className="grid w-full grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-x-1.5 text-sm leading-snug">
        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
        <span className="min-w-0 truncate font-medium text-foreground/90">{seg.label}</span>
        <span className="min-w-[2.75rem] shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-muted-foreground">
          {pct.toFixed(1)}%
        </span>
      </div>
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
