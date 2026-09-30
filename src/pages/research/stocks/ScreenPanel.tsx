/**
 * Screen (Rev .121 #1, #4): Start from = presets (condition sets, not models)
 * and My screens; a search that adds a condition; the stages, each with its
 * before → after count. Stages are AND; chips in a stage are OR unless the
 * stage has a min or reads "all selected". Every change is a new version.
 */
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  stageActive,
  type ScreenState,
  type Stage,
  type StageCount,
} from './stockScreenModel'
import { chipMissing } from './stockScreenStages'
import type { StartChoice } from './stockScreenView'

function Chip({
  on,
  label,
  n,
  title,
  missing,
  narrative,
  onClick,
}: {
  on: boolean
  label: string
  n: string
  title: string
  missing: boolean
  narrative?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={missing ? undefined : onClick}
      aria-disabled={missing || undefined}
      aria-pressed={on}
      title={title}
      className={cn(
        'mat-tag inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap border text-dense-meta',
        narrative ? 'border-dashed' : 'border-transparent',
        on ? '!border-primary bg-primary/15 text-foreground' : 'text-[var(--sk-soft)] hover:text-foreground',
        missing && 'cursor-not-allowed opacity-45 hover:text-[var(--sk-soft)]',
      )}
    >
      {narrative ? <span className="font-mono text-dense-caption text-[var(--sk-mute2)]">8-K</span> : null}
      <span>{label}</span>
      <span className="font-mono text-dense-caption text-muted-foreground">{n}</span>
    </button>
  )
}

