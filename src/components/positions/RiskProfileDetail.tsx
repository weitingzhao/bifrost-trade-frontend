import { useMemo } from 'react'
import { computeRiskProfile } from '@/utils/riskProfile'
import type { RiskProfile } from '@/utils/riskProfile'
import { fmtUsd } from '@/utils/positions'
import { formatRiskHedgedBreakdown } from '@/utils/riskProfile'
import { RiskProfilePayoffChart } from './RiskProfilePayoffChart'
import { RiskProfileScenarioMatrix } from './RiskProfileScenarioMatrix'
import { cn } from '@/lib/utils'
import { instancePanel } from './instancePanelClasses'
import styles from './riskProfile.module.css'

interface Props {
  profile: RiskProfile
  /** Hide the inner "Risk Profile" heading when the parent section already has a title. */
  hideHeading?: boolean
  /** Lighter shell for instance detail drawer (no accordion sheet chrome). */
  variant?: 'sheet' | 'instanceDetail'
}

export function RiskProfileDetail({ profile, hideHeading = false, variant = 'sheet' }: Props) {
  const ctx = profile.calc_context
  const profileOptionsOnly = useMemo(() => {
    if (!ctx || ctx.positions.length === 0) return null
    return computeRiskProfile(ctx.positions, 0, null)
  }, [ctx])
  const ctxOptionsOnly = profileOptionsOnly?.calc_context ?? null
  const showDualPayoffCharts = Boolean(
    ctx && ctx.positions.length > 0 && ctx.covered_shares > 0 && ctxOptionsOnly,
  )

  const showScenarioSummary = Boolean(
    ctx &&
      (profile.max_gain_sample_scenario ||
        profile.max_loss_scenario ||
        profile.hedged_max_loss_scenario ||
        profile.max_gain == null ||
        profile.max_loss == null),
  )

  const hasPayoffChart = Boolean(ctx && (ctx.positions.length > 0 || ctx.covered_shares > 0))
  const hedgedLines = formatRiskHedgedBreakdown(profile)

  if (!ctx && profile.net_premium === 0 && profile.breakeven_prices.length === 0) {
    return null
  }

  return (
    <section
      className={cn(
        variant === 'sheet' && instancePanel.subSection,
        variant === 'sheet' && instancePanel.subSectionRisk,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {!hideHeading ? <h4 className={instancePanel.subHeading}>Risk Profile</h4> : null}

      <div className={variant === 'sheet' ? instancePanel.subSectionBody : undefined}>
        <div className={styles.topLine}>
          <div className={styles.topSegment}>
            <span className={styles.topLabel}>Risk Type</span>
            <span
              className={cn(
                'inline-block rounded px-1.5 py-0.5 text-xs font-semibold border',
                profile.risk_type === 'defined'
                  ? 'text-success bg-success-soft border-success/30'
                  : 'text-warning bg-warning-soft border-warning/35',
              )}
            >
              {profile.risk_type === 'defined' ? 'Defined' : 'Unlimited'}
            </span>
          </div>
          <span className={styles.topDivider} aria-hidden>
            |
          </span>
          <div className={styles.topSegment}>
            <span className={styles.topLabel}>Net Premium</span>
            <span className={cn(styles.topValue, 'font-mono')}>{fmtUsd(profile.net_premium)}</span>
          </div>
          <span className={styles.topDivider} aria-hidden>
            |
          </span>
          <div className={styles.topSegment}>
            <span className={styles.topLabel}>Breakeven</span>
            <span className={cn(styles.topValue, 'font-mono')}>
              {profile.breakeven_prices.length > 0
                ? profile.breakeven_prices.map((p) => fmtUsd(p)).join(', ')
                : '—'}
            </span>
          </div>
        </div>

        {hedgedLines.length > 0 ? (
          <ul className={styles.hedgedBreakdown}>
            {hedgedLines.map((line) => (
              <li key={line} className={styles.unlimitedWarning}>
                {line}
              </li>
            ))}
          </ul>
        ) : null}

        {showScenarioSummary && hasPayoffChart ? (
          <div className={styles.scenarioPayoffRow}>
            <div className={styles.scenarioCol}>
              <div className={styles.scenarioSummaryEmbedded}>
                <div className={styles.scenarioSummaryHead}>
                  <span className={styles.scenarioSummaryLabel}>
                    Scenario P&amp;L (expiration, sampled)
                  </span>
                  <span className={styles.scenarioSummaryHint}>
                    · Click <strong>Option</strong> or <strong>Stk</strong> for breakdown.
                  </span>
                </div>
                {profile.max_gain == null && profile.max_gain_sample_scenario ? (
                  <p className={styles.scenarioNote}>
                    Max gain row = best total among sampled S; headline may still read{' '}
                    <strong>Unlimited</strong> past last sample.
                  </p>
                ) : null}
                <RiskProfileScenarioMatrix profile={profile} />
              </div>
            </div>
            <div className={cn(styles.payoffCol, showDualPayoffCharts && styles.payoffColDual)}>
              {showDualPayoffCharts && ctxOptionsOnly && profileOptionsOnly ? (
                <div className={styles.payoffCharts}>
                  <RiskProfilePayoffChart
                    profile={profileOptionsOnly}
                    ctx={ctxOptionsOnly}
                    variant="compact"
                    payoffScope="options_only"
                  />
                  <RiskProfilePayoffChart
                    profile={profile}
                    ctx={ctx!}
                    variant="compact"
                    payoffScope="with_coverage"
                  />
                </div>
              ) : (
                <RiskProfilePayoffChart profile={profile} ctx={ctx!} variant="compact" />
              )}
            </div>
          </div>
        ) : showScenarioSummary ? (
          <div>
            <div className={styles.scenarioSummaryHead}>
              <span className={styles.scenarioSummaryLabel}>Scenario P&amp;L (expiration, sampled)</span>
              <span className={styles.scenarioSummaryHint}>
                · Click <strong>Option</strong> or <strong>Stk</strong> for breakdown.
              </span>
            </div>
            <RiskProfileScenarioMatrix profile={profile} />
          </div>
        ) : hasPayoffChart ? (
          showDualPayoffCharts && ctxOptionsOnly && profileOptionsOnly ? (
            <div className={styles.payoffCharts}>
              <RiskProfilePayoffChart
                profile={profileOptionsOnly}
                ctx={ctxOptionsOnly}
                variant="compact"
                payoffScope="options_only"
              />
              <RiskProfilePayoffChart
                profile={profile}
                ctx={ctx!}
                variant="compact"
                payoffScope="with_coverage"
              />
            </div>
          ) : (
            <RiskProfilePayoffChart profile={profile} ctx={ctx!} variant="compact" />
          )
        ) : null}
      </div>
    </section>
  )
}
