import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Crosshair, Send, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AgentActionsMenu } from '@/components/cockpit/AgentActionsMenu'
import { CopilotContextPopover } from '@/components/cockpit/CopilotContextPopover'
import { CopilotFreshness } from '@/components/cockpit/CopilotFreshness'
import { CopilotPromptLangToggle } from '@/components/cockpit/CopilotPromptLangToggle'
import { CopilotSpendHint } from '@/components/copilot/CopilotSpendHint'
import { cn } from '@/lib/utils'
import type { CopilotModelId } from '@/lib/cockpit/modelCatalog'
import { askCopilotIntentStore, useAskCopilotIntent } from '@/store/askCopilotIntentStore'
import { copilotViewStore, useCopilotView } from '@/store/copilotViewStore'
import { useCopilotPromptLang } from '@/lib/copilot/promptLang'

function contextChipLabel(ctx: { originLabel: string; symbol?: string; date?: string }): string {
  const parts = [ctx.originLabel]
  if (ctx.symbol) parts.push(ctx.symbol)
  if (ctx.date) parts.push(ctx.date)
  return parts.filter(Boolean).join(' · ')
}

export function CopilotComposer({
  model,
  onSend,
  onStop,
  streaming = false,
  disabled,
}: {
  model: CopilotModelId
  onSend: (text: string) => void
  onStop?: () => void
  streaming?: boolean
  disabled?: boolean
}) {
  const intent = useAskCopilotIntent()
  const seed = intent.open && intent.nonce > 0

  return (
    <ComposerForm
      key={intent.nonce}
      model={model}
      onSend={onSend}
      onStop={onStop}
      streaming={streaming}
      disabled={disabled}
      initialText={seed ? (intent.suggestedPrompt ?? '') : ''}
      autoFocus={seed}
    />
  )
}

function ComposerForm({
  model,
  onSend,
  onStop,
  streaming = false,
  disabled,
  initialText,
  autoFocus,
}: {
  model: CopilotModelId
  onSend: (text: string) => void
  onStop?: () => void
  streaming?: boolean
  disabled?: boolean
  initialText: string
  autoFocus: boolean
}) {
  const [text, setText] = useState(initialText)
  const [lang] = useCopilotPromptLang()
  const { view, suppressed } = useCopilotView()
  const showChip = Boolean(view && !suppressed)
  const inputDisabled = disabled
  const canSend = !inputDisabled && text.trim().length > 0

  function submit() {
    if (!canSend) return
    onSend(text.trim())
    setText('')
    askCopilotIntentStore.consume()
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    submit()
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="border-t border-border/50 pt-2"
      aria-label="Copilot message composer"
    >
      <div
        className={cn(
          'rounded-lg border border-border/60 bg-secondary/25',
          'focus-within:border-primary/35 focus-within:ring-1 focus-within:ring-primary/15',
        )}
      >
        <div className="flex items-center gap-1 px-2 pt-1.5">
          {showChip && view ? (
            <span
              data-testid="copilot-context-chip"
              className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border border-border/60 bg-secondary/70 pl-1.5 pr-1 py-0.5 text-dense-caption text-foreground"
            >
              <CopilotContextPopover>
                <button
                  type="button"
                  className="min-w-0 truncate rounded-sm hover:text-primary"
                  title="Edit session context — attached to every message"
                >
                  {contextChipLabel(view)}
                </button>
              </CopilotContextPopover>
              <button
                type="button"
                onClick={() => copilotViewStore.suppress()}
                aria-label="Remove context"
                className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : (
            <CopilotContextPopover>
              <button
                type="button"
                data-testid="copilot-context-chip"
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-border/60 px-1.5 py-0.5 text-dense-caption text-muted-foreground hover:text-foreground"
                title="Set session context"
              >
                <Crosshair className="size-3" />
                Context
              </button>
            </CopilotContextPopover>
          )}
          <div className="ml-auto" aria-hidden />
          <AgentActionsMenu disabled={inputDisabled} />
        </div>
        <CopilotFreshness />
        <textarea
          data-testid="copilot-composer-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            streaming
              ? lang === 'zh'
                ? '生成中… 点击右侧方块停止'
                : 'Generating… click square to stop'
              : lang === 'zh'
                ? '问持仓、VRP、OpEx、策略…'
                : 'Ask about positions, VRP, OpEx, strategy…'
          }
          disabled={inputDisabled}
          autoFocus={autoFocus}
          rows={text.length > 90 ? 3 : 2}
          className={cn(
            'w-full resize-none border-0 bg-transparent shadow-none',
            'text-dense-label leading-snug text-foreground',
            'rounded-b-none rounded-t-lg px-3 py-1.5',
            'focus-visible:outline-none focus-visible:ring-0',
            'placeholder:text-muted-foreground',
          )}
        />

        <div className="flex items-center gap-2 border-t border-border/40 px-2 py-1.5">
          <CopilotSpendHint model={model} />
          <div className="min-w-0 flex-1" aria-hidden />
          <CopilotPromptLangToggle showLabel={false} className="shrink-0" />
          {streaming ? (
            <span className="shrink-0 text-dense-caption text-muted-foreground">
              {lang === 'zh' ? '生成中…' : 'Generating…'}
            </span>
          ) : null}
          {streaming && onStop ? (
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              onClick={onStop}
              className="size-7 shrink-0"
              aria-label="Stop generation"
              title="Stop generation"
            >
              <Square className="size-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon-sm"
              disabled={!canSend}
              className="size-7 shrink-0"
              aria-label="Send"
            >
              <Send className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
