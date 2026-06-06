# Phase 2B — Agent verification log

Mechanical and API smoke only. **Owner UI sign-off** remains in [PHASE2B_SIGNOFF_MASTER.md](./PHASE2B_SIGNOFF_MASTER.md).

## 2026-06-05 — Preflight + domain smoke

| Check | Result |
|-------|--------|
| `make dev-health` | 9/9 OK (LAN PG `192.168.10.80`, Redis `192.168.10.70`) |
| `make verify-domain-apis` | 9/9 OK |
| `celery-worker` | Up |
| `npm run lint` | pass |
| `npm run build` | pass |
| `npm run check:legacy-css` | pass |
| `make check-cutover-env` | pass (no Legacy ports in `.env.development`) |
| `switch_cutover_domain.sh` | pass (docs legacy → all-new) |

### Per-sprint API endpoints (New stack)

| Sprint | Domain | Endpoint | HTTP |
|--------|--------|----------|------|
| 2B.1 | docs | `GET :8767/research/docs/health` | 200 |
| 2B.2 | monitor | `GET :8765/status` | 200 |
| 2B.2 | market | `GET :8772/health` | 200 |
| 2B.3 | trading | `GET :8769/health` | 200 |
| 2B.3 | portfolio | `GET :8771/health` | 200 |
| 2B.3 | strategy | `GET :8770/health` | 200 |
| 2B.4 | ops | `GET :8768/health` | 200 |
| 2B.4 | massive | `GET :8766/research/massive/health` | 200 |
| 2B.4 | research | `GET :8773/health` | 200 |

### Wave A API session preflight (2026-06-05)

`make verify-wave-a-sessions` — **all sessions pass**. Tracker: [PHASE2B_SESSION_TRACKER.md](./PHASE2B_SESSION_TRACKER.md).

### Owner pending (UI sign-off — 你本人勾选)

**Wave A**（可现在开始，并排 Legacy→New）:

- [x] Session 1 docs — `/settings/api`（2026-06-04）
- [x] Session 2 portfolio — accounts / positions / performance / model-analysis（2026-06-04）
- [x] Session 3 trading — ledger（2026-06-05）
- [x] Session 4 strategy — instances + win-rate + structures + opportunities + allocations + gates + option-category（2026-06-05）
- [x] Session 5 research — 8 routes + Inspector（2026-06-05）
- [x] Session 6 massive — coverage / feed（2026-06-05）

**Wave B**（TWS + ingestor 后）:

- [x] Session 7 monitor — global strip、daemon、allocations、TopNav 窄屏（2026-06-04；degraded 已备注）
- [x] Session 8 market / Live — quotes table、SSE、watchlist OPT/STK（2026-06-04）
- [x] Session 9 ops / socket — celery + ingest control（2026-06-04）

- [x] Final sign-off in PHASE2B_SIGNOFF_MASTER.md — **Phase 2B CLOSED**（2026-06-04）
