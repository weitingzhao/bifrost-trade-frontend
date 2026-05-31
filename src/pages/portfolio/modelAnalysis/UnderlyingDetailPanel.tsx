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
import { StressMethodologyIntro } from './StressMethodologyIntro'
import styles from '../modelAnalysis.module.css'

interface Props {
  entry: UnderlyingEntry
}

export function UnderlyingDetailPanel({ entry: u }: Props) {
  const car = u.capital_at_risk
  const explainTitle = carExplainCodeTitle(car.explain)
  const explainBody = carExplainCodeBody(car.explain)

  return (
    <div className={styles.detailInner}>
      <div className={styles.detailMeta}>
        <div>
          <span className={styles.detailMetaMuted}>Net premium:</span> {fmtUsd(u.net_premium)}
        </div>
        <div>
          <span className={styles.detailMetaMuted}>Breakeven:</span>{' '}
          {u.breakeven_prices.length > 0
            ? u.breakeven_prices.map(b => `$${b.toFixed(2)}`).join(', ')
            : '—'}
        </div>
        {u.naked_short_call_contracts > 0 && (
          <div>
            <span className={styles.detailMetaMuted}>Naked short calls:</span>{' '}
            {u.naked_short_call_contracts} contract{u.naked_short_call_contracts > 1 ? 's' : ''}
            {u.hedged_max_loss != null && <> (hedged max loss: {fmtUsd(u.hedged_max_loss)})</>}
          </div>
        )}
        <div>
          <span className={styles.detailMetaMuted}>Stock:</span> {u.stock_qty} shares
          {u.stock_avg_cost != null && <> @ ${u.stock_avg_cost.toFixed(2)}</>}
        </div>
        {u.annualized_loss_on_car != null && (
          <div>
            <span className={styles.detailMetaMuted}>Annualized loss/CAR:</span>{' '}
            {fmtRatioAsPct(u.annualized_loss_on_car)}
          </div>
        )}
      </div>

      <section aria-labelledby={`car-heading-${u.symbol}`}>
        <h4 id={`car-heading-${u.symbol}`} className={styles.subheading}>
          Capital at risk (CAR)
        </h4>
        <p className={styles.prose}>{CAR_SECTION_INTRO}</p>
        <div className={styles.prose} style={{ marginTop: '0.375rem' }}>
          <span className={styles.detailMetaMuted}>Effective CAR:</span>{' '}
          <strong>
            {car.has_unbounded ? 'N/A (unbounded leg)' : fmtUsd(car.effective)}
          </strong>
        </div>
        <div className={styles.carExplainBlock}>
          <div className={styles.carExplainTitle}>{explainTitle}</div>
          <p className={styles.prose}>{explainBody}</p>
          <div className={styles.codeRef}>API code: {car.explain}</div>
        </div>
        {car.leg_details && car.leg_details.length > 0 && (
          <div className={styles.nestedTableWrap}>
            <p className={styles.prose} style={{ padding: '0.5rem 0.625rem 0' }}>
              Per-leg heuristic (not additive when Explain = net portfolio max loss)
            </p>
            <table className={styles.nestedTable}>
              <thead>
                <tr>
                  <th>Strike</th>
                  <th>R</th>
                  <th>Qty</th>
                  <th>CAR</th>
                  <th>Rule</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {car.leg_details.map((leg, i) => (
                  <tr key={i}>
                    <td>{leg.strike}</td>
                    <td>{leg.right}</td>
                    <td>{leg.qty}</td>
                    <td>{leg.car == null ? '∞' : fmtUsd(leg.car)}</td>
                    <td><code className={styles.methodCode}>{leg.type}</code></td>
                    <td style={{ fontFamily: 'var(--font-sans)' }}>{carLegTypeDescription(leg.type)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {u.max_gain_sample_scenario && (
        <div className={styles.scenarioLine}>
          <strong>Best sample scenario</strong> (S={fmtSpotPrice(u.max_gain_sample_scenario.underlying_price)}):
          Options {fmtUsd(u.max_gain_sample_scenario.options_pnl)}, Stock{' '}
          {fmtUsd(u.max_gain_sample_scenario.stock_pnl)}
        </div>
      )}
      {u.max_loss_scenario && (
        <div className={styles.scenarioLine}>
          <strong>Worst scenario</strong> (S={fmtSpotPrice(u.max_loss_scenario.underlying_price)}):
          Options {fmtUsd(u.max_loss_scenario.options_pnl)}, Stock{' '}
          {fmtUsd(u.max_loss_scenario.stock_pnl)}
        </div>
      )}

      {u.greeks.per_leg && u.greeks.per_leg.length > 0 && (
        <div>
          <strong className={styles.subheading}>Option legs</strong>
          <div className={styles.nestedTableWrap}>
            <table className={styles.nestedTable}>
              <thead>
                <tr>
                  <th>Strike</th>
                  <th>R</th>
                  <th>Qty</th>
                  <th>IV</th>
                  <th>Delta</th>
                </tr>
              </thead>
              <tbody>
                {u.greeks.per_leg.map((leg, i) => (
                  <tr key={i}>
                    <td>{leg.strike}</td>
                    <td>{leg.right}</td>
                    <td>{leg.qty}</td>
                    <td>{leg.iv != null ? `${(leg.iv * 100).toFixed(1)}%` : '—'}</td>
                    <td>{leg.delta != null ? leg.delta.toFixed(2) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {u.stress.available && (u.stress.scenarios?.length ?? 0) > 0 && (
        <div>
          <strong className={styles.subheading}>
            Stress test
            {!u.stress.iv_stress_available && (
              <span className={styles.detailMetaMuted}>
                {' '}(IV stress unavailable for this symbol — intrinsic-only rows)
              </span>
            )}
          </strong>
          <StressMethodologyIntro />
          <div className={styles.nestedTableWrap}>
            <table className={styles.nestedTable}>
              <thead>
                <tr>
                  <th>Spot Δ</th>
                  <th>IV Δ</th>
                  <th>Opt P&amp;L</th>
                  <th>Stock P&amp;L</th>
                  <th>Total</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {u.stress.scenarios!.map((sc, i) => (
                  <tr key={i}>
                    <td>{fmtSpotShockLabel(sc.spot_shock)}</td>
                    <td>{fmtIvShockLabel(sc.iv_shock)}</td>
                    <td>{fmtUsd(sc.options_pnl)}</td>
                    <td>{fmtUsd(sc.stock_pnl)}</td>
                    <td className={sc.total_pnl >= 0 ? styles.pnlPositive : styles.pnlNegative}>
                      {fmtUsd(sc.total_pnl)}
                    </td>
                    <td><code className={styles.methodCode}>{sc.method ?? '—'}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
