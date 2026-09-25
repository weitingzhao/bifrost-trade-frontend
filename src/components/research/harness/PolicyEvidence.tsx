/**
 * The evidence behind a policy suggestion, readable.
 *
 * What a reader needs to judge the proposal: how the objective's settled
 * candidates did, how the judges split on the batch, and — folded, per name —
 * what each judge said. Eight notes a name is the detail, not the case. The raw
 * record stays one click away for audit.
 *
 * Stances are words in neutral tags, not colours: support / caution / oppose are
 * judgements, not faults, and red belongs to faults. Only the two facts that
 * stopped a name — judges split, validate blocked — are marked.
 */
import { Fragment, useState } from 'react'
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
import { readCopilotPromptLang } from '@/lib/copilot/promptLang'
import { fmtSignedPct, policyEvidenceView } from '@/lib/harness/policyEvidence'
import { fmtUsd } from '@/lib/harness/runSpend'

export function PolicyEvidence({ evidence }: { evidence: Record<string, unknown> }) {
  const [openSymbol, setOpenSymbol] = useState<string | null>(null)
  const { outcomes, persona } = policyEvidenceView(evidence)
  // One column per judge model, so a row stays one line: the models' split on a
  // name reads across, instead of wrapping inside one cell.
  const modelCols = persona
    ? [...new Set([...persona.models.map((m) => m.model), ...persona.symbols.flatMap((s) => s.byModel.map((m) => m.model))])]
    : []
  const zh = readCopilotPromptLang() === 'zh'

  return (
    <div className="space-y-2 border px-2.5 py-2 text-dense-meta mat-card">
      {outcomes ? (
        <p>
          <span className="text-muted-foreground">
            Settled outcomes{outcomes.days != null ? `, last ${outcomes.days} days` : ''}:{' '}
          </span>
          <span className="font-mono tabular-nums">
            {outcomes.candidates != null ? `${outcomes.candidates} candidates` : 'candidates not counted'}
            {outcomes.pending ? ` · ${outcomes.pending} pending` : ''}
            {outcomes.horizons.map((h) => (
              <Fragment key={h.horizonDays ?? 'unknown'}>
                {' · '}T+{h.horizonDays ?? '?'} hit {h.hitRate != null ? `${Math.round(h.hitRate * 100)}%` : '—'}
                {h.hits != null && h.judged != null ? ` (${h.hits}/${h.judged})` : ''} · excess vs benchmark{' '}
                {fmtSignedPct(h.avgExcess)}
              </Fragment>
            ))}
          </span>
        </p>
      ) : null}

      {persona ? (
        <>
          <p>
            <span className="text-muted-foreground">Judges on the batch: </span>
            <span className="font-mono tabular-nums">
              {persona.evaluated ?? '—'} names · {persona.blocked ?? 0} blocked by validate · split on{' '}
              {persona.dissent ?? 0} · {persona.eligible ?? 0} eligible to auto-accept
            </span>
          </p>
          {persona.models.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {persona.models.map((m) => (
                <DenseTag key={m.model} variant="neutral" size="cell" title={m.provider ?? undefined}>
                  {m.model} · {m.ok ?? '—'}/{m.calls ?? '—'} answered
                  {m.fallback ? ` · ${m.fallback} fell back` : ''}
                  {m.costUsd != null ? ` · ${fmtUsd(m.costUsd)}` : ''}
                </DenseTag>
              ))}
            </div>
          ) : null}

          {persona.symbols.length > 0 ? (
            <DenseDataTable>
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead>Symbol</DenseTableHead>
                  <DenseTableHead title="Whether the judge models reached one stance">Judges</DenseTableHead>
                  <DenseTableHead>Net</DenseTableHead>
                  <DenseTableHead>Validate</DenseTableHead>
                  {modelCols.map((col) => (
                    <DenseTableHead key={col} title={`${col}: net stance / validate stance`} className="whitespace-nowrap">
                      {col} <span className="font-normal normal-case text-muted-foreground">net / validate</span>
                    </DenseTableHead>
                  ))}
                  <DenseTableHead />
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {persona.symbols.map((s) => {
                  const open = openSymbol === s.symbol
                  return (
                    <Fragment key={s.symbol}>
                      <DenseTableRow>
                        <DenseTableCell className="font-mono">{s.symbol}</DenseTableCell>
                        <DenseTableCell>
                          {s.agreement === 'dissent' ? (
                            <DenseTag variant="warning" size="cell">
                              split
                            </DenseTag>
                          ) : (
                            <span className="text-muted-foreground">{s.agreement ?? '—'}</span>
                          )}
                        </DenseTableCell>
                        <DenseTableCell>{s.netStance ?? '—'}</DenseTableCell>
                        <DenseTableCell>
                          <span className="inline-flex items-center gap-1">
                            {s.validateStance ?? '—'}
                            {s.blocked ? (
                              <DenseTag variant="warning" size="cell">
                                blocked
                              </DenseTag>
                            ) : null}
                          </span>
                        </DenseTableCell>
                        {modelCols.map((col) => {
                          const m = s.byModel.find((x) => x.model === col)
                          return (
                            <DenseTableCell key={col} className="whitespace-nowrap text-muted-foreground">
                              {m ? `${m.net ?? '—'} / ${m.validate ?? '—'}${m.fallback ? ' · fell back' : ''}` : '—'}
                            </DenseTableCell>
                          )
                        })}
                        <DenseTableCell className="text-right">
                          {s.verdicts.length > 0 ? (
                            <button
                              type="button"
                              aria-expanded={open}
                              className="text-dense-micro text-muted-foreground hover:text-foreground hover:underline"
                              onClick={() => setOpenSymbol(open ? null : s.symbol)}
                            >
                              {open ? 'Hide notes' : `${s.verdicts.length} notes`}
                            </button>
                          ) : null}
                        </DenseTableCell>
                      </DenseTableRow>
                      {open ? (
                        <DenseTableRow>
                          <DenseTableCell colSpan={5 + modelCols.length}>
                            <ul className="max-w-prose space-y-1 whitespace-normal py-1">
                              {s.verdicts.map((v, i) => (
                                <li key={`${v.agent}-${v.model}-${i}`}>
                                  <span className="font-mono text-muted-foreground">
                                    {v.agent}
                                    {v.model ? ` · ${v.model}` : ''}
                                  </span>{' '}
                                  {v.stance ? (
                                    <DenseTag variant="neutral" size="cell">
                                      {v.stance}
                                    </DenseTag>
                                  ) : null}{' '}
                                  {(zh ? (v.summaryZh ?? v.summary) : (v.summary ?? v.summaryZh)) ?? '—'}
                                </li>
                              ))}
                            </ul>
                          </DenseTableCell>
                        </DenseTableRow>
                      ) : null}
                    </Fragment>
                  )
                })}
              </DenseTableBody>
            </DenseDataTable>
          ) : null}
        </>
      ) : null}

      <details className="text-dense-micro text-muted-foreground">
        <summary className="cursor-pointer select-none">Raw evidence (JSON)</summary>
        <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono">
          {JSON.stringify(evidence, null, 2)}
        </pre>
      </details>
    </div>
  )
}
