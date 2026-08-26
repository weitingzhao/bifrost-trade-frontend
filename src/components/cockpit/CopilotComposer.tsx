import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { COPILOT_MODELS, type CopilotModelId } from '@/lib/cockpit/modelCatalog'
import { useCopilotModels } from '@/hooks/useCopilotModels'

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
  const { data: modelData } = useCopilotModels()

  // Prefer the deployment's actual model list; fall back to the static
  // catalog only if the backend hasn't answered yet (first paint).
  const options = useMemo(() => {
    const rows = modelData?.available ?? []
    if (rows.length > 0) {
      return rows.map((m) => ({
        id: m.id as CopilotModelId,
        label: m.label,
        note: m.note ?? null,
      }))
    }
    return COPILOT_MODELS.map((m) => ({
      id: m.id,
      label: m.label,
      note: null as string | null,
    }))
  }, [modelData])

  // If the persisted model isn't in the deployment's available list,
  // switch to the backend's default so we don't send a request that will
  // be rejected with "model not configured".
  useEffect(() => {
    if (!modelData) return
    const ids = new Set(modelData.available.map((m) => m.id))
    if (ids.size === 0) return
    if (!ids.has(model) && modelData.default) {
      onModelChange(modelData.default as CopilotModelId)
    }
  }, [modelData, model, onModelChange])

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
            {options.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-dense-meta">
                <span className="flex flex-col">
                  <span>{m.label}</span>
                  {m.note ? (
                    <span className="text-dense-caption text-muted-foreground leading-tight">
                      {m.note}
                    </span>
                  ) : null}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(() => {
          const active = options.find((m) => m.id === model)
          if (!active?.note) return null
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="cursor-help text-dense-caption text-muted-foreground/80"
                  aria-label="Model description"
                >
                  ⓘ
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-dense-meta">
                {active.note}
              </TooltipContent>
            </Tooltip>
          )
        })()}
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
