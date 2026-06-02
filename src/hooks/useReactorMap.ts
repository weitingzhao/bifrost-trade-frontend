import { useContext } from 'react'
import { ReactorMapContext } from '@/context/ReactorMapContext'

export function useReactorMap() {
  const ctx = useContext(ReactorMapContext)
  if (!ctx) throw new Error('useReactorMap must be used within ReactorMapProvider')
  return ctx
}
