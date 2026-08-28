import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Select as SelectPrimitive } from 'radix-ui'
import { CheckIcon, Crosshair, Send, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AgentActionsMenu } from '@/components/cockpit/AgentActionsMenu'
import { CopilotContextPopover } from '@/components/cockpit/CopilotContextPopover'
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { COPILOT_MODELS, PROVIDER_LABELS, type CopilotModelId } from '@/lib/cockpit/modelCatalog'
import {
  COPILOT_MODEL_PICKER_HINT,
  getModelPracticalAdvice,
} from '@/lib/cockpit/modelPickerAdvice'
import {
  TIER_LABELS,
  TIER_ORDER,
  compareModels,
  getModelMeta,
  modelPickerPrefs,
  type ModelTier,
} from '@/lib/cockpit/modelPreferences'
import { useCopilotModels } from '@/hooks/useCopilotModels'
import {
  askCopilotIntentStore,
  useAskCopilotIntent,
} from '@/store/askCopilotIntentStore'
import { copilotViewStore, useCopilotView } from '@/store/copilotViewStore'

type ModelOption = {
  id: CopilotModelId | string
  label: string
  provider: keyof typeof PROVIDER_LABELS
  note: string | null
}

/**
 * Custom select row.  We put the (visible) model label inside
 * `SelectPrimitive.ItemText` — Radix uses it to render the trigger value
 * and to power keyboard type-ahead.  The advice line sits below as an
 * independent span, and the check indicator lives in an absolutely
 * positioned corner so it never re-flows the two-line layout.
 */
