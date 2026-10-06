/**
 * The price chart's signal picker (design K-LINE-SPEC §8, RESPONSE B1): a
 * FilterChip trigger that names the marked signal and how many times it fired
 * in the window, opening a searchable single-select menu — None, the 13
 * indicator signals, the active Pine library — each row with its count in
 * view. One signal at a time: two sets of identical triangles would pass for
 * each other; comparing signals is Signal Decay's job.
 */
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilterChip } from '@bifrost/ui'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { INDICATOR_SIGNALS } from '@/api/research/indicators'
import type { PineLibraryEntry } from '@/api/research/pine'
import { cn } from '@/lib/utils'
import { signalLabel } from '@/components/symbolChart/useChartSignal'

export interface SignalMenuProps {
  /** '' · an indicator id · `pine:<script>`. */
  sigId: string
  onPick: (id: string) => void
  pine: readonly PineLibraryEntry[]
  /** Firings inside the window, by `sigId`; missing = not read yet. */
  counts: ReadonlyMap<string, number>
  /** The menu opened — the counts are read from then on. */
  onOpen?: () => void
}

const ROW =
  'flex min-h-[26px] w-full flex-none cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2 text-left text-dense-label text-[var(--sk-soft)] hover:bg-[color-mix(in_srgb,var(--sk-ink)_9%,transparent)]'
const ON = 'bg-[color-mix(in_srgb,var(--sk-ink)_15%,transparent)]'

export function SignalMenu(p: SignalMenuProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()
  const needle = q.trim().toLowerCase()
  const match = (s: string) => !needle || s.toLowerCase().includes(needle)
  const inds = INDICATOR_SIGNALS.filter((x) => match(x.label))
  const pines = p.pine.filter((x) => match(`${x.label} ${x.id}`))
  const pick = (id: string) => {
    p.onPick(id)
    setOpen(false)
  }
  const n = (id: string) => {
    const v = p.counts.get(id)
    return v == null ? '' : String(v)
  }
  const on = p.sigId !== ''
  const pineId = p.sigId.startsWith('pine:') ? p.sigId.slice(5) : null
  const manage = `/research/backtest?tab=pine${pineId ? `&script=${encodeURIComponent(pineId)}` : ''}`
  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) {
          setQ('')
          p.onOpen?.()
        }
      }}
    >
      <PopoverTrigger asChild ref={ref}>
        <FilterChip
          pressed={on}
          count={on ? n(p.sigId) : undefined}
          aria-haspopup="menu"
          title={
            on
              ? `${n(p.sigId) || 'Some'} ${signalLabel(p.sigId, p.pine)} signals in view · ▲ buy under the low, ▼ sell over the high · click to change`
              : 'Mark one indicator or Pine signal on the candles'
          }
        >
          {on ? signalLabel(p.sigId, p.pine) : 'Signal'} <span aria-hidden className="text-[var(--sk-mute)]">▾</span>
        </FilterChip>
      </PopoverTrigger>
      <PopoverContent
        morphFrom={ref}
        align="end"
        sideOffset={6}
        data-glass-thickness="clear"
        role="menu"
        aria-label="Signal marks"
        className="flex max-h-[420px] w-[300px] flex-col gap-px overflow-y-auto rounded-xl p-1.5"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a signal"
          aria-label="Find a signal"
          className="mb-1 h-[26px] flex-none rounded-[7px] border-0 bg-[color-mix(in_srgb,var(--sk-ink)_7%,transparent)] px-2 text-dense-label text-[var(--sk-ink)] outline-none"
        />
        <button type="button" role="menuitemradio" aria-checked={!on} onClick={() => pick('')} className={cn(ROW, !on && ON)}>
          None
        </button>
        <div className="flex flex-none items-baseline gap-1.5 px-2 pt-2 pb-[3px] text-dense-meta font-semibold text-[var(--sk-mute)]">
          <span>Indicators</span>
          <span className="font-mono font-normal">{inds.length}</span>
          <span className="ml-auto font-normal">in view</span>
        </div>
        {inds.map((x) => (
          <button
            key={x.id}
            type="button"
            role="menuitemradio"
            aria-checked={p.sigId === x.id}
            onClick={() => pick(x.id)}
            className={cn(ROW, p.sigId === x.id && ON)}
          >
            <span className="w-2.5 flex-none text-dense-caption text-[var(--sk-mute2)]">{x.direction === 'up' ? '▲' : '▼'}</span>
            <span className="min-w-0 flex-1 truncate">{x.label}</span>
            <span className="font-mono text-dense-meta text-[var(--sk-mute)]">{n(x.id)}</span>
          </button>
        ))}
        <div className="flex flex-none items-baseline gap-1.5 px-2 pt-2 pb-[3px] text-dense-meta font-semibold text-[var(--sk-mute)]">
          <span>Pine library</span>
          <span className="font-mono font-normal">{pines.length}</span>
        </div>
        {pines.map((x) => {
          const id = `pine:${x.id}`
          return (
            <button
              key={id}
              type="button"
              role="menuitemradio"
              aria-checked={p.sigId === id}
              onClick={() => pick(id)}
              className={cn(ROW, p.sigId === id && ON)}
            >
              <span className="w-2.5 flex-none text-dense-caption text-[var(--sk-mute2)]">▲▼</span>
              <span className="min-w-0 flex-1 truncate">{x.label}</span>
              {x.origin !== 'bifrost' ? (
                <span className="rounded-full bg-[color-mix(in_srgb,var(--sk-ink)_9%,transparent)] px-1.5 text-dense-caption leading-4 text-[var(--sk-mute2)]">
                  {x.origin === 'user' ? 'mine' : 'community'}
                </span>
              ) : null}
              <span className="font-mono text-dense-meta text-[var(--sk-mute)]">{n(id)}</span>
            </button>
          )
        })}
        <div className="mx-2 my-1 h-px flex-none bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]" />
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            navigate(manage)
          }}
          title="Backtest › Pine library — add, copy or check a script"
          className={cn(ROW, 'text-[var(--sk-mute2)] hover:text-[var(--sk-ink)]')}
        >
          Manage scripts ↗
        </button>
      </PopoverContent>
    </Popover>
  )
}
