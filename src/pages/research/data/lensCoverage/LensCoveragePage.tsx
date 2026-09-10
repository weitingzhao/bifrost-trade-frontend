/**
 * Lens Coverage — what the foundation can actually see, across the universe.
 *
 * The Dossier answers "which faces does this symbol have"; this page answers
 * the same question about every symbol at once, which is the number that says
 * whether widening the option universe is reaching the analysis or only the
 * collector. Observe-only (D10).
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DenseTag } from '@/components/data-display'
import { PageHeader, PageShell } from '@/components/layout'
import { StatusLamp } from '@/components/StatusLamp'
import { Card, CardContent } from '@/components/ui/card'
import { fetchLensCoverage, type CoverageLens } from '@/api/research/lensCoverage'
import { ANALYZE_HUB, withSymbolParam } from '@/lib/analyzeHubs'
import type { LampColor } from '@/lib/researchFreshness'
import { cn } from '@/lib/utils'

/** The blueprint's faces (§3.2), in reading order. */
const FACE_LABEL: Record<string, string> = {
  trend: 'Trend & structure',
  volatility: 'Volatility',
  positioning: 'Positioning',
  forecast: 'Forecast',
  validation: 'Validation',
}
const FACE_ORDER = ['trend', 'volatility', 'positioning', 'forecast', 'validation']

export function coverageLamp(lens: CoverageLens): LampColor {
  if (lens.unscreenable) return 'gray'
  // `read == null` is "no reading", which coveragePct already renders as '—'.
  // Today every null also carries an `unscreenable` reason and is caught above,
  // so this is consistency rather than a live fix — but the two functions
  // disagreed about the same field, and only one of them could be right.
  if (lens.read == null) return 'gray'
  if (lens.read === 0) return 'red'
  const share = lens.of > 0 ? lens.read / lens.of : 0
  return share >= 0.9 ? 'green' : share >= 0.25 ? 'yellow' : 'red'
}

export function coveragePct(lens: CoverageLens): string {
  if (lens.unscreenable || lens.read == null || lens.of === 0) return '—'
  return `${Math.round((lens.read / lens.of) * 100)}%`
}

function LensRow({ lens }: { lens: CoverageLens }) {
  const width = lens.read != null && lens.of > 0 ? Math.max(1, (lens.read / lens.of) * 100) : 0
  return (
    <li className="space-y-0.5">
      <div className="flex items-center gap-2">
        <StatusLamp lamp={coverageLamp(lens)} className="h-2 w-2 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-dense-meta">{lens.label}</span>
        <span className="text-dense-micro tabular-nums text-muted-foreground">
          {lens.unscreenable || lens.read == null ? '—' : `${lens.read} / ${lens.of}`}
        </span>
        <span className="w-10 text-right text-dense-micro tabular-nums">{coveragePct(lens)}</span>
      </div>
      {lens.unscreenable ? (
        <p className="pl-4 text-dense-micro italic text-muted-foreground">{lens.unscreenable}</p>
      ) : (
        <div className="ml-4 h-1 overflow-hidden rounded bg-secondary">
          <div
            className={cn(
              'h-full rounded',
              width >= 90 ? 'bg-success' : width >= 25 ? 'bg-warning' : 'bg-danger'
            )}
            style={{ width: `${width}%` }}
          />
        </div>
      )}
    </li>
  )
}

export default function LensCoveragePage() {
  const q = useQuery({
    queryKey: ['research', 'lens-coverage'],
    queryFn: () => fetchLensCoverage(),
    staleTime: 60_000,
  })
  const data = q.data
  const byFace = FACE_ORDER.map((face) => ({
    face,
    lenses: (data?.lenses ?? []).filter((l) => l.face === face),
  })).filter((g) => g.lenses.length > 0)
  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        title="Lens Coverage"
        description="What the foundation can see across the whole universe — one row per lens, one card per blueprint face. The Dossier asks this of one symbol; this asks it of all of them."
        actions={
          <Link to="/docs/research-calibration" className="text-dense-meta hover:underline">
            Calibration
          </Link>
        }
      />
      {q.isPending ? (
        <p className="text-dense-meta text-muted-foreground">Reading the universe…</p>
      ) : null}
      {q.isError ? (
        <p role="status" className="text-dense-meta text-danger">
          Coverage unavailable — the screen could not read the lens layer.
        </p>
      ) : null}
      {data ? (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5">
            <span className="text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground">
              Universe
            </span>
            <span className="text-dense-meta tabular-nums">{data.universe} symbols</span>
            <span className="text-dense-micro text-muted-foreground">{data.tiers.join(' · ')}</span>
            <DenseTag variant={data.every_face > 0 ? 'success' : 'danger'} size="cell">
              {`${data.every_face} with every face`}
            </DenseTag>
            <DenseTag variant={data.no_option_face > 0 ? 'warning' : 'neutral'} size="cell">
              {`${data.no_option_face} stock-side only`}
            </DenseTag>
            <Link
              to={withSymbolParam(ANALYZE_HUB.dossier, 'SPY')}
              className="ml-auto text-dense-micro text-muted-foreground hover:text-foreground"
            >
              One symbol → Dossier
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {byFace.map(({ face, lenses }) => (
              <Card key={face} variant="elevated" data-testid={`coverage-${face}`}>
                <CardContent className="space-y-2 px-3 py-3">
                  <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
                    {FACE_LABEL[face] ?? face}
                  </p>
                  <ul className="space-y-1.5">
                    {lenses.map((lens) => (
                      <LensRow key={lens.lens} lens={lens} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </PageShell>
  )
}
