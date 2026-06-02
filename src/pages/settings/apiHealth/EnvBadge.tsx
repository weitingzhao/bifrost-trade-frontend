import { Badge } from '@/components/ui/badge'

export function EnvBadge({ profile, ok }: { profile?: 'dev' | 'prod'; ok: boolean | null }) {
  if (profile === 'dev') {
    return (
      <Badge
        variant="outline"
        className="border-sky-500/40 bg-sky-500/10 text-sky-500 hover:bg-sky-500/15 dark:text-sky-400"
      >
        Development
      </Badge>
    )
  }
  if (profile === 'prod') {
    return (
      <Badge
        variant="outline"
        className="border-green-600/40 bg-green-600/10 text-green-600 hover:bg-green-600/15 dark:text-green-400"
      >
        Production
      </Badge>
    )
  }
  if (ok === true) return <Badge variant="outline">Custom</Badge>
  if (ok === false) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Unknown
      </Badge>
    )
  }
  return null
}
