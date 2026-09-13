/**
 * Global shell keybinds.
 *
 *   ⌘K / Ctrl+K — Omnibar
 *   ⌘J / Ctrl+J — toggle Research Copilot panel
 *   Esc        — close the Copilot panel (unless focus is inside an editable field)
 *
 * ⌘K used to be a second key for the Copilot, which meant the app's most
 * conventional shortcut opened a chat panel rather than the place you go to
 * get somewhere. It is the Omnibar now; the Copilot keeps ⌘J, which was always
 * its own.
 *
 * Cockpit ("workspace tabs") is hosted inside the same floating panel — a single entry point.
 * Mount once via `useCockpitKeybinds()` from App layout.
 */
import { useEffect } from 'react'
import { copilotDockStore } from '@/hooks/useCopilotDock'
import { omnibar } from '@/lib/omnibar'

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
      const meta = e.metaKey || e.ctrlKey
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        omnibar.toggle()
        return
      }
      if (meta && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault()
        copilotDockStore.getState().toggle()
        return
      }
      if (e.key === 'Escape' && copilotDockStore.getState().open) {
        if (isEditableTarget(e.target)) return
        e.preventDefault()
        copilotDockStore.getState().close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
