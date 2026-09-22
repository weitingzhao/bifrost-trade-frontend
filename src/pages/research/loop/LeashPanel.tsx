/**
 * Leash — what Autopilot accepts without you (walk step G7).
 *
 * The design's aside, filled from the runtime instead of its static text: the
 * trust grant the leash needs, the four conditions from `leash.py`, and each
 * active objective's floor against its settled record. See `leash.ts`.
 *
 * Two homes, one truth (Rev 2026-09-18.2): the Inbox keeps the tall aside;
 * the console mounts the design's compact two-column panel — conditions on
 * the left, per-objective standing tags on the right — because on the page
 * that runs the loop the panel sits between the standing and the objectives,
 * not in a rail.
 */
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { useActiveObjectives, useAutopilotStanding } from '@/hooks/useLoopHarness'
import { objectivePath } from '@/lib/harness/objectivePolicy'
import {
  DEFAULT_MIN_SOURCE_HIT_RATE,
  LEASH_CONDITIONS,
  MIN_SOURCE_JUDGED,
  leashPct,
  objectiveLeash,
  type ObjectiveLeash,
} from '@/pages/research/loop/leash'

const STANDING_TAG: Record<ObjectiveLeash['standing'], { label: string; variant: 'success' | 'warning' | 'neutral' }> = {
  clears: { label: 'CLEARS', variant: 'success' },
  below: { label: 'BELOW', variant: 'warning' },
  'no-record': { label: 'NO RECORD', variant: 'neutral' },
}

export function LeashPanel({ home = 'inbox' }: { home?: 'inbox' | 'console' } = {}) {
  const standing = useAutopilotStanding()
  const objectivesQ = useActiveObjectives()
  const trust = standing.data?.trust
  const rows = objectiveLeash(objectivesQ.data?.items ?? [], standing.data?.objectives ?? [])
  const armed = Boolean(trust?.matrix_l0)

  if (home === 'console') {
    return (
      <section className="overflow-hidden rounded-lg border border-border bg-background">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
          <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">Leash</span>
          <span className="text-dense-body font-semibold">what a run accepts without you</span>
          <span className="ml-auto text-dense-meta text-muted-foreground">
            all four must hold, and only while Trust grants L0 · accepting opens a hypothesis, never an order
          </span>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <ol className="list-decimal space-y-1 border-b border-border/50 py-2.5 pl-9 pr-3 text-dense-label leading-relaxed text-foreground/85 lg:border-b-0 lg:border-r">
            {LEASH_CONDITIONS.map((c) => (
              <li key={c.id}>{c.text}</li>
            ))}
          </ol>
          <div className="flex flex-col gap-2 px-3 py-2.5">
            {rows.length === 0 ? (
              <span className="text-dense-meta text-muted-foreground">No active objectives.</span>
            ) : (
              rows.map((o) => (
                <div key={o.id} className="flex flex-wrap items-baseline gap-2">
                  <DenseTag variant={STANDING_TAG[o.standing].variant} size="cell">
                    {STANDING_TAG[o.standing].label}
                  </DenseTag>
                  <Link to={objectivePath(o.id)} className="text-dense-label font-semibold hover:underline">
                    {o.title}
                  </Link>
                  <span className="font-mono text-dense-meta tabular-nums text-muted-foreground">
                    {o.hitRate != null && o.judged >= MIN_SOURCE_JUDGED
                      ? `${leashPct(o.hitRate)} on ${o.judged} settled · floor ${leashPct(o.floor)}${o.floorIsDefault ? ' (default)' : ''}`
                      : `${o.judged} settled of ${MIN_SOURCE_JUDGED} needed — every batch waits for you`}
                  </span>
                </div>
              ))
            )}
            <span className="text-dense-micro text-muted-foreground">
              {armed
                ? `Floor default ${leashPct(DEFAULT_MIN_SOURCE_HIT_RATE)} when an objective sets none. Accepting a candidate opens a hypothesis — never an order (D10).`
                : 'Trust is not L0 — the four conditions are moot until it is; every batch waits in the Inbox.'}
            </span>
          </div>
        </div>
      </section>
    )
  }

  return (
    <aside className="space-y-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-dense-meta">
      <div>
        <h2 className="text-dense-body font-semibold">Leash</h2>
        <p className="text-muted-foreground">What Autopilot accepts without you</p>
      </div>

      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <StatusLamp
            lamp={standing.isError || !trust ? 'gray' : trust.matrix_l0 ? 'green' : 'yellow'}
            variant="dot"
            title={trust?.source ? `Read from ${trust.source}` : undefined}
          />
          <span className="font-medium">
            {standing.isLoading
              ? 'Reading the trust grant…'
              : standing.isError || !trust
                ? 'Trust grant not read'
                : trust.matrix_l0
                  ? `Armed · ${trust.matrix_level ?? 'L0'}`
                  : `Not armed · ${trust.matrix_level ?? 'no grant'} — every candidate waits for you`}
          </span>
        </div>
        {trust?.note ? <p className="text-muted-foreground">{trust.note}</p> : null}
      </div>

      <div>
        <div className="text-dense-micro uppercase tracking-wide text-muted-foreground">Accepts a candidate only when</div>
        <ol className="mt-0.5 list-decimal space-y-0.5 pl-4">
          {LEASH_CONDITIONS.map((c) => (
            <li key={c.id}>{c.text}</li>
          ))}
        </ol>
      </div>

      {rows.length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-dense-micro uppercase tracking-wide text-muted-foreground">Per objective</div>
          {rows.map((o) => (
            <div key={o.id}>
              <Link to={objectivePath(o.id)} className="font-medium hover:underline">
                {o.title}
              </Link>
              <p className="font-mono tabular-nums text-muted-foreground">
                floor {leashPct(o.floor)}
                {o.floorIsDefault ? ' (default)' : ''} · record{' '}
                {o.hitRate != null
                  ? `${leashPct(o.hitRate)} on ${o.judged}${o.horizonDays ? ` at T+${o.horizonDays}` : ''}`
                  : 'none yet'}
              </p>
              <p>
                {o.standing === 'clears'
                  ? 'Clears its floor — a candidate that meets the other three can be accepted unattended.'
                  : o.standing === 'below'
                    ? 'Below its floor — every candidate waits for you.'
                    : `No record yet (fewer than ${MIN_SOURCE_JUDGED} settled) — every candidate waits for you.`}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div>
        <div className="text-dense-micro uppercase tracking-wide text-muted-foreground">Asks you</div>
        <p>Everything else: split or blocked names, policy changes, playbook entries, and every briefing.</p>
      </div>
      <div>
        <div className="text-dense-micro uppercase tracking-wide text-muted-foreground">Never</div>
        <p>Plans, intents, orders — D10. Accepting a candidate opens a hypothesis, nothing more.</p>
      </div>

      <Link to="/research/loop/harness" className="inline-block text-primary hover:underline">
        Autopilot →
      </Link>
    </aside>
  )
}
