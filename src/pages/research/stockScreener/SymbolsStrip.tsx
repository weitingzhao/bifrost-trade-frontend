interface Summary {
  total: number
  found: number
  fundPass: number
  techPass: number
  insufficient: number
}

interface Props {
  symbolText: string
  onSymbolTextChange: (text: string) => void
  parsedCount: number
  asOf?: string | null
  loading?: boolean
  error?: unknown
  summary?: Summary | null
}

export function SymbolsStrip({
  symbolText,
  onSymbolTextChange,
  parsedCount,
  asOf,
  loading,
  error,
  summary,
}: Props) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold">Symbols</span>
        {asOf && <span className="font-mono text-dense-caption text-muted-foreground">as-of {asOf}</span>}
        {loading && <span className="text-dense-caption text-muted-foreground">loading…</span>}
      </div>
      <textarea
        rows={2}
        value={symbolText}
        onChange={(e) => onSymbolTextChange(e.target.value)}
        placeholder="AAPL,MSFT,NVDA  — or select conditions above"
        className="w-full font-mono text-xs min-h-[52px] resize-y rounded-md border border-input bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-dense-meta">
        <span className="text-muted-foreground">
          Parsed <strong className="text-foreground font-mono">{parsedCount}</strong>
        </span>
        {summary && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              Found <strong className="text-foreground font-mono">{summary.found}</strong>/{summary.total}
            </span>
            <span className="text-screener-fund font-mono">
              F8/8 <strong>{summary.fundPass}</strong>
            </span>
            {summary.techPass > 0 && (
              <span className="text-screener-tech font-mono">
                T11/11 <strong>{summary.techPass}</strong>
              </span>
            )}
            {summary.insufficient > 0 && (
              <span className="text-yellow-500 font-mono">
                insuff <strong>{summary.insufficient}</strong>
              </span>
            )}
          </>
        )}
        {error != null && (
          <span className="text-destructive">
            {error instanceof Error ? error.message : String(error)}
          </span>
        )}
      </div>
    </div>
  )
}
