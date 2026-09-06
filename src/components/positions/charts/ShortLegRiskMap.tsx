/**
 * One strip: every short leg placed by how long is left and how much room is
 * left. The corner that matters is bottom-left — near and tight — and the two
 * background bands mark the week and the roll window so the eye finds it.
 *
 * Every point wears its name. The first version made the reader click a dot to
 * learn which contract it was, and the click silently narrowed the whole page
 * to that symbol with no obvious way back. Now a click only *selects* — the
 * panel around this map shows the leg and offers the actions — and the legs
 * with no price are listed by name under the plot, not hidden in a gutter.
 *
 * The geometry is `layoutRiskMap`; this file only draws it. Three things the
 * drawing must never do: put an unpriced leg in the priced area, give it a
 * colour that means "fine", or hide the warning line the colours are judged
 * against. The tight threshold is a user setting, so its label reads the prop.
 */
import { useRef, type KeyboardEvent, type MouseEvent } from 'react'
import { useContainerWidth } from '@/hooks/useContainerWidth'
import { cn } from '@/lib/utils'
import { DenseTagButton } from '@/components/data-display'
import {
  POINT_R_MAX,
  POINT_R_MIN,
  fmtNotional,
  legPremium,
  pointRadius,
  fmtTickDte,
  fmtTightPct,
  labelTicks,
  layoutRiskMap,
  riskMapLegShort,
  riskMapLegTitle,
  MONTH_DTE,
  NEAR_DTE,
  type RiskMapGutterPoint,
  type RiskMapLeg,
  type RiskMapPoint,
} from '@/utils/shortLegRiskMap'
import type { CushionBand } from '@/utils/positionsOptionRisk'
import { fmtSpotDate } from '@/utils/spotPrice'
import styles from './ShortLegRiskMap.module.css'

/** Laid out in the container's real pixels — a scaled drawing smears its labels. */
const FALLBACK_WIDTH = 650
const HEIGHT = 200

const BAND_CLASS: Record<CushionBand, string> = {
  comfortable: styles.pointComfortable,
  tight: styles.pointTight,
  breached: styles.pointBreached,
}

/** The cushion reads in the band's colour, so a breached leg is red in words as well as in ink. */
const BAND_TEXT_CLASS: Record<CushionBand, string> = {
  comfortable: styles.labelComfortable,
  tight: styles.labelTight,
  breached: styles.labelBreached,
}

/** Activation handlers for an SVG element playing a button. */
function activate(fn: () => void) {
  return {
    onClick: (e: MouseEvent) => {
      e.stopPropagation()
      fn()
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        fn()
      }
    },
  }
}

export interface ShortLegRiskMapProps {
  legs: RiskMapLeg[]
  tightPct: number
  activeExpiry?: string | null
  /** The selected leg's key; selection lives with the caller, which shows the detail. */
  selectedKey?: string | null
  /** Click a point or a no-quote chip: select it, or clear when it was already selected. */
  onSelect?: (leg: RiskMapLeg | null) => void
  onExpiryClick?: (expiry: string) => void
  /** The "N unpriced" count opens the calendar view, where the dates are. */
  onUnpricedClick?: () => void
}

function LegPoint({
  point,
  className,
  selected,
  onSelect,
}: {
  point: RiskMapPoint | RiskMapGutterPoint
  className: string
  selected: boolean
  onSelect?: (leg: RiskMapLeg | null) => void
}) {
  const toggle = onSelect ? () => onSelect(selected ? null : point.leg) : undefined
  return (
    <circle
      cx={point.x}
      cy={point.y}
      r={point.r}
      className={cn(
        className,
        point.clamped && styles.pointClamped,
        point.leg.spotSource != null && point.leg.spotSource !== 'live' && styles.pointMark,
        selected && styles.pointSelected,
      )}
      data-band={point.band ?? 'unpriced'}
      data-clamped={point.clamped ?? undefined}
      data-selected={selected ? 'true' : undefined}
      role={toggle ? 'button' : undefined}
      tabIndex={toggle ? 0 : undefined}
      aria-pressed={toggle ? selected : undefined}
      {...(toggle ? activate(toggle) : {})}
    >
      <title>{riskMapLegTitle(point.leg)}</title>
    </circle>
  )
}

