/**
 * The funnel strip — four cells above everything, as the design places it.
 *
 * `screenerModel.ts` decides what they say; this draws them. Tone is
 * the whole visual argument: a stage that emptied is the one the reader is
 * looking for, so it is the one that is loud.
 */
import { cn } from '@/lib/utils'
import type { FunnelCell } from './screenerModel'

const TONE: Record<FunnelCell['tone'], string> = {
  ok: 'text-foreground',
  warn: 'text-warning',
  dead: 'text-danger',
}

export function OptionScreenerFunnel({ cells }: { cells: readonly FunnelCell[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className="bg-secondary/40 px-3 py-2">
          <div className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {c.label}
          </div>
          <div
            className={cn('mt-0.5 font-mono text-lg font-semibold tabular-nums', TONE[c.tone])}
          >
            {c.value}
          </div>
          <div className="text-dense-caption leading-relaxed text-muted-foreground">{c.note}</div>
        </div>
      ))}
    </div>
  )
}
