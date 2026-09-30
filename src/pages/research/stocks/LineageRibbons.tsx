/**
 * Lineage ribbons (Rev .124–.130): a parallel-sets drawing of the names that
 * pass the other conditions — Screen → each drawn model's levels → Bars
 * cleared. One ribbon per identical path, so a name's lineage stays
 * traceable. Horizontal, drawn 1:1 to the container (min 720) so the labels
 * stay on the 10px dense scale; narrower panes scroll inside the card.
 *
 * Nodes are clickable (not the Screen axis): the table lists only names that
 * pass through every picked node. That is a view drill, never a condition.
 */
import { useEffect, useRef, useState } from 'react'
import { AXES, ribbonGroups, type LineageFocus, type NameRow } from './stockScreenModel'
import { MODEL_TINT } from './stockScreenView'

const TINTS = [MODEL_TINT.sepa, MODEL_TINT.radar, MODEL_TINT.premium]
const RIB = [
  'color-mix(in srgb, var(--sk-accent) 55%, transparent)',
  'color-mix(in srgb, var(--sk-ink) 26%, transparent)',
  'color-mix(in srgb, var(--sk-ink) 15%, transparent)',
  'color-mix(in srgb, var(--sk-ink) 8%, transparent)',
]
const H = 280
const TOP = 30
const BOT = 6
const NW = 10
const GAP = 7
const LEFT = 84
const RIGHT = 74

