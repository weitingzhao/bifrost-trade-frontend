/**
 * Compact Hypothesis card for Research Home + list views (Wave RS-A4).
 *
 * Renders one `Hypothesis` as an elevated Card with:
 *   - status DenseTag + optional origin_page
 *   - title (opaque run id split off) + 2-line clamped thesis
 *   - symbol / tag chips
 *   - relative updated timestamp + Open button
 *
 * Everything the card truncates is ranked first — see
 * `@/lib/hypothesisCardModel`. Cards written by the daily loop share one
 * template, so cutting by position alone produced a grid of identical-looking
 * cards whose grades and scores had been clipped away.
 *
 * The card itself is a clickable link. Consumers can override the target via
 * `to`, otherwise it navigates to `/research/hypothesis/{id}` (detail page is
 * scaffolded post-A4 — for now the link is graceful even if the route is not
 * yet mounted, because React Router simply renders the 404 boundary).
 */
import { Link } from 'react-router-dom'
import { ArrowUpRight, FlaskConical } from 'lucide-react'
import { DenseTag, type DenseTagVariant } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { isRuleResolved, resolutionLine } from '@/lib/hypothesisResolution'
import { rankTags, salientThesis, splitTitleRef } from '@/lib/hypothesisCardModel'
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
  // Carries the hypothesis and its symbols so the builder opens ready to run,
  // rather than asking you to find the thesis again in a dropdown.
  const backtestTarget = `/research/backtest?tab=event-query&hypothesis_id=${encodeURIComponent(hypothesis.id)}${
    hypothesis.symbols.length > 0
      ? `&symbols=${encodeURIComponent(hypothesis.symbols.join(','))}`
      : ''
  }`
  const symbols = hypothesis.symbols.slice(0, 4)
  const extraSymbols = Math.max(0, hypothesis.symbols.length - symbols.length)
  // Rank, then slice. The loop appends its plumbing tags first, so an unranked
  // slice(0, 3) showed `harness, candidate_batch, stock` on every card it wrote.
  const rankedTags = rankTags(hypothesis.tags)
  const tags = rankedTags.slice(0, 3)
  const extraTags = Math.max(0, rankedTags.length - tags.length)
  const { title, ref } = splitTitleRef(hypothesis.title)
  const thesis = salientThesis(hypothesis.thesis)
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
            {hypothesis.linked_backtest_ids.length > 0 ? (
              <DenseTag variant="success">Evidence</DenseTag>
            ) : null}
            {isRuleResolved(hypothesis) ? (
              <DenseTag
                variant="info"
                title="Settled by the objective's outcome rule at its horizon — no click involved."
              >
                By rule
              </DenseTag>
            ) : null}
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-dense-meta shrink-0"
          >
            <Link to={target} aria-label={`Open hypothesis ${title}`}>
              Open
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
        <div className="space-y-1">
          <h3 className="text-dense-label font-semibold leading-snug line-clamp-2">
            {title}
          </h3>
          {ref ? (
            // Kept, because two cards sharing a run id came from the same batch
            // and that adjacency is worth seeing — just not in the title, where
            // it pushed the symbol toward the clamp.
            <p
              className="truncate font-mono text-dense-micro text-muted-foreground/70"
              title={ref}
            >
              {ref}
            </p>
          ) : null}
          {thesis ? (
            <p className="text-dense-meta text-muted-foreground line-clamp-2 leading-snug">
              {thesis}
            </p>
          ) : null}
        </div>
        {isRuleResolved(hypothesis) && resolutionLine(hypothesis.resolution_json) ? (
          <p className="text-dense-micro text-muted-foreground" data-testid="hypothesis-resolution">
            {resolutionLine(hypothesis.resolution_json)}
          </p>
        ) : null}
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
        <div className="flex items-center justify-between gap-2">
          <p className="text-dense-micro text-muted-foreground">
            Updated {formatRelative(hypothesis.updated_at)}
            {hypothesis.linked_backtest_ids.length > 0 ? (
              <span> · {hypothesis.linked_backtest_ids.length} backtest{hypothesis.linked_backtest_ids.length === 1 ? '' : 's'}</span>
            ) : null}
          </p>
          {/*
            The card has always shown a linked-backtest count with no way to
            produce one. EventQueryBuilder can already attach a run to a
            hypothesis and write the id back — it just had no entry point, so a
            thesis could stay Active indefinitely without ever being tested.
          */}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-dense-meta shrink-0"
          >
            <Link
              to={backtestTarget}
              aria-label={`Backtest hypothesis ${title}`}
            >
              <FlaskConical className="mr-1 h-3 w-3" />
              {hypothesis.linked_backtest_ids.length > 0 ? 'Backtest again' : 'Backtest'}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
