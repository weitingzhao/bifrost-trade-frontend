import { createContext, useState, type ReactNode } from 'react'

export interface LogPanelContextValue {
  open: boolean
  toggle: () => void
  errorCount: number
  reportErrorCount: (n: number) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const LogPanelContext = createContext<LogPanelContextValue | null>(null)

export function LogPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [errorCount, setErrorCount] = useState(0)

  return (
    <LogPanelContext.Provider value={{
      open,
      toggle: () => setOpen(o => !o),
      errorCount,
      reportErrorCount: setErrorCount,
    }}>
      {children}
    </LogPanelContext.Provider>
  )
}
