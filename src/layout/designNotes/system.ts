/**
 * Design-walk notes · System.
 *
 * System and Docs — the machine room, and the pages about the app itself.
 *
 * One file per layer because the record only grows: the notes are long on
 * purpose, and a single catalogue crossed the 800-line ratchet on the day the
 * Review re-walk was written. Split by the group each page belongs to, which
 * is the seam the reader already has in their head.
 */
export const SYSTEM_NOTES: Record<string, string> = {
  '/system/coverage':
    'Removed by design Rev 2026-09-15.13. Ingest and coverage detail is Ops Console work; this console keeps only the nightly-data lamp on /system/status.',
  '/system/feed':
    'Removed by design Rev 2026-09-15.13. Feed diagnosis moves to the Ops Console; the trade-facing half is the market-data row on /system/status.',
  '/system/data-readiness':
    'Removed by design Rev 2026-09-15.13. "Did the data land" is answered by Signal Health and the nightly-data row on /system/status.',
  '/system/topology':
    'Removed by design Rev 2026-09-15.13 — cluster topology is Ops Console material, not a trading question.',
  '/system/daemon':
    'Removed by design Rev 2026-09-15.13. "Can I trade" survives as the trading row on /system/status; the daemon detail is Ops.',
  '/system/api':
    'Removed by design Rev 2026-09-15.13 — API latency is diagnosis, and diagnosis is the Ops Console.',
  '/system/socket':
    'Removed by design Rev 2026-09-15.13 — socket state is Ops Console material; the trader sees the market-data lamp instead.',
  '/system/platform':
    'Removed by design Rev 2026-09-15.13 — plugin scheduling belongs to the Ops Console.',
  '/system/ib':
    'Absorbed by design Rev 2026-09-15.13 into `/settings` (IB user, client id, account) — trader-owned configuration, not a system view.',
}
