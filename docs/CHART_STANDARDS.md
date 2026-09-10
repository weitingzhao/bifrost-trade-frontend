# Chart Standards — Bifrost Research Analyze

Industry-aligned chart contracts for Analyze lenses. Prefer copying Tastyworks / Bloomberg / SqueezeMetrics patterns over inventing new visual languages.

| Lens | Benchmark | Current (as of Wave 16) | Target |
|------|-----------|-------------------------|--------|
| **VRP Lab** | Dual hist of IV vs RV + VRP time series (Tasty / vol desks) | `VrpTimeSeriesChart` + **IV/RV dual histogram** on VRP Lab | Keep dual hist + percentile distribution |
| **IV Radar** | IV Rank 0–100 strip + optional 90d spark (Bloomberg rank rail) | Universe table + gauges + **`IvRankStrip`** | Wire true 90d history when `/iv-percentile/history` exists |
| **Vol Surface** | 2D tenor × strike grid / smile slices | `VolSurface3DChart` + term structure | Prefer 2D heatmap for scanability; 3D optional |
| **GEX Intraday** | Strike bars + gamma-flip / walls (SqueezeMetrics-style) | `GexStrikeChart` with `zeroGamma` / walls | Ensure flip + call/put wall lines always labeled |
| **Terrain** | Regime state timeline | Progress bars + regime tag | Add compact regime timeline chips |
| **Order Sentiment** | Signed flow bars (real tape) | KPI cards + multi-leg table | Defer heavy chart until real tape trust ↑ |
| **OpEx Cycle** | Cycle calendar / countdown | Existing OpEx charts | Keep; polish labels |
| **Multi-leg Flow** | Notional ranked table | Table on Order Sentiment | Table-first |
| **Forecast Sessions** | Session fan / timeline | `SessionTimelineChart` / `ScenarioFanChart` | Keep |
| **Intraday Playbook** | Checklist + levels | Page checklist | Low chart priority until Signal Health trust |

## Rules

1. **Same lens → same primitive** across pages (reuse `@/components/charts/*`).
2. **English** UI labels only.
3. **Dense UI tokens** for typography; no ad-hoc hex for PnL/entity colors.
4. Low-trust lenses (per Signal Health) do not get new chart investment until sample size justifies it.
5. Observe-only (D10) — no trade-execution chrome on charts.

## Primitives — geometry, colour, and the no-data case

The rules above say what a lens should look like. These say what every chart is
built from, because 42 files draw SVG here and 25 of them were writing the same
four-line scale preamble by hand.

| Concern | Use | Never |
|---|---|---|
| Value → pixel | `linearScale()` from `@/lib/chartScale` | `Math.min(...)` + `(v - min) / range` inline |
| Axis ticks | `niceTicks()` | `[min, min + range / 2, max]` |
| Grid / axis / series colour | `chartTokens` from `@/lib/chartTokens` | `rgba(...)`, `#hex` |
| Nothing to draw | `dataState()` + `DataStateBlock` | `return null` |

Three of those are correctness, not tidiness:

- **`includeZero` is a decision, not a default.** Bars need a zero baseline or a
  column's height stops reading as a magnitude. A price line must not have one,
  or the movement the chart exists to show gets flattened against it. Copied
  scale code loses that distinction, and two charts of the same quantity end up
  on different baselines with nothing saying so.
- **`Math.min(...arr)` throws past the argument limit.** An option chain reaches
  it. `linearScale` reduces instead of spreading.
- **`return null` makes a chart vanish from the layout**, which reads as "there
  is nothing here" whether the series was empty or the request failed. Same rule
  as every other panel — see the data-states section of `DENSE_UI.md`.

`components/stockInspector/charts/SvgBarChart.tsx` is the reference migration.

## Sign-off

Owner reviews this table (Wave 16-P1) before large port work. Priority order follows relative trust: VRP → IV Rank → Vol Surface → GEX → Terrain → others.
