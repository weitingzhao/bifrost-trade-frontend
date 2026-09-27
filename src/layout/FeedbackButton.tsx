/**
 * The top bar's Feedback entry (design Rev .97 #2): a resident, worded button
 * left of Ask Copilot — the one control on the bar that keeps its label,
 * because a flag icon reads as a status lamp here. It carries the open count
 * and a dot while a reply is unread; both come from the store's summary, so
 * the numbers are the same ones /system/feedback triages.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchFeedbackSummary } from '@/api/research/feedback'
import { openFeedbackDialog } from '@/lib/feedback/feedbackDialog'
import { MenubarTip } from './menubar/MenubarTip'
import mb from './menubar/menubar.module.css'
import { cn } from '@/lib/utils'

export function FeedbackButton() {
  const sumQ = useQuery({
    queryKey: ['research', 'feedback', 'summary'],
    queryFn: fetchFeedbackSummary,
    refetchInterval: 60_000,
    retry: 1,
  })
  const open = sumQ.data?.open ?? 0
  const unread = (sumQ.data?.unread ?? 0) > 0

  return (
    <MenubarTip
      tip={
        sumQ.data
          ? `Feedback — ${open} open${unread ? ' · new replies in Settings › My reports' : ''}`
          : 'Feedback — broken · wrong number · idea · how do I'
      }
    >
      <button
        type="button"
        onClick={() => openFeedbackDialog('bug')}
        aria-label="Send feedback"
        className={cn(mb.item, 'relative gap-1 px-1.5 text-dense-meta text-[var(--sk-soft)]')}
      >
        Feedback
        {open > 0 ? (
          <span className="font-mono text-dense-micro text-muted-foreground">{open}</span>
        ) : null}
        {unread ? (
          <span
            aria-hidden
            className="absolute -top-[2px] -right-[2px] size-[7px] rounded-full bg-[var(--sk-accent)] shadow-[0_0_0_2px_var(--background)]"
          />
        ) : null}
      </button>
    </MenubarTip>
  )
}
