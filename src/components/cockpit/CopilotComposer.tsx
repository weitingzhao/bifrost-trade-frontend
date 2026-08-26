import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
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
  disabled,
}: {
  model: CopilotModelId
  onModelChange: (id: CopilotModelId) => void
  onSend: (text: string) => void
  disabled?: boolean
}) {
  const [text, setText] = useState('')

  function submit() {
    const t = text.trim()
    if (!t || disabled) return
    onSend(t)
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
          disabled={disabled}
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
          placeholder="Ask about hypotheses, VRP, OpEx…"
          disabled={disabled}
          className="h-8 text-dense-label"
        />
        <Button
          type="submit"
          size="sm"
          disabled={disabled || !text.trim()}
          className="h-8 shrink-0 px-2"
          aria-label="Send"
        >
          <Send className="size-3.5" />
        </Button>
      </div>
    </form>
  )
}
