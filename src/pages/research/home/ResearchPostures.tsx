/**
 * The three ways Research works for the Owner, side by side, each in its own
 * density.
 *
 *   Level 3 · Autopilot  — it runs, judges, rates and holds; you approve.
 *                          Read as standing: a sentence per objective.
 *   Level 2 · Copilot    — the models work when asked. Read as a conversation:
 *                          today's brief, the last threads, what the chat
 *                          asked to write.
 *   Level 1 · Workbench  — you open the pages. Read as a directory.
 *
 * Every number is live from the same endpoints the level's own pages use, so
 * this strip can never say something its page would contradict. Nothing here
 * spends: the brief and the memo are today's, the rest are reads.
 */
import { Link } from 'react-router-dom'
import { ArrowRight, Bot, MessageCircle, Wrench } from 'lucide-react'
import { DenseTag } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusLamp } from '@/components/StatusLamp'
import { NAV_GROUPS } from '@/layout/navConfig'
import { useAutopilotStanding } from '@/hooks/useLoopHarness'
import { copilotBubbleStore } from '@/hooks/useCopilotBubble'
import { useCopilotStanding, useSignalHealthSummary } from '@/hooks/useCopilotStanding'
import { fmtIsoTs } from '@/lib/format'
import { fmtUsd } from '@/lib/harness/runSpend'
import { stars } from '@/lib/harness/rating'
import { loopPipelinePath, openResearchCopilot } from '@/lib/harness/loopCopilotPrefill'
import { objectivePath } from '@/lib/harness/objectivePolicy'
import type { LampColor } from '@/lib/researchFreshness'
import { setResearchSeat } from '@/lib/research/seat'

const WORKBENCH = NAV_GROUPS.find((g) => g.label === 'Research')?.subGroups?.filter((s) =>
  s.label.startsWith('Workbench'),
) ?? []
const WORKBENCH_PAGES = WORKBENCH.reduce((n, s) => n + s.items.length, 0)

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const h = Math.round((Date.now() - d.getTime()) / 3_600_000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return fmtIsoTs(iso)
}

export function ResearchPostures({
  activeHypotheses,
  discoveries,
}: {
  activeHypotheses: number
  discoveries: number
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <AutopilotPosture />
      <CopilotPosture />
      <WorkbenchPosture activeHypotheses={activeHypotheses} discoveries={discoveries} />
    </div>
  )
}

function Posture({
  level,
  name,
  icon,
  claim,
  lamp,
  lampTitle,
  cta,
  children,
}: {
  level: string
  name: string
  icon: React.ReactNode
  claim: string
  lamp: LampColor
  lampTitle: string
  cta: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-border bg-secondary/40 shadow-[0_2px_6px_rgba(0,0,0,0.15)]">
      <header className="flex items-start gap-2 border-b border-border/60 px-4 py-3">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold leading-tight">{name}</h2>
            <DenseTag variant="neutral" size="cell">
              {level}
            </DenseTag>
            <StatusLamp lamp={lamp} variant="dot" title={lampTitle} className="ml-auto" />
          </div>
          <p className="mt-0.5 text-dense-label leading-snug text-muted-foreground">{claim}</p>
        </div>
      </header>
      <div className="flex-1 space-y-2 px-4 py-3">{children}</div>
      <footer className="flex items-center gap-2 border-t border-border/60 px-4 py-2">{cta}</footer>
    </section>
  )
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-dense-meta uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-dense-label leading-relaxed">{children}</div>
    </div>
  )
}

