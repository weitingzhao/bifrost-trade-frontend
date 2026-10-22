/** Add a list without replacing existing names; ticker identity ignores case and whitespace. */
export function appendSymbols(existing: readonly string[], additions: readonly string[]): string[] {
  return [...new Set([...existing, ...additions].map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))]
}
