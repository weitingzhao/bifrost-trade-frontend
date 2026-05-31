import { cn } from '@/lib/utils'

export function SaveFeedback({
  section,
  feedback,
}: {
  section: string
  feedback: { section: string; ok: boolean } | null
}) {
  if (feedback?.section !== section) return null
  return (
    <span className={cn('text-xs font-medium', feedback.ok ? 'text-green-600' : 'text-red-500')}>
      {feedback.ok ? 'Saved' : 'Error'}
    </span>
  )
}
