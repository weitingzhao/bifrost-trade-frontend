/**
 * Rename the instance the sheet is already open on.
 *
 * Design DECISIONS 2026-09-18 puts this row in the shared sheet — "PATCH
 * /strategy/instances/:id, label & status only… a close is a fact from fills,
 * never written here."
 *
 * Half of that writes. The rename is a real PATCH, and it is the first caller
 * `patchStrategyInstance` has ever had. The status segment is a **reading**:
 * `strategy_instance` carries four writable columns — label, notes, opened_at,
 * created_at — and none of them is a status. running / closed is derived from
 * the instance's own fills by the Ledger's rule (`readInstances`), which is the
 * design's own point about a close; `paused` has nowhere at all to be stored.
 *
 * So the control keeps its designed shape and says why it cannot be operated,
 * rather than being dropped or wired to a switch that looks like it saved. The
 * difference matters here more than elsewhere: a status that silently failed to
 * persist would make the daemon's book and the hand book disagree about which
 * instances are live.
 *
 * An emptied box takes the name off. Until api 0.3.0 it could not (measured on
 * DEV 2026-09-18: the endpoint skipped a null label and answered ok), so the
 * row refused it out loud; the PATCH now clears on `{label: null}` and refuses
 * a blank string, so a clear sends null and the trade reads as `#id` again.
 *
 * D10 is untouched — a label is a name in the rulebook, not an order.
 */
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { patchStrategyInstance } from '@/api/strategy'
import { cn } from '@/lib/utils'
import { positionsUi } from './positionsUi'

/** The instance this row administers, as the page reads it. */
export interface InstanceAdminReading {
  id: number
  /** The stored label — empty when the instance has never been named. */
  label: string
  /** Derived from the instance's own fills; nothing stores it. */
  status: 'running' | 'closed'
}

const STATUS_OPTIONS = [
  { value: 'running', label: 'running', disabled: true, title: 'Read from fills — this trade still has open legs.' },
  { value: 'paused', label: 'paused', disabled: true, title: 'Nothing stores a paused trade; there is no status column.' },
  { value: 'closed', label: 'closed', disabled: true, title: 'Read from fills — closed when every group has been taken flat.' },
]

const IDLE_NOTE =
  'Rename writes the label and nothing else. running / closed is read from this trade’s fills — a close is never written here, and paused has nowhere to be stored.'

const CLEAR_NOTE = 'Apply takes the name off — the trade reads as its number again.'

export function InstanceAdminRow({ instance }: { instance: InstanceAdminReading }) {
  const queryClient = useQueryClient()
  /** What the server holds, as far as this row knows — moves only on a save. */
  const [stored, setStored] = useState(instance.label)
  const [draft, setDraft] = useState(instance.label)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const next = draft.trim()
  const changed = next !== stored.trim()
  const clearing = changed && next === ''
  const canApply = changed

  async function apply() {
    if (!canApply || saving) return
    setSaving(true)
    setError(null)
    try {
      // A blank label is refused (400); null is how a name is taken off.
      await patchStrategyInstance(instance.id, { label: clearing ? null : next })
      await queryClient.invalidateQueries({ queryKey: ['strategy', 'instances'] })
      setStored(next)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    // Rev .142: a strip of controls has no slab.
    <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5">
      <span className={positionsUi.cap}>Trade</span>
      <input
        className={cn(positionsUi.input, 'w-42.5')}
        value={draft}
        placeholder={`#${instance.id}`}
        aria-label="Trade label"
        onChange={(e) => {
          setDraft(e.target.value)
          setSaved(false)
          setError(null)
        }}
      />
      <SegmentControl
        size="xs"
        ariaLabel="Trade status"
        options={STATUS_OPTIONS}
        value={instance.status}
        onChange={() => undefined}
      />
      <DenseTag variant="neutral" size="cell" title="Derived from this trade’s fills — not a stored field.">
        from fills
      </DenseTag>
      <button
        type="button"
        className={positionsUi.btn}
        onClick={() => void apply()}
        disabled={!canApply || saving}
        title={
          clearing
            ? 'PATCH the label to null — the name comes off'
            : changed
              ? 'PATCH the label — nothing else is written'
              : 'The label is unchanged'
        }
      >
        {saving ? 'Applying…' : 'Apply'}
      </button>
      <span
        className={cn(
          'text-dense-caption leading-normal text-pretty',
          error ? 'text-danger' : saved ? 'text-success' : 'text-muted-foreground',
        )}
      >
        {error ??
          (clearing
            ? CLEAR_NOTE
            : saved
              ? 'saved — the label only; the daemon is unaffected.'
              : IDLE_NOTE)}
      </span>
    </div>
  )
}
