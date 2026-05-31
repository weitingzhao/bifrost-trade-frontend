import { Skeleton } from '@/components/ui/skeleton'

/** Shown while a lazy-loaded route chunk is loading. */
export function PageRouteFallback() {
  return (
    <div className="flex flex-col gap-4 p-6 min-h-[40vh]" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}
