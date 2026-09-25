/**
 * The document reader (design Rev .53, `System Reference Tech Stack` and
 * `System Alignment Blueprint`): a contents rail that follows the scroll, and
 * the document centred at a reading measure beside it.
 *
 * Two pages read a repository file this way — Tech Stack renders
 * `docs/TECH_STACK.md`, Blueprint the research API's blueprint — so the layout
 * and the prose styles are one component, not two copies.
 *
 * The rail tracks the page's own scroller (the shell's `#main-content`), not
 * the window: a section is current once its top has passed 90px below the
 * scroller's top, the design's own threshold.
 */
import { type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useScrollSpy } from '@/hooks/useScrollSpy'
import { cn } from '@/lib/utils'

export interface DocTocItem {
  anchor: string
  /** The mono mark before the title: a section number or a layer key. */
  mark: string
  title: string
  /** An optional trailing count. */
  count?: string | number
}

export interface DocTocGroup {
  label: string
  items: readonly DocTocItem[]
}

const EYEBROW = 'px-2 pb-1.5 text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground'

export function DocReader({
  toc,
  foot,
  children,
}: {
  toc: readonly DocTocGroup[]
  /** Below the rail: where the source lives, or the page this one answers to. */
  foot?: ReactNode
  /** The article's content; every section carries `data-sec={anchor}`. */
  children: ReactNode
}) {
  const anchors = toc.flatMap((g) => g.items.map((i) => i.anchor))
  const { rootRef, active, jump } = useScrollSpy(anchors)

  return (
    <div
      ref={rootRef}
      className="mt-4 grid grid-cols-1 items-start gap-8 @3xl/page:grid-cols-[minmax(0,200px)_minmax(0,1fr)]"
    >
      <nav aria-label="Contents" className="sticky top-0 hidden flex-col gap-0.5 pt-1 @3xl/page:flex">
        {toc.map((g, gi) => (
          <div key={g.label} className={cn('flex flex-col gap-0.5', gi > 0 && 'mt-3')}>
            <span className={EYEBROW}>{g.label}</span>
            {g.items.map((t) => {
              const on = t.anchor === active
              return (
                <button
                  key={t.anchor}
                  type="button"
                  onClick={() => jump(t.anchor)}
                  aria-current={on ? 'location' : undefined}
                  className={cn(
                    'grid cursor-pointer grid-cols-[22px_minmax(0,1fr)_auto] gap-1 rounded-r border-0 border-l-2 px-2 py-1 text-left text-dense-label',
                    on
                      ? 'border-l-[var(--sk-accent)] bg-[color-mix(in_srgb,var(--sk-accent)_8%,transparent)] text-foreground'
                      : 'border-l-transparent bg-transparent text-[var(--sk-mute2)] hover:text-foreground',
                  )}
                >
                  <span className="font-mono text-dense-meta text-muted-foreground">{t.mark}</span>
                  <span className="min-w-0">{t.title}</span>
                  <span className="font-mono text-dense-caption text-muted-foreground">{t.count ?? ''}</span>
                </button>
              )
            })}
          </div>
        ))}
        {foot ? (
          <div className="mt-3.5 flex flex-col gap-1 border-t border-[var(--sk-line0)] p-2">{foot}</div>
        ) : null}
      </nav>
      <article className="mx-auto flex w-full max-w-[820px] min-w-0 flex-col gap-7">{children}</article>
    </div>
  )
}

/** A section heading: `§n` in mono, then the title, with an optional right-hand count. */
export function DocSectionHead({
  mark,
  title,
  sub,
  count,
  className,
}: {
  mark: string
  title: string
  sub?: string
  count?: string
  className?: string
}) {
  return (
    <h2
      className={cn(
        'm-0 flex items-baseline gap-2.5 border-b border-[var(--sk-line0)] pb-1.5 text-base font-semibold',
        className,
      )}
    >
      <span className="font-mono text-dense-label font-normal text-muted-foreground">{mark}</span>
      <span>{title}</span>
      {sub ? <span className="text-dense-meta font-normal text-muted-foreground">{sub}</span> : null}
      {count ? <span className="ml-auto font-mono text-dense-meta font-normal text-muted-foreground">{count}</span> : null}
    </h2>
  )
}

const PROSE = 'text-dense-body leading-[1.65] text-[var(--sk-soft)]'

/**
 * The reading column's markdown: `code` as a mono chip, **bold** in the
 * foreground ink, tables on the §17 dense table in their own horizontal
 * scroller, paragraphs held to 72ch.
 */
const PROSE_COMPONENTS: Components = {
  h3: ({ children }) => <h3 className="mt-1.5 mb-0 text-dense-body font-semibold text-foreground">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-1 mb-0 text-dense-label font-semibold text-foreground">{children}</h4>,
  p: ({ children }) => <p className={cn('m-0 max-w-[72ch] text-pretty', PROSE)}>{children}</p>,
  ul: ({ children }) => <ul className="m-0 flex max-w-[72ch] list-disc flex-col gap-1 pl-4.5">{children}</ul>,
  ol: ({ children }) => <ol className="m-0 flex max-w-[72ch] list-decimal flex-col gap-1 pl-4.5">{children}</ol>,
  li: ({ children }) => <li className={cn(PROSE, 'leading-[1.6]')}>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="m-0 flex max-w-[72ch] flex-col gap-1.5 border-l-2 border-[var(--sk-line)] pl-3">{children}</blockquote>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  code: ({ children }) => (
    <code className="rounded-[3px] bg-[var(--sk-raised2)] px-1 font-mono text-[0.9em] text-foreground">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="m-0 overflow-x-auto border p-3 text-dense-meta mat-card">
      {children}
    </pre>
  ),
  a: ({ children, href }) => (
    <a href={href} className="text-[var(--sk-accent)] no-underline hover:text-[var(--sk-accent2)]">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div data-sr-hscroll="1" className="overflow-x-auto border mat-card">
      <table data-sr-table="1" className="w-full">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => <th data-sr-col="text">{children}</th>,
  td: ({ children }) => (
    <td data-sr-col="text" className="align-top whitespace-normal">
      {children}
    </td>
  ),
  hr: () => null,
}

/** One block of document markdown, drawn for the reading column. */
export function DocProse({ children }: { children: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={PROSE_COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

/** Below the rail: the file the page renders, which is where edits go. */
export function DocSourceFoot({ path }: { path: string }) {
  return (
    <>
      <span className="text-dense-meta leading-normal text-muted-foreground">Edit the source, not this page.</span>
      <span className="font-mono text-dense-caption break-all text-[var(--sk-soft)]">{path}</span>
    </>
  )
}
