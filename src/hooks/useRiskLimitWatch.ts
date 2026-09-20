/**
 * The part of the limit book the shell can afford to watch from every page.
 *
 * Design `_Shell StatusBar.dc.html` puts Risk limits first in the Alerts panel
 * on one argument: a breach is the only thing here that would stop an open, so
 * it has to find you on the pages that have nothing to do with risk. That is a
 * claim about *reach*, not about depth — and reach is what makes it hard. The
 * full book on Limits & Breaches reads the model service per account, the
 * positions book, and Research's β and correlation matrix. Running that from a
 * 24px bar on every page would be the most expensive thing in the app.
 *
 * So the bar watches the lines it can read for free and says which ones it is
 * not reading. "Free" is literal: `useMonitorStatus` is already the app's most
 * shared query and the ceiling is a local setting, so this adds one subscriber
 * and a pure rollup.
 *
 * The rules themselves are not restated here — `limitRules` is called with the
 * readings we have and nulls for the rest, so the line, its direction and its
 * consequence come from the same model the page draws (§14.2). A rule with no
 * reading yields no breach, which is why the omission is safe to express as a
 * null rather than as a second, shorter list of rules.
 */
import { useMemo } from 'react'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { usePressureCeiling } from '@/hooks/usePressureCeiling'
import { rollupMargin } from '@/utils/marginPressure'
import { HOUSE_GATE_PCT } from '@/utils/backingJudgment'
import { RISK_CONCENTRATION_FLOOR } from '@/utils/riskExposure'
import { limitRules, openBreaches, withHeadroom, type LimitRow } from '@/utils/limitsModel'

/** Named on the panel, so "not watched here" is a list rather than a shrug. */
export const UNWATCHED_HERE =
  'Concentration, velocity, Greeks and the gates are computed on Limits & Breaches — they read the model service, the positions book and Research β, which is too much to poll from the status bar on every page. Open that page to hold them against their lines.'

export interface RiskLimitWatch {
  /** Open breaches among the lines the shell reads continuously. */
  breaches: LimitRow[]
  /** The lines it is reading, by name — so the panel can say what it covers. */
  watching: string[]
  /** Nothing has answered yet; a zero here is not an all-clear. */
  isLoading: boolean
}

/**
 * The rules, fed only what the shell reads.
 *
 * Exported for its own test: the load-bearing claim is that feeding nulls for
 * the expensive readings yields *no* breaches from them rather than false ones
 * — an empty reading must not look like a rule at zero.
 */
export function shellLimitRows(r: {
  buyingPowerBuffer: number | null
  bufferFloor: number
  maintenanceOverNlv: number | null
}): LimitRow[] {
  return withHeadroom(
    limitRules({
      topNameShare: null,
      concentrationFloor: RISK_CONCENTRATION_FLOOR,
      clusterShare: null,
      contractsToday: null,
      contractsTodayDate: null,
      newUnderlyingsThisWeek: null,
      buyingPowerBuffer: r.buyingPowerBuffer,
      bufferFloor: r.bufferFloor,
      backingUsed: null,
      backingGate: HOUSE_GATE_PCT,
      maintenanceOverNlv: r.maintenanceOverNlv,
      netBetaDelta: null,
      shortGamma: null,
      nakedShortPuts: null,
    }),
  )
}

export function useRiskLimitWatch(): RiskLimitWatch {
  const { data: status, isLoading } = useMonitorStatus()
  const { ceiling } = usePressureCeiling()

  const margin = useMemo(() => rollupMargin(status?.portfolio?.accounts ?? []), [status])

  const rows = useMemo(
    () =>
      shellLimitRows({
        buyingPowerBuffer: margin.pressure == null ? null : 1 - margin.pressure,
        bufferFloor: 1 - ceiling,
        maintenanceOverNlv:
          margin.netLiquidation > 0 ? margin.maintMarginReq / margin.netLiquidation : null,
      }),
    [margin, ceiling],
  )

  return useMemo(
    () => ({
      breaches: openBreaches(rows),
      // A rule is "watched" when both halves are here: a reading and a line.
      // Maintenance / NLV reads fine and has no line, so it is not one of
      // these — a rule nobody drew a line for cannot be breached, and listing
      // it as watched would promise an alarm that can never fire.
      watching: rows.filter((r) => r.use != null).map((r) => r.name),
      isLoading,
    }),
    [rows, isLoading],
  )
}
