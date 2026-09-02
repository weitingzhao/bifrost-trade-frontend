# Performance Economic PnL — B0 (Same-Day Option Rolls)

## Purpose

Keep **Book** (contract FIFO realized / OPT R) as the accounting authority, and add a parallel **Economic** options path for Equity Growth that removes false cliffs on **same-day option rolls**.

B0 uses **only real execution cash flows** — no EOD marks, no Dagster, no Research feature tables.

## Dual track

| Track | Meaning | Where |
|-------|---------|--------|
| **Book** | Per-contract FIFO realized (existing OPT R) | Monthly table, calendar, Equity Growth default |
| **Economic (B0)** | Book day realized, with same-day roll closes replaced by net roll cash | Equity Growth when mode = Economic |
| **Total** | Cumulative Book R through day `d` + Open unmatched premium as of `d` | Equity Growth when mode = Total |

Filter bar **Option R · Open · Total** uses Chicago-today Open inventory (not Σ monthly OPT U). Monthly table **Open** attributes that same as-of-today inventory by **open month**.

Monthly / calendar **OPT R and OPT U numbers are unchanged**.

## Day formula

For each Chicago trade date `d`:

1. `R_book(d)` — existing `computeOptionDayPnLForPerformanceDate` realized.
2. Detect same-day rolls (rules below).
3. For matched roll quantity:
   - `cash_roll` = Σ signed cash on close legs + Σ signed cash on open legs  
     (`ledgerOptionExecutionCashFlowSigned`, includes commission).
   - `R_roll_book` = Book realized share attributable to those close legs (FIFO pairs / qty scale).
4. `E(d) = R_book(d) - R_roll_book(d) + cash_roll(d)`.
5. Economic options curve = `cumsum(E)`. Stocks / FI / Cash-like stay on Book layers.

Invariants:

- Days with no rolls: `E(d) === R_book(d)`.
- Open then close on **different** calendar days never form a roll.

## Same-day roll rules (v1)

Same `account_id` + same underlying (first token of `symbol`) + same option right (P/C) + **same Chicago trade date**:

1. Rebuild signed position per contract from executions **before** that day (lookback window).
2. Split the day’s fills into **closing** qty (reduces prior |position|) vs **opening** qty.
3. FIFO-match closing qty on contract A to opening qty on contract B (`A ≠ B`).
4. Unmatched qty is not adjusted.
5. Cross-day close/open = two independent Book events.

## Non-goals

- No EOD option marks / MTM equity (that is **B1**).
- No multi-day trade-chain UI (**B2**).
- No Flex ingest / API schema / DDL changes.
- Economic mode does **not** redefine unrealized (dashed U stays Book-anchored).

## Known limitations

- B0 is roll-cash adjustment, not full economic NAV. While a rolled chain remains open, Economic cumsum need not equal Book realized + unrealized at the endpoint.
- Multi-leg structures that open/close different rights on the same day are not linked in v1 (right must match).
- Heuristic depends on lookback inventory; insufficient lookback can under-detect closes.
- **B1** (EOD marks) and **B2** (trade-chain UI) are out of scope for this program.

## Acceptance (W3)

1. Performance → Equity Growth default mode is **Book** (May-style FIFO cliffs still visible when present).
2. Switch to **Economic**: same-day roll days show a shallower Options path; hover may show `Rolls: n · net cash …`.
3. Switch to **Total**: Options curve end ≈ filter-bar Option Total; path = cum R + Open-as-of-each-day.
4. Monthly **Open** column: sum across months ≈ filter-bar Open; day rows show `—`.
5. Monthly table / calendar **OPT R** unchanged vs Book-only baseline.
6. Header **Net PnL** remains the Book all-four total in all Options modes.
7. Verify on local Vite (`npm run dev:k3s` → `:5173`), not Prod refresh.

## Implementation map

- Detector + `E(d)`: `src/utils/ledger/sameDayOptionRolls.ts`
- As-of Open / by-day / by-open-month: `src/utils/ledger/optAsOfPnL.ts`
- Bulk parallel series: `src/utils/ledger/performanceBulk.ts` → `economicOptByDay`, `optOpenByDay`, `optOpenByOpenMonth`
- Chart: `src/utils/ledger/equityGrowthChart.ts` (`optionsMode`: book | economic | total)
- UI: Equity Growth `Book` | `Economic` | `Total`; monthly **Open** column; **Options path bridge** panel (Σ roll adj + roll table)
