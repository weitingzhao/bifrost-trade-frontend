import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePositionCategories } from '@/hooks/usePositionCategories'
import {
  createPositionCategory,
  updatePositionCategory,
  deletePositionCategory,
  tagPosition,
} from '@/api/portfolio'
import type { IbAccountSnapshot } from '@/types/monitor'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: IbAccountSnapshot[]
  onRefreshed: () => void
}

export function CategoriesModal({ open, onOpenChange, accounts, onRefreshed }: Props) {
  const queryClient = useQueryClient()
  const { data: catData } = usePositionCategories()
  const categories = catData?.items ?? []

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [taggingCk, setTaggingCk] = useState<string | null>(null)

  function invalidateCats() {
    queryClient.invalidateQueries({ queryKey: ['portfolio', 'position-categories'] })
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setError(null)
    const r = await createPositionCategory(newName.trim()).catch((e: Error) => ({ ok: false, id: null, error: e.message }))
    if (!r.ok) { setError(r.error ?? 'Failed'); return }
    setNewName('')
    invalidateCats()
  }

  async function handleUpdate(id: number) {
    setError(null)
    const r = await updatePositionCategory(id, editName.trim()).catch((e: Error) => ({ ok: false, error: e.message }))
    if (!r.ok) { setError(r.error ?? 'Failed'); return }
    setEditingId(null)
    invalidateCats()
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete category "${name}"? Positions tagged with it will be untagged.`)) return
    setError(null)
    const r = await deletePositionCategory(id).catch((e: Error) => ({ ok: false, error: e.message }))
    if (!r.ok) { setError(r.error ?? 'Failed'); return }
    invalidateCats()
  }

  async function handleTag(accountId: string, contractKey: string, categoryId: string) {
    setTaggingCk(contractKey)
    const catId = categoryId === '__none__' || categoryId === '' ? null : Number(categoryId)
    await tagPosition({ account_id: accountId, contract_key: contractKey, category_id: catId })
      .catch(() => null)
    setTaggingCk(null)
    onRefreshed()
    invalidateCats()
  }

  const stkAccounts = accounts.filter((a) => (a.positions ?? []).some((p) => p.secType === 'STK'))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Position Categories</DialogTitle>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
        )}

        {/* Category CRUD */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Manage Categories
          </p>
          <div className="space-y-1">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 py-1">
                {editingId === cat.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-sm flex-1"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(cat.id) }}
                      autoFocus
                    />
                    <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleUpdate(cat.id)}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{cat.name}</span>
                    {cat.description && (
                      <span className="text-xs text-muted-foreground">{cat.description}</span>
                    )}
                    <Button
                      size="sm" variant="ghost" className="h-7 text-xs"
                      onClick={() => { setEditingId(cat.id); setEditName(cat.name) }}
                    >Edit</Button>
                    <Button
                      size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDelete(cat.id, cat.name)}
                    >Delete</Button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Input
              placeholder="New category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            />
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>Add</Button>
          </div>
        </div>

        <Separator />

        {/* Position assignment */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Assign Category to Positions
          </p>

          {stkAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No STK positions available.</p>
          ) : stkAccounts.length === 1 ? (
            <AssignTab
              account={stkAccounts[0]}
              categories={categories}
              taggingCk={taggingCk}
              onTag={handleTag}
            />
          ) : (
            <Tabs defaultValue={stkAccounts[0].account_id ?? '0'}>
              <TabsList>
                {stkAccounts.map((a, i) => (
                  <TabsTrigger key={i} value={a.account_id ?? String(i)}>
                    {a.account_id ?? `Account ${i + 1}`}
                  </TabsTrigger>
                ))}
              </TabsList>
              {stkAccounts.map((a, i) => (
                <TabsContent key={i} value={a.account_id ?? String(i)}>
                  <AssignTab
                    account={a}
                    categories={categories}
                    taggingCk={taggingCk}
                    onTag={handleTag}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AssignTab({
  account,
  categories,
  taggingCk,
  onTag,
}: {
  account: IbAccountSnapshot
  categories: { id: number; name: string }[]
  taggingCk: string | null
  onTag: (accountId: string, contractKey: string, categoryId: string) => void
}) {
  const stkPositions = (account.positions ?? []).filter((p) => p.secType?.toUpperCase() === 'STK')
  const accountId = account.account_id ?? ''

  // Optimistic local state: immediately reflects user selection without waiting for server refetch.
  // Resets naturally when the modal is closed (component unmounts).
  const [localValues, setLocalValues] = useState<Record<string, string>>({})

  if (stkPositions.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No STK positions in this account.</p>
  }

  return (
    <div className="space-y-1.5 pt-2 max-h-60 overflow-y-auto">
      {stkPositions.map((pos) => {
        const ck = pos.contract_key ?? pos.symbol ?? ''
        const serverValue = pos.category_id != null ? String(pos.category_id) : '__none__'
        const currentValue = localValues[ck] ?? serverValue
        return (
          <div key={ck} className="flex items-center justify-between gap-3">
            <span className="font-mono text-sm">{pos.symbol ?? '—'}</span>
            <div className="flex items-center gap-2">
              {taggingCk === ck && (
                <Badge variant="secondary" className="text-xs">Saving…</Badge>
              )}
              <Select
                value={currentValue}
                onValueChange={(v) => {
                  setLocalValues((prev) => ({ ...prev, [ck]: v }))
                  onTag(accountId, ck, v)
                }}
                disabled={taggingCk === ck}
              >
                <SelectTrigger className="h-7 text-xs w-44">
                  <SelectValue placeholder="Uncategorized" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Uncategorized</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      })}
    </div>
  )
}
