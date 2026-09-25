/**
 * The short name an account wears in a dense row: `HOST`, `SEC`, or the last
 * four digits of anything else.
 *
 * The host and secondary are the two accounts the IB client streams for
 * (`config.ib_client.account.event_host / event_secondary`); a book with a
 * third account still needs a name for it, and four digits are enough to tell
 * U…3214 from U…9175 without printing the whole id in a 60px column.
 */
export function accountTag(id: string, hostId: string, secondaryId: string): string {
  const norm = (s: string) => s.trim().toLowerCase()
  if (hostId && norm(id) === norm(hostId)) return 'HOST'
  if (secondaryId && norm(id) === norm(secondaryId)) return 'SEC'
  return id.slice(-4)
}
