import { useState, useMemo } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, ArrowDownToLine, ArrowUpFromLine, Landmark, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { getTransactions, postTransactionsFetch } from '@/api/trading'
import { fmtUsd, fmtUsdRound } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  type RangePreset,
  type SummaryMode,
  type SummaryTypeKey,
  RANGE_PRESET_OPTIONS,
  getRangeForPreset,
  getSummaryType,
  getPeriodKey,
} from '@/utils/transferPay'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { AccountTransaction } from '@/types/trading'

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtTxDate(ts: number | null | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return '—'
  return new Date(ts > 1e12 ? ts : ts * 1000).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function typeLabel(t: SummaryTypeKey): string {
  if (t === 'deposit') return 'Deposit'
  if (t === 'withdrawal') return 'Withdrawal'
  if (t === 'dividend') return 'Dividend'
  return 'Other'
}

function typeIcon(t: SummaryTypeKey) {
  if (t === 'deposit') return <ArrowDownToLine className="h-3 w-3" />
  if (t === 'withdrawal') return <ArrowUpFromLine className="h-3 w-3" />
  if (t === 'dividend') return <Landmark className="h-3 w-3" />
  return <HelpCircle className="h-3 w-3" />
}

function amtClass(v: number) {
  if (Math.abs(v) < 0.005) return 'text-muted-foreground'
  return v >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
}

function ChangeBadge({ pct }: { pct: number | null | undefined }) {
  if (pct == null || !Number.isFinite(pct)) return <span className="text-muted-foreground text-[10px]">—</span>
  const sign = pct >= 0 ? '+' : ''
  return (
    <span className={cn('text-[10px]', pct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400')}>
      {sign}{pct.toFixed(1)}%
    </span>
  )
}

const ALL_TYPES: SummaryTypeKey[] = ['deposit', 'withdrawal', 'dividend', 'other']

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TransferPayPage() {
  const qc = useQueryClient()

  const [rangePreset, setRangePreset] = useState<RangePreset>('last_365')
  const [activeAccountId, setActiveAccountId] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<Set<SummaryTypeKey>>(() => new Set(ALL_TYPES))
  const [summaryMode, setSummaryMode] = useState<SummaryMode>('year')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [fetchMsg, setFetchMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const { sinceTs, untilTs } = getRangeForPreset(rangePreset)

  const { data, isLoading, error } = useQuery({
    queryKey: ['trading', 'transactions', rangePreset],
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
        setFetchMsg({ text: res.message ?? `Fetched ${res.count ?? 0} transaction(s).`, ok: true })
        void qc.invalidateQueries({ queryKey: ['trading', 'transactions'] })
      } else {
        setFetchMsg({ text: res.error ?? 'Fetch failed', ok: false })
      }
    },
    onError: (e: unknown) => {
      setFetchMsg({ text: e instanceof Error ? e.message : 'Fetch failed', ok: false })
    },
  })

  const accountIds = useMemo(() => (
    Array.from(new Set(
      transactions.map(tx => tx.account_id).filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    )).sort()
  ), [transactions])

  const visibleByAccount = useMemo(() => (
    activeAccountId === 'all' ? transactions : transactions.filter(tx => tx.account_id === activeAccountId)
  ), [transactions, activeAccountId])

  const filtered = useMemo(() => (
    visibleByAccount.filter(tx => typeFilter.has(getSummaryType(tx.type)))
  ), [visibleByAccount, typeFilter])

  const totalNet = useMemo(() => (
    filtered.reduce((sum, tx) => sum + (Number.isFinite(tx.amount) ? tx.amount : 0), 0)
  ), [filtered])

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
    const pctOf = (cur: number, prev: number) => cur !== 0 ? ((cur - prev) / Math.abs(cur)) * 100 : null
    for (let i = 0; i < chronologicalKeys.length; i++) {
      const pk = chronologicalKeys[i]
      if (i === 0) { ct[pk] = cd[pk] = cw[pk] = cdv[pk] = co[pk] = null; continue }
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
    setTypeFilter(prev => { const next = new Set(prev); if (next.has(t)) { next.delete(t) } else { next.add(t) }; return next })
    setPage(1)
  }

  function toggleAllTypes(on: boolean) {
    setTypeFilter(on ? new Set(ALL_TYPES) : new Set())
    setPage(1)
  }

  return (
    <PageShell className="flex flex-col gap-6">
      <PageHeader
        title="Transfer & Pay"
        titleSize="large"
        description="Cash transfers and dividends from IB Flex — stored in account_transactions."
        actions={
          <>
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5">
              <span className="text-xs text-muted-foreground font-medium">Range</span>
              <Select value={rangePreset} onValueChange={(v) => { setRangePreset(v as RangePreset); setPage(1) }}>
                <SelectTrigger className="h-7 w-[200px] border-0 bg-transparent shadow-none text-xs focus:ring-0 px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANGE_PRESET_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={fetchMutation.isPending}
              onClick={() => { setFetchMsg(null); fetchMutation.mutate() }}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', fetchMutation.isPending && 'animate-spin')} />
              {fetchMutation.isPending ? 'Fetching…' : 'Fetch from IB'}
            </Button>
          </>
        }
      />

      {fetchMsg && (
        <div className={cn(
          'rounded-md border px-3 py-2 text-sm',
          fetchMsg.ok
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
        )}>
          {fetchMsg.text}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {error instanceof Error ? error.message : 'Failed to load transactions'}
        </div>
      )}

      {/* ── Transactions Section ── */}
      <section className="flex flex-col gap-3">
        {/* Filter toolbar */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
          {/* Account tabs */}
          <div className="flex items-center gap-1" role="tablist" aria-label="Account filter">
            {(['all', ...accountIds] as string[]).map(id => (
              <button
                key={id}
                role="tab"
                aria-selected={activeAccountId === id}
                onClick={() => { setActiveAccountId(id); setPage(1) }}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  activeAccountId === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {id === 'all' ? 'All accounts' : id}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Type pills */}
          <div className="flex items-center gap-1.5" role="group" aria-label="Transaction type filter">
            <span className="text-xs text-muted-foreground">Types:</span>
            <button
              onClick={() => toggleAllTypes(typeFilter.size !== ALL_TYPES.length)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                typeFilter.size === ALL_TYPES.length
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/50',
              )}
            >
              All
            </button>
            {ALL_TYPES.map(t => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                  typeFilter.has(t)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/50',
                )}
              >
                {typeIcon(t)}
                {typeLabel(t)}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value) || 15); setPage(1) }}
                className="h-6 rounded border border-border bg-background px-1 text-xs"
                aria-label="Rows per page"
              >
                {[10, 15, 30, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="text-xs text-muted-foreground">
              Net: <span className={cn('font-semibold', amtClass(totalNet))}>{fmtUsd(totalNet)}</span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  disabled={safePage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {safePage} / {totalPages}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Transactions table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium">
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Account</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Currency</th>
                <th className="px-3 py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">Loading…</td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No transactions for this selection.
                  </td>
                </tr>
              ) : (
                paged.map((tx) => {
                  const typeKey = getSummaryType(tx.type)
                  return (
                    <tr
                      key={`${tx.account_id}-${tx.ts}-${tx.amount}-${tx.type}`}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{fmtTxDate(tx.ts)}</td>
                      <td className="px-3 py-2 text-xs">{tx.account_id ?? '—'}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="gap-1 text-[11px] px-1.5 py-0">
                          {typeIcon(typeKey)}
                          {typeLabel(typeKey)}
                        </Badge>
                      </td>
                      <td className={cn('px-3 py-2 text-right font-mono font-medium text-xs', amtClass(tx.amount))}>
                        {fmtUsd(tx.amount)}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{tx.currency ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground max-w-[300px] truncate" title={tx.description ?? ''}>
                        {tx.description ?? '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Summary Section ── */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Summary by period</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Net cash flow per account and in total, grouped by year / quarter / month.
                Percentages show change vs the prior period.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-1" role="tablist" aria-label="Summary period grouping">
            {(['year', 'quarter', 'month'] as SummaryMode[]).map(mode => (
              <button
                key={mode}
                role="tab"
                aria-selected={summaryMode === mode}
                onClick={() => setSummaryMode(mode)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors capitalize',
                  summaryMode === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 py-12 text-center text-sm text-muted-foreground">
            No transactions yet. Fetch from IB to see summary.
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium">
                  <th className="px-3 py-2 text-left whitespace-nowrap">Period</th>
                  {accountIds.map(id => (
                    <th key={id} className="px-3 py-2 text-right whitespace-nowrap">{id}</th>
                  ))}
                  <th className="px-3 py-2 text-right whitespace-nowrap">Total</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Deposit</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Withdrawal</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Dividend</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Other</th>
                </tr>
              </thead>
              <tbody>
                {periodKeys.length === 0 ? (
                  <tr>
                    <td colSpan={6 + accountIds.length} className="py-8 text-center text-sm text-muted-foreground">
                      No summary data for selected range.
                    </td>
                  </tr>
                ) : (
                  periodKeys.map(pk => {
                    const row = summaryByPeriod[pk] ?? {}
                    const tRow = summaryByType[pk] ?? { deposit: 0, withdrawal: 0, dividend: 0, other: 0 }
                    const total = accountIds.reduce((s, id) => s + (row[id] ?? 0), 0)
                    return (
                      <tr key={pk} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2 font-medium text-xs">{pk}</td>
                        {accountIds.map(id => {
                          const v = row[id] ?? 0
                          return (
                            <td key={id} className={cn('px-3 py-2 text-right font-mono text-xs', amtClass(v))}>
                              {fmtUsd(v)}
                            </td>
                          )
                        })}
                        <td className="px-3 py-2 text-right">
                          <div className={cn('font-mono font-semibold text-xs', amtClass(total))}>{fmtUsdRound(total)}</div>
                          <ChangeBadge pct={changes.ct[pk]} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className={cn('font-mono text-xs', amtClass(tRow.deposit))}>{fmtUsdRound(tRow.deposit)}</div>
                          <ChangeBadge pct={changes.cd[pk]} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className={cn('font-mono text-xs', amtClass(tRow.withdrawal))}>{fmtUsdRound(tRow.withdrawal)}</div>
                          <ChangeBadge pct={changes.cw[pk]} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className={cn('font-mono text-xs', amtClass(tRow.dividend))}>{fmtUsdRound(tRow.dividend)}</div>
                          <ChangeBadge pct={changes.cdv[pk]} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className={cn('font-mono text-xs', amtClass(tRow.other))}>{fmtUsdRound(tRow.other)}</div>
                          <ChangeBadge pct={changes.co[pk]} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  )
}
