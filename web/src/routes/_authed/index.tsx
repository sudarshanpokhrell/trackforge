import { createFileRoute } from "@tanstack/react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ListChecks, Inbox, FolderKanban, Users } from "lucide-react"

export const Route = createFileRoute("/_authed/")({
  component: HomeComponent,
})

function HomeComponent() {
  const stats = [
    { label: "Issues", value: "12", icon: ListChecks, color: "text-ink-subtle" },
    { label: "Inbox", value: "3", icon: Inbox, color: "text-ink-subtle" },
    {
      label: "Projects",
      value: "5",
      icon: FolderKanban,
      color: "text-ink-subtle",
    },
    { label: "Members", value: "8", icon: Users, color: "text-ink-subtle" },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-2">
      <div className="space-y-1">
        <p className="text-eyebrow text-ink-subtle">Overview</p>
        <h1 className="text-headline">Dashboard</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-eyebrow text-ink-subtle">
                {stat.label}
              </CardTitle>
              <stat.icon className={cn("size-4", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-display-md tabular-nums">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
