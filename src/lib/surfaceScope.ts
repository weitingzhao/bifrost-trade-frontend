/**
 * Whether a component is rendering inside a surface (the side panel or the
 * float) rather than as the frame page. A page drawn in both places reads it
 * where the two must differ — a page-wide keyboard shortcut, for one, belongs
 * to the frame, and a panel tab binding the same keys would answer them twice.
 */
import { createContext, useContext } from 'react'

export const InSurfaceContext = createContext(false)

export function useInSurface(): boolean {
  return useContext(InSurfaceContext)
}
