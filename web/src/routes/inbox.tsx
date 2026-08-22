import { createFileRoute } from '@tanstack/react-router'
import { Bell, Check, Circle, MessageSquare, GitPullRequest } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/inbox')({
  component: InboxPage,
})

function InboxPage() {
  const notifications = [
    {
      id: 1,
      type: 'mention',
      title: 'Alice mentioned you in SRS-12',
      time: '5m ago',
      read: false,
      icon: MessageSquare,
    },
    {
      id: 2,
      type: 'assigned',
      title: 'You were assigned to SRS-9',
      time: '1h ago',
      read: false,
      icon: GitPullRequest,
    },
    {
      id: 3,
      type: 'update',
      title: 'Bob closed SRS-7',
      time: '3h ago',
      read: true,
      icon: Check,
    },
    {
      id: 4,
      type: 'comment',
      title: 'Charlie commented on SRS-4',
      time: '5h ago',
      read: true,
      icon: MessageSquare,
    },
  ]

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
          {unreadCount > 0 && (
            <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Check className="mr-1 size-3" />
          Mark all as read
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-4 border-b px-4 py-3 last:border-0 hover:bg-muted/30',
              !item.read && 'bg-muted/10'
            )}
          >
            <div className="mt-0.5">
              {!item.read ? (
                <Circle className="size-2 fill-primary text-primary" />
              ) : (
                <div className="size-2" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm">{item.title}</p>
              <span className="text-xs text-muted-foreground">{item.time}</span>
            </div>
            <item.icon className="size-4 text-muted-foreground" />
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Bell className="mx-auto size-8 mb-2 opacity-50" />
            <p>All caught up!</p>
          </div>
        )}
      </div>
    </div>
  )
}