import { useNavigate } from 'react-router-dom'
import { Pin } from 'lucide-react'
import { EmptyState } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { PinChip, PinSectionHeader } from '@/components/cockpit/PinChip'
import { useCockpitPins } from '@/hooks/useCockpitPins'
import { useResearchContext } from '@/hooks/useResearchContext'
import { useHypothesisList } from '@/hooks/useHypotheses'
import { copilotBubbleStore } from '@/hooks/useCopilotBubble'

export function PinsTab() {
  const navigate = useNavigate()
  const { symbol, setSymbol } = useResearchContext()
  const pins = useCockpitPins()
  const hypListQ = useHypothesisList(
    { status: 'active', limit: 50 },
    pins.hypothesisIds.length > 0,
  )

  const hypById = new Map((hypListQ.data?.rows ?? []).map((h) => [h.id, h]))

  function jumpSymbol(sym: string) {
    setSymbol(sym)
    navigate(`/research/daily-brief?symbol=${encodeURIComponent(sym)}`)
    copilotBubbleStore.getState().close()
  }

  function jumpHypothesis(id: string) {
    pins.setFocusedHypothesis(id)
    const h = hypById.get(id)
    const sym = h?.symbols?.[0]
    if (sym) setSymbol(sym)
    navigate(`/research/backtest?tab=event-query&hypothesis_id=${encodeURIComponent(id)}`)
    copilotBubbleStore.getState().close()
  }

  function jumpHit(originPage: string, sym: string) {
    setSymbol(sym)
    const path = originPage.startsWith('/') ? originPage : `/${originPage}`
    const sep = path.includes('?') ? '&' : '?'
    navigate(`${path}${sep}symbol=${encodeURIComponent(sym)}`)
    copilotBubbleStore.getState().close()
  }

  const empty =
    pins.symbols.length === 0 &&
    pins.hypothesisIds.length === 0 &&
    pins.hits.length === 0

  if (empty) {
    return (
      <EmptyState
        icon={<Pin />}
        title="No pins yet"
        description="Pin symbols, hypotheses, or discovery hits to jump back quickly."
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => pins.pinSymbol(symbol)}
          >
            Pin the current symbol ({symbol})
          </Button>
        }
        className="py-10"
      />
    )
  }

  return (
    <div className="space-y-4">
      <section>
        <PinSectionHeader title="Symbols" count={pins.symbols.length} />
        {pins.symbols.length === 0 ? (
          <p className="text-dense-meta text-muted-foreground">No symbols pinned.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {pins.symbols.map((sym) => (
              <PinChip
                key={sym}
                label={sym}
                onJump={() => jumpSymbol(sym)}
                onRemove={() => pins.unpinSymbol(sym)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <PinSectionHeader title="Hypotheses" count={pins.hypothesisIds.length} />
        {pins.hypothesisIds.length === 0 ? (
          <p className="text-dense-meta text-muted-foreground">No hypotheses pinned.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {pins.hypothesisIds.map((id) => {
              const h = hypById.get(id)
              return (
                <PinChip
                  key={id}
                  label={h?.title ?? id.slice(0, 8)}
                  meta={h?.symbols?.join(', ') ?? id}
                  onJump={() => jumpHypothesis(id)}
                  onRemove={() => pins.unpinHypothesis(id)}
                />
              )
            })}
          </div>
        )}
      </section>

      <section>
        <PinSectionHeader title="Discovery hits" count={pins.hits.length} />
        {pins.hits.length === 0 ? (
          <p className="text-dense-meta text-muted-foreground">No discovery hits pinned.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {pins.hits.map((hit) => (
              <PinChip
                key={`${hit.kind}:${hit.symbol}:${hit.ts}`}
                label={hit.symbol}
                meta={`${hit.kind} · ${hit.originPage}`}
                onJump={() => jumpHit(hit.originPage, hit.symbol)}
                onRemove={() => pins.unpinHit(hit)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="pt-1">
        <Button type="button" variant="ghost" size="sm" className="h-7 text-dense-meta" onClick={pins.clear}>
          Clear all pins
        </Button>
      </div>
    </div>
  )
}
