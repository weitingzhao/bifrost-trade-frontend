/**
 * The Symbol page's AsofTag — the first page it lands on (contract §11.10:
 * "Symbol 页眉落地示范").
 *
 * The session comes from the exhibits the regime ribbon already asked for — the
 * same query, so no second request — and the verdict from signal health, the
 * same query Copilot's signature line reads. Judged by Research (Design,
 * 2026-09-13 ⑤); the Ops doctor's flag joins this component later, when its
 * endpoint is cached.
 */
import { AsofTag } from '@/components/AsofTag'
import { useExhibitComposite } from '@/hooks/useExhibitComposite'
import { useSignalHealthSummary } from '@/hooks/useCopilotStanding'
import { failedLensFlag, healthFlag, oldestAsof } from '@/lib/asofTag'
import { RIBBON_LENSES } from '@/lib/regimeRibbon'

export function SymbolAsofTag({ symbol }: { symbol: string }) {
  const exhibits = useExhibitComposite(RIBBON_LENSES, symbol)
  const health = useSignalHealthSummary()

  const rows = exhibits.data ?? []
  // A read verdict first — a failed lens is narrower news than a degraded service.
  const flag =
    healthFlag(health.data, { loading: health.isLoading, error: health.isError }) ?? failedLensFlag(rows)

  return (
    <AsofTag
      asof={exhibits.isLoading ? null : oldestAsof(rows.filter((r) => r.verdict?.band != null))}
      flag={flag}
      judgedBy="Research"
      href="/research/signal-health"
    />
  )
}
