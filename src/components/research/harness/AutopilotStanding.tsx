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
import { StatusLamp } from '@/components/StatusLamp'
import { fmtUsd } from '@/lib/harness/runSpend'
import { stars } from '@/lib/harness/rating'
import type { AutopilotStanding } from '@/api/research/harness'

function fmtNext(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const now = new Date()
  const hours = Math.round((d.getTime() - now.getTime()) / 3_600_000)
  const when = d.toLocaleString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
  return hours <= 0 ? when : hours < 48 ? `${when} · in ${hours}h` : when
}

export function AutopilotKpis({ standing }: { standing: AutopilotStanding }) {
  const t = standing.trust
  const p = standing.purse
  const exhausted = p.providers.filter((x) => x.exhausted).map((x) => x.provider)
  // Re-running an objective proposes the same names again; the Inbox has folded
  // those into one call for a while, and this counted the rows.
  const folded = Math.max(0, (standing.pending_drafts ?? standing.pending_memos) - standing.pending_memos)
  // Five cells in the design's order (Research Autopilot Console.dc.html,
  // Rev 2026-09-18.2): the drafts stand beside the calls they fold into
  // instead of inside their tooltip.
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <Kpi label="Next run" title="The nearest scheduled objective. Run now on any objective does not move its schedule.">
        <span className="text-base">{fmtNext(standing.next_run_at)}</span>
      </Kpi>
      <Kpi label="Trust" title={t.note}>
        <span className="flex items-center gap-1.5">
          <StatusLamp lamp={t.matrix_l0 ? 'green' : 'yellow'} variant="dot" title={t.note} />
          <span className="font-mono text-lg font-semibold">{t.matrix_level ?? '—'}</span>
          <span className="text-dense-label text-muted-foreground">
            {t.matrix_l0 ? 'leash may accept' : 'nothing auto-approved'}
          </span>
        </span>
      </Kpi>
      <Kpi label="Awaiting you" title="Rated memos with no decision yet. The Decision Inbox reads the same queue.">
        <span className="font-mono text-lg font-semibold tabular-nums text-warning">{standing.pending_memos}</span>
        <span className="text-dense-label text-muted-foreground">
          {standing.pending_memos === 1 ? 'call' : 'calls'}
          {standing.best_conviction > 0 ? ` · best ${stars(standing.best_conviction).replace(/☆+$/, '')}` : ''}
        </span>
      </Kpi>
      <Kpi
        label="Drafts"
        title="Draft rows in the Inbox; repeats of the same objective proposing the same names fold into the call above them."
      >
        <span className="font-mono text-lg font-semibold tabular-nums">
          {standing.pending_drafts ?? standing.pending_memos}
        </span>
        <span className="text-dense-label text-muted-foreground">
          {folded > 0 ? `${folded} fold into the calls` : 'in the Inbox'}
        </span>
      </Kpi>
      <Kpi
        label="Spend today"
        title={p.providers.map((x) => `${x.provider} ${fmtUsd(x.spent_usd)} of ${fmtUsd(x.cap_usd)}`).join(' · ')}
      >
        <span className="font-mono text-lg font-semibold tabular-nums">
          {fmtUsd(p.spent_usd)} <span className="text-dense-label font-normal text-muted-foreground">/ {fmtUsd(p.cap_usd)}</span>
        </span>
        {exhausted.length ? (
          <DenseTag variant="danger" size="cell">
            {exhausted.join(', ')} spent
          </DenseTag>
        ) : null}
      </Kpi>
    </div>
  )
}

function Kpi({ label, title, children }: { label: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3" title={title}>
      <div className="text-dense-meta uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}
