/**
 * The Research blueprint — `/docs/research-blueprint`.
 *
 * What Research should be, written down once so the code can be measured
 * against it. The text lives in bifrost-research and arrives through the API;
 * this page renders it and says which version it is looking at.
 */
import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
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
        title={doc?.title ?? 'Research Blueprint'}
        description="The target, not the feature list. Calibration compares the code against the numbered contracts here; the numbers are stable, the text is not."
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
      {q.isError ? (
        <QueryErrorAlert error={q.error} />
      ) : q.isLoading || !doc ? (
        <Skeleton className="h-96 w-full rounded-md" />
      ) : (
        <article className="max-w-4xl">
          <MarkdownContent className="prose prose-sm prose-invert max-w-none [&_table]:text-dense-meta [&_pre]:text-dense-micro">
            {doc.markdown}
          </MarkdownContent>
        </article>
      )}
    </PageShell>
  )
}
