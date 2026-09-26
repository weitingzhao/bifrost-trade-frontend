/**
 * The funnel — four heroes above everything, as the design places it (§16.2;
 * four go 2 × 2 under 860px of row, Rev .93).
 *
 * `screenerModel.ts` decides what they say; this draws them. Tone is the
 * whole visual argument: a stage that emptied is the one the reader is looking
 * for, so it is the loud one — amber on the edge and the figure, not red:
 * nothing failed, the filters left nothing (Rev .93).
 */
import { HeroCard, HeroRow } from '@/components/layout'
import type { FunnelCell } from './screenerModel'

const TONE: Record<FunnelCell['tone'], string> = {
  ok: 'text-foreground',
  warn: 'text-warning',
  dead: 'text-warning',
}

export function OptionScreenerFunnel({ cells }: { cells: readonly FunnelCell[] }) {
  return (
    <HeroRow label="The funnel">
      {cells.map((c) => (
        <HeroCard
          key={c.label}
          label={c.label}
          value={c.value}
          valueClassName={TONE[c.tone]}
          state={c.tone === 'ok' ? null : 'warn'}
          sub={c.note}
        />
      ))}
    </HeroRow>
  )
}
