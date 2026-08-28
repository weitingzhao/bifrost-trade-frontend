import { useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { IconActionButton } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  askCopilotIntentStore,
  type AskCopilotIntentPayload,
} from '@/store/askCopilotIntentStore'
import { copilotViewStore } from '@/store/copilotViewStore'

interface AskCopilotButtonProps extends AskCopilotIntentPayload {
  size?: 'dense' | 'button'
  className?: string
}

export function AskCopilotButton({
  originPage,
  originLabel,
  symbol,
  date,
  panel,
  snapshot,
  suggestedPrompt,
  size = 'button',
  className,
}: AskCopilotButtonProps) {
  const snapKey = JSON.stringify(snapshot ?? null)

  useEffect(() => {
    copilotViewStore.register({
      originPage,
      originLabel,
      symbol,
      date,
      panel,
      snapshot,
      suggestedPrompt,
    })
  }, [originPage, originLabel, symbol, date, panel, snapKey, suggestedPrompt])

  useEffect(() => {
    return () => copilotViewStore.clear(originPage)
  }, [originPage])

  function openComposer() {
    copilotViewStore.unsuppress()
    askCopilotIntentStore.open({
      originPage,
      originLabel,
      symbol,
      date,
      panel,
      snapshot,
      suggestedPrompt,
    })
  }

  if (size === 'dense') {
    return (
      <IconActionButton
        title="Ask Copilot about this view"
        ariaLabel="Ask Copilot"
        onClick={openComposer}
        className={className}
      >
        <MessageCircle className="h-3.5 w-3.5" />
      </IconActionButton>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={openComposer}
      className={cn('gap-1.5', className)}
      data-testid="ask-copilot-button"
    >
      <MessageCircle className="h-3.5 w-3.5" />
      Ask Copilot
    </Button>
  )
}
