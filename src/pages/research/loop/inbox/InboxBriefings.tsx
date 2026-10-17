/**
 * Briefings — agent posts that need reading, not a verdict. Read in full now
 * (every page of every briefing kind), so the list is long: on DEV 724 EOD
 * verdicts are pending, the oldest from 09-07. It draws the newest first and
 * a page at a time; the count above it is the whole set.
 *
 * On a phone (Rev .163) a briefing is a row, read in a bottom sheet
 * (`InboxBriefingSheet`), like the decisions above it.
 */
import { useState } from 'react'
import type { AiDraft } from '@/api/researchDrafts'
import { DraftCard } from '@/components/cockpit/DraftCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { InboxBriefingSheet } from './InboxPhoneSheet'

/** How many briefings are drawn before "Show more". */
export const BRIEFINGS_PAGE = 60

export function InboxBriefings({
  rows,
  loading,
  read,
  setRead,
  litId,
  onDismiss,
  onApprove,
  phone = false,
}: {
  rows: readonly AiDraft[]
  loading: boolean
  read: ReadonlySet<string>
  setRead: (id: string, isRead: boolean) => void
  /** A `?card=` naming a briefing: it opens, and is drawn even past the page. */
  litId: string | null
  onDismiss: (id: string) => void
  onApprove: (id: string) => void
  /** The route page on a phone: rows, and a sheet (Rev .163). */
  phone?: boolean
}) {
  const [shown, setShown] = useState(BRIEFINGS_PAGE)
  // One open at a time, like the decisions; `null` is "the first one".
  const [openId, setOpenId] = useState<string | null>(null)
  // A phone's sheet holds its briefing past a Dismiss, so it reads while it slides away.
  const [sheet, setSheet] = useState<{ draft: AiDraft; open: boolean } | null>(null)
  const [seenLit, setSeenLit] = useState<string | null>(null)
  const lit = litId ? rows.find((r) => r.id === litId) ?? null : null
  if (phone && lit && lit.id !== seenLit) {
    setSeenLit(lit.id)
    setSheet({ draft: lit, open: true })
  }
  const ordered = lit ? [lit, ...rows.filter((r) => r !== lit)] : rows
  const open = phone ? '' : (openId ?? ordered[0]?.id ?? '')
  const inSheet = sheet ? (rows.find((r) => r.id === sheet.draft.id) ?? sheet.draft) : null
  if (loading) return <Skeleton className="h-32 w-full rounded-md" />
  if (rows.length === 0) return null
  return (
    <section className="space-y-2">
      <div className="flex min-w-0 items-baseline gap-2 px-0.5 pt-1.5">
        <span className="text-dense-micro font-semibold text-muted-foreground">Briefings</span>
        <span className="text-dense-label font-semibold">Agent posts · read, then move on</span>
        <span className="font-mono text-dense-micro text-muted-foreground">{rows.length}</span>
      </div>
      {ordered.slice(0, Math.max(shown, lit ? 1 : 0)).map((d) => (
        <DraftCard
          key={d.id}
          cardKey={`brief:${d.id}`}
          face={phone ? 'row' : 'card'}
          draft={d}
          lit={d.id === litId}
          defaultVerb={d.id === litId ? 'explain' : null}
          expanded={open === d.id}
          onToggle={phone ? () => setSheet({ draft: d, open: true }) : () => setOpenId(open === d.id ? '' : d.id)}
          onApprove={() => onApprove(d.id)}
          onDismiss={() => onDismiss(d.id)}
          read={read.has(d.id)}
          onToggleRead={() => setRead(d.id, !read.has(d.id))}
        />
      ))}
      {rows.length > shown ? (
        <Button type="button" size="sm" variant="outline" onClick={() => setShown((n) => n + BRIEFINGS_PAGE)}>
          Show {Math.min(BRIEFINGS_PAGE, rows.length - shown)} more of {rows.length - shown}
        </Button>
      ) : null}
      {phone ? (
        <InboxBriefingSheet
          open={sheet?.open === true}
          onOpenChange={(o) => setSheet((s) => (s ? { ...s, open: o } : s))}
          draft={inSheet}
          lit={inSheet != null && inSheet.id === litId}
          read={inSheet != null && read.has(inSheet.id)}
          onToggleRead={() => {
            if (inSheet) setRead(inSheet.id, !read.has(inSheet.id))
          }}
          onApprove={() => {
            if (inSheet) onApprove(inSheet.id)
          }}
          onDismiss={() => {
            if (inSheet) onDismiss(inSheet.id)
          }}
        />
      ) : null}
    </section>
  )
}