/**
 * A dot's area is the credit the leg brought in, so the legend shows the two
 * ends the book actually holds — not an abstract scale, the smallest and
 * largest legs on this plot.
 */
function SizeLegend({ minNotional, maxNotional }: { minNotional: number; maxNotional: number }) {
  if (maxNotional <= 0) return null
  const w = 2 * POINT_R_MAX + 6
  return (
    <span
      className="inline-flex items-center gap-1"
      title="A leg's area is the credit it brought in: its price × 100 × contracts, the same figure the grid's OPT PNL column shows. Hover a dot for what assignment would move."
    >
      <svg width={w} height={2 * POINT_R_MAX} viewBox={`0 0 ${w} ${2 * POINT_R_MAX}`} aria-hidden="true" className="shrink-0">
        <circle cx={POINT_R_MIN + 1} cy={POINT_R_MAX} r={pointRadius(minNotional, maxNotional)} className={styles.legendDot} />
        <circle cx={w - POINT_R_MAX - 1} cy={POINT_R_MAX} r={POINT_R_MAX} className={styles.legendDot} />
      </svg>
      <span className="font-mono tabular-nums" data-testid="size-legend">
        {fmtNotional(minNotional)}–{fmtNotional(maxNotional)} credit
      </span>
    </span>
  )
}

