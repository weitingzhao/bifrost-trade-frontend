/**
 * Copilot's verdicts back on the page — research-loop-automation D4.
 *
 * One row under the context bar on every hub: what today's digest said about
 * the symbol, what the leash decided, and every chat-side proposal with its
 * approval state. Renders nothing when nobody has said anything.
 */
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { DenseTag } from '@/components/data-display'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { useResearchContext } from '@/hooks/useResearchContext'
import { useSymbolVerdicts } from '@/hooks/useSymbolVerdicts'
import { verdictChips, type ChipTone } from '@/lib/symbolVerdicts'

function tagVariant(tone: ChipTone): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  return tone
}

export function CopilotVerdictStrip({ originPage, originLabel }: { originPage: string; originLabel: string }) {
  const { symbol } = useResearchContext()
  const q = useSymbolVerdicts(symbol)
  const chips = verdictChips(q.data)
  if (!symbol || chips.length === 0) return null
  const digest = q.data?.digest
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5"
      role="status"
      data-testid="copilot-verdict-strip"
    >
      <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
      <span className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
        Copilot on {symbol}
      </span>
      {digest?.day ? <span className="text-dense-micro text-muted-foreground">digest {digest.day}</span> : null}
      {chips.map((c) =>
        c.to ? (
          <Link key={c.key} to={c.to} title={c.title} className="no-underline">
            <DenseTag variant={tagVariant(c.tone)} size="cell">
              {c.label}
            </DenseTag>
          </Link>
        ) : (
          <DenseTag key={c.key} variant={tagVariant(c.tone)} size="cell" title={c.title}>
            {c.label}
          </DenseTag>
        ),
      )}
      <span className="ml-auto">
        <AskCopilotButton
          originPage={originPage}
          originLabel={originLabel}
          symbol={symbol}
          size="dense"
          snapshot={compactSnapshot({
            digest_line: digest?.line,
            digest_day: digest?.day,
            proposals: q.data?.proposals.slice(0, 6).map((p) => `${p.kind}:${p.state}`),
          })}
          suggestedPrompt={`What has the Loop and the Copilot concluded about ${symbol} so far, and what is still waiting for a decision? Cite the digest and the proposals.`}
        />
      </span>
    </div>
  )
}
