/**
 * The autopilot's standing: where it sits on the ladder, whether it is
 * trusted, when it runs next, what it has spent today, what is waiting.
 *
 * Above the objectives because it answers the question the Owner has before
 * any row — is the thing switched on, and is it allowed to act. Trust is read
 * from the cluster matrix and named as such: the local console showed L0 on a
 * day the cluster showed L1, and the loop obeys the cluster.
 */
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { cn } from '@/lib/utils'
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

const RUNGS = [
  { level: 1, label: 'Workbench', blurb: 'You open the pages.' },
  { level: 2, label: 'Copilot', blurb: 'You ask; it reads the pages for you.' },
  { level: 3, label: 'Autopilot', blurb: 'It runs, judges, rates and holds. You approve.' },
] as const

export function AutopilotLadder() {
  return (
    <ol className="grid grid-cols-3 gap-1.5" aria-label="Research autonomy levels">
      {RUNGS.map((r) => {
        const here = r.level === 3
        return (
          <li
            key={r.level}
            className={cn(
              'rounded-md border px-2.5 py-1.5',
              here ? 'border-primary/60 bg-primary/10' : 'border-border/60 bg-secondary/40',
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className={cn('text-dense-meta font-semibold', here && 'text-primary')}>{r.label}</span>
              <span className="text-dense-micro text-muted-foreground">
                Level {r.level}
                {here ? ' · you are here' : ''}
              </span>
            </div>
            <p className="text-dense-micro text-muted-foreground">{r.blurb}</p>
          </li>
        )
      })}
    </ol>
  )
}

export function AutopilotKpis({ standing }: { standing: AutopilotStanding }) {
  const t = standing.trust
  const p = standing.purse
  const exhausted = p.providers.filter((x) => x.exhausted).map((x) => x.provider)
  return (
    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
      <Kpi label="Trust · cluster matrix" title={t.note}>
        <span className="flex items-center gap-1.5">
          <StatusLamp lamp={t.matrix_l0 ? 'green' : 'yellow'} variant="dot" title={t.note} />
          <span className="font-mono text-dense-body font-semibold">{t.matrix_level ?? '—'}</span>
          <span className="text-dense-micro text-muted-foreground">
            {t.matrix_l0 ? 'auto-accept armed' : 'auto-accept off'}
          </span>
        </span>
      </Kpi>
      <Kpi label="Next unattended run" title="Weekdays 13:30 UTC, every active objective">
        <span className="text-dense-meta">{fmtNext(standing.next_run_at)}</span>
      </Kpi>
      <Kpi
        label="Purse today"
        title={p.providers.map((x) => `${x.provider} ${fmtUsd(x.spent_usd)} of ${fmtUsd(x.cap_usd)}`).join(' · ')}
      >
        <span className="font-mono text-dense-body font-semibold tabular-nums">
          {fmtUsd(p.spent_usd)} <span className="text-dense-micro font-normal text-muted-foreground">/ {fmtUsd(p.cap_usd)}</span>
        </span>
        {exhausted.length ? (
          <DenseTag variant="danger" size="cell">
            {exhausted.join(', ')} spent
          </DenseTag>
        ) : null}
      </Kpi>
      <Kpi label="Waiting on you" title="Candidate batches still pending in the Decision Inbox">
        <span className="font-mono text-dense-body font-semibold tabular-nums">{standing.pending_memos}</span>
        <span className="text-dense-micro text-muted-foreground">
          {standing.pending_memos === 1 ? 'memo' : 'memos'}
          {standing.best_conviction > 0 ? ` · best ${stars(standing.best_conviction).replace(/☆+$/, '')}` : ''}
        </span>
      </Kpi>
    </div>
  )
}

function Kpi({ label, title, children }: { label: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-secondary/40 px-2.5 py-1.5" title={title}>
      <div className="text-dense-micro uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}
