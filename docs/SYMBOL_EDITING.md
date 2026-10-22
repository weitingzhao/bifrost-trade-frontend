# Symbol list editing

Multi-symbol additions use `components/symbol/SymbolListEditor.tsx`. Search text is transient: typing, blur, Escape, an unmatched query, and search failure cannot replace the selected list. Selecting a ticker or company match appends one normalized ticker. Existing names are disabled in results; removal is explicit per chip. Known holdings, watchlist names, and benchmarks remain searchable when remote reference search omits an ETF.

Adopters: Rules opportunity inspector, opportunity form (explicit scope), research draft, save as hypothesis, event query, simulator, Pine custom basket, option screener, and Watchlist's add-only popover. Simulator and Pine enforce their respective 10/50-name limits without silently truncating a selection. Watchlist keeps removal in its table and deduplicates stock contracts without blocking a stock just because an option contract exists.

Bulk source additions use `appendSymbols`: the opportunity watchlist subset's Add all and option screener sources preserve existing names and deduplicate case-insensitively. The watchlist subset's explicit Clear and individual checkbox removal retain their existing semantics (empty subset means all eligible watchlist names).

Single-symbol navigation and context pickers remain single-select. Read-only symbol parsing, URL decoding, and already-specific Add to Pool / Promote to Watchlist actions are not list replacement editors.

Regression coverage: shared picker selection, company matching, duplicate prevention, unknown-text blur/Enter, save lock, limits and add-only mode; bulk append overlap/empty source; opportunity whole-record persistence and retry; Pine submission and simulator payloads. Local acceptance covers event-query append/duplicate, Watchlist duplicate matching, option-source accumulation, and Rules/Live/Ledger smoke.
