import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Send, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { COPILOT_MODELS, type CopilotModelId } from '@/lib/cockpit/modelCatalog'

export function CopilotComposer({
  model,
  onModelChange,
  onSend,
  onStop,
  streaming = false,
  disabled,
}: {
  model: CopilotModelId
  onModelChange: (id: CopilotModelId) => void
  onSend: (text: string) => void
  onStop?: () => void
  streaming?: boolean
  disabled?: boolean
}) {
  const [text, setText] = useState('')

  // Input is only disabled when: cap breached, or currently streaming.
  // The outer `disabled` covers both — but we still want the Stop button
  // clickable while streaming, so we manage the two states independently.
  const inputDisabled = disabled
  const canSend = !inputDisabled && text.trim().length > 0

  function submit() {
    if (!canSend) return
    onSend(text.trim())
    setText('')
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    submit()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1.5 border-t border-border/50 pt-2">
      <div className="flex items-center gap-1.5">
        <span className="text-dense-caption text-muted-foreground shrink-0">Model</span>
        <Select
          value={model}
          onValueChange={(v) => onModelChange(v as CopilotModelId)}
          disabled={inputDisabled}
        >
          <SelectTrigger className="h-7 text-dense-meta">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COPILOT_MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-dense-meta">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={streaming ? 'Streaming… click ⬛ to stop' : 'Ask about hypotheses, VRP, OpEx…'}
          disabled={inputDisabled}
          className="h-8 text-dense-label"
        />
        {streaming && onStop ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={onStop}
            className="h-8 shrink-0 px-2"
            aria-label="Stop generation"
            title="Stop generation"
          >
            <Square className="size-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="sm"
            disabled={!canSend}
            className="h-8 shrink-0 px-2"
            aria-label="Send"
          >
            <Send className="size-3.5" />
          </Button>
        )}
      </div>
    </form>
  )
}
