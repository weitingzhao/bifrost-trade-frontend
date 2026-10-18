import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { queryClient } from '@/lib/queryClient'
import { router } from '@/lib/router'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { LayoutHost } from '@/layout/LayoutHost'

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* Rev .68 timing for the Radix tips that remain: 450ms first, then warm for 600. */}
        <TooltipProvider>
          {/* D2 (Rev .176): the package's LayoutProvider, once, inside the tooltip provider. */}
          <LayoutHost>
            <RouterProvider router={router} />
          </LayoutHost>
        </TooltipProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
