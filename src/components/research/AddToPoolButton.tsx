/**
 * Add symbol to Research Candidate Pool (Loop v1).
 *
 * The pool is the triage stage: capture something worth a second look without
 * committing to a thesis. Save-as-Hypothesis is the next rung up — use that
 * when you are ready to state what you think is true.
 */
import { useState, type MouseEvent } from 'react'
import { Check, Plus } from 'lucide-react'
import { IconActionButton } from '@/components/data-display'
import { useAddCandidates } from '@/hooks/useCandidates'
import { cn } from '@/lib/utils'

export interface AddToPoolButtonProps {
  symbol: string
  source: string
  score?: number | null
  lens_snapshot?: Record<string, unknown>
  tags?: string[]
  source_ref?: Record<string, unknown>
  size?: 'dense' | 'icon'
  className?: string
}

export function AddToPoolButton({
  symbol,
  source,
  score,
  lens_snapshot,
  tags,
  source_ref,
  size = 'dense',
  className,
}: AddToPoolButtonProps) {
  const mutation = useAddCandidates()
  // Same brief confirmation SaveAsHypothesisButton uses. Without it the click
  // produces no visible result at all, and a capture action you cannot tell
  // succeeded is one people stop using.
  const [savedFlash, setSavedFlash] = useState(false)
  const [failed, setFailed] = useState(false)
  const sym = symbol.trim().toUpperCase()

  async function onClick(e: MouseEvent) {
    e.stopPropagation()
    if (!sym || mutation.isPending) return
    setFailed(false)
    try {
      await mutation.mutateAsync([
        {
          symbol: sym,
          source,
          score: score ?? null,
          lens_snapshot: lens_snapshot ?? {},
          tags: tags ?? [],
          source_ref: source_ref,
        },
      ])
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1600)
    } catch {
      // No shared toast helper in this app — surface failure on the control.
      setFailed(true)
      window.setTimeout(() => setFailed(false), 2400)
    }
  }

  return (
    <IconActionButton
      title={
        savedFlash
          ? `${sym} added to pool`
          : failed
            ? `Could not add ${sym} — retry`
            : 'Add to Pool'
      }
      ariaLabel={`Add ${sym} to candidate pool`}
      size={size}
      tone={failed ? 'danger' : undefined}
      disabled={!sym || mutation.isPending}
      onClick={(e) => void onClick(e)}
      className={cn(className)}
    >
      {savedFlash ? (
        <Check className="h-3.5 w-3.5 text-success" aria-hidden />
      ) : (
        <Plus className="h-3.5 w-3.5" />
      )}
    </IconActionButton>
  )
}
