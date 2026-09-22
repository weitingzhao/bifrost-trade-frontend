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
  '/research/signal-health':
    'Walked 2026-09-22 against Research Signal Health.dc.html at Rev 2026-09-19.2, rendered side by side with the app on local DEV (:5173). The design calls this page ground truth for every asof in the console (§17) — every AsofTag reads this page’s asof, never its own clock — and it earns that with one line beside the Overall tag: not degraded, but which lens is late and what that does to the readings downstream of it. The page had the tag and the timestamp and not the line, which is the half a reader can act on. Built: the Overall rule line (and the judged-by), Expected and Downstream on the freshness table, the design’s legend about grey rows, the two compositions, Universe readiness, and the Lens Coverage → the design puts in the header. The finding is two headlines that hide their own composition, measured on DEV 2026-09-22. Canonical P&L answers insufficient_pct 0.0 — every leg priced — and by_quality says all 234,415 rows are iv_interpolated: not one priced off a full chain, which is what the design’s 96.4% means. 0% insufficient is true and reads as the opposite. IV reconstruction answers solver_ok_pct 0.997 while by_status says 1,950,684 of 2,130,014 rows are vendor_snapshot — 91.6% never reach the solver at all; it succeeded at what it was asked, and it was asked about 8% of the data. Neither number is wrong and neither is worth much without the breakdown under it, so both panels lead with the breakdown and say what the headline does not. The second finding is smaller and worse: both blocks carry an error field the page never read. On DEV the IV block answers rows 0 with error canceling statement due to statement timeout — a Postgres timeout on that one query — and the page rendered 0 rows · Solver OK —, which reads as the solver produced nothing rather than this did not run. A failed block now says so and its numbers are called absent, not zero. Universe readiness comes from the SEPA criteria stats, which the design notes this page absorbed from the stock screener: universe 5,321 · tech-ready 4,539 (85%) · fund-ready 3,522 (66%) · no fundamentals 1,799. Its own sentence is carried too, because it is the important half — readiness is a coverage fact, not a stock pick. Owed: the design’s Both · enters ratings row. The criteria stats count the fundamental and technical sides independently and carry no intersection, so a number there would be an assumption about overlap; the row shows and says owed. Diverged, each with its reason. Downstream links only where this side has the page — an approximate destination answers where does this land with a guess — and the four tables with no reader render plain. The design lists eight lenses and this engine probes six; the six are its own (vrp, canonical_pnl, iv_reconstructed, playbook_trigger, scan, forecast_settlement), so the table is the engine’s rather than the design’s names over different tables. The design’s unprobed status has no row today because this engine probes everything it lists; the legend still names it, because an unprobed lens is not a down lens is a rule about reading a grey row, not a row that must exist. And the Hypotheses panel stopped printing active twice — total_active beside a counts map that already contains it said 32 twice. Contract: sla_hours added to SignalFreshnessItem as optional — the engine sends it per row and the type did not carry it, so the Expected column had nothing to read; a row without one says no cadence recorded rather than being judged against a number invented here.',
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
