/**
 * The Research group as the current seat lays it out, with live objectives
 * under "Objects" and the badges the seat cares about.
 */
import { useEffect, useMemo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { useAutopilotStanding } from '@/hooks/useLoopHarness'
import { setResearchSeat, useResearchSeat } from '@/lib/research/seat'
import { objectivePath } from '@/lib/harness/objectivePolicy'
import type { ShellNavGroup, ShellNavItem } from '@bifrost/ui'
import { AUTOPILOT_PAGES, buildResearchNavGroup, seatForRoute } from './researchNavCatalog'
import { ResearchSeatRail } from './ResearchSeatRail'

export function useResearchNavGroup(): { group: ShellNavGroup; extras: (item: ShellNavItem) => ReactNode } {
  const seat = useResearchSeat()
  const { pathname } = useLocation()
  const standingQ = useAutopilotStanding()
  const standing = standingQ.data

  // The seat follows the route. Each seat carries only its own pages, so
  // landing on another seat's page — a link out of a memo, a deep link, the
  // back button — would otherwise leave the sidebar showing a menu the current
  // page is not in. Overview and the Research root are seatless and leave the
  // rail where it was.
  useEffect(() => {
    const owner = seatForRoute(pathname)
    if (owner != null && owner !== seat) setResearchSeat(owner)
  }, [pathname, seat])

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
      // The badge sits on the Decision Inbox, so it counts the Inbox — not
      // candidate batches, which is what `pending_memos` counts and what the
      // objective rows below want. The badge said three while the page it
      // opened offered twenty-four calls.
      const inbox = standing.pending_decisions?.calls ?? standing.pending_memos
      if (inbox > 0) {
        byPath.set(
          AUTOPILOT_PAGES.inbox.to!,
          <DenseTag variant="warning" size="cell" title="Drafts waiting on a call">
            {inbox}
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
