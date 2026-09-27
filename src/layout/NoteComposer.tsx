/**
 * ⌥N — a note from any page (design Rev .96 #5, .97 #5; store K4).
 *
 * The shell composes the links so the writer never does: the page it was
 * written on always rides along, the carried symbol and the objective scope
 * arrive as chips the writer can drop before saving (§20's refs shape). Saved
 * notes land in `journal.note` and surface in Journal › Notes; tonight's
 * distillation reads them as «said» once K6 lands.
 *
 * A floater, so it carries its own glass (materials rule, Rev .99): never a
 * transparent card.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createNote, type NoteRef } from '@/api/research/journal'
import { Button } from '@/components/ui/button'
import { useCarriedSymbol } from '@/lib/symbolContext'
import { ALL_OBJECTIVES, readObjective } from '@/lib/objectiveScope'
import {
  closeNoteComposer,
  isNoteShortcut,
  openNoteComposer,
  useNoteComposer,
} from '@/lib/notes/noteComposer'
import { routeFor } from '@/layout/routeRegistry'
import { cn } from '@/lib/utils'

interface ChipRef extends NoteRef {
  label: string
}

export function NoteComposer() {
  const { open } = useNoteComposer()
  const { pathname } = useLocation()
  const carried = useCarriedSymbol()
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const [dropped, setDropped] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const areaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isNoteShortcut(e)) {
        e.preventDefault()
        openNoteComposer()
      } else if (e.key === 'Escape' && open) {
        closeNoteComposer()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Reset happens on the opening transition, off the render clock: the page
  // changes between notes, and the draft body deliberately survives a close
  // (an interrupted thought beats a lost one).
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) {
      const t = setTimeout(() => {
        setError(null)
        setDropped(new Set())
        areaRef.current?.focus()
      }, 30)
      wasOpen.current = true
      return () => clearTimeout(t)
    }
    wasOpen.current = open
  }, [open])

  const route = routeFor(pathname)
  const chips = useMemo<ChipRef[]>(() => {
    const out: ChipRef[] = []
    const sym = (carried ?? '').trim().toUpperCase()
    if (sym) out.push({ type: 'sym', id: sym, label: sym })
    const obj = readObjective()
    if (obj && obj !== ALL_OBJECTIVES) out.push({ type: 'obj', id: obj, label: obj })
    return out
  }, [carried, open]) // eslint-disable-line react-hooks/exhaustive-deps -- re-read the objective on open

  const save = useMutation({
    mutationFn: () =>
      createNote({
        body_md: body.trim(),
        page_route: pathname,
        page_label: route.label,
        refs: chips.filter((c) => !dropped.has(`${c.type}|${c.id}`)),
      }),
    onSuccess: () => {
      setBody('')
      setError(null)
      closeNoteComposer()
      void qc.invalidateQueries({ queryKey: ['research', 'journal', 'notes'] })
    },
    onError: (e: Error) => setError(e.message),
  })

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-label="New note"
      className="fixed right-4 top-12 z-[70] w-[360px] rounded-xl border border-[var(--sk-line)] p-3 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.6)] backdrop-blur-[18px]"
      style={{ background: 'color-mix(in srgb, var(--sk-raised) 88%, transparent)' }}
    >
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-dense-meta font-semibold text-muted-foreground">New note</span>
        <span className="min-w-0 truncate text-dense-micro text-muted-foreground/80">
          on {route.label} · saved to Journal
        </span>
        <button
          type="button"
          onClick={closeNoteComposer}
          aria-label="Close"
          className="ml-auto text-dense-meta text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>
      {chips.length > 0 ? (
        <div className="mb-1.5 flex flex-wrap items-center gap-1">
          <span className="text-dense-micro text-muted-foreground">links</span>
          {chips.map((c) => {
            const key = `${c.type}|${c.id}`
            const off = dropped.has(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setDropped((prev) => {
                    const next = new Set(prev)
                    if (off) next.delete(key)
                    else next.add(key)
                    return next
                  })
                }
                title={off ? 'Dropped — click to re-attach' : 'Attached — click to drop'}
                className={cn(
                  'mat-tag font-mono text-dense-micro',
                  c.type === 'sym' ? 'text-[var(--sk-ticker)]' : 'text-[var(--sk-accent)]',
                  off && 'opacity-40 line-through',
                )}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      ) : null}
      <textarea
        ref={areaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && body.trim()) save.mutate()
          e.stopPropagation()
        }}
        rows={4}
        placeholder="What did you just see?"
        className="mat-field w-full resize-y px-2 py-1.5 text-dense-body text-foreground outline-none placeholder:text-[var(--sk-mute)] focus:shadow-[0_0_0_3px_var(--mat-focus)]"
      />
      {error ? (
        <p className="mt-1 text-dense-micro text-destructive">
          {error}
          {/^HTTP 401|authorization/i.test(error)
            ? ' — set the research user (Personas page › Set user).'
            : ''}
        </p>
      ) : null}
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-dense-micro text-muted-foreground">⌥N opens · Esc closes · ⌘↵ saves</span>
        <Button
          size="sm"
          className="ml-auto h-6"
          disabled={!body.trim() || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Saving…' : 'Save note'}
        </Button>
      </div>
    </div>
  )
}
