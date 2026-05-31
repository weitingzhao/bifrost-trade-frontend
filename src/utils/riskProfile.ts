import type { RiskProfile } from '@/types/positions'

export interface RiskPosition {
  right: 'C' | 'P'
  strike: number
  qty: number
  premium: number
}

export function computeRiskProfile(
  optionPositions: RiskPosition[],
  coveredShares: number = 0,
  coveredAvgCost: number = 0,
): RiskProfile {
  if (optionPositions.length === 0) {
    return { max_gain: null, max_loss: null, risk_type: 'unknown', breakeven_points: [] }
  }

  const strikes = optionPositions.map((p) => p.strike)
  const minStrike = Math.min(...strikes)
  const maxStrike = Math.max(...strikes)
  const range = maxStrike - minStrike
  const step = Math.max(0.5, range / 200)
  const evalPoints: number[] = []

  for (let s = Math.max(0, minStrike - range * 0.5); s <= maxStrike + range * 0.5; s += step) {
    evalPoints.push(s)
  }
  evalPoints.push(0)

  function payoffAt(spot: number): number {
    let pnl = 0
    for (const pos of optionPositions) {
      const intrinsic = pos.right === 'C'
        ? Math.max(0, spot - pos.strike)
        : Math.max(0, pos.strike - spot)
      pnl += pos.qty * (intrinsic - pos.premium)
    }
    if (coveredShares !== 0) {
      pnl += coveredShares * (spot - coveredAvgCost)
    }
    return pnl
  }

  let maxGain = -Infinity
  let maxLoss = Infinity

  for (const spot of evalPoints) {
    const pnl = payoffAt(spot)
    if (pnl > maxGain) maxGain = pnl
    if (pnl < maxLoss) maxLoss = pnl
  }

  const hasNakedShort = optionPositions.some((p) => p.qty < 0)
  const hasUncoveredCall = optionPositions.some(
    (p) => p.right === 'C' && p.qty < 0,
  ) && coveredShares <= 0

  let riskType: RiskProfile['risk_type'] = 'defined'
  if (hasUncoveredCall) riskType = 'unlimited'
  else if (hasNakedShort && maxLoss < -1_000_000) riskType = 'unlimited'

  if (!Number.isFinite(maxGain) || maxGain === -Infinity) maxGain = 0
  if (!Number.isFinite(maxLoss) || maxLoss === Infinity) maxLoss = 0

  const breakevens: number[] = []
  for (let i = 1; i < evalPoints.length; i++) {
    const prev = payoffAt(evalPoints[i - 1])
    const curr = payoffAt(evalPoints[i])
    if ((prev <= 0 && curr >= 0) || (prev >= 0 && curr <= 0)) {
      const ratio = Math.abs(prev) / (Math.abs(prev) + Math.abs(curr))
      const be = evalPoints[i - 1] + ratio * (evalPoints[i] - evalPoints[i - 1])
      breakevens.push(Math.round(be * 100) / 100)
    }
  }

  return {
    max_gain: Math.round(maxGain * 100) / 100,
    max_loss: Math.round(maxLoss * 100) / 100,
    risk_type: riskType,
    breakeven_points: breakevens,
  }
}

function formatApproxUsd(v: number): string {
  const sign = v < 0 ? '-' : ''
  return `${sign}$${Math.abs(v).toFixed(2)}`
}

export interface RiskDisplayLabels {
  gainLabel: string
  lossLabel: string
  riskBadge: string
}

/** Main table Max Gain / Loss / Risk badge (Legacy formatRiskLabel). */
export function formatRiskDisplayLabels(profile: RiskProfile): RiskDisplayLabels {
  return {
    gainLabel: profile.max_gain == null ? 'Unlimited' : formatApproxUsd(profile.max_gain),
    lossLabel: profile.max_loss == null ? 'Unlimited' : formatApproxUsd(profile.max_loss),
    riskBadge: profile.risk_type === 'defined' ? 'Defined' : profile.risk_type === 'unlimited' ? 'Unlimited' : 'Unknown',
  }
}

/** Short summary line for expanded Risk Profile section. */
export function formatRiskLabel(profile: RiskProfile): string {
  const { riskBadge } = formatRiskDisplayLabels(profile)
  return `Risk: ${riskBadge}`
}
