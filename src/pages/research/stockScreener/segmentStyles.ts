import styles from './stock-screener.module.css'

/** Maps group / segment keys to CSS module classes (Legacy ssp-* parity). */
export const SEGMENT = {
  techGroupHeader: {
    vol: styles.ssGroupVol,
    price52: styles.ssGroupPrice52,
    sma: styles.ssGroupSma,
    price: styles.ssGroupPrice,
  } as Record<string, string>,
  techChip: {
    vol: styles.ssChipTechVol,
    price52: styles.ssChipTechPrice52,
    sma: styles.ssChipTechSma,
    price: styles.ssChipTechPrice,
  } as Record<string, string>,
  fundGroupHeader: {
    eps: styles.ssGroupEps,
    rev: styles.ssGroupRev,
  } as Record<string, string>,
  fundChip: {
    eps: styles.ssChipEps,
    rev: styles.ssChipRev,
  } as Record<string, string>,
  extCard: {
    quality: styles.ssCardGroupQuality,
    balance: styles.ssCardGroupBalance,
    cashflow: styles.ssCardGroupCashflow,
    valuation: styles.ssCardGroupValuation,
    profitability: styles.ssCardGroupProfitability,
    efficiency: styles.ssCardGroupEfficiency,
    sentiment: styles.ssCardGroupSentiment,
  } as Record<string, string>,
  extTitle: {
    quality: styles.ssTitleQuality,
    balance: styles.ssTitleBalance,
    cashflow: styles.ssTitleCashflow,
    valuation: styles.ssTitleValuation,
    profitability: styles.ssTitleProfitability,
    efficiency: styles.ssTitleEfficiency,
    sentiment: styles.ssTitleExtSentiment,
  } as Record<string, string>,
  extChip: {
    quality: styles.ssChipExtQuality,
    balance: styles.ssChipExtBalance,
    cashflow: styles.ssChipExtCashflow,
    valuation: styles.ssChipExtValuation,
    profitability: styles.ssChipExtProfitability,
    efficiency: styles.ssChipExtEfficiency,
    sentiment: styles.ssChipExtSentiment,
  } as Record<string, string>,
  tierCard: {
    momentum: styles.ssCardTierMomentum,
    structure: styles.ssCardTierStructure,
    sentiment: styles.ssCardTierSentiment,
  } as Record<string, string>,
  tierTitle: {
    momentum: styles.ssTitleMomentum,
    structure: styles.ssTitleStructure,
    sentiment: styles.ssTitleSentiment,
  } as Record<string, string>,
  tierChip: {
    momentum: styles.ssChipTierMomentum,
    structure: styles.ssChipTierStructure,
    sentiment: styles.ssChipTierSentiment,
  } as Record<string, string>,
  tierScoreVal: {
    momentum: styles.ssScoreValMomentum,
    structure: styles.ssScoreValStructure,
    sentiment: styles.ssScoreValSentiment,
  } as Record<string, string>,
  tierCountBadge: {
    momentum: styles.ssTierCountMomentum,
    structure: styles.ssTierCountStructure,
    sentiment: styles.ssTierCountSentiment,
  } as Record<string, string>,
  momGroupHeader: {
    oscillator: styles.ssGroupMomOscillator,
    roc: styles.ssGroupMomRoc,
    rs: styles.ssGroupMomRs,
    trend: styles.ssGroupMomTrend,
  } as Record<string, string>,
}
