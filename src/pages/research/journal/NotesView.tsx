/**
 * Journal › Notes (design Rev .97 #5, contracts Spec §20).
 *
 * Every ⌥N, newest day first: search, filter by linked object, and on each
 * row the page it was written on and — once K6 distils — the memory it became.
 * Edit and Delete live exactly as long as §20.1 allows: a distilled note
 * shows its «→ memory» mark where the verbs were, and the API answers 409
 * behind that mark, so the lock holds even against a stale screen.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  deleteNote,
  fetchNotes,
  isTradeRef,
  otherEnvOfTradeRef,
  updateNote,
  type JournalNote,
  type NoteRef,
} from '@/api/research/journal'
import { ViewState } from '@bifrost/ui'
import { Button } from '@/components/ui/button'
import { failedDetail } from '@/lib/viewState'
import { etDayOf } from '@/lib/freshness'
import { cn } from '@/lib/utils'
import { withSymbolParam } from '@/lib/symbolLink'
import { useTradeIndex } from '@/hooks/useTradeIndex'
import { tradeHowFrom, useOpenTrade } from '@/layout/tradeGo'

const NOTES_KEY = ['research-engine', 'journal', 'notes'] as const

/** The trader's day — New York, where the sessions live. */
export function noteDay(iso: string | null): string {
  return etDayOf(iso) || '—'
}

export function groupByDay(notes: readonly JournalNote[]): [string, JournalNote[]][] {
  const by = new Map<string, JournalNote[]>()
  for (const n of notes) {
    const d = noteDay(n.created_at)
    by.set(d, [...(by.get(d) ?? []), n])
  }
  return [...by.entries()]
}

function refTarget(ref: NoteRef): string | null {
  if (ref.type === 'sym') return withSymbolParam('/research/symbol', ref.id)
  if (ref.type === 'obj') return `/research/loop/objectives/${ref.id}`
  return null
}

/**
 * An instance a note links (Rev .103): its surface when the instance book
 * holds the number, else Positions — where a number the rulebook lost may
 * still be held.
 */
export function TradeNoteRef({ raw, className }: { raw: string; className: string }) {
  const id = Number(raw.replace(/^#/, ''))
  const known = useTradeIndex()
  const open = useOpenTrade()
  const otherEnv = otherEnvOfTradeRef({ type: 'trade', id: raw })
  if (otherEnv) {
    // TD-73: another environment's trade — the same number here is a different trade.
    return (
      <span className={className} title={`A trade in ${otherEnv.toUpperCase()} — not this environment's #${raw.split(':')[1]}`}>
        {raw}
      </span>
    )
  }
  if (!Number.isFinite(id) || id <= 0) return <span className={className}>{raw}</span>
  if (known && !known.has(id)) {
    return (
      <Link to={`/portfolio/positions?inst=${id}`} className={className} title={`#${id} is not in the trade book — Positions, where it may still be held`}>
        #{id}
      </Link>
    )
  }
  return (
    <button
      type="button"
      className={cn(className, 'cursor-pointer border-0')}
      title={`Open #${id} beside this page · ⇧ in a tab of its own · ⌘ as a page`}
      onClick={(e) => open(id, { from: 'Journal', ...tradeHowFrom(e) })}
    >
      #{id}
    </button>
  )
}

function NoteRow({ note }: { note: JournalNote }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.body_md)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const locked = note.distilled_memory_id != null
  // A note on another environment's trade was written on that environment's page.
  const otherEnv = note.refs.map(otherEnvOfTradeRef).find((e) => e != null) ?? null

  const save = useMutation({
    mutationFn: () => updateNote(note.id, { body_md: draft.trim() }),
    onSuccess: () => {
      setEditing(false)
      setError(null)
      void qc.invalidateQueries({ queryKey: NOTES_KEY })
    },
    onError: (e: Error) => setError(e.message),
  })
  const remove = useMutation({
    mutationFn: () => deleteNote(note.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: NOTES_KEY }),
    onError: (e: Error) => setError(e.message),
  })

  const time = note.created_at
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(note.created_at))
    : ''

  return (
    <div className="flex flex-col gap-1 border-b border-border/55 px-3 py-2 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-dense-micro text-muted-foreground">{time}</span>
        {note.page_route && otherEnv ? (
          <span
            className="text-dense-micro text-muted-foreground"
            title={`Written in ${otherEnv.toUpperCase()} — its page is not this environment's`}
          >
            on {note.page_label || note.page_route} · {otherEnv.toUpperCase()}
          </span>
        ) : note.page_route ? (
          <Link
            to={note.page_route}
            className="text-dense-micro text-muted-foreground hover:text-foreground hover:underline"
            title="The page this note was written on"
          >
            on {note.page_label || note.page_route}
          </Link>
        ) : null}
        {note.refs.map((r) => {
          const to = refTarget(r)
          const cls = cn(
            'mat-tag font-mono text-dense-micro',
            r.type === 'sym' ? 'text-[var(--sk-ticker)]' : isTradeRef(r) ? 'text-[var(--sk-trade)]' : 'text-[var(--sk-accent)]',
          )
          if (isTradeRef(r)) return <TradeNoteRef key={`${r.type}|${r.id}`} raw={r.id} className={cls} />
          return to ? (
            <Link key={`${r.type}|${r.id}`} to={to} className={cls}>
              {r.id}
            </Link>
          ) : (
            <span key={`${r.type}|${r.id}`} className={cls}>
              {r.id}
            </span>
          )
        })}
        <span className="ml-auto inline-flex items-center gap-2">
          {locked ? (
            <span
              className="font-mono text-dense-micro text-muted-foreground"
              title="The nightly distillation references this note as evidence — it is append-only now (§20.1)."
            >
              → memory {note.distilled_memory_id}
            </span>
          ) : editing ? null : confirming ? (
            <>
              <span className="text-dense-micro text-muted-foreground">delete?</span>
              <button
                type="button"
                onClick={() => remove.mutate()}
                className="text-dense-micro text-destructive hover:underline"
              >
                yes
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-dense-micro text-muted-foreground hover:underline"
              >
                no
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setDraft(note.body_md)
                  setEditing(true)
                }}
                className="text-dense-micro text-muted-foreground hover:text-foreground hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="text-dense-micro text-muted-foreground hover:text-destructive hover:underline"
              >
                Delete
              </button>
            </>
          )}
        </span>
      </div>
      {editing ? (
        <div className="flex flex-col gap-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="mat-field w-full resize-y px-2 py-1.5 text-dense-body text-foreground outline-none focus:shadow-[0_0_0_3px_var(--mat-focus)]"
          />
          <span className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-6"
              disabled={!draft.trim() || save.isPending}
              onClick={() => save.mutate()}
            >
              Save
            </Button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-dense-meta text-muted-foreground hover:underline"
            >
              Cancel
            </button>
          </span>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-dense-body text-foreground">{note.body_md}</p>
      )}
      {error ? <p className="text-dense-micro text-destructive">{error}</p> : null}
    </div>
  )
}

