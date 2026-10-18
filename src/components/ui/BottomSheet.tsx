/**
 * The bottom sheet (design Rev .163, DESIGN_CONTRACTS §18.5) — what every
 * float becomes on a phone, and the shell's own confirm sheet everywhere.
 *
 * - **Phone**: pinned to the bottom edge, two detents — half (62%) and full
 *   (the top keeps the safe area + 10). The grip: a tap switches detents, a
 *   drag up past 48 goes full, a drag down past 72 drops full to half and
 *   half to closed. A tap on the scrim closes. `material="view"` is the float
 *   glass; `"edit"` is opaque and opens full (DS 0.11.0's rule: dense fields
 *   never sit on blur).
 * - **Pad and desk**: a form sheet dropped from under the top bar, centred,
 *   480 wide — the shell's confirm sheets keep one shape off the phone.
 *
 * Keys: Enter runs the footer's rightmost action (DS `sheetEnter`), Esc closes.
 * Built on Radix's dialog for the focus trap, the portal and Esc.
 *
 * App-level until the first act pages have used it (HANDOFF Rev .163 asks
 * for `BottomSheet` in `@bifrost/ui` 0.14.0); the shape is the proposal.
 */
import { useRef, useState, type ReactNode } from 'react'
import { Dialog as SheetPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { sheetEnter } from '@bifrost/ui'
import { useLayout } from '@/lib/device'
import { cn } from '@/lib/utils'
import { SheetGrip } from './SheetGrip'
import css from './bottomSheet.module.css'

export interface BottomSheetAction {
  /** The button's words — a node, so a trade number can keep its ink and mono. */
  label: ReactNode
  /** Drawn as the primary (accent) — the rightmost action is what Enter runs. */
  primary?: boolean
  disabled?: boolean
  /** Says why, when it is disabled — the button's own title, as on the desk. */
  title?: string
  /** Runs after the sheet starts closing. */
  onRun?: () => void
  /** Keep the sheet open after running (a toggle, a step). */
  keepOpen?: boolean
}

export interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The head's title; `head` replaces the whole head instead. */
  title?: ReactNode
  /** A mono reading after the title (a count, a key). */
  meta?: ReactNode
  head?: ReactNode
  /** The accessible name, when the title is not plain text. */
  label?: string
  /** `view` — glass, opens half; `edit` — opaque, opens full. */
  material?: 'view' | 'edit'
  /** The detent it opens at on a phone (default: half for view, full for edit). */
  detent?: 'half' | 'full'
  actions?: readonly BottomSheetAction[]
  children?: ReactNode
  bodyClassName?: string
  /** No body padding: the caller lays its content edge to edge (a tab strip, a list). */
  flush?: boolean
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  meta,
  head,
  label,
  material = 'view',
  detent,
  actions,
  children,
  bodyClassName,
  flush = false,
}: BottomSheetProps) {
  const phone = useLayout().w === 'compact'
  const startFull = (detent ?? (material === 'edit' ? 'full' : 'half')) === 'full'
  const [full, setFull] = useState(startFull)
  // A sheet re-opened starts at its own detent again, not where it was dragged.
  const [seen, setSeen] = useState(open)
  if (open !== seen) {
    setSeen(open)
    if (open) setFull(startFull)
  }
  const ref = useRef<HTMLDivElement>(null)
  const acts = actions ?? []

  const run = (a: BottomSheetAction) => {
    if (a.disabled) return
    if (!a.keepOpen) onOpenChange(false)
    a.onRun?.()
  }

  return (
    <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className={css.scrim} data-on-phone={phone ? '1' : undefined} />
        <SheetPrimitive.Content
          ref={ref}
          data-slot="bottom-sheet"
          data-sr-bsheet={material}
          data-place={phone ? 'bottom' : 'form'}
          data-sr-detent={phone && full ? 'full' : undefined}
          aria-label={label ?? (typeof title === 'string' ? title : undefined)}
          aria-describedby={undefined}
          className={css.sheet}
          tabIndex={-1}
          // Focus the sheet, not its first control: a ring on ✕ the moment a
          // sheet opens reads as a pressed close.
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            ref.current?.focus({ preventScroll: true })
          }}
          onKeyDown={(e) => {
            if (e.defaultPrevented) return
            // The footer's buttons are this sheet's own; DS sheetEnter reads them by slot.
            sheetEnter(e, e.currentTarget)
          }}
        >
          {phone ? <SheetGrip sheet={ref} full={full} onDetent={setFull} onClose={() => onOpenChange(false)} /> : null}
          {head ?? (
            <div className={css.head} data-sr-head="">
              <SheetPrimitive.Title className={css.title}>{title}</SheetPrimitive.Title>
              {meta != null ? <span className={css.meta}>{meta}</span> : null}
              <SheetPrimitive.Close data-sr-close="" aria-label="Close" title="Close" className={css.close}>
                <X aria-hidden />
              </SheetPrimitive.Close>
            </div>
          )}
          {head != null ? <SheetPrimitive.Title className="sr-only">{label ?? title}</SheetPrimitive.Title> : null}
          <div className={cn(css.body, flush && css.flush, bodyClassName)}>{children}</div>
          {acts.length > 0 ? (
            <div className={css.foot} data-slot="dialog-footer">
              {acts.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  className={css.btn}
                  data-primary={a.primary ? '1' : undefined}
                  disabled={a.disabled}
                  title={a.title}
                  onClick={() => run(a)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  )
}
