import { QueryClient } from '@tanstack/react-query'

/*
 * Side-effect import: registers our custom focus/idle manager with
 * TanStack Query.  This makes `refetchIntervalInBackground: false` and
 * `refetchOnWindowFocus` actually work in Cursor's embedded browser
 * (where `document.visibilityState` never becomes "hidden").
 * See src/lib/appFocus.ts for the contract.
 */
import './appFocus'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 2,
      refetchOnWindowFocus: false,
      // Explicit for Cursor-Browser compatibility (see appFocus.ts).
      // TanStack Query gates the refetch timer on focusManager.isFocused()
      // when this flag is false; our idle manager drives that value.
      refetchIntervalInBackground: false,
    },
  },
})
