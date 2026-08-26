import { useMemo, useState } from 'react'
import {
  Check,
  FolderPlus,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCopilotSessions } from '@/hooks/useCopilotSessions'
import { copilotSessionStore, useCopilotSession } from '@/hooks/useCopilotSession'
import { cn } from '@/lib/utils'
import {
  archiveCopilotSession,
  fetchCopilotSession,
  patchCopilotSession,
  type CopilotSessionSummary,
} from '@/api/researchCopilotSessions'
import { hydrateCopilotMessages } from '@/lib/cockpit/hydrateCopilotMessages'

/**
 * Session history rail (Wave RS-UX3 → RS-UX5, QA follow-up).
 *
 * Sits in the left column of `CopilotFloatingBubble` when the user has the
 * rail visible.  Delivers full session management:
 *   - `+ New chat` primary button
 *   - Pinned group at the top
 *   - Custom groups (folders) — user-defined labels via row menu → "Move to group"
 *   - Inline rename (double-click title or menu → Rename)
 *   - Pin / Unpin toggle from row menu
 *   - Archive (delete) from row menu
 *   - Active session highlighted with primary tint
 *
 * Groups are per-owner strings persisted on the row (`group_name`).  We do not
 * maintain a separate "groups" table — the union of existing `group_name`
 * values is the group taxonomy, which keeps this feature lightweight.
 */
