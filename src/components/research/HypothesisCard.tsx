/**
 * Compact Hypothesis card for Research Home + list views (Wave RS-A4).
 *
 * Renders one `Hypothesis` as an elevated Card with:
 *   - status DenseTag + optional origin_page
 *   - title + 2-line clamped thesis
 *   - symbol / tag chips
 *   - relative updated timestamp + Open button
 *
 * The card itself is a clickable link. Consumers can override the target via
 * `to`, otherwise it navigates to `/research/hypothesis/{id}` (detail page is
 * scaffolded post-A4 — for now the link is graceful even if the route is not
 * yet mounted, because React Router simply renders the 404 boundary).
 */
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { DenseTag, type DenseTagVariant } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Hypothesis, HypothesisStatus } from '@/api/researchHypothesis'

const STATUS_VARIANT: Record<HypothesisStatus, DenseTagVariant> = {
  active: 'info',
  validated: 'success',
  rejected: 'danger',
  archived: 'neutral',
}

const STATUS_LABEL: Record<HypothesisStatus, string> = {
  active: 'Active',
  validated: 'Validated',
  rejected: 'Rejected',
  archived: 'Archived',
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return '—'
  const now = Date.now()
  const delta = Math.max(0, now - then)
  const mins = Math.floor(delta / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toISOString().slice(0, 10)
}

export interface HypothesisCardProps {
  hypothesis: Hypothesis
  to?: string
  className?: string
}

export function HypothesisCard({ hypothesis, to, className }: HypothesisCardProps) {
  const target = to ?? `/research/hypothesis/${encodeURIComponent(hypothesis.id)}`
  const symbols = hypothesis.symbols.slice(0, 4)
  const extraSymbols = Math.max(0, hypothesis.symbols.length - symbols.length)
  const tags = hypothesis.tags.slice(0, 3)
  const extraTags = Math.max(0, hypothesis.tags.length - tags.length)
  return (
    <Card
      variant="elevated"
      className={cn('transition-shadow hover:shadow-md', className)}
    >
      <CardContent className="space-y-2 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <DenseTag variant={STATUS_VARIANT[hypothesis.status] ?? 'neutral'}>
              {STATUS_LABEL[hypothesis.status] ?? hypothesis.status}
            </DenseTag>
            {hypothesis.origin_page ? (
              <DenseTag variant="neutral">{hypothesis.origin_page}</DenseTag>
            ) : null}
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-dense-meta shrink-0"
          >
            <Link to={target} aria-label={`Open hypothesis ${hypothesis.title}`}>
              Open
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
        <div className="space-y-1">
          <h3 className="text-dense-label font-semibold leading-snug line-clamp-2">
            {hypothesis.title}
          </h3>
          {hypothesis.thesis ? (
            <p className="text-dense-meta text-muted-foreground line-clamp-2 leading-snug">
              {hypothesis.thesis}
            </p>
          ) : null}
        </div>
        {(symbols.length > 0 || tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-1">
            {symbols.map((sym) => (
              <DenseTag key={sym} variant="symbol">
                {sym}
              </DenseTag>
            ))}
            {extraSymbols > 0 ? (
              <span className="text-dense-micro text-muted-foreground">+{extraSymbols}</span>
            ) : null}
            {tags.map((tag) => (
              <DenseTag key={tag} variant="neutral">
                {tag}
              </DenseTag>
            ))}
            {extraTags > 0 ? (
              <span className="text-dense-micro text-muted-foreground">+{extraTags}</span>
            ) : null}
          </div>
        )}
        <p className="text-dense-micro text-muted-foreground">
          Updated {formatRelative(hypothesis.updated_at)}
          {hypothesis.linked_backtest_ids.length > 0 ? (
            <span> · {hypothesis.linked_backtest_ids.length} backtest{hypothesis.linked_backtest_ids.length === 1 ? '' : 's'}</span>
          ) : null}
        </p>
      </CardContent>
    </Card>
  )
}
