/**
 * @bifrost/ui's Dialog, with the two things this app adds (0.5.0 took the
 * rest: this file was a copy of it).
 *
 * - Every dialog is a macOS sheet (design Rev .72 §5): DialogContent defaults
 *   to `presentation="sheet"` — under the top bar, sliding down, Enter runs
 *   the footer's primary. Spotlight passes `presentation="centered"`.
 * - `stackLayer`: a dialog opened over the Copilot float (z-[190]) and its
 *   dropdowns (z-[220]) has to sit above them.
 *
 * On compact (契约 §18.5) every dialog but Spotlight is a bottom sheet: since
 * D2 the package draws it under the LayoutProvider — the place, the grip, the
 * md / lg full detent (0.15.x B2). Spotlight hangs from the top
 * (`compact="keep"`, styles/device.css).
 */
import * as React from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent as UiDialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@bifrost/ui'
import { cn } from '@/lib/utils'

type DialogStackLayer = 'default' | 'elevated'

const DIALOG_STACK: Record<DialogStackLayer, { overlay: string; content: string }> = {
  default: { overlay: 'z-50', content: 'z-50' },
  elevated: { overlay: 'z-[230]', content: 'z-[231]' },
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof UiDialogContent>,
  React.ComponentPropsWithoutRef<typeof UiDialogContent> & { stackLayer?: DialogStackLayer }
>(({ className, overlayClassName, stackLayer = 'default', presentation = 'sheet', compact, ...props }, ref) => {
  const stack = DIALOG_STACK[stackLayer]
  const spotlight = (props as Record<string, unknown>)['data-spotlight'] != null
  return (
    <UiDialogContent
      ref={ref}
      presentation={presentation}
      compact={compact ?? (spotlight ? 'keep' : 'sheet')}
      overlayClassName={cn(stack.overlay, overlayClassName)}
      className={cn(stack.content, className)}
      {...props}
    />
  )
})
DialogContent.displayName = 'DialogContent'

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
