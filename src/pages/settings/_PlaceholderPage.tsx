import { Construction } from 'lucide-react'

interface Props {
  title: string
  description?: string
}

export default function PlaceholderPage({ title, description }: Props) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-16 text-center gap-3">
        <Construction className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Migration in progress — not yet implemented.</p>
      </div>
    </div>
  )
}
