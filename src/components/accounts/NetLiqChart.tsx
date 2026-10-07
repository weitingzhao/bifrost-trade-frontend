import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/utils/positions'
import type { IbAccountSnapshot } from '@/types/monitor'
import styles from '@/components/positions/PositionsChartsSection.module.css'
import { lampDotClass } from '@/lib/lampTone'
import { fmtIsoDateToken } from '@/lib/format'
import type { NavHistoryResponse } from '@/lib/schemas/snapshots'

const LINE_COLORS = ['var(--color-success)', 'var(--color-link)', 'var(--color-warning)', 'var(--color-chart-option)']

interface Props {
  accounts: IbAccountSnapshot[]
  /** Stored closing NAV (api 0.12.0); null when the API does not serve it, undefined while loading. */
  history?: NavHistoryResponse | null
}

interface Series {
  accountId: string
  color: string
  points: { date: string; pct: number }[]
}

/**
 * Each account's closing net liquidation as % change since its first stored
 * close — one shared axis, so a small account's move is not flattened by a large
 * one. A session the account was not read at the close is a gap, not a zero.
 */
function navSeries(history: NavHistoryResponse, colorOf: (accountId: string) => string): Series[] {
  const by = new Map<string, { date: string; nav: number }[]>()
  for (const r of history.items) {
    if (r.net_liquidation == null || !(r.net_liquidation > 0)) continue
    const list = by.get(r.account_id) ?? []
    list.push({ date: r.snapshot_date, nav: r.net_liquidation })
    by.set(r.account_id, list)
  }
  return [...by.entries()].map(([accountId, list]) => {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))
    const base = sorted[0].nav
    return { accountId, color: colorOf(accountId), points: sorted.map((p) => ({ date: p.date, pct: (p.nav / base - 1) * 100 })) }
  })
}

function NavCurve({ history, colorOf }: { history: NavHistoryResponse; colorOf: (accountId: string) => string }) {
  const series = navSeries(history, colorOf)
  const dates = history.sessions
  if (dates.length < 2) {
    return (
      <p className="flex items-start gap-1.5 text-dense-meta text-muted-foreground">
        <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', lampDotClass('gray'))} aria-hidden />
        <span>
          {dates.length === 0
            ? 'No closing net liquidation is stored yet — the nightly snapshot writes one per account after the close.'
            : `One close stored (${fmtIsoDateToken(dates[0])}); the curve needs two.`}
        </span>
      </p>
    )
  }
  const all = series.flatMap((s) => s.points.map((p) => p.pct))
  const lo = Math.min(0, ...all)
  const hi = Math.max(0, ...all)
  const pad = Math.max((hi - lo) * 0.1, 0.05)
  const y = (v: number) => 86 - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * 82
  const x = (d: string) => (dates.indexOf(d) / (dates.length - 1)) * 316 + 2
  return (
    <div className="mat-card p-2">
      <svg viewBox="0 0 320 90" preserveAspectRatio="none" className="block h-[90px] w-full" role="img" aria-label="Net liquidation over time">
        <line x1="0" x2="320" y1={y(0)} y2={y(0)} stroke="var(--sk-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {series.map((s) => (
          <polyline
            key={s.accountId}
            points={s.points.map((p) => `${x(p.date)},${y(p.pct)}`).join(' ')}
            fill="none"
            stroke={s.color}
            strokeWidth="1.75"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <span className="text-dense-micro text-muted-foreground">
        % change since each account&rsquo;s first stored close · {dates.length} sessions, {fmtIsoDateToken(dates[0])} →{' '}
        {fmtIsoDateToken(dates[dates.length - 1])}
        {history.dropped.length
          ? ` · ${history.dropped.length} account-session${history.dropped.length === 1 ? '' : 's'} read before the close left out (gaps)`
          : ''}
      </span>
    </div>
  )
}

function getNetLiq(a: IbAccountSnapshot): number {
  const v = a.summary?.NetLiquidation
  if (v == null) return NaN
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : NaN
}

export function NetLiqChart({ accounts, history }: Props) {
  const rows = useMemo(
    () =>
      accounts
        .map((a, i) => ({
          accountId: a.account_id ?? '',
          label: a.account_id ?? `Account ${i + 1}`,
          value: getNetLiq(a),
          color: LINE_COLORS[i % LINE_COLORS.length],
        }))
        .filter((r) => Number.isFinite(r.value)),
    [accounts],
  )

  const total = rows.reduce((sum, r) => sum + Math.max(0, r.value), 0)
  const colorOf = (accountId: string) => {
    const i = rows.findIndex((r) => r.accountId === accountId)
    return i >= 0 ? rows[i].color : 'var(--sk-mute)'
  }
  const hasHistory = history != null && history.sessions.length >= 2

  return (
    <div className={cn(styles.panel, 'w-full self-start')}>
      <div className={styles.chartSectionHeader}>
        <span className={styles.chartSectionTitle}>Net liquidation</span>
        <span className="text-sm font-semibold">by account · {hasHistory ? 'with stored history' : 'snapshot'}</span>
        <Link
          to="/portfolio/performance"
          className="ml-auto text-dense-meta text-primary hover:underline"
        >
          history → Performance
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No account data.</p>
      ) : (
        <div className="space-y-3">
          {history != null ? <NavCurve history={history} colorOf={colorOf} /> : null}
          {total > 0 && (
            <div
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/40"
              role="img"
              aria-label="Net liquidation share by account"
            >
              {rows.map((r) => {
                const share = Math.max(0, r.value) / total
                if (share <= 0) return null
                return (
                  <div
                    key={r.accountId}
                    className="h-full min-w-[2px] transition-[width] duration-300"
                    style={{ width: `${share * 100}%`, backgroundColor: r.color }}
                    title={`${r.label}: ${fmtUsd(r.value, true)} (${(share * 100).toFixed(1)}%)`}
                  />
                )
              })}
            </div>
          )}

          <ul className="space-y-1.5">
            {rows.map((r) => {
              const share = total > 0 ? (Math.max(0, r.value) / total) * 100 : 0
              return (
                <li key={r.accountId} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-2 text-xs">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: r.color }}
                  />
                  <span className="truncate font-mono text-muted-foreground">{r.label}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {total > 0 ? `${share.toFixed(1)}%` : '—'}
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {fmtUsd(r.value, true)}
                  </span>
                </li>
              )
            })}
          </ul>

          {total > 0 && (
            <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
              <span className="text-muted-foreground">Total net liq.</span>
              <span className="font-mono font-semibold tabular-nums">{fmtUsd(total, true)}</span>
            </div>
          )}

          {history === null ? (
            <p className="flex items-start gap-1.5 text-dense-meta text-muted-foreground">
              <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', lampDotClass('gray'))} aria-hidden />
              <span>
                This is a snapshot, and the title says so. This API does not serve the stored net-liq
                series (trade-api 0.12.0 adds it); the book&apos;s history over time lives on Performance.
              </span>
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
