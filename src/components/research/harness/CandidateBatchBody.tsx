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
  type DenseTagVariant,
} from '@/components/data-display'
import {
  candidateBatchDataSource,
  candidateBatchItems,
  hitRateFailingLenses,
  isHitRateWarnActive,
  isPersonaDissentActive,
  parseAgentVerdicts,
  personaEvalModeLabel,
  stanceCounts,
  type AgentStance,
} from '@/lib/harness/harnessDraftHelpers'

/** Above this a decision card turns into a spreadsheet; batches are policy-capped at 50. */
const MAX_ROWS = 20

function stanceVariant(stance: AgentStance): DenseTagVariant {
  if (stance === 'support') return 'success'
  if (stance === 'oppose') return 'danger'
  if (stance === 'caution') return 'warning'
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
              At least one candidate was opposed by validate or net_stance=oppose.
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
              <col style={{ width: '7%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '39%' }} />
            </colgroup>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Symbol</DenseTableHead>
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
                const net = (item.net_stance || 'abstain') as AgentStance
                return (
                  <DenseTableRow key={item.id}>
                    <DenseTableCell>
                      <span className="font-mono font-semibold">{item.symbol}</span>
                      {item.blocked_by_validate ? (
                        <DenseTag variant="danger" size="cell" className="ml-1">
                          blocked
                        </DenseTag>
                      ) : null}
                    </DenseTableCell>
                    <DenseTableCell>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {item.score !== null ? item.score.toFixed(1) : '—'}
                      </span>
                    </DenseTableCell>
                    <DenseTableCell>
                      <DenseTag variant={stanceVariant(net)} size="cell">
                        {net}
                      </DenseTag>
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
                          <div className="flex flex-wrap gap-0.5">
                            {verdicts.map((v) => (
                              <DenseTag
                                key={`${item.id}-${v.agent}`}
                                variant={stanceVariant(v.stance)}
                                size="cell"
                                title={
                                  v.source
                                    ? `${v.summary} · source=${v.source}`
                                    : v.summary
                                }
                              >
                                {v.agent}:{v.stance}
                              </DenseTag>
                            ))}
                          </div>
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
