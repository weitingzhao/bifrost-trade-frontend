/**
 * Global shell keybinds.
 *
 *   ⌘K / Ctrl+K — Omnibar
 *   ⌘J / Ctrl+J — toggle the Copilot conversation
 *   ⌥1–⌥4     — the dock's four modules, from their rail icons (Rev .26);
 *                ⌘W and ⌘1–9 stay the browser's
 *   Esc        — close the topmost inspector, else the open float
 *                (either way, not while focus is inside an editable field)
 *
 * ⌘K used to be a second key for the Copilot, which meant the app's most
 * conventional shortcut opened a chat panel rather than the place you go to
 * get somewhere. It is the Omnibar now; the Copilot keeps ⌘J, which was always
 * its own.
 *
 * **Esc is stated here rather than left to which listener mounted first.** The
 * inspector goes before the float: it is the thing the reader just opened, and
 * it sits over the page the float is beside. The side panel answers to neither
 * — §5a.8 makes it the companion that stays, so it closes by `×` or by the
 * icon that opened it, the same two ways it did as a dock.
 *
 * Mount once via `useCockpitKeybinds()` from App layout.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { EQUIP_GROUPS } from '@/layout/equip'
import { opensAsPage, placeOf, surfaceForRoute, useSurfaces } from '@/layout/equipSurface'
import { dismissSurface, toggleSurfaceFrom } from '@/layout/equipMotion'
import { toggleThread } from '@/hooks/useCopilotThread'
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
  const { float } = useSurfaces()
  const navigate = useNavigate()
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
        toggleThread()
        return
      }
      // ⌥ + a digit types a glyph on macOS, so an editable field keeps it.
      // The float springs from the module's rail icon, as a click would.
      if (e.altKey && !meta && /^Digit[1-4]$/.test(e.code)) {
        if (isEditableTarget(e.target)) return
        const group = EQUIP_GROUPS[Number(e.code.slice(5)) - 1]
        const surface = group ? surfaceForRoute(group.hub.to) : null
        if (!surface) return
        e.preventDefault()
        // Same blind spot as the rail's click: a closed surface remembered
        // as a page needs the caller to navigate (openSurface's own rule).
        if (surface.canPage && placeOf(surface.key) == null && opensAsPage(surface.key)) {
          navigate(surface.to)
          return
        }
        toggleSurfaceFrom(surface, document.querySelector(`[data-equip-head="${group.id}"]`))
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
        if (float) {
          e.preventDefault()
          dismissSurface(float.key)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [float, navigate])
}
