/**
 * Leash standing — for this one objective.
 *
 * The four conditions already had two homes (the Inbox's tall aside, the
 * Console's two-column panel) and the objective page, which is where a floor
 * is actually *set*, had none. The design puts it beside Identity for a
 * reason those two cannot show: a leash reads **this** objective's record
 * against **this** objective's floor, and the Console can only line the
 * standings up next to each other.
 *
 * Nothing here is new data. `leash.ts` holds the conditions and the floor
 * arithmetic; the trust grant comes from the Autopilot standing, as it does
 * in both other homes. One definition, three readings.
 */
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { useAutopilotStanding, useActiveObjectives } from '@/hooks/useLoopHarness'
import {
  LEASH_CONDITIONS,
  MIN_SOURCE_JUDGED,
  leashPct as pct,
  objectiveLeash,
  type ObjectiveLeash,
} from '@/pages/research/loop/leash'

const TAG: Record<ObjectiveLeash['standing'], { label: string; variant: 'success' | 'warning' | 'neutral' }> = {
  clears: { label: 'CLEARS', variant: 'success' },
  below: { label: 'BELOW', variant: 'warning' },
  'no-record': { label: 'NO RECORD', variant: 'neutral' },
}

/**
 * Which conditions this objective's own record can speak to.
 *
 * Only the fourth is measured per objective — agreement, validate and
 * evidence are decided inside a run, so the page says that rather than
 * ticking four boxes off one number.
 */
function conditionNote(id: string, leash: ObjectiveLeash | null): { note: string; held: boolean | null } {
  if (id !== 'record') return { note: 'decided inside each run', held: null }
  if (!leash || leash.hitRate == null) {
    return { note: `no settled record yet — a floor needs ${MIN_SOURCE_JUDGED} outcomes`, held: false }
  }
  const held = leash.standing === 'clears'
  return {
    note: `${pct(leash.hitRate)} on ${leash.judged} settled · floor ${pct(leash.floor)}${leash.floorIsDefault ? ' · default' : ''}`,
    held,
  }
}

export function ObjectiveLeashCard({ objectiveId }: { objectiveId: string }) {
  const standing = useAutopilotStanding()
  const objectives = useActiveObjectives()
  const rows = objectiveLeash(objectives.data?.items ?? [], standing.data?.objectives ?? [])
  const leash = rows.find((r) => r.id === objectiveId) ?? null
  const armed = Boolean(standing.data?.trust?.matrix_l0)
  const tag = TAG[leash?.standing ?? 'no-record']

  return (
    <section className="overflow-hidden border mat-card">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
        <span className="text-dense-body font-semibold">Leash standing</span>
        <DenseTag variant={tag.variant} size="cell">
          {tag.label}
        </DenseTag>
        <span className="ml-auto font-mono text-dense-meta tabular-nums text-muted-foreground">
          {leash?.hitRate != null
            ? `${pct(leash.hitRate)} on ${leash.judged} settled · floor ${pct(leash.floor)}`
            : leash
              ? `no record · floor ${pct(leash.floor)}`
              : 'not on the roster'}
        </span>
      </header>
      <ol className="list-decimal space-y-1.5 px-3 py-2.5 pl-8">
        {LEASH_CONDITIONS.map((c) => {
          const { note, held } = conditionNote(c.id, leash)
          return (
            <li
              key={c.id}
              className={`text-dense-meta leading-relaxed ${held === false ? 'text-warning' : 'text-foreground/85'}`}
            >
              {c.text}
              <span className="ml-1.5 font-mono text-dense-caption text-muted-foreground">· {note}</span>
            </li>
          )
        })}
      </ol>
      <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
        {armed ? (
          <>
            All four must hold, and only while Trust grants L0. Accepting a candidate opens a
            hypothesis — never an order (D10).
          </>
        ) : (
          <>
            Trust is not L0 — the four conditions are moot until it is. The loop still selects,
            judges and rates; every batch waits in{' '}
            <Link to="/research/loop/decisions" className="text-primary hover:underline">
              the Inbox
            </Link>
            .
          </>
        )}
      </p>
    </section>
  )
}
