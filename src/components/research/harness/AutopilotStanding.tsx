/**
 * The autopilot's standing: whether it is trusted, when it runs next, what it
 * has spent today, what is waiting.
 *
 * Above the objectives because it answers the question the Owner has before
 * any row — is the thing switched on, and is it allowed to act. Trust is read
 * from the cluster matrix and named as such: the local console showed L0 on a
 * day the cluster showed L1, and the loop obeys the cluster.
 */
import { DenseTag } from '@/components/data-display'
import { HeroCard, HeroRow } from '@/components/layout'
import { fmtUsd } from '@/lib/harness/runSpend'
import { stars } from '@/lib/harness/rating'
import type { AutopilotStanding } from '@/api/research/harness'

/**
 * The next run as a hero reads it: the clock time as the reading, the day and
 * how far off it is as the line under it (the design's `13:30Z` · `in 2h`).
 */
function fmtNext(iso: string): { time: string; when: string } {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { time: iso, when: '' }
  const hours = Math.round((d.getTime() - Date.now()) / 3_600_000)
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  const day = d.toLocaleDateString('en-US', { weekday: 'short' })
  const zone = d.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop() ?? ''
  return { time, when: [day, zone, hours > 0 && hours < 48 ? `in ${hours}h` : null].filter(Boolean).join(' · ') }
}

export function AutopilotKpis({ standing }: { standing: AutopilotStanding }) {
  const t = standing.trust
  const p = standing.purse
  const exhausted = p.providers.filter((x) => x.exhausted).map((x) => x.provider)
  // Re-running an objective proposes the same names again; the Inbox has folded
  // those into one call for a while, and this counted the rows.
  const folded = Math.max(0, (standing.pending_drafts ?? standing.pending_memos) - standing.pending_memos)
  // Five hero cards in the design's order (Research Autopilot Console.dc.html,
  // Rev .83): the drafts stand beside the calls they fold into instead of
  // inside their tooltip. Trust at L0 reads in ink — a level is a state, not
  // a gain (§14.7); below L0 it is amber. The row wraps by its own width, so a
  // 420px float reads two to a line (the Phone grammar).
  return (
    <HeroRow basis={200} label="Autopilot standing">
      <HeroCard
        label="Next run"
        value={fmtNext(standing.next_run_at).time}
        sub={fmtNext(standing.next_run_at).when || 'the nearest scheduled objective'}
        title="The nearest scheduled objective. Run now on any objective does not move its schedule."
      />
      <HeroCard
        label="Trust"
        value={t.matrix_level ?? '—'}
        valueClassName={t.matrix_l0 ? 'text-foreground' : 'text-warning'}
        sub={t.matrix_l0 ? 'leash may accept' : 'nothing auto-approved'}
        title={t.note}
      />
      <HeroCard
        label="Awaiting you"
        value={standing.pending_memos}
        valueClassName="text-warning"
        sub={`${standing.pending_memos === 1 ? 'call' : 'calls'}${
          standing.best_conviction > 0 ? ` · best ${stars(standing.best_conviction).replace(/☆+$/, '')}` : ''
        }`}
        title="Rated memos with no decision yet. The Decision Inbox reads the same queue."
      />
      <HeroCard
        label="Drafts"
        value={standing.pending_drafts ?? standing.pending_memos}
        sub={folded > 0 ? `${folded} fold into the calls above` : 'in the Inbox'}
        title="Draft rows in the Inbox; repeats of the same objective proposing the same names fold into the call above them."
      />
      <HeroCard
        label="Spend today"
        value={fmtUsd(p.spent_usd)}
        sub={`of ${fmtUsd(p.cap_usd)} · judge models · all runs`}
        title={p.providers.map((x) => `${x.provider} ${fmtUsd(x.spent_usd)} of ${fmtUsd(x.cap_usd)}`).join(' · ')}
      >
        {exhausted.length ? (
          <span className="flex">
            <DenseTag variant="danger" size="cell">
              {exhausted.join(', ')} spent
            </DenseTag>
          </span>
        ) : null}
      </HeroCard>
    </HeroRow>
  )
}

