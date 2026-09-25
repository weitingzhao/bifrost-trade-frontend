/**
 * Earnings moves — what the straddle priced the session before each print,
 * against the move that came (`/analytics/vol/earnings-moves`, research 0.122.0).
 *
 * The print dates are the name's 8-K Item 2.02 filings. A filing carries a
 * date and not a time, so the route reads the session before the filing to the
 * session after it and takes the larger single-session move — the page prints
 * that convention under the table rather than leaving it to be guessed.
 * Item 2.02 filings that are not results releases (Tesla's delivery reports)
 * are set aside by the route and named under the table (research 0.123.0).
 */
import type { EarningsMoves } from '@/api/research/vrp'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  crushText,
  earningsStory,
  movePct,
  pricedPct,
  printLabel,
  setAsideLine,
  ratioBarWidth,
  ratioText,
  underPriced,
} from './earningsText'

interface Props {
  data: EarningsMoves | null | undefined
  isLoading: boolean
  error: unknown
  onRetry: () => void
}

export function HistoryEarnings({ data, isLoading, error, onRetry }: Props) {
  if (isLoading) return <Skeleton className="mx-3 my-3 h-44 rounded" />
  if (error) {
    return (
      <div className="px-3 py-3">
        <QueryErrorAlert error={error} onRetry={onRetry} />
      </div>
    )
  }
  if (!data) return null
  const aside = setAsideLine(data)

  return (
    <div className="space-y-2 px-3 py-3">
      {data.prints.length > 0 ? (
        <table data-sr-table="" className="w-full">
          <thead>
            <tr>
              <th data-sr-col="entity">Print</th>
              <th data-sr-col="num">Priced</th>
              <th data-sr-col="num">Actual</th>
              <th data-sr-col="tag">Actual / priced</th>
              <th data-sr-col="num">IV crush</th>
            </tr>
          </thead>
          <tbody>
            {data.prints.map((p) => {
              const over = underPriced(p)
              return (
                <tr key={p.filed}>
                  <td
                    data-sr-col="entity"
                    className="text-muted-foreground"
                    title={`8-K Item 2.02 filed ${p.filed}${p.before && p.after ? ` · read ${p.before} → ${p.after}` : ''}`}
                  >
                    {printLabel(p.filed)}
                  </td>
                  <td
                    data-sr-col="num"
                    className="text-foreground/80"
                    title={p.expiry && p.before ? `ATM straddle on the ${p.expiry} expiry, as of ${p.before}` : undefined}
                  >
                    {pricedPct(p.priced)}
                  </td>
                  <td
                    data-sr-col="num"
                    className={cn(p.ratio == null ? 'text-muted-foreground' : over ? 'text-loss' : 'text-profit')}
                    title={p.direction ? `${p.direction} — the larger single session in the window` : undefined}
                  >
                    {movePct(p.actual)}
                  </td>
                  <td data-sr-col="tag" className="min-w-[130px]">
                    {p.ratio != null ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="relative inline-block h-1.5 w-[84px] overflow-hidden rounded-sm bg-muted">
                          <span
                            className={cn('absolute inset-y-0 left-0', over ? 'bg-loss' : 'bg-profit')}
                            style={{ width: `${ratioBarWidth(p.ratio)}%` }}
                          />
                          <span className="absolute inset-y-0 left-1/2 w-px bg-muted-foreground/60" />
                        </span>
                        <span className={cn('font-mono text-dense-meta', over ? 'text-loss' : 'text-profit')}>
                          {ratioText(p.ratio)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-dense-meta text-muted-foreground" title={p.missing ?? undefined}>
                        not priced
                      </span>
                    )}
                  </td>
                  <td
                    data-sr-col="num"
                    className="text-muted-foreground"
                    title={p.crush_expiry ? `ATM IV of the ${p.crush_expiry} expiry, after the print less before` : undefined}
                  >
                    {crushText(p.crush_pts)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : null}

      <p
        className={cn(
          'max-w-[90ch] text-dense-meta leading-relaxed text-muted-foreground',
          data.prints.length > 0 && 'border-t border-border/60 pt-2'
        )}
      >
        {earningsStory(data)}
      </p>
      {aside ? <p className="max-w-[90ch] text-dense-meta leading-relaxed text-muted-foreground">{aside}</p> : null}
      {data.prints.length > 0 ? (
        <p className="max-w-[90ch] text-dense-caption text-muted-foreground/70">
          A filing carries a date, not a time: each row reads the last session before it to the first after it, and
          Actual is the larger single-session move in that window. Priced is the at-the-money straddle for the first
          expiry covering the window, at its implied vol the session before. IV crush is the ATM IV change across the
          window, on the first expiry both sessions price. Prints are the 8-K Item 2.02 filings — the results release;
          one whose words say nothing about results, with the release following within 45 days, is set aside.
        </p>
      ) : null}
    </div>
  )
}
