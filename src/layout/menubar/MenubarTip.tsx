/**
 * The menu bar's hover tip (design Rev .60 §1): every item is "icon + number",
 * and the words live here — a small glass card under the item, right-aligned,
 * after 350ms (macOS's own delay), never while that item's popover is open.
 * The items carry no native `title`, so there is one tip, not two.
 */
import { forwardRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import css from './menubar.module.css'

type TriggerProps = ComponentPropsWithoutRef<typeof TooltipTrigger>

/**
 * Forwards its ref and any other props to the trigger, so it can sit inside
 * another `asChild` trigger (a Popover's) as well as around one.
 */
export const MenubarTip = forwardRef<HTMLButtonElement, TriggerProps & {
  tip: ReactNode
  /** The item's popover is open: its tip stays down. */
  suppressed?: boolean
  children: ReactNode
}>(function MenubarTip({ tip, suppressed = false, children, ...rest }, ref) {
  const [open, setOpen] = useState(false)
  return (
    <Tooltip open={open && !suppressed} onOpenChange={setOpen} delayDuration={350}>
      <TooltipTrigger asChild ref={ref} {...rest}>
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" sideOffset={6} className={css.tip}>
        {tip}
      </TooltipContent>
    </Tooltip>
  )
})
