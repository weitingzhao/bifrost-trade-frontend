import {
  optionCategorySaveFeedbackClass,
} from '@/components/strategy/templates/optionCategoryUi'

export function SaveFeedback({
  section,
  feedback,
}: {
  section: string
  feedback: { section: string; ok: boolean } | null
}) {
  if (feedback?.section !== section) return null
  return (
    <span className={optionCategorySaveFeedbackClass(feedback.ok)}>
      {feedback.ok ? 'Saved' : 'Error'}
    </span>
  )
}
