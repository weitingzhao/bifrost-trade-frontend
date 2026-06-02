import {
  optionCategorySaveFeedbackClass,
} from '@/pages/strategy/optionCategory/optionCategoryUi'

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