export function ShortLegRiskMap({
  legs,
  tightPct,
  activeExpiry,
  selectedKey,
  onSelect,
  onExpiryClick,
  onUnpricedClick,
}: ShortLegRiskMapProps) {
  const host = useRef<HTMLDivElement>(null)
  const WIDTH = useContainerWidth(host, FALLBACK_WIDTH)
  if (legs.length === 0) {
    return <p className="text-dense-label text-muted-foreground">No short legs in scope.</p>
  }

  const layout = layoutRiskMap(legs, { width: WIDTH, height: HEIGHT, tightPct })
  const { bands, ticks, tightY } = layout
  const labeled = labelTicks(ticks, activeExpiry)
  const unpricedCount = layout.unpriced.length
  const markCount = legs.filter((l) => l.spotSource === 'mark').length
  const closeCount = legs.filter((l) => l.spotSource === 'close').length
  const closeAsOf = legs.reduce<number | null>(
    (oldest, l) =>
      l.spotSource === 'close' && l.spotAsOf != null && (oldest == null || l.spotAsOf < oldest) ? l.spotAsOf : oldest,
    null,
  )
  const noExpiryCount = layout.noExpiry.length
  const notionals = legs.map(legPremium).filter((n): n is number => n != null && n > 0)
  const maxNotional = notionals.length > 0 ? Math.max(...notionals) : 0
  const minNotional = notionals.length > 0 ? Math.min(...notionals) : 0
  const tightLabel = `tight ${fmtTightPct(tightPct)}`
  const axisY = bands.plot.y1
  const labelY = HEIGHT - 3

  return (
    <div className="flex min-w-0 flex-col gap-1" ref={host}>
      <div className="flex items-baseline justify-between gap-2 text-dense-caption text-muted-foreground">
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
          <span>
            Short legs · cushion vs DTE · {legs.length} leg{legs.length === 1 ? '' : 's'} · click a leg to see it
          </span>
          <SizeLegend minNotional={minNotional} maxNotional={maxNotional} />
        </span>
        <span className="flex items-center gap-1">
          {closeCount > 0 ? (
            <span
              className="font-mono tabular-nums text-warning"
              title={`Priced at the latest daily close (${fmtSpotDate(closeAsOf, 'close')}), not a live quote. Drawn dashed.`}
            >
              {closeCount} at close {fmtSpotDate(closeAsOf, 'close')}
            </span>
          ) : null}
          {markCount > 0 ? (
            <span
              className="font-mono tabular-nums text-warning"
              title="Priced at the broker's mark on the position row, not a live quote. Drawn dashed."
            >
              {markCount} at mark
            </span>
          ) : null}
          {unpricedCount > 0 ? (
            <DenseTagButton
              variant="warning"
              size="cell"
              className="font-mono tabular-nums text-warning"
              onClick={onUnpricedClick}
              title="Short legs with no underlying price — no cushion, not known to be safe. Opens the calendar view."
            >
              {unpricedCount} unpriced
            </DenseTagButton>
          ) : null}
        </span>
      </div>

      {/* A group, not an image: the points and ticks inside are real controls. */}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        role="group"
        aria-label={`Short legs by cushion and days to expiry: ${legs.length} legs, ${unpricedCount} unpriced, warning line at ${fmtTightPct(tightPct)}`}
        className={styles.svg}
      >
        <rect
          x={bands.month.x0}
          y={bands.plot.y0}
          width={Math.max(0, bands.month.x1 - bands.month.x0)}
          height={bands.plot.y1 - bands.plot.y0}
          className={styles.bandMonth}
        />
        <rect
          x={bands.near.x0}
          y={bands.plot.y0}
          width={Math.max(0, bands.near.x1 - bands.near.x0)}
          height={bands.plot.y1 - bands.plot.y0}
          className={styles.bandNear}
        />
        <rect
          x={bands.plot.x0}
          y={bands.itm.y0}
          width={bands.plot.x1 - bands.plot.x0}
          height={Math.max(0, bands.itm.y1 - bands.itm.y0)}
          className={styles.bandItm}
        />
        <text x={bands.near.x1 - 2} y={bands.plot.y0 + 8} textAnchor="end" className={styles.label}>
          ≤{NEAR_DTE}d
        </text>
        {bands.month.x1 - bands.near.x1 > 24 ? (
          <text x={bands.month.x1 - 2} y={bands.plot.y0 + 8} textAnchor="end" className={styles.label}>
            ≤{MONTH_DTE}d
          </text>
        ) : null}

        {/* The cushion scale: the height of a point means something, so say what. */}
        {layout.yTicks.map((t) => (
          <g key={t.pct}>
            {t.pct !== 0 ? (
              <line x1={bands.plot.x0} x2={bands.plot.x1} y1={t.y} y2={t.y} className={styles.gridLine} />
            ) : null}
            <text x={bands.plot.x0 - 4} y={t.y + 3} textAnchor="end" className={styles.label} data-testid="y-tick">
              {t.pct > 0 ? '+' : ''}
              {Math.round(t.pct * 100)}%
            </text>
          </g>
        ))}
        <line x1={bands.plot.x0} x2={bands.plot.x1} y1={bands.zeroY} y2={bands.zeroY} className={styles.zeroLine} />
        <text x={bands.plot.x1} y={bands.zeroY + 9} textAnchor="end" className={styles.label}>
          ITM below zero
        </text>

        <line x1={bands.plot.x0} x2={bands.plot.x1} y1={tightY} y2={tightY} className={styles.tightLine} />
        <text
          x={bands.plot.x0 + 2}
          y={tightY - 2}
          textAnchor="start"
          className={cn(styles.label, styles.labelWarning)}
          data-testid="tight-label"
        >
          {tightLabel}
        </text>

        <line x1={bands.plot.x0} x2={bands.plot.x1} y1={axisY} y2={axisY} className={styles.axisLine} />
        {/* The scale's name, in the corner nothing else uses: under the axis, left of
            the first date. The dates name the x axis themselves. */}
        <text x={2} y={labelY} textAnchor="start" className={styles.label}>
          cushion ↑
        </text>
        {ticks.map((t, i) => {
          const active = t.expiry != null && activeExpiry != null && t.expiry === activeExpiry
          const expiry = t.expiry
          const open = onExpiryClick != null && expiry != null ? activate(() => onExpiryClick(expiry)) : null
          const when = t.dte < 0 ? `${-t.dte} days past` : `${t.dte} days`
          return (
            <g
              key={expiry ?? String(t.dte)}
              className={cn(open && styles.tick, active && styles.tickActive)}
              role={open ? 'button' : undefined}
              tabIndex={open ? 0 : undefined}
              aria-label={expiry ? `expiry ${expiry}, ${when}` : when}
              aria-pressed={open ? active : undefined}
              {...open}
            >
              <line x1={t.x} x2={t.x} y1={axisY} y2={axisY + 3} className={styles.tickMark} />
              {labeled[i] ? (
                <text x={t.x} y={labelY} textAnchor="middle" className={cn(styles.label, active && styles.labelActive)}>
                  {fmtTickDte(t.dte)}
                </text>
              ) : null}
            </g>
          )
        })}

        {/* Names first, points on top, so a label never covers the dot it names. */}
        {layout.labels.map((l) => (
          <text
            key={l.key}
            x={l.x}
            y={l.y}
            textAnchor={l.anchor}
            className={cn(styles.pointLabel, l.key === selectedKey && styles.pointLabelSelected)}
            data-testid="point-label"
          >
            {/* Three readings, three colours: what it is, what it is worth, how far it has to fall. */}
            <tspan>{l.parts.head}</tspan>
            {l.parts.value ? <tspan className={styles.labelValue}> {l.parts.value}</tspan> : null}
            {l.parts.cushion ? (
              <tspan className={l.band ? BAND_TEXT_CLASS[l.band] : undefined}> {l.parts.cushion}</tspan>
            ) : null}
          </text>
        ))}
        {layout.points.map((p) => (
          <LegPoint
            key={p.leg.key}
            point={p}
            className={cn(styles.point, BAND_CLASS[p.band])}
            selected={p.leg.key === selectedKey}
            onSelect={onSelect}
          />
        ))}

        {/* Right gutter: priced, but the date would not parse — no x to place it on. */}
        {bands.rightGutter ? (
          <g data-testid="no-expiry-gutter" aria-label={`${noExpiryCount} short legs with no expiry`}>
            <rect
              x={bands.rightGutter.x0}
              y={bands.plot.y0}
              width={bands.rightGutter.x1 - bands.rightGutter.x0}
              height={bands.plot.y1 - bands.plot.y0}
              className={styles.gutter}
            />
            <text
              x={(bands.rightGutter.x0 + bands.rightGutter.x1) / 2}
              y={labelY}
              textAnchor="middle"
              className={cn(styles.label, styles.labelWarning)}
              data-testid="no-expiry-label"
            >
              no expiry
            </text>
            {layout.noExpiry.map((p) => (
              <LegPoint
                key={p.leg.key}
                point={p}
                className={cn(styles.point, p.band ? BAND_CLASS[p.band] : styles.pointUnpriced)}
                selected={p.leg.key === selectedKey}
                onSelect={onSelect}
              />
            ))}
          </g>
        ) : null}
      </svg>

      {/* No price, no place on the plot — but a name, a strike and a date, in the open. */}
      {unpricedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-1 text-dense-caption" data-testid="unpriced-list">
          <span className="text-warning">no quote:</span>
          {layout.unpriced.map((leg) => {
            const selected = leg.key === selectedKey
            return (
              <DenseTagButton
                key={leg.key}
                variant="warning"
                size="cell"
                className={cn('font-mono tabular-nums', selected && 'ring-1 ring-foreground')}
                aria-pressed={selected}
                title={riskMapLegTitle(leg)}
                onClick={() => onSelect?.(selected ? null : leg)}
              >
                {riskMapLegShort(leg)} · {leg.dte == null ? 'no expiry' : `${leg.dte}d`}
              </DenseTagButton>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
