import { InspectorDrawer } from '@/components/positions/InspectorDrawer'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import type { IbAccountSnapshot } from '@/types/monitor'
import { CategoriesFace } from './CategoriesFace'

export type AccountsInspectorState =
  | { type: null }
  | { type: 'stock'; symbol: string; accountId?: string }
  | { type: 'categories' }

export function AccountsInspector({
  state,
  accounts,
  onClose,
  onRefreshed,
}: {
  state: AccountsInspectorState
  accounts: IbAccountSnapshot[]
  onClose: () => void
  onRefreshed: () => void
}) {
  if (state.type === 'stock') {
    return (
      <InspectorDrawer
        state={{ type: 'stock', symbol: state.symbol, accountId: state.accountId }}
        onClose={onClose}
      />
    )
  }
  if (state.type === 'categories') {
    return (
      <RightInspectorShell open ariaLabel="Position categories" onClose={onClose}>
        <CategoriesFace accounts={accounts} onClose={onClose} onRefreshed={onRefreshed} />
      </RightInspectorShell>
    )
  }
  return null
}
