/**
 * Enter confirms a sheet (design Rev .72 §5): in an open dialog, Enter runs
 * the footer's primary — its rightmost button — unless focus is on another
 * button or link, or in a text area, where Enter already means something.
 * Esc cancels on its own (Radix).
 */
import { useEffect } from 'react'

export function useSheetEnter(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return
      const a = document.activeElement
      const dialog = a?.closest('[role="dialog"], [role="alertdialog"]')
      if (!dialog || a?.closest('textarea, button, a, [role="button"], [cmdk-root]')) return
      const buttons = dialog.querySelectorAll<HTMLButtonElement>('[data-slot="dialog-footer"] button')
      const primary = buttons[buttons.length - 1]
      if (!primary || primary.disabled) return
      e.preventDefault()
      primary.click()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [])
}
