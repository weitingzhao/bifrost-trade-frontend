import type { UnderlyingEntry } from '@/types/modelAnalysis'
import { fmtUsd } from '@/lib/format'
import {
  CAR_SECTION_INTRO,
  carExplainCodeBody,
  carExplainCodeTitle,
  carLegTypeDescription,
} from '@/utils/modelAnalysisExplain'
import {
  fmtIvShockLabel,
  fmtRatioAsPct,
  fmtSpotPrice,
  fmtSpotShockLabel,
} from '@/utils/modelAnalysisFormat'
import {
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  InlinePnl,
  NestedDenseTable,
  denseTableNumCell,
} from '@/components/data-display'
import { StressMethodologyIntro } from './StressMethodologyIntro'
import {
  modelAnalysisCarBlockClass,
  modelAnalysisCarTitleClass,
  modelAnalysisCodeRefClass,
  modelAnalysisDetailStackClass,
  modelAnalysisMetaMutedClass,
  modelAnalysisMetaRowClass,
  modelAnalysisMethodCodeClass,
  modelAnalysisProseClass,
  modelAnalysisScenarioLineClass,
  modelAnalysisSubheadingClass,
} from './modelAnalysisUi'

interface Props {
  entry: UnderlyingEntry
}

export function UnderlyingDetailPanel({ entry: u }: Props) {
  const car = u.capital_at_risk
  const explainTitle = carExplainCodeTitle(car.explain)
  const explainBody = carExplainCodeBody(car.explain)

  return (
    <div className={modelAnalysisDetailStackClass}>
      <div className={modelAnalysisMetaRowClass}>
        <div>
          <span className={modelAnalysisMetaMutedClass}>Net premium:</span> {fmtUsd(u.net_premium)}
        </div>
        <div>
          <span className={modelAnalysisMetaMutedClass}>Breakeven:</span>{' '}
          {u.breakeven_prices.length > 0
            ? u.breakeven_prices.map(b => `$${b.toFixed(2)}`).join(', ')
            : '—'}
        </div>
        {u.naked_short_call_contracts > 0 && (
          <div>
            <span className={modelAnalysisMetaMutedClass}>Naked short calls:</span>{' '}
            {u.naked_short_call_contracts} contract{u.naked_short_call_contracts > 1 ? 's' : ''}
            {u.hedged_max_loss != null && <> (hedged max loss: {fmtUsd(u.hedged_max_loss)})</>}
          </div>
        )}
        <div>
          <span className={modelAnalysisMetaMutedClass}>Stock:</span> {u.stock_qty} shares
          {u.stock_avg_cost != null && <> @ ${u.stock_avg_cost.toFixed(2)}</>}
        </div>
        {u.annualized_loss_on_car != null && (
          <div>
            <span className={modelAnalysisMetaMutedClass}>Annualized loss/CAR:</span>{' '}
            {fmtRatioAsPct(u.annualized_loss_on_car)}
          </div>
        )}
      </div>

      <section aria-labelledby={`car-heading-${u.symbol}`}>
        <h4 id={`car-heading-${u.symbol}`} className={modelAnalysisSubheadingClass}>
          Capital at risk (CAR)
        </h4>
        <p className={modelAnalysisProseClass}>{CAR_SECTION_INTRO}</p>
        <div className={modelAnalysisProseClass} style={{ marginTop: '0.375rem' }}>
          <span className={modelAnalysisMetaMutedClass}>Effective CAR:</span>{' '}
          <strong>
            {car.has_unbounded ? 'N/A (unbounded leg)' : fmtUsd(car.effective)}
          </strong>
        </div>
        <div className={modelAnalysisCarBlockClass}>
          <div className={modelAnalysisCarTitleClass}>{explainTitle}</div>
          <p className={modelAnalysisProseClass}>{explainBody}</p>
          <div className={modelAnalysisCodeRefClass}>API code: {car.explain}</div>
        </div>
        {car.leg_details && car.leg_details.length > 0 && (
          <div className="mt-2">
            <p className={`${modelAnalysisProseClass} mb-2`}>
              Per-leg heuristic (not additive when Explain = net portfolio max loss)
            </p>
            <NestedDenseTable>
              <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead align="right">Strike</DenseTableHead>
                <DenseTableHead>R</DenseTableHead>
                <DenseTableHead align="right">Qty</DenseTableHead>
                <DenseTableHead align="right">CAR</DenseTableHead>
                <DenseTableHead>Rule</DenseTableHead>
                <DenseTableHead>Description</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {car.leg_details.map((leg, i) => (
                <DenseTableRow key={i}>
                  <DenseTableCell className={denseTableNumCell}>{leg.strike}</DenseTableCell>
                  <DenseTableCell>{leg.right}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{leg.qty}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {leg.car == null ? '∞' : fmtUsd(leg.car)}
                  </DenseTableCell>
                  <DenseTableCell>
                    <code className={modelAnalysisMethodCodeClass}>{leg.type}</code>
                  </DenseTableCell>
                  <DenseTableCell className="font-sans text-[length:var(--text-dense-meta)]">
                    {carLegTypeDescription(leg.type)}
                  </DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
            </NestedDenseTable>
          </div>
        )}
      </section>

      {u.max_gain_sample_scenario && (
        <div className={modelAnalysisScenarioLineClass}>
          <strong>Best sample scenario</strong> (S={fmtSpotPrice(u.max_gain_sample_scenario.underlying_price)}):
          Options {fmtUsd(u.max_gain_sample_scenario.options_pnl)}, Stock{' '}
          {fmtUsd(u.max_gain_sample_scenario.stock_pnl)}
        </div>
      )}
      {u.max_loss_scenario && (
        <div className={modelAnalysisScenarioLineClass}>
          <strong>Worst scenario</strong> (S={fmtSpotPrice(u.max_loss_scenario.underlying_price)}):
          Options {fmtUsd(u.max_loss_scenario.options_pnl)}, Stock{' '}
          {fmtUsd(u.max_loss_scenario.stock_pnl)}
        </div>
      )}

      {u.greeks.per_leg && u.greeks.per_leg.length > 0 && (
        <div>
          <strong className={modelAnalysisSubheadingClass}>Option legs</strong>
          <NestedDenseTable className="mt-2">
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead align="right">Strike</DenseTableHead>
                <DenseTableHead>R</DenseTableHead>
                <DenseTableHead align="right">Qty</DenseTableHead>
                <DenseTableHead align="right">IV</DenseTableHead>
                <DenseTableHead align="right">Delta</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {u.greeks.per_leg.map((leg, i) => (
                <DenseTableRow key={i}>
                  <DenseTableCell className={denseTableNumCell}>{leg.strike}</DenseTableCell>
                  <DenseTableCell>{leg.right}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{leg.qty}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {leg.iv != null ? `${(leg.iv * 100).toFixed(1)}%` : '—'}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {leg.delta != null ? leg.delta.toFixed(2) : '—'}
                  </DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </NestedDenseTable>
        </div>
      )}

      {u.stress.available && (u.stress.scenarios?.length ?? 0) > 0 && (
        <div>
          <strong className={modelAnalysisSubheadingClass}>
            Stress test
            {!u.stress.iv_stress_available && (
              <span className={modelAnalysisMetaMutedClass}>
                {' '}(IV stress unavailable for this symbol — intrinsic-only rows)
              </span>
            )}
          </strong>
          <StressMethodologyIntro />
          <NestedDenseTable className="mt-2">
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Spot Δ</DenseTableHead>
                <DenseTableHead>IV Δ</DenseTableHead>
                <DenseTableHead align="right">Opt P&amp;L</DenseTableHead>
                <DenseTableHead align="right">Stock P&amp;L</DenseTableHead>
                <DenseTableHead align="right">Total</DenseTableHead>
                <DenseTableHead>Method</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {u.stress.scenarios!.map((sc, i) => (
                <DenseTableRow key={i}>
                  <DenseTableCell>{fmtSpotShockLabel(sc.spot_shock)}</DenseTableCell>
                  <DenseTableCell>{fmtIvShockLabel(sc.iv_shock)}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{fmtUsd(sc.options_pnl)}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{fmtUsd(sc.stock_pnl)}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    <InlinePnl value={sc.total_pnl}>{fmtUsd(sc.total_pnl)}</InlinePnl>
                  </DenseTableCell>
                  <DenseTableCell>
                    <code className={modelAnalysisMethodCodeClass}>{sc.method ?? '—'}</code>
                  </DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </NestedDenseTable>
        </div>
      )}
    </div>
  )
}
