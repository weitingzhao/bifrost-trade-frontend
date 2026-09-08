import { createContext, useState, type ReactNode } from 'react'

export interface PlatformPanelContextValue {
  open: boolean
  toggle: () => void
  /** Plugins whose lamp is not green — the sidebar badge. */
  attentionCount: number
  reportAttentionCount: (n: number) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const PlatformPanelContext = createContext<PlatformPanelContextValue | null>(null)

export function PlatformPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [attentionCount, setAttentionCount] = useState(0)

  return (
    <PlatformPanelContext.Provider value={{
      open,
      toggle: () => setOpen(o => !o),
      attentionCount,
      reportAttentionCount: setAttentionCount,
    }}>
      {children}
    </PlatformPanelContext.Provider>
  )
}
