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

/**
 * The Symbol surface's Follow / Lock (design Rev .57, the 440 head): follow
 * shows whatever is carried, lock holds the name while the list and the page
 * move. Null outside a Symbol surface — the full page has nothing to lock.
 */
export interface SurfaceSubject {
  locked: boolean
  follow: () => void
  lock: () => void
}

export const SurfaceSubjectContext = createContext<SurfaceSubject | null>(null)

export function useSurfaceSubject(): SurfaceSubject | null {
  return useContext(SurfaceSubjectContext)
}

/**
 * Navigate the frame from inside a surface — the 440 page's ⇢ lifts a section
 * to the full page, which is the frame's to open even when the path is the
 * surface's own. Null outside a surface: there, the router's navigate is it.
 */
export const FrameNavigateContext = createContext<((to: string) => void) | null>(null)

export function useFrameNavigate(): ((to: string) => void) | null {
  return useContext(FrameNavigateContext)
}
