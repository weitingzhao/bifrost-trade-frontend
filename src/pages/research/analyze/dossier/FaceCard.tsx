/**
 * One dossier card = one face of the symbol: the lenses that answer it, each
 * in the lab's words with its meaning and its record on this symbol, and the
 * lab that reads the face in full.
 */
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { cn } from '@/lib/utils'
import { StatusLamp } from '@/components/StatusLamp'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { DossierFaceView } from '@/lib/dossier'

export function FaceCard({ view, loading }: { view: DossierFaceView; loading: boolean }) {
  const { face, rows, headline, lamp, coverage, href, recordScopes } = view
  return (
    <Card variant="elevated" data-testid={`face-${face.id}`}>
      <CardContent className="space-y-1.5 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <StatusLamp lamp={loading ? 'yellow' : lamp} className="h-2.5 w-2.5 shrink-0" />
            <p className="truncate text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
              {face.title}
            </p>
            {coverage ? (
              <span className="text-dense-micro text-muted-foreground">{`${coverage.read}/${coverage.of} read`}</span>
            ) : null}
          </div>
          <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-dense-meta">
            <Link to={href}>Open</Link>
          </Button>
        </div>
        <p className="text-dense-micro text-muted-foreground">{face.question}</p>
        <p className="text-dense-label font-medium leading-snug">
          {loading && rows.length === 0 ? 'Reading…' : headline}
        </p>
        {rows.length > 0 ? (
          /* The design's row is four columns — lens, its reading, what that
             reading has been worth, and the sample it rests on (Rev
             2026-09-18.2). This side printed the band's word and then two
             sentences, which reads as prose where the design reads as a
             sheet: the number the lens actually produced was the one thing
             missing. The long record sentence is still here, on the row's
             title, where it was already the hover. */
          <ul className="m-0 flex list-none flex-col p-0">
            {rows.map((row) => (
              <li
                key={row.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 border-b border-border/40 py-1 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
                title={row.recordDetail ?? (row.asOf ? `as of ${row.asOf}` : undefined)}
              >
                <span className="flex min-w-0 items-baseline gap-1.5">
                  <StatusLamp lamp={row.lamp} className="mt-0.5 h-2 w-2 shrink-0 self-center" />
                  <Link to={row.href} className="min-w-0 truncate text-dense-label no-underline hover:underline">
                    {row.label}
                  </Link>
                </span>
                <span
                  className={cn('whitespace-nowrap text-right font-mono text-dense-label tabular-nums', row.tone)}
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
          {recordScopes ? (
            // Names, not readings. Each of these lenses already shows its record
            // on the face that owns it; what is only knowable here is which of
            // them settled on this symbol and which are borrowing a pooled one.
            <div className="space-y-1 pt-0.5">
              {(
                [
                  ['On this symbol', recordScopes.scoped, 'success'],
                  ['Pooled across symbols', recordScopes.pooled, 'neutral'],
                ] as const
              ).map(([label, names, tone]) =>
                names.length > 0 ? (
                  <div key={label} className="flex flex-wrap items-center gap-1">
                    <span className="text-dense-micro text-muted-foreground">{label}</span>
                    {names.map((n) => (
                      <DenseTag key={n} variant={tone} size="cell">
                        {n}
                      </DenseTag>
                    ))}
                  </div>
                ) : null,
              )}
            </div>
          ) : null}
      </CardContent>
    </Card>
  )
}
