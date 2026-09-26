/**
 * Indices & vol — the design's own last panel, and the only one this page was
 * missing outright.
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { fmtPct1 } from '@/lib/format'
import type { DailyBenchmark, QuoteItem } from '@/types/market'
import { withSymbolParam } from '@/lib/symbolLink'
import { ANALYZE_HUB } from '@/lib/analyzeHubs'
import { referenceStanding, referenceTiles } from './referenceModel'

export function ReferencePanel({
  benchmarks,
  quotes,
  declared,
}: {
  benchmarks: Record<string, DailyBenchmark>
  quotes: Record<string, QuoteItem>
  declared?: readonly string[]
}) {
  const tiles = referenceTiles(benchmarks, quotes, declared)
  return (
    <section className="overflow-hidden border mat-card">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
        <span className="text-dense-meta font-semibold text-muted-foreground">
          Reference
        </span>
        <span className="text-dense-body font-semibold">indices &amp; vol</span>
        <span className="ml-auto text-dense-caption text-muted-foreground">
          {referenceStanding(tiles)}
        </span>
      </header>
      <div className="flex flex-wrap gap-x-6 gap-y-2 px-3 py-2.5">
        {tiles.map((t) => (
          <div key={t.symbol} className="flex min-w-[86px] flex-col gap-0.5">
            <span className="text-dense-meta font-semibold text-muted-foreground">
              {t.unavailable ? (
                t.symbol
              ) : (
                <Link
                  to={withSymbolParam(ANALYZE_HUB.dossier, t.symbol)}
                  className="hover:text-foreground"
                >
                  {t.symbol}
                </Link>
              )}
            </span>
            {t.unavailable ? (
              <span
                className="font-mono text-dense-body font-bold text-muted-foreground/60"
                title={t.unavailable}
              >
                —
              </span>
            ) : (
              <>
                <span className="font-mono text-dense-body font-bold tabular-nums">
                  {t.last != null ? t.last.toFixed(2) : '—'}
                </span>
                <span
                  className={cn(
                    'font-mono text-dense-caption tabular-nums',
                    t.changePct == null
                      ? 'text-muted-foreground'
                      : t.changePct > 0
                        ? 'text-profit'
                        : t.changePct < 0
                          ? 'text-loss'
                          : 'text-muted-foreground',
                  )}
                  title={`${t.why}${t.live ? '' : ' · settled close, the tape is not running'}`}
                >
                  {t.changePct == null ? '—' : fmtPct1(t.changePct)}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="border-t border-border px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
        Chosen for an options book: SPY · QQQ · IWM proxies, VIX for the vol regime, TLT for the
        rate leg. Home&rsquo;s tape is not these five — there it is the β benchmark plus the names
        carrying the most exposure, by that page&rsquo;s own design rule. Deeper event context is on{' '}
        <Link to="/research/events" className="text-foreground hover:underline">
          the events board
        </Link>
        .
      </p>
    </section>
  )
}
