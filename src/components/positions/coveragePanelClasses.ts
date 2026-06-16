/** Tailwind class bundles for coverage summary panels and pool table cells. */
export const coveragePanel = {
  summarySection: 'flex flex-col gap-2',
  summaryIntro: 'flex flex-wrap items-baseline gap-2',
  headingRow: 'inline-flex items-center gap-1.5',
  poolsRow:
    'grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] items-start gap-x-4 gap-y-3',
  poolPanel:
    'min-w-0 overflow-x-auto rounded-md border border-border bg-[color-mix(in_srgb,var(--card)_88%,var(--muted))] px-2 py-1.5 pb-2',
  sectionHint: 'mb-1.5 text-xs text-muted-foreground',
  sectionHintSm: 'text-dense-meta',
  poolEmptyExplanation: 'text-xs text-muted-foreground',
  placeholderText: 'text-xs text-muted-foreground',
  totalsLine: 'mb-2 text-xs text-muted-foreground',
  totalItem: 'inline',
  totalLabel: 'font-medium text-foreground',
  totalSep: 'text-muted-foreground',
  cashBp: 'font-mono tabular-nums',
  accountId: 'font-mono text-[0.82em] font-semibold',
  accountHost: 'text-teal-300',
  accountSecondary: 'text-violet-300',
  accountOther: 'text-muted-foreground',
  costAvgCell: 'text-right align-middle leading-tight tabular-nums',
  costAvgPerShare: 'mt-0.5 text-[0.82em] font-medium text-muted-foreground',
  mktValueCell: 'text-right align-middle leading-tight tabular-nums',
  mktValuePerShare: 'mt-0.5 text-[0.82em] font-medium text-muted-foreground',
  heldAmtNarrow: 'min-w-0 max-w-11 w-[2.65rem] px-0.5 box-border',
  availableContracts: 'tabular-nums',
  sharedHint: 'text-[0.78em] text-muted-foreground',
} as const

export function coverageAccountClass(
  accountId: string,
  hostAccountId: string,
  secondaryAccountId: string,
): string {
  const a = (accountId ?? '').trim()
  if (secondaryAccountId && a === secondaryAccountId) {
    return `${coveragePanel.accountId} ${coveragePanel.accountSecondary}`
  }
  if (hostAccountId && a === hostAccountId) {
    return `${coveragePanel.accountId} ${coveragePanel.accountHost}`
  }
  return `${coveragePanel.accountId} ${coveragePanel.accountOther}`
}