function AutopilotPosture() {
  const q = useAutopilotStanding()
  const s = q.data
  const lamp: LampColor = q.isError ? 'red' : !s ? 'gray' : s.trust.matrix_l0 ? 'green' : 'yellow'
  return (
    <Posture
      level="Level 3 · unattended"
      name="Autopilot"
      icon={<Bot className="size-4" />}
      claim="Objectives run on a schedule, get judged by two models, rated, and held on a leash until you approve."
      lamp={lamp}
      lampTitle={s?.trust.note ?? 'Loading'}
      cta={
        <>
          <Button asChild size="sm" className="h-7">
            <Link to="/research/loop/harness" onClick={() => setResearchSeat('autopilot')}>
              Open Autopilot <ArrowRight className="ml-1 size-3" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="h-7">
            <Link to="/research/loop/decisions">Decision Inbox</Link>
          </Button>
        </>
      }
    >
      {q.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : q.isError || !s ? (
        <p className="text-dense-label text-destructive">Standing unavailable — research-api :8795.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <Line label="Trust · cluster">
              <span className="font-mono font-semibold">{s.trust.matrix_level ?? '—'}</span>{' '}
              <span className="text-muted-foreground">{s.trust.matrix_l0 ? 'auto-accept armed' : 'auto-accept off'}</span>
            </Line>
            <Line label="Next run">{fmtIsoTs(s.next_run_at)}</Line>
            <Line label="Purse today">
              <span className="font-mono tabular-nums">{fmtUsd(s.purse.spent_usd)}</span>
              <span className="text-muted-foreground"> / {fmtUsd(s.purse.cap_usd)}</span>
            </Line>
            <Line label="Waiting on you">
              <span className="font-mono font-semibold tabular-nums">{s.pending_memos}</span>{' '}
              <span className="text-muted-foreground">
                {s.pending_memos === 1 ? 'memo' : 'memos'}
                {s.best_conviction > 0 ? ` · best ${stars(s.best_conviction).replace(/☆+$/, '')}` : ''}
              </span>
            </Line>
          </div>
          <ul className="space-y-1.5 border-t border-border/40 pt-2">
            {s.objectives.map((o) => (
              <li key={o.id} className="text-dense-label leading-relaxed">
                <Link to={objectivePath(o.id)} className="font-medium hover:underline">
                  {o.title}
                </Link>
                {o.last_memo ? (
                  <>
                    {' — '}
                    <Link to={loopPipelinePath(o.last_memo.run_id, { live: false })} className="text-muted-foreground hover:underline">
                      {o.last_memo.headline}
                    </Link>
                  </>
                ) : (
                  <span className="text-muted-foreground"> — no rated run yet</span>
                )}
              </li>
            ))}
            {s.objectives.length === 0 ? (
              <li className="text-dense-label text-muted-foreground">No active objectives.</li>
            ) : null}
          </ul>
        </>
      )}
    </Posture>
  )
}

