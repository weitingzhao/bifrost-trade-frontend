/**
 * The page head every page moves to (design `_Shell PageHead`, §16.10):
 * `@bifrost/ui`'s `PageHead`, plus the one thing the shell needs from it.
 *
 * While the title is on screen the top bar folds the breadcrumb's leaf — the
 * page's name is in one place at a time (§16.12). The head reports it on
 * `<html data-pagehead>` and as a `bifrost:pagehead` event, as the design's
 * does; a page still on the old `PageHeader` reports nothing, so its leaf
 * stays, and no page is ever left without its name during the move.
 */
import { useCallback, useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import { PageHead as UiPageHead, buttonVariants, type PageHeadProps as UiPageHeadProps } from '@bifrost/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PagePlaceButtons } from '@/layout/PagePlaceButtons'

export { PageHeadAction, type PageHeadActionProps, type PageHeadTab } from '@bifrost/ui'

export const PAGEHEAD_EVENT = 'bifrost:pagehead'

export type PageHeadVisibility = 'in' | 'out'

function broadcast(v: PageHeadVisibility | null): void {
  const root = document.documentElement
  if (v == null) delete root.dataset.pagehead
  else root.dataset.pagehead = v
  window.dispatchEvent(new CustomEvent(PAGEHEAD_EVENT, { detail: v }))
}

export type PageHeadProps = Omit<UiPageHeadProps, 'onTitleVisible'>

/**
 * The head's overflow — the shell's own verbs on every page, after the page's
 * actions. One item so far (Rev .97 §8, drawn app-side by the design's own
 * instruction): "Open in new window", for two wide pages side by side. The
 * new window is a plain browser window — no side-panel state rides along, and
 * the held symbol is per-window (sessionStorage) on purpose: two windows
 * looking at two names is what this door is for.
 */
function HeadOverflow() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
        style={{ paddingInline: 6 }}
        aria-label="Page menu"
        title="Page menu"
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => window.open(window.location.href, '_blank', 'noopener')}>
          Open in new window
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PageHead(props: PageHeadProps) {
  useEffect(() => () => broadcast(null), [])
  const onTitleVisible = useCallback((visible: boolean) => broadcast(visible ? 'in' : 'out'), [])
  const actions = (
    <>
      {props.actions}
      {/* Rev .103: a page that can be a surface can go back to being one. */}
      <PagePlaceButtons />
      <HeadOverflow />
    </>
  )
  return <UiPageHead {...props} actions={actions} onTitleVisible={onTitleVisible} />
}

/**
 * A head action that goes somewhere rather than doing something: the same
 * outline register as `PageHeadAction`, but a real link, so it can be opened
 * in a new tab and read by a screen reader as one. `href` is an external
 * console and opens in a new tab; `to` is a route here.
 */
export function PageHeadLink({
  to,
  href,
  title,
  primary = false,
  ink,
  children,
}: {
  to?: string
  href?: string
  title?: string
  /** The page's one main action (§16.10): the accent, solid. At most one. */
  primary?: boolean
  /** A state ink for the label (an Inbox with calls waiting reads amber). */
  ink?: string
  children: ReactNode
}) {
  const cls = buttonVariants({ variant: primary ? 'default' : 'outline', size: 'sm' })
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" title={title} className={cls}>
        {children}
      </a>
    )
  }
  return (
    <Link to={to ?? '/'} title={title} className={cls} style={ink ? { color: ink } : undefined}>
      {children}
    </Link>
  )
}
