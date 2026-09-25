/**
 * Tech Stack — `docs/TECH_STACK.md`, rendered.
 *
 * This page was a 390-line hand-written copy of that file, and the two had
 * drifted: a 2026-09-13 edit reached the page and not the file, and both still
 * said React 18 and "Phase 1: New Frontend → Legacy API" long after D8
 * retired the Legacy stack. The file is the source (it is what agents and the
 * repo read); the page now renders it, so there is one copy to keep true
 * (Owner 2026-09-25).
 *
 * Laid out as the design's reader (Rev .53): the file's `## n.` sections in a
 * contents rail that follows the scroll, the document centred beside it.
 * Only the layout is the design's — the words are still the file's.
 */
import { PageHead, PageShell } from '@/components/layout'
import { DocProse, DocReader, DocSectionHead, DocSourceFoot } from '@/components/docs/DocReader'
import { splitDocSections } from '@/utils/researchDocs'
import techStack from '../../../docs/TECH_STACK.md?raw'

const SOURCE = 'bifrost-trade-frontend/docs/TECH_STACK.md'
const DOC = splitDocSections(techStack, 'ts')
// The rail keeps the title and drops its parenthetical, as the design does.
const TOC = [
  {
    label: 'Contents',
    items: DOC.sections.map((s) => ({ anchor: s.anchor, mark: s.n, title: s.title.replace(/ \(.*\)$/, '') })),
  },
]

export default function TechStackPage() {
  return (
    <PageShell padding="compact">
      <PageHead
        title="Tech Stack"
        info="Technology choices, Dense UI standards and UI governance for the Trade frontend. The page renders the repository file; there is no second copy."
        meta="docs/TECH_STACK.md"
      />
      <DocReader toc={TOC} foot={<DocSourceFoot path={SOURCE} />}>
        {/* The lede reads a size up, as the design sets it. */}
        <div className="[&_p]:text-sm">
          <DocProse>{DOC.lede}</DocProse>
        </div>
        {DOC.sections.map((s) => (
          <section key={s.anchor} id={s.anchor} data-sec={s.anchor} className="flex min-w-0 flex-col gap-2.5">
            <DocSectionHead mark={`§${s.n}`} title={s.title} />
            <DocProse>{s.body}</DocProse>
          </section>
        ))}
      </DocReader>
    </PageShell>
  )
}
