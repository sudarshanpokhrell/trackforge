import { AddMemberDialog } from '@/components/projects/add-member-dialog'
import { ProjectSettingsMenu } from '@/components/projects/project-settings-menu'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
    projectQuery,
    useRemoveProjectMember,
    useUpdateProjectMemberRole,
} from '@/hooks/use-projects'
import { getErrorMessage, isApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ProjectDetails, ProjectMember, ProjectRole } from '@/types/projects'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'
import { Calendar, FolderKanban, MoreHorizontal, ShieldCheck, UserMinus, UserRound } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authed/projects/$projectId/')({
    component: ProjectHome,
})

function ProjectHome() {
    const { projectId } = Route.useParams()
    const id = Number(projectId)

    const { data: project, isPending, error } = useQuery({
        ...projectQuery(id),
        // A junk param would otherwise be fetched as /projects/NaN.
        enabled: Number.isInteger(id) && id > 0,
    })

    if (!Number.isInteger(id) || id <= 0) return <ProjectNotFound />


    if (isPending) return <ProjectSkeleton />

    // No access and "no such project" are the same 404 by design, so they read
    // the same here too.
    if (error) {
        return isApiError(error, 404) ? (
            <ProjectNotFound />
        ) : (
            <div className="mx-auto max-w-5xl px-6 py-16 text-center">
                <h1 className="text-lg font-medium">Something went wrong</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {getErrorMessage(error)}
                </p>
            </div>
        )
    }

    return (
        <div className="mx-auto flex h-full max-w-5xl flex-col gap-10 px-6 py-8">
            <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex size-12 items-center justify-center rounded-xl border bg-card shadow-[inset_0_1px_0_0_var(--edge-highlight)]">
                            <FolderKanban className="size-6 text-ink-subtle" />
                        </div>
                        <h1 className="text-display-md text-foreground">
                            {project.name}
                        </h1>
                    </div>
                    {project.my_access.can_manage && <ProjectSettingsMenu project={project} />}
                </div>
                {project.description && (
                    <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
                        {project.description}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
                <div className="flex flex-col gap-8 md:col-span-2">
                    <Section title="Details">
                        <DetailRow icon={<Calendar className="size-4" />} label="Start">
                            {formatDate(project.start_date)}
                        </DetailRow>
                        <DetailRow icon={<Calendar className="size-4" />} label="Target">
                            {formatDate(project.target_date)}
                        </DetailRow>
                    </Section>
                </div>

                <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <h2 className="text-sm font-medium text-foreground">
                                Members
                                {project.members.length > 0 && (
                                    <span className="ml-1.5 text-muted-foreground">
                                        {project.members.length}
                                    </span>
                                )}
                            </h2>
                            {project.my_access.can_manage && (
                                <AddMemberDialog projectId={id} members={project.members} />
                            )}
                        </div>
                        <MemberList project={project} />
                    </div>
                </div>
            </div>
        </div>
    )
}

function ProjectNotFound() {
    return (
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
            <h1 className="text-lg font-medium">Project not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
                It may have been deleted, or you may not have access to it.
            </p>
        </div>
    )
}

function MemberList({ project }: { project: ProjectDetails }) {
    const removeMember = useRemoveProjectMember(project.id)
    const updateRole = useUpdateProjectMemberRole(project.id)
    const busy = removeMember.isPending || updateRole.isPending

    // The server keeps at least one admin per project and answers 422 otherwise,
    // so its message is shown as is.
    const onRemove = async (member: ProjectMember) => {
        try {
            await removeMember.mutateAsync(member.user_id)
            toast.success(`${member.name} removed. They are no longer assigned any of its issues.`)
        } catch (e) {
            toast.error(getErrorMessage(e))
        }
    }

    const onChangeRole = async (member: ProjectMember, role: ProjectRole) => {
        try {
            await updateRole.mutateAsync({ userId: member.user_id, role })
            toast.success(`${member.name} is now a project ${role}.`)
        } catch (e) {
            toast.error(getErrorMessage(e))
        }
    }

    if (project.members.length === 0) {
        return (
            <p className="text-[14px] text-muted-foreground">
                No members yet.
                {project.my_access.can_manage && ' Add the people who work on this project.'}
            </p>
        )
    }

    return (
        <div className="flex flex-col gap-3">
            {project.members.map((member) => (
                <div key={member.user_id} className="group flex items-center gap-3 text-[14px]">
                    <div
                        className={cn(
                            'flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[10px] font-medium text-ink-muted ring-1 ring-hairline-strong',
                            !member.is_active && 'opacity-50'
                        )}
                    >
                        {member.name.toUpperCase()[0]}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span
                            className={cn(
                                'truncate text-foreground/90',
                                !member.is_active && 'text-muted-foreground line-through'
                            )}
                            title={member.email}
                        >
                            {member.name}
                        </span>
                        {!member.is_active && (
                            <Badge variant="destructive" className="shrink-0">
                                Deactivated
                            </Badge>
                        )}
                        {member.role === 'admin' && (
                            <Badge variant="secondary" className="shrink-0">
                                Admin
                            </Badge>
                        )}
                    </div>
                    {project.my_access.can_manage && (
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                aria-label={`Manage ${member.name}`}
                                disabled={busy}
                                className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted/50 hover:text-foreground focus-visible:opacity-100 disabled:pointer-events-none group-hover:opacity-100 data-[popup-open]:opacity-100"
                            >
                                <MoreHorizontal className="size-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {member.role === 'admin' ? (
                                    <DropdownMenuItem onClick={() => onChangeRole(member, 'contributor')}>
                                        <UserRound className="size-4" />
                                        Make contributor
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => onChangeRole(member, 'admin')}>
                                        <ShieldCheck className="size-4" />
                                        Make admin
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => onRemove(member)}>
                                    <UserMinus className="size-4" />
                                    Remove from project
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            ))}
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-4">
            <h2 className="border-b border-border pb-2 text-sm font-medium text-foreground">
                {title}
            </h2>
            <div className="flex flex-col gap-3">{children}</div>
        </div>
    )
}

function DetailRow({
    icon,
    label,
    children,
}: {
    icon: React.ReactNode
    label: string
    children: React.ReactNode
}) {
    return (
        <div className="flex items-center gap-4 text-[14px]">
            <span className="flex w-24 items-center gap-2 text-muted-foreground">
                {icon}
                {label}
            </span>
            <span className="text-foreground">{children}</span>
        </div>
    )
}

function formatDate(value: string | null) {
    if (!value) return <span className="text-muted-foreground">Not set</span>
    return format(new Date(value), 'dd MMM yyyy')
}

function ProjectSkeleton() {
    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-8">
            <div className="flex flex-col gap-3">
                <Skeleton className="size-12 rounded-xl" />
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-5 w-full max-w-2xl" />
            </div>
            <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
                <div className="flex flex-col gap-3 md:col-span-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-48" />
                </div>
                <div className="flex flex-col gap-3">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                </div>
            </div>
        </div>
    )
}
