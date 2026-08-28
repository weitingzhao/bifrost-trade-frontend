import { MessageCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SymbolPicker } from '@/components/symbol'
import { useResearchContext } from '@/hooks/useResearchContext'
import { cockpitDrawerStore } from '@/hooks/useCockpitDrawer'
import { copilotBubbleStore } from '@/hooks/useCopilotBubble'
import { copilotSessionStore, useCopilotSession } from '@/hooks/useCopilotSession'
import { cn } from '@/lib/utils'

export interface ResearchContextBarProps {
  /** Hide date picker when the page has no date dimension */
  showDate?: boolean
  symbolPlaceholder?: string
  className?: string
}

function parseMessageTs(id: string): number | null {
  const match = id.match(/^[a-z]+-(\d{13})-\d+$/i)
  if (!match) return null
  const ts = Number(match[1])
  return Number.isFinite(ts) ? ts : null
}

function formatMentionAgo(ts: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (sec < 45) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 48) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

function messageMentionsSymbol(content: string, symbol: string): boolean {
  if (!content || !symbol) return false
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'i').test(content)
}

export function ResearchContextBar({
  showDate = true,
  symbolPlaceholder = 'SPX',
  className,
}: ResearchContextBarProps) {
  const { symbol, dateInput, setSymbol, setDate } = useResearchContext()
  const { messages } = useCopilotSession()

  const mention = (() => {
    const needle = symbol.trim().toUpperCase()
    if (!needle) return null
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (messageMentionsSymbol(msg.content, needle)) {
        return { id: msg.id, at: parseMessageTs(msg.id) }
      }
    }
    return null
  })()

  function openMention() {
    copilotBubbleStore.getState().open_()
    cockpitDrawerStore.getState().setTab('copilot')
    if (mention) copilotSessionStore.requestScrollTo(mention.id)
  }

  return (
    <Card variant="elevated" className={className}>
      <CardContent className="flex flex-wrap items-center gap-3 px-3 py-2">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">Symbol:</span>
        <SymbolPicker
          value={symbol}
          onSelect={setSymbol}
          className="w-28"
          placeholder={symbolPlaceholder}
          showPin
        />
        {showDate ? (
          <>
            <span className="shrink-0 text-xs font-medium text-muted-foreground">Date:</span>
            <Input
              type="date"
              value={dateInput}
              onChange={(e) => setDate(e.target.value)}
              className="h-7 w-36 font-mono text-sm"
            />
          </>
        ) : null}
        {mention ? (
          <button
            type="button"
            onClick={openMention}
            className={cn(
              'ml-auto inline-flex items-center gap-1 rounded-md border border-border/60',
              'bg-secondary/60 px-1.5 py-0.5 text-dense-caption text-muted-foreground',
              'hover:border-primary/40 hover:text-foreground',
            )}
            title="Open Copilot at the mentioning message"
          >
            <MessageCircle className="h-3 w-3 text-primary" />
            Copilot · mentioned {mention.at ? formatMentionAgo(mention.at) : 'recently'}
          </button>
        ) : null}
      </CardContent>
    </Card>
  )
}
