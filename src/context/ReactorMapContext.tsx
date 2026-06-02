import { createContext, useState, type ReactNode } from 'react'

export interface ReactorMapContextValue {
  open: boolean
  toggle: () => void
  alertCount: number
  reportAlertCount: (n: number) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const ReactorMapContext = createContext<ReactorMapContextValue | null>(null)

export function ReactorMapProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [alertCount, setAlertCount] = useState(0)

  return (
    <ReactorMapContext.Provider value={{
      open,
      toggle: () => setOpen(o => !o),
      alertCount,
      reportAlertCount: setAlertCount,
    }}>
      {children}
    </ReactorMapContext.Provider>
  )
}
