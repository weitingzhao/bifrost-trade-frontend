/**
 * A table row that opens something, the way the design draws it.
 *
 * The prototypes make whole rows navigate — the limit book's rows open the
 * page that owns each reading, the freshness board's open Accounts, the
 * Book's stuck rows open the table they live in. A row where only the first
 * cell is a link reads the same and behaves differently, which is the gap the
 * Owner found on The Book: *"交互没有打磨"*.
 *
 * Three pages grew the same six lines within a day, which is the point at
 * which it should be one. What it carries beyond the click is the part worth
 * sharing: the pointer, and a keyboard route in — a `<tr>` is not focusable
 * and an `onClick` on it is invisible to anyone not using a mouse.
 *
 * A link *inside* such a row must stop the click from reaching it, or it
 * fires both and the row wins.
 */
import { useCallback, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface RowLinkProps {
  role: 'button'
  tabIndex: 0
  className: string
  onClick: () => void
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void
}

export function useRowLink(): (to: string, className?: string) => RowLinkProps {
  const navigate = useNavigate()
  return useCallback(
    (to: string, className?: string) => ({
      role: 'button' as const,
      tabIndex: 0 as const,
      className: cn('cursor-pointer', className),
      onClick: () => navigate(to),
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(to)
        }
      },
    }),
    [navigate],
  )
}

/**
 * A row that picks something on this page rather than opening another one.
 *
 * Same six lines as `useRowLink` minus the navigation: the Review queue picks
 * the trade the panel beside it reviews, Stock ratings picks the symbol the
 * inspector explains. Both grew the pointer and the keyboard route by hand,
 * which is when it becomes one helper — and the Review queue had grown only
 * the pointer, so sixty-eight rows were mouse-only.
 *
 * `aria-pressed` rather than `aria-selected`: the row is a toggle, and
 * `aria-selected` on a `<tr>` means a selectable grid, which this table is
 * not.
 */
export interface RowSelectProps {
  role: 'button'
  tabIndex: 0
  'aria-pressed': boolean
  className: string
  onClick: () => void
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void
}

export function rowSelectProps(
  selected: boolean,
  pick: () => void,
  className?: string,
): RowSelectProps {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-pressed': selected,
    className: cn('cursor-pointer', className),
    onClick: pick,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      pick()
    },
  }
}
