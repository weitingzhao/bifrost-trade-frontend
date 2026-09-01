import { AlertTriangle } from 'lucide-react'
import { DenseTag } from '@/components/data-display'
import {
  type CandidateEvidence,
  candidateBatchDataSource,
  candidateBatchItems,
  hitRateFailingLenses,
  isHitRateWarnActive,
} from '@/lib/harness/harnessDraftHelpers'

export function CandidateBatchBody({
  payload,
}: {
  payload: Record<string, unknown>
}) {
  const items = candidateBatchItems(payload)
  const warn = isHitRateWarnActive(payload)
  const failing = hitRateFailingLenses(payload)
  const dataSource = candidateBatchDataSource(payload)
  const desc = typeof payload.description === 'string' ? payload.description : ''

  return (
    <div className="space-y-2">
      {desc ? (
        <p className="text-dense-meta text-foreground/80">{desc}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        {dataSource ? (
          <DenseTag
            variant={dataSource === 'scan' ? 'success' : 'warning'}
            size="cell"
          >
            source: {dataSource}
          </DenseTag>
        ) : null}
        <DenseTag variant="neutral" size="cell">
          {items.length} candidate{items.length === 1 ? '' : 's'}
        </DenseTag>
      </div>

      <p className="text-dense-micro text-muted-foreground">
        Approve promotes candidates and creates hypotheses. Next hop: Hypothesis
        Board / Candidate Pool.
      </p>

      {warn ? (
        <div
          role="alert"
          className="flex items-start gap-1.5 rounded-sm border border-warning/40 bg-warning/10 px-2 py-1.5"
        >
          <AlertTriangle className="size-3.5 mt-0.5 text-warning shrink-0" />
          <div className="min-w-0 space-y-0.5">
            <p className="text-dense-meta font-medium text-warning">
              Low signal confidence
            </p>
            <p className="text-dense-micro text-muted-foreground">
              {failing.length > 0
                ? `hit_rate_20d below policy.min_hit_rate for lens: ${failing.join(', ')}`
                : 'hit_rate_gate flagged this batch'}
              . Owner may override by approving.
            </p>
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-dense-meta text-foreground/90 font-mono tabular-nums">
          {items.slice(0, 6).map((item) => (
            <li key={item.id} className="col-span-2 space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold">{item.symbol}</span>
                {item.score !== null ? (
                  <span className="text-muted-foreground">
                    score {item.score.toFixed(1)}
                  </span>
                ) : null}
                <CandidateEvidenceTags evidence={item.evidence} />
              </div>
              {item.evidence?.invalidation?.length ? (
                <div className="text-dense-micro text-muted-foreground font-sans">
                  wrong if: {item.evidence.invalidation[0]}
                </div>
              ) : null}
            </li>
          ))}
          {items.length > 6 ? (
            <li className="col-span-2 text-dense-micro text-muted-foreground">
              +{items.length - 6} more…
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="text-dense-meta text-muted-foreground italic">
          No candidates in this batch.
        </p>
      )}
    </div>
  )
}

/**
 * The evidence chain, compressed to tags.
 *
 * `not measured` is shown, not hidden: most candidates have no option analytics
 * because that data covers a fraction of the stock universe, and an absent tag
 * would read as "nothing notable here" — a claim about the stock rather than
 * about our coverage.
 */
function CandidateEvidenceTags({
  evidence,
}: {
  evidence: CandidateEvidence | null
}) {
  if (!evidence) return null
  const sel = evidence.selection
  const opt = evidence.option_analytics
  const rec = evidence.track_record
  const settled = rec?.horizons?.find((h) => h.hit_rate != null)
  return (
    <>
      {sel?.path ? (
        <DenseTag variant="category" size="cell">
          {sel.path}
          {sel.grade ? ` · ${sel.grade}` : ''}
        </DenseTag>
      ) : null}
      <DenseTag variant={opt?.status === 'ok' ? 'info' : 'neutral'} size="cell">
        {opt?.status === 'ok' ? 'option view' : 'no option data'}
      </DenseTag>
      <DenseTag variant={settled ? 'success' : 'neutral'} size="cell">
        {settled
          ? `T+${settled.horizon_days} ${Math.round((settled.hit_rate ?? 0) * 100)}% beat`
          : 'no settled record yet'}
      </DenseTag>
    </>
  )
}
