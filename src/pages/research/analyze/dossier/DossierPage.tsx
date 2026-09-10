/**
 * Dossier — one symbol, every face: the six questions the blueprint (§3.2)
 * asks of every name, one card each, with the lab that answers it in full.
 * `/research/dossier?symbol=` — the Workbench's Analyze entry; the hubs are
 * its drill-downs.
 */
import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout'
import { CopilotVerdictStrip } from '@/components/research/CopilotVerdictStrip'
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { Button } from '@/components/ui/button'
import { useDossier } from '@/hooks/useDossier'
import { useLensRegistry } from '@/hooks/useLensRegistry'
import { useResearchContext } from '@/hooks/useResearchContext'
import { DOSSIER_FACES, faceView } from '@/lib/dossier'
import { FaceCard } from './FaceCard'

export default function DossierPage() {
  const { symbol } = useResearchContext()
  const registry = useLensRegistry()
  const { exhibits, loading, failed } = useDossier(symbol)
  const specOf = (canonical: string) => registry.data?.lenses.find((l) => l.id === canonical)
  const views = DOSSIER_FACES.map((face) => faceView(face, exhibits, symbol, specOf))
  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        title="Dossier"
        description="One symbol, every face — the six questions the blueprint asks of every name, each with the lab that answers it in full. Observe-only (D10)."
        actions={
          <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-dense-meta">
            <Link to="/docs/research-blueprint">Blueprint §3.2</Link>
          </Button>
        }
      />
      <ResearchContextBar showDate={false} />
      <CopilotVerdictStrip originPage="dossier" originLabel="Dossier" />
      {!symbol ? (
        <p className="text-dense-meta text-muted-foreground">Pick a symbol to open its dossier.</p>
      ) : (
        <>
          {failed.length > 0 ? (
            <p role="status" className="text-dense-micro text-warning">
              {`${failed.length} ${failed.length === 1 ? 'lens' : 'lenses'} did not answer: ${failed.join(', ')}`}
            </p>
          ) : null}
          {/* Columns, not a grid: the six faces carry wildly different amounts —
              Events reads one line, Volatility and Validation read eight — and a
              grid row is as tall as its tallest cell, so equal cells meant one
              card clipped while another sat 97% empty. CSS columns balance by
              real height, which no row-span estimate can match. */}
          {/* Two columns at every width above md, not three. Measured on NVDA:
              three columns are 33px shorter but leave 665px of ragged column
              remainder against 93px for two — 48% of the layout box empty
              versus 12% — and halve the card width, which these long record
              lines spend on wrapping. Both fit the viewport, so the shorter one
              is not the better one. */}
          <div className="gap-3 md:columns-2 [&>*]:mb-3 [&>*]:break-inside-avoid">
            {views.map((v) => (
              <FaceCard key={v.face.id} view={v} loading={loading} />
            ))}
          </div>
        </>
      )}
    </PageShell>
  )
}
