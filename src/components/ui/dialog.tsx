/**
 * @bifrost/ui's Dialog, with the two things this app adds (0.5.0 took the
 * rest: this file was a copy of it).
 *
 * - Every dialog is a macOS sheet (design Rev .72 §5): DialogContent defaults
 *   to `presentation="sheet"` — under the top bar, sliding down, Enter runs
 *   the footer's primary. Spotlight passes `presentation="centered"`.
 * - `stackLayer`: a dialog opened over the Copilot float (z-[190]) and its
 *   dropdowns (z-[220]) has to sit above them.
 * - On a phone (design Rev .163, 契约 §18.5) every dialog but Spotlight is a
 *   bottom sheet — `styles/device.css` places it — and this adds the grip:
 *   tap for the other detent, drag up for full, drag down to drop or close.
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
import { useDevice } from '@/lib/device'
import { SheetGrip } from './SheetGrip'

type DialogStackLayer = 'default' | 'elevated'

const DIALOG_STACK: Record<DialogStackLayer, { overlay: string; content: string }> = {
  default: { overlay: 'z-50', content: 'z-50' },
  elevated: { overlay: 'z-[230]', content: 'z-[231]' },
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof UiDialogContent>,
  React.ComponentPropsWithoutRef<typeof UiDialogContent> & { stackLayer?: DialogStackLayer }
>(({ className, overlayClassName, stackLayer = 'default', presentation = 'sheet', children, ...props }, ref) => {
  const stack = DIALOG_STACK[stackLayer]
  const sheet = React.useRef<HTMLDivElement | null>(null)
  const [full, setFull] = React.useState(false)
  const spotlight = (props as Record<string, unknown>)['data-spotlight'] != null
  const grip = useDevice().device === 'phone' && !spotlight
  const setRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      sheet.current = el
      if (typeof ref === 'function') ref(el)
      else if (ref) ref.current = el
    },
    [ref],
  )
  return (
    <UiDialogContent
      ref={setRef}
      presentation={presentation}
      overlayClassName={cn(stack.overlay, overlayClassName)}
      className={cn(stack.content, className)}
      data-sr-detent={grip && full ? 'full' : undefined}
      {...props}
    >
      {grip ? (
        <SheetGrip
          sheet={sheet}
          full={full}
          onDetent={setFull}
          // Radix closes on Esc wherever focus is; the grip asks the same way.
          onClose={() => sheet.current?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))}
        />
      ) : null}
      {children}
    </UiDialogContent>
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
