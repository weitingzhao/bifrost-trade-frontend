/**
 * The Symbol page's one auto-insight chip (S6, 2026-09-26). The retired
 * sections each showed a chip when their own lens was decisive, so a hub page
 * could stack four; this page shows one, under the tabs, when any lens is
 * decisive, and hands Copilot every decisive reading with its record to weigh
 * them against each other. Dismissed per name.
 */
import { CopilotAutoInsightChip } from '@/components/research/CopilotAutoInsightChip'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { askCopilotIntentStore } from '@/store/askCopilotIntentStore'
import { copilotViewStore } from '@/store/copilotViewStore'
import type { SymbolFaces } from './useSymbolFaces'

export function SymbolInsightChip({ symbol, faces }: { symbol: string; faces: SymbolFaces }) {
  const decisive = faces.views.flatMap((v) => v.rows).filter((r) => r.band === 'hot' || r.band === 'cold')
  if (!symbol || faces.loading || decisive.length === 0) return null
  const names = decisive.map((r) => r.label).join(', ')
  return (
    <CopilotAutoInsightChip
      key={symbol}
      tone="info"
      message={`${decisive.length} of ${faces.decisive.of} lenses are decisive on ${symbol} (${names}) — each with its own record. Ask Copilot to weigh them against each other.`}
      onAsk={() => {
        copilotViewStore.unsuppress()
        askCopilotIntentStore.open({
          originPage: 'symbol:insight',
          originLabel: 'Symbol',
          symbol,
          snapshot: compactSnapshot(
            Object.fromEntries(
              decisive.map((r) => [r.id, compactSnapshot({ band: r.band, value: r.value, verdict: r.verdict, record: r.rates, n: r.sample })]),
            ),
          ),
          suggestedPrompt: `On ${symbol}, ${decisive.map((r) => r.verdict).join('; ')}. Weigh these calls against each other and against each lens's own record here: which deserves the most weight, and what would change the picture?`,
        })
      }}
    />
  )
}
