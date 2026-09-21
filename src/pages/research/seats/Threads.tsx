/**
 * Threads — the conversations you had, who answered them, a pin, and export.
 *
 * Design 2026-09-15 D1: rename + archive in the row menu; search in the
 * table header (title + message content, server `q`). Groups stay off the
 * product UI. Origin / Symbol / Writes / Cost come from the session summary.
 */
import { lazy, Suspense, useEffect, useState } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, Archive, MessageCircle, MoreHorizontal, Pencil, Pin, PinOff, Search } from 'lucide-react'
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
import { SessionRenameField } from '@/components/copilot/SessionRenameField'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { Skeleton } from '@/components/ui/skeleton'
import {
  archiveCopilotSession,
  fetchCopilotSession,
  patchCopilotSession,
  type CopilotSessionSummary,
} from '@/api/researchCopilotSessions'
import { copilotDockStore } from '@/hooks/useCopilotDock'
import { copilotSessionStore } from '@/hooks/useCopilotSession'
import { rowSelectProps } from '@/hooks/useRowLink'
import { useCopilotSessions } from '@/hooks/useCopilotSessions'
import { hydrateCopilotMessages } from '@/lib/cockpit/hydrateCopilotMessages'
import { fmtIsoTs } from '@/lib/format'
import { openResearchCopilot } from '@/lib/harness/loopCopilotPrefill'
import { nyDate } from '@/pages/research/seats/agentActivity'
import {
  THREAD_FILTERS,
  deskThreadsQuery,
  threadCostUsd,
  threadInFilter,
  threadPersona,
  threadTurns,
  threadWriteCount,
  type ThreadFilter,
} from '@/pages/research/seats/threadRows'
import { fmtUsd } from '@/lib/harness/runSpend'

const BridgeDialog = lazy(() =>
  import('@/components/cockpit/BridgeDialog').then((m) => ({ default: m.BridgeDialog })),
)

const sessionKey = (row: CopilotSessionSummary) => ['research', 'copilot', 'session', row.id, row.updated_at ?? null]

