/**
 * The Lens — the scopes the shell carries, and whether this page reads them.
 *
 * One control, and its contract is a single sentence: **lit means this page
 * reads it, dim means it is held for the next page that does.** A scope shown
 * at full strength on a page that ignores it is a lie the reader acts on — the
 * same rule the symbol chip has always kept, now told for every scope in one
 * place rather than one chip per scope in three.
 *
 * Two levels of loudness, and they answer different questions (design
 * 2026-09-20.8):
 *   - the **button** is violet when a scope is in force at all, globally;
 *   - the **token** is lit or dim per page, saying whether *this* page reads it.
 *
 * Three states, not two. A page can read a scope, or be ruled to read it and
 * not be wired yet, or have nothing to filter. The middle state is the honest
 * answer while the walk is in progress, and the Lens says it rather than
 * claiming a filter that is not running.
 *
 * **Deviation, recorded for the Owner.** The design's Lens carries three
 * tokens: symbol, account, objective. This one carries two. The shell does not
 * own an account scope — each page owns its own account control — so an
 * account token here could show a state it cannot set, which is the one thing
 * this control exists to prevent. It joins the day the shell owns that scope.
 */
import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fetchObjectives } from '@/api/research/harness'
import { useSymbolContext } from '@/lib/symbolContext'
import { ALL_OBJECTIVES, useObjectiveScope } from '@/lib/objectiveScope'
import {
  OBJECTIVE_SCOPE_TIPS,
  SCOPE_WORDS,
  objectiveScopeState,
  objectiveWiredPages,
  scopeRouteLabel,
  symbolPlannedHere,
  type ScopeState,
} from '@/lib/design/scopes'

const TOKEN = 'font-mono text-dense-micro leading-none'

function tokenInk(state: ScopeState, violet: boolean): string {
  if (state === 'read-here') return violet ? 'text-[var(--color-entity-strategy)]' : 'text-primary'
  if (state === 'planned') return 'text-muted-foreground/55'
  return 'text-muted-foreground/55'
}

export function Lens() {
  const location = useLocation()
  const path = location.pathname
  const [open, setOpen] = useState(false)

  const { symbol, isScoped } = useSymbolContext()
  const { objective, isAll, select } = useObjectiveScope()

  const objQuery = useQuery({
    queryKey: ['research', 'objectives', 'lens'],
    queryFn: () => fetchObjectives({ limit: 50 }),
    staleTime: 5 * 60_000,
  })
  const objectives = useMemo(() => objQuery.data?.items ?? [], [objQuery.data?.items])
  const current = objectives.find((o) => o.id === objective) ?? null

  const objState = objectiveScopeState(path)
  const symState: ScopeState = isScoped ? 'read-here' : symbolPlannedHere(path) ? 'planned' : 'held'

  /** The pages a scope change will actually bite on — named, so the claim is checkable. */
  const wiredLabels = objectiveWiredPages().map(scopeRouteLabel).join(' · ')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Lens — the scopes this shell carries. A lit token means this page reads it; a dim one is held for the next page that does."
          className={cn(
            'hidden h-6 items-center gap-1.5 rounded border px-1.5 transition-colors sm:inline-flex',
            !isAll
              ? 'border-[var(--color-entity-strategy)]/55 bg-[var(--color-entity-strategy)]/[0.08]'
              : 'border-border hover:bg-secondary',
          )}
        >
          {/* The design's aperture glyph, and the word. Together they say the
              chip is a lens rather than a filter chip like the ones on a
              page — this one is the shell's. */}
          <span aria-hidden className={cn('text-dense-micro', isAll ? 'text-muted-foreground/70' : 'text-[var(--color-entity-strategy)]')}>
            ◎
          </span>
          <span
            className={cn(
              'text-dense-micro font-semibold uppercase tracking-[0.08em]',
              isAll ? 'text-muted-foreground' : 'text-[var(--color-entity-strategy)]',
            )}
          >
            Lens
          </span>
          <span className={cn(TOKEN, tokenInk(symState, false))}>{symbol || '—'}</span>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <span className={cn(TOKEN, tokenInk(objState, !isAll))}>
            {isAll ? 'All' : (current?.title ?? objective)}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b border-border px-3 py-2">
          <p className="m-0 text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Scopes on this page
          </p>
          <p className="m-0 flex flex-wrap items-baseline gap-x-2 text-dense-meta leading-normal">
            <span className={cn(TOKEN, tokenInk(symState, false))}>{symbol || 'no symbol'}</span>
            <span className="text-muted-foreground">symbol · {SCOPE_WORDS[symState]}</span>
          </p>
          <p className="m-0 flex flex-wrap items-baseline gap-x-2 text-dense-meta leading-normal">
            <span className={cn(TOKEN, tokenInk(objState, !isAll))}>
              {isAll ? 'All' : (current?.title ?? objective)}
            </span>
            <span className="text-muted-foreground">objective · {SCOPE_WORDS[objState]}</span>
          </p>
          <p className="m-0 pt-1 text-dense-meta leading-normal text-muted-foreground text-pretty">
            {OBJECTIVE_SCOPE_TIPS[objState]}
          </p>
        </div>

        <div className="max-h-72 overflow-y-auto py-1">
          <ObjectiveRow
            title="All objectives"
            sub="no provenance filter"
            active={isAll}
            onPick={() => {
              select(ALL_OBJECTIVES)
              setOpen(false)
            }}
          />
          {objectives.map((o) => (
            <ObjectiveRow
              key={o.id}
              title={o.title}
              sub={`${o.status}${o.schedule ? ` · ${o.schedule}` : ''}`}
              active={o.id === objective}
              onPick={() => {
                select(o.id)
                setOpen(false)
              }}
            />
          ))}
          {objQuery.isLoading ? (
            <p className="m-0 px-3 py-2 text-dense-meta text-muted-foreground">Reading the roster…</p>
          ) : null}
          {!objQuery.isLoading && objectives.length === 0 ? (
            <p className="m-0 px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              No objective is on the roster, so there is nothing to look through. The filter stays off.
            </p>
          ) : null}
        </div>

        <p className="m-0 border-t border-border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
          Wired today: {wiredLabels || 'nothing yet'}. Go to one of those to see the scope bite — elsewhere it is
          carried, not applied, and the token says which.
        </p>
      </PopoverContent>
    </Popover>
  )
}

function ObjectiveRow({
  title,
  sub,
  active,
  onPick,
}: {
  title: string
  sub: string
  active: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        'flex w-full items-start gap-2 px-3 py-1.5 text-left',
        active ? 'bg-primary/[0.08]' : 'hover:bg-secondary',
      )}
    >
      <Check
        className={cn('mt-0.5 h-3 w-3 shrink-0', active ? 'text-primary' : 'text-transparent')}
        aria-hidden
      />
      <span className="min-w-0">
        <span className="block truncate text-xs leading-normal text-foreground">{title}</span>
        <span className="block truncate text-dense-meta leading-normal text-muted-foreground">{sub}</span>
      </span>
    </button>
  )
}
