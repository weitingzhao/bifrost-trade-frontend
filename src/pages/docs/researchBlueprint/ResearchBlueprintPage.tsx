/**
 * The Research blueprint — `/docs/research-blueprint`, in System › Alignment.
 *
 * It says what Research should be and changes only when the understanding
 * changes. Its counterpart, what Research is today contract by contract, is
 * the Calibration page beside it, which reads both documents; the calibration
 * document's own text is that page's Source view (`/docs/research-calibration`
 * forwards there since 2026-09-25). The blueprint lives in bifrost-research and
 * arrives through the API, so this page can never show a version the
 * repository does not hold.
 *
 * Laid out as the design's reader (Rev .53). §4 is drawn as the design draws
 * it — the contracts grouped by the five layers, each on its stable anchor,
 * each with `state →` into its own row on Calibration — and carries no state
 * symbol: whether a contract holds is the calibration's reading, not the
 * blueprint's. The rest of the document is prose in the same column.
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchResearchDoc } from '@/api/research/docs'
import { DocProse, DocReader, DocSectionHead } from '@/components/docs/DocReader'
import { DenseTag } from '@/components/data-display'
import { PageHead, PageShell } from '@/components/layout'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CONTRACT_LAYERS,
  contractLayer,
  parseBlueprintContracts,
  splitDocSections,
  type DocSection,
} from '@/utils/researchDocs'

const CALIBRATION = '/research/lab/calibration'
const CONTRACTS_SECTION = '4'

/** §4's own words before its first layer table — the part that is prose. */
function preamble(body: string): string {
  const cut = body.search(/^### /m)
  return (cut < 0 ? body : body.slice(0, cut)).trim()
}

function ContractLayers({ contracts }: { contracts: ReadonlyMap<string, string> }) {
  return (
    <>
      {CONTRACT_LAYERS.map(([key, title, sub]) => {
        const rows = [...contracts].filter(([id]) => contractLayer(id) === key)
        return (
          <section key={key} id={`bp-${key}`} data-sec={`bp-${key}`} className="flex min-w-0 flex-col">
            <DocSectionHead mark={key} title={title} sub={sub} count={`${rows.length} contracts`} className="mb-1.5 type-section" />
            {rows.map(([id, text]) => (
              <div
                key={id}
                className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-[color-mix(in_srgb,var(--sk-line)_55%,transparent)] px-1 py-2.25"
              >
                <span className="font-mono text-dense-label font-semibold text-[var(--sk-accent)]">{id}</span>
                <span className="text-dense-body leading-[1.6] text-pretty">{text}</span>
                <Link
                  to={`${CALIBRATION}#${id}`}
                  title={`${id} — its state and evidence in Calibration`}
                  className="whitespace-nowrap text-dense-meta text-[var(--sk-mute2)] no-underline hover:text-foreground"
                >
                  state →
                </Link>
              </div>
            ))}
          </section>
        )
      })}
    </>
  )
}

function Section({ s, contracts }: { s: DocSection; contracts: ReadonlyMap<string, string> }) {
  const isContracts = s.n === CONTRACTS_SECTION
  return (
    <section id={s.anchor} data-sec={s.anchor} className="flex min-w-0 flex-col gap-2.5">
      <DocSectionHead mark={`§${s.n}`} title={s.title} />
      <DocProse>{isContracts ? preamble(s.body) : s.body}</DocProse>
      {isContracts ? (
        <>
          <p className="m-0 max-w-[72ch] text-dense-body leading-[1.65] text-pretty text-[var(--sk-soft)]">
            Each contract has a stable anchor (<span className="font-mono text-foreground">C-F1</span> …). The blueprint
            states what should hold and carries no state symbol — whether it holds today is the calibration&rsquo;s
            reading, one click away on every row.
          </p>
          <ContractLayers contracts={contracts} />
        </>
      ) : null}
    </section>
  )
}

export default function ResearchBlueprintPage() {
  const q = useQuery({
    queryKey: ['research', 'docs', 'blueprint'],
    queryFn: () => fetchResearchDoc('blueprint'),
    staleTime: 5 * 60_000,
  })
  const doc = q.data
  const split = doc ? splitDocSections(doc.markdown, 'bp') : null
  const contracts = doc ? parseBlueprintContracts(doc.markdown) : new Map<string, string>()

  const toc = split
    ? [
        { label: 'Contents', items: split.sections.map((s) => ({ anchor: s.anchor, mark: s.n, title: s.title })) },
        {
          label: `§${CONTRACTS_SECTION} · Contracts`,
          items: CONTRACT_LAYERS.map(([key, title]) => ({
            anchor: `bp-${key}`,
            mark: key,
            title,
            count: [...contracts.keys()].filter((id) => contractLayer(id) === key).length,
          })),
        },
      ]
    : []

  return (
    <PageShell padding="compact">
      <PageHead
        title="Research Blueprint"
        info="What Research should be. Changes only when the understanding does. The document lives in bifrost-research and arrives through the API, so this page never shows a version the repository does not hold."
        meta={doc ? `bifrost-research · ${doc.path.split('/').pop()}` : 'bifrost-research'}
      />
      {q.isError ? (
        <QueryErrorAlert error={q.error} />
      ) : q.isLoading || !doc || !split ? (
        <Skeleton className="mt-4 h-96 w-full rounded-md" />
      ) : (
        <DocReader
          toc={toc}
          foot={
            <>
              <span className="text-dense-meta leading-normal text-muted-foreground">
                What Research is today, against each contract:
              </span>
              <Link to={CALIBRATION} className="text-dense-label text-[var(--sk-accent)] no-underline hover:underline">
                Calibration →
              </Link>
            </>
          }
        >
          {/* The document's own front matter: version, date, status. */}
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--sk-line0)] bg-[var(--sk-raised)] px-3 py-2">
            {doc.version ? (
              <DenseTag variant="neutral" size="cell">
                v{doc.version}
              </DenseTag>
            ) : null}
            {doc.updated ? <span className="font-mono text-dense-meta text-[var(--sk-mute2)]">updated {doc.updated}</span> : null}
            {doc.status ? (
              <DenseTag variant="neutral" size="cell">
                {doc.status}
              </DenseTag>
            ) : null}
            <span className="text-dense-label text-[var(--sk-mute2)]">
              Version, date and status are the document&rsquo;s own front matter.
            </span>
            <span className="ml-auto font-mono text-dense-caption text-muted-foreground" title={doc.path}>
              GET /research/docs/blueprint
            </span>
          </div>
          {split.lede ? <DocProse>{split.lede}</DocProse> : null}
          {split.sections.map((s) => (
            <Section key={s.anchor} s={s} contracts={contracts} />
          ))}
        </DocReader>
      )}
    </PageShell>
  )
}
