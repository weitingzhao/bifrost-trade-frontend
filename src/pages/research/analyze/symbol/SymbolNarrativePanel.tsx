/**
 * `Narrative` — what this name's filings say this week, beside the verdict
 * (design Rev .43 Q7, `Research Symbol.dc.html` Overview right column).
 *
 * Each row is an SEC 8-K item the filing states, with the vendor's label as a
 * second word where it has one. Item numbers are filing facts, so no row
 * carries a confidence, and nothing here feeds the verdict above it: the panel
 * is dashed and says so (Narrative page, rule 3).
 *
 * The empty panel has two meanings the reader must not confuse, and research
 * 0.112.0 answers which: `symbol_coverage.filings` is this name's 8-K rows on
 * file, all time. Zero means the feed has never carried the name; more than
 * zero means the company simply filed nothing in the window.
 */
import { Link } from 'react-router-dom'
import { SectionPanel } from '@/components/layout'
import { useSymbolNarrative } from '@/hooks/useNarrative'
import { NARRATIVE_WINDOW_DAYS, rowsForSymbol } from '@/lib/research/narrativeItems'
import { fmtIsoDateToken } from '@/lib/format'

const NARRATIVE_PATH = '/research/narrative'

export function SymbolNarrativePanel({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const q = useSymbolNarrative(sym, NARRATIVE_WINDOW_DAYS)
  const rows = q.data ? rowsForSymbol(q.data.tags, sym) : []
  const coverage = q.data?.symbol_coverage
  const feedSince = q.data?.sources.filings_8k.first_filed ?? null

  const empty = q.isLoading
    ? 'Reading the filings…'
    : q.isError
      ? `The narrative read failed — ${(q.error as Error).message}`
      : coverage == null
        ? // A research API older than 0.112.0 ignores `symbol` and cannot say
          // whether the feed carries this name, so the line claims neither.
          `No 8-K from ${sym} in the last ${NARRATIVE_WINDOW_DAYS} days on file.`
        : coverage.filings === 0
          ? `The 8-K feed has never carried ${sym} — it covers ${q.data?.sources.filings_8k.names.toLocaleString() ?? 'its own'} names, so an empty panel here says nothing about the name.`
          : `No 8-K filed by ${sym} in the last ${NARRATIVE_WINDOW_DAYS} days. That is a fact about the filings, not a gap in the feed.`

  const foot = [
    rows.length > 0 ? `${rows.length} filing item${rows.length === 1 ? '' : 's'}` : null,
    feedSince ? `8-K since ${fmtIsoDateToken(feedSince)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <SectionPanel
      cap="Narrative"
      title={`what the filings say · ${NARRATIVE_WINDOW_DAYS}d`}
      className="border-dashed"
      note={
        <span title="SEC 8-K items are deterministic — indexed by item number, no confidence. They sit beside the measured verdict and never enter it (Narrative page, rule 3).">
          beside, never blended
        </span>
      }
    >
      {rows.length > 0 ? (
        rows.map((r) => (
          <div
            key={`${r.accession}|${r.item ?? 'vendor'}`}
            className="grid grid-cols-[2.4rem_minmax(0,1fr)_auto] items-baseline gap-2 border-b border-border/50 px-3 py-1.5"
          >
            <span
              className="font-mono text-dense-caption font-semibold text-secondary-foreground"
              title={r.item ? `Form 8-K Item ${r.item}` : 'The vendor’s label — no SEC item reached this filing'}
            >
              {r.item ?? '—'}
            </span>
            <div className="min-w-0">
              {/* The quoted span runs to 260 characters; two lines of it sit
                  in the rail, the whole of it in the title. */}
              <div
                className="line-clamp-2 text-dense-meta text-foreground [overflow-wrap:anywhere] [text-wrap:pretty]"
                title={r.what}
              >
                {r.what}
              </div>
              <div className="mt-px text-dense-micro text-muted-foreground">{r.basis}</div>
            </div>
            <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="font-mono text-dense-caption text-muted-foreground">
                {fmtIsoDateToken(r.date)}
              </span>
              {r.href ? (
                <a
                  href={r.href}
                  target="_blank"
                  rel="noreferrer"
                  title="Open the filing on EDGAR"
                  className="font-mono text-dense-caption hover:underline"
                >
                  EDGAR ↗
                </a>
              ) : (
                <span
                  className="font-mono text-dense-caption text-muted-foreground"
                  title="The feed kept no URL for this filing"
                >
                  EDGAR
                </span>
              )}
            </span>
          </div>
        ))
      ) : (
        <p className="px-3 py-2.5 text-dense-meta leading-relaxed text-muted-foreground">{empty}</p>
      )}
      <div className="flex items-center gap-2 px-3 py-1.5 text-dense-caption text-muted-foreground">
        <span
          title={
            coverage && coverage.filings > 0
              ? `${sym}: ${coverage.filings.toLocaleString()} 8-K rows on file since ${fmtIsoDateToken(coverage.first_filed)}, last ${fmtIsoDateToken(coverage.last_filed)}`
              : undefined
          }
        >
          {foot}
        </span>
        <Link to={NARRATIVE_PATH} className="ml-auto hover:underline">
          Narrative →
        </Link>
      </div>
    </SectionPanel>
  )
}
