/**
 * The menu bar's hover tip (design Rev .60 §1, one tooltip since Rev .68 §4):
 * every item is "icon + number", and the words live in its `data-tip`, which
 * the app's one tooltip (`ShellTip`) reads — the same glass card, the same
 * 450ms / warm timing as every other tip. The items carry no native `title`,
 * so there is one tip, not two, and an item whose popover is open shows none
 * (its trigger is `aria-expanded`).
 *
 * A Slot: forwards its ref and any other props to the child, so it can sit
 * inside another `asChild` trigger (a Popover's) as well as around one.
 */
import { forwardRef, type HTMLAttributes, type ReactElement } from 'react'
import { Slot } from 'radix-ui'

export const MenubarTip = forwardRef<
  HTMLElement,
  HTMLAttributes<HTMLElement> & {
    tip: string
    children: ReactElement
  }
>(function MenubarTip({ tip, children, ...rest }, ref) {
  return (
    <Slot.Root ref={ref} data-tip={tip} {...rest}>
      {children}
    </Slot.Root>
  )
})
