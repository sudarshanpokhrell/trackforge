import { createFileRoute } from '@tanstack/react-router'
import { InboxIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

export const Route = createFileRoute('/_authed/inbox')({
  component: InboxPage,
})

function InboxPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4 p-8 text-center">
      <div className="rounded-xl border bg-card p-4 shadow-[inset_0_1px_0_0_var(--edge-highlight)]">
        <HugeiconsIcon icon={InboxIcon} className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-card-title">Inbox</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        This feature is coming soon! You will be able to see mentions, assignments and updates on your issues here.
      </p>
    </div>
  )
}
