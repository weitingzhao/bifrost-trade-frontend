import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { deleteStrategyInstance } from '@/api/strategy'
import type { StrategyInstance } from '@/types/positions'

interface Props {
  instance: StrategyInstance | null
  onOpenChange: (open: boolean) => void
}

export function InstanceDeleteModal({ instance, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!instance) return
    setDeleting(true)
    setError(null)
    try {
      await deleteStrategyInstance(instance.strategy_instance_id)
      await queryClient.invalidateQueries({ queryKey: ['strategy', 'instances'] })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  const name = instance?.strategy_opportunity_name ?? `Instance #${instance?.strategy_instance_id}`

  return (
    <Dialog open={instance != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Instance</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground py-2">
          Delete <span className="font-medium text-foreground">{name}</span>?
          {instance?.executions_count ? (
            <span className="block mt-1 text-destructive text-xs">
              This instance has {instance.executions_count} execution{instance.executions_count !== 1 ? 's' : ''}.
              Deletion will fail if they are still linked.
            </span>
          ) : null}
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
