import { AlertTriangle } from 'lucide-react'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
} from '@/components/data-display'
import {
  candidateBatchDataSource,
  candidateBatchItems,
  hitRateFailingLenses,
  isHitRateWarnActive,
} from '@/lib/harness/harnessDraftHelpers'

/**
 * Candidates a batch is asking you to approve, aligned into columns.
 *
 * They were a stacked tag list in a `grid-cols-2` whose every item carried
 * `col-span-2` — a two-column layout that never happened, so eight candidates
 * ran down the left third of the card while the rest sat empty. Repeating
 * `PIVOT · A · no option data · no settled record yet` eight times also buries
 * the part that differs; in columns the score and the invalidation line up and
 * the sameness reads as one glance instead of eight.
 */

/** Above this a decision card turns into a spreadsheet; batches are policy-capped at 50. */
const MAX_ROWS = 20

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
  const shown = items.slice(0, MAX_ROWS)

  return (
    <div className="space-y-2">
      {/*
        Same three zones as PolicySuggestionBody — tags, content, then what
        Approve actually does. The "what Approve does" line used to sit third
        from the top, which put boilerplate above the candidates it describes.
      */}
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

      {desc ? (
        <p className="max-w-prose text-foreground/80">{desc}</p>
      ) : null}

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
        <>
          {/*
            Six columns need room. Below the min-width the wrapper scrolls
            rather than crushing "no settled record yet" into three lines and
            clipping the score — which is what `scrollX={false}` did at 768px.
          */}
          <DenseDataTable tableClassName="min-w-[52rem]">
            <colgroup>
              <col style={{ width: '9%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '40%' }} />
            </colgroup>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Symbol</DenseTableHead>
                <DenseTableHead>Score</DenseTableHead>
                <DenseTableHead>Selection</DenseTableHead>
                <DenseTableHead>Option</DenseTableHead>
                <DenseTableHead>Track record</DenseTableHead>
                <DenseTableHead>Wrong if</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {shown.map((item) => {
                const sel = item.evidence?.selection
                const opt = item.evidence?.option_analytics
                const settled = item.evidence?.track_record?.horizons?.find(
                  (h) => h.hit_rate != null,
                )
                return (
                  <DenseTableRow key={item.id}>
                    <DenseTableCell>
                      <span className="font-mono font-semibold">{item.symbol}</span>
                    </DenseTableCell>
                    <DenseTableCell>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {item.score !== null ? item.score.toFixed(1) : '—'}
                      </span>
                    </DenseTableCell>
                    <DenseTableCell>
                      {sel?.path ? (
                        <DenseTag variant="category" size="cell">
                          {sel.path}
                          {sel.grade ? ` · ${sel.grade}` : ''}
                        </DenseTag>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </DenseTableCell>
                    {/*
                      `no option data` is shown, not left blank: option analytics
                      cover a fraction of the stock universe, and an empty cell
                      would read as "nothing notable" — a claim about the stock
                      rather than about our coverage.
                    */}
                    <DenseTableCell>
                      <DenseTag
                        variant={opt?.status === 'ok' ? 'info' : 'neutral'}
                        size="cell"
                      >
                        {opt?.status === 'ok' ? 'option view' : 'no option data'}
                      </DenseTag>
                    </DenseTableCell>
                    <DenseTableCell>
                      <DenseTag variant={settled ? 'success' : 'neutral'} size="cell">
                        {settled
                          ? `T+${settled.horizon_days} ${Math.round((settled.hit_rate ?? 0) * 100)}% beat`
                          : 'no settled record yet'}
                      </DenseTag>
                    </DenseTableCell>
                    <DenseTableCell>
                      <span className="text-dense-micro text-muted-foreground">
                        {item.evidence?.invalidation?.[0] ?? '—'}
                      </span>
                    </DenseTableCell>
                  </DenseTableRow>
                )
              })}
            </DenseTableBody>
          </DenseDataTable>
          {items.length > shown.length ? (
            <p className="text-dense-micro text-muted-foreground">
              +{items.length - shown.length} more candidate
              {items.length - shown.length === 1 ? '' : 's'} in this batch — open
              the run pipeline to see them all.
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-muted-foreground italic">No candidates in this batch.</p>
      )}

      <p className="text-dense-micro text-muted-foreground">
        Approve promotes these candidates and creates hypotheses. Next hop:
        Hypothesis Board / Candidate Pool.
      </p>
    </div>
  )
}
