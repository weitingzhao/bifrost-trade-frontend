/**
 * The order sheet's frame (Trade Plans sheet, `data-sr-sheet="lg"`): 920 wide
 * off the right edge over a scrim. Escape or ✕ closes it; a click on the
 * scrim does not, so a half-filled plan is never lost to a stray click.
 *
 * Not the inspector: the sheet is modal and twice the reading width, and the
 * plan card it replaces while open comes back when it closes.
 */
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { registerInspectorEscape } from '@/lib/cockpit/inspectorEscape'

export const PLAN_SHEET_WIDTH_PX = 920

export function PlanSheet({
  label,
  onClose,
  children,
}: {
  label: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => registerInspectorEscape(onClose), [onClose])

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[210] bg-[rgb(4_6_9/0.55)] animate-in fade-in-0 duration-200 motion-reduce:animate-none"
        title="Esc or ✕ closes — a click outside does not, so a half-filled plan is never lost"
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-mat=""
        className="fixed inset-y-2 right-2 z-[211] flex flex-col overflow-hidden rounded-[12px] border border-[color-mix(in_srgb,var(--sk-ink)_10%,transparent)] bg-background shadow-[inset_0_1px_0_color-mix(in_srgb,var(--sk-ink)_8%,transparent),-20px_0_60px_-30px_#000] animate-in fade-in-0 slide-in-from-right-4 duration-[240ms] motion-reduce:animate-none"
        style={{ width: `min(${PLAN_SHEET_WIDTH_PX}px, calc(100vw - 16px))` }}
      >
        {children}
      </div>
    </>,
    document.body,
  )
}
