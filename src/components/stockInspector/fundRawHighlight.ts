import type { FundRawData } from '@/types/research'

export interface FundRawHighlight {
  qKeys: Set<string>
  aKeys: Set<string>
  col: 'eps' | 'revenues' | null
}

function qKey(r: { fiscal_year: number; fiscal_quarter: number }): string {
  return `${r.fiscal_year}-Q${r.fiscal_quarter}`
}

function aKey(r: { fiscal_year: number }): string {
  return `${r.fiscal_year}`
}

/** Derive table row/column highlights for the active SEPA fundamental condition. */
export function computeFundRawHighlight(
  activeCond: string | null,
  rawData: FundRawData | undefined,
): FundRawHighlight {
  const qKeys = new Set<string>()
  const aKeys = new Set<string>()
  if (!activeCond || !rawData) return { qKeys, aKeys, col: null }

  const qRows = rawData.quarterly
  const aRows = rawData.annual

  switch (activeCond) {
    case 'eps_q2q_ge_25pct': {
      if (qRows[0]) {
        qKeys.add(qKey(qRows[0]))
        const prior = qRows.find(
          (r) =>
            r.fiscal_year === qRows[0].fiscal_year - 1 &&
            r.fiscal_quarter === qRows[0].fiscal_quarter,
        )
        if (prior) qKeys.add(qKey(prior))
      }
      return { qKeys, aKeys, col: 'eps' }
    }
    case 'rev_q2q_ge_25pct': {
      if (qRows[0]) {
        qKeys.add(qKey(qRows[0]))
        const prior = qRows.find(
          (r) =>
            r.fiscal_year === qRows[0].fiscal_year - 1 &&
            r.fiscal_quarter === qRows[0].fiscal_quarter,
        )
        if (prior) qKeys.add(qKey(prior))
      }
      return { qKeys, aKeys, col: 'revenues' }
    }
    case 'eps_acc_2q': {
      qRows.slice(0, 3).forEach((r) => {
        qKeys.add(qKey(r))
        const prior = qRows.find(
          (p) => p.fiscal_year === r.fiscal_year - 1 && p.fiscal_quarter === r.fiscal_quarter,
        )
        if (prior) qKeys.add(qKey(prior))
      })
      return { qKeys, aKeys, col: 'eps' }
    }
    case 'rev_acc_2q': {
      qRows.slice(0, 3).forEach((r) => {
        qKeys.add(qKey(r))
        const prior = qRows.find(
          (p) => p.fiscal_year === r.fiscal_year - 1 && p.fiscal_quarter === r.fiscal_quarter,
        )
        if (prior) qKeys.add(qKey(prior))
      })
      return { qKeys, aKeys, col: 'revenues' }
    }
    case 'eps_3y_ge_15pct': {
      if (aRows[0]) aKeys.add(aKey(aRows[0]))
      if (aRows[3]) aKeys.add(aKey(aRows[3]))
      return { qKeys, aKeys, col: 'eps' }
    }
    case 'rev_3y_ge_15pct': {
      if (aRows[0]) aKeys.add(aKey(aRows[0]))
      if (aRows[3]) aKeys.add(aKey(aRows[3]))
      return { qKeys, aKeys, col: 'revenues' }
    }
    case 'eps_acc_fy': {
      aRows.slice(0, 3).forEach((r) => aKeys.add(aKey(r)))
      return { qKeys, aKeys, col: 'eps' }
    }
    case 'rev_acc_fy': {
      aRows.slice(0, 3).forEach((r) => aKeys.add(aKey(r)))
      return { qKeys, aKeys, col: 'revenues' }
    }
    default:
      return { qKeys, aKeys, col: null }
  }
}
