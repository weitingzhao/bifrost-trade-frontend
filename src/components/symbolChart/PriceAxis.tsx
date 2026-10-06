/**
 * The 56px price axis right of the plot (design K-LINE-SPEC §5): tick numbers,
 * one tag per level (stacked 16px apart, a 6px lead back to the true price when
 * pushed), and edge tags for what sits off the scale. Hovering a level's tag
 * lights its line; hovering an edge tag lights the trade it stands for.
 */
import type { PlacedEdge, PlacedTag } from '@/components/symbolChart/priceFrame'

export interface PriceAxisProps {
  height: number
  ticks: readonly { y: number; label: string }[]
  tags: readonly PlacedTag[]
  edges: readonly PlacedEdge[]
  onHover: (key: string | null) => void
}

export function PriceAxis(p: PriceAxisProps) {
  return (
    <div aria-label="Price axis" className="relative" style={{ height: p.height }}>
      {p.ticks.map((t) => (
        <span
          key={`t${t.y.toFixed(1)}`}
          className="pointer-events-none absolute left-[7px] -translate-y-1/2 font-mono text-dense-caption text-[var(--sk-faint)]"
          style={{ top: t.y }}
        >
          {t.label}
        </span>
      ))}
      {p.tags.map((t) => {
        const last = t.bar == null
        return (
          <span key={t.key}>
            {t.moved && t.bar ? (
              <span
                className="pointer-events-none absolute -left-0.5 h-px w-1.5"
                style={{ top: t.y0, background: t.bar }}
              />
            ) : null}
            <span
              title={t.title}
              onMouseEnter={t.hover ? () => p.onHover(t.hover ?? null) : undefined}
              onMouseLeave={t.hover ? () => p.onHover(null) : undefined}
              className="absolute left-[3px] z-[1] inline-block h-4 max-w-[53px] -translate-y-1/2 overflow-hidden text-ellipsis whitespace-nowrap rounded font-mono text-dense-caption leading-4"
              style={{
                top: t.y,
                padding: '0 5px 0 7px',
                background: `color-mix(in srgb, var(--sk-ink) ${last ? 16 : 8}%, transparent)`,
                boxShadow: last ? undefined : `inset 3px 0 0 ${t.bar}`,
                color: last ? 'var(--sk-ink)' : 'var(--sk-soft)',
                fontWeight: last ? 600 : 500,
                cursor: t.hover ? 'pointer' : 'default',
              }}
            >
              {t.text}
            </span>
          </span>
        )
      })}
      {p.edges.map((e) => (
        <button
          key={e.key}
          type="button"
          title={e.title}
          onClick={e.open ?? undefined}
          onMouseEnter={e.hover ? () => p.onHover(e.hover) : undefined}
          onMouseLeave={e.hover ? () => p.onHover(null) : undefined}
          className="absolute left-[3px] z-[2] inline-block h-4 max-w-[53px] overflow-hidden text-ellipsis whitespace-nowrap rounded px-[5px] text-left font-mono text-dense-caption leading-4"
          style={{
            top: e.top,
            color: e.ink,
            background: 'color-mix(in srgb, var(--sk-ink) 6%, transparent)',
            cursor: e.open || e.hover ? 'pointer' : 'default',
          }}
        >
          {e.text}
        </button>
      ))}
    </div>
  )
}
