/**
 * The Research group as the current seat lays it out, with live objectives
 * under "Objects" and the badges the seat cares about.
 */
import { useMemo, type ReactNode } from 'react'
import { DenseTag } from '@/components/data-display'
import { useAutopilotStanding } from '@/hooks/useLoopHarness'
import { objectivePath } from '@/lib/harness/objectivePolicy'
import type { ShellNavGroup, ShellNavItem } from '@bifrost/ui'
import { AUTOPILOT_PAGES, buildResearchNavGroup } from './researchNavCatalog'

export function useResearchNavGroup(): { group: ShellNavGroup; extras: (item: ShellNavItem) => ReactNode } {
  const standingQ = useAutopilotStanding()
  const standing = standingQ.data

  // One tree, both homes (Owner ruling 2026-09-19 on Vision §15 Q2): the
  // Autopilot engine and the Pipeline stations stand together; nothing swaps
  // under the reader.
  const group = useMemo(
    () =>
      buildResearchNavGroup({
        objectives: (standing?.objectives ?? []).map((o) => ({ id: o.id, title: o.title ?? o.id })),
      }),
    [standing],
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
      // The design's chip on the home row is the word, not a lamp: `running`
      // while a run is in flight, nothing when the loop is idle. Trust moved
      // to where it is judged — the console's standing and the leash panel.
      if (standing.objectives.some((o) => o.last_run?.status === 'running')) {
        byPath.set(
          AUTOPILOT_PAGES.autopilot.to!,
          <DenseTag variant="success" size="cell" title="A loop run is in flight">
            running
          </DenseTag>,
        )
      }
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
    // Fold rows borrow their first child's `to` (fold:copilot carries Desk's,
    // fold:market Live's) — keying them by `to` would pin the child's badge on
    // the heading too. A fold's id matches no path, which is the answer a
    // heading wants.
    return (item: ShellNavItem) =>
      item.id.startsWith('fold:') ? null : (byPath.get(item.to ?? item.id) ?? null)
  }, [standing])

  return { group, extras }
}
