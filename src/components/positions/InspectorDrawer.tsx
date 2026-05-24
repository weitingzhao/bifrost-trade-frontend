import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'

export type InspectorType = 'strategy' | 'stock' | 'option' | null

export interface InspectorState {
  type: InspectorType
  id?: number | null
  symbol?: string
  accountId?: string
  contractKey?: string
}

interface Props {
  state: InspectorState
  onClose: () => void
}

export function InspectorDrawer({ state, onClose }: Props) {
  const open = state.type != null

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>
            {state.type === 'strategy' && `Strategy Instance #${state.id ?? '—'}`}
            {state.type === 'stock' && `Stock: ${state.symbol ?? '—'}`}
            {state.type === 'option' && `Option: ${state.contractKey ?? '—'}`}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 text-sm text-muted-foreground text-center py-12 border border-dashed rounded-lg">
          {state.type === 'strategy' && (
            <p>Strategy Instance detail view — coming soon</p>
          )}
          {state.type === 'stock' && (
            <p>Stock detail for <span className="font-mono font-medium">{state.symbol}</span> in account <span className="font-mono">{state.accountId ?? '—'}</span> — coming soon</p>
          )}
          {state.type === 'option' && (
            <p>Option contract detail for <span className="font-mono font-medium">{state.contractKey}</span> — coming soon</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
