import { forwardRef, useImperativeHandle, useState } from 'react'
import { KeyRound, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { researchAuthStore, useResearchAuth } from '@/lib/auth/researchUser'

export type ResearchUserSwitcherHandle = {
  openDialog: () => void
}

export const ResearchUserSwitcher = forwardRef<
  ResearchUserSwitcherHandle,
  {
    className?: string
    dialogStackLayer?: 'default' | 'elevated'
    open?: boolean
    onOpenChange?: (open: boolean) => void
    showTrigger?: boolean
  }
>(function ResearchUserSwitcher(
  {
    className,
    dialogStackLayer = 'default',
    open: controlledOpen,
    onOpenChange,
    showTrigger = true,
  },
  ref,
) {
  const { token, userLabel } = useResearchAuth()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [draftToken, setDraftToken] = useState(token ?? '')
  const [draftUser, setDraftUser] = useState(userLabel ?? '')

  function openDialog() {
    setDraftToken(token ?? '')
    setDraftUser(userLabel ?? '')
    setOpen(true)
  }

  useImperativeHandle(ref, () => ({ openDialog }), [token, userLabel, setOpen])

  return (
    <>
      {showTrigger ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={className}
          onClick={openDialog}
          aria-label="Research user"
        >
          <User className="size-3.5" aria-hidden />
          <span className="text-dense-caption">{userLabel ?? 'Set user'}</span>
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent stackLayer={dialogStackLayer} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Research identity</DialogTitle>
            <DialogDescription>
              Bearer token from <code className="text-dense-caption">RESEARCH_USERS</code> (Ops /
              K8s Secret). Sessions and playbook are scoped per user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-dense-caption text-muted-foreground">Display name</label>
              <Input
                value={draftUser}
                onChange={(e) => setDraftUser(e.target.value)}
                placeholder="alice"
                className="h-8 text-dense-label"
              />
            </div>
            <div className="space-y-1">
              <label className="text-dense-caption text-muted-foreground">Bearer token</label>
              <Input
                type="password"
                value={draftToken}
                onChange={(e) => setDraftToken(e.target.value)}
                placeholder="tok_…"
                className="h-8 text-dense-label font-mono"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {token ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  researchAuthStore.clear()
                  setOpen(false)
                }}
              >
                <LogOut className="size-3.5" /> Sign out
              </Button>
            ) : (
              <span />
            )}
            <Button
              type="button"
              size="sm"
              disabled={!draftToken.trim()}
              onClick={() => {
                researchAuthStore.setCredentials(draftToken, draftUser || 'user')
                setOpen(false)
              }}
            >
              <KeyRound className="size-3.5" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})
