/**
 * One strip: every short leg placed by how long is left and how much room is
 * left. The corner that matters is bottom-left — near and tight — and the two
 * background bands mark the week and the roll window so the eye finds it.
 *
 * The geometry is `layoutRiskMap`; this file only draws it. Three things the
 * drawing must never do: put an unpriced leg in the priced area, give it a
 * colour that means "fine", or hide the warning line the colours are judged
 * against. The tight threshold is a user setting, so its label reads the prop.
 */
import type { KeyboardEvent, MouseEvent } from 'react'
import { cn } from '@/lib/utils'
import { DenseTagButton } from '@/components/data-display'
import {
  fmtTickDte,
  fmtTightPct,
  labelTicks,
  layoutRiskMap,
  riskMapLegTitle,
  MONTH_DTE,
  NEAR_DTE,
  type RiskMapGutterPoint,
  type RiskMapLeg,
  type RiskMapPoint,
} from '@/utils/shortLegRiskMap'
import type { CushionBand } from '@/utils/positionsOptionRisk'
import styles from './ShortLegRiskMap.module.css'

const WIDTH = 650
const HEIGHT = 84

const BAND_CLASS: Record<CushionBand, string> = {
  comfortable: styles.pointComfortable,
  tight: styles.pointTight,
  breached: styles.pointBreached,
}

/**
 * Activation handlers for an SVG element playing a button. Both stop
 * propagation: a point inside the unpriced gutter is the leg, not the gutter,
 * and that has to hold for a key press as much as for a click.
 */
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
  onLegClick?: (leg: RiskMapLeg) => void
  onExpiryClick?: (expiry: string) => void
  onUnpricedClick?: () => void
}

function LegPoint({
  point,
  className,
  onLegClick,
}: {
  point: RiskMapPoint | RiskMapGutterPoint
  className: string
  onLegClick?: (leg: RiskMapLeg) => void
}) {
  return (
    <circle
      cx={point.x}
      cy={point.y}
      r={point.r}
      className={cn(className, point.clamped && styles.pointClamped)}
      data-band={point.band ?? 'unpriced'}
      data-clamped={point.clamped ?? undefined}
      role={onLegClick ? 'button' : undefined}
      tabIndex={onLegClick ? 0 : undefined}
      {...(onLegClick ? activate(() => onLegClick(point.leg)) : {})}
    >
      <title>{riskMapLegTitle(point.leg)}</title>
    </circle>
  )
}

export function ShortLegRiskMap({
  legs,
  tightPct,
  activeExpiry,
  onLegClick,
  onExpiryClick,
  onUnpricedClick,
}: ShortLegRiskMapProps) {
  if (legs.length === 0) {
    return <p className="text-dense-label text-muted-foreground">No short legs in scope.</p>
  }

  const layout = layoutRiskMap(legs, { width: WIDTH, height: HEIGHT, tightPct })
  const { bands, ticks, tightY } = layout
  const labeled = labelTicks(ticks, activeExpiry)
  const unpricedCount = layout.unpriced.length
  const noExpiryCount = layout.noExpiry.length
  const tightLabel = `tight ${fmtTightPct(tightPct)}`
  const axisY = bands.plot.y1
  const labelY = HEIGHT - 3
  // An empty gutter has nothing to open; it only becomes a control once there
  // is a leg in it to look at.
  const gutterOpens = onUnpricedClick != null && unpricedCount > 0

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-dense-caption text-muted-foreground">
        <span>
          Short legs · cushion vs DTE · {legs.length} leg{legs.length === 1 ? '' : 's'}
        </span>
        {unpricedCount > 0 ? (
          <DenseTagButton
            variant="warning"
            size="cell"
            className="font-mono tabular-nums text-warning"
            onClick={onUnpricedClick}
            title="Short legs with no underlying quote — no cushion, not known to be safe."
          >
            {unpricedCount} unpriced
          </DenseTagButton>
        ) : null}
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
        {/* Left gutter: no quote, no y, no verdict. */}
        <g
          className={cn(gutterOpens && styles.gutterClickable)}
          role={gutterOpens ? 'button' : undefined}
          tabIndex={gutterOpens ? 0 : undefined}
          aria-label={`${unpricedCount} unpriced short legs`}
          data-testid="unpriced-gutter"
          {...(gutterOpens ? activate(onUnpricedClick) : {})}
        >
          <rect
            x={bands.leftGutter.x0}
            y={bands.plot.y0}
            width={bands.leftGutter.x1 - bands.leftGutter.x0}
            height={bands.plot.y1 - bands.plot.y0}
            className={styles.gutter}
          />
          <text
            x={(bands.leftGutter.x0 + bands.leftGutter.x1) / 2}
            y={labelY}
            textAnchor="middle"
            className={cn(styles.label, unpricedCount > 0 && styles.labelWarning)}
          >
            no quote
          </text>
          {layout.unpriced.map((p) => (
            <LegPoint key={p.leg.key} point={p} className={styles.pointUnpriced} onLegClick={onLegClick} />
          ))}
        </g>

        {/* Priced area. */}
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

        <line x1={bands.plot.x0} x2={bands.plot.x1} y1={bands.zeroY} y2={bands.zeroY} className={styles.zeroLine} />
        {/* Under its line, inside the band it names; the tight label sits above
            its own line at the other end, so the two never overprint however
            close the threshold is to zero. */}
        <text x={bands.plot.x1} y={bands.zeroY + 9} textAnchor="end" className={styles.label}>
          ITM below
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
                <text
                  x={t.x}
                  y={labelY}
                  textAnchor="middle"
                  className={cn(styles.label, active && styles.labelActive)}
                >
                  {fmtTickDte(t.dte)}
                </text>
              ) : null}
            </g>
          )
        })}

        {layout.points.map((p) => (
          <LegPoint key={p.leg.key} point={p} className={cn(styles.point, BAND_CLASS[p.band])} onLegClick={onLegClick} />
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
                onLegClick={onLegClick}
              />
            ))}
          </g>
        ) : null}
      </svg>
    </div>
  )
}
