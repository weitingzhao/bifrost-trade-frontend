/**
 * The Research blueprint — `/docs/research-blueprint`, in System › Alignment.
 *
 * It says what Research should be and changes only when the understanding
 * changes. Its counterpart, what Research is today contract by contract, is
 * the Calibration page beside it, which reads both documents; the calibration
 * document's own text is that page's Source view (`/docs/research-calibration`
 * forwards there since 2026-09-25). The blueprint lives in bifrost-research and
 * arrives through the API, so this page can never show a version the
 * repository does not hold.
 */
import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchResearchDoc } from '@/api/research/docs'
import { MarkdownContent } from '@/components/cockpit/MarkdownContent'
import { PageHeader, PageShell } from '@/components/layout'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { DenseTag } from '@/components/data-display'

export default function ResearchBlueprintPage() {
  const q = useQuery({
    queryKey: ['research', 'docs', 'blueprint'],
    queryFn: () => fetchResearchDoc('blueprint'),
    staleTime: 5 * 60_000,
  })
  const doc = q.data

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        breadcrumb={<p className="text-xs font-medium text-primary/90">System / Alignment</p>}
        title={doc?.title ?? 'Research Blueprint'}
        description="What Research should be. Changes only when the understanding does."
        actions={
          doc ? (
            <div className="flex items-center gap-2 text-dense-meta text-muted-foreground">
              {doc.version ? <DenseTag variant="neutral" size="cell">v{doc.version}</DenseTag> : null}
              {doc.updated ? <span>{doc.updated}</span> : null}
              {doc.status ? <DenseTag variant="warning" size="cell">{doc.status}</DenseTag> : null}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-dense-micro" title="Edit the source, not this page">
                {doc.path}
                <ExternalLink className="ml-1 inline size-3 opacity-60" aria-hidden />
              </code>
            </div>
          ) : null
        }
      />
      <p className="m-0 text-dense-meta text-muted-foreground">
        What Research is today, against each of these contracts:{' '}
        <Link to="/research/lab/calibration" className="text-primary hover:underline">
          Calibration →
        </Link>
      </p>
      {q.isError ? (
        <QueryErrorAlert error={q.error} />
      ) : q.isLoading || !doc ? (
        <Skeleton className="h-96 w-full rounded-md" />
      ) : (
        // A centred document, not a left-aligned page container: the
        // distinction §5a.3 draws is `margin: 0 auto` — with it a measure is
        // typography, without it it is a dead strip down the right of a wide
        // screen. This is prose, so it keeps the measure and gains the
        // centring it was missing.
        <article className="mx-auto max-w-4xl">
          <MarkdownContent className="prose prose-sm prose-invert max-w-none [&_table]:text-dense-meta [&_pre]:text-dense-micro">
            {doc.markdown}
          </MarkdownContent>
        </article>
      )}
    </PageShell>
  )
}