export function NotesView() {
  const [q, setQ] = useState('')
  const [refFilter, setRefFilter] = useState<NoteRef | null>(null)
  const notesQ = useQuery({
    queryKey: [...NOTES_KEY, q, refFilter?.type ?? '', refFilter?.id ?? ''],
    queryFn: () =>
      fetchNotes({
        q: q.trim() || undefined,
        ref_type: refFilter?.type,
        ref_id: refFilter?.id,
        limit: 300,
      }),
    staleTime: 30_000,
  })
  const notes = notesQ.data?.notes ?? []
  const days = useMemo(() => groupByDay(notes), [notes])

  // The linked-object filter offers what the loaded notes actually link.
  const refOptions = useMemo(() => {
    const seen = new Map<string, NoteRef>()
    for (const n of notes) for (const r of n.refs) seen.set(`${r.type}|${r.id}`, r)
    return [...seen.values()].slice(0, 24)
  }, [notes])

  return (
    <div className="space-y-2">
      <div data-sr-toolbar="">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search notes"
          aria-label="Search notes"
          className="mat-field h-6 w-[200px] px-2 text-dense-body text-foreground outline-none placeholder:text-[var(--sk-mute)]"
        />
        {refFilter ? (
          <button
            type="button"
            onClick={() => setRefFilter(null)}
            className="mat-tag font-mono text-dense-micro text-foreground"
            title="Clear the linked-object filter"
          >
            {refFilter.id} ×
          </button>
        ) : (
          refOptions.map((r) => (
            <button
              key={`${r.type}|${r.id}`}
              type="button"
              onClick={() => setRefFilter(r)}
              className={cn(
                'mat-tag font-mono text-dense-micro',
                r.type === 'sym' ? 'text-[var(--sk-ticker)]' : isTradeRef(r) ? 'text-[var(--sk-trade)]' : 'text-[var(--sk-accent)]',
              )}
              title="Only notes linked to this"
            >
              {r.id}
            </button>
          ))
        )}
        <span className="ml-auto text-dense-micro text-muted-foreground">
          ⌥N writes one from any page
        </span>
      </div>

      {notesQ.isLoading ? (
        <section className="overflow-hidden mat-card">
          <ViewState kind="loading" title="Loading notes" rows={5} cols={2} />
        </section>
      ) : notesQ.isError ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind={/401|authorization/i.test(String(notesQ.error)) ? 'signedout' : 'failed'}
            title="Couldn’t load notes"
            detail={failedDetail(notesQ, 'The journal store did not answer.')}
            onAction={() => void notesQ.refetch()}
          />
        </section>
      ) : notes.length === 0 ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind={q || refFilter ? 'filtered' : 'empty'}
            title={q || refFilter ? 'No note matches' : 'No notes yet'}
            detail={
              q || refFilter
                ? undefined
                : '⌥N from any page — the page and the carried symbol ride along.'
            }
            onAction={
              q || refFilter
                ? () => {
                    setQ('')
                    setRefFilter(null)
                  }
                : undefined
            }
          />
        </section>
      ) : (
        days.map(([day, rows]) => (
          <section key={day} className="overflow-hidden mat-card">
            <header className="border-b border-border/60 px-3 py-1.5">
              <span className="text-dense-meta font-semibold text-muted-foreground">{day}</span>
              <span className="ml-2 text-dense-micro text-muted-foreground/80">
                {rows.length} note{rows.length > 1 ? 's' : ''}
              </span>
            </header>
            {rows.map((n) => (
              <NoteRow key={n.id} note={n} />
            ))}
          </section>
        ))
      )}
    </div>
  )
}
