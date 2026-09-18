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
 * The same reason is why an emptied box is not a write. Measured on DEV
 * 2026-09-18: the endpoint skips any field that arrives null (`if label is not
 * None`) and answers `{ok: true}` when that leaves nothing to update, so a
 * clear returns success and changes nothing. Renaming is what the design asks
 * for and what this row does; un-naming is refused out loud instead of being
 * reported as saved.
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
  { value: 'running', label: 'running', disabled: true, title: 'Read from fills — this instance still has open legs.' },
  { value: 'paused', label: 'paused', disabled: true, title: 'Nothing stores a paused instance; there is no status column.' },
  { value: 'closed', label: 'closed', disabled: true, title: 'Read from fills — closed when every group has been taken flat.' },
]

const IDLE_NOTE =
  'Rename writes the label and nothing else. running / closed is read from this instance’s fills — a close is never written here, and paused has nowhere to be stored.'

const CANNOT_CLEAR_NOTE =
  'A name cannot be taken off from here: the endpoint reads an empty label as “leave it alone” and would answer saved without writing. Type the name you want instead.'

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
  const canApply = changed && !clearing

  async function apply() {
    if (!canApply || saving) return
    setSaving(true)
    setError(null)
    try {
      await patchStrategyInstance(instance.id, { label: next })
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
    <div className="flex flex-wrap items-center gap-1.5 rounded-[5px] border border-border bg-[var(--sk-raised2)] px-2 py-1.5">
      <span className={positionsUi.cap}>Instance</span>
      <input
        className={cn(positionsUi.input, 'w-42.5')}
        value={draft}
        placeholder={`#${instance.id}`}
        aria-label="Instance label"
        onChange={(e) => {
          setDraft(e.target.value)
          setSaved(false)
          setError(null)
        }}
      />
      <SegmentControl
        size="xs"
        ariaLabel="Instance status"
        options={STATUS_OPTIONS}
        value={instance.status}
        onChange={() => undefined}
      />
      <DenseTag variant="neutral" size="cell" title="Derived from this instance’s fills — not a stored field.">
        from fills
      </DenseTag>
      <button
        type="button"
        className={positionsUi.btn}
        onClick={() => void apply()}
        disabled={!canApply || saving}
        title={
          clearing
            ? 'The endpoint cannot clear a label'
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
          error ? 'text-danger' : clearing ? 'text-warning' : saved ? 'text-success' : 'text-muted-foreground',
        )}
      >
        {error ??
          (clearing
            ? CANNOT_CLEAR_NOTE
            : saved
              ? 'saved — the label only; the daemon is unaffected.'
              : IDLE_NOTE)}
      </span>
    </div>
  )
}
