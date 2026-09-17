import type { LedgerMetricExplainKind } from '@/utils/ledger/ledgerMetricExplainKinds'

export type LedgerExplainTarget =
  | { source: 'summary'; kind: LedgerMetricExplainKind; id: string }
  | { source: 'health'; kind: 'commissions' | 'unlinked' }

export type LedgerInspectorState =
  | { type: null }
  | { type: 'explain'; target: LedgerExplainTarget | null }
  | { type: 'reconcile'; focus?: 'undated' | 'diff' }
  | { type: 'links' }
  | { type: 'journal' }
  | { type: 'stock'; symbol: string; accountId?: string }

export type LedgerInspectorFace = 'explain' | 'reconcile' | 'links' | 'journal'

export function faceOfInspector(state: LedgerInspectorState): LedgerInspectorFace | null {
  if (state.type === 'explain') return 'explain'
  if (state.type === 'reconcile') return 'reconcile'
  if (state.type === 'links') return 'links'
  if (state.type === 'journal') return 'journal'
  return null
}
