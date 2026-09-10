/**
 * One dossier card = one face of the symbol: the lenses that answer it, each
 * in the lab's words with its meaning and its record on this symbol, and the
 * lab that reads the face in full.
 */
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
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
          <ul className="space-y-1.5">
            {rows.map((row) => (
              <li key={row.id} className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusLamp lamp={row.lamp} className="h-2 w-2 shrink-0" />
                  <Link
                    to={row.href}
                    className="no-underline"
                    title={row.asOf ? `as of ${row.asOf}` : undefined}
                  >
                    <DenseTag variant={row.tone} size="cell">
                      {`${row.label} · ${row.verdict}`}
                    </DenseTag>
                  </Link>
                  {row.asOf ? (
                    <span className="text-dense-micro text-muted-foreground">{row.asOf}</span>
                  ) : null}
                </div>
                {row.means ? (
                  <p className="text-dense-meta leading-snug text-muted-foreground">{row.means}</p>
                ) : null}
                {row.record ? (
                  <p
                    className="text-dense-caption text-muted-foreground"
                    title={row.recordDetail ?? undefined}
                  >
                    {row.record}
                  </p>
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
