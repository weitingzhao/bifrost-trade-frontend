import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { ExecSourceBadge } from '@/pages/portfolio/ledger/ExecSourceBadge'
import { usePerformanceOnTheFly } from '@/hooks/usePerformanceOnTheFly'
import type { Execution } from '@/types/positions'
import type { PerformanceTimeRange } from '@/utils/ledger/performanceUtils'
import {
  executionDateStr,
  ledgerOptionExecutionDisplayPnl,
  optionRightToFull,
  stockOnTheFlyUnrealizedPnlLeg,
} from '@/utils/ledger/performanceUtils'
import {
  fmtChicagoTime,
  fmtPnl,
  fmtUsd,
} from '@/pages/portfolio/performance/performanceFormatters'
import styles from './PerformancePage.module.css'

type SecTab = 'all' | 'OPT' | 'STK'

interface PerformanceOnTheFlySectionProps {
  timeRange: PerformanceTimeRange
  calendarMonth: string
  strategyOpportunityId: number | null
  strategyInstanceId: number | null
}

function kvToneClass(n: number): string {
  if (Math.abs(n) < 0.005) return ''
  return n >= 0 ? styles.tonePositive : styles.toneNegative
}

export function PerformanceOnTheFlySection({
  timeRange,
  calendarMonth,
  strategyOpportunityId,
  strategyInstanceId,
}: PerformanceOnTheFlySectionProps) {
  const [open, setOpen] = useState(false)
  const [secTab, setSecTab] = useState<SecTab>('all')

  const { data, isLoading, isError, error } = usePerformanceOnTheFly({
    enabled: open,
    timeRange,
    calendarMonth,
    strategyOpportunityId,
    strategyInstanceId,
  })

  const execs = data?.executions ?? []
  const filtered = execs.filter((e) => {
    if (secTab === 'all') return true
    return (e.sec_type ?? '').toUpperCase() === secTab
  })

  const tabCount = (tab: SecTab) => {
    if (tab === 'all') return execs.length
    return execs.filter((e) => (e.sec_type ?? '').toUpperCase() === tab).length
  }

  return (
    <section className={styles.sectionPane} aria-label="On the fly executions">
      <div className={styles.onTheFlyHeader}>
        <h3 className={styles.onTheFlyTitle}>On the fly</h3>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Hide' : 'Show'}
        </Button>
      </div>
      <p className={styles.onTheFlyHint}>
        TWS-side executions that are not already covered by the official book (same account and contract as a row in
        the Flex/Journal ledger). Option combo legs (<code className={styles.inlineCode}>BAG</code>) are
        omitted. Same time range and strategy filters as above.
      </p>

      {open && (
        <>
          {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {isError && (
            <p className={cn('text-xs', styles.toneNegative)}>{error?.message ?? 'Failed to load on-the-fly data'}</p>
          )}
          {!isLoading && !isError && data?.perf.summary != null && (
            <div className={styles.onTheFlySummary} aria-label="On the fly summary total">
              <span className={styles.onTheFlySummaryKv}>
                Trades <strong>{data.perf.summary.trade_count ?? 0}</strong>
              </span>
              <span className={styles.onTheFlySummaryKv}>
                Net PnL{' '}
                <strong className={kvToneClass(data.perf.summary.net_pnl ?? 0)}>
                  {fmtPnl(data.perf.summary.net_pnl ?? 0)}
                </strong>
              </span>
              <span className={styles.onTheFlySummaryKv}>
                Realized <strong>{fmtPnl(data.perf.summary.realized ?? 0)}</strong>
              </span>
              <span className={styles.onTheFlySummaryKv}>
                Commission <strong>{fmtUsd(data.perf.summary.total_commission ?? 0)}</strong>
              </span>
            </div>
          )}

          {!isLoading && !isError && data?.computed != null && execs.length > 0 && (() => {
            const optExecs = execs.filter((e) => (e.sec_type ?? '').toUpperCase() === 'OPT')
            const stkExecs = execs.filter((e) => (e.sec_type ?? '').toUpperCase() === 'STK')
            const optComm = optExecs.reduce((s, e) => s + (Number(e.commission) || 0), 0)
            const stkComm = stkExecs.reduce((s, e) => s + (Number(e.commission) || 0), 0)
            const { opt: oAg, stk: sAg } = data.computed
            return (
              <div className="space-y-2 mb-3" aria-label="On the fly by sec type">
                <div className={styles.onTheFlySummary}>
                  <span className="text-xs font-semibold text-foreground">Options (OPT)</span>
                  <span className={styles.onTheFlySummaryKv}>
                    Trades <strong>{optExecs.length}</strong>
                  </span>
                  <span className={styles.onTheFlySummaryKv}>
                    Realized (FIFO){' '}
                    <strong className={kvToneClass(oAg.realized)}>{fmtPnl(oAg.realized)}</strong>
                  </span>
                  <span className={styles.onTheFlySummaryKv}>
                    Unrealized (open){' '}
                    <strong className={kvToneClass(oAg.unrealized)}>{fmtPnl(oAg.unrealized)}</strong>
                    <InfoTooltip text="Option legs use the same per-execution cash flow as Trade Ledger → Options → Details (PnL column). Pairing uses backend opt pairs when available, else FIFO by contract. Trade date falls back to exec date when Flex trade_date is missing." />
                  </span>
                  <span className={styles.onTheFlySummaryKv}>
                    Commission <strong>{fmtUsd(optComm)}</strong>
                  </span>
                </div>
                <div className={styles.onTheFlySummary}>
                  <span className="text-xs font-semibold text-foreground">Stocks (STK)</span>
                  <span className={styles.onTheFlySummaryKv}>
                    Trades <strong>{stkExecs.length}</strong>
                  </span>
                  <span className={styles.onTheFlySummaryKv}>
                    Realized (FIFO){' '}
                    <strong className={kvToneClass(sAg.realized)}>{fmtPnl(sAg.realized)}</strong>
                  </span>
                  <span className={styles.onTheFlySummaryKv}>
                    Unrealized (open){' '}
                    <strong className={kvToneClass(sAg.unrealized)}>{fmtPnl(sAg.unrealized)}</strong>
                  </span>
                  <span className={styles.onTheFlySummaryKv}>
                    Commission <strong>{fmtUsd(stkComm)}</strong>
                  </span>
                </div>
              </div>
            )
          })()}

          {!isLoading && !isError && execs.length === 0 && (
            <p className="text-xs text-muted-foreground">No on-the-fly executions in this range.</p>
          )}

          {!isLoading && execs.length > 0 && (
            <>
              <div className={styles.onTheFlySecTabs} role="tablist" aria-label="On the fly sec type">
                {(['all', 'OPT', 'STK'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={secTab === tab}
                    className={cn(styles.onTheFlySecTab, secTab === tab && styles.onTheFlySecTabActive)}
                    onClick={() => setSecTab(tab)}
                  >
                    {tab === 'all' ? 'All' : tab}
                    <span className={styles.onTheFlySecTabCount}>{tabCount(tab)}</span>
                  </button>
                ))}
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Sec</th>
                      <th>Execution ID</th>
                      <th>Trade date</th>
                      <th>Time</th>
                      <th>Account</th>
                      <th>Symbol</th>
                      <th>Expiry</th>
                      <th>Strike</th>
                      <th>Right</th>
                      <th>Side</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Source</th>
                      <th>
                        {secTab === 'STK'
                          ? 'Unrealized PnL'
                          : secTab === 'OPT'
                            ? 'PnL'
                            : 'PnL / Unrealized PnL'}
                      </th>
                      <th>Realized PnL</th>
                      <th>Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e) => (
                      <OnTheFlyRow key={rowKey(e)} exec={e} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}

function rowKey(e: Execution): string {
  return String(e.account_executions_id ?? `${e.account_id}-${e.time}-${e.symbol}`)
}

function OnTheFlyRow({ exec: e }: { exec: Execution }) {
  const isOpt = (e.sec_type ?? '').toUpperCase() === 'OPT'
  const isStk = (e.sec_type ?? '').toUpperCase() === 'STK'
  const rp = e.realized_pnl
  const rpNum = rp != null && typeof rp === 'number' && Number.isFinite(rp) ? rp : null
  const tradeDateDisplay = (e.trade_date ?? '').trim() || executionDateStr(e) || '—'
  const ledgerPnl = isOpt ? ledgerOptionExecutionDisplayPnl(e) : null
  const stkUnrealLeg = isStk ? stockOnTheFlyUnrealizedPnlLeg(e) : null

  return (
    <tr>
      <td>{e.sec_type ?? '—'}</td>
      <td>{e.account_executions_id ?? '—'}</td>
      <td title={(e.trade_date ?? '').trim() ? undefined : 'Exec date (Chicago) — no Flex trade_date on this row'}>
        {tradeDateDisplay}
      </td>
      <td>{fmtChicagoTime(e.time)}</td>
      <td>{e.account_id ?? '—'}</td>
      <td>{e.symbol ?? '—'}</td>
      <td>{isOpt ? (e.expiry ?? '—') : '—'}</td>
      <td>{isOpt ? (e.strike != null ? String(e.strike) : '—') : '—'}</td>
      <td>{isOpt ? optionRightToFull(e.option_right) : '—'}</td>
      <td>{e.side ?? '—'}</td>
      <td>{e.quantity ?? '—'}</td>
      <td>{fmtUsd(e.price)}</td>
      <td><ExecSourceBadge source={e.source} /></td>
      <td className={isOpt && ledgerPnl != null ? kvToneClass(ledgerPnl) : isStk && stkUnrealLeg != null ? styles.toneUnrealized : ''}>
        {isOpt && ledgerPnl != null
          ? fmtPnl(ledgerPnl)
          : isStk && stkUnrealLeg != null
            ? fmtPnl(stkUnrealLeg)
            : '—'}
      </td>
      <td className={rpNum == null ? '' : kvToneClass(rpNum)}>
        {rpNum == null ? '—' : fmtPnl(rpNum)}
      </td>
      <td>{fmtUsd(e.commission)}</td>
    </tr>
  )
}
