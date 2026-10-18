/**
 * The page's right-hand slot (design Rev .165, §18.12): a symbol opens here.
 * Its one face is the stock inspector the rest of the app opens — what was the
 * Categories rail keeps only the Symbol face since Rev .115.
 *
 * Three places, one panel (`DetailPane`): a column beside the page while the
 * layout docks, a floating panel over the right edge otherwise, a bottom sheet
 * on compact. It sits in the page lane rather than the shell's inspector slot,
 * so opening it never narrows the area the dock is measured on.
 */
import { useEffect } from 'react'
import { DetailPane } from '@/components/layout/DetailPane'
import { inspectorShell } from '@/components/layout/rightInspectorUi'
import { StockInspectorPanel } from '@/components/positions/StockInspectorPanel'
import { registerInspectorEscape } from '@/lib/cockpit/inspectorEscape'

export type AccountsInspectorState =
  | { type: null }
  | { type: 'stock'; symbol: string; accountId?: string }

export function AccountsInspector({ state, onClose }: { state: AccountsInspectorState; onClose: () => void }) {
  const open = state.type === 'stock'
  // Escape closes it ahead of the Copilot, as it did on the shell's inspector.
  useEffect(() => (open ? registerInspectorEscape(onClose) : undefined), [open, onClose])
  return (
    <DetailPane open={open} onClose={onClose} label="Stock detail">
      <div className={inspectorShell.panel}>
        {state.type === 'stock' ? (
          <StockInspectorPanel symbol={state.symbol} accountId={state.accountId} onClose={onClose} hideWide />
        ) : null}
      </div>
    </DetailPane>
  )
}
