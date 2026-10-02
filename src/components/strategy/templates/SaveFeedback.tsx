import {
  optionCategorySaveFeedbackClass,
} from '@/components/strategy/templates/optionCategoryUi'

/** The last save's outcome, per section; a refusal carries the server's reason. */
export type SaveFeedbackState = { section: string; ok: boolean; message?: string } | null

export function SaveFeedback({
  section,
  feedback,
}: {
  section: string
  feedback: SaveFeedbackState
}) {
  if (feedback?.section !== section) return null
  return (
    <span className={optionCategorySaveFeedbackClass(feedback.ok)} role={feedback.ok ? undefined : 'alert'}>
      {feedback.ok ? 'Saved' : feedback.message ? `Not saved — ${feedback.message}` : 'Error'}
    </span>
  )
}
