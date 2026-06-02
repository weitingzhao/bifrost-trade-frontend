import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getTransactions, postTransactionsFetch } from '@/api/trading'
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
import { TransferPayToolbar } from '@/pages/portfolio/transferPay/TransferPayToolbar'
import { TransferPayTransactionsTable } from '@/pages/portfolio/transferPay/TransferPayTransactionsTable'
import { TransferPaySummaryTable } from '@/pages/portfolio/transferPay/TransferPaySummaryTable'
import {
  transferPayPageCardClass,
  transferPayUi,
} from '@/pages/portfolio/transferPay/transferPayUi'

const TRANSFER_PAY_INFO =
  'Data is stored in account_transactions and used for Performance net cash flow. Configure in Settings → IB Connection → Flex.'

const ALL_TYPES: SummaryTypeKey[] = ['deposit', 'withdrawal', 'dividend', 'other']

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
    onSuccess: res => {
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
            .map(tx => tx.account_id)
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
        ),
      ).sort(),
    [transactions],
  )

  const visibleByAccount = useMemo(
    () =>
      activeAccountId === 'all'
        ? transactions
        : transactions.filter(tx => tx.account_id === activeAccountId),
    [transactions, activeAccountId],
  )

  const filtered = useMemo(
    () => visibleByAccount.filter(tx => typeFilter.has(getSummaryType(tx.type))),
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
    setTypeFilter(prev => {
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

  function handleAccountChange(id: string) {
    setActiveAccountId(id)
    setPage(1)
  }

  function handlePageSize(n: number) {
    setPageSize(n)
    setPage(1)
  }

  const fetchOk =
    fetchMsg != null && (fetchMsg.startsWith('Fetched') || fetchMsg.includes('Upserted'))

  const summaryEmptyHint =
    transactions.length === 0
      ? 'No transactions yet. Fetch from IB to see summary.'
      : periodKeys.length === 0
        ? 'No summary available for the selected period.'
        : undefined

  return (
    <PageShell padding="compact" className="space-y-3">
      <div className={transferPayPageCardClass}>
        <div className={transferPayUi.headerRow}>
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
          <div className={transferPayUi.headerActions}>
            <fieldset className={transferPayUi.rangeField} aria-label="IB Flex fetch range">
              <span className={transferPayUi.rangeLegend}>Range</span>
              <Select
                value={rangePreset}
                onValueChange={v => {
                  setRangePreset(v as RangePreset)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-8 min-w-[12.5rem] text-xs" aria-label="IB Flex date range for fetch">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANGE_PRESET_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </fieldset>
            <Button
              size="sm"
              className="h-8 gap-1.5"
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
            </Button>
          </div>
        </div>

        {fetchMsg != null && (
          <p className={fetchOk ? transferPayUi.feedbackOk : transferPayUi.feedbackErr}>{fetchMsg}</p>
        )}

        {error != null && <QueryErrorAlert error={error} onRetry={() => void refetch()} />}

        <section className={transferPayUi.section} aria-label="Cash transactions">
          {isLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          ) : (
            <>
              <TransferPayToolbar
                accountIds={accountIds}
                activeAccountId={activeAccountId}
                onActiveAccountId={handleAccountChange}
                typeFilter={typeFilter}
                onToggleType={toggleType}
                onToggleAllTypes={toggleAllTypes}
                pageSize={pageSize}
                onPageSize={handlePageSize}
                totalNet={totalNet}
                visibleCount={visibleByAccount.length}
                safePage={safePage}
                totalPages={totalPages}
                onPage={setPage}
              />
              <TransferPayTransactionsTable rows={paged} />
            </>
          )}
        </section>

        <section className={transferPayUi.section} aria-label="Cash flow summary">
          {!isLoading && (
            <TransferPaySummaryTable
              summaryMode={summaryMode}
              onSummaryMode={setSummaryMode}
              accountIds={accountIds}
              periodKeys={periodKeys}
              summaryByPeriod={summaryByPeriod}
              summaryByType={summaryByType}
              changes={changes}
              emptyHint={summaryEmptyHint}
            />
          )}
        </section>
      </div>
    </PageShell>
  )
}
