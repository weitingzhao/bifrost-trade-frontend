/**
 * Add symbol to Research Candidate Pool (Loop v1).
 */
import type { MouseEvent } from 'react'
import { Plus } from 'lucide-react'
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
  const sym = symbol.trim().toUpperCase()

  async function onClick(e: MouseEvent) {
    e.stopPropagation()
    if (!sym || mutation.isPending) return
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
    } catch {
      // No shared toast helper in this app — stay silent on error.
    }
  }

  return (
    <IconActionButton
      title="Add to Pool"
      ariaLabel={`Add ${sym} to candidate pool`}
      size={size}
      disabled={!sym || mutation.isPending}
      onClick={(e) => void onClick(e)}
      className={cn(className)}
    >
      <Plus className="h-3.5 w-3.5" />
    </IconActionButton>
  )
}
