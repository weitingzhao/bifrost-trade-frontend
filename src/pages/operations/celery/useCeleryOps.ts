import { useContext } from 'react'
import { CeleryOpsContext, type CeleryOpsContextValue } from './celeryOpsStore'

export function useCeleryOps(): CeleryOpsContextValue {
  const ctx = useContext(CeleryOpsContext)
  if (!ctx) throw new Error('useCeleryOps must be used within CeleryOpsProvider')
  return ctx
}
