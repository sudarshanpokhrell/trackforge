import { CreateMemberDialog } from "@/components/members/create-member-dialog"
import { MemberActions, canManageUser } from "@/components/members/member-actions"
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
    <div className="mx-auto flex flex-col gap-6 px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-headline">Members</h1>
        </div>
        <CreateMemberDialog canCreateAdmin={isSuperadmin} />
      </div>

      {error ? (
        <p
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {getErrorMessage(error)}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-[inset_0_1px_0_0_var(--edge-highlight)]">
          <table className="w-full text-sm">
            <thead className="border-b bg-surface-2/60 text-left text-caption text-ink-subtle">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Joined</th>
                <th className="px-4 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isPending &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3" colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))}
              {!isPending && users.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-10 text-center text-muted-foreground"
                    colSpan={5}
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
                    <div className="flex size-8 items-center justify-center rounded-full bg-surface-3 text-xs font-medium text-ink-muted ring-1 ring-hairline-strong">
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
                      className="capitalize"
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
                  <td className="px-4 py-3 text-right">
                    {canManageUser(me, user) && <MemberActions me={me} user={user} />}
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