function ModelSelectItem({
  value,
  label,
  advice,
}: {
  value: string
  label: string
  advice: string
}) {
  return (
    <SelectPrimitive.Item
      value={value}
      textValue={`${label} ${advice}`}
      className={cn(
        'group relative flex w-full cursor-default select-none flex-col rounded-md px-2 py-1.5 pr-8',
        'text-dense-meta outline-none',
        'focus:bg-accent focus:text-accent-foreground',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
      )}
    >
      <SelectPrimitive.ItemText asChild>
        <span className="text-dense-label font-medium text-foreground">{label}</span>
      </SelectPrimitive.ItemText>
      <span className="mt-0.5 text-dense-caption leading-snug text-muted-foreground line-clamp-2">
        {advice}
      </span>
      <span className="pointer-events-none absolute right-2 top-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-3.5 text-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  )
}

function contextChipLabel(ctx: { originLabel: string; symbol?: string; date?: string }): string {
  const parts = [ctx.originLabel]
  if (ctx.symbol) parts.push(ctx.symbol)
  if (ctx.date) parts.push(ctx.date)
  return parts.filter(Boolean).join(' · ')
}

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
  const intent = useAskCopilotIntent()
  const seed = intent.open && intent.nonce > 0

  return (
    <ComposerForm
      key={intent.nonce}
      model={model}
      onModelChange={onModelChange}
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
  onModelChange,
  onSend,
  onStop,
  streaming = false,
  disabled,
  initialText,
  autoFocus,
}: {
  model: CopilotModelId
  onModelChange: (id: CopilotModelId) => void
  onSend: (text: string) => void
  onStop?: () => void
  streaming?: boolean
  disabled?: boolean
  initialText: string
  autoFocus: boolean
}) {
  const [text, setText] = useState(initialText)
  const { view, suppressed } = useCopilotView()
  const showChip = Boolean(view && !suppressed)
  const { data: modelData } = useCopilotModels()
  const hidden = modelPickerPrefs.useHidden()

  const options: ModelOption[] = useMemo(() => {
    const rows = modelData?.available ?? []
    const src =
      rows.length > 0
        ? rows.map((m) => ({
            id: m.id,
            label: m.label,
            provider: m.provider as keyof typeof PROVIDER_LABELS,
            note: m.note ?? null,
          }))
        : COPILOT_MODELS.map((m) => ({
            id: m.id,
            label: m.label,
            provider: m.provider,
            note: null as string | null,
          }))
    return [...src].sort((a, b) => compareModels(a.id, b.id))
  }, [modelData])

  useEffect(() => {
    if (!modelData) return
    const ids = new Set(modelData.available.map((m) => m.id))
    if (ids.size === 0) return
    if (!ids.has(model) && modelData.default) {
      onModelChange(modelData.default as CopilotModelId)
    }
  }, [modelData, model, onModelChange])

  const active = options.find((m) => m.id === model)
  const practicalAdvice = getModelPracticalAdvice(model, active?.note)

  // Hidden ids get filtered out — but the currently active one always
  // stays visible so the trigger label stays consistent with the user's
  // choice even if they hide it in Settings after selecting.
  const visibleOptions = useMemo(
    () => options.filter((m) => m.id === model || !hidden.has(m.id)),
    [options, hidden, model],
  )

  const byTier = useMemo(() => {
    const acc: Record<ModelTier, ModelOption[]> = {
      recommended: [],
      reasoning: [],
      advanced: [],
      trial: [],
    }
    for (const m of visibleOptions) {
      acc[getModelMeta(m.id).tier].push(m)
    }
    return acc
  }, [visibleOptions])

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
        {/* Context chip doubles as the session-context editor (RS-UX6): the old
            `Context` tab was a third place showing the same symbol/date. */}
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
        <textarea
          data-testid="copilot-composer-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            streaming ? '生成中… 点击右侧方块停止' : '问持仓、VRP、OpEx、策略…'
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

        {/* Footer: model + send. The always-on advice paragraph used to live here
            and out-weighed the send button for what is a set-once decision
            (program research-copilot-reach P4) — it now shows only on hover/focus
            of the picker, and in full inside the picker panel. */}
        <div className="flex items-center gap-2 border-t border-border/40 px-2 py-1.5">
          <Select
            value={model}
            onValueChange={(v) => onModelChange(v as CopilotModelId)}
            disabled={inputDisabled}
          >
            <SelectTrigger
              size="sm"
              className={cn(
                'h-7 shrink-0 gap-1 border-border/50 bg-card px-2 shadow-none',
                'text-dense-caption font-medium',
                'w-auto min-w-[8.5rem] max-w-[14rem]',
                '[&_[data-slot=select-value]]:line-clamp-none',
                '[&_[data-slot=select-value]]:whitespace-nowrap',
              )}
              aria-label="Model"
              title={practicalAdvice}
            >
              <SelectValue placeholder="Model">{active?.label ?? model}</SelectValue>
            </SelectTrigger>
            <SelectContent
              align="start"
              position="popper"
              side="top"
              sideOffset={6}
              className={cn(
                'z-[250] min-w-[min(22rem,calc(100vw-2rem))] max-w-[26rem]',
                'border border-border bg-card text-foreground shadow-lg',
                'max-h-[min(360px,55vh)] p-1',
              )}
            >
              <div className="mx-0.5 mb-1 rounded-md border border-border/50 bg-secondary px-2 py-1.5 text-dense-caption leading-snug text-foreground/85">
                {COPILOT_MODEL_PICKER_HINT}
              </div>
              {TIER_ORDER.map((tier) => {
                const rows = byTier[tier]
                if (rows.length === 0) return null
                return (
                  <SelectPrimitive.Group key={tier} className="p-0.5">
                    <SelectPrimitive.Label className="px-2 pb-0.5 pt-1 text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground">
                      {TIER_LABELS[tier]}
                    </SelectPrimitive.Label>
                    {rows.map((m) => (
                      <ModelSelectItem
                        key={m.id}
                        value={m.id}
                        label={m.label}
                        advice={getModelPracticalAdvice(m.id, m.note)}
                      />
                    ))}
                  </SelectPrimitive.Group>
                )
              })}
            </SelectContent>
          </Select>

          {/* Advice stays reachable (title tooltip on the picker + full text in
              the picker panel) without permanently occupying the row. */}
          <div className="min-w-0 flex-1" aria-hidden />

          {streaming ? (
            <span className="shrink-0 text-dense-caption text-muted-foreground">生成中…</span>
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
