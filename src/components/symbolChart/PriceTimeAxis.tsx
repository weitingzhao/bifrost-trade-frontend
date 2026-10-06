/**
 * Under the plot (design K-LINE-SPEC §6 and §10): the 14px time axis — the
 * window's first day, `today` under the last bar, E and OpEx at their lines,
 * and the cone's reach on the right (or, panned back, the window's last day
 * and a link home) — and the two-year strip with every trade as a bar.
 */
import type { MouseEvent } from 'react'

const asPct = (v: number) => `${v.toFixed(2)}%`

export interface TimeAxisProps {
  left: string
  /** Percent of the plot width, or null when not shown. */
  todayAt: number | null
  earnAt: number | null
  opexAt: number | null
  right: string
  rightTitle?: string
  onToday: (() => void) | null
}

export function PriceTimeAxis(p: TimeAxisProps) {
  return (
    <div className="relative mr-14 h-3.5 font-mono text-dense-caption text-[var(--sk-mute)]">
      <span className="absolute left-0">{p.left}</span>
      {p.todayAt != null ? (
        <span className="absolute -translate-x-1/2" style={{ left: asPct(p.todayAt) }}>
          today
        </span>
      ) : null}
      {p.earnAt != null ? (
        <span
          title="Earnings"
          className="absolute -translate-x-1/2 text-[var(--color-amber-400,var(--color-warning))]"
          style={{ left: asPct(p.earnAt) }}
        >
          E
        </span>
      ) : null}
      {p.opexAt != null ? (
        <span title="Monthly options expiration" className="absolute -translate-x-1/2" style={{ left: asPct(p.opexAt) }}>
          OpEx
        </span>
      ) : null}
      <span className="absolute right-0 flex items-center gap-2">
        <span title={p.rightTitle}>{p.right}</span>
        {p.onToday ? (
          <button
            type="button"
            onClick={p.onToday}
            title="Back to today · double-click the chart"
            className="cursor-pointer border-0 bg-transparent p-0 font-mono text-dense-caption text-[var(--sk-accent)]"
          >
            today →
          </button>
        ) : null}
      </span>
    </div>
  )
}

export interface MiniStripProps {
  line: string
  brushLeft: number
  brushWidth: number
  ticks: { key: string; x: number; color: string; title: string; jump: () => void }[]
  onDrag: (e: MouseEvent<HTMLDivElement>) => void
}

export function PriceMiniStrip(p: MiniStripProps) {
  return (
    <div
      onMouseDown={p.onDrag}
      className="relative mt-1 mr-14 h-[26px] cursor-grab select-none"
      title="Drag the frame to move the window through the two years"
    >
      <svg viewBox="0 0 900 26" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d={p.line} fill="none" stroke="var(--sk-line2)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>
      <span
        className="pointer-events-none absolute inset-y-0 border-x border-[var(--sk-accent)]"
        style={{
          left: asPct(p.brushLeft),
          width: asPct(p.brushWidth),
          background: 'color-mix(in srgb, var(--sk-accent) 12%, transparent)',
        }}
      />
      {p.ticks.map((t) => (
        <button
          key={t.key}
          type="button"
          title={t.title}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={t.jump}
          className="absolute inset-y-1 w-[3px] cursor-pointer border-0 p-0"
          style={{ left: asPct(t.x), background: t.color }}
        />
      ))}
      <span className="pointer-events-none absolute right-0.5 top-px font-mono text-dense-caption text-[var(--sk-mute)]">
        2y · every trade · drag the frame
      </span>
    </div>
  )
}
