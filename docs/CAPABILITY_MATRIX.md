# Capability Matrix — Trade Frontend Research Pages (Wave R UX)

Cross-reference: `bifrost-research/docs/CAPABILITY_MATRIX.md` (engine/API depth).

## Status (2026-08-25)

| Route | Page | API / Source | FE Status | Target Wave |
|-------|------|--------------|-----------|-------------|
| `/research` | Research Home | `research.hypothesis` summary + SEPA / events / IV / sentiment aggregate | F | RS-A4 |
| `/research/daily-brief` | Daily Brief | `GET /research/daily-brief/synth` (+ R7 fallback) | F | R8 synth |
| `/research/event-radar` | Event Radar | `/research/event-radar/*` | F (table + themes) | R3 board |
| `/research/intraday-playbook` | Intraday Playbook | `/research/terrain/intraday` | F | R8 timeline |
| `/research/forecast-sessions` | Forecast Sessions | `/research/forecast/sessions` | F | R2 structures |
| `/research/gex-intraday` | GEX Intraday | `/research/gex/intraday` | F | R5 layers |
| `/research/analysis-model` | Analysis Model | terrain + smile | F | R6 vol col |
| `/research/momentum-radar` | Momentum Radar | `/research/momentum/radar` | F | R2 legend |
| `/research/sepa-daily-core` | SEPA Daily Core | `/research/sepa/model/*` | F | — |
| `/research/sepa` | Stock Screener | `/analytics/sepa/*` | F | — |
| `/research/discovery` | Option Discovery | market + research | F | — |
| `/research/iv-radar` | IV Radar | iv-percentile | F | — |
| `/research/vrp-lab` | IV-RV Spread Lab | `/research/vrp/{latest,history,extremes}` | F | RS-B-VRP2 |
| `/research/vol-surface-lab` | Vol Surface Lab (SVI) | `/research/vol-surface/{fit,term-structure,residuals,skew-extremes}` | F | RS-B-Surface2 |
| `/research/opex-cycle-lab` | OpEx Cycle Lab | `/research/opex-cycle/{current,history,pin-analysis}` | F | RS-B-OpEx2 |
| `/research/order-sentiment` | Order Sentiment | flow/sentiment + multi-leg | F | R2/R5 |
| `/research/watchlist` | Stock Watchlist | trade API | F | — |
| `/research/screener` | Option Screener | legacy | F | — |
| `/settings/data-readiness` | Stock Data Readiness | plugin readiness | F | R1 nav |
| `/research/greeks` | Contract Greeks | research API | F | — |
| `/research/risk` | Risk Model | monitor risk_summary | F | — |
| `/research/backtest` | Backtest (Settlement · Event Query tabs) | `/research/backtest/settlement` · `POST /research/backtest/event-query` · `GET /research/backtest/runs` | F | RS-C4 |

**Wave R1–R6 (2026-08-25)**: Nav reordered · Daily Brief landing · Event board 3 acts · Forecast structures cards · Backtest table · Momentum legend · Multi-leg grid · Macro gap/forward API · Settlement fine badges · GEX OI/Volume dual layer · Intraday replay slider · Analysis skew/kurtosis column.

**Wave R7 Layer A (2026-08-25)**: Daily Brief 3-part Verdict (FE synth) · Primary/Secondary card tiers · `?symbol=&date=` URL sync · EmptyHint deep links · Intraday LIVE verdict strip · LIVE scenario 2-col · Fan chart sparse ticks + LIVE marker · Path Transitions collapsible · replay slider removed (D-R7-b).

**Wave R8 Layer B (2026-08-25)**: `fetchDailyBriefSynth` primary path · `SessionTimelineChart` · regime hit rate meta on Verdict · `ResearchContextBar` on 8 pages · EmptyHint operator CronJob trigger · platform-api `POST /research/cronjobs/{id}/trigger`.

**Wave R9 Symbol Picker (2026-08-25)**: `SymbolPicker` (cmdk + Popover) · `GET /market/reference/tickers/search` debounced · `ResearchContextBar` + `GreeksPage` · preferred SPX/SPY/QQQ/IWM.

**Wave RS-A Flow Skeleton (2026-08-25)**: Research Home at `/research` aggregating hypothesis summary + Discovery hits (SEPA / events / IV / sentiment) · `SaveAsHypothesisButton` on Daily Brief · Event Radar · SEPA Daily Core · IV Radar · Contract Greeks (RS-A3, Greeks patched 2026-08-25 post-QA) · `HypothesisCard` / `DiscoveryHitList` / `useResearchHomeData` (RS-A4) · sidebar restructured to 5-stage taxonomy Home / Discover / Analyze / Validate / Data (RS-A5) — 19 legacy items preserved, no orphans · new hooks `useHypotheses` / API `researchHypothesis.ts` against `bifrost-research` :8795.

**Wave RS-B Volatility Labs (2026-08-25)**: 3 new Analyze pages driven by `bifrost-research` engines and API.
- **RS-B-VRP2** — `/research/vrp-lab` (IV-RV Spread) — `fetchVrpLatest/History/Extremes` · `VrpTimeSeriesChart` · percentile distribution · High/Low extremes table · `SaveAsHypothesisButton` origin `vrp-lab` (bifrost-research 0.10.0).
- **RS-B-Surface2** — `/research/vol-surface-lab` (SVI Vol Surface) — `fetchVolSurfaceFit/TermStructure/Residuals/SkewExtremes` · `TermStructureChart` (ATM vs DTE line) · `VolSurfaceHeatmap` (strike × expiry, `residual_z` / `iv_market` toggle, expiry segment) · Skew Extremes cross-symbol table · `SaveAsHypothesisButton` origin `vol-surface-lab` (bifrost-research 0.11.0).
- **RS-B-OpEx2** — `/research/opex-cycle-lab` (Vanna/Charm/OpEx) — `fetchOpexCurrent/History/PinAnalysis` · `VannaCharmMap` (dual bars per strike + spot / Vanna-zero / Charm-zero guide lines) · 12-cycle history table · Pin-Risk table with pinned/near/off band tags + pin rate · `SaveAsHypothesisButton` origin `opex-cycle-lab` (bifrost-research 0.12.0).

