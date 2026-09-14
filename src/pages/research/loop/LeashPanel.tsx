/**
 * Leash — what Autopilot accepts without you (walk step G7).
 *
 * The design's aside, filled from the runtime instead of its static text: the
 * trust grant the leash needs, the four conditions from `leash.py`, and each
 * active objective's floor against its settled record. See `leash.ts`.
 */
import { Link } from 'react-router-dom'
import { StatusLamp } from '@/components/StatusLamp'
import { useActiveObjectives, useAutopilotStanding } from '@/hooks/useLoopHarness'
import { objectivePath } from '@/lib/harness/objectivePolicy'
import { LEASH_CONDITIONS, MIN_SOURCE_JUDGED, objectiveLeash } from '@/pages/research/loop/leash'

const leashPct = (x: number) => `${Math.round(x * 100)}%`

export function LeashPanel() {
  const standing = useAutopilotStanding()
  const objectivesQ = useActiveObjectives()
  const trust = standing.data?.trust
  const rows = objectiveLeash(objectivesQ.data?.items ?? [], standing.data?.objectives ?? [])

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
                  ? `${leashPct(o.hitRate)} on${o.judged}${o.horizonDays ? ` at T+${o.horizonDays}` : ''}`
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
