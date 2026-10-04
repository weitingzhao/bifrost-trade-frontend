/**
 * You — `/research/agent-personas/you` (design `System Agents You.dc.html`,
 * Rev .96; behavior contracts Spec §20; store K6 = `journal.memory`).
 *
 * What the nightly distill has learned about how you trade: the portrait's
 * four axes, every memory with its evidence, the week's movement, and the
 * five sources it learns from. Memories are written without asking; Forget
 * is a topic tombstone (§20.2), held locally for five seconds before it
 * commits — the store has no restore, so the undo window lives here.
 *
 * Honest gaps, by name: the **risk axis** needs the Trade side's gate
 * history (D13 — this domain cannot read it); the week card's **forgotten**
 * count and the tension rows' said/did split wait for the distiller to write
 * them; both render as absent, never as zeros.
 */
import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchMemory,
  forgetMemory,
  setMemorySource,
  type JournalMemory,
  type MemoryAxis,
} from '@/api/research/journal'
import { PageHead, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl, type DenseTagVariant } from '@/components/data-display'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { ViewState } from '@bifrost/ui'
import { cn } from '@/lib/utils'

const AXIS_ORDER = [
  { id: 'hold', label: 'Holding period' },
  { id: 'exit', label: 'Exit' },
  { id: 'risk', label: 'Risk' },
  { id: 'trigger', label: 'Weak spot' },
] as const

const KIND_TAG: Record<JournalMemory['kind'], { label: string; variant: DenseTagVariant }> = {
  did: { label: 'did', variant: 'info' },
  said: { label: 'said', variant: 'neutral' },
  tension: { label: 'said vs did', variant: 'warning' },
}

const CHANGE_LABEL: Record<JournalMemory['change'], string> = {
  new: 'new this week',
  stronger: '↑ stronger',
  fading: '↓ fading',
  steady: 'steady',
}

const SOURCE_ROWS: [string, string, string][] = [
  ['notes', 'Notes', 'said'],
  ['fills', 'Fills', 'did'],
  ['decisions', 'Inbox decisions', 'did'],
  ['threads', 'Copilot threads', 'said'],
  ['visits', 'Research visits', 'did'],
]

type Filter = 'all' | 'did' | 'said' | 'tension' | 'change'

