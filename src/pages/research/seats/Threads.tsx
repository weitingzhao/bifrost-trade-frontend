/**
 * Threads — the conversations you had, who answered them, a pin, and export.
 *
 * Origin / Symbol come from the session summary once Research D1 lands them;
 * Writes / Cost / With writes follow D2–D3.
 */
import { lazy, Suspense, useState } from 'react'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, MessageCircle, Pin, PinOff } from 'lucide-react'
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
  SegmentControl,
} from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchCopilotSession,
  fetchCopilotSessions,
  patchCopilotSession,
  type CopilotSessionSummary,
} from '@/api/researchCopilotSessions'
import { copilotDockStore } from '@/hooks/useCopilotDock'
import { copilotSessionStore } from '@/hooks/useCopilotSession'
import { hydrateCopilotMessages } from '@/lib/cockpit/hydrateCopilotMessages'
import { fmtIsoTs } from '@/lib/format'
import { openResearchCopilot } from '@/lib/harness/loopCopilotPrefill'
import { nyDate } from '@/pages/research/seats/agentActivity'
import {
  THREAD_FILTERS,
  threadInFilter,
  threadPersona,
  threadTurns,
  threadWriteCount,
  type ThreadFilter,
} from '@/pages/research/seats/threadRows'

const BridgeDialog = lazy(() =>
  import('@/components/cockpit/BridgeDialog').then((m) => ({ default: m.BridgeDialog })),
)

/** How many recent threads the Desk reads. The panel's own list goes further back. */
const DESK_THREADS = 12

const sessionKey = (row: CopilotSessionSummary) => ['research', 'copilot', 'session', row.id, row.updated_at ?? null]

