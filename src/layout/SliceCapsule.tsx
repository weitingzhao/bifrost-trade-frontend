/**
 * Where on the slice you stand — one quiet chip after the breadcrumb, the
 * whole chain beneath it (design Rev 2026-09-23.25, the StageRail folded into
 * the crumb, Owner option B).
 *
 * The chip names the current stage and, in the accent, the next one: the next
 * step is the affordance, the rest is context. It shows only on slice pages.
 * Opened, it is the design's chain — every stage with its state, and the
 * symbol the chain would carry — and a stage is a link that takes the held
 * symbol with it, so walking the slice keeps the name you were on.
 *
 * No digits on the stages, as in the design: the sidebar's numerals are the
 * lifecycle layers, and two 1–5 systems side by side would make a digit mean
 * two things. The arrows carry the order.
 */
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useSymbolContext } from '@/lib/symbolContext'
import { withSymbolParam } from '@/lib/symbolLink'
import { cn } from '@/lib/utils'
import { SLICE, sliceOf, stageState, type StageState } from './slice'

/** Brightest to dimmest: current (ink) → done (soft) → future (mute); next wears the accent. */
const CHIP: Record<StageState, string> = {
  current:
    'border-[var(--sk-layer)] bg-[color-mix(in_srgb,var(--sk-layer)_14%,transparent)] font-semibold text-foreground',
  next: 'border-[var(--sk-accent)] text-[var(--sk-accent)]',
  done: 'border-border text-[var(--sk-soft)]',
  future: 'border-border text-muted-foreground',
}

const MARK: Record<StageState, string> = { done: '✓', next: '›', current: '', future: '' }

export function SliceCapsule() {
  const { pathname } = useLocation()
  const { symbol } = useSymbolContext()
  const [open, setOpen] = useState(false)
  const at = sliceOf(pathname)
  if (at < 0) return null
  const current = SLICE[at]
  const next = SLICE[at + 1]
  const title = `Vertical slice · ${SLICE.map((s) => s.label).join(' → ')} · you are at ${current.label}${
    next ? `, next ${next.label}` : ''
  }`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={title}
          aria-label={title}
          className={cn(
            'hidden h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--sk-line0)] bg-transparent px-2 text-dense-meta md:inline-flex',
            'hover:border-[var(--sk-line2)] hover:bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)]'
          )}
        >
          <span className="size-1.5 shrink-0 rounded-full bg-[var(--sk-layer)]" aria-hidden />
          <span className="text-muted-foreground">Slice</span>
          <span className="font-semibold text-foreground">{current.label}</span>
          {next ? <span className="text-[var(--sk-accent)]">› {next.label}</span> : null}
          <span className="text-dense-micro text-muted-foreground" aria-hidden>
            ▾
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        // The shell's glass: floating things only (Rev .20).
        className={cn(
          'w-max max-w-[min(640px,calc(100vw-24px))] rounded-xl p-0',
          'border-[color-mix(in_srgb,var(--sk-ink)_14%,transparent)] bg-[color-mix(in_srgb,var(--sk-raised)_82%,transparent)]',
          'backdrop-blur-[16px] backdrop-saturate-[1.4]',
          'shadow-[inset_0_1px_0_color-mix(in_srgb,var(--sk-ink)_7%,transparent),0_24px_60px_-16px_rgb(0_0_0/0.55)]'
        )}
      >
        <nav
          aria-label="Vertical slice"
          className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.25 px-3 py-2"
        >
          <span className="mr-0.5 shrink-0 font-mono text-dense-micro font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Slice
          </span>
          {SLICE.map((s, i) => {
            const state = stageState(i, at)
            return (
              <span key={s.label} className="flex items-center gap-2">
                <Link
                  to={withSymbolParam(s.to, symbol)}
                  onClick={() => setOpen(false)}
                  title={s.why + (state === 'next' ? ' · next step' : '')}
                  aria-current={state === 'current' ? 'step' : undefined}
                  className={cn(
                    'inline-flex h-5.5 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.25 text-dense-meta no-underline',
                    'hover:border-[var(--sk-line2)] hover:text-foreground',
                    CHIP[state]
                  )}
                >
                  {s.label}
                  {MARK[state] ? <span className="text-dense-caption">{MARK[state]}</span> : null}
                </Link>
                {i < SLICE.length - 1 ? (
                  <span className="text-dense-meta text-muted-foreground" aria-hidden>
                    →
                  </span>
                ) : null}
              </span>
            )
          })}
          {symbol ? (
            <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 pl-2">
              <span className="font-mono text-dense-micro uppercase tracking-[0.12em] text-muted-foreground">
                carrying
              </span>
              <span className="font-mono text-xs font-bold tabular-nums text-[var(--sk-ticker)]">
                {symbol}
              </span>
            </span>
          ) : null}
        </nav>
      </PopoverContent>
    </Popover>
  )
}
