# IB Connection — business acceptance checklist

**Stage**: New Frontend + Legacy API (phase 1). Compare **bifrost-trade-frontend** `/settings/ib` with **bifrost-trader-engine/frontend** IB Configure (`#settings-ib-connection`) on the **same** `VITE_API_*` (Monitor API, typically port 8765).

**Code references**: New [`IbConnectionPage.tsx`](../src/pages/settings/IbConnectionPage.tsx) · Legacy [`IbConnectionSection.tsx`](../../bifrost-trader-engine/frontend/src/pages/settings/IbConnectionSection.tsx)

## Side-by-side setup

| Side | Entry | URL |
|------|-------|-----|
| Legacy | Settings tab → sidebar **IB Configure** | `#settings-ib-connection` (sub-anchors below) |
| New | Settings → Configuration → **IB Configure** | `/settings/ib` |

Run Legacy and New on **different ports** if both dev servers are needed (e.g. engine `5173`, new `5174` with `vite --port 5174`). Both must point at the same `VITE_API_MONITOR` / status API.

**Pre-flight**: `GET /status` returns `config.ib_client` and `config.ib_flex` (or equivalent nested paths).

---

## Pass criteria (business parity, not pixel-perfect)

| Check | Legacy anchor | New anchor | Expected |
|-------|---------------|------------|----------|
| Connection read-only | `#ib-users` | `#ib-users` | Host IP, Secondary host, Port type match `status.config.ib_client`; New shows **Read-only · YAML** badge |
| Client IDs read-only | `#ib-client-ids` | `#ib-client-ids` | Daemon (Trading, Listener), Socket (Operator, Ingestor, Account Agent), Celery (Market Data) IDs match Legacy table |
| Account editable | `#ib-account` | `#ib-account` | Event Host / Event Secondary / Trading Host inputs editable; Secondary trading column shows em dash |
| Flex Query editable | `#ib-flex-query` | `#ib-flex-query` | Host + Secondary tokens; Cash Transactions + Trades query IDs; Secondary token disabled when no secondary host |
| Flex Preference | `#flex-preference` | `#flex-preference` | `default_range_days` and `init_range_days` (1–9999) |
| Save settings | Page Save button | Page **Save settings** | Both call `POST /config/ib` + `POST /config/flex` with same payload shape; success message; status refresh shows persisted values |
| Settings sidebar deep links | Sidebar sub-items | [`SettingsLayout`](../src/layout/SettingsLayout.tsx) IB Configure children | Each nav item scrolls to the matching Card (`#ib-users`, `#ib-client-ids`, `#ib-account`, `#ib-flex-query`, `#flex-preference`) |

**Known non-gap**: Host and Client ID blocks are read-only in Legacy (`readOnly` / `disabled` inputs). New uses read-only tables — same business rule (edit via `config.yaml` + process restart).

### Save test (reversible)

1. Note current Trading Account — Host value.
2. Change to a distinct test value → **Save settings** → confirm success on both UIs after refresh.
3. Restore original value → Save again.

---

## Agent code parity pre-flight

**Date**: 2026-06-04

| Item | Result |
|------|--------|
| Read-only fields sourced from `status.config.ib_client` / `port` | Pass |
| Editable account fields map to `postIbConfig` (`ib_host_account_id`, `stream_*`) | Pass |
| Flex save maps to `postFlexConfig` (tokens, accounts rows, range days) | Pass |
| `FLEX_QUERY_TYPES` (cash_transactions, trades) aligned with Legacy | Pass |
| Hash scroll via `useLayoutEffect` + `document.getElementById` | Pass |

No code fixes required from Agent pre-flight.

---

## Mechanical checks

```bash
cd bifrost-trade-frontend
npm run lint
npm run build
npm run check:legacy-css
```

---

## Sign-off

| Role | Pass | Date | Remarks |
|------|------|------|---------|
| Agent pre-flight (code + mechanical gate) | [x] | 2026-06-04 | See table above |
| Owner side-by-side (Legacy + New, same API) | [x] | 2026-06-04 | Business parity confirmed; Save reversible test passed |
