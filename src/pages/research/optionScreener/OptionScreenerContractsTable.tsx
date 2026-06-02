import { Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  IconActionButton,
  denseTable,
  denseTableNumCell,
} from '@/components/data-display'
import type { ScreenerContractRow } from '@/types/research'
import { fmtGreek, fmtPct, fmtPrice } from './optionScreenerFormat'
import { ratingTagVariant, riskTagVariant } from './optionScreenerTags'
import { optionScreenerScoreFillClass, optionScreenerScoreTrackClass } from './optionScreenerUi'

function ScoreBarCell({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={optionScreenerScoreTrackClass}>
        <div className={optionScreenerScoreFillClass} style={{ width: `${score}%` }} />
      </div>
      <span className={denseTable.mutedMeta}>{score}</span>
    </div>
  )
}

type Props = {
  contracts: ScreenerContractRow[]
  symbol: string
  onSave: (symbol: string) => void
}

export function OptionScreenerContractsTable({ contracts, symbol, onSave }: Props) {
  return (
    <DenseDataTable wrapClassName="rounded-none border-0 border-t border-border">
      <colgroup>
        <col className="w-[52px]" />
        <col className="w-[36px]" />
        <col className="w-[88px]" />
        <col className="w-[44px]" />
        <col className="w-[44px]" />
        <col className="w-[56px]" />
        <col className="w-[100px]" />
        <col className="w-[52px]" />
        <col className="w-[64px]" />
        <col className="w-[56px]" />
        <col className="w-[44px]" />
        <col className="w-[44px]" />
        <col className="w-[44px]" />
        <col className="w-[44px]" />
        <col className="w-[56px]" />
        <col className="w-[48px]" />
        <col className="w-[36px]" />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Strike</DenseTableHead>
          <DenseTableHead>P/C</DenseTableHead>
          <DenseTableHead>Expiry</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>DTE</DenseTableHead>
          <DenseTableHead>Rating</DenseTableHead>
          <DenseTableHead>Risk</DenseTableHead>
          <DenseTableHead>Score</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>IV</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Premium</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>P(ITM)</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Δ</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Γ</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>θ</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>ν</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Spread%</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>OI</DenseTableHead>
          <DenseTableHead className="w-[36px]" />
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {contracts.map((c, i) => (
          <DenseTableRow key={`${c.strike}-${c.right}-${c.expiry}-${i}`}>
            <DenseTableCell className={cn(denseTableNumCell, 'font-mono')}>
              {c.strike.toFixed(0)}
            </DenseTableCell>
            <DenseTableCell>{c.right}</DenseTableCell>
            <DenseTableCell className={denseTable.mutedMeta}>{c.expiry}</DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>{c.dte}d</DenseTableCell>
            <DenseTableCell>
              <DenseTag variant={ratingTagVariant(c.rating)} size="cell">
                {c.rating}
              </DenseTag>
            </DenseTableCell>
            <DenseTableCell>
              <DenseTag variant={riskTagVariant(c.risk)} size="cell">
                {c.risk}
              </DenseTag>
            </DenseTableCell>
            <DenseTableCell>
              <ScoreBarCell score={c.score} />
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>{fmtPct(c.iv)}</DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>{fmtPrice(c.premium)}</DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>{fmtPct(c.prob_itm)}</DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, denseTable.mutedMeta)}>
              {fmtGreek(c.delta)}
            </DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, denseTable.mutedMeta)}>
              {fmtGreek(c.gamma)}
            </DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, denseTable.mutedMeta)}>
              {fmtGreek(c.theta)}
            </DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, denseTable.mutedMeta)}>
              {fmtGreek(c.vega)}
            </DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, denseTable.mutedMeta)}>
              {fmtPct(c.spread_pct)}
            </DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, denseTable.mutedMeta)}>
              {c.oi != null ? c.oi.toLocaleString() : '—'}
            </DenseTableCell>
            <DenseTableCell>
              <IconActionButton
                title={`Save ${symbol} as opportunity`}
                ariaLabel={`Save ${symbol} as opportunity`}
                onClick={() => onSave(symbol)}
              >
                <Bookmark className="h-3.5 w-3.5" />
              </IconActionButton>
            </DenseTableCell>
          </DenseTableRow>
        ))}
      </DenseTableBody>
    </DenseDataTable>
  )
}
