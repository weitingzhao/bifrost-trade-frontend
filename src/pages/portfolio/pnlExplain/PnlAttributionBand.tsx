/**
 * P&L Explain › Attribution: Δ, Γ, vega, θ and Unexplained, read from the
 * nightly book snapshot (api 0.12.0, TD-138 / TD-139).
 *
 * Each session is read against the session before it, from the book as it
 * stood at the prior close. A session whose prior session is not on file has
 * no reading and is named, never differenced against an older day. Degraded
 * Greeks are read and tagged; missing ones leave their rows unread — counted,
 * never averaged away (SNAPSHOT-SPEC §1.3).
 *
 * Without a reading — an API that does not serve the route, or a window with no
 * session pair — the band keeps the design's marked shape and says which of the
 * two it is.
 */
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtIsoDateToken } from '@/lib/format'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import type { AttributionSums, PnlAttributionResponse } from '@/lib/schemas/snapshots'
import { ATTRIBUTION_LINES, PNL_UNRECORDED, attributionCoverage, explainedOf, greeksTag } from './pnlExplainModel'

const FOOT =
  'border-t border-border px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

const PART_NAMES: Record<string, string> = {
  delta_pnl: 'Δ',
  gamma_pnl: 'Γ',
  vega_pnl: 'vega',
  theta_pnl: 'θ',
  unexplained: 'unexplained',
}

/** What moved a name, in words: its largest part, then what was not read. */
function whatMovedIt(s: AttributionSums): string {
  const parts = (['delta_pnl', 'gamma_pnl', 'vega_pnl', 'theta_pnl', 'unexplained'] as const)
    .map((k) => [k, s[k]] as const)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  const bits: string[] = []
  if (s.read_rows > 0 && Math.abs(parts[0][1]) > 0) bits.push(`mostly ${PART_NAMES[parts[0][0]]}`)
  const opened = s.status.opened_in_session ?? 0
  const closed = s.status.closed_in_session ?? 0
  if (opened) bits.push(`${opened} opened in the session`)
  if (closed) bits.push(`${closed} closed in the session`)
  if (s.greeks_quality.missing) bits.push(`${s.greeks_quality.missing} without Greeks`)
  if (s.mark_anomaly_rows) bits.push(`${s.mark_anomaly_rows} mark under intrinsic`)
  return bits.join(' · ') || '—'
}

function Marked({
  windowLabel,
  windowPnl,
  reason,
  legNames,
}: {
  windowLabel: string
  windowPnl: number
  reason: string
  legNames: { symbol: string; legs: number }[]
}) {
  return (
    <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Attribution">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>{windowLabel}</span>
        <span className={cn(positionsUi.mono, 'text-dense-body font-bold', pnlColorClass(windowPnl))}>
          {fmtSignedUsd0(windowPnl)}
        </span>
        <DenseTag variant="warning" size="cell">
          ⚠ no session pair read
        </DenseTag>
        <span className="ml-auto text-dense-meta text-muted-foreground">
          the shape below is the design&rsquo;s, the figures are not a reading
        </span>
      </header>
      <div className="flex flex-col">
        {ATTRIBUTION_LINES.map((c) => (
          <div
            key={c.key}
            className="grid grid-cols-[8rem_minmax(0,1fr)_5rem] items-start gap-x-3 border-b border-border/55 px-3.5 py-2 last:border-b-0"
          >
            <span className="inline-flex items-center gap-1.5 text-xs leading-normal font-semibold text-foreground">
              <StatusLamp lamp="gray" variant="dot" title="No reading" />
              {c.label}
            </span>
            <span className="min-w-0 text-dense-meta leading-normal text-muted-foreground text-pretty">
              {c.what} · <span className={positionsUi.mono}>{c.formula}</span>
            </span>
            <span className={cn(positionsUi.mono, 'text-right text-xs text-muted-foreground')}>—</span>
          </div>
        ))}
      </div>
      {legNames.length > 0 ? (
        <p className={cn(FOOT, 'm-0')}>
          {legNames.length} {legNames.length === 1 ? 'name carries' : 'names carry'} option legs today (
          {legNames.map((n) => n.symbol).join(', ')}).
        </p>
      ) : null}
      <p className={cn(FOOT, 'm-0')} data-testid="attribution-unread-reason">
        {reason}
      </p>
    </section>
  )
}

