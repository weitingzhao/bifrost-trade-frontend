/**
 * Global shell keybinds.
 *
 *   ⌘K / Ctrl+K — Omnibar
 *   ⌘J / Ctrl+J — toggle Research Copilot panel
 *   Esc        — close the topmost inspector, else the Copilot panel
 *                (either way, not while focus is inside an editable field)
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
import { KEY_COPILOT, KEY_OMNIBAR } from './shortcuts'
import { closeTopInspector } from './inspectorEscape'

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
      if (meta && e.key.toLowerCase() === KEY_OMNIBAR) {
        e.preventDefault()
        omnibar.toggle()
        return
      }
      if (meta && e.key.toLowerCase() === KEY_COPILOT) {
        e.preventDefault()
        copilotDockStore.getState().toggle()
        return
      }
      if (e.key === 'Escape') {
        if (isEditableTarget(e.target)) return
        // The inspector first: it is the thing the reader just opened, and it
        // sits over the page the Copilot is talking about. Stated here rather
        // than left to which listener happened to mount first.
        if (closeTopInspector()) {
          e.preventDefault()
          return
        }
        if (copilotDockStore.getState().open) {
          e.preventDefault()
          copilotDockStore.getState().close()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
