/**
 * The book on price as positioned HTML over the plot (design K-LINE-SPEC
 * §4.7–§4.8): each trade's legs at their strikes over the days held, rolls as
 * vertical joints, shares held now as one lime line at the blended cost.
 * Text never lives in the svg, so labels keep their 10px at any width; they
 * appear only for the lit trade. Geometry comes from `bookGeometry`.
 */
import type { CSSProperties } from 'react'
import type { FrameGeom } from '@/components/symbolChart/priceFrame'
import { inPrice, py } from '@/components/symbolChart/priceFrame'
import { BOOK_DIM, BOOK_REST, bookOpacity, type Joint, type Seg } from '@/components/symbolChart/tradeLayerModel'
import { fmtPl, type Holding, type TradeTrack } from '@/components/symbolChart/symbolPriceModel'

const SKY = 'var(--sk-contract)'
const LINE: Record<Seg['line'], string> = {
  short: `2px solid ${SKY}`,
  long: `1px dashed ${SKY}`,
  tail: `2px dashed color-mix(in srgb, var(--sk-contract) 55%, transparent)`,
}
const CHW = 6
const xPctOf = (x: number) => `${(x / 9).toFixed(3)}%`

export interface TradeLayerProps {
  g: FrameGeom
  /** The plot's width in px. */
  width: number
  segs: readonly Seg[]
  joints: readonly Joint[]
  holding: Holding | null
  spot: number | null
  hover: string | null
  focus: string | null
  onHover: (key: string | null) => void
  onOpen: (track: TradeTrack) => void
  onOpenId: (id: number) => void
  known: ReadonlySet<number> | null
}

function tipOf(t: TradeTrack, opens: boolean) {
  const open = t.closeDate == null
  return (
    `${t.name} · opened ${t.openDate}` +
    (open ? ' · open' : ` · closed ${t.closeDate}`) +
    (t.pnl != null ? ` · ${open ? 'mark' : 'realized'} ${fmtPl(t.pnl)}` : '') +
    (t.joints.length ? ` · rolled ${t.joints.length}×` : '') +
    ` · ${t.fills} fill${t.fills > 1 ? 's' : ''}` +
    (t.id == null
      ? ' · no trade claims these fills — click → Ledger'
      : opens
        ? ' · click → its record'
        : ` · #${t.id} is not in the trade book — nothing to open`)
  )
}

