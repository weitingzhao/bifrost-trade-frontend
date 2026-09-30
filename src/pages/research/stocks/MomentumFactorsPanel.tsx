/**
 * Momentum · factors — the nine sub-scores behind one name's momentum.
 *
 * The design moved this here from Momentum Radar (Package 2026-09-23.2,
 * §15.2). Two things are worth saying about that move, both measured:
 *
 * - **This app has never shown these values.** The radar page carries the
 *   legend that explains the nine and draws a card with the score, the grade
 *   and the path — the sub-scores themselves appear nowhere. So the
 *   destination is not equal to the origin here, it is strictly more.
 * - **The radar runs a session behind the ratings.** On DEV 2026-09-23 the
 *   ratings read `2026-09-23` and the newest momentum row for every symbol
 *   tried was `2026-09-22`. The panel therefore stamps its own session in the
 *   header rather than inheriting the page's — which is what the design's own
 *   `session 22 Sep` asks for, and the reason it asks.
 *
 * One request per selected symbol: `/research/momentum/radar?symbol=X` answers
 * with that name's latest row and nothing else. Asked without a symbol the
 * endpoint returns the top 200 scores across its whole history — 102 distinct
 * names over three months — which is not a per-name lookup, so the panel never
 * asks it that way.
 */
import { useQuery } from '@tanstack/react-query'
import { DenseTag } from '@/components/data-display'
import { fetchMomentumRadar } from '@/api/researchEngine'
import { fmtIsoDateToken } from '@/lib/format'
import { momentumFactorReadings } from '@/lib/momentumFactors'
import { cn } from '@/lib/utils'

export function MomentumFactorsPanel({
  symbol,
  session,
  isSelection,
}: {
  /** The selected row, or the top of the ranking when nothing is selected. */
  symbol: string | null
  /**
   * A specific session to read, when the caller has one in mind.
   *
   * Leaders selects a *cell*, which is a name on a day — the latest row would
   * answer a question the reader did not ask. Today has no session axis, so
   * it passes null and takes the name's newest.
   */
  session?: string | null
  isSelection: boolean
}) {
  const q = useQuery({
    queryKey: ['momentum-radar-symbol', symbol, session ?? 'latest'],
    queryFn: () =>
      fetchMomentumRadar({
        symbol: symbol ?? undefined,
        trade_date: session || undefined,
        limit: 1,
      }),
    enabled: !!symbol,
    staleTime: 5 * 60_000,
  })

  const hit = q.data?.rows?.[0] ?? null
  const readings = momentumFactorReadings(hit)

  return (
    <section
      className="border mat-card"
      aria-label="Momentum factors"
    >
      <header className="border-b border-border px-3 py-2">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-dense-label font-semibold text-foreground">Momentum · factors</span>
          {symbol ? (
            <span className="font-mono text-dense-meta text-entity-symbol">{symbol}</span>
          ) : null}
        </p>
        <p className="mt-0.5 font-mono text-dense-caption text-muted-foreground">
          {!symbol
            ? 'no row in view'
            : q.isLoading
              ? 'reading…'
              : hit
                ? `grade ${hit.grade} · path ${hit.path} · session ${fmtIsoDateToken(hit.trade_date)}`
                : 'no momentum row for this name'}
        </p>
      </header>

      {symbol && !q.isLoading && !hit ? (
        <p className="px-3 py-2.5 text-dense-caption leading-relaxed text-muted-foreground">
          The radar scores a subset of the universe, so a name in the ratings need not have a
          momentum row. This is a fact about the radar's coverage, not a failure.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {readings.map((f) => (
            <li key={f.key} className="px-3 py-1.5" title={f.pinned ?? f.note}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-dense-meta text-foreground">{f.key}</span>
                <span
                  className={cn(
                    'font-mono text-dense-meta tabular-nums',
                    f.tone === 'unread' ? 'text-muted-foreground' : 'text-foreground',
                    f.tone === 'strong' && 'font-semibold',
                  )}
                >
                  {f.text}
                </span>
              </div>
              {/* Magnitude, not judgement: the bar says where on 0–100 this
                  sits. The page colours no unsigned score (§14.7 keeps the
                  direction hues for signed numbers), so weight carries the
                  reading and the track carries the scale. */}
              <div className="mt-1 h-1 w-full rounded-full bg-[var(--sk-line)]" aria-hidden>
                {f.tone !== 'unread' ? (
                  <div
                    className={cn(
                      'h-1 rounded-full',
                      f.tone === 'strong' ? 'bg-primary/70' : 'bg-muted-foreground/45',
                    )}
                    style={{ width: `${Math.max(0, Math.min(100, Number(f.text)))}%` }}
                  />
                ) : null}
              </div>
              <p className="mt-0.5 text-dense-caption leading-snug text-muted-foreground">
                {f.note}
                {f.pinned ? (
                  <>
                    {' '}
                    <DenseTag variant="warning" size="cell">
                      not computed
                    </DenseTag>
                  </>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-border px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
        {isSelection
          ? 'Selected row. Esc clears the selection.'
          : 'Top row of the ranking — click a row to read its factors.'}
      </p>
    </section>
  )
}
