import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Inline thread title editor. Shared by the 440 title switcher and Desk
 * Threads (Design 2026-09-15 D1). Empty commit is a no-op; Escape cancels.
 */
export function SessionRenameField({
  initial,
  onCommit,
  onCancel,
  ariaLabel = 'Rename thread',
}: {
  initial: string
  onCommit: (v: string) => void
  onCancel: () => void
  ariaLabel?: string
}) {
  const [text, setText] = useState(initial)
  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-1"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <Input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') {
            e.preventDefault()
            onCommit(text)
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          }
        }}
        onBlur={() => onCommit(text)}
        className="h-6 px-1.5 text-dense-meta"
        aria-label={ariaLabel}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-5 w-5 text-success"
        aria-label="Save rename"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommit(text)}
      >
        <Check className="size-3" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-5 w-5 text-muted-foreground"
        aria-label="Cancel rename"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onCancel}
      >
        <X className="size-3" />
      </Button>
    </div>
  )
}
