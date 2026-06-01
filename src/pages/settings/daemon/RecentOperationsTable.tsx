import type { Operation } from '@/types/monitor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { fmtTs, fmtUsd } from './daemonShared'

export function RecentOperationsTable({ operations }: { operations: Operation[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent operations</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="h-7">Time</TableHead>
                <TableHead className="h-7">Type</TableHead>
                <TableHead className="h-7">Side</TableHead>
                <TableHead className="h-7 text-right">Qty</TableHead>
                <TableHead className="h-7 text-right">Price</TableHead>
                <TableHead className="h-7">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">
                    None
                  </TableCell>
                </TableRow>
              ) : (
                operations.map((op, i) => (
                  <TableRow key={op.daemon_auto_operations_id ?? `op-${op.ts}-${i}`} className="text-xs">
                    <TableCell className="py-1 font-mono">{fmtTs(op.ts)}</TableCell>
                    <TableCell className="py-1">{op.type ?? '—'}</TableCell>
                    <TableCell className="py-1">
                      {op.side
                        ? <Badge variant={op.side === 'Buy' ? 'default' : 'secondary'} className="text-[10px] px-1.5">{op.side}</Badge>
                        : '—'}
                    </TableCell>
                    <TableCell className="py-1 text-right font-mono">{op.quantity ?? '—'}</TableCell>
                    <TableCell className="py-1 text-right font-mono">{op.price != null ? fmtUsd(op.price) : '—'}</TableCell>
                    <TableCell className="py-1 text-muted-foreground">{op.state_reason ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
