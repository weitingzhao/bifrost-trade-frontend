/**
 * Where a retired path sends the reader — carrying what they arrived with.
 *
 * A redirect used to drop the query string, so `/research/screener?symbol=NVDA`
 * landed on the new page with no symbol and `/research?copilot=open` only kept
 * the flag because one page hand-rolled its own forward. The reader's
 * parameters are part of the request, not of the old name.
 *
 * The target's own parameters win a name clash and come first: a row that says
 * `/system/coverage?view=option` is naming the view, and an old link cannot
 * argue with it. The hash works the same way.
 */

function redirectSplitOnce(value: string, sep: string): [string, string] {
  const at = value.indexOf(sep)
  return at === -1 ? [value, ''] : [value.slice(0, at), value.slice(at + sep.length)]
}

export function redirectTargetFor(target: string, search: string, hash: string): string {
  const [beforeHash, targetHash] = redirectSplitOnce(target, '#')
  const [pathname, targetSearch] = redirectSplitOnce(beforeHash, '?')

  const params = new URLSearchParams(targetSearch)
  const named = new Set(params.keys())
  for (const [key, value] of new URLSearchParams(search)) {
    if (!named.has(key)) params.append(key, value)
  }

  const query = params.toString()
  const fragment = targetHash || hash.replace(/^#/, '')
  return `${pathname}${query ? `?${query}` : ''}${fragment ? `#${fragment}` : ''}`
}
