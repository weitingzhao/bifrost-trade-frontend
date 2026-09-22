/**
 * One lens reading: the number, and where it sits on the lens's own scale.
 *
 * Both ratings pages draw this cell and the design draws it the same way on
 * both — `Research Ratings Stocks.dc.html` and `Research Scan.dc.html` share
 * the `.os-cell-lens` rule, a 38px number beside a 6px track. It lived inside
 * the Stocks page until Vol ratings needed it too; a second copy would have
 * been a second place for the marker to drift off the track.
 *
 * The design shades a grey band behind the marker — the lens's own 252-session
 * range — and neither row carries one: a scan row reports today's reading and
 * nothing of the lens's history. So the track is filled to the value instead,
 * which still ranks rows against each other, and the title says what the fill
 * is not. Colour stays on the number; a column of saturated bars out-shouts
 * the tags and grades that are the cells actually trying to say something.
 */
import { cn } from '@/lib/utils'

export function LensBarCell({
  label,
  pos,
  ink,
  title,
}: {
  /** What the cell prints — a raw reading, a score, or `8/11`. */
  label: string
  /** Where the marker sits, 0–100 on the lens's own scale; null draws none. */
  pos: number | null
  /** Tailwind colour class for the number, from the page's own thresholds. */
  ink?: string
  title?: string
}) {
  return (
    <span className="flex items-center gap-1.5" title={title}>
      <span className={cn('w-9 shrink-0 text-right font-mono tabular-nums', ink)}>{label}</span>
      <span className="relative block h-1.5 w-full min-w-10 rounded-sm bg-secondary">
        {pos != null ? (
          <>
            <span
              className="absolute inset-y-0 left-0 rounded-sm bg-foreground/20"
              style={{ width: `${Math.max(2, Math.min(100, pos))}%` }}
            />
            <span
              className="absolute -top-0.5 h-2.5 w-0.5 rounded-sm bg-primary"
              style={{ left: `calc(${Math.min(99, Math.max(0, pos))}% - 1px)` }}
            />
          </>
        ) : null}
      </span>
    </span>
  )
}
