import { useState } from 'react'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import type { RiskProfile, RiskPosition, RiskScenarioBreakdown } from '@/utils/riskProfile'
import {
  formatRiskUsd,
  legContributionAtS,
  payoffOptionsAtPrice,
  stripNakedShortCalls,
} from '@/utils/riskProfile'

type MatrixExplainSelection = {
  row: 'gain' | 'loss' | 'hedged'
  field: 'option' | 'stk'
  scenario: RiskScenarioBreakdown
}

function matrixExplainKey(s: MatrixExplainSelection): string {
  return `${s.row}-${s.field}-${s.scenario.underlying_price}`
}

function ClickablePnlCell({
  v,
  onClick,
  active,
}: {
  v: number
  onClick: () => void
  active: boolean
}) {
  return (
    <td className="risk-scenario-matrix-click-wrap">
      <button
        type="button"
        className={`risk-scenario-matrix-cell-btn ${v >= 0 ? 'pnl-positive' : 'pnl-negative'}${active ? ' risk-scenario-matrix-cell-btn-active' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        aria-pressed={active}
        aria-label="Show how this value is calculated"
      >
        {formatRiskUsd(v)}
      </button>
    </td>
  )
}

function ScenarioMatrixExplainPanel({
  selection,
  profile,
  onDismiss,
}: {
  selection: MatrixExplainSelection
  profile: RiskProfile
  onDismiss: () => void
}) {
  const ctx = profile.calc_context
  if (!ctx) return null

  const rowTitle =
    selection.row === 'gain' ? 'Max gain' : selection.row === 'loss' ? 'Max loss' : 'Hedged worst'
  const S = selection.scenario.underlying_price
  const positionsForOption: RiskPosition[] =
    selection.row === 'hedged'
      ? stripNakedShortCalls(ctx.positions, profile.naked_short_call_contracts)
      : ctx.positions

  if (selection.field === 'option') {
    const legs = positionsForOption.map((p) => legContributionAtS(p, S))
    const sumOpt = payoffOptionsAtPrice(positionsForOption, S)
    const lines = legs.map((l) => `${l.summary}\n  ${l.detail}`).join('\n\n')
    return (
      <div
        className="risk-scenario-matrix-explain"
        role="region"
        aria-label={`${rowTitle} option P and L`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="risk-scenario-matrix-explain-head">
          <strong>
            {rowTitle} — Option ({formatRiskUsd(selection.scenario.options_pnl)})
          </strong>
          <button
            type="button"
            className="risk-scenario-matrix-explain-close"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
        <p className="risk-scenario-matrix-explain-principle">
          Expiration snapshot at <strong>S = {S.toFixed(2)}</strong> (sample grid: 0, strikes, 2× top strike).
          Intrinsic vs average cost per leg; × |contracts| × 100.
        </p>
        <pre className="risk-scenario-matrix-explain-code">{lines || '(no option legs)'}</pre>
        <p className="risk-scenario-matrix-explain-sum">
          Sum of legs = <strong>{formatRiskUsd(sumOpt)}</strong> — matches the Option cell.
        </p>
      </div>
    )
  }

  const { covered_shares, underlying_avg_cost: avg } = ctx
  const stk = selection.scenario.stock_pnl
  if (covered_shares <= 0) {
    return (
      <div className="risk-scenario-matrix-explain" role="region" onClick={(e) => e.stopPropagation()}>
        <div className="risk-scenario-matrix-explain-head">
          <strong>{rowTitle} — Stk ({formatRiskUsd(stk)})</strong>
          <button type="button" className="risk-scenario-matrix-explain-close" onClick={onDismiss} aria-label="Dismiss">
            ×
          </button>
        </div>
        <p className="risk-scenario-matrix-explain-principle">No covered shares in this model → Stk is 0.</p>
      </div>
    )
  }
  if (avg == null) {
    return (
      <div className="risk-scenario-matrix-explain" role="region" onClick={(e) => e.stopPropagation()}>
        <div className="risk-scenario-matrix-explain-head">
          <strong>{rowTitle} — Stk ({formatRiskUsd(stk)})</strong>
          <button type="button" className="risk-scenario-matrix-explain-close" onClick={onDismiss} aria-label="Dismiss">
            ×
          </button>
        </div>
        <p className="risk-scenario-matrix-explain-principle">
          Covered shares ({covered_shares}) but average cost missing → Stk treated as 0.
        </p>
      </div>
    )
  }

  return (
    <div className="risk-scenario-matrix-explain" role="region" onClick={(e) => e.stopPropagation()}>
      <div className="risk-scenario-matrix-explain-head">
        <strong>
          {rowTitle} — Stk ({formatRiskUsd(stk)})
        </strong>
        <button type="button" className="risk-scenario-matrix-explain-close" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      </div>
      <p className="risk-scenario-matrix-explain-principle">
        Mark-to-spot on <strong>{covered_shares}</strong> coverage share(s) at hypothetical S.
      </p>
      <pre className="risk-scenario-matrix-explain-code">
        {`(S − avgCost) × shares\n= (${S.toFixed(2)} − ${avg}) × ${covered_shares}\n= ${stk.toFixed(2)}`}
      </pre>
    </div>
  )
}

interface Props {
  profile: RiskProfile
}

export function RiskProfileScenarioMatrix({ profile }: Props) {
  const [explainSelection, setExplainSelection] = useState<MatrixExplainSelection | null>(null)

  const g = profile.max_gain_sample_scenario
  const l = profile.max_loss_scenario
  const h = profile.hedged_max_loss_scenario
  const lossUnlimited = profile.max_loss == null

  const pick = (row: MatrixExplainSelection['row'], field: 'option' | 'stk', scenario: RiskScenarioBreakdown) => {
    const next: MatrixExplainSelection = { row, field, scenario }
    setExplainSelection(
      explainSelection && matrixExplainKey(explainSelection) === matrixExplainKey(next) ? null : next,
    )
  }

  const isActive = (row: MatrixExplainSelection['row'], field: 'option' | 'stk', scenario: RiskScenarioBreakdown) =>
    explainSelection != null &&
    matrixExplainKey(explainSelection) === matrixExplainKey({ row, field, scenario })

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <table className="risk-scenario-matrix">
        <thead>
          <tr>
            <th scope="col" className="risk-scenario-matrix-scenario">
              Scenario
            </th>
            <th scope="col" className="risk-scenario-matrix-num">
              Spot
            </th>
            <th scope="col" className="risk-scenario-matrix-num" title="Click value for calculation">
              Option
            </th>
            <th scope="col" className="risk-scenario-matrix-num" title="Click value for calculation">
              Stk
            </th>
            <th scope="col" className="risk-scenario-matrix-num">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="risk-scenario-matrix-row-gain">
            <th scope="row" className="risk-scenario-matrix-scenario-cell">
              <span className="risk-scenario-matrix-scenario-label">Max gain</span>
            </th>
            {g ? (
              <>
                <td className="risk-scenario-matrix-num">{g.underlying_price.toFixed(2)}</td>
                <ClickablePnlCell
                  v={g.options_pnl}
                  active={isActive('gain', 'option', g)}
                  onClick={() => pick('gain', 'option', g)}
                />
                <ClickablePnlCell
                  v={g.stock_pnl}
                  active={isActive('gain', 'stk', g)}
                  onClick={() => pick('gain', 'stk', g)}
                />
                <td className={cn('risk-scenario-matrix-num font-semibold text-success')}>
                  {formatRiskUsd(g.options_pnl + g.stock_pnl)}
                </td>
              </>
            ) : (
              <td colSpan={4} className="risk-scenario-matrix-na">
                —
              </td>
            )}
          </tr>
          <tr className="risk-scenario-matrix-row-loss">
            <th scope="row" className="risk-scenario-matrix-scenario-cell">
              <span className="risk-scenario-matrix-scenario-label">Max loss</span>
            </th>
            {lossUnlimited && !l ? (
              <>
                <td className="risk-scenario-matrix-num risk-scenario-matrix-na">—</td>
                <td colSpan={2} className="risk-scenario-matrix-na">
                  Naked short call tail
                </td>
                <td className="risk-scenario-matrix-num font-semibold text-danger">Unlimited</td>
              </>
            ) : l ? (
              <>
                <td className="risk-scenario-matrix-num">{l.underlying_price.toFixed(2)}</td>
                <ClickablePnlCell
                  v={l.options_pnl}
                  active={isActive('loss', 'option', l)}
                  onClick={() => pick('loss', 'option', l)}
                />
                <ClickablePnlCell
                  v={l.stock_pnl}
                  active={isActive('loss', 'stk', l)}
                  onClick={() => pick('loss', 'stk', l)}
                />
                <td className={cn('risk-scenario-matrix-num font-semibold', pnlColorClass(l.options_pnl + l.stock_pnl))}>
                  {formatRiskUsd(l.options_pnl + l.stock_pnl)}
                </td>
              </>
            ) : (
              <td colSpan={4} className="risk-scenario-matrix-na">
                —
              </td>
            )}
          </tr>
          {lossUnlimited && h ? (
            <tr className="risk-scenario-matrix-row-hedged">
              <th scope="row">Hedged worst</th>
              <td className="risk-scenario-matrix-num">{h.underlying_price.toFixed(2)}</td>
              <ClickablePnlCell
                v={h.options_pnl}
                active={isActive('hedged', 'option', h)}
                onClick={() => pick('hedged', 'option', h)}
              />
              <ClickablePnlCell
                v={h.stock_pnl}
                active={isActive('hedged', 'stk', h)}
                onClick={() => pick('hedged', 'stk', h)}
              />
              <td className={cn('risk-scenario-matrix-num font-semibold', pnlColorClass(h.options_pnl + h.stock_pnl))}>
                {formatRiskUsd(h.options_pnl + h.stock_pnl)}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      {explainSelection ? (
        <ScenarioMatrixExplainPanel
          selection={explainSelection}
          profile={profile}
          onDismiss={() => setExplainSelection(null)}
        />
      ) : null}
    </div>
  )
}
