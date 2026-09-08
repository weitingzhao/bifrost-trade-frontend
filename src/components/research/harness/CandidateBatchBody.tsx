import { AlertTriangle, MessageCircle } from 'lucide-react'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  type DenseTagVariant,
} from '@/components/data-display'
import { fmtJudgeCost } from '@/components/research/harness/harnessFormat'
import {
  candidateAgreement,
  candidateBatchDataSource,
  candidateBatchItems,
  hitRateFailingLenses,
  isHitRateWarnActive,
  isPersonaDissentActive,
  parseAgentVerdicts,
  personaDissentCount,
  personaEvalModeLabel,
  personaJudgeSummaries,
  stanceCounts,
  verdictsByModel,
  type CandidateAgreement,
} from '@/lib/harness/harnessDraftHelpers'
import { openCandidateInCopilot } from '@/lib/harness/loopCopilotPrefill'
import { NET_AGENT, batchLeash, describeSplit } from '@/lib/harness/harnessDraftHelpers'
import { actionTone, fmtPct, fmtPx, stars, type CandidateRating } from '@/lib/harness/rating'
import { IconActionButton } from '@/components/data-display'

/** Above this a decision card turns into a spreadsheet; batches are policy-capped at 50. */
const MAX_ROWS = 20

/** `net` may also be `dissent` — the judges split, which is a warning, not a stance. */
function stanceVariant(stance: string): DenseTagVariant {
  if (stance === 'support') return 'success'
  if (stance === 'oppose') return 'danger'
  if (stance === 'caution' || stance === 'dissent') return 'warning'
  return 'neutral'
}

function agreementVariant(agreement: CandidateAgreement): DenseTagVariant {
  if (agreement === 'agree') return 'success'
  if (agreement === 'dissent') return 'warning'
  return 'neutral'
}

function hasPortfolioHoldingsGap(items: ReturnType<typeof candidateBatchItems>): boolean {
  for (const item of items) {
    const verdicts = parseAgentVerdicts(item.evidence)
    const port = verdicts.find((v) => v.agent === 'portfolio')
    if (!port) continue
    if (port.stance === 'abstain' && /holdings not applied/i.test(port.summary)) {
      return true
    }
  }
  return false
}