export function Threads() {
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 200)
    return () => window.clearTimeout(t)
  }, [searchInput])
  const searching = search.length > 0
  const { limit, q } = deskThreadsQuery(search)
  const listQ = useCopilotSessions(limit, q)
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
  const [rowError, setRowError] = useState<unknown>(null)
  const [exportFor, setExportFor] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<CopilotSessionSummary | null>(null)
  const [archiving, setArchiving] = useState(false)

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

  async function commitRename(id: string, next: string) {
    setRenamingId(null)
    const trimmed = next.trim()
    const row = rows.find((r) => r.id === id)
    if (!trimmed || trimmed === (row?.title ?? '').trim()) return
    setRowError(null)
    try {
      await patchCopilotSession(id, { title: trimmed })
      await queryClient.invalidateQueries({ queryKey: ['research', 'copilot', 'sessions'] })
    } catch (err) {
      setRowError(err)
    }
  }

  async function confirmArchive() {
    if (!archiveTarget) return
    setArchiving(true)
    setRowError(null)
    try {
      await archiveCopilotSession(archiveTarget.id)
      if (copilotSessionStore.getState().sessionId === archiveTarget.id) {
        copilotSessionStore.clearSession()
      }
      await queryClient.invalidateQueries({ queryKey: ['research', 'copilot', 'sessions'] })
      setArchiveTarget(null)
    } catch (err) {
      setRowError(err)
    } finally {
      setArchiving(false)
    }
  }

  if (listQ.isLoading && rows.length === 0 && !searching) return <Skeleton className="h-32 w-full" />
  if (listQ.isError) return <ResearchAuthGap error={listQ.error} onRetry={() => void listQ.refetch()} />

  const today = nyDate(new Date())
  const shown = rows.flatMap((row, i) => (threadInFilter(row, filter, today) ? [{ row, detail: details[i] }] : []))
  const emptyBook = rows.length === 0 && !searching

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentControl value={filter} onChange={(v) => setFilter(v as ThreadFilter)} options={THREAD_FILTERS} />
        <div className="relative min-w-[10rem] flex-1">
          <Search className="pointer-events-none absolute left-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search titles and messages…"
            aria-label="Search threads"
            className="h-7 pl-6 text-dense-meta"
          />
        </div>
        <span className="font-mono text-dense-meta tabular-nums text-muted-foreground">
          {searching ? `${shown.length} match` : `${shown.length} of the latest ${rows.length}`}
        </span>
      </div>
      {pinError ? <ResearchAuthGap error={pinError} /> : null}
      {rowError ? <ResearchAuthGap error={rowError} /> : null}

      {emptyBook ? (
        <EmptyState
          icon={<MessageCircle />}
          title="No threads yet"
          description="Ask the Copilot from any page; the conversation is kept here."
        />
      ) : shown.length === 0 ? (
        <p className="px-1 text-dense-label text-muted-foreground">
          {searching
            ? 'No threads match that search.'
            : filter === 'pinned'
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
              <DenseTableHead className="text-right" title="Sum of chat_turn cost_usd for this session">
                Cost
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
              const cost = threadCostUsd(row)
              const renaming = renamingId === row.id
              return (
                <DenseTableRow
                  key={row.id}
                  // The page says «click a row to open it in the panel», and
                  // until 2026-09-21 only the title did. A row that promises a
                  // click and does not take one is the defect the interaction
                  // standard exists for — and a `<tr>` needs the keyboard route
                  // written out, which `rowSelectProps` carries.
                  {...rowSelectProps(false, () => void open(row), 'hover:[&>td]:bg-[var(--sk-raised2)]')}
                  aria-label={`Open ${row.title || 'this thread'} in the Copilot panel`}
                >
                  <DenseTableCell className="max-w-[18rem]">
                    {renaming ? (
                      <SessionRenameField
                        initial={row.title || ''}
                        onCommit={(next) => void commitRename(row.id, next)}
                        onCancel={() => setRenamingId(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        className="flex w-full min-w-0 items-start gap-1.5 text-left hover:underline disabled:opacity-60"
                        disabled={opening === row.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          void open(row)
                        }}
                        title="Open this thread in the Copilot panel"
                      >
                        {row.pinned ? (
                          <Pin className="mt-0.5 size-3 shrink-0 text-primary" aria-label="Pinned" />
                        ) : null}
                        <span className="min-w-0">
                          <span className="block truncate">{title}</span>
                          <span className="block truncate text-dense-micro text-muted-foreground">
                            {row.model ?? 'model not recorded'}
                          </span>
                        </span>
                      </button>
                    )}
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
                    {typeof row.turns === 'number' ? row.turns : detail?.data ? threadTurns(frames, row) : '—'}
                  </DenseTableCell>
                  <DenseTableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {writes > 0 ? writes : '—'}
                  </DenseTableCell>
                  <DenseTableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {cost != null ? fmtUsd(cost) : '—'}
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
                        onClick={(e) => {
                          e.stopPropagation()
                          void togglePin(row)
                        }}
                      >
                        {row.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-7 p-0"
                        aria-label={`Export a memory brief of "${title}"`}
                        title="Export a memory brief for an outside model (Bridge)"
                        onClick={(e) => {
                          e.stopPropagation()
                          setExportFor(row.id)
                        }}
                      >
                        <ArrowUpRight className="size-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-7 p-0"
                            aria-label={`More actions for "${title}"`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[10rem]">
                          <DropdownMenuItem onSelect={() => setRenamingId(row.id)}>
                            <Pencil className="mr-2 size-3.5" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setArchiveTarget(row)}>
                            <Archive className="mr-2 size-3.5" /> Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      <ConfirmDialog
        open={archiveTarget != null}
        title="Archive thread"
        message={
          archiveTarget
            ? `Archive “${archiveTarget.title?.trim() || 'Untitled thread'}”? It leaves the Desk and the switcher. Messages stay on the server.`
            : ''
        }
        confirmLabel="Archive"
        confirmVariant="default"
        confirming={archiving}
        onConfirm={() => void confirmArchive()}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  )
}
