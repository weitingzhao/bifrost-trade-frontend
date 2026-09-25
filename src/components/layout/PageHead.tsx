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
import { useCallback, useEffect } from 'react'
import { PageHead as UiPageHead, type PageHeadProps as UiPageHeadProps } from '@bifrost/ui'

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

export function PageHead(props: PageHeadProps) {
  useEffect(() => () => broadcast(null), [])
  const onTitleVisible = useCallback((visible: boolean) => broadcast(visible ? 'in' : 'out'), [])
  return <UiPageHead {...props} onTitleVisible={onTitleVisible} />
}
