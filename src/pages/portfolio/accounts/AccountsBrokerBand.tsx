import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  GrandTotalRow,
  InlinePnl,
  denseTable,
  denseTableEntityCell,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtPct1, fmtUsd, fmtUsdRound } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TWS_REC_WARN_DAYS } from './accountsClocks'
import type { BrokerAccountRow, BrokerTotals } from './accountsBrokerRows'
import { accountsUi, formatAgeDays } from './accountsUi'

function recClass(days: number | null, warnAt: number, dormant: boolean): string {
  if (dormant || days == null) return 'text-muted-foreground'
  return days > warnAt ? 'text-warning' : 'text-foreground/85'
}

export function AccountsBrokerBand({
  rows,
  totals,
  selectedAccountId,
  onSelect,
  unrealizedPnl,
}: {
  rows: BrokerAccountRow[]
  totals: BrokerTotals
  selectedAccountId: string | null
  onSelect: (accountId: string) => void
  unrealizedPnl: number
}) {
  const nlv = totals.netLiq
  const cashShare = nlv > 0 ? (totals.cash / nlv) * 100 : null

  return (
    <section aria-label="What the broker says">
      <div className={accountsUi.tierRow}>
        <span className={accountsUi.tierLabel}>What the broker says</span>
        <span className={accountsUi.tierRule} />
        <span className={accountsUi.tierNote}>all accounts, then each one — one table, no tab hopping</span>
      </div>

      <div className={accountsUi.panel}>
        <div className={accountsUi.tileRow}>
          <StatTile
            label="Unrealized PnL"
            value={<InlinePnl value={unrealizedPnl}>{fmtUsd(unrealizedPnl)}</InlinePnl>}
            sub="all accounts"
          />
          <StatTile label="Net liquidation" value={fmtUsdRound(nlv)} sub={`${rows.length} accounts`} />
          <StatTile
            label="Cash"
            value={fmtUsdRound(totals.cash)}
            sub={cashShare != null ? `${fmtPct1(cashShare)} of NLV` : '— of NLV'}
          />
          <StatTile label="Buying power" value={fmtUsdRound(totals.buyingPower)} sub="cash-like + margin" />
          <StatTile
            label="Maintenance"
            value={<span className="text-warning">{fmtUsdRound(totals.maintenance)}</span>}
            sub="broker requirement ·"
            href="/risk/margin"
            link="Risk Margin →"
          />
          <StatTile
            label="Excess liquidity"
            value={fmtUsdRound(totals.excessLiquidity)}
            sub="what the broker still allows ·"
            href="/portfolio/backing"
            link="Backing →"
          />
          <StatTile
            label="Positions"
            value={String(totals.positions)}
            sub="lines live in"
            href="/portfolio/positions"
            link="Positions →"
          />
        </div>

        <DenseDataTable wrapClassName={denseTable.scrollX} tableClassName="min-w-[1000px]">
          <colgroup>
            <col style={{ width: '14%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '9%' }} />
          </colgroup>
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Account</DenseTableHead>
              <DenseTableHead align="right">Net liq</DenseTableHead>
              <DenseTableHead align="right">of total</DenseTableHead>
              <DenseTableHead align="right">Cash</DenseTableHead>
              <DenseTableHead align="right">Buying power</DenseTableHead>
              <DenseTableHead align="right">Maintenance</DenseTableHead>
              <DenseTableHead align="right">Excess liq.</DenseTableHead>
              <DenseTableHead align="right">Cushion</DenseTableHead>
              <DenseTableHead align="right">Positions</DenseTableHead>
              <DenseTableHead align="right">Flex rec</DenseTableHead>
              <DenseTableHead align="right">TWS rec</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {rows.map((row) => {
              const selected = row.accountId === selectedAccountId
              const cushWarn = row.cushion != null && row.cushion < 0.3
              return (
                <DenseTableRow
                  key={row.accountId}
                  className={cn(
                    'cursor-pointer',
                    selected && accountsUi.selectedRow,
                    row.dormant && accountsUi.dormantRow,
                  )}
                  aria-selected={selected}
                  aria-label={`Select account ${row.accountId}${row.dormant ? ', dormant' : ''}`}
                  onClick={() => onSelect(row.accountId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelect(row.accountId)
                    }
                  }}
                  tabIndex={0}
                >
                  <DenseTableCell className={denseTableEntityCell}>
                    <span className="font-mono font-bold">{row.accountId}</span>
                    <span className="ml-1.5 text-dense-meta text-muted-foreground">
                      {row.role}
                      {row.roleNote ? ` · ${row.roleNote}` : ''}
                    </span>
                    {row.dayTradesLeft != null ? (
                      <span className="mt-0.5 block text-dense-meta text-warning">
                        Day trades left {row.dayTradesLeft}
                      </span>
                    ) : null}
                  </DenseTableCell>
                  <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
                    {fmtUsdRound(row.netLiq)}
                  </DenseTableCell>
                  <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
                    {fmtPct1(row.shareOfTotal)}
                  </DenseTableCell>
                  <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
                    {fmtUsdRound(row.cash)}
                  </DenseTableCell>
                  <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
                    {fmtUsdRound(row.buyingPower)}
                  </DenseTableCell>
                  <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
                    {fmtUsdRound(row.maintenance)}
                  </DenseTableCell>
                  <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
                    {fmtUsdRound(row.excessLiquidity)}
                  </DenseTableCell>
                  <DenseTableCell
                    className={cn(denseTableNumCell, cushWarn ? 'text-warning' : 'text-muted-foreground')}
                  >
                    {row.cushion == null ? '—' : fmtPct1(row.cushion * 100)}
                  </DenseTableCell>
                  <DenseTableCell
                    className={cn(denseTableNumCell, row.positions === 0 ? 'text-muted-foreground' : undefined)}
                  >
                    {row.positions}
                  </DenseTableCell>
                  <DenseTableCell
                    className={cn(denseTableNumCell, recClass(row.flexRecDays, 2, row.dormant))}
                  >
                    {row.dormant ? '—' : formatAgeDays(row.flexRecDays)}
                  </DenseTableCell>
                  <DenseTableCell
                    className={cn(denseTableNumCell, recClass(row.twsRecDays, TWS_REC_WARN_DAYS, row.dormant))}
                  >
                    {row.dormant ? '—' : formatAgeDays(row.twsRecDays)}
                  </DenseTableCell>
                </DenseTableRow>
              )
            })}
            <GrandTotalRow labelColSpan={1} label="All accounts">
              <DenseTableCell className={cn(denseTableNumCell, 'font-bold')}>{fmtUsdRound(totals.netLiq)}</DenseTableCell>
              <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>100%</DenseTableCell>
              <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>{fmtUsdRound(totals.cash)}</DenseTableCell>
              <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
                {fmtUsdRound(totals.buyingPower)}
              </DenseTableCell>
              <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
                {fmtUsdRound(totals.maintenance)}
              </DenseTableCell>
              <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
                {fmtUsdRound(totals.excessLiquidity)}
              </DenseTableCell>
              <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>per account</DenseTableCell>
              <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>{totals.positions}</DenseTableCell>
              <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>—</DenseTableCell>
              <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>—</DenseTableCell>
            </GrandTotalRow>
          </DenseTableBody>
        </DenseDataTable>

        <div className={accountsUi.panelFoot}>
          <p className="m-0">
            Cushion and maintenance are the broker&apos;s own fields — the pressure gauge on{' '}
            <Link to="/portfolio/backing" className={accountsUi.tileLink}>
              Backing &amp; Model
            </Link>{' '}
            is <span className="font-mono">1 − Cushion</span> over the accounts in scope, and per-position
            margin is on{' '}
            <Link to="/risk/margin" className={accountsUi.tileLink}>
              Risk › Margin
            </Link>
            . Neither is recomputed here. A row with no reading is grey: an idle account is not a broken one.
          </p>
        </div>
      </div>
    </section>
  )
}

function StatTile({
  label,
  value,
  sub,
  href,
  link,
}: {
  label: string
  value: ReactNode
  sub: string
  href?: string
  link?: string
}) {
  return (
    <div className={accountsUi.tile}>
      <span className={accountsUi.tileCap}>{label}</span>
      <span className={accountsUi.tileValue}>{value}</span>
      <span className={accountsUi.tileSub}>
        {sub}
        {href && link ? (
          <>
            {' '}
            <Link to={href} className={accountsUi.tileLink}>
              {link}
            </Link>
          </>
        ) : null}
      </span>
    </div>
  )
}