interface DrawnAxis {
  title: string
  nodes: readonly string[]
  clear: readonly number[]
  /** Index into AXES, or -1 for the Screen axis. */
  idx: number
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(1160)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((e) => {
      const next = Math.round(e[0].contentRect.width)
      if (next) setW((cur) => (Math.abs(cur - next) > 2 ? next : cur))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, w }
}

export function LineageRibbons({
  set,
  visible,
  focus,
  selected,
  onNode,
  onPick,
}: {
  set: readonly NameRow[]
  /** AXES indexes drawn after Screen (models picked, then Bars cleared). */
  visible: readonly number[]
  focus: LineageFocus
  selected: string | null
  onNode: (axis: number, node: number) => void
  onPick: (sym: string) => void
}) {
  const { ref, w: width } = useWidth()
  const N = set.length
  if (!N) {
    return (
      <div ref={ref} className="py-10 text-center text-dense-label text-muted-foreground">
        No names pass the other conditions.
      </div>
    )
  }
  const AX: DrawnAxis[] = [
    { title: 'Screen', nodes: ['pass'], clear: [], idx: -1 },
    ...visible.map((i) => ({ title: AXES[i].title, nodes: AXES[i].nodes, clear: AXES[i].clear, idx: i })),
  ]
  const L = AX.length
  const W = Math.max(720, width)
  const xs = AX.map((_, i) => LEFT + (i * (W - LEFT - RIGHT - NW)) / (L - 1))
  const groups = ribbonGroups(set, visible)
  const counts = AX.map((ax, a) => ax.nodes.map((_, n) => groups.reduce((s, g) => s + (g.key[a] === n ? g.rows.length : 0), 0)))
  const u = Math.min(...counts.map((c) => (H - TOP - BOT - GAP * (c.filter((x) => x > 0).length - 1)) / N))
  const nodeY = counts.map((c) => {
    let y = TOP
    return c.map((n) => {
      const y0 = y
      if (n) y += n * u + GAP
      return { y0, c: n }
    })
  })
  const ys = groups.map(() => AX.map(() => 0))
  AX.forEach((ax, a) =>
    ax.nodes.forEach((_, ni) => {
      let off = 0
      groups
        .map((g, gi) => ({ g, gi }))
        .filter((x) => x.g.key[a] === ni)
        .sort(
          (p, q) =>
            (a > 0 ? p.g.key[a - 1] - q.g.key[a - 1] : 0) ||
            (a < L - 1 ? p.g.key[a + 1] - q.g.key[a + 1] : 0) ||
            p.g.key.join('').localeCompare(q.g.key.join('')),
        )
        .forEach((x) => {
          ys[x.gi][a] = nodeY[a][ni].y0 + off
          off += x.g.rows.length * u
        })
    }),
  )
  const path = (y: number[], t: number) => {
    let p = `M${xs[0] + NW},${y[0]}`
    for (let i = 1; i < L; i++) {
      const x0 = xs[i - 1] + NW
      const x1 = xs[i]
      const xm = (x0 + x1) / 2
      p += ` C${xm},${y[i - 1]} ${xm},${y[i]} ${x1},${y[i]}`
      if (i < L - 1) p += ` L${xs[i] + NW},${y[i]}`
    }
    p += ` L${xs[L - 1]},${y[L - 1] + t}`
    for (let i = L - 1; i >= 1; i--) {
      const x0 = xs[i - 1] + NW
      const x1 = xs[i]
      const xm = (x0 + x1) / 2
      if (i < L - 1) p += ` L${x1},${y[i] + t}`
      p += ` C${xm},${y[i] + t} ${xm},${y[i - 1] + t} ${x0},${y[i - 1] + t}`
    }
    return `${p} Z`
  }
  const focusKeys = Object.keys(focus).map(Number)
  const inF = (rows: NameRow[]) =>
    !focusKeys.length || rows.some((r) => focusKeys.every((a) => AXES[a].of(r) === focus[a]))
  const barsHidden = !visible.includes(3)
  return (
    <div ref={ref} className="min-w-0 overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block"
        role="img"
        aria-label="Lineage ribbons: screen → model levels → bars cleared"
      >
        {AX.map((ax, a) => {
          const cx = xs[a] + NW / 2
          const tint = ax.idx >= 0 && ax.idx < 3 ? TINTS[ax.idx] : null
          return (
            <g key={`t${a}`}>
              <text x={cx} y={12} textAnchor="middle" className="fill-muted-foreground font-sans text-dense-caption font-semibold">
                {ax.title}
              </text>
              {tint ? <rect x={cx - 8} y={17} width={16} height={3} rx={1.5} style={{ fill: tint }} /> : null}
            </g>
          )
        })}
        {groups.map((g, gi) => {
          const on = selected != null && g.rows.some((r) => r.sym === selected)
          const lvl = g.key[g.key.length - 1]
          const pth =
            AX.slice(1)
              .map((ax, a) => `${ax.title} ${ax.nodes[g.key[a + 1]]}`)
              .join(' → ') + (barsHidden ? ` · ${AXES[3].nodes[lvl]}` : '')
          return (
            <path
              key={`r${gi}`}
              d={path(ys[gi], g.rows.length * u)}
              onClick={() => onPick(g.rows[0].sym)}
              className="cursor-pointer transition-opacity duration-150"
              style={{
                fill: RIB[lvl],
                opacity: inF(g.rows) ? 1 : 0.18,
                stroke: on ? 'var(--sk-accent)' : 'none',
                strokeWidth: on ? 1.5 : 0,
              }}
            >
              <title>{`${g.rows.map((r) => r.sym).join(' · ')}\n${pth}`}</title>
            </path>
          )
        })}
        {AX.map((ax, a) =>
          ax.nodes.map((lab, ni) => {
            const n = nodeY[a][ni]
            if (!n.c) return null
            const clear = ax.clear.includes(ni)
            const na = ax.idx >= 0 && AXES[ax.idx].hasNa && ni === ax.nodes.length - 1
            const isF = ax.idx >= 0 && focus[ax.idx] === ni
            const click = a > 0 ? () => onNode(ax.idx, ni) : undefined
            const tip = a > 0 ? `${ax.title} · ${lab} · ${n.c}${isF ? ' · click to clear' : ' · click to list these names'}` : ''
            const rt = a === L - 1
            return (
              <g key={`n${a}-${ni}`} onClick={click} className={click ? 'cursor-pointer' : undefined}>
                {tip ? <title>{tip}</title> : null}
                <rect
                  x={xs[a] - 4}
                  y={n.y0 - 2}
                  width={NW + 8}
                  height={Math.max(1, n.c * u) + 4}
                  rx={4}
                  style={{
                    fill: isF ? 'color-mix(in srgb, var(--sk-accent) 22%, transparent)' : 'transparent',
                    stroke: isF ? 'var(--sk-accent)' : 'none',
                    strokeWidth: 1.5,
                  }}
                />
                <rect
                  x={xs[a]}
                  y={n.y0}
                  width={NW}
                  height={Math.max(1, n.c * u)}
                  rx={2}
                  style={{
                    fill: na
                      ? 'color-mix(in srgb, var(--sk-ink) 14%, transparent)'
                      : clear
                        ? 'var(--sk-accent)'
                        : 'color-mix(in srgb, var(--sk-ink) 45%, transparent)',
                  }}
                />
                <text
                  x={rt ? xs[a] + NW + 6 : xs[a] - 6}
                  y={n.y0 + (n.c * u) / 2 + 3.5}
                  textAnchor={rt ? 'start' : 'end'}
                  className="font-mono text-dense-caption"
                  style={{
                    fill: clear ? 'var(--sk-ink)' : 'var(--sk-soft)',
                    fontWeight: clear ? 600 : 400,
                    textDecoration: isF ? 'underline' : 'none',
                    paintOrder: 'stroke',
                    stroke: 'var(--card)',
                    strokeWidth: 3,
                    strokeLinejoin: 'round',
                  }}
                >
                  {`${na ? '—' : lab}  ${n.c}`}
                </text>
              </g>
            )
          }),
        )}
      </svg>
    </div>
  )
}
