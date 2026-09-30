import { InspectorDrawer } from '@/components/positions/InspectorDrawer'

export type AccountsInspectorState =
  | { type: null }
  | { type: 'stock'; symbol: string; accountId?: string }

export function AccountsInspector({ state, onClose }: { state: AccountsInspectorState; onClose: () => void }) {
  if (state.type === 'stock') {
    return (
      <InspectorDrawer
        state={{ type: 'stock', symbol: state.symbol, accountId: state.accountId }}
        onClose={onClose}
      />
    )
  }
  return null
}