export function SessionListSidebar({
  onLoaded,
  className,
}: {
  onLoaded?: (sessionId: string) => void
  className?: string
}) {
  const { data, isLoading, refetch } = useCopilotSessions(50)
  const { sessionId: currentSessionId } = useCopilotSession()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [groupPromptFor, setGroupPromptFor] = useState<string | null>(null)

  const rows = useMemo(() => data ?? [], [data])

  // Compute existing group list from the loaded rows so users can quickly
  // pick an existing folder rather than retyping it.
  const existingGroups = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) {
      if (r.group_name && r.group_name.trim()) set.add(r.group_name.trim())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rows])

  const { pinned, grouped, ungrouped } = useMemo(() => {
    const pin: CopilotSessionSummary[] = []
    const bucketed: Record<string, CopilotSessionSummary[]> = {}
    const flat: CopilotSessionSummary[] = []
    for (const r of rows) {
      if (r.pinned) {
        pin.push(r)
        continue
      }
      if (r.group_name && r.group_name.trim()) {
        const key = r.group_name.trim()
        if (!bucketed[key]) bucketed[key] = []
        bucketed[key].push(r)
      } else {
        flat.push(r)
      }
    }
    return { pinned: pin, grouped: bucketed, ungrouped: flat }
  }, [rows])

  async function loadSession(id: string) {
    if (id === currentSessionId) return
    if (editingId === id) return
    try {
      const detail = await fetchCopilotSession(id)
      const msgs = hydrateCopilotMessages(detail.messages ?? [], id)
      copilotSessionStore.setState({
        messages: msgs,
        sessionId: id,
        streaming: false,
        lastError: null,
      })
      onLoaded?.(id)
    } catch {
      // ignore — session list is best-effort
    }
  }

  async function commitRename(id: string, next: string) {
    setEditingId(null)
    const trimmed = next.trim()
    if (!trimmed) return
    try {
      await patchCopilotSession(id, { title: trimmed })
      refetch()
    } catch {
      // ignore
    }
  }

  async function togglePin(row: CopilotSessionSummary) {
    try {
      await patchCopilotSession(row.id, { pinned: !row.pinned })
      refetch()
    } catch {
      // ignore
    }
  }

  async function assignGroup(row: CopilotSessionSummary, groupName: string | null) {
    try {
      if (groupName === null) {
        await patchCopilotSession(row.id, { clear_group: true })
      } else {
        await patchCopilotSession(row.id, { group_name: groupName })
      }
      refetch()
    } catch {
      // ignore
    }
  }

  async function archive(id: string) {
    try {
      await archiveCopilotSession(id)
      if (id === currentSessionId) {
        copilotSessionStore.clearSession()
      }
      refetch()
    } catch {
      // ignore
    }
  }

  const renderRow = (row: CopilotSessionSummary) => {
    const active = row.id === currentSessionId
    const editing = editingId === row.id
    return (
      <li key={row.id} className="group flex items-center gap-0.5">
        {editing ? (
          <SessionRenameField
            initial={row.title || 'Untitled'}
            onCommit={(next) => commitRename(row.id, next)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <button
            type="button"
            className={cn(
              'min-w-0 flex-1 truncate rounded px-1.5 py-1 text-left text-dense-meta',
              'flex items-center gap-1',
              active
                ? 'bg-primary/15 text-foreground font-medium ring-1 ring-primary/30'
                : 'text-foreground/85 hover:bg-secondary/80',
            )}
            onClick={() => loadSession(row.id)}
            onDoubleClick={() => setEditingId(row.id)}
            aria-current={active ? 'true' : undefined}
            title={row.title || 'Untitled'}
          >
            {row.pinned ? (
              <Pin className="size-3 shrink-0 text-primary/80" aria-hidden />
            ) : null}
            <span className="truncate">{row.title || 'Untitled'}</span>
          </button>
        )}
        {!editing ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                aria-label="Session actions"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[12rem]">
              <DropdownMenuItem onSelect={() => setEditingId(row.id)}>
                <Pencil className="mr-2 size-3.5" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => togglePin(row)}>
                {row.pinned ? (
                  <>
                    <PinOff className="mr-2 size-3.5" /> Unpin
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 size-3.5" /> Pin to top
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-dense-caption">
                Group
              </DropdownMenuLabel>
              {existingGroups.length === 0 ? (
                <DropdownMenuItem onSelect={() => setGroupPromptFor(row.id)}>
                  <FolderPlus className="mr-2 size-3.5" /> Create group…
                </DropdownMenuItem>
              ) : (
                <>
                  {existingGroups.map((g) => (
                    <DropdownMenuItem
                      key={g}
                      onSelect={() => assignGroup(row, g)}
                      className={cn(
                        row.group_name === g && 'text-primary',
                      )}
                    >
                      <Tag className="mr-2 size-3.5" />
                      <span className="truncate">{g}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onSelect={() => setGroupPromptFor(row.id)}>
                    <FolderPlus className="mr-2 size-3.5" /> New group…
                  </DropdownMenuItem>
                  {row.group_name ? (
                    <DropdownMenuItem onSelect={() => assignGroup(row, null)}>
                      <X className="mr-2 size-3.5" /> Remove from group
                    </DropdownMenuItem>
                  ) : null}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => archive(row.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </li>
    )
  }

  const groupedKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b))

  return (
    <div className={cn('relative flex h-full flex-col gap-1.5', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-start gap-1.5 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
        onClick={() => copilotSessionStore.clearSession()}
      >
        <Plus className="size-3.5" />
        <span className="text-dense-label font-medium">New chat</span>
      </Button>

      {isLoading ? (
        <div className="flex items-center gap-1 text-dense-caption text-muted-foreground py-1">
          <Loader2 className="size-3 animate-spin" /> Loading…
        </div>
      ) : null}

      {!isLoading && rows.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded border border-dashed border-border/50 px-2 py-3 text-center">
          <MessageSquare className="size-4 text-muted-foreground/60" />
          <span className="text-dense-caption text-muted-foreground">No sessions yet</span>
          <span className="text-dense-caption text-muted-foreground/70">
            Ask a question — it will appear here after the first reply.
          </span>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {pinned.length > 0 ? (
          <div className="mb-1">
            <div className="mb-0.5 px-1.5 text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground/70">
              Pinned
            </div>
            <ul className="space-y-0.5">{pinned.map(renderRow)}</ul>
          </div>
        ) : null}
        {groupedKeys.map((k) => (
          <div key={k} className="mb-1">
            <div className="mb-0.5 flex items-center gap-1 px-1.5 text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground/70">
              <Tag className="size-2.5" />
              <span className="truncate">{k}</span>
            </div>
            <ul className="space-y-0.5">{grouped[k].map(renderRow)}</ul>
          </div>
        ))}
        {ungrouped.length > 0 ? (
          <div>
            {pinned.length > 0 || groupedKeys.length > 0 ? (
              <div className="mb-0.5 px-1.5 text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground/70">
                Recent
              </div>
            ) : null}
            <ul className="space-y-0.5">{ungrouped.map(renderRow)}</ul>
          </div>
        ) : null}
      </div>

      {groupPromptFor ? (
        <GroupNamePrompt
          existing={existingGroups}
          onCancel={() => setGroupPromptFor(null)}
          onCommit={(name) => {
            const row = rows.find((r) => r.id === groupPromptFor)
            setGroupPromptFor(null)
            if (row && name.trim()) {
              void assignGroup(row, name.trim())
            }
          }}
        />
      ) : null}
    </div>
  )
}

function SessionRenameField({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string
  onCommit: (v: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(initial)
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <Input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onCommit(text)
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          }
        }}
        onBlur={() => onCommit(text)}
        className="h-6 px-1.5 text-dense-meta"
        aria-label="Rename session"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-5 w-5 text-success"
        aria-label="Save rename"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommit(text)}
      >
        <Check className="size-3" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-5 w-5 text-muted-foreground"
        aria-label="Cancel rename"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onCancel}
      >
        <X className="size-3" />
      </Button>
    </div>
  )
}

function GroupNamePrompt({
  existing,
  onCommit,
  onCancel,
}: {
  existing: string[]
  onCommit: (name: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  return (
    <div
      className="absolute inset-x-2 bottom-2 z-10 rounded-lg border border-primary/30 bg-card p-2 shadow-lg"
      role="dialog"
      aria-label="New group name"
    >
      <div className="mb-1 text-dense-caption text-muted-foreground">
        Group name (e.g. Strategies, Research, VRP)
      </div>
      <Input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter group name"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onCommit(text)
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          }
        }}
        className="h-7 text-dense-meta"
      />
      {existing.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {existing.slice(0, 6).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onCommit(g)}
              className="rounded-full border border-border bg-secondary px-1.5 py-0.5 text-dense-caption text-foreground/80 hover:bg-primary/10 hover:text-primary"
            >
              {g}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-1 flex justify-end gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-6 text-dense-caption">
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onCommit(text)}
          disabled={!text.trim()}
          className="h-6 text-dense-caption"
        >
          Save
        </Button>
      </div>
    </div>
  )
}
