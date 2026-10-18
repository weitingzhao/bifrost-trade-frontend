import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { MoveMenuAt } from './liveMoves'

/**
 * Live's reorder menu (design Rev .175, DESIGN_CONTRACTS §18.3), drawn the way
 * the shell draws its right-click menu (`ShellContextMenu`): a controlled menu
 * opened at the pointer, so a long-press opens it exactly once — the layout
 * provider's 520ms `contextmenu` is the only way in. On compact it takes the
 * shell menu's bottom action sheet (`data-shell-ctx`, rows a finger tall).
 *
 * The zero-size anchor is portaled to `body`: a page ancestor holding a
 * transform would otherwise become the containing block of its
 * `position: fixed` and put the menu somewhere else.
 */
export function LiveMoveMenu({ at, onClose }: { at: MoveMenuAt | null; onClose: () => void }) {
  const menuRef = useRef<HTMLDivElement>(null)
  // Kept past the close: `at` is already null when focus is handed back.
  const backRef = useRef<HTMLElement | null>(null)
  // Grow out of the pointer, as the shell's menu does (Rev .139).
  useLayoutEffect(() => {
    if (at) backRef.current = at.back
    const el = menuRef.current
    if (!at || !el) return
    el.style.setProperty('--morph-origin', 'var(--radix-dropdown-menu-content-transform-origin)')
    el.dataset.morph = 'point'
  }, [at])

  return (
    <DropdownMenu open={at != null} onOpenChange={(open) => (open ? undefined : onClose())} modal={false}>
      {createPortal(
        <DropdownMenuTrigger asChild>
          <span
            aria-hidden
            tabIndex={-1}
            style={{ position: 'fixed', left: at?.x ?? 0, top: at?.y ?? 0, width: 0, height: 0 }}
          />
        </DropdownMenuTrigger>,
        document.body,
      )}
      <DropdownMenuContent
        ref={menuRef}
        align="start"
        side="bottom"
        sideOffset={2}
        className="min-w-[180px] max-w-[320px]"
        data-shell-ctx=""
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          const back = backRef.current
          backRef.current = null
          if (back && document.contains(back)) back.focus({ preventScroll: true })
        }}
      >
        <DropdownMenuLabel className="font-mono text-dense-meta font-bold tracking-[0.04em] text-muted-foreground">
          {at?.label}
        </DropdownMenuLabel>
        {at?.items.map((item) => (
          <DropdownMenuItem key={item.verb} onSelect={() => at.onMove(item.from, item.to)}>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
