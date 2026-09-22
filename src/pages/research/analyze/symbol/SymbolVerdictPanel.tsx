/**
 * `Your verdict` — what has been claimed on this name, and the half you cannot add.
 *
 * The design puts a write form at the top of the Overview rail: three stance
 * buttons, one line for the claim, citation chips, `Record verdict`, and under
 * it the verdicts already recorded with how each one settled.
 *
 * ## What is real, measured 2026-09-21
 *
 * **The list is.** `/research/verdicts/{symbol}` answers with every claim the
 * Copilot and the Loop have made on this name, each with its approval state —
 * the same rows the Decision Inbox reads. So the panel's lower half is drawn
 * from the store the design points at, and the page that had this reading
 * already (the Copilot strip) is now not the only place it appears.
 *
 * **The form is not.** That route is GET and nothing else: `symbol_verdicts.py`
 * declares one read and there is no POST for a stance anywhere in the research
 * API. So there is nowhere to put *your* call — which is the same absence the
 * Copilot bench reports from the other end, where four record columns read
 * `not recorded` because no store holds a judge's verdict against the outcome
 * that followed it.
 *
 * A form whose Record button silently kept nothing would be worse than an
 * absence: it would teach the reader that their verdict had been stored. So the
 * stance buttons are not drawn, and what *is* offered is the nearest artifact
 * that genuinely persists — a hypothesis, which is a claim with a falsifier —
 * named as a different thing rather than passed off as the same one.
 */
import { Link } from 'react-router-dom'
import { SectionPanel } from '@/components/layout'
import { DenseTag } from '@/components/data-display'
import { SaveAsHypothesisButton } from '@/components/research'
import { useSymbolVerdicts } from '@/hooks/useSymbolVerdicts'

/** Approval states, in the words the Inbox uses. */
function stateVariant(state: string): 'success' | 'warning' | 'info' | 'neutral' {
  const s = state.toLowerCase()
  if (s.includes('accept') || s.includes('active') || s.includes('executed')) return 'success'
  if (s.includes('await') || s.includes('propos')) return 'warning'
  if (s.includes('reject') || s.includes('held')) return 'neutral'
  return 'info'
}

export function SymbolVerdictPanel({ symbol, thesis }: { symbol: string; thesis: string }) {
  const q = useSymbolVerdicts(symbol)
  const proposals = q.data?.proposals ?? []

  return (
    <SectionPanel
      cap="Your verdict"
      title={`on ${symbol} · 20d`}
      note="operator · hand"
      action={
        <Link to="/research/journal" className="text-dense-meta hover:underline">
          Journal ↗
        </Link>
      }
    >
      <div className="border-b border-border/60 px-3 py-2">
        <p className="text-dense-meta leading-relaxed text-muted-foreground">
          The design records your own call here — a stance, one line, and the lenses you cited.{' '}
          <span className="text-foreground/80">There is nowhere to put it.</span>{' '}
          <span className="font-mono">/research/verdicts/{symbol}</span> is read-only — it answers
          with what the Copilot and the Loop have claimed, below — and no route in the research API
          accepts a stance. The form is not drawn, because a Record button that kept nothing would
          be worse than this sentence.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <SaveAsHypothesisButton
            originPage="symbol"
            defaultTitle={`${symbol} — ${thesis}`}
            defaultThesis={thesis}
            defaultSymbols={[symbol]}
            defaultTags={['symbol']}
            originRef={{ source: 'symbol-overview', symbol }}
          />
          <span className="text-dense-caption text-muted-foreground">
            a claim with a falsifier, and it does persist — a different artifact from a verdict,
            not a stand-in for one
          </span>
        </div>
      </div>

      {q.isLoading ? (
        <p className="px-3 py-2 text-dense-meta text-muted-foreground">Reading the claims…</p>
      ) : proposals.length === 0 ? (
        <p className="px-3 py-2 text-dense-meta text-muted-foreground">
          Nothing has been claimed on {symbol} — no candidate, hypothesis or draft.
        </p>
      ) : (
        <>
          {proposals.slice(0, 6).map((p, i) => (
            <div
              key={`${p.kind}:${p.id ?? i}`}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-2 border-b border-border/50 px-3 py-1.5"
              title={[p.kind, p.state, p.created_at?.slice(0, 10), p.origin_page]
                .filter(Boolean)
                .join(' · ')}
            >
              <span className="font-mono text-dense-micro uppercase text-muted-foreground">
                {p.kind}
              </span>
              <span className="min-w-0 truncate text-dense-meta">{p.title ?? p.id ?? '—'}</span>
              <DenseTag variant={stateVariant(p.state)} size="cell">
                {p.state}
              </DenseTag>
            </div>
          ))}
          <p className="px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
            {proposals.length > 6 ? `${proposals.length - 6} more · ` : ''}
            The machine&rsquo;s claims on this name and where each one stands. None of them is
            yours: they were written by the Copilot or by a rule, and how they settle is read in{' '}
            <Link to="/research/loop/decisions" className="text-primary hover:underline">
              the Inbox
            </Link>
            .
          </p>
        </>
      )}
    </SectionPanel>
  )
}
