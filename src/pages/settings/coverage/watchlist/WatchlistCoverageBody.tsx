/**
 * Are the symbols I trade covered, and is the coverage fresh.
 *
 * This view was a stub for months telling the reader to open the Legacy
 * Frontend, which spine D8 had already archived. The components written for it
 * expect the retired Massive API's eighteen-table row and have no source; the
 * plugin answers the same question in a smaller shape, and this is that shape
 * rendered honestly: the plugin's own verdict first, then the checks behind it,
 * then what the warehouse holds, then the per-symbol option rows.
 *
 * The verdict is the plugin's, not a second opinion computed here. Two places
 * scoring the same data is how a dashboard starts disagreeing with itself.
 */
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { DenseTag, EmptyState } from '@/components/data-display'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import {
  useCoverageDbSummary,
  useCoverageInventory,
  useCoverageQuality,
  useCoverageWatchlist,
} from '@/hooks/useMarketDataCoverage'
import { fmtInt, fmtIsoTs } from '@/lib/format'
import type { CoverageQualityCheck } from '@/api/marketDataCoverage'

/** A check's own fields vary; these are the ones worth showing when present. */
function checkDetail(c: CoverageQualityCheck): string {
  const bits: string[] = []
  const n = (k: string) => (typeof c[k] === 'number' ? (c[k] as number) : null)
  const wl = n('watchlist_symbols')
  if (wl != null) bits.push(`${wl} watchlist symbols`)
  const sym = n('symbol_count')
  if (sym != null) bits.push(`${fmtInt(sym)} symbols`)
  const optionable = n('optionable_symbols')
  if (optionable != null) bits.push(`${optionable} optionable`)
  if (typeof c.target_date === 'string') bits.push(`target ${c.target_date}`)
  const age = n('max_age_hours')
  if (age != null) bits.push(`max age ${age}h`)
  const dims = Array.isArray(c.dimensions) ? (c.dimensions as { dimension?: string; status?: string }[]) : []
  const bad = dims.filter((d) => d.status && d.status !== 'ok').map((d) => d.dimension)
  if (bad.length) bits.push(`stale: ${bad.join(', ')}`)
  return bits.join(' · ')
}

export function WatchlistCoverageBody() {
  const quality = useCoverageQuality()
  const inventory = useCoverageInventory()
  const watchlist = useCoverageWatchlist()
  const dbSummary = useCoverageDbSummary()

  const firstError = [quality, inventory, watchlist, dbSummary].find((q) => q.isError)
  if (firstError?.isError) {
    return <QueryErrorAlert error={firstError.error} onRetry={() => void firstError.refetch()} />
  }

  const verdict = quality.data?.summary ?? null
  const checks = quality.data?.checks ?? []
  const inv = inventory.data
  const rows = watchlist.data?.symbols ?? []
  const freshness = dbSummary.data?.freshness ?? []
  const counts = dbSummary.data?.counts ?? {}
  const stale = freshness.filter((f) => f.status && f.status !== 'ok')

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-dense-body font-semibold">Plugin verdict</h2>
          {quality.isLoading ? (
            <Skeleton className="h-5 w-16" />
          ) : verdict ? (
            <DenseTag variant={verdict === 'PASS' ? 'success' : 'danger'} size="cell">
              {verdict}
            </DenseTag>
          ) : (
            <span className="text-dense-label text-muted-foreground">not reported</span>
          )}
          <span className="text-dense-label text-muted-foreground">
            Scored by the Market Data Plugin over {quality.data?.watchlist_source_count ?? '—'} watchlist symbols.
          </span>
        </div>
        {quality.isLoading ? (
          <Skeleton className="mt-2 h-16 w-full" />
        ) : (
          <ul className="mt-2 space-y-1.5">
            {checks.map((c) => (
              <li key={c.check} className="flex items-start gap-2 text-dense-label">
                {c.ok ? (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                ) : (
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
                )}
                <span className="min-w-0">
                  <span className="font-mono text-foreground">{c.check}</span>
                  {checkDetail(c) ? <span className="text-muted-foreground"> — {checkDetail(c)}</span> : null}
                </span>
              </li>
            ))}
            {checks.length === 0 ? <li className="text-dense-label text-muted-foreground">No checks reported.</li> : null}
          </ul>
        )}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Tile label="Watchlist" loading={inventory.isLoading}>
          <span className="font-mono text-lg font-semibold tabular-nums">{inv?.watchlist_symbols?.length ?? '—'}</span>
          <span className="text-dense-label text-muted-foreground">symbols in scope</span>
        </Tile>
        <Tile label="Stock daily" loading={inventory.isLoading}>
          <span className="font-mono text-lg font-semibold tabular-nums">{fmtInt(inv?.stock_daily?.symbols ?? 0)}</span>
          <span className="text-dense-label text-muted-foreground">
            symbols · to {inv?.stock_daily?.max_date ?? '—'}
          </span>
        </Tile>
        <Tile label="Option" loading={inventory.isLoading}>
          <span className="font-mono text-lg font-semibold tabular-nums">{inv?.option?.underlyings ?? '—'}</span>
          <span className="text-dense-label text-muted-foreground">
            underlyings · snapshots to {inv?.option?.snapshot_latest ?? '—'}
          </span>
        </Tile>
      </section>

      <section>
        <div className="mb-1 flex flex-wrap items-baseline gap-2">
          <h2 className="text-dense-body font-semibold">Per symbol</h2>
          <span className="text-dense-label text-muted-foreground">
            Option contracts the plugin holds for each watchlist name.
          </span>
        </div>
        {watchlist.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <EmptyState title="No watchlist rows" description="The plugin reported no symbols for this scope." />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[420px] text-dense-label">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-left text-dense-meta uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-1.5">Symbol</th>
                  <th className="px-3 py-1.5 text-right">Contracts</th>
                  <th className="px-3 py-1.5 text-right">Expiries</th>
                  <th className="px-3 py-1.5">Newest contract</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.symbol} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-1 font-mono font-semibold">{r.symbol}</td>
                    <td className="px-3 py-1 text-right font-mono tabular-nums">{fmtInt(r.contract_count ?? 0)}</td>
                    <td className="px-3 py-1 text-right font-mono tabular-nums">{r.expiries ?? '—'}</td>
                    <td className="px-3 py-1 text-muted-foreground">{fmtIsoTs(r.newest_contract_ts ?? null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
        <h2 className="text-dense-body font-semibold">Warehouse</h2>
        {dbSummary.isLoading ? (
          <Skeleton className="mt-2 h-16 w-full" />
        ) : (
          <>
            <dl className="mt-2 grid gap-x-6 gap-y-1 md:grid-cols-3">
              {Object.entries(counts).map(([table, n]) => (
                <div key={table} className="flex items-baseline justify-between gap-2">
                  <dt className="font-mono text-dense-caption text-muted-foreground">{table}</dt>
                  <dd className="font-mono tabular-nums">{fmtInt(n)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-dense-label text-muted-foreground">
              {stale.length === 0
                ? `All ${freshness.length} ingest dimensions reported ok.`
                : `Stale: ${stale.map((f) => `${f.dimension} (${f.status})`).join(', ')}.`}
            </p>
          </>
        )}
      </section>
    </div>
  )
}

function Tile({ label, loading, children }: { label: string; loading: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
      <div className="text-dense-meta uppercase tracking-wide text-muted-foreground">{label}</div>
      {loading ? (
        <Skeleton className="mt-1 h-6 w-20" />
      ) : (
        <div className="mt-1 flex flex-wrap items-baseline gap-2">{children}</div>
      )}
    </div>
  )
}
