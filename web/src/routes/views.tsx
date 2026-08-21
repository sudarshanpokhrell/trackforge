import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Plus, Eye, Filter, Clock, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/views')({
  component: ViewsPage,
})

function ViewsPage() {
  const views = [
    { id: 1, name: 'My Issues', icon: Eye, color: 'from-blue-500 to-cyan-400' },
    { id: 2, name: 'Assigned to me', icon: Filter, color: 'from-purple-500 to-pink-400' },
    { id: 3, name: 'Recently updated', icon: Clock, color: 'from-amber-500 to-orange-400' },
    { id: 4, name: 'Starred', icon: Star, color: 'from-rose-500 to-red-400' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Views</h1>
        <Button size="sm">
          <Plus className="mr-1 size-4" />
          New view
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {views.map((view) => (
          <div
            key={view.id}
            className={cn(
              'group relative overflow-hidden rounded-lg border bg-card p-6 transition-all hover:shadow-md',
              'hover:-translate-y-1'
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br opacity-10 transition-opacity group-hover:opacity-20" />
            <div className="relative flex items-start gap-4">
              <div className={cn('rounded-md p-2', `bg-gradient-to-br ${view.color}`)}>
                <view.icon className="size-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{view.name}</h3>
                <p className="text-sm text-muted-foreground">0 issues</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}