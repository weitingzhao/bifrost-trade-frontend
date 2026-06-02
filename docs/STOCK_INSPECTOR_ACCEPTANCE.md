# Stock Inspector — visual acceptance checklist

**Stage**: New Frontend + Legacy API (phase 1). Compare **bifrost-trade-frontend** with **bifrost-trader-engine/frontend** on the **same** Legacy API.

## Entry points

Open the same symbol (e.g. DAVE) from:

| Page | Route | Notes |
|------|-------|-------|
| Positions | `/portfolio/positions` | Click symbol; includes Position + Daily benchmark |
| Stock Watchlist | `/research/watchlist` | Symbol link |
| Stock Screener | `/research/sepa` | Row / chip opens inspector; may pass `fundamentalSeed` |

## Pass criteria

| Check | Expected |
|-------|----------|
| Header | Single row: `SYMBOL · account` + `F n/8` + `T n/11` + close `✕` |
| Overview | Name, sector/industry chips, exchange, market cap, employees, est. year, optional ↗ link |
| Position | Side / Qty / Avg / Last / MV / Daily & Since PnL with color |
| Daily benchmark | Separate section with `stock_day close` when opened from positions |
| SEPA grid | Two columns; circular pass/fail icons; Overall summary strip |
| Fund groups | Collapsed `<details>` with readable summary badges (Quality 5/5, etc.) |
| Source Data | Click condition → highlight Q/A rows + mini bars |
| BAR DATA | KPI pills, period tabs, layer toggles, candlestick chart |
| Put/Call | Unchanged vs prior new-frontend behavior |
| Statements | Expandable; BS/CF chart+table, Ratios, Short Interest/Volume |

## Mechanical checks

```bash
cd bifrost-trade-frontend
npm run lint
npm run build
```

## Sign-off

- [ ] Owner verified all rows above on Positions, Watchlist, and Screener (date: ________)
