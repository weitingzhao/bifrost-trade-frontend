import { createContext, useContext, useState, type ReactNode } from 'react'

interface LogPanelContextValue {
  open: boolean
  toggle: () => void
  errorCount: number
  reportErrorCount: (n: number) => void
}

const LogPanelContext = createContext<LogPanelContextValue | null>(null)

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

export function useLogPanel() {
  const ctx = useContext(LogPanelContext)
  if (!ctx) throw new Error('useLogPanel must be inside LogPanelProvider')
  return ctx
}
