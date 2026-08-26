import { useState } from 'react'
import { Check, Copy, Download, FileText, Printer, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CopilotUiMessage } from '@/hooks/useCopilotSession'
import {
  copyTextToClipboard,
  downloadTextFile,
  exportFilename,
  messagesToHtml,
  messagesToMarkdown,
  printHtml,
} from '@/lib/cockpit/exportSerializer'

export function ExportSessionMenu({
  messages,
  sessionId,
  sessionTitle,
}: {
  messages: CopilotUiMessage[]
  sessionId: string
  sessionTitle?: string | null
}) {
  const [copied, setCopied] = useState(false)
  const disabled = messages.length === 0

  const opts = {
    sessionId,
    sessionTitle: sessionTitle ?? undefined,
  }

  async function onCopyMd() {
    await copyTextToClipboard(messagesToMarkdown(messages, opts))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  function onDownloadMd() {
    const name = exportFilename(sessionId)
    downloadTextFile(name, messagesToMarkdown(messages, opts), 'text/markdown;charset=utf-8')
  }

  function onDownloadHtml() {
    const base = exportFilename(sessionId).replace(/\.md$/, '')
    downloadTextFile(`${base}.html`, messagesToHtml(messages, opts), 'text/html;charset=utf-8')
  }

  function onPrint() {
    printHtml(messagesToHtml(messages, opts))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label="Export session"
          title="Export session"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Share2 className="h-3.5 w-3.5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        <DropdownMenuItem disabled={disabled} onSelect={() => void onCopyMd()}>
          <Copy className="mr-2 h-3.5 w-3.5" />
          Copy Markdown
        </DropdownMenuItem>
        <DropdownMenuItem disabled={disabled} onSelect={onDownloadMd}>
          <Download className="mr-2 h-3.5 w-3.5" />
          Download .md
        </DropdownMenuItem>
        <DropdownMenuItem disabled={disabled} onSelect={onDownloadHtml}>
          <FileText className="mr-2 h-3.5 w-3.5" />
          Download .html
        </DropdownMenuItem>
        <DropdownMenuItem disabled={disabled} onSelect={onPrint}>
          <Printer className="mr-2 h-3.5 w-3.5" />
          Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
