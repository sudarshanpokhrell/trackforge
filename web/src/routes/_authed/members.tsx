import { CreateMemberDialog } from "@/components/members/create-member-dialog"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns";


import { Skeleton } from "@/components/ui/skeleton"
import { useUser } from "@/hooks/use-auth"
import {
  usersQuery,
} from "@/hooks/use-user"
import { getErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"


export const Route = createFileRoute("/_authed/members")({
  beforeLoad: ({ context }) => {
    if (context.user.role === "member")
      throw redirect({ to: "/", replace: true })
  },
  component: MembersPage,
})


function MembersPage() {
  const me = useUser()!
  const isSuperadmin = me.role === "superadmin"
  const { data: users, isPending, error } = useQuery(usersQuery)
  
  return (
    <div className="mx-auto flex flex-col gap-6 px-5 py-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Members</h1>
        </div>
        {isSuperadmin && <CreateMemberDialog />}
      </div>

      {error ? (
        <p
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {getErrorMessage(error)}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isPending &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3" colSpan={isSuperadmin ? 5 : 4}>
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))}
              {!isPending && users.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-10 text-center text-muted-foreground"
                    colSpan={isSuperadmin ? 5 : 4}
                  >
                    No members.
                  </td>
                </tr>
              )}
              {users?.map((user) => (
                <tr
                  key={user.id}
                  className={cn(!user.is_active && "text-muted-foreground")}
                >
                  <td className="flex items-center gap-2  px-4 py-3">
                    <div className="rounded-full h-8 w-8 bg-primary-foreground  flex justify-center items-center">
                        {user.name.toUpperCase()[0]}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {user.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={user.role === "member" ? "outline" : "secondary"}
                      className="capitalize p-2"
                    >
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {!user.is_active ? (
                      <Badge variant="destructive">Deactivated</Badge>
                    ) : (
                      <span className="text-muted-foreground">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(user.created_at), "dd MMM yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}







