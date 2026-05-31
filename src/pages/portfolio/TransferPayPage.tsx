import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { getTransactions, postTransactionsFetch } from '@/api/trading'
import { fmtUsd, fmtUsdRound } from '@/lib/format'
import { cn } from '@/lib/utils'
import { QUERY_KEYS } from '@/constants/queryKeys'
import {
  type RangePreset,
  type SummaryMode,
  type SummaryTypeKey,
  RANGE_PRESET_OPTIONS,
  getRangeForPreset,
  getSummaryType,
  getPeriodKey,
} from '@/utils/transferPay'
import type { AccountTransaction } from '@/types/trading'
import styles from './transferPay.module.css'

const TRANSFER_PAY_INFO =
  'Data is stored in account_transactions and used for Performance net cash flow. Configure in Settings → IB Connection → Flex.'

const ALL_TYPES: SummaryTypeKey[] = ['deposit', 'withdrawal', 'dividend', 'other']

const TYPE_LABELS: Record<SummaryTypeKey, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  dividend: 'Dividend',
  other: 'Other',
}

function fmtTxDate(ts: number | null | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return '—'
  return new Date(ts > 1e12 ? ts : ts * 1000).toLocaleDateString('en-CA')
}

function pnlClass(v: number): string {
  if (Math.abs(v) < 0.005) return styles.pnlZero
  return v >= 0 ? styles.pnlPositive : styles.pnlNegative
}

function ChangeVsPrev({ pct }: { pct: number | null | undefined }) {
  if (pct == null || !Number.isFinite(pct)) {
    return <span className={styles.changeHint}>—</span>
  }
  const sign = pct >= 0 ? '+' : ''
  return (
    <span className={styles.changeHint}>
      {sign}{pct.toFixed(1)}% vs prev
    </span>
  )
}

