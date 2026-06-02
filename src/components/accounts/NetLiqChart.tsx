import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/utils/positions'
import type { IbAccountSnapshot } from '@/types/monitor'
import styles from '@/components/positions/PositionsChartsSection.module.css'

const LINE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6']

interface Props {
  accounts: IbAccountSnapshot[]
}

function getNetLiq(a: IbAccountSnapshot): number {
  const v = a.summary?.NetLiquidation
  if (v == null) return NaN
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : NaN
}

export function NetLiqChart({ accounts }: Props) {
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

  return (
    <div className={cn(styles.panel, 'w-full self-start')}>
      <div className={styles.chartSectionHeader}>
        <span className={styles.chartSectionTitle}>Net liquidation over time</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No account data.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] leading-snug text-muted-foreground">
            Current snapshot by account. Historical series will appear when time-series data is stored.
          </p>

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
        </div>
      )}
    </div>
  )
}
