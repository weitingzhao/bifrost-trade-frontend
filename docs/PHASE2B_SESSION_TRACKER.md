# Phase 2B — Session tracker (Wave A / Wave B)

**Owner UI sign-off**: [PHASE2B_SIGNOFF_MASTER.md](./PHASE2B_SIGNOFF_MASTER.md) — **你**勾选 Pass + Owner date。  
**Agent API gate**: `cd bifrost-trade-infra && make verify-wave-a-sessions`（2026-06-05 全 Wave A 通过）。

## 每次会话命令

```bash
cd bifrost-trade-infra
make dev-preflight
make verify-wave-a-sessions    # 当前会话域在脚本输出中对应一节

# 严格单变量
make switch-cutover-domain DOMAIN=<域> MODE=legacy   # 对照 Legacy
make switch-cutover-domain DOMAIN=<域> MODE=new      # 验收 New

cd ../bifrost-trade-frontend && npm run dev
```

---

## Wave A — 弱依赖 IB

| 会话 | 域 | Agent API | Owner UI | Owner date | 备注 |
|------|-----|-----------|----------|------------|------|
| 1 | docs | pass | **已签** | 2026-06-04 | `/settings/api` 5 tabs + docs health ✓ |
| 2 | portfolio | pass | **已签** | 2026-06-04 | accounts、positions、performance、model-analysis 全 ✓ |
| 3 | trading | pass | **已签** | 2026-06-05 | `/portfolio/ledger` ✓ |
| 4 | strategy | pass | **已签** | 2026-06-05 | instances + win-rate + structures + opportunities + allocations + gates + option-category ✓ |
| 5 | research | pass | **已签** | 2026-06-05 | 8 路由 + Stock Inspector ✓ |
| 6 | massive | pass | **已签** | 2026-06-05 | coverage/feed + Beat schedule ✓ |

**Agent 机械门禁（2026-06-05）**: `lint` · `build` · `check:legacy-css` — pass。

**Wave A Owner**：Session 1–6 **全部已签**（2026-06-05）。

**Wave B Owner**：Session 7–9 **全部已签**（2026-06-04）。

**Phase 2B**：**CLOSED**（2026-06-04）— 9/9 域 Owner 签字 + Final 四项完成。

---

## Wave B — 强依赖 IB / 流

| 会话 | 域 | Agent API | Owner UI | Owner date | 备注 |
|------|-----|-----------|----------|------------|------|
| 7 | monitor | pass | **已签** | 2026-06-04 | Global strip、daemon、allocations ✓；ingestor 离线 degraded 已备注 |
| 8 | market | pass | **已签** | 2026-06-04 | `/market/live` SSE + category groups ✓ |
| 9 | ops | pass | **已签** | 2026-06-04 | celery 8 表 + socket ingest ✓ |

---

## 关账 checklist — **完成**

- [x] `PHASE2B_SIGNOFF_MASTER` 全部 Pass + Final 四项
- [x] `make switch-cutover-domain DOMAIN=all-new`
- [x] `make dev-health` 9/9
- [x] `make check-cutover-env`
- [x] `MIGRATION_TRACKING.md` §10 Owner 列 + §8 → **Phase 2B CLOSED**
