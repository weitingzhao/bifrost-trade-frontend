/**
 * Trade review · Compared with (design Rev .104). One instance read against
 * the ones like it: the peer set, the normalised paths overlaid (this one in
 * ink, peers green / red by outcome, hover lifts one, click opens it), the
 * table — this one, the peer median, each peer — and one sentence. The model
 * is `peersModel`; the paths are the same query the page's own line uses.
 */
import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { SegmentControl } from '@/components/data-display'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtIsoDateToken } from '@/lib/format'
import { cn } from '@/lib/utils'
import { tradePathQuery } from '@/hooks/useTradePath'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import { fmtPct0 } from '@/utils/positions'
import type { MarkPath } from '@/utils/reviewMarkPath'
import type { ReviewedTrade } from '@/utils/reviewedTrades'
import {
  PEER_CAP,
  PEER_LABEL,
  landed,
  median,
  normalised,
  peerPool,
  peerReading,
  perDay,
  type PeerBy,
  type PeerWhen,
} from './peersModel'

const W = 1000
const H = 180
const nameOf = (x: ReviewedTrade) => (x.tradeId != null ? `#${x.tradeId}` : x.label)

export function PeersPanel({
  self,
  selfPath,
  all,
  structureOf,
  today,
  onPick,
}: {
  self: ReviewedTrade
  selfPath: MarkPath | null
  all: readonly ReviewedTrade[]
  structureOf: (x: ReviewedTrade) => string | null
  today: string
  onPick: (x: ReviewedTrade) => void
}) {
  const [by, setBy] = useState<PeerBy>('sym')
  const [when, setWhen] = useState<PeerWhen>('before')
  const [hover, setHover] = useState<string | null>(null)
  const pools = useMemo(
    () => ({
      sym: peerPool(all, self, 'sym', when, structureOf),
      rule: peerPool(all, self, 'rule', when, structureOf),
      struct: peerPool(all, self, 'struct', when, structureOf),
    }),
    [all, self, when, structureOf],
  )
  const peers = pools[by].slice(0, PEER_CAP)
  const paths = useQueries({ queries: peers.map((x) => tradePathQuery(x, today)) })
  const pathOf = (i: number) => paths[i]?.data?.path ?? null
  const loading = paths.some((q) => q.isLoading)

  const selfPd = perDay(self.realised, self.daysHeld)
  const selfLd = landed(self.realised, selfPath)
  const rows = peers.map((x, i) => ({ x, path: pathOf(i), pd: perDay(x.realised, x.daysHeld), ld: landed(x.realised, pathOf(i)) }))
  const lines = [{ key: self.contractKey, pts: normalised(self, selfPath), self: true, win: true }].concat(
    rows.map((r) => ({ key: r.x.contractKey, pts: normalised(r.x, r.path), self: false, win: r.x.realised >= 0 })),
  )
  let lo = 0
  let hi = 1
  for (const l of lines) for (const p of l.pts) {
    lo = Math.min(lo, p.y)
    hi = Math.max(hi, p.y)
  }
  const pad = (hi - lo) * 0.08
  lo -= pad
  hi += pad
  const Y = (v: number) => H - 10 - ((v - lo) / (hi - lo)) * (H - 20)
  const X = (v: number) => 8 + v * (W - 16)
  const d = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ')
  const hovered = rows.find((r) => r.x.contractKey === hover)?.x ?? null
  const reading = peerReading({
    selfLabel: nameOf(self),
    selfOpen: self.open,
    selfPerDay: selfPd,
    selfLanded: selfLd,
    peerPerDays: rows.map((r) => r.pd),
    peerLandeds: rows.map((r) => r.ld),
    fmtMoney: fmtSignedUsd0,
  })
  const noun = { sym: 'symbol', rule: 'rule', struct: 'structure' }[by]

  return (
    <section className={positionsUi.panel} aria-label="Compared with">
      <header className={cn(positionsUi.panelHead, 'flex-wrap')}>
        <span className={positionsUi.cap}>Compared with</span>
        <SegmentControl
          size="sm"
          ariaLabel="Peer set"
          value={by}
          onChange={(v) => setBy(v as PeerBy)}
          options={(['sym', 'rule', 'struct'] as const).map((k) => ({
            value: k,
            label: (
              <>
                {PEER_LABEL[k]} <span className="font-mono text-muted-foreground">{pools[k].length}</span>
              </>
            ),
          }))}
        />
        <SegmentControl
          size="sm"
          ariaLabel="Which closed trades"
          value={when}
          onChange={(v) => setWhen(v as PeerWhen)}
          options={[
            { value: 'before', label: 'Earlier only' },
            { value: 'all', label: 'All closed' },
          ]}
        />
        <span className="ml-auto text-dense-meta text-muted-foreground">
          {peers.length} peer{peers.length === 1 ? '' : 's'}
          {pools[by].length > peers.length ? ` · latest ${PEER_CAP}` : ''} · normalised to premium and life
        </span>
      </header>
      {peers.length === 0 ? (
        <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
          No {when === 'before' ? 'earlier ' : ''}closed trade shares this {noun}. Widen to {when === 'before' ? 'All closed or ' : ''}
          another peer set.
        </p>
      ) : (
        <>
          <div className="relative px-2.5 pt-2 pb-1">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[172px] w-full" role="img" aria-label="Normalised P&L paths of this trade and its peers">
              <line x1={8} y1={Y(0)} x2={W - 8} y2={Y(0)} stroke="var(--sk-line2)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <line x1={8} y1={Y(1)} x2={W - 8} y2={Y(1)} stroke="var(--sk-line)" strokeWidth={1} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
              {lines
                .filter((l) => !l.self && l.pts.length > 1)
                .map((l) => (
                  <path
                    key={l.key}
                    d={d(l.pts)}
                    fill="none"
                    stroke={l.win ? 'var(--color-profit)' : 'var(--color-loss)'}
                    strokeWidth={hover === l.key ? 2 : 1.2}
                    strokeOpacity={hover && hover !== l.key ? 0.25 : 0.55}
                    vectorEffect="non-scaling-stroke"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHover(l.key)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => {
                      const x = rows.find((r) => r.x.contractKey === l.key)?.x
                      if (x) onPick(x)
                    }}
                  />
                ))}
              {lines[0].pts.length > 1 ? (
                <path d={d(lines[0].pts)} fill="none" stroke="var(--sk-ink)" strokeWidth={2.2} vectorEffect="non-scaling-stroke" />
              ) : null}
            </svg>
            <span className="absolute right-3.5 font-mono text-dense-micro text-muted-foreground" style={{ top: `${Math.max(2, (Y(1) / H) * 172 - 6)}px` }}>
              1× premium
            </span>
            <span className="absolute bottom-1.5 left-3.5 font-mono text-dense-micro text-muted-foreground">open</span>
            <span className="absolute right-3.5 bottom-1.5 font-mono text-dense-micro text-muted-foreground">expiry</span>
            {hovered ? (
              <span className="absolute top-2.5 left-3.5 font-mono text-dense-meta text-[var(--sk-soft)]">
                {nameOf(hovered)} · {hovered.openedOn ? fmtIsoDateToken(hovered.openedOn) : '—'} · {fmtSignedUsd0(hovered.realised)} over{' '}
                {hovered.daysHeld ?? '—'}d
              </span>
            ) : null}
            {loading ? <span className="absolute top-2.5 right-3.5 text-dense-micro text-muted-foreground">reading the peers’ bars…</span> : null}
          </div>
          <div className="overflow-x-auto">
            <table data-sr-table="" className="w-full">
              <thead>
                <tr>
                  <th>Trade</th>
                  <th>Opened</th>
                  <th data-sr-col="num">Held</th>
                  <th data-sr-col="num">Net</th>
                  <th data-sr-col="num">Per day</th>
                  <th data-sr-col="num">Kept</th>
                  <th data-sr-col="num">Landed</th>
                  <th>Fit</th>
                </tr>
              </thead>
              <tbody>
                <PeerRow x={self} self pd={selfPd} ld={selfLd} />
                <tr className="bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)]">
                  <td className="whitespace-nowrap font-semibold text-[var(--sk-mute2)]">
                    Peer median <span className="text-dense-micro font-normal">of {peers.length}</span>
                  </td>
                  <td />
                  <td data-sr-col="num" className="font-mono text-[var(--sk-mute2)]">
                    {median(peers.map((x) => x.daysHeld)) == null ? '—' : `${Math.round(median(peers.map((x) => x.daysHeld))!)}d`}
                  </td>
                  <td data-sr-col="num" className="font-mono text-muted-foreground">
                    {fmtSignedUsd0(median(peers.map((x) => x.realised)) ?? 0)}
                  </td>
                  <td data-sr-col="num" className="font-mono text-muted-foreground">
                    {fmtSignedUsd0(median(rows.map((r) => r.pd)) ?? 0)}
                  </td>
                  <td data-sr-col="num" className="font-mono">{fmtPct0(median(peers.map((x) => x.creditKept)))}</td>
                  <td data-sr-col="num" className="font-mono">{fmtPct0(median(rows.map((r) => r.ld)))}</td>
                  <td />
                </tr>
                {rows.map((r) => (
                  <PeerRow
                    key={r.x.contractKey}
                    x={r.x}
                    pd={r.pd}
                    ld={r.ld}
                    hovered={hover === r.x.contractKey}
                    onEnter={() => setHover(r.x.contractKey)}
                    onLeave={() => setHover(null)}
                    onPick={() => onPick(r.x)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {reading ? <p className="m-0 border-t border-border px-3 py-2 text-dense-label leading-normal text-pretty text-[var(--sk-soft)]">{reading}</p> : null}
        </>
      )}
    </section>
  )
}

function PeerRow({
  x,
  self,
  pd,
  ld,
  hovered,
  onEnter,
  onLeave,
  onPick,
}: {
  x: ReviewedTrade
  self?: boolean
  pd: number
  ld: number | null
  hovered?: boolean
  onEnter?: () => void
  onLeave?: () => void
  onPick?: () => void
}) {
  return (
    <tr
      role={self ? undefined : 'button'}
      tabIndex={self ? undefined : 0}
      onClick={self ? undefined : onPick}
      onKeyDown={(e) => {
        if (!self && e.key === 'Enter') onPick?.()
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={cn(
        !self && 'cursor-pointer',
        self && 'bg-[color-mix(in_srgb,var(--sk-accent)_10%,transparent)]',
        hovered && 'bg-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)]',
      )}
    >
      <td className="whitespace-nowrap">
        <span className={cn('font-mono text-[var(--sk-trade)]', self ? 'font-bold' : 'font-semibold')}>{nameOf(x)}</span>{' '}
        {self ? <span className="text-dense-micro text-[var(--sk-mute2)]">{x.open ? 'this · open' : 'this'}</span> : null}
      </td>
      <td className="whitespace-nowrap font-mono text-[var(--sk-mute2)]">{x.openedOn ? fmtIsoDateToken(x.openedOn) : '—'}</td>
      <td data-sr-col="num" className="font-mono text-[var(--sk-mute2)]">{x.daysHeld != null ? `${x.daysHeld}d` : '—'}</td>
      <td data-sr-col="num" className={cn('font-mono', x.open ? 'text-[var(--color-unrealized)]' : pnlColorClass(x.realised))}>
        {fmtSignedUsd0(x.realised)}
      </td>
      <td data-sr-col="num" className={cn('font-mono', pd < 0 && 'text-loss')}>{fmtSignedUsd0(pd)}</td>
      <td data-sr-col="num" className="font-mono">{fmtPct0(x.creditKept)}</td>
      <td data-sr-col="num" className="font-mono">{fmtPct0(ld)}</td>
      <td className="whitespace-nowrap text-dense-meta text-muted-foreground">no plan</td>
    </tr>
  )
}
