/**
 * The Overview tab's faces — six cards, in the design's own order.
 *
 * `Dossier` was a page; the merge made it the Symbol page's Overview tab, so
 * the header, context bar and verdict strip it used to carry are the
 * container's now. The batch is the container's too, since the identity line,
 * the tab dots and the record rail read the same one — `useSymbolFaces`.
 *
 * Two columns, not three, and not a CSS-column balance: the cards now carry a
 * verdict block and three or four rows each, so their heights are within a row
 * of one another, and the rail beside them takes the width a third column
 * would have. Measured at 1600: two columns of cards plus the rail, no
 * remainder worth balancing.
 */
import { Link } from 'react-router-dom'
import { FaceCard } from './FaceCard'
import type { SymbolFaces } from '@/pages/research/analyze/symbol/useSymbolFaces'

export function DossierBody({ faces }: { faces: SymbolFaces }) {
  const { views, loading, failed, drove } = faces
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-dense-meta text-muted-foreground">
          Six faces of one name. Each card carries its verdict, what that means, and what each
          lens has been worth — hover a title for the question it answers.
        </span>
        <Link
          to="/docs/research-blueprint"
          className="ml-auto text-dense-meta text-muted-foreground hover:underline"
        >
          Blueprint §3.2
        </Link>
      </div>
      {failed.length > 0 ? (
        <p role="status" className="text-dense-micro text-warning">
          {`${failed.length} ${failed.length === 1 ? 'lens' : 'lenses'} did not answer: ${failed.join(', ')}`}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {views.map((v) => (
          <FaceCard key={v.face.id} view={v} loading={loading} drove={drove === v.face.id} />
        ))}
      </div>
    </div>
  )
}
