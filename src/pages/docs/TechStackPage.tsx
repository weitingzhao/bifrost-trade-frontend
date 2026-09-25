/**
 * Tech Stack — `docs/TECH_STACK.md`, rendered.
 *
 * This page was a 390-line hand-written copy of that file, and the two had
 * drifted: a 2026-09-13 edit reached the page and not the file, and both still
 * said React 18 and "Phase 1: New Frontend → Legacy API" long after D8
 * retired the Legacy stack. The file is the source (it is what agents and the
 * repo read); the page now renders it, so there is one copy to keep true
 * (Owner 2026-09-25).
 */
import { PageHeader, PageShell } from '@/components/layout'
import { MarkdownContent } from '@/components/cockpit/MarkdownContent'
import techStack from '../../../docs/TECH_STACK.md?raw'

/** The file's own H1 is the page title; the header carries it instead. */
const BODY = techStack.replace(/^# .*\n+/, '')

export default function TechStackPage() {
  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Tech Stack"
        description="Technology choices, Dense UI standards and UI governance for the Trade frontend."
        actions={
          <code
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-dense-micro text-muted-foreground"
            title="Edit the source, not this page"
          >
            bifrost-trade-frontend/docs/TECH_STACK.md
          </code>
        }
      />
      {/* A centred document: prose keeps its measure (§5a.3). */}
      <article className="mx-auto max-w-4xl">
        <MarkdownContent className="prose prose-sm prose-invert max-w-none [&_table]:text-dense-meta [&_pre]:text-dense-micro">
          {BODY}
        </MarkdownContent>
      </article>
    </PageShell>
  )
}
