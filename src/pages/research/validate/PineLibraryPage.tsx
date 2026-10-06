/**
 * Research › Validate › Pine library (`/research/pine?script=<id>`, Owner
 * 2026-10-06): the Pine library as a page of its own, with a row in the menu.
 * The same library editor is still Backtest's third tab (design Rev .158 B5);
 * this page gives it a door the menu can name, and every "Manage scripts ↗" /
 * "Pine library ↗" link lands here. Nothing here places an order (D10).
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHead, PageHeadAction, PageShell } from '@/components/layout'
import { useResearchContext } from '@/hooks/useResearchContext'
import { PineLibraryTab } from './PineLibraryTab'

export default function PineLibraryPage() {
  const { symbol } = useResearchContext()
  const heldSymbol = symbol.trim().toUpperCase()
  const [params, setParams] = useSearchParams()
  const [newScriptTick, setNewScriptTick] = useState(0)
  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead
        title="Pine library"
        info="The Pine scripts Research runs in the 22:30 ET trading-day batch. Paste or copy a script, Check it on a symbol, then Save: the screener, the chart, the simulator and signal decay read it from the next batch. Scripts can read option context (IV, VRP, term structure, earnings, SPY) with request.security. Nothing on this page places an order."
        actions={
          <PageHeadAction
            primary
            title="Paste a Pine script — Check it on a symbol, then Save"
            onClick={() => setNewScriptTick((n) => n + 1)}
          >
            ＋ New script
          </PageHeadAction>
        }
      />
      <PineLibraryTab
        selectedId={params.get('script')}
        onSelect={(id) => {
          const next = new URLSearchParams(params)
          if (id) next.set('script', id)
          else next.delete('script')
          setParams(next, { replace: true })
        }}
        newScriptTick={newScriptTick}
        heldSymbol={heldSymbol}
      />
    </PageShell>
  )
}
