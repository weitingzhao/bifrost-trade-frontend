import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardList, MessageCircle } from 'lucide-react'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  EmptyState,
} from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DRAFTS_PAGE_MAX,
  useApproveDraft,
  useDismissDraft,
  useResearchDrafts,
} from '@/hooks/useResearchDrafts'
import {
  groupIdenticalDrafts,
  isActionableDraft,
  isDecisionKind,
} from '@/lib/harness/harnessDraftHelpers'
import { draftAskedBy, draftKindLabel, draftLandsIn, draftTitle } from '@/lib/harness/draftText'
import { openDraftInCopilot } from '@/lib/harness/loopCopilotPrefill'
import { fmtSince } from '@/lib/format'

/**
 * How many calls the Desk lists before handing over to the Inbox.
 *
 * The Desk is where you see that something is waiting and answer the obvious
 * ones; the Inbox is where you work through the rest with the full card. Forty
 * rows here would be the Inbox a second time.
 */
const DESK_ROWS = 8

/**
 * Waiting on you — the Decision Inbox's queue, on the Desk.
 *
 * Design (`design/trade/Research Copilot.dc.html`, Today): "everything the
 * Copilot or a scheduled agent asked to do and has not been answered — same
 * queue as Decision Inbox". So it is the same query with the same arguments,
 * which makes it the same cache entry, filtered and folded by the same helpers.
 * An answer given here is gone from the Inbox, and the counts agree.
 *
 * Two places it does not follow the prototype. Kinds are not coloured: §7
 * cancelled category hue, and the accent belongs to the layer. And "Lands in"
 * is what the server's approve writes, not the mock's destination — several
 * kinds write nothing, and those rows say so. Their Approve is demoted the way
 * the Inbox demotes it.
 */
export function WaitingOnYou() {
  const query = useResearchDrafts({ status: 'pending', limit: DRAFTS_PAGE_MAX })
  const approve = useApproveDraft()
  const dismiss = useDismissDraft()

  const groups = useMemo(
    () => groupIdenticalDrafts((query.data?.rows ?? []).filter((d) => isDecisionKind(d.kind))),
    [query.data?.rows],
  )
  const shown = groups.slice(0, DESK_ROWS)
  const more = groups.length - shown.length

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-dense-body font-semibold">Waiting on you</h2>
        {query.data ? (
          <span className="font-mono text-dense-meta tabular-nums text-muted-foreground">
            {groups.length} to answer
          </span>
        ) : null}
        <span className="text-dense-meta text-muted-foreground">
          what a scheduled agent or the Copilot asked, and nobody has answered — the Decision Inbox&rsquo;s queue
        </span>
        <Link
          to="/research/loop/decisions"
          className="ml-auto inline-flex items-center gap-1 text-dense-meta hover:underline"
        >
          Decision Inbox <ArrowRight className="size-3" />
        </Link>
      </div>

      {approve.isError ? <QueryErrorAlert error={approve.error} /> : null}
      {dismiss.isError ? <QueryErrorAlert error={dismiss.error} /> : null}

      {query.isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : query.isError ? (
        <QueryErrorAlert error={query.error} onRetry={() => void query.refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="Nothing waiting"
          description="Every call a scheduled agent or the Copilot asked for has an answer."
        />
      ) : (
        <>
          <DenseDataTable>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Kind</DenseTableHead>
                <DenseTableHead>What</DenseTableHead>
                <DenseTableHead>Asked by</DenseTableHead>
                <DenseTableHead>Lands in</DenseTableHead>
                <DenseTableHead className="text-right">Since</DenseTableHead>
                <DenseTableHead />
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {shown.map(({ draft, superseded }) => {
                const title = draftTitle(draft)
                const askedBy = draftAskedBy(draft.generated_by)
                const lands = draftLandsIn(draft.kind)
                const actionable = isActionableDraft(draft)
                const approving = approve.isPending && approve.variables === draft.id
                const dismissing = dismiss.isPending && dismiss.variables === draft.id
                const busy = approving || dismissing
                const createdSec = Date.parse(draft.created_at) / 1000
                return (
                  <DenseTableRow key={draft.id} className={actionable ? undefined : 'opacity-75'}>
                    <DenseTableCell>
                      <DenseTag variant="category">{draftKindLabel(draft.kind)}</DenseTag>
                    </DenseTableCell>
                    <DenseTableCell className="max-w-[28rem]">
                      <span className="block truncate" title={title}>
                        {title}
                      </span>
                      {superseded.length > 0 ? (
                        <span className="block text-dense-micro text-muted-foreground">
                          +{superseded.length} identical earlier run{superseded.length === 1 ? '' : 's'} folded in
                        </span>
                      ) : null}
                    </DenseTableCell>
                    <DenseTableCell className="text-muted-foreground">{askedBy}</DenseTableCell>
                    <DenseTableCell>
                      {lands ? (
                        <Link to={lands.to} className="hover:underline">
                          {lands.label}
                        </Link>
                      ) : (
                        <span
                          className="text-muted-foreground"
                          title="The server's approve has no handler for this kind — it only changes the draft's status"
                        >
                          nothing — status only
                        </span>
                      )}
                    </DenseTableCell>
                    <DenseTableCell
                      className="text-right font-mono tabular-nums text-muted-foreground"
                      title={draft.created_at}
                    >
                      {fmtSince(Number.isFinite(createdSec) ? createdSec : null)}
                    </DenseTableCell>
                    <DenseTableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Ask the Copilot about "${title}"`}
                          title="Ask the Copilot about this — does not send"
                          onClick={() =>
                            openDraftInCopilot({
                              id: draft.id,
                              kind: draft.kind,
                              title,
                              askedBy,
                              landsIn: lands?.label ?? null,
                            })
                          }
                        >
                          <MessageCircle className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          // Demoted, as in the Inbox, when Approve would write nothing.
                          variant={actionable ? 'default' : 'outline'}
                          disabled={busy}
                          onClick={() => approve.mutate(draft.id)}
                        >
                          {approving ? 'Approving…' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => dismiss.mutate(draft.id)}
                        >
                          {dismissing ? 'Dismissing…' : 'Dismiss'}
                        </Button>
                      </div>
                    </DenseTableCell>
                  </DenseTableRow>
                )
              })}
            </DenseTableBody>
          </DenseDataTable>
          {more > 0 ? (
            <Link
              to="/research/loop/decisions"
              className="inline-flex items-center gap-1 text-dense-meta text-muted-foreground hover:underline"
            >
              {more} more in the Decision Inbox <ArrowRight className="size-3" />
            </Link>
          ) : null}
        </>
      )}
    </section>
  )
}
