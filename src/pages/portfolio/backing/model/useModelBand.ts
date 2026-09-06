/**
 * The impure half of the model band: the accounts from the status snapshot,
 * the one model query, the reader's side override and their table clicks.
 * Everything else is derived, so a page renders the band as
 * `<ModelBandSection {...useModelBand(scope)} />`.
 */
import { useState } from 'react'
import { useModelAnalysis, useModelAnalysisAccounts } from '@/hooks/useModelAnalysis'
import type { PositionsScope } from '@/hooks/usePositionsScope'
import { resolveModelBandAccount, type ModelBandSide } from '@/utils/modelAnalysisAccounts'
import { UNTOUCHED_MODEL_TABLE, modelTableState, resolveModelSymbol, type ModelTableChoice } from './modelDeepLink'
import type { ModelBandProps } from './ModelBandSection'

export function useModelBand(scope: PositionsScope): ModelBandProps {
  const accounts = useModelAnalysisAccounts()
  // Kept while the scope locks the band, so widening the scope restores the reader's choice.
  const [override, setOverride] = useState<ModelBandSide | null>(null)
  const account = resolveModelBandAccount(accounts, scope.accountFilter, override)
  const { data, isLoading, isFetching, error, refetch } = useModelAnalysis(account.accountId)

  const deepLinkSymbol = resolveModelSymbol(data?.per_underlying ?? [], scope.filterSymbol)
  const [choice, setChoice] = useState<ModelTableChoice>(UNTOUCHED_MODEL_TABLE)
  const table = modelTableState(deepLinkSymbol, choice)

  return {
    accounts,
    account,
    onSideChange: setOverride,
    filterSymbol: scope.filterSymbol,
    data,
    isLoading,
    isFetching,
    error,
    onRefresh: () => void refetch(),
    table: {
      ...table,
      onToggle: () => setChoice({ open: !table.open, expandedSymbol: table.expandedSymbol, steeredBy: deepLinkSymbol }),
      onToggleSymbol: (symbol) =>
        setChoice({
          open: true,
          expandedSymbol: table.expandedSymbol === symbol ? null : symbol,
          steeredBy: deepLinkSymbol,
        }),
    },
  }
}
