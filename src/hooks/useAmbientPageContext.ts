/**
 * Keeps the Copilot's ambient view stocked with the page-level context —
 * route, symbol, snapshot date — so ⌘J carries the page even where no
 * `AskCopilotButton` is mounted (Shell Spec §11.0). Mount once, in the shell.
 *
 * A page's own registration (a slug origin, possibly with panel and snapshot)
 * always wins; the shell writes only over nothing or over its own earlier
 * floor. When the page's widget unmounts and clears the store, this quietly
 * puts the route-level context back.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  ambientPageContext,
  isShellAmbientView,
  useOldestAsofOnScreen,
} from '@/lib/copilotPageContext'
import { copilotViewStore, useCopilotView } from '@/store/copilotViewStore'

export function useAmbientPageContext() {
  const { pathname, search } = useLocation()
  const asof = useOldestAsofOnScreen()
  const { view } = useCopilotView()
  const pageOwnsView = view != null && !isShellAmbientView(view)

  useEffect(() => {
    if (pageOwnsView) return
    copilotViewStore.register(ambientPageContext(pathname, search, asof))
  }, [pathname, search, asof, pageOwnsView])
}
