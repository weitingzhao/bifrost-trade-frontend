/**
 * Global Research Copilot keybinds.
 *
 *   ⌘K / Ctrl+K — toggle Research Copilot panel (alias)
 *   ⌘J / Ctrl+J — toggle Research Copilot panel
 *   Esc        — close panel (unless focus is inside an editable field)
 *
 * Cockpit ("workspace tabs") is hosted inside the same floating panel — a single entry point.
 * Mount once via `useCockpitKeybinds()` from App layout.
 */
import { useEffect } from 'react'
import { copilotBubbleStore } from '@/hooks/useCopilotBubble'

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
      if (meta && (e.key === 'k' || e.key === 'K' || e.key === 'j' || e.key === 'J')) {
        e.preventDefault()
        copilotBubbleStore.getState().toggle()
        return
      }
      if (e.key === 'Escape' && copilotBubbleStore.getState().open) {
        if (isEditableTarget(e.target)) return
        e.preventDefault()
        copilotBubbleStore.getState().close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
