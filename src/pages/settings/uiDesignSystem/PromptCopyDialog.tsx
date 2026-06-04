import { useMemo, useState } from 'react'
import { Check, ClipboardCopy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { buildPrompt } from './buildPrompt'
import type { PromptSpecId } from './promptSpecs'
import {
  DEFAULT_PROMPT_SCOPE,
  PROMPT_DOMAINS,
  PROMPT_PAGES,
  pagesByDomain,
  type PromptDomainId,
  type PromptScope,
} from './scopeRegistry'

type ScopeKind = 'site' | 'domain' | 'page'

interface Props {
  specId: PromptSpecId
  label?: string
}

export function PromptCopyDialog({ specId, label = 'Copy Prompt' }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [scopeKind, setScopeKind] = useState<ScopeKind>('site')
  const [domainId, setDomainId] = useState<PromptDomainId>('portfolio')
  const [pageRoute, setPageRoute] = useState(PROMPT_PAGES[0]?.route ?? '/market/live')

  const scope: PromptScope = useMemo(() => {
    if (scopeKind === 'site') return DEFAULT_PROMPT_SCOPE
    if (scopeKind === 'domain') return { kind: 'domain', domain: domainId }
    const page = PROMPT_PAGES.find(p => p.route === pageRoute)
    return {
      kind: 'page',
      route: pageRoute,
      label: page?.label ?? pageRoute,
      domain: page?.domain ?? domainId,
    }
  }, [scopeKind, domainId, pageRoute])

  const promptText = useMemo(() => buildPrompt(specId, scope), [specId, scope])
  const previewLines = promptText.split('\n').slice(0, 8).join('\n')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = promptText
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 gap-1.5 px-2.5 text-xs font-medium"
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Copy Fix Prompt</DialogTitle>
          <DialogDescription>
            Choose scope, then copy a prompt that instructs an Agent to scan and fix violations
            directly in code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide">Scope</Label>
            <RadioGroup
              value={scopeKind}
              onValueChange={v => setScopeKind(v as ScopeKind)}
              className="gap-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="site" id={`scope-site-${specId}`} />
                <Label htmlFor={`scope-site-${specId}`} className="font-normal">
                  Site-wide — all pages & components
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="domain" id={`scope-domain-${specId}`} />
                <Label htmlFor={`scope-domain-${specId}`} className="font-normal">
                  Domain directory
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="page" id={`scope-page-${specId}`} />
                <Label htmlFor={`scope-page-${specId}`} className="font-normal">
                  Single page
                </Label>
              </div>
            </RadioGroup>
          </div>

          {scopeKind === 'domain' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Domain</Label>
              <Select value={domainId} onValueChange={v => setDomainId(v as PromptDomainId)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROMPT_DOMAINS.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scopeKind === 'page' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Page</Label>
              <Select value={pageRoute} onValueChange={setPageRoute}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {PROMPT_DOMAINS.map(d => (
                    <SelectGroup key={d.id}>
                      <SelectLabel>{d.label}</SelectLabel>
                      {pagesByDomain(d.id).map(p => (
                        <SelectItem key={p.route} value={p.route}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Preview ({promptText.length.toLocaleString()} chars)
            </Label>
            <pre className="max-h-32 overflow-auto rounded-md border border-border bg-background p-2 text-[10px] leading-snug text-muted-foreground whitespace-pre-wrap">
              {previewLines}
              {'\n…'}
            </pre>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={() => void handleCopy()} className="gap-1.5">
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-success" />
                Copied
              </>
            ) : (
              <>
                <ClipboardCopy className="h-3.5 w-3.5" />
                Copy Prompt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
