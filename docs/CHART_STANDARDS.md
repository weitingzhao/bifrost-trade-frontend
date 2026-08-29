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

## Sign-off

Owner reviews this table (Wave 16-P1) before large port work. Priority order follows relative trust: VRP → IV Rank → Vol Surface → GEX → Terrain → others.
