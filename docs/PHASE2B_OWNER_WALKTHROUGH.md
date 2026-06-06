# Phase 2B — Owner walkthrough（严格单变量）

**Agent 工具已就绪**（2026-06-05）。Owner 按 Sprint 逐域签字；签字表：[PHASE2B_SIGNOFF_MASTER.md](./PHASE2B_SIGNOFF_MASTER.md)。

## 每次开始前（Prod 并排对照）

```bash
# Terminal 1
cd bifrost-trade-infra
make signoff-start SESSION=1   # 会话 1–6，见下方 Sprint 表

# Terminal 2
cd bifrost-trade-frontend
./dev.sh                     # 固定 :4000；或 ./signoff-dev.sh
```

- **New**：http://localhost:4000（Mac Dev 栈 + New API 8765–8773）
- **Prod Legacy**：http://192.168.10.70/（无需本机 Legacy API）

（可选）本机 Legacy 单变量见下方「单域切换」。

## 单域切换（严格单变量）

仅改**一个** `VITE_API_*`，其余保持 New：

```bash
cd bifrost-trade-infra

# 1) 该域切 Legacy，重启 Vite，对照 Legacy UI
make switch-cutover-domain DOMAIN=docs MODE=legacy
# cd ../bifrost-trade-frontend && npm run dev

# 2) 该域切 New，重启 Vite，走 PHASE2B_SIGNOFF_MASTER 对应行
make switch-cutover-domain DOMAIN=docs MODE=new

# Phase 2B 关账：全部 New
make switch-cutover-domain DOMAIN=all-new
```

| Sprint | DOMAIN 参数 | Legacy → New | 重点路由 |
|--------|-------------|--------------|----------|
| 2B.1 | `docs` | 8719 → 8767 | `/settings/api` |
| 2B.2 | `monitor` | 8711 → 8765 | Global strip、`/operations/daemon` |
| 2B.2 | `market` | 8733 → 8772 | `/market/live` SSE |
| 2B.3 | `trading` | 8721 → 8769 | `/portfolio/ledger` |
| 2B.3 | `portfolio` | 8723 → 8771 | accounts、positions、performance |
| 2B.3 | `strategy` | 8735 → 8770 | instances + 6 strategy 路由 |
| 2B.4 | `ops` | 8713 → 8768 | `/operations/celery`、`/settings/socket` |
| 2B.4 | `massive` | 8741 → 8766 | `/settings/coverage/*`、`/settings/feed/*` |
| 2B.4 | `research` | 8731 → 8773 | 8 research 路由 + Inspector |

切换 **monitor** 时一并验：`messages`、`logs`、open-orders、active-strategy。

## Agent 已验（非 Owner 签字）

- [PHASE2B_AGENT_VERIFICATION.md](./PHASE2B_AGENT_VERIFICATION.md) — 9 域 health 200  
- [PHASE2B_SESSION_TRACKER.md](./PHASE2B_SESSION_TRACKER.md) — Wave A/B 会话进度  
- `make verify-wave-a-sessions` — Wave A 关键 API（2026-06-05 全通过）

UI 业务等价须 Owner 并排签字。

## 关账

全部 9 域 Owner 签字后 → [PHASE2B_SIGNOFF_MASTER.md](./PHASE2B_SIGNOFF_MASTER.md) Final sign-off → `make check-cutover-env`。
