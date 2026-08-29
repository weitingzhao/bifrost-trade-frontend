/**
 * Diff approval card for Copilot write previews (Wave RS-E4.3 · D-RS-E-e).
 * Inline Approve / Reject — no window.confirm.
 */
import { useState } from 'react'
import { Check, X, FileDiff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DenseTag } from '@/components/data-display'
import {
  DiffPayloadRenderer,
  type DiffPreviewPayload,
} from '@/components/cockpit/DiffPayloadRenderer'
import { cn } from '@/lib/utils'

function titleForKind(kind: string): string {
  if (kind === 'create_hypothesis') return 'Create hypothesis'
  if (kind === 'patch_hypothesis') return 'Patch hypothesis'
  if (kind === 'retire_hypothesis') return 'Retire hypothesis'
  if (kind === 'run_backtest') return 'Run backtest'
  if (kind === 'candidate_batch') return 'Propose candidates'
  if (kind === 'hypothesis_draft') return 'Promote to hypothesis'
  if (kind === 'decision_draft') return 'Draft decision'
  if (kind === 'attach_backtest_evidence') return 'Attach backtest evidence'
  if (kind === 'order_intent') return 'Order intent (advisory)'
  return kind || 'Proposed write'
}

export function DiffApprovalCard({
  toolName,
  arguments: toolArgs,
  diff,
  onApprove,
  onReject,
  className,
}: {
  toolName: string
  arguments: Record<string, unknown>
  diff: DiffPreviewPayload
  onApprove: () => Promise<void> | void
  onReject: () => Promise<void> | void
  className?: string
}) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const kind = String(diff.diff_kind ?? 'write')
  const disabled = busy !== null || done !== null

  async function handleApprove() {
    setError(null)
    setBusy('approve')
    try {
      await onApprove()
      setDone('approved')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  async function handleReject() {
    setError(null)
    setBusy('reject')
    try {
      await onReject()
      setDone('rejected')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className={cn(
        'rounded-md border border-warning/40 bg-secondary/50 px-2.5 py-2 space-y-2',
        done === 'approved' && 'border-success/40',
        done === 'rejected' && 'border-border/50 opacity-80',
        className,
      )}
      data-testid="diff-approval-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-center gap-1.5">
          <FileDiff className="size-3.5 shrink-0 text-warning" />
          <span className="text-dense-label font-medium truncate">
            {titleForKind(kind)}
          </span>
          <DenseTag variant="warning" size="cell">
            dry-run
          </DenseTag>
        </div>
        <span className="shrink-0 text-dense-micro text-muted-foreground font-mono truncate max-w-[40%]">
          {toolName.replace(/^research\./, '')}
        </span>
      </div>

      <DiffPayloadRenderer
        diffKind={kind}
        preview={diff.preview}
        impact={diff.impact}
      />

      {done === 'approved' ? (
        <p className="text-dense-meta text-success">Approved — executing…</p>
      ) : null}
      {done === 'rejected' ? (
        <p className="text-dense-meta text-muted-foreground">
          Action rejected by user
        </p>
      ) : null}
      {error ? <p className="text-dense-meta text-destructive">{error}</p> : null}

      {!done ? (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-dense-meta"
            disabled={disabled}
            onClick={() => void handleReject()}
          >
            <X className="size-3.5 mr-1" />
            {busy === 'reject' ? 'Rejecting…' : 'Reject'}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-dense-meta"
            disabled={disabled}
            onClick={() => void handleApprove()}
          >
            <Check className="size-3.5 mr-1" />
            {busy === 'approve' ? 'Approving…' : 'Approve'}
          </Button>
        </div>
      ) : null}

      {/* Keep args available for debugging in expand — compact */}
      <details className="text-dense-caption text-muted-foreground">
        <summary className="cursor-pointer select-none">Arguments</summary>
        <pre className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap break-all font-mono">
          {JSON.stringify(toolArgs, null, 0).slice(0, 800)}
        </pre>
      </details>
    </div>
  )
}