export function ScreenPanel({
  title,
  poolN,
  resultN,
  nOn,
  onClear,
  starts,
  startId,
  savedNote,
  stages,
  counts,
  screen,
  chipCountOf,
  pending,
  onChip,
  onMin,
}: {
  title: string
  poolN: number
  resultN: number
  nOn: number
  onClear: () => void
  starts: readonly StartChoice[]
  startId: string | null
  /** What My screens holds, or why it is empty. */
  savedNote: string | null
  stages: readonly Stage[]
  counts: readonly StageCount[]
  screen: ScreenState
  /** A chip's count in the universe; a server-set chip not yet loaded reads its tier's own count. */
  chipCountOf: (id: string) => { n: number | null; where: string }
  pending: boolean
  onChip: (id: string, label: string) => void
  onMin: (stageId: string, next: number, label: string) => void
}) {
  const [openSt, setOpenSt] = useState<Record<string, boolean>>({})
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const matches = needle
    ? stages
        .flatMap((st) =>
          st.chips
            .filter((c) => !screen.on[c.id] && !chipMissing(st.id, c.id))
            .filter((c) => c.label.toLowerCase().includes(needle) || c.id.includes(needle.replace(/\s+/g, '_')))
            .map((c) => ({ st, c })),
        )
        .slice(0, 8)
    : []
  return (
    <section className="mat-card min-w-0 overflow-hidden border">
      <header className="flex flex-wrap items-baseline gap-2 border-b border-foreground/[0.06] px-3 py-2">
        <span data-sr-tb="label">Screen</span>
        <span className="min-w-0 truncate text-dense-body font-semibold">{title}</span>
        <span className="font-mono text-dense-label text-muted-foreground">
          {poolN.toLocaleString('en-US')} → <span className="text-foreground">{resultN.toLocaleString('en-US')}</span>
        </span>
        {nOn > 0 ? (
          <button type="button" onClick={onClear} className="ml-auto whitespace-nowrap text-dense-meta text-primary hover:underline">
            Clear {nOn}
          </button>
        ) : null}
      </header>
      <div className="flex flex-col gap-1.5 px-3 pb-1 pt-2">
        <span className="text-dense-meta text-muted-foreground">Start from · presets are condition sets, not models</span>
        <div className="flex flex-wrap gap-1">
          {starts.map((p) => (
            <Chip
              key={p.id}
              on={startId === p.id}
              label={p.label}
              n={p.k}
              title={p.missing ? `${p.title} — not offered: ${p.missing}` : p.title}
              missing={!!p.missing}
              onClick={p.apply}
            />
          ))}
        </div>
        {savedNote ? <span className="text-dense-caption text-muted-foreground">{savedNote}</span> : null}
      </div>
      <div className="relative px-3 pb-2 pt-1.5">
        <span className="pointer-events-none absolute left-5 top-3 text-dense-body text-muted-foreground">⌕</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Add a condition: sma, eps, 8-k, iv rank…"
          aria-label="Add a condition"
          className="mat-field h-7 w-full border pl-6 pr-2 text-dense-label outline-none"
        />
        {matches.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {matches.map(({ st, c }) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChip(c.id, c.label)
                  setQ('')
                }}
                className="mat-tag inline-flex h-[22px] items-center gap-1.5 text-dense-meta text-[var(--sk-soft)] hover:text-foreground"
              >
                <span>{c.label}</span>
                <span className="font-mono text-dense-caption text-muted-foreground">{chipCountOf(c.id).n ?? '—'}</span>
                <span className="text-muted-foreground">{st.title}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {stages.map((st, i) => {
        const sc = counts[i]
        const active = stageActive(st, screen)
        const open = active || !!openSt[st.id]
        const need = screen.mins[st.id] ?? 0
        const labels = st.chips.filter((c) => screen.on[c.id]).map((c) => c.label)
        if ((st.kind === 'min' || st.kind === 'agree') && need > 0) labels.unshift(`≥ ${need} of ${st.max ?? st.chips.length}`)
        return (
          <div key={st.id} className={cn('border-t border-foreground/[0.06] px-3 py-1.5', !active && 'opacity-80')}>
            <button
              type="button"
              onClick={() => setOpenSt((o) => ({ ...o, [st.id]: !open }))}
              title={st.missing ?? (open ? '' : 'Open to add conditions')}
              className="grid w-full cursor-pointer items-baseline gap-2 text-left [grid-template-columns:14px_minmax(0,1fr)_auto]"
            >
              <span className="font-mono text-dense-caption text-muted-foreground">{i + 1}</span>
              <span className="flex min-w-0 items-baseline gap-1.5 overflow-hidden">
                <span className="whitespace-nowrap text-dense-label font-semibold">{st.title}</span>
                <span className="truncate text-dense-meta text-muted-foreground">
                  {st.missing ? 'no store answers it' : active ? labels.join(' · ') : 'pass-through'}
                </span>
              </span>
              <span
                className={cn(
                  'whitespace-nowrap font-mono text-dense-meta',
                  sc.after === 0 ? 'text-destructive' : active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {active ? `${sc.before} → ${sc.after}${pending ? ' …' : ''}` : sc.after}
              </span>
            </button>
            {open ? (
              <div className="flex flex-col gap-1.5 pb-0.5 pl-[22px] pt-1.5">
                <div className="flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                  <span>{st.mode}</span>
                  {st.kind === 'min' || st.kind === 'agree' ? (
                    <span className="ml-auto inline-flex items-center gap-1">
                      min
                      <button type="button" className="px-0.5 hover:text-foreground" aria-label={`${st.title} min down`} onClick={() => onMin(st.id, Math.max(0, need - 1), `${st.title} min −1`)}>
                        −
                      </button>
                      <span className="font-mono text-foreground">{need}</span>
                      <button
                        type="button"
                        className="px-0.5 hover:text-foreground"
                        aria-label={`${st.title} min up`}
                        onClick={() => onMin(st.id, Math.min(st.max ?? st.chips.length, need + 1), `${st.title} min +1`)}
                      >
                        ＋
                      </button>
                    </span>
                  ) : null}
                </div>
                {st.missing ? <span className="text-dense-caption text-muted-foreground">{st.missing}</span> : null}
                <div className="flex flex-wrap gap-1">
                  {st.chips.map((c) => {
                    const miss = chipMissing(st.id, c.id)
                    const cc = chipCountOf(c.id)
                    const n = miss ? null : cc.n
                    const where = cc.where
                    return (
                      <Chip
                        key={c.id}
                        on={!!screen.on[c.id]}
                        label={c.label}
                        n={n == null ? '—' : String(n)}
                        narrative={!!c.narrative}
                        missing={!!miss}
                        title={
                          miss ??
                          [c.narrative ? `${c.narrative} · SEC 8-K by item number; never enters a model` : c.title, `${n ?? '—'} ${where} pass`]
                            .filter(Boolean)
                            .join(' · ')
                        }
                        onClick={() => onChip(c.id, c.label)}
                      />
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
      <div className="text-pretty border-t border-foreground/[0.06] px-3 py-2 text-dense-meta leading-normal text-muted-foreground">
        Stages are AND. Chips in a stage are OR, unless it has a min (at least N of these) or reads “all selected”. Counts are
        before → after each stage. Every change is a new version of the screen.
      </div>
    </section>
  )
}
