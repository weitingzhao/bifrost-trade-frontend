/**
 * The Research group and the one badge still riding on the tree.
 *
 * It no longer reads the objective list. The Objectives fold was cancelled
 * (Owner 2026-09-21, design Rev 2026-09-20.1) because it was the one row that
 * made data rows into menu rows, so the tree is the same for every reader.
 *
 * And since §5a.8 it is barely a Research badge at all: the Decision Inbox
 * seats in **Review** now, so the count is handed to whichever group draws
 * that row — the sidebar asks this for every item in every group, which is
 * why one function still answers for a page that left this tree. The
 * Autopilot lamp went to the companion rail with its home.
 */
import { useMemo, type ReactNode } from 'react'
import { DenseTag } from '@/components/data-display'
import { useAutopilotStanding } from '@/hooks/useLoopHarness'
import type { ShellNavGroup, ShellNavItem } from '@bifrost/ui'
import { AUTOPILOT_PAGES, buildResearchNavGroup } from './researchNavCatalog'

export function useResearchNavGroup(): { group: ShellNavGroup; extras: (item: ShellNavItem) => ReactNode } {
  const standingQ = useAutopilotStanding()
  const standing = standingQ.data

  // One tree, both homes (Owner ruling 2026-09-19 on Vision §15 Q2): the
  // Autopilot engine and the Pipeline stations stand together; nothing swaps
  // under the reader.
  const group = useMemo(() => buildResearchNavGroup(), [])

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
      // The `running` chip retired with its row (§5a.8, 2026-09-22): the
      // Autopilot home left the tree for the companion rail, and the lamp went
      // with it — it rides the rail's head icon now, beside this count. A
      // badge keyed to a row that no tree draws is a badge nobody sees.
      //
      // The per-objective memo badges retired earlier, with the rows that
      // carried them.
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
