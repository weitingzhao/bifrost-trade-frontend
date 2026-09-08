/**
 * The Research blueprint and its calibration — `/docs/research-blueprint`
 * and `/docs/research-calibration`.
 *
 * Two documents, kept apart on purpose: the blueprint says what Research
 * should be and changes only when the understanding changes; the calibration
 * says what it is today, contract by contract, and changes every time someone
 * measures. Both live in bifrost-research and arrive through the API, so this
 * page can never show a version the repository does not hold.
 */
import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { fetchResearchDoc } from '@/api/research/docs'
import { MarkdownContent } from '@/components/cockpit/MarkdownContent'
import { PageHeader, PageShell } from '@/components/layout'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { DenseTag, SegmentControl } from '@/components/data-display'

const DOCS = [
  { slug: 'blueprint', path: '/docs/research-blueprint', label: 'Blueprint', lead: 'What Research should be. Changes only when the understanding does.' },
  { slug: 'calibration', path: '/docs/research-calibration', label: 'Calibration', lead: 'What Research is today, contract by contract. Changes every time someone measures.' },
] as const

export default function ResearchBlueprintPage() {
  // Which document is decided by the route, so the same page serves both.
  const { pathname } = useLocation()
  const current = DOCS.find((d) => d.path === pathname)?.slug ?? 'blueprint'
  const meta = DOCS.find((d) => d.slug === current)!
  const q = useQuery({
    queryKey: ['research', 'docs', current],
    queryFn: () => fetchResearchDoc(current),
    staleTime: 5 * 60_000,
  })
  const doc = q.data

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title={doc?.title ?? `Research ${meta.label}`}
        description={meta.lead}
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
      <div className="flex items-center gap-2">
        <SegmentControl
          value={current}
          onChange={() => undefined}
          options={DOCS.map((d) => ({ value: d.slug, label: <Link to={d.path}>{d.label}</Link> }))}
        />
      </div>
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
