/**
 * Global Cockpit keybinds — ⌘K / Ctrl+K toggles drawer; Esc closes.
 * Mount once via `useCockpitKeybinds()` from App layout.
 */
import { useEffect } from 'react'
import { cockpitDrawerStore } from '@/hooks/useCockpitDrawer'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('[role="textbox"], [contenteditable="true"]'))
}

export function useCockpitKeybinds() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const metaK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')
      if (metaK) {
        e.preventDefault()
        cockpitDrawerStore.getState().toggle()
        return
      }
      if (e.key === 'Escape' && cockpitDrawerStore.getState().open) {
        if (isEditableTarget(e.target)) return
        e.preventDefault()
        cockpitDrawerStore.getState().close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