export function Threads() {
  const queryClient = useQueryClient()
  const listQ = useQuery({
    queryKey: ['research', 'copilot', 'sessions', 'desk'],
    queryFn: () => fetchCopilotSessions(DESK_THREADS),
    staleTime: 30_000,
  })
  const rows = listQ.data ?? []
  // Persona and turns are in the frames. Keyed by updated_at, so a thread that moved is read again.
  const details = useQueries({
    queries: rows.map((row) => ({
      queryKey: sessionKey(row),
      queryFn: () => fetchCopilotSession(row.id),
      staleTime: 5 * 60_000,
    })),
  })

  const [filter, setFilter] = useState<ThreadFilter>('all')
  const [opening, setOpening] = useState<string | null>(null)
  const [pinning, setPinning] = useState<string | null>(null)
  const [pinError, setPinError] = useState<unknown>(null)
  const [exportFor, setExportFor] = useState<string | null>(null)

  async function open(row: CopilotSessionSummary) {
    setOpening(row.id)
    try {
      const detail = await queryClient.fetchQuery({ queryKey: sessionKey(row), queryFn: () => fetchCopilotSession(row.id) })
      copilotSessionStore.setState({
        messages: hydrateCopilotMessages(detail.messages ?? [], row.id, detail.session?.model),
        sessionId: row.id,
        streaming: false,
        lastError: null,
      })
      openResearchCopilot()
    } catch {
      // best effort — the panel's own list can still open it
      copilotDockStore.getState().setSessionsOpen(true)
      openResearchCopilot()
    } finally {
      setOpening(null)
    }
  }

  async function togglePin(row: CopilotSessionSummary) {
    setPinning(row.id)
    setPinError(null)
    try {
      await patchCopilotSession(row.id, { pinned: !row.pinned })
      await queryClient.invalidateQueries({ queryKey: ['research', 'copilot', 'sessions'] })
    } catch (err) {
      setPinError(err)
    } finally {
      setPinning(null)
    }
  }

  if (listQ.isLoading) return <Skeleton className="h-32 w-full" />
  if (listQ.isError) return <QueryErrorAlert error={listQ.error} onRetry={() => void listQ.refetch()} />
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<MessageCircle />}
        title="No threads yet"
        description="Ask the Copilot from any page; the conversation is kept here."
      />
    )
  }

  const today = nyDate(new Date())
  const shown = rows.flatMap((row, i) => (threadInFilter(row, filter, today) ? [{ row, detail: details[i] }] : []))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentControl value={filter} onChange={(v) => setFilter(v as ThreadFilter)} options={THREAD_FILTERS} />
        <span className="font-mono text-dense-meta tabular-nums text-muted-foreground">
          {shown.length} of the latest {rows.length}
        </span>
      </div>
      {pinError ? <QueryErrorAlert error={pinError} /> : null}

      {shown.length === 0 ? (
        <p className="px-1 text-dense-label text-muted-foreground">
          {filter === 'pinned'
            ? 'No pinned threads among the latest.'
            : filter === 'with_writes'
              ? 'No thread among the latest asked the Copilot to write.'
              : 'No thread moved today.'}
        </p>
      ) : (
        <DenseDataTable>
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Thread</DenseTableHead>
              <DenseTableHead title="Page the first question was asked from">Origin</DenseTableHead>
              <DenseTableHead title="Symbol carried on the first question">Symbol</DenseTableHead>
              <DenseTableHead title="The agent that answered — triage unless it handed the thread to a specialist">
                Persona
              </DenseTableHead>
              <DenseTableHead className="text-right" title="Questions asked, not frames">
                Turns
              </DenseTableHead>
              <DenseTableHead className="text-right" title="ai_action_log rows linked to this session">
                Writes
              </DenseTableHead>
              <DenseTableHead>Last</DenseTableHead>
              <DenseTableHead />
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {shown.map(({ row, detail }) => {
              const frames = detail?.data?.messages ?? []
              const persona = detail?.data ? threadPersona(frames) : undefined
              const title = row.title || '(untitled)'
              const writes = threadWriteCount(row)
              return (
                <DenseTableRow key={row.id}>
                  <DenseTableCell className="max-w-[18rem]">
                    <button
                      type="button"
                      className="flex w-full min-w-0 items-start gap-1.5 text-left hover:underline disabled:opacity-60"
                      disabled={opening === row.id}
                      onClick={() => void open(row)}
                      title="Open this thread in the Copilot panel"
                    >
                      {row.pinned ? (
                        <Pin className="mt-0.5 size-3 shrink-0 text-primary" aria-label="Pinned" />
                      ) : null}
                      <span className="min-w-0">
                        <span className="block truncate">{title}</span>
                        <span className="block truncate text-dense-micro text-muted-foreground">
                          {row.model ?? 'model not recorded'}
                          {row.group_name ? ` · ${row.group_name}` : ''}
                        </span>
                      </span>
                    </button>
                  </DenseTableCell>
                  <DenseTableCell className="max-w-[10rem] truncate text-dense-meta text-muted-foreground" title={row.origin_page ?? undefined}>
                    {row.origin_label || row.origin_page || '—'}
                  </DenseTableCell>
                  <DenseTableCell className="font-mono text-dense-meta tabular-nums">
                    {row.origin_symbol || '—'}
                  </DenseTableCell>
                  <DenseTableCell>
                    {detail?.isLoading ? (
                      <span className="text-muted-foreground">…</span>
                    ) : detail?.isError ? (
                      <span className="text-muted-foreground" title="The thread could not be read">
                        unreadable
                      </span>
                    ) : persona === null ? (
                      <span className="text-muted-foreground" title="No agent answered — the question is the only frame">
                        no answer
                      </span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {(persona ?? []).map((p) => (
                          <DenseTag key={p} variant="neutral" size="cell">
                            {p}
                          </DenseTag>
                        ))}
                      </span>
                    )}
                  </DenseTableCell>
                  <DenseTableCell className="text-right font-mono tabular-nums">
                    {detail?.data ? threadTurns(frames) : '—'}
                  </DenseTableCell>
                  <DenseTableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {writes > 0 ? writes : '—'}
                  </DenseTableCell>
                  <DenseTableCell className="font-mono text-dense-meta tabular-nums text-muted-foreground">
                    {fmtIsoTs(row.updated_at ?? null)}
                  </DenseTableCell>
                  <DenseTableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-7 p-0"
                        disabled={pinning === row.id}
                        aria-pressed={Boolean(row.pinned)}
                        aria-label={row.pinned ? `Unpin "${title}"` : `Pin "${title}"`}
                        title={row.pinned ? 'Unpin' : 'Pin'}
                        onClick={() => void togglePin(row)}
                      >
                        {row.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-7 p-0"
                        aria-label={`Export a memory brief of "${title}"`}
                        title="Export a memory brief for an outside model (Bridge)"
                        onClick={() => setExportFor(row.id)}
                      >
                        <ArrowUpRight className="size-3.5" />
                      </Button>
                    </div>
                  </DenseTableCell>
                </DenseTableRow>
              )
            })}
          </DenseTableBody>
        </DenseDataTable>
      )}

      {exportFor ? (
        <Suspense fallback={null}>
          <BridgeDialog open onOpenChange={(o) => !o && setExportFor(null)} sessionId={exportFor} />
        </Suspense>
      ) : null}
    </div>
  )
}