export default function PersonasYouPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const focus = params.get('m')
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<Record<string, boolean>>(focus ? { [focus]: true } : {})
  // Forget is held locally for 5s (the store has no restore): hidden at once,
  // committed when the timer fires, resurrected by Undo before it does.
  const [held, setHeld] = useState<Record<string, boolean>>({})
  const timers = useRef<Record<string, number>>({})

  const memQ = useQuery({
    queryKey: ['research-engine', 'journal', 'memory'],
    queryFn: fetchMemory,
    refetchInterval: 300_000,
    retry: 1,
  })
  const forget = useMutation({
    mutationFn: (id: string) => forgetMemory(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ['research-engine', 'journal', 'memory'] }),
  })
  const sourceMut = useMutation({
    mutationFn: ({ source, enabled }: { source: string; enabled: boolean }) =>
      setMemorySource(source, enabled),
    onSettled: () => qc.invalidateQueries({ queryKey: ['research-engine', 'journal', 'memory'] }),
  })

  const all = useMemo(
    () => (memQ.data?.memories ?? []).filter((m) => !held[m.id]),
    [memQ.data, held],
  )
  const shown = all.filter((m) =>
    filter === 'all' ? true : filter === 'change' ? m.change !== 'steady' : m.kind === filter,
  )
  const axes = useMemo(() => {
    const byId = new Map<string, MemoryAxis>((memQ.data?.axes ?? []).map((a) => [a.id, a]))
    return AXIS_ORDER.map(({ id, label }) => {
      const a = byId.get(id)
      if (!a)
        return {
          id,
          label,
          value: '—',
          sub:
            id === 'risk'
              ? 'needs the Trade gate history — owed'
              : 'not measured yet — the distill starts from your trail',
          backs: '',
          warn: false,
          mono: false,
        }
      return {
        id,
        label,
        value: a.value,
        sub: a.sub,
        backs: a.backs.length ? `from ${a.backs.join(' · ')}` : '',
        warn: a.warn,
        mono: /\d/.test(a.value),
      }
    })
  }, [memQ.data])

  const week = memQ.data?.week
  const lastDistill = useMemo(() => {
    const days = all.map((m) => m.last_seen ?? '').filter(Boolean)
    return days.length ? days.reduce((a, b) => (a > b ? a : b)) : null
  }, [all])
  const counts = useMemo(
    () => ({
      new: all.filter((m) => m.change === 'new').length,
      stronger: all.filter((m) => m.change === 'stronger').length,
      fading: all.filter((m) => m.change === 'fading').length,
    }),
    [all],
  )

  const doForget = (m: JournalMemory) => {
    setHeld((prev) => ({ ...prev, [m.id]: true }))
    timers.current[m.id] = window.setTimeout(() => {
      delete timers.current[m.id]
      forget.mutate(m.id)
      setHeld((prev) => {
        const next = { ...prev }
        delete next[m.id]
        return next
      })
    }, 5_000)
  }
  const undoForget = (id: string) => {
    const t = timers.current[id]
    if (t != null) window.clearTimeout(t)
    delete timers.current[id]
    setHeld((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }
  const heldIds = Object.keys(held)

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead
        title="You"
        info="What the system has learned about how you trade, distilled every night after the close from your notes, fills, Inbox decisions, Copilot threads and research visits. Memories are written without asking; forget any one and it is gone from the Copilot, the order sheet and this page at once. The evidence stays in the Journal."
        actions={
          <button
            type="button"
            onClick={() => navigate('/research/agent-personas')}
            title="The bench — you are the first row"
            className="text-dense-meta text-muted-foreground hover:text-foreground hover:underline"
          >
            Personas
          </button>
        }
      />

      {memQ.isLoading ? (
        <section className="overflow-hidden mat-card">
          <ViewState kind="loading" title="Reading the memory store" rows={5} cols={4} />
        </section>
      ) : memQ.isError ? (
        <ResearchAuthGap error={memQ.error} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2.5">
            {axes.map((a) => (
              <div key={a.id} data-sr-kpi="hero" className="flex-[1_1_200px]">
                <span data-sr-kpi-l className="text-[var(--sk-soft)]">
                  {a.label}
                </span>
                <span
                  data-sr-kpi-v
                  className={cn(
                    a.mono ? 'font-mono' : 'font-sans',
                    a.warn
                      ? 'text-warning'
                      : a.value === '—'
                        ? 'text-muted-foreground'
                        : 'text-foreground',
                  )}
                >
                  {a.value}
                </span>
                <span data-sr-kpi-s>{a.sub}</span>
                <span className="font-mono text-dense-micro text-muted-foreground">{a.backs}</span>
              </div>
            ))}
          </div>

          {heldIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[color-mix(in_srgb,var(--sk-warn)_9%,transparent)] px-3 py-1.5 text-dense-meta">
              {heldIds.map((id) => (
                <span key={id} className="flex items-center gap-2">
                  Forgot <span className="font-mono">{id}</span> — gone everywhere in 5s.
                  <button
                    type="button"
                    onClick={() => undoForget(id)}
                    className="text-primary hover:underline"
                  >
                    Undo
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-start gap-3">
            <section className="min-w-0 flex-[999_1_32.5rem] overflow-hidden mat-card">
              <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
                <h2 className="text-dense-body font-semibold">Memory</h2>
                <span className="text-dense-meta text-muted-foreground">
                  {all.length} things it believes about you
                  {(memQ.data?.archived_count ?? 0) > 0
                    ? ` · ${memQ.data?.archived_count} archived`
                    : ''}
                </span>
                <span className="ml-auto">
                  <SegmentControl
                    ariaLabel="Kind"
                    size="xs"
                    value={filter}
                    onChange={(v) => setFilter(v as Filter)}
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'did', label: 'Did' },
                      { value: 'said', label: 'Said' },
                      { value: 'tension', label: 'Said vs did' },
                    ]}
                  />
                </span>
              </header>
              {shown.length === 0 ? (
                <ViewState
                  kind="empty"
                  title={all.length ? 'Nothing of this kind' : 'No memories yet'}
                  detail={
                    all.length
                      ? 'Switch the filter back to All.'
                      : 'The nightly distill starts from your trail — notes, fills, decisions, visits.'
                  }
                />
              ) : (
                <div className="flex flex-col">
                  {shown.map((m, i) => (
                    <MemoryRow
                      key={m.id}
                      m={m}
                      first={i === 0}
                      focus={focus === m.id}
                      open={!!open[m.id]}
                      onToggle={() => setOpen((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                      onForget={() => doForget(m)}
                      onGo={(to) => (to ? navigate(to) : undefined)}
                    />
                  ))}
                </div>
              )}
            </section>

            <div className="flex min-w-0 flex-[1_1_18.75rem] flex-col gap-3">
              <section className="overflow-hidden mat-card">
                <header className="flex items-baseline gap-2 border-b border-border px-3 py-2.5">
                  <h2 className="text-dense-body font-semibold">This week</h2>
                  <span className="font-mono text-dense-micro text-muted-foreground">
                    {week?.range ?? ''}
                  </span>
                </header>
                <div className="grid grid-cols-4 gap-px bg-border">
                  {(
                    [
                      ['new', counts.new, 'new'],
                      ['stronger', counts.stronger, 'stronger'],
                      ['fading', counts.fading, 'fading'],
                      // K7: the store now counts this week's tombstones.
                      ['forgot', week?.forgot ?? 0, 'forgotten by you'],
                    ] as const
                  ).map(([key, n, label]) => (
                    <button
                      key={key}
                      type="button"
                      disabled={key === 'forgot'}
                      onClick={() => setFilter('change')}
                      className="flex flex-col gap-0.5 bg-card px-3 py-2 text-left hover:bg-[color-mix(in_srgb,var(--sk-ink)_5%,var(--card))]"
                    >
                      <span className="font-mono text-lg font-semibold tabular-nums">{n}</span>
                      <span className="text-dense-meta text-muted-foreground">{label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5 text-dense-meta text-muted-foreground">
                  <span>{lastDistill ? `Last distill ${lastDistill}` : 'No distill yet'}</span>
                  <button
                    type="button"
                    onClick={() => navigate('/research/journal?view=day')}
                    className="ml-auto whitespace-nowrap text-primary hover:underline"
                  >
                    Journal · Day →
                  </button>
                </div>
              </section>

              <section className="overflow-hidden mat-card">
                <header className="border-b border-border px-3 py-2.5">
                  <h2 className="text-dense-body font-semibold">What it learns from</h2>
                </header>
                <div className="flex flex-col">
                  {SOURCE_ROWS.map(([key, label, half], i) => {
                    const enabled =
                      memQ.data?.sources.find((s) => s.source === key)?.enabled ?? true
                    return (
                      <div
                        key={key}
                        className={cn(
                          'grid min-h-10 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5 px-3 py-1',
                          i > 0 && 'border-t border-border/60',
                        )}
                      >
                        <span className="text-dense-body">{label}</span>
                        <span className="text-dense-micro text-muted-foreground">{half}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          aria-label={label}
                          disabled={sourceMut.isPending}
                          onClick={() => sourceMut.mutate({ source: key, enabled: !enabled })}
                          className={cn(
                            'relative h-[18px] w-8 flex-none rounded-full transition-colors',
                            enabled
                              ? 'bg-[var(--sk-accent)]'
                              : 'bg-[color-mix(in_srgb,var(--sk-ink)_18%,transparent)]',
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 size-3.5 rounded-full bg-white shadow transition-[left]',
                              enabled ? 'left-4' : 'left-0.5',
                            )}
                          />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <p className="px-3 pt-2 pb-3 text-dense-micro leading-relaxed text-muted-foreground">
                  Off stops new evidence from that source. Memories it already backs stay until you
                  forget them. “Said” and “did” are kept apart: a note is a claim, a fill is a fact.
                </p>
              </section>
            </div>
          </div>
        </>
      )}
    </PageShell>
  )
}

function MemoryRow({
  m,
  first,
  focus,
  open,
  onToggle,
  onForget,
  onGo,
}: {
  m: JournalMemory
  first: boolean
  focus: boolean
  open: boolean
  onToggle: () => void
  onForget: () => void
  onGo: (to: string) => void
}) {
  const kind = KIND_TAG[m.kind]
  const meta = [
    `${m.evidence.length} piece${m.evidence.length === 1 ? '' : 's'} of evidence`,
    m.first_seen ? `first ${m.first_seen.slice(5)}` : null,
    m.last_seen ? `last ${m.last_seen.slice(5)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <div
      className={cn(
        'flex flex-col gap-2 px-3 py-3',
        !first && 'border-t border-border/60',
        focus && 'bg-[color-mix(in_srgb,var(--sk-accent)_7%,transparent)]',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <DenseTag variant={kind.variant} size="cell">
          {kind.label}
        </DenseTag>
        <span className="font-mono text-dense-meta font-bold text-[var(--sk-soft)]">{m.id}</span>
        <span
          className={cn(
            'text-dense-meta',
            m.change === 'fading' || m.change === 'steady'
              ? 'text-muted-foreground'
              : 'text-[var(--sk-soft)]',
          )}
        >
          {CHANGE_LABEL[m.change]}
        </span>
        <span className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="text-dense-meta text-primary hover:underline"
          >
            {open ? 'Hide evidence' : 'Why?'}
          </button>
          <button
            type="button"
            onClick={() => onGo(`/research/trace?m=${encodeURIComponent(m.id)}`)}
            title="Where it came from and what it caused — the chain over Journal edges"
            className="text-dense-meta text-primary hover:underline"
          >
            Trace
          </button>
          <button
            type="button"
            onClick={onForget}
            title="Removes it everywhere at once. Undo stays up for 5 seconds."
            className="text-dense-meta text-muted-foreground hover:text-foreground"
          >
            Forget
          </button>
        </span>
      </div>
      <p className="text-dense-body leading-relaxed text-pretty">{m.text}</p>
      <div className="flex flex-wrap items-center gap-2.5 text-dense-micro text-muted-foreground">
        <span className="font-mono">{meta}</span>
        <span
          title="Strength — evidence count, recency and agreement"
          className="h-1 w-[72px] flex-none overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--sk-ink)_10%,transparent)]"
        >
          <span
            className={cn(
              'block h-full',
              m.change === 'fading' ? 'bg-[var(--sk-faint)]' : 'bg-[var(--sk-soft)]',
            )}
            style={{ width: `${Math.round(m.strength * 100)}%` }}
          />
        </span>
      </div>
      {open ? (
        <div className="flex flex-col overflow-hidden mat-card">
          {m.evidence.map((e, j) => (
            <button
              key={`${e.source}-${j}`}
              type="button"
              onClick={() => onGo(e.route)}
              disabled={!e.route}
              className={cn(
                'grid grid-cols-[52px_84px_minmax(0,1fr)_auto] items-baseline gap-2.5 px-2.5 py-1.5 text-left',
                j > 0 && 'border-t border-border/50',
                e.route && 'cursor-pointer hover:bg-[color-mix(in_srgb,var(--sk-ink)_5%,transparent)]',
              )}
            >
              <span className="text-dense-micro text-muted-foreground">{e.source}</span>
              <span className="font-mono text-dense-micro text-muted-foreground">{e.date}</span>
              <span className="min-w-0 text-dense-meta text-[var(--sk-soft)] [overflow-wrap:anywhere]">
                {e.text}
              </span>
              <span className="text-dense-meta text-primary">{e.route ? '→' : ''}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