function CopilotPosture() {
  const q = useCopilotStanding()
  const s = q.data
  const lamp: LampColor = q.isError ? 'red' : !s ? 'gray' : s.brief ? 'green' : 'yellow'
  const a = s?.approvals ?? {}
  const openThreads = () => {
    openResearchCopilot()
    copilotBubbleStore.getState().setSessionsOpen(true)
  }
  return (
    <Posture
      level="Level 2 · on request"
      name="Copilot"
      icon={<MessageCircle className="size-4" />}
      claim="The models work when you ask: a brief each morning, a chat that reads every page, writes only with your approval."
      lamp={lamp}
      lampTitle={s?.brief ? 'Today’s digest is in' : 'No digest yet today'}
      cta={
        <>
          <Button
            type="button"
            size="sm"
            className="h-7"
            onClick={() => {
              setResearchSeat('copilot')
              openResearchCopilot()
            }}
          >
            Ask the Copilot <ArrowRight className="ml-1 size-3" />
          </Button>
          <Button asChild size="sm" variant="ghost" className="h-7">
            <Link to="/research/daily-brief">Daily Brief</Link>
          </Button>
        </>
      }
    >
      {q.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : q.isError || !s ? (
        <p className="text-dense-label text-destructive">
          {q.error instanceof Error && /401|403/.test(q.error.message)
            ? 'Sign in as the Owner in the Copilot user switcher to read this.'
            : 'Standing unavailable — research-api :8795.'}
        </p>
      ) : (
        <>
          <Line label="Today’s digest">
            {s.brief ? (
              <Link to="/research/loop/decisions" className="hover:underline">
                <span className="text-base leading-relaxed">{s.brief.headline || 'Digest written.'}</span>{' '}
                <DenseTag variant={s.brief.status === 'pending' ? 'warning' : 'neutral'} size="cell">
                  {s.brief.status}
                </DenseTag>
              </Link>
            ) : (
              <span className="text-muted-foreground">Not written yet — the digest runs at 11:30 UTC on trading days.</span>
            )}
          </Line>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <Line label="Conversations today">
              <span className="font-mono font-semibold tabular-nums">{s.sessions.today}</span>
            </Line>
            <Line label="Chat asked to write">
              <span className="font-mono tabular-nums">{a.proposed ?? 0}</span>
              <span className="text-muted-foreground">
                {' '}
                proposed · {a.executed ?? 0} ran · {a.rejected ?? 0} refused
              </span>
            </Line>
            <Line label="Spent today">
              <span className="font-mono tabular-nums">{fmtUsd(s.usage.cost_estimate_usd + (s.usage.bridge_cost_usd_today ?? 0))}</span>
              <span className="text-muted-foreground"> / {fmtUsd(s.usage.cap_usd)}</span>
            </Line>
            <Line label="Personas">
              <Link to="/research/agent-personas" className="hover:underline">
                who judges
              </Link>
              <span className="text-muted-foreground"> · </span>
              <Link to="/research/playbook" className="hover:underline">
                my trading system
              </Link>
            </Line>
          </div>
          {s.sessions.recent.length ? (
            <ul className="space-y-1 border-t border-border/40 pt-2">
              {s.sessions.recent.map((r) => (
                <li key={r.id} className="text-dense-label leading-relaxed">
                  <button type="button" className="text-left hover:underline" onClick={openThreads} title="Open the thread list">
                    {r.title}
                  </button>
                  <span className="text-muted-foreground">
                    {' '}
                    · {fmtWhen(r.updated_at)}
                    {r.turns != null ? ` · ${r.turns} turns` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </Posture>
  )
}

function WorkbenchPosture({ activeHypotheses, discoveries }: { activeHypotheses: number; discoveries: number }) {
  const health = useSignalHealthSummary()
  const overall = health.data?.overall ?? null
  const lamp: LampColor = health.isError
    ? 'red'
    : overall == null
      ? 'gray'
      : overall === 'ok' || overall === 'fresh'
        ? 'green'
        : 'yellow'
  return (
    <Posture
      level="Level 1 · by hand"
      name="Workbench"
      icon={<Wrench className="size-4" />}
      claim={`You open the pages. ${WORKBENCH_PAGES} of them, in four benches; the same warehouse the other two levels read.`}
      lamp={lamp}
      lampTitle={overall ? `Signal health: ${overall}` : 'Signal health loading'}
      cta={
        <>
          <Button asChild size="sm" className="h-7">
            <Link to="/research/explorer" onClick={() => setResearchSeat('workbench')}>
              Stock Explorer <ArrowRight className="ml-1 size-3" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="h-7">
            <Link to="/research/signal-health">Signal Health</Link>
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Line label="Signal health">
          <span className="font-mono">{overall ?? '—'}</span>
          {health.data?.as_of ? <span className="text-muted-foreground"> · {fmtWhen(health.data.as_of)}</span> : null}
        </Line>
        <Line label="Today">
          <span className="font-mono tabular-nums">{discoveries}</span>
          <span className="text-muted-foreground"> discoveries · </span>
          <span className="font-mono tabular-nums">{activeHypotheses}</span>
          <span className="text-muted-foreground"> active theses</span>
        </Line>
      </div>
      <dl className="space-y-1.5 border-t border-border/40 pt-2">
        {WORKBENCH.map((bench) => (
          <div key={bench.label} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-dense-label">
            <dt className="w-16 shrink-0 text-dense-meta uppercase tracking-wide text-muted-foreground">
              {bench.label.replace('Workbench · ', '')}
            </dt>
            <dd className="flex flex-wrap gap-x-2">
              {bench.items.map((it, i) => (
                <span key={it.id}>
                  <Link to={it.to ?? it.id} className="hover:underline">
                    {it.label}
                  </Link>
                  {i < bench.items.length - 1 ? <span className="text-muted-foreground/50"> ·</span> : null}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Posture>
  )
}
