import { ExternalLink } from 'lucide-react'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTable,
} from '@/components/data-display'
import { DOC_PATHS, type ServiceDef } from './apiHealthConfig'
import {
  API_DOCS_COL_WIDTHS,
  apiHealthDocLinkClass,
  apiHealthDocsTableClass,
} from './apiHealthUi'

function DocLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={apiHealthDocLinkClass}>
      Open <ExternalLink className="h-3 w-3" />
    </a>
  )
}

export function ApiDocsTable({ services }: { services: ServiceDef[] }) {
  return (
    <DenseDataTable tableClassName={apiHealthDocsTableClass}>
      <colgroup>
        <col style={{ width: API_DOCS_COL_WIDTHS.api }} />
        <col style={{ width: API_DOCS_COL_WIDTHS.baseUrl }} />
        <col style={{ width: API_DOCS_COL_WIDTHS.swagger }} />
        <col style={{ width: API_DOCS_COL_WIDTHS.redoc }} />
        <col style={{ width: API_DOCS_COL_WIDTHS.openapi }} />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>API</DenseTableHead>
          <DenseTableHead>Base URL</DenseTableHead>
          <DenseTableHead>Swagger UI</DenseTableHead>
          <DenseTableHead>ReDoc</DenseTableHead>
          <DenseTableHead>OpenAPI JSON</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {services.map((svc) => {
          const paths = DOC_PATHS[svc.key]
          return (
            <DenseTableRow key={svc.key}>
              <DenseTableCell className="font-medium">{svc.name}</DenseTableCell>
              <DenseTableCell className={denseTable.mutedMeta}>
                <span className="block max-w-[180px] truncate font-mono">{svc.base || '–'}</span>
              </DenseTableCell>
              <DenseTableCell>
                {svc.base ? (
                  <DocLink href={`${svc.base}${paths.swagger}`} />
                ) : (
                  <span className={denseTable.mutedMeta}>–</span>
                )}
              </DenseTableCell>
              <DenseTableCell>
                {svc.base ? (
                  <DocLink href={`${svc.base}${paths.redoc}`} />
                ) : (
                  <span className={denseTable.mutedMeta}>–</span>
                )}
              </DenseTableCell>
              <DenseTableCell>
                {svc.base && paths.openapi ? (
                  <DocLink href={`${svc.base}${paths.openapi}`} />
                ) : (
                  <span className={denseTable.mutedMeta}>–</span>
                )}
              </DenseTableCell>
            </DenseTableRow>
          )
        })}
      </DenseTableBody>
    </DenseDataTable>
  )
}
