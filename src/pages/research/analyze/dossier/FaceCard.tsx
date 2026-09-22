/**
 * One face of the symbol: what it concluded, what that means, and its rows.
 *
 * The design's card is three parts in this order (Rev 2026-09-18.2): a header
 * that names the face and says where it is read in full, a **verdict block** —
 * a colour bar, the verdict, and one line of what it means — and then the rows,
 * each `lens · reading · 5d% · 20d% · n`.
 *
 * This side led with the blueprint's question instead ("Where is the price in
 * its cycle?"), then a headline of `lens · verdict`, and no means line: the
 * card said what it was *asking* before it said what it *found*, and the
 * sentence that makes a verdict usable was missing entirely. The question is
 * now the header's hover — the cut changed, the questions did not.
 *
 * `drove the rating` is the design's own tag and it is not decoration: with six
 * faces and one composite, the reader's first question is which face moved it.
 */
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { cn } from '@/lib/utils'
import { StatusLamp } from '@/components/StatusLamp'
import { Card, CardContent } from '@/components/ui/card'
import type { DossierFaceView } from '@/lib/dossier'

/** The 3px rail the design paints beside a verdict, in the verdict's tone. */
const TONE_BAR: Record<string, string> = {
  success: 'bg-[var(--color-profit)]',
  danger: 'bg-destructive',
  warning: 'bg-warning',
  info: 'bg-primary',
  neutral: 'bg-border',
}

export function FaceCard({
  view,
  loading,
  drove,
}: {
  view: DossierFaceView
  loading: boolean
  /** True on the one face whose decisive lens carried the rating. */
  drove?: boolean
}) {
  const { face, rows, headline, means, tone, lamp, coverage, href } = view
  return (
    <Card
      variant="elevated"
      data-testid={`face-${face.id}`}
      className={cn('overflow-hidden', drove && 'border-primary/40')}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-2 border-b border-border/60 bg-secondary/50 px-3 py-1.5">
          <StatusLamp lamp={loading ? 'yellow' : lamp} className="h-2.5 w-2.5 shrink-0" />
          <p className="truncate text-dense-label font-semibold" title={face.question}>
            {face.title}
          </p>
          {drove ? (
            <DenseTag variant="info" size="cell">
              drove the rating
            </DenseTag>
          ) : null}
          {coverage ? (
            <span className="shrink-0 text-dense-micro text-muted-foreground">{`${coverage.read}/${coverage.of} read`}</span>
          ) : null}
          <Link
            to={href}
            className="ml-auto shrink-0 text-dense-meta text-primary hover:underline"
            title={`${face.question} — read in full`}
          >
            {face.openLabel}
          </Link>
        </div>

        {/* The verdict, with its meaning under it. The design paints the bar in
            the verdict's own tone and lets the verdict carry the only colour on
            the card — the rows stay neutral so this line is the one that
            reads. */}
        <div className="flex gap-2.5 border-b border-border/60 py-1.5 pr-3">
          <span className={cn('w-[3px] shrink-0 rounded-r-sm', TONE_BAR[tone] ?? TONE_BAR.neutral)} />
          <div className="min-w-0">
            <p className={cn('text-dense-label font-semibold leading-snug', tone)}>
              {loading && rows.length === 0 ? 'Reading…' : headline}
            </p>
            {means ? (
              <p className="mt-0.5 text-dense-meta leading-snug text-muted-foreground">{means}</p>
            ) : null}
          </div>
        </div>

        {rows.length > 0 ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {rows.map((row) => (
              <li
                key={row.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 border-b border-border/40 px-3 py-1 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
                title={row.recordDetail ?? (row.asOf ? `as of ${row.asOf}` : undefined)}
              >
                <span className="flex min-w-0 items-baseline gap-1.5">
                  <StatusLamp lamp={row.lamp} className="mt-0.5 h-2 w-2 shrink-0 self-center" />
                  <Link
                    to={row.href}
                    className="min-w-0 truncate text-dense-label no-underline hover:underline"
                  >
                    {row.label}
                  </Link>
                </span>
                <span
                  className="whitespace-nowrap text-right font-mono text-dense-label font-semibold tabular-nums"
                  title={row.means ?? undefined}
                >
                  {row.value ?? row.verdict}
                </span>
                <span className="hidden whitespace-nowrap text-right font-mono text-dense-micro tabular-nums text-muted-foreground sm:block">
                  {row.rates ?? '—'}
                </span>
                <span className="hidden whitespace-nowrap text-right font-mono text-dense-micro tabular-nums text-muted-foreground/70 sm:block">
                  {row.sample ?? ''}
                </span>
                {/* A lens with no band did not answer, and why it could not
                    is not a hover: an absent reading has to say what is
                    missing, where a present one only explains itself. */}
                {row.band == null && row.means ? (
                  <span className="col-span-full pl-3.5 text-dense-meta leading-snug text-muted-foreground">
                    {row.means}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )
}