export function CandidateBatchBody({
  payload,
}: {
  payload: Record<string, unknown>
}) {
  const items = candidateBatchItems(payload)
  const warn = isHitRateWarnActive(payload)
  const dissent = isPersonaDissentActive(payload)
  const failing = hitRateFailingLenses(payload)
  const dataSource = candidateBatchDataSource(payload)
  const desc = typeof payload.description === 'string' ? payload.description : ''
  const shown = items.slice(0, MAX_ROWS)
  const modeInfo = personaEvalModeLabel(payload)
  const holdingsGap = hasPortfolioHoldingsGap(items)
  const judges = personaJudgeSummaries(payload)
  const dissentCount = personaDissentCount(payload)
  // D1: the run this batch came from — the Copilot answers from its record.
  const runId = typeof payload.run_id === 'string' ? payload.run_id : ''
  const objectiveTitle = typeof payload.title === 'string' ? payload.title : null
  // D3: the leash's verdict on this batch — accepted names became hypotheses on their own.
  const leash = batchLeash(payload)
  const acceptedIds = new Set(leash?.accepted.map((a) => a.id) ?? [])
  const heldById = new Map(leash?.held.map((h) => [h.id, h.reasons]) ?? [])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {dataSource ? (
          <DenseTag
            variant={dataSource === 'scan' ? 'success' : 'warning'}
            size="cell"
          >
            source: {dataSource}
          </DenseTag>
        ) : null}
        {modeInfo ? (
          <DenseTag
            variant={modeInfo.mode === 'agent' && !modeInfo.fallback ? 'info' : 'neutral'}
            size="cell"
            title={modeInfo.hint}
          >
            persona: {modeInfo.label}
          </DenseTag>
        ) : null}
        <DenseTag variant="neutral" size="cell">
          {items.length} candidate{items.length === 1 ? '' : 's'}
        </DenseTag>
        {dissent ? (
          <DenseTag variant="danger" size="cell">
            persona dissent
          </DenseTag>
        ) : null}
      </div>

      {desc ? (
        <p className="max-w-prose text-foreground/80">{desc}</p>
      ) : null}

      {leash ? (
        <p className="text-dense-micro text-muted-foreground" data-testid="batch-leash">
          Leash: {leash.accepted.length} accepted on its own
          {leash.accepted.length > 0 ? ` (${leash.accepted.map((a) => a.symbol).join(', ')})` : ''} ·{' '}
          {leash.held.length} held for you
          {leash.min_source_hit_rate != null ? ` · source hit-rate floor ${Math.round(leash.min_source_hit_rate * 100)}%` : ''}
          . Approve promotes only the held names.
        </p>
      ) : null}

      {judges.length > 0 ? (
        <p className="text-dense-micro text-muted-foreground" data-testid="batch-judges">
          Judges:{' '}
          {judges.map((j, i) => (
            <span key={j.model} className="font-mono">
              {i > 0 ? ' · ' : ''}
              {j.model}
              {j.calls != null ? ` ${j.calls} call${j.calls === 1 ? '' : 's'}` : ''}
              {j.fallback ? ` (${j.fallback} fell back)` : ''}
              {j.cap_exceeded ? ` (${j.cap_exceeded} over cap)` : ''}
              {j.cost_usd != null
                ? ` ${fmtJudgeCost(j.cost_usd)}${j.cap_usd != null ? ` of ${fmtJudgeCost(j.cap_usd)}/day` : ''}`
                : ''}
            </span>
          ))}
        </p>
      ) : null}

      {modeInfo?.mode === 'heuristic' || modeInfo?.fallback ? (
        <p className="text-dense-micro text-muted-foreground">
          Persona eval is {modeInfo.fallback ? 'agent with heuristic fallback' : 'heuristic'} —
          not a live multi-agent debate. Enable agent mode with{' '}
          <span className="font-mono">BIFROST_PERSONA_EVAL_AGENTS=1</span> (never a prod default).
        </p>
      ) : null}

      {holdingsGap ? (
        <div
          role="status"
          className="flex items-start gap-1.5 rounded-sm border border-border/60 bg-secondary/40 px-2 py-1.5"
        >
          <AlertTriangle className="size-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <div className="min-w-0 space-y-0.5">
            <p className="text-dense-meta font-medium text-foreground">
              Portfolio abstained — holdings not applied
            </p>
            <p className="text-dense-micro text-muted-foreground">
              Trade monitor snapshot was unavailable for the heuristic overlay. Stance is
              abstain, not a portfolio oppose.
            </p>
          </div>
        </div>
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

      {dissent ? (
        <div
          role="alert"
          className="flex items-start gap-1.5 rounded-sm border border-destructive/40 bg-destructive/10 px-2 py-1.5"
        >
          <AlertTriangle className="size-3.5 mt-0.5 text-destructive shrink-0" />
          <div className="min-w-0 space-y-0.5">
            <p className="text-dense-meta font-medium text-destructive">
              Persona dissent / validate block
            </p>
            <p className="text-dense-micro text-muted-foreground">
              {dissentCount != null && dissentCount > 0
                ? `The judges split on ${dissentCount} candidate${dissentCount === 1 ? '' : 's'} (net = dissent), or a candidate was blocked by validate or opposed. `
                : 'At least one candidate was opposed by validate or net_stance=oppose. '}
              Trust L0 batch mode will not auto-approve this draft.
            </p>
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <>
          <DenseDataTable tableClassName="min-w-[60rem]">
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '29%' }} />
            </colgroup>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Symbol</DenseTableHead>
                <DenseTableHead>Rating</DenseTableHead>
                <DenseTableHead>Score</DenseTableHead>
                <DenseTableHead>Net</DenseTableHead>
                <DenseTableHead>Selection</DenseTableHead>
                <DenseTableHead>Option</DenseTableHead>
                <DenseTableHead>Track record</DenseTableHead>
                <DenseTableHead>Personas</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {shown.map((item) => {
                const sel = item.evidence?.selection
                const opt = item.evidence?.option_analytics
                const settled = item.evidence?.track_record?.horizons?.find(
                  (h) => h.hit_rate != null,
                )
                const verdicts = parseAgentVerdicts(item.evidence)
                const counts = stanceCounts(verdicts)
                const net = item.net_stance || 'abstain'
                const agreement = candidateAgreement(item)
                const byModel = verdictsByModel(verdicts)
                const split = agreement === 'dissent' ? describeSplit(verdicts) : null
                return (
                  <DenseTableRow key={item.id}>
                    <DenseTableCell>
                      <span className="inline-flex items-center gap-1">
                        <span className="font-mono font-semibold">{item.symbol}</span>
                        {runId ? (
                          <IconActionButton
                            title={`Ask Copilot why ${item.symbol} was proposed and what would unmake it`}
                            ariaLabel={`Ask Copilot about ${item.symbol}`}
                            onClick={() =>
                              openCandidateInCopilot({ runId, symbol: item.symbol, title: objectiveTitle })
                            }
                          >
                            <MessageCircle className="size-3" />
                          </IconActionButton>
                        ) : null}
                      </span>
                      {item.blocked_by_validate ? (
                        <DenseTag variant="danger" size="cell" className="ml-1">
                          blocked
                        </DenseTag>
                      ) : null}
                      {acceptedIds.has(item.id) ? (
                        <DenseTag variant="success" size="cell" className="ml-1" title="The leash accepted this name; it is a hypothesis now">
                          accepted
                        </DenseTag>
                      ) : heldById.has(item.id) ? (
                        <DenseTag variant="warning" size="cell" className="ml-1" title={(heldById.get(item.id) ?? []).join(' · ')}>
                          held
                        </DenseTag>
                      ) : null}
                    </DenseTableCell>
                    <DenseTableCell>
                      <RatingCell rating={item.rating} />
                    </DenseTableCell>
                    <DenseTableCell>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {item.score !== null ? item.score.toFixed(1) : '—'}
                      </span>
                    </DenseTableCell>
                    <DenseTableCell>
                      <div className="flex flex-wrap items-center gap-0.5">
                        <DenseTag variant={stanceVariant(net)} size="cell">
                          {net}
                        </DenseTag>
                        {agreement && agreement !== 'single' ? (
                          <DenseTag
                            variant={agreementVariant(agreement)}
                            size="cell"
                            title={
                              [
                                agreement === 'agree'
                                  ? 'Every judge reached the same verdict.'
                                  : 'The judges split, or one fell back to the heuristic — never counted as agreement. Only the verdict persona decides a judge’s net.',
                                split,
                              ]
                                .filter(Boolean)
                                .join(' ')
                            }
                          >
                            {agreement}
                          </DenseTag>
                        ) : null}
                      </div>
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
                      {verdicts.length > 0 ? (
                        <div className="space-y-0.5">
                          <p className="text-dense-micro text-muted-foreground">
                            +{counts.support} / !{counts.caution} / −{counts.oppose} / ~
                            {counts.abstain}
                          </p>
                          {byModel.map((group) => (
                            <div
                              key={`${item.id}-${group.model ?? 'heuristic'}`}
                              className="flex flex-wrap items-center gap-0.5"
                            >
                              {group.model ? (
                                <span
                                  className="mr-0.5 font-mono text-dense-micro text-muted-foreground"
                                  title={
                                    group.fallback
                                      ? `${group.model} failed on this symbol; the heuristic stood in (counts as dissent).`
                                      : group.model
                                  }
                                >
                                  {group.model}
                                  {group.fallback ? ' ⚠' : ''}:
                                </span>
                              ) : null}
                              {group.verdicts.map((v) => (
                                <DenseTag
                                  key={`${item.id}-${group.model ?? ''}-${v.agent}`}
                                  variant={stanceVariant(v.stance)}
                                  size="cell"
                                  // The verdict persona is the judge's net; the
                                  // other three inform it. Four identical chips
                                  // hid which one the leash actually reads.
                                  className={v.agent === NET_AGENT ? 'ring-1 ring-foreground/30' : undefined}
                                  title={
                                    (v.agent === NET_AGENT
                                      ? 'This is the judge’s net — the judges agree only when these match. '
                                      : '') + (v.source ? `${v.summary} · source=${v.source}` : v.summary)
                                  }
                                >
                                  {v.agent}:{v.stance}
                                </DenseTag>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
        Hypothesis Board / Candidate Pool. Auto-approve never places orders (D10).
      </p>
    </div>
  )
}

/**
 * The run's own verdict on this name, where the decision is actually made.
 *
 * The rating was computed on the run and shown in the memo drawer; the Inbox —
 * the page the Owner approves from — listed score, stance and personas and
 * never the grade, the conviction or the price levels. Reading the deliverable
 * required opening a second surface.
 *
 * An unrated row says so plainly. It means the run predates the rating stage,
 * not that the name failed one.
 */
function RatingCell({ rating }: { rating: CandidateRating | null }) {
  if (!rating) {
    return (
      <span
        className="text-dense-caption text-muted-foreground"
        title="This run has no rating stage. Open it and use Rate this run — the rating is a pure function of what the run already stored."
      >
        not rated
      </span>
    )
  }
  const lv = rating.levels
  const inst = rating.instrument
  const levelTitle = lv
    ? `Buy ${fmtPx(lv.entry_lo)}–${fmtPx(lv.entry_hi)} · stop ${fmtPx(lv.stop)} (${fmtPct(-lv.risk_pct, false)} risk, ${lv.stop_source}) · target ${fmtPx(lv.target_2r)}`
    : 'No price levels recorded for this name.'
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-1">
        {rating.grade ? (
          <DenseTag variant="category" size="cell" title={`SEPA grade ${rating.grade}`}>
            {rating.grade}
          </DenseTag>
        ) : null}
        <span className="font-mono text-warning" title={rating.conviction_reason}>
          {stars(rating.conviction)}
        </span>
        <DenseTag variant={actionTone(rating.action)} size="cell" title={rating.action_reason}>
          {rating.action_label}
        </DenseTag>
      </span>
      {lv ? (
        <span className="font-mono text-dense-micro tabular-nums text-muted-foreground" title={levelTitle}>
          {fmtPx(lv.entry_lo)}–{fmtPx(lv.entry_hi)} · ✕{fmtPx(lv.stop)}
        </span>
      ) : inst.suggestion ? (
        // An option-lens name has no pivot to buy against; its actionable read
        // is the Stage × IV cell. Showing "no levels" there hid the only thing
        // the rating had to say about it.
        <span className="text-dense-micro text-muted-foreground" title={inst.note || levelTitle}>
          {inst.stage_row?.replace('_', ' ')} × IV {inst.iv_col}
          {inst.iv_rank != null ? ` ${inst.iv_rank.toFixed(0)}` : ''} →{' '}
          <span className="text-foreground/80">{inst.suggestion}</span>
        </span>
      ) : (
        <span className="text-dense-micro text-muted-foreground" title={inst.note || levelTitle}>
          {inst.note || 'no levels'}
        </span>
      )}
    </div>
  )
}
