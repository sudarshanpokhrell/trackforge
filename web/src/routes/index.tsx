import { createFileRoute } from "@tanstack/react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ListChecks, Inbox, FolderKanban, Users } from "lucide-react"

export const Route = createFileRoute("/")({
  component: HomeComponent,
})

function HomeComponent() {
  const stats = [
    { label: "Issues", value: "12", icon: ListChecks, color: "text-blue-500" },
    { label: "Inbox", value: "3", icon: Inbox, color: "text-amber-500" },
    {
      label: "Projects",
      value: "5",
      icon: FolderKanban,
      color: "text-purple-500",
    },
    { label: "Members", value: "8", icon: Users, color: "text-emerald-500" },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={cn("size-4", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
