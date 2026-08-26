import { useState } from 'react'
import { Copy, ExternalLink, Printer } from 'lucide-react'
import { IconActionButton } from '@/components/data-display'
import { BridgeDialog } from '@/components/cockpit/BridgeDialog'
import type { CopilotUiMessage } from '@/hooks/useCopilotSession'
import {
  copyTextToClipboard,
  messagesToHtml,
  printHtml,
  singleMessageMarkdown,
} from '@/lib/cockpit/exportSerializer'
import { cn } from '@/lib/utils'

export function MessageActions({
  message,
  sessionId,
  className,
}: {
  message: CopilotUiMessage
  sessionId: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const [bridgeOpen, setBridgeOpen] = useState(false)

  if (message.role !== 'assistant') return null
  if (message.streaming) return null

  const hasContent =
    Boolean(message.content.trim()) ||
    Boolean(message.toolCalls?.length) ||
    Boolean(message.handoff)

  if (!hasContent) return null

  async function onCopyMd() {
    await copyTextToClipboard(singleMessageMarkdown(message))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  function onPrint() {
    const html = messagesToHtml([message], { sessionId })
    printHtml(html)
  }

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-0.5 opacity-0 transition-opacity group-hover/message:opacity-100',
          className,
        )}
      >
        <IconActionButton
          onClick={(e) => {
            e.stopPropagation()
            void onCopyMd()
          }}
          title={copied ? 'Copied' : 'Copy as Markdown'}
          ariaLabel="Copy message as Markdown"
        >
          <Copy className="size-3.5" />
        </IconActionButton>
        <IconActionButton
          onClick={(e) => {
            e.stopPropagation()
            onPrint()
          }}
          title="Print message"
          ariaLabel="Print message"
        >
          <Printer className="size-3.5" />
        </IconActionButton>
        <IconActionButton
          onClick={(e) => {
            e.stopPropagation()
            setBridgeOpen(true)
          }}
          title="Bridge from here — export context to external AI"
          ariaLabel="Bridge from here"
        >
          <ExternalLink className="size-3.5" />
        </IconActionButton>
        {copied ? (
          <span className="text-dense-caption text-success ml-0.5">Copied</span>
        ) : null}
      </div>
      <BridgeDialog
        open={bridgeOpen}
        onOpenChange={setBridgeOpen}
        sessionId={sessionId}
        framesFromMessageId={message.id}
      />
    </>
  )
}
