import { useNavigate } from 'react-router-dom'
import { PinChip, PinSectionHeader } from '@/components/cockpit/PinChip'
import { useCockpitPins } from '@/hooks/useCockpitPins'
import { useResearchContext } from '@/hooks/useResearchContext'
import { useHypothesisList } from '@/hooks/useHypotheses'
import { cn } from '@/lib/utils'

/**
 * Pins in the session rail (Wave RS-UX6).
 *
 * Replaces the old `Pins` tab.  Pins and chat history answer the same question
 * — "take me back to something" — so they belong in the same rail rather than
 * competing as a top-level tab that showed an empty state most of the time.
 * Renders nothing when there is nothing pinned.
 */
export function PinsSection({ className }: { className?: string }) {
  const navigate = useNavigate()
  const { setSymbol } = useResearchContext()
  const pins = useCockpitPins()
  const hypListQ = useHypothesisList(
    { status: 'active', limit: 50 },
    pins.hypothesisIds.length > 0,
  )

  const hypById = new Map((hypListQ.data?.rows ?? []).map((h) => [h.id, h]))

  const empty =
    pins.symbols.length === 0 &&
    pins.hypothesisIds.length === 0 &&
    pins.hits.length === 0
  if (empty) return null

  function jumpSymbol(sym: string) {
    setSymbol(sym)
    navigate(`/research/daily-brief?symbol=${encodeURIComponent(sym)}`)
  }

  function jumpHypothesis(id: string) {
    pins.setFocusedHypothesis(id)
    const sym = hypById.get(id)?.symbols?.[0]
    if (sym) setSymbol(sym)
    navigate(`/research/backtest?tab=event-query&hypothesis_id=${encodeURIComponent(id)}`)
  }

  function jumpHit(originPage: string, sym: string) {
    setSymbol(sym)
    const path = originPage.startsWith('/') ? originPage : `/${originPage}`
    const sep = path.includes('?') ? '&' : '?'
    navigate(`${path}${sep}symbol=${encodeURIComponent(sym)}`)
  }

  return (
    <div className={cn('space-y-1.5 border-t border-border/60 pt-2', className)}>
      {pins.symbols.length > 0 ? (
        <div className="space-y-1">
          <PinSectionHeader title="Symbols" count={pins.symbols.length} />
          <div className="flex flex-wrap gap-1">
            {pins.symbols.map((s) => (
              <PinChip
                key={s}
                label={s}
                onJump={() => jumpSymbol(s)}
                onRemove={() => pins.unpinSymbol(s)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {pins.hypothesisIds.length > 0 ? (
        <div className="space-y-1">
          <PinSectionHeader title="Hypotheses" count={pins.hypothesisIds.length} />
          <div className="flex flex-wrap gap-1">
            {pins.hypothesisIds.map((id) => (
              <PinChip
                key={id}
                label={hypById.get(id)?.title ?? id.slice(0, 8)}
                meta={hypById.get(id)?.symbols?.join(', ') ?? id}
                onJump={() => jumpHypothesis(id)}
                onRemove={() => pins.unpinHypothesis(id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {pins.hits.length > 0 ? (
        <div className="space-y-1">
          <PinSectionHeader title="Discovery hits" count={pins.hits.length} />
          <div className="flex flex-wrap gap-1">
            {pins.hits.map((h) => (
              <PinChip
                key={`${h.kind}:${h.symbol}:${h.ts}`}
                label={h.symbol}
                meta={`${h.kind} · ${h.originPage}`}
                onJump={() => jumpHit(h.originPage, h.symbol)}
                onRemove={() => pins.unpinHit(h)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
