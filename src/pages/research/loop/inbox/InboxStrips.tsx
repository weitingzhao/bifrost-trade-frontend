/**
 * The two strips above the queue: rule proposals measured on too few trades
 * to argue anything yet, and today's digest waiting under Briefings.
 */
import { Link } from 'react-router-dom'
import type { AiDraft } from '@/api/researchDrafts'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { cn } from '@/lib/utils'
import type { Proposal } from '@/pages/research/loop/proposals/proposalsModel'

export function InboxStrips({
  thin,
  digest,
  onReadDigest,
}: {
  thin: readonly Proposal[]
  digest: AiDraft | null
  onReadDigest: () => void
}) {
  return (
    <>
      {/* A thin proposal is not a card: it has not argued anything yet. Named
          on one strip so it is visible as measured-but-not-yet-arguing. */}
      {thin.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border px-3 py-1.5 text-dense-meta mat-card">
          <StatusLamp lamp="gray" variant="dot" title="Measured, not yet arguing" />
          <span className={cn(positionsUi.mono, 'font-semibold')}>{thin.map((p) => `${p.title} · n ${p.n}`).join(' · ')}</span>
          <span className="min-w-0 text-muted-foreground">
            measured on too few trades to argue a rule. Not a card until the sample is.
          </span>
          <Link to="/review/habits" className="ml-auto shrink-0 text-dense-micro text-primary hover:underline">
            Habits →
          </Link>
        </div>
      ) : null}

      {/* Until it is read. Neutral, not a hue: classification is not colour (§7). */}
      {digest ? (
        <div className="flex flex-wrap items-center gap-2 border px-3 py-1.5 text-dense-meta mat-card">
          <span className="font-medium">{typeof digest.payload.title === 'string' ? digest.payload.title : 'Daily digest'}</span>
          <span className="text-muted-foreground">is waiting under Briefings — it needs reading, not a verdict.</span>
          <button type="button" className="ml-auto text-dense-meta text-primary underline" onClick={onReadDigest}>
            Read it
          </button>
        </div>
      ) : null}
    </>
  )
}
