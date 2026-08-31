import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { bsComputeDetail, impliedVolatility } from '@/utils/blackScholes'
import type { GreeksRow } from '@/types/research'
import { fmtGreek, fmtIV } from './greeksFormat'
import {
  greeksCalcTooltipClass,
  greeksTooltipBodyClass,
  greeksTooltipCompareColClass,
  greeksTooltipCompareGridClass,
  greeksTooltipFooterClass,
  greeksTooltipHeadingClass,
  greeksTooltipKvGridClass,
  greeksTooltipKvKeyClass,
  greeksTooltipMonoClass,
  greeksTooltipSectionClass,
  greeksTooltipWarnClass,
} from './greeksUi'

function fmt4(v: number | null): string {
  return v == null ? '—' : v.toFixed(4)
}

type Props = {
  row: GreeksRow
  pos: { x: number; y: number }
  riskFreeRate: number
}

export function GreeksCalcTooltip({ row, pos, riskFreeRate }: Props) {
  const ivSolved = impliedVolatility(
    row.stock_price,
    row.strike,
    row.t_years,
    riskFreeRate,
    row.market_price,
    row.right.toUpperCase() === 'C' ? 'C' : 'P',
  )

  const local = ivSolved.sigma > 0
    ? bsComputeDetail({
        S: row.stock_price,
        K: row.strike,
        T: row.t_years,
        r: riskFreeRate,
        sigma: ivSolved.sigma,
        right: row.right.toUpperCase() === 'C' ? 'C' : 'P',
      })
    : null

  const sqrtT = row.t_years > 0 ? Math.sqrt(row.t_years) : null
  const lnSK = row.stock_price > 0 && row.strike > 0 ? Math.log(row.stock_price / row.strike) : null
  const sigma = ivSolved.sigma
  const d1Denominator = sigma > 0 && sqrtT != null ? sigma * sqrtT : null

  const style: React.CSSProperties = {
    left: pos.x + 20,
    top: pos.y - 8,
  }

  const rightLabel = row.right.toUpperCase() === 'C' ? 'Call' : 'Put'

  return createPortal(
    <div className={greeksCalcTooltipClass} style={style}>
      <div className={greeksTooltipBodyClass}>
        <section className={greeksTooltipSectionClass}>
          <div className={greeksTooltipHeadingClass}>Inputs</div>
          <div className={greeksTooltipKvGridClass}>
            <span className={greeksTooltipKvKeyClass}>S</span><span>${row.stock_price.toFixed(2)}</span>
            <span className={greeksTooltipKvKeyClass}>K</span><span>${row.strike.toFixed(2)}</span>
            <span className={greeksTooltipKvKeyClass}>T</span>
            <span>{row.t_days} days = {row.t_years.toFixed(4)} yr</span>
            <span className={greeksTooltipKvKeyClass}>r</span><span>{(riskFreeRate * 100).toFixed(2)}%</span>
            <span className={greeksTooltipKvKeyClass}>Right</span><span>{rightLabel}</span>
            <span className={greeksTooltipKvKeyClass}>Mkt price</span><span>${row.market_price.toFixed(4)}</span>
          </div>
        </section>

        <section className={greeksTooltipSectionClass}>
          <div className={greeksTooltipHeadingClass}>IV (Newton-Raphson)</div>
          {ivSolved.sigma > 0 ? (
            <p className={greeksTooltipMonoClass}>
              σ₀ = 0.300 → {ivSolved.iterations} iter → IV ={' '}
              <strong>{(ivSolved.sigma * 100).toFixed(2)}%</strong>
              {!ivSolved.converged && (
                <span className={greeksTooltipWarnClass}> (not fully converged)</span>
              )}
            </p>
          ) : (
            <p className={cn(greeksTooltipMonoClass, greeksTooltipWarnClass)}>
              IV solve failed (deep ITM/OTM or invalid price)
            </p>
          )}
        </section>

        {local && (
          <>
            <section className={greeksTooltipSectionClass}>
              <div className={greeksTooltipHeadingClass}>Black-Scholes d₁ / d₂</div>
              <p className={greeksTooltipMonoClass}>
                d₁ = [ln(S/K) + (r + σ²/2)·T] / (σ√T)<br />
                {'  '}ln(S/K) = {lnSK != null ? lnSK.toFixed(5) : '—'}<br />
                {'  '}σ√T = {d1Denominator != null ? d1Denominator.toFixed(5) : '—'}<br />
                {'  '}d₁ = <strong>{fmt4(local.d1)}</strong><br />
                {'  '}d₂ = <strong>{fmt4(local.d2)}</strong>
              </p>
            </section>

            <section className={greeksTooltipSectionClass}>
              <div className={greeksTooltipHeadingClass}>Greeks</div>
              <div className={greeksTooltipKvGridClass}>
                <span className={greeksTooltipKvKeyClass}>Δ</span><span>{fmt4(local.delta)}</span>
                <span className={greeksTooltipKvKeyClass}>Γ</span><span>{fmt4(local.gamma)}</span>
                <span className={greeksTooltipKvKeyClass}>Θ/day</span><span>{fmt4(local.theta)} $/day</span>
                <span className={greeksTooltipKvKeyClass}>ν/1%</span><span>{fmt4(local.vega)}</span>
              </div>
            </section>

            <section className={greeksTooltipFooterClass}>
              BS model price = {local.price.toFixed(4)}
              {'  '}
              error = {Math.abs(local.price - row.market_price).toFixed(4)}
              {' '}
              ({row.market_price > 0
                ? ((Math.abs(local.price - row.market_price) / row.market_price) * 100).toFixed(2)
                : '—'}%)
            </section>
          </>
        )}

        {ivSolved.sigma > 0 && (row.iv != null || row.delta != null) && (
          <section className={greeksTooltipFooterClass}>
            <div className={greeksTooltipHeadingClass}>Server vs local</div>
            <div className={greeksTooltipCompareGridClass}>
              <span />
              <span className={greeksTooltipCompareColClass}>Server</span>
              <span className={greeksTooltipCompareColClass}>Local</span>
              {row.iv != null && local && (
                <>
                  <span className={greeksTooltipKvKeyClass}>IV</span>
                  <span className="text-right">{fmtIV(row.iv)}</span>
                  <span className="text-right">{fmtIV(ivSolved.sigma)}</span>
                </>
              )}
              {row.delta != null && local && (
                <>
                  <span className={greeksTooltipKvKeyClass}>Δ</span>
                  <span className="text-right">{fmtGreek(row.delta, 4)}</span>
                  <span className="text-right">{fmtGreek(local.delta, 4)}</span>
                </>
              )}
              {row.gamma != null && local && (
                <>
                  <span className={greeksTooltipKvKeyClass}>Γ</span>
                  <span className="text-right">{fmtGreek(row.gamma, 4)}</span>
                  <span className="text-right">{fmtGreek(local.gamma, 4)}</span>
                </>
              )}
              {row.theta != null && local && (
                <>
                  <span className={greeksTooltipKvKeyClass}>Θ/day</span>
                  <span className="text-right">{fmtGreek(row.theta, 4)}</span>
                  <span className="text-right">{fmtGreek(local.theta, 4)}</span>
                </>
              )}
              {row.vega != null && local && (
                <>
                  <span className={greeksTooltipKvKeyClass}>ν/1%</span>
                  <span className="text-right">{fmtGreek(row.vega, 4)}</span>
                  <span className="text-right">{fmtGreek(local.vega, 4)}</span>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </div>,
    document.body,
  )
}
