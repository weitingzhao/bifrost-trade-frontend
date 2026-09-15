/**
 * Empty-state starter group order (§11.2.7). Portfolio and the Trading Copilot
 * page lead with The book; everywhere else This page stays first.
 */
export type StarterGroupId = 'page' | 'book' | 'loop'

export function starterGroupOrder(pathname: string): StarterGroupId[] {
  if (pathname.startsWith('/portfolio') || pathname.startsWith('/research/copilot/trading')) {
    return ['book', 'page', 'loop']
  }
  return ['page', 'book', 'loop']
}

/** Empty-state starter tool line. Null when we do not know which tools it reaches. */
export function starterToolCaption(tools?: readonly string[]): string | null {
  if (!tools?.length) return null
  return tools.join(' · ')
}
