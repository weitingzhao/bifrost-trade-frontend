import { useMemo, useState } from 'react'
import { Check, Copy, Loader2 } from 'lucide-react'
import { MarkdownContent } from '@/components/cockpit/MarkdownContent'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SegmentControl } from '@/components/data-display'
import { useBridgePresets, useCopilotBridge } from '@/hooks/useCopilotBridge'
import { copyTextToClipboard } from '@/lib/cockpit/exportSerializer'
import type { BridgeDepth, BridgeFocus, BridgeTarget } from '@/api/researchCopilotBridge'

export function BridgeDialog({
  open,
  onOpenChange,
  sessionId,
  framesFromMessageId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  framesFromMessageId?: string
}) {
  const presetsQ = useBridgePresets()
  const { bridge, saveFeedback } = useCopilotBridge(sessionId)

  const presets = presetsQ.data

  const [focus, setFocus] = useState<BridgeFocus>('portfolio_risk')
  const [depth, setDepth] = useState<BridgeDepth>('standard')
  const [target, setTarget] = useState<BridgeTarget>('deepseek')
  const [model, setModel] = useState('deepseek-chat')
  const [previewMd, setPreviewMd] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [pasteReply, setPasteReply] = useState('')
  const [outcome, setOutcome] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (next) {
      if (presets) {
        setFocus(presets.default_focus)
        setDepth(presets.default_depth)
        setTarget(presets.default_target)
        setModel(presets.default_model)
      }
      setPreviewMd(null)
      setEventId(null)
      setPasteReply('')
      setOutcome('')
      setCopied(false)
      setSaved(false)
      setError(null)
    }
    onOpenChange(next)
  }

  const focusHint = useMemo(() => {
    return presets?.focuses.find((f) => f.id === focus)?.hint
  }, [presets, focus])

  async function onGenerate() {
    setError(null)
    setSaved(false)
    const result = await bridge.mutateAsync({
      focus,
      depth,
      target,
      model,
      frames_from_message_id: framesFromMessageId,
    })
    if (!result.ok || !result.data) {
      if (result.error === 'bridge_rate_limit') {
        setError(`Rate limit — try again in ${result.retry_after_sec ?? 60}s (max 6/min)`)
      } else {
        setError(result.error ?? 'Bridge failed')
      }
      return
    }
    setPreviewMd(result.data.markdown)
    setEventId(result.data.event_id)
  }

  async function onCopyPreview() {
    if (!previewMd) return
    await copyTextToClipboard(previewMd)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  async function onSaveCase() {
    if (!eventId || !pasteReply.trim()) return
    setError(null)
    try {
      await saveFeedback.mutateAsync({
        bridge_event_id: eventId,
        external_reply_md: pasteReply.trim(),
        outcome: outcome.trim() || undefined,
      })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Context Bridge</DialogTitle>
          <DialogDescription>
            Compress this Copilot session into markdown for ChatGPT, Claude, DeepSeek, or another
            assistant. Tool results are summarized first; a cheap model polishes the brief.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-dense-label">Focus</Label>
            <SegmentControl
              ariaLabel="Bridge focus"
              value={focus}
              onChange={(v) => setFocus(v as BridgeFocus)}
              options={(presets?.focuses ?? []).map((f) => ({
                value: f.id,
                label: f.label.split(' ')[0] ?? f.label,
              }))}
            />
            {focusHint ? (
              <p className="text-dense-caption text-muted-foreground">{focusHint}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-dense-label">Depth</Label>
              <Select value={depth} onValueChange={(v) => setDepth(v as BridgeDepth)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(presets?.depths ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-dense-label">Target assistant</Label>
              <Select value={target} onValueChange={(v) => setTarget(v as BridgeTarget)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(presets?.targets ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-dense-label">Polish model</Label>
            <Input
              className="h-8 font-mono text-dense-meta"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="deepseek-chat"
            />
            <p className="text-dense-caption text-muted-foreground">
              Default deepseek-chat — override only if you need a different backend model id.
            </p>
          </div>

          {framesFromMessageId ? (
            <p className="text-dense-caption text-muted-foreground">
              Bridging from selected message onward (no multi-session merge).
            </p>
          ) : null}

          {error ? <p className="text-dense-meta text-destructive">{error}</p> : null}

          {previewMd ? (
            <div className="space-y-2 rounded border border-border/60 bg-secondary/30 p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-dense-label font-medium">Preview</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1"
                  onClick={() => void onCopyPreview()}
                >
                  {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                  {copied ? 'Copied' : 'Copy markdown'}
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded border border-border/40 bg-background p-2">
                <MarkdownContent>{previewMd}</MarkdownContent>
              </div>
            </div>
          ) : null}

          {previewMd && eventId ? (
            <div className="space-y-2 rounded border border-border/60 p-2">
              <p className="text-dense-label font-medium">Paste external reply</p>
              <p className="text-dense-caption text-muted-foreground">
                After the external assistant responds, paste the reply here to save as a Playbook
                case (feedback loop).
              </p>
              <Input
                className="h-8"
                placeholder="Outcome label (optional)"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              />
              <textarea
                className="min-h-[100px] w-full rounded border border-border bg-background p-2 text-dense-label"
                placeholder="Paste ChatGPT / Claude / DeepSeek reply…"
                value={pasteReply}
                onChange={(e) => setPasteReply(e.target.value)}
              />
              {saved ? (
                <p className="text-dense-caption text-success">Saved to Playbook → Cases</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
          <div className="flex gap-2">
            {previewMd && eventId ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!pasteReply.trim() || saveFeedback.isPending}
                onClick={() => void onSaveCase()}
              >
                {saveFeedback.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  'Save as Playbook Case'
                )}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={bridge.isPending}
              onClick={() => void onGenerate()}
            >
              {bridge.isPending ? (
                <>
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                  Generating…
                </>
              ) : previewMd ? (
                'Regenerate'
              ) : (
                'Generate preview'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
