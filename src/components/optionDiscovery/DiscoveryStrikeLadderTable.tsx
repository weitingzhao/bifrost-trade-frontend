import type { Dispatch, SetStateAction } from 'react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTableNumCell,
} from '@/components/data-display'
import type { StrikeOiPair } from './StrikeLadderPanel'

function fmtOiCompact(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 100_000) return `${Math.round(n / 1000)}k`
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(2)}k`
  return String(Math.round(n))
}

function StrikeOiBar({ widthPct, variant }: { widthPct: number; variant: 'call' | 'put' }) {
  return (
    <div className="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-muted/50">
      <div
        className={cn(
          'h-full rounded-sm transition-[width]',
          variant === 'call' ? 'bg-green-500/70' : 'bg-destructive/70',
        )}
        style={{ width: `${widthPct}%` }}
      />
    </div>
  )
}

function StrikeLadderOiStrikeCell({
  strike,
  oiMax,
  oiByStrike,
  showOi,
}: {
  strike: number
  oiMax: number
  oiByStrike: Map<number, StrikeOiPair>
  showOi: boolean
}) {
  if (!showOi) {
    return (
      <DenseTableCell className={cn(denseTableNumCell, 'py-1 font-mono text-xs')}>
        {strike.toFixed(1)}
      </DenseTableCell>
    )
  }
  const o = oiByStrike.get(strike)
  const c = o?.c ?? null
  const p = o?.p ?? null
  const denom = oiMax > 0 ? oiMax : 1
  const cw = c != null ? Math.min(100, (c / denom) * 100) : 0
  const pw = p != null ? Math.min(100, (p / denom) * 100) : 0
  return (
    <DenseTableCell className="py-1 align-top">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="text-center font-mono text-xs font-semibold tabular-nums">{strike.toFixed(1)}</div>
        <div className="flex items-center gap-0.5" aria-hidden>
          <StrikeOiBar widthPct={cw} variant="call" />
          <div className="w-px shrink-0 self-stretch bg-border" />
          <StrikeOiBar widthPct={pw} variant="put" />
        </div>
        <div
          className="flex justify-between text-[0.62rem] tabular-nums text-muted-foreground"
          aria-label={`Call OI ${fmtOiCompact(c)}, Put OI ${fmtOiCompact(p)}`}
        >
          <span className="text-green-600 dark:text-green-500">C {fmtOiCompact(c)}</span>
          <span className="text-destructive">P {fmtOiCompact(p)}</span>
        </div>
      </div>
    </DenseTableCell>
  )
}

type Props = {
  ariaLabel: string
  strikes: number[]
  rowClassName?: (strike: number) => string
  multiSelectStrikes: number[]
  setMultiSelectStrikes: Dispatch<SetStateAction<number[]>>
  showOi: boolean
  oiMax: number
  oiByStrike: Map<number, StrikeOiPair>
}

export function DiscoveryStrikeLadderTable({
  ariaLabel,
  strikes,
  rowClassName,
  multiSelectStrikes,
  setMultiSelectStrikes,
  showOi,
  oiMax,
  oiByStrike,
}: Props) {
  return (
    <div role="grid" aria-label={ariaLabel}>
    <DenseDataTable wrapClassName="rounded-md border-border/60" tableClassName="text-xs">
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead className="h-7 w-12 px-2">Select</DenseTableHead>
          <DenseTableHead className="h-7 px-2">{showOi ? 'Strike / OI' : 'Strike'}</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {strikes.map(s => (
          <DenseTableRow key={s} className={cn('cursor-default', rowClassName?.(s))}>
            <DenseTableCell className="w-12 px-2 py-1">
              <Checkbox
                checked={multiSelectStrikes.includes(s)}
                onCheckedChange={checked => {
                  if (checked === true) {
                    setMultiSelectStrikes(prev => [...prev, s].sort((a, b) => a - b))
                  } else {
                    setMultiSelectStrikes(prev => prev.filter(x => x !== s))
                  }
                }}
                aria-label={`Select strike ${s}`}
              />
            </DenseTableCell>
            <StrikeLadderOiStrikeCell
              strike={s}
              oiMax={oiMax}
              oiByStrike={oiByStrike}
              showOi={showOi}
            />
          </DenseTableRow>
        ))}
      </DenseTableBody>
    </DenseDataTable>
    </div>
  )
}