export function TradeLayer(p: TradeLayerProps) {
  const kx = p.width / 900
  const opens = (id: number | null): id is number => id != null && (p.known == null || p.known.has(id))
  const lit = p.hover ?? p.focus
  // The label sits on the trade's latest leg — the one its name describes.
  const litSeg = lit
    ? p.segs.filter((s) => s.track.key === lit && s.line !== 'tail').sort((a, b) => b.x0 - a.x0)[0]
    : undefined
  const litTrack = litSeg?.track
  const label = (() => {
    if (!litTrack || !litSeg) return null
    const t = litTrack
    const rest = t.id != null ? t.name.slice(`#${t.id}`.length) : t.name
    const pl = t.pnl != null ? `${fmtPl(t.pnl)}${t.closeDate == null ? ' unrealized' : ''}` : ''
    const w = (`#${t.id ?? ''}` + rest + ' ' + pl).length * CHW + 4
    const x = Math.max(0, Math.min(p.width - 4 - w, litSeg.x0 * kx + 6))
    const y = litSeg.y - 15 >= 0 ? litSeg.y - 15 : litSeg.y + 3
    const plColor =
      t.pnl == null ? 'var(--sk-mute2)' : t.closeDate == null ? 'var(--color-unrealized)' : t.pnl >= 0 ? 'var(--color-profit)' : 'var(--color-loss)'
    return { x, y, tok: t.id != null ? `#${t.id}` : '', rest, pl, plColor }
  })()

  const trackProps = (t: TradeTrack, z: number): { style: CSSProperties; title: string; onMouseEnter: () => void; onMouseLeave: () => void; onClick: () => void } => {
    const op = bookOpacity(t.key, p.hover === 'hold' ? null : p.hover, p.focus)
    return {
      style: { opacity: p.hover === 'hold' ? BOOK_DIM : op, zIndex: op === 1 ? 4 : z, cursor: opens(t.id) || t.id == null ? 'pointer' : 'default' },
      title: tipOf(t, opens(t.id)),
      onMouseEnter: () => p.onHover(t.key),
      onMouseLeave: () => p.onHover(null),
      onClick: () => (t.id == null || opens(t.id) ? p.onOpen(t) : undefined),
    }
  }

  const h = p.holding
  const holdIn = h != null && h.avg != null && inPrice(p.g, h.avg)
  const hy = holdIn && h?.avg != null ? py(p.g, h.avg) : null
  const holdOp = p.hover === 'hold' ? 1 : p.hover != null || p.focus != null ? BOOK_DIM : BOOK_REST
  const boxBelow = hy != null && hy + 3 + 32 <= p.g.vT
  const unr = h?.avg != null && p.spot != null ? (p.spot - h.avg) * h.qty : null

  return (
    <>
      {hy != null && h ? (
        <div
          onMouseEnter={() => p.onHover('hold')}
          onMouseLeave={() => p.onHover(null)}
          className="absolute inset-x-0 h-2 transition-opacity duration-150 motion-reduce:transition-none"
          style={{ top: hy - 4, opacity: holdOp, zIndex: 2 }}
        >
          <div className="absolute inset-x-0 top-1 border-t border-[var(--sk-ticker)]" />
        </div>
      ) : null}
      {hy != null && h?.avg != null && p.hover === 'hold' ? (
        <div
          onMouseEnter={() => p.onHover('hold')}
          onMouseLeave={() => p.onHover(null)}
          className="absolute right-1 z-[5] flex flex-col items-end gap-px rounded-md px-1.5 py-[3px] font-mono text-dense-caption"
          style={{ top: boxBelow ? hy + 3 : hy - 35, background: 'color-mix(in srgb, var(--background) 82%, transparent)' }}
        >
          <span className="whitespace-nowrap font-semibold text-[var(--sk-ticker)]">
            {h.qty.toLocaleString('en-US')} sh · avg {h.avg.toFixed(2)}{' '}
            {unr != null ? <b className="text-[var(--color-unrealized)]">{fmtPl(unr)}</b> : null}
          </span>
          <span className="flex gap-2 whitespace-nowrap text-[var(--sk-mute2)]">
            {h.backing.map((b) => (
              <span key={b.id} className="inline-flex gap-[3px]">
                <button
                  type="button"
                  onClick={() => (opens(b.id) ? p.onOpenId(b.id) : undefined)}
                  className="font-bold text-[var(--sk-trade)]"
                  style={{ cursor: opens(b.id) ? 'pointer' : 'default' }}
                >
                  #{b.id}
                </button>
                <span>{b.qty.toLocaleString('en-US')} backing</span>
              </span>
            ))}
            {h.free > 0 ? <span>free {h.free.toLocaleString('en-US')}</span> : null}
          </span>
        </div>
      ) : null}

      {p.segs.map((s) => {
        const tp = trackProps(s.track, 2)
        return (
          <div
            key={s.key}
            {...tp}
            className="absolute h-2 transition-opacity duration-150 motion-reduce:transition-none"
            style={{ ...tp.style, left: xPctOf(s.x0), width: xPctOf(Math.max(2 / kx, s.x1 - s.x0)), top: s.y - 4 }}
          >
            <div className="absolute inset-x-0 top-[3px]" style={{ borderTop: LINE[s.line] }} />
            {s.dot ? (
              <span className="absolute -left-[3px] top-0 size-[7px] rounded-full border border-[var(--background)] bg-[var(--sk-contract)]" />
            ) : null}
            {s.end ? (
              <span className="absolute -right-[3px] top-0 size-[7px] border border-[var(--background)]" style={{ background: s.end }} />
            ) : null}
          </div>
        )
      })}
      {p.joints.map((j) => {
        const tp = trackProps(j.track, 3)
        const lab = lit === j.track.key
        return (
          <div
            key={j.key}
            {...tp}
            className="absolute w-2 transition-opacity duration-150 motion-reduce:transition-none"
            style={{ ...tp.style, left: `calc(${xPctOf(j.x)} - 4px)`, top: Math.min(j.y0, j.y1), height: Math.max(2, Math.abs(j.y1 - j.y0)) }}
          >
            <div className="absolute inset-y-0 left-[3px] border-l border-[var(--sk-contract)]" />
            {lab ? (
              <span
                className="absolute left-[9px] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md px-[3px] font-mono text-dense-caption"
                style={{ color: j.ink, background: 'color-mix(in srgb, var(--background) 75%, transparent)' }}
              >
                {j.label}
              </span>
            ) : null}
          </div>
        )
      })}
      {label ? (
        <span
          className="pointer-events-none absolute z-[6] whitespace-nowrap font-mono text-dense-caption"
          style={{ left: label.x, top: label.y, color: SKY }}
        >
          <b className="font-bold text-[var(--sk-trade)]">{label.tok}</b>
          {label.rest} <b style={{ color: label.plColor }}>{label.pl}</b>
        </span>
      ) : null}
    </>
  )
}