export function PnlAttributionBand({
  attr,
  loading,
  failed,
  windowLabel,
  windowPnl,
  legNames,
}: {
  /** undefined while loading; null when the API does not serve the route. */
  attr: PnlAttributionResponse | null | undefined
  loading: boolean
  failed: boolean
  windowLabel: string
  windowPnl: number
  legNames: { symbol: string; legs: number }[]
}) {
  if (loading && attr === undefined) {
    return (
      <section className={positionsUi.panel} aria-label="Attribution">
        <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">Reading the daily snapshot…</p>
      </section>
    )
  }
  if (failed && attr == null) {
    return (
      <Marked
        windowLabel={windowLabel}
        windowPnl={windowPnl}
        legNames={legNames}
        reason="The daily snapshot could not be read just now — no attribution is shown rather than an old one."
      />
    )
  }
  if (attr === null || attr === undefined) {
    return <Marked windowLabel={windowLabel} windowPnl={windowPnl} legNames={legNames} reason={PNL_UNRECORDED.notServed} />
  }
  const { read, noPrior } = attributionCoverage(attr)
  if (read.length === 0) {
    return <Marked windowLabel={windowLabel} windowPnl={windowPnl} legNames={legNames} reason={PNL_UNRECORDED.noPair} />
  }

  const t = attr.totals
  const max = Math.max(...ATTRIBUTION_LINES.map((c) => Math.abs(t[c.key])), 1)
  const explained = explainedOf(t)
  const symbols = [...attr.by_symbol].sort(
    (a, b) => Math.abs(b.held_pnl) + Math.abs(b.unread_held_pnl) - (Math.abs(a.held_pnl) + Math.abs(a.unread_held_pnl)),
  )
  const first = read[0]
  const last = read[read.length - 1]
  const span =
    read.length === 1
      ? `${fmtIsoDateToken(first.snapshot_date)} vs ${fmtIsoDateToken(first.prior_date)}`
      : `${fmtIsoDateToken(first.snapshot_date)} → ${fmtIsoDateToken(last.snapshot_date)}`

  return (
    <section className={positionsUi.panel} aria-label="Attribution">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>{windowLabel}</span>
        <span className={positionsUi.panelTitle}>held book · {span}</span>
        <DenseTag variant={noPrior.length > 0 ? 'warning' : 'neutral'} size="cell">
          {read.length} {read.length === 1 ? 'session' : 'sessions'} read
          {noPrior.length > 0 ? ` · ${noPrior.length} without a prior snapshot` : ''}
        </DenseTag>
        <span className="ml-auto text-dense-meta text-muted-foreground">
          held P&amp;L {fmtSignedUsd0(t.held_pnl)} = explained {fmtSignedUsd0(explained)} + unexplained{' '}
          {fmtSignedUsd0(t.unexplained)}
        </span>
      </header>
      <div className="flex flex-col">
        {ATTRIBUTION_LINES.map((c) => {
          const v = t[c.key]
          return (
            <div
              key={c.key}
              className="grid grid-cols-[8rem_minmax(0,1fr)_7rem] items-center gap-x-3 border-b border-border/55 px-3.5 py-2 last:border-b-0"
            >
              <span className="text-xs leading-normal font-semibold text-foreground">{c.label}</span>
              <span className="min-w-0">
                <span className={cn('block h-1.5', pnlColorClass(v))}>
                  <span className="block h-full bg-current opacity-60" style={{ width: `${(Math.abs(v) / max) * 100}%` }} />
                </span>
                <span className="block text-dense-meta leading-normal text-muted-foreground text-pretty">
                  {c.what} · <span className={positionsUi.mono}>{c.formula}</span>
                </span>
              </span>
              <span className={cn(positionsUi.mono, 'text-right text-xs font-semibold', pnlColorClass(v))}>
                {fmtSignedUsd0(v)}
              </span>
            </div>
          )
        })}
      </div>
      <div className="overflow-x-auto border-t border-border">
        {/* §14.6: eight columns, the design's 980 floor. */}
        <table className="w-full min-w-[980px] table-fixed border-collapse">
          <colgroup>
            <col style={{ width: '11%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '27%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className={cn(positionsUi.th, 'text-left')}>Symbol</th>
              <th className={positionsUi.th}>Δ</th>
              <th className={positionsUi.th}>Γ</th>
              <th className={positionsUi.th}>Vega</th>
              <th className={positionsUi.th}>Θ</th>
              <th className={positionsUi.th}>Unexpl.</th>
              <th className={cn(positionsUi.th, 'text-left')}>Greeks</th>
              <th className={cn(positionsUi.th, 'text-left')}>What moved it</th>
            </tr>
          </thead>
          <tbody>
            {symbols.map((s) => {
              const tag = greeksTag(s.greeks_quality)
              const readAny = s.read_rows > 0
              return (
                <tr key={s.symbol ?? '—'}>
                  <td className={cn(positionsUi.td, 'pl-2 text-left font-bold text-[var(--color-entity-option)]')}>
                    {s.symbol ?? '—'}
                  </td>
                  {(['delta_pnl', 'gamma_pnl', 'vega_pnl', 'theta_pnl', 'unexplained'] as const).map((k) => (
                    <td key={k} className={cn(positionsUi.td, readAny ? pnlColorClass(s[k]) : 'text-muted-foreground')}>
                      {readAny ? fmtSignedUsd0(s[k]) : '—'}
                    </td>
                  ))}
                  <td className={cn(positionsUi.td, 'text-left')}>
                    <DenseTag variant={tag.variant} size="cell" title={tag.title}>
                      {tag.label}
                    </DenseTag>
                  </td>
                  <td className={cn(positionsUi.td, 'text-left font-sans whitespace-normal text-muted-foreground')}>
                    {whatMovedIt(s)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className={cn(FOOT, 'm-0')}>{PNL_UNRECORDED.heldBook}</p>
      <div className={cn(FOOT, 'flex flex-col gap-0.5')}>
        <span>
          Greeks: {t.greeks_quality.vendor} vendor · {t.greeks_quality.degraded} degraded · {t.greeks_quality.missing}{' '}
          missing option rows. A degraded Greek is read and tagged; a missing one leaves its row unread — never averaged
          away.
        </span>
        {t.unread_rows > 0 ? (
          <span>
            {t.unread_rows} {t.unread_rows === 1 ? 'row is' : 'rows are'} not in the sums — opened or closed inside a
            session, or without Greeks{t.unread_held_pnl ? ` (held P&L on them ${fmtSignedUsd0(t.unread_held_pnl)})` : ''}.
          </span>
        ) : null}
        {t.mark_anomaly_rows > 0 ? (
          <span className="text-warning">
            {t.mark_anomaly_rows} {t.mark_anomaly_rows === 1 ? 'row carries' : 'rows carry'} a mark under intrinsic at
            one close — a stale last print, not a price — and {fmtSignedUsd0(t.mark_anomaly_unexplained)} of the
            unexplained sits on {t.mark_anomaly_rows === 1 ? 'it' : 'them'} (SNAPSHOT-SPEC §3, mark anomaly).
          </span>
        ) : null}
        {noPrior.length > 0 ? (
          <span>
            Not read: {noPrior.map((s) => fmtIsoDateToken(s.snapshot_date)).join(', ')} — the session before{' '}
            {noPrior.length === 1 ? 'it was' : 'each was'} not captured.
          </span>
        ) : null}
      </div>
    </section>
  )
}