export default function TransferPayPage() {
  const qc = useQueryClient()

  const [rangePreset, setRangePreset] = useState<RangePreset>('last_365')
  const [activeAccountId, setActiveAccountId] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<Set<SummaryTypeKey>>(() => new Set(ALL_TYPES))
  const [summaryMode, setSummaryMode] = useState<SummaryMode>('year')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [fetchMsg, setFetchMsg] = useState<string | null>(null)

  const { sinceTs, untilTs } = getRangeForPreset(rangePreset)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEYS.trading.transactions, rangePreset],
    queryFn: () => getTransactions({ since_ts: sinceTs, until_ts: untilTs, limit: 500 }),
  })

  const transactions = useMemo<AccountTransaction[]>(() => data?.transactions ?? [], [data])

  const fetchMutation = useMutation({
    mutationFn: () => {
      const r = getRangeForPreset(rangePreset)
      const payload = rangePreset === 'last_365' ? undefined : { from_date: r.fromDate, to_date: r.toDate }
      return postTransactionsFetch(payload)
    },
    onSuccess: (res) => {
      if (res.ok) {
        setFetchMsg(res.message ?? `Fetched ${res.count ?? 0} transaction(s).`)
        void qc.invalidateQueries({ queryKey: QUERY_KEYS.trading.transactions })
      } else {
        setFetchMsg(res.error ?? 'Fetch failed')
      }
    },
    onError: (e: unknown) => {
      setFetchMsg(e instanceof Error ? e.message : 'Fetch failed')
    },
  })

  const accountIds = useMemo(
    () =>
      Array.from(
        new Set(
          transactions
            .map((tx) => tx.account_id)
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
        ),
      ).sort(),
    [transactions],
  )

  const visibleByAccount = useMemo(
    () => (activeAccountId === 'all' ? transactions : transactions.filter((tx) => tx.account_id === activeAccountId)),
    [transactions, activeAccountId],
  )

  const filtered = useMemo(
    () => visibleByAccount.filter((tx) => typeFilter.has(getSummaryType(tx.type))),
    [visibleByAccount, typeFilter],
  )

  const totalNet = useMemo(
    () => filtered.reduce((sum, tx) => sum + (Number.isFinite(tx.amount) ? tx.amount : 0), 0),
    [filtered],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const { summaryByPeriod, summaryByType, chronologicalKeys } = useMemo(() => {
    const byPeriod: Record<string, Record<string, number>> = {}
    const byType: Record<string, Record<SummaryTypeKey, number>> = {}
    for (const tx of transactions) {
      if (!tx?.account_id) continue
      const amt = Number(tx.amount)
      if (!Number.isFinite(amt)) continue
      const key = getPeriodKey(tx.ts, summaryMode)
      if (!key) continue
      byPeriod[key] ??= {}
      byPeriod[key][tx.account_id] = (byPeriod[key][tx.account_id] ?? 0) + amt
      byType[key] ??= { deposit: 0, withdrawal: 0, dividend: 0, other: 0 }
      byType[key][getSummaryType(tx.type)] += amt
    }
    return { summaryByPeriod: byPeriod, summaryByType: byType, chronologicalKeys: Object.keys(byPeriod).sort() }
  }, [transactions, summaryMode])

  const changes = useMemo(() => {
    const ct: Record<string, number | null> = {}
    const cd: Record<string, number | null> = {}
    const cw: Record<string, number | null> = {}
    const cdv: Record<string, number | null> = {}
    const co: Record<string, number | null> = {}
    const pctOf = (cur: number, prev: number) => (cur !== 0 ? ((cur - prev) / Math.abs(cur)) * 100 : null)
    for (let i = 0; i < chronologicalKeys.length; i++) {
      const pk = chronologicalKeys[i]
      if (i === 0) {
        ct[pk] = cd[pk] = cw[pk] = cdv[pk] = co[pk] = null
        continue
      }
      const ppk = chronologicalKeys[i - 1]
      const row = summaryByPeriod[pk] ?? {}
      const prev = summaryByPeriod[ppk] ?? {}
      const tRow = summaryByType[pk] ?? { deposit: 0, withdrawal: 0, dividend: 0, other: 0 }
      const tPrev = summaryByType[ppk] ?? { deposit: 0, withdrawal: 0, dividend: 0, other: 0 }
      const total = accountIds.reduce((s, id) => s + (row[id] ?? 0), 0)
      const prevTotal = accountIds.reduce((s, id) => s + (prev[id] ?? 0), 0)
      ct[pk] = pctOf(total, prevTotal)
      cd[pk] = pctOf(tRow.deposit, tPrev.deposit)
      cw[pk] = pctOf(tRow.withdrawal, tPrev.withdrawal)
      cdv[pk] = pctOf(tRow.dividend, tPrev.dividend)
      co[pk] = pctOf(tRow.other, tPrev.other)
    }
    return { ct, cd, cw, cdv, co }
  }, [chronologicalKeys, summaryByPeriod, summaryByType, accountIds])

  const periodKeys = [...chronologicalKeys].reverse()

  function toggleType(t: SummaryTypeKey) {
    setTypeFilter((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
    setPage(1)
  }

  function toggleAllTypes(on: boolean) {
    setTypeFilter(on ? new Set(ALL_TYPES) : new Set())
    setPage(1)
  }

  const fetchOk =
    fetchMsg != null && (fetchMsg.startsWith('Fetched') || fetchMsg.includes('Upserted'))

  return (
    <PageShell padding="compact" className="space-y-3">
      <div className={styles.pageCard}>
        <div className={styles.headerRow}>
          <PageHeader
            breadcrumb={<p className="text-xs text-primary/90 font-medium">Portfolio / Transfer & Pay</p>}
            title={
              <span className="inline-flex items-center gap-1">
                Transfer & Pay
                <InfoTooltip text={TRANSFER_PAY_INFO} />
              </span>
            }
            titleSize="large"
          />
          <div className={styles.headerActions}>
            <fieldset className={styles.rangeField} aria-label="IB Flex fetch range">
              <span className={styles.rangeLegend}>Range</span>
              <select
                className={styles.rangeSelect}
                value={rangePreset}
                onChange={(e) => {
                  setRangePreset(e.target.value as RangePreset)
                  setPage(1)
                }}
                aria-label="IB Flex date range for fetch"
              >
                {RANGE_PRESET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </fieldset>
            <button
              type="button"
              className={styles.btnFetch}
              disabled={fetchMutation.isPending}
              onClick={() => {
                setFetchMsg(null)
                fetchMutation.mutate()
              }}
              aria-busy={fetchMutation.isPending}
              title="Pull cash transactions from IB Flex for selected range and write to account_transactions"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', fetchMutation.isPending && 'animate-spin')} />
              {fetchMutation.isPending ? 'Fetching…' : 'Fetch from IB'}
            </button>
          </div>
        </div>

        {fetchMsg != null && (
          <p className={fetchOk ? styles.feedbackOk : styles.feedbackErr}>{fetchMsg}</p>
        )}

        {error != null && (
          <QueryErrorAlert error={error} onRetry={() => void refetch()} />
        )}

        <section className={styles.section} aria-label="Cash transactions">
          {isLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          ) : (
            <>
              <div className={styles.toolbar}>
                <div className={styles.appTabs} role="tablist" aria-label="Account tabs">
                  {(['all', ...accountIds] as string[]).map((id) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={activeAccountId === id}
                      className={cn(styles.appTab, activeAccountId === id && styles.appTabActive)}
                      onClick={() => {
                        setActiveAccountId(id)
                        setPage(1)
                      }}
                    >
                      {id === 'all' ? 'All accounts' : id}
                    </button>
                  ))}
                </div>

                <fieldset className={styles.typesFilter} aria-label="Transaction types">
                  <span className={styles.typesLegend}>Types</span>
                  <div className={styles.typePills}>
                    <button
                      type="button"
                      className={cn(
                        styles.typePill,
                        typeFilter.size === ALL_TYPES.length && styles.typePillActive,
                      )}
                      aria-pressed={typeFilter.size === ALL_TYPES.length}
                      onClick={() => toggleAllTypes(typeFilter.size !== ALL_TYPES.length)}
                    >
                      All
                    </button>
                    {ALL_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={cn(styles.typePill, typeFilter.has(t) && styles.typePillActive)}
                        aria-pressed={typeFilter.has(t)}
                        onClick={() => toggleType(t)}
                      >
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className={styles.toolbarRight}>
                  <label className="inline-flex items-center gap-1.5">
                    <span>Rows:</span>
                    <select
                      className={styles.rowsSelect}
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value) || 15)
                        setPage(1)
                      }}
                      aria-label="Rows per page"
                    >
                      {[10, 15, 30, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span>
                    Net cash:{' '}
                    <span className={cn(styles.netCashValue, pnlClass(totalNet))}>{fmtUsd(totalNet)}</span>
                  </span>
                  {visibleByAccount.length > 0 && (
                    <div className={styles.pagination} aria-label="Transaction pages">
                      <button
                        type="button"
                        className={styles.pageBtn}
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Prev
                      </button>
                      <span className={styles.pageInfo}>
                        Page {safePage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        className={styles.pageBtn}
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.dataTable} aria-label="Cash transactions">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Account</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Currency</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyCell}>
                          No transactions for this selection.
                        </td>
                      </tr>
                    ) : (
                      paged.map((tx) => (
                        <tr key={`${tx.account_id}-${tx.ts}-${tx.amount}-${tx.type}`}>
                          <td>{fmtTxDate(tx.ts)}</td>
                          <td>{tx.account_id ?? '—'}</td>
                          <td>{tx.type ?? '—'}</td>
                          <td className={cn(styles.amountCell, pnlClass(tx.amount))}>{fmtUsd(tx.amount)}</td>
                          <td>{tx.currency ?? '—'}</td>
                          <td className={styles.descCell} title={tx.description ?? ''}>
                            {tx.description ?? '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className={styles.section} aria-label="Cash flow summary">
          <div className={styles.summaryHead}>
            <h3 className={styles.summaryTitle}>
              Summary by period
              <InfoTooltip text="Net cash flow per account and in total, grouped by year / quarter / month for the loaded range (last 365 days or current fetch window)." />
            </h3>
            <div className={styles.summaryView}>
              <span className={styles.viewLabel}>View:</span>
              <div className={styles.appTabs} role="tablist" aria-label="Summary period">
                {(['year', 'quarter', 'month'] as SummaryMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={summaryMode === mode}
                    className={cn(styles.appTab, summaryMode === mode && styles.appTabActive)}
                    onClick={() => setSummaryMode(mode)}
                  >
                    {mode === 'year' ? 'Year' : mode === 'quarter' ? 'Quarter' : 'Month'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {transactions.length === 0 ? (
            <p className={styles.sectionHint}>No transactions yet. Fetch from IB to see summary.</p>
          ) : periodKeys.length === 0 ? (
            <p className={styles.sectionHint}>No summary available for the selected period.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.dataTable} aria-label="Cash flow summary">
                <thead>
                  <tr>
                    <th>Period</th>
                    {accountIds.map((id) => (
                      <th key={id}>{id}</th>
                    ))}
                    <th>Total</th>
                    <th>Deposit</th>
                    <th>Withdrawal</th>
                    <th>Dividend</th>
                    <th>Other</th>
                  </tr>
                </thead>
                <tbody>
                  {periodKeys.map((pk) => {
                    const row = summaryByPeriod[pk] ?? {}
                    const tRow = summaryByType[pk] ?? { deposit: 0, withdrawal: 0, dividend: 0, other: 0 }
                    const total = accountIds.reduce((s, id) => s + (row[id] ?? 0), 0)
                    return (
                      <tr key={pk}>
                        <td>{pk}</td>
                        {accountIds.map((id) => {
                          const v = row[id] ?? 0
                          return (
                            <td key={id} className={cn(styles.amountCell, pnlClass(v))}>
                              {fmtUsd(v)}
                            </td>
                          )
                        })}
                        <td className={styles.amountCell}>
                          <span className={pnlClass(total)}>{fmtUsdRound(total)}</span>
                          <ChangeVsPrev pct={changes.ct[pk]} />
                        </td>
                        <td className={styles.amountCell}>
                          <span className={pnlClass(tRow.deposit)}>{fmtUsdRound(tRow.deposit)}</span>
                          <ChangeVsPrev pct={changes.cd[pk]} />
                        </td>
                        <td className={styles.amountCell}>
                          <span className={pnlClass(tRow.withdrawal)}>{fmtUsdRound(tRow.withdrawal)}</span>
                          <ChangeVsPrev pct={changes.cw[pk]} />
                        </td>
                        <td className={styles.amountCell}>
                          <span className={pnlClass(tRow.dividend)}>{fmtUsdRound(tRow.dividend)}</span>
                          <ChangeVsPrev pct={changes.cdv[pk]} />
                        </td>
                        <td className={styles.amountCell}>
                          <span className={pnlClass(tRow.other)}>{fmtUsdRound(tRow.other)}</span>
                          <ChangeVsPrev pct={changes.co[pk]} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  )
}
