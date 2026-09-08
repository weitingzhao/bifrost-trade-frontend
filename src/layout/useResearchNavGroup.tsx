/**
 * The Research group as the current seat lays it out, with live objectives
 * under "Objects" and the badges the seat cares about.
 */
import { useMemo, type ReactNode } from 'react'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { useAutopilotStanding } from '@/hooks/useLoopHarness'
import { useResearchSeat } from '@/lib/research/seat'
import { objectivePath } from '@/lib/harness/objectivePolicy'
import type { ShellNavGroup, ShellNavItem } from '@bifrost/ui'
import { AUTOPILOT_PAGES, buildResearchNavGroup } from './researchNavCatalog'
import { ResearchSeatRail } from './ResearchSeatRail'

export function useResearchNavGroup(): { group: ShellNavGroup; extras: (item: ShellNavItem) => ReactNode } {
  const seat = useResearchSeat()
  const standingQ = useAutopilotStanding()
  const standing = standingQ.data

  const group = useMemo(
    () =>
      buildResearchNavGroup(seat, {
        objectives: (standing?.objectives ?? []).map((o) => ({ id: o.id, title: o.title ?? o.id })),
        prefix: <ResearchSeatRail />,
      }),
    [seat, standing],
  )

  const extras = useMemo(() => {
    const byPath = new Map<string, ReactNode>()
    if (standing) {
      if (standing.pending_memos > 0) {
        byPath.set(
          AUTOPILOT_PAGES.inbox.to!,
          <DenseTag variant="warning" size="cell" title="Memos waiting on you">
            {standing.pending_memos}
          </DenseTag>,
        )
      }
      byPath.set(
        AUTOPILOT_PAGES.autopilot.to!,
        <StatusLamp lamp={standing.trust.matrix_l0 ? 'green' : 'yellow'} variant="dot" title={standing.trust.note} />,
      )
      for (const o of standing.objectives) {
        if (o.pending_memos > 0) {
          byPath.set(
            objectivePath(o.id),
            <DenseTag variant="warning" size="cell" title="Memos waiting on you">
              {o.pending_memos}
            </DenseTag>,
          )
        }
      }
    }
    return (item: ShellNavItem) => byPath.get(item.to ?? item.id) ?? null
  }, [standing])

  return { group, extras }
}
