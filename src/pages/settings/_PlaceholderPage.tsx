import { Construction } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'

interface Props {
  title: string
  description?: string
}

export default function PlaceholderPage({ title, description }: Props) {
  return (
    <PageShell className="flex flex-col gap-4">
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-16 text-center gap-3">
        <Construction className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Migration in progress — not yet implemented.</p>
      </div>
    </PageShell>
  )
}