**Wave RS-C Backtest Upgrade (2026-08-25)**: Event-driven backtest engine layered onto the existing forecast-settlement page.
- **RS-C1** — Engine: `event_defs` / `strategy_templates` (6 templates: `long_atm_straddle` · `short_atm_straddle` · `long_atm_call` · `long_atm_put` · `short_30d_iron_condor` · `covered_call_1sd`) / `event_query` — resolves earnings (corp actions → event radar heuristic → 9-symbol stub) / opex / sepa_hit / iv_percentile_threshold; `sql` raises NotImplementedError in v1.
- **RS-C2** — `FillConfig(slippage_pct_of_spread=0.2, commission_per_contract=0.65)`; degrades to close when bid/ask missing (backward compatible with `raw_market.option_daily` OHLCV-only rows).
- **RS-C3** — `walk_forward.py` (windows, aggregate) + `benchmark.py` (SPY buy-hold, zero-signal control). v1 uses P&L proxy series.
- **RS-C4** — `research.backtest_run` DDL + repository + `POST /research/backtest/event-query` · `GET /research/backtest/runs` · `GET /research/backtest/run/{run_id}` (bifrost-research 0.13.0); FE `EventQueryBuilder` + `BacktestRunResultCard`; `/research/backtest` gains Settlement · Event Query tabs; `ResearchHomePage` Recent Backtests wired to `useBacktestRuns({limit:5})`; run linked to hypothesis via `linked_backtest_ids` when `hypothesis_id` provided.

**Wave RS-E1 Static Cockpit (2026-08-25)**: Cross-page Research Cockpit drawer (Radix Sheet right, `⌘K` / Esc / header Pin) · tabs Pins · Context · Actions · Copilot · Settings · pinboard (`bifrost.cockpit.pins.v1`, max 24 LRU) · session context two-way bound to `ResearchContextBar` · quick actions + freshness lamps (hypothesis / backtest / discovery @60s). Zustand not in deps — external store + localStorage. D-RS-E-a/b implemented.

**Wave RS-E2 Read-only Copilot (2026-08-25)**: Copilot tab enabled · `POST /research/copilot/stream` SSE (token / tool_call / tool_result / error / done) · `GET /research/copilot/usage` polled 30s · Settings `AiUsageTile` + Clear session · Research MCP `:8796` (25 read-only tools) · multi-provider Claude / OpenAI / Ollama (keys server-side) · daily cap `$2` default (`COPILOT_DAILY_CAP_USD`) · source chips navigate to Lab pages. D-RS-E-c/d/h/i. bifrost-research **0.14.0**.

**Wave RS-E3 Morning/EOD Agents + Inbox (2026-08-25)**: Cockpit **Inbox** tab (pending badge) · `DraftCard` Approve/Dismiss · Actions "Run Morning Prep now" / "Run EOD Review now" · FE `api/researchDrafts.ts` + `hooks/useResearchDrafts.ts` · BE drafts + agent run endpoints · agents draft-only (D-RS-E-e). bifrost-research **0.15.0**.

**Wave RS-E4 Interactive AI Writes (2026-08-25)**: Copilot `DiffApprovalCard` + `DiffPayloadRenderer` · Approve → `POST /research/copilot/approve` then `/execute` · Reject → dismiss + chat note · write MCP tools dry_run default · HMAC tokens (D-RS-E-e/g). bifrost-research **0.16.0**. **Wave RS-E program complete.** Runbook: `bifrost-research/docs/COCKPIT_RUNBOOK.md`.

**Wave RS-F Copilot v2 · OpenAI Agents SDK + DeepSeek + Multi-Agent (Complete — 2026-08-26)**: Copilot runtime on `openai-agents` (backend) with Cockpit v2 UX shipped. FE: Dock/Overlay toggle (Settings) · Trace panel · Session list sidebar · Agent handoff chips · DeepSeek default in model catalog. SSE extended (`agent_handoff`, `guardrail`). bifrost-research **0.17.0**. Ops / Hermes untouched.

**Frontend pages**: 17 legacy routes + `/research` Home + VRP Lab + Vol Surface Lab + OpEx Cycle Lab + Backtest (Settlement · Event Query) · Cockpit overlay/dock (Inbox / Pins / Context / Actions / Copilot / Settings) · **RS-F shipped**: Dock/Overlay toggle · Trace panel · Session sidebar · Agent chips · DeepSeek models. **Remaining backlog**: gexbot third-party precision, TradeFlash ingest, Console theme registry editor (D-R6-d deferred); Symbol Picker rollout to Watchlist / Discovery / Option Screener (post-R9); Hypothesis detail page (post-RS-A6, deferred); real-underlying walk-forward (post-RS-C3 v2, deferred); Autonomous Agent RS-E5 deferred; RS-F6 Morning/EOD SDK migration optional; RS-F7 SandboxAgent deferred; MCP Streamable HTTP migration (RS-G-optional) deferred.
