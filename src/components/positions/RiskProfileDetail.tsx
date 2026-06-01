import { useMemo } from 'react'
import { computeRiskProfile } from '@/utils/riskProfile'
import type { RiskProfile } from '@/utils/riskProfile'
import { fmtUsd } from '@/utils/positions'
import { formatRiskHedgedBreakdown } from '@/utils/riskProfile'
import { RiskProfilePayoffChart } from './RiskProfilePayoffChart'
import { RiskProfileScenarioMatrix } from './RiskProfileScenarioMatrix'
import './riskProfileLegacy.css'
import { cn } from '@/lib/utils'
import sheetStyles from './InstanceStrategyPanel.module.css'

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
        variant === 'sheet' && sheetStyles.subSection,
        variant === 'sheet' && sheetStyles.subSectionRisk,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {!hideHeading ? <h4 className={sheetStyles.subHeading}>Risk Profile</h4> : null}

      <div className={variant === 'sheet' ? sheetStyles.subSectionBody : undefined}>
      <div className="risk-profile-top-line">
        <div className="risk-profile-top-segment">
          <span className="risk-profile-top-label">Risk Type</span>
          <span
            className={`coverage-status-badge ${profile.risk_type === 'defined' ? 'risk-badge-defined' : 'risk-badge-unlimited'}`}
          >
            {profile.risk_type === 'defined' ? 'Defined' : 'Unlimited'}
          </span>
        </div>
        <span className="risk-profile-top-divider" aria-hidden>
          |
        </span>
        <div className="risk-profile-top-segment">
          <span className="risk-profile-top-label">Net Premium</span>
          <span className="risk-profile-top-value">{fmtUsd(profile.net_premium)}</span>
        </div>
        <span className="risk-profile-top-divider" aria-hidden>
          |
        </span>
        <div className="risk-profile-top-segment">
          <span className="risk-profile-top-label">Breakeven</span>
          <span className="risk-profile-top-value">
            {profile.breakeven_prices.length > 0
              ? profile.breakeven_prices.map((p) => fmtUsd(p)).join(', ')
              : '—'}
          </span>
        </div>
      </div>

      {hedgedLines.length > 0 ? (
        <ul className="risk-hedged-breakdown">
          {hedgedLines.map((line) => (
            <li key={line} className="risk-unlimited-warning">
              {line}
            </li>
          ))}
        </ul>
      ) : null}

      {showScenarioSummary && hasPayoffChart ? (
        <div className="risk-profile-scenario-payoff-row">
          <div className="risk-profile-scenario-col">
            <div className="risk-profile-scenario-summary risk-profile-scenario-summary--embedded">
              <div className="risk-profile-scenario-summary-head">
                <span className="risk-profile-scenario-summary-label">
                  Scenario P&amp;L (expiration, sampled)
                </span>
                <span className="risk-profile-scenario-summary-hint">
                  · Click <strong>Option</strong> or <strong>Stk</strong> for breakdown.
                </span>
              </div>
              {profile.max_gain == null && profile.max_gain_sample_scenario ? (
                <p className="risk-profile-scenario-note">
                  Max gain row = best total among sampled S; headline may still read{' '}
                  <strong>Unlimited</strong> past last sample.
                </p>
              ) : null}
              <RiskProfileScenarioMatrix profile={profile} />
            </div>
          </div>
          <div
            className={
              'risk-profile-payoff-col' + (showDualPayoffCharts ? ' risk-profile-payoff-col--dual' : '')
            }
          >
            {showDualPayoffCharts && ctxOptionsOnly && profileOptionsOnly ? (
              <div className="risk-profile-payoff-charts">
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
        <div className="risk-profile-scenario-summary">
          <div className="risk-profile-scenario-summary-head">
            <span className="risk-profile-scenario-summary-label">Scenario P&amp;L (expiration, sampled)</span>
            <span className="risk-profile-scenario-summary-hint">
              · Click <strong>Option</strong> or <strong>Stk</strong> for breakdown.
            </span>
          </div>
          <RiskProfileScenarioMatrix profile={profile} />
        </div>
      ) : hasPayoffChart ? (
        showDualPayoffCharts && ctxOptionsOnly && profileOptionsOnly ? (
          <div className="risk-profile-payoff-charts">
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
